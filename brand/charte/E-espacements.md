# E. Espacements et grille

## Échelle (grille de 8 px)

| `espace.1` | `.2` | `.3` | `.4` | `.5` | `.6` | `.7` | `.8` | `.9` | `.10` |
|---|---|---|---|---|---|---|---|---|---|
| 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96 | 128 px |

4 et 12 servent aux détails (icône et texte, étiquette et titre). Tout le reste est un multiple
de 8.

## Page

| Jeton | Ordinateur | Téléphone ≤ 700 px |
|---|---|---|
| `espace.marge` (la seule marge latérale) | clamp(20px, 5vw, 64px) | (fluide) |
| `espace.section` (entre deux sections) | clamp(96px, 72px + 6vw, 160px) | 72px |
| `espace.tete-page` (haut d'une page intérieure, porté par la tête seule) | 120px | 96px |
| `largeur.cadre` (contenu maximal) | 1280px | 100 % moins les marges |
| `largeur.colonne` (une colonne de lecture) | 760px | 100 % |
| `largeur.boite` (feuille, fenêtre) | 440px | 100 % |
| `largeur.livre` (magazine ouvert de l'accueil) | min(92vw, 1100px, (100svh − 270px) × 1,414) | 92vw |

### La tête de page (règle du 26/11)

Retour de Mathias : « un espace énorme entre la barre du menu et le texte ».
L'espace était compté deux fois (`main` ET la tête de page). La règle :

1. **La tête de page porte seule `espace.tete-page`** (120 px, 96 px au téléphone), mesuré depuis
   y = 0 de la page, sous l'en-tête fixe. Le `main` n'a **jamais** de padding haut.
2. **Le bandeau** (Noël) ne s'ajoute pas à la main : il pousse le `body` de `bandeau.hauteur`
   (40 / 36 px, `--nl-bh` = `--m-bandeau-hauteur`). La tête de page ne le recompte pas.
3. **Entre deux sections : `espace.section`** (clamp(96px, 72px + 6vw, 160px), 72 px au
   téléphone), en padding haut et bas de chaque `.bloc`. Une section qui prolonge la précédente
   (même sujet, sans changement de fond) met son padding haut à 0, jamais une valeur inventée.
4. Aucune valeur en dur entre ces jetons : un écart qui ne tombe pas sur l'échelle est un défaut.

Mesuré sur le duplicata (26/11) : titre de /magazine à 160 px du haut au téléphone, 188 px à
l'ordinateur, bandeau compris.

## Grille

- **Ordinateur** : 12 colonnes dans `largeur.cadre`, gouttière `espace.5` (24 px). Un texte n'occupe jamais plus de `mesure.texte` (60 ch).
- **Téléphone** : une colonne, gouttière `espace.4` (16 px). Les grilles de cartes passent à 1 colonne (2 pour les vignettes).

## Points de rupture (tranché le 25/11 : deux seulement)

| Jeton | Requête | Ce qui change |
|---|---|---|
| `rupture.telephone` | `max-width: 700px` | Une colonne, tailles téléphone, bandeau de 36 px, défilement horizontal de la frise |
| `rupture.large` | `min-width: 901px` | Menu complet dans l'en-tête. En dessous : le menu burger |

- **Le JS lit la même valeur** : `requeteTelephone` dans `brand/build/tokens.ts`, avec `matchMedia`. Jamais `innerWidth < 700`.
- Les ruptures 420, 767 et 800 du banc disparaissent.
- Entre 701 et 900 px (tablette) : la mise en page ordinateur, avec le menu burger.

## Hauteur d'écran

- `dvh` reste **interdit** (`docs/marque/PIEGES-VISUELS.md`) : il suit la barre d'adresse et fait sauter la page.
- Le banc emploie `svh`, qui est stable. Dans le site, un plein écran s'écrit `var(--app-height)`, et `largeur.livre` le reprendra en phase 4.

## Exemples

- ✅ `padding: var(--m-espace-6) var(--m-espace-marge)`.
- ❌ `margin-top: 37px`, ou `@media (max-width: 768px)`.
