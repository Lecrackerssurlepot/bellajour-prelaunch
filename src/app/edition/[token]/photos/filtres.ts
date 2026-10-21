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
   croiser plusieurs (branchement serveur, seconde vague).

   Lot w2 (planches 3, 4 et 5 du 20/10) :
   - « Ne pas publier » est une VUE (`signalees`), comme « Doublons » : elle se
     croise avec le dossier, et l'une retire l'autre (la route n'en lit qu'une) ;
   - « Corbeille » est un endroit à part (`corbeille`) : ni grille ni route
     photos, sa propre route (`/api/collectif/photos/corbeille`) ; tout autre
     geste des listes en sort ;
   - une personne (`qui:…`, `pers:…`) ouvre sa FICHE au-dessus de ses photos
     (`cleDeLaPersonne`).

   Planche 2 du 21/10 (téléphone) : un TROISIÈME choix, « Personnes » (`mode: "personnes"`), à côté de « Tout » et
   « Par lien » : tout le monde, tous liens confondus. Il lit la même chose que « Tout » (la clé `tout`, donc
   passer de l'un à l'autre ne relit rien) : seul l'AFFICHAGE change, une liste de personnes au téléphone au lieu de
   la grille ; sur ordinateur, ce choix n'existe pas (la colonne « Personne » fait le même travail) et la grille reste
   celle de « Tout ». Toucher une personne ouvre ses photos (`personne: qui:<nom>`). */

import { PHOTOS_PAR_GESTE } from "@/lib/collectif/corbeille";
import { clePersonne, QUI_RESPONSABLE, SANS_NOM, type Arbre, type Noeud } from "@/lib/collectif/dossiers";
import { GROUPE_SANS_GROUPE } from "@/lib/collectif/partage";

export type Mode = "tout" | "liens" | "personnes";
export type Ordre = "recentes" | "jour";
export type VueRoute = "toutes" | "jour" | "doublons" | "signalees";

export type Filtres = {
  /** « Tout » (la grille, filtrée), « Par lien » (un album par lien, puis le lien ouvert) ou « Personnes » (la liste de tout le monde, téléphone). */
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
  /** « Ne pas publier » : une vue qui se croise avec le dossier (lot w2). */
  signalees: boolean;
  /** La corbeille (planche 5) : un endroit à part, le responsable seul. */
  corbeille: boolean;
};

export const FILTRES_VIDES: Filtres = { mode: "tout", lien: null, dossier: null, personne: null, jour: null, doublons: false, selection: false, ordre: "recentes", signalees: false, corbeille: false };

/** Ce que la route reçoit : une clé de dossier et une vue. */
export function requeteDe(f: Filtres): { dossier: string; vue: VueRoute } {
  const dossier = f.selection ? "selection" : f.personne ?? f.dossier ?? f.lien ?? (f.mode === "liens" ? "liens" : "tout");
  const vue: VueRoute = f.doublons ? "doublons" : f.signalees ? "signalees" : f.ordre === "jour" || f.jour ? "jour" : "toutes";
  return { dossier, vue };
}

/** « Par lien » sans lien ouvert : les albums, pas de grille. */
export const estVueAlbums = (f: Filtres) => f.mode === "liens" && !f.lien && !f.selection && !f.corbeille;

/** « Personnes » sans personne ouverte : la liste de tout le monde (téléphone). Une personne ouverte, ou un autre geste des listes, rend la grille. */
export const estVuePersonnes = (f: Filtres) => f.mode === "personnes" && !f.personne && !f.selection && !f.corbeille && !f.doublons && !f.signalees;

/**
 * La vue range les DERNIÈRES ARRIVÉES en tête (« Tout », un lien, une personne, un dossier, les albums « Par
 * lien ») : une photo qui arrive y entre en haut. Pas Ma sélection, Doublons, Ne pas publier, l'ordre « Par jour »,
 * un jour choisi, ni la corbeille : y insérer d'office déplacerait ce que l'on regarde (`accueilDesArrivees`).
 */
export const montreLesDernieres = (f: Filtres) => !f.selection && !f.corbeille && !f.doublons && !f.signalees && f.ordre === "recentes" && !f.jour;

/** Combien de filtres sont actifs (le rond du bouton « Filtrer » du téléphone). */
export function nombreDeFiltres(f: Filtres): number {
  return [f.lien, f.dossier, f.personne, f.jour].filter(Boolean).length + (f.doublons ? 1 : 0) + (f.selection ? 1 : 0) + (f.signalees ? 1 : 0);
}

