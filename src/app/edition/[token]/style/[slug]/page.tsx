/* /edition/[token]/style/[slug] — un style en détail (PRD §4.2, maquette
   StyleDetail). `?m=<rang>` : le magazine pour lequel on le regarde. Un style
   non publié, ou hors du public de l'édition, répond comme un lien inconnu. */

import { notFound } from 'next/navigation'
import { briefModifiable } from '@/lib/collectif/brief'
import { peut } from '@/lib/collectif/droits'
import { etatEffectif } from '@/lib/collectif/etats'
import { chargerEspace, chargerMur } from '../../donnees'
import FicheStyle from './FicheStyle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageUnStyle({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; slug: string }>
  searchParams: Promise<{ m?: string }>
}) {
  const { token, slug } = await params
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition, role } = acces
  const { styles, magazines } = await chargerMur(edition)
  const style = styles.find((s) => s.slug === slug)
  if (!style || !magazines.length) notFound()
  const m = Number((await searchParams).m)
  const magazine = magazines.find((x) => x.rang === m) ?? magazines[0]

  return (
    <FicheStyle
      token={token}
      style={style}
      magazine={magazine}
      ecrire={peut(role, 'choisir_style')}
      fige={!briefModifiable(etatEffectif(edition.etat, edition.cloture_le, new Date()))}
      aimeesMax={edition.couvertures_aimees_max}
      tu={edition.registre === 'ecole_tu'}
    />
  )
}
