/* La page Photos du responsable : ce que l'écran demande à la route existante, et les petites règles pures qui rangent la
   grille (module PUR : aucun accès réseau, importable navigateur et harnais).

   REFAIT LE 22/10 (« Photos, en plus simple », planches 8 à 13, validées par Mathias) : le téléphone marche comme une
   application. La page ne garde que ce qui sert :
   - « Toutes » (la grille rangée par JOUR DE PRISE DE VUE, les plus récents en haut), « Par lien » (la mosaïque, un lien ouvert),
     et les PERSONNES choisies dans une feuille (plusieurs possibles) ; plus aucun filtre « Jour », ni ordre, ni « Ma sélection »,
     ni « Doublons », ni « Ne pas publier » côté client (les marques restent en base, l'atelier les lit) ;
   - la corbeille, nommée « Supprimées récemment », qu'on atteint par le « … ».
   Ce que la route lit : UNE clé de dossier (`dossiers.ts`) et une vue ; la vue est toujours `jour`. Une personne : `qui:<nom>` ;
   plusieurs : `quis:[…]` (`cleDePersonnes`) ; le responsable seul : `qui:@responsable`.
   Le fichier d'avant (les listes Jour et Afficher, la fiche d'une personne, renommer, fusionner) est dans
   `archive/photos-simple-2026-10/filtres.ts`. */

import { PHOTOS_PAR_GESTE } from "@/lib/collectif/corbeille";
import { clePersonne, cleDePersonnes, PERSONNES_MAX, QUI_RESPONSABLE, QUIS, type Arbre, type Noeud } from "@/lib/collectif/dossiers";
import { GROUPE_SANS_GROUPE } from "@/lib/collectif/partage";

export type Mode = "tout" | "liens";
export type VueRoute = "toutes" | "jour" | "doublons" | "signalees";

export type Filtres = {
  /** « Toutes » (la grille) ou « Par lien » (la mosaïque des liens, puis le lien ouvert). */
  mode: Mode;
  /** Le lien ouvert : `lien:<id>`, `participants` (« Sans groupe »), `vous` (Mes photos), `atelier`. */
  lien: string | null;
  /** Un dossier du responsable (`resp:…`), dans « Mes photos ». */
  dossier: string | null;
  /** Les personnes choisies dans la feuille « Personnes » : `qui:<nom comparé>` ; le responsable (`qui:@responsable`) ne se choisit qu'AVANT tout autre (« Voir qui l'a envoyée »). */
  personnes: string[];
  /** « Supprimées récemment » (la corbeille de 30 jours) : un endroit à part, le responsable seul. */
  corbeille: boolean;
};

export const FILTRES_VIDES: Filtres = { mode: "tout", lien: null, dossier: null, personnes: [], corbeille: false };

/** Ce que la route reçoit : une clé de dossier et une vue (toujours `jour` : la grille est rangée par jour de prise de vue). */
export function requeteDe(f: Filtres): { dossier: string; vue: VueRoute } {
  const noms = f.personnes.filter((c) => c.startsWith("qui:") && c !== QUI_RESPONSABLE).map((c) => c.slice(4));
  const responsable = f.personnes.includes(QUI_RESPONSABLE);
  /* Le responsable seul, ou des participants : la clé la plus précise gagne (`cleDePersonnes`, dossiers.ts). */
  const personnes = responsable && noms.length === 0 ? QUI_RESPONSABLE : cleDePersonnes(noms);
  const dossier = personnes ?? f.dossier ?? f.lien ?? (f.mode === "liens" ? "liens" : "tout");
  return { dossier, vue: "jour" };
}

/** « Par lien » sans lien ouvert : les albums, pas de grille. */
export const estVueAlbums = (f: Filtres) => f.mode === "liens" && !f.lien && !f.corbeille;

/**
 * La vue range les DERNIÈRES ARRIVÉES en tête : une photo qui arrive y entre en haut. Vrai pour toute grille : les photos sans date
 * de prise de vue viennent d'abord, la dernière arrivée en tête (`TRI_JOUR`), et une photo datée entre sous son jour. Pas la corbeille
 * (`accueilDesArrivees` : y insérer d'office déplacerait ce que l'on regarde).
 */
export const montreLesDernieres = (f: Filtres) => !f.corbeille;

/** « Supprimées récemment » : un endroit à part, rien d'autre ne s'y croise (le lien ouvert est gardé pour le retour). */
export function avecCorbeille(f: Filtres): Filtres {
  return { ...FILTRES_VIDES, corbeille: true, mode: f.mode, lien: f.lien };
}
/** Tout autre geste sort de la corbeille. */
export const sortirDeLaCorbeille = (f: Filtres): Filtres => (f.corbeille ? { ...f, corbeille: false } : f);

