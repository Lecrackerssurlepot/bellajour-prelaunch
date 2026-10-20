/* Les pièces du mur (D24, maquette « Tout, en vrac ») : chaque couverture,
   palette, double page et les typographies de chaque style publié, avec leur
   style. Module pur, sans React, partagé par le mur, la barre et la feuille
   de la composition (T-179) et le panneau « modifier une partie ».

   T-179 (planches 1 et 2 du 19/10, validées par Mathias) : un geste sur la
   composition est une VALEUR (`Geste`). Il se vérifie par les règles de
   brief.ts avant de partir (`preparerGeste`), il se dit (`annonceDuGeste`) et
   il s'annule par son inverse (`gesteInverse`), qui repasse par le même
   chemin. Aucune règle du brief n'est écrite ici : seulement l'écran. */

import {
  basculerCouverture,
  compositionDu,
  lirePiece,
  lireTexte,
  manquesBrief,
  PARTS_TEXTE,
  patchCouvertures,
  pieceChoisie,
  stylesDeLaComposition,
  type BriefLigne,
  type Composition,
  type Genre,
  type PartTexte,
  type PieceRef,
  type StylePourBrief,
} from "@/lib/collectif/brief";
import { TYPES_DOUBLES } from "@/lib/collectif/styles";
import type { StyleMur } from "../donnees";

export type PieceVue = PieceRef & {
  /** Unique sur le mur : `<genre>:<style>:<clé>`. */
  id: string;
  style: StyleMur;
  /** « Marine », « Équilibrée », « Fraunces et DM Sans »… */
  titre: string;
  url: string | null;
  /** Les tailles réduites de l'image (T-172), `null` sans elles : l'écran montre alors `url`, la maîtresse. */
  srcSet: string | null;
  couleurs: string[];
};

/**
 * Les `sizes` des images de style (T-172), lus par la carte du mur, la fiche
 * d'un style et la composition : la largeur que l'image occupe à l'écran, d'où
 * le navigateur choisit la taille (600, 1 200 ou la maîtresse). Ils suivent
 * les grilles de `style.css` et `espace.css` (carte de 160 à 300 px, deux
 * colonnes sous 560 px ; couverture de la fiche 260 px, pleine largeur sous
 * 860 px). Une estimation trop large ne casse rien, elle télécharge plus.
 */
export const TAILLES_AFFICHAGE = {
  carte: "(max-width: 560px) 50vw, (max-width: 860px) 33vw, 300px",
  ficheCouverture: "(max-width: 860px) 100vw, 260px",
  ficheEchantillon: "(max-width: 860px) 100vw, 480px",
  ficheDouble: "(max-width: 560px) 100vw, (max-width: 860px) 50vw, 360px",
  ficheCouvertures: "(max-width: 860px) 50vw, 260px",
  mini: "40px",
  composition: "(max-width: 860px) 50vw, 240px",
} as const;

/** Une partie de la composition : un genre de pièce, ou la place du texte (le panneau « modifier une partie »). */
export type Partie = Genre | "texte";

export const GENRES: { cle: Genre; un: string; plusieurs: string; panneau: string }[] = [
  { cle: "couverture", un: "Couverture", plusieurs: "Couvertures", panneau: "Les couvertures" },
  { cle: "typos", un: "Typographies", plusieurs: "Typographies", panneau: "Les typographies" },
  { cle: "palette", un: "Palette", plusieurs: "Palettes", panneau: "La palette" },
  { cle: "double", un: "Double page", plusieurs: "Doubles pages", panneau: "Les doubles pages" },
];

export const genre = (g: Genre) => GENRES.find((x) => x.cle === g) ?? GENRES[0];

/** Le style tel que les règles du brief le vérifient (un style du mur est publié). */
export function styleBrief(s: StyleMur): StylePourBrief {
  return { id: s.id, publie: true, palettes: s.palettes, couvertures: s.couvertures, typos: { titres: s.typos.titres }, doubles: s.doubles };
}

/** « Fraunces et DM Sans » : les polices d'un style, vide s'il n'en a pas. */
function policesDe(s: StyleMur): string {
  return s.typos.titres ? [s.typos.titres, s.typos.texte].filter(Boolean).join(" et ") : "";
}

