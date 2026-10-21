/**
 * « Photos, en plus simple » (22/10/2026, planches 8 à 13 validées par Mathias) : le téléphone marche comme une application.
 * Module PUR : aucun accès base, réseau ou écran ; les écritures et le partage de l'iPhone sont INJECTÉS (le harnais les simule,
 * jamais la vraie base). L'écran (`Collecte.tsx` et ses voisins) ne fait que les brancher.
 *
 * La règle de Mathias : « si un bouton n'a pas sa place, s'il peut être remplacé ou mieux placé, s'il ajoute une étape, il n'a pas
 * sa place ». D'où ce qui est décidé ici, une fois :
 * - le « … » du haut (et le menu de l'ordinateur) : Sélectionner, Supprimées récemment, puis après un filet Terminer la collecte ;
 * - le menu de l'APPUI LONG sur une photo : Favori, Voir qui l'a envoyée, puis Supprimer ;
 * - le CŒUR (favori) : il bascule ; sur plusieurs photos, il retire si toutes le sont déjà ;
 * - la FIN DE COLLECTE en deux choix, dont « Choisir d'abord mes préférées » : les cœurs sont écrits D'ABORD, la collecte ne se
 *   termine QUE si ils le sont tous ;
 * - le PARTAGE : la feuille de l'iPhone d'abord, la petite fenêtre en repli.
 * Les marques sont celles de « Ma sélection » (`preselection`, route `/api/collectif/photos/marquer`) : l'atelier les retrouve dans son
 * téléchargement, rien ne change de son côté.
 */

/* ───────────────────────────── le « … » du haut ───────────────────────────── */

export type CleMenuHaut = "selectionner" | "supprimees" | "terminer";
/** Une ligne du « … » : sa clé, son mot, et si un filet la sépare de ce qui précède (`terminer`, le geste final, toujours à part). */
export type EntreeMenuHaut = { cle: CleMenuHaut; libelle: string; filetAvant: boolean };

/**
 * Ce que le « … » du haut contient. L'équipe (lecture seule) n'a rien : pas de « … ». Le responsable, au TÉLÉPHONE :
 * - « Sélectionner » seulement quand une grille est à l'écran (« Toutes », un lien ouvert) et qu'elle n'est pas vide ;
 * - « Supprimées récemment · N » (le nombre quand il y en a) : la corbeille de 30 jours, atteinte d'ici, jamais posée sur la page ;
 * - « Terminer la collecte » après un filet, pour qui en a le droit, la collecte ouverte et au moins une photo reçue.
 * La collecte terminée (11D) : « Sélectionner » et le « + » disparaissent, le « … » ne garde que « Supprimées récemment ».
 * À l'ORDINATEUR (planche 13) : « Terminer la collecte » seulement ; « Supprimées récemment » est tout en bas de la colonne de gauche, et la
 * sélection se fait à la souris (une case au survol de chaque vignette) : le « … » n'a que le geste final.
 */
export function entreesDuMenuHaut(o: { ecrire: boolean; grille: boolean; vide: boolean; corbeille: number | null; terminer: boolean; ordinateur?: boolean; /** La collecte est terminée : « rien ne s'ajoute plus », plus de « Sélectionner » (planche 9, vue 11D). Absent : ouverte. */ ouverte?: boolean }): EntreeMenuHaut[] {
  if (!o.ecrire) return [];
  const lignes: EntreeMenuHaut[] = [];
  if (o.ordinateur) {
    if (o.terminer) lignes.push({ cle: "terminer", libelle: "Terminer la collecte", filetAvant: false });
    return lignes;
  }
  if (o.grille && !o.vide && o.ouverte !== false) lignes.push({ cle: "selectionner", libelle: "Sélectionner", filetAvant: false });
  lignes.push({ cle: "supprimees", libelle: o.corbeille && o.corbeille > 0 ? `Supprimées récemment · ${o.corbeille.toLocaleString("fr-FR")}` : "Supprimées récemment", filetAvant: false });
  if (o.terminer) lignes.push({ cle: "terminer", libelle: "Terminer la collecte", filetAvant: true });
  return lignes;
}

/* ───────────────────────────── l'appui long sur une photo ───────────────────────────── */

