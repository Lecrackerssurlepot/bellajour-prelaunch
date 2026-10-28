/**
 * Les photos d'une édition COMPTÉES EN BASE (T-168, 20/10/2026). Module PUR :
 * aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QUI COÛTAIT
 *
 * La grille (`/api/collectif/photos`) et le tableau de bord relisaient
 * TOUTES les photos de l'édition à chaque affichage, pour l'arbre des
 * dossiers, les personnes, les comptes et une page de 120 vignettes : 5 000
 * lignes (cinq tranches de 1 000, l'une après l'autre) pour une édition de
 * 5 000 photos, à chaque clic.
 *
 * CE QUI LE REMPLACE
 *
 * La vue `collectif_photos_resume` (migration 20261022) rend UNE ligne par
 * façon d'avoir déposé : qui (rôle), par quel lien, sous quel type, sous quel
 * nom, et pour un participant depuis quel téléphone ; avec le nombre de
 * photos (`n`), celles de « Ma sélection » (`n_selection`), celles qu'on peut
 * encore choisir (`n_choisissables`), la première et la dernière arrivée, la
 * dernière vignette. Ces colonnes sont EXACTEMENT celles que lisent
 * `dansLeDossier` (hors « Ma sélection », écrite à part), `arbreDesPhotos`,
 * `personnesDe` et `compterPersonnes` (dossiers.ts) : la règle ne change pas,
 * elle lit des lignes qui pèsent `n` photos (`poids`). À peu près une ligne
 * par personne et par dossier.
 *
 * La page, elle, se lit en base avec un FILTRE qui dit la même chose que
 * `dansLeDossier` (`planDuDossier`). Le plan est VÉRIFIÉ contre le résumé
 * avant de partir : appliqué aux lignes du résumé, il doit retenir exactement
 * celles que `dansLeDossier` retient, sinon on retombe sur la lecture
 * complète (`repli`). Comme une ligne du résumé porte toutes les colonnes que
 * le plan lit, le plan retient en base exactement les photos de ces lignes.
 * Un nom qui ne s'écrit pas sans risque dans un filtre (un guillemet, une
 * barre oblique inverse) ou trop de noms : `repli` aussi. Jamais une page
 * fausse : au pire, la lecture d'avant.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { colonneAbsente, tableAbsente } from "./migration";
import { dansLeDossier, QUI_RESPONSABLE, type LignePhoto } from "./dossiers";
import { citerPostgrest } from "./lignes";

export const VUE_RESUME = "collectif_photos_resume";
export const MIGRATION_RESUME = "supabase/migrations/20261022_collectif_resume_photos.sql";

/** Une ligne de la vue. */
export type LigneResume = {
  /** La clé du regroupement : un ordre stable pour la lecture par tranches. */
  id: string;
  role_deposant: string;
  provenance_id: string | null;
  provenance_type: string;
  deposant: string | null;
  /** Le téléphone, pour une photo de participant seulement (le compte des « Sans nom ») ; vide sinon. */
  appareil_id: string | null;
  /** Le nombre de photos arrivées de cette ligne. */
  n: number;
  /** Celles de « Ma sélection ». */
  n_selection: number;
  /** Celles qu'on peut encore choisir : ni sélectionnées ni signalées. */
  n_choisissables: number;
  /** La première arrivée et son id : l'ordre dans lequel la lecture d'avant voyait les lignes (`dansLOrdreDArrivee`). */
  premiere: string;
  premiere_photo: string;
  /** La dernière arrivée (`confirmee_le`), TELLE QUE la base l'a rendue. */
  derniere: string;
  /** La photo la plus récente qui a une vignette : son arrivée, son id, sa clé au coffre. */
  vignette_le: string | null;
  vignette_photo: string | null;
  vignette_key: string | null;
  /**
   * La personne (migration 20261023), quand elle s'est présentée par son adresse :
   * la vue regroupe alors par elle, et le téléphone reste vide. Absente de la vue
   * d'avant (et des lectures qui ne la demandent pas) : `undefined`.
   */
  participant_id?: string | null;
};

/**
 * Les colonnes que lisent la grille et le tableau de bord : les seize de la
 * migration 20261022 (la personne ne leur sert pas, elles comptent par nom).
 * Après 20261023, la même vue écarte la corbeille : rien à changer ici.
 */
