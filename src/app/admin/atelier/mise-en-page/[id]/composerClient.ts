/**
 * « Composer le magazine » côté navigateur (C20, 18/11/2026) : la fiche et la proposition gardées avec le projet (IndexedDB, comme la
 * lecture IA), les pixels (planches des lieux, luminances des photos pour la lisibilité des textes, P2-05) et les deux appels nouveaux de
 * la route `lecture-ia` (voyage, lieux). Les choix sont dans les modules purs (`compositeur/`, `editeur/lireLesPhotos.ts`) ; la route
 * relit tout. Rien n'est écrit en base ; les images partent et sont oubliées.
 */

import { useSyncExternalStore } from "react";
import { LIEUX_CASE_PX, LIEUX_COLONNES, QUALITE_JPEG, type LuLieux } from "@/lib/mise-en-page/editeur";
import { lireFiche, type Fiche, type Luminance, type ResultatCompo } from "@/lib/mise-en-page/compositeur";

const ROUTE = "/api/admin/atelier/mise-en-page/lecture-ia";
const BASE = "bj-mep-composer";
const MAGASIN = "projets";

/* ─────────────── ce que l'écran garde du projet : la fiche saisie, la dernière proposition ─────────────── */

export type Proposition = {
  quand: string;
  dollars: number;
  pages: number;
  resultat: Pick<ResultatCompo, "selection" | "chapitres" | "controle" | "couverture" | "profil" | "sobre" | "taille"> & Partial<Pick<ResultatCompo, "origineTaille" | "ajustement">>;
  /** Une empreinte de l'intérieur chargé : s'il n'a pas bougé, M-10 recompose sans demander. */
  empreinte: string;
  /** M-15 : les autres tailles, composées pour de vrai (leurs chiffres ne sont jamais estimés). */
  autres?: AutreTaille[];
  /** M-13 : ce que la MACHINE a marqué « gardée » en chargeant la proposition (le premier jet écrit ses posées dans le tri), et ce que
   *  l'atelier gardait avant : une recomposition ne prend jamais un choix de la machine pour une marque de l'atelier. */
  machine?: { choisies: string[]; avant: string[] };
};
export type AutreTaille = { mot: string; taille: "tout" | number; pages: number; posees: number };
export type Garde = { fiche: Fiche; proposition: Proposition | null };

let basePromise: Promise<IDBDatabase | null> | null = null;
function base(): Promise<IDBDatabase | null> {
  if (basePromise) return basePromise;
  basePromise = new Promise((ok) => {
    try {
      const r = indexedDB.open(BASE, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(MAGASIN); };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    } catch { ok(null); }
  });
  return basePromise;
}

const etats = new Map<string, Garde>();
const abonnes = new Set<() => void>();
const VIDE: Garde = { fiche: {}, proposition: null };
const avertir = () => { for (const f of abonnes) f(); };

export async function garder(cle: string, g: Garde): Promise<void> {
  etats.set(cle, g);
  avertir();
  const b = await base();
  if (!b) return;
  try { b.transaction(MAGASIN, "readwrite").objectStore(MAGASIN).put(JSON.parse(JSON.stringify(g)) as unknown, cle); } catch { /* stockage refusé : la séance seulement */ }
}

export async function charger(cle: string): Promise<void> {
  if (etats.has(cle)) return;
  const b = await base();
  const v = await new Promise<unknown>((ok) => {
    if (!b) { ok(null); return; }
    try {
      const r = b.transaction(MAGASIN, "readonly").objectStore(MAGASIN).get(cle);
      r.onsuccess = () => ok(r.result as unknown);
      r.onerror = () => ok(null);
    } catch { ok(null); }
  });
  if (etats.has(cle)) return;
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const p = o.proposition && typeof o.proposition === "object" ? (o.proposition as Proposition) : null;
  etats.set(cle, { fiche: lireFiche(o.fiche), proposition: p && typeof p.pages === "number" && p.resultat?.selection ? p : null });
  avertir();
}

export function useGarde(cle: string | undefined): Garde {
  return useSyncExternalStore(
    (f) => { abonnes.add(f); return () => abonnes.delete(f); },
    () => (cle ? etats.get(cle) ?? VIDE : VIDE),
    () => VIDE,
  );
}

/** L'empreinte de l'intérieur (les planches seules, sans la couverture) : un changement de l'atelier la change. */
export function empreinte(planches: unknown): string {
  const s = JSON.stringify(planches);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `${s.length}-${(h >>> 0).toString(16)}`;
}

/* ─────────────── les luminances de la séance (le bandeau recompose une autre taille avec les mêmes) ─────────────── */

const luminancesDeSeance = new Map<string, ReadonlyMap<string, Luminance>>();
export const garderLuminances = (cle: string, l: ReadonlyMap<string, Luminance>): void => { luminancesDeSeance.set(cle, l); };
export const luminancesGardees = (cle: string | undefined): ReadonlyMap<string, Luminance> | undefined => (cle ? luminancesDeSeance.get(cle) : undefined);

