# Le magazine Bellajour en 3D

Un seul modèle du magazine, construit une fois, qui sert partout : le site, la page `/brand`,
les mockups, les réseaux, les brochures, les vidéos. Style classique et réaliste : pas d'effet.

On lui donne une image de couverture, il rend le magazine sous tous les angles.

## Ce qu'il y a dans ce dossier

| Fichier | Rôle |
|---|---|
| `magazine.js` | Le modèle (Three.js) et son studio : lumière douce, ombre au sol, glisser pour tourner |
| `magazine.d.ts` | Les types, pour le code du site |
| `dimensions.js` | Le format et la largeur du dos, recopiés du code du site (voir plus bas) |
| `angles.json` | Les six angles nommés |
| `exporter.mjs` et `exporter.html` | La fabrique d'images et de vidéos |
| `exports/demo/` | Un jeu de démonstration (couverture « Rio ») |
| `exports/captures/` | Les captures de vérification de la page `/brand` |

## Sortir les images et la vidéo d'un magazine

Une commande, depuis la racine du dépôt :

```bash
node brand/assets/3d/magazine/exporter.mjs public/images/v2/accueil/couverture-rio-1050.webp
```

Le résultat arrive dans `brand/assets/3d/magazine/exports/<nom du fichier>/` :

- un PNG à fond transparent par angle, 2048 px de côté (`face.png`, `trois-quarts-gauche.png`…) ;
- la même image en WebP 1024 px (`face-1024.webp`…), plus légère : c'est elle que le site affiche quand le navigateur ne sait pas faire de 3D ;
- `turntable.mp4` et `turntable.webm` : le magazine fait un tour sur lui-même, 6 secondes, 30 images par seconde, 1080 px, sur le blanc de la charte (lu dans `brand/tokens.json`) ;
- `turntable-poster.webp` : l'image d'attente de la vidéo.

Compter une quinzaine de secondes. Rien ne part sur Internet : c'est le Chrome de la machine qui
dessine, et ffmpeg qui fabrique la vidéo.

### Changer la couverture, et le reste

La couverture est le premier mot après la commande : le chemin d'une image, de préférence au
format de la page (210 × 297). Une image d'un autre format est recadrée au centre. **Toujours une
vraie photo.**

Tout le reste est optionnel :

| Option | Effet | Sans l'option |
|---|---|---|
| `--nom ete-lisbonne` | Le nom du dossier de sortie | Le nom du fichier de couverture |
| `--quatrieme image.webp` | L'image du dos du magazine (la 4e de couverture) | Une couleur unie |
| `--couleur-quatrieme "#ffffff"` | La couleur de la 4e quand il n'y a pas d'image | La couleur du dos |
| `--dos "#111111"` | La couleur du dos carré (la tranche reliée) | Blanc |
| `--double-page image.webp` | L'image de la double page, visible sur l'angle « ouvert » | Des pages blanches |
| `--pages 48` | Le nombre de pages, pair, de 24 à 60 | 32 |
| `--finition matte` | Couverture mate (`matte`) ou brillante (`gloss`) | Brillante |
| `--sans-video` | Seulement les images | Images et vidéos |

Le jeu de démonstration a été fabriqué ainsi :

```bash
node brand/assets/3d/magazine/exporter.mjs public/images/v2/accueil/couverture-rio-1050.webp \
  --nom demo --double-page public/images/v2/magazine/double-page-australie-1400.webp
```

**Attention :** la page `/brand` affiche les images `exports/demo/*-1024.webp` avant le chargement
de la 3D, et à sa place sans 3D. Si on refait la démo avec une autre couverture, il faut aussi
changer `COUVERTURE` en haut de `src/app/brand/Magazine.tsx`, sinon l'image fixe et le modèle ne
montrent plus le même magazine.

## Les six angles

Ils sont dans `angles.json`, lus par le modèle et par l'exporteur.

| Nom | Ce qu'on voit |
|---|---|
| `face` | La couverture, bien en face |
| `trois-quarts-gauche` | La couverture et le dos carré |
| `trois-quarts-droite` | La couverture et la tranche des pages |
| `dos` | La 4e de couverture et le dos carré, de trois quarts |
| `ouvert` | Le magazine ouvert à plat sur une double page, vu du dessus |
| `pose-a-plat` | Le magazine fermé, posé sur une table |

Pour régler un angle, on change ses chiffres dans `angles.json` :
- `rotation` : le magazine tourné sur lui-même, en degrés ;
- `camera.elevation` : la hauteur du regard (0 = à hauteur du magazine, 90 = pile au-dessus) ;
- `camera.distance` : le recul, compté en hauteurs de page (plus grand = magazine plus petit) ;
- `pose` : `debout` ou `a-plat` ; `ouverture` : 0 fermé, 1 ouvert.

Pour ajouter un angle : une entrée de plus dans `angles`, et son nom dans `ordre`.

## D'où viennent les dimensions

