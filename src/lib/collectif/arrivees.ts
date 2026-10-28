/**
 * Voir arriver les photos sans recharger (T-181, 19/10/2026, planche 3 validée).
 * Module PUR : aucun accès base, aucun réseau, importable navigateur.
 *
 * L'écran n'interroge qu'une lecture LÉGÈRE (`/api/collectif/photos/etat` :
 * un compte, et les lignes arrivées depuis la dernière vue), jamais la grande
 * lecture de la page Photos (toutes les photos, les doublons, 120 signatures).
 * Cadence choisie pour ne pas reproduire le sondage à 3,5 s de la messagerie
 * (T-169) : 30 s sur Photos, une minute sur le tableau de bord, rien quand
 * l'onglet est caché, une lecture tout de suite au retour si la dernière a
 * plus de 20 s. Soit 120 appels par heure au plus pour un onglet Photos ouvert.
 */

import { compterPersonnes, estParticipant, personnesDe, SANS_NOM, type LignePhoto } from "./dossiers";

export const SONDAGE_PHOTOS_MS = 30_000;
export const SONDAGE_TABLEAU_MS = 60_000;
/** Au retour sur l'onglet, on relit tout de suite si la dernière lecture a plus de… */
export const REPOS_MIN_MS = 20_000;
/** Les lignes relues au plus pour dire « de qui » : au-delà, on dit le nombre seul. */
export const ARRIVEES_LUES_MAX = 300;

export type Nouvelles = {
  /** Toutes les photos arrivées depuis la dernière vue, celles du responsable comprises. */
  n: number;
  /** Celles des participants : seules elles s'annoncent (le responsable sait ce qu'il envoie). */
  participants: number;
  /** Les noms, le plus fourni d'abord. */
  noms: { nom: string; n: number }[];
  personnes: number;
  /** La lecture a atteint `ARRIVEES_LUES_MAX` lignes : il en est arrivé davantage. */
  tronque: boolean;
};

/** Ce qui est arrivé depuis la dernière vue, lu sur les lignes rendues par la route. */
export function nouvellesDepuis(lignes: readonly Pick<LignePhoto, "deposant" | "role_deposant" | "provenance_id" | "appareil_id">[], max = ARRIVEES_LUES_MAX): Nouvelles {
  const deParticipants = lignes.filter(estParticipant);
  return {
    tronque: lignes.length >= max,
    n: lignes.length,
    participants: deParticipants.length,
    noms: personnesDe(deParticipants).map(({ nom, n }) => ({ nom, n })),
    personnes: compterPersonnes(deParticipants),
  };
}

/**
 * « 12 nouvelles photos de Mathias », « 15 nouvelles photos de Mathias et Léa »,
 * « 40 nouvelles photos de Mathias, Léa et 3 autres personnes ». `null` quand
 * aucun participant n'a rien envoyé : rien à annoncer.
 */
export function phraseArrivees(x: Nouvelles): string | null {
  if (x.participants <= 0) return null;
  const tete = `${x.tronque ? "Plus de " : ""}${x.participants} nouvelle${x.participants > 1 ? "s" : ""} photo${x.participants > 1 ? "s" : ""}`;
  /* « Sans nom » ne se dit pas comme un nom : il compte parmi « les autres ». */
  const noms = x.noms.map((p) => p.nom).filter((n) => n !== SANS_NOM);
  const montres = noms.slice(0, 2);
  const autres = Math.max(0, x.personnes - montres.length);
  if (montres.length === 0) return tete;
  if (autres === 0) return `${tete} de ${montres.join(" et ")}`;
  return `${tete} de ${montres.join(", ")} et ${autres} autre${autres > 1 ? "s" : ""} personne${autres > 1 ? "s" : ""}`;
}

/** Faut-il relire maintenant ? Onglet visible, et la dernière lecture date d'au moins `periode` (ou de `REPOS_MIN_MS` au retour). */
export function aRelire(maintenant: number, derniere: number, visible: boolean, periode: number, retour = false): boolean {
  if (!visible) return false;
  return maintenant - derniere >= (retour ? REPOS_MIN_MS : periode);
}

