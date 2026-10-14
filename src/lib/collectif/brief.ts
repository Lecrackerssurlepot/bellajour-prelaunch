/**
 * Le brief d'un magazine : une palette, des typographies, la part de texte,
 * 1 à 5 doubles pages aimées, et des couvertures aimées (PRD §1 « Brief »,
 * §4.2). Module PUR : aucun accès base, aucun réseau, aucune variable
 * d'environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * D24 (14/10/2026) : LE BRIEF SE COMPOSE PIÈCE PAR PIÈCE, DE N'IMPORTE QUEL
 * STYLE. La palette, les typographies, chaque double page et chaque
 * couverture disent d'où elles viennent ; l'atelier harmonise l'ensemble.
 * Elle remplace la règle du 08/10 (« l'intérieur suit le style »).
 * Prendre un style EN ENTIER remplace palette, typographies et doubles pages,
 * et garde les couvertures aimées et la place du texte.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * En base (migration 20261017) : `palette_style_id`, `typo_style_id`,
 * `doubles_aimes` [{ style_id, double }]. Nuls ou vides, la pièce vient de
 * `style_id` (un brief d'avant D24, ou un style pris en entier sans la
 * migration) : `compositionDu` fait cette lecture, une seule fois, pour tous.
 * Le code tient `doubles` (les types) à jour avec `doubles_aimes`.
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
/** Cinq doubles pages aimées au plus, tous styles confondus (D24). */
export const DOUBLES_MAX = TYPES_DOUBLES.length;

export type CouvertureAimee = { style_id: string; couverture: string };
export type DoubleAime = { style_id: string; double: TypeDouble };

/** Les colonnes du brief telles qu'en base ; les trois de D24 manquent avant la migration 20261017. */
export type BriefLigne = {
  style_id: string | null;
  palette_cle: string | null;
  texte: string | null;
  doubles: string[];
  couvertures_aimees: CouvertureAimee[];
  brief_valide_le: string | null;
  palette_style_id?: string | null;
  typo_style_id?: string | null;
  doubles_aimes?: DoubleAime[] | null;
};

/** Ce que le client a composé, chaque pièce avec son style. */
export type Composition = {
  palette: { style_id: string; cle: string } | null;
  typos: { style_id: string } | null;
  doubles: DoubleAime[];
  couvertures: CouvertureAimee[];
  texte: PartTexte | null;
};

const estTypeDouble = (d: unknown): d is TypeDouble => TYPES_DOUBLES.some((t) => t.cle === d);

/** LA lecture d'un brief : les colonnes de D24 d'abord, `style_id` sinon. */
export function compositionDu(b: BriefLigne): Composition {
  const paletteStyle = b.palette_style_id ?? b.style_id;
  const typoStyle = b.typo_style_id ?? b.style_id;
  const aimes = (b.doubles_aimes ?? []).filter((d) => d && typeof d.style_id === "string" && estTypeDouble(d.double));
  const doubles: DoubleAime[] = aimes.length
    ? aimes.map((d) => ({ style_id: d.style_id, double: d.double }))
    : b.style_id
      ? (b.doubles ?? []).filter(estTypeDouble).map((d) => ({ style_id: b.style_id as string, double: d }))
      : [];
  return {
    palette: paletteStyle && b.palette_cle ? { style_id: paletteStyle, cle: b.palette_cle } : null,
    typos: typoStyle ? { style_id: typoStyle } : null,
    doubles,
    couvertures: [...(b.couvertures_aimees ?? [])],
    texte: PARTS_TEXTE.find((t) => t.cle === b.texte)?.cle ?? null,
  };
}

/** Les styles d'où vient la composition, chacun une fois, dans l'ordre palette, typographies, doubles, couvertures. */
export function stylesDeLaComposition(c: Composition): string[] {
  const ids = [c.palette?.style_id, c.typos?.style_id, ...c.doubles.map((d) => d.style_id), ...c.couvertures.map((a) => a.style_id)];
  return [...new Set(ids.filter((x): x is string => Boolean(x)))];
}

export type Genre = "couverture" | "typos" | "palette" | "double";

/**
 * Pourquoi un style « s'accorde » à la composition (la maquette Typographies :
 * « Avec vos choix »). Seulement ce qu'on sait : le client y a déjà pris une
 * AUTRE pièce. Vide : ce style n'a encore rien donné à la composition.
 */
export function raisonsDuStyle(c: Composition, styleId: string, sauf: Genre): string[] {
  const r: string[] = [];
  if (sauf !== "couverture" && c.couvertures.some((a) => a.style_id === styleId)) r.push("votre couverture");
  if (sauf !== "palette" && c.palette?.style_id === styleId) r.push("votre palette");
  if (sauf !== "typos" && c.typos?.style_id === styleId) r.push("vos typographies");
  if (sauf !== "double" && c.doubles.some((d) => d.style_id === styleId)) r.push("vos doubles pages");
  return r;
}

