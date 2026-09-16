/* LA PAGE PRODUIT — /magazine
   Direction « Le Kiosque », validée sur maquette le 30/08/2026.

   POURQUOI ELLE EXISTE
   Jusqu'ici, « Composer avec l'atelier » ouvrait le questionnaire. Quelqu'un
   qui sortait des sept pages de l'univers savait ce qu'est Bellajour et
   ignorait toujours le prix, le papier, le délai et ce qui se passe s'il
   n'aime pas sa couverture. Cette page est l'écran qui manquait entre les
   deux, et c'est désormais elle que visent tous les boutons du site
   (CTA_HREF) ; les siens ouvrent le questionnaire (COMPOSER_HREF).

   ⚠️ ELLE RECUEILLE LE CONTENU DES COMPOSANTS ORPHELINS. L'étagère des quatre
   dos (S2Collection), les trois temps du parcours (S3Method) et la grille des
   paliers vivent maintenant ici, et lisent la MÊME source — content.ts. Les
   fichiers S1Hero/S2Collection/S3Method/S4Final ont fini leur office : ils
   vivent dans `archive/accueil-v1/` depuis le 31/08/2026 (T-016).

   Composant SERVEUR. Les métadonnées et les trois blocs JSON-LD doivent être
   DANS le document, pas montés par le navigateur. Seuls Nav et Reveal sont
   clients. */

import type { Metadata } from 'next'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import Kiosque from './Kiosque'
import Corps from './Corps'
import { EUROS_MAX_PUBLIC, EUROS_MIN, GRILLE_PUBLIQUE } from '@/lib/atelier/grille'
import { PAYS_LIVRAISON } from '@/lib/atelier/pays'
import { COMPOSER_HREF, CTA_LABEL, FAQ } from '../content'
import './pdp.css'
import { compteOuvert } from '@/lib/compte/session'

const URL = 'https://www.bellajour.fr/magazine'

const TITLE = 'Le magazine d’un moment de vie — l’atelier Bellajour'
/* ⚠️ Cette phrase est reprise TELLE QUELLE par openGraph et Twitter plus bas :
   une seule constante, donc le résultat de recherche, l'aperçu Instagram et
   la carte Twitter ne peuvent pas raconter trois choses différentes.
   « magazine personnalisé » y est écrit d'un seul tenant et dans les mêmes
   mots que le chapô de la page : un extrait qui promet autre chose que ce
   qu'on lit en arrivant est un extrait qui fait repartir.

   ⚠️ 154 CARACTÈRES, ET C'EST UNE CONTRAINTE, PAS UN HASARD. Google en affiche
   environ 155 sur ordinateur et moins sur téléphone. La version longue faisait
   196 : elle était coupée juste avant le prix, c'est-à-dire avant ce qui
   déclenche le clic. Le détail sacrifié (le format A4, l'échelle complète des
   prix) est sur la page, à trois lignes du haut. Rallonger cette phrase, c'est
   reperdre le prix.
   ⚠️ Le montant est DÉRIVÉ de la grille (EUROS_MIN) : la description de Google
   ne peut pas rester en arrière d'un changement de prix. */
const DESCRIPTION =
  'Vous déposez 40 à 100 photos, l’atelier compose votre magazine ' +
  'personnalisé, imprimé et livré. Couverture gratuite sous 48 h, ' +
  `vous décidez après. Dès ${EUROS_MIN} €.`

/* ⚠️ `openGraph` REMPLACE celui du layout racine — Next ne fusionne pas en
   profondeur. Un bloc partiel efface og:image, og:url, og:site_name et
   og:locale, et empêche l'injection de l'image générée par
   opengraph-image.tsx. C'est la panne constatée le 27/08/2026 sur l'accueil,
   qui était alors la seule page du site sans aperçu de partage — sur le
   premier canal d'acquisition, un lien collé dans un DM Instagram. Tout ce
   qui est écrasé se redéclare donc ici, en entier. */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/magazine' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: URL,
    siteName: 'Bellajour',
    title: TITLE,
    description: DESCRIPTION,
    images: [{
      url: 'https://www.bellajour.fr/images/v2/partage/bellajour-magazines-1200.png',
      width: 1200,
      height: 630,
      alt: 'Dix magazines photo personnalisés Bellajour, imprimés et posés côte à côte',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://www.bellajour.fr/images/v2/partage/bellajour-magazines-1200.png'],
  },
}

