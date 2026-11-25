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

### Préparer en avance, voir, valider *(proposé le 25/11, construit en phase 4)*

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