/* ───────────────────────────────────────────────────────────────────────────
   LE TEMPS RÉEL SANS REPÈRE, ET SANS CLIC (21/10/2026, test de Mathias,
   édition d'essai « Recette 1 »)

   Deux défauts, prouvés dans le code :
   1. Le sondage de la page Photos commençait par `if (!vuJusqua) return` : le
      repère vient de `stats.derniere`, qui vaut `null` tant qu'AUCUNE photo
      n'est arrivée. Une édition qui part de zéro ne sondait donc JAMAIS ; la
      route, elle, rend déjà `derniere` sans `depuis`. Le corps du sondage ne
      porte maintenant `depuis` que s'il existe (`corpsSondagePhotos`).
   2. Même avec des photos, la grille attendait un clic sur « Les voir » et les
      grands chiffres ne bougeaient pas. Les chiffres suivent chaque sondage ; la
      grille se relit d'elle-même quand c'est SANS RISQUE (`accueilDesArrivees`),
      sinon la pastille d'avant.
   ─────────────────────────────────────────────────────────────────────────── */

/** Le corps du sondage de la page Photos. `depuis` n'y est que si l'on a un repère. */
export type CorpsSondage = { token: string; chiffres: true; depuis?: string; connues?: number };

/**
 * Sans repère (aucune photo encore arrivée), pas de `depuis` : la route rend alors
 * `photos` et `derniere`, ce qui suffit à voir la première photo arriver.
 * `connues` : le nombre de photos que l'écran montre, pour que la route ne relise les
 * personnes que quand quelque chose a changé.
 */
export function corpsSondagePhotos(token: string, repere: string | null, connues: number | null): CorpsSondage {
  const corps: CorpsSondage = { token, chiffres: true };
  if (repere) corps.depuis = repere;
  if (connues !== null && Number.isFinite(connues) && connues >= 0) corps.connues = Math.floor(connues);
  return corps;
}

/** Ce que rend `/api/collectif/photos/etat`, relu avec méfiance (une réponse étrange ne casse pas l'écran). */
export type EtatSondage = {
  photos: number;
  derniere: string | null;
  nouvelles: Nouvelles | null;
  /** Seulement quand `chiffres` est demandé ET que quelque chose a changé. */
  personnes?: number;
  enCours?: number;
};

const entierOuNul = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);

export function lireEtatSondage(json: unknown): EtatSondage | null {
  if (typeof json !== "object" || json === null) return null;
  const j = json as Record<string, unknown>;
  const photos = entierOuNul(j.photos);
  if (photos === null) return null;
  const derniere = typeof j.derniere === "string" && j.derniere ? j.derniere : null;
  let nouvelles: Nouvelles | null = null;
  if (typeof j.nouvelles === "object" && j.nouvelles !== null) {
    const x = j.nouvelles as Record<string, unknown>;
    const n = entierOuNul(x.n);
    const participants = entierOuNul(x.participants);
    const personnes = entierOuNul(x.personnes);
    if (n === null || participants === null || personnes === null || !Array.isArray(x.noms)) return null;
    const noms = x.noms.flatMap((e): { nom: string; n: number }[] => {
      const o = e as Record<string, unknown> | null;
      return o && typeof o.nom === "string" && entierOuNul(o.n) !== null ? [{ nom: o.nom, n: entierOuNul(o.n) as number }] : [];
    });
    nouvelles = { n, participants, personnes, noms, tronque: x.tronque === true };
  }
  const etat: EtatSondage = { photos, derniere, nouvelles };
  const personnes = entierOuNul(j.personnes);
  if (personnes !== null) etat.personnes = personnes;
  const enCours = entierOuNul(j.enCours);
  if (enCours !== null) etat.enCours = enCours;
  return etat;
}

/**
 * La route doit-elle relire les personnes (la vue du résumé : quelques dizaines de lignes,
 * mais plus qu'un compte) ? Seulement si l'écran les demande ET que quelque chose a bougé :
 * des photos sont arrivées depuis le repère, ou le nombre de photos n'est plus celui que
 * l'écran montre (une suppression comprise), ou l'écran ne sait encore rien.
 */
export function personnesAFournir(demande: { chiffres: boolean; connues: number | null; photos: number; arrivees: number }): boolean {
  if (!demande.chiffres) return false;
  return demande.connues === null || demande.connues !== demande.photos || demande.arrivees > 0;
}

/**
 * Le sondage a-t-il vu bouger quelque chose qu'il faut relire ? Des photos arrivées depuis
 * le repère, ou un nombre qui n'est plus celui de l'écran. `dejaTraite` : le dernier nombre
 * pour lequel on a déjà relu la grille : si la grille et le sondage ne comptaient jamais la
 * même chose, on relirait toutes les 30 s pour rien ; une fois par nombre, jamais en boucle.
 */
