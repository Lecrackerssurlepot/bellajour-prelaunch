---
id: T-203
titre: La politique de confidentialité des particuliers promet des choses que le code ne fait pas (photos effacées 90 jours après la livraison, reconnaissance des visages, OpenAI, Fal.ai)
etat: nouveau
domaine: contenu
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il faut qu'on mette en place la politique de confidentialité » (20/10/2026, à propos de
l'Édition collective). L'écart côté particuliers a été trouvé en préparant ce texte (lot a8).

## Ce que j'ai vérifié
Relu le 20/10 dans `src/app/legal/content/confidentialite.ts` et dans le code :
- **Ligne 96** : « Photos téléversées + fichier HD : supprimées 90 jours après la livraison ».
  Aucun code ne le fait : `scripts/anonymiser-dossiers.ts` (T-076) ne referme que les dossiers
  ABANDONNÉS, jamais un dossier payé ou livré, et il n'a pas de cron.
- **§5.4 (ligne 78)** : « La reconnaissance des visages est effectuée via […] AWS Rekognition ».
  **Lignes 132-133** : OpenAI et Fal.ai déclarés comme sous-traitants (couverture illustrée).
  Aucune de ces trois briques n'existe dans `src/` ni dans `package.json` (recherche du 20/10 :
  `rekognition`, `openai`, `fal.ai` n'apparaissent que dans le texte légal).
- Les versions portugaise (lignes 221, 275-276) disent la même chose.

## Ce que je propose
Texte légal : accord explicite de Mathias requis. Deux voies, à trancher :
1. **Dire ce que fait le code aujourd'hui** : retirer Rekognition, OpenAI et Fal.ai (ou les
   annoncer « à venir », avec un consentement séparé le jour où ils servent), et écrire la durée
   réelle de conservation des photos des dossiers livrés.
2. **Faire ce que dit le texte** : un passage (script, puis tâche planifiée) qui efface les
   photos 90 jours après la livraison, sur le modèle de `collectif-retention.ts` (T-159).
À traiter avec T-158 (la politique de l'Édition collective), pour une seule nouvelle version.

## Ce qui a été fait
Rien encore.
