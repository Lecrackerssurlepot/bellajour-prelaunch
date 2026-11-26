/* ════════════════════════════════════════════════════════════
   Le visuel d'un emplacement (librairie src/content/media.ts, fiche G).

   Toute image ou vidéo d'une page client passe par ici, jamais par un
   chemin écrit dans la page : c'est ce qui permet de la changer, de la
   dater et de la valider sans toucher au code de la page.

   ⚠️ UNE SEULE porte vers la librairie : `lireVisuel`. Aujourd'hui elle
   appelle `visuelPour` (les rotations écrites dans media.ts). Quand l'outil
   Visuels de l'admin sera fusionné, c'est la seule ligne à changer pour
   lire aussi les rotations de la base (`visuelDuJour`).
   ════════════════════════════════════════════════════════════ */

import { visuelPour, type NomEmplacement, type Visuel as VisuelMedia } from '@/content/media'
import VideoNative from './VideoNative'

/** Le visuel en ligne aujourd'hui pour un emplacement, ou null (emplacement vide). */
export async function lireVisuel(nom: NomEmplacement): Promise<VisuelMedia | null> {
  return visuelPour(nom)
}

/** Plusieurs emplacements d'un coup : { nom: chemin du fichier } (chaîne vide si vide). */
export async function fichiersVisuels<N extends NomEmplacement>(noms: readonly N[]): Promise<Record<N, string>> {
  const out = {} as Record<N, string>
  for (const n of noms) out[n] = (await lireVisuel(n))?.fichier ?? ''
  return out
}

type Props = {
  nom: NomEmplacement
  className?: string
  sizes?: string
  /** L'image principale de la page (LCP) : chargée tout de suite. */
  priority?: boolean
  /** Remplace le texte alternatif de la librairie (ex. image décorative : ''). */
  alt?: string
}

export default async function Visuel({ nom, className, sizes, priority, alt }: Props) {
  const v = await lireVisuel(nom)
  if (!v || !v.fichier) return null
  if (v.video) {
    return <VideoNative poster={v.fichier} mp4={v.video.mp4} webm={v.video.webm} label={alt ?? v.alt} className={className} />
  }
  return (
    <img
      src={v.fichier}
      alt={alt ?? v.alt}
      className={className}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
    />
  )
}
