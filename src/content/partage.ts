/* L'image des liens partagés (emplacement `partage.image`), pour les
   métadonnées des pages. `metadata` est un objet statique : on lit la règle
   du code (visuelPour), pas la base ; un emplacement vide ne déclare aucune
   image plutôt qu'une URL cassée. */
import type { Metadata } from 'next'
import { visuelPour } from './media'

const v = visuelPour('partage.image')
const URL_IMAGE = v ? `https://www.bellajour.fr${v.fichier}` : null

export const imagesOpenGraph: NonNullable<Metadata['openGraph']>['images'] =
  v && URL_IMAGE ? [{ url: URL_IMAGE, width: 1200, height: 630, alt: v.alt }] : []
export const imagesTwitter: string[] = URL_IMAGE ? [URL_IMAGE] : []
