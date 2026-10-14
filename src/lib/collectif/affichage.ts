/**
 * Le mode d'affichage de l'espace client : jour ou nuit (PRD §14.1).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * C'est une PRÉFÉRENCE D'AFFICHAGE, pas une donnée : elle vit dans un cookie
 * de l'appareil (`bj_ec_mode`), que le layout lit pour rendre la page
 * directement dans le bon mode (aucun éclair de nuit au chargement d'une
 * page en jour). Les couleurs, elles, sont dans `espace.css`, en variables
 * sur `[data-ec-mode]` : aucun composant n'écrit une couleur.
 */

export const MODES = ["nuit", "jour"] as const;
export type ModeEspace = (typeof MODES)[number];

export const COOKIE_MODE = "bj_ec_mode";

/** La nuit par défaut (la maquette, et l'espace tel qu'il était) ; toute valeur inconnue vaut nuit. */
export function lireMode(v: unknown): ModeEspace {
  return v === "jour" ? "jour" : "nuit";
}

/** Le cookie tel que le navigateur l'écrit : un an, sur l'espace seulement, sans rien de personnel. */
export function cookieMode(mode: ModeEspace): string {
  return `${COOKIE_MODE}=${mode}; path=/edition; max-age=31536000; samesite=lax`;
}

/** Le logo suit le mode : cuivre la nuit, bleu le jour. */
export const LOGO_MODE: Record<ModeEspace, string> = {
  nuit: "/images/collectif/logo-cuivre.webp",
  jour: "/images/collectif/logo-bleu.webp",
};
