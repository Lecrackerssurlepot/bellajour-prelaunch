---
id: T-027
titre: Les finitions d'impression sont posées par défaut, pas choisies
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
ferme: 2026-09-11
---
## Ce que Mathias a dit
« Trancher les finitions (grammage/pelliculage) avec l'étude de prix. »
## Ce que j'ai vérifié
`src/lib/atelier/impression.ts` pose `pageblock_130mcs` et `cover_250mcs` **par défaut**. C'est
LE seul endroit à retoucher, mais ces valeurs n'ont jamais été choisies : elles ont été prises.
Elles déterminent ce que la cliente reçoit dans les mains, et le coût de revient de chaque numéro.
Lié à T-028 : `/magazine` affirme déjà un grammage à la cliente.
## Ce que je propose
Attendre l'étude de prix. Je peux préparer le comparatif : pour chaque combinaison réaliste,
le coût Cloudprinter et l'effet sur la marge aux trois paliers (30/40/45 €).
**Question pour Mathias** : où en est l'étude de prix, et veux-tu ce comparatif maintenant ?
## Ce qui a été fait

### 11/09/2026 — TRANCHÉ, et le comparatif qui manquait est fait

Le comparatif que ce ticket proposait a été relevé (`prices/lookup`, HT, un exemplaire, deux
passes identiques) et consigné dans `docs/reference/SPECS-CLOUDPRINTER.md`. Il a retourné la
question : **le grammage ne coûte presque rien** (90 → 130 g sur un dos carré de 32 pages : un
centime), **le pelliculage rien du tout** (un demi-centime entre mat et brillant), et ce qui
bouge vraiment est le PORT, parce que le papier décide de l'usine — 2,76 € HT d'écart en France
entre `130mcs` et `130mcg`, et aucun écart du tout au Portugal ni en Allemagne.

Décision de Mathias, le même jour : **on garde les références qu'il avait choisies.**

| | Référence |
|---|---|
| Intérieur | `pageblock_130mcs` (130 g couché satiné) |
| Couverture | `cover_250mcs` (250 g) |
| Pelliculage | **au choix du client** : `finish_gloss` ou `cover_finish_matte`, sans supplément |

Livré avec : `PAPIER_INTERIEUR` / `PAPIER_COUVERTURE` (une constante pour les deux reliures, le
même papier quelle que soit la pagination), `numeros.finition` (migration `20260911`), le choix
au bon de commande de `/numero`, l'option dans le devis ET la commande Cloudprinter (une seule
construction, `optionsItem`), la matière annoncée à l'atelier avant le clic d'impression, et la
géométrie du dos enfin calculée (elle attendait ce grammage — voir T-077).

Ce qui reste ouvert et ne relève plus de ce ticket : le choix `mcs` → `mcg` pourrait faire
baisser le port français de 2,76 €. Il est documenté dans `SPECS-CLOUDPRINTER.md` et tient en un
mot dans `impression.ts` ; il n'est pas fait, parce que Mathias a tranché le toucher.
