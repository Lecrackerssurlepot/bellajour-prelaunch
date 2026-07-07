/* Constantes de la page /atelier.
   Chemins d'assets et valeurs produit centralisés ici pour un swap facile
   quand les vrais visuels (mockup album, illustration) et les codes couleur
   définitifs seront livrés. */

/* Couleurs de reliure — codes temporaires, en attente des codes exacts
   et des dimensions album définitives. */
export const BINDING_COLORS = [
  { id: 'brume', hex: '#778899', label: 'Brume' },
  { id: 'terre', hex: '#8A4B3C', label: 'Terre cuite' },
  { id: 'sauge', hex: '#7A8B6F', label: 'Sauge' },
  { id: 'lin', hex: '#EAE3D8', label: 'Lin' },
  { id: 'encre', hex: '#1C1C1C', label: 'Encre' },
] as const

export type BindingColor = (typeof BINDING_COLORS)[number]
export type BindingColorId = BindingColor['id']
export const DEFAULT_BINDING: BindingColorId = 'brume'

/* Assets — placeholders V1. Quand un vrai fichier est livré, poser son
   chemin ici : les composants basculent du bloc placeholder vers <img>. */
export const ASSETS = {
  /* URL retournée par le mock generateIllustration — fichier pas encore livré */
  illustration: '/atelier-placeholder-illustration.jpg',
  /* ex. '/images/atelier/mockup-album.webp' quand disponible */
  mockupAlbum: null as string | null,
}

/* Ratio album portrait (~21×27) partagé par tous les placeholders */
export const ALBUM_RATIO = '21 / 27'

export const TITLE_MAX_LENGTH = 30
export const MAX_FILE_BYTES = 10 * 1024 * 1024 /* 10 Mo */
export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp']
export const ACCEPTED_EXT = /\.(jpe?g|png|webp)$/i

/* Délais simulés — voir lib/atelierApi.ts */
export const ANALYSIS_DELAY_MS = 8000
export const GENERATION_DELAY_MS = 15000
export const EMAIL_DELAY_MS = 1000

/* Garde-fou : max 2 analyses par session (1 reprise tolérée après un
   reload accidentel pendant l'attente) */
export const MAX_ANALYSIS_ATTEMPTS = 2

/* Clés de stockage */
export const SESSION_KEY = 'atelier_analysis' /* sessionStorage — snapshot parcours */
export const INTERACTIONS_KEY = 'atelier_interactions' /* localStorage — saveInteraction */

/* Attentes scénarisées */
export const PHRASE_INTERVAL_MS = 4000
export const ANALYZING_PHRASES = [
  'L’atelier observe vos photos…',
  'La lumière, les couleurs, l’émotion…',
  'Un instant encore.',
] as const
export const GENERATING_PHRASES = [
  'Votre illustration prend forme…',
  'Les pigments se déposent…',
  'La lumière se travaille…',
  'Encore quelques gestes.',
] as const

export const LOCKED_MESSAGE = 'L’atelier a déjà étudié vos photos durant cette session.'

/* Ancre canonique de l’offre prévente (section S4Reservation) */
export const PREVENTE_URL = '/preventes#s4'
