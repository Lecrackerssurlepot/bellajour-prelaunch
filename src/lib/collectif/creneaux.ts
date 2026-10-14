/**
 * Les créneaux de rendez-vous de l'Édition collective (D23, T-148).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Les règles sont celles de Mathias (14/10/2026) : du lundi au vendredi, de
 * 10 h à 18 h, à l'heure de Paris, des créneaux de 30 minutes ; on peut
 * réserver jusqu'à la demi-heure qui arrive, sans délai minimum, aussi loin
 * qu'il y a de la place. Un créneau est libre quand rien ne le CHEVAUCHE dans
 * l'agenda de l'interlocuteur : de cet agenda, on ne connaît que des plages
 * occupées, jamais leur contenu (agenda.ts).
 *
 * Tout se calcule en dates de Paris puis se convertit (`instantDeParis`) :
 * « 10 h » reste 10 h le jour du passage à l'heure d'hiver.
 */

import { formaterHeureParis, instantDeParis, versChampParis } from "./dates";
import { lireInstant } from "./etats";

export const REGLES_RDV = {
  /** Jours ISO : 1 = lundi … 5 = vendredi. */
  jours: [1, 2, 3, 4, 5],
  ouverture: "10:00",
  fermeture: "18:00",
  dureeMinutes: 30,
} as const;

/**
 * Garde-fou, pas une promesse : au plus trois rendez-vous À VENIR par
 * édition. Un clic de trop ou un double envoi ne remplit pas l'agenda.
 */
export const RDV_A_VENIR_MAX = 3;

/**
 * Jusqu'où on navigue dans les semaines : « aussi loin qu'il y a de la
 * place » (Mathias), borné à un an pour qu'une requête ne parte pas dans
 * dix ans. Une garde technique, pas une règle de l'atelier.
 */
export const SEMAINES_MAX = 52;

/** Un motif tient en une phrase : l'atelier le lit dans son agenda. */
export const MOTIF_MAX = 500;

export type Plage = { debut: string; fin: string };
export type Creneau = Plage;

const JOUR = /^(\d{4})-(\d{2})-(\d{2})$/;

