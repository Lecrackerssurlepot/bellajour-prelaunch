/**
 * Les modèles de couverture de l'écran 3.
 *
 * ── CE QUI A CHANGÉ LE 15/09/2026 ─────────────────────────────────────────
 * Jusqu'ici : deux couvertures DESSINÉES EN CSS, sans image, et le fichier
 * disait « CE SONT DES EXEMPLES, PAS UN CHOIX. Rien n'est enregistré ». Elles
 * montraient le titre exister, rien de plus.
 *
 * Désormais : quatre vrais modèles livrés par l'atelier graphique, et le choix
 * EST enregistré — c'est tout l'objet de T-091. « Si le client choisit un
 * thème qu'il aime déjà, on vise juste sur ses goûts dès le premier essai. »
 * Le choix reste FACULTATIF : `aucune` est une réponse légitime, et l'absence
 * de réponse aussi. Les deux partent à l'atelier comme « proposition libre ».
 *
 * ⚠️ NE PAS CONFONDRE avec le saut retiré le 28/08 (« je ne sais pas encore,
 * choisissez pour moi » sur le TITRE), qui posait un titre vide en base et
 * laissait l'atelier avec un dossier « Sans titre ». Ici le titre reste
 * obligatoire : seul le style est facultatif, et ne rien choisir n'enlève
 * aucune information à l'atelier.
 *
 * ── ÉTAT : LE TITRE N'EST PAS ENCORE VIVANT ───────────────────────────────
 * Ce que le client voit aujourd'hui, ce sont les couvertures AVEC leur titre
 * d'origine (« Aussie », « 26 », « SICILE », « THIS NIGHT »). Son propre titre
 * ne s'y écrit pas encore.
 *
 * Pourquoi : les quatre lettrages sont dans quatre typographies différentes,
 * et AUCUNE n'est Cormorant Garamond ni DM Sans, nos deux polices. Sans les
 * fichiers de police, écrire le titre du client par-dessus la plaque nue
 * donnerait quatre modèles au même lettrage — c'est-à-dire quatre fois le
 * même modèle, et la question ne veut plus rien dire.
 *
 * Les plaques nues SONT livrées et attendent dans les masters
 * (`BJ-Q01-nu.png`… hors git). `zone` ci-dessous porte déjà leurs mesures.
 * L'étape 2 est mécanique le jour où les polices arrivent.
 */

export type ZoneTexte = {
  /* Bornes du bloc de texte, en % de la couverture. MESURÉES le 15/09/2026
     en superposant la version titrée et la plaque nue de chaque modèle
     (différence pixel à pixel, seuil 18/255, segmentation par bandes).
     Ce ne sont pas des estimations : c'est là que le graphiste a posé son
     lettrage, au dixième de pour cent près. */
  gauche: number
  droite: number
  haut: number
  bas: number
}

export type CoverModel = {
  id: string
  nom: string
  /* Le mot qui qualifie le style, sous la vignette. */
  tag: string
  /* Base du chemin dans /images/v2/composer/ — les largeurs s'y ajoutent. */
  image: string
  /* Le titre porté par le visuel livré. Sert l'`alt` aujourd'hui, et dira
     à l'étape 2 quel mot la plaque nue a perdu. */
  titreOrigine: string
  /* Où le titre se pose. */
  zone: ZoneTexte
  /* La seconde ligne, quand le modèle en porte une (« 2026 », « MON ANNEE »).
     null = le modèle n'en a pas. Son sort est à trancher avec Mathias : texte
     fixe posé par le site, ou report du sous-titre facultatif de l'écran 3 ? */
  ligneBasse: { texte: string; zone: ZoneTexte } | null
  /* Comment le titre se réarrange quand il ne tient plus. Voir DÉCOUPE. */
  repli: 'reduire' | 'une-ligne-au-dessus' | 'une-couleur'
}

