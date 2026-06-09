import type { Metadata } from 'next'
import Stripe from 'stripe'
import { makeSupabase } from '@/lib/supabase'
import Navbar from '../preventes/Navbar'
import Footer from '../sections/Footer'
import MerciReferral from './MerciReferral'
import MerciPendingRefresh from './MerciPendingRefresh'
import './merci.css'

/* Route /merci — page de confirmation post-paiement prévente.
   Atterrissage depuis success_url Stripe (api/checkout/route.ts:225).

   Lecture 100% SERVEUR : la clé secrète Stripe ne quitte jamais le serveur.
   SOURCE DE VÉRITÉ = Supabase (status="confirmed" posé par le webhook), jamais
   l'URL. La page ne GÉNÈRE rien : le ref_code existe déjà (posé au checkout),
   on le LIT. Recharger = relire la même ligne → idempotent, zéro doublon. */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Merci — Bellajour',
  description: 'Votre pré-commande Bellajour est confirmée.',
  robots: { index: false, follow: false },
}

type MerciState =
  | { kind: 'invalid' }
  | { kind: 'pending' }
  | { kind: 'confirmed'; refCode: string; prenom: string | null; numeroFondateur: number | null }

async function resolveState(sessionId: string | undefined): Promise<MerciState> {
  if (!sessionId) return { kind: 'invalid' }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return { kind: 'invalid' }

  // 1. Lire la session Stripe côté serveur pour remonter à l'email client.
  let email = ''
  try {
    const stripe = new Stripe(stripeKey)
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    email = (
      session.metadata?.email ||
      session.customer_email ||
      session.client_reference_id ||
      ''
    )
      .trim()
      .toLowerCase()
  } catch {
    return { kind: 'invalid' }
  }
  if (!email) return { kind: 'invalid' }

  // 2. Lire la ligne waitlist (service role). status="confirmed" = vérité paiement.
  let supabase
  try {
    supabase = makeSupabase()
  } catch {
    return { kind: 'invalid' }
  }

  const { data: row, error } = await supabase
    .from('waitlist')
    .select('status, ref_code, prenom, numero_fondateur, offer_type')
    .eq('email', email)
    .maybeSingle()

  if (error || !row || !row.ref_code) return { kind: 'invalid' }
  if (row.status !== 'confirmed') return { kind: 'pending' }

  return {
    kind: 'confirmed',
    refCode: row.ref_code as string,
    prenom: (row.prenom as string | null) ?? null,
    numeroFondateur:
      row.offer_type === 'founder' ? ((row.numero_fondateur as number | null) ?? null) : null,
  }
}

export default async function MerciPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const rawSession = params.session_id
  const sessionId = Array.isArray(rawSession) ? rawSession[0] : rawSession
  const rawTry = params.try
  const tryStr = Array.isArray(rawTry) ? rawTry[0] : rawTry
  const attempt = Number.parseInt(tryStr ?? '0', 10) || 0

  const state = await resolveState(sessionId)

  return (
    <main>
      <Navbar />
      <section className="merci">
        <div className="merci-inner">
          {state.kind === 'confirmed' && (
            <>
              <p className="merci-eyebrow">Paiement confirmé</p>
              <h1 className="merci-title">
                {state.prenom ? `Merci, ${state.prenom}.` : 'Merci.'}
              </h1>
              {state.numeroFondateur != null && (
                <p className="merci-founder">
                  Vous êtes le Fondateur n°{state.numeroFondateur}.
                </p>
              )}
              <p className="merci-lede">
                Votre pré-commande est enregistrée. Vous allez recevoir votre e-mail de confirmation
                dans quelques instants.
              </p>
              <MerciReferral refCode={state.refCode} />
            </>
          )}

          {state.kind === 'pending' && (
            <>
              <p className="merci-eyebrow">Paiement reçu</p>
              <h1 className="merci-title">Un instant…</h1>
              <p className="merci-lede">Nous finalisons la confirmation de votre pré-commande.</p>
              <MerciPendingRefresh attempt={attempt} />
            </>
          )}

          {state.kind === 'invalid' && (
            <>
              <h1 className="merci-title">Merci pour votre confiance.</h1>
              <p className="merci-lede">
                Nous n&rsquo;avons pas pu afficher le détail de votre pré-commande ici. Si vous venez
                de régler votre acompte, votre e-mail de confirmation vous parviendra sous peu.
              </p>
              <a className="merci-back" href="/preventes">
                Retour aux préventes
              </a>
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  )
}
