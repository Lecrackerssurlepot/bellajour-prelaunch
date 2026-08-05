/* Galerie de la homepage de lancement.
   Couvertures : 450 x 675, ratio 2:3, webp, toutes sous 58 Ko.
   Tableau VIDE = la section Galerie et le lien "Nos albums" de la navbar
   ne se rendent pas. Ajouter une entree suffit a les faire apparaitre.
   L'ordre est volontaire : deux couvertures voisines n'ont jamais la meme
   dominante chromatique, c'est ce qui fait tenir le mur. */

export type GalerieCover = { src: string; destination: string }

export const GALERIE_COVERS: GalerieCover[] = [
  { src: '/images/lancement/galerie/bali.webp', destination: 'Bali' },
  { src: '/images/lancement/galerie/dubai.webp', destination: 'Dubaï' },
  { src: '/images/lancement/galerie/dubrovnik.webp', destination: 'Dubrovnik' },
  { src: '/images/lancement/galerie/japon.webp', destination: 'Japon' },
  { src: '/images/lancement/galerie/namibie.webp', destination: 'Namibie' },
  { src: '/images/lancement/galerie/istanbul.webp', destination: 'Istanbul' },
  { src: '/images/lancement/galerie/costa-rica.webp', destination: 'Costa Rica' },
  { src: '/images/lancement/galerie/egypte.webp', destination: 'Égypte' },
  { src: '/images/lancement/galerie/patagonie.webp', destination: 'Patagonie' },
  { src: '/images/lancement/galerie/marrakech.webp', destination: 'Marrakech' },
  { src: '/images/lancement/galerie/londres.webp', destination: 'Londres' },
  { src: '/images/lancement/galerie/maldives.webp', destination: 'Maldives' },
  { src: '/images/lancement/galerie/kenya.webp', destination: 'Kenya' },
  { src: '/images/lancement/galerie/barcelone.webp', destination: 'Barcelone' },
  { src: '/images/lancement/galerie/ile-maurice.webp', destination: 'Île Maurice' },
  { src: '/images/lancement/galerie/jordanie.webp', destination: 'Jordanie' },
  { src: '/images/lancement/galerie/new-york.webp', destination: 'New York' },
  { src: '/images/lancement/galerie/seychelles.webp', destination: 'Seychelles' },
  { src: '/images/lancement/galerie/tanzanie.webp', destination: 'Tanzanie' },
  { src: '/images/lancement/galerie/santorin.webp', destination: 'Santorin' },
  { src: '/images/lancement/galerie/vietnam.webp', destination: 'Vietnam' },
  { src: '/images/lancement/galerie/lisbonne.webp', destination: 'Lisbonne' },
  { src: '/images/lancement/galerie/perou.webp', destination: 'Pérou' },
  { src: '/images/lancement/galerie/tulum.webp', destination: 'Tulum' },
  { src: '/images/lancement/galerie/thailande.webp', destination: 'Thaïlande' },
]

/* Bande Instagram du footer. Vide = la bande ne se rend pas. */
export type InstagramPost = { src: string; href?: string }

export const INSTAGRAM_POSTS: InstagramPost[] = []
