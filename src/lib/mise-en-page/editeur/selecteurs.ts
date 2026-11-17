/**
 * Les sélecteurs : tout ce que l'écran lit de l'état, déjà calculé (repères, compteurs, bande, chemin de fer, cadres).
 * Purs : ils ne changent rien. À calculer UNE fois par rendu quand ils parcourent la bibliothèque entière.
 */

import { cadresDe, coteSeul, decorDe, dispositionDe, estDerniere, utilisations, type Cible, type CoteSeul, type Magazine, type Planche } from "../magazine";
import { cadrer, type Cadrage, type Recadrage } from "../recadrage";
import type { Aplat, Template } from "../types";
import { grossirSansStyle, placeDuTexte, texteStyle, type TexteStyle } from "../style";
import { PLANCHE_L } from "../geometrie";
import { piecesDuFond, type CouleurLibre, type PieceFond } from "../couleursLibres";
import { rangerParTypes, type TypeDeGabarits } from "../typesGabarits";
import { corpsAffiche, largeurArialGras, lieuxParDefaut } from "./lieuxTextes";
import { dansFamille, dpi, estPleine, partDansLePliPose, gabaritsClasses, pagesDe, photosIndisponibles, precedentDe, refPour } from "./operations";
import { estTour, marquePourZone } from "./tri";
import { LIBELLE, SEUIL_DPI, aPhoto, dimsCadre, pluriel, idsDispo, idsMagazine, idsPlanche, indexPlanche, photosDe, plancheDe, porteeDe, saisi } from "./outils";
import { visibles } from "./bibliotheque";
import { pageEntiere } from "./libre";
import type { CibleDepot, EtatEditeur, Issue, RefCadre, SourceGlisser } from "./types";
import { ID_COUVERTURE, cadresPhotoCouverture, gabaritCouverture } from "../couverture";
import { cibleCouvertureAllumee } from "./selecteursCouverture";

/** Lot B : les photos posées sur la couverture, avec leur référence et leurs mesures de cadre (pour le dpi). */
function photosCouverture(e: EtatEditeur): { ref: RefCadre; photoId: string; cadre: { l: number; h: number }; recadrage: Recadrage }[] {
  const c = e.magazine.couverture;
  const g = c ? gabaritCouverture(c.templateId) : null;
  if (!c || !g) return [];
  return cadresPhotoCouverture(g).flatMap((x, index) => {
    const a = c.photos[index];
    return a?.photoId ? [{ ref: { plancheId: ID_COUVERTURE, cible: "double" as const, index }, photoId: a.photoId, cadre: { l: x.l, h: x.h }, recadrage: a.recadrage }] : [];
  });
}

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
  for (const x of photosCouverture(e)) {
    const ph = e.catalogue.get(x.photoId);
    if (ph) out.set(x.photoId, Math.min(out.get(x.photoId) ?? Infinity, dpi(ph, x.cadre, x.recadrage)));
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
  const seul = coteSeul(e.magazine, indexPlanche(e.magazine, p.id));
  const segs: Cible[] = p.mode === "double" ? ["double"] : seul ? [seul] : ["gauche", "droite"];
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

/**
 * Les pages d'une planche, pour l'étiquette : « 1 » pour la première (page droite seule), « 2-3 », « 4-5 »… pour une planche courante,
 * et pour la dernière page (lot E, page gauche seule) son numéro seul : « 32 ». Un magazine d'avant le lot E n'a pas de dernière page : sa
 * dernière planche est une planche courante.
 */
export function etiquettePages(m: Pick<Magazine, "derniere" | "planches">, index: number): string {
  if (index === 0) return "1";
  return estDerniere(m, index) ? String(2 * index) : `${2 * index}-${2 * index + 1}`;
}

/** Où une photo est posée : chaque cadre, avec sa planche et ses pages (clic sur ×n). La couverture (lot B) : numéro 0, « couv. ». */
export function emplacements(e: EtatEditeur, photoId: string): { ref: RefCadre; numero: number; pages: string }[] {
  return [
    ...photosCouverture(e).filter((x) => x.photoId === photoId).map((x) => ({ ref: x.ref, numero: 0, pages: "couv." })),
    ...e.magazine.planches.flatMap((p, index) => photosDe(p).filter((x) => x.photoId === photoId)
      .map((x) => ({ ref: x.ref, numero: index + 1, pages: etiquettePages(e.magazine, index) }))),
  ];
}

/** Pour chaque photo posée, les numéros des planches qui la portent (une passe sur le magazine, pour toute la grille). */
export function planchesDesPhotos(e: EtatEditeur): Map<string, number[]> {
  const r = new Map<string, number[]>();
  /* lot B : la couverture compte comme la planche 0 */
  for (const x of photosCouverture(e)) if (!(r.get(x.photoId) ?? []).includes(0)) r.set(x.photoId, [0]);
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
    id: p.id, index, numero: index + 1, mode: p.mode, nbPhotos: idsPlanche(p).length, pleine: estPleine(p, coteSeul(e.magazine, index)),
    courante: p.id === e.plancheCourante, pages: etiquettePages(e.magazine, index),
  }));
}

