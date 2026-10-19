/**
 * L'accord du participant (T-184, 19/10/2026) : la case qu'il coche avant de
 * choisir ses photos (`app/depot/[token]/Depot.tsx`).
 * Module PUR, importable par le navigateur : aucun accès base, réseau ou
 * environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QUI EST PROUVÉ, ET OÙ
 *
 * - Le navigateur envoie `accord: true` et la VERSION du texte affiché avec
 *   chaque déclaration de photos (`moteur.ts`). L'accord est celui coché AU
 *   MOMENT où les photos sont choisies, comme la provenance.
 * - La route (`api/collectif/depot/presign`) refuse un participant sans accord
 *   (400 `accord_requis`, avant toute écriture), puis écrit la version et
 *   l'heure du SERVEUR sur chaque photo (`accord_version`, `accord_le` de
 *   `collectif_photos`, migration 20261020) : la preuve voyage avec la photo,
 *   dans la même insertion.
 * - Le responsable (il a signé le devis) et l'atelier ne cochent rien : leurs
 *   photos ont un accord nul.
 *
 * ⚠️ Le texte est LÉGAL (choisi par Mathias le 17/10, PR #245) : il vit dans
 * Depot.tsx, ses versions vivent ici. Changer UN mot du texte affiché, c'est
 * une NOUVELLE version, ajoutée à `TEXTES_ACCORD` (le harnais compare le texte
 * de la page à celui de `VERSION_ACCORD`). Une version ne se retire jamais :
 * des photos la portent, et c'est elle qui dit ce qui a été accepté.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { parler } from "./espace";
import type { Registre } from "./types";

/** La version du texte affiché aujourd'hui : le jour où Mathias l'a choisi. */
export const VERSION_ACCORD = "2026-10-17";

/**
 * Chaque version et son texte, tel que la page l'affiche. `{evenement}` et
 * `{deOrganisation}` sont les noms de l'édition (« de SKEMA », « d'Air
 * France », `deNom`). Une `Map`, jamais un objet littéral : une version
 * nommée « constructor » ne doit rien trouver (T-161).
 */
export const TEXTES_ACCORD: ReadonlyMap<string, string> = new Map([
  [
    "2026-10-17",
    "J'accepte que Bellajour utilise ces photos pour composer le magazine « {evenement} » {deOrganisation}, et je confirme avoir le droit de les partager, y compris pour les personnes qu'on y voit.",
  ],
]);

export type Accord = { version: string };

/** Qui doit cocher : le participant seul. Le responsable et l'atelier, non. */
export function accordExige(role: string): boolean {
  return role === "participant";
}

/**
 * L'accord porté par le corps d'une déclaration : `accord: true` (le booléen,
 * pas la chaîne) ET une version connue. Rien d'autre ne vaut accord.
 */
export function lireAccord(corps: Record<string, unknown>): Accord | null {
  if (corps.accord !== true) return null;
  const version = corps.accordVersion;
  return typeof version === "string" && TEXTES_ACCORD.has(version) ? { version } : null;
}

/** Le code du refus, que le moteur sait lire. */
export const ERREUR_ACCORD = "accord_requis";

/** La phrase du refus, au registre de l'édition. */
export function messageAccord(registre: Registre): string {
  return parler(registre)("Cochez l'accord pour envoyer vos photos.", "Coche l'accord pour envoyer tes photos.");
}

/**
 * Les colonnes écrites avec chaque photo d'un participant : la version
 * acceptée et l'heure du SERVEUR (celle du navigateur ne prouve rien). Sans
 * accord (responsable, atelier), rien.
 */
export function colonnesAccord(accord: Accord | null, maintenant: Date): { accord_version?: string; accord_le?: string } {
  return accord ? { accord_version: accord.version, accord_le: maintenant.toISOString() } : {};
}