/**
 * Combien de réglages la FEUILLE « Filtrer » du téléphone montre d'actifs (le rond du bouton) : un jour, Ma sélection, Ne pas
 * publier, Doublons. Pas le lien ni la personne : ils s'ouvrent par « Par lien » et « Personnes » (la barre du bas), et un
 * rond qui compte ce que la feuille ne montre pas se lirait comme un réglage caché.
 */
export function nombreDansLaFeuille(f: Filtres): number {
  return (f.jour ? 1 : 0) + (f.doublons ? 1 : 0) + (f.selection ? 1 : 0) + (f.signalees ? 1 : 0);
}
/** « Tout effacer » de la feuille : ses réglages seulement. Le lien ouvert, la personne et le choix du bas (Tout, Par lien, Personnes) restent. */
export function sansReglagesDeLaFeuille(f: Filtres): Filtres {
  return { ...f, jour: null, doublons: false, signalees: false, selection: false };
}

/** « Doublons » et « Ne pas publier » sont deux vues de la route : cocher l'une décoche l'autre. */
export function avecDoublons(f: Filtres, oui: boolean): Filtres {
  return { ...f, doublons: oui, signalees: oui ? false : f.signalees };
}
export function avecSignalees(f: Filtres, oui: boolean): Filtres {
  return { ...f, signalees: oui, doublons: oui ? false : f.doublons };
}
/** La corbeille : un endroit à part, rien des listes ne s'y croise (l'ordre est gardé pour le retour). */
export function avecCorbeille(f: Filtres): Filtres {
  return { ...FILTRES_VIDES, ordre: f.ordre, corbeille: true };
}
/** Tout autre geste des listes sort de la corbeille. */
export const sortirDeLaCorbeille = (f: Filtres): Filtres => (f.corbeille ? { ...f, corbeille: false } : f);

/** Lire `?dossier=` (le tableau de bord y mène) en filtres. `mode=tout` garde un lien coché dans « Tout ». */
export function filtresDepuis(cle: string, modeTout = false): Filtres {
  const f = { ...FILTRES_VIDES };
  if (cle === "corbeille") return { ...f, corbeille: true };
  if (cle === "selection") return { ...f, selection: true };
  if (cle === "liens") return { ...f, mode: "liens" };
  if (cle === "personnes") return { ...f, mode: "personnes" };
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
  if (f.corbeille) return "?dossier=corbeille";
  if (estVuePersonnes(f)) return "?dossier=personnes";
  const { dossier } = requeteDe({ ...f, doublons: false, signalees: false, jour: null, ordre: "recentes" });
  if (dossier === "tout") return "";
  const tout = f.mode === "tout" && f.lien ? "&mode=tout" : "";
  return `?dossier=${encodeURIComponent(dossier)}${tout}`;
}

