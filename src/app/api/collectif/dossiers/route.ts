import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import {
  arbreDesPhotos,
  cheminDe,
  cheminDuNoeud,
  deposantPour,
  lireCleResp,
  lireNomDossier,
  noeudDe,
  nouveauChemin,
  planDeplacement,
  SEPARATEUR,
  type LignePhoto,
} from "@/lib/collectif/dossiers";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { enPaquets, lireToutesLesLignes } from "@/lib/collectif/lignes";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/dossiers — ranger les photos (T-152, maquette « Photos
 * rangées en dossiers »). Un dossier est le NOM sous lequel les photos ont
 * été déposées ; un sous-dossier s'écrit « Parent / Enfant » (un niveau).
 * - `{ token, cle, nom }` : renommer un dossier du responsable (ses
 *   sous-dossiers suivent) ou le nom d'un lien ;
 * - `{ token, cle, dans }` : ranger un dossier du responsable dans un autre
 *   (`dans` = la clé d'un dossier de premier niveau), ou l'en sortir
 *   (`dans: null`). Un seul niveau : la règle est `planDeplacement`.
 * Les photos ne changent que de nom de dossier : rien ne s'efface, le
 * journal garde l'ancien chemin.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Ligne = LignePhoto & { id: string };

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "regler_plafond_participant")) return refusDroit();
  const { edition } = acces;
  const supabase = makeSupabase();
  const cle = typeof corps.cle === "string" ? corps.cle : "";

  /* ── Le nom d'un lien ── */
  if (cle.startsWith("lien:")) {
    const id = cle.slice(5);
    if (!UUID.test(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
    const lu = lireNomDossier(corps.nom);
    if (!lu.ok) return NextResponse.json({ error: "saisie", message: lu.message }, { status: 422 });
    const { data, error } = await supabase.from("collectif_provenances").select("libelle").eq("id", id).eq("edition_id", edition.id).maybeSingle<{ libelle: string | null }>();
    if (error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    if (!data) return NextResponse.json({ error: "introuvable" }, { status: 404 });
    const { error: e } = await supabase.from("collectif_provenances").update({ libelle: lu.nom }).eq("id", id).eq("edition_id", edition.id);
    if (e) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    const journal = await journaliser(supabase, { editionId: edition.id }, "dossier_renomme", { avant: data.libelle ?? "Lien de contribution", apres: lu.nom }, null);
    return NextResponse.json({ ok: true, journal });
  }

  /* ── Un dossier du responsable : on relit ses photos pour savoir ce qui bouge ──
     TOUTES, par tranches de 1 000 (le plafond de l'API, T-167) : au-delà, une
     partie du dossier garderait l'ancien nom et le dossier se couperait en deux. */
  if (!lireCleResp(cle)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const { data, error } = await lireToutesLesLignes<Ligne>(
    () =>
      supabase
        .from("collectif_photos")
        .select("id, provenance_id, provenance_type, role_deposant, deposant")
        .eq("edition_id", edition.id)
        .eq("role_deposant", "responsable")
        .is("provenance_id", null)
        .returns<Ligne[]>(),
    { colonne: "created_at", croissant: true },
    "photos du dossier à ranger"
  );
  if (error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const lignes = data;
  const arbre = arbreDesPhotos(lignes, [], edition, false);
  const source = noeudDe(arbre, cle);
  const avant = cheminDuNoeud(arbre, cle);
  if (!source || !avant) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  let apres: string;
  let type: string;
  if ("dans" in corps) {
    const dans = corps.dans === null ? null : noeudDe(arbre, String(corps.dans ?? ""));
    const plan = planDeplacement(source, dans, arbre);
    if (!plan.ok) return NextResponse.json({ error: "saisie", message: plan.message }, { status: 422 });
    apres = plan.apres;
    type = "dossier_range";
  } else {
    const lu = lireNomDossier(corps.nom);
    if (!lu.ok) return NextResponse.json({ error: "saisie", message: lu.message }, { status: 422 });
    const p = avant.includes(SEPARATEUR) ? avant.slice(0, avant.indexOf(SEPARATEUR)) : null;
    apres = p ? `${p}${SEPARATEUR}${lu.nom}` : lu.nom;
    type = "dossier_renomme";
  }
  if (apres === avant) return NextResponse.json({ ok: true, journal: true });

  /* Chaque photo du dossier (et de ses sous-dossiers) prend son nouveau
     chemin ; le type redevient « organisateur » (le nom fait la provenance). */
  const parDeposant = new Map<string, string[]>();
  for (const l of lignes) {
    const n = nouveauChemin(cheminDe(l, edition.responsable_nom).chemin, avant, apres);
    if (n === null) continue;
    const d = deposantPour(n, edition.responsable_nom);
    parDeposant.set(d, [...(parDeposant.get(d) ?? []), l.id]);
  }
  /* Par paquets de `PAQUET_IN` ids : 100 uuid font 3,9 Ko d'URL, 500 en faisaient 19,5. */
  for (const [deposant, ids] of parDeposant) {
    for (const paquet of enPaquets(ids)) {
      const { error: e } = await supabase
        .from("collectif_photos")
        .update({ deposant, provenance_type: "organisateur" })
        .eq("edition_id", edition.id)
        .in("id", paquet);
      if (e) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
  }
  const journal = await journaliser(supabase, { editionId: edition.id }, type, { avant, apres }, null);
  return NextResponse.json({ ok: true, journal, apres });
}
