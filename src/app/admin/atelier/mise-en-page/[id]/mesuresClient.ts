/**
 * La couche 1 côté navigateur (09/11) : on lit la VIGNETTE de chaque photo (320 px, ou la moyenne à défaut), on la
 * ramène à `COTE` px en niveaux de gris, et le module pur (`mesurerGris`) en tire netteté et empreinte. Les mesures
 * restent dans le navigateur (IndexedDB) : la seconde ouverture est immédiate. Rien n'est écrit en base ni au coffre.
 *
 * Best-effort : une vignette illisible (HEIC, adresse expirée, panne) n'a pas de mesure, la photo reste hors des piles.
 * La lecture de l'album (`lireMesures`) est relancée par paquets, puis une dernière fois à la fin.
 */

import { useEffect, useRef } from "react";
import { carteSaillance, lireMesures, mesurerGris, paletteDePixels, REGLAGES, varianceLaplacien, zoneImportante, type Boite, type Catalogue, type Geste, type Mesure, type Visage } from "@/lib/mise-en-page/editeur";
import type { FaceDetector } from "@mediapipe/tasks-vision";
import type { Adresse } from "./contexte";

const COTE = 256;
const EN_VOL_MAX = 4;
const PAQUET = 150;
const BASE = "bj-mep-mesures";
const MAGASIN = "mesures";
/** Changer la mesure change la version : les anciennes mesures ne sont plus relues. */
const VERSION = "v3";
/** Lot 2 (A6) : le détecteur de visages de MediaPipe, servi depuis notre origine (copie de node_modules, voir le harnais). */
const MEDIAPIPE = "/mediapipe/1.2.2";
const MODELE_VISAGES = "/modeles/blaze_face_short_range.tflite";

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
      r.onsuccess = () => { const m = r.result as Mesure | undefined; ok(m && typeof m.nettete === "number" && typeof m.dhash === "string" && "zone" in m && "lumi" in m ? m : null); };
      r.onerror = () => ok(null);
    } catch { ok(null); }
  });
}
async function ecrire(id: string, m: Mesure): Promise<void> {
  const b = await base();
  if (!b) return;
  try { b.transaction(MAGASIN, "readwrite").objectStore(MAGASIN).put(m, `${VERSION}:${id}`); } catch { /* rien */ }
}

/* ─── les yeux (A6) : un détecteur, chargé une fois, best-effort ; sans lui, la zone vient de la saillance seule ─── */
let detecteur: Promise<FaceDetector | null> | null = null;
function visagesDetecteur(): Promise<FaceDetector | null> {
  if (detecteur) return detecteur;
  detecteur = (async () => {
    try {
      const { FilesetResolver, FaceDetector: FD } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE);
      return await FD.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODELE_VISAGES, delegate: "CPU" },
        runningMode: "IMAGE",
        minDetectionConfidence: REGLAGES.visage_confiance.valeur,
      });
    } catch (e) { console.warn("[mise-en-page] visages : détecteur indisponible", (e as Error)?.message); return null; }
  })();
  return detecteur;
}

/** Les visages d'une image, en fractions (boîtes), ou null si le détecteur manque. Aucune identité, rien de gardé d'autre que les boîtes. */
async function visagesDe(im: ImageBitmap): Promise<Boite[] | null> {
  const d = await visagesDetecteur();
  if (!d) return null;
  try {
    const r = d.detect(im);
    return r.detections.flatMap((x) => {
      const b = x.boundingBox;
      if (!b || b.width <= 0 || b.height <= 0) return [];
      return [{ x: b.originX / im.width, y: b.originY / im.height, l: b.width / im.width, h: b.height / im.height }];
    });
  } catch { return null; }
}

/** La mesure d'une image : réduite à COTE px de grand côté, en gris (netteté, empreinte, saillance), plus les visages. Null si illisible. */
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
    const base = mesurerGris(gris, l, h);
    const vus = await visagesDe(im);
    /* A2, A7 : la netteté DANS la boîte d'un visage, en fraction de celle de la photo entière */
    const netteteDans = (b: Boite): number | null => {
      const x0 = Math.max(0, Math.floor(b.x * l)), y0 = Math.max(0, Math.floor(b.y * h));
      const x1 = Math.min(l, Math.ceil((b.x + b.l) * l)), y1 = Math.min(h, Math.ceil((b.y + b.h) * h));
      const cl = x1 - x0, ch = y1 - y0;
      if (cl < 8 || ch < 8) return null;
      const c = new Uint8Array(cl * ch);
      for (let y = 0; y < ch; y++) for (let x = 0; x < cl; x++) c[y * cl + x] = gris[(y0 + y) * l + x0 + x];
      return varianceLaplacien(c, cl, ch);
    };
    const visages: Visage[] | null = vus ? vus.map((v) => { const n = netteteDans(v); return n === null || !base.nettete ? v : { ...v, nettete: Math.round((n / base.nettete) * 100) / 100 }; }) : null;
    const zone = zoneImportante(visages ?? [], carteSaillance(gris, l, h));
    const sujet = visages?.length ? [...visages].sort((a, b) => b.l * b.h - a.l * a.h)[0] : zone;
    const ns = sujet ? netteteDans(sujet) : null;
    /* A3 : gris moyen et parts écrêtées ; E1 : 5 teintes */
    let somme = 0, noirs = 0, blancs = 0;
    for (const v of gris) { somme += v; if (v < 8) noirs++; else if (v > 247) blancs++; }
    const lumi = { moyenne: Math.round(somme / gris.length), noirs: Math.round((noirs / gris.length) * 1000) / 1000, blancs: Math.round((blancs / gris.length) * 1000) / 1000 };
    return { ...base, ...(visages ? { visages } : {}), zone, lumi, palette: paletteDePixels(px, 8), ...(ns !== null ? { netteteSujet: ns } : {}) };
  } catch { return null; } finally { im.close(); }
}

/** Mesure les photos du catalogue (une fois chacune) et pose la lecture de l'album dans l'état. */
/** Les mesures connues de cet onglet (toutes les photos mesurées depuis l'ouverture) : l'instantané (lecons.ts) les emporte. */
const TOUTES = new Map<string, Mesure>();
export const mesuresConnues = (): ReadonlyMap<string, Mesure> => TOUTES;

export function useLecture(catalogue: Catalogue | null, adresses: ReadonlyMap<string, Adresse>, envoyer: (g: Geste) => void): void {
  const mesures = useRef(TOUTES);
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
