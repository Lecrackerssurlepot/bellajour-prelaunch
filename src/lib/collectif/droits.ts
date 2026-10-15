/**
 * Qui peut faire quoi (PRD §2), et quel token donne quel rôle (PRD §10).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA MATRICE EST LA SEULE SOURCE
 *
 * Chaque route d'écriture de `/api/collectif/*` demande `peut(role, action)`
 * AVANT de toucher la base, et les gestes de `gestes.ts` dérivent leur `qui`
 * de cette table au lieu de le redéclarer. Deux listes de droits finiraient
 * par se contredire, et la plus permissive gagnerait.
 *
 * ⚠️ Le lien ÉQUIPE ne peut RIEN écrire : il n'apparaît que sur `voir_espace`.
 * `scripts/verif-collectif.ts` le prouve sur toutes les actions d'écriture.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { memeSecret } from "@/lib/atelier/secret";
import type { Role } from "./types";

/* Le tableau du §2, ligne à ligne, dans son ordre. */
export const DROITS = {
  /** Créer et régler une édition, et tous les gestes de l'atelier sur son état. */
  regler_edition: ["atelier"],
  gerer_styles: ["atelier"],
  /** L'atelier y entre en APERÇU, l'équipe en LECTURE. */
  voir_espace: ["atelier", "responsable", "equipe"],
  regler_plafond_participant: ["atelier", "responsable"],
  /** Le plafond par personne ne vaut que pour le participant (plafonds.ts). */
  deposer_photos: ["atelier", "responsable", "participant"],
  preselectionner: ["atelier", "responsable"],
  signaler_photo: ["atelier", "responsable"],
  choisir_style: ["responsable"],
  valider_brief: ["responsable"],
  envoyer_contenu: ["responsable"],
  deposer_tour: ["atelier"],
  repondre_note: ["atelier"],
  poser_note: ["responsable"],
  resoudre_note: ["responsable"],
  envoyer_notes: ["responsable"],
  choisir_couverture: ["responsable"],
  valider_bat: ["responsable"],
  ecrire_message: ["atelier", "responsable"],
  /** D23 : prendre, déplacer, annuler un rendez-vous (l'équipe le voit, sans y toucher). */
  prendre_rendez_vous: ["atelier", "responsable"],
  saisir_livraison: ["atelier"],
  /** T-154 : recevoir et saisir le code qui reconnaît un appareil (le lien du responsable seulement). */
  ouvrir_sur_appareil: ["responsable"],
} as const satisfies Record<string, readonly Role[]>;

export type Action = keyof typeof DROITS;

export const ACTIONS: readonly Action[] = Object.keys(DROITS) as Action[];

/** La seule action qui n'écrit rien. Tout le reste est une écriture. */
export const ACTIONS_LECTURE: readonly Action[] = ["voir_espace"];
export const ACTIONS_ECRITURE: readonly Action[] = ACTIONS.filter(
  (a) => !ACTIONS_LECTURE.includes(a)
);

export function peut(role: Role, action: Action): boolean {
  return (DROITS[action] as readonly Role[]).includes(role);
}

/* ─────────────────────────── les tokens et les surfaces ─────────────────────────── */

/** Les deux portes publiques. L'atelier passe par l'admin, jamais par un token. */
export type Surface = "espace" | "depot";

export const ROLES_PAR_SURFACE: Record<Surface, readonly Role[]> = {
  /** `/edition/[token]` : le responsable, ou l'équipe en lecture seule. */
  espace: ["responsable", "equipe"],
  /** `/depot/[token]` : le participant, et rien d'autre (PRD §10). */
  depot: ["participant"],
};

export function roleAdmisSur(surface: Surface, role: Role): boolean {
  return ROLES_PAR_SURFACE[surface].includes(role);
}

export type TokensEdition = {
  token_responsable: string;
  token_equipe: string;
  token_depot: string;
};

/**
 * Le rôle qu'un token donne sur une édition, ou `null`.
 *
 * La ligne a été trouvée PAR le token, mais on recompare quand même, et à
 * durée constante : c'est ce qui dit LEQUEL des trois liens a servi. Un token
 * vide ne donne jamais rien, même face à une colonne vide.
 */
export function roleDuToken(
  edition: TokensEdition,
  token: string
): Exclude<Role, "atelier"> | null {
  if (!token) return null;
  if (edition.token_responsable && memeSecret(edition.token_responsable, token)) return "responsable";
  if (edition.token_equipe && memeSecret(edition.token_equipe, token)) return "equipe";
  if (edition.token_depot && memeSecret(edition.token_depot, token)) return "participant";
  return null;
}

/**
 * La forme d'une clé de provenance (`/depot/[token]?p=<cle>`).
 *
 * ⚠️ ALÉATOIRE, JAMAIS UN MOT. Cette clé LÈVE le plafond par personne : la
 * maquette montrait un `/photographe` lisible, et n'importe quel participant
 * aurait pu l'ajouter à son lien. 16 octets en base64url = 22 caractères,
 * 128 bits ; la base refuse plus court (migration 20261013).
 */
export const CLE_PROVENANCE_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;

export function estCleProvenance(v: unknown): v is string {
  return typeof v === "string" && CLE_PROVENANCE_PATTERN.test(v);
}
