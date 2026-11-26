/* ════════════════════════════════════════════════════════════
   La librairie des visuels du site (charte V2, fiche G).

   Un EMPLACEMENT (`page.place`) = un visuel par défaut + des rotations datées.
   Le site affiche la rotation VALIDÉE dont la période contient le jour
   (heure de Paris), sinon le visuel par défaut. Une rotation `valide: false`
   n'est jamais en ligne : elle ne se voit que dans l'aperçu /brand/visuels.

   Pour changer un visuel : déposer le fichier sous un NOM NOUVEAU (le cache
   de l'hébergeur garde un même nom 24 h), puis changer la ligne.

   `provisoire: true` : le visuel par défaut est une image déjà dans le dépôt,
   posée en attendant le vrai visuel (phase 4, 25/11/2026 : aucun n'est choisi).
   ════════════════════════════════════════════════════════════ */

/** Une vidéo = un poster (le `fichier` du visuel) + deux encodages. */
export type Video = { mp4: string; webm: string }

export type Visuel = {
  /** Chemin public de l'image (ou du poster pour une vidéo). */
  fichier: string
  alt: string
  video?: Video
}

export type Rotation = Visuel & {
  /** Premier jour inclus, AAAA-MM-JJ, heure de Paris. */
  du: string
  /** Dernier jour inclus, AAAA-MM-JJ, heure de Paris. */
  au: string
  /** Seule une rotation validée par Mathias passe en ligne. */
  valide: boolean
}

export type Emplacement = {
  /** Ce que c'est, en clair, pour l'aperçu. */
  role: string
  /** Ratio largeur / hauteur quand la charte le fixe (fiche G). */
  ratio?: string
  /** 'video' : l'emplacement attend un poster + mp4 + webm. */
  type: 'image' | 'video'
  defaut: Visuel
  provisoire?: boolean
  rotations: Rotation[]
}

export const MEDIA = {
  'accueil.hero': {
    role: "Une photo d'exemple posée dans le livre de l'ouverture (avant celles du client)",
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/header-magazines-paysage-1792.webp',
      alt: 'Des numéros Bellajour posés sur une table',
    },
    rotations: [],
  },
  'accueil.couverture': {
    role: "La couverture qui s'ouvre, la première de la frise « une année »",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/composer/modele-aussie-900.webp',
      alt: 'La couverture d’un numéro sur l’Australie',
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
  'accueil.couverture-2': {
    role: "La deuxième couverture de l'ouverture et de la frise (mai)",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/composer/modele-sicile-900.webp',
      alt: 'La couverture d’un numéro sur la Sicile',
    },
    rotations: [],
  },
  'accueil.couverture-3': {
    role: "La troisième couverture de l'ouverture et de la frise (juillet)",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-cote-azur-640.webp',
      alt: 'La couverture d’un numéro sur la Côte d’Azur',
    },
    rotations: [],
  },
  'accueil.couverture-4': {
    role: "La quatrième couverture de l'ouverture et de la frise (octobre)",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-rio-700.webp',
      alt: 'La couverture d’un numéro sur Rio',
    },
    rotations: [],
  },
  'accueil.couverture-5': {
    role: "La cinquième couverture de l'ouverture et de la frise (décembre)",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/composer/modele-mon-annee-grand-900.webp',
      alt: 'La couverture d’un numéro « Mon année »',
    },
    rotations: [],
  },
  'accueil.double-page-1': {
    role: "La double page sous la couverture qui s'ouvre",
    ratio: '1400 / 990',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/magazine/double-page-lagon-1000.webp',
      alt: 'Une double page d’un numéro sur un lagon',
    },
    rotations: [],
  },
  'accueil.double-page-2': {
    role: "La double page qui se tourne ensuite",
    ratio: '1400 / 990',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/magazine/double-page-australie-1400.webp',
      alt: 'Une double page d’un numéro sur l’Australie',
    },
    rotations: [],
  },
  'accueil.photo-exemple': {
    role: "Une photo d'exemple de l'essai (avant celles du client)",
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/magazine/couverture-noosa-1000.webp',
      alt: 'Une photo de vacances à Noosa',
    },
    rotations: [],
  },
  'accueil.matiere': {
    role: "La vidéo de la section « La matière » (verticale à tourner)",
    ratio: '9 / 16',
    type: 'video',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/matiere/magazine-tour-provisoire.webp',
      alt: 'Le magazine tourne sur lui-même',
      video: { mp4: '/images/v2/matiere/magazine-tour-provisoire.mp4', webm: '/images/v2/matiere/magazine-tour-provisoire.webm' },
    },
    rotations: [],
  },
  'accueil.porte-offrir': {
    role: "La vignette de la porte « Pour offrir »",
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/composer/modele-mon-annee-grand-900.webp',
      alt: '',
    },
    rotations: [],
  },
  'accueil.porte-groupes': {
    role: "La vignette de la porte « Pour un groupe »",
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/header-magazines-paysage-1792.webp',
      alt: '',
    },
    rotations: [],
  },
  'magazine.couverture': {
    role: "La première couverture de l'éventail, en tête de la page magazine",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/magazine/couverture-sicile-900.webp',
      alt: 'La couverture d’un numéro sur la Sicile',
    },
    rotations: [],
  },
  'magazine.eventail-2': {
    role: "La deuxième couverture de l'éventail, en tête de la page magazine",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-rio-700.webp',
      alt: 'La couverture d’un numéro sur Rio',
    },
    rotations: [],
  },
  'magazine.eventail-3': {
    role: "La troisième couverture de l'éventail, en tête de la page magazine",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-cote-azur-640.webp',
      alt: 'La couverture d’un numéro sur la Côte d’Azur',
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

/**
 * Le visuel en ligne pour un emplacement à un instant donné.
 * Pure : la table est passée en paramètre (par défaut MEDIA) pour le harnais.
 * Si deux rotations validées se chevauchent, la première déclarée gagne.
 */
export function visuelPour<T extends Record<string, Emplacement> = typeof MEDIA>(
  emplacement: keyof T & string,
  instant: Date = new Date(),
  table: T = MEDIA as unknown as T,
): Visuel {
  const e = table[emplacement]
  const jour = jourParis(instant)
  const r = e.rotations.find((x) => x.valide && couvre(x, jour))
  if (!r) return e.defaut
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
  const gagnante = e.rotations.findIndex((x) => x.valide && couvre(x, jour))
  return gagnante === index ? 'en ligne' : 'masquée'
}
