/**
 * Le rattrapage des photos arrivées au coffre et jamais confirmées (T-194),
 * et des vignettes qui manquent (T-171). Module PUR : aucun accès base, aucun
 * réseau, aucune variable d'environnement. Le harnais le joue entier.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LE TROU QU'IL BOUCHE
 *
 * La confirmation part du NAVIGATEUR, groupée (`moteur.ts` : toutes les 15 s
 * ou par lot). Une page fermée, un iPhone qui se verrouille entre le PUT et
 * la confirmation : l'objet est au coffre, la ligne reste « déclarée », la
 * photo n'apparaît nulle part et ne compte plus dans les plafonds après 2 h
 * (`DELAI_DECLARATION_MORTE_MS`). Décision de Mathias (20/10, Audencia) : le
 * participant doit la retrouver SANS rien faire.
 *
 * Le serveur repasse donc, sans cron neuf (Vercel Hobby) : à l'ouverture de
 * la fiche de l'atelier, de la page Photos du responsable, et une fois par
 * jour depuis la relève existante. Pour chaque ligne déclarée depuis plus de
 * `DELAI_AVANT_RATTRAPAGE_MS` : le coffre a-t-il l'objet, et respecte-t-il la
 * taille maximale ? Oui : on la confirme EXACTEMENT comme `depot/complete`
 * (`patchConfirmation`, la même fonction des deux côtés). Non : on ne fait
 * rien (une photo trop lourde n'est PAS effacée ici, à l'inverse de
 * `complete` : on ne retire pas d'office ce qu'on n'a pas vu arriver).
 *
 * Les champs d'accord (`accord_version`, `accord_le`) et de participant
 * (`deposant`, `appareil_id`, `provenance_*`) ont été écrits À LA
 * DÉCLARATION, dans la même insertion que la ligne : la confirmation n'y
 * touche pas, d'un côté comme de l'autre.
 *
 * ⚠️ Le plafond n'est pas rejoué : la photo a été acceptée DANS le plafond à
 * sa déclaration. Une ligne morte depuis plus de 2 h a rendu sa place ; si le
 * participant l'a reprise entre-temps, la photo retrouvée peut le faire
 * passer au-dessus de quelques photos. Assumé : le plafond est un frein
 * (plafonds.ts), la photo perdue serait une vraie perte.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ══════════════════════════════════════════════════════════════════════════
 * UN SEUL PASSAGE À LA FOIS, PAR LE JOURNAL (patron `souvenir_demarre`)
 *
 * `rattrapage_demarre` avant de toucher au coffre (`payload.passage`, un
 * identifiant tiré par le serveur), puis `photos_rattrapees` (au moins une
 * retrouvée) ou `rattrapage_fini` (aucune), qui nomment le passage qu'ils
 * ferment (`payload.demarre`). Un démarrage sans sa fin
 * depuis moins de `FENETRE_VERROU_RATTRAPAGE_MS` = un passage tourne. La
 * fenêtre vaut la `maxDuration` des trois appelants (60 s) : un verrou ne
 * survit pas à la fonction qui l'a posé. Deux démarrages qui se croisent : le
 * plus ancien gagne, l'autre CÈDE (`doitCeder`). Le verrou reste une
 * ceinture : la confirmation est idempotente PAR LA BASE
 * (`.is("confirmee_le", null)`), deux passages ne datent jamais deux fois.
 *
 * Un passage qui n'a RIEN à faire n'écrit rien : la fiche se rouvre cent fois
 * par jour, son journal ne doit pas le raconter.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { formatDepuisOctets } from "@/lib/atelier/metadonnees";
import { MAX_FILE_BYTES } from "@/lib/atelier/formats";
import { lireInstant } from "./etats";

/* ─────────────────────────── les réglages ─────────────────────────── */

