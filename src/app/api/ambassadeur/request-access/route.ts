import { NextResponse } from "next/server";
import { canonicalizeEmail } from "@/lib/email";
import { makeSupabase } from "@/lib/supabase";
import { signToken } from "@/lib/ambassadeur-token";
import { sendAmbassadeurAccess } from "@/lib/ambassadeur-mail";

/* POST /api/ambassadeur/request-access
   Lien magique d'accès au dashboard. Réponse VOLONTAIREMENT NEUTRE : ne révèle
   jamais si l'email existe / est ambassadeur (anti-énumération). L'envoi du lien
   est conditionné en interne (is_ambassadeur=true). */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = process.env.NODE_ENV === "production" ? 3 : 20;
const RATE_LIMIT_WINDOW_MS = process.env.NODE_ENV === "production" ? 60_000 : 10_000;

export async function POST(request: Request) {
  // Réponse neutre partagée (succès comme « pas d'envoi »).
  const neutral = NextResponse.json({ ok: true }, { status: 200 });

  try {
    const now = Date.now();
    for (const [key, val] of rateLimitMap) {
      if (val.resetAt < now) rateLimitMap.delete(key);
    }
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const entry = rateLimitMap.get(ip);
    if (entry && entry.resetAt > now) {
      if (entry.count >= RATE_LIMIT_MAX) {
        return NextResponse.json(
          { message: "Trop de tentatives. Réessayez dans quelques instants." },
          { status: 429 },
        );
      }
      entry.count++;
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    const body = await request.json().catch(() => ({}));
    const { email } = body as { email?: string };
    if (!email || typeof email !== "string") return neutral;

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return neutral;

    const emailCanonical = canonicalizeEmail(normalizedEmail);
    const supabase = makeSupabase();

    const { data: amb } = await supabase
      .from("waitlist")
      .select("email, is_ambassadeur")
      .eq("email_canonical", emailCanonical)
      .maybeSingle();

    if (amb?.is_ambassadeur && amb.email) {
      try {
        const dashboardUrl = `${SITE_URL}/ambassadeurs/espace?token=${signToken(emailCanonical)}`;
        await sendAmbassadeurAccess(amb.email, dashboardUrl);
      } catch (err) {
        console.error("[ambassadeur] hook access échec (non bloquant)", err);
      }
    }

    return neutral;
  } catch (err) {
    console.error("[ambassadeur] request-access exception", err);
    // Même en cas d'erreur interne : réponse neutre (pas de fuite).
    return neutral;
  }
}
