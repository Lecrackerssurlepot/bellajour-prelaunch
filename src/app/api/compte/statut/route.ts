import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { utilisateurConnecte } from "@/lib/compte/session";
import { lireDossiersDuCompte } from "@/lib/compte/donnees";
import { choisirNumeroEnCours } from "@/lib/compte/rattachement";

/**
 * GET /api/compte/statut — ce que la barre de navigation a besoin de savoir.
 *
 * Les cookies de session sont httpOnly : Nav (composant client) ne peut pas
 * les lire, et les pages / et /magazine restent STATIQUES (aucune lecture
 * de cookie au rendu). Cette route est donc le seul pont : un fetch après
 * chargement, no-store, qui répond « connectée ou non, et le numéro actif
 * le plus récent ». Déconnectée : { connecte: false }, 200 — ce n'est pas
 * une erreur, c'est la réponse.
 *
 * On ne rend QUE le token et l'état du dossier choisi — le token appartient
 * à sa propriétaire (c'est sa propre session qui le demande), jamais plus.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SANS_COMPTE = { connecte: false as const, numeroEnCours: null };

export async function GET() {
  try {
    const qui = await utilisateurConnecte();
    if (!qui) {
      return NextResponse.json(SANS_COMPTE, { headers: { "Cache-Control": "no-store" } });
    }
    const dossiers = await lireDossiersDuCompte(makeSupabase(), qui);
    const enCours = choisirNumeroEnCours(dossiers);
    return NextResponse.json(
      {
        connecte: true,
        numeroEnCours: enCours ? { token: enCours.token, etat: enCours.etat } : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    /* La barre ne doit jamais casser une page : en panne, on répond « rien ». */
    console.error("[compte] statut en panne :", e instanceof Error ? e.message : e);
    return NextResponse.json(SANS_COMPTE, { headers: { "Cache-Control": "no-store" } });
  }
}
