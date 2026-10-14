/* /edition/[token]/style/brief — modifier le brief partie par partie
   (révision §14.6, maquette StyleBrief). `?m=<rang>` : l'onglet ouvert.
   Ce segment fixe passe AVANT `style/[slug]` : aucun style ne peut s'appeler
   `brief` (SLUGS_RESERVES, styles.ts). */

import { notFound } from 'next/navigation'
import { briefModifiable } from '@/lib/collectif/brief'
import { peut } from '@/lib/collectif/droits'
import { etatEffectif } from '@/lib/collectif/etats'
import { chargerEspace, chargerMur } from '../../donnees'
import Brief from './Brief'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageBrief({
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
  const { styles, magazines } = await chargerMur(edition)
  const m = Number((await searchParams).m)
  const rang = magazines.some((x) => x.rang === m) ? m : magazines[0]?.rang ?? 1

  return (
    <Brief
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