export const COLONNES_RESUME =
  "id, role_deposant, provenance_id, provenance_type, deposant, appareil_id, n, n_selection, n_choisissables, premiere, premiere_photo, derniere, vignette_le, vignette_photo, vignette_key";

/** Les mêmes, et la personne (20261023) : la liste des personnes (`personnesServeur.ts`). */
export const COLONNES_RESUME_PERSONNES = `${COLONNES_RESUME}, participant_id`;

/** La migration qui redéfinit la vue (hors corbeille, par personne). */
export const MIGRATION_RESUME_PERSONNES = "supabase/migrations/20261023_collectif_personnes_corbeille.sql";

/** La vue manque (migration non appliquée) : on relit tout, comme avant. */
export function resumeAbsent(code: string | null | undefined): boolean {
  return tableAbsente(code) || colonneAbsente(code);
}

/**
 * Les lignes du résumé dans l'ordre où la lecture d'avant les rencontrait :
 * par leur PREMIÈRE photo arrivée (arrivée, puis id). La base les rend dans
 * l'ordre de leur clé, qui ne veut rien dire ; or deux orthographes d'un nom
 * aussi fréquentes l'une que l'autre se départagent par la première vue
 * (`personnesDe`), comme deux dossiers de même nom (`arbreDesPhotos`).
 */
export function dansLOrdreDArrivee<G extends Pick<LigneResume, "premiere" | "premiere_photo">>(groupes: readonly G[]): G[] {
  return [...groupes].sort((a, b) => compareInstants(a.premiere, b.premiere) || (a.premiere_photo < b.premiere_photo ? -1 : a.premiere_photo > b.premiere_photo ? 1 : 0));
}

/** Les lignes du résumé comme des lignes de photos qui pèsent `n`, dans l'ordre d'arrivée : ce que lisent `arbreDesPhotos`, `personnesDe`, `compterPersonnes`. */
export function enLignesPesees(groupes: readonly LigneResume[]): (LigneResume & { poids: number })[] {
  return dansLOrdreDArrivee(groupes).map((g) => ({ ...g, poids: g.n }));
}

/** Le nombre de photos des lignes qui passent le test (`combien` : toutes, celles de la sélection, ou les choisissables). */
export function somme(groupes: readonly LigneResume[], test: (g: LigneResume) => boolean = () => true, combien: "n" | "n_selection" | "n_choisissables" = "n"): number {
  let n = 0;
  for (const g of groupes) if (test(g)) n += g[combien];
  return n;
}

/**
 * Les lignes du résumé dans un dossier, et combien de photos elles y
 * mettent. « Ma sélection » est la seule clé qui ne se lit pas sur les
 * colonnes du regroupement (une photo y entre quand on la choisit) : ses
 * lignes sont celles qui ont une photo choisie, et elles n'y mettent que
 * celles-là.
 */
export function dansLeDossierResume(groupes: readonly LigneResume[], cle: string, responsable: string | null): { lignes: LigneResume[]; photos: number; choisissables: number } {
  if (cle === "selection") {
    const lignes = groupes.filter((g) => g.n_selection > 0);
    return { lignes, photos: somme(lignes, () => true, "n_selection"), choisissables: 0 };
  }
  const lignes = groupes.filter((g) => dansLeDossier(g, cle, responsable));
  return { lignes, photos: somme(lignes), choisissables: somme(lignes, () => true, "n_choisissables") };
}

/**
 * Comparer deux instants rendus par la base (`2026-10-19T10:00:00.123456+00:00`) :
 * à la milliseconde par `Date`, puis aux MICROSECONDES par les chiffres (une
 * `Date` les perd, et un lot de 25 photos partage le même instant).
 */
export function compareInstants(a: string, b: string): number {
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return a < b ? -1 : a > b ? 1 : 0;
  if (da !== db) return da < db ? -1 : 1;
  const fa = (/\.(\d+)/.exec(a)?.[1] ?? "").padEnd(9, "0");
  const fb = (/\.(\d+)/.exec(b)?.[1] ?? "").padEnd(9, "0");
  return fa === fb ? 0 : fa < fb ? -1 : 1;
}

