/**
 * Les sélecteurs : tout ce que l'écran lit de l'état, déjà calculé (repères, compteurs, bande, chemin de fer, cadres).
 * Purs : ils ne changent rien. À calculer UNE fois par rendu quand ils parcourent la bibliothèque entière.
 */

import { cadresDe, decorDe, dispositionDe, utilisations, type Cible, type Planche } from "../magazine";
import { cadrer, type Cadrage, type Recadrage } from "../recadrage";
import type { Aplat, Template } from "../types";
import { dpi, estPleine, gabaritsClasses, pagesDe, photosIndisponibles, precedentDe, refPour } from "./operations";
import { SEUIL_DPI, aPhoto, dimsCadre, pluriel, idsDispo, idsMagazine, idsPlanche, indexPlanche, photosDe, plancheDe, porteeDe, saisi } from "./outils";
import { visibles } from "./bibliotheque";
import type { CibleDepot, EtatEditeur, Issue, RefCadre, SourceGlisser } from "./types";

const courante = (e: EtatEditeur, id?: string): string => id ?? e.plancheCourante;
const UNITE = { l: 1, h: 1 };

/** Le dpi le plus bas de chaque photo posée (T35 : point orange sous 200). */
export function dpiMinimaux(e: EtatEditeur): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of e.magazine.planches) {
    for (const x of photosDe(p)) {
      if (!x.photoId) continue;
      const ph = e.catalogue.get(x.photoId);
      if (!ph) continue;
      const d = dispositionDe(p, x.ref.cible);
      if (!d) continue;
      const v = dpi(ph, dimsCadre(d, x.ref.index) ?? UNITE, d.photos[x.ref.index].recadrage);
      out.set(x.photoId, Math.min(out.get(x.photoId) ?? Infinity, v));
    }
  }
  return out;
}

export type EtatPhoto = {
  id: string; indisponible: boolean; fois: number; surPlanche: boolean; coeur: boolean; signalee: boolean;
  autresMagazines: number[]; nouvelle: boolean; basseDef: boolean; selectionnee: boolean;
};

export function etatPhoto(e: EtatEditeur, id: string): EtatPhoto {
  const ph = e.catalogue.get(id);
  const u = utilisations(e.magazine);
  const p = plancheDe(e.magazine, e.plancheCourante);
  const d = dpiMinimaux(e).get(id);
  return {
    id, indisponible: !ph, fois: u.get(id) || 0, surPlanche: p ? idsPlanche(p).includes(id) : false,
    coeur: !!(ph && ph.coeur), signalee: !!(ph && ph.signalee), autresMagazines: ph ? ph.autresMagazines : [],
    nouvelle: !!(ph && ph.nouvelle), basseDef: d !== undefined && d < SEUIL_DPI, selectionnee: e.selection.ids.includes(id),
  };
}

/** Les repères de toute la bibliothèque en un passage (×n, liseré, basse déf.) : à calculer une fois par rendu. */
export function reperesBibliotheque(e: EtatEditeur): { utilisations: Map<string, number>; surPlanche: Set<string>; bassesDef: Set<string>; selection: Set<string> } {
  const p = plancheDe(e.magazine, e.plancheCourante);
  const mins = dpiMinimaux(e);
  return {
    utilisations: utilisations(e.magazine),
    surPlanche: new Set(p ? idsPlanche(p) : []),
    bassesDef: new Set([...mins].filter(([, v]) => v < SEUIL_DPI).map(([id]) => id)),
    selection: new Set(e.selection.ids),
  };
}

export function compteurs(e: EtatEditeur): {
  selection: number; libelleSelection: string; utilisations: Map<string, number>; photosPosees: number; total: number; surCettePlanche: number; visibles: number;
} {
  const n = e.selection.ids.length;
  const u = utilisations(e.magazine);
  const p = plancheDe(e.magazine, e.plancheCourante);
  return {
    selection: n,
    libelleSelection: n === 0 ? "" : `${n} sélectionnée${n > 1 ? "s" : ""}`,
    utilisations: u,
    photosPosees: [...u.keys()].filter((id) => e.catalogue.has(id)).length,
    total: e.catalogue.size,
    surCettePlanche: p ? idsPlanche(p).length : 0,
    visibles: visibles(e).length,
  };
}

