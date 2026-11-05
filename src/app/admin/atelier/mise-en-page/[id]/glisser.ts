/**
 * Le glisser en événements pointeur : ce qu'il y a sous le pointeur, traduit en cible de dépôt (ARCHI §3.1),
 * et la phrase de l'aperçu. Lecture du DOM par `data-*` et classes `ed-*` ; aucun calcul du magazine ici.
 */

import { cibleAllumee, resumeIssue, type CibleDepot, type EtatEditeur, type Geste, type Issue, type SourceGlisser } from "@/lib/mise-en-page/editeur";
import { PAGE_H, PLANCHE_L } from "@/lib/mise-en-page/geometrie";
import { pluriel } from "./contexte";

export type Glisse = {
  source: SourceGlisser;
  x0: number; y0: number; x: number; y: number;
  actif: boolean;
  cle: string | null;
  ressort: ReturnType<typeof setTimeout> | null;
  nettoyer: () => void;
};

/** `alt` (lot 4) : ⌥ tenu, une photo lâchée sur la planche s'y pose EN LIBRE, là où est le pointeur. */
export function cibleSous(x: number, y: number, src: SourceGlisser, ed: EtatEditeur, alt = false): CibleDepot | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const multi = (src.type === "bibliotheque" && src.ids.length > 1) || src.type === "cadres";
  const zm = src.type === "cadres" ? el.closest("[data-miroir]") : null;
  if (zm) {
    const c: CibleDepot = { type: "miroir", plancheId: zm.getAttribute("data-miroir") ?? "" };
    return cibleAllumee(ed, src, c) ? c : null;
  }
  if (alt && (src.type === "bibliotheque" || src.type === "cadre")) {
    const planche = el.closest(".ed-planche");
    const cote = planche ? el.closest("[data-cote]") : null;
    if (planche && cote) {
      const [plancheId, c] = (cote.getAttribute("data-cote") ?? "").split("|");
      const r = planche.getBoundingClientRect();
      if ((c === "gauche" || c === "droite" || c === "double") && r.width > 0) {
        const cb: CibleDepot = { type: "libre", plancheId, cible: c, x: ((x - r.left) / r.width) * PLANCHE_L, y: ((y - r.top) / r.height) * PAGE_H };
        if (cibleAllumee(ed, src, cb)) return cb;
      }
    }
  }
  /* Entre deux vignettes du chemin de fer : une planche s'y déplace, des photos y font une double page neuve. */
  const entre = (piste: Element): CibleDepot => {
    const vs = [...piste.querySelectorAll(".ed-cf-v")];
    let index = vs.length;
    for (let i = 0; i < vs.length; i++) {
      const r = vs[i].getBoundingClientRect();
      if (x < r.left + r.width / 2) { index = i; break; }
    }
    return { type: "entre", index: Math.max(1, index) };
  };
  if (src.type === "planche") {
    const piste = el.closest(".ed-cf-piste");
    return piste ? entre(piste) : null;
  }
  const piste = el.closest(".ed-bande-piste");
  if (piste) {
    const pid = ed.plancheCourante;
    const segs = [...piste.querySelectorAll(".ed-bande-seg")];
    if (!segs.length) return { type: "bande", plancheId: pid, position: 0 };
    let seg = el.closest(".ed-bande-seg");
    if (!seg) {
      seg = segs[segs.length - 1];
      for (const s of segs) {
        if (x < s.getBoundingClientRect().right) { seg = s; break; }
      }
    }
    const bvs = [...seg.querySelectorAll(".ed-bv")];
    let position = bvs.length;
    for (let i = 0; i < bvs.length; i++) {
      const r = bvs[i].getBoundingClientRect();
      if (x < r.left + r.width / 2) { position = i; break; }
    }
    const cote = seg.getAttribute("data-cote");
    return cote === "double" ? { type: "bande", plancheId: pid, position } : { type: "bande", plancheId: pid, position, cote: cote === "gauche" ? "gauche" : "droite" };
  }
  const vig = el.closest("[data-vignette]");
  if (vig) return { type: "vignette", plancheId: vig.getAttribute("data-vignette") ?? "" };
  const cf = src.type === "bibliotheque" ? el.closest(".ed-cf-piste") : null;
  if (cf) return entre(cf);
  /* tri (05/11) : la grille du tour ou sa colonne « à côté » */
  const zone = src.type === "bibliotheque" ? el.closest("[data-tri-zone]") : null;
  if (zone) {
    const z = zone.getAttribute("data-tri-zone");
    const c: CibleDepot | null = z === "jeu" || z === "cote" ? { type: "tri", zone: z } : null;
    return c && cibleAllumee(ed, src, c) ? c : null;
  }
  if (el.closest(".ed-ph")) return src.type === "cadre" || src.type === "cadres" ? { type: "bibliotheque" } : null;
  if (el.closest(".ed-zone-double")) return { type: "double", plancheId: ed.plancheCourante };
  const encart = el.closest("[data-hesiter]");
  if (encart && !multi && src.type === "bibliotheque") {
    const [plancheId, cible, index] = (encart.getAttribute("data-hesiter") ?? "").split("|");
    if (cible === "gauche" || cible === "droite" || cible === "double") {
      const c: CibleDepot = { type: "hesiter", ref: { plancheId, cible, index: Number(index) } };
      if (cibleAllumee(ed, src, c)) return c;
    }
  }
  const cadre = el.closest("[data-cadre]");
  if (cadre && !multi) {
    const [plancheId, cible, index] = (cadre.getAttribute("data-cadre") ?? "").split("|");
    if (cible === "gauche" || cible === "droite" || cible === "double") {
      const c: CibleDepot = { type: "cadre", ref: { plancheId, cible, index: Number(index) } };
      if (cibleAllumee(ed, src, c)) return c;
    }
  }
  const cote = el.closest("[data-cote]");
  if (cote) {
    const [plancheId, c] = (cote.getAttribute("data-cote") ?? "").split("|");
    const cb: CibleDepot | null = c === "double" ? { type: "double", plancheId } : c === "gauche" || c === "droite" ? { type: "page", plancheId, cote: c } : null;
    return cb && cibleAllumee(ed, src, cb) ? cb : null;
  }
  return null;
}

