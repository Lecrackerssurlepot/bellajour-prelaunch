/**
 * L'état d'écran et LE réducteur : `appliquer(etat, geste) -> etat`, immuable.
 *
 * Un geste inconnu ou invalide rend l'état reçu (même référence). Les gestes qui changent le magazine passent
 * tous par `executer` puis `adopter` : une entrée d'historique, le futur vidé, la sauvegarde « en attente ».
 * Ajouter un geste d'écran = une entrée dans la table `GESTES` ; un geste qui change le magazine = un `case`
 * dans `planifier` (plans.ts) et son nom dans `MODIFIANTS`.
 */

import { deplacer as deplacerRecadrage, zoomer as zoomerRecadrage } from "../recadrage";
import { contenuValide } from "../sauvegarde";
import type { Magazine } from "../magazine";
import { planDepot, planifier } from "./plans";
import { recadrerCadre, ecrireTexteCadre, refPour } from "./operations";
import { clesCriteres, criteres, selectionOrdonnee, visibles, visible } from "./bibliotheque";
import {
  FILTRES_DEFAUT, HISTORIQUE_MAX, affectation, aPhoto, borner, dimsCadre, dispositionOuNull, egal, indexPlanche, neutre, pluriel, texteDe,
} from "./outils";
import type {
  CibleDepot, EtatEditeur, EtatSauvegarde, Filtres, Geste, GesteCompose, GesteEcran, GesteModifiant, GestePrimitif, OptionsEtat,
  PhotoMaq, RefCadre, Issue,
} from "./types";

/* ─────────────────────────── Création ─────────────────────────── */

export const numeroDe = (id: string): number => { const k = /^pl-(\d+)$/.exec(id); return k ? Number(k[1]) : 0; };
const numeroMax = (m: Magazine): number => m.planches.reduce((a, p) => Math.max(a, numeroDe(p.id)), 0);

export function creerEtat(o: OptionsEtat): EtatEditeur {
  const magazine = o.magazine;
  const cat: ReadonlyMap<string, PhotoMaq> = o.catalogue instanceof Map ? o.catalogue : new Map((o.catalogue as readonly PhotoMaq[] ?? []).map((p) => [p.id, p]));
  const courante = o.plancheCourante && indexPlanche(magazine, o.plancheCourante) >= 0 ? o.plancheCourante : magazine.planches[0].id;
  return {
    magazine,
    catalogue: cat,
    plancheCourante: courante,
    selection: { ids: [], ancre: null },
    cadreActif: null,
    echangeArme: null,
    recadrage: null,
    texte: null,
    filtres: { ...FILTRES_DEFAUT, ...(o.filtres ?? {}) },
    panneau: { ouvert: true, largeur: 320 },
    glisser: null,
    confirmation: null,
    message: null,
    historique: { passe: [], futur: [] },
    sauvegarde: { etat: "enregistre", version: o.version || 1, le: magazine.modifieLe },
    projet: o.projet ?? null,
    premiereId: magazine.planches[0].id,
    prochainNumero: numeroMax(magazine) + 1,
    halo: null,
    eclair: null,
    derniere: null,
    copieLocale: null,
  };
}

export const lectureSeule = (e: EtatEditeur): boolean => e.sauvegarde.etat === "conflit" || e.sauvegarde.etat === "lecture_seule";

const enAttente = (s: EtatSauvegarde): EtatSauvegarde => ({ etat: "en_attente", version: s.version });

/* ─────────────────────────── Historique et séances ─────────────────────────── */

/** L'unique porte d'entrée du magazine : une entrée d'historique, futur vidé, sauvegarde en attente. */
function adopter(e: EtatEditeur, libelle: string, plancheId: string, magazine: Magazine): EtatEditeur {
  if (magazine === e.magazine) return e;
  const passe = [...e.historique.passe, { libelle, avant: e.magazine, apres: magazine, plancheId }].slice(-HISTORIQUE_MAX);
  return { ...e, magazine, historique: { passe, futur: [] }, sauvegarde: enAttente(e.sauvegarde), eclair: plancheId };
}

