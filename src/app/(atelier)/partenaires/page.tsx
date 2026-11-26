/* /partenaires : « Pour les groupes », charte V2 (26/11/2026).
   Port de la page Groupes du duplicata validé (« essai photo duplicata ») :
   la brochure écoles DEVENUE PAGE (retour de Mathias du 26/11 : « tu m'as
   juste enregistré le PDF alors qu'on avait créé la page »). La brochure
   PDF reste à un clic (« La brochure »).

   Les mots viennent du duplicata, lui-même tiré de la brochure : rien n'est
   promis ici qu'elle ne dise déjà. Les images passent par la librairie
   (`groupes.*`, media.ts) ; `groupes.entreprise` peut rester vide.

   Le rendez-vous est INCHANGÉ : les boutons ouvrent le panneau des créneaux
   (Partenaires.tsx, routes /api/partenaires/*, lib/collectif/prospects.ts). */

import type { Metadata } from 'next'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import Bandeau from '../noel/Bandeau'
import { lireInterrupteur } from '@/lib/collectif/interrupteur'
import { noelAuSite } from '@/lib/atelier/carteCadeau'
import Apparitions from '@/components/Apparitions'
import { lireVisuel } from '@/components/Visuel'
import { compteOuvert } from '@/lib/compte/session'
import type { NomEmplacement } from '@/content/media'
import { COMPOSER_HREF, CTA_LABEL } from '../content'
import PanneauRendezVous, { BoutonRendezVous } from './Partenaires'
import '../magazine/magazine.css'
import './partenaires.css'
import './groupes.css'

/* Les visuels du jour (librairie). */
export const revalidate = 300

const TITLE = 'Bellajour pour les écoles et les associations'
const DESCRIPTION =
  'Le WEI, les événements d’association, la fin d’année : dans notre atelier, nous composons un vrai magazine pour chacun de ces moments. La brochure, et un premier échange.'

const APERCU = { url: 'https://www.bellajour.fr/images/partenaires/apercu-partenaires-v1.jpg', width: 1200, height: 630, alt: 'Les magazines Bellajour étalés sur une table, sous la signature Bellajour.' }

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/partenaires' },
  /* L'aperçu du lien (18/11) : adresse ABSOLUE, nom versionné, bloc entier. */
  openGraph: { type: 'website', locale: 'fr_FR', url: 'https://www.bellajour.fr/partenaires', siteName: 'Bellajour', title: TITLE, description: DESCRIPTION, images: [APERCU] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [APERCU.url] },
}

const PDF = '/partenaires/bellajour-brochure-ecoles.pdf'
const CONTACT = 'contact@bellajour.com'

const NUMEROS: readonly NomEmplacement[] = ['groupes.numero-1', 'groupes.numero-2', 'groupes.numero-3', 'groupes.numero-4', 'groupes.numero-5', 'groupes.numero-6', 'groupes.numero-7']

type Cas = {
  n: string
  titre: string
  phrase: string
  doubles: readonly NomEmplacement[]
  usages: { titre: string; phrase: string }[]
  inverse?: boolean
}

const CAS: Cas[] = [
  {
    n: '01',
    titre: 'Week-end d’intégration',
    phrase: 'Trois jours, une promo, un seul magazine.',
    doubles: ['groupes.wei-1', 'groupes.wei-2'],
    usages: [
      { titre: 'Garder la trace d’un événement', phrase: 'Un WEI, un gala, un voyage.' },
      { titre: 'Offrir un souvenir', phrase: 'Un exemplaire à chaque participant.' },
    ],
  },
  {
    n: '02',
    titre: 'Voyage au ski',
    phrase: 'Une semaine là-haut, racontée page après page.',
    doubles: ['groupes.ski-1', 'groupes.ski-2'],
    usages: [
      { titre: 'Valoriser votre association', phrase: 'Auprès des sponsors, de l’école, des futures promos.' },
      { titre: 'Marquer une fin de parcours', phrase: 'Les diplômés, la fin de mandat d’un bureau.' },
    ],
    inverse: true,
  },
  {
    n: '03',
    titre: 'Une année d’équipe',
    phrase: 'Un séminaire, un lancement, une fin d’année.',
    doubles: ['groupes.entreprise'],
    usages: [
      { titre: 'Remercier une équipe', phrase: 'Un exemplaire à chaque collaborateur.' },
      { titre: 'Marquer une étape', phrase: 'Un lancement, un anniversaire, un départ.' },
    ],
  },
]

const ETAPES = [
  { titre: 'Le brief', phrase: '15 minutes pour comprendre votre besoin, puis une proposition chiffrée.' },
  { titre: 'La collecte', phrase: 'L’atelier récupère vos photos.' },
  { titre: 'La composition', phrase: 'Selon ce que nous avons défini ensemble, validée par vous avant impression.' },
  { titre: 'La livraison', phrase: 'Tous les exemplaires en une fois.' },
]

type Image = { fichier: string; alt: string }

async function images(noms: readonly NomEmplacement[]): Promise<Image[]> {
  const lus = await Promise.all(noms.map((n) => lireVisuel(n)))
  return lus.flatMap((v) => (v && v.fichier ? [{ fichier: v.fichier, alt: v.alt ?? '' }] : []))
}

