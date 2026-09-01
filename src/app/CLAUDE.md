# Front — règles de style et pièges de mise en page

Chargé dès qu'on touche une page ou une feuille de style. Complète le socle, ne le remplace pas.

## Deux palettes, deux mondes. Ne jamais les mélanger.

**`src/app/tokens.css`** (~70 tokens `--bj-*`, importé par `globals.css`) — le monde CRÈME :
l'admin, `/merci`, `/ambassadeurs`, les pages légales.
`--bj-cream #f7f1e9` · `--bj-charcoal #1c1c1c` · `--bj-terracotta #bc977d` ·
`--bj-action #4a90d9` (CTA, liens, focus) · échelles `--bj-sp-1..8`, `--bj-fs-*`, `--bj-r-*` ·
`--bj-topbar-h`, `--bj-bar-h` · les verres `--bj-glass-*` · les ombres `--bj-shadow-*`.

**`src/app/(atelier)/theme.css`** (~60 tokens, scopé `.bj-atelier`) — le monde SOMBRE :
`/`, `/magazine`, `/composer`, `/numero/[token]`.
`--c-void #020202` · `--c-surface-1..4` · `--c-text*` · `--c-accent*` ·
`--glass-bg-strong rgba(16,16,18,.72)` · les dégradés `--grad-*` · les durées `--t-*`.

⚠️ **Les tokens `--cream`, `--dark`, `--ink`, `--muted`, `--steel`, `--steel-glass`, `--border`
sont MORTS** — zéro définition, zéro usage. Ils venaient de la landing waitlist archivée.
Si une doc, un vieux commentaire ou un prototype les cite, c'est un fossile : traduire vers
la palette du monde concerné, ne jamais les redéfinir.

⚠️ **`--bj-nav-h` est un token fantôme** : référencé, défini nulle part. Le définir ferait
descendre les `<main>` du site d'un coup, en plus de la compensation que chaque page pose déjà.
Le token vivant est `--bj-topbar-h`. Ne pas « réparer » en le définissant.

## Polices — ce qui est réellement chargé

`next/font/google`, self-hosté, **pas de `<link>` dans le `<head>`**. Déclarées dans trois
layouts (`layout.tsx`, `(atelier)/layout.tsx`, `numero/layout.tsx`) ; next/font déduplique.
**Cormorant Garamond** (display) et **DM Sans** (UI) — c'est bien la Garamond, pas « Cormorant ».
**Playfair Display** n'existe QUE dans `opengraph-image.tsx`, côté serveur. Jamais sur une page.

## Règles CSS

