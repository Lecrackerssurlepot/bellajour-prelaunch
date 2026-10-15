/* Les pièces du mur (D24, maquette « Tout, en vrac ») : chaque couverture,
   palette, double page et les typographies de chaque style publié, avec leur
   style. Module pur, sans React, partagé par le mur et le panneau « modifier
   une partie ». */

import type { Genre, PieceRef, StylePourBrief } from "@/lib/collectif/brief";
import { TYPES_DOUBLES } from "@/lib/collectif/styles";
import type { StyleMur } from "../donnees";

export type PieceVue = PieceRef & {
  /** Unique sur le mur : `<genre>:<style>:<clé>`. */
  id: string;
  style: StyleMur;
  /** « Marine », « Équilibrée », « Fraunces et DM Sans »… */
  titre: string;
  url: string | null;
  couleurs: string[];
};

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

/** Les pièces d'un style, dans l'ordre où sa page les montre. */
function piecesDuStyle(s: StyleMur): PieceVue[] {
  const p: PieceVue[] = [];
  const typos = s.typos.titres ? [s.typos.titres, s.typos.texte].filter(Boolean).join(" et ") : "";
  for (const c of s.couvertures) p.push({ id: `couverture:${s.id}:${c.cle}`, genre: "couverture", style_id: s.id, cle: c.cle, style: s, titre: c.legende || s.nom, url: c.url, couleurs: [] });
  if (typos) p.push({ id: `typos:${s.id}`, genre: "typos", style_id: s.id, cle: "", style: s, titre: typos, url: s.typos.echantillon, couleurs: [] });
  for (const pal of s.palettes) p.push({ id: `palette:${s.id}:${pal.cle}`, genre: "palette", style_id: s.id, cle: pal.cle, style: s, titre: pal.nom, url: null, couleurs: pal.couleurs });
  for (const d of s.doubles) {
    if (!d.url) continue;
    p.push({ id: `double:${s.id}:${d.type}`, genre: "double", style_id: s.id, cle: d.type, style: s, titre: TYPES_DOUBLES.find((t) => t.cle === d.type)?.libelle ?? d.type, url: d.url, couleurs: [] });
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
