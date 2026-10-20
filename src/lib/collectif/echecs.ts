/**
 * Les échecs qui comptent dans l'Édition collective (T-160), écrits AUSSI au
 * journal de l'édition. Module PUR : aucun accès base, aucun réseau, aucune
 * variable d'environnement. Le helper qui écrit est `echecsJournal.ts`.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI LE JOURNAL ET PAS SEULEMENT LA CONSOLE
 *
 * Sur Vercel Hobby, les journaux d'exécution ne sont gardés qu'une heure : un
 * envoi de photos refusé un samedi soir ne laissait aucune trace le lundi.
 * Une ligne `echec` dans `collectif_evenements` reste, se lit sur la fiche de
 * l'édition et sur la page Santé (« derniers échecs, 7 jours »).
 *
 * ⚠️ Le payload est COURT et sans secret : une étape, un code d'erreur, un
 * nombre. Jamais un message d'erreur brut (il peut citer une clé, une URL
 * signée, un token), jamais un token (recit.ts). `payloadEchec` ne garde que
 * ses quatre clés et masque tout ce qui ressemble à un token.
 *
 * ⚠️ Un frein (`freinerEchec`) : une panne du coffre pendant qu'une classe
 * entière envoie ferait des centaines de lignes en une minute, et le journal
 * de la fiche (ses 100 dernières lignes) ne montrerait plus qu'elles. Une
 * ligne au plus par minute pour la même édition, le même geste et la même
 * étape ; les suivantes se COMPTENT (`repetitions` de la ligne d'après). Le
 * frein vit dans la mémoire d'une instance : un frein, pas une garantie.
 * ══════════════════════════════════════════════════════════════════════════
 */

/** Le type de la ligne au journal. */
export const EVT_ECHEC = "echec";

/** Le geste qui a échoué. Une entrée de plus = une ligne ici et sa phrase dans `LIBELLE_QUOI`. */
export const QUOI_ECHEC = ["declaration", "confirmation", "rattrapage", "vignette", "corbeille", "retention"] as const;
export type QuoiEchec = (typeof QUOI_ECHEC)[number];

/** L'étape qui a échoué : lire la base, joindre le coffre, écrire en base. */
export const ETAPES_ECHEC = ["lecture", "coffre", "ecriture", "decodage"] as const;
export type EtapeEchec = (typeof ETAPES_ECHEC)[number];

const LIBELLE_QUOI = new Map<string, string>([
  ["declaration", "déclaration de photos refusée par le serveur"],
  ["confirmation", "confirmation de photos impossible"],
  ["rattrapage", "rattrapage des photos en erreur"],
  ["vignette", "vignette non fabriquée"],
  ["corbeille", "effacement de photos de la corbeille impossible"],
  ["retention", "effacement de fin de conservation incomplet (30 jours après la livraison)"],
]);

const LIBELLE_ETAPE = new Map<string, string>([
  ["lecture", "la base n'a pas répondu"],
  ["coffre", "le coffre n'a pas répondu"],
  ["ecriture", "écriture refusée par la base"],
  ["decodage", "photo illisible"],
]);

export type DetailsEchec = { etape?: EtapeEchec; code?: string | null; n?: number };

/** Ce qui ressemble à un token (32 caractères de l'alphabet des liens) ou à une longue clé : masqué. */
const SECRET = /[A-Za-z0-9_-]{24,}/g;

function court(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(SECRET, "[masqué]").trim().slice(0, max);
  return t || null;
}

/**
 * Le payload d'une ligne `echec` : `quoi`, et au plus `etape`, `code`, `n`,
 * `repetitions`. Tout autre champ est ignoré, un code est court (12
 * caractères : un code PostgreSQL ou PostgREST en fait 5 à 8), un nombre est
 * un entier positif.
 */
export function payloadEchec(quoi: QuoiEchec, details: DetailsEchec = {}, repetitions = 0): Record<string, unknown> {
  const p: Record<string, unknown> = { quoi };
  if (details.etape && (ETAPES_ECHEC as readonly string[]).includes(details.etape)) p.etape = details.etape;
  const code = court(details.code, 12);
  if (code) p.code = code;
  if (typeof details.n === "number" && Number.isFinite(details.n) && details.n > 0) p.n = Math.floor(details.n);
  if (Number.isFinite(repetitions) && repetitions > 0) p.repetitions = Math.floor(repetitions);
  return p;
}

/** Une ligne au plus par minute pour la même clé (édition, geste, étape). */
export const INTERVALLE_ECHEC_MS = 60 * 1000;

export type EtatFrein = { derniere: number; tues: number };

/**
 * Écrire maintenant, ou compter ? Rend la décision ET l'état suivant (le
 * module ne garde rien). La première ligne passe ; pendant `intervalle`, les
 * suivantes se comptent ; la première d'après porte leur nombre.
 */
export function freinerEchec(
  etat: EtatFrein | undefined,
  maintenantMs: number,
  intervalle: number = INTERVALLE_ECHEC_MS
): { ecrire: boolean; repetitions: number; etat: EtatFrein } {
  if (etat && maintenantMs - etat.derniere < intervalle && maintenantMs >= etat.derniere) {
    return { ecrire: false, repetitions: 0, etat: { derniere: etat.derniere, tues: etat.tues + 1 } };
  }
  return { ecrire: true, repetitions: etat?.tues ?? 0, etat: { derniere: maintenantMs, tues: 0 } };
}