export function pagesLibelle(e: EtatEditeur): { texte: string; pages: number; cible: number | null; depasse: boolean } {
  const n = pagesDe(e.magazine);
  const cible = e.projet && Number.isInteger(e.projet.nbPagesCible) ? e.projet.nbPagesCible : null;
  return cible ? { texte: `${n} / ${cible} pages`, pages: n, cible, depasse: n > cible } : { texte: `${n} pages`, pages: n, cible: null, depasse: false };
}

export type PhotoBande = { ref: RefCadre; photoId: string; indisponible: boolean; signalee: boolean; basseDef: boolean };
export type SegmentBande = { cible: Cible; photos: PhotoBande[] };

export function bande(e: EtatEditeur, plancheId?: string): SegmentBande[] {
  const p = plancheDe(e.magazine, courante(e, plancheId));
  if (!p) return [];
  const mins = dpiMinimaux(e);
  const segs: Cible[] = p.mode === "double" ? ["double"] : indexPlanche(e.magazine, p.id) === 0 ? ["droite"] : ["gauche", "droite"];
  return segs.map((cible) => ({
    cible,
    photos: idsDispo(dispositionDe(p, cible)).map((photoId, index) => {
      const ph = e.catalogue.get(photoId);
      return { ref: { plancheId: p.id, cible, index }, photoId, indisponible: !ph, signalee: !!(ph && ph.signalee), basseDef: (mins.get(photoId) ?? Infinity) < SEUIL_DPI };
    }),
  }));
}

export type VignetteChemin = {
  id: string; index: number; numero: number; mode: Planche["mode"]; nbPhotos: number; pleine: boolean; courante: boolean; pages: string;
};

/** Où une photo est posée : chaque cadre, avec sa planche et ses pages (clic sur ×n). */
export function emplacements(e: EtatEditeur, photoId: string): { ref: RefCadre; numero: number; pages: string }[] {
  return e.magazine.planches.flatMap((p, index) => photosDe(p).filter((x) => x.photoId === photoId)
    .map((x) => ({ ref: x.ref, numero: index + 1, pages: index === 0 ? "1" : `${2 * index}-${2 * index + 1}` })));
}

/** Pour chaque photo posée, les numéros des planches qui la portent (une passe sur le magazine, pour toute la grille). */
export function planchesDesPhotos(e: EtatEditeur): Map<string, number[]> {
  const r = new Map<string, number[]>();
  e.magazine.planches.forEach((p, index) => {
    for (const x of photosDe(p)) {
      if (!x.photoId) continue;
      const l = r.get(x.photoId) ?? [];
      if (l[l.length - 1] !== index + 1) l.push(index + 1);
      r.set(x.photoId, l);
    }
  });
  return r;
}

export function cheminDeFer(e: EtatEditeur): VignetteChemin[] {
  return e.magazine.planches.map((p, index) => ({
    id: p.id, index, numero: index + 1, mode: p.mode, nbPhotos: idsPlanche(p).length, pleine: estPleine(p, index),
    courante: p.id === e.plancheCourante, pages: index === 0 ? "1" : `${2 * index}-${2 * index + 1}`,
  }));
}

export type CadrePhoto = {
  role: "photo"; ref: RefCadre; x: number; y: number; l: number; h: number; rotation: number; bord: number; rayon: number;
  photoId: string | null; nom: string | null; indisponible: boolean; signalee: boolean; recadrage: Recadrage; cadrage: Cadrage;
  dpi: number | null; basseDef: boolean; fois: number | undefined;
};
export type CadreTexte = {
  role: "titre" | "texte" | "legende"; ref: RefCadre; x: number; y: number; l: number; h: number; rotation: number;
  contenu: string; vide: boolean; taille: number; gras: boolean; blanc: boolean;
};
export type CadrePlanche = CadrePhoto | CadreTexte;