export type CadrePhoto = {
  role: "photo"; ref: RefCadre; x: number; y: number; l: number; h: number; rotation: number; bord: number; rayon: number;
  /** Lot Signatures (R184) : l'ombre douce d'un tirage posé. */
  ombre: boolean;
  photoId: string | null; nom: string | null; indisponible: boolean; signalee: boolean; recadrage: Recadrage; cadrage: Cadrage;
  dpi: number | null; basseDef: boolean; fois: number | undefined;
  /** La photo de derrière (lot 3) : `ouverte` tant qu'on hésite, sinon la délaissée notée. */
  hesitation: { photoId: string; nom: string; ouverte: boolean } | null;
};
export type CadreTexte = {
  role: "titre" | "texte" | "legende"; ref: RefCadre; x: number; y: number; l: number; h: number; rotation: number;
  contenu: string; vide: boolean; taille: number; gras: boolean; blanc: boolean;
  /** 09/11 : le lieu qui remplace le libellé tant que rien n'est écrit (null : le libellé). */
  parDefaut: string | null;
  /** Lot C : ce que la feuille de style du magazine fait de ce texte (police, graisse, corps, capitales, couleur) ; null sans style. */
  style: TexteStyle | null;
  /** Lot G : la couleur CHOISIE pour ce texte (un rôle ou un hexa), null = celle du gabarit. Elle prime sur `blanc`. */
  teinte: CouleurLibre | null;
  /** Lot Signatures : un cadre GÉANT. Vide (ni texte, ni fait), l'écran montre un REPÈRE discret, jamais le mot « Titre » géant (finitions du 16/11). */
  geant: boolean;
  /** Finitions du 16/11 : le texte écrit tient dans son cadre à son corps (sous un style ; sans style, toujours vrai). Faux = il déborde à l'export. */
  tient: boolean;
  /** Finitions du 16/11 : de combien l'écran peut le grossir (plancher de lisibilité) en gardant ses lignes et sans sortir du cadre (≥ 1). */
  grossir: number;
};
export type CadrePlanche = CadrePhoto | CadreTexte;

/**
 * Finitions du 16/11 : la lecture d'un texte à l'écran.
 * - `PLANCHER_PX` : le plus petit corps d'écran (px), pour qu'une légende de 7 pt reste lisible sur une planche réduite ; il ne grossit un
 *   texte que de `grossir` (mêmes lignes, dans son cadre), sinon une ligne de 9 px coupait un cadre de 4,5 mm par le milieu des lettres ;
 * - `RETRAIT_MM` : le `padding: 0 0.15cqw` de `.ed-txt` (0,15 % de la planche de chaque côté), ôté de la largeur mesurée ;
 * - `INTERLIGNE_SANS_STYLE` : le `line-height` de `.ed-txt` sans style.
 */
