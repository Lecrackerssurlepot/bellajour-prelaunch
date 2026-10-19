---
id: T-179
titre: Sur le mur des styles, la composition en colonne à droite et les choix faits ne se lisent pas
etat: en cours
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
**19/10/2026, planches 1 et 2 codées** (sur une copie de travail, ni commit ni push à cette heure).
Aucune règle de `brief.ts` n'a changé, aucune migration, aucune route.

- **Le mur prend toute la largeur** (`Mur.tsx`, `style.css`) : plus de colonne, les magazines
  passent dans l'en-tête à droite du titre (un creux, le magazine ouvert en relief), les filtres
  deviennent une pilule segmentée, la mosaïque « Tout » monte à six colonnes (deux sur téléphone).
- **La barre « Votre composition · Magazine N »** (`Composition.tsx`, `BarreComposition`) : les
  couvertures en vignettes, les pastilles rondes de la palette, « Aa », les doubles pages, une
  case en pointillés pour la palette, les typographies ou la double page qui manquent ; la ligne
  d'état (`ligneDeLaBarre` : ce qui manque d'après `manquesBrief`, « N styles mêlés ») ; « Voir
  ma composition ». Sous le mur sur ordinateur, collée en bas pleine largeur sur téléphone.
  « Reprendre la composition du magazine N » y vit quand la composition est vide.
- **La feuille « Votre composition »** (`FeuilleComposition`, portail dans `.ec-contenu` comme
  `Fenetre`, plein écran sur téléphone) : les styles mêlés, puis les cases de la planche 2
  (couvertures en grand avec leurs places en pointillés jusqu'au plafond, nuancier et codes, image
  d'échantillon des typographies et les noms des polices, doubles pages et « + jusqu'à 5 »,
  curseur de la place du texte). « Modifier » (« Choisir » sur une case vide) ouvre le panneau
  de la partie ; « Terminé » ramène à la feuille. Pied : « ✓ Tout ce qu'il faut est choisi » ou
  « Il manque … », « Continuer à composer », « Valider le brief du magazine N » ; validé :
  « Brief validé », « Rouvrir le brief », « Passer au magazine N → ».
- **Une pièce choisie se voit de loin** (`CartePiece.tsx`) : cadre d'accent de 3 px, voile,
  sceau « ✓ Dans votre composition » / « ✓ Votre palette » / « ✓ Vos typographies », « Retirer »
  ou la pastille « Choisie » ; « Aimer », « Ajouter », « Prendre » ; au survol, « Remplacera
  votre palette Marine ».
- **Chaque geste se dit et s'annule** (`pieces.ts`, purs) : un geste est une valeur (`Geste`),
  vérifié avant l'envoi par les règles de `brief.ts` (`preparerGeste`), dit dans une annonce
  `role="status"` au-dessus de la barre qui part seule après 6 s (`annonceDuGeste`), et
  « Annuler » rejoue son inverse (`gesteInverse`) par le même `envoyer()`. Pas d'« Annuler »
  quand rien ne défait le geste (première palette : aucun geste du brief n'efface une palette).
- **Le bandeau** dit « Brief validé », « À composer » ou « N pièces sur M exigées »
  (`etatDuMagazine`, M lu dans `manquesBrief`).
- **Lecture seule et clôture** : aucun bouton de geste, la barre et la feuille se lisent.
- L'ancien mur est archivé (`archive/composition-colonne-2026-10/`). Le harnais
  `verif-collectif.ts` porte 28 épreuves de plus (bloc « T-179 »), dont l'aller-retour
  « geste puis Annuler » pour chaque genre de pièce.

**Vérifié** : `tsc`, lint (0 erreur), `next build`, `verif-atelier.ts` et `verif-collectif.ts`
verts ; à l'écran (Chrome sans tête, écritures interceptées, rien écrit en base), jour et nuit,
1440 et 375 px, lien d'équipe : parcours complet, aucun débord en largeur, aucune erreur
console, `?partie=` ouvre toujours le panneau.

**Reste** : la recette de Mathias sur un vrai téléphone ; les écarts à la maquette sont listés
dans le compte rendu de la séance (consigne gardée en petit à côté des filtres, « Voir tout le
style » gardé sur chaque pièce, typographies montrées par leur image d'échantillon).