/** Une séance (recadrage, texte) touche le magazine sans historique ; la fermeture pousse une entrée. */
function enSeance(e: EtatEditeur, magazine: Magazine): EtatEditeur {
  if (magazine === e.magazine) return e;
  return { ...e, magazine, sauvegarde: enAttente(e.sauvegarde) };
}

function pousserSeance(e: EtatEditeur, libelle: string, plancheId: string, avant: Magazine): EtatEditeur {
  if (e.magazine === avant || egal(e.magazine, avant)) return e.magazine === avant ? e : { ...e, magazine: avant };
  const passe = [...e.historique.passe, { libelle, avant, apres: e.magazine, plancheId }].slice(-HISTORIQUE_MAX);
  return { ...e, historique: { passe, futur: [] } };
}

function fermerSeances(e: EtatEditeur): EtatEditeur {
  let x = e;
  if (x.recadrage) { const { ref, avant } = x.recadrage; x = pousserSeance({ ...x, recadrage: null }, "Recadrer", ref.plancheId, avant); }
  if (x.texte) { const { ref, avant } = x.texte; x = pousserSeance({ ...x, texte: null }, "Modifier un texte", ref.plancheId, avant); }
  return x;
}

/** La planche à montrer : `id` si elle existe, sinon la plus proche de sa place dans `autre`. */
function plancheProche(m: Magazine, id: string, autre: Magazine | null): string {
  if (indexPlanche(m, id) >= 0) return id;
  const k = autre ? indexPlanche(autre, id) : -1;
  return m.planches[k < 0 ? 0 : Math.min(k, m.planches.length - 1)].id;
}

/** Après tout geste : planche courante existante, cadres valides, sélection ⊆ catalogue sans doublon (I31).
 *  Un filtre ne vide plus la sélection : les photos masquées restent sélectionnées. */
function synchroniser(e: EtatEditeur): EtatEditeur {
  let x = e;
  if (indexPlanche(x.magazine, x.plancheCourante) < 0) x = { ...x, plancheCourante: x.magazine.planches[0].id };
  if (x.cadreActif && !aPhoto(x.magazine, x.cadreActif)) x = { ...x, cadreActif: null };
  if (x.echangeArme && !aPhoto(x.magazine, x.echangeArme)) x = { ...x, echangeArme: null };
  if (x.recadrage && !aPhoto(x.magazine, x.recadrage.ref)) x = fermerSeances(x);
  if (x.texte && !texteDe(x.magazine, x.texte.ref)) x = fermerSeances(x);
  if (x.selection.ids.length) {
    const cat = x.catalogue;
    const ids = [...new Set(x.selection.ids)].filter((id) => cat.has(id));
    if (ids.length !== x.selection.ids.length) x = { ...x, selection: { ids, ancre: x.selection.ancre && ids.includes(x.selection.ancre) ? x.selection.ancre : null } };
  }
  return x;
}

/* ─────────────────────────── Traduction des gestes composés ─────────────────────────── */

const RIEN: GesteEcran = { type: "rien" };

type Touche = Extract<GesteCompose, { type: "touche" }>;

/** Pour R : la séance de recadrage, puis la page survolée (g.survol), puis le cadre actif,
 *  sinon la planche courante (double, gauche, droite). Un survol périmé (autre planche,
 *  côté qui n'existe plus dans ce mode) est ignoré. */
function cibleR(e: EtatEditeur, g: Touche): { plancheId: string; cible: RefCadre["cible"] } | null {
  if (e.recadrage && e.recadrage.ref) return { plancheId: e.recadrage.ref.plancheId, cible: e.recadrage.ref.cible };
  const i = indexPlanche(e.magazine, e.plancheCourante);
  const p = e.magazine.planches[i];
  const s = g.survol;
  if (p && s && s.plancheId === p.id) {
    const okDouble = p.mode === "double" && s.cible === "double";
    const okPage = p.mode !== "double" && (s.cible === "droite" || (s.cible === "gauche" && i > 0));
    if (okDouble || okPage) return { plancheId: p.id, cible: s.cible };
  }
  if (e.cadreActif) return { plancheId: e.cadreActif.plancheId, cible: e.cadreActif.cible };
  if (!p) return null;
  if (p.mode === "double") return { plancheId: p.id, cible: "double" };
  if (i > 0 && p.gauche) return { plancheId: p.id, cible: "gauche" };
  if (p.droite) return { plancheId: p.id, cible: "droite" };
  return null;
}