export const REGLAGES_TEXTE_ECRAN = { PLANCHER_PX: 9, RETRAIT_MM: 0.0015 * PLANCHE_L, INTERLIGNE_SANS_STYLE: 1.15 } as const;

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
    const defauts = lieuxParDefaut(d, cible, e.catalogue);
    for (const c of cadresDe(d, cible)) {
      if (c.role === "photo") {
        const index = iP++;
        const a = d.photos[index];
        const ph = a.photoId ? e.catalogue.get(a.photoId) : null;
        const cadrage = cadrer(ph ?? refPour(e.catalogue, a.photoId), { l: c.l, h: c.h }, a.recadrage);
        const v = ph ? 25.4 / cadrage.echelle : null;
        out.push({ role: "photo", ref: { plancheId: p.id, cible, index }, x: c.x, y: c.y, l: c.l, h: c.h, rotation: c.rotation || 0,
          bord: c.bord || 0, rayon: c.rayon || 0, ombre: !!c.ombre,
          photoId: a.photoId, nom: ph ? ph.nom : a.photoId, indisponible: !!a.photoId && !ph, signalee: !!(ph && ph.signalee),
          recadrage: a.recadrage, cadrage, dpi: v, basseDef: v !== null && v < SEUIL_DPI,
          fois: a.photoId ? utilisations(e.magazine).get(a.photoId) : 0,
          hesitation: a.hesitation ? { photoId: a.hesitation.photoId, nom: e.catalogue.get(a.hesitation.photoId)?.nom ?? a.hesitation.photoId, ouverte: !a.hesitation.tranchee } : null });
      } else {
        const index = iT++;
        const t = d.textes[index];
        const parDefaut = defauts[index] ?? null;
        /* un titre s'ajuste à son cadre avec les chasses de sa police : on mesure ce que l'écran montre (le lieu qui remplace le libellé, sinon le texte) */
        const affiche = !saisi(t) || !t.contenu ? parDefaut ?? (t.contenu || LIBELLE[c.role]) : t.contenu;
        /* lot Signatures (R181) : un cadre GÉANT prend le corps qui le remplit, calculé sur ce que l'écran montre (comme l'export) */
        const taille = corpsAffiche(c, affiche, e.magazine.style) ?? t.taille;
        const style = e.magazine.style ? texteStyle(e.magazine.style, c.role, taille, t.couleur ?? c.couleur, { contenu: affiche, l: c.l, h: c.h }) : null;
        /* finitions du 16/11 : ce que l'écran montre tient-il dans son cadre, et de combien le plancher de lisibilité peut-il le grossir ? */
        const utile = { l: Math.max(0, c.l - 2 * REGLAGES_TEXTE_ECRAN.RETRAIT_MM), h: c.h };
        const place = style ? placeDuTexte(affiche, style, utile) : null;
        const ecrit = saisi(t) && !!t.contenu.trim();
        out.push({ role: c.role, ref: { plancheId: p.id, cible, index }, x: c.x, y: c.y, l: c.l, h: c.h, rotation: c.rotation || 0,
          contenu: t.contenu, vide: !saisi(t), taille, gras: t.gras, blanc: c.couleur === "blanc", parDefaut, style,
          teinte: t.couleur ?? null, geant: !!c.geant,
          tient: !place || place.tient || !(ecrit || parDefaut !== null),
          grossir: place ? place.grossir : style ? 1 : grossirSansStyle(affiche, taille, REGLAGES_TEXTE_ECRAN.INTERLIGNE_SANS_STYLE, utile, largeurArialGras) });
      }
    }
  }
  return out;
}

/** Lot G : le fond de couleur d'une planche, à l'écran (repère PLANCHE, mm, sans fond perdu), sous les aplats du gabarit. */
export function fondsPlanche(e: EtatEditeur, plancheId?: string): PieceFond[] {
  const id = courante(e, plancheId);
  const i = indexPlanche(e.magazine, id);
  const p = e.magazine.planches[i];
  return p ? piecesDuFond(p.fond, coteSeul(e.magazine, i), { perdu: false }) : [];
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
    .filter((x) => dansFamille(x.template, e.familleGabarits) || x.template.id === d.templateId)
    .map(({ template, note }) => ({ template, id: template.id, nom: template.nom, note, courant: template.id === d.templateId }));
}

/** T-208 : un type du tiroir (`rangerParTypes`), et le gabarit POSÉ quand il en fait partie (la vignette montre alors celui-là). */
export type TypePour = TypeDeGabarits<GabaritPour> & { pose: GabaritPour | null };

/** T-208 (R176) : les gabarits du tiroir rangés par TYPES, dans l'ordre du classement ; une liste déjà calculée peut être passée. */
export function typesPour(e: EtatEditeur, plancheId: string, cible: Cible, liste?: readonly GabaritPour[]): TypePour[] {
  return rangerParTypes(liste ?? gabaritsPour(e, plancheId, cible)).map((t) => ({ ...t, pose: t.membres.find((g) => g.courant) ?? null }));
}

