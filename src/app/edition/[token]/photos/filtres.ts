/* La page Photos du responsable (planches 1, 2 et 3 du 20/10, T-193, T-199) :
   ce que les LISTES de la colonne veulent dire pour la route existante.
   Module PUR : aucun accès réseau, importable navigateur et harnais.

   La route `/api/collectif/photos` ne lit qu'UNE clé de dossier (`dossiers.ts`)
   et une vue (`toutes`, `jour`, `doublons`). Les listes s'y traduisent ainsi :
   - un lien (`lien:<id>`, `participants`, `vous`, `atelier`), une personne d'un
     lien (`pers:…`), une personne de toute l'édition (`qui:…`), un dossier du
     responsable (`resp:…`) : la clé la plus précise gagne ;
   - « Ma sélection » est un dossier à part (`selection`) : il ne se croise pas
     avec un lien, choisir l'un retire l'autre ;
   - « Doublons » est une VUE : il se croise avec tout ;
   - l'ordre « Par jour » est la vue `jour` ; un JOUR choisi filtre dans le
     navigateur les pages rangées par jour (la route ne filtre pas par jour) :
     son nombre ne s'affiche qu'une fois la dernière photo de ce jour lue.
   Un seul lien et une seule personne à la fois : la route ne sait pas en
   croiser plusieurs (branchement serveur, seconde vague). */

import { clePersonne, QUI_RESPONSABLE, type Arbre, type Noeud } from "@/lib/collectif/dossiers";

export type Mode = "tout" | "liens";
export type Ordre = "recentes" | "jour";
export type VueRoute = "toutes" | "jour" | "doublons";

export type Filtres = {
  /** « Tout » (la grille, filtrée) ou « Par lien » (un album par lien, puis le lien ouvert). */
  mode: Mode;
  /** Le lien coché : `lien:<id>`, `participants` (le lien général), `vous` (Mes photos), `atelier`. */
  lien: string | null;
  /** Un dossier du responsable (`resp:…`), dans « Mes photos ». */
  dossier: string | null;
  /** Une personne : `pers:<id|general>:<nom>` dans un lien, `qui:<nom>` ou `qui:@responsable` sinon. */
  personne: string | null;
  /** Un jour de prise de vue (`jourCle` de la route), filtré dans le navigateur. */
  jour: string | null;
  doublons: boolean;
  selection: boolean;
  ordre: Ordre;
};

export const FILTRES_VIDES: Filtres = { mode: "tout", lien: null, dossier: null, personne: null, jour: null, doublons: false, selection: false, ordre: "recentes" };

/** Ce que la route reçoit : une clé de dossier et une vue. */
export function requeteDe(f: Filtres): { dossier: string; vue: VueRoute } {
  const dossier = f.selection ? "selection" : f.personne ?? f.dossier ?? f.lien ?? (f.mode === "liens" ? "liens" : "tout");
  const vue: VueRoute = f.doublons ? "doublons" : f.ordre === "jour" || f.jour ? "jour" : "toutes";
  return { dossier, vue };
}

/** « Par lien » sans lien ouvert : les albums, pas de grille. */
export const estVueAlbums = (f: Filtres) => f.mode === "liens" && !f.lien && !f.selection;

/** Combien de filtres sont actifs (le rond du bouton « Filtrer » du téléphone). */
export function nombreDeFiltres(f: Filtres): number {
  return [f.lien, f.dossier, f.personne, f.jour].filter(Boolean).length + (f.doublons ? 1 : 0) + (f.selection ? 1 : 0);
}

/** Lire `?dossier=` (le tableau de bord y mène) en filtres. `mode=tout` garde un lien coché dans « Tout ». */
export function filtresDepuis(cle: string, modeTout = false): Filtres {
  const f = { ...FILTRES_VIDES };
  if (cle === "selection") return { ...f, selection: true };
  if (cle === "liens") return { ...f, mode: "liens" };
  if (cle === "vous" || cle === "participants" || cle === "atelier" || cle.startsWith("lien:")) return { ...f, mode: modeTout ? "tout" : "liens", lien: cle };
  if (cle.startsWith("resp:")) return { ...f, mode: modeTout ? "tout" : "liens", lien: "vous", dossier: cle };
  if (cle.startsWith("pers:")) {
    const id = cle.slice(5, cle.indexOf(":", 5));
    return { ...f, mode: modeTout ? "tout" : "liens", lien: id === "general" ? "participants" : `lien:${id}`, personne: cle };
  }
  if (cle.startsWith("qui:")) return { ...f, personne: cle };
  return f;
}