function primitifTouche(e: EtatEditeur, g: Touche): GestePrimitif {
  if (e.texte) return RIEN;
  const k = typeof g.cle === "string" ? g.cle : "";
  const bas = k.toLowerCase();
  if ((g.meta || g.ctrl) && bas === "z") return { type: g.shift ? "retablir" : "annuler" };
  if (g.meta || g.ctrl) return RIEN;
  if (e.confirmation && k === "Escape") return { type: "annulerConfirmation" };
  if (e.recadrage && (k === "Escape" || k === "Enter")) return { type: "fermerRecadrage" };
  switch (bas) {
    case "escape":
      if (e.glisser) return { type: "abandonnerGlisser" };
      if (e.echangeArme) return { type: "desarmerEchange" };
      if (e.selection.ids.length) return { type: "viderSelection" };
      return { type: "activerCadre", ref: null };
    case "arrowleft": case "arrowright": {
      const s = bas === "arrowleft" ? -1 : 1;
      if (g.alt && e.cadreActif) {
        const r = e.cadreActif;
        return { type: "reordonner", plancheId: r.plancheId, cible: r.cible, de: r.index, vers: r.index + s };
      }
      return { type: "naviguer", sens: s };
    }
    case "backspace": case "delete":
      return e.cadreActif ? { type: "retirer", ref: e.cadreActif } : RIEN;
    case "r": { const c = cibleR(e, g); return c ? { type: "autreGabarit", ...c, sens: g.shift ? -1 : 1 } : RIEN; }
    case "x": return e.cadreActif ? { type: "armerEchange", ref: e.cadreActif } : RIEN;
    case "enter": return e.cadreActif ? { type: "ouvrirRecadrage", ref: e.cadreActif } : RIEN;
    case "p": return { type: "panneau", basculer: true };
    default: return RIEN;
  }
}

/** Un geste composé (poser, clic, lâcher, touche) devient un geste primitif. */
export function primitif(e: EtatEditeur, g: Geste): GestePrimitif {
  switch (g.type) {
    case "poser": case "ajouter":
      return { type: "deposer", source: { type: "bibliotheque", ids: Array.isArray(g.ids) ? g.ids : selectionOrdonnee(e) }, cible: g.cible, confirme: g.confirme };
    case "cliquerCible": {
      const c = g.cible;
      if (!c) return RIEN;
      if (e.selection.ids.length) return { type: "deposer", source: { type: "bibliotheque", ids: selectionOrdonnee(e) }, cible: c };
      if (c.type === "cadre" && e.echangeArme) return { type: "echanger", a: e.echangeArme, b: c.ref, desarmer: true };
      if (c.type === "cadre") return { type: "activerCadre", ref: c.ref };
      return { type: "activerCadre", ref: null };
    }
    case "lacher":
      return e.glisser && e.glisser.survol ? { type: "deposer", source: e.glisser.source, cible: e.glisser.survol, depuisGlisser: true } : { type: "abandonnerGlisser" };
    case "touche": return primitifTouche(e, g);
    default: return g;
  }
}

const SEANCE: ReadonlySet<string> = new Set(["deplacerImage", "zoomerImage", "recadrer", "recentrer", "fermerRecadrage", "taper", "fermerTexte"]);
export const SANS_FERMETURE: ReadonlySet<string> = new Set(["rien", "survoler", "annuler", "retablir", "fermerMessage",
  "sauvegardeEnvoi", "sauvegardeOk", "sauvegardeHorsLigne", "sauvegardeErreur", "sauvegardeMigrationAbsente", "sauvegardeConflit", "ajouterAuCatalogue"]);
