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
| `double-page-lagon.jpg` | `Magazine/Images SITE/BJ-M03.png` | 4 000 × 2 828 | `accueil.ouverture-1` et `-4` |
| `double-page-australia.jpg` | `Magazine/Images SITE/BJ-M04.png` (BJ-M07 est le même) | 4 000 × 2 828 | `accueil.ouverture-2` et `-6` |
| `double-page-mission-beach.jpg` | `~/Desktop/Book double page.pdf`, p. 9 (Affinity) | PDF vectoriel | `accueil.double-page-1` |
| `double-page-coral-bay.jpg` | `~/Desktop/Book double page.pdf`, p. 20 | PDF vectoriel | `accueil.double-page-2` |
| `double-page-pelican-feed.jpg` | `~/Desktop/Book double page.pdf`, p. 18 | PDF vectoriel | `magazine.double-page` |
| `double-page-24h-hautes-alpes.jpg` | `Magazine Clients Atelier/Jeanne - 24h des hautes alpes 2026/fevrejeanne91.pdf`, p. 1 | PDF | `edition.vitrine-double` |
| `double-page-australia-portrait.jpg` | `Magazine/Images SITE/BJ-M04V.png` | 2 828 × 4 000 | en réserve |
| `couverture-perth.jpg`, `-playa`, `-la-vida` | Canva « MODÈLES COUVERTURES » (DAHTZ-r83q0), p. 6, 13, 15, moitié droite | 2 480 × 3 508 | `magazine.couverture`, `magazine.eventail-2`, `-3` |
| `couverture-this-night.jpg`, `-the-boys` | Canva « MODÈLES COUVERTURES », p. 28 et 25 | 2 480 × 3 508 | `accueil.porte-offrir`, `groupes.numero-6` |
| `couverture-tout-schuss.jpg`, `-wei`, `-seminaire`, `-soiree-entreprise` | `Magazine/Brochures/Visuels - Ecoles` et `- Entreprise`, moitié droite | 1 000 × 1 414 | `groupes.numero-1` à `-4` |
| `couverture-24h-hautes-alpes.jpg`, `-japon-*`, `-madrid` | `Magazine Clients Atelier` (Jeanne, Margaux, Candice), moitié droite | 1 000 à 1 200 px | `groupes.numero-5`, `-7`, `offrir.carte` |
| `double-page-kalbarri.jpg`, `-new-south-wales` | `~/Desktop/Book double page.pdf`, p. 2 et 15 | PDF | `accueil.double-page-1`, `-2` |
| `double-atelier-cuisine.jpg`, `double-soiree-entreprise.jpg` | `Magazine/Brochures/Visuels - Entreprise/3.png`, `7.png` | 2 000 × 1 414 | `groupes.entreprise`, `-2` |
| `objet-magazines-sur-la-table.jpg` | `Visuels/IMG_2909.jpeg` | 4 284 × 2 410 | `accueil.hero`, `accueil.porte-groupes` (déjà en ligne) |

## Encore ailleurs

- **Canva** : export complet (27/11, accord de Mathias) dans
  `design-explorations/visuels-a-placer/canva/` (79 pages, hors git). Noosa, Tropic et USA ont
  un titre qui passe sur le dos : pas utilisables seules.
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