Aucune mesure n'est inventée. Elles viennent du code qui fabrique les vrais magazines :

| Mesure | Valeur | Source |
|---|---|---|
| Format fini | 210 × 297 mm | `src/lib/mise-en-page/geometrie.ts` (`PAGE_L`, `PAGE_H`) |
| Largeur du dos | calculée selon les pages et la finition | `src/lib/atelier/impression.ts` (`dosMmPourPages`, avec `GRAMMAGE_INTERIEUR_GSM`, `bulkInterieurPour`, `EPAISSEUR_COUVERTURE_MM`) |
| Reliure | dos carré collé, toujours | `src/lib/atelier/grille.ts` (`reliurePour`) |
| Pages | 24 à 60, de 2 en 2 | `src/lib/atelier/grille.ts` (`PAGES_MIN`, `PAGES_MAX_PUBLIC`, `GRILLE`) |
| Finition | mat ou brillant | `src/lib/atelier/impression.ts` (`Finition`) |

Deux chemins, pour une raison technique :

- **La page `/brand`** lit ces fichiers directement et passe les mesures au modèle.
- **L'exporteur** tourne dans une page toute simple, qui ne sait pas lire le code du site. Il
  utilise donc `dimensions.js`, **une recopie** de la formule et de ses valeurs, sans rien changer.
  Vérifié le 25/11/2026 : les 38 cas (19 paginations × 2 finitions) donnent le même dos que le code
  du site. **Si le papier ou la formule change dans `impression.ts`, il faut reporter le changement
  dans `dimensions.js`.**

Comme dans la vraie vie, la finition change un peu l'épaisseur : le papier intérieur suit la
couverture (décision D19), et le papier du mat est un peu plus épais.

## Ce qui est une approximation visuelle

- **L'épaisseur n'est jamais affichée comme une mesure.** Elle sert à dessiner le magazine, pas à
  renseigner le client. La largeur du dos est celle de la formule de l'imprimeur, qui est elle-même
  une estimation.
- La couverture est dessinée avec 0,5 mm d'épaisseur de chaque côté : c'est le forfait de la
  formule (1 mm pour les deux), pas l'épaisseur réelle du carton.
- Le galbe de l'ouverture (environ 13 mm au plus haut, vers 50 mm du pli), l'éventail des pages,
  le retrait des liasses en tranche, la rainure de charnière (à 7 mm de la reliure, 0,2 mm de creux),
  l'ombre dans le pli, la teinte crème de la tranche et ses stries, le reflet du brillant et le
  velouté du mat, la lumière et les ombres : tout cela est réglé à l'œil, rien n'est une mesure.
- Le magazine s'ouvre toujours en son milieu, en deux moitiés rigides : les pages ne se feuillettent pas.
- Le dos carré et la 4e sont blancs par défaut, sans titre.
- Le bloc de pages est fait de 4 à 12 liasses par moitié, chacune légèrement en retrait (0,1 à 0,6 mm
  en tranche, jusqu'à 0,35 mm en tête et en pied) : la tranche montre des pages, pas un pavé.
  Ouvert, les liasses du dessus se bombent un peu plus que celles du dessous.

## Sur le site

- La 3D (Three.js, environ 560 ko) ne se charge que lorsque le magazine approche de l'écran.
- Sans 3D dans le navigateur, l'image fixe de l'angle s'affiche à la place.
- Sur téléphone : textures de 1024 px, ombres plus simples, netteté plafonnée.
- Si l'appareil demande moins d'animations : le magazine ne tourne pas tout seul et passe d'un angle
  à l'autre sans transition. Glisser pour tourner reste possible, c'est le doigt qui conduit.
- Le doigt fait tourner le magazine de gauche à droite ; de haut en bas, la page défile normalement.
  À la souris, on peut aussi changer la hauteur du regard. Au clavier : flèches gauche et droite.

## Pour un développeur

```js
import { creerStudio } from 'brand/assets/3d/magazine/magazine.js'
import angles from 'brand/assets/3d/magazine/angles.json'

const studio = creerStudio(element, {
  angles, angle: 'trois-quarts-gauche',
  couverture: '/images/…webp', doublePage: '/images/…webp',
  pages: 32, finition: 'gloss', couleurDos: '#ffffff',
  fond: null,            // null = transparent
  leger: false,          // true sur téléphone
  interactif: true, rotationAuto: true,
})
await studio.pret
studio.allerA('ouvert')
await studio.regler({ pages: 48, finition: 'matte' })
studio.liberer()
```

`creerStudio` lève une erreur sans WebGL : à l'appelant d'afficher l'image fixe (voir
`src/app/brand/Magazine.tsx`). `creerMagazine(options)` rend l'objet seul, pour le poser dans une
autre scène. Dépendances : `three` (épinglée), et pour l'exporteur `playwright-core` (avec le
Chrome installé, aucun navigateur téléchargé), `sharp` et ffmpeg.