/** La dernière arrivée de l'édition (le point de départ de « N nouvelles photos », T-181), telle que la base l'a rendue. */
export function derniereArrivee(groupes: readonly LigneResume[]): string | null {
  let d: string | null = null;
  for (const g of groupes) if (g.derniere && (d === null || compareInstants(g.derniere, d) > 0)) d = g.derniere;
  return d;
}

/**
 * La couverture d'un dossier : la clé au coffre de la vignette de la photo la
 * plus RÉCENTE du dossier qui en a une (arrivée, puis id, comme la lecture
 * d'avant qui prenait la dernière ligne triée par arrivée puis par id).
 */
export function couvertureDe(groupes: readonly LigneResume[], cle: string, responsable: string | null): string | null {
  let meilleure: LigneResume | null = null;
  for (const g of groupes) {
    /* « Ma sélection » n'a pas de couverture : sa vignette ne se lit pas sur le résumé. */
    if (cle === "selection" || !g.vignette_key || !g.vignette_le || !g.vignette_photo || !dansLeDossier(g, cle, responsable)) continue;
    if (!meilleure) {
      meilleure = g;
      continue;
    }
    const c = compareInstants(g.vignette_le, meilleure.vignette_le as string);
    if (c > 0 || (c === 0 && g.vignette_photo > (meilleure.vignette_photo as string))) meilleure = g;
  }
  return meilleure?.vignette_key ?? null;
}

/* ─────────────────────────── ce que fait la vue, en mémoire ─────────────────────────── */

/** Une photo arrivée, avec les colonnes que la vue regroupe et compte. */
export type PhotoResumable = LignePhoto & {
  id: string;
  appareil_id: string | null;
  /** La personne (20261023) ; absente d'une lecture d'avant la migration. */
  participant_id?: string | null;
  preselection: boolean;
  signalee: boolean;
  confirmee_le: string;
  vignette_key: string | null;
};

/**
 * Le résumé calculé EN MÉMOIRE, mot pour mot ce que la vue calcule en base
 * (regroupement, la personne quand elle est connue (20261023), le téléphone
 * gardé pour un participant SANS personne seulement, `count`
 * et ses deux `filter`, `min` et `max` de l'arrivée, la première photo par
 * arrivée puis par id, la vignette la plus récente par arrivée puis par id).
 * Le tableau de bord s'en sert sans la migration, le harnais comme fausse
 * base ; il dit aussi, en TypeScript, ce que fait le SQL de la migration.
 */
export function resumerPhotos(photos: readonly PhotoResumable[]): LigneResume[] {
  const parCle = new Map<string, LigneResume>();
  for (const p of photos) {
    const personne = p.participant_id ?? null;
    const appareil = personne === null && (p.role_deposant === "participant" || p.provenance_id !== null) ? p.appareil_id : null;
    const cle = JSON.stringify([p.role_deposant, p.provenance_id, p.provenance_type, p.deposant, appareil, personne]);
    let g = parCle.get(cle);
    if (!g) {
      g = {
        id: cle,
        role_deposant: p.role_deposant,
        provenance_id: p.provenance_id,
        provenance_type: p.provenance_type,
        deposant: p.deposant,
        appareil_id: appareil,
        participant_id: personne,
        n: 0,
        n_selection: 0,
        n_choisissables: 0,
        premiere: p.confirmee_le,
        premiere_photo: p.id,
        derniere: p.confirmee_le,
        vignette_le: null,
        vignette_photo: null,
        vignette_key: null,
      };
      parCle.set(cle, g);
    }
    g.n++;
    if (p.preselection) g.n_selection++;
    if (!p.signalee && !p.preselection) g.n_choisissables++;
    const avant = compareInstants(p.confirmee_le, g.premiere);
    if (avant < 0 || (avant === 0 && p.id < g.premiere_photo)) {
      g.premiere = p.confirmee_le;
      g.premiere_photo = p.id;
    }
    if (compareInstants(p.confirmee_le, g.derniere) > 0) g.derniere = p.confirmee_le;
    if (p.vignette_key) {
      const c = g.vignette_le === null ? 1 : compareInstants(p.confirmee_le, g.vignette_le);
      if (c > 0 || (c === 0 && p.id > (g.vignette_photo as string))) {
        g.vignette_le = p.confirmee_le;
        g.vignette_photo = p.id;
        g.vignette_key = p.vignette_key;
      }
    }
  }
  return [...parCle.values()];
}