/** Les cadres d'une planche en repère PLANCHE (mm), prêts à dessiner. */
export function cadresPlanche(e: EtatEditeur, plancheId?: string): CadrePlanche[] {
  const p = plancheDe(e.magazine, courante(e, plancheId));
  if (!p) return [];
  const out: CadrePlanche[] = [];
  const cibles: Cible[] = p.mode === "double" ? ["double"] : ["gauche", "droite"];
  for (const cible of cibles) {
    const d = dispositionDe(p, cible);
    if (!d) continue;
    let iP = 0, iT = 0;
    for (const c of cadresDe(d, cible)) {
      if (c.role === "photo") {
        const index = iP++;
        const a = d.photos[index];
        const ph = a.photoId ? e.catalogue.get(a.photoId) : null;
        const cadrage = cadrer(ph ?? refPour(e.catalogue, a.photoId), { l: c.l, h: c.h }, a.recadrage);
        const v = ph ? 25.4 / cadrage.echelle : null;
        out.push({ role: "photo", ref: { plancheId: p.id, cible, index }, x: c.x, y: c.y, l: c.l, h: c.h, rotation: c.rotation || 0,
          bord: c.bord || 0, rayon: c.rayon || 0,
          photoId: a.photoId, nom: ph ? ph.nom : a.photoId, indisponible: !!a.photoId && !ph, signalee: !!(ph && ph.signalee),
          recadrage: a.recadrage, cadrage, dpi: v, basseDef: v !== null && v < SEUIL_DPI,
          fois: a.photoId ? utilisations(e.magazine).get(a.photoId) : 0 });
      } else {
        const index = iT++;
        const t = d.textes[index];
        out.push({ role: c.role, ref: { plancheId: p.id, cible, index }, x: c.x, y: c.y, l: c.l, h: c.h, rotation: c.rotation || 0,
          contenu: t.contenu, vide: !saisi(t), taille: t.taille, gras: t.gras, blanc: c.couleur === "blanc" });
      }
    }
  }
  return out;
}

/** Les aplats d'une planche (repère PLANCHE, mm), sous les cadres. */
export function aplatsPlanche(e: EtatEditeur, plancheId?: string): Aplat[] {
  const p = plancheDe(e.magazine, courante(e, plancheId));
  if (!p) return [];
  const cibles: Cible[] = p.mode === "double" ? ["double"] : ["gauche", "droite"];
  return cibles.flatMap((cible) => {
    const d = dispositionDe(p, cible);
    return d ? decorDe(d, cible) : [];
  });
}

export type GabaritPour = { template: Template; id: string; nom: string; note: number; courant: boolean };

export function gabaritsPour(e: EtatEditeur, plancheId: string, cible: Cible): GabaritPour[] {
  const i = indexPlanche(e.magazine, plancheId);
  if (i < 0) return [];
  const d = dispositionDe(e.magazine.planches[i], cible);
  if (!d) return [];
  const refs = idsDispo(d).map((id) => refPour(e.catalogue, id));
  return gabaritsClasses(porteeDe(cible), refs, precedentDe(e.magazine, i, cible))
    .map(({ template, note }) => ({ template, id: template.id, nom: template.nom, note, courant: template.id === d.templateId }));
}

export type ActionsPlanche = {
  premiere: boolean; vider: boolean; supprimer: boolean; fusionner: boolean; separer: boolean; zoneDouble: boolean; deplacable: boolean; pleine: boolean;
};

export function actionsPlanche(e: EtatEditeur, plancheId: string): ActionsPlanche | null {
  const i = indexPlanche(e.magazine, plancheId);
  if (i < 0) return null;
  const p = e.magazine.planches[i];
  return {
    premiere: i === 0, vider: !!(p.double || p.gauche || p.droite), supprimer: i > 0,
    fusionner: i > 0 && p.mode === "pages", separer: i > 0 && p.mode === "double",
    zoneDouble: i > 0 && p.mode === "pages", deplacable: i > 0, pleine: estPleine(p, i),
  };
}

