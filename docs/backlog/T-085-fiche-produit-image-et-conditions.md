---
id: T-085
titre: La fiche produit de /magazine n'a ni image conforme ni conditions marchandes
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-01
---
## Ce que Mathias a dit
Rien — reste détaché de T-068 le 01/09/2026, à sa clôture. Les deux points étaient déjà écrits
là-bas comme « pas un oubli ».
## Ce que j'ai vérifié
Depuis T-068, il n'y a plus qu'un seul nœud `Product` sur le site, sur `/magazine`
(`src/app/(atelier)/magazine/page.tsx`, `JSON_LD`). Il déclare bien `AggregateOffer`
(30/40/45 €, lus depuis `PALIERS`, la même source que l'affichage), `brand`, `url` et `image`.
Deux manques subsistent, et aucun ne se comble par du code :
**1. L'image est trop petite.** `image` pointe sur
`/images/lancement/galerie/marrakech.webp`. Les 25 fichiers de ce dossier font **450 × 675**
(mesuré avec `sips` le 31/08). Google demande des images d'au moins **1200 px** de large pour
les résultats enrichis produit. Il n'existe **aucune source plus grande dans le dépôt** : il
faut un fichier de Mathias. ⚠️ Ne pas agrandir un 450 px par interpolation pour faire le
nombre — ce serait une image floue dans le carrousel Google, sous notre marque.
**2. `hasMerchantReturnPolicy` et `shippingDetails` sont absents.** Les déclarer, c'est affirmer
un délai de rétractation et des conditions de livraison **que la page rendue n'affiche pas**.
Or « livraison comprise » a justement disparu de la PDP, et c'est un des points non tranchés de
`/magazine`. Baliser ce qui n'est pas à l'écran, c'est refaire l'erreur du `highPrice: 45`
fantôme que T-068 vient de retirer : Google rejette le résultat enrichi et, cette fois, on aurait
en plus écrit une promesse commerciale nulle part tenue.
## Ce que je propose
Deux gestes indépendants, chacun débloqué par autre chose que du code :
1. **L'image** : une photo de couverture ≥ 1200 px de large fournie par Mathias, posée dans
   `public/images/`, déclarée dans `image` (idéalement en trois ratios 1:1, 4:3, 16:9, ce que
   Google préfère). Ça se fera bien avec le chantier visuels déjà nommé dans T-069.
2. **Les conditions marchandes** : à faire **le jour où la PDP les affiche**, pas avant, et avec
   le texte des CGV comme seule source (lot CGV : T-026, T-027, T-028, T-072, T-077). L'ordre
   n'est pas négociable : la page d'abord, le balisage ensuite.
⚠️ Vérifier ensuite dans le rapport « Extraits produit » de la Search Console. C'est le seul
endroit qui dit si Google a accepté ; un JSON-LD valide ne prouve rien.
## Ce qui a été fait
—
