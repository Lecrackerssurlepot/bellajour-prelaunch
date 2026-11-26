/* /carte/<token> : la carte cadeau à imprimer (Noël 2026, lot 2).
   Le token (32 caractères) EST l'accès, comme /numero/<token> : jamais
   indexée, jamais en cache partagé. Lue côté serveur par la service key. */

import type { Metadata } from 'next'
import type React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { makeSupabase } from '@/lib/supabase'
import { carteParToken } from '@/lib/atelier/carteServeur'
import Carte from '../../offrir/Carte'
import { PHRASES } from '../../noel-preview/contenu'
import Imprimer from './Imprimer'
import { lireVisuel } from '@/components/Visuel'
import '../../magazine/magazine.css'
import '../../offrir/carte.css'
import '../../offrir/retour.css'

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
  /* La couverture qui dépasse de la carte : le même emplacement que /offrir. */
  const visuel = await lireVisuel('offrir.carte')
  return (
    <main className="m-banc m-retour" style={visuel?.fichier ? ({ '--carte-visuel': `url(${visuel.fichier})` } as React.CSSProperties) : undefined}>
      <Link className="rt-logo nl-imprimer-non" href="/" aria-label="Bellajour, accueil"><span className="m-logo" /></Link>
      <div className="rt-corps">
        <div className="rt-carte">
          <Carte
            phrase={PHRASES[0]}
            montant={`${carte.montant_centimes / 100} €`}
            prenom={carte.destinataire_prenom}
            message={carte.message ?? ''}
            code={carte.code}
            validite={validiteLisible(carte.expire_le)}
          />
        </div>
        {annulee ? (
          <p className="rt-erreur" role="status">Cette carte a été annulée.</p>
        ) : (
          <>
            <p className="rt-note nl-imprimer-non">À utiliser sur bellajour.fr, au moment de payer son magazine.</p>
            <Imprimer />
          </>
        )}
      </div>
    </main>
  )
}
