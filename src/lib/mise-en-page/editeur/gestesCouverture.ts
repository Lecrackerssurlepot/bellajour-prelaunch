/**
 * Les gestes de la couverture (lot B, 12/11), REDITS pour elle : poser, remplacer, échanger, retirer, recadrer, écrire,
 * changer de gabarit, saisir les pages. Les gestes de l'intérieur ne la connaissent pas ; ceux qui la visent (référence
 * `plancheId: "couverture"`, `ID_COUVERTURE`) passent ICI, par `planDepotCouverture` et `planGesteCouverture`, appelés
 * en tête de plans.ts. Même contrat que l'intérieur : une `Issue` (le MÊME magazine s'il est refusé), une entrée
 * d'historique par geste (etat.ts), la séance de recadrage et la séance de texte sans changement.
 *
 * La couverture n'existe pas dans le magazine tant qu'on n'y a pas touché : le premier geste l'écrit au gabarit par
 * défaut (`couvertureDe`). Pures : ni React, ni horloge.
 */

import type { Affectation, Magazine, PhotoRef } from "../magazine";
import {
  GABARITS_COUVERTURE, ID_COUVERTURE, PAGES_MAX_SAISIE, dosSaisiValide, cadresPhotoCouverture, cadresTexteCouverture, gabaritCouverture, libelleCouverture,
  texteSaisi, textesInitiauxCouverture, type Couverture,
} from "../couverture";
import { ZOOM_MIN, cadrer, recadrageParContenu, type Recadrage } from "../recadrage";
import { couvertureDe, egal, estCouverture, estEntier } from "./outils";
import type { CibleDepot, EtatEditeur, GesteModifiant, Issue, Plan, Refus, SourceGlisser } from "./types";

type Cat = ReadonlyMap<string, PhotoRef>;

const neutre = (): Recadrage => ({ zoom: 1, dx: 0, dy: 0 });
const vide = (): Affectation => ({ photoId: null, recadrage: neutre() });
const issueC = (magazine: Magazine, refus: Refus | null, extra?: Partial<Issue>): Issue => ({
  magazine, restees: [], textesPerdus: 0, refus, dejaLa: 0, posees: [], ignorees: 0, ...(extra ?? {}),
});
const avec = (m: Magazine, c: Couverture): Magazine => ({ ...m, couverture: c });
const mesures = (cat: Cat, id: string | null): PhotoRef => (id ? cat.get(id) : undefined) ?? { id: id ?? "", nom: id ?? "", l: 1, h: 1, date: null };

/** La pose d'une photo dans un cadre de couverture : remplissage, glissé sur sa zone importante quand on la connaît (R83). */
function poseDans(cat: Cat, photoId: string, cadre: { l: number; h: number }): Recadrage {
  const p = mesures(cat, photoId);
  return recadrageParContenu(p, cadre, p.zone);
}

/* ─────────────────────────── Les opérations ─────────────────────────── */

/** Poser (ou remplacer) une photo dans le cadre photo n° `index`. Déjà sur la couverture : les deux cadres s'échangent. */
export function poserSurCouverture(m: Magazine, index: number, photoId: string, cat: Cat): Issue {
  const c = couvertureDe(m);
  const g = gabaritCouverture(c.templateId);
  const cadres = g ? cadresPhotoCouverture(g) : [];
  if (!estEntier(index) || !cadres[index] || typeof photoId !== "string" || !cat.has(photoId)) return issueC(m, "rien");
  const a = c.photos[index];
  if (a.photoId === photoId) return issueC(m, "deja_la", { dejaLa: 1 });
  const j = c.photos.findIndex((x) => x.photoId === photoId);
  if (j >= 0) return echangerSurCouverture(m, index, j, cat);
  const photos = c.photos.slice();
  photos[index] = { photoId, recadrage: poseDans(cat, photoId, cadres[index]) };
  return issueC(avec(m, { ...c, photos }), null, { posees: [photoId], ...(a.photoId ? { retiree: a.photoId } : {}) });
}

/** Retirer la photo du cadre n° `index` : le cadre reste, vide (le gabarit ne bouge pas). */
export function retirerDeCouverture(m: Magazine, index: number): Issue {
  const c = couvertureDe(m);
  const a = estEntier(index) ? c.photos[index] : undefined;
  if (!a || !a.photoId) return issueC(m, "rien");
  const photos = c.photos.slice();
  photos[index] = vide();
  return issueC(avec(m, { ...c, photos }), null, { retiree: a.photoId });
}

