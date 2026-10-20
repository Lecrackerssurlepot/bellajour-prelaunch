import { NextResponse } from "next/server";
import { chargerAcces } from "@/lib/collectif/acces";
import { COOKIE_APPAREIL, controleAppareilActif, DUREE_APPAREIL_S, idAppareilValide, lireCode } from "@/lib/collectif/appareil";
import { demanderCode, nouvelIdAppareil, verifierCode } from "@/lib/collectif/appareils";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { origineDesMails } from "@/lib/collectif/liens";
import { lireCorps, refusAcces } from "@/lib/collectif/reponses";
import { makeSupabase } from "@/lib/supabase";

/**
 * POST /api/collectif/appareil — le code du responsable (T-154).
 * `{ token, action: "demander" }` : un code part à l'adresse du responsable,
 * lié à CET appareil (cookie httpOnly posé s'il manque).
 * `{ token, action: "verifier", code }` : bon, l'appareil est reconnu.
 *
 * Token dans le CORPS, jamais dans l'URL (journaux). C'est la seule route qui
 * lit l'accès SANS le contrôle d'appareil (`sansAppareil`) : sans elle, on ne
 * pourrait jamais demander son code. Elle ne sert que le lien du responsable ;
 * tout autre lien reçoit la même réponse qu'un lien inconnu.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  const token = typeof corps.token === "string" ? corps.token : "";
  const acces = await chargerAcces(token, "espace", { sansAppareil: true });
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? NextResponse.json({ error: "introuvable" }, { status: 404 });
  /* Le lien de l'équipe n'a pas de code : il reçoit la même réponse qu'un lien inconnu. */
  if (!peut(acces.role, "ouvrir_sur_appareil")) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  if (!controleAppareilActif(process.env)) return NextResponse.json({ etat: "inactif" });

  /* L'identifiant de l'appareil : celui du cookie, ou un neuf posé avec la réponse. */
  const brut = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_APPAREIL}=`))
    ?.slice(COOKIE_APPAREIL.length + 1);
  const existant = brut && idAppareilValide(decodeURIComponent(brut)) ? decodeURIComponent(brut) : null;
  const idAppareil = existant ?? nouvelIdAppareil();
  const supabase = makeSupabase();

  let rep: NextResponse;
  if (corps.action === "demander") {
    /* Le mail nomme le site (T-164). Le code d'essai, lui, lit `host` SEUL : Vercel n'achemine
       jamais une requête dont le `host` est localhost, alors que `x-forwarded-host` s'écrit par l'appelant. */
    const r = await demanderCode(supabase, acces.edition, idAppareil, request.headers.get("host"), origineDesMails(process.env));
    rep = NextResponse.json(r, { status: r.etat === "echec" ? 502 : r.etat === "migration_absente" ? 503 : r.etat === "trop" ? 429 : 200 });
  } else if (corps.action === "verifier") {
    const code = lireCode(corps.code);
    if (!code) return NextResponse.json({ etat: "faux", restants: undefined }, { status: 400 });
    const r = await verifierCode(supabase, acces.edition, idAppareil, code);
    rep = NextResponse.json(r, { status: r.etat === "ok" ? 200 : r.etat === "migration_absente" ? 503 : r.etat === "echec" ? 500 : 403 });
  } else {
    return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
  }

  if (!existant) {
    rep.cookies.set(COOKIE_APPAREIL, idAppareil, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: DUREE_APPAREIL_S,
    });
  }
  return rep;
}
