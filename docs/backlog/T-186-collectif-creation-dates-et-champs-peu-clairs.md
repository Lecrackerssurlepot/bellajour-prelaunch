---
id: T-186
titre: Le formulaire de création d'une édition cache ce que font ses dates et ses cases, et une de ses aides est fausse
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Euh, donc voilà, et je trouve que quand on crée une édition, les dates et les attributs, ça
pourrait être beaucoup plus clair. Je trouve que la liste, déjà, dans le lancement, c'est pas
très clair. Euh, des fois, euh, pour cocher, ça devrait être plus clair au niveau des dates. »
(19/10/2026)

## Ce que j'ai vérifié (19/10)
`src/app/admin/collectif/FormulaireEdition.tsx` (le même composant sert « Réglages » dans la
fiche), `src/lib/collectif/saisie.ts` :
- Une seule date qui agit : la clôture (`datetime-local`, sans `min`). Vide = la collecte ne se
  ferme jamais seule ; passée = `saisie.ts:140-148` l'accepte et l'édition passe aussitôt en
  composition (`etats.ts:96-100`). Aucune des deux choses n'est dite à l'écran.
- « Dates de l'événement » (texte libre) dit « tel que le client le lira » : il n'est lu que par
  l'en-tête de la fiche ATELIER (`[id]/page.tsx:337`), nulle part chez le client. Aide fausse.
- **Aide fausse** `FormulaireEdition.tsx:329` : « tout l'intérieur suit le style choisi ; seule
  la couverture peut venir d'un autre style », règle remplacée par D24 le 14/10.
- Ordre : les chiffres du devis (pagination, tirage, tours) passent avant le responsable et les
  magazines ; « Registre » (le ton de tout l'espace) est une liste sans aide.
- Jargon sans unité ni aide : « Présélection remise à l'atelier », « Tours de corrections
  inclus », « Couvertures aimées au plus, par magazine ». « E-mail du responsable du bon à
  tirer » désigne en fait le destinataire de tout l'espace.
- Les cinq cases « ce qu'on demande au client » ne disent pas leur effet (elles fabriquent les
  lignes à envoyer chez le client, `edition/[token]/page.tsx:88`, et la route refuse un contenu
  non demandé).
- Aucune case n'est liée à une date : « cocher au niveau des dates » reste à préciser.
- La date de livraison prévue se règle ailleurs (onglet Livraison, `PanneauLivraison.tsx:48`).

## Ce que je propose
Planche 5 du canevas du 19/10 : six étapes (le client, le calendrier, les magazines, les
photos, ce que le client doit envoyer, le devis) ; le calendrier en frise (aujourd'hui,
l'événement, la clôture, la livraison) avec la durée de collecte calculée ; la clôture en un
clic (« dans 2 semaines »…) ou au calendrier, 23 h 59 heure de Paris par défaut, date passée
refusée par `saisie.ts` (prouvé au harnais), vide signalé ; chaque case dit son effet chez le
client ; chaque chiffre son unité ; les deux aides fausses corrigées.

**À préciser par Mathias** : « la liste dans le lancement » (les magazines ? les cinq cases ?
la liste des éditions ?) et « cocher au niveau des dates ».

## Validé par Mathias le 19/10/2026
« Je valide les huit planches telles quelles. Pour les questions, prends tes recommandations, sauf le mail : n'ouvre rien sans moi. »
Planche 5 telle quelle. Lecture retenue : « la liste dans le lancement » = le formulaire de
création et ses cases ; « cocher au niveau des dates » = le choix de la clôture. Les deux sont
traités par la planche.

## Ce qui a été fait
Rien encore (maquette seulement).
