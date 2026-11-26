/* /offrir/merci : le retour du paiement de la carte (lot 2).

   Elle ENREGISTRE la carte si le webhook n'est pas encore passé (ou ne
   passera pas : la prévisualisation ne reçoit pas forcément les webhooks de
   test). Rien n'est cru de l'adresse : la session est relue chez Stripe, et
   `enregistrerCarte` est idempotente (un seul enregistrement par session). */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Stripe from 'stripe'
import { lireInterrupteur } from '@/lib/collectif/interrupteur'
import { makeSupabase } from '@/lib/supabase'
import { enregistrerCarte, type CarteLigne } from '@/lib/atelier/carteServeur'
import { dansFenetreNoel, NOEL_REMISE_AUTRE_PCT, NOEL_REMISE_MEME_PCT } from '@/lib/atelier/exemplaires'
import Carte from '../Carte'
import VueMerci from './VueMerci'
import { lireVisuel } from '@/components/Visuel'
import { PHRASES, TEXTES } from '../../noel-preview/contenu'
import '../../magazine/magazine.css'
import '../carte.css'
import '../retour.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Votre carte est prête · Bellajour',
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

  const visuel = await lireVisuel('offrir.carte')
  const couverture = visuel?.fichier ?? null

  if (carte === 'attente') {
    return <VueMerci couverture={couverture} attente />
  }

  const quoi =
    carte.remise === 'imprimer'
      ? 'Imprimez-la, glissez-la sous le sapin.'
      : carte.envoi_le
        ? `Elle partira chez ${carte.destinataire_prenom} le ${jour(carte.envoi_le)} au matin.`
        : carte.envoyee_le
          ? `Elle est partie chez ${carte.destinataire_prenom}.`
          : `${carte.destinataire_prenom} la reçoit par e-mail.`

  const fenetre = dansFenetreNoel(new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }))

  return (
    <VueMerci
      couverture={couverture}
      titre={TEXTES.sobre.apresAchat}
      quoi={quoi}
      essai={!carte.livemode}
      imprimerLabel={carte.remise === 'imprimer' ? 'Imprimer la carte' : 'Imprimer aussi'}
      lienCarte={`/carte/${carte.token}`}
      pourVous={
        fenetre ? (
          <>Composez votre magazine. Le 2<sup>e</sup> à −{NOEL_REMISE_MEME_PCT}&nbsp;%, −{NOEL_REMISE_AUTRE_PCT}&nbsp;% avec une autre couverture, jusqu&apos;au 7 décembre, en France.</>
        ) : (
          <>Vos photos, notre atelier, votre magazine.</>
        )
      }
    >
      <Carte
        phrase={PHRASES[0]}
        montant={`${carte.montant_centimes / 100} €`}
        prenom={carte.destinataire_prenom}
        message={carte.message ?? ''}
        code={carte.code}
        validite={`Valable jusqu’au ${new Date(carte.expire_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })}`}
      />
    </VueMerci>
  )
}
