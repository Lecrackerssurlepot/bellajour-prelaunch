/* ════════════════════════════════════════════════════════════
   Les rotations de visuels réglées depuis l'admin (Site · Visuels).
   Module PUR : aucune base, aucun réseau. Il relit ce que le navigateur
   envoie et convertit une ligne de `visuels_rotations` en `Rotation` de
   media.ts. La table est dans supabase/migrations/20261126_visuels_rotations.sql.
   ════════════════════════════════════════════════════════════ */

import { MEDIA, type Emplacement, type NomEmplacement, type Rotation, type Visuel } from '@/content/media'

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
  /* Migration 20261127 (absentes avant elle : la lecture se replie, voir `serveur.ts`). */
  fichier_mobile?: string | null
  cadrage?: string | null
  defaut?: boolean
}

/** Les colonnes d'avant la migration 20261127 : le repli de lecture (42703). */
export const COLONNES_ROTATION_BASE =
  'id, emplacement, du, au, vide, fichier, alt, video_mp4, video_webm, valide, ordre, cree_le, cree_par, modifie_le, modifie_par'

export const COLONNES_ROTATION = `${COLONNES_ROTATION_BASE}, fichier_mobile, cadrage, defaut`

/** Les dates posées sur une ligne « défaut » : elles ne comptent pas, la table les exige. */
export const PERIODE_DEFAUT = { du: '2000-01-01', au: '9999-12-31' } as const

/**
 * L'emplacement accepte-t-il une version téléphone ? Pas une couverture
 * (210 × 297 : la même sur tous les écrans), pas une vidéo.
 */
export function accepteMobile(e: Pick<Emplacement, 'type' | 'ratio' | 'sansTelephone'>): boolean {
  return e.type === 'image' && e.ratio !== '210 / 297' && !e.sansTelephone
}

/** Un cadrage `object-position` en pour cent : « 50% 30% ». */
const CADRAGE = /^(100|[0-9]{1,2})% (100|[0-9]{1,2})%$/

export function estCadrage(v: unknown): v is string {
  return typeof v === 'string' && CADRAGE.test(v)
}

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
  const v = ligneVersVisuel(l)
  return v ? { du: l.du, au: l.au, valide: l.valide, ...v } : null
}

/** Le visuel d'une ligne (fichier, texte, vidéo, version téléphone, cadrage), ou null si elle n'en a pas. */
export function ligneVersVisuel(l: LigneRotation): Visuel | null {
  if (l.vide || !l.fichier) return null
  const video = l.video_mp4 ? (l.video_webm ? { mp4: l.video_mp4, webm: l.video_webm } : { mp4: l.video_mp4 }) : undefined
  return {
    fichier: l.fichier,
    alt: l.alt,
    ...(video ? { video } : {}),
    ...(l.fichier_mobile ? { mobile: l.fichier_mobile } : {}),
    ...(estCadrage(l.cadrage) ? { cadrage: l.cadrage } : {}),
  }
}

/**
 * Le visuel par défaut d'un emplacement : la ligne « défaut » VALIDÉE la plus
 * récente (avec les brouillons dans l'aperçu), sinon celui du code. Une ligne
 * défaut « vide » n'est permise que sur un emplacement optionnel.
 */
export function defautFusionne(nom: NomEmplacement, lignes: LigneRotation[], brouillons = false): Visuel | null {
  const l = trierLignes(lignes.filter((x) => x.emplacement === nom && x.defaut === true && (x.valide || brouillons)))[0]
  if (!l) return MEDIA[nom].defaut as Visuel | null
  if (l.vide) return 'optionnel' in MEDIA[nom] ? null : (MEDIA[nom].defaut as Visuel | null)
  return ligneVersVisuel(l) ?? (MEDIA[nom].defaut as Visuel | null)
}

/** L'emplacement tel que le site le calcule : défaut remplacé, rotations de l'admin d'abord. */
export function emplacementFusionne(nom: NomEmplacement, lignes: LigneRotation[], brouillons = false): Emplacement {
  return { ...(MEDIA[nom] as Emplacement), defaut: defautFusionne(nom, lignes, brouillons), rotations: rotationsFusionnees(nom, lignes) }
}

/** L'ordre de la base : `ordre` croissant, puis la plus récente d'abord (elle gagne un chevauchement). */
export function trierLignes(lignes: LigneRotation[]): LigneRotation[] {
  return [...lignes].sort((a, b) => a.ordre - b.ordre || (a.cree_le < b.cree_le ? 1 : a.cree_le > b.cree_le ? -1 : 0))
}

