# C20 · Le compositeur : questions, analyse, magazine proposé

Couche née le 18/11/2026 (T-217), après le retour de Mathias sur « Lire les photos » : « il n'y a pas de questions puis de composition !
On doit créer l'éditeur intelligent qui crée. » Elle porte dans le dépôt le compositeur du banc du tunnel
(`design-explorations/tunnel-2026-11-17/compositeur/`, hors git : `decider.py`, `poser/pose.ts`, `mesurer.ts`, passe 10).

## Ce qu'elle fait
1. **Les questions** (`compositeur/fiche.ts`) : cinq champs facultatifs (type d'album, personnes du groupe, ambiance, taille, lieux à
   faire apparaître). La machine pré-remplit ce qu'elle devine (`devinerFiche` : thème lu par le voyage, plus grand groupe compté,
   sobriété d'un voyage en famille, « tout garder ») ; ce que l'atelier saisit PRIME (`ficheEffective`). Gardée avec le projet
   (IndexedDB `bj-mep-composer`).
2. **L'analyse** (écran `[id]/Composer.tsx`) : mesures locales (C01 à C03), planches B5 (C14 + quatre tags : `plan`, `moment_journee`,
   `ambiance`, `personnes` COMPTÉES), regard fin (40 candidates et 20 textes au plus), le voyage (couche 7, un appel texte gpt-5.1),
   les lieux par chapitre (M-05, gpt-5.4, deux planches au plus, seulement pour un road trip sans GPS ni étapes saisies). Coût estimé
   avant (`estimerComposition`, chiffres du banc), payé après. Jamais deux fois la même photo ; au-delà de 600 photos à lire, les autres
   héritent des tags de leur voisine la plus ressemblante (`planDegradation`). IA fermée (dossier sans `MEP_LECTURE_IA_CLIENTS`, pas de
   clé) : la composition se fait avec les mesures locales seules (N-33).
