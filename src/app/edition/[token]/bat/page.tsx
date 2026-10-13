/* /edition/[token]/bat — (phase 5, T-144). Verrouillée tant que l'état ne l'ouvre
   pas : la page relit `verrousPour` comme le menu, et une URL tapée à la
   main affiche la même phrase, jamais une erreur (PRD §3.2). */

import { notFound } from 'next/navigation'
import { etatEffectif } from '@/lib/collectif/etats'
import { verrousPour } from '@/lib/collectif/verrous'
import { AVenir, Verrou } from '../../_composants/EnPreparation'
import { chargerEspace } from '../donnees'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const acces = await chargerEspace((await params).token)
  if (acces.statut !== 'ok') notFound()
  const { edition } = acces
  const raison = verrousPour(etatEffectif(edition.etat, edition.cloture_le, new Date())).bat
  if (raison) return <Verrou titre="Bon à tirer" raison={raison} />
  return <AVenir titre="Bon à tirer" texte="Le bon à tirer se relit ici, page par page." />
}
