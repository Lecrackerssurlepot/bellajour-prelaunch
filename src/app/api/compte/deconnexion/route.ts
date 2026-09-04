import { NextResponse } from "next/server";
import { clientCompte } from "@/lib/compte/session";

/**
 * POST /api/compte/deconnexion — efface la session et ses cookies.
 * Toujours 200 : se déconnecter d'une session déjà morte n'est pas une
 * erreur, c'est un état final atteint.
 */

export const runtime = "nodejs";

export async function POST() {
  const client = await clientCompte();
  if (client) {
    const { error } = await client.auth.signOut();
    if (error) console.error("[compte] déconnexion :", error.message);
  }
  return NextResponse.json({ ok: true });
}