export type ActionsPlanche = {
  /** Lot E : `premiere` (page droite seule) et `derniere` (page gauche seule) ; `seule` = le côté de la page seule, `null` pour une planche courante. */
  premiere: boolean; derniere: boolean; seule: CoteSeul | null; vider: boolean; supprimer: boolean; fusionner: boolean; separer: boolean; zoneDouble: boolean; deplacable: boolean; pleine: boolean;
  /** Lot 4 : le miroir a-t-il un sens (planche 2 et plus, pas vide) ; les cibles retouchées à la main. */
  miroir: boolean; retouchees: Cible[];
};

export function actionsPlanche(e: EtatEditeur, plancheId: string): ActionsPlanche | null {
  const i = indexPlanche(e.magazine, plancheId);
  if (i < 0) return null;
  const p = e.magazine.planches[i];
  const seule = coteSeul(e.magazine, i);
  const courante = i > 0 && !seule;
  return {
    premiere: i === 0, derniere: estDerniere(e.magazine, i), seule, vider: !!(p.double || p.gauche || p.droite), supprimer: courante,
    fusionner: courante && p.mode === "pages", separer: courante && p.mode === "double",
    zoneDouble: courante && p.mode === "pages", deplacable: courante, pleine: estPleine(p, seule),
    miroir: courante && !!(p.double || p.gauche || p.droite),
    retouchees: (["double", "gauche", "droite"] as const).filter((c) => !!dispositionDe(p, c)?.cadres),
  };
}

/**
 * Lot R (D6, 12/11) : la zone du clavier après un dépôt. Poser une photo sur la planche (page, double, cadre, bande, vignette du chemin
 * de fer, miroir, pose en libre) rend la main à la PLANCHE : sans cela, la zone restait « photos » et R voulait dire « Réserve » au lieu
 * d'« Autre disposition ». Un dépôt dans le tri ou la bibliothèque ne change rien.
 */
export function zoneApresDepot(cible: CibleDepot | null | undefined): "planche" | null {
  if (!cible) return null;
  return cible.type === "tri" || cible.type === "bibliotheque" ? null : "planche";
}