/* ─────────────────────────── le filtre d'un dossier ─────────────────────────── */

/** Les colonnes qu'un plan lit : exactement celles d'une ligne du résumé que lit `dansLeDossier`. */
export type LigneFiltrable = Pick<LignePhoto, "role_deposant" | "provenance_id" | "provenance_type" | "deposant"> & { preselection?: boolean; signalee?: boolean };

export type Condition =
  | { op: "egal"; colonne: "role_deposant" | "provenance_id"; valeur: string }
  | { op: "nul"; colonne: "provenance_id" }
  | { op: "horsDe"; colonne: "role_deposant"; valeurs: readonly string[] }
  | { op: "selectionnee" }
  /**
   * « Ne pas publier » (lot w2 du 20/10) : une condition qui ne se pose JAMAIS par
   * `planDuDossier` (le résumé ne porte pas la colonne, le plan ne pourrait pas se
   * vérifier) ; la grille l'AJOUTE au plan d'un dossier déjà vérifié (vue
   * `signalees`, et le compte de la ligne « Ne pas publier »).
   */
  | { op: "signalee" }
  /** Une photo de participant : `deParticipant` (rôle participant, OU arrivée par un lien). */
  | { op: "participant" }
  /** La colonne vaut l'une des valeurs, ou (si `nul`) elle est vide. */
  | { op: "parmi"; colonne: "provenance_type" | "deposant"; valeurs: readonly string[]; nul: boolean };

export type PlanFiltre =
  /** Aucune ligne du résumé n'est dans ce dossier : rien à lire. */
  | { genre: "vide" }
  /** Le dossier ne s'écrit pas sans risque en filtre : relire tout, comme avant. */
  | { genre: "repli"; raison: string }
  | { genre: "filtre"; conditions: Condition[] };

/** Au-delà, le filtre deviendrait une adresse trop longue : on relit tout. */
export const VALEURS_PARMI_MAX = 60;