/** Les rotations d'un emplacement : celles de l'admin d'abord (elles gagnent), puis celles du code. */
export function rotationsFusionnees(nom: NomEmplacement, lignes: LigneRotation[]): Rotation[] {
  const base = trierLignes(lignes.filter((l) => l.emplacement === nom && l.defaut !== true))
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
  fichier_mobile: string | null
  cadrage: string | null
  defaut: boolean
}

/** Les champs que seule la migration 20261127 sait enregistrer. */
export function demandeMigrationV2(s: Saisie): boolean {
  return s.defaut || s.fichier_mobile !== null || s.cadrage !== null
}

/** La saisie à écrire : sans les colonnes neuves quand elles sont vides (la table d'avant les ignore). */
export function aEcrire(s: Saisie): Record<string, unknown> {
  if (demandeMigrationV2(s)) return { ...s }
  const reste: Record<string, unknown> = { ...s }
  delete reste.fichier_mobile
  delete reste.cadrage
  delete reste.defaut
  return reste
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
  const c = { ...(corps as Record<string, unknown>) }
  if (!estEmplacement(c.emplacement)) return { ok: false, champ: 'emplacement' }
  const e = MEDIA[c.emplacement]
  const defaut = c.defaut === true
  if (defaut) {
    c.du = PERIODE_DEFAUT.du
    c.au = PERIODE_DEFAUT.au
  }
  if (!estJour(c.du)) return { ok: false, champ: 'du' }
  if (!estJour(c.au) || (c.au as string) < (c.du as string)) return { ok: false, champ: 'au' }
  const vide = c.vide === true
  if (vide && !('optionnel' in e && e.optionnel === true)) return { ok: false, champ: 'vide' }
  const valide = c.valide === true
  /* La bibliothèque (27/11) : un fichier déjà en place sur le site (défauts et
     rotations de media.ts) se réutilise sans nouveau dépôt. Liste fermée : on
     n'accepte toujours aucune adresse quelconque. */
  const connus = fichiersDuCode()
  const dansLePanier = (u: unknown): u is string =>
    typeof u === 'string' &&
    (connus.has(u) || (u.startsWith(prefixePublic) && u.length < 600 && !u.includes('..')))

  if (vide) {
    return {
      ok: true,
      valeur: {
        emplacement: c.emplacement,
        du: c.du as string,
        au: c.au as string,
        vide,
        fichier: null,
        alt: '',
        video_mp4: null,
        video_webm: null,
        valide,
        fichier_mobile: null,
        cadrage: null,
        defaut,
      },
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
  let fichier_mobile: string | null = null
  if (c.fichier_mobile != null && c.fichier_mobile !== '') {
    if (!accepteMobile(e) || !dansLePanier(c.fichier_mobile)) return { ok: false, champ: 'fichier_mobile' }
    fichier_mobile = c.fichier_mobile
  }
  let cadrage: string | null = null
  if (c.cadrage != null && c.cadrage !== '') {
    if (!estCadrage(c.cadrage)) return { ok: false, champ: 'cadrage' }
    cadrage = c.cadrage
  }
  return {
    ok: true,
    valeur: {
      emplacement: c.emplacement,
      du: c.du as string,
      au: c.au as string,
      vide,
      fichier: c.fichier,
      alt,
      video_mp4,
      video_webm,
      valide,
      fichier_mobile,
      cadrage,
      defaut,
    },
  }
}

/** Tous les fichiers que media.ts met déjà en place (défauts, rotations, vidéos). */
export function fichiersDuCode(): Set<string> {
  const out = new Set<string>()
  for (const e of Object.values(MEDIA) as Emplacement[]) {
    for (const v of [e.defaut, ...e.rotations]) {
      if (!v || !('fichier' in v) || !v.fichier) continue
      out.add(v.fichier)
      if (v.mobile) out.add(v.mobile)
      if (v.video?.mp4) out.add(v.video.mp4)
      if (v.video?.webm) out.add(v.video.webm)
    }
  }
  return out
}

/** Le chemin d'un fichier déposé : unique, jamais réutilisé (le cache garde un même nom). */
export function cheminDepot(nom: NomEmplacement, extension: string, instant: Date, alea: string): string {
  const jour = instant.toISOString().slice(0, 10).replace(/-/g, '')
  return `${nom}/${jour}-${alea}.${extension}`
}