3. **La composition** (`compositeur/index.ts`, `composer`) : fiche → profil et sobriété (M-06) → chapitres (voyage lu, étapes saisies,
   ou le temps : N-32) → sélection (S-001, M-09 : la réserve ne garde que les faibles) → trame (decider.py, règle pour règle) → pose
   (poser/pose.ts, règle pour règle, avec `gabaritsClasses`, `noterGabarit`, `recadrageParContenu`, `cadrer` de l'éditeur) → contrôle.
   Sortie : un premier jet que `lirePremierJet` accepte, chargé par le geste `chargerPremierJet` (UNE entrée d'historique),
   `decisions` (chacune cite sa règle), `selection` (posées, couverture, réserve, écartées, avec la raison de chaque photo : M-02),
   `controle` (fautes dures et signaux).
4. **La proposition** : un bandeau « Proposition prête · N pages · X photos posées · Y en réserve · coût », et « Posées et laissées »
   (par chapitre, chaque photo, sa raison, ses règles ; « Faire entrer » une photo de la réserve sur la page de son chapitre la plus
   proche dans le temps). « Remplacer la mise en page ? » avant d'écraser un magazine commencé.
5. **M-10** : une photo de couverture qui se trouve aussi à l'intérieur fait recomposer l'intérieur sans elle, la couverture de
   l'atelier gardée telle quelle ; sans demander si l'intérieur n'a pas bougé depuis la proposition, par un bouton sinon.

## Règles
M-01 à M-10 (retours de Mathias, `tunnel/RETOURS-MATHIAS.md`), S-…, DA-…, N-01 à N-28 et P-01 à P4-03 du banc (portées telles quelles),
plus les généralisations du 18/11, qui ne jouent que là où le banc n'avait pas de donnée (le projet de test n'en a jamais besoin) :
- **N-32** sans voyage lu : un chapitre pour trois jours photographiés (1 à 8), coupés aux plus grands silences ; une année : un par mois ;
  des étapes saisies : autant de chapitres, nommés par elles, dans l'ordre (M-05, la fiche prime).
- **N-33** sans lecture IA : intérêt de départ 0,6 et personnes = visages comptés ; une photo sans date garde le chapitre que le voyage
  ou le temps lui donne quand l'appel des lieux n'a pas eu lieu.
- **N-34** un chapitre réduit à son ouverture prend une double (decider.py en comptait deux) ; un chapitre que M-10 ne sait pas redécouper
  fait recomposer tout l'intérieur.
- **N-35** page 1 et dernière page sans photo datée ni gens lus : les plus fortes des premières et des dernières.
- **N-36** le repli : un chapitre que les recettes du banc (21:9 et verticales) ne savent pas découper reçoit trois recettes générales
  (paysage seul sur la double sans personne au pli, verticale pleine face à trois photos au plus quand il y a des gens (M-08), photo seule
  avec la page d'en face colorée (M-07)), puis, en dernier recours, DA-2 relâchée pour ce chapitre ; c'est écrit dans les décisions.

Seuils : `compositeur/reglagesCompositeur.ts` (valeur, règle, date, raison), mêmes valeurs que le banc. Le raccord au registre des règles
(`src/lib/mise-en-page/regles/`, T-216) se fera par les identifiants cités.

## Preuve
- **Fidélité** (`scripts/compositeur-rejeu.ts`, sur le projet de test du banc, hors git) : TypeScript et Python rendent les MÊMES
  magazines, dispositions, recadrages, textes et couvertures compris, dans les deux tailles : tout garder 92 pages, 127 posées, 32 en
  réserve, 2 écartées, 1 faute dure (le même trou blanc) ; 48 pages, 69 posées, 90 en réserve, 2 écartées, 1 faute dure (la même photo de
  personnes en vignette). Moins d'une seconde par taille.
- **Harnais** (`scripts/verif-mep-compositeur.ts`) : cinq lots fabriqués (voyage aux photos très larges, fête de nuit, sans date, rafales,
  minuscule) : premier jet valide, zéro faute dure, pages multiples de 4, réserve faite de faibles, déterminisme ; chapitres par lieux, fiche
  qui prime, M-10, adaptateur de l'éditeur, M-01 dans le code, lecture IA v3, planche B5, voyage, lieux, dégradation, garde de la route.
- **Recette navigateur** (18/11, build local sans base, réponses d'OpenAI SIMULÉES, 36 photos fabriquées) : questions, analyse,
  proposition, « Posées et laissées », « Faire entrer », « Remplacer la mise en page ? », Annuler ; captures hors git dans
  `design-explorations/tunnel-2026-11-17/recette-editeur-compose/`.

## 18/11 au soir : un vrai dossier (M-13, M-14, M-15)
Retour de Mathias en production sur un dossier de 164 photos (`tunnel/RETOURS-MATHIAS.md`) :
- **M-13** jamais une case vide chez l'IA : `editeur/lireLesPhotos.ts` porte la règle pure (`arretIllisibles`, `plancheSansVide`,
  `lectureSuspecte`, `verdictsDeLecture`), seuils `lecture_illisibles_max` (0,1), `lecture_ecarter_max` (0,5), `lecture_planche_uniforme_min`
  (8) dans `editeur/reglages.ts` ; l'écran relit les adresses (`rafraichirAdresses`, `EditeurMagazine.tsx`), essaie chaque image à toutes
  ses tailles (`controlerImages`, `chargerImages`), retire les illisibles, s'arrête avant de payer. Une lecture douteuse n'entre pas dans le
  compositeur (`DonneesEditeur.douteuse` : les photos concernées passent sans lecture IA, N-33 ; toute douteuse = ni voyage ni lieux).
  Les marques de l'atelier priment (`PhotoCompo.gardee`, `EntreeCompo.marques`) ; le premier jet écrit les posées de la machine dans le tri : une
  recomposition (autre taille, M-10) les retire des marques de l'atelier (`Proposition.machine`, `marquesAtelier` dans `[id]/Composer.tsx`).
- **M-14** jamais d'impasse : `trame.ts` cherche la taille faisable la plus proche (multiple de 4, de `PAGES_MIN` à `PAGES_MAX` ou à la taille
  demandée), recettes du banc puis repli (un chapitre peut prendre jusqu'à `DOUBLES_CHAPITRE_MAX_REPLI` doubles en repli seulement) ;
  `ResultatCompo.ajustement` le dit. Sous `PHOTOS_MIN` photos utilisables : `ImpasseComposition` (phrase, cause comptée, geste). `composerSur`
  ne laisse sortir aucune exception.
- **M-15** la taille : `tailleACompose` (choisie > commandée > M-09), `autresTailles` (composées pour de vrai à l'écran).
- **E** (recette du 18/11) : page 1 sans cadre de texte vide (`sansCadreVidePage1`), titre de page 1 = `titreImprimable` ; un titre de
  chapitre lu n'est jamais un mot de panneau (`motsPorteurs`, `LIEU_MOTS_PORTEURS`, `LIEU_LECTURES_MIN`) ; raisons en mots d'atelier
  (`mots.ts` : `motPlace`, `motLaissee`, la raison technique dans `detail`).
- Rejeu : les deux tailles du projet de test rendent les MÊMES planches qu'avant la correction (comparées à l'octet) ; la « lecture
  empoisonnée » (toutes « à écarter », 85 gardées, 60 pages) donne 60 pages au lieu de l'impasse.

## Limites, dites
- Le moteur n'a pas de gabarit pour les photos très larges (21:9) au-delà des bandes existantes, ni d'ouverture de chapitre à plusieurs
  photos, ni de couverture panoramique, ni de filtres : rien n'a été inventé dans ce lot.
- Les fautes du banc restent (un trou blanc, une photo de personnes en vignette, sur le projet de test) : elles sont dites dans le bandeau.
- La bande calme d'une photo (titre de page 1) est lue sur la carte de chaleur seule (le banc y ajoutait la texture des pixels).
- La règle de dégradation (600 photos, héritage par empreinte) n'est pas mesurée sur un vrai gros lot ; l'estimation pour 600 photos
  dépasse 1 $ d'environ 10 % (chiffres du banc), donc un peu plus de 1 €.
- Aucun appel réel à OpenAI pour les deux étapes nouvelles depuis l'éditeur : leurs consignes sont celles du banc (mesurées le 17/11),
  leurs réponses ont été simulées à la recette.

## Historique
- 18/11 : couche créée (T-217), branche `feat/editeur-qui-compose`.
- 18/11 au soir : M-13, M-14, M-15 et trois défauts de recette, branche `fix/composer-dossier-reel`.
