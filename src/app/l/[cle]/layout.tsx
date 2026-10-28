/* Le layout d'une adresse courte (sous `l/layout.tsx`) : comme celui de
   `/depot/[token]`, il retrouve le registre de l'édition, pour que « Ce lien ne
   fonctionne plus » tutoie une édition au tu, et il pose les balises d'aperçu.
   La lecture est celle de la page (`lireLienCourt`, partagée par `cache`) ; une
   panne retombe sur le vous et sur « Bellajour » seul, jamais sur une erreur.

   ⚠️ `generateMetadata` vit ICI, pas dans la page : quand la page lève
   `notFound()`, Next ne garde que les métadonnées des LAYOUTS. Posées dans la
   page, une clé inconnue montrait celles de l'accueil (son titre, sa phrase
   « À partir de 24 € ») au lieu de « Bellajour » seul (vu au curl le 28/10). */

import type { Metadata } from 'next'
import { metaDeLEdition, metaNeutre } from '@/lib/collectif/partageMeta'
import { FournisseurRegistre } from '../../depot/[token]/LienMort'
import { lireLienCourt } from './lecture'

/* Ce qu'un robot verrait s'il ne suivait pas la redirection : l'événement, sans
   prix ni produit (les robots d'aperçu la suivent, et lisent alors /depot/[token]).
   Clé inconnue, lien supprimé, édition archivée : « Bellajour » seul. */
export async function generateMetadata({ params }: { params: Promise<{ cle: string }> }): Promise<Metadata> {
  try {
    const { cle } = await params
    const lu = await lireLienCourt(cle)
    if (lu.statut !== 'ok') return metaNeutre()
    return metaDeLEdition({ evenement: lu.evenement, registre: lu.registre }, true)
  } catch {
    return metaNeutre()
  }
}

async function registre(cle: string): Promise<string | null> {
  try {
    const lu = await lireLienCourt(cle)
    return lu.statut === 'ok' || lu.statut === 'introuvable' ? lu.registre : null
  } catch {
    return null
  }
}

export default async function LayoutLienCourt({ children, params }: { children: React.ReactNode; params: Promise<{ cle: string }> }) {
  const { cle } = await params
  return <FournisseurRegistre registre={await registre(cle)}>{children}</FournisseurRegistre>
}
