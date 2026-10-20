---
id: T-168
titre: Chaque envoi de photos relit toutes les photos de l'édition, la charge croît au carré du nombre de photos
etat: en cours
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
- PR #271 (19/10, en production) : l'envoi compte en base au lieu de relire les lignes
  (`src/lib/collectif/collecte.ts:65-94`) ; banc : 500 photos au-delà du plafond, 480 déclarations
  → 53.
- Reste (relu le 20/10) : la grille relit TOUTES les photos à chaque page
  (`src/app/api/collectif/photos/route.ts:81`), le tableau de bord aussi
  (`src/app/edition/[token]/donnees.ts:208`), la fiche atelier aussi
  (`src/app/admin/collectif/donnees.ts:358`). À mesurer sur 5 000 photos avant une grosse édition.
