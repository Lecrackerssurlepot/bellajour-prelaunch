# B. Logo et signatures

## Versions du logo

| Fichier | Usage |
|---|---|
| `public/images/v2/ui/logo-bellajour-240.webp` et `-640.webp` | **La source** sur le site (versionnée depuis le 16/11). Le banc l'emploie en masque CSS (`mask: url(…)`) : il prend alors la couleur `currentColor`, encre sur papier, papier sur un bloc nuit. C'est la règle. |
| `public/images/v2/ui/signature-bellajour-240.webp` | La signature, blanche, sur fond sombre (carte cadeau). |
| `public/images/ui/logo.webp`, `Bellajour_Blanc.png`, `signature-blanche.webp` | Anciennes versions, à ranger en phase 7. |
| `public/logo-mail-*.png` | Mails (six variantes de l'ancienne charte). Ils seront remplacés en phase 6 par une seule version encre et une version blanche. |

**Logo vectoriel : fait le 25/11.** Source : le PNG blanc de Procreate (`brand/assets/logo/source-procreate-blanc.png`, 3508 × 2480). Tracé par potrace en `brand/assets/logo/bellajour.svg` (27 Ko, couleur `currentColor`), copié en `public/images/v2/ui/logo-bellajour.svg`. Le pinceau gris de l'original devient de l'encre pleine : un vectoriel n'a pas de demi-teinte. Les `.webp` actuels restent jusqu'à la phase 4. La version bleue n'est pas reprise.

## Tailles et protection (proposées)

- **Taille d'en-tête** : 74 × 52 px (banc).
- **Taille minimale** : 48 px de large à l'écran, 15 mm en PDF.
- **Zone de protection** : un vide d'au moins un quart de la hauteur du logo, tout autour. Aucun texte ni bord dans cette zone.

## Usages interdits

- ❌ Déformer, étirer ou incliner le logo. La seule rotation admise est celle de la signature de pied (variation).
- ❌ Le colorer d'une autre couleur que l'encre ou le papier.
- ❌ Le poser sur une photo chargée sans voile (`couleur.voile.photo-*`).
- ❌ Ajouter une ombre ou un contour.

## Favicon et icônes d'application

- **Source** : le « b » découpé dans le tracé du logo, jamais redessiné (`brand/scripts/favicon.mjs`).
- **Onglet (défaut, tranché le 26/11)** : **le b seul, sans carré**, en encre ; le SVG passe en papier
  sur un onglet sombre. Fichiers : `public/icon.svg`, `public/favicon.ico`, `src/app/favicon.ico`,
  `public/icon-16.png`, `public/icon-32.png`.
- **Écran d'accueil** : carré papier, b encre (`public/apple-touch-icon.png`, `icon-192.png`,
  `icon-512.png`). iOS exige une icône opaque et remplit la transparence de noir : un b seul y
  disparaîtrait.
- Le carré noir reste une variante montrée sur /brand, plus servie.

## Signatures

| Signature | Où | Valeurs |
|---|---|---|
| **Phrase en Interlope** | Une phrase seule à l'écran : l'accueil (« Vivez. Nous composons. »), les mots de la frise, la légende du livre | Voir D. 40 px au moins, une fois par écran. |
| **Filigrane du pied** | Le grand mot « Bellajour » en bas de chaque page | Fraunces 400, opsz 144, taille `taille.exception.filigrane-pied`, couleur `couleur.papier.filigrane` |
| **Signature répétée en fond** | Variation facultative, **désactivée** par défaut et jamais dans les mails | `variation.signatures-fond` : **le logo vectoriel** répété serré en quinconce (logo de 96 px, tuile de 108 × 91 px), incliné de -12°, opacité 5,5 % sur une page et 10 % sur un objet. Motif généré : `public/images/v2/ui/motif-signatures.svg` |
| **Signature en bas de page** | Variation facultative, désactivée | `variation.signature-pied` : **le logo vectoriel**, 118 × 45 px, incliné de -5°, couleur d'accent |
