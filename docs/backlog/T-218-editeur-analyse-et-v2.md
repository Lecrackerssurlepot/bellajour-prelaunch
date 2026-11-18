---
id: T-218
titre: L'éditeur compose encore en v1, coupe des personnes au bord, n'a pas de page Analyse et ne garde pas trace de ce que l'atelier change
etat: en cours
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-11-18
---
## Ce que Mathias a dit
Le 18/11 au soir (`docs/moteur/tunnel/RETOURS-MATHIAS.md`, M-30 à M-34) : « Je repasserai après toi pour qu'on puisse analyser les
différences. » ; « TU ne coupes jamais une personne ! » ; une belle photo dans une double dense : « Oui, tout dépend de la chronologie, du
fait d'avoir du sens dans la double page. » ; « Sans tunnel, tags et règles on ne peut rien faire de concret. » ; et, avant : « quand on est
démarré vers une page analyse, on a toutes les informations, et quand on arrive sur la page mise en page, on a déjà toute la présentation
qui est faite. Moi, je pourrai faire les modifications assez aisément grâce aux tags. »

## Ce que j'ai vérifié
Le 18/11, sur `origin/feat/compositeur-v2` + `origin/main` :
- `[id]/Composer.tsx` appelait `entreeDepuisEditeur` sans `v2` : l'éditeur composait en v1 ; la v2.1 n'existait qu'au rejeu.
- Le rejeu du projet de test (`tests-v2-1/`) : « tout garder » posait un visage hors cadre ; les visages au bord ne sont pas détectés
  (l'IA lit 3 ou 4 personnes, le détecteur 1 visage) et la pose ne protégeait que les visages trouvés.
- N-49 refusait toute belle photo dans une double dense (`noyee`), sans regarder la chronologie.
- Le format de lecture IA de l'éditeur ne demandait ni l'expression, ni les yeux fermés, ni le point d'accroche, ni le regard, ni le
  classement des couvertures ; aucune proposition n'était gardée telle quelle après chargement.
- Constat confirmé.

## Ce qui a été fait (branche `feat/analyse-et-v2`, 18/11 au soir)
- **M-31, N-60** : jamais une personne coupée. Côtés protégés (`cotesProteges`), corps détectés entiers en largeur, cadre plié à la photo
  quand aucun gabarit ne le permet, faute dure « personne coupée » ; visages en tuiles dans le navigateur (`editeur/visagesTuiles.ts`).
- **M-32, N-49b** : une belle photo entre dans une double dense avec du sens (paire, série, même moment, même scène), en héros.
- **v2.1 par défaut** dans l'éditeur (`REGLAGES_EDITEUR`), v1 rejouable ; lecture IA v5 complète, complétée sans tout repayer.
- **M-34, C21** : la page Analyse (projet, questions, chapitres, fiches, filtres, gardée / réserve / écartée), la composition qui se lance
  seule, « Mise en page » ouverte sur la proposition, jamais d'écrasement sans « Remplacer ».
- **M-30** : la proposition gardée telle quelle, « Ce que j'ai changé » (`compositeur/releve.ts`), « Envoyer en leçons » ; migration
  20261119 écrite, pas appliquée.
- Le rejeu sort le vrai PDF de l'éditeur (`magazine-editeur.pdf`).

## Ce qui reste
- L'essai de Mathias sur un vrai dossier (aucun appel réel à OpenAI n'a été fait pour les étapes de complément).
- Appliquer la migration 20261119 (sinon les leçons d'écart passent sous `pretri_renverse`, sans perte).
- La couverture n'est pas rendue par le rejeu PDF (son dos dépend de l'écran).
