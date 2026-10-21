/**
 * « La collecte est-elle terminée, depuis quand, et qui l'a dit ? » — les phrases
 * de l'espace du client ET de la fiche de l'atelier (retour de Mathias, 21/10).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Ce qui était vrai avant : le client terminait la collecte, puis la page ne le
 * redisait plus nulle part (une pastille « Collecte close » dans un coin), et
 * l'atelier ne le voyait qu'en creusant l'onglet Photos. Ici, une seule source
 * pour les mots :
 * - l'espace du client (`ligneCollecteTerminee`, `ligneOubli`) : une ligne d'état
 *   au tableau de bord et sur la page Photos ;
 * - la fiche de l'atelier (`blocCollecte`) : « ouverte jusqu'au … » ou « terminée
 *   le … par … », avec ce qui permet ou non de rouvrir ;
 * - la liste des éditions (`pastilleCollecte`).
 *
 * La DATE d'une collecte terminée est `cloture_le` : « Terminer » et « Clore
 * maintenant » la posent à l'instant du geste, et une clôture arrivée à son
 * terme est, elle, la date prévue. QUI l'a dit se lit au journal (`geste`,
 * `terminer_collecte` / `clore_collecte` / `rouvrir_collecte`) : le plus récent
 * des trois gagne.
 *
 * Tout est à l'heure de PARIS (dates.ts), jamais celle de la machine.
 */

import { formaterHeureParis, formaterJourParis } from "./dates";
import { lireInstant, type EtatEdition } from "./etats";

/** Les trois gestes du journal qui changent l'état de la collecte. */
export const GESTES_COLLECTE = ["clore_collecte", "terminer_collecte", "rouvrir_collecte"] as const;
export type GesteCollecteCle = (typeof GESTES_COLLECTE)[number];

/** Le dernier geste de collecte lu au journal : lequel, par qui (le nom écrit au journal), quand. */
export type GesteDeCollecte = { geste: GesteCollecteCle; par: string; le: string };

/**
 * Un geste doit dater de la clôture pour dire QUI l'a posée : « Terminer » écrit
 * `cloture_le` puis le journal, à quelques millisecondes. Si l'atelier a déplacé
 * la clôture depuis (réglages), l'ancien geste ne parle plus de cette date-là.
 */
export const TOLERANCE_GESTE_MS = 10 * 60_000;

/** « 21 octobre » et « 11 h 24 », heure de Paris ; vides si l'instant est illisible. */
export function jourEtHeure(iso: string | null | undefined): { jour: string; heure: string } {
  if (!iso || lireInstant(iso) === null) return { jour: "", heure: "" };
  /* « 1er novembre » : Intl écrit « 1 », ce qu'aucun francophone n'écrit (comme `formaterJour` de l'atelier). */
  const jour = formaterJourParis(iso).replace(/^1 /, "1er ");
  return { jour, heure: formaterHeureParis(iso) };
}

/** « le 21 octobre à 11 h 24 » ; « » si l'instant est illisible (jamais une date inventée). */
export function quandParis(iso: string | null | undefined): string {
  const { jour, heure } = jourEtHeure(iso);
  if (!jour) return "";
  return heure ? `le ${jour} à ${heure}` : `le ${jour}`;
}

/* ───────────────────────────── l'espace du client ───────────────────────────── */

/**
 * La ligne d'état d'une collecte terminée, au tableau de bord et sur la page Photos :
 * « Collecte terminée le 21 octobre à 11 h 24 : les liens ne reçoivent plus de photos.
 * L'atelier compose. » Sans date lisible, la phrase se tait sur la date plutôt que d'en inventer une.
 */
export function ligneCollecteTerminee(clotureLe: string | null | undefined): string {
  const { tete, suite } = partiesCollecteTerminee(clotureLe);
  return `${tete} : ${suite}`;
}

/** La même ligne en deux morceaux (la tête se met en gras à l'écran, la suite reste normale). */
export function partiesCollecteTerminee(clotureLe: string | null | undefined): { tete: string; suite: string } {
  const quand = quandParis(clotureLe);
  return { tete: `Collecte terminée${quand ? ` ${quand}` : ""}`, suite: "les liens ne reçoivent plus de photos. L'atelier compose." };
}

/**
 * La phrase de la fenêtre « Terminer la collecte maintenant ? » sur ce que l'atelier recevra. `photos`
 * est le total reçu (`null` : pas encore connu de l'écran) ; `selection`, « Ma sélection » du client.
 */
export function phraseAtelierCommence(photos: number | null, selection: number, tu: boolean): string {
  const n = (x: number) => x.toLocaleString("fr-FR");
  const base = photos === null ? "L'atelier commence avec les photos reçues" : photos === 1 ? "L'atelier commence avec la photo reçue" : `L'atelier commence avec les ${n(photos)} photos`;
  const choix = selection > 0 && photos !== 1 ? ` et ${tu ? "tes" : "vos"} ${n(selection)} choisies` : "";
  return `${base}${choix}.`;
}

/** Sous la ligne, pour le responsable seul : un oubli se rattrape, par l'atelier (le registre de l'édition). */
export function ligneOubli(tu: boolean): string {
  return tu ? "Un oubli ? Écris à l'atelier : il peut rouvrir." : "Un oubli ? Écrivez à l'atelier : il peut rouvrir.";
}

