/**
 * Le calendrier d'une édition, tel que l'atelier le règle (T-186, planche 5 du 19/10).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Tout ce qui se calcule ici travaille sur des JOURS DU CALENDRIER (« 2026-11-14 »)
 * et des heures écrites (« 23:59 »), jamais sur l'heure de la machine. Le jour
 * d'aujourd'hui à Paris vient du serveur (`versChampParis`), la conversion en
 * instant se fait au moment d'envoyer (`instantDeParis`, dates.ts). Ainsi un
 * raccourci « Dans 2 semaines » donne le même jour quel que soit le fuseau de
 * l'ordinateur de l'atelier.
 */

/** L'heure de clôture par défaut, heure de Paris : la collecte va jusqu'au bout du jour choisi. */
export const HEURE_CLOTURE = "23:59";

export type Raccourci = { cle: string; libelle: string; jours?: number; mois?: number };

/** Les raccourcis de la planche, dans l'ordre. Le choix au calendrier s'ajoute à l'écran. */
export const RACCOURCIS_CLOTURE: readonly Raccourci[] = [
  { cle: "2-semaines", libelle: "Dans 2 semaines", jours: 14 },
  { cle: "3-semaines", libelle: "Dans 3 semaines", jours: 21 },
  { cle: "1-mois", libelle: "Dans 1 mois", mois: 1 },
];

const JOUR = /^(\d{4})-(\d{2})-(\d{2})$/;
const CHAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;

function lireJour(jour: string): { a: number; m: number; j: number } | null {
  const x = JOUR.exec(jour);
  if (!x) return null;
  const [a, m, j] = x.slice(1).map(Number);
  const d = new Date(Date.UTC(a, m - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null;
  return { a, m, j };
}

const ecrire = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Un jour plus N jours, ou plus N mois. « Dans 1 mois » le 31 janvier donne le
 * 28 (ou 29) février : le dernier jour du mois, jamais le 3 mars.
 */
export function jourPlus(jour: string, r: { jours?: number; mois?: number }): string {
  const x = lireJour(jour);
  if (!x) return "";
  if (r.mois) {
    const cible = new Date(Date.UTC(x.a, x.m - 1 + r.mois, 1));
    const dernier = new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate();
    return ecrire(new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth(), Math.min(x.j, dernier))));
  }
  return ecrire(new Date(Date.UTC(x.a, x.m - 1, x.j + (r.jours ?? 0))));
}

/** La valeur d'un champ de clôture : « 2026-11-14T23:59 » (heure de Paris, sans fuseau). */
export function champCloture(jour: string, heure: string = HEURE_CLOTURE): string {
  return lireJour(jour) && /^\d{2}:\d{2}$/.test(heure) ? `${jour}T${heure}` : "";
}

/** « 2026-11-14T23:59 » → { jour, heure }, ou null. */
export function lireChampCloture(champ: string): { jour: string; heure: string } | null {
  const x = CHAMP.exec((champ ?? "").trim());
  if (!x || !lireJour(x[1])) return null;
  return { jour: x[1], heure: x[2] };
}

/** L'écart en jours du calendrier entre deux jours (négatif si `a` est avant `de`). */
export function joursEntre(de: string, a: string): number | null {
  const x = lireJour(de);
  const y = lireJour(a);
  if (!x || !y) return null;
  return Math.round((Date.UTC(y.a, y.m - 1, y.j) - Date.UTC(x.a, x.m - 1, x.j)) / 86_400_000);
}

const COURT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const LONG = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

/** « 19 oct. » ; vide si illisible. Un jour se lit sans fuseau : il n'a pas d'heure. */
export function formaterJourCourt(jour: string | null | undefined): string {
  const x = jour ? lireJour(jour) : null;
  return x ? COURT.format(new Date(Date.UTC(x.a, x.m - 1, x.j))) : "";
}

/** « 14 novembre » ; vide si illisible. */
export function formaterJourLong(jour: string | null | undefined): string {
  const x = jour ? lireJour(jour) : null;
  return x ? LONG.format(new Date(Date.UTC(x.a, x.m - 1, x.j))) : "";
}

/** « 23:59 » → « 23 h 59 ». */
export function formaterHeure(heure: string): string {
  const x = /^(\d{2}):(\d{2})$/.exec(heure);
  return x ? `${Number(x[1])} h ${x[2]}` : "";
}

/** La durée de la collecte, en jours du calendrier, telle que la frise l'écrit. */
export function phraseDuree(jours: number): string {
  if (jours <= 0) return "Jusqu'à ce soir pour déposer les photos";
  return `${jours} jour${jours > 1 ? "s" : ""} pour déposer les photos`;
}

export type PuceCloture = { cle: string; libelle: string; champ: string; actif: boolean };

/**
 * Les puces de la clôture : les trois raccourcis, et le jour choisi s'il n'en
 * est pas un, rangé à sa place dans le temps (la planche montre « 14 novembre »
 * entre « Dans 3 semaines » et « Dans 1 mois »).
 */
