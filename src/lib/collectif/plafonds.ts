/**
 * Les plafonds de photos (PRD §5.1, §5.2, §9.1).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Trois chiffres, tous réglés par l'atelier ou le responsable, aucun deviné ici :
 * - `plafond_participant_atelier` : le plus que l'atelier autorise par personne ;
 * - `plafond_participant_client` : ce que le responsable a réglé au curseur,
 *   toujours ≤ le précédent (contrainte en base ET ici) ;
 * - `plafond_total` : le plus pour toute l'édition, tenu côté serveur ;
 *   VIDE, il veut dire « pas de limite pour toute l'édition » (D27, décision
 *   de Mathias du 20/10 : « on ne sait pas forcément combien il y aura ») :
 *   seuls les plafonds par personne et par lien s'appliquent alors.
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
 * ⚠️ UN PLAFOND PAR PERSONNE NON RÉGLÉ FERME, IL N'OUVRE PAS. `null` veut dire
 * « l'atelier n'a pas encore saisi le chiffre » : on refuse le dépôt du
 * participant (lien général, ou lien sans plafond propre ni « sans limite »)
 * avec une phrase qui le dit, plutôt que d'ouvrir sans limite ou d'inventer
 * une valeur. La page de dépôt le dit AVANT le choix des photos (`depotRegle`).
 * Le TOTAL est l'exception (D27) : vide, il n'est pas « non réglé », il est
 * « sans limite ».
 */

import type { RoleDeposant } from "./types";

export type ReglagesPlafond = {
  plafond_participant_atelier: number | null;
  plafond_participant_client: number | null;
  plafond_total: number | null;
};

export type RaisonPlafond = "plafond_participant" | "plafond_total" | "plafond_non_regle";

/** Ce que l'écran dit quand un dépôt est refusé ou tronqué (au vouvoiement ; `messagePlafond` suit le registre). */
export const MESSAGE_PLAFOND: Record<RaisonPlafond, string> = {
  plafond_participant:
    "Vous avez atteint le nombre de photos prévu par personne.",
  plafond_total:
    "L'édition a reçu toutes les photos prévues. L'atelier peut relever ce plafond.",
  plafond_non_regle:
    "Le dépôt n'est pas encore ouvert : le nombre de photos par personne n'a pas été réglé par l'atelier.",
};

/** Les mêmes phrases au tutoiement (une édition `ecole_tu`, T-195). Seule la première parle à quelqu'un. */
export const MESSAGE_PLAFOND_TU: Record<RaisonPlafond, string> = {
  plafond_participant:
    "Tu as atteint le nombre de photos prévu par personne.",
  plafond_total: MESSAGE_PLAFOND.plafond_total,
  plafond_non_regle: MESSAGE_PLAFOND.plafond_non_regle,
};

/** La phrase d'un refus, au registre de l'édition (vous par défaut, comme `parler`). */
export function messagePlafond(raison: RaisonPlafond, registre: string): string {
  return (registre === "ecole_tu" ? MESSAGE_PLAFOND_TU : MESSAGE_PLAFOND)[raison];
}

/**
 * Ce que dit la page `/depot/[token]` AVANT le choix des photos quand un plafond
 * manque (T-195) : la phrase du refus, puis ce qu'il faut faire. Sans elle, le
 * participant choisissait ses photos, cochait l'accord, et tout était refusé.
 */