/** Échanger deux cadres de la couverture (un vide compris) ; chaque photo repart de sa pose dans son nouveau cadre. */
export function echangerSurCouverture(m: Magazine, i: number, j: number, cat: Cat): Issue {
  const c = couvertureDe(m);
  const g = gabaritCouverture(c.templateId);
  const cadres = g ? cadresPhotoCouverture(g) : [];
  if (!estEntier(i) || !estEntier(j) || i === j || !cadres[i] || !cadres[j]) return issueC(m, "rien");
  const a = c.photos[i], b = c.photos[j];
  if (!a.photoId && !b.photoId) return issueC(m, "rien");
  const photos = c.photos.slice();
  photos[i] = b.photoId ? { photoId: b.photoId, recadrage: poseDans(cat, b.photoId, cadres[i]) } : vide();
  photos[j] = a.photoId ? { photoId: a.photoId, recadrage: poseDans(cat, a.photoId, cadres[j]) } : vide();
  return issueC(avec(m, { ...c, photos }), null, { echange: true });
}

/** Recadrer (borné : jamais de blanc), sans effet si identique. */
export function recadrerCouverture(m: Magazine, index: number, r: Recadrage | null | undefined, cat: Cat): Magazine {
  const c = couvertureDe(m);
  const g = gabaritCouverture(c.templateId);
  const cadre = g && estEntier(index) ? cadresPhotoCouverture(g)[index] : undefined;
  const a = c.photos[index];
  if (!cadre || !a || !a.photoId || !r) return m;
  const k = cadrer(mesures(cat, a.photoId), cadre, { zoom: Number.isFinite(r.zoom) ? r.zoom : ZOOM_MIN, dx: Number.isFinite(r.dx) ? r.dx : 0, dy: Number.isFinite(r.dy) ? r.dy : 0 });
  const b = { zoom: k.zoom, dx: k.dx, dy: k.dy };
  if (egal(b, a.recadrage)) return m;
  const photos = c.photos.slice();
  photos[index] = { ...a, recadrage: b };
  return avec(m, { ...c, photos });
}

/** Écrire le texte n° `index` ; vide = le libellé revient (le lieu par défaut le remplace alors, à l'écran et à l'export). */
export function ecrireCouverture(m: Magazine, index: number, contenu: string): Magazine {
  const c = couvertureDe(m);
  const g = gabaritCouverture(c.templateId);
  const cadre = g && estEntier(index) ? cadresTexteCouverture(g)[index] : undefined;
  const t = c.textes[index];
  if (!cadre || !t || typeof contenu !== "string") return m;
  const v = contenu === "" ? libelleCouverture(cadre.role) : contenu;
  if (v === t.contenu) return m;
  const textes = c.textes.slice();
  textes[index] = { ...t, contenu: v };
  return avec(m, { ...c, textes });
}

const aire = (r: { l: number; h: number }): number => r.l * r.h;

/**
 * Changer de gabarit. Les photos restent sur LEUR face : la plus grande va au plus grand cadre de la face, et ainsi de
 * suite ; celles qui n'ont plus de place quittent la couverture (`restees`, rendues à la bibliothèque). Les textes écrits
 * suivent par rôle et par rang (1er titre → 1er titre) ; sans place, ils sont comptés perdus. Les pages saisies et le dos saisi restent.
 */
