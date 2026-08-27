/* LA HOMEPAGE DE BELLAJOUR — l'ouverture, puis l'univers en sept pages.
   Sert `/` depuis la bascule du 24/08/2026 ; `/atelier` y renvoie en 308
   permanent (next.config.ts), les liens déjà donnés continuent de marcher.

   REFONTE DU 27/08/2026
   Les quatre sections empilées (hero, collection, méthode, CTA final) sont
   remplacées par la maquette validée : une couverture qui se pose puis
   s'ouvre en plein écran, et le récit de la marque en sept pages qui
   s'enchaînent comme une projection.

   Les anciens composants (S1Hero, S2Collection, S3Method, S4Final) ne sont
   PAS supprimés : ils restent sur le disque, hors routage, parce que leur
   contenu — l'étagère des quatre numéros, les trois temps du parcours,
   la grille des paliers — servira la page produit. Les effacer, c'est
   réécrire ce texte-là une deuxième fois.

   Ce fichier reste un composant SERVEUR : les métadonnées et le JSON-LD
   doivent être dans le document, pas montés par le navigateur. Seuls
   Ouverture et Univers sont clients, parce qu'eux seuls ont besoin du DOM.

   ⚠️ `.at-accueil` n'est pas décoratif : les deux feuilles de style de la
   page y sont entièrement scopées. Le retirer dépeindrait tout. */

import type { Metadata } from 'next'
import Nav from './components/Nav'
import Ouverture from './components/Ouverture'
import Univers from './components/Univers'
import Footer from './components/Footer'

const TITLE = 'L’atelier Bellajour — vos meilleurs moments méritent leur magazine'
const DESCRIPTION =
  'Ce festival, cette soirée, ce road trip. Vous envoyez vos photos, ' +
  'l’atelier compose le magazine de cet instant de vie. ' +
  'Premier aperçu gratuit, votre magazine sur-mesure dès 30 €.'

/* ⚠️ `openGraph` REMPLACE celui du layout racine, Next ne fusionne pas en
   profondeur. Un bloc partiel effacait donc og:image, og:url, og:site_name et
   og:locale — et surtout empechait l'injection de l'image generee par
   opengraph-image.tsx. Resultat verifie le 27/08/2026 : l'accueil etait la
   SEULE page du site sans apercu de partage. Un lien colle dans une story ou
   un DM Instagram, c'est-a-dire le premier canal d'acquisition, montrait un
   rectangle vide. Tout ce qui est ecrase doit donc etre redeclare ici. */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://www.bellajour.fr',
    siteName: 'Bellajour',
    title: TITLE,
    description: DESCRIPTION,
    images: [{
      url: '/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'Bellajour — vos meilleurs moments méritent leur magazine',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
}

/* Données structurées Product + Offer (PRD §16). Le prix affiché est le
   plancher de la grille ; le prix ferme se décide côté serveur à l'état 2. */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Numéro Bellajour',
  description:
    'Magazine photo imprimé, composé à la main à partir de vos photos. ' +
    'Un numéro par moment.',
  brand: { '@type': 'Brand', name: 'Bellajour' },
  /* AggregateOffer et NON Offer : `lowPrice`/`highPrice` n'existent pas sur
     Offer, le test des resultats enrichis les rejetait en bloc. Trois paliers
     (src/lib/atelier/prix.ts), zone de livraison FR/BE/LU. */
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'EUR',
    lowPrice: '30',
    highPrice: '45',
    offerCount: 3,
    availability: 'https://schema.org/InStock',
    url: 'https://www.bellajour.fr/composer',
    areaServed: ['FR', 'BE', 'LU'],
  },
  url: 'https://www.bellajour.fr',
  image: ['https://www.bellajour.fr/images/lancement/galerie/marrakech.webp'],
}

export default function AtelierHome() {
  return (
    <>
      {/* L'image de couverture est l'element LCP de la page : elle occupe tout
          l'ecran des la premiere seconde. On la demande donc AVANT que le
          navigateur ait fini de lire Ouverture.tsx, qui est un composant client.
          React 19 remonte ce <link> dans le <head> tout seul.
          ⚠️ Ce prechargement vit ICI et pas dans le layout racine : le layout
          sert AUSSI /composer, /preventes et les pages legales, qui n'affichent
          pas cette image. Un prechargement pose trop haut est un telechargement
          offert a des pages qui n'en veulent pas. C'etait le cas jusqu'au
          27/08/2026 avec header-bellajour.webp (283 Ko, sur tout le site, pour
          un Hero qui n'est plus route nulle part). */}
      <link
        rel="preload"
        as="image"
        href="/images/brand/brand-01.webp"
        fetchPriority="high"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Nav />
      <div className="at-accueil">
        {/* Le grain : aucun aplat parfaitement plat. Fixe, par-dessus tout,
            insensible au pointeur. C'est une turbulence SVG en ligne, pas
            une image — voir ouverture.css. */}
        <div className="grain" aria-hidden="true" />
        {/* Le curseur qui légende : au survol d'un visuel il en donne le
            nom. Desktop et pointeur fin uniquement, monté vide et piloté
            par Ouverture. */}
        <div className="curseur" aria-hidden="true"><i /><b /></div>
        <Ouverture />
        <Univers />
      </div>
      <Footer />
    </>
  )
}
