---
id: T-203
titre: La politique de confidentialité des particuliers promet des choses que le code ne fait pas (photos effacées 90 jours après la livraison, reconnaissance des visages, OpenAI, Fal.ai)
etat: en cours
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
- **20/10/2026 au soir (voie 2 pour les photos, question 10)** : TENIR la promesse « Photos
  téléversées + fichier HD : supprimées 90 jours après la livraison ». Branche
  `feat/effacements-30-et-90-jours` (pas de commit, pas de push) :
  - la règle, pure, dans `src/lib/atelier/retention.ts` (seconde règle, à côté de T-076) :
    `RETENTION_LIVRE_JOURS = 90` (le chiffre de la politique en ligne), `dateDeLivraison` (le DERNIER
    `etat_change` vers `livree` du journal : « Marquer livrée » ou le webhook Cloudprinter ; aucune
    colonne ne porte la livraison, `etat_maj_le` peut bouger après), `verdictRetentionLivre` (jamais
    un dossier non livré, jamais sans date, jamais deux fois, jamais un anonymisé), `FAMILLES_LIVRE`
    (partent photos, PDF d'impression, PDF souvenir ; restent aperçus et toute clé inconnue) ;
  - la porte `supprimerPhotosEtHdLivre` (`r2.ts`) : n'efface QUE photos et fichier HD d'un dossier,
    relit la table clé par clé, refuse le reste avant tout réseau ; `supprimerPrefixe` ne change pas ;
  - l'ordre (audit S7) dans `src/lib/atelier/retentionLivres.ts` : intention au journal, métadonnées
    des photos vidées (aucune ligne supprimée), clés du fichier HD retirées de `numeros`, marqueur
    `photos_supprimees_le` en dernier, puis le coffre, puis le résumé `photos_hd_effaces` ; reprise ;
  - `scripts/retention-livres.ts` (lecture seule sans `--vraiment`, `--dossier <token>`, refus des
    états non livrés, refus sans la colonne) ; `supabase/migrations/20261024_atelier_retention_livres.sql`
    ÉCRITE, pas appliquée ; aucun automatisme (ni cron, ni relève, ni interrupteur) ;
  - harnais `verif-atelier.ts` contre une fausse base (`scripts/fausseBase.ts`) et un faux coffre.
  - **Lu en production, sans `--vraiment`, le 20/10 au soir** : 5 dossiers livrés, tous livrés il y a
    2 à 22 jours ; **aucun concerné aujourd'hui** ; le premier le deviendrait dans 68 jours.
- **Ce que Mathias doit trancher avant le premier `--vraiment`** : (1) « fichier HD » efface aussi le
  PDF SOUVENIR, la « version digitale HD » que les CGV (art. 1.2) disent incluse : le client perd son
  téléchargement au 90e jour, et ni les CGV ni M7b ne le disent ; (2) la réimpression du même fichier
  (T-105) devient impossible après 90 jours, alors que pour les éditions le PDF terminé est gardé (Q5) ;
  (3) appliquer la migration 20261024 ; (4) les écrans des particuliers (fiche de l'atelier, `/numero`,
  `/compte`) ne lisent pas encore le marqueur.
- **Ce que le texte promet et que ce lot ne rend pas vrai** : Rekognition (§5), OpenAI et Fal.ai (§9)
  n'existent toujours pas dans le code ; « supprimées » ne vaut que pour le coffre (pas les lots
  téléchargés, Canva, l'imprimeur, ni d'éventuelles sauvegardes) ; tant que personne ne lance le
  script, rien n'est supprimé à 90 jours.
