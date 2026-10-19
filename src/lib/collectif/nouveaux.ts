/**
 * Ce que l'atelier n'a pas encore lu (T-188, planche 8 du 19/10, validée par
 * Mathias telle quelle). Module PUR : aucun accès base, aucun réseau, aucune
 * variable d'environnement.
 *
 * - « Messages » porte le nombre de CONVERSATIONS qui attendent une réponse :
 *   une édition compte une fois, qu'elle ait un ou dix messages non lus
 *   (`conversationsEnAttente`). L'onglet du navigateur aussi : « (3) Atelier ·
 *   Messages » (`titreAvecCompte`).
 * - Dans le fil, un trait « N nouveaux messages » est posé avant le premier
 *   message du client que l'atelier n'avait pas lu AU RENDU (`premierNouveau`,
 *   calculé côté serveur AVANT tout marquage), puis il reste en place tant
 *   qu'on est dans la conversation. Les jours sont séparés (« Aujourd'hui »,
 *   « Hier », la date : `jourRelatif`). `filAtelier` assemble le tout.
 */

import type { Message } from "./messages";

/* ─────────────────────────────── le compte ─────────────────────────────── */

/** Le nombre de conversations qui attendent : des lignes « un message du client non lu » → des éditions distinctes. */
export function conversationsEnAttente(lignes: readonly { edition_id: string }[]): number {
  return new Set(lignes.map((l) => l.edition_id)).size;
}

/** Un compte et l'instant SERVEUR de sa lecture (ISO) : celui du rendu d'une page, ou celui de la route en-attente. */
export type Lecture = { n: number | null; le: string };

/**
 * Le nombre à afficher : la lecture la plus récente, celle de la page (`page`,
 * lue à `pageLe`) ou celle du magasin du navigateur. On compare deux instants
 * SERVEUR, jamais l'horloge du navigateur. Sans instant, la page ne l'emporte
 * que si le magasin n'a encore rien lu.
 */
export function plusRecent(page: number | null | undefined, pageLe: string | null | undefined, magasin: Lecture): number | null {
  const p = typeof page === "number" ? page : null;
  if (p !== null && pageLe && pageLe > magasin.le) return p;
  return magasin.n ?? p;
}

const PREFIXE = /^\(\d+\)\s+/;

/** « (3) Atelier · Messages » ; sans rien qui attende, le titre nu. Un ancien compte est toujours retiré d'abord. */
export function titreAvecCompte(titre: string, n: number | null | undefined): string {
  const nu = titre.replace(PREFIXE, "");
  return typeof n === "number" && n > 0 ? `(${n}) ${nu}` : nu;
}

/** « 1 conversation attend une réponse », « 3 conversations attendent une réponse ». */
export function phraseEnAttente(n: number): string {
  return n > 1 ? `${n} conversations attendent une réponse` : `${n} conversation attend une réponse`;
}

/* ─────────────────────────────── le trait ─────────────────────────────── */

/**
 * Le premier message du client que l'atelier n'a pas lu, dans l'ordre du fil.
 * `nonLus` : les ids des messages du client dont `lu_atelier_le` est vide, lus
 * au rendu serveur AVANT que l'ouverture ne marque quoi que ce soit.
 */
export function premierNouveau(messages: readonly Pick<Message, "id" | "auteur">[], nonLus: readonly string[]): string | null {
  if (!nonLus.length) return null;
  const ids = new Set(nonLus);
  return messages.find((m) => m.auteur === "client" && ids.has(m.id))?.id ?? null;
}

/** « 1 nouveau message », « 2 nouveaux messages ». */
export function libelleNouveaux(n: number): string {
  return n > 1 ? `${n} nouveaux messages` : `${n} nouveau message`;
}

/* ─────────────────────────────── les jours ─────────────────────────────── */

const JOUR_CLE = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
const JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });

/**
 * Le jour d'un message, à l'heure de Paris, par rapport à `maintenant` (l'instant
 * du rendu serveur, passé en prop : jamais `Date.now()` dans un rendu) :
 * « Aujourd'hui », « Hier », sinon « 12 octobre » (l'année en plus si ce n'est
 * pas celle de `maintenant`). Vide si l'instant est illisible.
 */
export function jourRelatif(iso: string, maintenant: Date): string {
  const ms = Date.parse(iso);
  const ref = maintenant.getTime();
  if (!Number.isFinite(ms) || !Number.isFinite(ref)) return "";
  const jour = JOUR_CLE.format(new Date(ms));
  if (jour === JOUR_CLE.format(new Date(ref))) return "Aujourd'hui";
  if (jour === JOUR_CLE.format(new Date(ref - 86_400_000))) return "Hier";
  const date = JOUR_MOIS.format(new Date(ms));
  return jour.slice(0, 4) === JOUR_CLE.format(new Date(ref)).slice(0, 4) ? date : `${date} ${jour.slice(0, 4)}`;
}

/* ─────────────────────────────── le fil ─────────────────────────────── */

export type ElementAtelier =
  | { genre: "jour"; cle: string; jour: string }
  | { genre: "trait"; cle: string; nombre: number }
  | {
      genre: "message";
      cle: string;
      message: Message;
      /** `ancien` : avant le trait (légèrement atténué) ; `nouveau` : un message du client à partir du trait (liseré). */
      ton: "ancien" | "nouveau" | null;
      /** Un message du client que l'atelier avait DÉJÀ lu au rendu (« · lu »). */
      lu: boolean;
    };

/**
 * Le fil de l'atelier, dans l'ordre reçu (déjà trié par `fusionnerMessages`) :
 * un séparateur à chaque nouveau jour, puis le trait juste avant le premier
 * nouveau message (après le séparateur du jour, comme sur la maquette).
 *
 * Le trait se pose sur `premier` (calculé au rendu serveur). S'il n'y en avait
 * pas, le premier message du client arrivé EN DIRECT (absent de `initiaux`) le
 * pose : ce que l'atelier n'avait pas sous les yeux en ouvrant est nouveau.
 * Le compte du trait ne compte que les messages du CLIENT à partir de lui.
 */
export function filAtelier(
  messages: readonly Message[],
  o: { premier: string | null; initiaux: ReadonlySet<string>; jourDe: (iso: string) => string }
): ElementAtelier[] {
  let trait = o.premier ? messages.findIndex((m) => m.id === o.premier) : -1;
  if (trait < 0) trait = messages.findIndex((m) => m.auteur === "client" && !o.initiaux.has(m.id));
  const nombre = trait < 0 ? 0 : messages.slice(trait).filter((m) => m.auteur === "client").length;
  const sortie: ElementAtelier[] = [];
  let dernier = "";
  messages.forEach((m, i) => {
    const jour = o.jourDe(m.created_at);
    if (jour && jour !== dernier) {
      sortie.push({ genre: "jour", cle: `j-${m.id}`, jour });
      dernier = jour;
    }
    if (i === trait) sortie.push({ genre: "trait", cle: "trait", nombre });
    const avant = trait < 0 || i < trait;
    sortie.push({
      genre: "message",
      cle: m.id,
      message: m,
      ton: trait < 0 ? null : i < trait ? "ancien" : m.auteur === "client" ? "nouveau" : null,
      lu: m.auteur === "client" && avant && o.initiaux.has(m.id),
    });
  });
  return sortie;
}
