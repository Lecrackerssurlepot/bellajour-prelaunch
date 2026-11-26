/* /offrir : acheter une carte cadeau (Noël 2026, lot 2), charte V2 (26/11).
   Derrière le drapeau `NEXT_PUBLIC_GIFT_CARD_ENABLED` (404 sans lui), et
   noindex tant que Mathias n'a pas ouvert Noël sur le vrai site.

   Structure du duplicata validé (« essai photo duplicata », page Offrir) :
   la tête, la carte qui suit la saisie et le récit en trois temps (Achat,
   INCHANGÉ côté logique : /api/cartes/checkout puis Stripe), le bloc de
   Noël en nuit (il vivait sur /magazine), « La carte, en clair. ».
   Les conditions ne disent que ce que le code FAIT (carteCadeau.ts,
   carteServeur.ts, CGV 4bis.12) ; `#conditions` reste la cible des mails. */

import type { Metadata } from 'next'
import type React from 'react'
import { notFound } from 'next/navigation'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import Bandeau from '../noel/Bandeau'
import BlocOffrir from '../noel/BlocOffrir'
import Apparitions from '@/components/Apparitions'
import { lireVisuel } from '@/components/Visuel'
import { lireInterrupteur } from '@/lib/collectif/interrupteur'
import { noelAuSite } from '@/lib/atelier/carteCadeau'
import { compteOuvert } from '@/lib/compte/session'
import { COMPOSER_HREF, CTA_LABEL } from '../content'
import Achat from './Achat'
import './carte.css'
import '../magazine/magazine.css'
import './offrir.css'

/* Le visuel du jour et Noël qui s'éteint seul le 26/12 (verif-noel). */
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Offrir une carte cadeau · Bellajour',
  robots: { index: false, follow: false },
}

export default async function OffrirPage() {
  const ouvert = lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert
  if (!ouvert) notFound()
  const noel = lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert && noelAuSite(new Date())
  const carte = await lireVisuel('offrir.carte')
  const couvertures = (await Promise.all([lireVisuel('offrir.noel-1'), lireVisuel('offrir.noel-2')]))
    .filter((v): v is NonNullable<typeof v> => !!v && !!v.fichier)
    .map((v) => ({ fichier: v.fichier, alt: v.alt }))

  return (
    <>
      {noel && <Bandeau />}
      <Nav href={COMPOSER_HREF} label={CTA_LABEL} retour="/" compteOuvert={compteOuvert()} />
      <main className="m-banc m-offrir" aria-label="Offrir">
        <section className="pg-tete">
          <div className="cadre">
            <span className="lab sub rv">Offrir</span>
            <h1 className="titre rv d1">Offrez-lui un magazine.</h1>
            <p className="chapo sub rv d2">Une carte cadeau du montant de votre choix. Il choisit ses photos, nous composons.</p>
          </div>
        </section>

        {/* La couverture qui dépasse de la carte : l'emplacement `offrir.carte` (offrir.css). */}
        <section className="offre" style={carte?.fichier ? ({ '--carte-visuel': `url(${carte.fichier})` } as React.CSSProperties) : undefined}>
          <div className="cadre nl-preview">
            <Achat />
          </div>
        </section>

        {noel && <BlocOffrir couvertures={couvertures} />}

        <section id="conditions" className="bloc savoir" aria-labelledby="conditions-titre">
          <div className="cadre">
            <span className="lab sub rv">Bon à savoir</span>
            <h2 id="conditions-titre" className="titre rv d1">La carte, en clair.</h2>
            <dl className="bon rv d2">
              <div><dt>Validité</dt><dd>12 mois à partir de l&apos;achat.</dd></div>
              <div><dt>Montant</dt><dd>30 €, 50 €, ou de 20 à 200 €.</dd></div>
              <div><dt>Envoi</dt><dd>Par e-mail tout de suite, ou au matin du jour choisi, jusqu&apos;au 24 décembre. Ou à imprimer.</dd></div>
              <div><dt>Au paiement</dt><dd>Le bouton du mail applique le code. Sinon : « J&apos;ai une carte cadeau ». Une carte par commande.</dd></div>
              <div><dt>Ce qu&apos;elle paie</dt><dd>Le magazine, puis la livraison.</dd></div>
              <div><dt>Le reste</dt><dd>Sur le compte Bellajour, à la même adresse e-mail, jusqu&apos;à la fin de la carte. Il se déduit tout seul au numéro suivant.</dd></div>
              <div><dt>Pour Noël</dt><dd>Photos reçues avant le lundi 7 décembre.</dd></div>
            </dl>
          </div>
        </section>
        <Apparitions racine=".m-banc.m-offrir" />
      </main>
      <Footer />
    </>
  )
}
