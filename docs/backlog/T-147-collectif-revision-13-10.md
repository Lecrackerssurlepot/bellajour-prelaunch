---
id: T-147
titre: L'espace client de l'Édition collective se lit comme un site, pas comme un logiciel
etat: en cours
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

## Ce qui a été fait
Rien encore. Ticket ouvert le 14/10/2026.
