/**
 * Le lien du responsable ne s'ouvre que sur un appareil reconnu (T-154).
 * Module PUR : aucun accès base, aucun réseau. Les réglages et la forme des
 * choses ; ce qui lit et écrit est dans `appareils.ts`.
 *
 * Décision de Mathias du 15/10 : « un code sur chaque appareil ». La première
 * fois que le lien du responsable s'ouvre sur un téléphone ou un ordinateur,
 * un code à 6 chiffres part à SON adresse ; l'appareil est ensuite reconnu
 * (un cookie httpOnly porte un identifiant aléatoire, la base n'en garde que
 * l'empreinte). Un lien transmis ne sert à rien sans sa boîte mail.
 *
 * Ne changent pas : le lien de l'équipe (lecture seule, fait pour être
 * partagé) et celui des participants. L'atelier connecté passe toujours.
 *
 * ⚠️ Le contrôle n'est actif que si `COLLECTIF_CODE_APPAREIL` ET
 * `COLLECTIF_MAILS` sont ouverts : sans mail, personne ne recevrait son code
 * et le responsable resterait dehors.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { ACTIONS_ECRITURE, peut, type Action } from "./droits";
import { lireInterrupteur } from "./interrupteur";

export const VAR_CODE_APPAREIL = "COLLECTIF_CODE_APPAREIL";
/** Le cookie de l'appareil : un identifiant aléatoire, le même pour toutes les éditions. */
export const COOKIE_APPAREIL = "bj_ec_appareil";
/** Un an : au-delà, on redemande un code (les navigateurs plafonnent à 400 jours). */
export const DUREE_APPAREIL_S = 365 * 24 * 60 * 60;

/* ── Réglages SOUPLES, choisis le 16/10 sur délégation de Mathias : « tu choisis,
   mais il faut pas que ça soit très compliqué pour les gens […] c'est pour créer
   un magazine ». Un frein contre les modifications, pas un coffre-fort. ── */
/** Durée de validité d'un code : le temps d'ouvrir ses mails sans se presser. */
export const DUREE_CODE_MS = 24 * 60 * 60_000;
/** Essais par code : au-delà, il faut en redemander un. */
export const ESSAIS_MAX = 10;

/**
 * Le verdict d'un essai, sur le numéro d'essai RÉSERVÉ en base (`essais` après
 * l'incrément atomique, jamais une valeur relue avant) : trente essais en
 * parallèle qui lisaient tous « 0 » passaient tous (charge-1, 26/10).
 */
export function verdictEssai(essaiReserve: number, bon: boolean): { etat: "ok" | "faux" | "bloque"; restants?: number } {
  if (essaiReserve > ESSAIS_MAX) return { etat: "bloque" };
  if (bon) return { etat: "ok" };
  return essaiReserve >= ESSAIS_MAX ? { etat: "bloque" } : { etat: "faux", restants: ESSAIS_MAX - essaiReserve };
}
/** Codes envoyés par heure pour une même édition : un frein contre l'envoi en rafale. */
export const CODES_PAR_HEURE = 10;

/** « 24 heures », « 1 heure », « 15 minutes » : la durée telle qu'elle s'écrit dans le mail. */
export function libelleDuree(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes % 60 !== 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  const heures = minutes / 60;
  return `${heures} heure${heures > 1 ? "s" : ""}`;
}

/** Le contrôle est-il en service ? (Lu à chaque appel ; une valeur incomprise FERME.) */
export function controleAppareilActif(env: Record<string, string | undefined>): boolean {
  return lireInterrupteur(env[VAR_CODE_APPAREIL]).ouvert && lireInterrupteur(env.COLLECTIF_MAILS).ouvert;
}

