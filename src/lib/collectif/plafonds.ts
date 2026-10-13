/**
 * Les plafonds de photos (PRD §5.1, §5.2, §9.1).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Trois chiffres, tous réglés par l'atelier ou le responsable, aucun deviné ici :
 * - `plafond_participant_atelier` : le plus que l'atelier autorise par personne ;
 * - `plafond_participant_client` : ce que le responsable a réglé au curseur,
 *   toujours ≤ le précédent (contrainte en base ET ici) ;
 * - `plafond_total` : le plus pour toute l'édition, tenu côté serveur.
 *
 * Qui y est soumis (choix du 13/10/2026, à la validation du plan de la phase 0) :
 * - l'ATELIER échappe à tout ;
 * - le RESPONSABLE et les liens de provenance `sans_plafond` (le photographe)
 *   n'ont pas de plafond PAR PERSONNE, mais le total de l'édition les compte.
 *   La maquette de création l'écrit ainsi : « sans plafond par personne » ;
 * - le PARTICIPANT a les deux. Son plafond par personne est tenu PAR APPAREIL
 *   (un cookie) : c'est un frein honnête, pas une garantie, et l'écran ne
 *   prétend pas le contraire. Le total, lui, ne se contourne pas.
 *
 * ⚠️ UN PLAFOND NON RÉGLÉ FERME, IL N'OUVRE PAS. `null` veut dire « l'atelier
 * n'a pas encore saisi le chiffre » : on refuse le dépôt avec une phrase qui
 * le dit, plutôt que d'ouvrir sans limite ou d'inventer une valeur.
 */

import type { RoleDeposant } from "./types";

export type ReglagesPlafond = {
  plafond_participant_atelier: number | null;
  plafond_participant_client: number | null;
  plafond_total: number | null;
};

export type RaisonPlafond = "plafond_participant" | "plafond_total" | "plafond_non_regle";

/** Ce que l'écran dit quand un dépôt est refusé ou tronqué. */
export const MESSAGE_PLAFOND: Record<RaisonPlafond, string> = {
  plafond_participant:
    "Vous avez atteint le nombre de photos prévu par personne sur cet appareil.",
  plafond_total:
    "L'édition a reçu toutes les photos prévues. L'atelier peut relever ce plafond.",
  plafond_non_regle:
    "Le dépôt n'est pas encore ouvert : le nombre de photos n'a pas été réglé par l'atelier.",
};

/** Un entier ≥ 1 saisi à l'écran, `null` pour un champ vide, `undefined` si illisible. */
export function lireEntierPositif(v: unknown): number | null | undefined {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isInteger(n) || n < 1) return undefined;
  return n;
}

/**
 * Le plafond par personne en vigueur : celui du curseur s'il est réglé, borné
 * par celui de l'atelier ; celui de l'atelier sinon ; `null` si l'atelier n'a
 * rien réglé (et alors le curseur ne compte pas : il ne peut pas valoir plus
 * qu'un plafond qui n'existe pas).
 */
export function plafondParticipant(r: ReglagesPlafond): number | null {
  const atelier = r.plafond_participant_atelier;
  if (atelier === null) return null;
  const client = r.plafond_participant_client;
  return client === null ? atelier : Math.min(client, atelier);
}

export type Reglage =
  | { ok: true; patch: Partial<ReglagesPlafond> }
  | { ok: false; message: string };

/** Le curseur du responsable (ou de l'atelier qui règle à sa place). */
export function reglerPlafondClient(valeur: unknown, r: ReglagesPlafond): Reglage {
  const atelier = r.plafond_participant_atelier;
  if (atelier === null) {
    return { ok: false, message: "Le plafond de l'atelier n'est pas encore réglé." };
  }
  const n = lireEntierPositif(valeur);
  if (n === undefined || n === null) {
    return { ok: false, message: "Indiquer un nombre de photos entier, au moins 1." };
  }
  if (n > atelier) {
    return { ok: false, message: `Au plus ${atelier} photos par personne pour cette édition.` };
  }
  return { ok: true, patch: { plafond_participant_client: n } };
}

/**
 * Le plafond de l'atelier. S'il descend sous le curseur du responsable, le
 * curseur DESCEND AVEC lui dans la même écriture : sinon la contrainte de la
 * base refuserait la mise à jour, et l'atelier ne comprendrait pas pourquoi.
 * Vider le champ vide aussi le curseur (même contrainte).
 */
export function reglerPlafondAtelier(valeur: unknown, r: ReglagesPlafond): Reglage {
  const n = lireEntierPositif(valeur);
  if (n === undefined) {
    return { ok: false, message: "Indiquer un nombre de photos entier, au moins 1, ou laisser vide." };
  }
  if (n === null) {
    return { ok: true, patch: { plafond_participant_atelier: null, plafond_participant_client: null } };
  }
  const client = r.plafond_participant_client;
  if (client !== null && client > n) {
    return { ok: true, patch: { plafond_participant_atelier: n, plafond_participant_client: n } };
  }
  return { ok: true, patch: { plafond_participant_atelier: n } };
}

/* ────────────────────────────── la place restante ────────────────────────────── */

export type Deposant = {
  role: RoleDeposant;
  /** Le lien de provenance utilisé lève-t-il le plafond par personne ? */
  sansPlafond: boolean;
  /** Ce que CET appareil a déjà déposé (déclaré ou arrivé). */
  dejaParAppareil: number;
};

export type Place =
  | { illimitee: true }
  | {
      illimitee: false;
      /** Combien de photos peuvent encore entrer. */
      place: number;
      /** Ce qui borne `place` (ou l'a ramenée à zéro). */
      borne: RaisonPlafond;
    };

/**
 * Combien de photos ce déposant peut encore envoyer, sachant que l'édition en
 * compte déjà `totalEdition` (déclarées ou arrivées).
 */
export function placeRestante(r: ReglagesPlafond, d: Deposant, totalEdition: number): Place {
  if (d.role === "atelier") return { illimitee: true };

  if (r.plafond_total === null) return { illimitee: false, place: 0, borne: "plafond_non_regle" };
  const resteTotal = Math.max(0, r.plafond_total - Math.max(0, totalEdition));

  if (d.role === "responsable" || d.sansPlafond) {
    return { illimitee: false, place: resteTotal, borne: "plafond_total" };
  }

  const parPersonne = plafondParticipant(r);
  if (parPersonne === null) return { illimitee: false, place: 0, borne: "plafond_non_regle" };
  const restePerso = Math.max(0, parPersonne - Math.max(0, d.dejaParAppareil));

  /* À égalité, c'est le total qui est cité : « l'édition est pleine » est
     plus vrai que « vous avez assez déposé » quand les deux le sont. */
  return restePerso < resteTotal
    ? { illimitee: false, place: restePerso, borne: "plafond_participant" }
    : { illimitee: false, place: resteTotal, borne: "plafond_total" };
}

export type Tranche = {
  acceptees: number;
  refusees: number;
  /** Pourquoi une partie du lot est refusée, ou `null` si tout passe. */
  raison: RaisonPlafond | null;
};

/** Un lot de `demandees` photos face à la place restante : accepté en tout ou en partie. */
export function trancherLot(demandees: number, place: Place): Tranche {
  const n = Math.max(0, Math.floor(demandees));
  if (place.illimitee) return { acceptees: n, refusees: 0, raison: null };
  const acceptees = Math.min(n, place.place);
  const refusees = n - acceptees;
  return { acceptees, refusees, raison: refusees > 0 ? place.borne : null };
}
