# G. Iconographie et photo

## Icônes

- **Source** : [Lucide](https://lucide.dev), licence ISC, libre.
- **Style** : trait de 1,5 px, extrémités rondes, sans remplissage. 20 px dans le texte, 24 px seules.
- **Couleur** : `currentColor`, jamais une couleur propre.
- Une icône seule a toujours un `aria-label`. Une icône à côté d'un mot est décorative (`aria-hidden`).
- Pas d'emoji dans l'interface.

## Illustration

Il n'y a pas d'illustration. La marque se montre par les photos des clients et par le magazine.
Pas de couverture peinte, pas de Midjourney : la couverture est toujours une vraie photo.

## Règles photo

- **Ce qu'on montre** : de vraies photos de vie (voyage, famille, équipe), dans de vrais magazines Bellajour.
- **Retouche** : aucun filtre de couleur. On ne fait qu'ajuster l'exposition et redresser.
- **Cadrage** : on ne coupe jamais un visage ni un regard. Le sujet suit la règle des tiers ou est au centre.
- **Droits** : uniquement des photos de clients avec leur accord, ou des photos de l'équipe. Pas de magazines tiers ni d'affiches, même en décor de fond.

## Visuels faciles à changer, avec des dates

Les visuels du site sont listés dans un seul fichier, `src/content/media.ts`, créé en phase 4.
Chaque **emplacement** a un visuel par défaut, plus des visuels datés pour les rotations :

```ts
'accueil.hero': {
  defaut: { fichier: '/images/v3/accueil/hero.webp', alt: 'Un numéro ouvert sur une table' },
  rotations: [
    { du: '2026-12-01', au: '2026-12-26', fichier: '/images/v3/accueil/hero-noel.webp', alt: '…' },
  ],
},
```

- **Règle** : le site affiche le visuel dont la période contient la date du jour (heure de Paris), sinon le visuel par défaut.
- **Pour changer un visuel** : déposer le fichier dans `public/images/v3/…` sous un **nom nouveau**, puis changer la ligne. Le cache de l'hébergeur garde un même nom pendant 24 h.
- **Pour une rotation** : ajouter une ligne `{ du, au, fichier, alt, valide }`.

### Préparer en avance, voir, valider *(construit le 25/11, phase 4)*

```ts
rotations: [
  { du: '2026-12-01', au: '2026-12-26', fichier: '/images/v3/accueil/hero-noel.webp', alt: '…', valide: true },
  { du: '2027-06-15', au: '2027-08-31', fichier: '/images/v3/accueil/hero-ete.webp', alt: '…', valide: false },
],
```

- **Une rotation non validée n'est jamais en ligne**, même à sa date : le site garde le visuel par défaut.
- **L'aperçu** : `/brand/visuels` (protégé comme `/brand`). Chaque emplacement y montre le visuel du jour,
  et un sélecteur de date fait voir le site à n'importe quel jour (« le 5 décembre ») : visuels
  validés et visuels « à valider », marqués comme tels.
- **Valider** : passer `valide: false` à `valide: true`. Une ligne, que je change sur votre mot.
- **Où vous le faites** : vous déposez les fichiers (dans la conversation ou dans `public/images/v3/<page>/`),
  vous dites l'emplacement et les dates ; j'ajoute la ligne, vous regardez l'aperçu, vous validez.
- **Vidéos** : même mécanique, avec trois fichiers par vidéo (poster `.webp`, `.mp4`, `.webm`).

### Les emplacements

Chaque visuel du site a un nom d'emplacement (`page.place`), listé dans `media.ts` et repris dans
le bouton « Visuels » du banc (`R-<page><n>`, avec ratio et taille). Exemples :

| Emplacement | Ce que c'est | Ratio |
|---|---|---|
| `accueil.hero` | La couverture de l'ouverture | 210 / 297 |
| `magazine.video` | La vidéo du magazine (verticale) | 9 / 16 |
| `offrir.carte` | Le visuel posé sur la carte cadeau (un numéro incliné) | 210 / 297 |

**La carte cadeau a son emplacement visuel** (`offrir.carte`), daté comme les autres : un visuel de
Noël peut être préparé, vu sur la carte dans l'aperçu, puis validé. Le reste de la carte (logo,
phrase, montant, code) est du texte, jamais une image.

### Mode d'emploi *(25/11, phase 4)*

Tout vit dans `src/content/media.ts`. L'aperçu : `/brand/visuels`. Le contrôle : `npx tsx --tsconfig tsconfig.json scripts/verif-media.ts`.

**Pour changer un visuel**
1. Vous m'envoyez l'image et vous dites l'emplacement (`accueil.hero`, `offrir.carte`…).
2. Je la dépose dans `public/images/v3/<page>/` sous un nom nouveau, je change la ligne `defaut`, j'enlève `provisoire`.
3. Vous regardez `/brand/visuels` : l'emplacement montre la nouvelle image.

**Pour préparer une saison**
1. Vous dites l'emplacement, les dates (« du 1er au 26 décembre ») et vous envoyez l'image.
2. J'ajoute une ligne de rotation avec `valide: false`. Rien ne change sur le site.
3. Dans `/brand/visuels`, vous choisissez un jour de la période : la rotation y est marquée « à valider ».

**Pour valider**
1. Vous dites « je valide » pour l'emplacement et la période.
2. Je passe la ligne à `valide: true`. Le jour venu, le site la montre tout seul, et revient au défaut le lendemain du dernier jour.

Les jours sont ceux de Paris, bornes incluses. Si deux rotations validées tombent le même jour, la première écrite passe ; l'aperçu marque l'autre « masquée ».

### Téléphone, cadrage, défaut (27/11)

Tout se règle dans l'admin (Site · Visuels), visuel par visuel.

- **Cadrage** : un clic sur l'image pose le point qui reste quand la page la recadre (`object-position`). Le format de l'emplacement ne change pas : c'est la mise en page qui le fixe.
- **Sur téléphone** : une autre image pour les écrans de 700 px et moins. Pas sur une couverture (210 × 297, la même partout) ni sur une vidéo.
- **Changer le défaut** : une ligne « défaut » remplace celui du code. La plus récente validée gagne ; une rotation datée passe toujours avant. La retirer rend le défaut du code.

✅ Un fond de page large sur ordinateur, une version verticale sur téléphone.
❌ Une version téléphone d'une couverture : une couverture est un objet, elle ne change pas de forme.
