/**
 * Le lieu, texte par défaut des titres et légendes (09/11). Un titre ou une légende que personne n'a écrit (il porte
 * encore « Titre », « Légende ») se montre ET s'exporte avec le lieu de ses photos, quand on le connaît :
 *   - le PREMIER titre : le lieu le plus présent sur la page (à égalité, celui de la première photo) ; les autres
 *     titres (sous-titres) gardent leur libellé ;
 *   - la k-ième légende : le lieu de la k-ième photo quand il DIFFÈRE de celui du titre (sinon on lirait « Lisbonne »
 *     cinq fois) ; sans titre sur la page, la première légende porte le lieu principal.
 * Le lieu, c'est la ville, sinon le pays (`lieuCourt`). Rien n'est écrit dans le magazine : changer les photos change
 * le lieu. Dès qu'on écrit le texte (ou qu'on choisit un lieu proposé), c'est ce texte qui compte. Un « Texte » reste vide.
 */

import { cadresDe, type Cible, type Disposition, type Magazine, type PhotoRef, type Planche } from "../magazine";
import { lieuCourt } from "./moments";
import { saisi } from "./outils";

type PhotoLieu = PhotoRef & { ville?: string | null; pays?: string | null };
export type CatalogueLieux = ReadonlyMap<string, PhotoLieu>;

/** Le texte par défaut de chaque cadre de texte de la disposition (null = garder le libellé). */
export function lieuxParDefaut(d: Disposition, cible: Cible, cat: CatalogueLieux): (string | null)[] {
  const lieux = d.photos.map((a) => {
    const p = a.photoId ? cat.get(a.photoId) : undefined;
    return p ? lieuCourt(p) : null;
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

function avecLieux(d: Disposition | null, cible: Cible, cat: CatalogueLieux): Disposition | null {
  if (!d || !d.textes.length) return d;
  const defaut = lieuxParDefaut(d, cible, cat);
  if (!defaut.some((x, i) => x && !saisi(d.textes[i]))) return d;
  return { ...d, textes: d.textes.map((t, i) => (!saisi(t) && defaut[i] ? { ...t, contenu: defaut[i] } : t)) };
}

/** Le magazine tel qu'il part à l'export : chaque titre et légende non écrit porte son lieu. */
export function avecLieuxParDefaut(m: Magazine, cat: CatalogueLieux): Magazine {
  const planches = m.planches.map((p): Planche => {
    const double = avecLieux(p.double, "double", cat), gauche = avecLieux(p.gauche, "gauche", cat), droite = avecLieux(p.droite, "droite", cat);
    return double === p.double && gauche === p.gauche && droite === p.droite ? p : { ...p, double, gauche, droite };
  });
  return planches.every((p, i) => p === m.planches[i]) ? m : { ...m, planches };
}
