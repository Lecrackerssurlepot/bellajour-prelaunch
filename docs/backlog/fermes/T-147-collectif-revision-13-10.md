---
id: T-147
titre: L'espace client de l'Édition collective se lit comme un site, pas comme un logiciel
etat: en pause
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-14
---
## Ce que Mathias a dit
« J'ai testé les écrans de l'édition collective et retravaillé les maquettes. » Le PRD a une
section §14 (révision du 13/10/2026) qui prime sur les §4 à §7 quand elle les contredit.

## Ce que j'ai vérifié (14/10, avant tout code)
- Toutes les pages du client défilent en entier (`.ec-coquille` en `min-height`).
- Le menu a un logo en texte, l'ordre « Votre dossier » puis « Parler à l'atelier », la
  pastille des non-lus sur le dossier.
- Aucun mode jour, plus de 90 couleurs en dur dans les CSS de l'espace.
- Aucune fenêtre en verre.
- Le tableau de bord n'a ni zone de dépôt, ni lien de contribution par personne, ni envoi des
  contenus (aucune route n'écrit dans `collectif_contenus`), ni QR code (aucune bibliothèque).
- Le BAT défile, sa note s'ouvre dans une fenêtre flottante et les couvertures en plein écran.
- La messagerie vit dans le dossier, sans pièce jointe ni document cité (les colonnes
  n'existent pas).
- Le brief ne s'enregistre qu'en bloc ; la page « modifier le brief » n'existe pas.

## Ce que je propose
La révision, écran par écran, sur `feat/collectif-revision-13-10` (issue de
`feat/collectif-phases-2-a-6`, non fusionnée), un commit par point, une seule PR. Elle reprend :
- T-141 : coquille, tableau de bord, dossier devenu « Documents » ;
- T-142 : liens de contribution avec leur propre plafond ;
- T-143 : le style, et « modifier le brief partie par partie » ;
- T-144 : le BAT plein écran ;
- T-145 : Parler à l'atelier réunit la conversation, les demandes et les propositions.

**Avis requis** : la migration `20261014_collectif_revision.sql` (écrite, jamais appliquée par
Claude Code) ; les quatre questions du mot du dirigeant (PRD §12.14) ; les rendez-vous pris
(PRD §12.13).

## Ce qui a été fait (14/10/2026, `feat/collectif-revision-13-10`)
Sept commits, un par point, puis une PR vers `main` (elle porte aussi les phases 2 à 6) :
1. **Les documents** : le PRD remis à son nom (§12 complété), les maquettes à leur place.
2. **La coquille** : jour / nuit (jetons sémantiques, cookie `bj_ec_mode`, soleil / lune), le
   vrai logo, le menu de 232 px dans le nouvel ordre (« Documents »), la pastille sur Parler à
   l'atelier qui s'éteint sans recharger, aucune page qui défile, les fenêtres en verre.
3. **Le tableau de bord** : encarts Style et Photos à leurs états, le lien de contribution
   (curseur, plafond PAR LIEN, QR, partage), « À envoyer à l'atelier » (fichier ou
   questionnaire), le dernier message. Migration `20261014` écrite, replis testés.
4. **Le bon à tirer plein écran** : en-tête unique, une ligne d'information, la double page à la
   taille de la scène, bande et onglets des magazines en bas, notes dans un panneau repliable,
   note en cours dans le panneau, couvertures dans la scène, validation en verre.
5. **Parler à l'atelier et Documents** : un fil (messages, demandes, propositions), le « + »
   (joindre, citer), le rendez-vous et « Vos demandes » ; Documents sans messagerie, l'encart
   « Nouvelle proposition », ce que prévoit le devis.
6. **Le style** : le mur à défilement interne et brief fixe, la barre d'étapes collante, la
   page `/style/brief` (palette et texte sur place, doubles pages et couvertures en panneau
   latéral), les actions partielles de l'API.
7. **Photos et Livraison** : la coquille, le défilement interne, la fenêtre du lien de
   contribution sur Photos, le dépôt en verre.

Vérifié : `tsc`, `lint` (0 erreur), `build`, `verif-atelier.ts` (1450) et `verif-collectif.ts`
(426) verts ; chaque écran mesuré sans défilement de page en jour ET en nuit, à 1440 × 900 et
1280 × 800 ; téléphone à 375 px (menu en tiroir, BAT avec notes en feuille du bas).

**Migration appliquée par Mathias le 14/10**, vérifiée en SQL, puis rejouée en vrai : un lien
plafonné à 5 a reçu 5 photos sur 6 (la 6e refusée avec sa phrase), un document cité et une pièce
jointe sont arrivés et s'ouvrent des deux côtés (client et fiche atelier).

**Reste à Mathias** : fusionner la PR #229 ; relire les quatre questions du mot du dirigeant ;
trancher les rendez-vous pris (PRD §12.13).
