import { NextResponse } from "next/server";
import { clientCompte } from "@/lib/compte/session";
import { creerPlafond, delaiNeutre, motDePasseAcceptable } from "@/lib/compte/garde";

/**
 * POST /api/compte/reinitialiser — le nouveau mot de passe, lien C2 en main.
 *
 * verifyOtp(recovery) prouve la possession du lien, updateUser pose le mot
 * de passe, puis signOut() — INVARIANT nº4 : un lien de réinitialisation
 * n'ouvre jamais de session durable. La cliente se connecte ensuite avec
 * son nouveau mot de passe, et c'est le but : prouver qu'il marche.
 */

export const runtime = "nodejs";

const depasseLePlafond = creerPlafond(5);

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
  const { tokenHash, motDePasse } =
    typeof corps === "object" && corps !== null
      ? (corps as { tokenHash?: unknown; motDePasse?: unknown })
      : {};

  if (typeof motDePasse !== "string" || !motDePasseAcceptable(motDePasse)) {
    return NextResponse.json({ error: "mot_de_passe_trop_court" }, { status: 400 });
  }
  if (typeof tokenHash !== "string" || tokenHash.length === 0 || tokenHash.length > 512) {
    await delaiNeutre();
    return NextResponse.json({ error: "lien_invalide" }, { status: 400 });
  }

  const client = await clientCompte();
  if (!client) {
    await delaiNeutre();
    return NextResponse.json({ error: "lien_invalide" }, { status: 400 });
  }

  const verif = await client.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  if (verif.error) {
    await delaiNeutre();
    return NextResponse.json({ error: "lien_invalide" }, { status: 400 });
  }

  const maj = await client.auth.updateUser({ password: motDePasse });

  /* Invariant nº4 — dans TOUS les cas, la session du lien meurt ici. */
  const sortie = await client.auth.signOut();
  if (sortie.error) console.error("[compte] signOut après reset :", sortie.error.message);

  if (maj.error) {
    console.error("[compte] updateUser :", maj.error.message);
    return NextResponse.json({ error: "mot_de_passe_refuse" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
