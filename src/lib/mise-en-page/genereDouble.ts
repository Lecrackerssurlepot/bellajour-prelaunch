/**
 * Les gabarits de DOUBLE générés (lot R, D1, 12/11). « Poser » fabrique des doubles, et les gabarits générés du lot D n'existaient que
 * pour une page seule : une double n'avait que ses dessinés et ses grilles. Une double générée est ici faite de DEUX pages de la
 * grammaire (genere.ts) : une découpe pour la page gauche (retournée en miroir autour du milieu de sa page), une pour la page droite.
 * Les n photos se répartissent entre les deux pages : les k premières à gauche (la lecture), les n − k suivantes à droite, chaque page
 * de 1 à 6 photos.
 *
 * L'ID CONTIENT LES DEUX RECETTES, versionné : `GD1-<gauche>_<droite>`, chacune la recette d'un `GG1-…` sans son préfixe
 * (`GD1-HS-0033.3012.3412_EN-0066-p10`). `genereDoubleParId` le décode SANS table : les mesures sont dans l'id (une retouche de
 * l'énumération ne bouge aucun vieux magazine). Un changement d'encodage = `GD2`, jamais une retouche de `GD1`.
 *
 * Les règles du pli tiennent par construction : chaque page garde ses marges (20 mm côté pli, 15 mm côté tranche), aucune photo
 * ne traverse le pli, et il n'y a aucun texte (photos seulement, comme les pages générées). Seule l'incrustation (fond plein) touche le
 * pli, comme sur une page seule ; la note de l'éditeur lit alors la part de la zone importante qui tombe dans la bande du pli.
 *
 * VOLUME : une page de 3 photos a 276 découpes ; deux pages en feraient des dizaines de milliers de paires. On ne retient donc que les
 * `COTES_MAX` meilleures découpes de CHAQUE page (par la note de PAGE que l'éditeur donne, passée en paramètre : un seul endroit règle
 * l'ordre), pas plus de `PAR_SCHEMA_MAX` du même schéma (la variété d'abord), puis on les apparie. La liste est mémoïsée par les cotes
 * des photos, et plafonnée (`genereesDoublesPour`).
 *
 * Module PUR : ni React, ni réseau, ni horloge. Déterministe.
 */

import { PAGE_L } from "./geometrie";
import { PREFIXE_DOUBLE, PREFIXE_RECETTE, genereParId, genereesPour, idsDePage } from "./genere";
import { orientationDe, signatureDe, type Cadre, type Orientation, type Template } from "./types";

/** Les meilleures découpes gardées par page (la note de page tranche) : 8 × 8 = 64 appariements par répartition des photos. */
export const COTES_MAX = 8;
/** Pas plus de ce nombre de découpes du même schéma parmi elles : la variété (héros, rangée, mosaïque…) avant le nombre. */
export const PAR_SCHEMA_MAX = 3;
/** Une double porte de 2 à 12 photos : de 1 à 6 de chaque côté. */
export const PHOTOS_MAX_PAGE = 6;
export type Cote = { l: number; h: number };

/** La note d'une découpe de PAGE pour ces photos (plus petit = mieux), donnée par l'appelant. Elle ne doit lire que les cotes. */
export type NotePage = (t: Template, photos: readonly Cote[]) => number;

const orientations = (photos: readonly Cote[]): Orientation[] => photos.map((p) => orientationDe(p.l, p.h));

/** Le miroir d'un cadre dans la largeur d'une page (x' = 210 − x − l, rotation inversée). */
function miroirPage(c: Cadre): Cadre {
  const m: Cadre = { ...c, x: PAGE_L - c.x - c.l };
  if (c.rotation !== undefined) m.rotation = c.rotation === 0 ? 0 : -c.rotation;
  return m;
}

/** Le préfixe d'un id de page (`GG1-`) retiré : ce qui reste de la recette. */
const recetteSeule = (idPage: string): string => idPage.slice(PREFIXE_RECETTE.length + 1);

/** L'id d'une double : les deux recettes de page, gauche puis droite. */
export const idDouble = (idGauche: string, idDroite: string): string => `${PREFIXE_DOUBLE}-${recetteSeule(idGauche)}_${recetteSeule(idDroite)}`;

/* Les doubles fabriquées, par id : l'objet rendu est TOUJOURS le même pour un id. Borné. */
const MEMO_DOUBLES_MAX = 20000;
const memoDoubles = new Map<string, Template>();

