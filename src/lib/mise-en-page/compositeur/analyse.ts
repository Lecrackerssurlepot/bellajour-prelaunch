/**
 * LA PAGE « ANALYSE » (18/11 soir, M-34, fiche C21) : ce que l'atelier voit et corrige AVANT la mise en page. Module pur ; l'écran est
 * `[id]/Analyse.tsx`. Mathias : « quand on est démarré vers une page analyse, on a toutes les informations, et quand on arrive sur la page
 * mise en page, on a déjà toute la présentation qui est faite. Moi, je pourrai faire les modifications assez aisément grâce aux tags. »
 *
 *  - la LIGNE DU PROJET (qui, où, type, durée, profil, ambiance), chaque mot corrigeable sauf la durée (un fait lu dans les dates) ;
 *  - les TAGS d'une photo, corrigeables d'un clic : la correction va dans `CorrectionsAtelier.tags` (elle prime, D12) et devient une
 *    leçon `tag_corrige` (M-27) ;
 *  - l'état AVANT composition (gardée, en réserve, écartée) et son renversement d'un clic (`CorrectionsAtelier.marques`) ;
 *  - les filtres par tag et par note, les relations d'une photo (série, paire, même scène).
 * Rien ici n'appelle l'IA ni le réseau ; rien n'est écrit dans la lecture (une nouvelle analyse n'efface jamais une correction).
 */

import { valeursReglages, versionReglages } from "../editeur/reglages";
import type { Lecon } from "../editeur/lecons";
import { MOT_AMBIANCE, MOT_THEME } from "./fiche";
import {
  AMBIANCES_FICHE, NOMS_NOTES, PROFILS, THEMES,
  type CorrectionsAtelier, type Cran, type Fiche, type IAPhoto, type PhotoChoisie, type Profil, type ResultatCompo,
} from "./types";

export const MOT_PROFIL: Readonly<Record<Profil, string>> = {
  long_voyage_famille: "Long voyage", vacances_festives_jeunes: "Vacances entre amis", couple: "En couple",
  evenement_un_jour: "Un jour", annee_de_vie: "Une année", sejour_court: "Séjour court",
};
export const MOT_NOTE: Readonly<Record<(typeof NOMS_NOTES)[number], string>> = { technique: "Technique", histoire: "Histoire", image: "Image", gens: "Gens", unicite: "Unicité" };
export const CRANS: readonly Cran[] = ["faible", "correcte", "bonne", "forte"];

/* ─────────────────────────── (a) la ligne du projet ─────────────────────────── */

export type CleProjet = "qui" | "ou" | "type" | "duree" | "profil" | "ambiance";
export type MotProjet = { cle: CleProjet; etiquette: string; mot: string; corrige: boolean; corrigeable: boolean };

/** Le nombre de jours photographiés de bout en bout (la première et la dernière date), 0 sans date. */
export function dureeJours(dates: readonly (string | null)[]): number {
  const j = dates.filter((d): d is string => !!d).map((d) => d.slice(0, 10)).sort();
  if (!j.length) return 0;
  return Math.round((Date.parse(`${j[j.length - 1]}T00:00:00Z`) - Date.parse(`${j[0]}T00:00:00Z`)) / 86400000) + 1;
}

/** La ligne du projet : ce que l'atelier a saisi (`saisie`) prime ; sinon ce que la machine a lu ou déduit. */
export function ligneDuProjet(r: Pick<ResultatCompo, "profil" | "sobre">, saisie: Fiche, devinee: Fiche, lu: { pays: string | null; qui: string | null }, dates: readonly (string | null)[]): MotProjet[] {
  const personnes = saisie.personnes ?? devinee.personnes;
  const theme = saisie.theme ?? devinee.theme;
  const ambiance = saisie.ambiance ?? devinee.ambiance ?? (r.sobre ? "sobre" : undefined);
  const jours = dureeJours(dates);
  return [
    { cle: "qui", etiquette: "Qui", mot: personnes ? `${personnes} personne${personnes > 1 ? "s" : ""}` : lu.qui ?? "À dire", corrige: saisie.personnes !== undefined, corrigeable: true },
    { cle: "ou", etiquette: "Où", mot: saisie.pays ?? lu.pays ?? "À dire", corrige: saisie.pays !== undefined, corrigeable: true },
    { cle: "type", etiquette: "Type", mot: theme ? MOT_THEME[theme] : "À dire", corrige: saisie.theme !== undefined, corrigeable: true },
    { cle: "duree", etiquette: "Durée", mot: jours ? `${jours} jour${jours > 1 ? "s" : ""}` : "Sans date", corrige: false, corrigeable: false },
    { cle: "profil", etiquette: "Profil", mot: MOT_PROFIL[saisie.profil ?? r.profil], corrige: saisie.profil !== undefined, corrigeable: true },
    { cle: "ambiance", etiquette: "Ambiance", mot: ambiance ? MOT_AMBIANCE[ambiance] : "À dire", corrige: saisie.ambiance !== undefined, corrigeable: true },
  ];
}