/** L'adresse qui rouvre le même endroit (replaceState, rien ne s'empile). */
export function adresseDe(f: Filtres): string {
  const { dossier } = requeteDe({ ...f, doublons: false, jour: null, ordre: "recentes" });
  if (dossier === "tout") return "";
  const tout = f.mode === "tout" && f.lien ? "&mode=tout" : "";
  return `?dossier=${encodeURIComponent(dossier)}${tout}`;
}

/** Choisir un lien : la personne et le dossier d'avant tombent, « Ma sélection » aussi (elle ne se croise pas). */
export function avecLien(f: Filtres, lien: string | null): Filtres {
  return { ...f, lien, dossier: null, personne: f.personne?.startsWith("qui:") && lien === null ? f.personne : null, selection: false };
}
/** « Ma sélection » : un dossier à part, il retire lien, dossier et personne. */
export function avecSelection(f: Filtres, oui: boolean): Filtres {
  return oui ? { ...f, mode: "tout", lien: null, dossier: null, personne: null, selection: true } : { ...f, selection: false };
}

/* ─────────────────────────── les listes ─────────────────────────── */

/** Les liens dans l'ordre des planches : les liens de contribution par nom (« Bateau 2 » avant « Bateau 10 »), puis le lien général, « Mes photos », l'atelier. */
export function liensDansLOrdre(arbre: Arbre, avecVous: boolean): Noeud[] {
  const contributions = arbre.liens.filter((l) => l.cle.startsWith("lien:")).sort((a, b) => a.nom.localeCompare(b.nom, "fr", { numeric: true, sensitivity: "base" }));
  const general = arbre.liens.filter((l) => l.cle === "participants");
  const n = arbre.vous.reduce((s, d) => s + d.n, 0);
  const vous: Noeud[] = avecVous || n ? [{ cle: "vous", nom: "Mes photos", n, enfants: arbre.vous, renommable: false, deplacable: false, accueille: false }] : [];
  return [...contributions, ...general, ...vous, ...(arbre.atelier ? [arbre.atelier] : [])];
}

/** Le nœud d'un lien de la liste (le nœud « Mes photos » est fabriqué : il porte les dossiers du responsable). */
export function lienDe(arbre: Arbre, cle: string | null, avecVous: boolean): Noeud | undefined {
  return cle ? liensDansLOrdre(arbre, avecVous).find((l) => l.cle === cle) : undefined;
}

/** Comparer un nom sans casse ni accents, pour la recherche d'une personne. */
export function pourChercher(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("fr").trim();
}

/** Les initiales d'une personne (« Léa Martin » → LM, « Sans nom » → ?). */
export function initialesDe(nom: string): string {
  if (nom === "Sans nom") return "?";
  const mots = nom.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (mots.length === 0) return "?";
  return (mots.length === 1 ? mots[0].slice(0, 2) : mots[0][0] + mots[1][0]).toUpperCase();
}

/**
 * Le lien par lequel une photo est arrivée, quand on peut le dire sans
 * deviner : le lien ouvert, sinon le SEUL lien où ce nom apparaît. Deux liens
 * qui ont chacun une « Léa Martin » : `null` (la ligne ne s'affiche pas).
 */
export function lienDeLaPhoto(arbre: Arbre | null, photo: { role: string; qui: string }, lienOuvert: Noeud | undefined): string | null {
  if (photo.role === "responsable") return "Mes photos";
  if (photo.role === "atelier") return "L'atelier";
  if (lienOuvert && lienOuvert.cle !== "vous" && lienOuvert.cle !== "atelier") return lienOuvert.nom;
  if (!arbre) return null;
  const cle = clePersonne(photo.qui);
  const liens = arbre.liens.filter((l) => l.enfants.some((e) => e.cle.endsWith(`:${cle}`)) || (l.enfants.length === 0 && clePersonne(l.nom) === cle));
  return liens.length === 1 ? liens[0].nom : null;
}

/** La clé « toutes ses photos » d'une personne : `qui:<nom>` (le responsable : `qui:@responsable`). */
export function cleQui(photo: { role: string; qui: string }): string | null {
  if (photo.role === "responsable") return QUI_RESPONSABLE;
  if (photo.role === "atelier") return null;
  return `qui:${clePersonne(photo.qui)}`;
}

/* ─────────────────────────── les jours ─────────────────────────── */

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const JOURS_COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function partiesDuJour(cle: string): { y: number; m: number; d: number; sansDate: boolean } | null {
  const sansDate = cle.startsWith("~");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sansDate ? cle.slice(1) : cle);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]), sansDate };
}