/** Ce que dit un bouton de dépôt ou de création de lien éteint (survol, lecteur d'écran). */
export const RAISON_COLLECTE_TERMINEE = "La collecte est terminée : les liens ne reçoivent plus de photos.";

/* ───────────────────────────── la fiche de l'atelier ───────────────────────────── */

/** Une ligne de `collectif_evenements` lue pour son geste ; tout autre type ou geste rend `null`. */
export function lireGesteDeCollecte(ligne: { type?: unknown; payload?: unknown; created_at?: unknown } | null | undefined): GesteDeCollecte | null {
  if (!ligne || (ligne.type !== undefined && ligne.type !== "geste")) return null;
  const payload = ligne.payload && typeof ligne.payload === "object" ? (ligne.payload as Record<string, unknown>) : null;
  const cle = payload?.cle;
  const geste = GESTES_COLLECTE.find((g) => g === cle);
  if (!geste || typeof ligne.created_at !== "string" || lireInstant(ligne.created_at) === null) return null;
  return { geste, par: typeof payload?.par === "string" ? payload.par.trim() : "", le: ligne.created_at };
}

/** Le plus récent des gestes de collecte parmi des lignes du journal (dans n'importe quel ordre). */
export function dernierGesteDeCollecte(lignes: readonly { type?: unknown; payload?: unknown; created_at?: unknown }[]): GesteDeCollecte | null {
  let dernier: GesteDeCollecte | null = null;
  for (const l of lignes) {
    const g = lireGesteDeCollecte(l);
    if (g && (!dernier || (lireInstant(g.le) ?? 0) > (lireInstant(dernier.le) ?? 0))) dernier = g;
  }
  return dernier;
}

export type BlocCollecte = {
  /** `true` : les liens ne reçoivent plus de photos (l'état effectif a dépassé la préparation). */
  termine: boolean;
  /** « Collecte ouverte jusqu'au 4 novembre à 23 h 59 » / « Collecte terminée le 21 octobre à 11 h 24 par Mathias Durand ». */
  titre: string;
  /** Une phrase de plus : ce que ça change, et si l'on peut rouvrir. */
  detail: string;
  /** Le bouton « Rouvrir la collecte » a un sens ici (état composition, édition non archivée) ; la route rejuge. */
  rouvrable: boolean;
};

/**
 * Le bloc d'état du haut de la fiche. `etat` est l'état EFFECTIF (une clôture passée est une
 * composition, même si la base dit encore préparation). `geste` est le dernier geste de collecte
 * du journal, ou `null`.
 */
export function blocCollecte(o: { etat: EtatEdition; clotureLe: string | null; archivee: boolean; geste: GesteDeCollecte | null }): BlocCollecte {
  const { jour, heure } = jourEtHeure(o.clotureLe);
  const g = o.geste;

  if (o.etat === "preparation") {
    const titre = jour ? `Collecte ouverte jusqu'au ${jour}${heure ? ` à ${heure}` : ""}` : o.clotureLe ? "Collecte ouverte" : "Collecte ouverte, sans date de clôture";
    /* Rouverte par un geste : on le dit tant que c'est le dernier mot. */
    const detail = g?.geste === "rouvrir_collecte" ? `${[`Rouverte${g.par ? ` par ${g.par}` : ""}`, quandParis(g.le)].filter(Boolean).join(" ")}.` : "";
    return { termine: false, titre, detail, rouvrable: false };
  }

  /* Terminée. La date est la clôture ; à défaut, l'instant du geste. */
  const quand = quandParis(o.clotureLe) || quandParis(g?.geste === "rouvrir_collecte" ? null : g?.le);
  /* Qui l'a dit : seulement si le geste est le dernier mot ET date de cette clôture-là. */
  const memeInstant = (() => {
    if (!g || g.geste === "rouvrir_collecte") return false;
    const cloture = lireInstant(o.clotureLe);
    const geste = lireInstant(g.le);
    return cloture === null || (geste !== null && Math.abs(cloture - geste) <= TOLERANCE_GESTE_MS);
  })();
  const par = !memeInstant || !g ? "" : g.geste === "terminer_collecte" ? g.par : g.par ? `l'atelier (${g.par})` : "l'atelier";
  const titre = `Collecte terminée${quand ? ` ${quand}` : ""}${par ? ` par ${par}` : ""}`;

  const rouvrable = o.etat === "composition" && !o.archivee;
  const naturelle = !memeInstant ? "La date de clôture est passée. " : "";
  const suite = o.archivee
    ? "L'édition est archivée : la récupérer pour pouvoir rouvrir la collecte."
    : o.etat === "composition"
      ? "Elle peut être rouverte tant qu'aucun bon à tirer n'est publié."
      : "Elle ne peut plus être rouverte : un bon à tirer est publié.";
  return { termine: true, titre, detail: `${naturelle}Les liens ne reçoivent plus de photos. ${suite}`, rouvrable };
}

/** La pastille de la liste des éditions : lisible d'un coup d'œil, sans date (la colonne la porte). */
export function pastilleCollecte(etat: EtatEdition): { texte: "Collecte ouverte" | "Collecte terminée"; ton: "vert" | "bleu" } {
  return etat === "preparation" ? { texte: "Collecte ouverte", ton: "vert" } : { texte: "Collecte terminée", ton: "bleu" };
}
