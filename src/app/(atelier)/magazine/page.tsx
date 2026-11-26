/* LA PAGE PRODUIT, /magazine, charte V2 (26/11/2026).
   Port du banc validé (duplicata 14BmVZ v4, page « magazine ») : la tête
   avec l'éventail de couvertures, les trois gestes, la fiche de l'objet, les
   questions, l'appel. Toutes les classes du banc sont scopées sous `.m-banc`
   (magazine.css) : retirer la racine dépeindrait la page.

   La page d'avant (« Le Kiosque », 30/08) est gardée dans
   archive/magazine-kiosque/ ; Kiosque.tsx, Corps.tsx et pdp.css restent en
   place, non importés ici, jusqu'au ménage de la phase 7.

   CHIFFRES : aucun n'est recopié du banc. Chacun vient du code :
   - prix, pages, photos, reliure : lib/atelier/grille.ts ;
   - franco : lib/atelier/livraison.ts ;
   - exemplaires et Noël : lib/atelier/exemplaires.ts (phrases incluses) ;
   - délai de livraison : lib/atelier/urgence.ts (JOURS_LIVRAISON) ;
   - « sous 48 h », « rien à payer avant la couverture », impression en
     Europe, version digitale HD, retouches sans frais : textes déjà en ligne
     sur l'ancienne page (Kiosque.tsx, Corps.tsx, sourcés là : CGV 1.2,
     cloudprinter.ts, le geste 3).
   ⚠️ Le grammage (130 g / 250 g) de l'ancien JSON-LD n'a pas de source dans
   le dépôt : il n'est plus déclaré (CLAUDE.md, interdit 5).

   Composant SERVEUR : métadonnées et JSON-LD dans le document. */

import type { Metadata } from 'next'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import Bandeau from '../noel/Bandeau'
import BlocMagazine from '../noel/BlocMagazine'
import Apparitions from '@/components/Apparitions'
import { fichiersVisuels, lireVisuel } from '@/components/Visuel'
import { lireInterrupteur } from '@/lib/collectif/interrupteur'
import { jourDeParis, noelAuSite } from '@/lib/atelier/carteCadeau'
import {
  BANDES_PHOTOS,
  EUROS_MAX_PUBLIC,
  EUROS_MIN,
  GRILLE_PUBLIQUE,
  PAGES_MAX_PUBLIC,
  PAGES_MIN,
  RELIURE_LIBELLE,
} from '@/lib/atelier/grille'
import { FRANCO_CENTIMES } from '@/lib/atelier/livraison'
import { PAYS_LIVRAISON } from '@/lib/atelier/pays'
import { JOURS_LIVRAISON } from '@/lib/atelier/urgence'
import { PHRASE_DEGRESSIF, PHRASE_NOEL, QUANTITE_MAX, dansFenetreNoel } from '@/lib/atelier/exemplaires'
import { visuelPour } from '@/content/media'
import { compteOuvert } from '@/lib/compte/session'
import { COMPOSER_HREF, CTA_LABEL } from '../content'
import './magazine.css'

const URL = 'https://www.bellajour.fr/magazine'
const PHOTOS_MIN = BANDES_PHOTOS[0].photosMin
const PHOTOS_MAX = BANDES_PHOTOS[BANDES_PHOTOS.length - 1].photosMax
const FRANCO = FRANCO_CENTIMES / 100
const RELIURE = RELIURE_LIBELLE.dos_carre

const TITLE = 'Le magazine d’un moment de vie · Bellajour'
/* ⚠️ Moins de 155 caractères : au-delà, Google coupe avant le prix. */
const DESCRIPTION =
  `Vous déposez ${PHOTOS_MIN} à ${PHOTOS_MAX} photos, l’atelier compose votre magazine ` +
  'personnalisé, imprimé et livré. Couverture gratuite sous 48 h, ' +
  `vous décidez après. Dès ${EUROS_MIN} €.`

const PARTAGE = visuelPour('partage.image')
const PARTAGE_URL = `https://www.bellajour.fr${PARTAGE.fichier}`

/* Noël s'éteint seul (noelAuSite, fenêtre des exemplaires) : la page,
   statique, se refait au plus tard une heure après minuit. */
export const revalidate = 3600

