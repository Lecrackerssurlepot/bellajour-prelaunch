# Front — règles de style et pièges de mise en page

Chargé dès qu'on touche une page ou une feuille de style. Complète le socle, ne le remplace pas.

## Deux palettes, deux mondes. Ne jamais les mélanger.

**`src/app/tokens.css`** (~70 tokens `--bj-*`, importé par `globals.css`) — le monde CRÈME :
`/merci`, `/ambassadeurs`, les pages légales. ⚠️ **L'admin (atelier, éditions, prévente) est en
PORCELAINE depuis le 15/10** : `admin.css` REDÉFINIT les jetons crème sous `.adm-root` (blanc
froid, encres bleutées, verre blanc, deux taches floues). Changer la crème ici ne change donc
plus l'atelier, et la changer là-bas ne change pas les pages publiques.
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
**Playfair Display** n'est PLUS chargée nulle part depuis le 15/09/2026 : elle ne vivait que dans
`opengraph-image.tsx`, archivé avec la vignette de partage fabriquée (`archive/opengraph-genere/`).

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
   (`.pv-nav--flat` + `useAndroid()` dans `src/hooks/useClient.ts`). Posé le 08/09/2026 (T-019)
   sur `.at-nav` (barre de l'accueil et de `/magazine`, `nav.css`) avec le token SOMBRE
   `--c-nav-android-bg` (theme.css) — jamais `--bj-nav-android-bg`, qui est le token crème du
   même patron sur `.pv-nav` (navbar.css). `useAndroid()` rend `false` au premier rendu serveur :
   Desktop et Safari iOS restent inchangés.
4bis. **La navigation est CÔTÉ CLIENT depuis le 09/09/2026.** La barre (`Nav`, `NavCompte`),
   les deux pieds de page, `LienComposer` et le CTA final de l'accueil utilisent `<Link>` : un
   clic ne recharge plus le document. `<Link>` rend un VRAI `<a href>` — clic milieu, nouvel
   onglet et adresse au survol sont intacts — et `data-t` traverse jusqu'au `<a>`, le séquenceur
   le trouve toujours. `prefetch={false}` sur tout ce qui est dynamique (`/compte`, `/numero`,
   les pages légales) : précharger y ferait tourner une fonction serveur pour rien.
   ⚠️ **LE PIÈGE, ET IL COÛTERA CHER À QUI L'IGNORE : les `<script>` en ligne ne rejouent pas.**
   `layout.tsx` en pose deux (`--app-height`, le chien de garde `data-anim`) et `(atelier)/page.tsx`
   un troisième (le drapeau `data-ouverture-vue`). Ils ne tournent qu'au chargement d'un DOCUMENT.
   Tout ce qu'ils posent doit donc survivre à une navigation client, ou être relu autrement :
   `Ouverture.tsx` lit désormais `sessionStorage` en plus de l'attribut, sinon revenir de
   `/magazine` rejouait les trois secondes de couverture. Avant d'ajouter un `<Link>` vers une
   page dont le premier rendu dépend d'un script en ligne, vérifier ce point-là.

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
   l'autre fait mentir le bouton sur la marche. Depuis le 03/09, un brouillon vivant sur
   l'appareil (`draftEnCours`, composer/draft.ts) fait dire aux boutons vers `/composer`
   « Continuer la composition » (`CTA_REPRISE_LABEL`) — `Nav` et `LienComposer` le font par
   `useSyncExternalStore`, jamais par setState d'hydratation. Ne JAMAIS accrocher
   `?reprendre=<token>` à `CTA_HREF` : le paramètre n'est lu que par `/composer`, il serait
   ignoré EN SILENCE et la cliente repartirait sur un dépôt vide en croyant reprendre le sien.

7. **La barre a TROIS éléments depuis le 04/09** : la signature, puis `.at-nav-droite` qui porte
   le coin compte (`NavCompte`) ET le CTA. Trois règles de Mathias, toutes dans `nav.css` :
   ⚠️ **le CTA marketing ne disparaît jamais** — « Suivre mon numéro » s'AJOUTE ; **sur mobile
   (< 560 px) la barre ne porte QUE le compte**, le raccourci de suivi est masqué et vit dans
   la page compte ; **connectée, l'icône devient la photo Google ou l'initiale**. Le raccourci
   ne devine rien : UN seul numéro en cours → il y mène ; PLUSIEURS → il dit « Mes numéros »
   et ouvre `/compte` (`numerosEnCours`, lib/compte/rattachement).
   Les cookies de session sont `httpOnly` — la barre ne peut donc pas les lire : elle interroge
   `/api/compte/statut` après le montage, ce qui garde `/` et `/magazine` **statiques**.
   ⚠️ Ce fetch ne peut PARTIR qu'une fois React hydraté : mesuré sur `/magazine` en production
   le 09/09, HTML à 150 ms, hydratation à 880 ms, icône à **1023 ms**. Deux réponses posées ce
   jour-là, et la lenteur ne venait PAS de Supabase (`getUser()` ne touche pas le réseau sans
   session — 192 ms sans cookie contre 187 ms avec, mesuré) :
   1. **`compteOuvert()` est lu par la PAGE SERVEUR** (`(atelier)/page.tsx`, `magazine/page.tsx`)
      et passé à `Nav` → `NavCompte` en prop `ouvertAuBuild` : la silhouette neutre entre dans le
      HTML prérendu. Une fonction client ne peut pas lire `process.env`, d'où le passage par la
      page. La valeur est **optimiste, jamais autoritaire** — `false` au build ne ferme rien, le
      fetch ouvre quand même, et l'invariant « Mathias pose les variables, l'espace s'ouvre sans
      redéploiement » tient toujours.
   2. La barre **garde** la réponse dans `localStorage` (`bj-compte-statut`) et la peint dès
      l'hydratation : c'est ce qui rend l'avatar et « Suivre mon numéro » immédiats au retour.
      La lecture est **gelée au montage** (instantané stable exigé par `useSyncExternalStore`)
      et la réponse fraîche vit dans un `useState` : ne jamais remettre à jour la variable de
      module. La mémoire ne fait JAMAIS foi, et `oublierStatutCompte()` doit être appelé partout
      où l'on se déconnecte.
   ⚠️ Deux pièges payés le 04/09 à 375 px : `.bj-atelier .at-nav-suivi` pose son `display` en
   (0,2,0), donc **le masquer demande la même spécificité** (une media query n'en ajoute pas),
   et sans `flex: 0 0 auto` le jeton du compte se fait écraser à 2 px par ses voisins.

7bis. **Le site refuse d'être encadré, même par lui-même** (T-163, 20/10/2026) : `next.config.ts`
   pose `X-Frame-Options: DENY` et `frame-ancestors 'none'` partout. Une `<iframe>` vers une page
   ou une route du site reste BLANCHE sans exception déclarée là (la seule : l'aperçu du mail de
   `FinCreation.tsx`). Le harnais nomme toute nouvelle iframe vers le site. La CSP complète est en
   rapport seul : un nouveau tiers chargé par une page s'y ajoute, sinon la console le signale.

8. **L'espace avant un texte qui porte une entité : SWC l'avale** (16/10/2026).
   `Si <strong>{email}</strong> est l&apos;adresse…` suivi d'un retour à la ligne s'affichait
   « …@exemple.frest l'adresse ». La règle exacte, vérifiée contre le SWC de Next 16.2.3 sur les
   273 textes JSX de `src/` qui commencent par un blanc : **le blanc de tête de la PREMIÈRE ligne
   d'un texte JSX disparaît quand ce texte contient une entité (`&apos;`, `&nbsp;`, `&amp;`,
   `&rsquo;`…) ET un retour à la ligne.** Sur une seule ligne, ou avec une apostrophe `’` sans
   entité, l'espace survit. Le blanc de fin de dernière ligne n'est jamais touché. Après `</b>`,
   `</code>` ou `{expr}`, c'est pareil.
   Ce n'est ni le compilateur React, ni le rendu conditionnel, ni le composant client. Le
   compilateur ne fait que **masquer** le défaut dans le navigateur quand il réussit à compiler
   le composant (il réécrit le JSX, entités décodées, sur une ligne), et il ne tourne jamais côté
   serveur. D'où trois visages :
   - composant compilé : l'espace est là dans le navigateur mais absent du HTML serveur, et React
     lève l'erreur d'hydratation #418 (vu le 16/10 sur une page d'essai) ;
   - composant que le compilateur abandonne (`try … finally`, un `??` ou un ternaire dans un
     `try`, un `throw` dans un `try`) : espace perdu partout. C'était `FormulaireRetrouver` ;
   - composant serveur : espace perdu.
   Le remède : un `{" "}` explicite à la place de l'espace (`</strong>{" "}est l&apos;adresse`).
   **Le harnais surveille** (`verif-atelier.ts`, « l'espace avant un texte JSX qui porte une
   entité ») : il lit chaque `.tsx` de `src/` et nomme le fichier et la ligne fautifs.

9. **`not-found.tsx` ne reçoit que la CSS du LAYOUT, pas celle de la page** (20/10/2026). La page
   « Ce lien ne fonctionne plus » de `/depot` restait sombre sur un téléphone en clair : sa
   feuille n'était importée que par `page.tsx`. Tout style qui doit couvrir la 404 d'une section
   s'importe depuis son `layout.tsx` (Next déduplique l'import).