/** Un nom qui s'écrit tel quel entre guillemets dans un filtre PostgREST : ni guillemet ni barre oblique inverse, ni caractère de contrôle. */
const ECRIVABLE = /^[^"\\\u0000-\u001f]*$/;

function parmi(colonne: "provenance_type" | "deposant", membres: readonly LigneFiltrable[]): Condition {
  const valeurs = [...new Set(membres.map((m) => m[colonne]).filter((v): v is string => typeof v === "string"))].sort();
  return { op: "parmi", colonne, valeurs, nul: membres.some((m) => m[colonne] === null) };
}

const lienDeLaPersonne = (id: string): Condition[] =>
  id === "general" ? [{ op: "nul", colonne: "provenance_id" }, { op: "egal", colonne: "role_deposant", valeur: "participant" }] : [{ op: "egal", colonne: "provenance_id", valeur: id }];

/**
 * Le plan de lecture d'un dossier : ce que `dansLeDossier` dit, écrit en
 * conditions sur des colonnes. « Ma sélection » ne lit qu'une colonne, la
 * même des deux côtés (`preselection`) : son plan est écrit tel quel ; ses
 * lignes sont celles qui ont une photo choisie (`n_selection`).
 */
export function planDuDossier(cle: string, groupes: readonly (LigneFiltrable & { n_selection?: number })[], responsable: string | null): PlanFiltre {
  if (cle === "selection") return groupes.some((g) => (g.n_selection ?? 0) > 0) ? { genre: "filtre", conditions: [{ op: "selectionnee" }] } : { genre: "vide" };
  const membres = groupes.filter((g) => dansLeDossier(g, cle, responsable));
  if (!membres.length) return { genre: "vide" };
  let conditions: Condition[];
  if (cle === "tout") conditions = [];
  else if (cle === "vous" || cle === QUI_RESPONSABLE) conditions = [{ op: "egal", colonne: "role_deposant", valeur: "responsable" }, { op: "nul", colonne: "provenance_id" }];
  else if (cle === "liens") conditions = [{ op: "participant" }];
  else if (cle === "atelier") conditions = [{ op: "horsDe", colonne: "role_deposant", valeurs: ["responsable", "participant"] }, { op: "nul", colonne: "provenance_id" }];
  else if (cle === "participants") conditions = lienDeLaPersonne("general");
  else if (cle.startsWith("lien:")) conditions = [{ op: "egal", colonne: "provenance_id", valeur: cle.slice(5) }];
  else if (cle.startsWith("pers:")) {
    const reste = cle.slice(5);
    conditions = [...lienDeLaPersonne(reste.slice(0, reste.indexOf(":"))), parmi("deposant", membres)];
  } else if (cle.startsWith("qui:") || cle.startsWith("quis:")) conditions = [{ op: "participant" }, parmi("deposant", membres)];
  else if (cle.startsWith("resp:")) {
    conditions = [{ op: "egal", colonne: "role_deposant", valeur: "responsable" }, { op: "nul", colonne: "provenance_id" }, parmi("provenance_type", membres), parmi("deposant", membres)];
  } else return { genre: "repli", raison: "dossier inconnu" };

  for (const c of conditions) {
    if (c.op === "egal" && !ECRIVABLE.test(c.valeur)) return { genre: "repli", raison: "valeur illisible" };
    if (c.op !== "parmi") continue;
    if (c.valeurs.length > VALEURS_PARMI_MAX) return { genre: "repli", raison: "trop de noms" };
    if (!c.valeurs.every((v) => ECRIVABLE.test(v))) return { genre: "repli", raison: "un nom ne s'écrit pas en filtre" };
  }
  /* La preuve : sur le résumé, le plan retient EXACTEMENT les lignes que `dansLeDossier` retient. */
  const retenues = groupes.filter((g) => correspond(g, conditions));
  if (retenues.length !== membres.length || retenues.some((g, i) => g !== membres[i])) return { genre: "repli", raison: "le plan ne redit pas la règle" };
  return { genre: "filtre", conditions };
}

/** Une ligne passe-t-elle les conditions ? (Le sens du plan ; la base fait la même chose par `enFiltresPostgrest`.) */
export function correspond(l: LigneFiltrable, conditions: readonly Condition[]): boolean {
  for (const c of conditions) {
    switch (c.op) {
      case "egal":
        if (l[c.colonne] !== c.valeur) return false;
        break;
      case "nul":
        if (l[c.colonne] !== null) return false;
        break;
      case "horsDe":
        if (c.valeurs.includes(l[c.colonne])) return false;
        break;
      case "selectionnee":
        if (l.preselection !== true) return false;
        break;
      case "signalee":
        if (l.signalee !== true) return false;
        break;
      case "participant":
        if (!(l.role_deposant === "participant" || l.provenance_id !== null)) return false;
        break;
      case "parmi": {
        const v = l[c.colonne];
        if (v === null ? !c.nul : !c.valeurs.includes(v)) return false;
        break;
      }
    }
  }
  return true;
}

/**
 * Le plan écrit pour PostgREST : une liste d'appels de filtre supabase-js,
 * que la route pose un à un sur sa requête (`.eq`, `.is`, `.or`, `.filter` ;
 * « not » s'écrit `.filter(colonne, "not.in", …)`). Toute
 * valeur part entre guillemets (un nom peut porter une virgule, un point, deux
 * points, une parenthèse) ; `planDuDossier` a déjà refusé guillemet et barre
 * oblique inverse. Plusieurs `or` se cumulent en ET (PostgREST les combine
 * comme tout filtre de premier niveau).
 * Vérifié le 20/10 contre la vraie base, en LECTURE SEULE : sur les 10
 * éditions et leurs 1 203 photos, chacun des 44 dossiers filtré et trié par la
 * base (« Toutes » et « Par jour ») rend exactement les photos et l'ordre de la
 * lecture complète, et son compte `head` aussi ; deux `or` font un ET ; sur 60
 * textes réels qui portent virgule, parenthèse, deux-points, apostrophe ou
 * espace, `in.("…")` et `or=(…in.("…"))` comptent comme `eq` ; un espace en
 * tête ou en fin, entre guillemets, est gardé (« Léa » n'est pas « Léa  »).
 */
export type AppelFiltre =
  | { methode: "eq"; colonne: string; valeur: string | boolean }
  | { methode: "is"; colonne: string }
  | { methode: "not"; colonne: string; operateur: "is" | "in"; valeur: string | null }
  | { methode: "or"; filtres: string }
  | { methode: "filter"; colonne: string; operateur: "in"; valeur: string };

/* Chaque valeur citée ET échappée (`citerPostgrest`, lignes.ts : audit du 20/10, S8). `planDuDossier` refuse
   déjà guillemet et barre oblique inverse : la citation est la seconde ceinture, la même partout. */
const liste = (valeurs: readonly string[]) => `(${valeurs.map(citerPostgrest).join(",")})`;

export function enFiltresPostgrest(conditions: readonly Condition[]): AppelFiltre[] {
  const appels: AppelFiltre[] = [];
  for (const c of conditions) {
    switch (c.op) {
      case "egal":
        appels.push({ methode: "eq", colonne: c.colonne, valeur: c.valeur });
        break;
      case "nul":
        appels.push({ methode: "is", colonne: c.colonne });
        break;
      case "horsDe":
        appels.push({ methode: "not", colonne: c.colonne, operateur: "in", valeur: liste(c.valeurs) });
        break;
      case "selectionnee":
        appels.push({ methode: "eq", colonne: "preselection", valeur: true });
        break;
      case "signalee":
        appels.push({ methode: "eq", colonne: "signalee", valeur: true });
        break;
      case "participant":
        appels.push({ methode: "or", filtres: "role_deposant.eq.participant,provenance_id.not.is.null" });
        break;
      case "parmi":
        if (c.valeurs.length && c.nul) appels.push({ methode: "or", filtres: `${c.colonne}.is.null,${c.colonne}.in.${liste(c.valeurs)}` });
        else if (c.valeurs.length) appels.push({ methode: "filter", colonne: c.colonne, operateur: "in", valeur: liste(c.valeurs) });
        else appels.push({ methode: "is", colonne: c.colonne });
        break;
    }
  }
  return appels;
}

/* ─────────────────────────── l'ordre d'une page ─────────────────────────── */

export type CleTri = { colonne: "confirmee_le" | "id" | "prise_le"; croissant: boolean; nulsDAbord?: boolean };

/** « Toutes » : la dernière arrivée d'abord (T-181), l'id départage (un lot partage son instant). */
export const TRI_TOUTES: readonly CleTri[] = [
  { colonne: "confirmee_le", croissant: false },
  { colonne: "id", croissant: false },
];

/**
 * « Par jour » (refait le 22/10, la page Photos « comme une application ») : les JOURS DE PRISE DE VUE les plus récents en haut,
 * et dans un jour la dernière prise de vue d'abord ; l'ordre d'arrivée départage (un lot partage son instant), puis l'id.
 * Les photos SANS date de prise de vue viennent EN FIN (NULLS LAST, 28/10), la dernière arrivée en tête de leur groupe : l'écran
 * en fait UN groupe « Sans date » (`regrouperParJour`, filtres.ts), au lieu de les ranger sous leur jour d'envoi, qui
 * doublonnait un jour daté (« Mercredi 28 octobre » deux fois, avec un autre jour entre les deux).
 */
export const TRI_JOUR: readonly CleTri[] = [
  { colonne: "prise_le", croissant: false, nulsDAbord: false },
  { colonne: "confirmee_le", croissant: false },
  { colonne: "id", croissant: false },
];

/** L'ordre d'arrivée (la vue « Doublons », comme la lecture d'avant). */
export const TRI_ARRIVEE: readonly CleTri[] = [
  { colonne: "confirmee_le", croissant: true },
  { colonne: "id", croissant: true },
];

type Triable = { id: string; confirmee_le: string; prise_le: string | null };

/** Trier en mémoire COMME la base trie (ORDER BY … NULLS FIRST/LAST) : la vue « Doublons », et la fausse base du harnais. */
export function trierCommeLaBase<T extends Triable>(lignes: readonly T[], tri: readonly CleTri[]): T[] {
  return [...lignes].sort((a, b) => {
    for (const t of tri) {
      const va = a[t.colonne];
      const vb = b[t.colonne];
      if (va === vb) continue;
      if (va === null || vb === null) {
        /* PostgreSQL : NULLS LAST en croissant, NULLS FIRST en décroissant, sauf demande contraire. */
        const nulsDAbord = t.nulsDAbord ?? !t.croissant;
        return (va === null) === nulsDAbord ? -1 : 1;
      }
      const c = t.colonne === "confirmee_le" ? compareInstants(va, vb) : va < vb ? -1 : 1;
      if (c !== 0) return t.croissant ? c : -c;
    }
    return 0;
  });
}
