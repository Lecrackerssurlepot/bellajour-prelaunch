import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE, ADMIN_TTL_MS, comptesAdmin, signAdminCookie } from "@/lib/admin-auth";

/**
 * POST /api/admin/login — vérifie un compte nominatif et pose le cookie signé.
 *
 * Aucun mot de passe ne repart vers le client : seul le booléen de réussite
 * et, si OK, le cookie httpOnly. Comparaison timing-safe.
 *
 * ⚠️ La réponse ne distingue JAMAIS « compte inconnu » de « mauvais mot de
 * passe » : sinon le formulaire devient un annuaire des comptes valides.
 * D'où le mot de passe témoin comparé quand même sur un compte inconnu — la
 * durée de la réponse ne trahit pas non plus l'existence du compte.
 */
export const runtime = "nodejs";

const TEMOIN = "0".repeat(32);

function timingSafeCompare(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // timingSafeEqual exige des longueurs égales : on compare d'abord la longueur
  // (fuite négligeable) puis le contenu en constant-time.
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(req: Request) {
  const comptes = comptesAdmin();
  if (!Object.keys(comptes).length) {
    console.error("[admin/login] aucun compte configuré — accès refusé");
    return NextResponse.json({ error: "config" }, { status: 500 });
  }

  let submitted = "";
  let qui = "";
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = (await req.json()) as { password?: unknown; qui?: unknown };
      submitted = typeof body.password === "string" ? body.password : "";
      qui = typeof body.qui === "string" ? body.qui.trim().toLowerCase() : "";
    } else {
      const form = await req.formData();
      submitted = String(form.get("password") ?? "");
      qui = String(form.get("qui") ?? "").trim().toLowerCase();
    }
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const attendu = comptes[qui];
  if (!timingSafeCompare(submitted, attendu ?? TEMOIN) || !attendu) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const expMs = Date.now() + ADMIN_TTL_MS;
  const value = await signAdminCookie(qui, attendu, expMs);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ADMIN_TTL_MS / 1000),
  });
  return res;
}
