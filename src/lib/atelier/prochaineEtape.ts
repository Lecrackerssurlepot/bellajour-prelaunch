/**
 * La prochaine étape d'un dossier : QUI doit jouer, et QUEL geste.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN MODULE, ET PAS DEUX TABLES
 *
 * Le 11/09/2026, Mathias devant la table de travail : « on ne sait pas quand
 * c'est à nous de faire ». La colonne « État » disait « Photos reçues » ou
 * « Aperçu publié » : un nom, jamais un geste, jamais un camp. Le camp
 * existait pourtant (`QUI_ATTEND`, urgence.ts) et le geste aussi (la table
 * `SUITE` de parcours.ts), mais seule la fiche les lisait.
 *
 * Ce module est la seule table du geste attendu. La fiche (parcours.ts) et la
 * liste (donnees.ts → colonne « Prochaine étape ») la lisent toutes les deux :
 * deux tables auraient fini par dire deux choses différentes du même dossier.
 *
 * Les phrases sont à la troisième personne, au masculin générique (« le
 * client », jamais « elle ») : c'est la règle de tout le visible depuis la
 * PR #25. Quand c'est à nous, l'infinitif ; quand c'est au client, « Doit… »,
 * qui se lit d'un coup comme une attente et non comme un ordre.
 *
 * Module PUR : aucune date, aucune base. Les trois bascules de camp sont
 * EXACTEMENT celles d'`urgencePour` (retouches, ajustement, dépôt inachevé),
 * passées par les mêmes options : la colonne et la pile ne peuvent donc pas
 * se contredire, elles lisent le même jeu d'options.
 * ══════════════════════════════════════════════════════════════════════════
 */

import type { Etat } from "./transitions";
import { QUI_ATTEND, type Camp, type EtapeDepot } from "./urgence";

export type ProchaineEtape = {
  camp: Camp;
  /** « Composer la couverture », « Doit régler son numéro ». */
  geste: string;
};

/** Le camp, tel qu'il s'affiche dans une pastille. */
export const LIBELLE_CAMP: Record<Camp, string> = {
  atelier: "À nous",
  cliente: "Chez le client",
  dehors: "En route",
  fini: "Livré",
};

/**
 * Le geste qui fait sortir de l'état, hors bascule.
 *
 * Une entrée par état : ajouter un état à `transitions.ts` sans le nommer ici
 * fait tomber la compilation, ce qui est le but.
 */
const GESTE: Record<Etat, string> = {
  photos_recues: "Composer la couverture",
  photos_insuffisantes: "Doit compléter ses photos",
  apercu_pret: "Doit régler son numéro",
  payee: "Composer la maquette",
  maquette_prete: "Doit valider la maquette",
  validee: "Passer la commande d'impression",
  en_production: "L'imprimeur fabrique",
  expediee: "Le transporteur livre",
  livree: "Rien, le numéro est arrivé",
};

/** Le geste nominal d'un état : ce que la frise de la fiche affiche par jalon. */
export function gestePour(etat: Etat): string {
  return GESTE[etat];
}

/**
 * La prochaine étape d'UN dossier, bascules comprises.
 *
 * `depot` ne se pose qu'à l'état 1 (ailleurs, passer "termine" ou rien).
 * `retouches` ne se pose qu'à l'état 4, `ajustement` qu'à l'état 2 : c'est
 * l'appelant qui borne, exactement comme pour `urgencePour`.
 */
export function prochaineEtape(
  etat: Etat,
  options: { depot?: EtapeDepot; retouches?: boolean; ajustement?: boolean } = {},
): ProchaineEtape {
  if (options.retouches) {
    return { camp: "atelier", geste: "Republier la maquette corrigée" };
  }
  if (options.ajustement) {
    return { camp: "atelier", geste: "Reprendre la couverture" };
  }
  if (options.depot === "vide") {
    return { camp: "cliente", geste: "Doit envoyer ses photos" };
  }
  if (options.depot === "abandonne") {
    /* Les photos sont montées, le bouton final n'a jamais été cliqué : ce
       n'est pas « il manque des photos », c'est « il manque un clic ». Le
       dire autrement fait rappeler un client pour lui réclamer ce qu'il a
       déjà déposé (incident du 25/08). */
    return { camp: "cliente", geste: "Doit cliquer « Envoyer à l'atelier »" };
  }
  return { camp: QUI_ATTEND[etat], geste: GESTE[etat] };
}
