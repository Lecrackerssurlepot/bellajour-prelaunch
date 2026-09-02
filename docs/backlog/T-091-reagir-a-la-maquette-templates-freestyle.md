---
id: T-091
titre: Réagir à la maquette, pas seulement partir — choix de thème/template + proposition freestyle
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-02
---
## Ce que Mathias a dit (02/09, brouillon)
« Aujourd'hui, si la maquette ne plaît pas au client, il ne peut que **partir**. » Plusieurs
solutions envisagées :

1. **Choix de thème dans le questionnaire**, en lien avec la question du titre (Q3) → la personne
   choisit un thème qu'elle aime déjà bien → **gain de temps pour nous** et on vise déjà juste sur
   ses goûts.
2. **On en met 5** (des visuels de thème). Si la personne n'en choisit aucun → on lui fait une
   **proposition freestyle**.
3. En faisant les premiers magazines, on verra l'intérêt de **demander l'ajout d'autres textes**
   (titre, sous-titre…) — ça aidera grandement la construction.

## Ce qui existe
`src/app/(atelier)/composer/coverModels.ts` : aujourd'hui 2 « modèles » d'exemple à l'écran 3,
explicitement **des exemples, pas un choix** (« rien n'est enregistré, aucune sélection n'a de
conséquence produit »). C'est exactement le socle à faire évoluer : passer d'« exemples » à
**« choix optionnel de thème »** (5 visuels), enregistré et transmis à l'atelier.

## La « porte de sortie douce » — réflexion de Mathias (02/09), proposée dans le prototype
Aujourd'hui, un client insatisfait ne peut que « répondre au mail » (ou partir). Proposition, montrée
dans le prototype v3 : une **feuille d'ajustement** accessible depuis l'aperçu — « Ce n'est pas tout
à fait ça ? » → le client **coche** ce qui cloche (l'ambiance/les couleurs, une photo, le titre, la
mise en page, autre) + un mot facultatif, et ça part à l'atelier **en 2 taps, sans écrire de mail**.
Il reste dans le flux ; l'atelier reçoit une **demande de retouche structurée**.
Techniquement : se branche sur le mécanisme existant `retouches_demandees_le` (aujourd'hui déclenché
par un lien discret « j'ai noté des retouches dans le Canva » à l'état `maquette_prete`), en le
rendant possible **dès l'aperçu** (`apercu_pret`) et avec un **payload de motifs** journalisé dans
`evenements` (au lieu d'un simple booléen). À confirmer par Mathias avant de le poser en prod.

## ✅ La feuille d'ajustement est FAITE (02/09, sur la branche `feat/numero-mobile-achat` / PR #30)
Le pop-up est en place sur `/numero` à l'état `apercu_pret`, fidèle au prototype :
- **Front** : `FeuilleAjustement.tsx` (chips des 5 motifs + un mot libre facultatif, « Envoyer à
  l'atelier », état « c'est noté » après envoi). Déclenché par « Ce n'est pas tout à fait ça ? »
  qui remplace l'ancien « répondez au mail ».
- **Back** : la route PATCH `/api/atelier/numero` accepte `ajustement_mot` / `ajustement_motifs`
  **à l'état 2 seulement**, et journalise l'événement `ajustement_demande` dans `evenements`
  (append-only). **Aucun mail, aucun changement d'état, aucune migration** — donc rien qui touche
  une vraie cliente au déploiement, hormis rendre le geste possible. `recit.ts` le rend lisible dans
  le récit du dossier côté admin.
- **Remontée dans la pile admin — FAIT (02/09, PR #31)** : un ajustement demandé à l'état 2 fait
  **remonter le dossier en tête de « à faire »** (« ajustement demandé depuis X », daté depuis la
  demande), lu dans `evenements` sans colonne ni migration (`urgence.ts` option `ajustement`,
  `donnees.ts`). Au passage, le même oubli sur les retouches (état 4) a été corrigé. Limite v1 : le
  drapeau reste tant que le dossier est à l'état 2 ; un futur `ajustement_traite` l'effacerait.
- **Reste ouvert ici** : la partie **choix de thème / 5 visuels / freestyle** (ci-dessous), qui
  attend les fichiers de Mathias.

## Ce que je propose (à trancher avec Mathias)
- Étendre `coverModels` à **5 thèmes** avec un vrai visuel chacun, et rendre la sélection
  **enregistrable** (nouvelle donnée sur `numeros`, ex. `theme_choisi`), transmise à la fiche admin.
- Si aucun choix → drapeau « freestyle » côté atelier.
- Prévoir, côté couverture, des **champs texte supplémentaires optionnels** (sous-titre…), en plus
  du titre.
- ⚠️ Ne rien inventer comme visuels : les 5 thèmes attendent les fichiers de Mathias.
Recoupe T-089 (visionneuse) et T-092 (parcours, Q3).
