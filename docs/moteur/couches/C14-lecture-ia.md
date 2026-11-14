# C14 : la lecture IA dans le tri (rôles, groupes, rafales, captures, lieux)

**Statut (14/11, lot F)** : branche `feat/mise-en-page-propositions-tri`, non fusionnée. Règles R142 à R148 ; R140 (rafales) et R141
(captures) revoient C02 et C03. Décision D29 : aucune reconnaissance de visages.

## Ce qu'elle fait
- **Montre et propose**, sans rien décider : le rôle de chaque photo (couverture, pleine page, double…), les groupes faits pour une
  double, les rafales et quoi y garder, ce que raconte une capture, le lieu nommé. Les marques du tri restent celles de l'atelier.
- Le contenu vient d'un fichier (`docs/moteur/LECTURE-IA.md`) : aujourd'hui la démo du 13/11 (services d'IA simulés,
  `design-explorations/demo-2026-11-13/lecture/exporter.py`), demain le vrai service côté serveur (OpenAI, GPS + Geoapify), au même format.

## Où
- `src/lib/mise-en-page/editeur/lectureIA.ts` (pur) : `lireLectureIA` (validateur), `relierLectureIA` (lien par nom de fichier),
  `tagsIA`, `misesEnAvant`, `pilesAvecIA`, `propositionRafale`, `lieuSur`.
- L'état : `EtatEditeur.lectureIA` (reliée) et `lectureMesuree` (la lecture du navigateur avant fusion des rafales) ; gestes
  `poserLectureIA` (écran) et `accepterRafale` (modifiant, une entrée d'historique) dans `etat.ts` et `plans.ts` ; `PhotoMaq.lieuIA`
  (le lieu sûr, posé par l'état, lu par `lieuxTextes.ts`). Filtres et groupe « ia » dans `bibliotheque.ts`.
- Écran : `[id]/PremierJet.tsx` (le bouton, les deux formats), `[id]/lectureIAClient.ts` (IndexedDB `bj-mep-lecture-ia`, par projet),
  `[id]/Panneau.tsx` (repères, groupes, rafales, captures, filtres), `[id]/Tri.tsx` (Lecture), `[id]/Scene.tsx` (textes proposés),
  `[id]/Barre.tsx` (bandeau).

## Réglages
`lieu_ia_confiance` (0,7, R147). R140 : `rafale_suite_secondes`, `rafale_suite_hamming`, `rafale_tournee_marge`. R141 :
`capture_texte_lignes`, `capture_aplat_texte`.

## Test
`scripts/verif-mep-lecture-ia.ts` (lancé par `verif-atelier.ts`) : le format et chaque refus (dont D29), le lien par nom, les groupes,
les mises en avant et les filtres, les rafales et « Accepter », les leçons, les lieux, R140, R141. Vérifier un fichier :
`npx tsx --tsconfig tsconfig.json scripts/lecture-ia.ts <lecture.json> [<dossier de photos>]`.

## Rejeu sur des photos réelles
Les six lots de la démo : `lecture-<lot>.json` validés, chargés sur les photos du cache (recette du 14/11,
`design-explorations/editeur-lots-2026-11-14/recette/lot-f/`). R140 rejoué sur les empreintes des six lots contre le jugement à
l'œil du 14/11 (scripts de rejeu dans `design-explorations/demo-2026-11-13/lecture/calibration/`).

## Leçons produites
`pretri_renverse` de règle `IA` (renverser une marque posée par « Accepter ») ; `pile_autre_gardee` et `tete_ecartee` de règle `IA`
(une autre photo d'une rafale de la lecture gardée, sa tête écartée).

## Limites connues
- Le lieu d'un moment de la démo est nommé sur UNE photo : l'exporteur ne le pose que sur elle et ses voisines à 300 m (GPS).
- « Sûr » dans la démo = le contrôle à l'œil du 14/11 contre le GPS ; le vrai service le prouvera par Geoapify dans le rayon.
- Le type de projet est un comptage (une famille photographiée deux par deux se lit « couple ») ; il n'est pas encore affiché.
- Les combos de couleurs sont lus et validés, pas affichés : lot G.
- La lecture vit dans un navigateur : un autre Mac ne la voit pas tant qu'on ne l'y recharge pas (le titre par défaut y reste la ville).

## Historique
14/11 : créée (lot F).