export const MODIFIANTS: ReadonlySet<string> = new Set(["deposer", "retirer", "remplacer", "echanger", "deplacerPhoto", "reordonner", "choisirGabarit",
  "autreGabarit", "fusionner", "separer", "insererDouble", "deplacerPlanche", "supprimerPlanche", "vider", "ajouterSurPlanche"]);

export const estModifiant = (g: GestePrimitif): g is GesteModifiant => MODIFIANTS.has(g.type);

/** Le geste primitif, après fermeture des séances : ce que le réducteur exécute réellement. */
export function preparer(etat: EtatEditeur, geste: Geste): { e: EtatEditeur; g: GestePrimitif } {
  const g = primitif(etat, geste);
  const e = SEANCE.has(g.type) || SANS_FERMETURE.has(g.type) || (geste.type === "touche" && etat.texte) ? etat : fermerSeances(etat);
  return { e, g };
}

/* ─────────────────────────── L'exécution d'un plan ─────────────────────────── */

function executer(e: EtatEditeur, g: GesteModifiant): EtatEditeur {
  if (lectureSeule(e)) return e;
  const plan = planifier(e, g);
  if (!plan) return e;
  const is = plan.issue;
  let x: EtatEditeur = { ...e, glisser: null, confirmation: null, derniere: { refus: is.refus, restees: is.restees, dejaLa: is.dejaLa, textesPerdus: is.textesPerdus, libelle: plan.libelle } };
  if (is.refus) return x;
  const signalees = is.posees.filter((id) => { const ph = e.catalogue.get(id); return ph && ph.signalee; });
  if (signalees.length && !g.confirme) {
    const total = plan.op === "remplacer" ? 1 : (plan.args.ids ?? []).length || is.posees.length;
    return { ...x, magazine: e.magazine, confirmation: { type: "signalee", nb: signalees.length, total, geste: { ...g, confirme: true } } };
  }
  const avant = x.magazine;
  x = adopter(x, plan.libelle, plan.plancheId, is.magazine);
  if (plan.op === "insererDouble" && is.nouvellePlanche) {
    x = { ...x, plancheCourante: is.nouvellePlanche, prochainNumero: Math.max(x.prochainNumero, numeroDe(is.nouvellePlanche) + 1) };
  } else {
    x = { ...x, plancheCourante: plancheProche(x.magazine, x.plancheCourante, avant) };
  }
  const depuisBiblio = (g.type === "deposer" && g.source && g.source.type === "bibliotheque") || g.type === "ajouterSurPlanche" || g.type === "remplacer";
  if (depuisBiblio) {
    /* les posées sortent de la sélection ; les restées à côté y sont (ou y entrent) */
    const posees = new Set(is.posees);
    const ids = [...new Set([...e.selection.ids.filter((id) => !posees.has(id)), ...is.restees])];
    x = { ...x, selection: { ids, ancre: e.selection.ancre && ids.includes(e.selection.ancre) ? e.selection.ancre : ids[0] ?? null } };
  }
  if (g.type === "echanger" && g.desarmer) x = { ...x, echangeArme: null };
  x = { ...x, message: null, halo: null };
  if (is.textesPerdus > 0) {
    x = { ...x, message: { texte: `${pluriel(is.textesPerdus, "texte retiré", "textes retirés")}`, action: { libelle: "Annuler" } } };
  } else if (is.restees.length > 0) {
    x = { ...x, message: { texte: `${pluriel(is.restees.length, "photo restée", "photos restées")} à côté` } };
  } else if (plan.op === "retirer" && is.retiree) {
    if (visible(x, is.retiree)) x = { ...x, halo: is.retiree };
    else if (x.catalogue.has(is.retiree)) x = { ...x, message: { texte: "Retirée · masquée par les filtres", action: { libelle: "Voir", id: is.retiree } } };
  }
  return x;
}

/* ─────────────────────────── Les gestes, un par un ─────────────────────────── */

