# Les cartes de lien, la liste des personnes, les albums en lignes (21/10/2026)

Ce que la page Photos du responsable montrait AVANT la mosaïque (planches 2D et 3 du 21/10, validées par Mathias) :

- `Liens.tsx` : l'onglet « Les liens » en cartes (`CarteLien` : un QR de 64 px, jusqu'à trois personnes avec leur barre
  de plafond, « Voir ses photos », le pied « Afficher en grand » · « Partager » · « … »), et le menu « … » d'origine
  (`MenuLien`, en feuille du bas sur téléphone, avec une note sous chaque geste). `MenuLien` a été DÉPLACÉ, pas
  retiré : il vit maintenant dans `src/app/edition/[token]/photos/MenuLien.tsx`.
- `Collecte.tsx` : la page telle qu'elle était juste avant, pour mémoire. Ce qui n'a plus d'usage : les « albums » de « Par lien »
  (une carte par lien avec une vignette de 52 px, puis « Dernières arrivées » et huit photos), la liste des personnes d'un
  lien ouvert (« Tout le monde » puis une ligne par personne), la liste sobre de « Personnes », la couverture de « Mes photos »
  lue à part (`couvVous`, une seconde lecture), la pilule « Les liens · N » de l'en-tête du téléphone, le « ‹ Par lien »
  souligné, et la seconde fenêtre de création d'un lien (`FenetreLien`, en deux temps).
- `espace-cartes-de-liens.css` : les règles de la carte de lien (`.ec-li-cartes` … `.ec-li-plus`) et du menu en feuille du bas.
- `photos-cartes-d-album.css` : les règles des cartes d'album (`.ec-ph-cartes`, `.ec-ph-carte`, `.ec-ph-mosa`…).

Remplacés par :

- `src/lib/collectif/mosaique.ts` (pur, au harnais) : la règle de taille (la plus grosse en grand, trois larges au plus, le reste
  par deux, jamais une tuile seule), les pastilles, le gel des poids à l'ouverture de la page ;
- `src/app/edition/[token]/photos/Mosaique.tsx` et `mosaique.css` : les tuiles, la tuile d'un lien ouvert, les pastilles de
  personnes ;
- `src/app/edition/[token]/photos/MenuLien.tsx` : le menu « … » (Partager, QR code, Modifier le nom et le nombre, Supprimer le lien).

Pas de route retirée : la route des photos garde ses couvertures de dossier et de lien, et gagne `couverturesDe`
(`liens` ou `personnes`) pour peindre une mosaïque sans lire de page.

Hors du périmètre du build (aucun import, `archive` est exclu de tsconfig et du lint).

## Ajout du 28/10/2026 : « Nouveau lien » n'est plus la dernière tuile

Avec 8 liens ou plus, il fallait défiler tout en bas de « Par lien » pour créer un lien. La tuile pointillée est remplacée par une pastille
« + Nouveau lien » EN TÊTE de la mosaïque (téléphone ; l'ordinateur garde le bouton de l'en-tête). Archivés ici :
- `Mosaique-tuile-nouveau-lien.tsx` : l'ancien composant `TuileNouvelle` ;
- `simple-tuile-nouveau-lien.css` : ses règles (`.ec-tu--nouveau`, `.ec-tu-nouveau`).
