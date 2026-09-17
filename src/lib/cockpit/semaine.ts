/**
 * Le calendrier du cockpit : des semaines ISO, du lundi 00:00 heure de Paris
 * au lundi suivant.
 *
 * Module PUR, éprouvé par scripts/verif-atelier.ts. Pas de librairie de
 * dates : `Intl` suffit, et la recette « minuit Paris » est celle
 * d'arrivees.ts (le serveur tourne en UTC, un lundi commence à Paris).
 *
 * ⚠️ On ne soustrait jamais 7 × 24 h à un instant pour trouver la semaine
 * d'avant : un changement d'heure ferait glisser la borne d'une heure et la
 * commande de 00:30 changerait de semaine.
 */

const CIVIL = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hour12: false,
});

type Civil = { y: number; m: number; j: number; h: number; min: number; jourSemaine: string };

function partiesParis(d: Date): Civil {
  const p = Object.fromEntries(CIVIL.formatToParts(d).map((x) => [x.type, x.value]));
  return {
    y: Number(p.year),
    m: Number(p.month),
    j: Number(p.day),
    /* `hour12: false` rend parfois « 24 » à minuit : on le ramène à 0. */
    h: Number(p.hour) % 24,
    min: Number(p.minute),
    jourSemaine: p.weekday,
  };
}

/** Minuit, heure de Paris, du jour civil (y, m, j) : l'instant UTC exact. */
function minuitParis(y: number, m: number, j: number): Date {
  const essai = new Date(Date.UTC(y, m - 1, j, 0, 0, 0));
  const { h, min } = partiesParis(essai);
  return new Date(essai.getTime() - (h * 60 + min) * 60_000);
}

const RANG_JOUR: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

export type Semaine = {
  /** AAAASS : l'année ISO puis le numéro de semaine ISO (202638). */
  cle: number;
  /** Le lundi 00:00 Paris, instant exact. */
  debut: Date;
  /** Le lundi suivant 00:00 Paris, exclu. */
  fin: Date;
  /** Le lundi, jour civil `AAAA-MM-JJ` (ce que porte `weekly_metrics.date_debut`). */
  dateDebut: string;
};

/** Le lundi 00:00 Paris de la semaine qui contient `d`. */
export function lundiDeLaSemaine(d: Date): Date {
  const p = partiesParis(d);
  const recul = RANG_JOUR[p.jourSemaine] ?? 0;
  const civil = new Date(Date.UTC(p.y, p.m - 1, p.j - recul));
  return minuitParis(civil.getUTCFullYear(), civil.getUTCMonth() + 1, civil.getUTCDate());
}

/** Le lundi 00:00 Paris situé `n` semaines après (ou avant, n < 0) `lundi`. */
export function lundiDecale(lundi: Date, n: number): Date {
  const p = partiesParis(lundi);
  const civil = new Date(Date.UTC(p.y, p.m - 1, p.j + 7 * n));
  return minuitParis(civil.getUTCFullYear(), civil.getUTCMonth() + 1, civil.getUTCDate());
}

/** La clé ISO (AAAASS) du lundi donné. Algorithme ISO 8601 sur le jour civil. */
export function cleSemaine(lundi: Date): number {
  const p = partiesParis(lundi);
  const d = new Date(Date.UTC(p.y, p.m - 1, p.j));
  const jour = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - jour);
  const an = d.getUTCFullYear();
  const numero = Math.ceil(((d.getTime() - Date.UTC(an, 0, 1)) / 86_400_000 + 1) / 7);
  return an * 100 + numero;
}

function dateIso(lundi: Date): string {
  const p = partiesParis(lundi);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.j).padStart(2, "0")}`;
}

export function semaineDe(lundi: Date): Semaine {
  return { cle: cleSemaine(lundi), debut: lundi, fin: lundiDecale(lundi, 1), dateDebut: dateIso(lundi) };
}

/* Un garde-fou, pas une limite métier : au-delà de deux ans de semaines,
   c'est qu'une date d'entrée est fausse, et on préfère un agrégat court à
   une boucle de dix mille lignes. */
export const MAX_SEMAINES = 104;

/**
 * Toutes les semaines COMPLÈTES entre `depuis` et `maintenant` : de la
 * semaine qui contient `depuis` jusqu'à la dernière dont le lundi suivant
 * est déjà passé. La semaine en cours n'y est jamais : un agrégat partiel
 * se lirait comme une chute.
 */
export function semainesCompletes(depuis: Date, maintenant: Date): Semaine[] {
  const out: Semaine[] = [];
  let lundi = lundiDeLaSemaine(depuis);
  while (out.length < MAX_SEMAINES) {
    const s = semaineDe(lundi);
    if (s.fin.getTime() > maintenant.getTime()) break;
    out.push(s);
    lundi = s.fin;
  }
  return out;
}
