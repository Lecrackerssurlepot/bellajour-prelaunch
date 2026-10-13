/**
 * La messagerie client ↔ atelier (PRD §7).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Phase 2 : l'écran INTERROGE toutes les 3,5 s quand l'onglet est visible,
 * rien quand il est caché, rattrapage au retour (patron Rafraichissement.tsx).
 * Aucun client Supabase dans le navigateur (règle du dépôt) ; Supabase
 * Realtime est une phase 7 qui demande l'avis de Mathias. Aucun mail non plus
 * (E8 / A1, phase 7) : l'atelier voit le compteur de non-lus dans sa liste.
 */

/** Entre 3 et 4 s (PRD §7) : quasi instantané, sans marteler la base. */
export const INTERVALLE_MESSAGES_MS = 3500;

/** Garde technique contre un collage géant ; pas une promesse au client. */
export const MESSAGE_MAX = 4000;

export type Message = {
  id: string;
  auteur: "client" | "atelier";
  qui: string | null;
  texte: string;
  created_at: string;
};

export type TexteLu = { ok: true; texte: string } | { ok: false; message: string };

export function lireTexteMessage(v: unknown): TexteLu {
  const texte = typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "";
  if (!texte) return { ok: false, message: "Le message est vide." };
  if (texte.length > MESSAGE_MAX) {
    return { ok: false, message: `Message trop long (${MESSAGE_MAX} caractères au plus).` };
  }
  return { ok: true, texte };
}

/**
 * Ajoute les messages reçus à ceux déjà affichés : sans doublon (une
 * interrogation peut relire le dernier), dans l'ordre du temps.
 */
export function fusionnerMessages(deja: readonly Message[], nouveaux: readonly Message[]): Message[] {
  const parId = new Map<string, Message>();
  for (const m of deja) parId.set(m.id, m);
  for (const m of nouveaux) parId.set(m.id, m);
  return [...parId.values()].sort((a, b) =>
    a.created_at === b.created_at ? a.id.localeCompare(b.id) : a.created_at.localeCompare(b.created_at)
  );
}

/** Le curseur de la prochaine interrogation : la date du dernier message connu. */
export function curseur(messages: readonly Message[]): string | null {
  return messages.length ? messages[messages.length - 1].created_at : null;
}