export default async function PagePartenaires() {
  const numeros = await images(NUMEROS)
  const doubles = await Promise.all(CAS.map((c) => images(c.doubles)))
  /* Le bandeau de Noël sur toutes les pages hors tunnel (duplicata, fiche H). */
  const noel = lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert && noelAuSite(new Date())

  return (
    <>
      {noel && <Bandeau />}
      <Nav href={COMPOSER_HREF} label={CTA_LABEL} retour="/" compteOuvert={compteOuvert()} />
      <main className="m-banc m-groupes" aria-label="Pour les groupes">
        <section className="pg-tete duo2 grp-ouv">
          <div className="cadre">
            <div className="grp-ouv-txt">
              <span className="lab sub rv">Écoles, associations, entreprises</span>
              <h1 className="titre rv d1">Vos événements, imprimés en magazine.</h1>
              <p className="chapo sub rv d2">
                Une promo, une association, une équipe. Le WEI, le séminaire, la fin d’année : nous composons un vrai magazine pour chacun de ces moments.
              </p>
              <div className="ctas rv d2">
                <BoutonRendezVous className="btn">Prendre rendez-vous</BoutonRendezVous>
                <a className="lien" href={PDF} target="_blank" rel="noopener">La brochure</a>
              </div>
            </div>
            <div className="pile-grp rv" aria-hidden="true">
              {numeros.slice(0, 4).map((v) => (
                <img key={v.fichier} src={v.fichier} alt="" decoding="async" />
              ))}
            </div>
          </div>
        </section>

        <section className="bloc recit">
          <div className="cadre">
            <div className="recit-tete">
              <span className="lab sub rv">L’atelier</span>
              <h2 className="titre rv d1">Vous vivez l’événement. Nous en faisons un récit.</h2>
              <p className="chapo sub rv d2">
                Après chaque événement, nous reprenons vos photos, nous choisissons les plus justes, nous écrivons le récit. Et nous composons un magazine comme on édite un numéro : avec un regard, un rythme, une couverture.
              </p>
            </div>
            <div className="numeros">
              <span className="lab sub numeros-lab">Nos derniers numéros</span>
              {numeros.map((v) => (
                <img key={v.fichier} src={v.fichier} alt={v.alt} loading="lazy" decoding="async" />
              ))}
              <BoutonRendezVous className="vide">
                <span className="titre">Votre numéro</span>
                <span className="lab">À composer</span>
              </BoutonRendezVous>
            </div>
          </div>
        </section>

        <section className="bloc cas">
          <div className="cadre">
            <div className="cas-tete">
              <span className="lab sub rv">Une composition sur mesure</span>
              <h2 className="titre rv d1">Chaque événement a son numéro.</h2>
            </div>
            {CAS.map((c, i) => (
              <article key={c.n} className={c.inverse ? 'cas-1 inverse' : 'cas-1'}>
                <div className="cas-txt rv">
                  <span className="cas-n">{c.n}</span>
                  <h3 className="titre">{c.titre}</h3>
                  <p className="sub">{c.phrase}</p>
                </div>
                <div className="doubles">
                  {doubles[i].length > 0 ? (
                    doubles[i].map((v, j) => (
                      <img key={v.fichier} className={j ? 'dp dp2' : 'dp'} src={v.fichier} alt={v.alt} loading="lazy" decoding="async" />
                    ))
                  ) : (
                    <div className="dp a-venir">Visuel à venir</div>
                  )}
                </div>
                <div className="usages rv">
                  {c.usages.map((u) => (
                    <div key={u.titre}>
                      <b>{u.titre}</b>
                      <span className="sub">{u.phrase}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bloc etapes-grp">
          <div className="cadre">
            <span className="lab sub rv">De l’appel à la livraison</span>
            <h2 className="titre rv d1">Quatre étapes.</h2>
            <div className="quatre">
              <i className="q-ligne" aria-hidden="true" />
              {ETAPES.map((e, i) => (
                <div key={e.titre} className={i ? `rv d${i}` : 'rv'}>
                  <b>{e.titre}</b>
                  <p className="sub">{e.phrase}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bloc rdv-bloc" id="rdv">
          <div className="cadre">
            <div className="rdv rv">
              <div>
                <span className="lab sub">Un premier échange</span>
                <h2 className="titre">Parlons de votre événement.</h2>
                <p className="sub rdv-phrase">15 minutes en visio, sans engagement. Heure de Paris.</p>
                <p className="sign-fond">Mathias et Louis, fondateurs de l’atelier</p>
              </div>
              <div className="rdv-actions">
                <BoutonRendezVous className="btn">Voir les créneaux</BoutonRendezVous>
                <a className="lien" href={`mailto:${CONTACT}`}>{CONTACT}</a>
              </div>
            </div>
          </div>
        </section>
        <Apparitions racine=".m-banc.m-groupes" />
      </main>
      <Footer />
      <PanneauRendezVous contact={CONTACT} />
    </>
  )
}
