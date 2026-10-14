/**
 * Le brief d'un magazine : un style, une palette, la part de texte, 1 à 5
 * doubles pages préférées, et des couvertures aimées (PRD §1 « Brief », §4.2).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA RÈGLE DE MATHIAS (08/10), ÉCRITE À L'ÉCRAN ET TENUE ICI
 * Dans un magazine, tout l'intérieur suit le style choisi ; seule la
 * couverture peut venir d'un autre style. Donc : style, palette, texte et
 * doubles pages viennent TOUS du style choisi ; les couvertures aimées
 * peuvent venir de N'IMPORTE QUEL style publié.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Le brief se modifie tant que la collecte est ouverte (état `preparation`).
 * Modifier un brief validé le DÉ-VALIDE : le client revalide ce qu'il a changé.
 */

import { TYPES_DOUBLES, type TypeDouble } from "./styles";
import type { EtatEdition } from "./etats";

/** « Quelle place pour le texte ? » : les trois réponses de la maquette StyleDetail. */
export const PARTS_TEXTE = [
  { cle: "photos", libelle: "Surtout des photos" },
  { cle: "peu", libelle: "Un peu de texte" },
  { cle: "beaucoup", libelle: "Beaucoup de texte" },
] as const;
export type PartTexte = (typeof PARTS_TEXTE)[number]["cle"];

/** Ce que dit chaque double page type quand le style ne la légende pas (maquette StyleDetail). */
export const DESCRIPTION_DOUBLE: Record<TypeDouble, string> = {
  aeree: "Une grande photo, beaucoup de blanc.",
  equilibree: "Photos et texte à parts égales.",
  dense: "Beaucoup de photos, en mosaïque.",
  recit: "Une page de texte, une photo en regard.",
  audacieuse: "Photo coupée, titre géant, page qui surprend.",
};

export const DOUBLES_MIN = 1;
export const DOUBLES_MAX = TYPES_DOUBLES.length;

export type CouvertureAimee = { style_id: string; couverture: string };

export type Brief = {
  style_id: string | null;
  palette_cle: string | null;
  texte: string | null;
  doubles: string[];
  couvertures_aimees: CouvertureAimee[];
  brief_valide_le: string | null;
};

/** Le style vu par le brief : ce qu'il propose, pour vérifier un choix. */
export type StylePourBrief = {
  id: string;
  publie: boolean;
  palettes: { cle: string }[];
  couvertures: { cle: string }[];
};

/** Le brief peut-il encore changer ? Seulement tant que la collecte est ouverte. */
export function briefModifiable(etat: EtatEdition): boolean {
  return etat === "preparation";
}

export type ChoixStyle =
  | { ok: true; patch: { style_id: string; palette_cle: string; texte: PartTexte; doubles: TypeDouble[]; brief_valide_le: null } }
  | { ok: false; message: string };

/**
 * « Choisir ce style pour le magazine N » : le style (publié), une de SES
 * palettes, la part de texte, 1 à 5 de ses doubles pages. Rend le patch du
 * magazine, brief REMIS à valider.
 */
export function lireChoixStyle(corps: Record<string, unknown>, style: StylePourBrief): ChoixStyle {
  if (!style.publie) return { ok: false, message: "Ce style n'est pas sur le mur." };
  const palette = typeof corps.palette_cle === "string" ? corps.palette_cle : "";
  if (!style.palettes.some((p) => p.cle === palette)) return { ok: false, message: "Choisir une palette de ce style." };
  const texte = PARTS_TEXTE.find((t) => t.cle === corps.texte)?.cle;
  if (!texte) return { ok: false, message: "Répondre à « Quelle place pour le texte ? »." };
  const brutes = Array.isArray(corps.doubles) ? corps.doubles : [];
  const doubles = TYPES_DOUBLES.map((t) => t.cle).filter((c) => brutes.includes(c));
  if (doubles.length < DOUBLES_MIN) return { ok: false, message: "Choisir au moins une double page." };
  return { ok: true, patch: { style_id: style.id, palette_cle: palette, texte, doubles, brief_valide_le: null } };
}

export type PartieBrief = "palette" | "texte" | "doubles";
export type ChoixPartie = { ok: true; partie: PartieBrief; patch: Record<string, unknown> } | { ok: false; message: string };

/**
 * Modifier UNE partie du brief (révision §14.6, `/style/brief`), contrôlée
 * contre le style DÉJÀ choisi pour ce magazine : la palette vient de ce style
 * (la règle de Mathias), la part de texte d'une liste fermée, les doubles
 * pages des cinq types (un à cinq). Le brief repasse « à valider ».
 */
