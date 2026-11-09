/**
 * La couche 1 côté navigateur (09/11) : on lit la VIGNETTE de chaque photo (320 px, ou la moyenne à défaut), on la
 * ramène à `COTE` px en niveaux de gris, et le module pur (`mesurerGris`) en tire netteté et empreinte. Les mesures
 * restent dans le navigateur (IndexedDB) : la seconde ouverture est immédiate. Rien n'est écrit en base ni au coffre.
 *
 * Best-effort : une vignette illisible (HEIC, adresse expirée, panne) n'a pas de mesure, la photo reste hors des piles.
 * La lecture de l'album (`lireMesures`) est relancée par paquets, puis une dernière fois à la fin.
 */

import { useEffect, useRef } from "react";
import { lireMesures, mesurerGris, type Catalogue, type Geste, type Mesure } from "@/lib/mise-en-page/editeur";
import type { Adresse } from "./contexte";

const COTE = 256;
const EN_VOL_MAX = 4;
const PAQUET = 150;
const BASE = "bj-mep-mesures";
const MAGASIN = "mesures";
/** Changer la mesure change la version : les anciennes mesures ne sont plus relues. */
const VERSION = "v1";

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
async function lire(id: string): Promise<Mesure | null> {
  const b = await base();
  if (!b) return null;
  return new Promise((ok) => {
    try {
      const r = b.transaction(MAGASIN, "readonly").objectStore(MAGASIN).get(`${VERSION}:${id}`);
      r.onsuccess = () => { const m = r.result as Mesure | undefined; ok(m && typeof m.nettete === "number" && typeof m.dhash === "string" ? m : null); };
      r.onerror = () => ok(null);
    } catch { ok(null); }
  });
}
async function ecrire(id: string, m: Mesure): Promise<void> {
  const b = await base();
  if (!b) return;
  try { b.transaction(MAGASIN, "readwrite").objectStore(MAGASIN).put(m, `${VERSION}:${id}`); } catch { /* rien */ }
}

/** La mesure d'une image : réduite à COTE px de grand côté, en gris. Null si illisible. */
async function mesurer(source: string): Promise<Mesure | null> {
  let im: ImageBitmap;
  try {
    const r = await fetch(source);
    if (!r.ok) return null;
    im = await createImageBitmap(await r.blob(), { imageOrientation: "from-image" });
  } catch { return null; }
  try {
    const k = Math.min(1, COTE / Math.max(im.width, im.height));
    const l = Math.max(3, Math.round(im.width * k)), h = Math.max(3, Math.round(im.height * k));
    const cv = new OffscreenCanvas(l, h);
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(im, 0, 0, l, h);
    const px = ctx.getImageData(0, 0, l, h).data;
    const gris = new Uint8Array(l * h);
    for (let i = 0, j = 0; j < gris.length; i += 4, j++) gris[j] = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    return mesurerGris(gris, l, h);
  } catch { return null; } finally { im.close(); }
}

/** Mesure les photos du catalogue (une fois chacune) et pose la lecture de l'album dans l'état. */
export function useLecture(catalogue: Catalogue | null, adresses: ReadonlyMap<string, Adresse>, envoyer: (g: Geste) => void): void {
  const mesures = useRef(new Map<string, Mesure>());
  const tentees = useRef(new Set<string>());
  const envoyerRef = useRef(envoyer);
  const catRef = useRef(catalogue);
  useEffect(() => { envoyerRef.current = envoyer; catRef.current = catalogue; });

  useEffect(() => {
    if (!catalogue) return;
    let fini = false;
    const aFaire = [...catalogue.values()]
      .filter((p) => !tentees.current.has(p.id))
      .map((p) => ({ id: p.id, source: adresses.get(p.id)?.vignette ?? adresses.get(p.id)?.moyenne ?? null }))
      .filter((x): x is { id: string; source: string } => !!x.source);
    if (!aFaire.length) return;
    let depuis = 0;
    const poser = () => {
      const c = catRef.current;
      if (c) envoyerRef.current({ type: "poserLecture", lecture: lireMesures(c, mesures.current) });
    };
    const une = async (x: { id: string; source: string }) => {
      tentees.current.add(x.id);
      let m = await lire(x.id);
      if (!m) { m = await mesurer(x.source); if (m) void ecrire(x.id, m); }
      if (m) mesures.current.set(x.id, m);
      if (!fini && ++depuis >= PAQUET) { depuis = 0; poser(); }
    };
    let k = 0;
    const filer = async () => { while (!fini && k < aFaire.length) await une(aFaire[k++]); };
    void Promise.all(Array.from({ length: EN_VOL_MAX }, filer)).then(() => { if (!fini) poser(); });
    return () => { fini = true; };
  }, [catalogue, adresses]);
}