function annulerEtat(e: EtatEditeur): EtatEditeur {
  if (e.texte || lectureSeule(e)) return e;
  const x = fermerSeances(e);
  const passe = x.historique.passe;
  if (!passe.length) return x;
  const en = passe[passe.length - 1];
  return {
    ...x, magazine: en.avant, historique: { passe: passe.slice(0, -1), futur: [...x.historique.futur, en] },
    plancheCourante: plancheProche(en.avant, en.plancheId, en.apres), sauvegarde: enAttente(x.sauvegarde),
    glisser: null, confirmation: null, message: null, eclair: en.plancheId,
  };
}
function retablirEtat(e: EtatEditeur): EtatEditeur {
  if (e.texte || lectureSeule(e)) return e;
  const x = fermerSeances(e);
  const futur = x.historique.futur;
  if (!futur.length) return x;
  const en = futur[futur.length - 1];
  return {
    ...x, magazine: en.apres, historique: { passe: [...x.historique.passe, en], futur: futur.slice(0, -1) },
    plancheCourante: plancheProche(en.apres, en.plancheId, en.avant), sauvegarde: enAttente(x.sauvegarde),
    glisser: null, confirmation: null, message: null, eclair: en.plancheId,
  };
}

const UNITE = { l: 1, h: 1 };
const cadreDeRef = (e: EtatEditeur, ref: RefCadre): { l: number; h: number } => dimsCadre(dispositionOuNull(e.magazine, ref), ref.index) ?? UNITE;

/** Remet un critère à sa valeur d'origine (tableau vide pour les listes). */
function defautDe<K extends keyof Filtres>(k: K): Filtres[K] {
  const d = FILTRES_DEFAUT[k];
  return (Array.isArray(d) ? [] : d) as Filtres[K];
}
function avecCle<K extends keyof Filtres>(f: Filtres, k: K, v: Filtres[K]): Filtres {
  return { ...f, [k]: v };
}
const choisir = <T extends string>(liste: readonly T[], x: unknown): T | null => liste.find((y) => y === x) ?? null;
const chaines = (x: unknown): string[] | null => (Array.isArray(x) ? x.filter((y): y is string => typeof y === "string") : null);

type Geste_<K extends GesteEcran["type"]> = Extract<GesteEcran, { type: K }>;
type Gestes = { [K in GesteEcran["type"]]: (e: EtatEditeur, g: Geste_<K>) => EtatEditeur };