export function cleFrein(editionId: string, quoi: QuoiEchec, etape: EtapeEchec | undefined): string {
  return `${editionId}|${quoi}|${etape ?? "-"}`;
}

/** Une ligne `echec` en français (le journal de la fiche, la page Santé). */
export function phraseEchec(payload: Record<string, unknown>): string {
  const quoi = LIBELLE_QUOI.get(String(payload.quoi)) ?? "échec";
  const etape = LIBELLE_ETAPE.get(String(payload.etape ?? ""));
  const n = typeof payload.n === "number" && payload.n > 0 ? ` (${payload.n.toLocaleString("fr-FR")} photo${payload.n > 1 ? "s" : ""})` : "";
  const code = typeof payload.code === "string" && payload.code ? `, code ${payload.code}` : "";
  const rep = typeof payload.repetitions === "number" && payload.repetitions > 0 ? `, et ${payload.repetitions} fois de plus juste avant` : "";
  const premiere = quoi.charAt(0).toUpperCase() + quoi.slice(1);
  return `${premiere}${n}${etape ? ` : ${etape}` : ""}${code}${rep}.`;
}

/* ─────────────────────────── la page Santé : le bloc « Éditions » ─────────────────────────── */

/** La fenêtre des échecs montrés : une semaine. */
export const FENETRE_ECHECS_MS = 7 * 24 * 60 * 60 * 1000;
/** Une photo déclarée sans confirmation depuis plus d'une heure : son URL signée a expiré (`PRESIGN_TTL_SECONDS`). */
export const ATTENTE_SIGNALEE_MS = 60 * 60 * 1000;
/** Les échecs montrés par édition (les plus récents). */
export const ECHECS_MONTRES = 5;

export type SanteEdition = {
  id: string;
  organisation: string;
  evenement: string;
  echecs: { payload: Record<string, unknown>; created_at: string }[];
  /** Déclarées depuis plus d'une heure, jamais confirmées. `null` = le compte n'a pas pu se faire. */
  enAttente: number | null;
  sansVignette: number | null;
  /** La dernière fin de rattrapage (payload et date), s'il y en a une. */
  dernierRattrapage: { payload: Record<string, unknown>; created_at: string } | null;
};

export type ConstatEdition = {
  gravite: "rouge" | "orange";
  titre: string;
  remede: string;
  lignes: string[];
};

/**
 * Ce que la page Santé dit d'une édition, ou `null` s'il n'y a rien à dire.
 * Rouge : un échec en 7 jours (quelque chose a raté côté serveur). Orange :
 * des photos en attente ou sans vignette (ça se rattrape, mais ça se voit).
 * Un compte impossible se DIT, il ne passe jamais pour zéro.
 */
export function constatEdition(s: SanteEdition, formater: (iso: string) => string): ConstatEdition | null {
  const lignes: string[] = [];
  const recents = [...s.echecs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  for (const e of recents.slice(0, ECHECS_MONTRES)) lignes.push(`${formater(e.created_at)} · ${phraseEchec(e.payload)}`);
  if (recents.length > ECHECS_MONTRES) lignes.push(`Et ${recents.length - ECHECS_MONTRES} échec(s) plus ancien(s) cette semaine, dans le journal de l'édition.`);

  if (s.enAttente === null) lignes.push("Photos en attente de confirmation : le compte n'a pas pu se faire.");
  else if (s.enAttente > 0) {
    const r = s.dernierRattrapage;
    const suite = r
      ? ` Dernier rattrapage le ${formater(r.created_at)} : ${Number(r.payload.n ?? 0)} retrouvée(s), ${Number(r.payload.absentes ?? 0)} absente(s) du coffre.`
      : " Aucun rattrapage n'est encore passé.";
    lignes.push(`${s.enAttente.toLocaleString("fr-FR")} photo(s) déclarée(s) sans confirmation depuis plus d'une heure.${suite}`);
  }
  if (s.sansVignette === null) lignes.push("Photos sans vignette : le compte n'a pas pu se faire.");
  else if (s.sansVignette > 0) lignes.push(`${s.sansVignette.toLocaleString("fr-FR")} photo(s) sans vignette : la grille montre l'original, plus lourd.`);

  if (!lignes.length) return null;
  const rouge = recents.length > 0;
  return {
    gravite: rouge ? "rouge" : "orange",
    titre: `${s.organisation} · ${s.evenement}`,
    remede: rouge
      ? "Le serveur a raté une écriture ou une lecture. Le journal de l'édition dit quand et à quelle étape ; un échec qui se répète est une panne, pas un geste du participant."
      : "Le rattrapage cherche ces photos au coffre à l'ouverture de la fiche et chaque jour, et fabrique les vignettes qui manquent. Celles qu'il ne trouve pas ne sont jamais arrivées : l'envoi a été interrompu avant la fin.",
    lignes,
  };
}
