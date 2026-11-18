/**
 * /api/admin/atelier/mise-en-page/lecture-ia : « Lire les photos » (17/11/2026), un appel à OpenAI par planche ou par photo.
 *
 * POST { cle, etape: "planche" | "photo", image: dataURL JPEG, numeros?: [n0, n], indice?, candidate? }
 *   - planche : 16 vignettes numérotées (≤ 1 536 px de côté), lues par gpt-5.4 (effort « low ») ;
 *   - photo : une photo (≤ 1 024 px), regardée par gpt-5.1 (effort « none », repli « minimal » si le modèle le refuse).
 * Réponse : { ok, resultat, jetons: { entree, sortie }, dollars, modele }. La réponse du modèle est RELUE par le module pur
 * (`lireReponsePlanche`, `lireReponseRegard`) : rien d'inconnu ne passe. Deux nouvelles tentatives sur 429 et 5xx.
 *
 * GARDE (T-203, OBLIGATOIRE) : les photos de clients n'ont pas encore le droit de partir chez OpenAI. Seule une création libre
 * (`libre-<uuid>`) passe ; un dossier ou une édition reçoit 403 `photos_clients_non_autorisees`, sauf `MEP_LECTURE_IA_CLIENTS=1`
 * (posée nulle part). Sans `OPENAI_API_KEY` : 503 `openai_absente`.
 *
 * Rien n'est écrit en base, aucune image n'est gardée : l'image traverse la route vers OpenAI et n'est jamais journalisée.
 */

import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import {
  PLANCHE_MAX_PX, REGARD_MAX_PX, TAILLE_MAX_DEMANDE, corpsPlanche, corpsRegard, coutDollars, dimensionsJpeg, gardeLecture, lireDemande, lireEnveloppe,
  lireReponsePlanche, lireReponseRegard, repliEffort, type CorpsOpenAI, type Jetons,
} from "@/lib/mise-en-page/editeur";
import { SANS_CACHE, lireCorpsBorne, refus, refusCorps } from "../magazines/commun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* LITTÉRAL : une valeur calculée passe tsc et lint puis casse `next build` (segment config). */
export const maxDuration = 60;

const URL_OPENAI = "https://api.openai.com/v1/responses";
/** Le temps laissé à OpenAI sur toute la requête (tentatives comprises), sous la `maxDuration`. */
const BUDGET_MS = 55_000;
const ATTENTES_MS = [3_000, 6_000];

type Appel = { ok: true; reponse: unknown; jetons: Jetons; modele: CorpsOpenAI["model"] } | { ok: false; statut: number; erreur: string };

async function appeler(corps: CorpsOpenAI, cle: string, fin: number): Promise<Appel> {
  let c = corps;
  let relances = 0;
  let repliFait = false;
  for (;;) {
    const reste = fin - Date.now();
    if (reste < 2_000) return { ok: false, statut: 504, erreur: "openai_trop_long" };
    let rep: Response;
    try {
      rep = await fetch(URL_OPENAI, {
        method: "POST", headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
        body: JSON.stringify(c), signal: AbortSignal.timeout(reste), cache: "no-store",
      });
    } catch {
      return { ok: false, statut: 504, erreur: "openai_injoignable" };
    }
    if (rep.ok) {
      let j: unknown;
      try { j = await rep.json(); } catch { return { ok: false, statut: 502, erreur: "openai_illisible" }; }
      const e = lireEnveloppe(j);
      if (!e.ok) return { ok: false, statut: 502, erreur: "openai_reponse_refusee" };
      return { ok: true, reponse: e.valeur.texte, jetons: e.valeur.jetons, modele: c.model };
    }
    const texte = (await rep.text().catch(() => "")).slice(0, 400);
    /* le repli de l'essai : gpt-5.1 sans raisonnement refusé, on redemande au minimum (une seule fois, sans compter une tentative) */
    const repli = repliEffort(c.reasoning.effort);
    if (rep.status === 400 && repli && !repliFait && /reasoning/i.test(texte) && /effort/i.test(texte)) { c = { ...c, reasoning: { effort: repli } }; repliFait = true; continue; }
    /* deux nouvelles tentatives sur 429 et 5xx (3 s, puis 6 s) */
    if ((rep.status === 429 || rep.status >= 500) && relances < ATTENTES_MS.length) { await new Promise((ok) => setTimeout(ok, ATTENTES_MS[relances])); relances += 1; continue; }
    console.error("[admin/mise-en-page/lecture-ia] OpenAI", rep.status);
    return { ok: false, statut: 502, erreur: rep.status === 429 ? "openai_sature" : "openai_erreur" };
  }
}


/** GET ?cle=… : la lecture est-elle ouverte pour ce projet ? Aucun appel à OpenAI, rien d'écrit : l'écran s'en sert pour griser ou non son bouton. */
export async function GET(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return refus(401, "non_authentifie");
  const garde = gardeLecture(new URL(request.url).searchParams.get("cle"), { OPENAI_API_KEY: process.env.OPENAI_API_KEY, MEP_LECTURE_IA_CLIENTS: process.env.MEP_LECTURE_IA_CLIENTS });
  return NextResponse.json({ ok: true, ouvert: garde.ok, raison: garde.ok ? null : garde.erreur }, { status: 200, headers: SANS_CACHE });
}

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return refus(401, "non_authentifie");
  const lu = await lireCorpsBorne(request, TAILLE_MAX_DEMANDE + 4096);
  if (!lu.ok) return refusCorps(lu.raison);
  const garde = gardeLecture(lu.corps.cle, { OPENAI_API_KEY: process.env.OPENAI_API_KEY, MEP_LECTURE_IA_CLIENTS: process.env.MEP_LECTURE_IA_CLIENTS });
  if (!garde.ok) return refus(garde.statut, garde.erreur);
  const d = lireDemande(lu.corps);
  if (!d.ok) return refus(400, d.phrase);
  const dem = d.valeur;
  const octets = Buffer.from(dem.image.slice(dem.image.indexOf(",") + 1), "base64");
  const dim = dimensionsJpeg(new Uint8Array(octets.buffer, octets.byteOffset, octets.byteLength));
  const max = dem.etape === "planche" ? PLANCHE_MAX_PX : REGARD_MAX_PX;
  if (!dim || dim.l < 1 || dim.h < 1 || Math.max(dim.l, dim.h) > max) return refus(400, "image_hors_bornes");

  const fin = Date.now() + BUDGET_MS;
  const cleOpenAI = process.env.OPENAI_API_KEY as string;
  const r = await appeler(dem.etape === "planche" ? corpsPlanche(dem.image) : corpsRegard(dem.image, dem.pourquoi, dem.indice), cleOpenAI, fin);
  if (!r.ok) return refus(r.statut, r.erreur);
  const dollars = coutDollars(r.modele, r.jetons);
  const relu = dem.etape === "planche" ? lireReponsePlanche(r.reponse, dem.n0, dem.n) : lireReponseRegard(r.reponse);
  /* une réponse hors contrat est payée quand même : le coût est rendu pour que l'écran le compte */
  if (!relu.ok) return refus(502, "reponse_hors_contrat", { phrase: relu.phrase, jetons: r.jetons, dollars, modele: r.modele });
  return NextResponse.json({ ok: true, resultat: relu.valeur, jetons: r.jetons, dollars, modele: r.modele }, { status: 200, headers: SANS_CACHE });
}
