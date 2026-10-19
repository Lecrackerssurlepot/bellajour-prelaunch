# Le mur des styles « avec sa colonne » (14/10/2026 → 19/10/2026)

`Mur.tsx`, `CartePiece.tsx` et `style.css` tels qu'ils étaient au commit 3e5406a (D24, maquettes
« Tout, en vrac » et « Modifier une partie » du 14/10) : le mur au centre et, à droite, une
COLONNE fixe de 340 px titrée « Votre composition », cinq lignes de texte (« Palette · Marine,
du style Riviera ») avec « Modifier » ou « Choisir », la validation en bas de la colonne. Une
pièce choisie n'avait qu'un liseré d'accent de 1 px ; une palette ou des typographies choisies
avaient un bouton désactivé ; prendre une autre palette remplaçait l'ancienne sans le dire.

Remplacé le 19/10/2026 (T-179) sur retour de Mathias : « entre la composition au milieu et le
récap à droite, ce n'est pas très clair ; quand on choisit, les modifications ne sont pas
claires ». Planches 1 et 2 de `docs/produit/collectif/maquettes/propositions-19-10/` validées
telles quelles : le mur prend toute la largeur, une barre « Ta composition » en bas montre les
choix en images, « Voir ma composition » ouvre une feuille par-dessus le mur, une pièce choisie
porte un cadre épais et un sceau, chaque geste se dit et s'annule. Les règles du brief
(`src/lib/collectif/brief.ts`) n'ont pas changé.

Hors du périmètre du build (`archive/` est exclu de `tsconfig.json` et d'ESLint, rien ne
l'importe). `style.css` est la feuille ENTIÈRE d'avant : seules les règles du mur et des pièces
ont changé dans la feuille vivante (`.ec-mur-brief`, `.ec-mur-lignes`, `.ec-mur-envoye`,
`.ec-mur-gestes`, `.ec-mur-intro` n'y sont plus).
