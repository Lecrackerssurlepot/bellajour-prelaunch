---
id: T-125
titre: Choisir ce qui part dans le lot, doublons et captures d'écran écartés d'office
etat: en cours
domaine: admin
gravite: serieux
autonomie: libre
ouvert: 2026-09-21
---
## Ce que Mathias a dit
« Deuxième point dans le lot que l'on télécharge : que l'on puisse faire une sélection, que l'on
puisse enlever les captures d'écran et les doublons, mais avec des sélections si jamais on veut
garder une photo. »

## Ce que j'ai vérifié
- **Le lot part entier ou par « nouvelles »**, rien d'autre : `Fiche.tsx` n'appelle
  `telechargerDossier` qu'avec tous les ids ou ceux des ajouts (T2-5). Aucune case, aucun choix.
- **La route sait déjà filtrer sans renuméroter** : `/api/admin/atelier/lot` accepte `ids`, nomme
  sur le lot COMPLET puis filtre. Écarter la 03 laisse `01, 02, 04` : rien à changer côté serveur.
- **Doublons et captures sont déjà connus de la fiche** (T-123) : `remarquesDe` rend `doublon`
  (calculé sur les empreintes du dossier) et `capture` (logiciel, ou dimensions d'écran sans
  appareil). Ils s'affichent, ils n'excluent rien, par décision : « des remarques, jamais des
  exclusions ».

## Ce que je propose
Un bouton « Choisir » dans les outils de la carte « Les photos ». En choix :
- les doublons et les captures d'écran sont écartés D'OFFICE (`ecarteeDOffice`, règle pure : rien
  d'autre, une photo de nuit très sombre ou un scan sans date se composent) ;
- chaque vignette devient un bouton qui bascule la photo dans ou hors du lot (coche, croix, image
  éteinte aux deux tiers ; le voile de la remarque reste pour dire pourquoi) ;
- une ligne compte « N gardées, M écartées » avec « Tout garder » et « Écarter les doublons et
  captures (M) » ;
- le bouton de téléchargement dit « Télécharger les N gardées » et envoie les ids gardés ; « Les
  N nouvelles » retire aussi les écartées ; la grille se déplie d'un coup pour tout voir.
Un état d'écran, comme « Par date » : rien n'est écrit en base, les noms du lot ne bougent pas.

## Ce qui a été fait
**21/09/2026, branche `feat/lot-selection`.** `ecarteeDOffice` dans `metadonnees.ts` (harnais +1,
TOUT PASSE), la fiche (`choix`, `ecartees`, `entrerChoix`, `basculer`, vignette bouton ou lien),
CSS `.ate-photo--choix`, `.ate-photo--ecartee`, `.ate-photo-coche`, `.ate-photos-choix`. tsc et
lint verts. Vérifié à l'écran sur la fiche démo (le doublon et la capture des fixtures écartés
d'office, bascule d'une vignette, libellé du bouton).
**PR #199 fusionnée le 21/09** (commit `ea18551`), déploiement Vercel de production vérifié par
l'API. Reste à voir sur un vrai dossier : un lot téléchargé après choix, et la trace dans le
dossier obtenu (les rangs des écartées manquent, c'est voulu).