function versJour(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function hhmm(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Le jour de la semaine ISO (1 = lundi) d'une date de calendrier AAAA-MM-JJ. */
export function jourIso(jour: string): number {
  const m = JOUR.exec(jour);
  if (!m) return 0;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Ajoute `n` jours à une date de calendrier, sans fuseau. */
export function plusJours(jour: string, n: number): string {
  const m = JOUR.exec(jour);
  if (!m) return jour;
  return versJour(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n));
}

/** Le lundi (AAAA-MM-JJ, Paris) de la semaine de `maintenant`, décalé de `decalage` semaines. */
export function lundiDeSemaine(maintenant: Date, decalage = 0): string {
  const aujourdhui = versChampParis(maintenant.toISOString()).slice(0, 10);
  return plusJours(aujourdhui, 1 - jourIso(aujourdhui) + 7 * Math.trunc(decalage));
}

/** Les jours ouvrés d'une semaine (ceux des règles), à partir de son lundi. */
export function joursOuvres(lundi: string, regles = REGLES_RDV): string[] {
  return regles.jours.map((j) => plusJours(lundi, j - 1));
}

/** Les débuts de créneau d'une journée, en heure de Paris : 10:00, 10:30… 17:30. */
export function heuresDeDebut(regles = REGLES_RDV): string[] {
  const sortie: string[] = [];
  for (let t = minutes(regles.ouverture); t + regles.dureeMinutes <= minutes(regles.fermeture); t += regles.dureeMinutes) sortie.push(hhmm(t));
  return sortie;
}

/** Les créneaux d'une journée, en instants (ISO UTC). Un jour hors règles n'en a aucun. */
export function creneauxDuJour(jour: string, regles = REGLES_RDV): Creneau[] {
  if (!(regles.jours as readonly number[]).includes(jourIso(jour))) return [];
  return heuresDeDebut(regles)
    .map((h) => instantDeParis(`${jour}T${h}`))
    .filter((d): d is string => d !== null)
    .map((debut) => ({ debut, fin: new Date(Date.parse(debut) + regles.dureeMinutes * 60000).toISOString() }));
}

/** Deux plages se chevauchent-elles ? Bord contre bord (10:30 fin, 10:30 début) : non. */
export function chevauche(a: Plage, b: Plage): boolean {
  return Date.parse(a.debut) < Date.parse(b.fin) && Date.parse(b.debut) < Date.parse(a.fin);
}

/**
 * Les créneaux LIBRES d'une liste : à venir (le début strictement après
 * `maintenant`, la demi-heure qui arrive comprise) et que rien ne chevauche.
 * `ignorer` : une plage à ne pas compter comme occupée (le rendez-vous qu'on
 * déplace, qui occupe encore son propre créneau dans l'agenda).
 */
export function creneauxLibres(creneaux: readonly Creneau[], occupes: readonly Plage[], maintenant: Date, ignorer: Plage | null = null): Creneau[] {
  const t = maintenant.getTime();
  const vraimentOccupes = ignorer ? occupes.filter((o) => !(o.debut === ignorer.debut && o.fin === ignorer.fin)) : occupes;
  return creneaux.filter((c) => Date.parse(c.debut) > t && !vraimentOccupes.some((o) => chevauche(c, o)));
}

/**
 * Un début de créneau demandé par le navigateur → le créneau, ou `null`.
 * Il doit tomber EXACTEMENT sur un créneau des règles (un jour ouvré, une
 * heure de la liste) et être à venir : on ne fait jamais confiance à une
 * heure tapée à la main.
 */
export function lireCreneau(v: unknown, maintenant: Date, regles = REGLES_RDV): Creneau | null {
  const ms = lireInstant(v);
  if (ms === null || ms <= maintenant.getTime()) return null;
  const iso = new Date(ms).toISOString();
  const local = versChampParis(iso);
  const trouve = creneauxDuJour(local.slice(0, 10), regles).find((c) => c.debut === iso);
  return trouve ?? null;
}

const JOUR_LONG = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
const JOUR_CALENDRIER = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

/** « jeudi 15 octobre à 10 h 30 », heure de Paris. */
export function libelleCreneau(debut: string): string {
  const ms = Date.parse(debut);
  if (!Number.isFinite(ms)) return "";
  return `${JOUR_LONG.format(new Date(ms))} à ${formaterHeureParis(debut)}`;
}

/** « jeudi 15 octobre » pour une date de calendrier AAAA-MM-JJ. */
export function libelleJour(jour: string): string {
  const m = JOUR.exec(jour);
  if (!m) return "";
  return JOUR_CALENDRIER.format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))));
}

/** Le motif facultatif d'un rendez-vous : une phrase, bornée, vide = rien. */
export function lireMotif(v: unknown): string | null {
  const t = typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, MOTIF_MAX) : "";
  return t || null;
}

export type ReglageAgenda = { ok: true; agenda_id: string | null; meet_url: string | null; actif: boolean } | { ok: false; message: string };

/**
 * Le réglage d'un interlocuteur dans /admin/collectif/agendas : l'identifiant
 * de son agenda Google (pour l'agenda principal, son adresse Gmail) et son
 * lien visio. Vide = pas encore relié.
 */
export function lireReglageAgenda(corps: Record<string, unknown>): ReglageAgenda {
  const agenda = typeof corps.agenda_id === "string" ? corps.agenda_id.trim() : "";
  const meet = typeof corps.meet_url === "string" ? corps.meet_url.trim() : "";
  if (agenda && (agenda.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agenda))) {
    return { ok: false, message: "L'agenda : l'adresse Gmail de la personne (ou l'identifiant de l'agenda, qui contient un @)." };
  }
  if (meet && (meet.length > 300 || !/^https:\/\/\S+$/.test(meet))) return { ok: false, message: "Le lien visio : une adresse qui commence par https://." };
  return { ok: true, agenda_id: agenda || null, meet_url: meet || null, actif: corps.actif !== false };
}

