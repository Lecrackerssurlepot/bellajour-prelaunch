/**
 * Le tri de la table de travail (PRD §12 : « triée par urgence »).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * URGENCE ≠ ANCIENNETÉ
 *
 * Un dossier en état 2 qui dort depuis huit jours attend LA CLIENTE : ce
 * n'est pas un retard, c'est un panier qui hésite, et c'est la relance M3b
 * qui s'en occupera. Un dossier payé depuis quatre jours dont la maquette
 * n'est pas partie, lui, est une promesse rompue.
 *
 * D'où la seule question posée à chaque ligne : QUI ATTEND QUOI. Quand c'est
 * l'atelier qui doit jouer, un compte à rebours court, adossé aux délais que
 * la page publique annonce déjà à la cliente. On se mesure sur nos propres
 * promesses, pas sur une moyenne inventée.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Module PUR : aucune base, aucun réseau. `maintenant` est toujours passé en
 * paramètre — un tri qui lit l'horloge en douce ne se teste pas.
 */

import type { Etat } from "./transitions";

export type Pile = "retard" | "a_faire" | "attente_cliente" | "dehors" | "termine";

export const LIBELLE_PILE: Record<Pile, string> = {
  retard: "En retard",
  a_faire: "À faire",
  attente_cliente: "Chez la cliente",
  dehors: "En route",
  termine: "Terminés",
};

/**
 * Où en est le DÉPÔT, quand le dossier est encore à l'état 1.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * TROIS SITUATIONS QUE `nb_photos` NE DISTINGUE PAS
 *
 * Le 25/08, un dossier est arrivé dans la pile « à faire » avec 55 photos et
 * un compte à rebours de 48 h. Personne ne l'avait envoyé : la cliente avait
 * fermé l'onglet avant le dernier bouton. L'atelier s'apprêtait donc à
 * composer un album à partir de photos dont l'accord d'usage n'avait jamais
 * été donné, contre une promesse de délai que personne ne lui avait faite.
 * Et comme la relance M2 exigeait `nb_photos === 0`, elle ne recevait rien
 * non plus. Silence des deux côtés, pour la prospect la plus engagée qui
 * soit : celle qui a déjà monté 55 photos.
 *
 * La cause : « a des photos » avait été confondu avec « a terminé son
 * dépôt ». Ce sont deux questions différentes, et le seul signal serveur du
 * dépôt terminé est `consent_photos`, posé au clic « Envoyer à l'atelier »
 * (moteur.ts → finaliser()). C'est déjà la règle de M1 dans mails.ts ; elle
 * manquait ici.
 *
 *   termine    — elle a cliqué. C'est du travail d'atelier.
 *   vide       — questionnaire rempli, pas une photo. Relance M2.
 *   abandonne  — les photos sont montées, le bouton jamais cliqué. Relance
 *                M2b, qui ne dit surtout pas « il manque vos photos ».
 * ══════════════════════════════════════════════════════════════════════════
 */
export type EtapeDepot = "termine" | "vide" | "abandonne";

/**
 * Fonction PURE, une seule vérité pour les trois écrans et pour la relève.
 *
 * `consentPhotos` prime toujours : une fois le dépôt terminé, le compteur de
 * photos ne dit plus rien d'utile sur l'avancement.
 */
export function etapeDepot(consentPhotos: boolean | null, nbPhotos: number): EtapeDepot {
  if (consentPhotos === true) return "termine";
  return nbPhotos > 0 ? "abandonne" : "vide";
}

type Delai = {
  /** Le compte à rebours de l'atelier. */
  heures?: number;
  /** Compté en jours OUVRÉS (week-end sauté) plutôt qu'en heures. */
  joursOuvres?: number;
  /** La promesse, telle qu'elle est écrite à la cliente. */
  promesse: string;
};

/**
 * Les délais que NOUS devons tenir. Un état absent de cette table n'a pas de
 * compte à rebours : la balle n'est pas dans notre camp.
 *
 * Les valeurs viennent du PRD §6 et de ce que la page publique affiche déjà :
 * changer un chiffre ici sans changer la page, c'est mentir à un des deux.
 */
export const DELAIS: Partial<Record<Etat, Delai>> = {
  photos_recues: { heures: 48, promesse: "Couverture sous 48 h" },
  payee: { joursOuvres: 3, promesse: "Numéro complet sous 3 jours ouvrés" },
  validee: { joursOuvres: 1, promesse: "Départ à l'impression sous 1 jour ouvré" },
};

/**
 * Qui doit jouer pour sortir de cet état.
 *
 * Exporté parce que trois écrans posent la même question sous trois formes :
 * la liste (dans quelle pile ranger la ligne), le parcours (qui attend, à
 * cette étape) et la fiche (est-ce mon tour). Une seule réponse, un seul
 * endroit — sinon les trois finissent par se contredire.
 */
export type Camp = "atelier" | "cliente" | "dehors" | "fini";

export const QUI_ATTEND: Record<Etat, Camp> = {
  photos_recues: "atelier",
  photos_insuffisantes: "cliente",
  apercu_pret: "cliente",
  payee: "atelier",
  maquette_prete: "cliente",
  validee: "atelier",
  en_production: "dehors",
  expediee: "dehors",
  livree: "fini",
};

/** Le camp où se trouve la balle, quand aucun compte à rebours ne court. */
const CAMP: Record<Etat, Pile> = {
  photos_recues: "a_faire",
  photos_insuffisantes: "attente_cliente",
  apercu_pret: "attente_cliente",
  payee: "a_faire",
  maquette_prete: "attente_cliente",
  validee: "a_faire",
  en_production: "dehors",
  expediee: "dehors",
  livree: "termine",
};