10. **L'espace client des éditions (`edition/[token]`) : une échelle de couches, et trois chevauchements
   qui ne se voyaient qu'à l'écran** (21/10/2026, relevé en Chrome sans tête à 375, 390 et 1280 px).
   - **Un `z-index` ne s'écrit jamais en nombre** : `--ec-z-collant` < `-entete` < `-barre` < `-voile` <
     `-tiroir` < `-fenetre` < `-feuille` < `-photo` < `-avis`, définis dans `espace.css` et commentés là.
     Une barre FIXE de page (« Déposer », les actions des photos cochées, les notes du BAT) lit
     `--ec-z-barre` et reste donc SOUS le voile du tiroir ; avant, leurs 35 et 40 valaient ceux du voile et
     du tiroir, et l'ordre du DOM tranchait. Le harnais refuse tout nombre de 10 ou plus.
   - **La coquille du téléphone est une colonne, pas une grille** : en grille à rangées implicites avec un
     `min-height`, l'espace libre se répartit ENTRE les rangées et l'en-tête de 62 px s'étirait à 366 px sur
     une page courte. Elle est aussi le bloc conteneur de l'en-tête collant.
   - **Dans un bloc `@media`, une règle placée AVANT la règle de base de même spécificité perd, sans
     avertissement** : les quatre boutons de « Partager » restaient en quatre colonnes (la surcharge
     « téléphone » était écrite 80 lignes avant la règle de base). Écrire la surcharge APRÈS, ou monter la
     spécificité, et la mesurer à l'écran.
   - Un menu qui s'ouvre depuis une carte de verre (`backdrop-filter`) s'ouvre par un portail dans
     `.ec-contenu`, jamais en `absolute` dedans (`MenuLien`, `Fenetre`).
   - **Au téléphone, la barre du haut fait 52 px EN JETON** (`--ec-barre-h`, son écart `--ec-barre-marge`, planche 1 du
     21/10) et tout ce qui compte sa hauteur lit le jeton : `top: 78px` en dur collait une barre d'outils sous une barre de
     62 px, et le bon à tirer comptait `65px`. Le harnais refuse `top: 78|62|65|70px`. La barre FLOTTANTE de Photos a les siens
     (`--ec-fl-h`, `--ec-fl-actions-h`, `--ec-fl-bas` avec la zone sûre, `--ec-fl-reserve`).
   - **UN seul grand titre de 34 px** (`.ec-ecran-titre`, `lining-nums`) sur tous les écrans, téléphone seulement. ⚠️ Une règle de
     titre propre à un écran, chargée APRÈS `espace.css`, le remplace en silence (le `.ec-tdb .ec-ecran-titre` de 40 px est
     enfermé dans `@media (min-width: 861px)`). En défilant, le titre passe dans la barre : `TitreEcran` (un
     `IntersectionObserver`, un portail dans `.ec-barre-titre`, `data-defile` sur la barre) ; aucun écouteur de défilement.
   - **Une feuille qui s'ouvre au-dessus d'une barre FIXE** (« Filtrer » au-dessus de la barre du bas) : la barre repasse à
     `--ec-z-feuille` + 1 tant qu'elle est ouverte (son bouton devient la croix), jamais un nombre ; le voile ne floute pas. (Le 22/10, « Filtrer » a disparu : la feuille « Personnes » est collée au bas de l'écran et RECOUVRE la barre, qui reste sous elle ; ce piège vaut pour toute future feuille posée au-dessus d'une barre.)
   - **Une feuille importée par un composant ENFANT est chargée AVANT celle de la page** (21/10, la mosaïque) : `mosaique.css` (importée par `Mosaique.tsx`) précède
     `photos.css` (importée à la fin de `Collecte.tsx`). À spécificité égale, `photos.css` gagne : l'en-tête d'un lien ouvert restait calé à gauche tant que sa règle
     (0,3,0) n'était pas montée à (0,4,0). Une règle de la mosaïque qui touche un élément de la page (`.ec-ecran-actions`) s'écrit donc avec la classe de la page en plus.
   - **Photos au téléphone, 22/10 (« comme une application »)** : `simple.css` (classes `ec-s-*`) est importée par `Collecte.tsx` APRÈS `photos.css` ; la barre du bas fait 64 px en JETON (`--ec-fl-h`, la
     barre des deux gestes aussi) ; une feuille du bas (`ec-s-feuille`) lit `--ec-z-feuille` et ne floute pas la grille (seul le menu de l'appui long, `ec-s-flou`, floute) ; l'intertitre collant d'un jour
     (`ec-s-jour`) se cale sous la barre du haut par ses jetons (`--ec-barre-h`, `--ec-barre-marge`, la zone sûre) : un nombre en dur le glisserait dessous. Une vignette ne porte QUE la photo : tout texte,
     badge ou bouton qu'on y remettrait contredit la planche 10 (le harnais rend la grille et compare).
   - **Un geste de texte n'est JAMAIS un texte souligné** (21/10, retour de Mathias) : `.ec-ph-lien` (Photos), `.ec-dp-lien` (page du participant) sont de petites pilules douces,
     la zone qui répond au toucher dépasse de 6 px en haut et en bas (`::after`). Le harnais refuse `underline` dans ces règles.

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
3. **L'écran 5 : le geste vit dans la barre FIXE** (`.at-q-barre--depot`, refonte du 03/09) —
   consentement + « Envoyer à l'atelier », toujours visibles, ce qui règle définitivement le
   bouton noyé du 25/08. La grille repliée (`VIGNETTES_VISIBLES`) reste, et une photo en erreur
   n'est JAMAIS repliée. Le rappel du consentement ne se dit qu'AU CLIC sans coche (décision
   Mathias) ; « Il reste un geste » est parti AVEC sa cause. Plus de jauge sur 100 : sous 40 une
   barre graduée sur 40, au-dessus le badge « De quoi composer ».
4. **L'écran 6 nomme ce qui est arrivé**, avec le compte CONFIRMÉ par le serveur (remonté par
   `onTermine(nb)`). À zéro il n'est pas affiché plutôt qu'inventé.
