/**
 * Le commun des deux routes de la sauvegarde partagée (`magazines`,
 * `magazines/[id]`). Serveur uniquement. Pas une route : Next ne sert que les
 * fichiers `route.ts`.
 *
 * Les règles (forme du contenu, borne, verrou) vivent dans le module pur
 * `@/lib/mise-en-page/sauvegarde` ; ici seulement la lecture bornée du corps et
 * les réponses communes.
 */

import { NextResponse } from "next/server";
import { tableAbsente } from "@/lib/collectif/migration";
import { ERREUR_MISES_EN_PAGE_ABSENTE, MESSAGE_MISES_EN_PAGE_ABSENTE } from "@/lib/mise-en-page/sauvegarde";

export const SANS_CACHE = { "Cache-Control": "no-store" };

/** Les colonnes d'une ligne SANS le contenu : ce que rend la liste, et la réponse d'une sauvegarde. */
export const COLONNES_SANS_CONTENU =
  "id, source, numero_id, edition_id, magazine_id, titre, etat, version, cree_par, created_at, modifie_par, modifie_le, exporte_le";
export const COLONNES_COMPLETES = `${COLONNES_SANS_CONTENU}, contenu`;

export const refus = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status, headers: SANS_CACHE });

/** La table `mises_en_page` manque-t-elle ? (migration 20261027 non appliquée.) */
export const tableMepAbsente = (code: string | null | undefined): boolean => tableAbsente(code);

export const reponseTableAbsente = () =>
  refus(503, ERREUR_MISES_EN_PAGE_ABSENTE, { message: MESSAGE_MISES_EN_PAGE_ABSENTE });

/**
 * Le corps JSON d'une requête, lu sans jamais dépasser `max` octets : refus
 * sur l'en-tête annoncé, PUIS compte réel pendant la lecture (un en-tête peut
 * mentir ou manquer). `trop_lourd` → 413, `illisible` → 400.
 */
export async function lireCorpsBorne(
  request: Request,
  max: number,
): Promise<{ ok: true; corps: Record<string, unknown> } | { ok: false; raison: "trop_lourd" | "illisible" }> {
  const annonce = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(annonce) && annonce > max) return { ok: false, raison: "trop_lourd" };
  if (!request.body) return { ok: false, raison: "illisible" };

  const lecteur = request.body.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await lecteur.cancel().catch(() => undefined);
        return { ok: false, raison: "trop_lourd" };
      }
      morceaux.push(value);
    }
  } catch {
    return { ok: false, raison: "illisible" };
  }

  const tout = new Uint8Array(total);
  let pos = 0;
  for (const m of morceaux) { tout.set(m, pos); pos += m.byteLength; }
  try {
    const c = JSON.parse(new TextDecoder().decode(tout)) as unknown;
    return c && typeof c === "object" && !Array.isArray(c) ? { ok: true, corps: c as Record<string, unknown> } : { ok: false, raison: "illisible" };
  } catch {
    return { ok: false, raison: "illisible" };
  }
}

export const refusCorps = (raison: "trop_lourd" | "illisible") =>
  raison === "trop_lourd" ? refus(413, "trop_lourd") : refus(400, "corps_illisible");