const JOUR_MS = 86_400_000;

/** Échéance en jours ouvrés : samedi et dimanche ne comptent pas. */
export function echeanceOuvree(depuis: Date, jours: number): Date {
  const d = new Date(depuis.getTime());
  let restants = jours;
  while (restants > 0) {
    d.setDate(d.getDate() + 1);
    const j = d.getDay();
    if (j !== 0 && j !== 6) restants--;
  }
  return d;
}

export function echeancePour(etat: Etat, depuisIso: string | null): Date | null {
  const d = DELAIS[etat];
  if (!d || !depuisIso) return null;
  const depuis = new Date(depuisIso);
  if (Number.isNaN(depuis.getTime())) return null;
  if (d.joursOuvres) return echeanceOuvree(depuis, d.joursOuvres);
  return new Date(depuis.getTime() + (d.heures ?? 0) * 3_600_000);
}

export type Urgence = {
  pile: Pile;
  /** Heures écoulées dans l'état courant. */
  age: number;
  /** Heures restantes avant l'échéance (négatif = retard). null = pas de compte à rebours. */
  reste: number | null;
  echeance: Date | null;
  promesse: string | null;
  /** Ce qui s'affiche dans la colonne : « 12 h restantes », « en retard de 2 j ». */
  libelle: string;
  /** Clé de tri : plus c'est petit, plus c'est haut dans la liste. */
  rang: number;
};

function formaterDuree(heures: number): string {
  const h = Math.abs(Math.round(heures));
  if (h < 1) return "moins d'une heure";
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} j`;
}

/**
 * L'urgence d'une ligne.
 *
 * `depot` : un dossier dont le dépôt n'est pas TERMINÉ n'est pas du travail
 * d'atelier — c'est une relance. Le mélanger à la pile « à faire » gonflerait
 * le compteur du matin avec des dossiers sur lesquels il n'y a rien à faire,
 * et le compteur cesserait d'être cru. Pire, il ferait courir un compte à
 * rebours de 48 h contre une promesse que personne n'a faite à la cliente.
 * Il part chez elle, quel que soit son âge.
 */
export function urgencePour(
  etat: Etat,
  etatMajLe: string | null,
  maintenant: Date,
  options: { depot?: EtapeDepot } = {}
): Urgence {
  const depuis = etatMajLe ? new Date(etatMajLe) : null;
  const age =
    depuis && !Number.isNaN(depuis.getTime())
      ? (maintenant.getTime() - depuis.getTime()) / 3_600_000
      : 0;

  if (options.depot && options.depot !== "termine") {
    return {
      pile: "attente_cliente",
      age,
      reste: null,
      echeance: null,
      promesse: null,
      /* Le libellé DIT laquelle des deux situations c'est. « En attente de
         ses photos » sur un dossier qui en porte 55 est un mensonge qui coûte
         cher : on le lit comme un dossier vide et on ne rappelle personne. */
      libelle:
        options.depot === "abandonne"
          ? `photos déposées mais jamais envoyées, depuis ${formaterDuree(age)}`
          : `en attente de ses photos depuis ${formaterDuree(age)}`,
      /* Trié par ancienneté à l'intérieur de sa pile, jamais devant du vrai
         travail : le décalage +1000 tient toutes les piles non urgentes
         derrière les retards et les à-faire, sans arithmétique fragile. */
      rang: 3000 - age,
    };
  }

  const echeance = echeancePour(etat, etatMajLe);
  const reste = echeance ? (echeance.getTime() - maintenant.getTime()) / 3_600_000 : null;
  const enRetard = reste !== null && reste < 0;
  const campNaturel = CAMP[etat] ?? "dehors";
  const pile: Pile = enRetard ? "retard" : campNaturel;
  const promesse = DELAIS[etat]?.promesse ?? null;

  let libelle: string;
  if (sansPromesse(reste)) libelle = `depuis ${formaterDuree(age)}`;
  else if (enRetard) libelle = `en retard de ${formaterDuree(reste as number)}`;
  else libelle = `${formaterDuree(reste as number)} restantes`;

  /* Le rang. Les retards d'abord, du plus en retard au moins ; puis le
     travail à faire, du plus urgent au moins ; puis tout ce qui tourne sans
     nous, du plus ancien au plus récent ; les terminés en dernier. */
  const rang =
    pile === "retard"
      ? (reste as number) // négatif : -50 h passe avant -2 h
      : pile === "a_faire"
        ? 1000 + (reste ?? 999)
        : pile === "attente_cliente"
          ? 3000 - age
          : pile === "dehors"
            ? 5000 - age
            : 9000 - age;

  return { pile, age, reste, echeance, promesse, libelle, rang };
}

/* Un `reste` absent veut dire « aucune promesse sur cet état » — on affiche
   alors l'ancienneté nue. Nommé pour que la condition se lise. */
function sansPromesse(reste: number | null): reste is null {
  return reste === null;
}

/** Le tri de la liste : l'urgence d'abord, l'ancienneté pour départager. */
export function comparerUrgence(a: Urgence, b: Urgence): number {
  return a.rang - b.rang || b.age - a.age;
}

/** Le bandeau du matin. */
export function compter(urgences: Urgence[]): Record<Pile, number> {
  const c: Record<Pile, number> = {
    retard: 0,
    a_faire: 0,
    attente_cliente: 0,
    dehors: 0,
    termine: 0,
  };
  for (const u of urgences) c[u.pile]++;
  return c;
}

/** Jours entiers écoulés — sert au « âge du dossier » de la fiche. */
export function joursDepuis(iso: string | null, maintenant: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((maintenant.getTime() - d.getTime()) / JOUR_MS);
}
