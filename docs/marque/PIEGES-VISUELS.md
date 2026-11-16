# Pièges visuels

Les règles de `src/app/CLAUDE.md` et de `globals.css`, avec leur raison. Chacune a été payée une fois. Une maquette ou une page qui les ignore ressemble à du ménage et casse en silence.

## Deux palettes, deux mondes, jamais mélangés

- **Le style est scopé par un conteneur racine** (`.bj-atelier`, `.adm-root`, `.ec-espace`, `.at-accueil`, `.at-pdp`) et ce conteneur n'est pas décoratif : leurs classes sont courtes (`.mot`, `.pas`, `.c`, `.d`), **retirer le conteneur repeint les autres pages**. Une feuille chargée ne se décharge jamais en navigation client.
- **Changer la crème de `tokens.css` ne change plus l'admin** (qui redéfinit les `--bj-*` sous `.adm-root`), et changer l'admin ne change pas les pages publiques. Aucune couleur en dur hors des blocs de jetons : toute valeur hexadécimale ailleurs dans `/atelier` est un bug.
- **Un composant écrit un rôle, jamais une teinte** (`--ec-text`, `--ec-line`, `--ec-accent`), et pour une transparence `rgba(var(--ec-fg-rgb), x)`. Les pages de magazine (BAT, styles) gardent leurs vraies couleurs de jour comme de nuit.
- Le repli Android des barres prend le jeton **de son monde** : `--c-nav-android-bg` en sombre, `--bj-nav-android-bg` en crème, jamais l'un pour l'autre.

## Fossiles à ne pas ressusciter

- `--cream`, `--dark`, `--ink`, `--muted`, `--steel`, `--steel-glass`, `--border` : zéro définition, zéro usage. Si un document les cite, traduire vers la palette du monde concerné.
- **`--bj-nav-h` est un fantôme** : référencé, défini nulle part. Une variable inconnue rend la déclaration invalide en silence, donc `main { padding-top }` vaut 0 depuis toujours et **toutes les pages plein écran sont bâties sur ce 0**. Le définir ferait descendre chaque `<main>` d'un coup. Le jeton vivant est `--bj-topbar-h`.
- Les classes `sjc`, `rs-backdrop`, `hero-count-dot`, le système `data-theme="light|dark"`, `S1Hero`…`S4Final` : zéro occurrence, archivés. Trois fichiers différents s'appellent `S1Hero.tsx` dans `archive/`.
- Playfair Display : plus chargée depuis le 15/09/2026.

## Mise en page

- **`dvh` est INTERDIT dans tout le site** (retiré des 95 usages le 31/08/2026). Il suit la barre d'adresse : elle se rétracte dès qu'on descend, la page grandit de ~60 px et tout ce qui est sous le doigt saute. Un plein écran s'écrit `var(--app-height)` (gelé en px au chargement, remis à jour seulement si la LARGEUR change) ; une longueur verticale `calc(N * var(--uh))`. Jamais `100dvh` ni `100vh`.
- **La contrainte réelle est de tenir en HAUTEUR sur un téléphone**, pas en largeur : positions fluides en `--uh`, `vw`, `clamp()`.
- **`globals.css` pose `overflow-wrap: anywhere !important` sur `h1..h4, p` sous 767 px** : un mot trop grand n'est pas débordé, il est **coupé au milieu**. Toujours vérifier un titre géant sur 375 px de large.
- **Une barre fixe a sa hauteur en JETON** et tout ce qui compte sa hauteur lit le jeton (`--ec-barre-h` 52, `--ec-fl-h` 64, `--nav-h` de `/magazine` qui REDIT la barre de `nav.css`). `top: 78px` en dur a collé une barre d'outils sous une barre de 62 px ; le harnais refuse `top: 78|62|65|70px`.
- **La réserve sous un écran suit la barre fixe, elle n'est pas un nombre** : `/composer` mesure `.at-q-barre` (ResizeObserver) et pose `--at-barre-h`. 83 px sans message, 140 à 176 px au téléphone dès qu'une erreur s'affiche : avec 110 px fixes, un choix disparaissait sous le verre (retour client du 18/09/2026).
- **Un `z-index` ne s'écrit jamais en nombre** dans l'espace client : l'échelle `--ec-z-*` (20 → 75). Une barre fixe reste sous le voile du tiroir. Le harnais refuse tout nombre de 10 ou plus.
- **Dans un bloc `@media`, une règle placée AVANT la règle de base de même spécificité perd**, sans avertissement. Écrire la surcharge APRÈS, et mesurer à l'écran.
- **Une feuille importée par un composant ENFANT est chargée AVANT celle de la page** : à spécificité égale, la page gagne. Une règle de la mosaïque qui touche un élément de la page s'écrit avec la classe de la page en plus.
- **La spécificité de `.bj-atelier a`** (0,1,1) bat une classe simple : les composants qui portent une couleur propre s'écrivent `.bj-atelier .at-x` (0,2,0). Masquer `.at-nav-suivi` ou `.at-q-barre-retour` sur mobile demande la même spécificité : une media query n'en ajoute pas.
- **La coquille du téléphone est une colonne, pas une grille** : en grille à rangées implicites avec un `min-height`, l'espace libre se répartit entre les rangées et l'en-tête s'étirait à 366 px.
- **Un menu qui s'ouvre depuis une carte de verre** (`backdrop-filter`) s'ouvre par un portail dans `.ec-contenu`, jamais en `absolute` dedans.
- **`not-found.tsx` ne reçoit que la CSS du LAYOUT** : un style qui doit couvrir la 404 d'une section s'importe depuis son `layout.tsx`.
- **Le site refuse d'être encadré** (`X-Frame-Options: DENY`, `frame-ancestors 'none'`) : une `<iframe>` vers une page du site reste blanche.