/** « samedi 7 novembre » (la tête d'un jour dans la grille), « Sans date, arrivées le 18 octobre ». Lu SANS fuseau. */
export function jourLong(cle: string): string {
  const p = partiesDuJour(cle);
  if (!p) return cle;
  const j = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  const date = `${p.d === 1 ? "1er" : p.d} ${MOIS[p.m - 1]}`;
  return p.sansDate ? `Sans date, arrivées le ${date}` : `${JOURS[j]} ${date}`;
}

/** « sam. 7 nov. » (la liste des jours, les puces), « sans date · 18 oct. ». */
export function jourCourt(cle: string): string {
  const p = partiesDuJour(cle);
  if (!p) return cle;
  const j = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  return p.sansDate ? `sans date · ${p.d} ${MOIS_COURTS[p.m - 1]}` : `${JOURS_COURTS[j]} ${p.d} ${MOIS_COURTS[p.m - 1]}`;
}

export type JourVu = { cle: string; n: number; complet: boolean };

/**
 * Les jours des photos LUES, dans l'ordre de la vue « Par jour » : un jour est
 * complet quand un jour suivant a commencé, ou que la vue est lue jusqu'au
 * bout. Un nombre qui n'est pas complet ne s'affiche pas.
 */
export function joursVus(photos: readonly { jourCle: string }[], toutLu: boolean): JourVu[] {
  const rendu: JourVu[] = [];
  for (const p of photos) {
    const dernier = rendu[rendu.length - 1];
    if (dernier && dernier.cle === p.jourCle) dernier.n++;
    else {
      const deja = rendu.find((x) => x.cle === p.jourCle);
      if (deja) deja.n++;
      else rendu.push({ cle: p.jourCle, n: 1, complet: false });
    }
  }
  return rendu.map((j, i) => ({ ...j, complet: toutLu || i < rendu.length - 1 }));
}

/** Faut-il lire la page suivante pour connaître tout le jour choisi ? (pages rangées par jour : on s'arrête quand un jour suivant commence) */
export function jourEncoreALire(photos: readonly { jourCle: string }[], jour: string, suivante: number | null, rangeesParJour: boolean): boolean {
  if (suivante === null) return false;
  if (!rangeesParJour) return true;
  const dernier = photos[photos.length - 1];
  return !dernier || dernier.jourCle <= jour;
}

/* ─────────────────────────── les instants ─────────────────────────── */

const PARIS_LONG = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hourCycle: "h23" });
const PARIS_COURT = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hourCycle: "h23" });

function parties(f: Intl.DateTimeFormat, iso: string): Record<string, string> | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return Object.fromEntries(f.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
}

/** « samedi 7 novembre, 14 h 32 », heure de Paris (l'arrivée d'une photo). */
export function arriveeLongue(iso: string): string {
  const p = parties(PARIS_LONG, iso);
  if (!p) return "";
  return `${p.weekday} ${p.day === "1" ? "1er" : p.day} ${p.month}, ${p.hour} h ${p.minute}`;
}

/** « sam. 7 nov., 14 h 32 », heure de Paris (la ligne du téléphone). */
export function arriveeCourte(iso: string): string {
  const p = parties(PARIS_COURT, iso);
  if (!p) return "";
  return `${p.weekday} ${p.day} ${p.month}, ${p.hour} h ${p.minute}`;
}

/* ─────────────────────────── les phrases ─────────────────────────── */

export const nombre = (n: number) => n.toLocaleString("fr-FR");
export const photosDe = (n: number) => `${nombre(n)} photo${n > 1 ? "s" : ""}`;
export const personnesDe = (n: number) => `${nombre(n)} personne${n > 1 ? "s" : ""}`;

/** L'annonce courte du téléphone : « 12 nouvelles · Léa, Hugo et 1 autre ». */
export function annonceCourte(participants: number, noms: readonly string[], personnes: number): string {
  const tete = `${nombre(participants)} nouvelle${participants > 1 ? "s" : ""}`;
  const prenoms = noms.filter((n) => n !== "Sans nom").slice(0, 2).map((n) => n.split(" ")[0]);
  if (!prenoms.length) return tete;
  const autres = Math.max(0, personnes - prenoms.length);
  return `${tete} · ${prenoms.join(autres ? ", " : " et ")}${autres ? ` et ${autres} autre${autres > 1 ? "s" : ""}` : ""}`;
}
