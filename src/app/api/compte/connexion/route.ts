import { NextResponse } from "next/server";
import { clientCompte } from "@/lib/compte/session";
import { creerPlafond, delaiNeutre, emailPlausible } from "@/lib/compte/garde";

/**
 * POST /api/compte/connexion — email + mot de passe.
 *
 * L'échec est UNIFORME : « email ou mot de passe incorrect », que l'adresse
 * existe ou non (anti-énumération). Le succès pose les cookies de session
 * httpOnly via l'adaptateur de clientCompte — le navigateur ne voit jamais
 * un jeton. Supabase impose son propre rate-limit derrière le nôtre.
 */

export const runtime = "nodejs";

const depasseLePlafond = creerPlafond(10);

export async function POST(request: Request) {
  if (depasseLePlafond(request)) {
    return NextResponse.json({ error: "trop_de_tentatives" }, { status: 429 });
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "corps_invalide" }, { status: 400 });
  }
  const { email, motDePasse } =
    typeof corps === "object" && corps !== null
      ? (corps as { email?: unknown; motDePasse?: unknown })
      : {};

  if (
    typeof email !== "string" ||
    !emailPlausible(email) ||
    typeof motDePasse !== "string" ||
    motDePasse.length === 0
  ) {
    await delaiNeutre();
    return NextResponse.json({ error: "identifiants" }, { status: 401 });
  }

  const client = await clientCompte();
  if (!client) {
    /* Brique compte non configurée : même réponse qu'un mauvais mot de passe. */
    await delaiNeutre();
    return NextResponse.json({ error: "identifiants" }, { status: 401 });
  }

  const { error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password: motDePasse,
  });
  if (error) {
    await delaiNeutre();
    return NextResponse.json({ error: "identifiants" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
