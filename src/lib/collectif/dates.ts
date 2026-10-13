/**
 * Les dates que l'atelier saisit et lit : TOUJOURS à l'heure de Paris.
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Le champ `datetime-local` d'un formulaire rend « 2026-10-20T23:59 », sans
 * fuseau. Le lire avec `new Date()` le place à l'heure de la MACHINE : celle
 * de l'atelier n'est pas forcément Paris, et celle de Vercel est UTC. Une
 * clôture « à minuit » fermerait alors le lien participants deux heures trop
 * tôt ou trop tard. On convertit donc explicitement depuis Europe/Paris, et
 * la base ne reçoit qu'un instant ISO avec son fuseau (`lireInstant`, etats.ts).
 */

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const LISIBLE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });

/** « 21 octobre », heure de Paris. Vide si illisible. */
export function formaterJourParis(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? JOUR_MOIS.format(new Date(ms)) : "";
}

function morceaux(ms: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of PARTS.formatToParts(new Date(ms))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out;
}

/** L'écart de Paris avec UTC, en minutes, à l'instant `ms` (60 l'hiver, 120 l'été). */
function decalageParis(ms: number): number {
  const m = morceaux(ms);
  const commeUtc = Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute, m.second);
  return Math.round((commeUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

const CHAMP_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * « 2026-10-20T23:59 » lu à l'heure de Paris → instant ISO UTC, ou `null`.
 *
 * `null` aussi pour une heure qui n'EXISTE pas à Paris (la nuit du passage à
 * l'heure d'été, 2 h 30 n'a jamais lieu) : on ne la décale pas en silence.
 */
export function instantDeParis(local: string): string | null {
  const m = CHAMP_LOCAL.exec(typeof local === "string" ? local.trim() : "");
  if (!m) return null;
  const [an, mois, jour, heure, minute] = m.slice(1).map(Number);
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31 || heure > 23 || minute > 59) return null;
  const naif = Date.UTC(an, mois - 1, jour, heure, minute);
  /* Deux passes : le décalage dépend de l'instant qu'on cherche. */
  const essai = naif - decalageParis(naif) * 60000;
  const t = naif - decalageParis(essai) * 60000;
  return versChampParis(new Date(t).toISOString()) === `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`
    ? new Date(t).toISOString()
    : null;
}

/** Un instant → la valeur d'un champ `datetime-local` à l'heure de Paris. */
export function versChampParis(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const m = morceaux(ms);
  const d = (n: number) => String(n).padStart(2, "0");
  return `${m.year}-${d(m.month)}-${d(m.day)}T${d(m.hour)}:${d(m.minute)}`;
}

/** « 20 octobre 2026 à 23:59 », heure de Paris. Vide si illisible. */
export function formaterInstantParis(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return LISIBLE.format(new Date(ms));
}
