/* ════════════════════════════════════════════════════════════
   La librairie des visuels du site (charte V2, fiche G).

   Un EMPLACEMENT (`page.place`) = un visuel par défaut + des rotations datées.
   Le site affiche la rotation VALIDÉE dont la période contient le jour
   (heure de Paris), sinon le visuel par défaut. Une rotation `valide: false`
   n'est jamais en ligne : elle ne se voit que dans l'aperçu /brand/visuels.

   Ce fichier tient la LISTE des emplacements et leur visuel par défaut.
   Les rotations datées se règlent surtout dans l'admin (Site · Visuels,
   /admin/atelier/site/visuels, table `visuels_rotations`) : le site les lit par
   `visuelDuJour` (src/content/visuel-du-jour.ts), qui les place AVANT celles
   d'ici. Ajouter, retirer ou redimensionner un emplacement reste du code.

   Pour changer un défaut ici : déposer le fichier sous un NOM NOUVEAU (le
   cache de l'hébergeur garde un même nom 24 h), puis changer la ligne.

   `provisoire: true` : le visuel par défaut est une image déjà dans le dépôt,
   posée en attendant le vrai visuel (phase 4, 25/11/2026 : aucun n'est choisi).
   ════════════════════════════════════════════════════════════ */

/** Une vidéo = un poster (le `fichier` du visuel) + un mp4, et un webm facultatif. */
export type Video = { mp4: string; webm?: string }

export type Visuel = {
  /** Chemin public de l'image (ou du poster pour une vidéo). */
  fichier: string
  alt: string
  video?: Video
}

type Periode = {
  /** Premier jour inclus, AAAA-MM-JJ, heure de Paris. */
  du: string
  /** Dernier jour inclus, AAAA-MM-JJ, heure de Paris. */
  au: string
  /** Seule une rotation validée par Mathias passe en ligne. */
  valide: boolean
}

/**
 * Une rotation montre un visuel sur sa période, ou, avec `vide: true`, n'en
 * montre AUCUN (un fond présent certains jours seulement). Une rotation vide
 * n'a pas de place dans un emplacement qui n'est pas `optionnel` : l'admin la
 * refuse, et le harnais aussi.
 */
export type Rotation = Periode & ((Visuel & { vide?: false }) | { vide: true; fichier?: undefined; alt?: undefined; video?: undefined })

export type Emplacement = {
  /** Ce que c'est, en clair, pour l'aperçu. */
  role: string
  /** Ratio largeur / hauteur quand la charte le fixe (fiche G). */
  ratio?: string
  /** 'video' : l'emplacement attend un poster + mp4 + webm. */
  type: 'image' | 'video'
  /** `null` : l'emplacement est vide par défaut (seules ses rotations le remplissent). Exige `optionnel`. */
  defaut: Visuel | null
  /** L'emplacement peut ne rien montrer : la page sait s'en passer. */
  optionnel?: true
  provisoire?: boolean
  rotations: Rotation[]
}

