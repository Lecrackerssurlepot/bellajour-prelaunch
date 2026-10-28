import { NextResponse } from "next/server";
import { signerGet, signerLectureVignette } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { accesPourEcrire, chargerAcces } from "@/lib/collectif/acces";
import { DELAI_CORBEILLE_JOURS, lireIdsPhotos } from "@/lib/collectif/corbeille";
import { lireCorbeille, mettreALaCorbeille, restaurer, vueCorbeille } from "@/lib/collectif/corbeilleServeur";
import { peut } from "@/lib/collectif/droits";
import { nomsDesLiens } from "@/lib/collectif/grille";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { ERREUR_PERSONNES_ABSENTE, MESSAGE_PERSONNES_ABSENTE } from "@/lib/collectif/migration";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import { lireProvenances } from "@/app/edition/[token]/donnees";

/**
 * POST /api/collectif/photos/corbeille — la CORBEILLE du responsable (planches
 * 3 et 5 du 20/10, T-199 ; migration 20261023). Token dans le CORPS.
 *
 * - `{ token, action: "lister" }` : les photos supprimées, la plus récente
 *   d'abord, avec qui l'a supprimée et quand elle partira pour de bon ;
 * - `{ token, action: "supprimer", photoIds }` : N'IMPORTE QUELLE photo arrivée
 *   de l'édition (500 au plus), sans fenêtre de confirmation côté serveur
 *   (l'écran propose « Annuler » : c'est `restaurer`) ;
 * - `{ token, action: "restaurer", photoIds }` : elles reviennent à leur place.
 *
 * Droit `gerer_corbeille` (le responsable ; l'atelier par sa propre route) :
 * le lien d'ÉQUIPE ne voit pas la corbeille et n'y touche pas (403
 * `lecture_seule`, décision 4 du 20/10). Effacer pour de bon : l'atelier seul.
 * Sans la migration : 503 `migration_personnes_absente`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const lu = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(lu);
  if (refus || lu.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(lu.role, "gerer_corbeille")) return refusDroit();
  const { edition } = lu;
  const supabase = makeSupabase();
  const absente = () => NextResponse.json({ error: ERREUR_PERSONNES_ABSENTE, message: MESSAGE_PERSONNES_ABSENTE }, { status: 503 });

  if (corps.action === "lister") {
    const [lue, liens] = await Promise.all([lireCorbeille(supabase, edition.id), lireProvenances(edition.id)]);
    if (lue.statut === "absente") return absente();
    if (lue.statut === "erreur") return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    const photos = await vueCorbeille(lue.valeur, nomsDesLiens(liens), edition.responsable_nom, new Date(), (cle) => signerLectureVignette(cle), (cle) => signerGet(cle));
    return NextResponse.json({ photos, total: photos.length, jours: DELAI_CORBEILLE_JOURS }, { headers: { "cache-control": "private, no-store" } });
  }

  if (corps.action !== "supprimer" && corps.action !== "restaurer") return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
  /* « lister » est une lecture (au-dessus, jamais preneuse) ; supprimer et restaurer écrivent :
     le premier appareil prend la place ici (28/10). */
  const acces = await accesPourEcrire(lu, "gerer_corbeille");
  if (!peut(acces.role, "gerer_corbeille")) return refusDroit();
  const ids = lireIdsPhotos(corps.photoIds);
  if (!ids) return NextResponse.json({ error: "lot_invalide" }, { status: 400 });
  const r = corps.action === "supprimer" ? await mettreALaCorbeille(supabase, edition.id, ids, "responsable", null) : await restaurer(supabase, edition.id, ids, null);
  if (r.statut === "absente") return absente();
  if (r.statut === "erreur") return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  return NextResponse.json({ ok: true, ...r.valeur });
}
