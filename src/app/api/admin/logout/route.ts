import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

/**
 * POST /api/admin/logout — efface le cookie de session et renvoie vers /admin/login.
 * GET supporté aussi (lien direct), même effet.
 */
export const runtime = "nodejs";

function clearAndRedirect(req: Request): NextResponse {
  const res = NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function POST(req: Request) {
  return clearAndRedirect(req);
}

export async function GET(req: Request) {
  return clearAndRedirect(req);
}
