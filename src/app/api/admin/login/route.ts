import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE, ADMIN_TTL_MS, signAdminCookie } from "@/lib/admin-auth";

/**
 * POST /api/admin/login — valide le mot de passe partagé et pose le cookie de session.
 *
 * Le mot de passe (ADMIN_PASSWORD) n'arrive JAMAIS au client : seul le booléen
 * de réussite et, si OK, le cookie httpOnly signé. Comparaison timing-safe.
 */
export const runtime = "nodejs";

function timingSafeCompare(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // timingSafeEqual exige des longueurs égales : on compare d'abord la longueur
  // (fuite négligeable) puis le contenu en constant-time.
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(req: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("[admin/login] ADMIN_PASSWORD absent — accès refusé");
    return NextResponse.json({ error: "config" }, { status: 500 });
  }

  let submitted = "";
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = (await req.json()) as { password?: unknown };
      submitted = typeof body.password === "string" ? body.password : "";
    } else {
      const form = await req.formData();
      submitted = String(form.get("password") ?? "");
    }
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!timingSafeCompare(submitted, password)) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const expMs = Date.now() + ADMIN_TTL_MS;
  const value = await signAdminCookie(password, expMs);

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
