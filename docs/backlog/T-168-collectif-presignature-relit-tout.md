---
id: T-168
titre: Chaque envoi de photos relit toutes les photos de l'édition, la charge croît au carré du nombre de photos
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/app/api/collectif/depot/presign/route.ts:108` puis `:112` : `compterPourPlafond` puis
  `lireExistants`, l'un après l'autre alors qu'ils sont indépendants ; le premier relit TOUTES les
  lignes de l'édition (`collecte.ts:55-60`). Pour le responsable, `chargerAccesDepot`
  (`acces.ts:89-91`) tente d'abord une porte qui échoue toujours : une requête perdue par appel.
- Audit du 19/10, en rejouant le vrai moteur (`moteur.ts`, `pool.ts`) : 265 à 300 présignatures
  pour 500 photos (lots de 1,7 à 1,9 photo en moyenne). CALCULÉ : une édition de 2 000 photos
  ≈ 1 070 appels et ≈ 200 Mo lus de Supabase pour ce seul compte ; 5 000 photos ≈ 1,4 Go.

## Ce que je propose
Compter en base (`count`, ou une fonction SQL qui rend les trois compteurs) au lieu de ramener
les lignes ; lancer les deux lectures ensemble ; ouvrir la bonne porte d'abord. Mesurer avant et
après sur une édition d'essai (règle : mesurer avant de conclure).

## Ce qui a été fait
Rien encore.
