---
id: T-065
titre: Aucune image du site n'a de variante pour téléphone
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de performance du 29/08/2026.
## Ce que j'ai vérifié
Grep exhaustif sur toute la surface publique (`(atelier)/`, `numero/`) : **zéro `srcset`, zéro
`sizes`**. Conséquence directe de la règle « zéro `next/image` », qui reste juste — mais rien ne
l'a remplacée.
Trois cas mesurés :
- `Ouverture.tsx:211` — `brand-01.webp` servie en **1200×1600, variante unique**. Décodée, elle
  occupe **7,3 Mo de mémoire bitmap**, et `ouverture.css:150` lui applique en plus un filtre plein
  écran qui exige un tampon supplémentaire. Sur un iPhone d'entrée de gamme avec plusieurs onglets,
  Safari recharge l'onglet : la visiteuse retombe sur l'écran noir de l'ouverture et recommence.
- `Corps.tsx:109,111` — deux sources 450×675 (116 Ko) peintes dans des cases d'environ 145×109 px,
  `aria-hidden`, purement décoratives : 2,4 Mo de bitmap pour deux timbres-poste.
- `Nav.tsx:94,110` — `signature-blanche.webp` en 320×122 affichée à 20 px de haut, préchargée et
  en `decoding="sync"` (décodage sur le fil principal), en concurrence avec l'image principale.
## Ce que propose
Des variantes et un `srcset` sur les trois cas, en commençant par la couverture qui est aussi
l'image principale. `scripts/optimize-images.mjs` sait déjà fabriquer les déclinaisons.
Commencer par `decoding="async"` sur la signature : une ligne, gain immédiat.
## Ce qui a été fait
—
