---
id: T-144
titre: Le bon à tirer d'un magazine collectif ne se relit pas en ligne
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-13
---
## Ce que Mathias a dit
« Je veux pouvoir ouvrir de vraies éditions de test et tout utiliser de bout en bout (phases 0 à
6). »

## Ce que j'ai vérifié
- `rendreBords.ts` charge pdf.js depuis `public/pdfjs/` (5.7.284) et rend chaque page dans le
  navigateur, mais n'exporte ni image ni envoi. Aucune file d'envoi d'images n'existe côté admin.
- pdf.js rend la CropBox ; chez Affinity elle égale souvent la MediaBox (fond perdu compris). Il
  faudra rogner à la TrimBox (`decoupe.ts` la lit déjà). Pas de simulation de surimpression,
  conversion CMJN naïve : les couleurs peuvent glisser.
- Le PRD rangeait les pages sous `tours/<n>/` : deux magazines auraient écrasé leurs tours 1.
  `cles.ts` range par l'id du tour.
- La base fige un tour publié (trigger `collectif_tour_fige`, et ses couvertures).

## Ce que je propose
PRD §6, phase 5 :
- **d'abord** (juste après T-140) : le test sur un vrai export Affinity. Si le rendu diverge,
  accepter un dossier d'images de pages exporté d'Affinity à la place du PDF ;
- dépôt d'un tour : rendu pdf.js page par page (« page i sur n »), images vers R2, appariement par
  ressemblance (nouvelle page, page retirée), zones modifiées ; propositions de couverture avec
  2e et 3e ; échéance ; publication en deux temps (`publier_tour`) ;
- lecteur client : tours, avant/après, double page, plein écran, vignettes, préchargement ± 2 ;
- panneau des couvertures (mockup 3D, « Sans préférence », note) ;
- notes typées (`TYPES_NOTE`), brouillon enregistré tout de suite, envoi en lot, résolution,
  réponse atelier, filtres, note générale, mise à jour optimiste sous 100 ms ;
- validation en deux temps (`valider_bat`, couverture exigée), lecture seule pour l'équipe, tour
  archivé figé.

**Décision ouverte** : la largeur de rendu des pages (PRD §12.10). Mesurer poids et lisibilité sur
le vrai PDF, Mathias choisit.

**Avis requis** : le texte de validation (« Elle confirme le tirage de N exemplaires et lance
l'impression ») est une promesse faite au client ; N vient de la fiche.

**Recette** : tour 1 avec un vrai PDF Affinity (24 à 40 pages), 5 notes de 4 types, un choix de
couverture, tour 2 avec une page ajoutée (l'avant/après apparie et signale la nouvelle page),
validation.

## Ce qui a été fait
Rien. Ticket ouvert le 13/10/2026.
