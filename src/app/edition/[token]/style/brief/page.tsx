/* /edition/[token]/style/brief — modifier UNE partie du brief (D24, maquette
   « Modifier une partie » validée le 14/10). `?m=<rang>` : le magazine ;
   `?partie=palette|typos|double|couverture|texte` : la partie dont le
   panneau latéral s'ouvre sur le mur (le choix en haut, « Terminé » revient
   au mur). Sans partie connue : le mur, panneau fermé.
   Ce segment fixe passe AVANT `style/[slug]` : aucun style ne peut s'appeler
   `brief` (SLUGS_RESERVES, styles.ts). L'ancienne page est archivée
   (`archive/brief-par-style-2026-10/`). */

import { notFound } from 'next/navigation'
import { briefModifiable } from '@/lib/collectif/brief'
import { peut } from '@/lib/collectif/droits'
import { etatEffectif } from '@/lib/collectif/etats'
import { stylesOuverts } from '@/lib/collectif/interrupteur'
import { chargerEspace, chargerMur } from '../../donnees'
import Mur, { type Partie } from '../Mur'
import Vitrine from '../Vitrine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PARTIES: readonly Partie[] = ['couverture', 'typos', 'palette', 'double', 'texte']

export default async function PageBrief({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ m?: string; partie?: string }>
}) {
  const { token } = await params
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition, role } = acces
  /* Le choix du style est fermé (interrupteur.ts, 19/10 au soir) : la vitrine de nos magazines. */
  if (!stylesOuverts()) return <Vitrine token={token} registre={edition.registre} />
  const { styles, magazines } = await chargerMur(edition)
  const recherche = await searchParams
  const m = Number(recherche.m)
  const rang = magazines.some((x) => x.rang === m) ? m : magazines[0]?.rang ?? 1
  const partie = PARTIES.find((x) => x === recherche.partie) ?? null

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
      partieInitiale={partie}
    />
  )
}
