/**
 * Les raisons de « Posées et laissées » en MOTS D'ATELIER (E, recette du 18/11) : « Double 2, à côté d'une pleine page », « Presque la
 * même photo que IMG_0412 », « Note trop basse ». La raison technique (identifiants, notes, règles) reste dans `detail` et `regles`, pour
 * la trace et le survol ; elle n'est jamais la raison affichée. Module pur.
 */

import type { LieuPhoto } from "./trame";

/** La place d'une photo posée, dite comme un maquettiste la dirait. */
export function motPlace(l: LieuPhoto | undefined): string {
  if (!l) return "Posée";
  if (l.n === 0) return "Page 1, en grand";
  if (l.type === "derniere") return "Dernière page, en grand";
  const d = `Double ${l.n}`;
  const pleine = l.role === "pleine" || l.role === "double";
  switch (l.idee) {
    case "ouverture": return `${d}, ouvre le chapitre en pleine page`;
    case "itineraire": return `${d}, la page de l'itinéraire`;
    case "pano": case "double_paysage": return `${d}, seule sur les deux pages`;
    case "deux_pleines": return `${d}, une pleine page`;
    case "trois_bandes": return `${d}, en bande panoramique`;
    case "seule": return `${d}, seule sur sa page`;
    case "pleine_et_bandes": case "pleine_et_hautes": case "pleine_et_libre":
      return pleine ? `${d}, en pleine page` : `${d}, à côté d'une pleine page`;
    case "hautes_et_bandes": case "bandes_et_bandes": case "hautes_et_hautes": return `${d}, avec les photos du même format`;
    case "libre": return l.role === "heros" ? `${d}, la plus grande du moment` : `${d}, avec les photos du même moment`;
    default: return d;
  }
}

/** Le nom court d'une photo (sans dossier ni extension), pour « Presque la même photo que … ». */
export const nomCourt = (nom: string): string => (nom.split(/[\\/]/).pop() ?? nom).replace(/\.[a-z0-9]{2,5}$/i, "");

/** Une raison de réserve ou d'écart, en mots d'atelier ; `pages` : la taille composée (une taille ajustée se dit avec la vraie). */
export function motLaissee(technique: string, pages: number): string {
  const t = technique.trim();
  let m: RegExpExecArray | null;
  if ((m = /^même scène que (.+?) \(/.exec(t))) return `Presque la même photo que ${nomCourt(m[1])}`;
  if (/^note .* sous le plancher/.test(t)) return "Note trop basse";
  if (/^l'IA la juge faible/.test(t)) return "Jugée faible à la lecture";
  if (/^trop petite/.test(t)) return "Trop petite pour l'impression";
  if (/^chapitre incertain/.test(t)) return "Sans date ni lieu sûr : à placer à la main";
  if (/^bonne photo, mais pas de place/.test(t)) return `Bonne, mais pas de place en ${pages} pages`;
  if (/^laissée par la composition/.test(t)) return "Aucune page ne la tenait";
  if (/^proposée en couverture/.test(t)) return "Proposée en couverture";
  if (/^écartée par l'atelier/.test(t)) return "Écartée par l'atelier";
  if (/^doublon/.test(t)) return "Doublon d'une autre photo";
  if (/^floue/.test(t)) return "Floue";
  if (/^une autre de la rafale/.test(t)) return "Une autre de la rafale est gardée";
  if (/^en couverture/.test(t)) return "En couverture";
  return t.charAt(0).toUpperCase() + t.slice(1);
}
