import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { initialeDe, utilisateurConnecte } from "@/lib/compte/session";
import { lireDossiersDuCompte } from "@/lib/compte/donnees";
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

const SANS_COMPTE = { connecte: false as const, enCours: 0, token: null, photo: null, initiale: null };

export async function GET() {
  try {
    const qui = await utilisateurConnecte();
    if (!qui) {
      return NextResponse.json(SANS_COMPTE, { headers: { "Cache-Control": "no-store" } });
    }
    const dossiers = await lireDossiersDuCompte(makeSupabase(), qui);
    const enCours = numerosEnCours(dossiers);
    return NextResponse.json(
      {
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
