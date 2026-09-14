# Visuels du site : codes, emplacements, contraintes

Ouvert le 14/09/2026. Chantier « remplacer l'intégralité des visuels ». L'équipe renomme ses
fichiers avec le code de l'emplacement ; je les pose, décline, optimise.

Fiche partageable (même contenu, mise en page) : voir l'artefact « Bon de visuels Bellajour »
publié le 14/09.

## Nommage attendu

`BJ-<CODE>.<ext>` : `BJ-A01.jpg`. Le code seul suffit — **Mathias m'a confié le texte alternatif
le 14/09** : je lis chaque image (l'outil Read affiche les images) et j'écris l'alt moi-même.

Exception, le lieu : A06 à A10 (bande de couvertures de l'accueil) et M04 (double page magazine)
portent un alt qui nomme une destination, indevinable sur la photo. Pour celles-là,
`BJ-A06_marrakech.jpg`.

Dépôt : `design-explorations/visuels-v2/` (hors git, D4), créé le 14/09 avec son
`A-LIRE-noms-des-fichiers.txt`.

## Emplacements réels (état du code au 14/09/2026)

| Code | Fichier actuel | Où dans le code | Cadrage rendu | Minimum demandé |
|---|---|---|---|---|
| A01 | `brand/brand-01.webp` (+ -640/-960) | `(atelier)/components/Ouverture.tsx` `.h-plein>img`, préchargé dans `(atelier)/page.tsx` ; `object-fit:cover`, `object-position:50% 56%`, filtre saturate .56 | 3:4, LCP, plein écran | 2400×3200 JPG |
| A01L | — (nouveau, facultatif) | à poser en `<picture>` media (orientation: landscape) | 16:9 | 2560×1440 |
| A02 | `univers/solution-upload-02.webp` | `Univers.tsx` sl2 `.v1 .ph` aspect 3/4, 15vw (min 150) / 30vw mobile | 3:4 décoratif | 720×960 |
| A03 | `univers/grid-03.webp` | sl2 `.v2 .ph` aspect 16/9, 19vw / 36vw mobile | 16:9 décoratif | 1200×675 |
| A04 | `univers/solution-upload-05.webp` | sl2 `.v4 .ph` aspect 1/1, 12vw, `display:none` mobile | 1:1 décoratif | 600×600 |
| A05 | `univers/solution-upload-09.webp` | sl2 `.v5 .ph` aspect 9/16, 9vw / 20vw mobile | 9:16 décoratif | 450×800 |
| A06 | `lancement/galerie/marrakech.webp` (+ -240/-360) | sl4 rail « Un magazine », 15vw / 38vw, alt | 2:3 | 900×1350 |
| A07 | `galerie/japon.webp` | sl4 « Une BD » | 2:3 | 900×1350 |
| A08 | `galerie/patagonie.webp` | sl4 « Une affiche » | 2:3 | 900×1350 |
| A09 | `galerie/lisbonne.webp` | sl4 « Un album photos » | 2:3 | 900×1350 |
| A10 | `galerie/santorin.webp` | sl4 « Une série de pages » | 2:3 | 900×1350 |
| A11 | `galerie/marrakech.webp` | sl7 `.n-plat>img`, `.numero` aspect 1/1.414, masthead haut + titre bas | format A | 1000×1414 |
| M01 | `galerie/marrakech.webp` | `magazine/Kiosque.tsx` `.c1` (39,5 % × 72,8 % d'un 749/574) ; LCP, préchargé dans `magazine/page.tsx` | ≈ 1:1,41 | 1000×1410 |
| M02 | `galerie/santorin.webp` | `.c2` (44 % × 39,7 %), `object-position:50% 38%` | ≈ 3:2 paysage | 1200×800 |
| M03 | `galerie/japon.webp` | `.c3` (35 % × 61,3 %) | ≈ 3:4 | 900×1200 |
| M04 | remplace `patagonie` + `tulum` + `lisbonne` | `magazine/Corps.tsx` `.double` — **une seule image en travers du pli** (voir « Refonte de la double page » ci-dessous) | 8:5 (760/474 ≈ 1,60) | 2400×1500 |
| M04V | — (nouveau) | même scène en portrait, servie sous 560 px où `.droite` et `.pli` disparaissent | 3:4 | 1500×2000 |
| ~~M05~~ | — | retiré le 14/09 : les deux timbres tombent avec la refonte. Code non réutilisé. | — | — |
| ~~M06~~ | — | idem | — | — |
| M07 | `galerie/marrakech.webp` (450 px, trop petit : T-085) | `magazine/page.tsx` JSON-LD `Product.image` | 1:1, 4:3, 16:9 ≥ 1200 px | 1600×1600 |
| P01 | généré : `opengraph-image.tsx` (logo.webp + header-bellajour.webp) | remplacer par un fichier statique `opengraph-image.png` 1200×630 (T-069) | 1200×630 | exact |
| U01 | `ui/logo.webp` 1000×707 | `merci/Navbar.tsx` (204×144), `inviter/page.tsx`, `ambassadeurs/*`, OG | libre | SVG ou PNG ≥ 1200 |
| U02 | `ui/signature-blanche.webp` 320×122 | `Nav.tsx`, `composer/Composer.tsx`, `compte/*`, `numero/[token]/*` | ≈ 2,6:1 | SVG ou PNG 960×366 |
| U03 | `public/favicon.ico`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | `layout.tsx` `metadata.icons` | 1:1 | PNG 1024 |
| U04 | `public/logo-mail-cuivre.png` | `scripts/mails-atelier.mjs` → modèles Brevo. **Push Brevo = accord explicite (interdit 2).** | libre | PNG ≥ 600 |
| D01–D12 | `anxiete/grid-01..06`, `float-01..04`, `hero/hero-01`, `hero-03` | `admin/atelier/demo/fixtures.ts` (dossier de démo) | libre | facultatif |

## Ce qui n'est référencé nulle part (à archiver au moment de l'intégration, jamais supprimer)

Suivis par git : `brand-02..05.webp`, `hero-05.webp`, `hero-07.webp`, `Mockup-Album-transparent.webp`,
`decor-album.webp`, `decor-album-email.jpg`, `instagram.png` ; `header-bellajour.webp` ne sert plus
qu'à l'OG (tombe avec P01). Hors git et lourds (3 à 22 Mo pièce) : `Préventes-Section-2/`,
`prevente/`, `lancement/avis/` : ne jamais les `git add`.

## Refonte de la double page (décidée par Mathias le 14/09/2026)

La maquette de `/magazine` passe de **trois images à une seule** : un visuel plein qui traverse
les deux feuillets. Ce que ça implique dans `Corps.tsx` et `pdp.css` :

- `.double .gauche` et `.double .vignettes` disparaissent ; l'image devient un enfant direct de
  `.double`, en `position:absolute; inset:0; object-fit:cover`, sous `.droite` et `.pli`.
- `.double` garde `aspect-ratio: 760/474` et `overflow:hidden` : le pli (`.pli`) reste dessiné
  PAR-DESSUS l'image, c'est lui qui fait lire « double page ».
- `.droite` perd son fond papier (`background: linear-gradient(...)`) : le texte « Chapitre deux »
  et le folio se posent sur la photo. **Il faut donc un voile de lisibilité** (dégradé sombre ou
  clair selon le visuel livré) et vérifier le contraste AA sur le texte.
- Sous 560 px, `.droite` et `.pli` sont déjà masqués et `.double` passe en 3/4 : c'est là que
  **M04V** est servie, via `<picture>` + `media`. Sans elle, le 8:5 est amputé de moitié.
- **La largeur peinte, mesurée le 14/09** sur le serveur local : `.double` fait 657 px à 1280 px
  de fenêtre, et au plus ≈ 700 px (`.wrap` 1280 − padding, colonne `1fr` d'`.objet-grille`
  `1fr / 36%`, gap ≤ 72). D'où 2400 px de large demandés : marge pour le 3×.
- **Le bug des timbres tombe avec eux.** Mesuré le 14/09 : `.vignettes img` calcule
  `height: 675px` au lieu du 4/3 attendu — `pdp.css:620` pose `width` et `aspect-ratio` mais
  aucun `height`, donc l'attribut HTML `height="675"` de `Corps.tsx` s'applique comme indication
  de présentation et annule l'`aspect-ratio` (une image dont largeur ET hauteur sont définies
  ignore le ratio). Non constaté à l'œil : le panneau navigateur était masqué. Aucun autre `<img>`
  du dépôt n'est dans ce cas — partout ailleurs le CSS pose `height:100%`.

## Plan d'intégration (à faire à la livraison, sur une branche)

1. Script `scripts/images-v2.mjs` (sharp) : lit `design-explorations/visuels-v2/BJ-*`, produit
   WebP q80-85 (AVIF si gain > 20 %), largeurs par emplacement, dans des dossiers neufs
   `public/images/v2/<page>/` avec noms versionnés (cache 1 jour + SWR 30 j dans `next.config.ts`).
2. Mettre à jour chaque `<img>` : src/srcSet/sizes, width/height réels, alt d'après la description,
   preload + fetchPriority pour A01 et M01 (miroir exact link/img), lazy ailleurs.
3. JSON-LD `Product.image` en trois ratios (M07), `opengraph-image.png` statique (P01), icônes (U03).
4. Anciens fichiers → `archive/images-v1/` + README ; `optimize-images-night.mjs` mis à jour.
5. `npx tsc --noEmit && npm run lint && npm run build`, captures mobile/bureau, Lighthouse avant/après
   sur l'URL de déploiement (pas bellajour.fr : le cache ment).


## 14/09/2026 — première livraison intégrée (branche `feat/visuels-v2`)

Douze masters déposés dans `design-explorations/visuels-v2/`. `scripts/images-v2.mjs` en tire
36 fichiers WebP dans `public/images/v2/` (2,9 Mo servis contre 117 Mo de masters).

### Intégré

| Code | Où | Ce qui a changé sur le site |
|---|---|---|
| A02–A05 | accueil page 02 | rangés sous `v2/accueil/`, **pixels inchangés** (demande de Mathias) |
| A10 | accueil page 04, case « Une série de pages » | remplace `santorin` |
| A11 | accueil page 07, le numéro | remplace `marrakech` ; **`.n-tete` retiré** (le master porte déjà « RIO ») ; titre passé à « Rio, et la lumière du matin » |
| M01 | /magazine collage `.c1` | LCP ; preload de `page.tsx` mis en miroir |
| M02 | /magazine collage `.c2` | **`.c2` passe de 39,7 % à 40,4 % de hauteur** pour épouser le 1,4217 du master ; `object-position` retiré |
| M03 | /magazine collage `.c3` | **le cadre passe en paysage** (0,745 → 1,4145) ; c3 élargi de 35 % à 55 % et remonté à 38 % pour continuer de mordre c2 |
| M04 + M04V | /magazine, la double page | **une seule image** ; `.gauche`, `.droite`, `.vignettes`, `.folio`, `.pli` supprimés du balisage ET de `pdp.css` ; `.double` passe de 760/474 à 4000/2828, et à 2828/4000 sous 560 px via `<picture>` |
| M07 | JSON-LD `Product.image` | 450 px → 1600 px (T-085, point 1 levé) |

Page 04, deux demandes de Mathias tenues : **un seul rapport pour les cinq cases** (2:3, le
recadrage étant fait par le contenu dans le script, pas par `object-fit`), et **le soulèvement
au survol retiré** (`figure:hover .ph`), parce que ces couvertures ne sont pas cliquables.
Ancre `#objet` posée sur la section produit au passage.

### NON intégré, et pourquoi

- **A06, A07, A08, A09 — droits.** Les masters livrés sont une couverture de *Vogue*, un album
  de *Tintin* (Hergé / Casterman) et les affiches de *Dirty Dancing* et *Pretty Woman*. Œuvres
  protégées, marques déposées, et l'exception de courte citation ne couvre pas l'image sur un
  site marchand. Les quatre couvertures d'origine restent en place, **rangées sous les noms de
  code** `v2/accueil/a06..a09` : le jour où de vrais masters arrivent, seule la ligne `de:` du
  script change. ⚠️ Ne pas publier ces quatre fichiers.
- ~~M03~~ **intégré le 14/09 au second passage.** Mathias a tranché : le cadre passe en paysage,
  on ne tourne pas l'image. `.c3` vaut désormais 1,4145, exactement le rapport du master, et le
  collage tient un portrait plus **deux** paysages. Les hauteurs des trois cadres sont calculées,
  plus choisies : `(largeur% × 749 / rapport) / 574`. La bande étroite (≤ 900 px) est recalculée
  sur la même formule pour une boîte 11/5. `japon.webp` sort du collage.
- **M07 — le master est le doublon de M04** (md5 identique) : une double page titrée, pas la photo
  d'objet demandée. Intégré quand même (1600 px valent mieux que 450), mais **en un seul cadrage** :
  les trois que Google préfère tranchent le mot « AUSTRALIA ». À refaire.
- **P01, U01, U02, U03, U04** : non livrés.

### Tailles sous le minimum annoncé (jamais agrandies)

A07 433×600, A08 675×1000, A09 736×1136, A10 736×981, contre 900×1350 demandés. Seule A10 est
en ligne : 736 px suffisent pour une case peinte à 192 px CSS.

### À surveiller

`pdp.css` fait remplir au collage toute la hauteur restante au-delà de 768 px
(`.collage{flex:1;aspect-ratio:auto}`), et son commentaire dit encore que les trois cadres
« sont des portraits 450x675 ». **Deux des trois sont désormais des paysages** : sur une fenêtre
très haute, leur cadre s'étire et `object-fit` reprend du recadrage. Vérifié bon à 1440×900 et
1512×982 (les deux tailles courantes) ; à revoir si le défaut se voit sur un très grand écran.
Le remède, si besoin : rendre au collage son `aspect-ratio` et centrer le reste de la colonne —
mais c'est revenir sur une décision antérieure, donc pas sans Mathias.

Vérification du 14/09 par le protocole DevTools (`scratchpad/cdp.mjs`, Chrome piloté) :
les cinq cases de la page 04 mesurent **216 × 324 px, identiques**, `.numero` fait 374 × 529
(0,707), `.n-tete` est absent, et `/magazine` à 430 px de large a un `scrollWidth` de 430 —
**aucun débordement horizontal**.


## 14/09/2026 — troisième passage, retours de Mathias à l'écran

**1. Le collage ne respectait pas le format des masters.** Diagnostic : les trois cadres avaient
une hauteur en POURCENTAGE de la boîte, donc leur rapport valait
`(largeur% × largeur-boîte) / (hauteur% × hauteur-boîte)` et changeait à chaque point de rupture
— et surtout quand `.collage{flex:1;aspect-ratio:auto}` étirait la boîte pour remplir la colonne.
C'est le point que la note « à surveiller » du deuxième passage annonçait.

Corrigé à la racine : **chaque cadre porte son `aspect-ratio`, aucun ne porte de `height`**. Sa
forme ne dépend donc plus que de sa largeur, et elle est vraie quelle que soit la boîte. Les
valeurs sont les dimensions brutes des masters (`8770/12478`, `12468/8770`, `4000/2828`).
`aspect-ratio: auto` est retiré de `.collage` et la première colonne **centre** son contenu, pour
que le vide se partage au lieu de tomber en bas.
Mesuré au protocole DevTools à 1440×900, 1512×982, 1920×1200 et 820×1180 : **écart de 0,00 %**
entre le rapport voulu et le rapport obtenu, sur les trois cadres, aux quatre tailles.

**2. Plus aucune rotation.** Les `transform: rotate()` des trois cadres sont retirés. C'est le
chevauchement seul qui fait le collage.

**3. La couverture Rio est dépouillée.** Sont partis : `.n-tranche` (les traits de tranche à
droite), `.n-voile`, `.n-lum`, `.n-fibre`, `.n-dos` (voile sombre, reflet, grain, dos), le filtre
`saturate/contrast/brightness` de l'image, et l'inclinaison 3D sous la souris — avec son écoute
dans `Univers.tsx`. Restent une ombre portée et deux coins arrondis.
⚠️ Un seul dégradé subsiste, sous `.n-pied` : le titre est du texte clair sur un sable en plein
soleil. Ce n'est plus un effet, c'est le contraste.

**4. « Des visuels n'ont pas été changés sur la page admiration » — oui, c'est voulu.** Ce sont
A06 à A09, les quatre masters non publiables (Vogue, Tintin, deux affiches de films). Voir plus
haut. Seule A10 a été remplacée.


## 14/09/2026 — quatrième passage, finition

**Angles droits partout sur les images.** Les cadres du collage passent de 2 px d'arrondi à 0,
la double page de 3 px à 0, et la couverture Rio perd son `2px 9px 9px 2px` (une tranche arrondie
de magazine broché, reste du temps où l'objet portait aussi son dos et ses traits de tranche).
Ce que ces cadres montrent, ce sont des doubles pages : du papier coupé au massicot.

**L'ombre ne pouvait pas marcher, et c'est la leçon du passage suivant.** Ces trois objets sont
posés sur `--c-void` (#020202). `--shadow-float` (`0 24px 70px rgba(0,0,0,.7)`) comme les deux
ombres courtes qui l'avaient remplacé étaient **littéralement invisibles** : du noir sur du noir.
Mathias l'a vu en une capture : « il n'y a pas d'effet volume là ».

**Sur fond sombre, le volume vient de la LUMIÈRE SUR LA TRANCHE, pas d'une ombre.** Chaque objet
porte donc : un filet clair en `inset` sur l'arête haute (la source de lumière), trois ou quatre
bandes claires décalées vers le bas et de plus en plus éteintes (l'épaisseur du papier, feuille
après feuille), et un halo tiède très faible qui le décolle du vide.
⚠️ `box-shadow` n'est pas rogné par l'`overflow: hidden` de l'élément : c'est ce qui permet de
dessiner les tranches sans ajouter un seul nœud au document.
⚠️ Rien sur les côtés de Rio : Mathias a demandé le retrait des traits latéraux, et l'épaisseur
se lit très bien sur la seule arête basse.
⚠️ Ne jamais « simplifier » en revenant au token `--shadow-float`.
