/**
 * Le dos de la couverture, en mm, pour le projet ouvert (lot 0, 12/11 : préparé pour le lot « couverture », aucun écran
 * ne l'affiche encore).
 *
 * C'est l'ÉCRAN qui calcule : `src/lib/mise-en-page` n'a pas le droit d'importer `src/lib/atelier`, alors la formule
 * (`dosMmPourPages`, papier intérieur par finition, bulk, couverture) reste là-bas et ce module la relit pour le Projet.
 * Les modules de mise en page recevront le résultat (`dosMm`) en paramètre.
 *
 * ⚠️ `null` veut dire INCONNU, et l'export de la couverture s'arrête alors : jamais un dos inventé.
 * - le nombre de pages PAYÉ est celui du projet (`nbPagesCible`) ; avant le lot E on ne prenait JAMAIS `pagesDe(magazine)` (toujours
 *   impair), depuis il est pair et sert de dernier recours (voir `dosDeLaCouverture`) ; le payé prime toujours (D20) ;
 * - hors 24 à 60 pages paires, `dosMmPourPages` rend `null` (un agrafé n'a pas de dos : 0 mentirait) ;
 * - une finition inconnue (jamais choisie, colonne absente) rend `null` ici, alors que la COMMANDE replie sur le brillant
 *   (`finitionDuDossier`) : c'est au lot de la couverture de décider, avec Mathias, s'il applique ce défaut documenté.
 *   Ce module-ci ne le devine pas.
 */

import { dosMmPourPages } from "@/lib/atelier/impression";
import { pagesDe, type Projet } from "@/lib/mise-en-page/editeur";
import { dosSaisiValide } from "@/lib/mise-en-page/couverture";
import type { Magazine } from "@/lib/mise-en-page/magazine";

export function dosDuProjet(projet: Pick<Projet, "nbPagesCible" | "finition"> | null | undefined): number | null {
  if (!projet || projet.finition === null || projet.nbPagesCible === null) return null;
  /* `projet.finition` est un `FinitionMep` : le compilateur refuse cet appel si la liste de mots de l'éditeur
     diverge un jour de `Finition` (impression.ts). */
  return dosMmPourPages(projet.nbPagesCible, projet.finition);
}

/**
 * Le dos de la COUVERTURE affichée et exportée (lot B, 12/11, complété au lot E, 13/11), décision du chef de projet :
 * - les pages : celles PAYÉES du projet ; inconnues (édition, création libre), celles SAISIES sur la couverture ; à défaut, celles
 *   COMPOSÉES dans le magazine (lot E : depuis qu'il a une dernière page, `pagesDe` est toujours PAIR, c'est enfin un nombre de pages
 *   que `dosMmPourPages` accepte) ; aucune des trois = dos inconnu, l'export de la couverture s'arrête avec une phrase (jamais un
 *   dos inventé) ;
 * - la finition : celle du dossier ; jamais choisie, le défaut documenté de la COMMANDE réelle (brillant, comme
 *   `finitionDuDossier`), et l'écran le DIT (`finitionParDefaut`) ;
 * - lot E : une LARGEUR SAISIE à la main (`dosSaisi`, en mm) REMPLACE ce calcul jusqu'à ce qu'on l'efface ; `origine` dit lequel des deux
 *   est utilisé, `calcule` garde le dos que le calcul donnerait, pour que l'écran le montre en repère.
 */
export type DosCouverture = {
  dos: number | null;
  pages: number | null;
  source: "projet" | "saisie" | "magazine" | null;
  finition: "gloss" | "matte";
  finitionParDefaut: boolean;
  /** La phrase qui dit pourquoi le dos manque (null s'il est connu). */
  manque: string | null;
  /** Lot E : `main` = la largeur saisie par l'atelier est utilisée ; `calcule` = le dos vient du nombre de pages et de la finition. */
  origine: "calcule" | "main";
  /** Lot E : le dos que le CALCUL donne (null : inconnu), même quand la largeur saisie le remplace. */
  calcule: number | null;
  /** Lot E : la largeur saisie à la main (null : aucune). */
  saisi: number | null;
};

export type OptionsDos = {
  /** Lot E : le dos saisi à la main (`Couverture.dosMm`) ; hors des bornes, il est ignoré. */
  dosSaisi?: number | null;
  /** Lot E : le nombre de pages COMPOSÉES du magazine (`pagesDe`), dernier recours pour calculer le dos. */
  pagesMagazine?: number | null;
};

export function dosDeLaCouverture(
  projet: Pick<Projet, "nbPagesCible" | "finition"> | null | undefined,
  pagesSaisies: number | null | undefined,
  options: OptionsDos = {},
): DosCouverture {
  const finition = projet?.finition ?? "gloss";
  const finitionParDefaut = !projet?.finition;
  const duProjet = projet && Number.isInteger(projet.nbPagesCible) ? projet.nbPagesCible : null;
  const saisies = Number.isInteger(pagesSaisies) ? (pagesSaisies as number) : null;
  const composees = Number.isInteger(options.pagesMagazine) ? (options.pagesMagazine as number) : null;
  const pages = duProjet ?? saisies ?? composees;
  const source = duProjet !== null ? "projet" : saisies !== null ? "saisie" : composees !== null ? "magazine" : null;
  const saisi = dosSaisiValide(options.dosSaisi) ? options.dosSaisi : null;
  let calcule: number | null = null;
  let manqueCalcul: string | null = "Pages à saisir pour le dos";
  if (pages !== null) {
    calcule = dosMmPourPages(pages, finition);
    manqueCalcul = calcule === null ? (source === "magazine" ? `${pages} pages composées : dos carré de 24 à 60 pages paires` : "Dos carré : 24 à 60 pages paires") : null;
  }
  if (saisi !== null) return { dos: saisi, pages, source, finition, finitionParDefaut, manque: null, origine: "main", calcule, saisi };
  return { dos: calcule, pages, source, finition, finitionParDefaut, manque: manqueCalcul, origine: "calcule", calcule, saisi: null };
}

/** Le dos de l'ÉTAT de l'éditeur : le projet, les pages et le dos saisis sur la couverture, les pages composées. Un seul endroit pour l'écran et l'export. */
export function dosDeLEtat(e: { projet: Projet | null; magazine: Magazine }): DosCouverture {
  const c = e.magazine.couverture;
  return dosDeLaCouverture(e.projet, c?.pages ?? null, { dosSaisi: c?.dosMm ?? null, pagesMagazine: pagesDe(e.magazine) });
}
