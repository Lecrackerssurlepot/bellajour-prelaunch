# /composer aligné sur le duplicata « Essai photos » (26/11/2026)

Textes et éléments retirés de l'écran parce que le duplicata 14BmVZ ne les a pas :

- Écran 1, chapo : « Sélectionnez les moments qui correspondent. Un seul, ou plusieurs. »
  → « Un seul, ou plusieurs. »
- Écran 2, chapo : « … et ce qu'on doit ressentir en tournant les pages. »
  → « … ce qu'on doit ressentir. »
- Écran 2, l'exemple en italique (`<p className="at-hint">`) :
  « Quatre jours de festival avec la bande. Des concerts jusqu'au bout de la nuit,
  des siestes au soleil, des fous rires. Je veux que ça respire l'été et l'insouciance. »
- Écran 3, chapo : « Il sera imprimé sur la couverture. Vous pourrez encore le changer plus tard. »
  → « Imprimé sur la couverture. Modifiable plus tard. »
- En-tête : le logo au centre (T-088, il menait à l'accueil avec confirmation) ; remplacé par
  le fil d'étapes. Le retour de l'écran 1 ouvre désormais la confirmation de sortie.
- Barre du bas : le second « ← Retour » (écrans 2 à 5).
- Fenêtre de sortie : « Quitter la composition ? » / « Vos réponses sont gardées. » /
  « Quitter et revenir à … » (motRetour) → « On garde vos réponses. » /
  « Vous reprendrez là où vous en étiez. » / « Quitter pour l'instant » (l'adresse suit
  toujours la provenance ; motRetour sert de libellé accessible).
- Fil d'étapes « 01 · Le moment » en capitales et segments au téléphone → barres + noms.


## `aCommence` (Composer.tsx, T-088)

Ne servait qu'au logo de la barre du haut (retiré) : vrai dès la première
réponse, il faisait passer le logo par la confirmation de sortie.

```tsx
const aCommence = Boolean(
  draft.token || draft.occasion || draft.histoire || draft.titre ||
  draft.prenom || draft.email || draft.telephone,
)
```

## Autres retouches du 26/11 (suite de la comparaison)

- Écran 4 : libellé « Email » devenu « E-mail » (duplicata) ; prénom et e-mail côte à côte.
- Écran 5 : la zone en pointillés revient (le duplicata contredit la décision du
  08/09 « plus de cadre en pointillés » ; le duplicata est la référence du 26/11).
  Bouton « Choisir des photos » devenu « Choisir les photos ». Le `<br />` du titre
  « Vos photos, maintenant. » est retiré. Le bouton désactivé n'est plus orange
  (ancienne charte) mais à l'encre.
- Écran 6 : la pastille ✓ est masquée en CSS (`.at-q-screen--fin .at-done`), le
  contenu est centré ; les cinq barres d'étapes restent affichées, faites.
- Sortie : le focus se pose sur « Continuer » et non plus sur le titre.