/** Une pièce du mur : son genre, son style, sa clé (couverture, palette, type de double page ; vide pour les typographies). */
export type PieceRef = { genre: Genre; style_id: string; cle: string };

/** Cette pièce est-elle dans la composition ? */
export function pieceChoisie(c: Composition, p: PieceRef): boolean {
  if (p.genre === "couverture") return c.couvertures.some((a) => a.style_id === p.style_id && a.couverture === p.cle);
  if (p.genre === "palette") return c.palette?.style_id === p.style_id && c.palette.cle === p.cle;
  if (p.genre === "typos") return c.typos?.style_id === p.style_id;
  return c.doubles.some((d) => d.style_id === p.style_id && d.double === p.cle);
}

/**
 * Les pièces d'une catégorie, rangées comme la maquette Typographies : le
 * choix du client d'abord, puis ce qui va AVEC ses choix (le même style que
 * ce qu'il a choisi dans cette catégorie, ou un style d'où vient déjà une
 * autre de ses pièces, la raison dite), puis le reste. L'ordre du mur est
 * gardé dans chaque groupe.
 */
export function grouperParChoix<T extends PieceRef>(pieces: readonly T[], c: Composition): { choisies: T[]; avec: { piece: T; raison: string }[]; autres: T[] } {
  const choisies = pieces.filter((p) => pieceChoisie(c, p));
  const stylesChoisis = new Set(choisies.map((p) => p.style_id));
  const avec: { piece: T; raison: string }[] = [];
  const autres: T[] = [];
  for (const p of pieces) {
    if (pieceChoisie(c, p)) continue;
    if (stylesChoisis.has(p.style_id)) {
      avec.push({ piece: p, raison: "Du même style que votre choix" });
      continue;
    }
    const r = raisonsDuStyle(c, p.style_id, p.genre);
    if (r.length) avec.push({ piece: p, raison: `Du style de ${r.join(" et de ")}` });
    else autres.push(p);
  }
  return { choisies, avec, autres };
}

/** Le style vu par le brief : ce qu'il propose, pour vérifier un choix. */
export type StylePourBrief = {
  id: string;
  publie: boolean;
  palettes: { cle: string }[];
  couvertures: { cle: string }[];
  /** Absents : non vérifiés (un appelant qui ne lit pas ces colonnes). */
  typos?: { titres?: string | null } | null;
  doubles?: { type: string }[];
};

/** Le brief peut-il encore changer ? Seulement tant que la collecte est ouverte. */
export function briefModifiable(etat: EtatEdition): boolean {
  return etat === "preparation";
}

export type ChoixStyle =
  | {
      ok: true;
      /** Le patch complet (avec les colonnes de D24). */
      patch: Record<string, unknown>;
      /** Le même sans elles : un style pris en entier s'exprime tout entier dans les colonnes d'avant. */
      patchAvant: Record<string, unknown>;
    }
  | { ok: false; message: string };

/**
 * « Prendre tout le style » pour le magazine N : le style (publié), une de
 * SES palettes, la part de texte, 1 à 5 de ses doubles pages. La palette, les
 * typographies et les doubles pages viennent de lui ; les couvertures aimées
 * restent. Brief REMIS à valider.
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
  const patchAvant = { style_id: style.id, palette_cle: palette, texte, doubles, brief_valide_le: null };
  return {
    ok: true,
    patchAvant,
    patch: { ...patchAvant, palette_style_id: style.id, typo_style_id: style.id, doubles_aimes: doubles.map((d) => ({ style_id: style.id, double: d })) },
  };
}

export type ChoixPiece = { ok: true; patch: Record<string, unknown>; libelle: string } | { ok: false; message: string };

/**
 * Prendre UNE pièce, de n'importe quel style publié (D24) :
 * - `palette` `{ palette_cle }` : remplace la palette ;
 * - `typos` : remplace les typographies ;
 * - `double` `{ double, ajouter }` : ajoute ou retire une double page (cinq
 *   au plus, tous styles confondus ; en retirer la dernière est permis, le
 *   brief ne se valide plus tant qu'il n'en a pas une).
 * Le patch nomme toujours les colonnes de D24 ; le brief repasse à valider.
 */
