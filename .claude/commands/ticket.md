---
description: Ouvre un ou plusieurs tickets à partir d'un texte libre. Classe, date, et écrit dans le backlog.
---

Mathias vient de dire : **$ARGUMENTS**

Ouvre le ou les tickets correspondants. S'il a décrit plusieurs choses, fais plusieurs tickets :
un ticket = un problème vérifiable et une décision.

1. Lis `docs/backlog/INDEX.md` pour le prochain numéro libre et pour vérifier qu'un ticket
   proche n'existe pas déjà (dans ce cas, enrichis-le au lieu d'en créer un doublon).
2. Crée `docs/backlog/T-<nnn>-<slug>.md` avec cet en-tête exact :

```
---
id: T-<nnn>
titre: <une phrase, ce que la cliente ou Mathias constate>
etat: nouveau
domaine: front | atelier | paiement | donnees | admin | exploitation | produit | contenu
gravite: bloquant | serieux | confort
autonomie: libre | avis-requis
ouvert: <AAAA-MM-JJ>
---
```

3. Le corps, dans cet ordre : **## Ce que Mathias a dit** (verbatim, jamais reformulé) ·
   **## Ce que j'ai vérifié** (vide pour l'instant) · **## Ce que je propose** ·
   **## Ce qui a été fait**.

Règle de classement de `autonomie`, mécanique, sans interprétation — c'est **`avis-requis`**
dès que le ticket touche : un envoi de mail, un prix ou un paiement, une migration de base
appliquée en production, un texte légal ou une promesse faite à la cliente (délai, grammage,
matière), une commande d'impression, ou une suppression de données. Tout le reste est `libre`.

4. Ajoute la ligne dans le tableau de `docs/backlog/INDEX.md`, au bon rang de gravité.

Ne commence PAS le travail. Réponds en trois lignes : ce que tu as ouvert, comment tu l'as classé,
et — si tu le vois déjà — le doute que tu auras à lever en le vérifiant.