/* ⚠️ `openGraph` REMPLACE celui du layout : tout est redéclaré. */
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/magazine' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: URL,
    siteName: 'Bellajour',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: PARTAGE_URL, width: 1200, height: 630, alt: PARTAGE.alt }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [PARTAGE_URL] },
}

type Question = { q: string; r: string; lien?: { href: string; label: string } }

/* UNE source pour les <details> ET le FAQPage : Google refuse une question
   déclarée qui n'est pas lisible sur la page. */
function questions(noelExemplaires: boolean): Question[] {
  return [
    {
      q: 'Mate ou brillante ?',
      r: 'À vous de choisir, sans supplément. Le papier intérieur suit : brillant sous la brillante, satiné sous la mate.',
    },
    {
      q: 'Combien de pages aura-t-il ?',
      r: `De ${PAGES_MIN} à ${PAGES_MAX_PUBLIC}, selon vos photos. L’atelier vous l’annonce avec la couverture, avant de payer.`,
    },
    { q: 'Je peux corriger la maquette ?', r: 'Oui, sans frais, avant l’impression. Rien ne part sans votre accord.' },
    {
      q: 'Je peux en commander plusieurs ?',
      r: `Jusqu’à ${QUANTITE_MAX}. ${PHRASE_DEGRESSIF}` + (noelExemplaires ? ` Pour Noël : ${PHRASE_NOEL}` : ''),
    },
    { q: 'Il y a une version numérique ?', r: 'Oui, la version digitale HD est incluse.' },
    {
      q: 'Comment je suis mon numéro ?',
      r: 'Avec le lien reçu par e-mail. Le compte est facultatif.',
      lien: { href: '/compte', label: 'Mon numéro' },
    },
  ]
}

function jsonLd(faq: Question[], image: string) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Numéro Bellajour, le magazine d’un moment de vie',
      description:
        'Magazine photo imprimé, composé par l’atelier à partir de vos photos. ' +
        `Format A4, ${RELIURE}, couverture brillante ou mate au choix, papier intérieur assorti.`,
      brand: { '@type': 'Brand', name: 'Bellajour' },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'EUR',
        lowPrice: String(EUROS_MIN),
        highPrice: String(EUROS_MAX_PUBLIC),
        offerCount: GRILLE_PUBLIQUE.length,
        availability: 'https://schema.org/InStock',
        url: URL,
        areaServed: [...PAYS_LIVRAISON],
      },
      url: URL,
      image: image ? [`https://www.bellajour.fr${image}`] : undefined,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })),
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
}

const NOMS = ['magazine.couverture', 'magazine.eventail-2', 'magazine.eventail-3'] as const

