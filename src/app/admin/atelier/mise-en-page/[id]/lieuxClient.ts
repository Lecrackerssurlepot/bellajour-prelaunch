/**
 * Les lieux détaillés côté navigateur (09/11) : demandés à `/api/admin/atelier/mise-en-page/lieux` quand on ouvre un
 * titre ou une légende, gardés dans localStorage (un endroit n'est demandé qu'une fois, même d'une séance à l'autre).
 * Best-effort : sans clé, hors ligne, rien ne s'affiche et rien ne bloque.
 */

import { useEffect, useSyncExternalStore } from "react";
import { MAX_POINTS_LIEUX, cleLieu, type LieuDetaille } from "@/lib/mise-en-page/lieux";

const CLE = "bj-mep-lieux";
let cache: Map<string, LieuDetaille | null> | null = null;
const enCours = new Set<string>();
const ecouteurs = new Set<() => void>();
let version = 0;
let coupe = false;

function lu(): Map<string, LieuDetaille | null> {
  if (cache) return cache;
  cache = new Map();
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) for (const [k, v] of Object.entries(JSON.parse(brut) as Record<string, LieuDetaille | null>)) cache.set(k, v);
  } catch { /* rien */ }
  return cache;
}
function garder(): void {
  try { localStorage.setItem(CLE, JSON.stringify(Object.fromEntries(lu()))); } catch { /* plein ou bloqué */ }
}

async function demander(points: { lat: number; lon: number; cle: string }[]): Promise<void> {
  for (let i = 0; i < points.length; i += MAX_POINTS_LIEUX) {
    const lot = points.slice(i, i + MAX_POINTS_LIEUX);
    try {
      const r = await fetch("/api/admin/atelier/mise-en-page/lieux", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ points: lot.map(({ lat, lon }) => ({ lat, lon })) }),
      });
      if (r.status === 503) { coupe = true; return; }
      if (!r.ok) continue;
      const j = (await r.json()) as { lieux?: Record<string, LieuDetaille | null> };
      for (const p of lot) if (j.lieux && Object.hasOwn(j.lieux, p.cle)) lu().set(p.cle, j.lieux[p.cle]);
      garder();
    } catch { /* hors ligne */ } finally {
      for (const p of lot) enCours.delete(p.cle);
      version += 1;
      for (const f of ecouteurs) f();
    }
  }
}

const abonner = (f: () => void): (() => void) => { ecouteurs.add(f); return () => { ecouteurs.delete(f); }; };

/** Les lieux détaillés de ces GPS (ceux déjà connus tout de suite, les autres quand ils arrivent). */
export function useLieux(gps: readonly ({ lat: number; lon: number } | null | undefined)[]): (LieuDetaille | null)[] {
  useSyncExternalStore(abonner, () => version, () => 0);
  const cles = gps.map((g) => (g ? cleLieu(g.lat, g.lon) : null));
  const cle = cles.join("|");
  useEffect(() => {
    if (coupe) return;
    const c = lu();
    const manquants = new Map<string, { lat: number; lon: number; cle: string }>();
    gps.forEach((g, i) => {
      const k = cles[i];
      if (g && k && !c.has(k) && !enCours.has(k)) manquants.set(k, { lat: g.lat, lon: g.lon, cle: k });
    });
    if (!manquants.size) return;
    for (const k of manquants.keys()) enCours.add(k);
    void demander([...manquants.values()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `cle` résume `gps`
  }, [cle]);
  if (typeof window === "undefined") return cles.map(() => null);
  const c = lu();
  return cles.map((k) => (k ? c.get(k) ?? null : null));
}
