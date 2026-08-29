---
id: T-027
titre: Les finitions d'impression sont posées par défaut, pas choisies
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
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
—