export const MEDIA = {
  'accueil.hero': {
    role: "La photo de l'ouverture du livre",
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/header-magazines-paysage-1792.webp',
      alt: 'Des numéros Bellajour posés sur une table',
    },
    rotations: [],
  },
  'accueil.couverture': {
    role: "La couverture qui s'ouvre",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-rio-1050.webp',
      alt: 'La couverture d’un numéro sur Rio',
    },
    rotations: [],
  },
  'accueil.essai': {
    role: "La photo de l'essai photos (entre l'ouverture et l'accueil)",
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-lisbonne-640.webp',
      alt: 'Un numéro sur Lisbonne',
    },
    rotations: [],
  },
  'accueil.reseaux': {
    role: 'Le numéro raconté sur les réseaux',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/reseaux-photo-telephone-480.webp',
      alt: 'Une photo du numéro sur un téléphone',
    },
    rotations: [],
  },
  'magazine.couverture': {
    role: 'La couverture de la page magazine',
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/magazine/couverture-sicile-900.webp',
      alt: 'La couverture d’un numéro sur la Sicile',
    },
    rotations: [],
  },
  'magazine.double-page': {
    role: 'Une double page ouverte',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/magazine/double-page-australie-1400.webp',
      alt: 'Une double page d’un numéro sur l’Australie',
    },
    rotations: [],
  },
  'magazine.video': {
    role: 'La vidéo du magazine (verticale)',
    ratio: '9 / 16',
    type: 'video',
    provisoire: true,
    /* Aucune vidéo dans le dépôt : le poster seul, sans mp4 ni webm. */
    defaut: {
      fichier: '/images/v2/accueil/reseaux-video-telephone-600.webp',
      alt: 'Un numéro feuilleté, filmé au téléphone',
    },
    rotations: [],
  },
  'composer.modele': {
    role: 'Le numéro modèle montré au début de Composer',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/composer/modele-aussie-900.webp',
      alt: 'Un numéro modèle sur l’Australie',
    },
    rotations: [],
  },
  'offrir.carte': {
    role: 'Le visuel posé sur la carte cadeau (un numéro incliné)',
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/magazine/couverture-noosa-1000.webp',
      alt: 'La couverture d’un numéro sur Noosa',
    },
    rotations: [],
  },
  'groupes.brochure': {
    role: 'La brochure de la page Pour les groupes',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/partenaires/brochure-ecoles-v1-1-1600.webp',
      alt: 'La première page de la brochure pour les écoles',
    },
    rotations: [],
  },
  'partage.image': {
    role: "L'image des liens partagés (réseaux, messageries)",
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/partage/bellajour-magazines-1200.png',
      alt: 'Des numéros Bellajour',
    },
    rotations: [],
  },
} satisfies Record<string, Emplacement>

export type NomEmplacement = keyof typeof MEDIA

/** Le jour AAAA-MM-JJ à Paris pour un instant donné. */
export function jourParis(instant: Date): string {
  /* en-CA rend AAAA-MM-JJ ; le fuseau suit l'heure d'été toute seule. */
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

/** La rotation couvre-t-elle ce jour ? Bornes incluses. */
export function couvre(rotation: Pick<Rotation, 'du' | 'au'>, jour: string): boolean {
  return rotation.du <= jour && jour <= rotation.au
}

/** Options de calcul : l'aperçu de l'admin peut compter les brouillons comme validés. */
export type OptionsVisuel = { brouillons?: boolean }

/** La rotation qui gagne ce jour (la première déclarée), ou -1. */
export function rotationGagnante(e: Pick<Emplacement, 'rotations'>, jour: string, options: OptionsVisuel = {}): number {
  return e.rotations.findIndex((x) => (x.valide || options.brouillons === true) && couvre(x, jour))
}

/**
 * Le visuel en ligne pour un emplacement à un instant donné, ou `null` quand
 * l'emplacement ne montre rien (défaut vide, ou rotation `vide` ce jour-là).
 * Pure : la table est passée en paramètre (par défaut MEDIA) pour le harnais.
 * Si deux rotations validées se chevauchent, la première déclarée gagne.
 */
export function visuelPour<T extends Record<string, Emplacement> = typeof MEDIA>(
  emplacement: keyof T & string,
  instant: Date = new Date(),
  table: T = MEDIA as unknown as T,
  options: OptionsVisuel = {},
): Visuel | null {
  const e = table[emplacement]
  const i = rotationGagnante(e, jourParis(instant), options)
  if (i < 0) return e.defaut
  const r = e.rotations[i]
  if (r.vide) return null
  const { fichier, alt, video } = r
  return video ? { fichier, alt, video } : { fichier, alt }
}

export type EtatRotation = 'en ligne' | 'à valider' | 'à venir' | 'passée' | 'masquée'

/**
 * L'état d'une rotation pour l'aperçu, à un jour donné.
 * « masquée » : validée et à sa date, mais une rotation déclarée plus haut passe avant.
 */
export function etatRotation(e: Emplacement, index: number, jour: string): EtatRotation {
  const r = e.rotations[index]
  if (!r.valide) return 'à valider'
  if (jour < r.du) return 'à venir'
  if (jour > r.au) return 'passée'
  return rotationGagnante(e, jour) === index ? 'en ligne' : 'masquée'
}
