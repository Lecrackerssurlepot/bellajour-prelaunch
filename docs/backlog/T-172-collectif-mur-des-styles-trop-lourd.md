---
id: T-172
titre: Le mur des styles affiche les images maîtresses (jusqu'à 2 400 px et 4 Mo) dans des cartes de 300 px
etat: en cours
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/app/admin/collectif/styles/reduireImage.ts:12-13` : une pièce de style garde jusqu'à
  2 400 px de côté et 4 Mo. Le mur et la fiche d'un style l'affichent telle quelle, sans vignette
  ni `srcset` (`src/app/edition/[token]/style/CartePiece.tsx:46`, `Mur.tsx:281`,
  `style/[slug]/FicheStyle.tsx:165,242,268`). « Tout, en vrac » rend toutes les pièces de tous
  les styles publiés (en `loading="lazy"`).
- **Non mesuré** : le poids réel des pièces dans le coffre. C'est le premier écran du client,
  souvent sur téléphone.

## Ce que je propose
Une vignette de 600 px (et 1 200 px pour la fiche) produite à l'enregistrement du style, servie
en `srcset` ; l'image maîtresse seulement en grand. Mesurer le poids du mur avant et après.

## Ce qui a été fait
20/10/2026 (lot a5, branche du worktree `agent-a95c80f53e6a8e1a8`, non commité, non déployé) :
- **Mesuré** (lecture seule, `scripts/collectif-styles-vignettes.ts --mesurer`) : 7 styles,
  62 images, toutes sans tailles. Les maîtresses font 11 à 126 Ko, pas 4 Mo (2,4 Mo en tout).
  Le mur des six styles publiés, une image par carte : **2,2 Mo aujourd'hui, 0,4 Mo en 600 px**.
  Les couvertures font moins de 1 200 px de large : seule la 600 est produite pour elles.
- **La règle, pure, dans `styles.ts`** : `LARGEURS_REDUITES` (600, 1 200 de LARGE),
  `cleTailleImage` (`…_w600.webp` à côté de la maîtresse ; `nomImageStyle` n'écrit jamais de
  tiret bas), `largeursAProduire` (on n'agrandit jamais), `tailleUtile` (une taille plus lourde
  que sa maîtresse n'est pas gardée), `listeDesTailles`, `lireTailles` (seules les tailles qui
  DÉRIVENT de la maîtresse restent : une image remplacée ne garde jamais les vignettes de
  l'ancienne), `srcSetDe`. La saisie de l'éditeur GARDE les tailles valides (sans quoi un
  enregistrement les effacerait), et sans tailles une image s'écrit exactement comme avant.
  Aucune colonne neuve : `tailles` vit dans les jsonb existants, aucune migration.
- **La fabrique, `src/lib/collectif/taillesStyle.ts`** (sharp, serveur) : la route
  `POST /api/admin/collectif/styles/[id]/image` écrit la maîtresse PUIS ses tailles (avec
  `CACHE_VIGNETTE`, T-176) et les rend ; une production ratée n'échoue pas l'envoi. L'éditeur
  les range avec la clé (couverture, double page, échantillon).
- **Le mur** : `chargerMur` signe les tailles à adresse stable (T-176) et fait un `srcset` ; la
  carte du mur, la fiche d'un style et la composition (barre et feuille) servent `srcSet` +
  `sizes` (`TAILLES_AFFICHAGE`, `pieces.ts`). Sans tailles, l'image maîtresse comme avant. La
  vitrine (styles fermés en production) ne change pas.
- **Preuve dans le navigateur** (Chrome headless, le vrai `CartePiece` rendu côté serveur, des
  images étiquetées) : la carte prend la 600 sur ordinateur (densité 1 et 2) et sur téléphone
  (390 px, densité 3) ; une image sans tailles garde sa maîtresse.
- **Le rattrapage des 62 images d'avant** : `scripts/collectif-styles-vignettes.ts`, lecture
  seule par défaut, ligne ajoutée dans `scripts/CLAUDE.md`. **Jamais lancé avec `--vraiment`** :
  d'après la mesure du 20/10, il écrirait 98 objets neufs dans R2 (8 pour l'essai technique, 15
  par style publié) et réécrirait les 7 lignes de `collectif_styles`. Attend Mathias.
