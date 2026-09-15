# Le titre vivant sur les couvertures du questionnaire — archivé le 15/09/2026

Ce dossier contient un mécanisme **qui marchait et qui a été débranché par décision produit**,
pas parce qu'il était cassé. Il est gardé entier pour pouvoir revenir en une demi-heure.

## Ce que c'était

À l'écran 3 de `/composer`, le titre tapé par le client s'écrivait **en direct** sur les quatre
modèles de couverture : on servait la plaque SANS lettrage (`BJ-Q0x-nu.png`) et le titre se
posait par-dessus, à l'emplacement, à la police et à la couleur relevés sur le visuel livré.

## Pourquoi c'est débranché

Mathias, le 15/09/2026, après l'avoir vu à l'écran : « **le titre ne change pas.** Tu mets juste
les visuels qu'on a avec les titres, et la personne peut sélectionner si elle aime bien. »

C'est un choix de produit, et il se défend : la question de l'écran est « **un style vous parle
déjà ?** ». Ce qu'on demande au client, c'est de reconnaître une ambiance, pas de se projeter
dans une maquette de son propre numéro — ça, c'est le travail de l'atelier, et c'est ce que la
vraie maquette lui montrera plus tard. Un titre qui s'écrit sur quatre couvertures promet un
aperçu du résultat que le questionnaire n'est pas en état de tenir.

## Ce qu'il y a dedans

| Fichier | Rôle |
|---|---|
| `decoupeTitre.ts` | **La règle de découpe, pure et testée.** On coupe entre les mots, on équilibre les deux lignes plutôt que de remplir la première, et aucun mot-outil (« de », « et », « la ») ne finit une ligne. |
| `TitreSurCouverture.tsx` | La mesure et le rendu. Conserve la MASSE plutôt que la taille : la boîte est celle du lettrage d'origine, le corps est ce qui la remplit, et le mot du graphiste sert de mètre pour le plancher et le plafond. Trois dispositions : `simple`, `haut-et-bas` (Sicile, le titre en haut ET en bas), `deux-tons` (This Night, accent puis blanc, chevauchés). |
| `polices/Interlope-Regular.woff2` + `Interlope-OFL.txt` | Le lettrage d'Aussie et de Mon année. **La licence OFL doit rester à côté du fichier** partout où il voyage. |

Bodoni Moda 700 (Sicile) et Archivo Black (This Night) venaient de `next/font/google` : rien à
garder ici, deux lignes dans `layout.tsx` suffisent à les rappeler.

## Ce qui reste dans le code vivant, et qui suffirait à le rallumer

`src/app/(atelier)/composer/coverModels.ts` **garde toutes les mesures** — elles sont chèrement
acquises et ne coûtent rien à conserver : `zone`, `zoneBis`, `ligneBasse`, `couleurTitre`,
`couleurAccent`, `disposition`, `repli`, et le nom de chaque police. Elles ont été obtenues en
superposant la version titrée et la plaque nue de chaque master, pixel à pixel.

Les plaques nues elles-mêmes vivent toujours dans les masters
(`design-explorations/visuels-v2/BJ-Q0x-nu.png`, hors git). Elles ne sont plus produites en WebP :
les quatre entrées `-nu` ont été retirées de `scripts/images-v2.mjs`.

## Pour le rallumer

1. Remettre les quatre entrées `-nu` dans `scripts/images-v2.mjs`, relancer le script.
2. Remonter ces deux fichiers dans `src/app/(atelier)/composer/`, et `polices/` avec eux.
3. Redéclarer les trois polices dans `composer/layout.tsx` (Interlope en `next/font/local`,
   Bodoni Moda et Archivo Black en `next/font/google`, `display: 'block'` pour les trois — le
   titre est mesuré au pixel, mesurer une police de repli le poserait à une taille fausse).
4. Dans `Screen3Titre.tsx`, servir `m.plaqueNue` au lieu de `m.image` et remonter le composant.
5. Remettre les tests de découpe dans `scripts/verif-atelier.ts` (ils sont dans l'historique du
   commit qui a créé ce dossier).

## Les deux pièges payés, à ne pas repayer

- **`measureText` ne résout pas `var(--x)`**, et `next/font` **hache** le nom de famille
  (`__interlope_a1b2c3`) : il n'existe qu'à travers la variable CSS. Le composant lit donc la
  valeur *calculée* de la variable avant de mesurer.
- **La hauteur d'un texte se mesure, elle ne se déduit pas du corps.** Le calcul supposait
  `lignes × interligne × corps` ; c'est faux pour un script, dont les hampes dépassent de la
  boîte de ligne. Sur une petite zone ça ne se voyait pas, sur une grande « Papa » sortait du
  cadre. La version archivée lit `fontBoundingBoxAscent/Descent`.
