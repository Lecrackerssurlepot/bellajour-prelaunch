/**
 * La messagerie client ↔ atelier (PRD §7).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Phase 2 : l'écran INTERROGE quand l'onglet est visible, rien quand il est
 * caché, rattrapage au retour (patron Rafraichissement.tsx). Depuis T-169
 * (20/10, décision de Mathias : « on l'optimise pour que ce soit pas le cas,
 * sans poser aucun problème »), la relève RALENTIT quand rien ne bouge
 * (`PALIERS_MESSAGES`, `intervalleMessages`) et repart vite au moindre
 * mouvement. Aucun client Supabase dans le navigateur (règle du dépôt) ;
 * Supabase Realtime est une phase 7 qui demande l'avis de Mathias. Aucun mail
 * non plus (E8 / A1, phase 7) : l'atelier voit le compteur de non-lus dans sa
 * liste.
 */

/** Entre 3 et 4 s (PRD §7) : quasi instantané, sans marteler la base. Le palier d'une conversation VIVANTE. */
export const INTERVALLE_MESSAGES_MS = 3500;

/**
 * Les paliers de la relève (T-169). Un MOUVEMENT, c'est l'ouverture du fil, un
 * message reçu ou envoyé, une frappe dans la page, le retour sur l'onglet : il
 * ramène aussitôt au premier palier. Sans mouvement :
 * - la première minute, 3,5 s : on vient d'écrire ou de lire, la réponse est
 *   probable (PRD §7, « entre 3 et 4 s ») ;
 * - de 1 à 3 minutes, 10 s : l'autre camp tape encore peut-être, une réponse
 *   arrive en 5 s en moyenne ;
 * - de 3 à 10 minutes, 30 s : la conversation retombe ;
 * - au-delà, 60 s : le rythme de la table de travail (Rafraichissement.tsx) et
 *   du compte de l'atelier (`VeilleMessages`), pour un onglet laissé ouvert.
 * Compté par le harnais : un onglet ouvert une heure sans rien faire
 * interroge 93 fois au lieu de 1 028 (8 heures : 513 au lieu de 8 228).
 */
export const PALIERS_MESSAGES: readonly { calmeDepuisMs: number; intervalleMs: number }[] = [
  { calmeDepuisMs: 0, intervalleMs: INTERVALLE_MESSAGES_MS },
  { calmeDepuisMs: 60_000, intervalleMs: 10_000 },
  { calmeDepuisMs: 3 * 60_000, intervalleMs: 30_000 },
  { calmeDepuisMs: 10 * 60_000, intervalleMs: 60_000 },
];

/**
 * L'attente avant la prochaine relève, selon le temps passé sans mouvement.
 * Une durée illisible ou négative (horloge reculée) vaut « il vient de se
 * passer quelque chose » : le palier rapide, jamais un silence.
 */
export function intervalleMessages(calmeDepuisMs: number): number {
  const calme = Number.isFinite(calmeDepuisMs) && calmeDepuisMs > 0 ? calmeDepuisMs : 0;
  let intervalle = PALIERS_MESSAGES[0].intervalleMs;
  for (const p of PALIERS_MESSAGES) if (calme >= p.calmeDepuisMs) intervalle = p.intervalleMs;
  return intervalle;
}

/** Garde technique contre un collage géant ; pas une promesse au client. */
export const MESSAGE_MAX = 4000;

export type Message = {
  id: string;
  auteur: "client" | "atelier";
  qui: string | null;
  texte: string;
  created_at: string;
  /** Le document cité (révision §14.5), lien signé une heure. Absent avant la migration.
   *  `url` télécharge, `voir` s'affiche dans la visionneuse (T-152). */
  document?: { id: string; libelle: string; url: string | null; voir?: string | null } | null;
  /** La pièce jointe, lien signé une heure. */
  piece?: { nom: string; url: string | null; voir?: string | null } | null;
  /** Un envoi du client cité (« Votre envoi · Logo · logo-blanc.png », migration 20261016), lien signé une heure. */
  contenu?: { id: string; libelle: string; url: string | null; voir?: string | null } | null;
  /** Le message auquel celui-ci RÉPOND (T-152, migration 20261018) : qui l'a écrit et son début. */
  reponseA?: { id: string; auteur: "client" | "atelier"; qui: string | null; extrait: string } | null;
};

/** Le début d'un message cité en réponse : une ligne, 140 caractères au plus, coupé au mot. */
export function extraitDe(texte: string, max = 140): string {
  const ligne = texte.replace(/\s+/g, " ").trim();
  if (ligne.length <= max) return ligne;
  const coupe = ligne.slice(0, max);
  const espace = coupe.lastIndexOf(" ");
  return `${(espace > max * 0.6 ? coupe.slice(0, espace) : coupe).trimEnd()}…`;
}

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

/** Un élément du fil de « Parler à l'atelier » : un jour, un message, une proposition de l'atelier, un rendez-vous. */
export type ElementFil<P, R = never> =
  | { genre: "jour"; cle: string; jour: string }
  | { genre: "message"; cle: string; message: Message }
  | { genre: "proposition"; cle: string; proposition: P }
  | { genre: "rendezvous"; cle: string; rendezVous: R };

/**
 * Le fil réunit les messages et les propositions complémentaires (des
 * documents de l'atelier), dans l'ordre du temps, avec un séparateur à chaque
 * nouveau jour. `jourDe` met une date en mots (l'heure de Paris, dates.ts).
 */
export function filDeConversation<P extends { id: string; quand: string }, R extends { id: string; quand: string } = never>(
  messages: readonly Message[],
  propositions: readonly P[],
  jourDe: (iso: string) => string,
  rendezVous: readonly R[] = []
): ElementFil<P, R>[] {
  const tout: { quand: string; el: ElementFil<P, R> & { cle: string } }[] = [
    ...messages.map((m) => ({ quand: m.created_at, el: { genre: "message" as const, cle: `m-${m.id}`, message: m } })),
    ...propositions.map((p) => ({ quand: p.quand, el: { genre: "proposition" as const, cle: `p-${p.id}`, proposition: p } })),
    ...rendezVous.map((r) => ({ quand: r.quand, el: { genre: "rendezvous" as const, cle: `r-${r.id}`, rendezVous: r } })),
  ].sort((a, b) => (a.quand === b.quand ? a.el.cle.localeCompare(b.el.cle) : a.quand.localeCompare(b.quand)));
  const sortie: ElementFil<P, R>[] = [];
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
