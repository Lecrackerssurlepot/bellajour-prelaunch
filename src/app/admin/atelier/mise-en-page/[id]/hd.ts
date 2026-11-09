/**
 * La haute définition de la planche (09/11) : la vignette de 320 px d'un dossier de particulier, ou la moyenne de
 * 1 600 px d'une édition, ne suffisent pas pour juger une photo posée en grand. Pour les photos de la planche
 * affichée (et de ses voisines), on relit l'ORIGINAL, on le ramène à `HD_PX` de grand côté, et on le garde dans
 * le navigateur (IndexedDB) : la seconde ouverture est immédiate. Rien n'est écrit en base ni au coffre.
 *
 * Best-effort : un HEIC (illisible par Chrome), une adresse expirée, une panne réseau → on garde l'image d'avant,
 * sans message. L'export, lui, part toujours de l'original : la HD n'est qu'une image d'écran.
 */

import { useSyncExternalStore } from "react";

const HD_PX = 3000;
const EN_VOL_MAX = 2;
const BASE = "bj-mep-hd";
const MAGASIN = "images";
const GARDER = 400;

const prets = new Map<string, string>();
const echecs = new Set<string>();
const attente = new Map<string, { source: string; priorite: number }>();
const ecouteurs = new Set<() => void>();
let enVol = 0;

const prevenir = (): void => { for (const f of ecouteurs) f(); };

/* ─── IndexedDB : best-effort, toute erreur vaut « pas en cache » ─── */
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
type Entree = { blob: Blob; le: number };
async function lireCache(id: string): Promise<Blob | null> {
  const b = await base();
  if (!b) return null;
  return new Promise((ok) => {
    try {
      const r = b.transaction(MAGASIN, "readonly").objectStore(MAGASIN).get(id);
      r.onsuccess = () => ok((r.result as Entree | undefined)?.blob ?? null);
      r.onerror = () => ok(null);
    } catch { ok(null); }
  });
}
async function ecrireCache(id: string, blob: Blob): Promise<void> {
  const b = await base();
  if (!b) return;
  try {
    const st = b.transaction(MAGASIN, "readwrite").objectStore(MAGASIN);
    st.put({ blob, le: Date.now() } satisfies Entree, id);
    /* on garde les GARDER plus récentes : au-delà, les plus anciennes partent */
    const tout = st.getAll();
    const cles = st.getAllKeys();
    cles.onsuccess = () => {
      const l = tout.result as Entree[] | undefined;
      const k = cles.result;
      if (!l || l.length <= GARDER || l.length !== k.length) return;
      const ordre = l.map((e, i) => ({ le: e.le, cle: k[i] })).sort((a, z) => a.le - z.le);
      for (const x of ordre.slice(0, l.length - GARDER)) st.delete(x.cle);
    };
  } catch { /* rien */ }
}

/** L'image ramenée à HD_PX de grand côté (orientation EXIF appliquée par le navigateur). Null si illisible. */
async function reduire(blob: Blob): Promise<Blob | null> {
  let im: ImageBitmap;
  try { im = await createImageBitmap(blob, { imageOrientation: "from-image" }); } catch { return null; }
  try {
    const k = Math.min(1, HD_PX / Math.max(im.width, im.height));
    if (k === 1 && /^image\/(jpeg|png|webp)$/.test(blob.type)) return blob;
    const l = Math.max(1, Math.round(im.width * k));
    const h = Math.max(1, Math.round(im.height * k));
    const cv = new OffscreenCanvas(l, h);
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(im, 0, 0, l, h);
    return await cv.convertToBlob({ type: "image/jpeg", quality: 0.9 });
  } catch { return null; } finally { im.close(); }
}

async function produire(id: string, source: string): Promise<void> {
  let b = await lireCache(id);
  if (!b) {
    try {
      const r = await fetch(source);
      if (!r.ok) throw new Error(String(r.status));
      b = await reduire(await r.blob());
    } catch { b = null; }
    if (b) void ecrireCache(id, b);
  }
  if (b) { prets.set(id, URL.createObjectURL(b)); prevenir(); } else echecs.add(id);
}

function pomper(): void {
  while (enVol < EN_VOL_MAX && attente.size) {
    let id: string | null = null;
    let meilleure = -Infinity;
    for (const [k, v] of attente) if (v.priorite > meilleure) { meilleure = v.priorite; id = k; }
    if (id === null) return;
    const { source } = attente.get(id)!;
    attente.delete(id);
    enVol += 1;
    void produire(id, source).finally(() => { enVol -= 1; pomper(); });
  }
}

/** Demander la HD de ces photos, la première d'abord. `source` = l'adresse de l'original (null : rien à faire). */
export function demanderHd(liste: readonly { id: string; source: string | null | undefined }[], base: number): void {
  let k = 0;
  for (const { id, source } of liste) {
    if (!source || prets.has(id) || echecs.has(id)) continue;
    const p = base - k++;
    const deja = attente.get(id);
    if (!deja || p > deja.priorite) attente.set(id, { source, priorite: p });
  }
  pomper();
}

const abonner = (f: () => void): (() => void) => { ecouteurs.add(f); return () => { ecouteurs.delete(f); }; };

/** L'adresse HD d'une photo si elle est prête, sinon null (le composant se redessine quand elle arrive). */
export function useHd(id: string | null | undefined): string | null {
  return useSyncExternalStore(abonner, () => (id ? prets.get(id) ?? null : null), () => null);
}
