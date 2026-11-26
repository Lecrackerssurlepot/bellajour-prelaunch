/**
 * GET /api/admin/visuels/apercu?jour=AAAA-MM-JJ[&brouillons=1][&vers=/chemin]
 *   ouvre « le site à une date » pour l'atelier : mode brouillon de Next
 *   (`draftMode`, les pages se rendent à la demande) + cookie `bj_apercu_visuels`,
 *   puis renvoie vers la page demandée (un chemin interne seulement).
 * GET /api/admin/visuels/apercu?fin=1 : referme l'aperçu, retour à l'admin.
 *
 * Cookie admin vérifié ici (et par le middleware) ; `visuelDuJour` le revérifie
 * à chaque rendu, donc le cookie d'aperçu seul n'ouvre rien.
 */

import { cookies, draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { COOKIE_APERCU_VISUELS, estJour } from "@/lib/visuels/rotation";

export const runtime = "nodejs";

const RETOUR_ADMIN = "/admin/atelier/site/visuels";

function cheminInterne(v: string | null): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return "/";
  return v;
}

export async function GET(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const brouillon = await draftMode();
  const jar = await cookies();

  if (url.searchParams.get("fin") === "1") {
    brouillon.disable();
    jar.delete(COOKIE_APERCU_VISUELS);
    return NextResponse.redirect(new URL(RETOUR_ADMIN, url));
  }

  const jour = url.searchParams.get("jour");
  if (!estJour(jour)) return NextResponse.json({ error: "champ_invalide", champ: "jour" }, { status: 400 });
  const valeur = url.searchParams.get("brouillons") === "1" ? `${jour}|brouillons` : jour;

  brouillon.enable();
  jar.set(COOKIE_APERCU_VISUELS, valeur, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  return NextResponse.redirect(new URL(cheminInterne(url.searchParams.get("vers")), url));
}
