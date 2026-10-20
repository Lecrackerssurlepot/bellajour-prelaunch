---
id: T-196
titre: Régénérer le lien des participants coupe d'un coup tous les liens de contribution, sans prévenir
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

## Ce que j'ai vérifié
- Un lien de contribution est `/depot/<token_depot>?p=<clé>`
  (`src/app/api/collectif/provenances/route.ts:88`), et l'accès se cherche par `token_depot`
  (`src/lib/collectif/acces.ts:48`).
- « Régénérer » le lien des participants (atelier, `src/app/api/admin/collectif/editions/[id]/lien/route.ts`)
  change `token_depot` : les huit liens des bateaux meurent avec lui, et l'écran ne le dit pas.

## Ce que je propose
Avant le geste, dire combien de liens de contribution il coupera, et proposer à la place de
retirer seulement le lien général. Ou faire vivre les liens de contribution sur leur seule clé.

## Ce qui a été fait
Rien encore.
