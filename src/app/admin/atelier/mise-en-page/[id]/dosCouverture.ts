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