/** Le libellé d'une place du texte (« Un peu de texte »), lu dans `PARTS_TEXTE`. */
export function libelleTexte(cle: string): string {
  return PARTS_TEXTE.find((t) => t.cle === cle)?.libelle ?? cle;
}

/** Le nom d'un type de double page (« Aérée »). */
export function libelleDouble(type: string): string {
  return TYPES_DOUBLES.find((t) => t.cle === type)?.libelle ?? type;
}

/** Les pièces d'un style, dans l'ordre où sa page les montre. */
function piecesDuStyle(s: StyleMur): PieceVue[] {
  const p: PieceVue[] = [];
  const typos = policesDe(s);
  for (const c of s.couvertures) p.push({ id: `couverture:${s.id}:${c.cle}`, genre: "couverture", style_id: s.id, cle: c.cle, style: s, titre: c.legende || s.nom, url: c.url, srcSet: c.srcSet ?? null, couleurs: [] });
  if (typos) p.push({ id: `typos:${s.id}`, genre: "typos", style_id: s.id, cle: "", style: s, titre: typos, url: s.typos.echantillon, srcSet: s.typos.echantillonSrcSet ?? null, couleurs: [] });
  for (const pal of s.palettes) p.push({ id: `palette:${s.id}:${pal.cle}`, genre: "palette", style_id: s.id, cle: pal.cle, style: s, titre: pal.nom, url: null, srcSet: null, couleurs: pal.couleurs });
  for (const d of s.doubles) {
    if (!d.url) continue;
    p.push({ id: `double:${s.id}:${d.type}`, genre: "double", style_id: s.id, cle: d.type, style: s, titre: libelleDouble(d.type), url: d.url, srcSet: d.srcSet ?? null, couleurs: [] });
  }
  return p;
}

/** Toutes les pièces d'un genre, style après style. */
export function piecesDuGenre(styles: readonly StyleMur[], g: Genre): PieceVue[] {
  return styles.flatMap(piecesDuStyle).filter((p) => p.genre === g);
}

/** Les pièces d'un style, ses genres MÊLÉS : une couverture, les typographies, une palette, une double page, puis on recommence. */
function piecesMelees(s: StyleMur): PieceVue[] {
  const parGenre = GENRES.map((g) => piecesDuStyle(s).filter((p) => p.genre === g.cle));
  const plusLongue = Math.max(0, ...parGenre.map((l) => l.length));
  const melees: PieceVue[] = [];
  for (let k = 0; k < plusLongue; k++) for (const l of parGenre) if (l[k]) melees.push(l[k]);
  return melees;
}

/**
 * « Tout, en vrac » : les pièces de tous les styles MÊLÉES. Dans chaque
 * style les genres alternent, et chaque style commence par un genre
 * différent (sa liste tourne d'un cran par style) ; puis on prend une pièce
 * de chaque style à tour de rôle : une couverture d'ici, une typographie de
 * là, une palette d'ailleurs. L'ordre est stable.
 */
export function piecesEnVrac(styles: readonly StyleMur[]): PieceVue[] {
  const listes = styles.map((s, i) => {
    const l = piecesMelees(s);
    if (!l.length) return l;
    const r = i % Math.min(GENRES.length, l.length);
    return [...l.slice(r), ...l.slice(0, r)];
  });
  const plusLongue = Math.max(0, ...listes.map((l) => l.length));
  const vrac: PieceVue[] = [];
  for (let k = 0; k < plusLongue; k++) for (const l of listes) if (l[k]) vrac.push(l[k]);
  return vrac;
}

/* ─────────────────────────── T-179 : les noms et les images ─────────────────────────── */

const RETIRE = "un style retiré du mur";
const styleDe = (styles: readonly StyleMur[], id: string) => styles.find((s) => s.id === id);

/** Le nom d'un style, ou ce qu'on en dit s'il a quitté le mur. */
export function nomStyle(styles: readonly StyleMur[], id: string): string {
  return styleDe(styles, id)?.nom ?? RETIRE;
}

/** Le nom d'une palette (« Marine »). */
export function nomPalette(styles: readonly StyleMur[], styleId: string, cle: string): string {
  return styleDe(styles, styleId)?.palettes.find((p) => p.cle === cle)?.nom ?? "sans nom";
}