export function lirePiece(genre: unknown, corps: Record<string, unknown>, style: StylePourBrief | null, actuelle: Composition): ChoixPiece {
  if (genre !== "palette" && genre !== "typos" && genre !== "double") return { ok: false, message: "Pièce inconnue." };
  if (!style || !style.publie) return { ok: false, message: "Ce style n'est pas sur le mur." };
  if (genre === "palette") {
    const cle = typeof corps.palette_cle === "string" ? corps.palette_cle : "";
    if (!style.palettes.some((p) => p.cle === cle)) return { ok: false, message: "Cette palette n'est pas dans ce style." };
    return { ok: true, libelle: "palette", patch: { palette_style_id: style.id, palette_cle: cle, brief_valide_le: null } };
  }
  if (genre === "typos") {
    if (style.typos !== undefined && !style.typos?.titres) return { ok: false, message: "Ce style n'a pas encore ses typographies." };
    return { ok: true, libelle: "typographies", patch: { typo_style_id: style.id, brief_valide_le: null } };
  }
  const double = corps.double;
  if (!estTypeDouble(double)) return { ok: false, message: "Double page inconnue." };
  if (style.doubles !== undefined && !style.doubles.some((d) => d.type === double)) return { ok: false, message: "Cette double page n'est pas dans ce style." };
  const deja = actuelle.doubles.some((d) => d.style_id === style.id && d.double === double);
  const ajouter = corps.ajouter !== false;
  let liste = actuelle.doubles;
  if (ajouter && !deja) {
    if (liste.length >= DOUBLES_MAX) return { ok: false, message: `${DOUBLES_MAX} doubles pages au plus. En retirer une d'abord.` };
    liste = [...liste, { style_id: style.id, double }];
  } else if (!ajouter) {
    liste = liste.filter((d) => !(d.style_id === style.id && d.double === double));
  }
  return { ok: true, libelle: "doubles pages", patch: { doubles_aimes: liste, doubles: typesDes(liste), brief_valide_le: null } };
}

/** Les types d'une liste de doubles pages aimées, chacun une fois, dans l'ordre des types : la colonne d'avant D24. */
export function typesDes(liste: readonly DoubleAime[]): TypeDouble[] {
  return TYPES_DOUBLES.map((t) => t.cle).filter((c) => liste.some((d) => d.double === c));
}

/** La place du texte : une réponse de la liste, rien d'autre. Le brief repasse à valider. */
export function lireTexte(corps: Record<string, unknown>): ChoixPiece {
  const texte = PARTS_TEXTE.find((t) => t.cle === corps.texte)?.cle;
  if (!texte) return { ok: false, message: "Répondre à « Quelle place pour le texte ? »." };
  return { ok: true, libelle: "texte", patch: { texte, brief_valide_le: null } };
}

/**
 * Aimer ou retirer une couverture CHANGE le brief : un brief validé repasse
 * « à valider ». Un clic qui ne change rien (déjà aimée) ne dé-valide rien.
 */
export function patchCouvertures(avant: readonly CouvertureAimee[], apres: readonly CouvertureAimee[]): Record<string, unknown> {
  const cle = (l: readonly CouvertureAimee[]) => l.map((a) => `${a.style_id}/${a.couverture}`).sort().join("|");
  return cle(avant) === cle(apres) ? { couvertures_aimees: [...apres] } : { couvertures_aimees: [...apres], brief_valide_le: null };
}

/** L'état d'un magazine dans le bandeau du mur : validé, le style s'il n'y en a qu'un, sinon combien. */
export function etatDuBrief(b: { valide: boolean; styles: readonly string[] }): string {
  if (b.valide) return "Brief validé";
  if (b.styles.length === 0) return "À composer";
  if (b.styles.length === 1) return `Style : ${b.styles[0]}`;
  return `${b.styles.length} styles mêlés`;
}

type NomsStyles = readonly { id: string; nom: string; palettes: readonly { cle: string; nom: string }[] }[];

/** Le nom d'une pièce pour l'écran : « Marine, du style Riviera ». */
export function nomPiece(genre: Genre, styleId: string, styles: NomsStyles, cle?: string): string {
  const s = styles.find((x) => x.id === styleId);
  const style = s?.nom ?? "un style retiré du mur";
  if (genre === "palette") return `${s?.palettes.find((p) => p.cle === cle)?.nom ?? "Palette"}, du style ${style}`;
  if (genre === "double") return `${TYPES_DOUBLES.find((t) => t.cle === cle)?.libelle ?? "Double page"} (${style})`;
  return `du style ${style}`;
}

/** Une ligne qui résume la composition (le pied d'un style en détail, l'atelier). */
export function resumeBrief(c: Composition, styles: NomsStyles): string {
  const parties = [
    c.palette ? `palette ${nomPiece("palette", c.palette.style_id, styles, c.palette.cle)}` : null,
    c.typos ? `typographies ${nomPiece("typos", c.typos.style_id, styles)}` : null,
    c.doubles.length ? `${c.doubles.length} double${c.doubles.length > 1 ? "s" : ""} page${c.doubles.length > 1 ? "s" : ""}` : null,
    c.couvertures.length ? `${c.couvertures.length} couverture${c.couvertures.length > 1 ? "s" : ""} aimée${c.couvertures.length > 1 ? "s" : ""}` : null,
  ].filter(Boolean);
  if (!parties.length) return "Rien de composé pour l'instant.";
  const texte = parties.join(" · ");
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** Ce qui manque pour valider un brief (vide = validable). Les couvertures sont FACULTATIVES. */
export function manquesBrief(b: BriefLigne): string[] {
  const c = compositionDu(b);
  const m: string[] = [];
  if (!c.palette) m.push("la palette");
  if (!c.typos) m.push("les typographies");
  if (!c.texte) m.push("la place du texte");
  if (!c.doubles.length) m.push("au moins une double page");
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