/** Les choix d'un mot de la ligne (les mots fermés) ; « qui » et « où » se saisissent. */
export const CHOIX_PROJET = {
  type: THEMES.map((t) => ({ v: t, mot: MOT_THEME[t] })),
  profil: PROFILS.map((p) => ({ v: p, mot: MOT_PROFIL[p] })),
  ambiance: AMBIANCES_FICHE.map((a) => ({ v: a, mot: MOT_AMBIANCE[a] })),
} as const;

/* ─────────────────────────── (d) les tags d'une photo ─────────────────────────── */

type ValeurTag = string | number | boolean | null;
export type DefTag = { cle: keyof IAPhoto; mot: string; valeurs: readonly { v: ValeurTag; mot: string }[] };

/** Les tags montrés et corrigeables d'un clic (le clic passe à la valeur suivante). « null » = lu, rien (jamais « absent »). */
export const TAGS_ANALYSE: readonly DefTag[] = [
  { cle: "personnesNombre", mot: "Personnes", valeurs: [0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({ v: n, mot: n === 7 ? "7 et +" : String(n) })) },
  { cle: "plan", mot: "Plan", valeurs: [{ v: "large", mot: "Large" }, { v: "moyen", mot: "Moyen" }, { v: "serre", mot: "Serré" }] },
  { cle: "momentJournee", mot: "Moment", valeurs: [{ v: "matin", mot: "Matin" }, { v: "jour", mot: "Jour" }, { v: "dore", mot: "Heure dorée" }, { v: "nuit", mot: "Nuit" }, { v: "interieur", mot: "Intérieur" }] },
  { cle: "ambiance", mot: "Ambiance", valeurs: [{ v: "calme", mot: "Calme" }, { v: "vivant", mot: "Vivant" }, { v: "festif", mot: "Festif" }, { v: "intime", mot: "Intime" }, { v: "grandiose", mot: "Grandiose" }] },
  { cle: "pose", mot: "Prise", valeurs: [{ v: "pose", mot: "Posée" }, { v: "spontane", mot: "Sur le vif" }] },
  { cle: "expression", mot: "Visage", valeurs: [{ v: "rire", mot: "Rire" }, { v: "sourire", mot: "Sourire" }, { v: "tendre", mot: "Tendre" }, { v: "neutre", mot: "Neutre" }, { v: "grimace_subie", mot: "Grimace" }, { v: null, mot: "Sans visage" }] },
  { cle: "yeuxFermes", mot: "Yeux", valeurs: [{ v: "non", mot: "Ouverts" }, { v: "oui", mot: "Fermés" }, { v: "incertain", mot: "Incertain" }, { v: null, mot: "Sans visage" }] },
  { cle: "regardVers", mot: "Regard", valeurs: [{ v: "gauche", mot: "À gauche" }, { v: "face", mot: "De face" }, { v: "droite", mot: "À droite" }, { v: null, mot: "Sans visage" }] },
  { cle: "pointAccroche", mot: "Accroche", valeurs: [{ v: true, mot: "Oui" }, { v: false, mot: "Non" }] },
  { cle: "geste", mot: "Geste", valeurs: [{ v: true, mot: "Oui" }, { v: false, mot: "Non" }] },
  { cle: "insolite", mot: "Insolite", valeurs: [{ v: true, mot: "Oui" }, { v: false, mot: "Non" }] },
  { cle: "sujetSpecial", mot: "Sujet", valeurs: [{ v: null, mot: "Ordinaire" }, { v: "animal", mot: "Animal" }, { v: "document", mot: "Document" }] },
];
export const tagParCle = (cle: keyof IAPhoto): DefTag | undefined => TAGS_ANALYSE.find((t) => t.cle === cle);

/** La valeur d'un tag : `undefined` = jamais lu (absence n'est pas zéro), sinon la valeur lue ou corrigée. */
export function valeurTag(ia: IAPhoto | null | undefined, cle: keyof IAPhoto): ValeurTag | undefined {
  if (!ia || !(cle in ia)) return undefined;
  const v = ia[cle];
  return v === undefined ? undefined : (v as ValeurTag);
}
export function motTag(def: DefTag, v: ValeurTag | undefined): string {
  if (v === undefined) return "Pas lu";
  return def.valeurs.find((x) => x.v === v)?.mot ?? String(v);
}
/** Le clic : la valeur suivante (un tag jamais lu prend la première). */
export function valeurSuivante(def: DefTag, v: ValeurTag | undefined): ValeurTag {
  const i = def.valeurs.findIndex((x) => x.v === v);
  return def.valeurs[(i + 1) % def.valeurs.length].v;
}