export function phrasesDepotPasOuvert(registre: string): [string, string] {
  return [
    MESSAGE_PLAFOND.plafond_non_regle,
    registre === "ecole_tu" ? "Garde ce lien : il fonctionnera dès que ce sera fait." : "Gardez ce lien : il fonctionnera dès que ce sera fait.",
  ];
}

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
  /**
   * Le plafond PROPRE du lien de contribution (révision §14.2), par personne.
   * Absent ou null : la règle de l'édition (`plafondParticipant`).
   */
  plafondLien?: number | null;
  /** Ce que CET appareil a déjà déposé (déclaré ou arrivé) — sur CE lien quand il en a un. */
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

  /* D27 (20/10) : un total vide = pas de limite pour toute l'édition, jamais un refus. */
  const resteTotal = r.plafond_total === null ? null : Math.max(0, r.plafond_total - Math.max(0, totalEdition));

  if (d.role === "responsable" || d.sansPlafond) {
    return resteTotal === null ? { illimitee: true } : { illimitee: false, place: resteTotal, borne: "plafond_total" };
  }

  /* Un lien de contribution porte son plafond ; sinon, celui de l'édition. Sans l'un ni
     l'autre, le dépôt du participant reste FERMÉ, total vide ou non. */
  const parPersonne = d.plafondLien ?? plafondParticipant(r);
  if (parPersonne === null) return { illimitee: false, place: 0, borne: "plafond_non_regle" };
  const restePerso = Math.max(0, parPersonne - Math.max(0, d.dejaParAppareil));
  if (resteTotal === null) return { illimitee: false, place: restePerso, borne: "plafond_participant" };

  /* À égalité, c'est le total qui est cité : « l'édition est pleine » est
     plus vrai que « vous avez assez déposé » quand les deux le sont. */
  return restePerso < resteTotal
    ? { illimitee: false, place: restePerso, borne: "plafond_participant" }
    : { illimitee: false, place: resteTotal, borne: "plafond_total" };
}

/**
 * Un participant peut-il déposer AU MOINS en principe par ce lien (T-195) ?
 * La règle de `placeRestante` elle-même, jouée à vide (personne n'a encore
 * rien déposé) : `false` exactement quand elle rendrait `plafond_non_regle`,
 * c'est-à-dire quand le lien n'a ni plafond propre ni « sans limite » et que
 * l'atelier n'a pas réglé le plafond par personne (un total vide ne ferme plus
 * rien, D27). La page le dit avant le choix des photos ; la fiche de l'atelier
 * le dit en alerte.
 */
export function depotRegle(r: ReglagesPlafond, lien: { sansPlafond: boolean; plafondLien?: number | null }): boolean {
  const p = placeRestante(r, { role: "participant", sansPlafond: lien.sansPlafond, plafondLien: lien.plafondLien ?? null, dejaParAppareil: 0 }, 0);
  return p.illimitee || p.borne !== "plafond_non_regle";
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


/* ─────────────────────────── le lien de contribution ─────────────────────────── */

/** Le curseur de la fenêtre « lien de contribution » : de 5 à 100 (maquette Espace). */
export const CURSEUR_LIEN = { min: 5, max: 100 } as const;
/** Les raccourcis de la maquette ; « Sans limite » est à part. */
export const RACCOURCIS_LIEN = [10, 30, 50] as const;

/**
 * Le plus haut plafond qu'un lien peut porter : 100, ou le plafond de
 * l'atelier s'il est plus bas (le client ne dépasse jamais l'atelier,
 * comme pour le curseur d'avant la révision).
 */
export function plafondLienMax(r: Pick<ReglagesPlafond, "plafond_participant_atelier">): number {
  const atelier = r.plafond_participant_atelier;
  return atelier === null ? CURSEUR_LIEN.max : Math.max(1, Math.min(CURSEUR_LIEN.max, atelier));
}

export type PlafondLien =
  | { ok: true; sans_plafond: boolean; plafond_par_personne: number | null }
  | { ok: false; message: string };

/** `{ plafond }` (un entier) ou `{ sansPlafond: true }`, relu par le serveur. */
export function lirePlafondLien(corps: Record<string, unknown>, r: Pick<ReglagesPlafond, "plafond_participant_atelier">): PlafondLien {
  if (corps.sansPlafond === true) return { ok: true, sans_plafond: true, plafond_par_personne: null };
  const n = Number(corps.plafond);
  const max = plafondLienMax(r);
  if (!Number.isInteger(n) || n < 1) return { ok: false, message: "Choisir un nombre de photos, ou « Sans limite »." };
  if (n > max) return { ok: false, message: `${max} photos au plus par personne pour cette édition.` };
  return { ok: true, sans_plafond: false, plafond_par_personne: n };
}

/** « 30 photos par personne », « Sans limite », ou la règle de l'édition pour un lien d'avant la révision. */
export function libellePlafondLien(l: { sans_plafond: boolean; plafond_par_personne: number | null }, r: ReglagesPlafond): string {
  if (l.sans_plafond) return "Sans limite";
  const n = l.plafond_par_personne ?? plafondParticipant(r);
  return n === null ? "Plafond à régler" : `${n} photo${n > 1 ? "s" : ""} par personne`;
}
