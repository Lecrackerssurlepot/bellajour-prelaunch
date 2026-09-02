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
