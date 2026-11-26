/* ════════════════════════════════════════════════════════════
   Les rotations de visuels réglées depuis l'admin (Site · Visuels).
   Module PUR : aucune base, aucun réseau. Il relit ce que le navigateur
   envoie et convertit une ligne de `visuels_rotations` en `Rotation` de
   media.ts. La table est dans supabase/migrations/20261126_visuels_rotations.sql.
   ════════════════════════════════════════════════════════════ */

import { MEDIA, type NomEmplacement, type Rotation } from '@/content/media'

export const PANIER_VISUELS = 'visuels-site'
export const TAG_VISUELS = 'visuels-site'
/** Le cookie de l'aperçu « le site à une date » : `AAAA-MM-JJ` ou `AAAA-MM-JJ|brouillons`. */
export const COOKIE_APERCU_VISUELS = 'bj_apercu_visuels'

export const MAX_IMAGE_OCTETS = 15 * 1024 * 1024
export const MAX_VIDEO_OCTETS = 50 * 1024 * 1024

export const TYPES_IMAGE = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' } as const
export const TYPES_VIDEO = { 'video/mp4': 'mp4', 'video/webm': 'webm' } as const

/** Une ligne de la table, telle que la base la rend. */
export type LigneRotation = {
  id: string
  emplacement: string
  du: string
  au: string
  vide: boolean
  fichier: string | null
  alt: string
  video_mp4: string | null
  video_webm: string | null
  valide: boolean
  ordre: number
  cree_le: string
  cree_par: string | null
  modifie_le: string
  modifie_par: string | null
}

export const COLONNES_ROTATION =
  'id, emplacement, du, au, vide, fichier, alt, video_mp4, video_webm, valide, ordre, cree_le, cree_par, modifie_le, modifie_par'

/** Jamais `MEDIA[saisie]` sans ce garde : une clé comme « constructor » viendrait du prototype. */
export function estEmplacement(nom: unknown): nom is NomEmplacement {
  return typeof nom === 'string' && Object.prototype.hasOwnProperty.call(MEDIA, nom)
}

const JOUR = /^\d{4}-\d{2}-\d{2}$/

export function estJour(v: unknown): v is string {
  if (typeof v !== 'string' || !JOUR.test(v)) return false
  const d = new Date(`${v}T12:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

/** La ligne de la base devient une rotation de media.ts. Une ligne incohérente est écartée (null). */
export function ligneVersRotation(l: LigneRotation): Rotation | null {
  if (!estJour(l.du) || !estJour(l.au) || l.du > l.au) return null
  if (l.vide) return { du: l.du, au: l.au, valide: l.valide, vide: true }
  if (!l.fichier) return null
  const video = l.video_mp4 ? (l.video_webm ? { mp4: l.video_mp4, webm: l.video_webm } : { mp4: l.video_mp4 }) : undefined
  return video
    ? { du: l.du, au: l.au, valide: l.valide, fichier: l.fichier, alt: l.alt, video }
    : { du: l.du, au: l.au, valide: l.valide, fichier: l.fichier, alt: l.alt }
}

/** L'ordre de la base : `ordre` croissant, puis la plus récente d'abord (elle gagne un chevauchement). */
export function trierLignes(lignes: LigneRotation[]): LigneRotation[] {
  return [...lignes].sort((a, b) => a.ordre - b.ordre || (a.cree_le < b.cree_le ? 1 : a.cree_le > b.cree_le ? -1 : 0))
}

/** Les rotations d'un emplacement : celles de l'admin d'abord (elles gagnent), puis celles du code. */
export function rotationsFusionnees(nom: NomEmplacement, lignes: LigneRotation[]): Rotation[] {
  const base = trierLignes(lignes.filter((l) => l.emplacement === nom))
    .map(ligneVersRotation)
    .filter((r): r is Rotation => r !== null)
  return [...base, ...(MEDIA[nom].rotations as Rotation[])]
}

/** Lit la valeur du cookie d'aperçu. */
export function lireCookieApercu(v: string | undefined): { jour: string; brouillons: boolean } | null {
  if (!v) return null
  const [jour, option] = v.split('|')
  if (!estJour(jour)) return null
  return { jour, brouillons: option === 'brouillons' }
}

export type Saisie = {
  emplacement: NomEmplacement
  du: string
  au: string
  vide: boolean
  fichier: string | null
  alt: string
  video_mp4: string | null
  video_webm: string | null
  valide: boolean
}

type Lu<T> = { ok: true; valeur: T } | { ok: false; champ: string }

const texte = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim().length <= max ? v.trim() : null

/**
 * Relit une rotation envoyée par l'admin. `prefixePublic` est l'adresse publique
 * du panier : un fichier qui n'y vit pas est refusé (on n'affiche jamais une
 * adresse quelconque collée dans le corps).
 */
export function normaliserSaisie(corps: unknown, prefixePublic: string): Lu<Saisie> {
  if (!corps || typeof corps !== 'object') return { ok: false, champ: 'corps' }
  const c = corps as Record<string, unknown>
  if (!estEmplacement(c.emplacement)) return { ok: false, champ: 'emplacement' }
  const e = MEDIA[c.emplacement]
  if (!estJour(c.du)) return { ok: false, champ: 'du' }
  if (!estJour(c.au) || (c.au as string) < (c.du as string)) return { ok: false, champ: 'au' }
  const vide = c.vide === true
  if (vide && !('optionnel' in e && e.optionnel === true)) return { ok: false, champ: 'vide' }
  const valide = c.valide === true
  const dansLePanier = (u: unknown): u is string =>
    typeof u === 'string' && u.startsWith(prefixePublic) && u.length < 600 && !u.includes('..')

  if (vide) {
    return {
      ok: true,
      valeur: { emplacement: c.emplacement, du: c.du as string, au: c.au as string, vide, fichier: null, alt: '', video_mp4: null, video_webm: null, valide },
    }
  }
  if (!dansLePanier(c.fichier)) return { ok: false, champ: 'fichier' }
  const alt = texte(c.alt, 200)
  if (!alt) return { ok: false, champ: 'alt' }
  let video_mp4: string | null = null
  let video_webm: string | null = null
  if (c.video_mp4 != null && c.video_mp4 !== '') {
    if (e.type !== 'video' || !dansLePanier(c.video_mp4)) return { ok: false, champ: 'video_mp4' }
    video_mp4 = c.video_mp4
  }
  if (c.video_webm != null && c.video_webm !== '') {
    if (!video_mp4 || !dansLePanier(c.video_webm)) return { ok: false, champ: 'video_webm' }
    video_webm = c.video_webm
  }
  return {
    ok: true,
    valeur: { emplacement: c.emplacement, du: c.du as string, au: c.au as string, vide, fichier: c.fichier, alt, video_mp4, video_webm, valide },
  }
}

/** Le chemin d'un fichier déposé : unique, jamais réutilisé (le cache garde un même nom). */
export function cheminDepot(nom: NomEmplacement, extension: string, instant: Date, alea: string): string {
  const jour = instant.toISOString().slice(0, 10).replace(/-/g, '')
  return `${nom}/${jour}-${alea}.${extension}`
}
