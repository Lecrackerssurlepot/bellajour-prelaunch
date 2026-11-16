# C16 : le texte ajouté proprement (la machine choisit sa place)

**Statut** : EN PROD le 16/11 (#367, vague 1 du 16/11, T-212 premier temps).
Règle R159 (`docs/reference/REGLES-TRI.md`). Retour de Mathias : « venir ajouter des textes aussi de manière très propre, par contre,
pas que ça passe le bordel ».

## Ce qu'elle fait
- Un geste, « Texte » dans le tiroir de la page ou de la double, à côté de « Fond » : la machine PROPOSE la place d'un titre et le pose
  (une entrée d'historique, Annuler le défait ; le survol montre où). L'atelier le déplace, l'écrit, le colore ou l'annule.
- La place, dans cet ordre :
  1. la plus grande zone LIBRE de la page (aucun cadre), faite de cases entières de la grille affichée (C10 et R156 : 6 × 6 par
     défaut, 8 × 8) ; le cadre prend la largeur de la zone, en haut de la zone, et les lignes qu'il faut pour deux lignes de son corps ;
  2. à défaut, l'endroit le plus CALME d'une photo lue : carte de chaleur (C05, `Mesure.chaleur`) la plus basse, jamais sur un visage
     (C04) ni sur la zone importante (C05), jamais par-dessus une autre photo ; blanc sur une photo sombre (C01, `lumi`) ;
  3. sinon rien, « Pas de place calme ».
- Le corps convient à la place : environ 14 signes sur une ligne, entre 14 pt (plancher des titres, C13) et 28 pt (titres des gabarits).
- Le texte posé est un cadre retouché de la disposition (`Disposition.cadres`, lot 4), au-dessus des autres : l'écran, le PDF et l'IDML
  le lisent comme tout cadre de texte. Rien de neuf pour Affinity (D28). Il dit « Titre » tant qu'on ne l'a pas écrit ; vide, il n'est
  jamais imprimé (D2).

## Où
- `src/lib/mise-en-page/editeur/texteAjoute.ts` : `placeDuTexte`, `ajouterTexte`, `motSansTexte`, `corpsPourLargeur`,
  `REGLAGES_TEXTE_AJOUTE` (la typographie de départ).
- `src/lib/mise-en-page/editeur/grilleMiseEnPage.ts` : les cases de la grille (`caseTrame`, `modulesDe`).
- Le geste `ajouterTexte` (`types.ts`, `plans.ts` avec `lirePourTexte`, `etat.ts` pour le mot du refus) ; le bouton dans `[id]/Gabarits.tsx`.

## Les réglages (de départ, `reglages.ts`, R159)
- `texte_largeur_min` 50 mm : une zone plus étroite ne reçoit pas de titre.
- `texte_marge_sujet` 3 mm autour de chaque visage et de la zone importante.
- `texte_chaleur_max` 4 sur 9 : au-delà, l'endroit d'une photo n'est pas calme.
- `texte_claire` 150 sur 255 : sous ce gris moyen de la photo ENTIÈRE, le titre est blanc. Aucune mesure locale de la clarté n'existe :
  un ciel clair au-dessus d'un sol sombre peut tromper. C'est la première chose à mesurer si Mathias trouve un titre illisible.

## Le test
`scripts/verif-mep-vague-1.ts`, bloc T-212 : la place dans une zone libre (sous une photo, de marge à marge, 28 pt), la grille 8 × 8,
deux textes qui ne se chevauchent pas, la photo (moitié calme, blanc, jamais sur le visage), le visage qui interdit tout, la photo non
lue, la page vide, Annuler, l'export, et sur TOUS les gabarits dessinés proposés aucun titre hors des marges ni sur un cadre (même
tourné). Le geste entre dans les 600 séquences aléatoires de `verif-mep-editeur.ts` (invariants après chaque geste).

## Le rejeu
Pas de rejeu chiffré. Recette locale du 16/11 sur les photos de Merisa (`design-explorations/editeur-lots-2026-11-14/recette/vague-1/`,
captures 13 à 17) : sur deux photos pleine page, le titre va en blanc sur le bas calme de la photo de droite, loin de la personne ;
sur le photomaton sans aplat, au-dessus des vignettes, de marge à marge.

## Limites connues
- Une page SANS photo n'en reçoit pas : une disposition sans photo n'existe pas (invariant I8).
- La clarté est celle de la photo entière (voir `texte_claire`).
- Un seul rôle : un titre. Le texte courant et la légende viendront avec les titres précis (T-212, vague 3).

## Historique
16/11 : créée (vague 1, T-212 premier temps).