/** Les typographies d'un style par leurs polices (« Fraunces et DM Sans »), sinon par le style. */
export function nomTypos(styles: readonly StyleMur[], styleId: string): string {
  const s = styleDe(styles, styleId);
  return (s && policesDe(s)) || `du style ${s?.nom ?? RETIRE}`;
}

/** « a », « a et b », « a, b et c ». */
export function listeEnFrancais(l: readonly string[]): string {
  if (l.length < 2) return l[0] ?? "";
  return `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}`;
}

const LETTRES = ["Zéro", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"];

/** La phrase des styles mêlés, en tête de la composition ouverte (planche 2). */
export function phraseDesStyles(noms: readonly string[], tu: boolean): string {
  if (!noms.length) return "Rien de choisi pour l'instant : chaque pièce prise sur le mur arrive ici.";
  if (noms.length === 1) return `Tout vient du style ${noms[0]}.`;
  return `${LETTRES[noms.length] ?? noms.length} styles mêlés : ${noms.join(", ")}. L'atelier accorde l'ensemble et ${tu ? "te" : "vous"} le montre au bon à tirer.`;
}

/** Ce que la composition MONTRE : chaque pièce choisie avec son image ou ses couleurs, et son style. */
export type Visuels = {
  couvertures: { cle: string; style: string; url: string | null; srcSet: string | null }[];
  palette: { nom: string; style: string; couleurs: string[] } | null;
  typos: { polices: string; titres: string; texte: string; style: string; echantillon: string | null; echantillonSrcSet: string | null } | null;
  doubles: { cle: string; libelle: string; style: string; url: string | null; srcSet: string | null }[];
};

export function visuelsDe(c: Composition, styles: readonly StyleMur[]): Visuels {
  const pal = c.palette ? styleDe(styles, c.palette.style_id)?.palettes.find((p) => p.cle === c.palette?.cle) : undefined;
  const ty = c.typos ? styleDe(styles, c.typos.style_id) : undefined;
  return {
    couvertures: c.couvertures.map((a) => {
      const x = styleDe(styles, a.style_id)?.couvertures.find((y) => y.cle === a.couverture);
      return { cle: `${a.style_id}:${a.couverture}`, style: nomStyle(styles, a.style_id), url: x?.url ?? null, srcSet: x?.srcSet ?? null };
    }),
    palette: c.palette ? { nom: pal?.nom ?? "sans nom", style: nomStyle(styles, c.palette.style_id), couleurs: pal?.couleurs ?? [] } : null,
    typos: c.typos
      ? { polices: nomTypos(styles, c.typos.style_id), titres: ty?.typos.titres ?? "", texte: ty?.typos.texte ?? "", style: nomStyle(styles, c.typos.style_id), echantillon: ty?.typos.echantillon ?? null, echantillonSrcSet: ty?.typos.echantillonSrcSet ?? null }
      : null,
    doubles: c.doubles.map((d) => {
      const x = styleDe(styles, d.style_id)?.doubles.find((y) => y.type === d.double);
      return { cle: `${d.style_id}:${d.double}`, libelle: libelleDouble(d.double), style: nomStyle(styles, d.style_id), url: x?.url ?? null, srcSet: x?.srcSet ?? null };
    }),
  };
}

/* ─────────────────────────── T-179 : l'état d'un magazine ─────────────────────────── */

const BRIEF_VIDE: BriefLigne = { style_id: null, palette_cle: null, texte: null, doubles: [], couvertures_aimees: [], brief_valide_le: null };

/** Combien de pièces un brief EXIGE : ce que `manquesBrief` réclame d'un brief vide (rien n'est compté à la main). */
export const PIECES_EXIGEES = manquesBrief(BRIEF_VIDE).length;

/** Rien de choisi du tout, pas même une couverture ou la place du texte. */
export function compositionVide(c: Composition): boolean {
  return !c.palette && !c.typos && !c.texte && !c.doubles.length && !c.couvertures.length;
}

/** L'état d'un magazine dans le bandeau : « Brief validé », « À composer », sinon « 3 pièces sur 4 exigées ». */
export function etatDuMagazine(b: BriefLigne): string {
  if (b.brief_valide_le) return "Brief validé";
  if (compositionVide(compositionDu(b))) return "À composer";
  const faites = PIECES_EXIGEES - manquesBrief(b).length;
  return `${faites} pièce${faites > 1 ? "s" : ""} sur ${PIECES_EXIGEES} exigées`;
}

/** La ligne d'état de la barre : ce qui manque (`manquesBrief`) et combien de styles se mêlent. */
export function ligneDeLaBarre(b: BriefLigne): string {
  const manques = manquesBrief(b);
  const etat = b.brief_valide_le ? "Brief validé." : manques.length ? `Il manque ${listeEnFrancais(manques)}.` : "Tout ce qu'il faut est choisi.";
  const n = stylesDeLaComposition(compositionDu(b)).length;
  return n > 1 ? `${etat} ${n} styles mêlés.` : etat;
}

/* ─────────────────────────── T-179 : un geste, son annonce, son inverse ─────────────────────────── */

/** Un geste sur la composition d'un magazine. */
export type Geste =
  | { quoi: "couverture"; style_id: string; cle: string; ajouter: boolean }
  | { quoi: "double"; style_id: string; cle: string; ajouter: boolean }
  | { quoi: "palette"; style_id: string; cle: string }
  | { quoi: "typos"; style_id: string }
  | { quoi: "texte"; texte: PartTexte }
  | { quoi: "valider" }
  | { quoi: "devalider" };

/** Le geste du bouton d'une pièce : retirer une couverture ou une double page choisie, sinon la prendre. `null` : palette ou typographies déjà choisies, rien à faire. */
export function gesteDeLaPiece(piece: PieceRef, c: Composition): Geste | null {
  const choisie = pieceChoisie(c, piece);
  if (piece.genre === "couverture" || piece.genre === "double") return { quoi: piece.genre, style_id: piece.style_id, cle: piece.cle, ajouter: !choisie };
  if (choisie) return null;
  return piece.genre === "palette" ? { quoi: "palette", style_id: piece.style_id, cle: piece.cle } : { quoi: "typos", style_id: piece.style_id };
}

/**
 * Le geste qui DÉFAIT `g`, lu sur la composition d'avant : remettre
 * l'ancienne palette, les anciennes typographies ou l'ancienne place du texte,
 * retirer ce qui a été ajouté, rajouter ce qui a été retiré, rouvrir ce qui a
 * été validé. `null` quand rien ne le défait : il n'y avait rien avant (aucun
 * geste du brief n'efface une palette, des typographies ou la place du
 * texte), ou le geste ne changeait rien.
 */
export function gesteInverse(g: Geste, avant: Composition): Geste | null {
  switch (g.quoi) {
    case "couverture": {
      const deja = avant.couvertures.some((a) => a.style_id === g.style_id && a.couverture === g.cle);
      return deja === g.ajouter ? null : { ...g, ajouter: !g.ajouter };
    }
    case "double": {
      const deja = avant.doubles.some((d) => d.style_id === g.style_id && d.double === g.cle);
      return deja === g.ajouter ? null : { ...g, ajouter: !g.ajouter };
    }
    case "palette":
      return avant.palette && !(avant.palette.style_id === g.style_id && avant.palette.cle === g.cle) ? { quoi: "palette", style_id: avant.palette.style_id, cle: avant.palette.cle } : null;
    case "typos":
      return avant.typos && avant.typos.style_id !== g.style_id ? { quoi: "typos", style_id: avant.typos.style_id } : null;
    case "texte":
      return avant.texte && avant.texte !== g.texte ? { quoi: "texte", texte: avant.texte } : null;
    case "valider":
      return { quoi: "devalider" };
    case "devalider":
      return { quoi: "valider" };
  }
}

/** Deux noms identiques se distinguent par leur style : « Sable (Riviera) ». */
function distinguer(nom: string, style: string, autre: string | null, autreStyle: string): [string, string | null] {
  if (autre === null || autre !== nom) return [nom, autre];
  return [`${nom} (${style})`, `${autre} (${autreStyle})`];
}

/**
 * Ce que le geste a fait, dit en une phrase (planche 1) : « Palette Marine
 * ajoutée. Elle remplace Sable. », « Couverture aimée. », « Double page Dense
 * retirée. ». Un brief validé qui change repasse à valider : la phrase le dit.
 */
export function annonceDuGeste(g: Geste, avant: Composition, styles: readonly StyleMur[], valideAvant: boolean, rang: number): string {
  let phrase: string;
  switch (g.quoi) {
    case "couverture":
      phrase = g.ajouter ? "Couverture aimée." : "Couverture retirée.";
      break;
    case "double":
      phrase = `Double page ${libelleDouble(g.cle)} ${g.ajouter ? "ajoutée" : "retirée"}.`;
      break;
    case "palette": {
      const ancienne = avant.palette ? nomPalette(styles, avant.palette.style_id, avant.palette.cle) : null;
      const [nom, autre] = distinguer(nomPalette(styles, g.style_id, g.cle), nomStyle(styles, g.style_id), ancienne, avant.palette ? nomStyle(styles, avant.palette.style_id) : "");
      phrase = `Palette ${nom} ajoutée.${autre !== null ? ` Elle remplace ${autre}.` : ""}`;
      break;
    }
    case "typos": {
      const anciennes = avant.typos ? nomTypos(styles, avant.typos.style_id) : null;
      const [noms, autres] = distinguer(nomTypos(styles, g.style_id), nomStyle(styles, g.style_id), anciennes, avant.typos ? nomStyle(styles, avant.typos.style_id) : "");
      phrase = `Typographies ${noms} ajoutées.${autres !== null ? ` Elles remplacent ${autres}.` : ""}`;
      break;
    }
    case "texte": {
      const ancienne = avant.texte && avant.texte !== g.texte ? libelleTexte(avant.texte) : null;
      phrase = `Place du texte : « ${libelleTexte(g.texte)} ».${ancienne ? ` Elle remplace « ${ancienne} ».` : ""}`;
      break;
    }
    case "valider":
      return `Brief du magazine ${rang} validé.`;
    case "devalider":
      return `Brief du magazine ${rang} rouvert.`;
  }
  return valideAvant ? `${phrase} Le brief est à revalider.` : phrase;
}

export type Envoi = { ok: true; corps: Record<string, unknown>; patch: Partial<BriefLigne> } | { ok: false; message: string };

/**
 * Le geste prêt à partir vers `/api/collectif/brief` : vérifié ICI par les
 * MÊMES règles que le serveur (`basculerCouverture`, `lirePiece`,
 * `lireTexte`, `manquesBrief`), avec le patch que l'écran montre aussitôt.
 * Un refus rend la phrase de la règle, rien ne part.
 */
export function preparerGeste(g: Geste, b: BriefLigne, styles: readonly StyleMur[], aimeesMax: number | null, maintenant: string): Envoi {
  const c = compositionDu(b);
  switch (g.quoi) {
    case "couverture": {
      const s = styleDe(styles, g.style_id);
      const r = basculerCouverture(c.couvertures, { style_id: g.style_id, couverture: g.cle }, g.ajouter, aimeesMax, s ? styleBrief(s) : null);
      if (!r.ok) return r;
      return { ok: true, corps: { action: "couverture", styleId: g.style_id, couverture: g.cle, aimer: g.ajouter }, patch: patchCouvertures(c.couvertures, r.aimees) as Partial<BriefLigne> };
    }
    case "palette":
    case "typos":
    case "double": {
      const s = styleDe(styles, g.style_id);
      const corps: Record<string, unknown> =
        g.quoi === "palette"
          ? { genre: "palette", styleId: g.style_id, palette_cle: g.cle }
          : g.quoi === "double"
            ? { genre: "double", styleId: g.style_id, double: g.cle, ajouter: g.ajouter }
            : { genre: "typos", styleId: g.style_id };
      const r = lirePiece(g.quoi, corps, s ? styleBrief(s) : null, c);
      if (!r.ok) return r;
      return { ok: true, corps: { action: "piece", ...corps }, patch: r.patch as Partial<BriefLigne> };
    }
    case "texte": {
      const r = lireTexte({ texte: g.texte });
      if (!r.ok) return r;
      return { ok: true, corps: { action: "texte", texte: g.texte }, patch: r.patch as Partial<BriefLigne> };
    }
    case "valider": {
      const manques = manquesBrief(b);
      if (manques.length) return { ok: false, message: `Il manque ${listeEnFrancais(manques)}.` };
      return { ok: true, corps: { action: "valider" }, patch: { brief_valide_le: maintenant } };
    }
    case "devalider":
      return { ok: true, corps: { action: "devalider" }, patch: { brief_valide_le: null } };
  }
}
