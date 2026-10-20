import { NextResponse } from "next/server";
import { creerFrein, ipDeConnexion, ipDuClient } from "@/lib/compte/garde";
import { makeSupabase } from "@/lib/supabase";
import { cleFreinDepot, FREIN_LARGE, FREINS_DEPOT } from "@/lib/collectif/freins";
import { chargerAcces } from "@/lib/collectif/acces";
import { appareilDeRequete, lireLienDeDepot, placeDuParticipant, type LienDeDepot } from "@/lib/collectif/collecte";
import { lireIdsPhotos, peutSupprimerSaPhoto } from "@/lib/collectif/corbeille";
import { mettreALaCorbeille } from "@/lib/collectif/corbeilleServeur";
import { estCleProvenance, peut } from "@/lib/collectif/droits";
import { collecteOuverte } from "@/lib/collectif/etats";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { ERREUR_PERSONNES_ABSENTE, MESSAGE_PERSONNES_ABSENTE } from "@/lib/collectif/migration";
import { participantDeLAppareil } from "@/lib/collectif/personnesServeur";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/depot/supprimer — un participant supprime SES photos
 * (planche 7D du 20/10, T-199). `{ token, p?, photoIds }` (500 au plus), token
 * du lien des participants dans le CORPS.
 *
 * ⚠️ DÉCISION DE SÉCURITÉ (lot du 20/10) : seulement les photos envoyées depuis
 * CE téléphone (le cookie httpOnly `bj_depot_appareil`), et qui sont à la
 * personne que ce téléphone dit être (`peutSupprimerSaPhoto`). L'adresse n'est
 * pas vérifiée : qui tape celle de quelqu'un ne doit pas pouvoir effacer ses
 * photos. Une photo refusée revient dans `refusees`, sans erreur.
 *
 * Elles vont à la CORBEILLE (`supprimee_par: "auteur"`, 30 jours, restaurables
 * par le responsable et l'atelier) et libèrent leur place dans le plafond de la
 * personne (comme toute photo de la corbeille depuis l'audit du 20/10, S4). Après la clôture, plus rien ne se supprime d'ici (409
 * `depot_ferme`). Sans téléphone connu : 403 `appareil_inconnu`. Sans la
 * migration 20261023 : 503 `migration_personnes_absente`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const freinSupprimer = creerFrein(FREINS_DEPOT.supprimer);
const freinLarge = creerFrein(FREIN_LARGE);

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  /* Un frein par adresse du client et par lien (C1, `freins.ts`) : une `Map` par instance, un frein seulement. */
  if (freinSupprimer(cleFreinDepot(ipDuClient(request), corps.token)) || freinLarge(ipDeConnexion(request))) {
    return NextResponse.json({ error: "trop_de_demandes" }, { status: 429 });
  }

  const acces = await chargerAcces(String(corps.token ?? ""), "depot");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "supprimer_ses_photos")) return refusDroit();
  const { edition } = acces;
  const maintenant = new Date();
  if (!collecteOuverte(edition.etat, edition.cloture_le, maintenant)) {
    return NextResponse.json({ error: "depot_ferme", message: "Le dépôt est fermé : l'album se regarde, il ne change plus." }, { status: 409 });
  }
  const ids = lireIdsPhotos(corps.photoIds);
  if (!ids) return NextResponse.json({ error: "lot_invalide" }, { status: 400 });
  const appareil = appareilDeRequete(request);
  if (!appareil) {
    return NextResponse.json({ error: "appareil_inconnu", message: "Seules les photos envoyées depuis ce téléphone se suppriment ici." }, { status: 403 });
  }
  const supabase = makeSupabase();

  let lien: LienDeDepot | null = null;
  if (corps.p !== undefined && corps.p !== null && corps.p !== "") {
    if (!estCleProvenance(corps.p)) return NextResponse.json({ error: "provenance_inconnue" }, { status: 404 });
    const lu = await lireLienDeDepot(supabase, edition.id, corps.p);
    if (lu.statut === "erreur") return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    if (lu.statut === "inconnu") return NextResponse.json({ error: "provenance_inconnue" }, { status: 404 });
    lien = lu.lien;
  }

  const moi = await participantDeLAppareil(supabase, edition.id, appareil);
  if (moi.statut === "absente") return NextResponse.json({ error: ERREUR_PERSONNES_ABSENTE, message: MESSAGE_PERSONNES_ABSENTE }, { status: 503 });
  if (moi.statut === "erreur") return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const participantId = moi.valeur?.id ?? null;

  const r = await mettreALaCorbeille(supabase, edition.id, ids, "auteur", null, (p) => peutSupprimerSaPhoto(p, appareil, participantId));
  if (r.statut === "absente") return NextResponse.json({ error: ERREUR_PERSONNES_ABSENTE, message: MESSAGE_PERSONNES_ABSENTE }, { status: 503 });
  if (r.statut === "erreur") return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });

  /* La place libérée, tout de suite (« tu peux encore en envoyer 39 »). */
  const place = await placeDuParticipant(supabase, edition, lien, appareil, participantId, maintenant);
  return NextResponse.json({ ok: true, ...r.valeur, place: place && !place.illimitee ? place.place : null });
}
