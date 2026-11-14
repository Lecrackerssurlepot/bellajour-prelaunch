/**
 * Les couleurs LIBRES (lot G, 14/11) : un fond de couleur sur n'importe quelle page ou double, et la couleur de chaque texte.
 *
 * Une couleur libre est un RÔLE du nuancier (papier, encre, aplatClair, aplatSourd, accent, nuit) ou un hexa `#rrggbb` en
 * minuscules, rien d'autre. Un rôle suit le nuancier : appliquer un combo, ou changer une pastille du panneau Style, change
 * aussi tous les fonds et tous les textes posés sous ce rôle. Un hexa reste ce qu'il est (la pipette, le choix libre).
 *
 * Où elles vivent dans le magazine (clés FACULTATIVES, écrites seulement quand elles existent, jamais `undefined`) :
 * - `Planche.fond` : `{ gauche?, droite? }`, une couleur par côté. Une double se colore en entier en posant les deux côtés ;
 *   le fond ne dépend ni du gabarit ni du mode de la planche (il survit à un changement de gabarit, à « Séparer », au
 *   déplacement de la planche) ; la première page n'a pas de côté gauche, la dernière pas de côté droit ;
 * - `TexteCadre.couleur` : la couleur choisie pour ce texte ; absente, c'est celle du gabarit (l'encre, ou « blanc »).
 *   Elle vaut pour les textes de la couverture aussi (le mot-titre et la ligne).
 *
 * Sans style, un rôle se lit dans le nuancier d'origine (`COULEURS_ORIGINE`) : le fond et le texte ont donc toujours une
 * couleur. Un magazine sans aucune couleur libre garde son rendu d'avant, au bit près (écran, IDML, PDF).
 *
 * Module PUR : ni React, ni réseau, ni horloge.
 */

import { FOND_PERDU, PAGE_H, PAGE_L, PLANCHE_L, type Rect } from "./geometrie";
import { COULEURS_ORIGINE, ROLES_COULEUR, estHex, hexVersRgb, lchDeHex, type RoleCouleur } from "./nuancier";
import { NUANCE_ROLE, classeRole, type StyleMagazine } from "./style";
import type { CoteSeul } from "./magazine";

/* ─────────────────────────── la couleur ─────────────────────────── */

/** Un rôle du nuancier, ou un hexa `#rrggbb` en minuscules. */
export type CouleurLibre = RoleCouleur | `#${string}`;

export const estRole = (v: unknown): v is RoleCouleur => typeof v === "string" && (ROLES_COULEUR as readonly string[]).includes(v);

/** La couleur, relue EXACTEMENT : un rôle connu ou `#rrggbb` minuscule. Ni « blanc », ni « #FFF », ni un nom. */
export const couleurLibreValide = (v: unknown): v is CouleurLibre => estRole(v) || estHex(v);

/** L'hexa d'une couleur libre : un rôle se lit dans le nuancier du style (sans style : le nuancier d'origine). */
export function hexDeCouleur(c: CouleurLibre, style: StyleMagazine | null | undefined): string {
  return estRole(c) ? (style?.couleurs ?? COULEURS_ORIGINE)[c] : c;
}

/** La couleur CSS de l'écran : un rôle lit sa variable (posée sur la racine par le style, ou celle d'origine), un hexa est tel quel. */
export const cssDeCouleur = (c: CouleurLibre): string => (estRole(c) ? `var(--mep-r-${classeRole(c)})` : c);

/* ─────────────────────────── le nom d'une teinte ─────────────────────────── */

/** Les noms de teinte du décideur (`demo-2026-11-13/composition/decider/couleurs.py`, `NOMS_TEINTES`), bornes en degrés de h (LCh). */
const NOMS_TEINTES: readonly (readonly [number, string])[] = [
  [15, "rouge"], [45, "terre cuite"], [70, "ocre"], [100, "sable doré"], [150, "vert"], [200, "vert d'eau"], [255, "bleu"], [290, "bleu nuit"], [330, "violet"], [360, "rose"],
];

/** Le nom de base d'une teinte (h en degrés) : « ocre », « bleu »… */
export function nomDeTeinte(h: number): string {
  const t = ((h % 360) + 360) % 360;
  return NOMS_TEINTES.find(([borne]) => t < borne)?.[1] ?? "rouge";
}

/** Le nom d'une couleur, comme le décideur le dit : un gris, ou la teinte, « pâle » au-dessus de L 80, « profond » sous L 35. */
export function nomDeCouleur(hex: string): string {
  if (!estHex(hex)) return "couleur";
  const { L, C, h } = lchDeHex(hex);
  if (C < 8) return L > 70 ? "gris clair" : L > 35 ? "gris" : "noir";
  const base = nomDeTeinte(h);
  return L >= 80 ? `${base} pâle` : L <= 35 ? `${base} profond` : base;
}

export const majuscule = (s: string): string => (s ? s[0].toLocaleUpperCase("fr") + s.slice(1) : s);

