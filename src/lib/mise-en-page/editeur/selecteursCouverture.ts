/**
 * Ce que l'écran lit de la couverture (lot B, 12/11), déjà calculé, en repère COUVERTURE (mm) pour un dos donné :
 * les cadres prêts à dessiner (mêmes formes que ceux d'une planche), les aplats, et le bilan (gabarit, mot-titre, sujet).
 * Le dos vient de l'écran (`[id]/dosCouverture.ts`) : ce dossier ne le calcule jamais. Purs.
 */

import { cadrer } from "../recadrage";
import { utilisations } from "../magazine";
import type { Aplat } from "../types";
import {
  GABARITS_COUVERTURE, ID_COUVERTURE, PART_MOT_TITRE_MIN, PART_SUJET_SOUS_TITRE, cadresCouverture, decorCouverture, gabaritCouverture,
  partDuMotTitre, textesDeCouverture, titreSurLeSujet, type GabaritCouverture,
} from "../couverture";
import { texteStyle } from "../style";
import { SEUIL_DPI, couvertureDe, estCouverture } from "./outils";
import { lieuCouverture } from "./lieuxTextes";
import { refPour } from "./operations";
import type { CadrePhoto, CadreTexte } from "./selecteurs";
import type { CibleDepot, EtatEditeur, RefCadre, SourceGlisser } from "./types";

export type CadreCouvertureEcran = (CadrePhoto | (CadreTexte & { repeter: number })) & { face: "quatrieme" | "premiere" };

const refC = (index: number): RefCadre => ({ plancheId: ID_COUVERTURE, cible: "double", index });

/** Les cadres de la couverture, repère couverture, dans l'ordre des calques. */
export function cadresDeCouverture(e: EtatEditeur, dosMm: number): CadreCouvertureEcran[] {
  const c = couvertureDe(e.magazine);
  /* lot C : le mot-titre se calcule avec la police de TITRE du style (ses chasses, ses capitales), pas avec Arial Bold */
  const textes = textesDeCouverture(c, lieuCouverture(c, e.catalogue), e.magazine.style);
  const u = utilisations(e.magazine);
  let iP = 0, iT = 0;
  return cadresCouverture(c, dosMm).map((x): CadreCouvertureEcran => {
    if (x.role === "photo") {
      const index = iP++;
      const a = c.photos[index];
      const ph = a.photoId ? e.catalogue.get(a.photoId) : null;
      const cadrage = cadrer(ph ?? refPour(e.catalogue, a.photoId), { l: x.l, h: x.h }, a.recadrage);
      const v = ph ? 25.4 / cadrage.echelle : null;
      return {
        role: "photo", face: x.face, ref: refC(index), x: x.x, y: x.y, l: x.l, h: x.h, rotation: x.rotation || 0, bord: x.bord || 0, rayon: x.rayon || 0,
        photoId: a.photoId, nom: ph ? ph.nom : a.photoId, indisponible: !!a.photoId && !ph, signalee: !!(ph && ph.signalee),
        recadrage: a.recadrage, cadrage, dpi: v, basseDef: v !== null && v < SEUIL_DPI, fois: a.photoId ? u.get(a.photoId) : 0, hesitation: null,
      };
    }
    const index = iT++;
    const t = textes[index];
    return {
      role: x.role, face: x.face, ref: refC(index), x: x.x, y: x.y, l: x.l, h: x.h, rotation: x.rotation || 0,
      contenu: t.contenu, vide: !t.saisi, taille: t.taille, gras: t.gras, blanc: x.couleur === "blanc", parDefaut: t.parDefaut, repeter: x.repeter ?? 1,
      style: e.magazine.style ? texteStyle(e.magazine.style, x.role, t.taille, x.couleur) : null,
    };
  });
}

/** Les aplats de la couverture (le dos d'abord), repère couverture. */
export const aplatsDeCouverture = (e: EtatEditeur, dosMm: number): Aplat[] => decorCouverture(couvertureDe(e.magazine), dosMm);

export type BilanCouverture = {
  existe: boolean;
  gabarit: GabaritCouverture;
  /** Cadres photo posés / total. */
  posees: number;
  cadres: number;
  /** Part de la largeur de la 1re couverte par le mot-titre (null : rien d'écrit ni de lieu connu). */
  partMotTitre: number | null;
  motTitreCourt: boolean;
  /** Part du sujet de la photo recouverte par le titre (0 = sur la zone calme). */
  surLeSujet: number;
  titreSurLeSujet: boolean;
  /** La couverture est-elle sans aucune photo sur la 1re ? (règle du 09/11 : toujours une vraie photo) */
  premiereSansPhoto: boolean;
};

export function bilanCouverture(e: EtatEditeur): BilanCouverture {
  const c = couvertureDe(e.magazine);
  const g = gabaritCouverture(c.templateId) ?? GABARITS_COUVERTURE[0];
  const lieu = lieuCouverture(c, e.catalogue);
  const part = partDuMotTitre(c, lieu, e.magazine.style);
  const sujet = titreSurLeSujet(c, e.catalogue);
  const photosG = g.cadres.filter((x) => x.role === "photo");
  return {
    existe: !!e.magazine.couverture, gabarit: g,
    posees: c.photos.filter((a) => a.photoId).length, cadres: c.photos.length,
    partMotTitre: part, motTitreCourt: part !== null && part < PART_MOT_TITRE_MIN,
    surLeSujet: sujet, titreSurLeSujet: sujet > PART_SUJET_SOUS_TITRE,
    premiereSansPhoto: !photosG.some((x, i) => x.face === "premiere" && c.photos[i]?.photoId),
  };
}

/** Le dépôt est-il possible sur la couverture (la cible s'allume) ? null si ni la source ni la cible n'est la couverture. */
export function cibleCouvertureAllumee(source: SourceGlisser, cible: CibleDepot): boolean | null {
  const versC = (cible.type === "cadre" || cible.type === "hesiter") && estCouverture(cible.ref);
  const depuisC = (source.type === "cadre" && estCouverture(source.ref)) || (source.type === "cadres" && (source.refs ?? []).some(estCouverture));
  if (!versC && !depuisC) return null;
  if (cible.type === "hesiter") return false;
  if (cible.type === "cadre" && versC) {
    if (source.type === "bibliotheque") return (source.ids ?? []).length === 1;
    return source.type === "cadre" && depuisC && source.ref.index !== cible.ref.index;
  }
  return source.type === "cadre" && cible.type === "bibliotheque";
}
