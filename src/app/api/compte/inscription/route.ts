import { NextResponse } from "next/server";
import { envoyerC1Inscription } from "@/lib/compte/mails";
import { compteOuvert } from "@/lib/compte/session";
import {
  creerPlafond,
  delaiNeutre,
  emailPlausible,
  motDePasseAcceptable,
} from "@/lib/compte/garde";

/**
 * POST /api/compte/inscription — créer un compte par email + mot de passe.
 *
 * LA RÉPONSE EST TOUJOURS LA MÊME. Email inconnu, compte déjà existant,
 * Brevo en panne : 200 « si cette adresse est libre, un mail arrive ».
 * C'est le patron T-045 de /api/waitlist — une inscription qui répond
 * « ce compte existe déjà » est un annuaire des clientes, offert à qui le
 * demande. Le mot de passe part chez Supabase (generateLink type signup),
 * qui le hache ; il ne s'écrit nulle part chez nous.
 *
 * Le compte naît NON CONFIRMÉ : tant que le lien C1 n'est pas cliqué, le
 * rapprochement par email ne montre rien (invariant nº2, session.ts).
 */

export const runtime = "nodejs";

const depasseLePlafond = creerPlafond(5);

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
  const { email, motDePasse } =
    typeof corps === "object" && corps !== null
      ? (corps as { email?: unknown; motDePasse?: unknown })
      : {};

  if (typeof email !== "string" || !emailPlausible(email)) {
    return NextResponse.json({ error: "email_invalide" }, { status: 400 });
  }
  if (typeof motDePasse !== "string" || !motDePasseAcceptable(motDePasse)) {
    return NextResponse.json({ error: "mot_de_passe_trop_court" }, { status: 400 });
  }

  await envoyerC1Inscription(email.trim(), motDePasse);
  await delaiNeutre();

  return NextResponse.json({ ok: true });
}