export function ceQuiABouge(etat: Pick<EtatSondage, "photos" | "nouvelles">, photosVues: number, dejaTraite: number | null): boolean {
  if (etat.nouvelles && etat.nouvelles.n > 0) return true;
  return etat.photos !== photosVues && etat.photos !== dejaTraite;
}

/** Ce que la page montre à l'instant où des photos sont arrivées. */
export type SituationPhotos = {
  /** Aucune photo reçue : l'écran d'accueil « Les photos arriveront ici ». */
  vide: boolean;
  /**
   * La grille est ce qu'on regarde. Faux sur l'onglet « Les liens » et dans la corbeille : les relire (le nombre
   * par lien, les comptes) ne dérange rien.
   */
  grilleVisible: boolean;
  /**
   * La vue montre les DERNIÈRES ARRIVÉES en tête (« Tout », un lien, une personne, un dossier,
   * les albums « Par lien ») : une photo nouvelle y entre en haut. Faux pour Ma sélection,
   * Doublons, Ne pas publier, l'ordre « Par jour », un jour choisi et la corbeille.
   */
  dernieresEnTete: boolean;
  /** Une photo cochée, ou le mode « cocher » du téléphone. */
  coches: boolean;
  /** Une photo est agrandie. */
  agrandie: boolean;
  /** Une écriture ou une page est en route. */
  occupe: boolean;
  /** La zone de défilement de la grille est tout en haut (rien n'est poussé sous le doigt). */
  enHaut: boolean;
};

/**
 * Des photos sont arrivées : l'écran les INSÈRE de lui-même, ou annonce « N nouvelles · Les voir ».
 * - Un écran VIDE s'ouvre tout seul : rien à déranger, et cliquer sur « Les voir » devant un
 *   écran vide est absurde (le test de Mathias).
 * - Tout geste en cours l'emporte : une photo cochée ou agrandie, une écriture, une page en route.
 *   La grille se relit alors en page 0 et perdrait les cochées d'une page plus loin.
 * - L'onglet « Les liens » et la corbeille ne montrent pas la grille : la relire (le nombre par lien, la
 *   ligne « Corbeille ») ne dérange rien.
 * - Une vue qui ne range pas les arrivées en tête garde la pastille, et la grille qui défile n'est
 *   jamais poussée : il faut être tout en haut.
 */
export function accueilDesArrivees(s: SituationPhotos): "inserer" | "annoncer" {
  if (s.coches || s.agrandie || s.occupe) return "annoncer";
  if (s.vide || !s.grilleVisible) return "inserer";
  if (!s.dernieresEnTete || !s.enHaut) return "annoncer";
  return "inserer";
}

/**
 * Le seuil au-delà duquel une vignette porte « nouvelle » : ce que l'écran voyait AVANT cette insertion.
 * Sans repère (écran vide), le seuil est la chaîne vide : tout ce qui arrive est nouveau.
 * Chaque insertion REMPLACE le seuil : « nouvelle » dit ce qui vient d'entrer, pas tout ce qui est
 * arrivé depuis l'ouverture (une édition qui reçoit des photos toute la journée finirait toute marquée).
 */
export function seuilDeLInsertion(repere: string | null): string {
  return repere ?? "";
}

/* ───────────────────────────────────────────────────────────────────────────
   Les écrans de l'espace qui se relisent seuls au retour sur l'onglet
   (21/10/2026). Un layout ne se re-rend pas en navigation (Next 16) : le menu
   (cadenas, pastille des non-lus) et les écrans rendus au serveur vieillissent
   tant qu'on ne recharge pas. `router.refresh()` les relit sans toucher à l'état
   du navigateur.
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * Les écrans dont le serveur relit des choses que l'atelier ou un participant change SANS le client :
 * le tableau de bord (photos, messages, envois), les documents, la livraison, « Parler à l'atelier »
 * (propositions, rendez-vous).
 * Pas la page Photos (sa propre lecture légère), ni le bon à tirer ni le style : ils recopient leurs
 * données dans un état local (notes en cours, choix), un rafraîchissement du serveur y serait ignoré,
 * et le bon à tirer re-signe toutes ses pages (les images se rechargeraient).
 */
export const ECRANS_RELUS_AU_RETOUR: readonly string[] = ["tableau", "dossier", "livraison", "atelier"];

export const relireAuRetour = (section: string | null): boolean => section !== null && ECRANS_RELUS_AU_RETOUR.includes(section);