/* ─────────────── les pixels ─────────────── */

async function bitmap(url: string | null, signal: AbortSignal): Promise<ImageBitmap | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal });
    if (!r.ok) return null;
    return await createImageBitmap(await r.blob(), { imageOrientation: "from-image" });
  } catch { return null; }
}

/** P2-05 : la luminance d'une photo (64 × 64, images intégrales), lue sur sa vignette ; null si elle ne se lit pas. */
export async function luminance(url: string | null, signal: AbortSignal): Promise<Luminance | null> {
  const im = await bitmap(url, signal);
  if (!im) return null;
  const N = 64, W = N + 1;
  const cv = document.createElement("canvas");
  cv.width = N; cv.height = N;
  const g = cv.getContext("2d", { willReadFrequently: true });
  if (!g) { im.close(); return null; }
  g.drawImage(im, 0, 0, N, N);
  im.close();
  const d = g.getImageData(0, 0, N, N).data;
  const s = new Float64Array(W * W), s2 = new Float64Array(W * W);
  for (let y = 0; y < N; y++) {
    let l1 = 0, l2 = 0;
    for (let x = 0; x < N; x++) {
      const k = (y * N + x) * 4;
      const v = (0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]) / 255;
      l1 += v; l2 += v * v;
      s[(y + 1) * W + x + 1] = s[y * W + x + 1] + l1;
      s2[(y + 1) * W + x + 1] = s2[y * W + x + 1] + l2;
    }
  }
  return { w: N, h: N, s, s2 };
}

/** Une planche des lieux : 6 colonnes de cases de 320 px, l'étiquette (C1-2, S4) blanche sur un pavé noir en haut à gauche. */
export async function plancheLieux(items: readonly { url: string | null; label: string }[], signal: AbortSignal): Promise<string> {
  const C = LIEUX_CASE_PX, col = LIEUX_COLONNES, rangs = Math.max(1, Math.ceil(items.length / col));
  const cv = document.createElement("canvas");
  cv.width = col * C; cv.height = Math.min(col * C, rangs * C);
  const g = cv.getContext("2d");
  if (!g) throw new Error("canvas");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, cv.width, cv.height);
  const ims = await Promise.all(items.map((it) => bitmap(it.url, signal)));
  ims.forEach((im, i) => {
    const x = (i % col) * C, y = Math.floor(i / col) * C;
    if (y >= cv.height) { im?.close(); return; }
    if (im) {
      const k = Math.min(1, (C - 8) / Math.max(im.width, im.height));
      const l = Math.round(im.width * k), h = Math.round(im.height * k);
      g.drawImage(im, x + Math.floor((C - l) / 2), y + Math.floor((C - h) / 2), l, h);
      im.close();
    }
    const t = items[i].label;
    g.font = "bold 26px Arial, Helvetica, sans-serif";
    g.fillStyle = "#000";
    g.fillRect(x + 4, y + 4, 18 * t.length + 14, 34);
    g.fillStyle = "#fff";
    g.textBaseline = "top";
    g.fillText(t, x + 11, y + 8);
  });
  return cv.toDataURL("image/jpeg", QUALITE_JPEG);
}

/* ─────────────── la route ─────────────── */

export type Reponse<T> = { ok: true; resultat: T; dollars: number } | { ok: false; erreur: string; statut: number; dollars: number };
async function poster<T>(corps: Record<string, unknown>, signal: AbortSignal): Promise<Reponse<T>> {
  try {
    const r = await fetch(ROUTE, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(corps), signal });
    const j = (await r.json().catch(() => null)) as { ok?: boolean; resultat?: T; dollars?: number; error?: string } | null;
    const dollars = typeof j?.dollars === "number" && Number.isFinite(j.dollars) ? j.dollars : 0;
    if (r.ok && j?.ok && j.resultat !== undefined) return { ok: true, resultat: j.resultat, dollars };
    return { ok: false, erreur: j?.error ?? "erreur", statut: r.status, dollars };
  } catch {
    return { ok: false, erreur: signal.aborted ? "arrete" : "reseau", statut: 0, dollars: 0 };
  }
}

export const lireVoyage = (cle: string, indice: string, comptes: Record<string, number>, lignes: string[], signal: AbortSignal) =>
  poster<unknown>({ cle, etape: "voyage", ...(indice ? { indice } : {}), comptes, lignes }, signal);

export const lireLieux = (cle: string, images: string[], pays: string, chapitres: { numero: number; titre: string; debut: string; fin: string }[], noms: string[], labels: string[], signal: AbortSignal) =>
  poster<LuLieux>({ cle, etape: "lieux", images, ...(pays ? { pays } : {}), chapitres, noms, labels }, signal);
