/**
 * « Lire les photos » côté navigateur (17/11) : les PIXELS et l'appel à la route. Le navigateur compose les planches de 16 vignettes
 * numérotées (canvas, 4 colonnes, cases de 384 px, numéro blanc sur pavé noir en haut à gauche, JPEG ≤ 1 536 px) et l'image d'un
 * regard fin (JPEG ≤ 1 024 px), comme l'essai du 17/11 (`essai.py`). Les choix (quelles photos, quel ordre, quel coût) sont dans
 * le module pur (`editeur/lireLesPhotos.ts`) ; la route relit tout. Rien n'est gardé ici : les images partent et sont oubliées.
 */

import { CASE_PLANCHE_PX, COLONNES_PLANCHE, PLANCHE_MAX_PX, QUALITE_JPEG, REGARD_MAX_PX, type LuPlanche, type LuRegard, type PourquoiRegard } from "@/lib/mise-en-page/editeur";
import type { Adresse } from "./contexte";

const ROUTE = "/api/admin/atelier/mise-en-page/lecture-ia";

/** Une image décodée, ou null : jamais d'exception (adresse périmée = 403 sans CORS = `fetch` qui lève). */
async function bitmap(url: string | null, signal: AbortSignal): Promise<ImageBitmap | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal });
    if (!r.ok) return null;
    return await createImageBitmap(await r.blob(), { imageOrientation: "from-image" });
  } catch { return null; }
}

/** M-13 (18/11) : les adresses à essayer pour une photo, dans l'ordre : la moyenne, la vignette, puis l'original (sans doublon). */
export const adressesAEssayer = (a: Adresse | undefined): string[] => [...new Set([a?.moyenne, a?.vignette, a?.original].filter((u): u is string => !!u))];

/** M-13 : une photo, essayée à chacune de ses tailles ; null seulement si AUCUNE ne se charge (la photo est alors « illisible »). */
export async function chargerImage(a: Adresse | undefined, signal: AbortSignal): Promise<ImageBitmap | null> {
  for (const u of adressesAEssayer(a)) {
    if (signal.aborted) return null;
    const im = await bitmap(u, signal);
    if (im) return im;
  }
  return null;
}

/** M-13 : les images d'un lot (en parallèle, `enVol` à la fois). La table rend une image ou null pour chaque photo. */
export async function chargerImages(ids: readonly string[], adresseDe: (id: string) => Adresse | undefined, signal: AbortSignal, enVol = 6): Promise<Map<string, ImageBitmap | null>> {
  const out = new Map<string, ImageBitmap | null>();
  let k = 0;
  await Promise.all(Array.from({ length: Math.min(enVol, ids.length) }, async () => {
    while (k < ids.length && !signal.aborted) { const id = ids[k++]; out.set(id, await chargerImage(adresseDe(id), signal)); }
  }));
  return out;
}

/** M-13 : vérifier qu'une photo se charge, sans garder l'image (le contrôle avant de payer). */
export async function seCharge(a: Adresse | undefined, signal: AbortSignal): Promise<boolean> {
  const im = await chargerImage(a, signal);
  im?.close();
  return !!im;
}

type Table = ReadonlyMap<string, Adresse>;
/**
 * M-13 : le contrôle AVANT de payer. Les adresses sont relues si elles ne sont plus sûres ; chaque photo à lire est essayée (à chacune de
 * ses tailles) ; celles qui échouent sont réessayées une fois après une relecture FORCÉE des adresses. Rend la table à utiliser et les
 * photos illisibles (l'appelant les retire des planches et s'arrête au-delà du seuil, `arretIllisibles`).
 */
export async function controlerImages(ids: readonly string[], adresses: Table, rafraichir: ((forcer?: boolean) => Promise<Table>) | undefined, signal: AbortSignal,
  progres?: (fait: number, total: number) => void): Promise<{ adresses: Table; illisibles: Set<string> }> {
  let table = rafraichir ? await rafraichir(false) : adresses;
  const essayer = async (l: readonly string[], t: Table, compter: boolean): Promise<string[]> => {
    const echecs: string[] = [];
    let k = 0, fait = 0;
    await Promise.all(Array.from({ length: Math.min(6, l.length) }, async () => {
      while (k < l.length && !signal.aborted) {
        const id = l[k++];
        if (!(await seCharge(t.get(id), signal))) echecs.push(id);
        if (compter) progres?.(++fait, l.length);
      }
    }));
    return echecs;
  };
  const echecs = await essayer(ids, table, true);
  if (!echecs.length || signal.aborted || !rafraichir) return { adresses: table, illisibles: new Set(echecs) };
  table = await rafraichir(true);
  return { adresses: table, illisibles: new Set(await essayer(echecs, table, false)) };
}

/** Une image tenue dans `cote` × `cote`, jamais agrandie. */
const reduit = (l: number, h: number, cote: number): { l: number; h: number } => {
  const k = Math.min(1, cote / Math.max(l, h));
  return { l: Math.max(1, Math.round(l * k)), h: Math.max(1, Math.round(h * k)) };
};

/** La planche des images `ims` (16 au plus, TOUTES lisibles : M-13, jamais une case vide), numérotées à partir de `n0`. Les images sont
 *  refermées. */
export function composerPlanche(ims: readonly ImageBitmap[], n0: number): string {
  const c = CASE_PLANCHE_PX, col = COLONNES_PLANCHE, rangs = Math.ceil(ims.length / col);
  const cv = document.createElement("canvas");
  cv.width = Math.min(PLANCHE_MAX_PX, col * c);
  cv.height = Math.min(PLANCHE_MAX_PX, rangs * c);
  const g = cv.getContext("2d");
  if (!g) throw new Error("canvas");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, cv.width, cv.height);
  ims.forEach((im, i) => {
    const x = (i % col) * c, y = Math.floor(i / col) * c;
    const t = reduit(im.width, im.height, c - 8);
    g.drawImage(im, x + Math.floor((c - t.l) / 2), y + Math.floor((c - t.h) / 2), t.l, t.h);
    im.close();
    g.fillStyle = "#000";
    g.fillRect(x + 4, y + 4, 58, 42);
    g.fillStyle = "#fff";
    g.font = "bold 34px Arial, Helvetica, sans-serif";
    g.textBaseline = "top";
    g.fillText(String(n0 + i), x + 10, y + 8);
  });
  return cv.toDataURL("image/jpeg", QUALITE_JPEG);
}

/** L'image d'un regard fin : la photo tenue dans 1 024 px, essayée à chacune de ses tailles. Null si elle ne se lit pas (jamais envoyée). */
export async function imageRegard(a: Adresse | undefined, signal: AbortSignal): Promise<string | null> {
  const im = await chargerImage(a, signal);
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