/* ─────────────────────────── le fond d'une planche ─────────────────────────── */

export type CoteFond = "gauche" | "droite";
/** Le fond d'une planche : une couleur par côté, au moins un côté. */
export type FondPlanche = Partial<Record<CoteFond, CouleurLibre>>;

/**
 * Le fond, relu EXACTEMENT : un objet de clés `gauche` et/ou `droite` (au moins une), chacune une couleur libre. `seul` : la
 * page seule de la planche (la première est une page droite, elle n'a pas de fond gauche ; la dernière, l'inverse).
 */
export function fondValide(v: unknown, seul: CoteSeul | null = null): v is FondPlanche {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const cles = Object.keys(v);
  if (!cles.length || !cles.every((k) => k === "gauche" || k === "droite")) return false;
  if (seul && cles.some((k) => k !== seul)) return false;
  return cles.every((k) => couleurLibreValide((v as Record<string, unknown>)[k]));
}

/** Une pièce de fond, prête à dessiner : son côté (« double » quand les deux côtés ont la même couleur), son rectangle (mm, repère planche), sa couleur. */
export type PieceFond = { cote: CoteFond | "double"; rect: Rect; couleur: CouleurLibre };

/**
 * Les pièces du fond d'une planche, en mm repère planche, sous les aplats du gabarit.
 * - `perdu` : le fond déborde de 3 mm sur les bords EXTÉRIEURS (export) ; jamais au pli d'une double.
 * - `pliPerdu` : une page SEULE déborde aussi côté pli (le PDF, dont la page seule a ses quatre fonds perdus) ; l'IDML, comme
 *   le papier teinté du style, s'arrête au pli.
 * Une double aux deux côtés de la même couleur donne UNE pièce (un seul objet à recolorer dans Affinity). La page seule ne lit
 * que son côté.
 */
export function piecesDuFond(fond: FondPlanche | undefined, seul: CoteSeul | null, o: { perdu: boolean; pliPerdu?: boolean }): PieceFond[] {
  if (!fond) return [];
  const F = o.perdu ? FOND_PERDU : 0;
  const P = o.perdu && o.pliPerdu ? FOND_PERDU : 0;
  const h = PAGE_H + 2 * F;
  const gauche = (seule: boolean): Rect => ({ x: -F, y: -F, l: PAGE_L + F + (seule ? P : 0), h });
  const droite = (seule: boolean): Rect => ({ x: PAGE_L - (seule ? P : 0), y: -F, l: PAGE_L + F + (seule ? P : 0), h });
  if (seul === "droite") return fond.droite ? [{ cote: "droite", rect: droite(true), couleur: fond.droite }] : [];
  if (seul === "gauche") return fond.gauche ? [{ cote: "gauche", rect: gauche(true), couleur: fond.gauche }] : [];
  if (fond.gauche && fond.droite && fond.gauche === fond.droite) return [{ cote: "double", rect: { x: -F, y: -F, l: PLANCHE_L + 2 * F, h }, couleur: fond.gauche }];
  return [
    ...(fond.gauche ? [{ cote: "gauche" as const, rect: gauche(false), couleur: fond.gauche }] : []),
    ...(fond.droite ? [{ cote: "droite" as const, rect: droite(false), couleur: fond.droite }] : []),
  ];
}

/* ─────────────────────────── les nuances de l'IDML ─────────────────────────── */

/**
 * La nuance NOMMÉE d'une couleur libre dans l'IDML. `declarer` : la balise `<Color>` à ajouter à Graphic.xml (null : la nuance
 * existe déjà dans le paquet).
 * - un rôle sous un style : la nuance du rôle (`Color/Accent`…), déjà déclarée avec les six du nuancier ;
 * - un rôle sans style : la même nuance, déclarée avec la valeur d'origine ; le papier reste `Color/Paper` (comme le texte « blanc ») ;
 * - un hexa : `Color/Libre-rrggbb`, nommée « Ocre #ca7749 » (le nom de la teinte et sa valeur).
 */
export function nuanceIdml(c: CouleurLibre, sousStyle: boolean): { self: string; declarer: string | null } {
  if (estRole(c)) {
    if (sousStyle) return { self: NUANCE_ROLE[c].self, declarer: null };
    if (c === "papier") return { self: "Color/Paper", declarer: null };
    return { self: NUANCE_ROLE[c].self, declarer: couleurXml(NUANCE_ROLE[c].self, NUANCE_ROLE[c].nom, COULEURS_ORIGINE[c]) };
  }
  const self = `Color/Libre-${c.slice(1)}`;
  return { self, declarer: couleurXml(self, `${majuscule(nomDeCouleur(c))} ${c}`, c) };
}

/** Une nuance RVB, écrite comme celles du nuancier (`nuancesDuStyle`). */
const couleurXml = (self: string, nom: string, hex: string): string =>
  `<Color Self="${self}" Model="Process" Space="RGB" ColorValue="${hexVersRgb(hex).join(" ")}" Name="${nom.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}"/>`;
