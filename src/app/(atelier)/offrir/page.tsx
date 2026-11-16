/* /offrir : acheter une carte cadeau (Noël 2026, lot 2).
   Derrière le drapeau `NEXT_PUBLIC_GIFT_CARD_ENABLED` (404 sans lui), et
   noindex tant que Mathias n'a pas ouvert Noël sur le vrai site. */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { lireInterrupteur } from '@/lib/collectif/interrupteur'
import Achat from './Achat'
import '../noel-preview/noel.css'
import './offrir.css'

export const metadata: Metadata = {
  title: 'Offrir une carte cadeau — Bellajour',
  robots: { index: false, follow: false },
}

export default function OffrirPage() {
  if (!lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert) notFound()
  return (
    <main className="nl-preview nl-page">
      <Link className="nl-page-marque" href="/"><img src="/images/v2/ui/signature-bellajour-240.webp" alt="Bellajour" width={240} height={92} /></Link>
      <Achat />
      {/* « Toutes les conditions » des mails de Noël mène ici (#conditions).
          Uniquement ce que le code FAIT (carteCadeau.ts, carteServeur.ts),
          comme l'article 4bis.12 des CGV v4.1 (16/11, accord de Mathias). */}
      <section id="conditions" className="nl-conditions" aria-labelledby="nl-conditions-titre">
        <h2 id="nl-conditions-titre">Bon à savoir</h2>
        <dl>
          <div><dt>Validité</dt><dd>12 mois à partir de l&apos;achat.</dd></div>
          <div><dt>Montant</dt><dd>30 €, 50 €, ou de 20 à 200 €.</dd></div>
          <div><dt>Envoi</dt><dd>Par e-mail tout de suite, ou au matin du jour choisi, jusqu&apos;au 24 décembre. Ou à imprimer.</dd></div>
          <div><dt>Au paiement</dt><dd>Le bouton du mail applique le code. Sinon : « J&apos;ai une carte cadeau ». Une carte par commande.</dd></div>
          <div><dt>Ce qu&apos;elle paie</dt><dd>Le magazine, puis la livraison.</dd></div>
          <div><dt>Le reste</dt><dd>Sur le compte Bellajour, à la même adresse e-mail, jusqu&apos;à la fin de la carte. Il se déduit tout seul au numéro suivant.</dd></div>
          <div><dt>Pour Noël</dt><dd>Photos reçues avant le lundi 7 décembre.</dd></div>
        </dl>
      </section>
    </main>
  )
}
