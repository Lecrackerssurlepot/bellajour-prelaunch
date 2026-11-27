# Les visuels de Bellajour : les originaux

27/11/2026. Un seul endroit pour les visuels du site, dans la meilleure qualité utile.

- **Ici** : chaque visuel en JPEG, 2 400 px sur le grand côté. C'est la copie de travail, d'où
  l'on tire les versions web de `public/images/v2/`.
- **Les fichiers d'origine**, parfois de 10 000 px et plus, restent sur l'ordinateur de Mathias
  (`~/Desktop/Bellajour/`). Ils sont trop lourds pour git. Leur chemin est noté ci-dessous.
- Seuls les visuels marqués **utilisables** sont ici. Ceux dont les droits restent à confirmer
  (photos de groupe de la brochure, This Night, The Boys) n'y entrent qu'après l'accord de Mathias.
- Jamais de magazine tiers, d'affiche ni de BD (Vogue, ELLE, Tintin, films), même en décor.
- Jamais de photo de client sans son accord écrit.

| Fichier | D'où il vient | Taille d'origine | Où il sert |
|---|---|---|---|
| `couverture-rio.jpg` | `Magazine/Images SITE/BJ-A11.jpeg` | 10 524 × 14 973 | `magazine.eventail-2` |
| `couverture-sicile.jpg` | `Magazine/Images SITE/BJ-M01.jpeg` | 8 770 × 12 478 | `magazine.couverture` |
| `double-page-noosa.jpg` | `Magazine/Images SITE/BJ-M02.jpeg` | 12 468 × 8 770 | `accueil.ouverture-3`, `accueil.photo-exemple` |
| `double-page-lagon.jpg` | `Magazine/Images SITE/BJ-M03.png` | 4 000 × 2 828 | `accueil.ouverture-1` et `-4`, `accueil.double-page-1` |
| `double-page-australia.jpg` | `Magazine/Images SITE/BJ-M04.png` (BJ-M07 est le même) | 4 000 × 2 828 | `accueil.ouverture-2` et `-6`, `accueil.double-page-2` |
| `double-page-australia-portrait.jpg` | `Magazine/Images SITE/BJ-M04V.png` | 2 828 × 4 000 | en réserve |
| `objet-magazines-sur-la-table.jpg` | `Visuels/IMG_2909.jpeg` | 4 284 × 2 410 | `accueil.hero`, `accueil.porte-groupes` (déjà en ligne) |
| `objet-mise-en-page.jpg` | `Visuels sites/Section - L'objet/La mise en page.jpeg` | 4 284 × 5 712 | en réserve |
| `objet-mise-en-page-2.jpg` | `Visuels sites/Section - L'objet/La mise en page 2.jpeg` | 4 284 × 5 712 | `magazine.double-page` |
| `objet-reliure.jpg` | `Visuels sites/Section - L'objet/Reliure.jpeg` | 4 284 × 5 712 | en réserve |
| `objet-format.jpg` | `Visuels sites/Section - L'objet/Le format.jpeg` | 4 284 × 5 712 | en réserve |
| `objet-illustration.jpg` | `Visuels sites/Section - L'objet/L'illustration.jpeg` | 4 284 × 5 712 | en réserve (couverture peinte : montre l'objet, jamais un modèle) |
| `scene-drap.jpg` | `Mockup Visuel/Moodboard.jpg` (image générée) | 1 792 × 2 400 | `accueil.porte-offrir` |
| `scene-cafe.jpg` | `Mockup Visuel/Generated Image June 25, 2026 - 11_29AM.jpg` | 1 792 × 2 400 | en réserve |
| `scene-salon.jpg` | `Mockup Visuel/Generated Image June 25, 2026 - 11_38AM.jpg` | 1 792 × 2 400 | en réserve |
| `scene-table-fleurs.jpg` | `Mockup Visuel/Generated Image June 25, 2026 - 11_41AM.jpg` | 1 792 × 2 400 | en réserve |

## Encore ailleurs

- **Canva**, designs « MODÈLES COUVERTURES » et « visus bellajour » : les couvertures Aussie,
  2026, Lisbonne, Perth, Playa, Noosa, The Boys, This Night. Les copies du site font 640 px ; un
  export Canva en pleine résolution les remplacerait.
- **Brochure Écoles et Entreprise** (`Magazine/Brochures/Visuels - Ecoles` et `- Entreprise`) :
  couvertures et doubles pages de groupe en 2 000 × 1 414. Droits à confirmer.
- **La vidéo de Louis** (`accueil.matiere`) : pas encore reçue.

## Ajouter un visuel

1. Le copier ici en JPEG, 2 400 px sur le grand côté, avec un nom qui dit ce qu'on voit.
2. En tirer la version web dans `public/images/v2/` (WebP, à la largeur affichée × 2).
3. Changer le défaut dans `src/content/media.ts`, ou le déposer dans Site · Visuels.
4. Ajouter sa ligne au tableau ci-dessus.