/**
 * ── LA RÈGLE DE DÉCOUPE (réfléchie le 15/09/2026, à la demande de Mathias) ──
 *
 * Le problème : ces compositions sont dessinées pour UN mot précis — « Aussie »
 * (6 lettres), « 26 » (2 signes), « SICILE » (6), « THIS NIGHT » (2 mots). Le
 * client, lui, tapera « Nuits Sonores », « Le mariage de Léa et Tom », « Papa »
 * ou « Corse ». Une mise en page taillée pour six lettres ne survit pas telle
 * quelle à vingt-quatre, et réduire la police jusqu'à ce que ça rentre donne
 * une couverture au titre minuscule : techniquement juste, visuellement mort.
 *
 * Cinq règles, dans cet ordre.
 *
 * 1. MESURER, JAMAIS COMPTER. Le nombre de caractères est un mauvais juge :
 *    « MMMMM » et « iiiii » ont la même longueur et pas la même largeur. On
 *    mesure la largeur RENDUE dans la police du modèle (Canvas `measureText`),
 *    puis on ajuste. C'est la base des quatre règles suivantes.
 *
 * 2. ON CONSERVE LA MASSE, PAS LA TAILLE. C'est le point important. Ce qui
 *    fait tenir ces compositions, ce n'est pas le corps de la police : c'est
 *    la SURFACE que le lettrage occupe, et l'équilibre entre cette masse et la
 *    photo. Le bloc de titre garde donc la boîte mesurée dans `zone` — sa
 *    largeur ET sa hauteur — et la taille de police devient ce qui la remplit.
 *    Un titre long en deux lignes plus petites occupe la même place qu'un
 *    titre court en une ligne plus grande : la couverture reste équilibrée.
 *
 * 3. LA COUPE SUIT LE SENS. On coupe entre les mots, jamais dans un mot : une
 *    couverture ne se césure pas. Sur deux lignes, on ne remplit pas la
 *    première avant de passer à la suivante (découpe « gloutonne ») — on
 *    cherche la coupure qui ÉQUILIBRE les deux lignes, celle qui minimise
 *    l'écart de largeur. Et les mots-outils (« de », « à », « et », « la »)
 *    restent collés au mot qui suit : une ligne qui finit par « de » est
 *    l'erreur la plus visible d'une couverture.
 *
 * 4. TROIS PALIERS, PAS UNE RÉDUCTION CONTINUE. Réduire sans fin finit
 *    toujours par de l'illisible. Chaque modèle a donc trois états :
 *      · une ligne, au corps du modèle — le titre court, identique à la maquette ;
 *      · deux lignes équilibrées dans la même boîte (règle 2) ;
 *      · au-delà, le modèle BASCULE sur son repli (champ `repli`) plutôt que
 *        de rapetisser encore. Sicile cesse de répéter le mot et le pose sur
 *        une ligne au-dessus de la photo ; This Night abandonne ses deux
 *        couleurs pour une seule. Le modèle change d'arrangement : il ne
 *        s'écrase pas.
 *
 * 5. UN PLANCHER, ET UN PLAFOND. Plancher : sous une certaine taille le titre
 *    n'est plus lisible sur une vignette, et c'est le repli qui prend le
 *    relais — on ne tronque JAMAIS le titre du client, on change de mise en
 *    page. Plafond : un titre de deux lettres (« 26 », « Papa ») ne doit pas
 *    grossir pour remplir une boîte dessinée pour « THIS NIGHT », sinon il
 *    devient une affiche. On ne dépasse pas le corps de la maquette de plus
 *    d'un sixième.
 *
 * Reste à trancher par Mathias, parce que ça touche la maquette et pas le
 * code : pour This Night, quelle coupe entre les deux couleurs quand le titre
 * n'a pas deux mots ? (« Papa » en rouge derrière et en blanc devant ?)
 */
export const DECOUPE = {
  /* Deux lignes au plus : une couverture n'est pas un paragraphe. */
  lignesMax: 2,
  /* Mots gardés avec le mot suivant, jamais seuls en fin de ligne. */
  motsOutils: ['de', 'des', 'du', 'la', 'le', 'les', 'à', 'au', 'aux', 'et', 'en', 'un', 'une', 'd’', 'l’'],
  /* Part du corps de la maquette qu'on s'autorise à dépasser (titre très court). */
  plafond: 7 / 6,
  /* Sous cette part du corps de la maquette, on bascule sur le repli. */
  plancher: 0.55,
} as const

export const COVER_MODELS: CoverModel[] = [
  {
    id: 'aussie',
    nom: 'Aussie',
    tag: 'Vacances',
    image: 'modele-aussie',
    titreOrigine: 'Aussie',
    zone: { gauche: 29.2, droite: 86.6, haut: 6.1, bas: 18.5 },
    ligneBasse: { texte: '2026', zone: { gauche: 47, droite: 53.2, haut: 95.3, bas: 96.7 } },
    repli: 'reduire',
  },
  {
    id: 'mon-annee',
    nom: 'Mon année',
    tag: 'Doux',
    image: 'modele-mon-annee',
    titreOrigine: '26',
    zone: { gauche: 7.8, droite: 22.4, haut: 11, bas: 17.3 },
    ligneBasse: { texte: 'MON ANNEE', zone: { gauche: 80.2, droite: 92.6, haut: 95.2, bas: 96 } },
    repli: 'reduire',
  },
  {
    id: 'sicile',
    nom: 'Sicile',
    tag: 'Graphique',
    image: 'modele-sicile',
    titreOrigine: 'Sicile',
    /* La zone couvre les deux tiers de la hauteur : le mot est répété autour
       de la photo, pas posé au-dessus. D'où le repli le plus franc des quatre. */
    zone: { gauche: 13, droite: 87.4, haut: 17, bas: 83 },
    ligneBasse: null,
    repli: 'une-ligne-au-dessus',
  },
  {
    id: 'this-night',
    nom: 'This Night',
    tag: 'Nuit',
    image: 'modele-this-night',
    /* Deux mots, deux couleurs, qui se chevauchent : « THIS » en rouge
       derrière, « NIGHT » en blanc devant. */
    titreOrigine: 'This Night',
    zone: { gauche: 14.8, droite: 87.4, haut: 3, bas: 19.8 },
    ligneBasse: null,
    repli: 'une-couleur',
  },
]

/* Les largeurs produites par scripts/images-v2.mjs pour ces quatre-là. */
export const MODELE_LARGEURS = [168, 336, 900] as const

export function modeleSrcSet(image: string): string {
  return MODELE_LARGEURS.map((l) => `/images/v2/composer/${image}-${l}.webp ${l}w`).join(', ')
}

/* La valeur enregistrée quand le client dit explicitement « aucune préférence ».
   Distincte de la chaîne vide, qui veut dire « n'a pas répondu » : l'atelier
   compose librement dans les deux cas, mais la statistique n'est pas la même. */
export const MODELE_AUCUN = 'aucune'

/* Tout ce que la route accepte. Une valeur hors de cette liste est ignorée. */
export const MODELES_VALIDES: readonly string[] = [
  ...COVER_MODELS.map((m) => m.id),
  MODELE_AUCUN,
]

/* Titre affiché tant que le client n'a rien tapé. */
export const TITRE_PLACEHOLDER = 'Nuits Sonores'
export const TITRE_MAX = 34