const GESTES: Gestes = {
  rien: (e) => e,
  annuler: annulerEtat,
  retablir: retablirEtat,

  naviguer(e, g) {
    const pl = e.magazine.planches;
    let id: string | null = null;
    if (typeof g.plancheId === "string" && indexPlanche(e.magazine, g.plancheId) >= 0) id = g.plancheId;
    else if (g.sens === 1 || g.sens === -1) id = pl[borner(indexPlanche(e.magazine, e.plancheCourante) + g.sens, 0, pl.length - 1)].id;
    if (!id || id === e.plancheCourante) return e;
    return { ...e, plancheCourante: id, cadreActif: null, echangeArme: null };
  },

  filtrer(e, g) {
    const f: Filtres = { ...e.filtres };
    const v: Record<string, unknown> = g.filtres ?? {};
    if (typeof v.recherche === "string") f.recherche = v.recherche;
    const personnes = chaines(v.personnes); if (personnes) f.personnes = personnes;
    const types = chaines(v.types); if (types) f.types = types as Filtres["types"];
    const orientations = chaines(v.orientations); if (orientations) f.orientations = orientations as Filtres["orientations"];
    if (typeof v.coeur === "boolean") f.coeur = v.coeur;
    if (typeof v.montrerSignalees === "boolean") f.montrerSignalees = v.montrerSignalees;
    if (typeof v.masquerUtilisees === "boolean") f.masquerUtilisees = v.masquerUtilisees;
    const statut = choisir(["toutes", "libres", "utilisees", "planche"] as const, v.statut); if (statut) f.statut = statut;
    const tri = choisir(["date", "nom", "personne"] as const, v.tri); if (tri) f.tri = tri;
    const groupe = choisir(["jour", "personne", "type", "aucun"] as const, v.groupe); if (groupe) f.groupe = groupe;
    const taille = choisir(["S", "M", "L"] as const, v.taille); if (taille) f.taille = taille;
    return egal(f, e.filtres) ? e : { ...e, filtres: f };
  },
  retirerFiltre(e, g) {
    if (!(g.cle in FILTRES_DEFAUT)) return e;
    return { ...e, filtres: avecCle(e.filtres, g.cle, defautDe(g.cle)) };
  },
  effacerFiltres(e) {
    const { tri, groupe, taille, masquerUtilisees } = e.filtres;
    return { ...e, filtres: { ...FILTRES_DEFAUT, personnes: [], types: [], orientations: [], tri, groupe, taille, masquerUtilisees } };
  },

  cliquerPhoto(e, g) {
    const vis = visibles(e);
    const s = e.selection;
    /* une photo masquée ne se retire de la sélection que par « ajout » (Cmd+clic, cercle, × de la bande) */
    if (!vis.includes(g.id)) return g.mode === "ajout" && s.ids.includes(g.id) ? { ...e, selection: { ids: s.ids.filter((x) => x !== g.id), ancre: s.ancre === g.id ? null : s.ancre } } : e;
    if (g.mode === "ajout") {
      const ids = s.ids.includes(g.id) ? s.ids.filter((x) => x !== g.id) : [...s.ids, g.id];
      return { ...e, selection: { ids, ancre: g.id } };
    }
    if (g.mode === "plage" && s.ancre && vis.includes(s.ancre)) {
      const a = vis.indexOf(s.ancre), b = vis.indexOf(g.id);
      return { ...e, selection: { ids: vis.slice(Math.min(a, b), Math.max(a, b) + 1), ancre: s.ancre } };
    }
    return { ...e, selection: { ids: [g.id], ancre: g.id } };
  },
  selectionner(e, g) {
    const vis = new Set(visibles(e));
    const ids = [...new Set((g.ids ?? []).filter((id) => vis.has(id)))];
    return { ...e, selection: { ids, ancre: ids[0] ?? null } };
  },
  viderSelection: (e) => (e.selection.ids.length ? { ...e, selection: { ids: [], ancre: null } } : e),

  activerCadre(e, g) {
    const ref = g.ref && aPhoto(e.magazine, g.ref) ? { plancheId: g.ref.plancheId, cible: g.ref.cible, index: g.ref.index } : null;
    return { ...e, cadreActif: ref };
  },
  armerEchange(e, g) {
    const ref = g.ref ?? e.cadreActif;
    return ref && aPhoto(e.magazine, ref) ? { ...e, echangeArme: ref, cadreActif: ref } : e;
  },
  desarmerEchange: (e) => (e.echangeArme ? { ...e, echangeArme: null } : e),

  panneau(e, g) {
    const ouvert = g.basculer ? !e.panneau.ouvert : typeof g.ouvert === "boolean" ? g.ouvert : e.panneau.ouvert;
    const largeur = g.largeur !== undefined && Number.isFinite(g.largeur) ? borner(g.largeur, 220, 640) : e.panneau.largeur;
    return { ...e, panneau: { ouvert, largeur } };
  },

  commencerGlisser(e, g) {
    if (lectureSeule(e) || !g.source) return e;
    return { ...e, glisser: { source: g.source, survol: null, depuis: null, apercu: null }, cadreActif: null };
  },
  survoler(e, g) {
    if (!e.glisser) return e;
    const cible: CibleDepot | null = g.cible || null;
    const apercu = cible ? planDepot(e, e.glisser.source, cible).issue : null;
    return { ...e, glisser: { ...e.glisser, survol: cible, depuis: g.depuis !== undefined && Number.isFinite(g.depuis) ? g.depuis : null, apercu } };
  },
  abandonnerGlisser: (e) => (e.glisser ? { ...e, glisser: null } : e),

  ouvrirRecadrage(e, g) {
    if (lectureSeule(e) || !aPhoto(e.magazine, g.ref)) return e;
    return { ...e, recadrage: { ref: { plancheId: g.ref.plancheId, cible: g.ref.cible, index: g.ref.index }, avant: e.magazine }, cadreActif: g.ref };
  },
  recadrer(e, g) {
    if (!e.recadrage) return e;
    return enSeance(e, recadrerCadre(e.magazine, e.recadrage.ref, g.recadrage, e.catalogue));
  },
  deplacerImage(e, g) {
    if (!e.recadrage) return e;
    const ref = e.recadrage.ref;
    const a = affectation(e.magazine, ref);
    if (!a) return e;
    const r = deplacerRecadrage(a.recadrage, g.ddx, g.ddy, refPour(e.catalogue, a.photoId), cadreDeRef(e, ref));
    return enSeance(e, recadrerCadre(e.magazine, ref, r, e.catalogue));
  },
  zoomerImage(e, g) {
    if (!e.recadrage) return e;
    const ref = e.recadrage.ref;
    const a = affectation(e.magazine, ref);
    if (!a) return e;
    const r = zoomerRecadrage(a.recadrage, g.zoom, refPour(e.catalogue, a.photoId), cadreDeRef(e, ref));
    return enSeance(e, recadrerCadre(e.magazine, ref, r, e.catalogue));
  },
  recentrer(e) {
    if (!e.recadrage) return e;
    return enSeance(e, recadrerCadre(e.magazine, e.recadrage.ref, neutre(), e.catalogue));
  },
  fermerRecadrage: (e) => (e.recadrage ? fermerSeances(e) : e),

  ouvrirTexte(e, g) {
    if (lectureSeule(e) || !texteDe(e.magazine, g.ref)) return e;
    return { ...e, texte: { ref: { plancheId: g.ref.plancheId, cible: g.ref.cible, index: g.ref.index }, avant: e.magazine } };
  },
  taper(e, g) {
    if (!e.texte) return e;
    return enSeance(e, ecrireTexteCadre(e.magazine, e.texte.ref, g.contenu));
  },
  fermerTexte: (e) => (e.texte ? fermerSeances(e) : e),

  confirmer(e) {
    if (!e.confirmation) return e;
    const g = e.confirmation.geste;
    return executer({ ...e, confirmation: null }, g);
  },
  annulerConfirmation: (e) => (e.confirmation ? { ...e, confirmation: null } : e),

  fermerMessage: (e) => (e.message ? { ...e, message: null } : e),
  voirRetiree(e, g) {
    const ph = e.catalogue.get(g.id);
    if (!ph) return e;
    const c = criteres(e);
    let f: Filtres = { ...e.filtres };
    for (const k of clesCriteres()) {
      if (c[k](ph)) continue;
      f = k === "montrerSignalees" ? { ...f, montrerSignalees: true } : avecCle(f, k, defautDe(k));
    }
    return { ...e, filtres: f, halo: g.id, message: null };
  },

  sauvegardeEnvoi(e) {
    const s = e.sauvegarde;
    if (s.etat !== "en_attente" && s.etat !== "hors_ligne" && s.etat !== "erreur") return e;
    return { ...e, sauvegarde: { etat: "envoi", version: s.version } };
  },
  sauvegardeOk(e, g) {
    if (e.sauvegarde.etat !== "envoi") return e;
    const v = e.sauvegarde.version + 1;
    if (g.magazine && g.magazine !== e.magazine) return { ...e, sauvegarde: { etat: "en_attente", version: v } };
    return { ...e, sauvegarde: { etat: "enregistre", version: v, le: typeof g.le === "string" ? g.le : "" } };
  },
  sauvegardeHorsLigne: (e) => (e.sauvegarde.etat === "envoi" || e.sauvegarde.etat === "en_attente" ? { ...e, sauvegarde: { etat: "hors_ligne", version: e.sauvegarde.version } } : e),
  sauvegardeErreur: (e) => (e.sauvegarde.etat === "envoi" ? { ...e, sauvegarde: { etat: "erreur", version: e.sauvegarde.version } } : e),
  sauvegardeMigrationAbsente: (e) => ({ ...e, sauvegarde: { etat: "migration_absente", version: e.sauvegarde.version } }),
  sauvegardeConflit(e, g) {
    if (!g.enBase) return e;
    return { ...e, sauvegarde: { etat: "conflit", version: e.sauvegarde.version, enBase: g.enBase }, glisser: null, recadrage: null, texte: null };
  },
  prendreSaVersion(e, g) {
    if (!g.magazine || !contenuValide(g.magazine)) return e;
    const m = g.magazine;
    return {
      ...e, magazine: m, copieLocale: e.magazine, historique: { passe: [], futur: [] },
      sauvegarde: { etat: "enregistre", version: Number.isInteger(g.version) ? (g.version as number) : e.sauvegarde.version, le: g.le || m.modifieLe },
      plancheCourante: plancheProche(m, e.plancheCourante, e.magazine), prochainNumero: Math.max(e.prochainNumero, numeroMax(m) + 1),
      premiereId: m.planches[0].id, cadreActif: null, echangeArme: null, selection: e.selection,
    };
  },
  garderLaMienne(e) {
    if (e.sauvegarde.etat !== "conflit") return e;
    return { ...e, sauvegarde: { etat: "envoi", version: e.sauvegarde.enBase.version } };
  },
  recupererCopieLocale(e) {
    if (!e.copieLocale || lectureSeule(e)) return e;
    const x = adopter({ ...e, copieLocale: null }, "Récupérer ma version", e.plancheCourante, e.copieLocale);
    return { ...x, prochainNumero: Math.max(x.prochainNumero, numeroMax(x.magazine) + 1) };
  },
  ajouterAuCatalogue(e, g) {
    const neuves = (Array.isArray(g.photos) ? g.photos : []).filter((p) => p && typeof p.id === "string" && !e.catalogue.has(p.id));
    if (!neuves.length) return e;
    const catalogue = new Map(e.catalogue);
    for (const p of neuves) catalogue.set(p.id, p);
    return { ...e, catalogue };
  },
  ouvrirLectureSeule(e, g) {
    const raison = choisir(["conflit", "photos_supprimees", "archive"] as const, g.raison) ?? "archive";
    return { ...e, sauvegarde: { etat: "lecture_seule", raison, version: e.sauvegarde.version } };
  },
};