/** La double faite de ces deux pages (gabarits `GG1-…` de page) : cadres de la gauche (miroir) puis de la droite (décalés d'une page). */
export function templateDouble(gauche: Template, droite: Template): Template {
  const id = idDouble(gauche.id, droite.id);
  const deja = memoDoubles.get(id);
  if (deja) return deja;
  const cadres: Cadre[] = [...gauche.cadres.map(miroirPage), ...droite.cadres.map((c) => ({ ...c, x: c.x + PAGE_L }))];
  const t: Template = {
    id, nom: `Gauche : ${gauche.nom} | Droite : ${droite.nom}`, portee: "double", nbPhotos: cadres.length, signature: signatureDe(cadres),
    attribut: gauche.attribut === "original" || droite.attribut === "original" ? "original" : "classique", origine: "genere", cadres,
  };
  if (memoDoubles.size >= MEMO_DOUBLES_MAX) memoDoubles.clear();
  memoDoubles.set(id, t);
  return t;
}

/**
 * Retrouve le gabarit d'un id `GD1-…` SANS table : les deux recettes lues dans l'id (chacune de la forme exacte d'un `GG1-…`),
 * de 2 à 12 photos. null sinon (une seule recette, un séparateur de trop, une recette non canonique).
 */
export function genereDoubleParId(id: string): Template | null {
  const deja = memoDoubles.get(id);
  if (deja) return deja;
  if (!id.startsWith(`${PREFIXE_DOUBLE}-`)) return null;
  const pages = idsDePage(id);
  if (pages.length !== 2) return null;
  const g = genereParId(pages[0]), d = genereParId(pages[1]);
  if (!g || !d) return null;
  return idDouble(g.id, d.id) === id ? templateDouble(g, d) : null;
}

/** Le schéma (deux lettres) d'un id de page, pour borner la variété. */
const schemaDe = (idPage: string): string => idPage.slice(PREFIXE_RECETTE.length + 1, PREFIXE_RECETTE.length + 3);

/** Les meilleures découpes d'UNE page pour ces photos : la note de page, au plus `PAR_SCHEMA_MAX` du même schéma, `COTES_MAX` en tout. */
function meilleuresDePage(photos: readonly Cote[], note: NotePage): Template[] {
  const notees = genereesPour(orientations(photos)).map((t, i) => ({ t, i, cle: Math.round(note(t, photos) * 1e9) }));
  notees.sort((a, b) => a.cle - b.cle || a.i - b.i);
  const out: Template[] = [];
  const parSchema = new Map<string, number>();
  for (const { t } of notees) {
    const s = schemaDe(t.id);
    const n = parSchema.get(s) ?? 0;
    if (n >= PAR_SCHEMA_MAX) continue;
    parSchema.set(s, n + 1);
    out.push(t);
    if (out.length >= COTES_MAX) break;
  }
  return out;
}

const MEMO_LISTES_MAX = 300;
const memoListes = new Map<string, readonly Template[]>();

/**
 * Les gabarits générés d'une DOUBLE dont les photos ont ces cotes, DANS L'ORDRE DES PHOTOS : pour chaque répartition (k photos à
 * gauche, n − k à droite, 1 à 6 de chaque côté), les meilleures découpes de chaque page appariées. Ordre stable (répartitions par k
 * croissant, puis page gauche, puis page droite, dans l'ordre de la note de page) ; aucune double deux fois. La photo i va au cadre i.
 * Vide hors de 2 à 12 photos. Mémoïsé par les cotes ; la liste rendue ne se modifie pas.
 */
export function genereesDoublesPour(photos: readonly Cote[], note: NotePage): readonly Template[] {
  const n = photos.length;
  if (n < 2 || n > 2 * PHOTOS_MAX_PAGE) return [];
  const cle = photos.map((p) => `${p.l}x${p.h}`).join(",");
  const deja = memoListes.get(cle);
  if (deja) return deja;
  const liste: Template[] = [];
  for (let k = Math.max(1, n - PHOTOS_MAX_PAGE); k <= Math.min(PHOTOS_MAX_PAGE, n - 1); k++) {
    const gauches = meilleuresDePage(photos.slice(0, k), note);
    const droites = meilleuresDePage(photos.slice(k), note);
    for (const g of gauches) for (const d of droites) liste.push(templateDouble(g, d));
  }
  if (memoListes.size >= MEMO_LISTES_MAX) memoListes.clear();
  memoListes.set(cle, liste);
  return liste;
}
