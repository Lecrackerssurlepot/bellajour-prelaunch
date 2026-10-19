---
id: T-179
titre: Sur le mur des styles, la composition en colonne à droite et les choix faits ne se lisent pas
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Au niveau de la partie style, il faudrait que tu me réfléchisses au niveau de l'artefact, mais
je trouve que, entre la composition au milieu et le fait d'avoir à droite le récap, je trouve pas
ça très clair, peut-être que ça pourrait être un récap qui est caché et qui quand on l'ouvre il
est vraiment visuellement beau et on comprend ce qu'on avait choisi, là c'est pas le cas, et ça
permettrait aussi d'avoir une sélection plus claire quand on n'est pas sur le récap mais quand
on est en train de choisir, là je trouve que les modifications sont pas claires. » (19/10/2026)

## Ce que j'ai vérifié (19/10)
- `src/app/edition/[token]/style/Mur.tsx` : le mur au centre (`.ec-mur-mur`) et, à droite, une
  colonne fixe de 340 px (`.ec-mur-corps`, `grid-template-columns: minmax(0, 1fr) 340px`,
  `style.css:200`) titrée « Votre composition » : cinq lignes de TEXTE (titre + valeur, par
  exemple « Palette · Marine, du style Riviera ») et un lien « Modifier » ou « Choisir ». Aucune
  image de ce qui est choisi.
- `CartePiece.tsx` : une pièce choisie n'a qu'un liseré d'accent de 1 px
  (`.ec-piece--choisie`, `style.css:653`) et son bouton passe de « Ajouter » à « Aimée »,
  « Choisie » ou « Ajoutée ». Une palette ou des typographies choisies ont un bouton DÉSACTIVÉ.
- Prendre une autre palette remplace l'ancienne sans le dire : `envoyer()` met à jour la copie
  locale et rafraîchit, aucun message ne nomme ce qui a été remplacé, rien ne permet d'annuler.

## Ce que je propose
Maquettes, planches 1 et 2 du canevas du 19/10
(`docs/produit/collectif/maquettes/propositions-19-10/retours-19-10.html`) :
1. La colonne de droite disparaît, le mur prend toute la largeur.
2. Une barre « Ta composition » en bas montre les choix EN IMAGES (couvertures, pastilles de la
   palette, « Aa », doubles pages) et ce qui manque ; elle ouvre la composition en grand.
3. La composition ouverte : une feuille par-dessus le mur, en planche visuelle (couvertures en
   grand, nuancier, spécimen des typographies, doubles pages, curseur de la place du texte),
   « Modifier » par case (le panneau d'une partie existe déjà), « Valider le brief » en bas.
4. Une pièce choisie se voit de loin (cadre épais, sceau « ✓ Dans ta composition », « Retirer »).
5. Chaque geste se dit et s'annule : « Palette Marine ajoutée. Elle remplace Sable. Annuler ».
Aucune migration, aucune règle de `brief.ts` ne change : seulement l'écran.

**Attend** la validation des planches 1 et 2 par Mathias (règle : maquette d'abord).

## Validé par Mathias le 19/10/2026
« Je valide les huit planches telles quelles. Pour les questions, prends tes recommandations, sauf le mail : n'ouvre rien sans moi. »
Planches 1 et 2 telles quelles ; la barre de la composition est EN BAS (ma recommandation).

## Ce qui a été fait
Rien encore (maquettes seulement).
