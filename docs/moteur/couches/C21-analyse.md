# C21 · La page Analyse, et ce que l'atelier change après la machine

Couche née le 18/11/2026 au soir (T-218), sur les mots de Mathias (`tunnel/RETOURS-MATHIAS.md`, M-30 à M-34) : « quand on est démarré
vers une page analyse, on a toutes les informations, et quand on arrive sur la page mise en page, on a déjà toute la présentation qui est
faite. Moi, je pourrai faire les modifications assez aisément grâce aux tags. » et « Je repasserai après toi pour qu'on puisse analyser les
différences. »

## Ce qu'elle fait
1. **La forme** : le bouton « Composer le magazine » du panneau Photos devient « Analyse ». Il ouvre un plein écran de verre au-dessus de
   l'éditeur, à deux onglets : **Analyse** et **Mise en page** (fermer l'Analyse = revenir à la mise en page). Pas une nouvelle application :
   le même état, la même proposition. Au téléphone : une colonne, la fiche d'une photo en feuille du bas (390 px sans débordement, mesuré).
2. **Ce qu'elle montre** (`compositeur/analyse.ts`, `[id]/Analyse.tsx`), recomposé sans rien payer à chaque correction :
   - (a) le projet en une ligne : Qui, Où, Type, Durée, Profil, Ambiance ; chaque mot se corrige d'un clic (la Durée est un fait lu dans
     les dates, non corrigeable) ; la saisie prime (`Fiche.pays`, `Fiche.profil`, nouveaux) ;
   - (b) les questions : « Combien étiez-vous ? », « Les lieux ou les étapes à ne pas oublier ? », « Vos photos préférées ? » (le cœur de la
     fiche), « Les lieux : aux chapitres seulement, ou partout ? » (réglage `lieux`) ; ce que le dossier porte déjà (occasion, titre, histoire,
     nombre de pages commandé) est affiché, jamais redemandé (la route `photos` lit `occasion` et `histoire`) ;
   - (c) les chapitres proposés, renommables (`Fiche.chapitres`, le nom saisi passe avant tout nom lu), avec leurs photos ;
   - (d) la fiche d'une photo : ses tags (douze, corrigeables d'un clic : la valeur suivante ; la correction va dans `CorrectionsAtelier.tags`,
     prime (D12) et devient une leçon `tag_corrige` de règle M-27), ses CINQ notes avec leur phrase, sa zone importante dessinée (cœur plein,
     air en pointillés, visages, carte de chaleur activable), « jamais rognée » quand M-31 la protège, ses relations (série, paires de la
     trame, même scène) ;
   - (e) les filtres : gardée / en réserve / écartée, par note et cran, par tag et valeur ;
   - (f) l'état AVANT composition et sa raison ; « Mettre en réserve » / « Garder » le renverse (`CorrectionsAtelier.marques`).
3. **La composition se lance seule** à la fin de la lecture ; la proposition est chargée tout de suite si le magazine est vide ou n'a pas
   bougé depuis la dernière proposition, sinon « Remplacer la mise en page ? » (Garder la mienne / Remplacer). « Mise en page » recharge une
   Analyse corrigée de la même façon. Coût annoncé avant (« Lire les photos · ≈ X $ », le survol dit photos nouvelles et appels de
   complément), payé après (« Payé X $ »).
4. **Ce que j'ai changé** (M-30, `compositeur/releve.ts`) : la proposition est gardée TELLE QUELLE avec le projet (le magazine chargé,
   couverture comprise, `versionRegles`, réglages et fiche, décisions, doubles ; IndexedDB `bj-mep-composer`). Le bandeau offre « Ce que j'ai
   changé · N » : chaque différence (photo ajoutée depuis la réserve, retirée, agrandie, réduite, déplacée, gabarit, recadrage, texte, double
   ajoutée ou supprimée, couverture) avec sa photo, sa double et les règles de la décision de la machine ; « Envoyer en leçons » les envoie en
   leçons `ecart_proposition`, comptées par règle à l'écran « Règles ».

## Règles
M-30 à M-34 (confirmées par Mathias), N-60 (jamais une personne coupée, codée), N-49b (une belle photo en double dense avec du sens, codée),
M-25, M-27 (les corrections priment). Registre : `regles/definitionV2.ts`.

## Preuve
- Harnais : `scripts/verif-mep-analyse-v2.ts` (24 contrôles : personnes au bord, tuiles, M-32, v2.1 par défaut, v1 rejouable,
  déterminisme, ligne du projet, tag corrigé qui prime et devient leçon, renversement, filtres, relations, registre, M-01),
  `scripts/verif-mep-releve.ts` (dix gestes, leçons, compte par règle), `scripts/verif-mep-lecture-complete.ts`.
- Recette navigateur du 18/11 au soir (build local SANS BASE, cookie forgé, réponses d'OpenAI SIMULÉES, 36 photos fabriquées, et un faux
  dossier dont trois images sont refusées) : captures hors git dans `design-explorations/tunnel-2026-11-17/recette-analyse/`.

## Limites, dites
- Aucun appel réel à OpenAI pour le complément (regard, classement) : consignes du banc, réponses simulées à la recette.
- La migration `20261119_mep_lecons_ecart_proposition.sql` n'est pas appliquée : les leçons d'écart passent sous `pretri_renverse`.
- Un renversement (gardée ↔ réserve) n'est pas lui-même une leçon : il apparaît dans « Ce que j'ai changé » s'il change le magazine.
- La proposition gardée vit dans le navigateur (IndexedDB) : un autre poste ne voit pas « Ce que j'ai changé ».

## Historique
- 18/11 au soir : couche créée (T-218), branche `feat/analyse-et-v2`.
