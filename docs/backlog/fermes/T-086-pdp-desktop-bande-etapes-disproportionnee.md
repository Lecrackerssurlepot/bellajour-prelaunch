---
id: T-086
titre: Sur desktop, la bande « étapes 1-2-3 » occupe un espace sans rapport avec son contenu
domaine: front
gravite: confort
autonomie: avis-requis
ouvert: 2026-09-01
---
## Ce que Mathias a dit
« Sur ordi les sections sont un peu mal réparties, notamment les étapes 1 2 3 : c'est une
immense section alors que le contenu est tout petit. Ça pourrait être soit beaucoup plus mis en
avant, soit bien collé entre les deux sections, mais de manière propre. » (01/09/2026)

## Ce que j'ai vérifié (audit front 01/09)
`Kiosque.tsx:169-193` sort le bloc `.bloc-pas` de la colonne à deux temps pour en faire une bande
pleine largeur sous le kiosque. `pdp.css:259` lui donne `margin-top: clamp(56px, 6.5vw, 110px)` ;
la section suivante « L'objet » (`pdp.css:442-444`) ajoute encore `padding-top` = `clamp(72px, 11vw,
132px)` (`pdp.css:27`). Le contenu réel par colonne : un chiffre (~30-40 px), un titre d'une ligne,
une phrase courte, un délai — soit ~150-180 px de texte entourés de ~93-110 px de marge au-dessus et
72-132 px en dessous. Sur un écran ≥ 1440×900 la bande se lit comme un vide flottant entre deux
zones denses (kiosque plein écran au-dessus, double page de « L'objet » en dessous). Constat exact
de Mathias, confirmé.

## Ce que je propose (au choix de Mathias)
- **(a) Collage propre** — réduire `margin-top` de `.bloc-pas` vers la gouttière standard (`--g`) et
  fusionner visuellement le haut de la bande avec le bas du kiosque. Effort S, **risque FAIBLE**
  (une valeur de marge isolée, pas de dépendance de hauteur critique documentée, contrairement à
  `--nav-h` ou au calcul du kiosque). Applicable sans risque.
- **(b) Mise en avant** — enrichir le contenu de la bande (une icône/visuel par étape, comme les
  4 pictos de « Compris » juste en dessous) pour que l'espace occupé corresponde à un contenu plus
  riche. Effort M, demande un aller-retour design + vérifier la hauteur sur mobile (liste empilée,
  `pdp.css:210-244`).

**Question pour Mathias** : (a) collage discret, ou (b) on enrichit la bande ? Le reste attend ta
réponse — c'est un arbitrage visuel, pas un bug.

## Tranché et fait (07/09, lot 3 du chantier « Un vrai site »)

Mathias a tranché via le chantier : ni le simple collage (a), ni les visuels (b) — la bande
gagne un TITRE. « Le parcours avec l'atelier » (h2, famille display un cran sous les .titre
de section) et un sous-texte « Depuis le téléphone ou l'ordinateur, en trois gestes. »,
tous deux dans `content.ts` (PARCOURS_TITRE / PARCOURS_SOUS_TITRE), rendus par `Kiosque.tsx`
avant la liste.

Les marges qui simulaient du contenu se resserrent : `margin-top` de `.bloc-pas` descend de
`clamp(56px, 6.5vw, 110px)` à la gouttière `--g` (80 px à 1440), et le `padding-top` de
« L'objet » passe de `--v` (132 px max) à `clamp(48px, 6vw, 88px)` sur écran large. Le
téléphone garde ses valeurs : le grief était desktop.

Mesuré au navigateur (07/09) : à 1440×900 le premier écran va toujours jusqu'au bouton et la
bande part sous la ligne de flottaison ; à 375×667 le bouton est à 620 px (invariant T-087
tenu) et le titre ne déborde pas.

## État

`fait` — livré par la branche `feat/pdp-parcours-faq`, en attente de recette Mathias.

## Fermeture (08/09/2026)

Vérifié dans `main` avant fermeture, pas cru sur parole : le titre et le
sous-texte de la bande vivent dans `content.ts:67-68` et sont rendus par `Kiosque.tsx:194`, et
la branche `feat/pdp-parcours-faq` est bien fusionnée (`de44248`).

## État

`fermé` — livré le 07/09, prouvé dans `main` le 08/09. La recette à l'œil reste à faire par
Mathias.
