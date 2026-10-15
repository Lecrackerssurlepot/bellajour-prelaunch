/* /edition/[token]/bat — le bon à tirer (PRD §6.2, maquette BAT). Verrouillé
   tant que l'état ne l'ouvre pas : la page relit `verrousPour` comme le menu,
   et une URL tapée à la main affiche la même phrase, jamais une erreur
   (PRD §3.2). `?m=<rang>` choisit le magazine. */

import { notFound } from 'next/navigation'
import { peut } from '@/lib/collectif/droits'
import { etatEffectif } from '@/lib/collectif/etats'
import { verrousPour } from '@/lib/collectif/verrous'
import { Verrou } from '../../_composants/EnPreparation'
import { chargerBat, chargerEspace } from '../donnees'
import Liseuse from './Liseuse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ m?: string }>
}) {
  const { token } = await params
  const acces = await chargerEspace(token)
  /* Appareil inconnu (T-154) : la coquille montre l'écran du code, la page ne rend rien. */
  if (acces.statut === 'appareil_inconnu') return null
  if (acces.statut !== 'ok') notFound()
  const { edition, role } = acces
  const etat = etatEffectif(edition.etat, edition.cloture_le, new Date())
  const raison = verrousPour(etat).bat
  if (raison) return <Verrou titre="Bon à tirer" raison={raison} />

  const m = Number((await searchParams).m)
  const bat = await chargerBat(edition, Number.isInteger(m) ? m : null)
  if (!bat.magazine) return <Verrou titre="Bon à tirer" raison="Aucun magazine dans cette édition." />

  return (
    <Liseuse
      key={bat.magazine.id}
      token={token}
      bat={bat}
      ecrire={peut(role, 'poser_note') && etat === 'bat'}
      lectureSeule={!peut(role, 'poser_note')}
      tirage={edition.tirage}
      responsable={edition.responsable_nom}
      tu={edition.registre === 'ecole_tu'}
    />
  )
}