/** Une ligne déclarée depuis moins longtemps est laissée au navigateur (il confirme toutes les 15 s). */
export const DELAI_AVANT_RATTRAPAGE_MS = 10 * 60 * 1000;
/** = `maxDuration` de la fiche, de la page Photos et de la relève. Le harnais tient l'égalité. */
export const FENETRE_VERROU_RATTRAPAGE_MS = 60 * 1000;
/** Deux passages sur la même édition sont espacés d'au moins ce délai (la fiche se rouvre souvent). */
export const REPOS_RATTRAPAGE_MS = 15 * 60 * 1000;
/** Aucun travail nouveau ne commence passé ce délai : bien sous la fenêtre du verrou. */
export const BUDGET_RATTRAPAGE_MS = 40 * 1000;
/** Au plus tant de photos confirmées par passage : le reste au suivant (rien n'est perdu, tout est idempotent). */
export const CONFIRMATIONS_PAR_PASSAGE = 500;
/** Jusqu'à tant de lignes à examiner, une tête (HEAD) chacune ; au-delà, on liste le dossier du coffre. */
export const TETES_DIRECTES_MAX = 50;
/** La liste du coffre : 1 000 objets par page, deux objets par photo (original, vignette). */
export const PAGES_LISTE_MAX = 50;
/** Les vignettes fabriquées par passage : sharp (JPEG, PNG, WebP). */
export const VIGNETTES_PAR_PASSAGE = 24;
/** … et libheif (HEIC), plus lourd : ~1 s de décodage et ~100 Mo par photo (T-150). */
export const HEIC_PAR_PASSAGE = 6;
/** Les fins de passage relues pour savoir quelles vignettes ont échoué pour de bon. */
export const PASSAGES_MEMOIRE = 10;
/** Les photos sans vignette possible gardées par fin de passage (des ids, jamais un token). */
export const IMPOSSIBLES_MAX = 25;
/**
 * Le passage quotidien regarde aussi les éditions closes depuis moins de deux
 * jours : un PUT signé avant la clôture peut arriver jusqu'à une heure après,
 * et la relève ne passe qu'une fois par jour « dans l'heure ». Garde technique.
 */
export const DELAI_APRES_CLOTURE_MS = 2 * 24 * 60 * 60 * 1000;
/**
 * Le passage quotidien tourne APRÈS la réponse de la relève des particuliers,
 * dans la même fonction (`maxDuration` 60 s, comptée depuis son début) : rien
 * de nouveau ne commence passé 50 s. Le harnais tient l'écart avec la relève.
 */
export const ECHEANCE_RELEVE_MS = 50 * 1000;

/** Jumeaux de `reduire.worker.js` et de `collectif-heic-rattrapage.ts` : la même vignette partout. */
export const COTE_VIGNETTE = 320;
export const QUALITE_VIGNETTE = 72;

/* ─────────────────────────── le journal ─────────────────────────── */

export const EVT_RATTRAPAGE_DEMARRE = "rattrapage_demarre";
/** La fin d'un passage qui a retrouvé au moins une photo : se lit dans le journal de la fiche. */
export const EVT_PHOTOS_RATTRAPEES = "photos_rattrapees";
/** La fin d'un passage qui n'en a retrouvé aucune : machinerie, cachée du journal de la fiche. */
export const EVT_RATTRAPAGE_FINI = "rattrapage_fini";
export const EVTS_RATTRAPAGE: readonly string[] = [EVT_RATTRAPAGE_DEMARRE, EVT_PHOTOS_RATTRAPEES, EVT_RATTRAPAGE_FINI];

export type EvenementRattrapage = { id: string; type: string; payload: Record<string, unknown> | null; created_at: string };

/** Qui a déclenché le passage : il est écrit au journal. */
export type Declencheur = "fiche" | "photos" | "releve";

/* `lireInstant` (etats.ts) : l'ISO 8601 AVEC fuseau seulement. `Date.parse` seul lit « le 4 octobre »
   comme 2001 (prouvé le 13/10), et une telle ligne passerait pour vieille de vingt-cinq ans. */
function instant(v: string): number {
  return lireInstant(v) ?? NaN;
}

/**
 * Un passage porte un identifiant tiré par le serveur (`payload.passage` du
 * démarrage) ; sa fin le nomme (`payload.demarre`). `journaliser` n'a donc pas
 * à rendre l'id de la ligne écrite.
 */
function passageDe(e: EvenementRattrapage): string | null {
  if (e.type !== EVT_RATTRAPAGE_DEMARRE) return null;
  const p = e.payload?.passage;
  return typeof p === "string" && p ? p : null;
}

function finDe(e: EvenementRattrapage): string | null {
  if (e.type !== EVT_PHOTOS_RATTRAPEES && e.type !== EVT_RATTRAPAGE_FINI) return null;
  const d = e.payload?.demarre;
  return typeof d === "string" && d ? d : null;
}

