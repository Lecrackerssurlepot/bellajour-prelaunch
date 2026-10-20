import { NextResponse } from "next/server";
import { lireProvenances } from "@/app/edition/[token]/donnees";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { signerGet, signerLectureVignette } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { DELAI_CORBEILLE_JOURS, lireIdsPhotos } from "@/lib/collectif/corbeille";
import { effacerMaintenant, lireCorbeille, mettreALaCorbeille, restaurer, vueCorbeille } from "@/lib/collectif/corbeilleServeur";
import { nomsDesLiens } from "@/lib/collectif/grille";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { ERREUR_MIGRATION_ABSENTE, ERREUR_PERSONNES_ABSENTE, MESSAGE_PERSONNES_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import { lireCorps } from "@/lib/collectif/reponses";

/**
 * La CORBEILLE d'une édition, côté ATELIER (planche 5 du 20/10, T-199 ;
 * migration 20261023). Le cookie de l'atelier, REVÉRIFIÉ ici (le middleware ne
 * suffit pas), et le journal dit QUI (`prenomDe`).
 *
 * - `GET` : la corbeille, la plus récente d'abord (la même vue que le responsable).
 * - `POST { action: "supprimer" | "restaurer", photoIds }` : comme le responsable
 *   (`supprimee_par: "atelier"`).
 * - `POST { action: "effacer", photoIds, verifier? }` : « Effacer maintenant »,
 *   DÉFINITIF, l'atelier SEUL, EN DEUX TEMPS : `verifier: true` compte ce qui
 *   partirait (rien n'est effacé), le second appel efface la LIGNE (encore à la
 *   corbeille, re-contrôlée) PUIS le coffre (l'original et la vignette) ; un
 *   objet qui résiste se retente à la purge suivante (`ratees`, réponse 200).
 *   Seulement des photos déjà à la corbeille.
 *
 * Sans la migration : 503 `migration_personnes_absente`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function lireEdition(supabase: ReturnType<typeof makeSupabase>, id: string) {
  return supabase.from("collectif_editions").select("id, responsable_nom").eq("id", id).maybeSingle<{ id: string; responsable_nom: string | null }>();
}

const absente = () => NextResponse.json({ error: ERREUR_PERSONNES_ABSENTE, message: MESSAGE_PERSONNES_ABSENTE }, { status: 503 });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const supabase = makeSupabase();
  const edition = await lireEdition(supabase, id);
  if (edition.error) return NextResponse.json({ error: tableAbsente(edition.error.code) ? ERREUR_MIGRATION_ABSENTE : "lecture_impossible" }, { status: tableAbsente(edition.error.code) ? 503 : 500 });
  if (!edition.data) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  let liens;
  try {
    liens = await lireProvenances(id);
  } catch {
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  const lue = await lireCorbeille(supabase, id);
  if (lue.statut === "absente") return absente();
  if (lue.statut === "erreur") return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const photos = await vueCorbeille(lue.valeur, nomsDesLiens(liens), edition.data.responsable_nom, new Date(), (cle) => signerLectureVignette(cle), (cle) => signerGet(cle));
  return NextResponse.json({ photos, total: photos.length, jours: DELAI_CORBEILLE_JOURS }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  const ids = lireIdsPhotos(corps.photoIds);
  if (!ids) return NextResponse.json({ error: "lot_invalide" }, { status: 400 });

  const supabase = makeSupabase();
  const edition = await lireEdition(supabase, id);
  if (edition.error) return NextResponse.json({ error: tableAbsente(edition.error.code) ? ERREUR_MIGRATION_ABSENTE : "lecture_impossible" }, { status: tableAbsente(edition.error.code) ? 503 : 500 });
  if (!edition.data) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const par = prenomDe(qui);

  if (corps.action === "effacer") {
    const r = await effacerMaintenant(supabase, id, ids, par, corps.verifier === true);
    if (r.statut === "absente") return absente();
    if (r.statut === "erreur") return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    if (corps.verifier === true) return NextResponse.json({ ok: true, verifier: true, aEffacer: r.valeur.aEffacer });
    /* La LIGNE part d'abord (S7) : une photo effacée l'est pour de bon, même si un objet du coffre a
       résisté. `ratees` le dit ; l'objet est noté au journal et la purge suivante le retente. */
    return NextResponse.json({ ok: true, ...r.valeur });
  }
  if (corps.action !== "supprimer" && corps.action !== "restaurer") return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
  const r = corps.action === "supprimer" ? await mettreALaCorbeille(supabase, id, ids, "atelier", par) : await restaurer(supabase, id, ids, par);
  if (r.statut === "absente") return absente();
  if (r.statut === "erreur") return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  return NextResponse.json({ ok: true, ...r.valeur });
}
