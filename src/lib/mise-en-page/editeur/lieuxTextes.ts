/**
 * Le lieu, texte par défaut des titres et légendes (09/11). Un titre ou une légende que personne n'a écrit (il porte
 * encore « Titre », « Légende ») se montre ET s'exporte avec le lieu de ses photos, quand on le connaît :
 *   - le PREMIER titre : le lieu le plus présent sur la page (à égalité, celui de la première photo) ; les autres
 *     titres (sous-titres) gardent leur libellé ;
 *   - la k-ième légende : le lieu de la k-ième photo quand il DIFFÈRE de celui du titre (sinon on lirait « Lisbonne »
 *     cinq fois) ; sans titre sur la page, la première légende porte le lieu principal.
 * Le lieu, c'est la ville, sinon le pays (`lieuCourt`). Rien n'est écrit dans le magazine : changer les photos change
 * le lieu. Dès qu'on écrit le texte (ou qu'on choisit un lieu proposé), c'est ce texte qui compte. Un « Texte » reste vide.
 * Lot R : à l'export, ce qui n'a pas de lieu est VIDÉ (le mot-repère « Titre » ne s'imprime jamais), voir `avecLieux`.
 */

import { cadresDe, type Cible, type Disposition, type Magazine, type PhotoRef, type Planche } from "../magazine";
import { cadresPhotoCouverture, couverturePourExport, gabaritCouverture, type Couverture } from "../couverture";
import { lieuCourt } from "./moments";
import { saisi } from "./outils";

type PhotoLieu = PhotoRef & { ville?: string | null; pays?: string | null; lieuIA?: string | null };

/** Lot F (R147) : le lieu d'une photo pour un titre ou une légende : le lieu NOMMÉ de la lecture IA quand il est sûr (posé dans
 *  `lieuIA` par l'état, jamais un lieu « à vérifier »), sinon la ville, sinon le pays. La couverture et les séjours gardent `lieuCourt`. */
export const lieuDeTexte = (p: PhotoLieu): string | null => p.lieuIA?.trim() || lieuCourt(p);
export type CatalogueLieux = ReadonlyMap<string, PhotoLieu>;

/** Le texte par défaut de chaque cadre de texte de la disposition (null = garder le libellé). */
export function lieuxParDefaut(d: Disposition, cible: Cible, cat: CatalogueLieux): (string | null)[] {
  const lieux = d.photos.map((a) => {
    const p = a.photoId ? cat.get(a.photoId) : undefined;
    return p ? lieuDeTexte(p) : null;
  });
  const compte = new Map<string, number>();
  for (const l of lieux) if (l) compte.set(l, (compte.get(l) ?? 0) + 1);
  let principal: string | null = null;
  for (const l of lieux) if (l && (principal === null || (compte.get(l) ?? 0) > (compte.get(principal) ?? 0))) principal = l;
  const roles = cadresDe(d, cible).filter((c) => c.role !== "photo").map((c) => c.role);
  const avecTitre = roles.includes("titre");
  let k = 0, titreVu = false, legendeVue = false;
  return roles.map((r) => {
    if (r === "titre") {
      if (titreVu) return null;
      titreVu = true;
      return principal;
    }
    if (r === "legende") {
      const l = lieux[k++] ?? null;
      const premiere = !legendeVue;
      legendeVue = true;
      if (l && l !== principal) return l;
      return !avecTitre && premiere ? principal : null;
    }
    return null;
  });
}

/**
 * Lot R (D2, 12/11) : à l'export, un texte NON ÉCRIT prend son lieu quand il en a un, sinon il est VIDÉ. Le mot-repère
 * (« Titre », « Texte », « Légende ») n'existe qu'à l'écran : il ne s'imprime jamais, ni dans le PDF ni dans l'IDML, et un
 * cadre vide ne part pas (`planPdf`, `elementsXml`). Un texte écrit n'est jamais touché ; le même objet revient quand il n'y a rien à changer.
 */
function avecLieux(d: Disposition | null, cible: Cible, cat: CatalogueLieux): Disposition | null {
  if (!d || !d.textes.length) return d;
  const defaut = lieuxParDefaut(d, cible, cat);
  if (d.textes.every(saisi)) return d;
  return { ...d, textes: d.textes.map((t, i) => (saisi(t) ? t : { ...t, contenu: defaut[i] ?? "" })) };
}

/**
 * Lot B : le lieu de la couverture, mot-titre par défaut de la 1re : celui de la photo du plus grand cadre de la 1re dont on
 * connaît le lieu (la ville, sinon le pays). Null si aucune ne le dit.
 */
export function lieuCouverture(c: Couverture | null | undefined, cat: CatalogueLieux): string | null {
  const g = c ? gabaritCouverture(c.templateId) : null;
  if (!c || !g) return null;
  const parAire = cadresPhotoCouverture(g).map((x, i) => ({ x, i })).filter((y) => y.x.face === "premiere").sort((a, b) => b.x.l * b.x.h - a.x.l * a.x.h || a.i - b.i);
  for (const { i } of parAire) {
    const id = c.photos[i]?.photoId;
    const p = id ? cat.get(id) : undefined;
    const l = p ? lieuCourt(p) : null;
    if (l) return l;
  }
  return null;
}

/** Le magazine tel qu'il part à l'export : chaque titre et légende non écrit porte son lieu ; la couverture est prête
 *  (mot-titre au lieu ou vide, corps calculé : `couverturePourExport`). */
export function avecLieuxParDefaut(m: Magazine, cat: CatalogueLieux): Magazine {
  const planches = m.planches.map((p): Planche => {
    const double = avecLieux(p.double, "double", cat), gauche = avecLieux(p.gauche, "gauche", cat), droite = avecLieux(p.droite, "droite", cat);
    return double === p.double && gauche === p.gauche && droite === p.droite ? p : { ...p, double, gauche, droite };
  });
  const sansChangement = planches.every((p, i) => p === m.planches[i]);
  if (!m.couverture) return sansChangement ? m : { ...m, planches };
  return { ...m, planches: sansChangement ? m.planches : planches, couverture: couverturePourExport(m.couverture, lieuCouverture(m.couverture, cat), m.style) };
}