/* ── Le premier appareil (décision de Mathias du 28/10) ──
   « Le premier appareil qui utilise le lien du responsable devient l'appareil
   reconnu, sans code. Le code ne sert qu'aux appareils suivants. » Le lien
   « Ton espace est prêt » n'est envoyé qu'au responsable : lui demander un code
   la toute première fois ne protégeait rien.
   ⚠️ La place se prend à la PREMIÈRE ÉCRITURE, jamais à l'affichage ni sur une
   lecture : les robots des messageries (Outlook Safe Links, Microsoft Defender,
   certains antivirus) ouvrent les liens des mails dans un vrai navigateur qui
   exécute le JavaScript, et prendraient la place du responsable. Une place libre
   est celle du lien ACTUEL : régénérer le lien du responsable la libère. */

/** Ce que la porte sait de l'appareil : reconnu pour le lien actuel, et si la place est encore libre. */
export type LectureAppareil = { reconnu: boolean; libre: boolean };

/**
 * Le verdict de la porte pour le lien du responsable. `responsable` : il modifie ;
 * `place_libre` : il modifie aussi (page complète), et sa première écriture prendra
 * la place ; `lecture` : un appareil suivant, le code par mail.
 * `lu` null : la table manque, le contrôle ne s'applique pas.
 */
export type VerdictAppareil = "responsable" | "place_libre" | "lecture";

export function verdictAppareil(e: { controleActif: boolean; atelier: boolean; lu: LectureAppareil | null }): VerdictAppareil {
  if (!e.controleActif || e.atelier || !e.lu || e.lu.reconnu) return "responsable";
  return e.lu.libre ? "place_libre" : "lecture";
}

/** Une place libre ne se prend que pour une ÉCRITURE que le responsable a le droit de faire. */
export function prendLaPlace(verdict: VerdictAppareil, action: Action): boolean {
  return verdict === "place_libre" && ACTIONS_ECRITURE.includes(action) && peut("responsable", action);
}

/** Le motif d'une reconnaissance, tel que le journal l'écrit. */
export type MotifReconnaissance = "code" | "premier_appareil";

/**
 * Deux premiers appareils en même temps (aucune contrainte d'unicité par édition :
 * l'index unique porte aussi l'appareil). Chacun relit les lignes vivantes du lien
 * après la sienne : la plus ancienne garde la place (`reconnu_le`, puis `id` pour
 * départager une égalité), le même ordre pour les deux, donc un seul gagnant.
 */
export function gagnantDeLaPlace<L extends { id: string; reconnu_le: string }>(lignes: readonly L[]): L | null {
  return [...lignes].sort((a, b) => (a.reconnu_le < b.reconnu_le ? -1 : a.reconnu_le > b.reconnu_le ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0] ?? null;
}

/** L'empreinte d'un identifiant, d'un lien ou d'un code : jamais la valeur en base. */
export function empreinte(texte: string): string {
  return createHash("sha256").update(texte).digest("hex");
}

/** L'empreinte d'un code, LIÉE à l'appareil qui l'a demandé. */
export function empreinteCode(appareilEmpreinte: string, code: string): string {
  return empreinte(`${appareilEmpreinte}:${code}`);
}

/** Deux empreintes égales, comparées à durée constante. */
export function memeEmpreinte(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Un identifiant d'appareil bien formé : 32 à 64 caractères base64url. */
export function idAppareilValide(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(v);
}

/** Ce que la personne a tapé, ramené à 6 chiffres (« 123 456 », « 123-456 ») ; sinon null. */
export function lireCode(saisie: unknown): string | null {
  if (typeof saisie !== "string") return null;
  const chiffres = saisie.replace(/[\s.-]/g, "");
  return /^\d{6}$/.test(chiffres) ? chiffres : null;
}

/** « 123 456 » : le code tel qu'il s'écrit dans le mail. */
export function codeAffiche(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/** « c***@exemple.fr » : à qui part le code, sans révéler l'adresse entière à qui a le lien. */
export function adresseMasquee(email: string): string {
  const [nom, domaine] = email.split("@");
  if (!domaine) return "***";
  return `${nom.slice(0, 1)}***@${domaine}`;
}
