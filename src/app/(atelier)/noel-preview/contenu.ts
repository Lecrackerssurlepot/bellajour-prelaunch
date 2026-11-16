/* Les textes de Noël 2026, recopiés de docs/noel-2026 (PARCOURS-ACHAT.md,
   MAILS.md). Un texte marqué `propose: true` n'existe pas dans ces fichiers :
   je l'ai écrit pour que le visuel tienne, il attend la relecture de Mathias.

   Aucun chiffre n'est tranché ici. Les montants de carte sont ceux de
   l'option D de TARIFICATION.md (25 / 35 / 45 + libre), affichés comme des
   EXEMPLES ; le nombre de places est le plafond de STRATEGIE.md (25), la
   valeur du premier jour, pas une lecture en base. */

export type Ton = 'sobre' | 'decontracte'

export const TAGLINE = 'On vous attend à l’intérieur.'
export const SIGNATURE = 'L’atelier Bellajour'

/* La phrase en grand sur la carte (retour de Mathias, 14/11) : la tagline
   ne lui parlait pas. Quatre propositions à comparer, l'ancienne en dernier
   pour mémoire. */
/* La première est RETENUE (Mathias, 14/11) ; les autres restent pour mémoire. */
export const PHRASES = [
  'Vos photos deviennent un magazine.',
  'Un magazine, composé avec vos photos.',
  'Choisissez vos photos, nous composons.',
  TAGLINE,
] as const

export const COUVERTURES_ACCUEIL = [
  { src: '/images/v2/accueil/couverture-lisbonne-360.webp', alt: 'Couverture « Lisbonne »' },
  { src: '/images/v2/accueil/couverture-rio-450.webp', alt: 'Couverture « Rio »' },
  { src: '/images/v2/accueil/couverture-cote-azur-360.webp', alt: 'Couverture « Côte d\u2019Azur »' },
] as const

/* Décision de Mathias, 16/11 : 30 € et 50 €, plus un montant libre de 20 à 200 €. */
export const MONTANTS_EXEMPLE = [30, 50] as const
export const LIBRE_MIN = 20
export const LIBRE_MAX = 200
export const PLACES_EXEMPLE = 25
export const MESSAGE_MAX = 140

export const CODE_EXEMPLE = 'BJ-CADEAU-7KQ4MR'

/* PARCOURS-ACHAT.md, tableau « Wording ». */
export const TEXTES: Record<Ton, {
  titre: string
  sousTitre: string
  apresAchat: string
  partage: string
  /* Le nombre est rendu à part, en grand : le texte l'entoure. */
  compteur: { avant: string; apres: string }
}> = {
  sobre: {
    titre: 'Offrez un souvenir.',
    sousTitre: 'Une carte, un magazine composé avec leurs photos.',
    apresAchat: 'Votre carte est prête.',
    partage: 'Montrez-la à vos proches.',
    compteur: { avant: 'Il reste', apres: 'places avant le 7 décembre.' },
  },
  decontracte: {
    titre: 'Et si le cadeau, c’était leurs photos ?',
    sousTitre: 'Vous offrez la carte, ils choisissent les photos. Nous composons.',
    apresAchat: 'C’est fait. Il ne reste qu’à la glisser sous le sapin.',
    partage: 'Faites-la circuler : une carte, c’est fait pour être montrée.',
    compteur: { avant: '', apres: 'places pour un magazine sous le sapin.' },
  },
}

export type Mail = {
  code: string
  nom: string
  objet: string
  preheader: string
  /* Paragraphes ; un bouton s'écrit `[Libellé]` seul sur sa ligne. */
  corps: Record<Ton, string[]>
  propose?: Ton[]
}

