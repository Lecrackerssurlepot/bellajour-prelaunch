/**
 * Un mail PROGRAMMÉ chez Brevo, et son annulation (T-116, 17/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE MODULE EXISTE
 *
 * M0 (« votre numéro est ouvert, il attend vos photos ») partait à la seconde
 * où le dossier existait. Merisa l'a reçu pendant qu'elle envoyait ses 92
 * photos. Décision de Mathias du 17/09 : M0 part quinze minutes après
 * l'écran 4, et seulement si aucune photo n'est arrivée entre-temps.
 *
 * La relève quotidienne ne sait pas différer de quinze minutes : tout ce
 * qu'elle diffère arrive le lendemain matin, entre 12 et 31 h plus tard (D16).
 * Le seul minuteur dont on dispose sans nouvelle infrastructure est celui de
 * Brevo : `scheduledAt` sur l'envoi transactionnel (jusqu'à 72 h à l'avance),
 * `DELETE /v3/smtp/email/{messageId}` pour annuler avant l'heure. Brevo
 * annonce un aléa de « +5 minutes » sur l'heure programmée : M0 arrive donc
 * entre quinze et vingt minutes après l'écran 4.
 *
 * Ce module est PUR : il calcule l'heure, encode l'identifiant, et décide
 * quel message annuler d'après le journal. Les appels réseau vivent dans
 * `lib/brevo.ts`, l'orchestration dans `mails.ts`.
 *
 * ⚠️ LE VERROU NE BOUGE PAS. `mails_envoyes` est posé à la PROGRAMMATION, pas
 * à l'arrivée, et il reste posé quand le mail est annulé : un M0 annulé parce
 * que les photos sont arrivées ne doit JAMAIS partir plus tard (M1 ou M2b
 * prennent le relais). Le filet de la relève (codesPour, borné par
 * `DELAI_RELANCE_DEPOT`) ne rattrape donc que le cas où la programmation
 * elle-même a échoué, verrou retiré. Les cinq assertions de D16 tiennent.
 * ══════════════════════════════════════════════════════════════════════════
 */

/** Quinze minutes après l'écran 4 (décision du 17/09/2026). */
export const M0_DIFFERE_MS = 15 * 60_000;

/** L'aléa que Brevo annonce sur l'heure programmée. Informatif : c'est ce que
    l'admin affiche, pas une valeur qu'on ajoute. */
export const ALEA_BREVO_MS = 5 * 60_000;

/** L'heure à passer dans `scheduledAt`, en ISO 8601 UTC. */
export function dateProgrammee(maintenant: Date, differeMs: number): string {
  return new Date(maintenant.getTime() + differeMs).toISOString();
}

/**
 * Brevo rend un `messageId` de la forme `<2026…@smtp-relay.mailin.fr>`, chevrons
 * compris, et attend le MÊME identifiant dans l'URL de suppression. Les chevrons
 * et l'arobase ne survivent pas à une URL tels quels.
 */
export function identifiantBrevoPourUrl(messageId: string): string {
  return encodeURIComponent(messageId.trim());
}

export type EvenementProgramme = {
  type: string;
  payload: Record<string, unknown> | null;
  created_at?: string | null;
};

export type MessageProgramme = { messageId: string; pour: string | null };

/**
 * Le message à annuler pour ce code, ou null. Lit le journal du dossier : la
 * DERNIÈRE programmation de ce code qui n'a pas déjà sa ligne d'annulation.
 * Une annulation qui a échoué compte aussi comme tentée : on n'appelle pas
 * Brevo en boucle sur un identifiant qu'il refuse.
 */
export function messageAAnnuler(
  evenements: EvenementProgramme[],
  code: string,
): MessageProgramme | null {
  const annules = new Set<string>();
  for (const e of evenements) {
    if (e.type !== "mail_annule") continue;
    const id = e.payload?.message_id;
    if (typeof id === "string") annules.add(id);
  }
  let retenu: MessageProgramme | null = null;
  for (const e of evenements) {
    if (e.type !== "mail_programme" || e.payload?.code !== code) continue;
    const id = e.payload?.message_id;
    if (typeof id !== "string" || !id) continue;
    if (annules.has(id)) continue;
    const pour = typeof e.payload?.pour === "string" ? e.payload.pour : null;
    retenu = { messageId: id, pour };
  }
  return retenu;
}

export type VerdictAnnulation = "annule" | "trop_tard" | "echec";

/**
 * Ce que le code HTTP de Brevo veut dire. 204 : la file l'a retiré, le mail ne
 * partira pas. 404 : Brevo ne connaît plus cet identifiant, ce qui est le cas
 * d'un message déjà parti (relevé de la doc, pas éprouvé sur un cas réel :
 * la ligne de journal garde le code brut pour qu'on puisse le relire).
 * Tout le reste : on ne sait pas, on le dit.
 */
export function verdictAnnulation(status: number | null): VerdictAnnulation {
  if (status === 204) return "annule";
  if (status === 404) return "trop_tard";
  return "echec";
}