5. **Le téléphone est obligatoire, et l'écran dit pourquoi.** Cloudprinter l'exige dans l'adresse ;
   un champ obligatoire dont on tait la raison se lit comme un fichier qu'on constitue.
6. **La validation vient de `@/lib/atelier/questionnaire`**, jamais réécrite dans un écran : la
   route POST lit LA MÊME règle et renvoie `{ error: "champ_manquant", champ }`.
7. **La réserve sous l'écran suit la barre fixe, elle n'est pas un nombre.** `Composer.tsx` mesure
   `.at-q-barre` (ResizeObserver, rejoué à chaque écran et à chaque erreur) et pose `--at-barre-h`
   sur `.at-q` ; `composer.css` en fait le `padding-bottom` de `.at-q-screen`. La barre fait 83 px,
   mais 140 à 176 px sur mobile dès qu'un message d'erreur s'y affiche : avec 110 px fixes,
   « Aucune préférence » de l'écran 3 disparaissait sous le verre (retour client du 18/09/2026).
   Et le piège de spécificité de `.at-nav-suivi` vaut ici aussi : `.at-q-barre-retour` ne se
   masque sur mobile qu'en `.bj-atelier .at-q-barre-retour`, sinon `.bj-atelier .at-q-back` gagne.
8. **L'écran 5 NOMME le dossier qui reçoit** (T-156, 17/10/2026) : « Dépôt pour « Malaysia »,
   Justine » à la place du chapeau, lu au SERVEUR par la lecture GET que le moteur fait déjà
   (`vue.dossier`), jamais au brouillon. Le 06/10, 92 photos d'une cliente sont parties dans le
   dossier d'une autre, et l'écran ne disait pas lequel. L'atelier connecté (cookie `bj_admin`,
   que seul le serveur lit) voit en plus un bandeau franc, et la reprise par `?reprendre=` d'un
   autre token repart d'un brouillon propre (`brouillonDeReprise`) sans s'écrire chez lui.
   Le 17/10, le même dossier s'est rouvert par « Composer un nouveau numéro » de `/compte` :
   tout lien qui COMMENCE un numéro porte `?nouveau=1` (`PARAM_NOUVEAU`, `brouillonDuDepart`),
   et un dossier rouvert depuis le brouillon propose « Commencer un nouveau numéro ».
   ⚠️ Le volet Browser masqué gèle `requestAnimationFrame` : la vue du moteur n'y est jamais
   republiée et la ligne reste vide. Prouver en Chrome headless, pas dans le volet.

## Ce qui est mort — ne pas ressusciter

Classes `sjc`, `rs-backdrop`, `hero-count-dot`, la nav verticale « MAISON D'ÉDITION DU SOUVENIR »,
le système `data-theme="light|dark"` : zéro occurrence. Le thème réel se fait par scope de layout.
`S1Hero`, `S2Collection`, `S3Method`, `S4Final` : zéro import, leur contenu est passé dans
`/magazine` ; archivés dans `archive/accueil-v1/` le 31/08/2026 (T-016). ⚠️ Trois fichiers
différents portent le nom `S1Hero.tsx` (`archive/accueil-v1/`, `archive/preventes/`,
`archive/lancement/`) — vérifier le chemin avant d'ouvrir.
