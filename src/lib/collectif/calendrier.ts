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
