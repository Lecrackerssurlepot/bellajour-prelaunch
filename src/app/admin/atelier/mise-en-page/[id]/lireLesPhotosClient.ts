/**
 * « Lire les photos » côté navigateur (17/11) : les PIXELS et l'appel à la route. Le navigateur compose les planches de 16 vignettes
 * numérotées (canvas, 4 colonnes, cases de 384 px, numéro blanc sur pavé noir en haut à gauche, JPEG ≤ 1 536 px) et l'image d'un
 * regard fin (JPEG ≤ 1 024 px), comme l'essai du 17/11 (`essai.py`). Les choix (quelles photos, quel ordre, quel coût) sont dans
 * le module pur (`editeur/lireLesPhotos.ts`) ; la route relit tout. Rien n'est gardé ici : les images partent et sont oubliées.
 */

import { CASE_PLANCHE_PX, COLONNES_PLANCHE, PLANCHE_MAX_PX, QUALITE_JPEG, REGARD_MAX_PX, type LuPlanche, type LuRegard, type PourquoiRegard } from "@/lib/mise-en-page/editeur";

const ROUTE = "/api/admin/atelier/mise-en-page/lecture-ia";

async function bitmap(url: string | null, signal: AbortSignal): Promise<ImageBitmap | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal });
    if (!r.ok) return null;
    return await createImageBitmap(await r.blob(), { imageOrientation: "from-image" });
  } catch { return null; }
}

/** Une image tenue dans `cote` × `cote`, jamais agrandie. */
const reduit = (l: number, h: number, cote: number): { l: number; h: number } => {
  const k = Math.min(1, cote / Math.max(l, h));
  return { l: Math.max(1, Math.round(l * k)), h: Math.max(1, Math.round(h * k)) };
};

/** La planche des photos `urls` (16 au plus), numérotées à partir de `n0`. Une photo illisible laisse sa case blanche, numérotée. */
export async function composerPlanche(urls: readonly (string | null)[], n0: number, signal: AbortSignal): Promise<string> {
  const c = CASE_PLANCHE_PX, col = COLONNES_PLANCHE, rangs = Math.ceil(urls.length / col);
  const cv = document.createElement("canvas");
  cv.width = Math.min(PLANCHE_MAX_PX, col * c);
  cv.height = Math.min(PLANCHE_MAX_PX, rangs * c);
  const g = cv.getContext("2d");
  if (!g) throw new Error("canvas");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, cv.width, cv.height);
  const ims = await Promise.all(urls.map((u) => bitmap(u, signal)));
  ims.forEach((im, i) => {
    const x = (i % col) * c, y = Math.floor(i / col) * c;
    if (im) {
      const t = reduit(im.width, im.height, c - 8);
      g.drawImage(im, x + Math.floor((c - t.l) / 2), y + Math.floor((c - t.h) / 2), t.l, t.h);
      im.close();
    }
    g.fillStyle = "#000";
    g.fillRect(x + 4, y + 4, 58, 42);
    g.fillStyle = "#fff";
    g.font = "bold 34px Arial, Helvetica, sans-serif";
    g.textBaseline = "top";
    g.fillText(String(n0 + i), x + 10, y + 8);
  });
  return cv.toDataURL("image/jpeg", QUALITE_JPEG);
}

/** L'image d'un regard fin : la photo tenue dans 1 024 px. Null si elle ne se lit pas. */
export async function imageRegard(url: string | null, signal: AbortSignal): Promise<string | null> {
  const im = await bitmap(url, signal);
  if (!im) return null;
  const t = reduit(im.width, im.height, REGARD_MAX_PX);
  const cv = document.createElement("canvas");
  cv.width = t.l; cv.height = t.h;
  const g = cv.getContext("2d");
  if (!g) { im.close(); return null; }
  g.drawImage(im, 0, 0, t.l, t.h);
  im.close();
  return cv.toDataURL("image/jpeg", QUALITE_JPEG);
}

export type Reponse<T> = { ok: true; resultat: T; dollars: number; modele: string } | { ok: false; erreur: string; statut: number; dollars: number };

async function poster<T>(corps: Record<string, unknown>, signal: AbortSignal): Promise<Reponse<T>> {
  try {
    const r = await fetch(ROUTE, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(corps), signal });
    const j = (await r.json().catch(() => null)) as { ok?: boolean; resultat?: T; dollars?: number; modele?: string; error?: string } | null;
    const dollars = typeof j?.dollars === "number" && Number.isFinite(j.dollars) ? j.dollars : 0;
    if (r.ok && j?.ok && j.resultat !== undefined) return { ok: true, resultat: j.resultat, dollars, modele: j.modele ?? "" };
    return { ok: false, erreur: j?.error ?? "erreur", statut: r.status, dollars };
  } catch {
    return { ok: false, erreur: signal.aborted ? "arrete" : "reseau", statut: 0, dollars: 0 };
  }
}

export const lirePlanche = (cle: string, image: string, n0: number, n: number, signal: AbortSignal) =>
  poster<{ photos: LuPlanche[]; absents: number[] }>({ cle, etape: "planche", image, numeros: [n0, n] }, signal);

export const regarder = (cle: string, image: string, pourquoi: PourquoiRegard, indice: string, signal: AbortSignal) =>
  poster<LuRegard>({ cle, etape: "photo", image, candidate: pourquoi, ...(indice ? { indice } : {}) }, signal);