/** Les démarrages récents dont aucune fin ne nomme le passage. */
function ouverts(evenements: readonly EvenementRattrapage[], maintenantMs: number, fenetreMs: number): { passage: string; t: number; created_at: string }[] {
  const fermes = new Set(evenements.map(finDe).filter((x): x is string => x !== null));
  const sortie: { passage: string; t: number; created_at: string }[] = [];
  for (const e of evenements) {
    const passage = passageDe(e);
    if (!passage || fermes.has(passage)) continue;
    const t = instant(e.created_at);
    if (Number.isNaN(t) || maintenantMs - t >= fenetreMs) continue;
    sortie.push({ passage, t, created_at: e.created_at });
  }
  return sortie;
}

export type EtatVerrou =
  | { libre: true }
  | { libre: false; raison: "en_cours"; depuis: string }
  | { libre: false; raison: "repos"; depuis: string };

/**
 * Un passage peut-il partir ? Reçoit les dernières lignes du rattrapage dans
 * N'IMPORTE QUEL ordre. En cours : un démarrage récent dont aucune fin ne
 * nomme le passage. Au repos : la dernière fin VRAIE (pas une cession) est
 * plus récente que `REPOS_RATTRAPAGE_MS`. Un âge négatif (horloge de la base
 * en avance) reste « en cours » : c'est la seconde où deux appels se croisent.
 */
export function etatVerrou(
  evenements: readonly EvenementRattrapage[],
  maintenantMs: number,
  options: { reposMs?: number; fenetreMs?: number } = {}
): EtatVerrou {
  const fenetre = options.fenetreMs ?? FENETRE_VERROU_RATTRAPAGE_MS;
  const repos = options.reposMs ?? REPOS_RATTRAPAGE_MS;
  const enCours = ouverts(evenements, maintenantMs, fenetre);
  if (enCours.length) return { libre: false, raison: "en_cours", depuis: enCours[0].created_at };
  let derniere: { t: number; created_at: string } | null = null;
  for (const e of evenements) {
    if (finDe(e) === null || e.payload?.cede === true) continue;
    const t = instant(e.created_at);
    if (!Number.isNaN(t) && (!derniere || t > derniere.t)) derniere = { t, created_at: e.created_at };
  }
  if (derniere && maintenantMs - derniere.t < repos) return { libre: false, raison: "repos", depuis: derniere.created_at };
  return { libre: true };
}

/**
 * Deux démarrages se sont croisés (chacun a lu le journal avant l'écriture de
 * l'autre) : le plus ANCIEN gagne (l'instant, puis l'identifiant du passage),
 * l'autre cède. Relu APRÈS l'écriture de son propre démarrage. Son propre
 * démarrage introuvable dans la relecture : on ne cède pas (on ne sait pas).
 */
export function doitCeder(
  evenements: readonly EvenementRattrapage[],
  monPassage: string,
  maintenantMs: number,
  fenetreMs: number = FENETRE_VERROU_RATTRAPAGE_MS
): boolean {
  const tous = ouverts(evenements, maintenantMs, fenetreMs);
  const moi = tous.find((o) => o.passage === monPassage);
  if (!moi) return false;
  return tous.some((o) => o.passage !== monPassage && (o.t < moi.t || (o.t === moi.t && o.passage < monPassage)));
}

/** Les photos dont la vignette a échoué POUR DE BON lors des derniers passages : on ne les retente pas tout de suite. */
export function impossiblesRecentes(evenements: readonly EvenementRattrapage[]): Set<string> {
  const ids = new Set<string>();
  for (const e of evenements) {
    if (finDe(e) === null) continue;
    const liste = e.payload?.impossibles;
    if (Array.isArray(liste)) for (const id of liste) if (typeof id === "string") ids.add(id);
  }
  return ids;
}

/* ─────────────────────────── qui examiner ─────────────────────────── */

export type LigneDeclaree = { id: string; r2_key: string; created_at: string; confirmee_le: string | null };

/** Une ligne à examiner : jamais confirmée, et déclarée depuis plus de dix minutes. */
export function estCandidate(l: { confirmee_le: string | null; created_at: string }, maintenant: Date): boolean {
  if (l.confirmee_le) return false;
  const t = instant(l.created_at);
  return Number.isFinite(t) && maintenant.getTime() - t >= DELAI_AVANT_RATTRAPAGE_MS;
}

/** L'instant avant lequel une ligne est assez vieille (le filtre de la base, `lte created_at`). */
export function seuilCandidates(maintenant: Date): string {
  return new Date(maintenant.getTime() - DELAI_AVANT_RATTRAPAGE_MS).toISOString();
}

/** Peu de lignes : une tête chacune. Beaucoup (un wifi filtré, des centaines d'envois morts) : une liste du dossier. */
export function strategie(nbCandidates: number): "rien" | "tetes" | "liste" {
  if (nbCandidates <= 0) return "rien";
  return nbCandidates <= TETES_DIRECTES_MAX ? "tetes" : "liste";
}

