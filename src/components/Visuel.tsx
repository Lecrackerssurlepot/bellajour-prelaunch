/* ════════════════════════════════════════════════════════════
   Le visuel d'un emplacement (librairie src/content/media.ts, fiche G).

   Toute image ou vidéo d'une page client passe par ici, jamais par un
   chemin écrit dans la page : c'est ce qui permet de la changer, de la
   dater et de la valider sans toucher au code de la page.

   ⚠️ UNE SEULE porte vers la librairie : `lireVisuel`, qui appelle
   `visuelDuJour` (rotations réglées dans l'admin, puis celles de media.ts).
   Une page qui l'utilise exporte `revalidate = 300` : sinon le jour du
   visuel reste celui du build.
   ════════════════════════════════════════════════════════════ */

import type { NomEmplacement, Visuel as VisuelMedia } from '@/content/media'
import { visuelDuJour } from '@/content/visuel-du-jour'
import VideoNative from './VideoNative'

/** Le visuel en ligne aujourd'hui pour un emplacement, ou null (emplacement vide). */
export async function lireVisuel(nom: NomEmplacement): Promise<VisuelMedia | null> {
  return visuelDuJour(nom)
}

/** Plusieurs emplacements d'un coup : { nom: visuel du jour } (null si vide). */
export async function visuelsDuJour<N extends NomEmplacement>(noms: readonly N[]): Promise<Record<N, VisuelMedia | null>> {
  const out = {} as Record<N, VisuelMedia | null>
  for (const n of noms) out[n] = await lireVisuel(n)
  return out
}

/** Le point de rupture du téléphone (tokens.json, `telephone` : ≤ 700 px). */
export const MEDIA_TELEPHONE = '(max-width: 700px)'

type PropsImage = {
  v: VisuelMedia | null | undefined
  className?: string
  /** Remplace le texte alternatif de la librairie (image décorative : ''). */
  alt?: string
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
  decoding?: 'async' | 'sync' | 'auto'
  sizes?: string
  /** Le nom de l'emplacement : la vue « Sur le site » de l'admin le repère. */
  nom?: NomEmplacement
}

/**
 * Une image d'emplacement avec ce que l'admin règle : le cadrage
 * (`object-position`) et, s'il y en a une, la version téléphone. Sans version
 * téléphone, c'est un `<img>` nu (aucun changement de structure) ; avec, un
 * `<picture>` en `display: contents`, que la mise en page ne voit pas.
 */
export function ImageSite({ v, className, alt, loading, fetchPriority, decoding = 'async', sizes, nom }: PropsImage) {
  if (!v || !v.fichier) return null
  const img = (
    <img
      data-emplacement={nom}
      src={v.fichier}
      alt={alt ?? v.alt}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      sizes={sizes}
      style={v.cadrage ? { objectPosition: v.cadrage } : undefined}
    />
  )
  if (!v.mobile) return img
  return (
    <picture style={{ display: 'contents' }}>
      <source media={MEDIA_TELEPHONE} srcSet={v.mobile} />
      {img}
    </picture>
  )
}

/**
 * Les fonds (`url()` dans une variable CSS) n'ont pas de `<picture>` : leur
 * version téléphone passe par une règle `@media`. `!important` : la variable
 * d'origine est posée dans l'attribut `style`, qui gagnerait sinon.
 */
export function FondsTelephone({ selecteur, fonds }: { selecteur: string; fonds: Record<string, VisuelMedia | null | undefined> }) {
  /* Une adresse sans guillemet, parenthèse ni espace (panier ou dépôt) : sinon, pas de règle. */
  const sure = (u: string | undefined): u is string => typeof u === 'string' && /^[\w\-./:%~]+$/.test(u)
  const regles = Object.entries(fonds)
    .filter(([variable, v]) => /^--[\w-]+$/.test(variable) && sure(v?.mobile))
    .map(([variable, v]) => `${variable}:url(${v!.mobile}) !important`)
  if (regles.length === 0) return null
  return <style dangerouslySetInnerHTML={{ __html: `@media ${MEDIA_TELEPHONE}{${selecteur}{${regles.join(';')}}}` }} />
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
    return <VideoNative poster={v.fichier} mp4={v.video.mp4} webm={v.video.webm} label={alt ?? v.alt} className={className} emplacement={nom} />
  }
  return (
    <ImageSite
      v={v}
      nom={nom}
      alt={alt}
      className={className}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
    />
  )
}