export function pucesCloture(aujourdhui: string, valeur: string): PuceCloture[] {
  const puces: PuceCloture[] = RACCOURCIS_CLOTURE.map((r) => {
    const champ = champCloture(jourPlus(aujourdhui, r));
    return { cle: r.cle, libelle: r.libelle, champ, actif: Boolean(champ) && champ === valeur };
  });
  const lu = lireChampCloture(valeur);
  if (!lu || puces.some((p) => p.actif)) return puces;
  const perso: PuceCloture = { cle: "choisie", libelle: formaterJourLong(lu.jour), champ: valeur, actif: true };
  const rang = puces.findIndex((p) => p.champ > valeur);
  return rang === -1 ? [...puces, perso] : [...puces.slice(0, rang), perso, ...puces.slice(rang)];
}

/* ─────────────── le calendrier Bellajour (T-189, planche 9 du 19/10 au soir) ───────────────
   Le mois en grille, lundi d'abord ; une PLAGE pour les dates de l'événement
   (écrite en toutes lettres dans `dates_texte`, relue de même), un JOUR pour la
   clôture et la livraison. Tout se calcule en jours du calendrier (« 2026-10-02 »),
   sans heure ni fuseau : le jour d'aujourd'hui vient du serveur (`versChampParis`). */

const NOMS_MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

const NOMS_JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;

/** Les initiales des colonnes, lundi d'abord (la planche : L M M J V S D). */
export const INITIALES_JOURS = ["L", "M", "M", "J", "V", "S", "D"] as const;

const MOIS = /^(\d{4})-(\d{2})$/;

/** « 2026-10-02 » est-il un jour qui existe ? */
export function estJourCalendrier(jour: string): boolean {
  return lireJour(jour) !== null;
}

/** « 2026-10-02 » → « 2026-10 ». Vide si illisible. */
export function moisDe(jour: string): string {
  return lireJour(jour) ? jour.slice(0, 7) : "";
}

