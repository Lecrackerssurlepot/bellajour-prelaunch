/* /edition/[token]/bat — le bon à tirer (PRD §6.2, maquette BAT). Verrouillé
   tant que l'état ne l'ouvre pas : la page relit `verrousPour` comme le menu,
   et une URL tapée à la main affiche la même phrase, jamais une erreur
   (PRD §3.2). `?m=<rang>` choisit le magazine. */

import { notFound } from 'next/navigation'
import { peut } from '@/lib/collectif/droits'
import { etatEffectif } from '@/lib/collectif/etats'
import { phraseBatEfface } from '@/lib/collectif/retention'
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
  if (acces.statut !== 'ok') notFound()
  const { edition, role } = acces
  const etat = etatEffectif(edition.etat, edition.cloture_le, new Date())
  const raison = verrousPour(etat).bat
  if (raison) return <Verrou titre="Bon à tirer" raison={raison} />
  /* T-159 : les pages rendues du bon à tirer sont parties avec les photos (le PDF reste à
     l'atelier, jamais servi au client) : la page le dit au lieu de pages vides. */
  const batEfface = phraseBatEfface(edition.photos_supprimees_le)
  if (batEfface) return <Verrou titre="Bon à tirer" raison={batEfface} />

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
      toursInclus={edition.tours_inclus}
      tu={edition.registre === 'ecole_tu'}
    />
  )
}