/** Choisir un lien : la personne et le dossier d'avant tombent, « Ma sélection » aussi (elle ne se croise pas). */
export function avecLien(f: Filtres, lien: string | null): Filtres {
  return { ...f, lien, dossier: null, personne: f.personne?.startsWith("qui:") && lien === null ? f.personne : null, selection: false, corbeille: false };
}
/** « Ma sélection » : un dossier à part, il retire lien, dossier et personne. */
export function avecSelection(f: Filtres, oui: boolean): Filtres {
  return oui ? { ...f, mode: "tout", lien: null, dossier: null, personne: null, selection: true, corbeille: false } : { ...f, selection: false };
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

/** « octobre » quand tous les jours (datés) sont du même mois, sinon `null` : le titre de la liste des jours de la feuille. */
export function moisCommun(jours: readonly { cle: string }[]): string | null {
  const mois = new Set<number>();
  for (const j of jours) {
    const p = partiesDuJour(j.cle);
    if (!p || p.sansDate) continue;
    mois.add(p.y * 12 + p.m - 1);
  }
  if (mois.size !== 1) return null;
  const [m] = [...mois];
  return MOIS[m % 12];
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

/* ─────────────────────── lot w2 : agir en lots, la corbeille, une personne ─────────────────────── */

/** Au plus, par requête : la règle de la route (`PHOTOS_PAR_GESTE`, corbeille.ts). Au-delà, plusieurs requêtes, l'une après l'autre. */
export const LOT_ECRITURE = PHOTOS_PAR_GESTE;

/** Des ids en paquets de `taille` (500 : une requête par paquet, jamais une par photo). */
export function enLots<T>(ids: readonly T[], taille: number = LOT_ECRITURE): T[][] {
  const lots: T[][] = [];
  for (let i = 0; i < ids.length; i += taille) lots.push(ids.slice(i, i + taille));
  return lots;
}

const PARIS_JOUR_COURT = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short" });

/** « sam. 7 nov. à 15 h 02 », heure de Paris (quand une photo a été supprimée, planche 5A). */
export function instantCourt(iso: string): string {
  const p = parties(PARIS_COURT, iso);
  if (!p) return "";
  return `${p.weekday} ${p.day} ${p.month} à ${p.hour} h ${p.minute}`;
}
/** « sam. 7 nov. », heure de Paris (la même chose au téléphone, planche 5B). */
export function jourDeLInstant(iso: string): string {
  const p = parties(PARIS_JOUR_COURT, iso);
  if (!p) return "";
  return `${p.weekday} ${p.day} ${p.month}`;
}

/** L'échéance d'une photo de la corbeille (`joursRestants` du serveur, arrondi au jour supérieur). */
export function echeanceTexte(jours: number): string {
  if (jours <= 0) return "Effacée au prochain passage";
  return `Effacée dans ${nombre(jours)} jour${jours > 1 ? "s" : ""}`;
}

/** Ce que la corbeille dit d'une photo restaurée : où elle est revenue (planche 5C). */
export function phraseRetour(lien: string, lienNom: string, qui: string): string {
  if (lien === "vous") return "De retour dans Mes photos";
  if (lien === "atelier") return "De retour avec les photos de l'atelier";
  /* L'adresse de base (planche 5, 21/10) : ses photos sont « Sans groupe », plus « le lien général ». */
  if (lien === "participants") return `De retour dans ${GROUPE_SANS_GROUPE}, chez ${qui}`;
  return `De retour dans ${lienNom}, chez ${qui}`;
}

/** « La voir » : le filtre qui montre la photo restaurée, son lien et sa personne. */
export function filtreDuRetour(lien: string, qui: string): Filtres {
  if (lien.startsWith("lien:")) return filtresDepuis(`pers:${lien.slice(5)}:${clePersonne(qui)}`);
  if (lien === "participants") return filtresDepuis(`pers:general:${clePersonne(qui)}`);
  return filtresDepuis(lien === "vous" || lien === "atelier" ? lien : "tout");
}

/**
 * La personne d'un filtre, quand elle a une FICHE (planche 4) : le nom comparé
 * de `qui:<nom>` ou de `pers:<lien>:<nom>`. Ni le responsable (`qui:@responsable`),
 * ni « Sans nom » (des téléphones sans nom, pas une personne qu'on renomme).
 */
export function cleDeLaPersonne(filtre: string | null): string | null {
  if (!filtre || filtre === QUI_RESPONSABLE) return null;
  let cle: string | null = null;
  if (filtre.startsWith("qui:")) cle = filtre.slice(4);
  else if (filtre.startsWith("pers:")) {
    const reste = filtre.slice(5);
    const i = reste.indexOf(":");
    cle = i > 0 ? reste.slice(i + 1) : null;
  }
  if (!cle || cle === clePersonne(SANS_NOM)) return null;
  return cle;
}

/** Après un renommage ou une fusion, le même filtre sous le nom gardé (la grille est rangée par nom). */
export function filtreSousLeNom(filtre: string, nom: string): string {
  if (filtre.startsWith("pers:")) {
    const reste = filtre.slice(5);
    const i = reste.indexOf(":");
    if (i > 0) return `pers:${reste.slice(0, i)}:${clePersonne(nom)}`;
  }
  return `qui:${clePersonne(nom)}`;
}

/** Une personne telle que la route `personnes` la rend (`Personne`, personnes.ts). */
export type PersonneVue = {
  ref: string;
  participant: boolean;
  nom: string;
  prenom: string | null;
  nomDeFamille: string | null;
  cle: string;
  email: string | null;
  n: number;
  liens: { cle: string; n: number }[];
  telephones: number;
  derniere: string | null;
  depuis: string | null;
  /** Un AUTRE prénom et nom tapé avec son adresse (non vérifiée), et quand ; jamais pour l'équipe (durcissement C4). */
  nomPropose?: { nom: string; le: string } | null;
};
export type ListePersonnes = { personnes: PersonneVue[]; proposees: { a: string; b: string; raison: "meme_nom" | "meme_prenom" }[]; avecAdresses: boolean };
export type Proposition = { personne: PersonneVue; raison: "meme_nom" | "meme_prenom" };

/**
 * La fiche d'une personne de la grille : parmi celles qui portent ce nom (la
 * grille range par NOM : deux personnes du même nom s'y montrent ensemble),
 * celle qui s'est présentée par son adresse d'abord (elle seule se retrouve sur
 * un autre téléphone), puis la plus fournie ; et les doublons PROPOSÉS par le
 * serveur qui la touchent. Jamais fusionnés ici : l'écran les propose, le
 * responsable décide.
 */
export function ficheDe(liste: ListePersonnes | null, cle: string | null): { personne: PersonneVue; propositions: Proposition[] } | null {
  if (!liste || !cle) return null;
  const memes = liste.personnes.filter((p) => p.cle === cle).sort((a, b) => Number(b.participant) - Number(a.participant) || b.n - a.n);
  const personne = memes[0];
  if (!personne) return null;
  const refs = new Set(memes.map((p) => p.ref));
  const parRef = new Map(liste.personnes.map((p) => [p.ref, p]));
  const vues = new Set<string>();
  const propositions: Proposition[] = [];
  for (const x of liste.proposees) {
    /* L'autre de la paire : celle qui n'est pas la personne de la fiche (une homonyme peut être l'une ou l'autre). */
    const autre = x.a === personne.ref ? x.b : x.b === personne.ref ? x.a : refs.has(x.a) ? x.b : refs.has(x.b) ? x.a : null;
    if (!autre || autre === personne.ref || vues.has(autre)) continue;
    const p = parRef.get(autre);
    if (!p) continue;
    vues.add(autre);
    propositions.push({ personne: p, raison: x.raison });
  }
  return { personne, propositions };
}

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}+/gu, "");

