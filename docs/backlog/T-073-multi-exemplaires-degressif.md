---
id: T-073
titre: Commander plusieurs exemplaires, avec des paliers dégressifs à fournir
domaine: paiement
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-30
---
## Ce que Mathias a dit
« Ajouter la possibilité d'en prendre plusieurs (prix dégressifs à mettre en place par rapport
au prix, donc juste prévoir la structure et voir). »
## Ce que j'ai vérifié
Aujourd'hui tout suppose UN exemplaire : `quantity: 1` en dur
(`src/app/api/atelier/checkout/route.ts:203`), pas d'`adjustable_quantity`, la commande
Cloudprinter (`impression.ts`), le CA de l'admin (`donnees.ts:894-897`, dérivé du palier seul)
et le mail M4 ignorent la quantité.
## Ce que je propose
La structure a été préparée le 30/08 (voir « fait ») : `prix.ts` sait calculer un total pour
une quantité, le checkout et l'aval savent la transporter, mais le tunnel reste verrouillé à
1 exemplaire tant que les paliers ne sont pas donnés. Activer = fournir la grille dégressive
et lever le verrou.
**Question pour Mathias** : les paliers (ex. 2ᵉ exemplaire à −X %, à partir de N exemplaires
−Y %) — aucune remise ne sera inventée. Et la quantité maximale raisonnable ?
## Ce qui a été fait
30/08 : structure préparée côté serveur (quantité transportée de bout en bout, verrouillée à 1).
