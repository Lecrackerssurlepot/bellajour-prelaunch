# Les images d'avant le chantier « visuels v2 »

Déplacées ici le 15/09/2026, à la fin de l'intégration des visuels livrés par
Mathias. **Elles ne sont supprimées nulle part** — règle de la maison : on
archive, on ne supprime pas.

## Pourquoi elles sont ici

Aucune n'est plus référencée, ni par une page (`src/`), ni par un script
(`scripts/`). C'est le seul critère retenu : la liste a été établie fichier par
fichier, pas au jugé.

| Dossier | Ce que c'était | Remplacé par |
|---|---|---|
| `lancement-galerie/` | Les six couvertures de démonstration (Marrakech, Japon, Patagonie, Lisbonne, Santorin, Tulum) et leurs variantes | Les six vraies couvertures de la bande (`public/images/v2/accueil/couverture-*`) et les trois images de `/magazine` |
| `brand/` | Les deux variantes réduites de l'ancienne couverture plein écran | Le header photographié (`v2/accueil/header-magazines*`) |
| `divers/` | Un décor de mail et une icône Instagram, tous deux morts avant ce chantier | — |

## Ce qui N'EST PAS ici, et pourquoi

- **`brand/brand-01.webp`**, **`univers/solution-upload-*.webp`**,
  **`ui/signature-blanche.webp`**, **`ui/logo.webp`** : ils ne sont plus servis
  au navigateur, mais ils restent les **sources** de `scripts/images-v2.mjs`.
  Les déplacer casserait la régénération des images.
- **`anxiete/`**, **`hero/hero-01`**, **`hero/hero-03`** : servent le dossier de
  démonstration du back-office (`admin/atelier/demo/fixtures.ts`).
- **`header-bellajour.webp`** : encore lu par `opengraph-image.tsx`. Il tombera
  avec la vignette de partage, quand BJ-P01 sera livrée.

## Pour en rappeler une

`git mv` en sens inverse, et remettre la référence. Rien d'autre à faire :
aucune de ces images n'a jamais été citée ailleurs que dans une balise `<img>`.