export function choisirGabaritCouverture(m: Magazine, templateId: string, cat: Cat): Issue {
  const c = couvertureDe(m);
  const gA = gabaritCouverture(c.templateId), gB = gabaritCouverture(templateId);
  if (!gB || (gA && gA.id === gB.id && m.couverture)) return issueC(m, "rien");
  const pA = gA ? cadresPhotoCouverture(gA) : [], pB = cadresPhotoCouverture(gB);
  const photos = pB.map(() => vide());
  const restees: string[] = [];
  for (const face of ["premiere", "quatrieme"] as const) {
    const parAire = <T extends { l: number; h: number }>(l: { c: T; i: number }[]) => l.sort((x, y) => aire(y.c) - aire(x.c) || x.i - y.i);
    const anciennes = parAire(pA.map((x, i) => ({ c: x, i })).filter((x) => x.c.face === face && c.photos[x.i]?.photoId));
    const neuves = parAire(pB.map((x, i) => ({ c: x, i })).filter((x) => x.c.face === face));
    anciennes.forEach((x, k) => {
      const id = c.photos[x.i].photoId as string;
      const n = neuves[k];
      if (n) photos[n.i] = { photoId: id, recadrage: poseDans(cat, id, n.c) };
      else restees.push(id);
    });
  }
  /* les textes écrits, par rôle et par rang */
  const tA = gA ? cadresTexteCouverture(gA) : [], tB = cadresTexteCouverture(gB);
  const textes = textesInitiauxCouverture(gB);
  const rang: Record<string, number> = {};
  let textesPerdus = 0;
  c.textes.forEach((t, j) => {
    const role = tA[j]?.role;
    if (!role) return;
    rang[role] = (rang[role] ?? -1) + 1;
    if (!texteSaisi(t)) return;
    let vu = -1;
    const k = tB.findIndex((x) => x.role === role && ++vu === rang[role]);
    if (k < 0) textesPerdus++;
    else textes[k] = { ...textes[k], contenu: t.contenu };
  });
  const neuve: Couverture = { templateId: gB.id, photos, textes, ...(c.pages !== undefined ? { pages: c.pages } : {}), ...(c.dosMm !== undefined ? { dosMm: c.dosMm } : {}) };
  return issueC(avec(m, neuve), null, { restees, textesPerdus });
}

/** R : le gabarit suivant (ou précédent) dans l'ordre du catalogue, en boucle. */
export function autreGabaritCouverture(m: Magazine, sens: 1 | -1, cat: Cat): Issue {
  const c = couvertureDe(m);
  const k = GABARITS_COUVERTURE.findIndex((g) => g.id === c.templateId);
  const n = GABARITS_COUVERTURE.length;
  const suivant = GABARITS_COUVERTURE[(((k < 0 ? 0 : k) + (sens === -1 ? -1 : 1)) % n + n) % n];
  return choisirGabaritCouverture(m, suivant.id, cat);
}

/** Les pages saisies à la main (édition, création libre) ; null les efface. Un nombre hors des bornes techniques est refusé. */
export function pagesCouverture(m: Magazine, pages: number | null): Magazine {
  const c = couvertureDe(m);
  if (pages === null) {
    if (c.pages === undefined) return m;
    const { pages: _, ...reste } = c;
    void _;
    return avec(m, reste);
  }
  if (!Number.isInteger(pages) || pages < 2 || pages > PAGES_MAX_SAISIE || pages === c.pages) return m;
  return avec(m, { ...c, pages });
}

/**
 * Lot E : la largeur du dos saisie à la main (mm, au centième, bornes `DOS_SAISI_MIN_MM` à `DOS_SAISI_MAX_MM`) ; `null` l'efface et le
 * calcul (pages et finition) reprend la main. Une valeur hors des bornes, non finie ou déjà posée ne change rien (même magazine).
 */
export function dosCouverture(m: Magazine, dosMm: number | null): Magazine {
  const c = couvertureDe(m);
  if (dosMm === null) {
    if (c.dosMm === undefined) return m;
    const { dosMm: _, ...reste } = c;
    void _;
    return avec(m, reste);
  }
  if (!dosSaisiValide(dosMm) || dosMm === c.dosMm) return m;
  return avec(m, { ...c, dosMm });
}

/* ─────────────────────────── Les plans (appelés en tête de plans.ts) ─────────────────────────── */

const planRien = (e: EtatEditeur, refus: Refus = "rien"): Plan =>
  ({ op: "rien", libelle: "", plancheId: e.plancheCourante, issue: issueC(e.magazine, refus), args: {} });

function planPoser(e: EtatEditeur, index: number, photoId: string): Plan {
  const is = poserSurCouverture(e.magazine, index, photoId, e.catalogue);
  return { op: "couvPoser", libelle: is.echange ? "Échanger sur la couverture" : "Poser sur la couverture", plancheId: ID_COUVERTURE, issue: is, args: { ref: { plancheId: ID_COUVERTURE, cible: "double", index }, photoId } };
}
function planRetirer(e: EtatEditeur, index: number): Plan {
  return { op: "couvRetirer", libelle: "Retirer de la couverture", plancheId: ID_COUVERTURE, issue: retirerDeCouverture(e.magazine, index), args: { ref: { plancheId: ID_COUVERTURE, cible: "double", index } } };
}
function planEchanger(e: EtatEditeur, i: number, j: number): Plan {
  return { op: "couvEchanger", libelle: "Échanger sur la couverture", plancheId: ID_COUVERTURE, issue: echangerSurCouverture(e.magazine, i, j, e.catalogue), args: {} };
}
function planGabarit(e: EtatEditeur, is: Issue): Plan {
  return { op: "couvGabarit", libelle: "Gabarit de couverture", plancheId: ID_COUVERTURE, issue: is, args: { plancheId: ID_COUVERTURE } };
}