/**
 * Ce qu'on examine vraiment : par la liste, seules les lignes dont l'objet
 * est au coffre ; par les têtes, toutes. Les plus récentes d'abord (ce sont
 * celles qu'un iPhone verrouillé vient d'abandonner), `max` au plus.
 */
export function aExaminer<T extends { r2_key: string; created_at: string; id: string }>(
  candidates: readonly T[],
  presentes: ReadonlySet<string> | null,
  max: number = CONFIRMATIONS_PAR_PASSAGE
): { examiner: T[]; absentes: number; reportees: number } {
  const tri = [...candidates].sort((a, b) => (a.created_at === b.created_at ? (a.id < b.id ? 1 : -1) : a.created_at < b.created_at ? 1 : -1));
  const la = presentes ? tri.filter((l) => presentes.has(l.r2_key)) : tri;
  const absentes = tri.length - la.length;
  return { examiner: la.slice(0, Math.max(0, max)), absentes, reportees: Math.max(0, la.length - Math.max(0, max)) };
}

/* ─────────────────────────── la tête d'un objet, la confirmation ─────────────────────────── */

/** Ce que dit un HEAD : l'objet et sa taille, son absence (404), ou une panne (tout le reste). */
export type Tete = { statut: "presente"; taille: number } | { statut: "absente" } | { statut: "panne" };

/**
 * Le verdict, LE MÊME que `depot/complete` : absente (pas encore arrivée),
 * trop lourde (au-delà de `MAX_FILE_BYTES`), arrivée. Une panne n'est pas une
 * absence : la route répond pareil (le navigateur réessaie), mais elle compte
 * comme un échec (T-160).
 */
export function issueTete(t: Tete, max: number = MAX_FILE_BYTES): "absente" | "panne" | "trop_lourde" | "arrivee" {
  if (t.statut !== "presente") return t.statut;
  return t.taille > max ? "trop_lourde" : "arrivee";
}

/**
 * Le patch d'une confirmation : trois champs, et seulement eux, des deux côtés
 * (`complete` et le rattrapage). La vignette n'est notée que si l'objet est
 * au coffre et sous `maxVignette` (la règle d'avant, mot pour mot).
 */
export function patchConfirmation(
  taille: number,
  maintenantIso: string,
  cleVignette: string,
  tailleVignette: number | null,
  maxVignette: number
): { taille: number; confirmee_le: string; vignette_key: string | null } {
  return {
    taille,
    confirmee_le: maintenantIso,
    vignette_key: tailleVignette !== null && tailleVignette <= maxVignette ? cleVignette : null,
  };
}

/* ─────────────────────────── les vignettes (T-171) ─────────────────────────── */

export type FabriqueVignette = "sharp" | "heic";

/** Qui sait faire la vignette : les OCTETS décident (jamais l'extension), le type déclaré en dernier recours. */
export function fabriquePour(octets: Uint8Array, mime: string | null): FabriqueVignette | null {
  const f = formatDepuisOctets(octets);
  if (f === "jpeg" || f === "png" || f === "webp") return "sharp";
  if (f === "heic") return "heic";
  const m = (mime ?? "").toLowerCase();
  if (m === "image/heic" || m === "image/heif") return "heic";
  return null;
}

/** Un HEIC à l'annonce : il passe par la file la plus courte (libheif). */
export function annonceHeic(mime: string | null): boolean {
  const m = (mime ?? "").toLowerCase();
  return m === "image/heic" || m === "image/heif";
}

/**
 * Les photos dont on fabrique la vignette dans ce passage : les retrouvées
 * d'abord (elles viennent d'arriver), puis les autres confirmées sans
 * vignette, hors celles qui ont échoué pour de bon aux derniers passages.
 * Deux files bornées : `maxSharp`, `maxHeic`. Un id n'y paraît qu'une fois.
 */
export function planVignettes<T extends { id: string; mime: string | null }>(
  prioritaires: readonly T[],
  autres: readonly T[],
  exclues: ReadonlySet<string>,
  bornes: { maxSharp: number; maxHeic: number } = { maxSharp: VIGNETTES_PAR_PASSAGE, maxHeic: HEIC_PAR_PASSAGE }
): { sharp: T[]; heic: T[]; reportees: number } {
  const vus = new Set<string>();
  const sharp: T[] = [];
  const heic: T[] = [];
  let reportees = 0;
  for (const l of [...prioritaires, ...autres]) {
    if (vus.has(l.id) || exclues.has(l.id)) continue;
    vus.add(l.id);
    const file = annonceHeic(l.mime) ? heic : sharp;
    const max = annonceHeic(l.mime) ? bornes.maxHeic : bornes.maxSharp;
    if (file.length < max) file.push(l);
    else reportees++;
  }
  return { sharp, heic, reportees };
}

