# C18 : les types de gabarits (une disposition, et ses variantes dessous)

**Statut** : sur la branche `feat/mise-en-page-types` (vague 2 du 16/11, T-208), poussée, pas encore fusionnée.
Règles R170 à R179 (`docs/reference/REGLES-TRI.md`). Retour de Mathias du 16/11 : « il doit y avoir une différence entre les templates
qui sont du coup différents vraiment en termes de position et ceux qui modifient un petit peu la taille d'une photo, un petit peu son
orientation. […] des types de templates différents. »

## Ce qu'elle fait
- **Un type = une disposition** : où sont les photos les unes par rapport aux autres, et ce que porte chaque page. Une **variante** garde
  la disposition et change une taille, une orientation ou un calage. Le type se LIT dans les cadres (`typeDeGabarit`), sans table : il
  vaut pour les dessinés, les générés (GG1, GD1) et les grilles de secours.
- **Le tiroir** montre UNE vignette par type, dans l'ordre du classement d'avant (la note n'a pas bougé), avec le nombre de ses variantes
  dans un petit rond et une carte décalée derrière (une pile). Le type posé montre le gabarit posé ; **un clic sur lui ouvre ses
  variantes** dans un plateau juste après lui (les autres, dans l'ordre du classement) ; un clic sur une variante la pose, le plateau reste
  ouvert ; un clic sur un autre type pose sa tête et referme. Aucun bouton de plus sur les vignettes. Le titre du tiroir dit « 16 types »
  (l'infobulle : le nombre de gabarits, « R type · V variante »).
- **R** passe à la TÊTE du type suivant (Maj+R : précédent), en boucle, dans la famille choisie (Tous, Avec texte, Sans texte).
  **V** (nouvelle touche) passe à la variante suivante du type posé (Maj+V : précédente). Sur la couverture, V ne fait rien.
- **Un gabarit dessiné reste toujours la tête de son type**, jamais caché sous une variante générée : l'annexe, les épingles, les
  gabarits de l'atelier, et toute origine dessinée à venir (les signatures du lot voisin s'y rangent sans être nommées : tout ce qui
  n'est ni `genere` ni `grille`). Deux dessinés de même disposition sont deux têtes ; les générés de cette disposition vont sous le premier.
  Sans dessiné, la tête est la meilleure variante du classement.
- **Rien d'autre ne bouge** : « Poser » et le premier jet posent toujours le premier du classement (`gabaritsClasses`, I19) ; aucun id ne
  change ; un magazine sauvegardé s'ouvre avec ses ids (un gabarit retiré aussi : R le quitte pour la tête du premier type, V n'y fait rien).
  Rien n'entre dans la sauvegarde, l'IDML ni le PDF.
- **Le catalogue** `/admin/atelier/mise-en-page/gabarits` a une section « Générés : les types » : par nombre de photos, chaque type de
  page générée par sa variante la plus pleine et son nombre de variantes.

## La clé (R170 à R174)
Région par région : une page seule (« P: ») ; sur une double, la page gauche puis la droite (« G:…|D:… »), ou la planche entière dès
qu'une photo passe le pli de plus de 5 mm de chaque côté (« X: »).
- « F » : une photo couvre au moins 90 % de la page (pleine page, un fond) ; ce qui est posé dessus suit après « + ».
- L'ARBRE des photos par coupes franches : « R(…) » côte à côte, « C(…) » l'une sur l'autre, « ~ » si deux morceaux voisins partagent
  moins de la moitié de leur hauteur (une diagonale, un satellite en coin), « S2 » des photos qui se chevauchent, « J3 » des tirages
  tournés, « M5 » un pavage sans coupe franche. Quand une coupe verticale ET une horizontale existent, on garde celle qui sépare les
  grandes des petites (sinon la verticale) : la même disposition donne toujours le même arbre.
- « O » : le HÉROS, la photo qui l'emporte d'au moins 1,7 fois en surface sur CHACUNE des autres. Sa place compte : héros en haut,
  satellite dessous, n'est pas satellite en haut, héros dessous. Une photo à peine plus grande (moins de 1,7 fois) n'est pas un héros.
- L'ordre compte au premier niveau (héros en haut ou en bas, côté pli ou côté extérieur) ; plus bas, dans une mosaïque, non (où tombe la
  petite paire est une variante).
- « ~ » au bout : une photo au fond perdu sans être un fond (des bandes à fond perdu ne sont pas des colonnes dans les marges).
- « ·T » la page porte un titre, « ·t » un texte ou une légende seulement.

Ce que la clé ignore : la taille (une case de plus ou de moins, tant que le héros reste le héros), l'orientation, le calage, le bord blanc,
les coins arrondis, les aplats (E-D14a et E-D14c sont le même type), l'id, le nom, l'origine.

## Où
- `src/lib/mise-en-page/typesGabarits.ts` : `typeDeGabarit`, `estDessine`, `rangerParTypes`, `typeContenant`, `REGLAGES_TYPES`.
- `editeur/operations.ts` : `autreGabarit(…, quoi: "type" | "variante")` ; `editeur/selecteurs.ts` : `typesPour` ; le geste
  `autreGabarit` porte `variante?: true` (`editeur/types.ts`, libellé « Autre variante » dans `plans.ts`) ; la touche V (`etat.ts`,
  liste blanche de `[id]/EditeurMagazine.tsx`).
- L'écran : `[id]/Gabarits.tsx` (`Rangee`, `Legende`), CSS `.ed-gab--pile`, `.ed-gab-n`, `.ed-gab--ouvert`, `.ed-gab-var`.
- Le catalogue : `gabarits/page.tsx` (`CarteType`).

## Les réglages (`REGLAGES_TYPES`, des tolérances de mesure, pas un goût)
`pliMm` 5 · `fond` 0,9 · `coupeMm` 1 · `decale` 0,5 · `heros` 1,7 (le maquettiste : deux tailles égales jusqu'à 1,15, franchement
différentes dès 2 ; 1,7 laisse passer les gouttières : un 6 × 3 contre un 3 × 3 fait 2,06, un 4 × 4 contre un 3 × 3 fait 1,82) ·
`perduMm` 0,5.

## Les comptes (R179, tenus au harnais)
- Les 58 gabarits DESSINÉS proposés : **56 types** (deux paires partagent une disposition : DP-02 et E-D14c ; E-D3a et E-D4a ; chacun
  reste une tête).
- Les 2 062 découpes de PAGE générées : **81 types** (1 photo : 1 ; 2 : 12 ; 3 : 20 ; 4 : 16 ; 5 : 8 ; 6 : 24). Une photo encadrée de
  toute taille et de tout calage est UN type (87 variantes).
- Les doubles générées (GD1) sont des paires de deux pages : leur type est la paire des types de page. Le nombre dépend des photos.
- Sur les photos de Merisa (premier jet du 13/11, recette locale) : une page de 2 photos, 406 gabarits → **16 types** ; une double de
  3 photos, 62 → **20** ; une double de 6 photos, 221 → **80** ; une double de 8 photos, 219 → **94**.

## Le test
`scripts/verif-mep-types.ts` (22 vérifications, appelé par `verif-atelier.ts`) : 15 paires « le même avec une photo plus grande /
l'autre orientation / sans son aplat » qui ont la même clé, 18 paires « vraiment différentes » qui en ont deux, toutes des découpes
réelles du catalogue ; des clés écrites en clair ; la clé ne lit que les cadres ; les comptes figés ; sur neuf jeux de photos (1 à
8 photos, pages et doubles) chaque gabarit dans un seul type, l'ordre du classement gardé, un dessiné toujours tête (une origine
« signature » simulée aussi) ; R par les têtes puis retour, Maj+R ; V par les variantes puis retour, Maj+V ; V sans variante, V sur la
couverture ; la famille « Avec texte » ; un magazine sauvegardé sur un gabarit retiré. Les tests d'avant qui supposaient « R = le gabarit
suivant » (verif-mep-editeur 33 et 41, verif-mep-generes, verif-mep-recette D1) disent maintenant « R = la tête du type suivant ».

## Le rejeu
Pas de rejeu chiffré (la clé est une lecture de géométrie, pas une mesure de photo). Recette locale du 16/11 sur les photos de Merisa
chargées par son premier jet : `design-explorations/editeur-lots-2026-11-16/recette/types/` (captures 01 à 13, `LISEZ-MOI.md`).

## Limites connues
- Les doubles de 6 photos et plus gardent beaucoup de types (80 à 94) : la double générée est déjà une paire de deux pages choisies pour
  leur variété (3 par schéma au plus), presque chaque paire est une disposition à elle. Un niveau de plus (ranger d'abord par « combien
  de photos à gauche, combien à droite ») viendrait si Mathias trouve ce tiroir long.
- Le héros est un seuil (1,7) : deux photos de part et d'autre du seuil changent de type. À revoir sur l'œil de Mathias.
- La couverture n'a pas de types (onze gabarits, R les parcourt comme avant).

## Historique
16/11 : créée (vague 2, T-208).
