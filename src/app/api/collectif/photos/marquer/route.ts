import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { estUuid } from "@/lib/collectif/cles";
import { peut } from "@/lib/collectif/droits";
import type { Role } from "@/lib/collectif/types";
import { dansLeDossier, type LignePhoto } from "@/lib/collectif/dossiers";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { enPaquets, lireToutesLesLignes } from "@/lib/collectif/lignes";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/photos/marquer — présélectionner une photo, ou la
 * signaler « à ne pas publier ». `{ token, photoId, preselection? }` ou
 * `{ token, photoId, signalee, motif? }`. Toutes d'un coup (« Tout
 * sélectionner », « Tout désélectionner », retours du 14/10) :
 * `{ token, toutes: true, preselection }` ; une photo signalée n'entre jamais
 * dans un « Tout sélectionner ».
 *
 * La présélection est FACULTATIVE (PRD §5.4) : jamais exigée, jamais bornée
 * en dur ici (le plafond `preselection_max` se dit à l'écran). Un signalement
 * se voit côté atelier. Rien ne s'efface : une photo signalée reste au coffre.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (corps.toutes === true) return toutesLesPhotos(acces.edition.id, acces.edition.responsable_nom, acces.role, corps.preselection, corps.dossier);
  if (!estUuid(corps.photoId)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  let type = "";
  if (typeof corps.preselection === "boolean") {
    if (!peut(acces.role, "preselectionner")) return refusDroit();
    patch.preselection = corps.preselection;
    type = corps.preselection ? "photo_preselectionnee" : "photo_deselectionnee";
  } else if (typeof corps.signalee === "boolean") {
    if (!peut(acces.role, "signaler_photo")) return refusDroit();
    patch.signalee = corps.signalee;
    patch.signalement_motif = corps.signalee && typeof corps.motif === "string" ? corps.motif.trim().slice(0, 300) || null : null;
    type = corps.signalee ? "photo_signalee" : "photo_designalee";
  } else {
    return NextResponse.json({ error: "rien_a_marquer" }, { status: 400 });
  }

  const supabase = makeSupabase();
  const { data, error } = await supabase
    .from("collectif_photos")
    .update(patch)
    .eq("id", corps.photoId)
    .eq("edition_id", acces.edition.id)
    .select("id");
  if (error) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  /* La présélection se journalise aussi : c'est un choix du client que
     l'atelier doit pouvoir relire, pas un clic perdu. */
  const journal = await journaliser(supabase, { editionId: acces.edition.id }, type, { photo: corps.photoId }, null);
  return NextResponse.json({ ok: true, journal });
}

async function toutesLesPhotos(editionId: string, responsable: string | null, role: Role, preselection: unknown, dossierBrut: unknown) {
  if (typeof preselection !== "boolean") return NextResponse.json({ error: "rien_a_marquer" }, { status: 400 });
  if (!peut(role, "preselectionner")) return refusDroit();
  const supabase = makeSupabase();
  const dossier = typeof dossierBrut === "string" && dossierBrut.length <= 400 ? dossierBrut : "tout";
  let n = 0;
  if (dossier === "tout" || dossier === "selection") {
    /* Le nombre écrit vient du COMPTE de la base (T-167) : les lignes rendues par
       `select` pourraient s'arrêter au plafond de 1 000 de l'API. */
    let requete = supabase
      .from("collectif_photos")
      .update({ preselection }, { count: "exact" })
      .eq("edition_id", editionId)
      .not("confirmee_le", "is", null)
      .eq("preselection", !preselection);
    if (preselection) requete = requete.eq("signalee", false);
    const { data, error, count } = await requete.select("id");
    if (error) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    n = count ?? data?.length ?? 0;
  } else {
    /* « Sélectionner tout ce dossier » (T-152) : les photos du dossier, par la
       même règle que la grille (`dansLeDossier`), puis par paquets d'ids.
       T-167 : TOUTES les photos, lues par tranches de 1 000 (le plafond de
       l'API), et des paquets de `PAQUET_IN` ids (100 uuid font 3,9 Ko d'URL,
       500 en faisaient 19,5). */
    type Ligne = LignePhoto & { id: string; signalee: boolean };
    const { data, error } = await lireToutesLesLignes<Ligne>(
      () =>
        supabase
          .from("collectif_photos")
          .select("id, provenance_id, provenance_type, role_deposant, deposant, preselection, signalee")
          .eq("edition_id", editionId)
          .not("confirmee_le", "is", null)
          .returns<Ligne[]>(),
      { colonne: "confirmee_le", croissant: true },
      "photos du dossier à sélectionner"
    );
    if (error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    const ids = data
      .filter((l) => dansLeDossier(l, dossier, responsable) && Boolean(l.preselection) !== preselection && (!preselection || !l.signalee))
      .map((l) => l.id);
    for (const paquet of enPaquets(ids)) {
      const { error: e } = await supabase.from("collectif_photos").update({ preselection }).eq("edition_id", editionId).in("id", paquet);
      if (e) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
    n = ids.length;
  }
  const journal = n
    ? await journaliser(supabase, { editionId }, preselection ? "preselection_toutes" : "preselection_aucune", { n, ...(dossier !== "tout" ? { dossier: true } : {}) }, null)
    : true;
  return NextResponse.json({ ok: true, n, journal });
}
