/**
 * L'encart « À compléter » de la fiche d'une édition (planche 7B du 21/10, validée par
 * Mathias : « il y a des cases à remplir pour l'atelier, mais il faut du coup qu'on ait
 * les infos avant, sinon on ne pourra pas le remplir »).
 * Module PUR : aucun accès base, réseau ou environnement. L'atelier seul le voit,
 * jamais le client.
 *
 * Une édition s'ouvre avec quatre champs (`CHAMPS_OBLIGATOIRES`, saisie.ts). Tout le reste
 * peut attendre, et c'est CETTE liste qui garde la trace de ce qui attend : la fiche écrit
 * ce qui manque, dans l'ordre où ça compte, POURQUOI, et où aller le régler. Une ligne
 * disparaît dès que son champ est rempli, l'encart disparaît quand tout l'est.
 *
 * Trois niveaux :
 * - `bloque` : aucun lien de groupe pour l'instant, donc rien à envoyer aux participants
 *   (le lien général de l'édition n'est plus montré) ;
 * - `conseille` : la clôture (sans date, la collecte reste ouverte jusqu'à ce que quelqu'un
 *   la ferme) ;
 * - `facultatif` : le devis, le plafond par personne, les dates, le rendez-vous.
 *
 * ⚠️ AUCUN CHIFFRE INVENTÉ. Le seul nombre écrit ici, « 100 photos par personne », est celui
 * du plafond d'un lien sans plafond d'atelier : il vient de `plafondLienMax`, jamais d'un
 * littéral. Une ligne nomme ce qui manque, elle ne propose jamais de valeur.
 */

import type { EtatEdition } from "./etats";
import { plafondLienMax } from "./plafonds";
import type { CleEtape } from "./saisie";

export type NiveauACompleter = "bloque" | "conseille" | "facultatif";
export type CleACompleter = "liens" | "cloture" | "devis" | "par_personne" | "dates" | "rdv";

/** Ce que la fiche sait de l'édition : seulement les colonnes que la liste lit. */
export type EditionACompleter = {
  plafond_participant_atelier: number | null;
  cloture_le: string | null;
  pagination_prevue: number | null;
  tirage: number | null;
  tours_inclus: number | null;
  nb_propositions_couverture: number | null;
  dates_texte: string | null;
  rdv_url: string | null;
  responsable_nom: string | null;
  livraison?: { prevue_le?: string | null } | null;
};

/** Un lien de contribution de l'édition ; seul compte celui qui n'est pas retiré. */
export type LienACompleter = { retire: boolean };

export type OptionsACompleter = {
  /** L'état EFFECTIF de l'édition (`etatEffectif`), jamais l'état stocké. */
  etat: EtatEdition;
  archivee: boolean;
  /** Le client peut déjà prendre rendez-vous par l'agenda de l'atelier (interlocuteur relié) : le lien n'est plus le seul chemin. */
  rdvParAgenda?: boolean;
};

/** Où le bouton d'une ligne mène : un onglet de la fiche, et dans « Réglages et liens » l'étape du formulaire. */
export type OuvreACompleter = { onglet: "reglages" | "livraison"; etape?: CleEtape };

export type LigneACompleter = {
  cle: CleACompleter;
  niveau: NiveauACompleter;
  titre: string;
  /** La phrase qui dit pourquoi ça compte. */
  pourquoi: string;
  /** Ce que dit la puce : « bloque les dépôts », « conseillé », « facultatif », « 4 champs ». */
  puce: string;
  bouton: "Compléter" | "Préparer";
  ouvre: OuvreACompleter;
};

const vide = (v: string | null | undefined): boolean => !v || !v.trim();

/** Le prénom du responsable, pour « Mathilde les crée dans son espace » ; `null` s'il n'a pas de nom. */
export function prenomDuResponsable(nom: string | null | undefined): string | null {
  return (nom ?? "").trim().split(/\s+/)[0] || null;
}

/** Les quatre champs du devis, dans l'ordre de l'étape « Le devis », avec ce que la ligne en dit. */
const CHAMPS_DEVIS = [
  { champ: "pagination_prevue", nom: "pagination" },
  { champ: "tirage", nom: "tirage" },
  { champ: "tours_inclus", nom: "tours de corrections" },
  { champ: "nb_propositions_couverture", nom: "propositions de couverture" },
] as const;

const EN_LETTRES = ["Un", "Deux", "Trois", "Quatre"] as const;

/** Les états où la collecte des photos est encore ouverte : c'est là seulement que le lien et la clôture comptent. */
const collecteOuverte = (etat: EtatEdition) => etat === "preparation";

/**
 * Ce qui manque à une édition, dans l'ordre où ça compte. Une édition archivée ou livrée n'a plus rien
 * à compléter : la liste est vide. La même fonction nourrit l'encart et le harnais.
 */
