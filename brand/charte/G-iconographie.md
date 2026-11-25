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
- **Pour une rotation** : ajouter une ligne `{ du, au, fichier, alt }`.
