import type { Metadata } from 'next'
import Stripe from 'stripe'
import { makeSupabase } from '@/lib/supabase'
import Nav from '../(atelier)/components/Nav'
import Footer from '../(atelier)/components/Footer'
import { COMPOSER_HREF, CTA_LABEL } from '../(atelier)/content'
import { compteOuvert } from '@/lib/compte/session'
import MerciVue, { type EtatMerci } from './MerciVue'
import '../(atelier)/theme.css'
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
  title: 'Merci · Bellajour',
  description: 'Votre pré-commande Bellajour est confirmée.',
  robots: { index: false, follow: false },
}

async function resolveState(sessionId: string | undefined): Promise<EtatMerci> {
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
  } catch (err) {
    /* T-012 — deux cas se cachaient ici sans un mot : un session_id bidon
       (absence, normal) et une panne Stripe qui montre « lien invalide » à
       quelqu'un qui vient de PAYER. L'écran ne change pas, le log distingue. */
    console.error('[merci] lecture session Stripe échouée', (err as Error)?.message)
    return { kind: 'invalid' }
  }
  if (!email) return { kind: 'invalid' }

  // 2. Lire la ligne waitlist (service role). status="confirmed" = vérité paiement.
  let supabase
  try {
    supabase = makeSupabase()
  } catch (err) {
    console.error('[merci] makeSupabase échec', (err as Error)?.message)
    return { kind: 'invalid' }
  }

  const { data: row, error } = await supabase
    .from('waitlist')
    .select('status, ref_code, prenom, numero_fondateur, offer_type')
    .eq('email', email)
    .maybeSingle()

  /* Panne ≠ absence (T-043) : l'écran rend « invalid » dans les deux cas
     (inchangé), mais seule la panne se logge — une ligne introuvable est
     une réponse, pas un incident. */
  if (error) console.error('[merci] lecture waitlist échouée', error.code)
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
    /* Charte V2 (26/11) : la barre et le pied du site, comme les pages légales.
       `.bj-atelier` porte leur scope (cette route est hors du groupe (atelier)).
       Pas de bandeau : c'est un écran du parcours client (fiche H). Le code qui
       lit Stripe et la base ne change pas, seul l'habit. */
    <div className="bj-atelier">
      <Nav href={COMPOSER_HREF} label={CTA_LABEL} retour="/" compteOuvert={compteOuvert()} />
      <main>
        <MerciVue state={state} attempt={attempt} />
      </main>
      <Footer />
    </div>
  )
}
