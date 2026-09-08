---
id: T-093
titre: Plusieurs couvertures proposées, la cliente choisit sa préférée
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-02
---
## Ce que Mathias a dit (02/09)
« Si on veut donner plusieurs couvertures parce qu'on veut faire plusieurs propositions, c'est bien
d'avoir l'option et que le client puisse sélectionner sa préférée. »
Et, sur la visionneuse : « rajouter un détail disant que ces pages seront toutes à fait modifiables
lors de la création de la maquette, donc pas d'inquiétude. » → **fait** dans le prototype (« Ces
pages restent entièrement modifiables à la création de votre maquette. Aucune inquiétude. »), à
reporter dans la vraie visionneuse (`Apercu.tsx`).

## Ce que je propose (plan)
Aujourd'hui l'aperçu porte UNE couverture (`plat`, ou `c1`/`c4`). Pour proposer PLUSIEURS
couvertures et laisser la cliente choisir :

1. **Données** — étendre l'aperçu à une **liste de couvertures** (comme `doubles` l'a été pour les
   pages, PR #28) : `couvertures: [plat_1, plat_2, …]` (2 à N propositions). Repli : une seule
   couverture = le format actuel, inchangé.
2. **Admin (T-090)** — uploader **plusieurs planches** de couverture (les propositions).
3. **Visionneuse (T-089)** — la cliente feuillette les propositions ; sur chacune, un bouton
   **« Choisir cette couverture »** ; la sélectionnée est marquée (« ✓ Votre choix ») et c'est elle
   qui part au paiement / à la composition.
4. **Enregistrement** — poser le choix sur `numeros` (colonne `couverture_choisie`, ou un événement
   `couverture_choisie` dans `evenements` — pas de migration si on journalise), pour que l'atelier
   sache laquelle composer. Geste léger côté cliente, comme la feuille d'ajustement (T-091).

⚠️ **À trancher** : la cliente DOIT-elle choisir avant de pouvoir payer (choix obligatoire), ou
un défaut s'applique-t-il ? Et le prix ne change pas selon la couverture (une seule est fabriquée).

Recoupe T-089 (visionneuse), T-090 (upload admin), T-091 (réagir/choisir). À bâtir après la
visionneuse (#29), en même temps que l'admin.

## Ce qui a été fait
- 02/09 : le **mot rassurant** est dans le prototype v4. Reste à le poser dans `Apercu.tsx` (petit).

## Vérifié le 08/09/2026 — c'est fait, la fiche avait du retard

Je reprenais ce ticket pour livrer « le geste de choix côté cliente ». En allant écrire, j'ai
trouvé le geste déjà en place : il est parti avec le chantier du 07/09 sans que la fiche soit
recalculée. Preuve, dans `src/app/numero/[token]/Apercu.tsx` :

- **le bouton de choix existe** (`nu-viz-choix`, `nu-viz-choix-btn`) et poste
  `{ token, couverture_choisie: rang }` ; la route l'accepte et le valide en entier borné
  (`src/app/api/atelier/numero/route.ts:418-420`) ;
- **la couverture retenue porte sa marque** — « · votre choix » sur son nom ;
- **rien n'est affiché tant qu'elle n'a rien dit** : pas de « votre choix » par défaut, parce
  que ce serait faux. Ne rien choisir reste un choix, celui de garder la proposition ;
- **l'échec est dit** (« Votre choix n'a pas pu être enregistré ») au lieu d'être avalé ;
- **le mot rassurant est là** : « Ces pages restent entièrement modifiables à la création de
  votre maquette. Aucune inquiétude. » C'était le dernier point ouvert du 02/09.

`/numero` passe bien `token` et `modifiable` (`page.tsx:388-389`).

### Corrigé aujourd'hui, en marge

`/compte/magazine/[token]` ne transmettait que quatre champs à `Apercu` : la **bibliothèque**
montrait donc une seule couverture et ignorait les cadrages. Corrigé le 08/09 (voir T-090).
Volontairement **sans `token`** : sur un magazine livré il n'y a plus de couverture à choisir,
seulement à revoir — donc pas de bouton, et pas de mot rassurant sur des pages déjà imprimées.

## État

`fermé` — socle, admin, geste de choix, marque du choix, message d'échec et mot rassurant :
tout est en place et vérifié dans le code.