/* ─────────────────────────── le passage quotidien ─────────────────────────── */

/**
 * Les éditions que la relève repasse chaque jour : non archivées, photos non
 * supprimées, et en collecte (aucune clôture, ou une clôture future) ou
 * closes depuis moins de `DELAI_APRES_CLOTURE_MS`. La clôture est
 * `cloture_le` quand elle est posée (« Clore maintenant » la pose aussi) ;
 * sans elle, une édition passée au-delà de la préparation compte comme close
 * depuis `etat_maj_le`. Une date illisible n'entre pas (on ne devine pas).
 */
export function editionsDuPassageQuotidien<
  E extends { id: string; etat: string; cloture_le: string | null; archive_le: string | null; photos_supprimees_le: string | null; etat_maj_le: string | null }
>(editions: readonly E[], maintenant: Date): E[] {
  const t = maintenant.getTime();
  return editions.filter((e) => {
    if (e.archive_le || e.photos_supprimees_le) return false;
    const fin = e.cloture_le ? instant(e.cloture_le) : e.etat === "preparation" ? Infinity : e.etat_maj_le ? instant(e.etat_maj_le) : NaN;
    if (Number.isNaN(fin)) return false;
    return fin === Infinity || t - fin < DELAI_APRES_CLOTURE_MS;
  });
}

/* ─────────────────────────── la fin d'un passage ─────────────────────────── */

export type BilanRattrapage = {
  /** Les lignes déclarées depuis plus de dix minutes et jamais confirmées. */
  candidates: number;
  /** Confirmées par CE passage (celles qu'un autre a confirmées entre-temps ne comptent pas). */
  retrouvees: number;
  /** Pas au coffre : l'envoi n'a jamais abouti (ou pas encore). */
  absentes: number;
  /** Au coffre, mais au-delà de la taille maximale : laissées telles quelles. */
  tropLourdes: number;
  /** Laissées au passage suivant (budget ou borne atteints). */
  reportees: number;
  vignettes: { faites: number; ratees: number; impossibles: string[]; reportees: number };
  /** Ce qui a échoué côté serveur (T-160), par étape. */
  pannes: { lecture: number; coffre: number; ecriture: number };
};

export function bilanVide(): BilanRattrapage {
  return {
    candidates: 0,
    retrouvees: 0,
    absentes: 0,
    tropLourdes: 0,
    reportees: 0,
    vignettes: { faites: 0, ratees: 0, impossibles: [], reportees: 0 },
    pannes: { lecture: 0, coffre: 0, ecriture: 0 },
  };
}

/** La ligne de démarrage : le passage, qui l'a déclenché, combien de lignes il va regarder. */
export function demarrageDe(passage: string, declencheur: Declencheur, candidates: number): { type: string; payload: Record<string, unknown> } {
  return { type: EVT_RATTRAPAGE_DEMARRE, payload: { passage, par: declencheur, candidates } };
}

/** La fin d'un passage qui a cédé la place à un autre, plus ancien : il n'a rien fait. */
export function cessionDe(passage: string, declencheur: Declencheur): { type: string; payload: Record<string, unknown> } {
  return { type: EVT_RATTRAPAGE_FINI, payload: { demarre: passage, par: declencheur, cede: true, n: 0 } };
}

/** La ligne de fin, courte : des nombres et des ids de photos, jamais un token ni une clé du coffre. */
export function finDePassage(
  passage: string,
  declencheur: Declencheur,
  b: BilanRattrapage
): { type: string; payload: Record<string, unknown> } {
  return {
    type: b.retrouvees > 0 ? EVT_PHOTOS_RATTRAPEES : EVT_RATTRAPAGE_FINI,
    payload: {
      demarre: passage,
      par: declencheur,
      n: b.retrouvees,
      examinees: b.candidates,
      absentes: b.absentes,
      trop_lourdes: b.tropLourdes,
      reportees: b.reportees,
      vignettes: b.vignettes.faites,
      vignettes_ratees: b.vignettes.ratees,
      impossibles: b.vignettes.impossibles.slice(0, IMPOSSIBLES_MAX),
    },
  };
}
