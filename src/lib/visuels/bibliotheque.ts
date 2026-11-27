/* La bibliothèque des visuels (Site · Visuels, 27/11) : tout ce qui est déjà en
   place sur le site, pour le reprendre sans nouveau dépôt. Défauts et rotations
   de media.ts, puis les fichiers déposés depuis l'admin. Un fichier n'y figure
   qu'une fois. Module pur. */

import { MEDIA, type Emplacement, type NomEmplacement, type Visuel } from '@/content/media'
import type { LigneRotation } from './rotation'

export type VisuelBibliotheque = Visuel & { source: string }

export function bibliothequeVisuels(lignes: LigneRotation[]): VisuelBibliotheque[] {
  const vus = new Map<string, VisuelBibliotheque>()
  const ajouter = (v: Visuel, source: string) => {
    if (!v.fichier || vus.has(v.fichier)) return
    vus.set(v.fichier, { ...v, source })
  }
  for (const nom of Object.keys(MEDIA) as NomEmplacement[]) {
    const e = MEDIA[nom] as Emplacement
    if (e.defaut) ajouter(e.defaut, nom)
    for (const r of e.rotations) if (!r.vide) ajouter(r, nom)
  }
  for (const l of lignes) {
    if (l.vide || !l.fichier) continue
    const video = l.video_mp4 ? { mp4: l.video_mp4, ...(l.video_webm ? { webm: l.video_webm } : {}) } : undefined
    ajouter(video ? { fichier: l.fichier, alt: l.alt, video } : { fichier: l.fichier, alt: l.alt }, l.emplacement)
  }
  return [...vus.values()]
}