/** Un mois plus N mois (N négatif pour reculer) : « 2026-12 » + 1 = « 2027-01 ». */
export function moisPlus(mois: string, n: number): string {
  const x = MOIS.exec(mois);
  if (!x) return "";
  const d = new Date(Date.UTC(Number(x[1]), Number(x[2]) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** « 2026-10 » → « Octobre 2026 » (le titre du panneau). */
export function titreMois(mois: string): string {
  const x = MOIS.exec(mois);
  if (!x) return "";
  const nom = NOMS_MOIS[Number(x[2]) - 1];
  return nom ? `${nom[0].toUpperCase()}${nom.slice(1)} ${x[1]}` : "";
}

export type CaseJour = { jour: string; dansLeMois: boolean };

/**
 * Les semaines d'un mois, du lundi au dimanche : la première commence le lundi
 * qui précède (ou qui est) le 1er, la dernière finit le dimanche qui suit (ou qui
 * est) le dernier jour. Quatre à six semaines selon le mois (novembre 2026 en a
 * six : le 30 est un lundi).
 */
export function grilleMois(mois: string): CaseJour[][] {
  const x = MOIS.exec(mois);
  if (!x) return [];
  const a = Number(x[1]);
  const m = Number(x[2]) - 1;
  const premier = new Date(Date.UTC(a, m, 1));
  const decalage = (premier.getUTCDay() + 6) % 7; /* lundi = 0 */
  const nbJours = new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
  const nbSemaines = Math.ceil((decalage + nbJours) / 7);
  const semaines: CaseJour[][] = [];
  for (let s = 0; s < nbSemaines; s++) {
    const semaine: CaseJour[] = [];
    for (let j = 0; j < 7; j++) {
      const d = new Date(Date.UTC(a, m, 1 - decalage + s * 7 + j));
      semaine.push({ jour: ecrire(d), dansLeMois: d.getUTCMonth() === m });
    }
    semaines.push(semaine);
  }
  return semaines;
}

/** « vendredi 2 octobre 2026 » : ce que lit un lecteur d'écran sur une case. */
export function libelleJour(jour: string): string {
  const x = lireJour(jour);
  if (!x) return "";
  const nom = NOMS_JOURS[new Date(Date.UTC(x.a, x.m - 1, x.j)).getUTCDay()];
  return `${nom} ${x.j === 1 ? "1er" : x.j} ${NOMS_MOIS[x.m - 1]} ${x.a}`;
}

/** Le jour où mène une touche du clavier dans la grille, ou `null` pour une autre touche. */
export function jourAuClavier(jour: string, touche: string): string | null {
  if (!lireJour(jour)) return null;
  if (touche === "ArrowLeft") return jourPlus(jour, { jours: -1 });
  if (touche === "ArrowRight") return jourPlus(jour, { jours: 1 });
  if (touche === "ArrowUp") return jourPlus(jour, { jours: -7 });
  if (touche === "ArrowDown") return jourPlus(jour, { jours: 7 });
  if (touche === "PageUp") return jourPlus(jour, { mois: -1 });
  if (touche === "PageDown") return jourPlus(jour, { mois: 1 });
  return null;
}

export type Plage = { debut: string; fin: string };

/**
 * Un clic dans le calendrier en PLAGE : le premier clic pose le début (un seul
 * jour, déjà valable), le second la fin ; un second clic AVANT le début devient
 * le début. Un troisième clic recommence. `enAttente` : on attend la fin.
 */
export function cliquerPlage(plage: Plage | null, enAttente: boolean, jour: string): { plage: Plage; enAttente: boolean } {
  if (!plage || !enAttente) return { plage: { debut: jour, fin: jour }, enAttente: true };
  return jour < plage.debut
    ? { plage: { debut: jour, fin: plage.fin }, enAttente: false }
    : { plage: { debut: plage.debut, fin: jour }, enAttente: false };
}

/** Le nombre de jours d'une plage, bornes comprises (du 2 au 4 : 3 jours). */
export function joursDansPlage(p: Plage): number {
  const n = joursEntre(p.debut, p.fin);
  return n === null ? 0 : Math.abs(n) + 1;
}

/** « 3 jours », « 1 jour » : le pied du calendrier en plage. */
export function phraseJoursPlage(p: Plage): string {
  const n = joursDansPlage(p);
  return `${n} jour${n > 1 ? "s" : ""}`;
}

/** Le pied du calendrier de clôture : « 26 jours pour déposer », le jour même « Jusqu'à ce soir ». */
export function phraseDepot(jours: number): string {
  if (jours <= 0) return "Jusqu'à ce soir";
  return `${jours} jour${jours > 1 ? "s" : ""} pour déposer`;
}

const ecrireJour = (j: number) => (j === 1 ? "1er" : String(j));

/**
 * La plage en toutes lettres, comme `dates_texte` la garde :
 * « le 2 octobre 2026 », « du 2 au 4 octobre 2026 »,
 * « du 30 septembre au 2 octobre 2026 », « du 28 décembre 2026 au 3 janvier 2027 ».
 * Une plage à l'envers est remise dans l'ordre ; illisible, vide.
 */
export function textePlage(p: Plage): string {
  const [d, f] = p.debut <= p.fin ? [p.debut, p.fin] : [p.fin, p.debut];
  const x = lireJour(d);
  const y = lireJour(f);
  if (!x || !y) return "";
  const md = NOMS_MOIS[x.m - 1];
  const mf = NOMS_MOIS[y.m - 1];
  if (d === f) return `le ${ecrireJour(x.j)} ${md} ${x.a}`;
  if (x.a === y.a && x.m === y.m) return `du ${ecrireJour(x.j)} au ${ecrireJour(y.j)} ${mf} ${y.a}`;
  if (x.a === y.a) return `du ${ecrireJour(x.j)} ${md} au ${ecrireJour(y.j)} ${mf} ${y.a}`;
  return `du ${ecrireJour(x.j)} ${md} ${x.a} au ${ecrireJour(y.j)} ${mf} ${y.a}`;
}

const sansAccent = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const NUMERO_MOIS = new Map(NOMS_MOIS.map((n, i) => [sansAccent(n), i + 1]));

function jourDe(j: string, mois: string, an: string): string | null {
  const m = NUMERO_MOIS.get(sansAccent(mois));
  const n = Number(j.replace(/er$/, ""));
  if (!m || !Number.isInteger(n)) return null;
  const jour = `${an}-${String(m).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
  return lireJour(jour) ? jour : null;
}

const J = "(1er|\\d{1,2})";
const M = "([a-zéèûô]+)";
const A = "(\\d{4})";
const LE = new RegExp(`^le ${J} ${M} ${A}$`);
const DU_MEME_MOIS = new RegExp(`^du ${J} au ${J} ${M} ${A}$`);
const DU_MEME_AN = new RegExp(`^du ${J} ${M} au ${J} ${M} ${A}$`);
const DU_DEUX_ANS = new RegExp(`^du ${J} ${M} ${A} au ${J} ${M} ${A}$`);

/**
 * Relire un `dates_texte` écrit par le calendrier (et ses variantes de casse,
 * d'espaces ou d'accents). Un texte d'avant, tapé à la main (« début octobre »),
 * rend `null` : l'écran le garde TEL QUEL, éditable, sans rien sélectionner.
 */
export function lirePlage(texte: string): Plage | null {
  const t = (texte ?? "").normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
  let debut: string | null = null;
  let fin: string | null = null;
  let x: RegExpExecArray | null;
  if ((x = LE.exec(t))) debut = fin = jourDe(x[1], x[2], x[3]);
  else if ((x = DU_MEME_MOIS.exec(t))) {
    debut = jourDe(x[1], x[3], x[4]);
    fin = jourDe(x[2], x[3], x[4]);
  } else if ((x = DU_MEME_AN.exec(t))) {
    debut = jourDe(x[1], x[2], x[5]);
    fin = jourDe(x[3], x[4], x[5]);
  } else if ((x = DU_DEUX_ANS.exec(t))) {
    debut = jourDe(x[1], x[2], x[3]);
    fin = jourDe(x[4], x[5], x[6]);
  }
  if (!debut || !fin || fin < debut) return null;
  return { debut, fin };
}
