---
id: T-088
titre: Le logo en haut du questionnaire et de la page cliente est un clic mort
domaine: front
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-01
---
## Ce que Mathias a dit
« Le parcours du questionnaire, il y a beaucoup de choses qui ne vont pas : le logo en haut, ou
quand le client suit son numéro le logo en haut, les boutons de retour, la croix, les routes où ça
emmène. Je ne les trouve pas optimisés. » (01/09/2026) — Mathias précise vouloir retravailler ce
point lui-même ; ce ticket porte le diagnostic prouvé et des propositions.

## Ce que j'ai vérifié (audit front 01/09)
Cartographie du chrome de navigation :
- **`/composer` (6 écrans)** — le « logo » est `<span class="at-q-logo">Bellajour</span>`
  (`Composer.tsx:235,285`), stylé en police display 22 px (`composer.css:53`), **au même endroit
  visuel qu'un vrai logo cliquable** ailleurs sur le site (`Nav.tsx:90-117` sur `/` et `/magazine`).
  Mais il n'a **ni `href` ni `onClick`** : cliquer dessus ne fait rien (« dead click »).
  Le bouton « ← Retour » (`Composer.tsx:277-284`) va à l'écran précédent ; la croix « Fermer ✕ »
  (`Composer.tsx:291`) est un `<a href="/">` qui recharge toute la page (voulu, pour tuer le moteur
  d'envoi hors-React — `useDepot.ts:112-113`), et pointe vers l'accueil, sans distinguer le stade
  d'avancement.
- **`/numero/[token]`** — même `<span>Bellajour</span>` inerte (`page.tsx:518`), mais **ici c'est
  un choix produit assumé et documenté** (`numero.css:19-21` : « un seul libellé de bouton sur tout
  le site », éviter de distraire d'un dossier en cours). Pas de bouton retour ni croix.

Le problème : le même mot « Bellajour » se comporte de trois façons différentes (lien qui remonte,
lien qui recharge vers `/`, rien du tout) selon la page, sans que rien ne le signale. Sur le tunnel
le plus abandonné du parcours (T-051, T-058), un clic-réflexe sur le logo qui ne fait rien est un
coût d'usage silencieux, invisible en recette.

## Ce que je propose
- **`/composer`** — faire du logo un vrai `<a href="/">` (même mécanique que « Fermer », même
  destination) : un réflexe de navigation trouve enfin une porte. **Risque NUL** (ajoute un lien,
  ne retire rien). ⚠️ à peser : c'est aussi une sortie de plus hors du tunnel — si l'intention est
  de garder la cliente dans le parcours, on ne le fait pas. **Arbitrage de Mathias.**
- **Croix « Fermer »** — piste de confort : un texte contextuel non bloquant « votre brouillon est
  conservé » à partir de l'écran 4 (une fois des infos personnelles saisies). Le filet technique
  existe déjà (`beforeunload` + survie du moteur d'envoi), c'est purement rassurant.
- **`/numero`** — je ne recommande **pas** d'y toucher sans validation : l'inertie du logo y est un
  choix produit documenté. Signalé seulement pour l'incohérence perçue.

**Question pour Mathias** : le logo `/composer` devient-il un lien vers l'accueil, ou reste-t-il
neutre pour ne pas ouvrir de sortie du tunnel ?