export default async function PageProduit() {
  const noel = lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert && noelAuSite(new Date())
  /* Le jour de Paris, comme le prix (verif-noel lit la ligne du dessus telle quelle). */
  const noelExemplaires = dansFenetreNoel(jourDeParis(new Date()))
  const V = await fichiersVisuels(NOMS)
  const dp = await lireVisuel('magazine.double-page')
  const faq = questions(noelExemplaires)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(faq, V['magazine.couverture'])) }} />
      {noel && <Bandeau />}
      {/* Sur la page produit, la barre mène au questionnaire (invariant nº5 :
          le libellé ne change pas). */}
      <Nav href={COMPOSER_HREF} label={CTA_LABEL} retour="/" compteOuvert={compteOuvert()} />

      <main className="m-banc m-page" aria-label="Le magazine">
        <section className="pg-tete duo2">
          <div className="cadre">
            <div>
              <span className="lab sub rv">Le magazine</span>
              <h1 className="titre rv d1">Un moment de vie, en magazine.</h1>
              <p className="chapo sub rv d2">
                Vous racontez le moment, vous déposez vos photos. L’atelier compose votre magazine, imprimé page à page.
              </p>
              <div className="rv d2">
                <p className="prix-tete">
                  <b>Dès {EUROS_MIN} €</b>
                  <span className="sub">TTC France, hors livraison</span>
                </p>
                <ul className="puces-ligne">
                  <li>
                    {PAGES_MIN} à {PAGES_MAX_PUBLIC} pages
                  </li>
                  <li>
                    {PHOTOS_MIN} à {PHOTOS_MAX} photos
                  </li>
                  <li>Livraison offerte dès {FRANCO} €</li>
                </ul>
                <div className="ctas">
                  <a className="btn" href={COMPOSER_HREF}>
                    {CTA_LABEL}
                  </a>
                </div>
                <div className="rassure sub">
                  <span>Aperçu gratuit sous 48 h</span>
                  <span>Rien à payer avant la couverture</span>
                </div>
              </div>
            </div>
            <div className="eventail rv">
              {NOMS.map((n, i) =>
                V[n] ? (
                  <img
                    key={n}
                    src={V[n]}
                    alt=""
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : undefined}
                    decoding="async"
                  />
                ) : null,
              )}
            </div>
          </div>
        </section>

        {noel && <BlocMagazine />}

        <section className="bloc gestes">
          <div className="cadre">
            <span className="lab sub rv">Le parcours avec l’atelier</span>
            <h2 className="titre rv d1">Trois gestes, depuis le téléphone.</h2>
            <div className="liste">
              <div className="geste rv">
                <span className="n">1</span>
                <div>
                  <h3 className="titre">Vous racontez le moment</h3>
                  <p className="sub">Deux minutes. Vous choisissez même le titre.</p>
                </div>
                <span className="pf">2 min</span>
              </div>
              <div className="geste rv">
                <span className="n">2</span>
                <div>
                  <h3 className="titre">Vous déposez vos photos</h3>
                  <p className="sub">
                    De {PHOTOS_MIN} à {PHOTOS_MAX}, depuis le téléphone.
                  </p>
                </div>
                <span className="pf">
                  {PHOTOS_MIN} à {PHOTOS_MAX}
                </span>
              </div>
              <div className="geste rv">
                <span className="n">3</span>
                <div>
                  <h3 className="titre">Vous recevez votre couverture</h3>
                  <p className="sub">Sous 48 h, gratuitement. Vous décidez après.</p>
                </div>
                <span className="pf">48 h</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bloc fiche">
          <div className="cadre">
            <div>
              <span className="lab sub rv">L’objet</span>
              <h2 className="titre rv d1">Un vrai magazine, pas un tirage.</h2>
              <ul className="specs rv d2">
                <li>
                  <span>Format</span>
                  <span>A4, {RELIURE}</span>
                </li>
                <li>
                  <span>Pages</span>
                  <span>
                    De {PAGES_MIN} à {PAGES_MAX_PUBLIC}, selon vos photos
                  </span>
                </li>
                <li>
                  <span>Couverture</span>
                  <span>Brillante ou mate, sans supplément</span>
                </li>
                <li>
                  <span>Papier</span>
                  <span>Il suit la couverture : brillant ou satiné</span>
                </li>
                <li>
                  <span>Impression</span>
                  <span>En Europe, au plus près de chez vous</span>
                </li>
                <li>
                  <span>Inclus</span>
                  <span>La version digitale HD</span>
                </li>
                <li>
                  <span>Retouches</span>
                  <span>Sur la maquette, sans frais</span>
                </li>
                <li>
                  <span>Livraison</span>
                  <span>Sous {JOURS_LIVRAISON} jours après validation</span>
                </li>
              </ul>
              <p className="note-bas sub rv">Le nombre de pages vous est annoncé avec votre couverture, avant tout paiement.</p>
            </div>
            {dp && dp.fichier ? <img className="rv" src={dp.fichier} alt={dp.alt} loading="lazy" decoding="async" /> : null}
          </div>
        </section>

        <section className="bloc faq">
          <div className="cadre cadre-etroit">
            <span className="lab sub">Questions</span>
            <h2 className="titre">Avant de commencer.</h2>
            {faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p className="sub">
                  {f.r}
                  {f.lien ? (
                    <>
                      {' '}
                      <a href={f.lien.href}>{f.lien.label}</a>
                    </>
                  ) : null}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="bloc appel">
          <div className="cadre">
            <span className="lab sub rv">Vivez. Nous composons.</span>
            <h2 className="titre rv d1">Quel est votre numéro 1 ?</h2>
            <p className="chapo sub rv d2">Premier aperçu gratuit. Votre magazine dès {EUROS_MIN} €.</p>
            <a className="btn rv d2" href={COMPOSER_HREF}>
              {CTA_LABEL}
            </a>
          </div>
        </section>
        <Apparitions racine=".m-banc.m-page" />
      </main>

      <Footer />
    </>
  )
}
