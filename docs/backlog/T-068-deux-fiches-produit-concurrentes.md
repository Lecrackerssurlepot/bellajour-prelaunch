---
id: T-068
titre: Le site déclare deux fiches produit concurrentes pour un seul produit
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de référencement du 29/08/2026.
## Ce que j'ai vérifié
`src/app/(atelier)/page.tsx:70-97` déclare un `Product` + `AggregateOffer` 30-45 € **sur la page
de récit de marque**, où seul « dès 30 € » est visible (`Ouverture.tsx:227`). Et
`magazine/page.tsx:100-124` déclare un **second** `Product` du même produit, sans `sku` ni `@id`
pour les relier.
Si Google retient celle de `/`, l'acheteuse arrive sur les sept pages de l'univers : sans prix,
sans FAQ, sans acte d'achat — exactement l'écran que `/magazine` a été créée pour supprimer.
De plus, un `highPrice` de 45 € absent de la page rendue est un balisage non conforme, motif de
rejet du résultat enrichi.
Deux défauts du même balisage :
- **L'image déclarée** (`magazine/page.tsx:122`, `page.tsx:96`) est `marrakech.webp`, mesurée
  **450×675** — très en dessous du seuil des résultats enrichis. La page qui vend part sans
  vignette dans le panneau produit et dans Google Images.
- Ni `hasMerchantReturnPolicy` ni `shippingDetails`, alors que `/remboursement` existe et que la
  livraison est comprise dans les 30/40/45 € (`prix.ts:27`). Les deux arguments qui lèvent le
  doute au moment du clic n'apparaissent jamais dans le résultat de recherche.
Manquent aussi `Organization` et `WebSite` avec `sameAs` : une recherche sur « Bellajour » ne
relie pas le domaine aux comptes Instagram et TikTok, pourtant écrits en dur dans `Footer.tsx:69,92`.
## Ce que je propose
Un seul `Product`, sur `/magazine`, qui est la page produit. Sur `/`, garder au plus un
`Organization` + `WebSite`. Puis une image produit d'au moins 1200 px de large, et les deux champs
de réassurance.
⚠️ Ne jamais déclarer un prix absent de la page rendue — c'est ce qui fait rejeter le balisage.
## Ce qui a été fait
—
