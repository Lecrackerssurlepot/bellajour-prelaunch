---
id: T-137
titre: La géométrie d'impression suivait la facture, pas le bloc composé
etat: en cours
domaine: atelier
gravite: bloquant
autonomie: libre
ouvert: 2026-09-25
---
## Ce que Mathias a dit
« Est-ce que la géométrie s'adapte par rapport au nombre de pages du PDF, c'est-à-dire à 50 et
pas 48 ? » puis, la règle : « on se permet, si une erreur se produit ou si on le décide, de faire
plus de pages, parce que de toute façon c'est à nos frais. Mais jamais dans l'autre sens, jamais
moins. » Et l'exigence qui compte : « que je puisse le faire sans avoir besoin de passer par toi
à chaque fois, ou que ça se fasse tout simplement automatiquement. »

## Ce que j'ai vérifié
Sur le dossier réel d'Eloïse (48 pages facturées, PDF du bloc à 50 pages, déposé le 25/09 à
08 h 33, les deux PDF au coffre avec un md5 single-part valide) :

- `payloadCommande` recevait `pages: numero.nb_pages` (route de transition) : `total_pages` et le
  compte du papier intérieur partaient donc à **48** pendant que le fichier en portait **50**.
  Le compte du PDF n'était lu QUE pour refuser, jamais pour composer la commande.
- `inspecterPdf` jugeait la couverture avec la même valeur : dos attendu 3,50 mm au lieu de
  3,60 mm.
- `preparerPdf.ts` (découpe au dépôt) découpait la feuille enveloppante sur `nbPagesDossier` :
  une couverture trop étroite dès le dépôt, sans que rien ne le dise.
- `refusDeCommande` refusait tout écart dans les deux sens (« 50 pages au lieu des 48 »), donc la
  commande ne partait pas, dry-run compris. Le garde-fou empêchait le mauvais montage, mais il
  bloquait aussi le cas légitime.
- Aucun chemin d'écran ne permet de corriger : `nb_pages` n'est écrit que par `publier_apercu` et
  `corriger_apercu`, inatteignables depuis `validee`. Et les emprunter **regèlerait le prix**
  (`prix_centimes` recalculé à 57 € sur un dossier encaissé à 25 €).

Racine : `numeros.nb_pages` faisait deux métiers, la facture et la géométrie.

## Ce que j'ai fait
Séparer les deux paginations, sans migration.

- `nb_pages` = la pagination **facturée**, gelée au prix, elle ne bouge plus jamais.
- La pagination **imprimée** se lit dans le PDF du bloc (`paginationImprimee`, pur) et pilote le
  dos, la largeur de couverture, le produit et `total_pages`.
- Règle **asymétrique** (`verdictPagesPdf`) : `surplus` passe et nous coûte, `manque` refuse
  toujours. Les genres `conforme` et `constat` ne changent pas.
- Un surplus ne peut pas sortir du produit : la route refuse si `produitPour(pagesImprimees)` est
  nul (`verdictMultiplePages` n'a pas de maximum, il ne l'aurait pas attrapé).
- La route de transition lit le **bloc en premier** (tri de `ordreLecture`), sinon la couverture
  serait jugée contre une cote que le bloc dément.
- Trace : `cloudprinter_commande` porte les deux paginations et le surplus ; un événement
  `pagination_surplus` est écrit en plus dès que l'écart existe.
- Écrans : le panneau de confirmation affiche « 50 imprimées pour 48 facturées, 2 pages à nos
  frais » AVANT le clic ; la carte de contrôle distingue surplus et manque.
- `preparerPdf.ts` découpe la couverture sur la pagination du bloc déjà déposé dans la session.

## Preuve
Harnais : 19 vérifications ajoutées (les deux genres, `paginationImprimee`, `surplusDePages`, la
tolérance de couverture entre 48 et 50, et son échec à 58). `TOUT PASSE`, 1330 vérifications.
`npx tsc --noEmit`, `npm run lint` (0 erreur), `npm run build` : verts.

Rejoué sur les fichiers réels d'Eloïse : bloc 50 pages → `surplus` (attendu 48), aucun refus ;
pagination imprimée 50, surplus 2 ; dos 3,60 mm, couverture attendue 429,60 mm ; couverture
déposée à 429,50 mm jugée **conforme** sur 50 pages (l'écart de 0,10 mm tient dans la tolérance
de 0,50 mm, donc aucun redépôt de couverture) ; `total_pages` envoyé : **50**.

## Ce qu'il reste
- Le dossier d'Eloïse porte encore quatre défauts visuels indépendants de ce ticket : page 47
  pivotée de 90°, fond perdu court pages 6, 7 et 27. À reprendre dans Canva avant de commander.
- `finition` est `null` sur tous les dossiers réels sauf Marjorie : le repli envoie du brillant.
  Ce n'est pas un défaut, mais personne n'a jamais choisi. À regarder à part.
- Le cockpit pourra agréger `pagination_surplus` pour chiffrer ce que les pages offertes coûtent.