const MAILS_BRUTS: Mail[] = [
  {
    code: 'N1',
    nom: 'Fondateurs n°1',
    objet: 'Pour offrir, avant Noël',
    preheader: 'Une carte, et un deuxième exemplaire.',
    corps: {
      sobre: [
        '{{ params.PRENOM }}, vous faites partie des premiers à nous avoir confié vos photos. Merci.',
        'Pour Noël, deux nouveautés. La carte cadeau, valable douze mois, pour offrir un magazine composé avec les photos d’une autre personne. Et pour vous, un deuxième exemplaire dans le même colis : moins 40 % à couverture identique, moins 20 % avec une autre couverture, pour une livraison en France.',
        'Pour recevoir un magazine avant Noël, vos photos doivent nous parvenir avant le lundi 7 décembre.',
        '[Offrir une carte]',
      ],
      decontracte: [
        '{{ params.PRENOM }}, vous étiez là au début, alors voici nos nouveautés en premier.',
        'Une carte cadeau, pour offrir un magazine sans connaître la date de ses photos. Et un deuxième exemplaire à côté du premier, moins 40 % si c’est le même, moins 20 % s’il change de couverture, en France.',
        'Les photos pour Noël : avant le lundi 7 décembre.',
        '[Offrir une carte]',
        'On vous attend à l’intérieur.',
      ],
    },
  },
  {
    code: 'N2',
    nom: 'Fondateurs n°2',
    objet: 'Dernier jour garanti : lundi',
    preheader: 'Le 7 décembre, nous fermons les dépôts.',
    corps: {
      sobre: [
        '{{ params.PRENOM }}, lundi 7 décembre est le dernier jour pour nous confier vos photos et recevoir votre magazine avant Noël.',
        'Il reste {{ params.PLACES }} places. Au-delà, la carte cadeau envoyée par e-mail reste disponible.',
      ],
      decontracte: [
        '{{ params.PRENOM }}, plus qu’un week-end.',
        'Lundi 7 décembre, on ferme les dépôts pour Noël : il reste {{ params.PLACES }} places. Après, la carte cadeau par e-mail prend le relais.',
      ],
    },
  },
  {
    code: 'GC1',
    nom: 'Carte cadeau, acheteur',
    objet: 'Votre carte cadeau Bellajour',
    preheader: 'Le code est valable douze mois.',
    corps: {
      sobre: [
        '{{ params.PRENOM }}, votre carte de {{ params.MONTANT }} € est prête.',
        'Code : {{ params.CODE }}. Valable douze mois, utilisable en une fois ; si la commande coûte moins, le reste va sur le compte de la personne qui l’utilise.',
        '[Voir et imprimer la carte]',
        'Pour une livraison avant Noël, les photos doivent arriver avant le 7 décembre.',
      ],
      decontracte: [
        '{{ params.PRENOM }}, c’est fait : une carte de {{ params.MONTANT }} € attend sous le sapin.',
        'Code {{ params.CODE }}, douze mois pour l’utiliser, le reste est gardé sur le compte.',
        '[Voir et imprimer la carte]',
      ],
    },
  },
  {
    code: 'GC2',
    nom: 'Carte cadeau, destinataire',
    objet: '{{ params.PRENOM_DONATEUR }} vous offre un magazine Bellajour',
    preheader: 'Votre code est à l’intérieur.',
    corps: {
      sobre: [
        '{{ params.PRENOM }}, {{ params.PRENOM_DONATEUR }} vous offre un magazine composé avec vos photos.',
        '« {{ params.MESSAGE }} »',
        'Votre code : {{ params.CODE }}, valable douze mois.',
        '[Choisir mes photos]',
      ],
      decontracte: [
        '{{ params.PRENOM }}, {{ params.PRENOM_DONATEUR }} pense à vous : un magazine avec vos photos, à vous de choisir lesquelles.',
        '« {{ params.MESSAGE }} »',
        'Code {{ params.CODE }}.',
        '[Choisir mes photos]',
        'On vous attend à l’intérieur.',
      ],
    },
  },
  {
    code: 'GC1b',
    nom: 'Carte programmée, acheteur',
    objet: 'Votre carte partira le {{ params.DATE_ENVOI }}',
    preheader: 'Rien à faire d’ici là.',
    corps: {
      sobre: [
        '{{ params.PRENOM }}, votre carte de {{ params.MONTANT }} € pour {{ params.PRENOM_DEST }} est prête.',
        'Elle partira par e-mail le {{ params.DATE_ENVOI }} au matin. Nous vous écrirons quand elle sera arrivée.',
        'Code : {{ params.CODE }}, valable douze mois à partir de ce jour.',
        '[Voir et imprimer la carte]',
      ],
      decontracte: [
        '{{ params.PRENOM }}, la carte de {{ params.PRENOM_DEST }} attend son jour : le {{ params.DATE_ENVOI }}, au matin.',
        'Nous vous préviendrons quand elle sera partie.',
        '[Voir et imprimer la carte]',
      ],
    },
    propose: ['sobre', 'decontracte'],
  },
  {
    code: 'GC2b',
    nom: 'Carte remise, acheteur',
    objet: '{{ params.PRENOM_DEST }} a reçu votre carte',
    preheader: 'Elle est partie ce matin.',
    corps: {
      sobre: [
        '{{ params.PRENOM }}, votre carte est partie ce matin chez {{ params.PRENOM_DEST }}.',
        'S’il ne la trouve pas, il peut regarder dans ses courriers indésirables. Vous pouvez aussi lui transmettre la carte vous-même.',
        '[Voir et imprimer la carte]',
      ],
      decontracte: [
        '{{ params.PRENOM }}, c’est parti : {{ params.PRENOM_DEST }} a sa carte depuis ce matin.',
        '[Voir et imprimer la carte]',
      ],
    },
    propose: ['sobre', 'decontracte'],
  },
  {
    code: 'GC5',
    nom: 'Carte annulée et remboursée',
    objet: 'Votre carte cadeau est remboursée',
    preheader: 'Le code ne fonctionne plus.',
    corps: {
      sobre: [
        '{{ params.PRENOM }}, nous avons remboursé votre carte de {{ params.MONTANT }} €.',
        'Le code {{ params.CODE }} ne fonctionne plus. Le remboursement apparaît sur votre relevé sous quelques jours ouvrés.',
      ],
      decontracte: [
        '{{ params.PRENOM }}, la carte de {{ params.MONTANT }} € est remboursée et son code désactivé.',
        'Le montant revient sur votre carte bancaire sous quelques jours ouvrés.',
      ],
    },
    propose: ['sobre', 'decontracte'],
  },
  {
    code: 'GC3',
    nom: 'Carte utilisée',
    objet: 'Votre carte a servi',
    preheader: 'Le reste est sur votre compte.',
    corps: {
      sobre: ['{{ params.PRENOM }}, votre carte a servi pour votre magazine.', 'Il reste {{ params.RELIQUAT }} €, gardés sur votre compte Bellajour jusqu’au {{ params.DATE }}. Connectez-vous avec cette adresse e-mail pour les retrouver.', '[Voir mon compte]'],
      decontracte: ['Carte utilisée.', '{{ params.RELIQUAT }} € vous attendent sur votre compte.', '[Voir mon compte]'],
    },
    propose: ['sobre', 'decontracte'],
  },
  {
    code: 'GC4',
    nom: 'Avis d’expiration',
    objet: 'Votre carte expire bientôt',
    preheader: 'Il reste un solde à utiliser.',
    corps: {
      sobre: ['Votre carte expire le {{ params.DATE }}. Il reste {{ params.SOLDE }} € à utiliser.', '[Composer mon magazine]', 'Texte légal d’expiration : à faire valider.'],
      decontracte: ['Votre carte s’arrête le {{ params.DATE }}.', 'Il reste {{ params.SOLDE }} €.', '[Composer mon magazine]', 'Texte légal d’expiration : à faire valider.'],
    },
    propose: ['decontracte'],
  },
  {
    code: 'M4',
    nom: 'Bloc de la confirmation',
    objet: '(bloc ajouté au mail M4 existant)',
    preheader: '',
    corps: {
      sobre: ['Votre commande comprend {{ params.EXEMPLAIRES }} exemplaires, dans le même colis.', 'Carte cadeau appliquée : {{ params.MONTANT_CARTE }} €.'],
      decontracte: ['{{ params.EXEMPLAIRES }} exemplaires, un seul colis.', 'Carte appliquée : {{ params.MONTANT_CARTE }} €.'],
    },
    propose: ['sobre', 'decontracte'],
  },
  {
    code: 'M5',
    nom: 'Bloc de l’épreuve (France)',
    objet: '(bloc ajouté au mail M5 existant)',
    preheader: '',
    corps: {
      sobre: ['Pour un 1ᵉʳ exemplaire acheté, le 2ᵉ à -40 % (même couverture) ou -20 % (autre couverture), dans le même colis, jusqu’au lancement de l’impression.', '[Ajouter un exemplaire]'],
      decontracte: ['Un 2ᵉ exemplaire dans le même colis : -40 % s’il est identique, -20 % avec une autre couverture.', 'Jusqu’au lancement de l’impression.', '[Ajouter un exemplaire]'],
    },
    propose: ['decontracte'],
  },
]

/* L'ordre de la liste complète (MAILS.md, 16/11) : celui où ils partent. */
const ORDRE = ['N1', 'N2', 'GC1', 'GC1b', 'GC2', 'GC2b', 'GC3', 'GC4', 'GC5', 'M4', 'M5']
export const MAILS: Mail[] = [...MAILS_BRUTS].sort((a, b) => ORDRE.indexOf(a.code) - ORDRE.indexOf(b.code))