- **Zéro `next/image`.** `<img>` brut uniquement, partout, sans exception.
- **Pas de CSS Modules**, pas de Tailwind (aucune directive n'est importée, il ne produit rien).
  Un fichier `.css` par section, importé par son composant.
- **Animations au défilement : `requestAnimationFrame` + JS.** Pas de librairie.
- **Le style est scopé par un conteneur racine**, et ce conteneur n'est pas décoratif :
  `.bj-atelier` (le thème sombre partagé), `.at-accueil` (toute `ouverture.css` + `univers.css`),
  `.at-pdp` (toute `pdp.css`). Leurs classes sont courtes (`.mot`, `.pas`, `.c`, `.d`, `.ligne`) :
  **retirer le conteneur repeint les autres pages.**
- Les ombres existent (`--bj-shadow-soft`, `--bj-shadow-pop`, les `--bj-glass-*-shadow`) : la
  vieille consigne « zéro ombre » ne vaut plus. Sur fond sombre, préférer un voile à une ombre.
- Positions fluides : `calc(N * var(--uh))`/`vw`/`clamp()` — la contrainte réelle est de tenir
  en HAUTEUR sur un téléphone, pas en largeur.
- **`dvh` est INTERDIT dans tout le site** (retiré des 95 usages le 31/08/2026). Il suit la barre
  d'adresse : elle se rétracte dès qu'on descend, la page grandit d'un coup de ~60 px, et tout
  ce qui est sous le doigt saute. `--uh` (globals.css) vaut un centième de `--app-height`, gelé
  en px au chargement par le script inline de `layout.tsx` et remis à jour seulement si la
  LARGEUR change. Un plein écran s'écrit `var(--app-height)`, jamais `100dvh` ni `100vh`.

## Les pièges qui cassent en silence

1. **`globals.css:183` pose `overflow-wrap: anywhere !important` sur `h1..h4, p`.** Trois feuilles
   doivent le contourner. Sous 767 px, un mot trop grand n'est pas débordé : il est **coupé au
   milieu**. Toujours vérifier un titre géant sur 375 px de large.
2. **`pdp.css` REDIT la hauteur de la barre dans `--nav-h`** (une formule fluide
   `calc(5.2 * var(--uh) + clamp(...))`), parce que la barre est `position: fixed` et que rien dans le flux ne la connaît.
   Si `nav.css` change de hauteur, cette ligne doit suivre — sinon le chapeau passe SOUS la barre
   et disparaît sans déborder. Exigence tenue : **le premier écran de `/magazine` va jusqu'au
   bouton**, ce qui impose aussi l'`order: 5` du parcours (jamais en dupliquant le balisage).
3. **`backdrop-filter: blur()` sur un `position: fixed` rame sur Chrome/Android.** Le repli existe
   (`.pv-nav--flat` + `--bj-nav-android-bg` + `useAndroid()` dans `src/hooks/useClient.ts`).
   Il n'est PAS posé sur la barre de l'accueil : risque accepté, voir D5. À poser au premier
   signalement de barre qui accroche.
4. **Un séquenceur pilote l'accueil** : l'attribut `data-t` d'un élément = son instant en ms dans
   la séquence de sa page. Pour régler un timing, on change cet attribut, rien d'autre. Le
   séquenceur pose `transition-delay` ET une propriété `--retard`, parce que le glitch de la
   page 02 est une ANIMATION (qui ignore `transition-delay`) vivant sur deux pseudo-éléments.
5. **Grain et fibre du papier sont des turbulences SVG en ligne**, pas des images : les textures
   pesaient 283 et 454 Ko par chargement.
6. **Le libellé suit la destination** (depuis le 01/09/2026, fin de l'ancien invariant « un seul
   libellé ») : `CTA_HREF = /magazine` porte `CTA_MAGAZINE_LABEL` (« Découvrir les magazines »),
   `COMPOSER_HREF = /composer` porte `CTA_LABEL` (« Composer avec l'atelier ») —
   les deux dans `(atelier)/content.ts`. `Nav` prend `href` ET `label` ENSEMBLE : régler l'un sans
   l'autre fait mentir le bouton sur la marche. Ne JAMAIS accrocher `?reprendre=<token>` à
   `CTA_HREF` : le paramètre n'est lu que par `/composer`, il serait ignoré EN SILENCE et la
   cliente repartirait sur un dépôt vide en croyant reprendre le sien.

## Le questionnaire — chaque phrase est un correctif, pas du style

`(atelier)/composer/` — six écrans. **Aucune de ces formulations n'est décorative** : chacune
répare une perte mesurée sur un vrai dossier (D14, D15). Les réécrire « pour faire plus court »
rouvre le trou.

1. **L'écran 4 annonce l'étape suivante.** « Vous la recevez sous 48 h » se refermait sur
   lui-même : on donne ses coordonnées, on reçoit sa couverture. Une cliente a rempli cet écran
   et n'a jamais déposé une photo. D'où « **Il reste une étape après celle-ci : vos photos** » et
   le bouton qui la NOMME (« Passer à mes photos », pas « Continuer »).
2. **L'écran 3 n'a plus de bouton pour sauter.** « Je ne sais pas encore, choisissez pour moi »
   posait un titre nul, et personne ne choisissait à sa place.
3. **L'écran 5 dit UNE idée.** Sa phrase disait « vos photos sont arrivées chez nous, mais
   l'atelier ne les a pas encore reçues » : exact, et illisible. ⚠️ `at-d-envoi--collee` NE COLLE
   RIEN malgré son nom ; ce qui garde le bouton en vue, c'est la grille repliée
   (`VIGNETTES_VISIBLES`), et une photo en erreur n'est JAMAIS repliée.
4. **L'écran 6 nomme ce qui est arrivé**, avec le compte CONFIRMÉ par le serveur (remonté par
   `onTermine(nb)`). À zéro il n'est pas affiché plutôt qu'inventé.
5. **Le téléphone est obligatoire, et l'écran dit pourquoi.** Cloudprinter l'exige dans l'adresse ;
   un champ obligatoire dont on tait la raison se lit comme un fichier qu'on constitue.
6. **La validation vient de `@/lib/atelier/questionnaire`**, jamais réécrite dans un écran : la
   route POST lit LA MÊME règle et renvoie `{ error: "champ_manquant", champ }`.

## Ce qui est mort — ne pas ressusciter

Classes `sjc`, `rs-backdrop`, `hero-count-dot`, la nav verticale « MAISON D'ÉDITION DU SOUVENIR »,
le système `data-theme="light|dark"` : zéro occurrence. Le thème réel se fait par scope de layout.
`S1Hero`, `S2Collection`, `S3Method`, `S4Final` : zéro import, leur contenu est passé dans
`/magazine` ; archivés dans `archive/accueil-v1/` le 31/08/2026 (T-016). ⚠️ Trois fichiers
différents portent le nom `S1Hero.tsx` (`archive/accueil-v1/`, `archive/preventes/`,
`archive/lancement/`) — vérifier le chemin avant d'ouvrir.
