/* /edition/[token]/style — le mur des styles (PRD §4.2, maquette Styles).
   `?m=<rang>` ouvre directement le brief d'un magazine (retour depuis la page
   d'un style). */

import { notFound } from 'next/navigation'
import { briefModifiable } from '@/lib/collectif/brief'
import { peut } from '@/lib/collectif/droits'
import { etatEffectif } from '@/lib/collectif/etats'
import { chargerEspace, chargerMur } from '../donnees'
import Mur from './Mur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageStyle({
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
  const { styles, magazines } = await chargerMur(edition)
  const m = Number((await searchParams).m)
  const rang = magazines.some((x) => x.rang === m) ? m : magazines.find((x) => !x.brief_valide_le)?.rang ?? magazines[0]?.rang ?? 1

  return (
    <Mur
      token={token}
      styles={styles}
      magazines={magazines}
      rangInitial={rang}
      ecrire={peut(role, 'choisir_style')}
      fige={!briefModifiable(etatEffectif(edition.etat, edition.cloture_le, new Date()))}
      aimeesMax={edition.couvertures_aimees_max}
      tu={edition.registre === 'ecole_tu'}
    />
  )
}
