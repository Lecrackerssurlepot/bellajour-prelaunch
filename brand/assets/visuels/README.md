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
- Jamais de visuel de l'ancien album photo (couverture rigide, section « L'objet », Mockup Visuel,
  Moodboard) : ce n'est plus le produit et on n'a pas le droit de s'en servir (Mathias, 27/11).

| Fichier | D'où il vient | Taille d'origine | Où il sert |
|---|---|---|---|
| `couverture-rio.jpg` | `Magazine/Images SITE/BJ-A11.jpeg` | 10 524 × 14 973 | `magazine.eventail-2` |
| `couverture-sicile.jpg` | `Magazine/Images SITE/BJ-M01.jpeg` | 8 770 × 12 478 | `magazine.couverture` |
| `double-page-noosa.jpg` | `Magazine/Images SITE/BJ-M02.jpeg` | 12 468 × 8 770 | `accueil.ouverture-3`, `accueil.photo-exemple` |
| `double-page-lagon.jpg` | `Magazine/Images SITE/BJ-M03.png` | 4 000 × 2 828 | `accueil.ouverture-1` et `-4`, `accueil.double-page-1` |
| `double-page-australia.jpg` | `Magazine/Images SITE/BJ-M04.png` (BJ-M07 est le même) | 4 000 × 2 828 | `accueil.ouverture-2` et `-6`, `accueil.double-page-2` |
| `double-page-australia-portrait.jpg` | `Magazine/Images SITE/BJ-M04V.png` | 2 828 × 4 000 | en réserve |
| `objet-magazines-sur-la-table.jpg` | `Visuels/IMG_2909.jpeg` | 4 284 × 2 410 | `accueil.hero`, `accueil.porte-groupes` (déjà en ligne) |

## Encore ailleurs

- **Canva**, designs « MODÈLES COUVERTURES » et « visus bellajour » : les couvertures Aussie,
  2026, Lisbonne, Perth, Playa, Noosa, The Boys, This Night. Les copies du site font 640 px ; un
  export Canva en pleine résolution les remplacerait.
- **Brochure Écoles et Entreprise** (`Magazine/Brochures/Visuels - Ecoles` et `- Entreprise`) :
  couvertures et doubles pages de groupe en 2 000 × 1 414. Droits à confirmer.
- **La vidéo de Louis** (`accueil.matiere`) : l'original est `~/Desktop/SITE.mov` (2160 × 2160,
  4,6 s, 21 Mo). Le site sert `public/images/v2/matiere/magazine-tour.mp4` et `.webm` (1080 px,
  sans son, environ 1,2 Mo) et l'image d'attente `magazine-tour.webp`.

## Ajouter un visuel

1. Le copier ici en JPEG, 2 400 px sur le grand côté, avec un nom qui dit ce qu'on voit.
2. En tirer la version web dans `public/images/v2/` (WebP, à la largeur affichée × 2).
3. Changer le défaut dans `src/content/media.ts`, ou le déposer dans Site · Visuels.
4. Ajouter sa ligne au tableau ci-dessus.