/** Lire `?dossier=` (le tableau de bord y mène) en filtres. `mode=tout` garde un lien coché dans « Tout ». Une clé d'avant (Ma sélection, personnes, page d'une personne) retombe sur « Toutes ». */
export function filtresDepuis(cle: string, modeTout = false): Filtres {
  const f = { ...FILTRES_VIDES };
  if (cle === "corbeille") return { ...f, corbeille: true };
  if (cle === "liens") return { ...f, mode: "liens" };
  if (cle === "vous" || cle === "participants" || cle === "atelier" || cle.startsWith("lien:")) return { ...f, mode: modeTout ? "tout" : "liens", lien: cle };
  if (cle.startsWith("resp:")) return { ...f, mode: modeTout ? "tout" : "liens", lien: "vous", dossier: cle };
  /* La page d'une personne d'un lien n'existe plus : on ouvre le lien (ses personnes sont des pastilles). */
  if (cle.startsWith("pers:")) {
    const id = cle.slice(5, cle.indexOf(":", 5));
    return { ...f, mode: modeTout ? "tout" : "liens", lien: id === "general" ? "participants" : `lien:${id}` };
  }
  if (cle.startsWith("qui:")) return { ...f, personnes: [cle] };
  return f;
}

/** L'adresse qui rouvre le même endroit (replaceState, rien ne s'empile). Plusieurs personnes ne s'écrivent pas dans l'adresse. */
export function adresseDe(f: Filtres): string {
  if (f.corbeille) return "?dossier=corbeille";
  const { dossier } = requeteDe(f);
  if (dossier === "tout" || dossier.startsWith(QUIS)) return "";
  const tout = f.mode === "tout" && f.lien ? "&mode=tout" : "";
  return `?dossier=${encodeURIComponent(dossier)}${tout}`;
}

/** Choisir un lien : le dossier et les personnes d'avant tombent (sauf en revenant à « Par lien », où une personne choisie reste). */
export function avecLien(f: Filtres, lien: string | null): Filtres {
  return { ...f, lien, dossier: null, personnes: lien === null ? f.personnes : [], corbeille: false };
}

/** Les personnes de la feuille : toutes celles de l'édition, sauf le responsable (« Mes photos » est un lien, pas une personne). */
export function personnesDeLaFeuille(arbre: Arbre | null): Noeud[] {
  return arbre ? arbre.personnes.filter((x) => x.cle !== QUI_RESPONSABLE) : [];
}

/** Choisir (ou défaire) une personne dans la feuille : plusieurs possibles, le responsable seul n'y reste pas, au plus `PERSONNES_MAX`. */
export function avecPersonne(f: Filtres, cle: string): Filtres {
  const sansResp = f.personnes.filter((c) => c !== QUI_RESPONSABLE);
  if (sansResp.includes(cle)) return { ...f, personnes: sansResp.filter((c) => c !== cle) };
  if (sansResp.length >= PERSONNES_MAX) return { ...f, personnes: sansResp };
  return { ...f, personnes: [...sansResp, cle] };
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

/** « sam. 7 nov. » (la ligne de la photo agrandie). Une photo sans date de prise de vue prend son JOUR D'ARRIVÉE (22/10) : elle se dit pareil. */
export function jourCourt(cle: string): string {
  const p = partiesDuJour(cle);
  if (!p) return cle;
  const j = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  return `${JOURS_COURTS[j]} ${p.d} ${MOIS_COURTS[p.m - 1]}`;
}

/** « Samedi 4 octobre » (l'intertitre d'un jour, planche 10), « Mardi 1er octobre » ; un jour d'arrivée (`~…`) se dit pareil. Lu SANS fuseau. */
export function jourTitre(cle: string): string {
  const p = partiesDuJour(cle);
  if (!p) return cle;
  const j = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  const t = `${JOURS[j]} ${p.d === 1 ? "1er" : p.d} ${MOIS[p.m - 1]}`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Un jour de la grille : son intertitre (« Samedi 4 octobre · 214 ») et ses photos. */
export type GroupeJour<P> = { cle: string; titre: string; n: number; complet: boolean; photos: P[] };

/**
 * LA GRILLE PAR JOUR (22/10, planche 10) : les photos rendues par la route (déjà rangées par jour de prise de vue, les plus récents en
 * haut, les photos sans date en tête, `TRI_JOUR`) en groupes de jours qui se SUIVENT. Une photo sans date prend son jour d'arrivée
 * (sa clé `~2026-10-21` se lit `2026-10-21`). Le nombre d'un jour n'est sûr qu'une fois le jour fini : un groupe est complet quand un jour
 * suivant a commencé, ou que la vue est lue jusqu'au bout (`toutLu`) ; l'écran ne montre pas un nombre qui ne l'est pas.
 */
export function regrouperParJour<P extends { jourCle: string }>(photos: readonly P[], toutLu: boolean): GroupeJour<P>[] {
  const jourDe = (k: string) => (k.startsWith("~") ? k.slice(1) : k);
  const groupes: GroupeJour<P>[] = [];
  for (const p of photos) {
    const cle = jourDe(p.jourCle);
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.cle === cle) dernier.photos.push(p);
    else groupes.push({ cle, titre: jourTitre(cle), n: 0, complet: false, photos: [p] });
  }
  return groupes.map((g, i) => ({ ...g, n: g.photos.length, complet: toutLu || i < groupes.length - 1 }));
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

/** « La voir » : le filtre qui montre la photo restaurée : son lien s'ouvre (ses personnes y sont des pastilles, plus de page d'une personne). */
export function filtreDuRetour(lien: string): Filtres {
  return filtresDepuis(lien === "vous" || lien === "atelier" || lien === "participants" || lien.startsWith("lien:") ? lien : "tout");
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
