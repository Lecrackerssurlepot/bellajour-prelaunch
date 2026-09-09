import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import {
  aUnCookieDeSession,
  compteOuvert,
  initialeDe,
  utilisateurConnecte,
} from "@/lib/compte/session";
import { lireDossiersPourLaBarre } from "@/lib/compte/donnees";
import { numerosEnCours } from "@/lib/compte/rattachement";

/**
 * GET /api/compte/statut — ce que la barre de navigation a besoin de savoir.
 *
 * Les cookies de session sont httpOnly : Nav (composant client) ne peut pas
 * les lire, et les pages / et /magazine restent STATIQUES (aucune lecture
 * de cookie au rendu). Cette route est donc le seul pont : un fetch après
 * chargement, no-store. Déconnectée : { connecte: false }, 200 — ce n'est
 * pas une erreur, c'est la réponse.
 *
 * ⚠️ `enCours` est un NOMBRE, et le token n'est donné QUE s'il vaut 1.
 * Avec deux numéros en fabrication, « suivre mon numéro » désignerait un
 * dossier au hasard : la barre mène alors au compte, qui les montre tous
 * (décision de Mathias, 04/09).
 *
 * On ne rend rien de plus que ce que la barre affiche : un token (le sien),
 * une photo, une initiale. Jamais l'adresse, jamais une liste.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FERME = { ouvert: false as const, connecte: false as const, enCours: 0, token: null, photo: null, initiale: null };
const SANS_COMPTE = { ...FERME, ouvert: true as const };

export async function GET() {
  try {
    /* L'espace pas encore ouvert : la barre n'affiche RIEN (compteOuvert). */
    if (!compteOuvert()) {
      return NextResponse.json(FERME, { headers: { "Cache-Control": "no-store" } });
    }
    /* ⚠️ RIEN À VÉRIFIER QUAND IL N'Y A RIEN (09/09/2026, chantier lenteur).
       Sans cookie de session, `utilisateurConnecte()` rendra null — mais il
       lui faut un ALLER-RETOUR vers Supabase Auth pour le dire. Cette route
       est appelée par la barre à CHAQUE ouverture de page : on payait donc
       256 à 330 ms (mesuré en production) pour apprendre qu'un visiteur qui
       n'a jamais eu de compte n'est pas connecté, et le coin compte de la
       barre n'apparaissait qu'après. Même garde, même raison, que celle du
       middleware. La vérification qui fait foi reste juste en dessous. */
    if (!(await aUnCookieDeSession())) {
      return NextResponse.json(SANS_COMPTE, { headers: { "Cache-Control": "no-store" } });
    }
    const qui = await utilisateurConnecte();
    if (!qui) {
      return NextResponse.json(SANS_COMPTE, { headers: { "Cache-Control": "no-store" } });
    }
    /* La lecture MAIGRE : la barre n'affiche qu'un compte et un token, elle
       n'a pas besoin des titres, des paliers ni des planches d'aperçu. */
    const dossiers = await lireDossiersPourLaBarre(makeSupabase(), qui);
    const enCours = numerosEnCours(dossiers);
    return NextResponse.json(
      {
        ouvert: true,
        connecte: true,
        enCours: enCours.length,
        token: enCours.length === 1 ? enCours[0].token : null,
        photo: qui.photo,
        initiale: initialeDe(qui),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    /* La barre ne doit jamais casser une page : en panne, on répond « rien ». */
    console.error("[compte] statut en panne :", e instanceof Error ? e.message : e);
    return NextResponse.json(SANS_COMPTE, { headers: { "Cache-Control": "no-store" } });
  }
}
