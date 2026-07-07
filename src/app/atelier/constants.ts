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
  /* Illustration de démonstration (révélation S3) — retournée par le mock
     generateIllustration, préchargée pendant l'attente des 15s */
  illustration: '/images/atelier/illustration-demo.png',
  /* Teaser bas de hero : 2 photos « avant » → illustration « après »
     (fichier réel .png, l'énoncé disait .jpg) */
  teaserAvant1: '/images/atelier/exemple-avant-1.jpg',
  teaserAvant2: '/images/atelier/exemple-avant-2.jpg',
  teaserApres: '/images/atelier/exemple-apres.png',
  /* Mockup album du hero — vrai asset (WebP transparent 1792×2390) */
  mockupHero: '/images/atelier/album-hero.webp' as string | null,
  /* Album vu de dos (S4/S5) — placeholder conservé, asset à venir */
  mockupAlbum: null as string | null,
}

/* Dimensions intrinsèques — posées en width/height sur les <img>
   pour réserver l'espace (zéro layout shift) */
export const HERO_MOCKUP_SIZE = { width: 1792, height: 2390 }
export const ILLUSTRATION_SIZE = { width: 1792, height: 2688 } /* 2:3 */
export const TEASER_AVANT_1_SIZE = { width: 1284, height: 1712 }
export const TEASER_AVANT_2_SIZE = { width: 1288, height: 1716 }

/* Ratio album portrait (~21×27) partagé par tous les placeholders */
export const ALBUM_RATIO = '21 / 27'

export const TITLE_MAX_LENGTH = 30
export const MAX_FILE_BYTES = 10 * 1024 * 1024 /* 10 Mo */
export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const ACCEPTED_EXT = /\.(jpe?g|png|webp|heic|heif)$/i

/* Analyse réelle — webhook N8N (public, CORS *, sans clé côté front) */
export const ANALYSE_WEBHOOK_URL =
  'https://n8n.srv1802624.hstgr.cloud/webhook/atelier-analyse'
export const ANALYSIS_TIMEOUT_MS = 120_000 /* 120 s côté front */
export const ANALYSIS_MIN_WAIT_MS = 6_000 /* plancher d'attente scénarisée */

/* Préparation image avant envoi (canvas) */
export const IMAGE_MAX_SIDE = 1568 /* côté long max */
export const IMAGE_JPEG_QUALITY = 0.8
/* Miniatures de reprise (sessionStorage, restore post-refresh) */
export const THUMB_MAX_SIDE = 600
export const THUMB_JPEG_QUALITY = 0.6

/* Délais simulés — voir lib/atelierApi.ts (submitEmail / generateIllustration) */
export const GENERATION_DELAY_MS = 15000
export const EMAIL_DELAY_MS = 1000

/* Garde-fou consommation :
   - 1 regard offert (consommé uniquement par un statut consomme:true)
   - max 4 refus par visiteur (protège les coûts API)
   - plafond d'envois (anti-spam reload) */
export const MAX_REFUSALS = 4
export const MAX_ANALYSIS_STARTS = 6

/* Clés de stockage */
export const SESSION_KEY = 'atelier_analysis' /* sessionStorage — snapshot parcours (éphémère) */
export const VIGNETTES_KEY = 'atelier_vignettes' /* sessionStorage — miniatures de reprise */
export const LOCK_KEY = 'atelier_regard' /* localStorage — verrou de coût (compteurs, survit à l'onglet) */
export const INTERACTIONS_KEY = 'atelier_interactions' /* localStorage — saveInteraction */

/* Attentes scénarisées */
export const PHRASE_INTERVAL_MS = 4000
export const ANALYSIS_PHRASE_MS = 1_800
export const ANALYZING_PHRASES = [
  'L’atelier ouvre vos souvenirs…',
  'On regarde la lumière.',
  'On lit ce que l’instant raconte.',
  'On cherche leur place dans l’album.',
  'On écoute ce que les deux se disent.',
] as const
export const GENERATING_PHRASES = [
  'Votre illustration prend forme…',
  'Les pigments se déposent…',
  'La lumière se travaille…',
  'Encore quelques gestes.',
] as const

/* Écrans verrouillés / messages doux (voix Bellajour, wording contractuel) */
export const LOCKED_MESSAGE = 'L’atelier a déjà étudié vos photos durant cette session.'
export const CONSUMED_MESSAGE =
  'C’était votre regard offert — la suite se compose sur Bellajour.'
export const RETURNING_MESSAGE =
  'Votre regard a déjà été offert. Votre illustration vous attend dans vos mails.'
export const REFUSAL_CAP_MESSAGE =
  'L’atelier préfère s’arrêter là pour aujourd’hui. Revenez avec d’autres souvenirs — la suite se compose sur Bellajour.'
export const NETWORK_ERROR_MESSAGE =
  'L’atelier n’a pas pu ouvrir vos photos cette fois. Vérifiez votre connexion, puis réessayez.'
export const HEIC_DECODE_MESSAGE =
  'Votre navigateur ne parvient pas à lire cette photo. Pouvez-vous en choisir une autre, en JPG ou PNG ?'

/* Reveal — intitulés et invitations fixes (wording contractuel) */
export const GESTE_HEADING = 'Ce que l’atelier en ferait'
export const DOUBLON_KEPT_BADGE = 'celle qu’on garde'
export const REVEAL_CTA_COUVERTURE =
  'Cette image pourrait devenir votre couverture. Voulez-vous voir ce que l’atelier en peindrait ?'
export const REVEAL_CTA_DEFAULT =
  'L’album ne fait que commencer. Découvrez l’illustration que l’atelier composerait pour le vôtre.'

/* Ancre canonique de l’offre prévente (section S4Reservation) */
export const PREVENTE_URL = '/preventes#s4'
/* Ancre waitlist de la landing (CTA discret des écrans non-ok) */
export const WAITLIST_URL = '/#waitlist'