/** Pourquoi deux personnes sont peut-être la même (la puce de la planche 4A). */
export function raisonTexte(raison: "meme_nom" | "meme_prenom", a: string, b: string): string {
  if (raison === "meme_prenom") return "même prénom, même lien";
  if (a === b) return "même nom";
  return sansAccents(a) === sansAccents(b) ? "même nom, sans l'accent" : "même nom, écrit autrement";
}

/** Le prénom et le nom à proposer pour renommer : ceux de la personne, sinon le premier mot puis le reste. */
export function prenomEtNom(p: Pick<PersonneVue, "prenom" | "nomDeFamille" | "nom">): { prenom: string; nom: string } {
  if (p.prenom && p.nomDeFamille) return { prenom: p.prenom, nom: p.nomDeFamille };
  const n = p.nom.trim();
  const i = n.indexOf(" ");
  return i > 0 ? { prenom: n.slice(0, i), nom: n.slice(i + 1).trim() } : { prenom: n, nom: "" };
}

/**
 * Quelqu'un a tapé l'adresse d'une personne sous un AUTRE nom (`nomPropose`, durcissement C4) :
 * la phrase de la fiche. L'adresse n'est pas vérifiée : l'écran le dit, et le responsable décide
 * (jamais de renommage d'office).
 */
export function phraseNomPropose(np: { nom: string; le: string }, tu: boolean): string {
  const quand = instantCourt(np.le);
  return `Quelqu'un a aussi tapé cette adresse sous le nom « ${np.nom} »${quand ? ` (le ${quand})` : ""}. L'adresse n'est pas vérifiée : si c'est le bon nom, ${tu ? "renomme" : "renommez"} la personne.`;
}

/**
 * Le nom d'un lien de la liste (`lien:<id>`, `participants`), tel que la colonne l'écrit ; `null`
 * quand la page ne le connaît pas (l'équipe ne voit pas les liens : on n'en invente pas le nom).
 */
export function nomDuLien(arbre: Arbre | null, cle: string): string | null {
  const n = arbre ? [...arbre.liens, ...(arbre.atelier ? [arbre.atelier] : [])].find((x) => x.cle === cle) : undefined;
  if (n) return n.nom;
  return cle === "participants" ? GROUPE_SANS_GROUPE : null;
}

/** L'annonce courte du téléphone : « 12 nouvelles · Léa, Hugo et 1 autre ». */
export function annonceCourte(participants: number, noms: readonly string[], personnes: number): string {
  const tete = `${nombre(participants)} nouvelle${participants > 1 ? "s" : ""}`;
  const prenoms = noms.filter((n) => n !== "Sans nom").slice(0, 2).map((n) => n.split(" ")[0]);
  if (!prenoms.length) return tete;
  const autres = Math.max(0, personnes - prenoms.length);
  return `${tete} · ${prenoms.join(autres ? ", " : " et ")}${autres ? ` et ${autres} autre${autres > 1 ? "s" : ""}` : ""}`;
}
