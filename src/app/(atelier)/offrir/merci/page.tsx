/* /offrir/merci : le retour du paiement de la carte (lot 2).

   Elle ENREGISTRE la carte si le webhook n'est pas encore passé (ou ne
   passera pas : la prévisualisation ne reçoit pas forcément les webhooks de
   test). Rien n'est cru de l'adresse : la session est relue chez Stripe, et
   `enregistrerCarte` est idempotente (un seul enregistrement par session). */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Stripe from 'stripe'
import { lireInterrupteur } from '@/lib/collectif/interrupteur'
import { makeSupabase } from '@/lib/supabase'
import { enregistrerCarte, type CarteLigne } from '@/lib/atelier/carteServeur'
import CarteCadeau from '../../noel-preview/CarteCadeau'
import { PHRASES, TEXTES } from '../../noel-preview/contenu'
import '../../noel-preview/noel.css'
import '../offrir.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Votre carte est prête — Bellajour',
  robots: { index: false, follow: false },
}

const FORME_SESSION = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/

async function carteDeLaSession(sessionId: string): Promise<CarteLigne | 'attente' | null> {
  const cle = process.env.STRIPE_SECRET_KEY
  if (!cle) return null
  let session: Stripe.Checkout.Session
  try {
    session = await new Stripe(cle).checkout.sessions.retrieve(sessionId)
  } catch {
    return null
  }
  if (session.metadata?.kind !== 'carte_cadeau') return null
  if (session.payment_status !== 'paid') return 'attente'
  const r = await enregistrerCarte(makeSupabase(), session)
  return r.carte ?? (r.erreur ? 'attente' : null)
}

function jour(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })
}

export default async function MerciPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  if (!lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert) notFound()
  const { session_id: sessionId } = await searchParams
  if (!sessionId || !FORME_SESSION.test(sessionId)) notFound()
  const carte = await carteDeLaSession(sessionId)
  if (!carte) notFound()

  if (carte === 'attente') {
    return (
      <main className="nl-preview nl-page">
        <Link className="nl-page-marque" href="/"><img src="/images/v2/ui/signature-bellajour-240.webp" alt="Bellajour" width={240} height={92} /></Link>
        <div className="nl-merci">
          <h1 className="nl-recit-titre">Paiement en cours.</h1>
          <p className="nl-faible">Rechargez cette page dans un instant. Votre carte arrive aussi par e-mail.</p>
        </div>
      </main>
    )
  }

  const quoi =
    carte.remise === 'imprimer'
      ? 'Imprimez-la, glissez-la sous le sapin.'
      : carte.envoi_le
        ? `Elle partira chez ${carte.destinataire_prenom} le ${jour(carte.envoi_le)} au matin.`
        : carte.envoyee_le
          ? `Elle est partie chez ${carte.destinataire_prenom}.`
          : `${carte.destinataire_prenom} la reçoit par e-mail.`

  return (
    <main className="nl-preview nl-page">
      <Link className="nl-page-marque" href="/"><img src="/images/v2/ui/signature-bellajour-240.webp" alt="Bellajour" width={240} height={92} /></Link>
      <div className="nl-merci">
        <h1 className="nl-recit-titre">{TEXTES.sobre.apresAchat}</h1>
        <div className="nl-recit-carte">
          <CarteCadeau
            phrase={PHRASES[0]}
            montant={`${carte.montant_centimes / 100} €`}
            prenom={carte.destinataire_prenom}
            message={carte.message ?? ''}
            entree={false}
            code={carte.code}
            validite={`Valable jusqu’au ${new Date(carte.expire_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })}`}
          />
        </div>
        <p className="nl-section-sous">{quoi}</p>
        {!carte.livemode && <p className="nl-faible">Paiement de test : cette carte ne vaut rien en vrai.</p>}
        <div className="nl-merci-actions">
          <a className="nl-suivant" href={`/carte/${carte.token}`}>
            {carte.remise === 'imprimer' ? 'Imprimer la carte' : 'Imprimer aussi'}
          </a>
        </div>
      </div>
    </main>
  )
}
