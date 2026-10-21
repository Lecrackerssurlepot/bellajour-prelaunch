import { NextResponse } from "next/server";
import { creerFrein, ipDeConnexion, ipDuClient } from "@/lib/compte/garde";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { VERSION_ACCORD } from "@/lib/collectif/accord";
import { appareilDeRequete, COOKIE_APPAREIL, lireLienDeDepot, nouvelAppareil, placeDuParticipant, type LienDeDepot } from "@/lib/collectif/collecte";
import { estCleProvenance, peut } from "@/lib/collectif/droits";
import { collecteOuverte } from "@/lib/collectif/etats";
import { cleFreinDepot, FREIN_LARGE, FREINS_DEPOT } from "@/lib/collectif/freins";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { ERREUR_PERSONNES_ABSENTE, MESSAGE_PERSONNES_ABSENTE } from "@/lib/collectif/migration";
import { depotOuvert, ERREUR_PAS_OUVERT, messagePasOuvert } from "@/lib/collectif/ouverture";
import { lireIdentite, nomAffiche, vuePersonneConnue, type LigneParticipant } from "@/lib/collectif/personnes";
import { comptesDeLaPersonne, oublierAppareil, participantDeLAppareil, presenter } from "@/lib/collectif/personnesServeur";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/depot/participant — le participant se PRÉSENTE par son
 * adresse (planches 6 et 8 du 20/10, T-198 ; migration 20261023). Token du
 * lien des participants dans le CORPS, jamais dans l'URL. Trois gestes :
 *
 * - `{ token, p?, action: "presenter", email, prenom?, nom? }` : l'adresse
 *   connue retrouve sa personne (le nom envoyé est IGNORÉ, `nomIgnore`) ;
 *   inconnue SANS prénom ni nom, la réponse le dit (`statut: "inconnu"`) et
 *   rien n'est écrit ; inconnue AVEC prénom et nom, la personne est créée.
 *   Puis CE téléphone parle pour elle (cookie httpOnly `bj_depot_appareil`,
 *   posé ici s'il manque). Une personne nouvelle ne se crée ni avant
 *   l'ouverture, ni après la clôture.
 * - `{ token, action: "qui" }` : pour qui ce téléphone parle (rien n'est écrit).
 * - `{ token, action: "oublier" }` : « Ce n'est pas toi ? » ; le téléphone ne
 *   parle plus pour personne, les photos restent à leur personne.
 *
 * ⚠️ L'adresse n'est PAS vérifiée (décision du 20/10) : qui tape celle de
 * quelqu'un envoie en son nom et lit son PRÉNOM et son nombre de photos, rien
 * de plus (audit du 20/10, S1 : `vuePersonneConnue`, jamais le nom de famille,
 * sauf à la création qui redit ce qui vient d'être tapé). Elle n'ouvre pas la
 * suppression (corbeille.ts : le téléphone seul). Une adresse connue présentée
 * sous un autre nom se journalise (S5) et le responsable le voit.
 *
 * Le frein (S3, `freins.ts`) ne compte QUE `presenter` (`qui` et `oublier` ne
 * disent rien d'une autre adresse) : par adresse du client ET par lien, assez
 * haut pour une classe entière derrière le Wi-Fi du campus ; plus un frein
 * large par l'adresse qui se connecte à Vercel. Une `Map` par instance : il
 * freine un script, il n'arrête pas une attaque.
 *
 * Sans la migration : `presenter` et `oublier` répondent 503
 * `migration_personnes_absente` (rien n'est écrit) ; `qui` répond `aucun`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const freinPresenter = creerFrein(FREINS_DEPOT.presenter);
const freinLarge = creerFrein(FREIN_LARGE);

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  const action = corps.action;
  /* Seule une présentation compte : c'est elle qui interroge une adresse. */
  if (action === "presenter" && (freinPresenter(cleFreinDepot(ipDuClient(request), corps.token)) || freinLarge(ipDeConnexion(request)))) {
    return NextResponse.json({ error: "trop_de_demandes" }, { status: 429 });
  }

  const acces = await chargerAcces(String(corps.token ?? ""), "depot");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "se_presenter")) return refusDroit();
  const { edition } = acces;
  const tu = edition.registre === "ecole_tu";
  const supabase = makeSupabase();
  const maintenant = new Date();

  let lien: LienDeDepot | null = null;
  if (corps.p !== undefined && corps.p !== null && corps.p !== "") {
    if (!estCleProvenance(corps.p)) return NextResponse.json({ error: "provenance_inconnue" }, { status: 404 });
    const lu = await lireLienDeDepot(supabase, edition.id, corps.p);
    if (lu.statut === "erreur") return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    if (lu.statut === "inconnu") return NextResponse.json({ error: "provenance_inconnue" }, { status: 404 });
    lien = lu.lien;
  }

  const appareilLu = appareilDeRequete(request);

  /* Ce que la page montre d'une personne reconnue : son PRÉNOM (S1), ses photos, sa place, l'accord de ce
     téléphone. Le nom complet ne se redit qu'à la création, qui répète ce qui vient d'être tapé.
     `surCeLien` (21/10) : ses photos sur CE lien, que la carte dit (« 2 photos déjà sur « Bateau 1 » ») ;
     `photos` reste le total de l'édition, que la carte ne dit plus. */
  const reponseConnue = async (participant: LigneParticipant, appareil: string, extra: Record<string, unknown>, creee: boolean) => {
    const [comptes, place] = await Promise.all([
      comptesDeLaPersonne(supabase, edition.id, participant.id, appareil, { provenanceId: lien?.id ?? null }),
      placeDuParticipant(supabase, edition, lien, appareil, participant.id, maintenant),
    ]);
    if (!comptes || !place) return null;
    return {
      ...extra,
      participant: creee ? { prenom: participant.prenom, nom: participant.nom, nomAffiche: nomAffiche(participant) } : vuePersonneConnue(participant),
      photos: comptes.photos,
      ceTelephone: comptes.ceTelephone,
      surCeLien: comptes.surCeLien,
      /* L'accord est redemandé sur chaque nouveau téléphone : celui-ci a-t-il déjà donné celui que la page
         AFFICHE (`VERSION_ACCORD`, la seule que le serveur accepte de neuf : C5), et quelle version ? */
      accordDonne: comptes.accord,
      accordAJour: comptes.accord === VERSION_ACCORD,
      place: place.illimitee ? null : place.place,
    };
  };

  if (action === "qui") {
    if (!appareilLu) return NextResponse.json({ statut: "aucun" }, { headers: { "cache-control": "private, no-store" } });
    const lu = await participantDeLAppareil(supabase, edition.id, appareilLu);
    if (lu.statut === "erreur") return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    if (lu.statut === "absente" || !lu.valeur) return NextResponse.json({ statut: "aucun" }, { headers: { "cache-control": "private, no-store" } });
    const r = await reponseConnue(lu.valeur, appareilLu, { statut: "connu" }, false);
    if (!r) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    return NextResponse.json(r, { headers: { "cache-control": "private, no-store" } });
  }

  if (action === "oublier") {
    if (!appareilLu) return NextResponse.json({ ok: true, oublie: 0 });
    const r = await oublierAppareil(supabase, edition.id, appareilLu);
    if (r.statut === "absente") return NextResponse.json({ error: ERREUR_PERSONNES_ABSENTE, message: MESSAGE_PERSONNES_ABSENTE }, { status: 503 });
    if (r.statut === "erreur") return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    return NextResponse.json({ ok: true, oublie: r.valeur });
  }

  if (action !== "presenter") return NextResponse.json({ error: "action_inconnue" }, { status: 400 });

  const identite = lireIdentite(corps, tu);
  if (!identite.ok) return NextResponse.json({ error: identite.erreur, message: identite.message }, { status: 400 });
  const ouverte = collecteOuverte(edition.etat, edition.cloture_le, maintenant);
  const ouvertureOk = depotOuvert(edition.ouverture_le, maintenant);
  /* Avant l'ouverture et après la clôture, une adresse se RETROUVE (« Tes 42 photos sont bien
     arrivées », planche 9C), elle ne se crée plus. Le nom tapé part quand même : une adresse connue
     présentée sous un autre nom se journalise (S5). */
  const peutCreer = ouverte && ouvertureOk;
  const appareil = appareilLu ?? nouvelAppareil();
  const r = await presenter(supabase, {
    editionId: edition.id,
    email: identite.email,
    identite: identite.identite,
    peutCreer,
    provenanceId: lien?.id ?? null,
    appareil,
  });
  if (r.statut === "absente") return NextResponse.json({ error: ERREUR_PERSONNES_ABSENTE, message: MESSAGE_PERSONNES_ABSENTE }, { status: 503 });
  if (r.statut === "erreur") return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  if (r.statut === "inconnu") {
    if (identite.identite && !ouvertureOk) {
      return NextResponse.json({ error: ERREUR_PAS_OUVERT, message: messagePasOuvert(edition.ouverture_le), ouverture_le: edition.ouverture_le ?? null }, { status: 409 });
    }
    if (identite.identite && !ouverte) {
      return NextResponse.json({ error: "depot_ferme", message: "Le dépôt est fermé : l'atelier compose avec les photos reçues." }, { status: 409 });
    }
    /* Rien d'écrit, aucun cookie : la page demande prénom et nom. */
    return NextResponse.json({ statut: "inconnu", nomRequis: true });
  }
  const corpsReponse = await reponseConnue(
    r.participant,
    appareil,
    { statut: r.statut, journal: r.journal, ...(r.statut === "connu" ? { nomIgnore: r.nomIgnore } : {}) },
    r.statut === "cree"
  );
  if (!corpsReponse) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const reponse = NextResponse.json(corpsReponse, { status: r.statut === "cree" ? 201 : 200 });
  if (!appareilLu) {
    reponse.cookies.set(COOKIE_APPAREIL, appareil, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return reponse;
}
