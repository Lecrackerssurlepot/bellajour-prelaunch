import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE, ADMIN_TTL_MS, comptesAdmin, signAdminCookie } from "@/lib/admin-auth";
import {
  apresEchec,
  delaiPourEchecs,
  doitJournaliser,
  estBloque,
  type EtatFrein,
} from "@/lib/frein-login";

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
 *
 * FREIN (T-046) : la règle vit dans @/lib/frein-login (délai croissant par
 * échec, 429 au-delà du seuil, oubli après la fenêtre). La Map ci-dessous est
 * la mémoire d'UNE instance — sur Vercel elle n'est pas partagée, ce frein
 * décourage un script naïf et rien de plus (cf. src/app/api/CLAUDE.md). Les
 * échecs répétés partent dans les logs Vercel via console.warn.
 */
export const runtime = "nodejs";

const TEMOIN = "0".repeat(32);

const freinParIp = new Map<string, EtatFrein>();

function ipDe(req: Request): string {
  return req.headers.get("x-forwarded-for") ?? "unknown";
}

function dormir(ms: number): Promise<void> {
  return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}

function timingSafeCompare(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // timingSafeEqual exige des longueurs égales : on compare d'abord la longueur
  // (fuite négligeable) puis le contenu en constant-time.
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(req: Request) {
  const now = Date.now();
  /* Purge des fenêtres expirées — la Map ne grossit pas indéfiniment. */
  for (const [cle, etat] of freinParIp) {
    if (etat.resetAt <= now) freinParIp.delete(cle);
  }

  const ip = ipDe(req);
  if (estBloque(freinParIp.get(ip), now)) {
    console.warn(`[admin/login] frein : IP ${ip} bloquée dans la fenêtre (seuil atteint)`);
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

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
    /* Échec : on compte, on journalise si ça se répète, et on fait attendre
       AVANT de répondre — un délai croissant côté serveur, incompressible
       pour un client séquentiel. Le mot de passe soumis n'est jamais logué. */
    const etat = apresEchec(freinParIp.get(ip), now);
    freinParIp.set(ip, etat);
    if (doitJournaliser(etat.echecs)) {
      console.warn(`[admin/login] échec n°${etat.echecs} depuis ${ip} (compte demandé : ${qui || "?"})`);
    }
    await dormir(delaiPourEchecs(etat.echecs));
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  /* Succès : l'ardoise de cette IP est effacée — le frein vise la devinette,
     pas la personne qui s'est trompée deux fois avant d'entrer. */
  freinParIp.delete(ip);

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
