---
id: T-189
titre: Les dates du formulaire d'une édition passent par le calendrier du navigateur, et les dates de l'événement ne sont qu'un texte
etat: nouveau
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Dernier point que je comprends pas dans la nouvelle édition, c'est pourquoi euh, date de
l'événement, euh, bah, y avait pas, en fait on n'a pas le calendrier avec les dates. Et c'est
possible visuellement de changer le, la gueule du calendrier qui s'affiche là, je vois bien un
truc avec, en transparence dans notre design à nous, plutôt qu'avoir ce vieux truc tout moche en
termes de calendrier. Voilà, c'est juste un détail euh, visuel, mais ça me fera vraiment du bien,
vu qu'on va utiliser tous les jours, d'avoir un truc qui, qui ressemble à quelque chose. »
(19/10/2026, soir)

## Ce que j'ai vérifié (19/10)
- `src/app/admin/collectif/FormulaireEdition.tsx` : « Dates de l'événement » est un champ TEXTE
  (`dates_texte`, `:498`) ; la clôture « Choisir au calendrier… » et la livraison souhaitée sont des
  `<input type="date">` (`:463`, `:507`) : le calendrier affiché est celui du navigateur (gris,
  hors de notre direction Porcelaine).
- `dates_texte` n'est lu que par l'en-tête de la fiche atelier : le remplir depuis un calendrier
  (« du 2 au 4 octobre 2026 ») ne demande aucune migration.

## Ce que je propose
Planche 9 du canevas du 19/10 au soir (https://claude.ai/artifact/DK9igxYPaw7C4cJmtwbe6K) : un calendrier Bellajour (panneau de verre posé sur le
champ, le mois en grille, la sélection en couleur d'accent, aujourd'hui cerclé), en PLAGE pour
les dates de l'événement (du… au…), en jour seul pour la clôture (23 h 59 heure de Paris, comme
aujourd'hui) et la livraison. Clavier : flèches, Entrée, Échap. Les raccourcis de clôture restent.

## Ce qui a été fait
Rien encore (maquette seulement).