/* ─────────────────────────── données structurées ───────────────────────────
   Trois blocs, trois rôles distincts :

   Product + AggregateOffer — la fiche produit. `AggregateOffer` et NON
   `Offer` : `lowPrice`/`highPrice` n'existent pas sur Offer et le test des
   résultats enrichis les rejette en bloc (leçon déjà payée sur l'accueil).
   Les bornes sont LUES depuis GRILLE (@/lib/atelier/grille), la même source
   que la page et que le prix ferme du serveur — en NOMBRES, jamais en parsant
   une chaîne d'affichage. `offerCount` vaut le nombre de PRIX DISTINCTS de la
   grille (vingt depuis le 10/09/2026, un par pagination), ce qui est bien ce
   que `AggregateOffer` décrit : combien d'offres l'agrégat recouvre.

   FAQPage — décrit EXACTEMENT les quatre <details> rendus par Corps.tsx.
   Déclarer une question qui n'est pas visible sur la page est une infraction
   aux règles de Google, pas une astuce.

   BreadcrumbList — dit à Google que cette page est fille de l'accueil.

   ⚠️ `offers.url` pointe sur CETTE page, pas sur /composer : c'est ici qu'on
   voit le prix. /composer est un questionnaire, et il est en noindex. */
const JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Numéro Bellajour — le magazine d’un moment de vie',
    description:
      'Magazine photo imprimé, composé à la main à partir de vos photos. ' +
      'Format A4, papier intérieur couché satiné 130 g, couverture 250 g ' +
      'pelliculée brillante ou mate au choix. Un numéro par moment.',
    brand: { '@type': 'Brand', name: 'Bellajour' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: String(EUROS_MIN),
      highPrice: String(EUROS_MAX_PUBLIC),
      offerCount: GRILLE_PUBLIQUE.length,
      availability: 'https://schema.org/InStock',
      url: URL,
      /* La zone dérive de PAYS_LIVRAISON (toute l'Europe depuis le 11/09/2026),
         jamais recopiée. */
      areaServed: [...PAYS_LIVRAISON],
    },
    url: URL,
    /* T-085 — l'image que Google peut montrer a cote du prix. Elle faisait
       450 px de large jusqu'au 14/09/2026, sous le minimum de 1200 px que
       Google demande pour un resultat enrichi produit : elle etait donc
       probablement ignoree. 1600x1131 desormais.
       ⚠️ Un SEUL cadrage, et c'est delibere. Google en prefere trois (1:1,
       4:3, 16:9) ; ils ont ete produits puis jetes le 14/09 parce qu'ils
       tranchent le lettrage du visuel en deux. Les trois reviendront avec le
       master demande : une photo de l'objet imprime, sur fond uni. */
    image: ['https://www.bellajour.fr/images/v2/magazine/magazine-photo-personnalise-1600.webp'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.r },
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.bellajour.fr' },
      { '@type': 'ListItem', position: 2, name: 'Le magazine', item: URL },
    ],
  },
]

export default function PageProduit() {
  return (
    <>
      {/* La première photo du collage est l'élément LCP. On la demande AVANT
          que le navigateur ait fini de lire Kiosque.tsx. React 19 remonte ce
          <link> dans le <head> tout seul.
          ⚠️ Il vit ICI, pas dans le layout : le layout sert aussi /composer et
          /numero, qui n'affichent jamais cette image. Un préchargement posé
          trop haut est un téléchargement offert à des pages qui n'en veulent
          pas — 283 Ko sur tout le site, la panne du 27/08/2026. */}
      {/* ⚠️ MIROIR EXACT du src/srcSet/sizes de la premiere figure du collage
          (Kiosque.tsx, `.c1`). Si l'un des deux cotes change sans l'autre, le
          navigateur precharge une variante et en affiche une autre : l'element
          LCP est telecharge DEUX fois. */}
      <link
        rel="preload"
        as="image"
        href="/images/v2/magazine/couverture-sicile-900.webp"
        imageSrcSet="/images/v2/magazine/couverture-sicile-450.webp 450w, /images/v2/magazine/couverture-sicile-900.webp 900w"
        imageSizes="(max-width: 720px) 40vw, 22vw"
        fetchPriority="high"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* La barre de tête de CETTE page mène au questionnaire : on est déjà
          sur la page produit, l'y renvoyer serait un bouton qui ne fait rien.
          Le libellé, lui, ne change pas — invariant nº5.
          `retour` rend à la signature son rôle de logo : ici elle ramène à
          l'accueil. Sur l'accueil, elle remonte à la couverture — c'est là,
          et là seulement, que le geste a un sens sans quitter la page. */}
      {/* `compteOuvert()` lu au build : la silhouette du compte entre dans le
          HTML au lieu d'attendre l'hydratation (cf. NavCompte). */}
      <Nav href={COMPOSER_HREF} label={CTA_LABEL} retour="/" compteOuvert={compteOuvert()} />

      {/* ⚠️ `.at-pdp` n'est pas décoratif : toute pdp.css y est scopée, et les
          noms de classes y sont courts (.mot, .pas, .prix). Le retirer
          dépeindrait la page ET repeindrait /composer. */}
      <main className="at-pdp">
        <Kiosque />
        <Corps />
      </main>

      <Footer />
    </>
  )
}