/** La phrase au bout du pointeur ou sur la planche : ce que le lâcher ferait. */
export function libelleApercu(source: SourceGlisser, cible: CibleDepot | null, apercu: Issue | null): string | null {
  if (!cible) return source.type === "bibliotheque" && source.ids.length > 1 ? pluriel(source.ids.length, "photo") : null;
  const a = apercu;
  if (!a) return null;
  if (a.refus) return resumeIssue(a);
  let t: string;
  if (cible.type === "tri") return cible.zone === "jeu" ? `Remettre en jeu${source.type === "bibliotheque" && source.ids.length > 1 ? ` · ${source.ids.length} photos` : ""}` : "Mettre de côté";
  if (cible.type === "hesiter") t = "Hésiter avec celle-ci";
  else if (cible.type === "libre") t = source.type === "bibliotheque" ? "Poser en libre" : "Déplacer en libre";
  else if (cible.type === "miroir") t = "Inverser";
  else if (cible.type === "cadre") t = source.type === "bibliotheque" && !a.echange ? "Remplacer" : "Échanger";
  else if (cible.type === "bibliotheque") t = "Retirer";
  else if (cible.type === "double") t = source.type === "bibliotheque" ? "Double page" : "Déplacer ici";
  else if (cible.type === "vignette") t = "Ajouter à cette planche";
  else if (cible.type === "bande") t = "Placer ici";
  else if (cible.type === "entre") t = source.type === "bibliotheque" ? (a.posees.length > 12 ? "Nouvelles doubles pages" : "Nouvelle double page") : "Déplacer la planche";
  else t = source.type === "bibliotheque" ? (a.posees.length > 1 ? `Poser ${a.posees.length} photos` : "Poser") : "Déplacer ici";
  const r = resumeIssue(a);
  /* lot 4 : sur la planche, rappeler que ⌥ pose en libre */
  const astuce = (cible.type === "page" || cible.type === "double" || cible.type === "cadre") && (source.type === "bibliotheque" || source.type === "cadre") ? " · ⌥ libre" : "";
  return r ? `${t} · ${r}` : `${t}${astuce}`;
}

export type EnvoiGeste = (g: Geste, silencieux?: boolean) => void;