/** T4 et T9 : une cible s'allume-t-elle pendant le glisser ? */
export function cibleAllumee(e: EtatEditeur, source: SourceGlisser | null | undefined, cible: CibleDepot | null | undefined): boolean {
  if (!source || !cible) return false;
  const m = e.magazine;
  if (cible.type === "bibliotheque") return source.type === "cadre";
  if (cible.type === "entre") return (source.type === "planche" || source.type === "bibliotheque") && cible.index >= 1;
  if (source.type === "planche") return false;
  const pid = cible.type === "cadre" ? cible.ref?.plancheId : cible.plancheId;
  const i = pid === undefined ? -1 : indexPlanche(m, pid);
  if (i < 0) return false;
  const p = m.planches[i];
  if (cible.type === "page") return i === 0 ? cible.cote === "droite" : p.mode === "pages";
  if (cible.type === "double") return i > 0;
  if (cible.type === "cadre") return aPhoto(m, cible.ref) && !(source.type === "bibliotheque" && (source.ids || []).length !== 1);
  return cible.type === "bande" || cible.type === "vignette";
}

export function resumeIssue(is: Issue | null | undefined): string {
  if (!is) return "";
  if (is.refus === "pleine") return "Page pleine";
  if (is.refus === "deja_la") return "Déjà sur cette double page";
  if (is.refus === "rien") return "Rien ne change";
  const bouts: string[] = [];
  if (is.dejaLa) bouts.push(`${is.dejaLa} déjà là`);
  if (is.restees.length) bouts.push(`${pluriel(is.restees.length, "restée", "restées")} à côté`);
  if (is.textesPerdus) bouts.push(pluriel(is.textesPerdus, "texte retiré", "textes retirés"));
  return bouts.join(" · ");
}

export const libelleAnnuler = (e: EtatEditeur): string | null => {
  const p = e.historique.passe;
  return p.length ? `Annuler : ${p[p.length - 1].libelle.toLowerCase()}` : null;
};
export const libelleRetablir = (e: EtatEditeur): string | null => {
  const f = e.historique.futur;
  return f.length ? `Rétablir : ${f[f.length - 1].libelle.toLowerCase()}` : null;
};

export type AvertissementsExport = {
  indisponibles: string[];
  signaleesPosees: string[];
  bassesDef: { photoId: string; plancheId: string; numero: number; dpi: number }[];
  pagesAuDessus: number;
  planches: number;
  photos: number;
};

export function avertissementsExport(e: EtatEditeur): AvertissementsExport {
  const indisponibles = photosIndisponibles(e.magazine, e.catalogue);
  const signaleesPosees = [...new Set(idsMagazine(e.magazine).filter((id) => { const ph = e.catalogue.get(id); return ph && ph.signalee; }))];
  const bassesDef: AvertissementsExport["bassesDef"] = [];
  e.magazine.planches.forEach((p, index) => {
    for (const x of photosDe(p)) {
      const ph = x.photoId ? e.catalogue.get(x.photoId) : undefined;
      if (!x.photoId || !ph) continue;
      const d = dispositionDe(p, x.ref.cible);
      if (!d) continue;
      const v = dpi(ph, dimsCadre(d, x.ref.index) ?? UNITE, d.photos[x.ref.index].recadrage);
      if (v < SEUIL_DPI) bassesDef.push({ photoId: x.photoId, plancheId: p.id, numero: index + 1, dpi: Math.round(v) });
    }
  });
  const pl = pagesLibelle(e);
  return { indisponibles, signaleesPosees, bassesDef, pagesAuDessus: pl.depasse && pl.cible !== null ? pl.pages - pl.cible : 0,
    planches: e.magazine.planches.length, photos: idsMagazine(e.magazine).length };
}
