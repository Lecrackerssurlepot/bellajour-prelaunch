/* /carte/<token> : la carte cadeau à imprimer (Noël 2026, lot 2).
   Le token (32 caractères) EST l'accès, comme /numero/<token> : jamais
   indexée, jamais en cache partagé. Lue côté serveur par la service key. */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { makeSupabase } from '@/lib/supabase'
import { carteParToken } from '@/lib/atelier/carteServeur'
import CarteCadeau from '../../noel-preview/CarteCadeau'
import { PHRASES } from '../../noel-preview/contenu'
import Imprimer from './Imprimer'
import '../../noel-preview/noel.css'
import '../../offrir/offrir.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Votre carte cadeau · Bellajour',
  robots: { index: false, follow: false },
}

function validiteLisible(iso: string): string {
  return `Valable jusqu’au ${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })}`
}

export default async function CartePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const carte = await carteParToken(makeSupabase(), token)
  if (!carte) notFound()
  const annulee = carte.statut === 'remboursee'
  return (
    <main className="nl-preview nl-page">
      <Link className="nl-page-marque nl-imprimer-non" href="/"><img src="/images/v2/ui/signature-bellajour-240.webp" alt="Bellajour" width={240} height={92} /></Link>
      <div className="nl-merci">
        <div className="nl-recit-carte">
          <CarteCadeau
            phrase={PHRASES[0]}
            montant={`${carte.montant_centimes / 100} €`}
            prenom={carte.destinataire_prenom}
            message={carte.message ?? ''}
            entree={false}
            code={carte.code}
            validite={validiteLisible(carte.expire_le)}
          />
        </div>
        {annulee ? (
          <p className="nl-erreur">Cette carte a été annulée.</p>
        ) : (
          <>
            <p className="nl-faible nl-imprimer-non">À utiliser sur bellajour.fr, au moment de payer son magazine.</p>
            <Imprimer />
          </>
        )}
      </div>
    </main>
  )
}
