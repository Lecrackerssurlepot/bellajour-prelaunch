import { NextResponse } from "next/server";
import { envoyerC2Reinitialisation } from "@/lib/compte/mails";
import { compteOuvert } from "@/lib/compte/session";
import { creerPlafond, delaiNeutre, emailPlausible } from "@/lib/compte/garde";

/**
 * POST /api/compte/mot-de-passe-oublie — demande de réinitialisation.
 *
 * Réponse UNIQUE, adresse connue ou non : « si un compte existe, un mail
 * arrive ». C'est aussi la porte d'entrée des fondatrices pré-créées en
 * silence : leur compte existe, le lien part, et rien ne distingue leur
 * cas de celui d'une inconnue.
 */

export const runtime = "nodejs";

const depasseLePlafond = creerPlafond(3);

export async function POST(request: Request) {
  if (!compteOuvert()) {
    return NextResponse.json({ error: "indisponible" }, { status: 404 });
  }
  if (depasseLePlafond(request)) {
    return NextResponse.json({ error: "trop_de_tentatives" }, { status: 429 });
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "corps_invalide" }, { status: 400 });
  }
  const { email } =
    typeof corps === "object" && corps !== null ? (corps as { email?: unknown }) : {};

  if (typeof email !== "string" || !emailPlausible(email)) {
    return NextResponse.json({ error: "email_invalide" }, { status: 400 });
  }

  await envoyerC2Reinitialisation(email.trim());
  await delaiNeutre();

  return NextResponse.json({ ok: true });
}
