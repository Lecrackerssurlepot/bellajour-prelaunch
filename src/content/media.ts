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
  /** La version des écrans de 700 px et moins (autre format, autre taille). Absente : la même image. */
  mobile?: string
  /** Le point gardé quand la page recadre l'image (`object-position`, « 50% 30% »). Absent : le centre. */
  cadrage?: string
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
  /** Pas de version téléphone : l'image est posée par le script de la page, pas par <ImageSite>. */
  sansTelephone?: true
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
      fichier: '/images/v2/ouverture/double-page-mission-beach-2000.webp',
      alt: 'Une double page : Mission Beach',
    },
    rotations: [],
  },
  'accueil.double-page-2': {
    role: "La double page qui se tourne ensuite",
    ratio: '1400 / 990',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/ouverture/double-page-coral-bay-2000.webp',
      alt: 'Une double page : Coral Bay',
    },
    rotations: [],
  },
  'accueil.photo-exemple': {
    role: "Une photo d'exemple de l'essai (avant celles du client)",
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/ouverture/noosa-2000.webp',
      alt: 'Une photo de vacances à Noosa',
    },
    rotations: [],
  },
  'accueil.ouverture-1': {
    role: "Le magazine qui s'ouvre : la photo de la couverture (remplacée par celle du client)",
    ratio: '210 / 297',
    type: 'image',
    sansTelephone: true,
    provisoire: true,
    defaut: {
      fichier: '/images/v2/ouverture/lagon-2000.webp',
      alt: 'Un lagon',
      cadrage: '22% 50%',
    },
    rotations: [],
  },
  'accueil.ouverture-2': {
    role: "Le magazine qui s'ouvre : la page 2, en pleine page",
    ratio: '210 / 297',
    type: 'image',
    sansTelephone: true,
    provisoire: true,
    defaut: {
      fichier: '/images/v2/ouverture/australia-2000.webp',
      alt: 'Un voyage en Australie',
      cadrage: '0% 40%',
    },
    rotations: [],
  },
  'accueil.ouverture-3': {
    role: "Le magazine qui s'ouvre : la page 3, la photo sous le titre",
    type: 'image',
    sansTelephone: true,
    provisoire: true,
    defaut: {
      fichier: '/images/v2/ouverture/noosa-2000.webp',
      alt: 'Une plage au coucher du soleil',
      cadrage: '12% 60%',
    },
    rotations: [],
  },
  'accueil.ouverture-4': {
    role: "Le magazine qui s'ouvre : la page 4, photo de gauche",
    type: 'image',
    sansTelephone: true,
    provisoire: true,
    defaut: {
      fichier: '/images/v2/ouverture/lagon-2000.webp',
      alt: 'Un lagon',
      cadrage: '85% 50%',
    },
    rotations: [],
  },
  'accueil.ouverture-5': {
    role: "Le magazine qui s'ouvre : la page 4, photo de droite",
    type: 'image',
    sansTelephone: true,
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/header-magazines-paysage-1792.webp',
      alt: 'Des numéros posés sur une table',
      cadrage: '40% 60%',
    },
    rotations: [],
  },
  'accueil.ouverture-6': {
    role: "Le magazine qui s'ouvre : la page 5, en pleine page",
    ratio: '210 / 297',
    type: 'image',
    sansTelephone: true,
    provisoire: true,
    defaut: {
      fichier: '/images/v2/ouverture/australia-2000.webp',
      alt: 'Un voyage en Australie',
      cadrage: '22% 70%',
    },
    rotations: [],
  },
  'accueil.matiere': {
    role: "La vidéo de la section « La matière » (carrée, 27/11)",
    ratio: '1 / 1',
    type: 'video',
    defaut: {
      fichier: '/images/v2/matiere/magazine-tour.webp',
      alt: 'Plusieurs numéros Bellajour feuilletés au soleil',
      video: { mp4: '/images/v2/matiere/magazine-tour.mp4', webm: '/images/v2/matiere/magazine-tour.webm' },
    },
    rotations: [],
  },
  'accueil.porte-offrir': {
    role: "La vignette de la porte « Pour offrir »",
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/composer/modele-mon-annee-grand-900.webp',
      alt: 'Un numéro « Mon année » à offrir',
    },
    rotations: [],
  },
  'accueil.porte-groupes': {
    role: "La vignette de la porte « Pour un groupe »",
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/header-magazines-paysage-1792.webp',
      alt: 'Des numéros Bellajour posés côte à côte',
    },
    rotations: [],
  },
  'magazine.couverture': {
    role: "La première couverture de l'éventail, en tête de la page magazine",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/magazine/couverture-sicile-1400.webp',
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
      fichier: '/images/v2/accueil/couverture-rio-1400.webp',
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
      fichier: '/images/v2/magazine/double-page-pelican-feed-1400.webp',
      alt: 'Une double page : Pelican Feed',
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
  'offrir.noel-1': {
    role: 'Bloc Noël d’Offrir : la couverture de gauche',
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-lisbonne-640.webp',
      alt: 'Un numéro sur Lisbonne',
    },
    rotations: [],
  },
  'offrir.noel-2': {
    role: 'Bloc Noël d’Offrir : la couverture de droite',
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-aussie-640.webp',
      alt: 'Un numéro sur l’Australie',
    },
    rotations: [],
  },
  'groupes.numero-1': {
    role: 'Pour les groupes : « Nos derniers numéros », n° 1 (les quatre premiers font aussi la pile de l’ouverture)',
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-rio-700.webp',
      alt: 'Un numéro : Rio',
    },
    rotations: [],
  },
  'groupes.numero-2': {
    role: 'Pour les groupes : « Nos derniers numéros », n° 2 (les quatre premiers font aussi la pile de l’ouverture)',
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-cote-azur-640.webp',
      alt: 'Un numéro : Côte d’Azur',
    },
    rotations: [],
  },
  'groupes.numero-3': {
    role: 'Pour les groupes : « Nos derniers numéros », n° 3 (les quatre premiers font aussi la pile de l’ouverture)',
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/magazine/couverture-sicile-450.webp',
      alt: 'Un numéro : Sicile',
    },
    rotations: [],
  },
  'groupes.numero-4': {
    role: 'Pour les groupes : « Nos derniers numéros », n° 4 (les quatre premiers font aussi la pile de l’ouverture)',
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-aussie-640.webp',
      alt: 'Un numéro : Australie',
    },
    rotations: [],
  },
  'groupes.numero-5': {
    role: 'Pour les groupes : « Nos derniers numéros », n° 5 (les quatre premiers font aussi la pile de l’ouverture)',
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/composer/modele-mon-annee-grand-336.webp',
      alt: 'Un numéro : Mon année',
    },
    rotations: [],
  },
  'groupes.numero-6': {
    role: 'Pour les groupes : « Nos derniers numéros », n° 6 (les quatre premiers font aussi la pile de l’ouverture)',
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-lisbonne-640.webp',
      alt: 'Un numéro : Lisbonne',
    },
    rotations: [],
  },
  'groupes.numero-7': {
    role: 'Pour les groupes : « Nos derniers numéros », n° 7 (les quatre premiers font aussi la pile de l’ouverture)',
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/magazine/couverture-noosa-500.webp',
      alt: 'Un numéro : Noosa',
    },
    rotations: [],
  },
  'groupes.wei-1': {
    role: 'Pour les groupes : week-end d’intégration, première double page',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/groupes/double-wei-1-760.webp',
      alt: 'Double page : WEI 2026, Lisbonne',
    },
    rotations: [],
  },
  'groupes.wei-2': {
    role: 'Pour les groupes : week-end d’intégration, seconde double page',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/groupes/double-wei-2-750.webp',
      alt: 'Double page : week-end d’intégration, jour 1',
    },
    rotations: [],
  },
  'groupes.ski-1': {
    role: 'Pour les groupes : voyage au ski, première double page',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/groupes/double-ski-1-770.webp',
      alt: 'Double page : Tout schuss, saison hiver 2026',
    },
    rotations: [],
  },
  'groupes.ski-2': {
    role: 'Pour les groupes : voyage au ski, seconde double page',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/groupes/double-ski-2-750.webp',
      alt: 'Double page : voyage au ski, jour 2',
    },
    rotations: [],
  },
  'groupes.entreprise': {
    role: 'Pour les groupes : une année d’équipe (vide = la section est cachée ; un visuel la rouvre)',
    type: 'image',
    optionnel: true,
    defaut: null,
    rotations: [],
  },
  'edition.eventail-1': {
    role: "Édition collective, tableau de bord : couverture 1 de l'éventail",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-lisbonne-640.webp',
      alt: 'La couverture d’un numéro sur Lisbonne',
    },
    rotations: [],
  },
  'edition.eventail-2': {
    role: "Édition collective, tableau de bord : couverture 2 de l'éventail",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-aussie-640.webp',
      alt: 'La couverture d’un numéro sur l’Australie',
    },
    rotations: [],
  },
  'edition.eventail-3': {
    role: "Édition collective, tableau de bord : couverture 3 de l'éventail",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-cote-azur-640.webp',
      alt: 'La couverture d’un numéro sur la Côte d’Azur',
    },
    rotations: [],
  },
  'edition.vitrine-1': {
    role: "Édition collective, vitrine des styles : couverture 1",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-lisbonne-640.webp',
      alt: 'Lisbonne',
    },
    rotations: [],
  },
  'edition.vitrine-2': {
    role: "Édition collective, vitrine des styles : couverture 2",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-the-boys-640.webp',
      alt: 'The Boys',
    },
    rotations: [],
  },
  'edition.vitrine-3': {
    role: "Édition collective, vitrine des styles : couverture 3",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-cote-azur-640.webp',
      alt: 'Côte d’Azur',
    },
    rotations: [],
  },
  'edition.vitrine-4': {
    role: "Édition collective, vitrine des styles : couverture 4",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-rio-700.webp',
      alt: 'Rio',
    },
    rotations: [],
  },
  'edition.vitrine-5': {
    role: "Édition collective, vitrine des styles : couverture 5",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/accueil/couverture-aussie-640.webp',
      alt: 'Aussie',
    },
    rotations: [],
  },
  'edition.vitrine-6': {
    role: "Édition collective, vitrine des styles : couverture 6",
    ratio: '210 / 297',
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/magazine/couverture-sicile-900.webp',
      alt: 'Sicile',
    },
    rotations: [],
  },
  'edition.vitrine-double': {
    role: "Édition collective, vitrine des styles : la double page",
    type: 'image',
    provisoire: true,
    defaut: {
      fichier: '/images/v2/magazine/double-page-24h-hautes-alpes-1400.webp',
      alt: 'La couverture ouverte des 24h des Hautes-Alpes',
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
  const { fichier, alt, video, mobile, cadrage } = r
  return { fichier, alt, ...(video ? { video } : {}), ...(mobile ? { mobile } : {}), ...(cadrage ? { cadrage } : {}) }
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