export function aCompleter(edition: EditionACompleter, liens: readonly LienACompleter[], options: OptionsACompleter): LigneACompleter[] {
  if (options.archivee || options.etat === "livree") return [];
  const lignes: LigneACompleter[] = [];

  if (collecteOuverte(options.etat) && !liens.some((l) => !l.retire)) {
    const qui = prenomDuResponsable(edition.responsable_nom) ?? "Le responsable";
    lignes.push({
      cle: "liens",
      niveau: "bloque",
      titre: "Les liens des participants",
      pourquoi: `Aucun lien de groupe pour l'instant : il n'y a encore rien à envoyer aux participants. ${qui} les crée dans son espace, vous pouvez les préparer ici.`,
      puce: "bloque les dépôts",
      bouton: "Préparer",
      ouvre: { onglet: "reglages" },
    });
  }

  if (collecteOuverte(options.etat) && !edition.cloture_le) {
    lignes.push({
      cle: "cloture",
      niveau: "conseille",
      titre: "Clôture de la collecte",
      pourquoi: "Sans date, la collecte reste ouverte jusqu'à ce que quelqu'un la ferme.",
      puce: "conseillé",
      bouton: "Compléter",
      ouvre: { onglet: "reglages", etape: "calendrier" },
    });
  }

  const devisManquant = CHAMPS_DEVIS.filter((c) => edition[c.champ] === null);
  if (devisManquant.length) {
    const n = devisManquant.length;
    const tirage = devisManquant.some((c) => c.champ === "tirage");
    lignes.push({
      cle: "devis",
      niveau: "facultatif",
      titre: `Le devis : ${devisManquant.map((c) => c.nom).join(", ")}`,
      pourquoi: `${EN_LETTRES[n - 1]} champ${n > 1 ? "s" : ""} à fixer quand le devis est arrêté.${tirage ? " Le client lit le tirage dans ses documents." : ""}`,
      puce: `${n} champ${n > 1 ? "s" : ""}`,
      bouton: "Compléter",
      ouvre: { onglet: "reglages", etape: "devis" },
    });
  }

  if (collecteOuverte(options.etat) && edition.plafond_participant_atelier === null) {
    lignes.push({
      cle: "par_personne",
      niveau: "facultatif",
      titre: "Photos par personne",
      pourquoi: `Sans ce nombre, un lien peut porter jusqu'à ${plafondLienMax({ plafond_participant_atelier: null })} photos par personne ; il ne bloque plus aucun dépôt.`,
      puce: "facultatif",
      bouton: "Compléter",
      ouvre: { onglet: "reglages", etape: "photos" },
    });
  }

  const sansDates = vide(edition.dates_texte);
  const sansLivraison = vide(edition.livraison?.prevue_le);
  if (sansDates || sansLivraison) {
    lignes.push({
      cle: "dates",
      niveau: "facultatif",
      titre: sansDates && sansLivraison ? "Dates de l'événement et livraison souhaitée" : sansDates ? "Dates de l'événement" : "Livraison souhaitée",
      pourquoi: sansDates
        ? sansLivraison
          ? "Elles apparaissent dans la frise et dans l'onglet « Livraison »."
          : "Elles apparaissent dans la frise et en tête de la fiche."
        : "Elle apparaît dans la frise et dans l'onglet « Livraison ».",
      puce: "facultatif",
      bouton: "Compléter",
      /* Les dates se règlent dans le formulaire ; la livraison souhaitée, une fois l'édition créée, dans l'onglet Livraison (avec l'adresse). */
      ouvre: sansDates ? { onglet: "reglages", etape: "calendrier" } : { onglet: "livraison" },
    });
  }

  if (vide(edition.rdv_url) && !options.rdvParAgenda) {
    lignes.push({
      cle: "rdv",
      niveau: "facultatif",
      titre: "Lien de rendez-vous",
      pourquoi: "Sans lui, le client ne peut pas prendre rendez-vous depuis son espace.",
      puce: "facultatif",
      bouton: "Compléter",
      ouvre: { onglet: "reglages", etape: "client" },
    });
  }

  return lignes;
}

/**
 * La phrase sous le titre. « Sauf le premier point » seulement quand le premier point bloque
 * vraiment : sinon la phrase mentirait.
 */
export function introACompleter(lignes: readonly LigneACompleter[]): string {
  const bloque = lignes.some((l) => l.niveau === "bloque");
  return `Rien n'empêche d'avancer${bloque ? ", sauf le premier point" : ""}. Chaque ligne disparaît dès que le champ est rempli ; l'encart disparaît quand tout est fait.`;
}

/** L'adresse (relative) du bouton d'une ligne : l'onglet, et l'étape du formulaire s'il y en a une. */
export function hrefACompleter(o: OuvreACompleter): string {
  return `?onglet=${o.onglet}${o.etape ? `&etape=${o.etape}` : ""}`;
}