export function lirePartieBrief(partie: string, corps: Record<string, unknown>, style: StylePourBrief | null): ChoixPartie {
  if (partie !== "palette" && partie !== "texte" && partie !== "doubles") return { ok: false, message: "Partie du brief inconnue." };
  if (!style) return { ok: false, message: "Choisir d'abord un style sur le mur." };
  if (!style.publie) return { ok: false, message: "Ce style n'est plus sur le mur : en choisir un autre." };
  if (partie === "palette") {
    const cle = typeof corps.palette_cle === "string" ? corps.palette_cle : "";
    if (!style.palettes.some((p) => p.cle === cle)) return { ok: false, message: "Choisir une palette de ce style." };
    return { ok: true, partie, patch: { palette_cle: cle, brief_valide_le: null } };
  }
  if (partie === "texte") {
    const texte = PARTS_TEXTE.find((t) => t.cle === corps.texte)?.cle;
    if (!texte) return { ok: false, message: "Répondre à « Quelle place pour le texte ? »." };
    return { ok: true, partie, patch: { texte, brief_valide_le: null } };
  }
  const brutes = Array.isArray(corps.doubles) ? corps.doubles : [];
  const doubles = TYPES_DOUBLES.map((t) => t.cle).filter((c) => brutes.includes(c));
  if (doubles.length < DOUBLES_MIN) return { ok: false, message: "Garder au moins une double page." };
  return { ok: true, partie, patch: { doubles, brief_valide_le: null } };
}

/**
 * Aimer ou retirer une couverture CHANGE le brief : un brief validé repasse
 * « à valider » (la règle d'en tête, que ce geste ne tenait pas avant la
 * révision). Un clic qui ne change rien (déjà aimée) ne dé-valide rien.
 */
export function patchCouvertures(avant: readonly CouvertureAimee[], apres: readonly CouvertureAimee[]): Record<string, unknown> {
  const cle = (l: readonly CouvertureAimee[]) => l.map((a) => `${a.style_id}/${a.couverture}`).sort().join("|");
  return cle(avant) === cle(apres) ? { couvertures_aimees: [...apres] } : { couvertures_aimees: [...apres], brief_valide_le: null };
}

/** L'état d'un magazine dans le bandeau du mur (maquette Styles). */
export function etatDuBrief(b: { valide: boolean; style: string | null }): string {
  if (b.valide) return "Brief validé";
  return b.style ? `Style : ${b.style}` : "Style à choisir";
}

/** Une ligne qui résume le brief (le pied d'« un style en détail » et de `/style/brief`). */
export function resumeBrief(b: { style: string | null; palette: string | null; doubles: readonly string[]; couvertures: number }): string {
  if (!b.style) return "Aucun style choisi pour l'instant.";
  const doubles = b.doubles.length === DOUBLES_MAX ? "les cinq doubles pages" : b.doubles.join(", ");
  return [
    b.palette ? `${b.style}, palette ${b.palette}` : b.style,
    doubles || null,
    b.couvertures ? `${b.couvertures} couverture${b.couvertures > 1 ? "s" : ""} aimée${b.couvertures > 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Ce qui manque pour valider un brief (vide = validable). Les couvertures sont FACULTATIVES. */
export function manquesBrief(b: Pick<Brief, "style_id" | "palette_cle" | "texte" | "doubles">): string[] {
  const m: string[] = [];
  if (!b.style_id) m.push("le style");
  if (!b.palette_cle) m.push("la palette");
  if (!b.texte) m.push("la place du texte");
  if (!b.doubles?.length) m.push("au moins une double page");
  return m;
}

export type Bascule = { ok: true; aimees: CouvertureAimee[] } | { ok: false; message: string };

/**
 * Aimer ou ne plus aimer une couverture, de N'IMPORTE QUEL style publié.
 * Plafond `couvertures_aimees_max` de l'édition : `null` = l'atelier ne l'a
 * pas réglé, et on n'invente pas de chiffre (on refuse, la phrase le dit).
 */
export function basculerCouverture(
  aimees: readonly CouvertureAimee[],
  cible: CouvertureAimee,
  aimer: boolean,
  max: number | null,
  styleCible: StylePourBrief | null
): Bascule {
  const deja = aimees.some((a) => a.style_id === cible.style_id && a.couverture === cible.couverture);
  if (!aimer) return { ok: true, aimees: aimees.filter((a) => !(a.style_id === cible.style_id && a.couverture === cible.couverture)) };
  if (deja) return { ok: true, aimees: [...aimees] };
  if (!styleCible || !styleCible.publie || !styleCible.couvertures.some((c) => c.cle === cible.couverture)) {
    return { ok: false, message: "Cette couverture n'est pas sur le mur." };
  }
  if (max === null) return { ok: false, message: "Le nombre de couvertures aimées n'est pas encore réglé par l'atelier." };
  if (aimees.length >= max) {
    return { ok: false, message: `${max} couverture${max > 1 ? "s" : ""} au plus par magazine. Retirer d'abord une couverture aimée.` };
  }
  return { ok: true, aimees: [...aimees, cible] };
}

/** Le segment d'une édition voit les styles de son public et ceux « pour tous ». */
export function styleVisible(segmentEdition: string, segmentStyle: string): boolean {
  return segmentEdition === "tous" || segmentStyle === "tous" || segmentStyle === segmentEdition;
}