/** La correction d'un tag : gardée À PART (D12), elle prime sur la lecture ; revenir à la valeur lue la retire. */
export function corrigerTagAnalyse(c: CorrectionsAtelier, id: string, cle: keyof IAPhoto, v: ValeurTag, lu: ValeurTag | undefined): CorrectionsAtelier {
  const tags = { ...(c.tags ?? {}) };
  const t: Partial<IAPhoto> = { ...(tags[id] ?? {}) };
  if (v === lu) delete (t as Record<string, unknown>)[cle];
  else (t as Record<string, unknown>)[cle] = v;
  if (Object.keys(t).length) tags[id] = t; else delete tags[id];
  return { ...c, tags };
}

/** M-27 : un tag corrigé dans l'Analyse devient une leçon `tag_corrige` (règle M-27 ; la proposition, et ce que l'atelier a mis). */
export function leconTagAnalyse(id: string, def: DefTag, avant: ValeurTag | undefined, apres: ValeurTag): Lecon {
  return {
    type: "tag_corrige", regle: "M-27", photos: [id],
    proposition: `${def.mot.toLowerCase()} : ${motTag(def, avant)}`, geste: `${def.mot.toLowerCase()} : ${motTag(def, apres)}`,
    reglages: valeursReglages(), version: versionReglages(),
  };
}

/* ─────────────────────────── (f) gardée, en réserve, écartée ─────────────────────────── */

export type EtatAvant = "gardee" | "reserve" | "ecartee";
export const MOT_ETAT_AVANT: Readonly<Record<EtatAvant, string>> = { gardee: "Gardée", reserve: "En réserve", ecartee: "Écartée" };
export const etatAvant = (p: Pick<PhotoChoisie, "etat">): EtatAvant => (p.etat === "posee" || p.etat === "couverture" ? "gardee" : p.etat);

const sans = (l: readonly string[] | undefined, id: string): string[] => (l ?? []).filter((x) => x !== id);
const avec = (l: readonly string[] | undefined, id: string): string[] => [...new Set([...(l ?? []), id])].sort();

/** Le renversement d'un clic : gardée → en réserve (« sortie » par l'atelier) ; en réserve ou écartée → gardée. La marque prime (D12). */
export function renverser(c: CorrectionsAtelier, id: string, etat: EtatAvant): CorrectionsAtelier {
  const m = c.marques ?? {};
  if (etat === "gardee") return { ...c, marques: { ...m, gardees: sans(m.gardees, id), coeurs: sans(m.coeurs, id), ecartees: sans(m.ecartees, id), sorties: avec(m.sorties, id) } };
  return { ...c, marques: { ...m, sorties: sans(m.sorties, id), ecartees: sans(m.ecartees, id), gardees: avec(m.gardees, id) } };
}

/* ─────────────────────────── (e) les filtres ─────────────────────────── */

export type FiltreAnalyse = { tag?: { cle: keyof IAPhoto; v: ValeurTag | undefined } | null; note?: { nom: (typeof NOMS_NOTES)[number]; cran: Cran } | null; etat?: EtatAvant | null };

export function filtrerPhotos(photos: readonly PhotoChoisie[], ia: ReadonlyMap<string, IAPhoto | null>, f: FiltreAnalyse): PhotoChoisie[] {
  return photos.filter((p) => {
    if (f.etat && etatAvant(p) !== f.etat) return false;
    if (f.note && p.notes?.[f.note.nom]?.cran !== f.note.cran) return false;
    if (f.tag && valeurTag(ia.get(p.id), f.tag.cle) !== f.tag.v) return false;
    return true;
  });
}

/* ─────────────────────────── (d) les relations d'une photo ─────────────────────────── */

export type Relations = { serie: string | null; paires: string[]; scene: string[] };

/** Série (la sélection v2), paires (la trame, N-50), même scène (même moment : les photos d'un même temps fort). */
export function relationsDe(r: Pick<ResultatCompo, "selection" | "paires">, id: string, moments: ReadonlyMap<string, string | null>): Relations {
  const p = r.selection.photos.find((x) => x.id === id);
  const paires = (r.paires ?? []).flatMap((k) => { const [a, b] = k.split("|"); return a === id ? [b] : b === id ? [a] : []; });
  const m = moments.get(id) ?? null;
  const scene = m ? [...moments].filter(([x, mm]) => x !== id && mm === m).map(([x]) => x).sort() : [];
  return { serie: p?.serie ?? null, paires: [...new Set(paires)].sort(), scene };
}

/* ─────────────────────────── (c) les chapitres et leurs photos ─────────────────────────── */

export function chapitresDeLAnalyse(r: Pick<ResultatCompo, "chapitres" | "selection">, renommes: Readonly<Record<string, string>> | undefined): { numero: number; titre: string; renomme: boolean; photos: string[] }[] {
  return r.chapitres.map((c) => ({
    numero: c.numero, titre: renommes?.[String(c.numero)] ?? c.titre, renomme: !!renommes?.[String(c.numero)],
    photos: r.selection.photos.filter((p) => p.chapitre === c.numero).map((p) => p.id),
  }));
}