export type CleMenuPhoto = "favori" | "voirQui" | "supprimer";
export type EntreeMenuPhoto = { cle: CleMenuPhoto; libelle: string; danger: boolean; filetAvant: boolean; /** Le cœur est déjà posé : la ligne le montre plein et un nouveau toucher le retire. */ pose?: boolean };

/**
 * Le menu d'une photo (l'appui long, planche 10 1B) : trois lignes. « Voir qui l'a envoyée » ouvre les photos de cette personne dans la grille
 * (absent d'une photo de l'atelier, qui n'est pas une personne) ; « Supprimer » est en rouge, après un filet. L'équipe n'a pas de menu.
 */
export function entreesDuMenuPhoto(o: { ecrire: boolean; favori: boolean; voirQui: boolean }): EntreeMenuPhoto[] {
  if (!o.ecrire) return [];
  const lignes: EntreeMenuPhoto[] = [{ cle: "favori", libelle: "Favori", danger: false, filetAvant: false, pose: o.favori }];
  if (o.voirQui) lignes.push({ cle: "voirQui", libelle: "Voir qui l'a envoyée", danger: false, filetAvant: false });
  lignes.push({ cle: "supprimer", libelle: "Supprimer", danger: true, filetAvant: true });
  return lignes;
}

/* ───────────────────────────── le cœur ───────────────────────────── */

/**
 * Le cœur sur une ou plusieurs photos : il pose, ou il retire quand TOUTES celles qui sont touchées le sont déjà (toucher de nouveau le
 * retire). Aucune photo : il pose (rien ne part).
 */
export function gesteCoeur(touchees: readonly { preselection: boolean }[]): "poser" | "retirer" {
  return touchees.length > 0 && touchees.every((x) => x.preselection) ? "retirer" : "poser";
}

/* ───────────────────────────── « Choisir d'abord mes préférées » ───────────────────────────── */

/** Ce que le client a changé à ses favoris dans le mode calme : `etait` = le cœur déjà posé quand il a ouvert le mode, `garde` = ce qu'il veut. */
export type Choix = ReadonlyMap<string, { garde: boolean; etait: boolean }>;

/** La photo est-elle gardée ? Son choix s'il en a fait un ; sinon son cœur d'avant (les favoris sont gardés d'office). */
export const estGardee = (choix: Choix, photo: { id: string; preselection: boolean }): boolean => choix.get(photo.id)?.garde ?? photo.preselection;

/** Toucher une photo : gardée ⇄ pas gardée. Revenir à ce qu'elle était d'avance n'est plus un choix. */
export function basculerGardee(choix: Choix, photo: { id: string; preselection: boolean }): Choix {
  const suivant = new Map(choix);
  const garde = !estGardee(choix, photo);
  if (garde === photo.preselection) suivant.delete(photo.id);
  else suivant.set(photo.id, { garde, etait: photo.preselection });
  return suivant;
}

/** Garder, ou ne plus garder, plusieurs photos d'un coup (le rond d'un jour). */
export function fixerGardees(choix: Choix, photos: readonly { id: string; preselection: boolean }[], garde: boolean): Choix {
  const suivant = new Map(choix);
  for (const p of photos) {
    if (garde === p.preselection) suivant.delete(p.id);
    else suivant.set(p.id, { garde, etait: p.preselection });
  }
  return suivant;
}

/** « 12 gardées sur 2 692 » : les favoris de toute l'édition (`base`), plus et moins ce que le client vient de changer. */
export function nombreGardees(base: number, choix: Choix): number {
  let n = base;
  for (const c of choix.values()) if (c.garde !== c.etait) n += c.garde ? 1 : -1;
  return Math.max(0, n);
}

/** Ce qu'il faut écrire pour que les cœurs soient EXACTEMENT les photos gardées : poser sur les nouvelles, retirer de celles qu'on ne garde plus. */
export function planDesPreferees(choix: Choix): { aPoser: string[]; aRetirer: string[] } {
  const aPoser: string[] = [];
  const aRetirer: string[] = [];
  for (const [id, c] of choix) {
    if (c.garde && !c.etait) aPoser.push(id);
    else if (!c.garde && c.etait) aRetirer.push(id);
  }
  return { aPoser, aRetirer };
}

