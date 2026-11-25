# B. Logo et signatures

## Versions du logo

| Fichier | Usage |
|---|---|
| `public/images/v2/ui/logo-bellajour-240.webp` et `-640.webp` | **La source** sur le site (versionnée depuis le 16/11). Le banc l'emploie en masque CSS (`mask: url(…)`) : il prend alors la couleur `currentColor`, encre sur papier, papier sur un bloc nuit. C'est la règle. |
| `public/images/v2/ui/signature-bellajour-240.webp` | La signature, blanche, sur fond sombre (carte cadeau). |
| `public/images/ui/logo.webp`, `Bellajour_Blanc.png`, `signature-blanche.webp` | Anciennes versions, à ranger en phase 7. |
| `public/logo-mail-*.png` | Mails (six variantes de l'ancienne charte). Ils seront remplacés en phase 6 par une seule version encre et une version blanche. |

**Ouvert : il manque un logo vectoriel (SVG).** Sans lui, le favicon et les très petites tailles restent approximatifs. Mathias doit fournir le fichier source.

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

- **Existants** : `src/app/favicon.ico`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`.
- **Règle** : le logo en encre sur papier blanc, et rien d'autre. Ils seront refaits à partir du SVG dès qu'il existera.

## Signatures

| Signature | Où | Valeurs |
|---|---|---|
| **Phrase en Interlope** | Une phrase seule à l'écran : l'accueil (« Vivez. Nous composons. »), les mots de la frise, la légende du livre | Voir D. 40 px au moins, une fois par écran. |
| **Filigrane du pied** | Le grand mot « Bellajour » en bas de chaque page | Fraunces 400, opsz 144, taille `taille.exception.filigrane-pied`, couleur `couleur.papier.filigrane` |
| **Signature répétée en fond** | Variation facultative, **désactivée** par défaut et jamais dans les mails | `variation.signatures-fond` : logo en masque, tuile de 168 × 119 px décalée de 84 × 60 px, inclinée de -12°, opacité 5,5 % sur une page et 10 % sur un objet |
| **Signature en bas de page** | Variation facultative, désactivée | `variation.signature-pied` : 118 × 84 px, inclinée de -5°, couleur d'accent |
