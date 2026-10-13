---
id: T-144
titre: Le bon à tirer d'un magazine collectif ne se relit pas en ligne
etat: en cours
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
13/10/2026, branche `feat/collectif-phases-2-a-6` :
- **`bat.ts`** (pur) : l'appariement de deux tours, les zones modifiées, les doubles pages, le
  rognage à la TrimBox, la lecture d'une note par type, le choix de couverture, ce qui manque pour
  publier, le format des plans de gris. **`tours.ts`** (effets) : une seule façon de compter les
  tours publiés (lue par `publier_tour` et `valider_bat`).
- **L'appariement a été refait après mesure.** L'empreinte d'image seule (pHash) confondait deux
  pages de même gabarit (0 à 4 bits d'écart entre deux chapitres différents) et perdait une page
  dont la photo avait changé (20 à 28 bits) : le tour 2 de l'essai disait « 2 nouvelles, 1
  retirée » au lieu de « 1 modifiée, 1 nouvelle ». Désormais le TEXTE de la page (lu par pdf.js)
  est l'indice fort, l'image départage les pages sans texte, et l'alignement respecte l'ordre
  (comme un « diff »). Sur l'essai du magazine 2 : 2 modifiées, 1 nouvelle, 1 retirée, page par
  page exactes.
- **Les zones aussi.** À 120 px de large, un mot corrigé dans un texte de 10 pt passait sous le
  seuil. Plans de gris à 240 × 340 (compressés en gzip, moins d'un Mo pour 40 pages), et une
  cellule « bouge » aussi quand quelques pixels changent franchement. Le mot changé du tour 3 est
  entouré à sa place.
- **Atelier** `/admin/collectif/[id]/bat?m=N` : déposer le PDF (rendu dans le navigateur, « page i
  sur n »), PDF source, pages et vignettes en PUT signé vers R2, gris par le serveur ; les
  propositions de couverture (1re, 2e, 3e) du premier tour ; l'échéance (heure de Paris) ;
  publier en deux gestes ; lire les notes envoyées (photo demandée en vignette) et y répondre.
- **Client** `/edition/[t]/bat?m=N` : tours en onglets, « Tour N · en cours », avant / après avec
  les zones (orange plein, pointillé sur l'ancienne version), « Nouvelle page », pages retirées
  nommées, double page (page par page sur téléphone), plein écran, bande de vignettes, préchargement
  ± 2, flèches du clavier ; notes typées (enregistrées tout de suite, épingle affichée en 8 ms
  avant la réponse du serveur, remise dans sa fenêtre si l'écriture échoue), note générale,
  choix d'une photo de l'édition, envoi en lot, résolue / rouvrir, filtres ; panneau des
  couvertures (magazine posé en 3D, 2e et 3e en magazine ouvert, « Sans préférence », note) ;
  validation en deux temps avec la phrase du tirage lu dans la fiche, refusée tant qu'une note
  n'est pas envoyée ou qu'aucune couverture n'est choisie. Tour archivé : bandeau, lecture seule.
- **Prouvé en local contre la production (13/10)** : 5 tours publiés sur l'édition d'essai,
  le lien d'équipe voit tout sans un bouton et reçoit 403 sur les huit actions, le lien de dépôt
  404, un magazine validé refuse toute note, l'admin sans cookie 401 ; magazine 2 validé, la
  Livraison reste verrouillée tant que le magazine 1 ne l'est pas.
- **Reste, et c'est à Mathias** : le test sur un VRAI export Affinity (24 à 40 pages : polices,
  transparences, fonds perdus, texte vectorisé ou non) et la largeur de rendu (PRD §12.10,
  1600 px provisoires).
