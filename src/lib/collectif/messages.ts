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
  /** Le document cité (révision §14.5), lien signé une heure. Absent avant la migration. */
  document?: { id: string; libelle: string; url: string | null } | null;
  /** La pièce jointe, lien signé une heure. */
  piece?: { nom: string; url: string | null } | null;
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

/* ─────────────────────────── la révision du 13/10 (PRD §14.5) ─────────────────────────── */

/** Le poids d'une pièce jointe : elle passe par le serveur, comme les contenus (4 Mo). */
export const PIECE_MAX = 4 * 1024 * 1024;

/**
 * Ce qu'on joint à un message : des documents et des images, rien qui
 * s'exécute. Le type vient de l'EXTENSION, jamais de ce que le navigateur
 * annonce (un `.exe` renommé reste refusé par sa propre extension).
 */
export const TYPES_PIECE: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
};

export type PieceLue = { ok: true; nom: string; extension: string; type: string } | { ok: false; message: string };

export function lirePieceJointe(nom: unknown, taille: unknown): PieceLue {
  const n = typeof nom === "string" ? nom.trim().slice(0, 160) : "";
  const ext = /\.([A-Za-z0-9]{1,5})$/.exec(n)?.[1]?.toLowerCase() ?? "";
  if (!n || !TYPES_PIECE[ext]) {
    return { ok: false, message: "Ce type de fichier n'est pas accepté : PDF, image, Word, Excel, PowerPoint, CSV ou texte." };
  }
  if (typeof taille !== "number" || !Number.isFinite(taille) || taille <= 0) return { ok: false, message: "Le fichier est vide." };
  if (taille > PIECE_MAX) return { ok: false, message: "4 Mo au plus. Pour un fichier plus lourd, demandez un lien à l'atelier." };
  return { ok: true, nom: n, extension: ext, type: TYPES_PIECE[ext] };
}

/**
 * Le texte d'un message : obligatoire en base. Un fichier envoyé seul prend
 * « Fichier joint : nom » (la contrainte de la table n'est pas touchée).
 */
export function texteDuMessage(brut: unknown, nomPiece: string | null): TexteLu {
  const vide = typeof brut !== "string" || !brut.trim();
  if (vide && nomPiece) return { ok: true, texte: `Fichier joint : ${nomPiece}` };
  return lireTexteMessage(brut);
}

/** Un élément du fil de « Parler à l'atelier » : un jour, un message, ou une proposition de l'atelier. */
export type ElementFil<P> =
  | { genre: "jour"; cle: string; jour: string }
  | { genre: "message"; cle: string; message: Message }
  | { genre: "proposition"; cle: string; proposition: P };

/**
 * Le fil réunit les messages et les propositions complémentaires (des
 * documents de l'atelier), dans l'ordre du temps, avec un séparateur à chaque
 * nouveau jour. `jourDe` met une date en mots (l'heure de Paris, dates.ts).
 */
export function filDeConversation<P extends { id: string; quand: string }>(
  messages: readonly Message[],
  propositions: readonly P[],
  jourDe: (iso: string) => string
): ElementFil<P>[] {
  const tout = [
    ...messages.map((m) => ({ quand: m.created_at, el: { genre: "message" as const, cle: `m-${m.id}`, message: m } })),
    ...propositions.map((p) => ({ quand: p.quand, el: { genre: "proposition" as const, cle: `p-${p.id}`, proposition: p } })),
  ].sort((a, b) => (a.quand === b.quand ? a.el.cle.localeCompare(b.el.cle) : a.quand.localeCompare(b.quand)));
  const sortie: ElementFil<P>[] = [];
  let dernier = "";
  for (const { quand, el } of tout) {
    const jour = jourDe(quand);
    if (jour && jour !== dernier) {
      sortie.push({ genre: "jour", cle: `j-${quand}`, jour });
      dernier = jour;
    }
    sortie.push(el);
  }
  return sortie;
}
