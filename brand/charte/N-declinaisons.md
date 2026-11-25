# N. Déclinaisons hors site

## Mails (Brevo)

- **Source des valeurs** : `brand/build/mail.json`, généré. Les styles sont écrits en ligne, à partir de ces valeurs.
- **Structure** : tableaux HTML, largeur `mail.largeur` (600 px), marges `mail.marge` (24 px), une seule colonne.
- **Polices** : `police.mail.titre` (Georgia) et `police.mail.texte` (Helvetica, Arial). Pas de webfont.
- **Couleurs** : papier `#ffffff` et encre `#111111`, un bouton principal en encre, rayon pilule.
- **Variations** (signatures, canson, points) : **jamais** dans les mails pour l'instant.
- **Mode sombre forcé** (Gmail, Outlook, Apple Mail) :
  - `<meta name="color-scheme" content="light only">` et `supported-color-schemes` ;
  - deux logos, encre et blanc, avec bascule `@media (prefers-color-scheme: dark)` là où c'est lu ;
  - aucun texte dans une image ;
  - un bouton en tableau, avec bordure d'encre, pour rester lisible même inversé.
- **Envoi** : aucun envoi réel. Les tests partent seulement vers l'adresse de Mathias, et sur son accord à chaque fois.

## Brochures (PDF numériques)

Tranché le 25/11 : des PDF numériques, **pas** d'impression.
- **Espace couleur** : RVB (sRGB). Pas de CMJN, pas de fond perdu, pas de traits de coupe.
- **Format** : à choisir en phase 2 entre deux propositions. A4 portrait (210 × 297 mm), qui se lit et s'imprime partout. Ou 16:9 paysage (1920 × 1080 px), qui se lit sur un écran et se projette.
- **Typo** : les quatre rôles de D, incorporés au PDF (licences OFL : c'est permis).
- **Marges** : 15 mm (A4) ou 96 px (16:9). Logo en haut à gauche, numéro de page en étiquette.
- **Poids** *(proposé)* : 10 Mo au plus. Images en 150 dpi.

## Réseaux sociaux

| Format | Taille (px) | Zone de sécurité *(proposée, à confirmer avec les gabarits Instagram du moment)* |
|---|---|---|
| Post carré | 1080 × 1080 | 60 px de chaque côté |
| Post portrait (par défaut) | 1080 × 1350 (4:5) | 60 px de chaque côté |
| Story, reel | 1080 × 1920 (9:16) | 250 px en haut, 340 px en bas (interface), 60 px sur les côtés |
| Couverture de reel | 1080 × 1920, lue en 1080 × 1440 au centre | Garder le texte dans le carré central |

**La règle** : une photo de numéro, un titre court en Fraunces (ou une phrase Interlope seule),
le logo petit. Fond papier ou photo pleine, jamais un aplat coloré.

## Mockups et couvertures

- **Les mockups** se font avec le magazine 3D de la phase 3 (`brand/assets/3d/magazine/`), sous les angles nommés.
- **La couverture** porte toujours une vraie photo.
- **Le titre imprimé** est en Instrument Serif (`police.magazine`). La couleur du titre passe au noir quand la photo est claire (luminance supérieure à 0,6).
