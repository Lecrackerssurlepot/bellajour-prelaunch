---
description: L'état du produit et du backlog, en vingt lignes.
---

Lis `docs/backlog/INDEX.md`, `docs/reference/ETAT-PRODUCTION.md`, `docs/produit/ROADMAP.md`, et
le dernier fichier de `docs/journal/`. Vérifie la branche courante et l'écart avec `main`.

Rends, dans cet ordre, sans remplissage :

1. **Où on en est** — deux phrases. Ce qui marche en production, ce qui manque pour ship.
2. **Ce qui saigne** — les tickets `bloquant` ouverts, un par ligne, avec l'effet réel sur une
   cliente. S'il n'y en a pas, dis-le franchement.
3. **Ce qui t'attend, toi** — les tickets `a-valider` et `avis-requis` : la question précise que
   j'ai pour Mathias, et ce que je fais dès qu'il répond. C'est la section la plus utile : c'est
   la seule où son intervention est nécessaire.
4. **Ce que j'ai fait depuis la dernière fois** — trois lignes, depuis le journal.
5. **Ce que je prends ensuite** — le prochain ticket, et pourquoi celui-là.

6. **Ce que l'éditeur a appris** — lance `npx tsx --tsconfig tsconfig.json scripts/lecons.ts --depuis <date du
   dernier point>` (lecture seule) : les gestes contraires par règle, les réponses aux trois questions, le temps par
   magazine. S'il y a assez de cas (au moins cinq sur une même règle), propose UN réglage avec la preuve chiffrée ; ne
   change rien sans le oui de Mathias. Sans la migration 20261110, dis-le en une ligne.

Pas de tableau de chiffres, pas de pourcentage d'avancement inventé. S'il y a une incertitude
qui compte (une donnée qu'on attend, un prix non tranché), elle passe devant le reste.
