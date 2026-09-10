# La grille par PALIERS (30 / 40 / 45 €)

Archivée le 10/09/2026, depuis `src/lib/atelier/grille.ts`.

## Ce que c'était

Trois tranches de pages, un prix par tranche, et les fourchettes de photos qui les
accompagnaient :

| clé | pages | prix TTC | photos annoncées |
|---|---|---|---|
| `p30` | 20 à 29 | 30 € | 40 à 59 |
| `p40` | 30 à 39 | 40 € | 60 à 79 |
| `p45` | 40 à 50 | 45 € | 80 à 100 |

C'était la source unique du barème : `prix.ts` (le prix ferme), `(atelier)/content.ts` (les trois
encarts de la page produit), `composer/depot/paliers.ts` (l'ordre de grandeur de l'écran 5) et le
JSON-LD `AggregateOffer` de `/magazine` en dérivaient tous.

## De quand à quand

En vigueur du 24/08/2026 (ouverture de l'Atelier) au 10/09/2026. Le fichier lui-même n'existe
que depuis le 07/09/2026 : avant, les mêmes trois montants vivaient en dur dans `prix.ts`, et
l'affichage les recopiait à la main — c'est cette duplication que la création de `grille.ts`
avait supprimée.

## Pourquoi c'est parti

Mathias a livré le 10/09/2026 la grille FINALE : **un prix par nombre de pages exact**, 20 pages
puis 24 à 60 par pas de 2 (22 exclu, impairs exclus), de 25 € à 59 €. Les trois paliers n'ont
plus rien à décrire — un palier était une approximation qui facturait 29 pages au prix de 20.

Le fichier a donc été réécrit, pas déplacé : `src/lib/atelier/grille.ts` porte aujourd'hui la
table par pages. Deux choses en sont volontairement héritées et vivent toujours dans le code
courant :

- **`PalierCle` (`'p30' | 'p40' | 'p45'`)** reste exporté : c'est l'enum `atelier_palier` de la
  base, écrit sur chaque dossier depuis août. On continue de l'écrire (`palierHerite` dans
  `prix.ts`, un simple bucket sur le nombre de pages) pour que les anciennes lignes et les
  métriques gardent un sens, mais **plus aucun prix n'en dépend**.
- **Les trois fourchettes de photos** (40-59, 60-79, 80-100) survivent dans `BANDES_PHOTOS`,
  rattachées à une fourchette de PAGES au lieu d'un palier : c'est l'ordre de grandeur affiché à
  l'écran 5 du dépôt, et il n'a jamais été un prix.

⚠️ Ce qui n'a PAS suivi le 10/09 : l'annexe « Grille tarifaire » des CGV
(`src/app/legal/content/cgv.ts`) cite toujours 30/40/45 €. Le texte légal appartient à Mathias
(interdit nº2) et ne se modifie pas sans son accord explicite.