/** T4 et T9 : une cible s'allume-t-elle pendant le glisser ? */
export function cibleAllumee(e: EtatEditeur, source: SourceGlisser | null | undefined, cible: CibleDepot | null | undefined): boolean {
  if (!source || !cible) return false;
  const couv = cibleCouvertureAllumee(source, cible);
  if (couv !== null) return couv;
  const m = e.magazine;
  if (cible.type === "bibliotheque") return source.type === "cadre" || source.type === "cadres";
  if (cible.type === "tri") {
    const t = e.filtres.marque;
    return source.type === "bibliotheque" && estTour(t) && (cible.zone === "jeu" || cible.zone === "cote")
      && marquePourZone(m, (source.ids || []).filter((id) => e.catalogue.has(id)), t, cible.zone).ids.length > 0;
  }
  if (cible.type === "miroir") return source.type === "cadres" && pageEntiere(m, source.refs)?.plancheId === cible.plancheId;
  if (cible.type === "libre") return (source.type === "bibliotheque" || source.type === "cadre") && indexPlanche(m, cible.plancheId) >= 0;
  if (cible.type === "entre") return (source.type === "planche" || source.type === "bibliotheque") && cible.index >= 1;
  if (source.type === "planche") return false;
  const pid = cible.type === "cadre" || cible.type === "hesiter" ? cible.ref?.plancheId : cible.plancheId;
  const i = pid === undefined ? -1 : indexPlanche(m, pid);
  if (i < 0) return false;
  const p = m.planches[i];
  const seul = coteSeul(m, i);
  if (cible.type === "page") return seul ? cible.cote === seul : p.mode === "pages";
  if (cible.type === "double") return i > 0 && !seul;
  if (cible.type === "cadre") return source.type !== "cadres" && aPhoto(m, cible.ref) && !(source.type === "bibliotheque" && (source.ids || []).length !== 1);
  if (cible.type === "hesiter") return aPhoto(m, cible.ref) && source.type === "bibliotheque" && (source.ids || []).length === 1;
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
  /** Lot 3 (F4) : une photo marquée floue posée, un visage dans le pli, une hésitation encore ouverte, une page vide. */
  flouesPosees: { photoId: string; plancheId: string; numero: number }[];
  visagesAuPli: { photoId: string; plancheId: string; numero: number }[];
  hesitationsOuvertes: number;
  pagesVides: number[];
  /** Lot C : un titre écrit que son cadre ne tient pas, même au corps minimal (REGLAGES_TITRE.CORPS_MIN) : il déborde à l'export. */
  titresTropLongs: { plancheId: string; numero: number; texte: string }[];
  /** Finitions du 16/11 : une légende ou un texte qui part à l'export (écrit, ou son fait, son lieu) et que son cadre ne tient pas à son corps :
   *  le PDF l'écrirait sous le cadre, Affinity le cacherait. Sous un style seulement (les chasses de sa police), comme les titres. */
  textesTropLongs: { plancheId: string; numero: number; texte: string; role: "texte" | "legende" }[];
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
  /* lot B : une photo trop faible sur la couverture se dit aussi (planche 0 = la couverture) */
  for (const x of photosCouverture(e)) {
    const ph = e.catalogue.get(x.photoId);
    const v = ph ? dpi(ph, x.cadre, x.recadrage) : Infinity;
    if (v < SEUIL_DPI) bassesDef.unshift({ photoId: x.photoId, plancheId: ID_COUVERTURE, numero: 0, dpi: Math.round(v) });
  }
  /* F4 : ce que la lecture sait des photos posées */
  const floues = new Set(e.lecture.floues);
  const flouesPosees: AvertissementsExport["flouesPosees"] = [];
  const visagesAuPli: AvertissementsExport["visagesAuPli"] = [];
  let hesitationsOuvertes = 0;
  const pagesVides: number[] = [];
  e.magazine.planches.forEach((p, index) => {
    const xs = photosDe(p);
    /* la première et la dernière page restent vides sans alerte : une page seule peut être voulue blanche */
    if (index > 0 && !estDerniere(e.magazine, index) && !xs.some((x) => x.photoId)) pagesVides.push(index + 1);
    for (const x of xs) {
      if (!x.photoId) continue;
      const d = dispositionDe(p, x.ref.cible);
      const aff = d?.photos[x.ref.index];
      if (aff?.hesitation && !aff.hesitation.tranchee) hesitationsOuvertes++;
      if (floues.has(x.photoId)) flouesPosees.push({ photoId: x.photoId, plancheId: p.id, numero: index + 1 });
      const ph = e.catalogue.get(x.photoId);
      const c = d && x.ref.cible === "double" ? cadresDe(d, "double").filter((k) => k.role === "photo")[x.ref.index] : null;
      if (ph?.zone && c && aff && partDansLePliPose(ph, c, aff.recadrage, ph.zone) > 0.3) visagesAuPli.push({ photoId: x.photoId, plancheId: p.id, numero: index + 1 });
    }
  });
  /* lot C : un titre écrit que le cadre ne tient pas, même au corps minimal ; seul un magazine sous style ajuste ses titres */
  const titresTropLongs: AvertissementsExport["titresTropLongs"] = [];
  if (e.magazine.style) {
    e.magazine.planches.forEach((p, index) => {
      for (const f of cadresPlanche(e, p.id)) if (f.role === "titre" && !f.vide && f.style?.trop) titresTropLongs.push({ plancheId: p.id, numero: index + 1, texte: f.contenu });
    });
  }
  /* finitions du 16/11 : une légende ou un texte trop long pour son cadre (R-T-18 : une légende garde son corps, elle ne rapetisse pas) */
  const textesTropLongs: AvertissementsExport["textesTropLongs"] = [];
  if (e.magazine.style) {
    e.magazine.planches.forEach((p, index) => {
      for (const f of cadresPlanche(e, p.id)) {
        if ((f.role === "legende" || f.role === "texte") && !f.tient) textesTropLongs.push({ plancheId: p.id, numero: index + 1, texte: f.vide || !f.contenu ? f.parDefaut ?? "" : f.contenu, role: f.role });
      }
    });
  }
  const pl = pagesLibelle(e);
  return { indisponibles, signaleesPosees, bassesDef, flouesPosees, visagesAuPli, hesitationsOuvertes, pagesVides, titresTropLongs, textesTropLongs, pagesAuDessus: pl.depasse && pl.cible !== null ? pl.pages - pl.cible : 0,
    planches: e.magazine.planches.length, photos: idsMagazine(e.magazine).length };
}