/* ───────────────────────────── terminer la collecte ───────────────────────────── */

/** Une écriture de cœurs, par lots : combien la base en a écrit, et si une requête a échoué (le réseau, une erreur) : alors RIEN ne se termine. */
export type EcritureCoeurs = (ids: readonly string[], coeur: boolean) => Promise<{ faits: number; echec: boolean }>;
export type FinReponse = { ok: true; termineLe: string } | { ok: false; message: string };
export type ResultatFin = { ok: true; termineLe: string; poses: number; retires: number } | { ok: false; etape: "coeurs" | "terminer"; message: string };

/** La phrase quand les cœurs n'ont pas pu être écrits : la collecte n'est PAS terminée, et l'écran le dit. */
export const phraseCoeursRates = (tu: boolean) =>
  `${tu ? "Tes préférées" : "Vos préférées"} n'ont pas pu être enregistrées, la collecte n'est pas terminée. ${tu ? "Réessaie" : "Réessayez"} dans un instant.`;

/**
 * « Envoyer ma sélection » : les cœurs d'ABORD (poser, puis retirer), la collecte ensuite, et SEULEMENT si toutes les écritures ont
 * abouti. Si l'écriture des cœurs échoue, `terminer` n'est jamais appelée : l'atelier ne recevrait pas la sélection promise, et les liens
 * des participants se fermeraient pour rien. Une exception d'une écriture compte comme un échec.
 */
export async function envoyerMaSelection(o: { plan: { aPoser: readonly string[]; aRetirer: readonly string[] }; ecrire: EcritureCoeurs; terminer: () => Promise<FinReponse>; tu: boolean }): Promise<ResultatFin> {
  let poses = 0;
  let retires = 0;
  try {
    if (o.plan.aPoser.length) {
      const r = await o.ecrire(o.plan.aPoser, true);
      if (r.echec) return { ok: false, etape: "coeurs", message: phraseCoeursRates(o.tu) };
      poses = r.faits;
    }
    if (o.plan.aRetirer.length) {
      const r = await o.ecrire(o.plan.aRetirer, false);
      if (r.echec) return { ok: false, etape: "coeurs", message: phraseCoeursRates(o.tu) };
      retires = r.faits;
    }
  } catch {
    return { ok: false, etape: "coeurs", message: phraseCoeursRates(o.tu) };
  }
  const fin = await o.terminer();
  if (!fin.ok) return { ok: false, etape: "terminer", message: fin.message };
  return { ok: true, termineLe: fin.termineLe, poses, retires };
}

/* ───────────────────────────── partager ───────────────────────────── */

/** Sans `url` : l'adresse est DANS le texte, seule sur sa ligne (planche 4). Passer aussi `url` la ferait coller une seconde fois
    à la fin du message par Messages et WhatsApp. */
export type DonneesPartage = { title: string; text: string };
/** Ce qu'il faut du navigateur : `navigator.share` quand il existe (Safari sur iPhone). */
export type Partageur = { share?: (donnees: DonneesPartage) => Promise<void> };

/**
 * Partager un lien : au TÉLÉPHONE, la feuille de partage de l'iPhone s'ouvre d'un toucher, sans fenêtre intermédiaire (le message
 * et l'adresse sont déjà écrits). `repli` : le navigateur ne sait pas partager, ou l'appel a échoué (autrement que par un renoncement) :
 * l'écran ouvre alors la fenêtre réduite (« Copier le message » et « QR code »). `annule` : la personne a fermé la feuille, rien à faire
 * (jamais un repli : elle a choisi de ne pas partager). À l'ordinateur, jamais d'appel : la fenêtre.
 */
export async function partagerSurLeTelephone(nav: Partageur | undefined, telephone: boolean, donnees: DonneesPartage): Promise<"partage" | "annule" | "repli"> {
  if (!telephone || !nav || typeof nav.share !== "function") return "repli";
  try {
    await nav.share(donnees);
    return "partage";
  } catch (e) {
    return typeof e === "object" && e !== null && (e as { name?: unknown }).name === "AbortError" ? "annule" : "repli";
  }
}
