# J. Médias

## Images

- **Format** : WebP partout, AVIF en plus pour les grandes images (accueil, Magazine), via `<picture>`.
- **Tailles** : trois largeurs par image, 640, 1280 et 1920 px, avec `srcset` et `sizes`.
- **Proportions fixes** (pour un CLS proche de 0) :
  - couverture 210 / 297 ;
  - double page 1400 / 990 ;
  - bande photo 2,4 / 1 ;
  - vignette 4 / 5.
- **Chargement** :
  - l'image de l'écran d'arrivée en `fetchpriority="high"` ;
  - toutes les autres en `loading="lazy"` et `decoding="async"`.
- **Poids maximal** *(proposé)* : 250 ko pour une image pleine largeur, 120 ko pour une vignette.
- **Nom de fichier** : un nouveau nom à chaque remplacement (cache de 24 h). Voir G.
- **Balise** : `<img>` nue, pas de `next/image`. C'est la règle du dépôt.

## Vidéos

Pas de YouTube, pas de GIF.

```html
<video autoplay muted loop playsinline preload="none" poster="….webp">
  <source src="….webm" type="video/webm">
  <source src="….mp4" type="video/mp4">
</video>
```

- **Encodage** : MP4 H.264 et WebM VP9, 1080 px de large au plus, sans piste son.
- **Poids** *(proposé)* : 4 Mo au plus pour une boucle de moins de 15 s.
- **Lecture** : déclenchée quand la vidéo entre à l'écran (`IntersectionObserver`), mise en pause quand elle en sort.
- **Moins d'animations** : la vidéo ne démarre pas seule. On affiche le poster et un bouton « Lire ».

## Le magazine en 3D

C'est un modèle unique, construit une fois en phase 3 et réutilisé partout : site, `/brand`,
mockups, brochures, posts.

- **Où il vit** : `brand/assets/3d/magazine/`, avec le modèle, les angles nommés, l'exporteur et un README.
- **Paramètres** : le format et les marges viennent de `src/lib/mise-en-page/`. L'épaisseur est une approximation visuelle selon le nombre de pages, jamais affichée comme une mesure. Mat ou brillant, comme la finition (D19). La couverture est une image.
- **Angles nommés** : `face`, `trois-quarts-gauche`, `trois-quarts-droite`, `dos`, `ouvert`, `pose-a-plat`.
- **Web** : Three.js, chargé seulement quand le magazine entre à l'écran. Sans WebGL, le PNG de l'angle s'affiche à la place. Sur téléphone, textures de 1024 px et ombres simplifiées.
- **Exports** : PNG transparents par angle, et une vidéo turntable en MP4 et WebM.
- **Validé le 25/11** : 4e et dos blancs par défaut ; bloc en liasses légèrement décalées (la tranche montre des pages) ; rainure de charnière sur la 1re et la 4e ; ouverture bombée. Réglages visuels, détaillés dans le README du modèle.
