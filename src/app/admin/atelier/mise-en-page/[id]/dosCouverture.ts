/**
 * Le dos de la couverture, en mm, pour le projet ouvert (lot 0, 12/11 : préparé pour le lot « couverture », aucun écran
 * ne l'affiche encore).
 *
 * C'est l'ÉCRAN qui calcule : `src/lib/mise-en-page` n'a pas le droit d'importer `src/lib/atelier`, alors la formule
 * (`dosMmPourPages`, papier intérieur par finition, bulk, couverture) reste là-bas et ce module la relit pour le Projet.
 * Les modules de mise en page recevront le résultat (`dosMm`) en paramètre.
 *
 * ⚠️ `null` veut dire INCONNU, et l'export de la couverture s'arrête alors : jamais un dos inventé.
 * - le nombre de pages PAYÉ est celui du projet (`nbPagesCible`), JAMAIS `pagesDe(magazine)` (toujours impair : une
 *   couverture ne se mesure pas sur les pages posées, mais sur les pages facturées et imprimées, D20) ;
 * - hors 24 à 60 pages paires, `dosMmPourPages` rend `null` (un agrafé n'a pas de dos : 0 mentirait) ;
 * - une finition inconnue (jamais choisie, colonne absente) rend `null` ici, alors que la COMMANDE replie sur le brillant
 *   (`finitionDuDossier`) : c'est au lot de la couverture de décider, avec Mathias, s'il applique ce défaut documenté.
 *   Ce module-ci ne le devine pas.
 */

import { dosMmPourPages } from "@/lib/atelier/impression";
import type { Projet } from "@/lib/mise-en-page/editeur";

export function dosDuProjet(projet: Pick<Projet, "nbPagesCible" | "finition"> | null | undefined): number | null {
  if (!projet || projet.finition === null || projet.nbPagesCible === null) return null;
  /* `projet.finition` est un `FinitionMep` : le compilateur refuse cet appel si la liste de mots de l'éditeur
     diverge un jour de `Finition` (impression.ts). */
  return dosMmPourPages(projet.nbPagesCible, projet.finition);
}

/**
 * Le dos de la COUVERTURE affichée et exportée (lot B, 12/11), décision du chef de projet :
 * - les pages : celles PAYÉES du projet ; inconnues (édition, création libre), celles SAISIES sur la couverture ;
 *   aucune des deux = dos inconnu, l'export de la couverture s'arrête avec une phrase (jamais un dos inventé) ;
 * - la finition : celle du dossier ; jamais choisie, le défaut documenté de la COMMANDE réelle (brillant, comme
 *   `finitionDuDossier`), et l'écran le DIT (`finitionParDefaut`).
 */
export type DosCouverture = {
  dos: number | null;
  pages: number | null;
  source: "projet" | "saisie" | null;
  finition: "gloss" | "matte";
  finitionParDefaut: boolean;
  /** La phrase qui dit pourquoi le dos manque (null s'il est connu). */
  manque: string | null;
};

export function dosDeLaCouverture(projet: Pick<Projet, "nbPagesCible" | "finition"> | null | undefined, pagesSaisies: number | null | undefined): DosCouverture {
  const finition = projet?.finition ?? "gloss";
  const finitionParDefaut = !projet?.finition;
  const duProjet = projet && Number.isInteger(projet.nbPagesCible) ? projet.nbPagesCible : null;
  const saisies = Number.isInteger(pagesSaisies) ? (pagesSaisies as number) : null;
  const pages = duProjet ?? saisies;
  const source = duProjet !== null ? "projet" : saisies !== null ? "saisie" : null;
  if (pages === null) return { dos: null, pages, source, finition, finitionParDefaut, manque: "Pages à saisir pour le dos" };
  const dos = dosMmPourPages(pages, finition);
  return { dos, pages, source, finition, finitionParDefaut, manque: dos === null ? "Dos carré : 24 à 60 pages paires" : null };
}