/** Le réducteur, vu par son nom de geste : les gestes d'écran de la table, les modifiants par `executer`. */
function executerGeste(e: EtatEditeur, g: GestePrimitif): EtatEditeur | null {
  if (estModifiant(g)) return executer(e, g);
  if (!Object.prototype.hasOwnProperty.call(GESTES, g.type)) return null;
  const h = GESTES[g.type] as (e: EtatEditeur, g: GesteEcran) => EtatEditeur;
  return h(e, g);
}

/** LE réducteur : immuable ; un geste inconnu ou invalide rend l'état reçu. */
export function appliquer(etat: EtatEditeur, geste: Geste): EtatEditeur {
  if (!geste || typeof geste.type !== "string") return etat;
  const { e: e0, g } = preparer(etat, geste);
  if (!estModifiant(g) && !Object.prototype.hasOwnProperty.call(GESTES, g.type)) return etat;
  let e = e0;
  if ((e.halo || e.eclair) && !SANS_FERMETURE.has(g.type)) e = { ...e, halo: null, eclair: null };
  if (e.confirmation && !["confirmer", "annulerConfirmation", "survoler", "rien"].includes(g.type) && !MODIFIANTS.has(g.type) && !SANS_FERMETURE.has(g.type)) {
    e = { ...e, confirmation: null };
  }
  const x = executerGeste(e, g);
  if (!x) return etat;
  return x === etat ? etat : synchroniser(x);
}

export const apercu = (etat: EtatEditeur, geste: Geste): EtatEditeur => appliquer(etat, geste);
export function apercuDepot(etat: EtatEditeur, cible: CibleDepot, source?: Parameters<typeof planDepot>[1]): Issue {
  const s = source ?? (etat.glisser && etat.glisser.source);
  return planDepot(etat, s, cible).issue;
}
export const annuler = (etat: EtatEditeur): EtatEditeur => appliquer(etat, { type: "annuler" });
export const retablir = (etat: EtatEditeur): EtatEditeur => appliquer(etat, { type: "retablir" });
