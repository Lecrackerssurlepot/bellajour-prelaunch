---
id: T-028
titre: La page produit affirme un grammage qu'on n'a pas mesuré
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Quatre points laissés en suspens à la mise en ligne de `/magazine` le 28/08 : le grammage affirmé
sans donnée, les visuels provisoires, la FAQ non relue, et la mention « livraison comprise » qui
a disparu.
## Ce que j'ai vérifié
`/magazine` est en production depuis le 28/08 et c'est la page qui vend. Les finitions réelles ne
sont pas tranchées (T-027) : la page affirme donc quelque chose que la chaîne d'impression ne
garantit pas encore.
Effet : c'est une promesse faite à une cliente qui paie. C'est le type d'écart qui ne se voit
jamais avant qu'il ne soit reproché.
## Ce que je propose
Traiter les quatre séparément — seul le grammage est bloquant pour la vente.
**Questions pour Mathias** : (1) le grammage affiché correspond-il à ce que Cloudprinter livre
réellement, ou faut-il retirer le chiffre en attendant T-027 ? (2) « livraison comprise » : c'est
vrai (le prix est TTC, port inclus dans la zone FR/BE/LU) — on le remet ? (3) veux-tu relire la
FAQ, ou je te la sors dans un document ?
Tant que ce n'est pas tranché, je ne touche à aucun chiffre de cette page.
## Ce qui a été fait
—

## 10/09/2026 — le point « livraison comprise » est tranché

Mathias a décidé : la livraison est **facturée en sus** (devis Cloudprinter à la publication,
plafond à poser). La page produit dit désormais « De 25 € pour 20 pages à 59 € pour 60 pages.
Livraison en sus, affichée avant paiement. » (PR #102, #103), et les CGV v3.1 le contractualisent.
Restent les trois autres points : grammage affirmé sans mesure, visuels provisoires, FAQ non relue.


## 11/09/2026 — le grammage est sourcé : le point BLOQUANT de ce ticket tombe

Le papier est tranché (T-027, fermé) et relevé chez l'imprimeur. `/magazine` ne promet donc plus
un chiffre que personne n'avait mesuré : « papier intérieur couché satiné 130 g, couverture
250 g » est désormais EXACTEMENT ce que `PAPIER_INTERIEUR` / `PAPIER_COUVERTURE` commandent, et
les CGV v3.2 le contractualisent dans les trois langues. Une ligne s'ajoute à la page : la
couverture est pelliculée brillante ou mate, au choix, sans supplément.

⚠️ Le lien entre les deux est un COMMENTAIRE, pas du code : le grammage de `/magazine` et celui
d'`impression.ts` sont deux chaînes distinctes. Les changer ensemble, toujours.

**Restent les deux points non bloquants** : les visuels provisoires, et la FAQ non relue.