/** Le lâcher qui touche la couverture (source ou cible) ; null s'il ne la touche pas. */
export function planDepotCouverture(e: EtatEditeur, source: SourceGlisser | null | undefined, cible: CibleDepot | null | undefined): Plan | null {
  if (!source || !cible) return null;
  const versC = (cible.type === "cadre" || cible.type === "hesiter") && estCouverture(cible.ref);
  const depuisC = (source.type === "cadre" && estCouverture(source.ref)) || (source.type === "cadres" && (source.refs ?? []).some(estCouverture));
  if (!versC && !depuisC) return null;
  if (source.type === "bibliotheque" && cible.type === "cadre") {
    const ids = Array.isArray(source.ids) ? source.ids : [];
    return ids.length === 1 ? planPoser(e, cible.ref.index, ids[0]) : planRien(e);
  }
  if (source.type === "cadre" && depuisC) {
    if (cible.type === "cadre" && versC) return planEchanger(e, source.ref.index, cible.ref.index);
    if (cible.type === "bibliotheque") return planRetirer(e, source.ref.index);
  }
  /* entre l'intérieur et la couverture, rien ne voyage en glissant : une photo de l'intérieur se REPOSE depuis la bibliothèque */
  return planRien(e);
}

/** Un geste modifiant qui vise la couverture ; `undefined` s'il ne la vise pas (plans.ts continue alors). */
export function planGesteCouverture(e: EtatEditeur, g: GesteModifiant): Plan | null | undefined {
  const m = e.magazine, cat = e.catalogue;
  switch (g.type) {
    case "dosCouverture": {
      const m2 = dosCouverture(m, g.dosMm);
      return { op: "couvDos", libelle: g.dosMm === null ? "Dos : calcul" : "Dos saisi", plancheId: ID_COUVERTURE, issue: issueC(m2, m2 === m ? "rien" : null), args: { plancheId: ID_COUVERTURE } };
    }
    case "pagesCouverture": {
      const m2 = pagesCouverture(m, g.pages);
      return { op: "couvPages", libelle: "Pages de la couverture", plancheId: ID_COUVERTURE, issue: issueC(m2, m2 === m ? "rien" : null), args: { plancheId: ID_COUVERTURE } };
    }
    case "retirer": return estCouverture(g.ref) ? planRetirer(e, g.ref.index) : undefined;
    case "remplacer": return estCouverture(g.ref) ? planPoser(e, g.ref.index, g.photoId) : undefined;
    case "echanger": {
      const a = estCouverture(g.a), b = estCouverture(g.b);
      if (!a && !b) return undefined;
      return a && b ? planEchanger(e, g.a.index, g.b.index) : planRien(e);
    }
    case "choisirGabarit": return g.plancheId === ID_COUVERTURE ? planGabarit(e, choisirGabaritCouverture(m, g.templateId, cat)) : undefined;
    case "autreGabarit": return g.plancheId === ID_COUVERTURE ? planGabarit(e, autreGabaritCouverture(m, g.sens, cat)) : undefined;
    case "hesiter": case "placerCadre": case "ajusterCadre": case "calque":
      return estCouverture(g.ref) ? planRien(e) : undefined;
    case "deplacerPhoto": return estCouverture(g.de) || g.vers?.plancheId === ID_COUVERTURE ? planRien(e) : undefined;
    case "retirerCadres": return (g.refs ?? []).some(estCouverture) ? planRien(e) : undefined;
    case "reordonner": case "vider": case "supprimerPlanche": case "deplacerPlanche": case "ajouterSurPlanche":
      return g.plancheId === ID_COUVERTURE ? planRien(e) : undefined;
    case "miroir": case "fusionner": case "separer": {
      const id = g.plancheId ?? e.plancheCourante;
      return id === ID_COUVERTURE ? planRien(e) : undefined;
    }
    default: return undefined;
  }
}
