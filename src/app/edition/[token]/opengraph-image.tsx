/* L'image de partage de l'espace du responsable : le nom de l'événement, sobre.
   Lien inconnu, fermé ou archivé : « Bellajour » seul. */

import { chargerAcces } from '@/lib/collectif/acces'
import { imagePartage, TAILLE_PARTAGE } from '@/lib/collectif/partageMeta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const size = TAILLE_PARTAGE
export const contentType = 'image/png'
export const alt = 'Bellajour'

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  let evenement: string | null = null
  try {
    const acces = await chargerAcces(token, 'espace')
    if (acces.statut === 'ok') evenement = acces.edition.evenement
  } catch {
    evenement = null
  }
  return imagePartage(evenement)
}
