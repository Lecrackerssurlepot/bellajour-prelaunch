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
