# Mise en page interne : les modules purs

Chargé dès qu'on touche `src/lib/mise-en-page/**`. Le moteur de l'outil interne qui compose un
magazine à partir de photos et l'exporte vers Affinity (IDML). Référence : `brief-outil-mise-en-page-interne.md`.

- `geometrie.ts` : LA source des mesures (A4, planche 420, fond perdu 3, marges, grille 6 × 6).
- `types.ts` : templates = données (cadres en mm), `orientationDe`, `pourCote`.
- `templates.ts` : les 4 doubles de l'annexe, recopiées à l'identique. `grilles.ts` : les grilles de secours.
- `epingles.ts` (29/10) : 37 doubles + 17 pages tirées du tableau Pinterest de Mathias (familles D1–D15, S1–S9), ids `E-…`.
  Avec l'annexe, ce sont les gabarits DESSINÉS (`TEMPLATES_DESSINES`, magazine.ts) : toujours avant les grilles, et le harnais
  exige au moins deux dessinés par nombre (double 1–12, page 1–6). Aplats (`decor`, sous les cadres, hors des rangs), bord blanc,
  coins arrondis, rotation de photo, texte blanc : tous relus fidèlement par Affinity (essai du 29/10, 271 images, 0 étirée).
- `recadrage.ts` : LE calcul photo dans cadre. `magazine.ts` : l'état et ses transitions.
- `idml.ts` : l'export IDML, portage fidèle de `idml-test-generator.py` (validé dans Affinity) : ne changer
  un élément ou un attribut qu'après un nouvel essai Affinity (`scripts/idml-essai.ts`). `paquet.ts` : les zips
  (fflate) ; `mimetype` PREMIER et stocké.
- `editeur/hesitation.ts` (lot 3, 02/11) : `Affectation.hesitation` = une seconde photo DERRIÈRE celle du cadre (facultative, écrite seulement si présente, `tranchee: true` une fois choisie). Jamais exportée ni comptée ; elle suit sa photo dans `composerDisposition`, `echanger`, `reordonner`, `deplacerPhoto`, `remplacer`.
- `editeur/libre.ts` (lot 4, 03/11) : miroir, cadres retouchés (`Disposition.cadres`, repère du GABARIT, l'ordre = les calques ; `miroir: true` sur une double), pose en libre, plusieurs cadres. Tout passe par `cadresDe` (`versPlanche` / `versGabarit`) : écran et export lisent les mêmes cadres. Une disposition retouchée n'a plus besoin de son gabarit (`TEMPLATE_LIBRE` ou un `M-…`).
- `gabaritsAtelier.ts` (lot 4) : les gabarits enregistrés (`mep_gabarits`, migration 20261103) ; `enregistrerGabarits` (magazine.ts) les met en tête de `candidats`, une disposition qui en vient garde une copie de ses cadres.
- `lieux.ts` (09/11) : les lieux détaillés (lieu connu, commune, ville proche, département, région, pays) lus dans les réponses Geoapify ; les APPELS sont dans la route `/api/admin/atelier/mise-en-page/lieux`, qui n'écrit rien. `editeur/moments.ts` : moments et séjours de la bibliothèque. `editeur/lieuxTextes.ts` : le lieu, texte par défaut d'un titre ou d'une légende non écrits (écran ET export, rien n'est stocké).
- `editeur/mesures.ts` (09/11, couche 1 du moteur) : netteté (laplacien) et empreinte (dHash) d'une vignette en gris, puis floues et PILES (rafales + doublons, la plus nette dessus), R72 à R77. La lecture vit dans `EtatEditeur.lecture` (écran seulement) ; `[id]/mesuresClient.ts` mesure les vignettes dans le navigateur et les garde en IndexedDB. Rien en base.
- `sauvegarde.ts` : la sauvegarde partagée (table `mises_en_page`, migration 20261027, appliquée le 02/11) : `contenuValide`
  relit la forme EXACTE de `Magazine` (clé en trop = refus) ; un champ ajouté à `Magazine` s'ajoute là, sinon 400.
  `TAILLE_MAX_CONTENU` (2 Mo, borne technique) ; `issueSauvegarde` = le verrou optimiste. Routes : `/api/admin/atelier/mise-en-page/magazines`.

## Le contrat
- **Un seul recadrage** : `cadrer` sert l'écran ET l'export. Ce qu'on voit est ce qu'Affinity reçoit.
- Tout en **mm**, origine au coin haut gauche (bord de coupe). Points seulement à l'export (`PT_PAR_MM`).
- Un template `page` est défini pour la **page droite** ; la gauche est son miroir (`pourCote`).
  Un template `double` est en repère planche 420 × 297. `cadresDe` rend tout en repère planche.
- La planche 0 est une page droite seule : elle ne bascule pas, ne se supprime pas.
- Les ids de template sont stables (un magazine sauvegardé les référence) : ne jamais renuméroter.

## Les interdits
- **D28** : n'entre dans l'export que ce qu'Affinity relit FIDÈLEMENT (catalogue des essais du 29/10 dans `docs/DECISIONS.md`). Chaque objet porte `ItemLayer`, chaque texte `AppliedLanguage` français, le document FOGRA39.
- Aucun import de `src/lib/atelier` ni d'un ancien moteur de mise en page (le brief repart de zéro).
- Des règles simples et déterministes. Depuis le 09/11 (Notion « Éditeur Bellajour », 03 · Le moteur), les couches du moteur arrivent ici une par une : **l'IA mesure et propose, des règles décident**, on marque et on ne supprime jamais. Une couche qui appelle un modèle passe par une route serveur, jamais par un module pur.
- Modules purs : ni React, ni réseau, ni horloge dans les transitions.

## Les tests
Bloc « Mise en page » de `scripts/verif-atelier.ts`. Toute règle ajoutée ici s'y ajoute aussi.
