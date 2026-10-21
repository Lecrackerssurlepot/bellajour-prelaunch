import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { estUuid } from "@/lib/collectif/cles";
import { peut } from "@/lib/collectif/droits";
import type { Role } from "@/lib/collectif/types";
import { cleDeDossierLisible, dansLeDossier, type LignePhoto } from "@/lib/collectif/dossiers";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { lireIdsPhotos } from "@/lib/collectif/corbeille";
import { lireHorsCorbeille } from "@/lib/collectif/horsCorbeille";
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
 * Les photos COCHÉES (planches du 20/10) : `{ token, photoIds: [...], preselection | signalee }`,
 * 500 au plus, une ligne de journal (`photos_marquees`). Une photo à la corbeille
 * (migration 20261023) ne se marque pas : ni seule, ni cochée, ni dans « Tout ».
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
  /* Les photos COCHÉES (planches du 20/10, la barre d'actions) : `photoIds`, 500 au plus. */
  const lot = corps.photoIds === undefined ? null : lireIdsPhotos(corps.photoIds);
  if (corps.photoIds !== undefined && !lot) return NextResponse.json({ error: "lot_invalide" }, { status: 400 });
  if (!lot && !estUuid(corps.photoId)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const ids = lot ?? [corps.photoId as string];

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
  /* Une photo à la corbeille (migration 20261023) ne se marque pas : elle n'existe plus pour personne.
     Sans la colonne, la même écriture sans le filtre (`lireHorsCorbeille`). */
  const marquees: string[] = [];
  for (const paquet of enPaquets(ids)) {
    const { data, error } = await lireHorsCorbeille((avec) => {
      const q = supabase.from("collectif_photos").update(patch).eq("edition_id", acces.edition.id).in("id", paquet);
      return (avec ? q.is("supprimee_le", null) : q).select("id").returns<{ id: string }[]>();
    });
    if (error) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    marquees.push(...(data ?? []).map((l) => l.id));
  }
  if (!marquees.length) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  /* La présélection se journalise aussi : c'est un choix du client que
     l'atelier doit pouvoir relire, pas un clic perdu. Un lot coché : UNE ligne. */
  const journal = lot
    ? await journaliser(supabase, { editionId: acces.edition.id }, "photos_marquees", { ...patch, n: marquees.length, ids: marquees }, null)
    : await journaliser(supabase, { editionId: acces.edition.id }, type, { photo: corps.photoId }, null);
  return NextResponse.json({ ok: true, journal, ...(lot ? { n: marquees.length, ids: marquees } : {}) });
}

async function toutesLesPhotos(editionId: string, responsable: string | null, role: Role, preselection: unknown, dossierBrut: unknown) {
  if (typeof preselection !== "boolean") return NextResponse.json({ error: "rien_a_marquer" }, { status: 400 });
  if (!peut(role, "preselectionner")) return refusDroit();
  /* Une clé de dossier trop longue n'est JAMAIS lue comme « tout » : marquer toute l'édition à la place d'un dossier serait
     pire qu'un refus (22/10, `quis:` : plusieurs personnes tiennent dans une clé plus longue que les autres). */
  if (typeof dossierBrut === "string" && !cleDeDossierLisible(dossierBrut)) return NextResponse.json({ error: "dossier_invalide" }, { status: 400 });
  const supabase = makeSupabase();
  const dossier = typeof dossierBrut === "string" ? dossierBrut : "tout";
  let n = 0;
  if (dossier === "tout" || dossier === "selection") {
    /* Le nombre écrit vient du COMPTE de la base (T-167) : les lignes rendues par
       `select` pourraient s'arrêter au plafond de 1 000 de l'API. */
    /* Hors corbeille (migration 20261023) ; sans la colonne, la même écriture sans le filtre. */
    const { data, error, count } = await lireHorsCorbeille((avec) => {
      let requete = supabase
        .from("collectif_photos")
        .update({ preselection }, { count: "exact" })
        .eq("edition_id", editionId)
        .not("confirmee_le", "is", null)
        .eq("preselection", !preselection);
      if (avec) requete = requete.is("supprimee_le", null);
      if (preselection) requete = requete.eq("signalee", false);
      return requete.select("id");
    });
    if (error) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    n = count ?? data?.length ?? 0;
  } else {
    /* « Sélectionner tout ce dossier » (T-152) : les photos du dossier, par la
       même règle que la grille (`dansLeDossier`), puis par paquets d'ids.
       T-167 : TOUTES les photos, lues par tranches de 1 000 (le plafond de
       l'API), et des paquets de `PAQUET_IN` ids (100 uuid font 3,9 Ko d'URL,
       500 en faisaient 19,5). */
    type Ligne = LignePhoto & { id: string; signalee: boolean };
    const { data, error } = await lireHorsCorbeille((avec) =>
      lireToutesLesLignes<Ligne>(
        () => {
          const q = supabase
            .from("collectif_photos")
            .select("id, provenance_id, provenance_type, role_deposant, deposant, preselection, signalee")
            .eq("edition_id", editionId)
            .not("confirmee_le", "is", null);
          return (avec ? q.is("supprimee_le", null) : q).returns<Ligne[]>();
        },
        { colonne: "confirmee_le", croissant: true },
        "photos du dossier à sélectionner"
      )
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
