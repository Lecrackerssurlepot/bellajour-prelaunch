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
- `pdf.ts` (11/11) : l'export PDF pour Canva, au format des magazines Canva de Mathias (planche 0 en page seule 216 × 303, doubles 426 × 303, fond perdu compris). Chaque photo est RECADRÉE à son cadre (`decoupe` = `cadrer`, 300 dpi au plus, jamais agrandie) par le navigateur (`[id]/exporterPdf.ts`) ; textes en Helvetica, émojis retirés. Hors D28 : Canva n'est pas Affinity, rien ne s'y relie.
- `editeur/hesitation.ts` (lot 3, 02/11) : `Affectation.hesitation` = une seconde photo DERRIÈRE celle du cadre (facultative, écrite seulement si présente, `tranchee: true` une fois choisie). Jamais exportée ni comptée ; elle suit sa photo dans `composerDisposition`, `echanger`, `reordonner`, `deplacerPhoto`, `remplacer`.
- `editeur/libre.ts` (lot 4, 03/11) : miroir, cadres retouchés (`Disposition.cadres`, repère du GABARIT, l'ordre = les calques ; `miroir: true` sur une double), pose en libre, plusieurs cadres. Tout passe par `cadresDe` (`versPlanche` / `versGabarit`) : écran et export lisent les mêmes cadres. Une disposition retouchée n'a plus besoin de son gabarit (`TEMPLATE_LIBRE` ou un `M-…`).
- `gabaritsAtelier.ts` (lot 4) : les gabarits enregistrés (`mep_gabarits`, migration 20261103) ; `enregistrerGabarits` (magazine.ts) les met en tête de `candidats`, une disposition qui en vient garde une copie de ses cadres.
- `lieux.ts` (09/11) : les lieux détaillés (lieu connu, commune, ville proche, département, région, pays) lus dans les réponses Geoapify ; les APPELS sont dans la route `/api/admin/atelier/mise-en-page/lieux`, qui n'écrit rien. `editeur/moments.ts` : moments et séjours de la bibliothèque. `editeur/lieuxTextes.ts` : le lieu, texte par défaut d'un titre ou d'une légende non écrits (écran ET export, rien n'est stocké).
- `editeur/mesures.ts` (09/11, couche 1 du moteur) : netteté (laplacien) et empreinte (dHash) d'une vignette en gris, puis floues et PILES (rafales + doublons, la plus nette dessus), R72 à R77. La lecture vit dans `EtatEditeur.lecture` (écran seulement) ; `[id]/mesuresClient.ts` mesure les vignettes dans le navigateur et les garde en IndexedDB. Rien en base.
- `editeur/reglages.ts` (lot 2, 09/11, G7) : LES seuils du moteur, nommés, datés, avec leur raison ; `mesures.ts` les lit, chaque leçon les emporte (`versionReglages`). Aucun seuil ne change sans un oui de Mathias et la preuve lue dans `mep_lecons`.
- `editeur/lecons.ts` (lot 2, G1, G2, G6) : un geste de l'atelier CONTRAIRE à une proposition de la machine (floue gardée, autre photo d'une pile gardée, pas un doublon, tête écartée) devient une leçon, calculée par `adopter` (etat.ts) à chaque geste modifiant, dans `EtatEditeur.lecons` ; `[id]/leconsClient.ts` les envoie par lots à la route `lecons` (tables `mep_lecons`, `mep_instantanes`, migration 20261110), avec les jalons ouverture / export et, à l'export, l'INSTANTANÉ (mesures, lecture, marques, planches : jamais de pixels). `scripts/lecons.ts` fait le bilan lisible : c'est ce que Claude lit avant de proposer un réglage.
- `editeur/saillance.ts` (lot 2, B1, R82) : la carte de chaleur sans modèle (résidu spectral, FFT 64 × 64) et `zoneImportante` (visages + saillance, en fractions). Les visages (A6, R81) viennent de MediaPipe dans `[id]/mesuresClient.ts` : wasm copié dans `public/mediapipe/1.2.2/` (harnais : octets identiques à node_modules), modèle `public/modeles/blaze_face_short_range.tflite` ; détection seulement, aucune identité. `recadrage.ts` : `recadrageParContenu` (B2, R83) sert à la pose (`composerDisposition`, `composer`) ; `operations.ts` : `partDansLePli` pénalise un gabarit qui met la zone dans le pli (B3, `pli_mm` = HYPOTHÈSE).
- `editeur/pretri.ts` (lot 3, A10, R84 à R88) : le pré-tri. Propose une marque et sa raison pour chaque photo sans marque (piles, floues, lumière, capture, visage flou ; gardées par moment selon l'importance, variées, équitables, seulement si l'objectif est fixé ; horloges recalées). Mémorisé sur (catalogue, tri, lecture) : le bouton peut le recalculer à chaque rendu. Le geste `preTrier` (plans.ts) pose tout en une entrée d'historique ; `EtatEditeur.pretri` garde les raisons. `editeur/faits.ts` (D7, R91) : jour, moment, heure, nombre, proposés en écrivant un titre. La lecture porte désormais les `mesures` et la `palette` (E1, R92).
- `editeur/tags.ts` (10/11, R93, R94) : les TAGS de la lecture (Floue, Doublon, Rafale, Similaire, Sombre, Brûlée, Capture, Visage flou, Avec visages), visibles sur la vignette, filtrables (`Filtres.lecture`), expliqués dans le panneau Lecture (`lectureDePhoto`). `[id]/Chaleur.tsx` dessine la carte de chaleur (`Mesure.chaleur`, 16 × 16), la zone et les visages, sur la photo posée et en grand, quand `ui.lecture` (bouton œil, touche L). Les seuils ont été calibrés le 10/11 sur de vraies photos par `scripts/calibrer-lecture.ts` : toute retouche d'une règle de lecture s'y rejoue d'abord. Un champ ajouté à `Mesure` change `VERSION` de `mesuresClient.ts` (sinon le cache IndexedDB sert l'ancienne mesure).
- `sauvegarde.ts` : la sauvegarde partagée (table `mises_en_page`, migration 20261027, appliquée le 02/11) : `contenuValide`
  relit la forme EXACTE de `Magazine` (clé en trop = refus) ; un champ ajouté à `Magazine` s'ajoute là, sinon 400.
  Depuis le lot 0 (12/11), les clés FACULTATIVES sont une liste nommée (`CLES_FACULTATIVES`, chacune avec son validateur,
  acceptée seulement présente avec une valeur valide, jamais `undefined`) : `tri` y est acceptée, `style` et `couverture`
  y sont PRÉPARÉES mais refusées (`refuseeEnAttendant`) jusqu'à ce que leurs lots écrivent leur validateur ; la marche à
  suivre est dans le commentaire de la liste. Le `Projet` de l'éditeur est UN seul type (`editeur/types.ts`), passé entier ;
  il porte `nbPagesCible` (pages payées) et `finition` (null = inconnue) ; le dos se calcule à l'écran
  (`[id]/dosCouverture.ts`, `dosDuProjet`), jamais ici : ce dossier n'importe pas `src/lib/atelier`.
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
- **La machine mesure et propose, des règles nommées décident, l'atelier tranche.** On détecte un visage, on ne reconnaît jamais une personne. Toute couche a sa fiche dans `docs/moteur/` et ses tests au harnais. (Depuis le 09/11, décision de Mathias : les couches du moteur arrivent ici une par une.) On marque et on ne supprime jamais ; une couche qui appelle un modèle passe par une route serveur, jamais par un module pur.
- Modules purs : ni React, ni réseau, ni horloge dans les transitions.

## Les tests
Bloc « Mise en page » de `scripts/verif-atelier.ts`. Toute règle ajoutée ici s'y ajoute aussi.

## Le registre du moteur (10/11)
Tout ce que la machine VOIT, PROPOSE ou APPREND est une COUCHE, rangée dans `docs/moteur/INDEX.md`. Pas de couche
sans : sa fiche (`docs/moteur/couches/Cxx-*.md`), son test au harnais, ses seuils nommés dans `editeur/reglages.ts`,
un rejeu sur des photos réelles (`scripts/calibrer-lecture.ts`) et sa ligne dans l'index. Chaque recette de Mathias
laisse un rapport daté dans `docs/moteur/recettes/` (modèle `MODELE.md`) et une ligne dans l'historique des fiches
touchées. Lire l'index AVANT de toucher une couche.
