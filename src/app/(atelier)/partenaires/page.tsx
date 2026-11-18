/* /partenaires — la page des écoles et associations (18/11/2026).
   Demande de Mathias : « limiter les aller-retours en B2B : voir notre
   brochure dans un beau visuel et pouvoir prendre un rendez-vous ».

   Deux choses, rien d'autre : la brochure à feuilleter (les cinq pages de
   « Bellajour · Brochure Écoles », en images), et la prise de rendez-vous
   sur les créneaux où toute l'équipe de l'appel est libre (les routes
   /api/partenaires/*, lib/collectif/prospects.ts).

   La page est STATIQUE : aucune lecture ici. Les créneaux arrivent après
   l'hydratation ; tant que les agendas ne sont pas reliés, l'écran montre
   l'adresse de contact à la place. Les mots viennent de la brochure : rien
   n'est promis ici qu'elle ne dise déjà. */

import type { Metadata } from 'next'
import Partenaires from './Partenaires'
import './partenaires.css'

const TITLE = 'Bellajour pour les écoles et les associations'
const DESCRIPTION =
  'Le WEI, les événements d’association, la fin d’année : dans notre atelier, nous composons un vrai magazine pour chacun de ces moments. La brochure, et un premier échange.'

const APERCU = { url: 'https://www.bellajour.fr/images/partenaires/apercu-partenaires-v1.jpg', width: 1200, height: 630, alt: 'Les magazines Bellajour étalés sur une table, sous la signature Bellajour.' }

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/partenaires' },
  /* L'aperçu du lien (demande de Mathias du 18/11 : « quand on envoie sur Insta, qu'ils aient
     une présentation, pas juste un lien moche ») : la couverture de la brochure, 1 200 × 630.
     Adresse ABSOLUE et nom versionné : les messageries gardent l'image longtemps, une image
     refaite prend `v2`. Le bloc est entier (un bloc partiel efface celui du layout). */
  openGraph: { type: 'website', locale: 'fr_FR', url: 'https://www.bellajour.fr/partenaires', siteName: 'Bellajour', title: TITLE, description: DESCRIPTION, images: [APERCU] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [APERCU.url] },
}

/* Les pages de la brochure : noms versionnés (`v1`), jamais écrasés. Une
   brochure refaite = `v2` et cette liste, pour que personne ne garde
   l'ancienne en cache. `alt` dit ce que la page montre, avec ses mots. */
const PAGES = [
  'Couverture de la brochure : « Vos années étudiantes, imprimées en magazine. »',
  'Vous vivez l’événement, nous en faisons un récit : nos derniers numéros.',
  'Une composition sur mesure : un week-end d’intégration.',
  'Une composition sur mesure : un voyage au ski.',
  'Quatre étapes, de l’appel à la livraison : le brief, la collecte, la composition, la livraison.',
].map((alt, i) => ({
  alt,
  petite: `/images/partenaires/brochure-ecoles-v1-${i + 1}-800.webp`,
  grande: `/images/partenaires/brochure-ecoles-v1-${i + 1}-1600.webp`,
}))

export default function PagePartenaires() {
  return <Partenaires pages={PAGES} pdf="/partenaires/bellajour-brochure-ecoles.pdf" contact="contact@bellajour.com" />
}
