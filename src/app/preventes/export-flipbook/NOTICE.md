# Flipbook — export autonome

Coque visuelle « livre double-page » + barre de miniatures, extraite du prototype
Bellajour (`src/screens/montage/`) et **adaptée** pour afficher des **images de pages
déjà composées** (1 fichier = 1 page complète), sans aucune machinerie de composition.

À recopier tel quel dans `bellajour-prelaunch`, puis brancher tes `.webp`.

---

## Librairie de feuilletage

**Aucune.** Pas de `react-pageflip`, pas de `StPageFlip`. Le changement de double-page
est un **crossfade `framer-motion`** (`AnimatePresence mode="wait"` + léger
translate/scale), repris **tel quel** du proto. Si tu veux un vrai « tournage de
page » plus tard, il faudra l'ajouter — il n'a jamais existé dans le proto.

### Dépendances runtime
- `react` (19) — hooks de base.
- `framer-motion` (testé en 12) — transition de double-page + micro-anim des flèches.
- `lucide-react` — uniquement les 2 chevrons des flèches (remplaçables par n'importe
  quel SVG si tu veux supprimer la dépendance).

---

## Forme d'entrée (props)

```jsx
import Flipbook from './export-flipbook/Flipbook.js'

<Flipbook
  pages={[
    '/album/cover.webp',   // page 0 = COUVERTURE (affichée seule, à droite)
    '/album/p02.webp',     // ┐ 1re double-page : gauche
    '/album/p03.webp',     // ┘                    droite
    '/album/p04.webp',     // ┐ 2e double-page
    '/album/p05.webp',     // ┘
    // …dans l'ordre du livre
  ]}
  // Optionnel — puces de chapitre DÉCORATIVES dans le filmstrip.
  // La somme des `count` doit couvrir le nombre de DOUBLES-PAGES (cover incluse).
  chapters={[
    { num: 1, title: 'Arrivée', color: '#c4956a', count: 4 },
    { num: 2, title: 'La ville', color: '#5e8fa0', count: 6 },
  ]}
  initialIndex={0}                 // optionnel
  onSpreadChange={(i) => {}}       // optionnel
/>
```

### Logique cover seule → puis doubles (`spreads.js`)
- `pages[0]` → **couverture** : page de droite uniquement, gauche vide.
- ensuite par paires : `(1,2) (3,4) (5,6) …`
- nombre de pages pair ⇒ la dernière double a sa **page de droite vide**
  (ajuste `buildSpreads` si tu veux une 4e de couverture seule).
- le **filmstrip** affiche **une miniature par double-page** (2 cellules : gauche |
  droite ; la couverture n'a que la cellule de droite).

### Hauteur
`.fb` est en `flex: 1` : son **parent doit lui donner une hauteur** (ex.
`height: 100dvh`, ou un parent flex avec hauteur définie). Sinon le livre n'a pas
de place à remplir. Desktop only (comme le proto).

### Cadrage des images
`.fb-spread__img` est en `object-fit: cover`. Si tes pages sont au ratio exact d'une
demi-page A4 (≈ 0.707:1), passe à `contain` pour ne rien rogner. Une double-page
entière vise le ratio **1.414:1** (deux A4 portrait côte à côte).

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `Flipbook.js` | Composant principal : coque livre + flèches + clavier + transition + filmstrip. Contient `NavArrow`, `Book`, `Page` (ex-`SpreadCanvas`/`NavArrow`). |
| `Filmstrip.js` | Ruban de miniatures (1 par double-page) + auto-scroll + puces chapitre décoratives. |
| `spreads.js` | `buildSpreads(pages)` : liste d'images → doubles-pages (cover seule puis paires). |
| `useBookFit.js` | Dimensionne le livre pour qu'il tienne en entier (ResizeObserver). Copié tel quel. |
| `Img.js` | `<img>` avec repli déterministe si une URL casse. Copié tel quel. |
| `flipbook.css` | Tout le CSS des composants ci-dessus (préfixe `fb-`). |
| `tokens.css` | Sous-ensemble des variables design utilisées. |

> Extensions en `.js` pour éviter tout build dans le repo proto (consigne).
> Renomme en `.jsx` dans `prelaunch` si ton bundler l'exige.

---

## Ce qui a été RETIRÉ par rapport au proto

**Toute la composition à la volée** (tu fournis des pages déjà composées) :
- `PhotoSlot.jsx`, `SpreadLayout.jsx`, `templates.js`, `TextPanel.jsx` — supprimés.
- Variantes éditoriales / standard / texte, `byId`, structure de `slots`,
  `montageState`/`montageReducer`, `montageSelectors` — supprimés.

**Toute l'édition** :
- drag & drop, swap/permuter, mode « Remplacer », sélection de slot, halos/anneaux
  d'états, légendes au survol, undo, autosave.

**Toutes les autres vues / surfaces** :
- mode `'page'` (page seule) de `SpreadCanvas`, `GridView`, `FullscreenReader`,
  `CoverCanvas`, `DotPager`, `ViewSwitcher`, `SpreadContextBar`, les modales.
- **toute la sidebar** (`sidebar/`), et donc dans le filmstrip : `onChapterClick`
  (filtrage) et `sidebarOpen` (décalage de la barre).

**Conservé** : la coque livre (ombre + reliure/pli 3 couches + surface des pages),
la gouttière centrale stricte, le clip, la transition framer-motion, les flèches +
clavier, `useBookFit`, `Img`, le filmstrip (navigation + auto-scroll + puces
chapitre devenues décoratives).
