---
id: T-159
titre: Rien n'efface les photos d'une édition collective après la livraison, et aucune durée n'est fixée
etat: en cours
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux vraiment que tu enregistres dans le projet euh, tous ces problèmes-là et aussi tout ce
qu'on aura, enfin, tous ces points encore à mettre et à voir » (19/10/2026).

## Ce que j'ai vérifié
- PRD §12.5 « Délai de suppression des photos après livraison » : ouvert. T-146 le range dans
  « plus tard » (script sur le modèle d'`anonymiser-dossiers.ts`).
- `scripts/anonymiser-dossiers.ts` (T-076) ne traite que les dossiers particuliers (`numeros`) :
  les photos des éditions (`collectif_photos`, coffre R2) n'ont aucune fin.
- Une édition archivée garde tout (geste « Archiver » : « Rien n'est effacé »). C'est voulu pour
  « Récupérer », mais sans délai, une archive devient une conservation sans limite.

## Ce que je propose
Mathias fixe le délai (et s'il diffère pour les photos retenues dans le magazine). Ensuite : un
script en lecture seule par défaut, `--vraiment` pour agir, sur le modèle d'`anonymiser-dossiers`,
qui efface le coffre d'une édition livrée depuis plus que ce délai, journalisé. Le délai écrit
devra aussi entrer dans la politique de confidentialité (T-158).

## Ce qui a été fait
- **20/10/2026** : Mathias fixe l'ordre de grandeur, « 30 jours, un truc comme ça, après la
  réception de la livraison » (à confirmer : le chiffre n'est écrit nulle part dans le code).
- **La règle, pure** : `src/lib/collectif/retention.ts`. `verdictRetention` : seulement une édition
  `livree` (état effectif), avec `livraison.livree_le` lisible (l'heure de « Marquer livrée »), vieille
  d'au moins N jours, pas encore effacée (`photos_supprimees_le`). Jamais en impression, jamais
  expédiée, jamais sans date, jamais avec un délai illisible ; l'archive n'épargne rien. `FAMILLES` :
  partent les photos et vignettes, les rendus du BAT, les contenus envoyés, les pièces jointes ;
  restent le PDF de chaque tour, les documents (devis, factures) et toute clé non reconnue, en
  attendant les questions Q3 et Q4 du projet. `PATCH_PHOTO_EFFACEE` : aucune ligne supprimée, les
  métadonnées de l'image, du lieu et de l'appareil vidées ; `deposant` et l'accord gardés (Q5).
- **La garde du coffre** : `racineEffacable` (pure, `src/lib/atelier/r2.ts`) n'accepte que
  `numeros/<id>/` ou `collectif/<uuid>/` exact ; deux effaceurs, chacun SA racine :
  `supprimerPrefixe` (B2C, comportement inchangé) et `supprimerCoffreEdition` (nouveau), qui
  refusent avant tout appel réseau. Un vide, `collectif/`, les styles, un uuid tronqué ou en
  majuscules, un sous-dossier : refusés. Commentaire de `src/lib/collectif/cles.ts` mis à jour.
- **Le script** : `scripts/collectif-retention.ts --jours N [--edition <uuid>] [--vraiment]`, sur le
  modèle d'`anonymiser-dossiers.ts`. `--jours` obligatoire, sans défaut ; lecture seule sans
  `--vraiment` ; argument inconnu refusé ; coffre d'abord, abandon de l'édition au premier échec,
  puis les lignes, puis `photos_supprimees_le`, puis le journal `coffre_efface`
  (`collectif_evenements`). Pas de cron. Ligne ajoutée dans `scripts/CLAUDE.md` (« À manier avec
  précaution »).
- **Harnais** : `verif-collectif.ts` (délai, verdict, familles sur les clés de `cles.ts`, colonnes du
  patch lues dans la migration 20261013, garde du coffre, refus réels des deux effaceurs sans réseau,
  lecture statique du script) et `verif-atelier.ts` (la vraie garde B2C, plus une copie de sa regex).
  Deux mutations volontaires (garde élargie à `collectif/.*`, refus « en impression » retiré) font
  tomber 6 épreuves : le harnais mord.
- **Lu en production, sans `--vraiment`, le 20/10** : 10 éditions ; à `--jours 1`, seule « Essai
  livraison (Claude) » (archivée, livrée le 13/10) serait concernée (20 rendus du BAT et 1 pièce
  jointe effacés ; 1 PDF et 2 documents gardés ; chaque clé reconnue) ; à `--jours 30`, aucune.
  **Jamais lancé avec `--vraiment`.**
- **Avant le premier `--vraiment`** : les écrans (espace, fiche) doivent lire
  `photos_supprimees_le` (aujourd'hui personne ne le lit : une édition effacée montrerait des
  vignettes vides) ; une procédure pour les lots téléchargés par l'atelier ; vérifier le versioning
  du bucket et les sauvegardes ; décider `cle_fichier` (porte encore le nom d'origine) ; coder la
  corbeille de 30 jours (décision du 20/10) comme seconde règle du même module ; fixer une cadence de
  passage du script pour que la politique puisse promettre une date.