## Verre et performance

- **`backdrop-filter: blur()` sur un `position: fixed` rame sur Chrome/Android** : re-rastérisé à chaque frame de défilement. Le repli `.pv-nav--flat` + `useAndroid()` enlève le flou et pose un fond quasi opaque ; `useAndroid()` rend `false` au premier rendu serveur, Desktop et Safari iOS restent inchangés.
- **Une feuille du bas ne floute pas la grille** ; seul le menu de l'appui long floute.
- **Zéro `next/image`**, `<img>` brut partout. Pas de CSS Modules, pas de Tailwind : un fichier `.css` par section, importé par son composant.
- Les textures (grain, fibre) sont des turbulences SVG en ligne : les images pesaient 283 et 454 Ko par chargement.
- `-webkit-user-drag`, `user-select`, `-webkit-tap-highlight-color` sont coupés sur les images de **mise en scène** seulement : une photo déposée par un client reste la sienne.

## Scripts et navigation

- **Les `<script>` en ligne ne rejouent pas** en navigation client : ce qu'ils posent (`--app-height`, `data-anim`, `data-ouverture-vue`) doit survivre à un `<Link>` ou être relu autrement (`sessionStorage`). Avant d'ajouter un `<Link>` vers une page dont le premier rendu dépend d'un script en ligne, vérifier ce point.
- **Le libellé suit la destination** : `CTA_HREF` porte `CTA_MAGAZINE_LABEL`, `COMPOSER_HREF` porte `CTA_LABEL` ; `Nav` prend `href` ET `label` ensemble. Ne jamais accrocher `?reprendre=<token>` à `CTA_HREF`.
- **Le CTA marketing ne disparaît jamais** de la barre ; sur mobile (< 560 px) la barre ne porte que le compte ; connecté, l'icône devient la photo ou l'initiale.
- **L'espace avant un texte JSX qui porte une entité disparaît** (SWC) quand le texte contient une entité ET un retour à la ligne : écrire `{" "}`. Le harnais surveille.

## Mesurer avant de conclure

- Un onglet caché ou le volet Browser masqué **gèle `requestAnimationFrame`, `IntersectionObserver` et les minuteurs** : toute mesure de position y est fausse, la fiche admin en flux n'hydrate jamais. Chrome headless ou onglet visible.
- Le cache de Vercel peut servir l'ancienne version plusieurs minutes après un push : vérifier sur l'URL de déploiement.
- Sonder une URL d'image en production avant la bascule la fige en 404 pour 24 h : interroger le HTML, jamais l'image.
- Avant de dire qu'un écran suit une maquette, poser la capture À CÔTÉ de la maquette et relever chaque élément.
