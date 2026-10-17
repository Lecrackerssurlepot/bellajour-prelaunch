/**
 * Les photos d'un dossier qui existent déjà dans un AUTRE dossier (T-156).
 * Module PUR : la détection et la lecture du journal. Les lectures en base
 * et l'écriture de l'événement sont dans `enrichissement.ts`.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * D'OÙ ÇA VIENT
 *
 * Le 06/10/2026, 92 photos identiques octet pour octet à celles d'un dossier
 * livré sont arrivées dans le dossier d'une autre cliente, par le parcours
 * normal. `groupesDeDoublons` (empreinte.ts) ne compare que les photos d'un
 * MÊME dossier : rien ne l'a remarqué. On ne l'a su qu'en enquêtant.
 *
 * LA RÈGLE
 *
 * Même TAILLE au fichier près (les octets mesurés sur R2, `photos.taille`)
 * ET même empreinte, à `SEUIL_DOUBLON` près. La taille exacte est le critère
 * fort : deux fichiers différents ont rarement le même nombre d'octets, et
 * jamais en série. L'empreinte écarte la coïncidence restante. Elle n'est
 * pas exigée à l'identique parce qu'elle se calcule sur la VIGNETTE, que
 * chaque navigateur refabrique à sa manière : le même fichier déposé depuis
 * un iPhone puis depuis un Mac peut différer d'un bit.
 *
 * ⚠️ UNE REMARQUE, JAMAIS UN REFUS. Deux invités d'un même mariage se
 * partagent les mêmes photos par WhatsApp, et deux numéros d'une même
 * famille peuvent légitimement en porter. La fiche le dit, l'atelier juge.
 * Pas de `TAILLE_GROUPE_MAX` ici non plus : un lot ENTIER retrouvé ailleurs
 * est précisément le signal.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { SEUIL_DOUBLON, distanceHamming } from "./empreinte";

/** Le type de la ligne de journal, posé sur le dossier qui REÇOIT. */
export const EVT_DOUBLONS_AILLEURS = "doublons_autre_dossier";

export type PhotoAuCoffre = {
  id: string;
  numeroId: string;
  taille: number | null;
  empreinte: string | null;
};

export type DoublonsAilleurs = {
  /** L'autre dossier. */
  numeroId: string;
  /** Les photos DU LOT qu'on y retrouve. */
  photos: string[];
};

const EMPREINTE = /^[0-9a-f]{16}$/;
const comparable = (p: PhotoAuCoffre): boolean =>
  typeof p.taille === "number" && p.taille > 0 && typeof p.empreinte === "string" && EMPREINTE.test(p.empreinte);

/**
 * Pour chaque autre dossier, les photos du lot qu'il porte déjà. Le plus
 * touché d'abord. Une photo du lot qui ressemble à deux photos d'un même
 * dossier n'y compte qu'une fois.
 */
export function doublonsAilleurs(
  lot: PhotoAuCoffre[],
  ailleurs: PhotoAuCoffre[],
  seuil = SEUIL_DOUBLON,
): DoublonsAilleurs[] {
  const parTaille = new Map<number, PhotoAuCoffre[]>();
  for (const a of ailleurs) {
    if (!comparable(a)) continue;
    const liste = parTaille.get(a.taille!) ?? [];
    liste.push(a);
    parTaille.set(a.taille!, liste);
  }

  const parDossier = new Map<string, Set<string>>();
  for (const p of lot) {
    if (!comparable(p)) continue;
    for (const a of parTaille.get(p.taille!) ?? []) {
      if (a.numeroId === p.numeroId) continue;
      if (distanceHamming(p.empreinte!, a.empreinte!) > seuil) continue;
      const ids = parDossier.get(a.numeroId) ?? new Set<string>();
      ids.add(p.id);
      parDossier.set(a.numeroId, ids);
    }
  }

  return [...parDossier.entries()]
    .map(([numeroId, ids]) => ({ numeroId, photos: [...ids].sort() }))
    .sort((a, b) => b.photos.length - a.photos.length || a.numeroId.localeCompare(b.numeroId));
}

/** Le payload de la ligne de journal : des identifiants de dossier, jamais
 *  de token (le journal n'est pas un endroit où un token doit vivre). */
export function payloadDoublonsAilleurs(groupes: DoublonsAilleurs[]): {
  photos: number;
  dossiers: Array<{ numero_id: string; photos: number }>;
} {
  const toutes = new Set(groupes.flatMap((g) => g.photos));
  return {
    photos: toutes.size,
    dossiers: groupes.map((g) => ({ numero_id: g.numeroId, photos: g.photos.length })),
  };
}

export type CumulAilleurs = {
  numeroId: string;
  photos: number;
  /** La première fois qu'on l'a remarqué. */
  le: string;
};

/**
 * Ce que la fiche affiche : le journal cumulé par autre dossier. Chaque
 * ligne porte UN lot, et une photo n'est lue qu'une fois (`metadonnees_le`) :
 * les lots ne se recouvrent pas, la somme est juste. Une ligne illisible
 * (jsonb libre, version future) est sautée, jamais fatale.
 */
export function cumulerDoublonsAilleurs(
  lignes: Array<{ payload: Record<string, unknown> | null; created_at: string }>,
): CumulAilleurs[] {
  const cumul = new Map<string, CumulAilleurs>();
  for (const l of lignes) {
    const dossiers = l.payload?.dossiers;
    if (!Array.isArray(dossiers)) continue;
    for (const d of dossiers) {
      if (!d || typeof d !== "object") continue;
      const { numero_id, photos } = d as Record<string, unknown>;
      if (typeof numero_id !== "string" || typeof photos !== "number" || photos <= 0) continue;
      const deja = cumul.get(numero_id);
      if (deja) {
        deja.photos += photos;
        if (l.created_at < deja.le) deja.le = l.created_at;
      } else {
        cumul.set(numero_id, { numeroId: numero_id, photos, le: l.created_at });
      }
    }
  }
  return [...cumul.values()].sort((a, b) => b.photos - a.photos || a.numeroId.localeCompare(b.numeroId));
}
