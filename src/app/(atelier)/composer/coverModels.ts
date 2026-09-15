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
 * ── ÉTAT : LE TITRE EST VIVANT SUR DEUX MODÈLES SUR QUATRE ────────────────
 * Mathias, le 15/09 : « utilise Interlope pour Aussie et 26 en attendant. »
 *
 * Aussie et 26 servent donc leur plaque NUE, et le titre du client s'y écrit
 * en direct en Interlope (OFL 1.1, Gabriel Dubourg — la licence voyage avec
 * le fichier dans `polices/`). Interlope n'est pas le lettrage d'origine :
 * c'est la plus proche de la bibliothèque `assets/typo/`, comparée mot à mot
 * contre le lettrage découpé dans chaque master.
 *
 * Sicile et This Night gardent leur visuel titré, et c'est délibéré :
 * — Sicile est un didone, et la bibliothèque n'en contient AUCUN. Le nom de
 *   sa police est à demander au graphiste. Cormorant, notre serif, est une
 *   garalde : la substituer se verrait.
 * — This Night correspond à Aileron Black, mais Aileron n'a aucun fichier de
 *   licence joint (donc tous droits réservés par défaut). L'audit du 27/08
 *   note qu'elle est en réalité en CC0 ; il manque la notice qui le prouve.
 *
 * ⚠️ NE PAS « HARMONISER » EN METTANT INTERLOPE PARTOUT. Quatre modèles au
 * même lettrage, c'est quatre fois le même modèle, et la question de l'écran
 * ne veut plus rien dire.
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
  /* La plaque SANS lettrage, quand le titre du client s'y écrit en direct.
     null = la police du modèle manque encore, on sert la version titrée.
     ⚠️ Deux modèles sur quatre au 15/09 : Sicile attend le nom de sa police
     (la bibliothèque n'a aucun didone) et This Night la notice CC0
     d'Aileron. Servir leur plaque nue sans lettrage donnerait une couverture
     vide — pire que la maquette d'origine. */
  plaqueNue: string | null
  /* Le NOM DE LA VARIABLE CSS qui porte le lettrage, déclarée par next/font
     dans `layout.tsx`. Pas le nom de la famille : next/font le hache
     (`__interlope_a1b2c3`) et il n'est lisible qu'à travers la variable.
     `TitreSurCouverture` la résout avant de mesurer. */
  police: string | null
  /* La couleur du lettrage, RELEVÉE dans le visuel livré (médiane du 2 % de
     pixels les plus extrêmes de la zone du titre : le cœur du trait, pas son
     antialiasing). Jamais choisie à l'œil. */
  couleurTitre: string | null
  /* Le titre porté par le visuel livré. Sert l'`alt` aujourd'hui, et dira
     à l'étape 2 quel mot la plaque nue a perdu. */
  titreOrigine: string
  /* Où le titre se pose. */
  zone: ZoneTexte
  /* La seconde ligne, quand le modèle en porte une (« 2026 », « MON ANNEE »).
     null = le modèle n'en a pas.
     ⚠️ TRANCHÉ PAR MATHIAS LE 15/09 : c'est un texte FIXE, posé par le site —
     SAUF si le client écrit un sous-titre à l'écran 3, auquel cas le sous-titre
     prend sa place. La ligne ne disparaît donc jamais, elle change de source.
     C'est aussi ce qui donne enfin une destination visible au champ
     « sous-titre · première de couverture », resté jusqu'ici sans effet. */
  ligneBasse: { texte: string; zone: ZoneTexte } | null
  /* Comment le titre se réarrange quand il ne tient plus. Voir DÉCOUPE. */
  repli: 'reduire' | 'une-ligne-au-dessus' | 'une-couleur'
  /* Pour le repli 'une-couleur' : celle qui reste. TRANCHÉ le 15/09 — « quand
     il n'y a qu'un seul mot, garde le blanc ». Le rouge de « THIS » est la
     couleur d'accompagnement, pas celle du titre. */
  couleurSeule?: string
  /* COMMENT le titre se pose. Les quatre maquettes ne mettent pas leur
     lettrage de la même façon, et ignorer ça reviendrait à poser quatre fois
     le même bloc de texte sur quatre images différentes.
     — 'simple'      : un bloc dans la zone (Aussie, Mon année).
     — 'haut-et-bas' : le titre DEUX FOIS, en haut et en bas (Sicile). C'est
                       ce que fait la maquette, qui répète le mot autour de la
                       photo. Voir la limite plus bas.
     — 'deux-tons'   : première ligne dans `couleurAccent`, seconde dans
                       `couleurTitre`, légèrement chevauchées (This Night).
                       Sur un seul mot, `couleurSeule` s'applique. */
  disposition: 'simple' | 'haut-et-bas' | 'deux-tons'
  /* La seconde bande, pour 'haut-et-bas'. `zone` porte alors la première. */
  zoneBis?: ZoneTexte
  /* La couleur de la première ligne, pour 'deux-tons'. */
  couleurAccent?: string
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
 * TRANCHÉ PAR MATHIAS LE 15/09, les deux points qui restaient ouverts :
 * — la seconde ligne (« 2026 », « MON ANNEE ») est un texte FIXE, remplacé par
 *   le sous-titre du client quand il en écrit un (voir `ligneBasse`) ;
 * — This Night sur un seul mot garde le BLANC (voir `couleurSeule`). Le rouge
 *   de « THIS » accompagne, il ne porte pas le titre.
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
    plaqueNue: 'modele-aussie-nu',
    police: '--font-interlope',
    couleurTitre: '#345a94',
    titreOrigine: 'Aussie',
    zone: { gauche: 29.2, droite: 86.6, haut: 6.1, bas: 18.5 },
    ligneBasse: { texte: '2026', zone: { gauche: 47, droite: 53.2, haut: 95.3, bas: 96.7 } },
    repli: 'reduire',
    disposition: 'simple',
  },
  {
    id: 'mon-annee',
    nom: 'Mon année',
    tag: 'Doux',
    image: 'modele-mon-annee',
    plaqueNue: 'modele-mon-annee-nu',
    police: '--font-interlope',
    couleurTitre: '#ffffff',
    titreOrigine: '26',
    /* ⚠️ LA SEULE ZONE QUI N'EST PAS CELLE DU LETTRAGE LIVRÉ, et c'est
       délibéré. Mesurée, elle valait { 7,8 → 22,4 ; 11 → 17,3 } : la place
       du petit « 26 » en haut à gauche. Deux caractères y tiennent, un titre
       non — « Nuits Sonores » y tombait à 4,5 px sur une vignette, illisible.
       Mathias, le 15/09 devant l'écran : « 26 est beaucoup trop petit. »

       La zone s'ouvre donc sur le vide rose du haut. Les bornes ne sont pas
       choisies à l'œil : la photo de la plaque occupe x 44 → 94 % et
       y 45,2 → 90,1 % (mesuré sur BJ-Q02-nu), et « MON ANNEE » vit à
       y 95,2 %. Descendre à 34 % laisse donc onze points de marge avant la
       photo, et la largeur s'arrête à 80 % pour garder une respiration à
       droite. Le bord gauche reste à 7,8 %, celui du « 26 » d'origine : la
       maquette garde son axe.

       C'est aussi, à peu près, le milieu entre les deux variantes livrées —
       le petit « 26 » et le grand (y 9,2 → 50,6, pleine largeur). Le
       graphiste avait donc déjà dessiné les deux bornes. */
    zone: { gauche: 7.8, droite: 80, haut: 10, bas: 34 },
    ligneBasse: { texte: 'MON ANNEE', zone: { gauche: 80.2, droite: 92.6, haut: 95.2, bas: 96 } },
    repli: 'reduire',
    disposition: 'simple',
  },
  {
    id: 'sicile',
    nom: 'Sicile',
    tag: 'Graphique',
    image: 'modele-sicile',
    plaqueNue: 'modele-sicile-nu',
    /* Bodoni Moda : un vrai didone, c'est-à-dire exactement ce que fait cette
       couverture — fûts épais, empattements filiformes non raccordés. La
       bibliothèque `assets/typo/` n'en contenait aucun ; Google Fonts si, et
       en OFL, donc auto-hébergée par next/font comme Cormorant et DM Sans. */
    police: '--font-bodoni',
    couleurTitre: '#ffffff',
    titreOrigine: 'Sicile',
    /* La zone couvre les deux tiers de la hauteur : le mot est répété autour
       de la photo, pas posé au-dessus. D'où le repli le plus franc des quatre. */
    /* ⚠️ LA ZONE N'EST PLUS LE BLOC ENTIER. Mesuré au profil de lignes le
       15/09 : le lettrage occupe bien 17 % à 83 % de la hauteur, mais c'est
       parce que le mot est RÉPÉTÉ quatre fois autour de la photo. Deux
       bandes portent une ligne pleine (17→28 % et 71→83 %), les deux du
       milieu ne laissent voir que le S et le E de chaque côté, le reste
       étant masqué par la photo.
       Écrire le titre dans le bloc entier donnerait un mot haut de 66 % de
       la couverture. On reproduit donc les DEUX bandes pleines. */
    zone: { gauche: 13, droite: 87.4, haut: 17, bas: 28 },
    zoneBis: { gauche: 13, droite: 87.4, haut: 71, bas: 83 },
    ligneBasse: null,
    repli: 'une-ligne-au-dessus',
    disposition: 'haut-et-bas',
  },
  {
    id: 'this-night',
    nom: 'This Night',
    tag: 'Nuit',
    image: 'modele-this-night',
    plaqueNue: 'modele-this-night-nu',
    /* Archivo Black : la grotesque noire la plus proche du lettrage livré —
       même largeur, même graisse, même G à barre et éperon. OFL, Google
       Fonts. Elle remplace Aileron, qui correspondait aussi bien mais dont
       la notice CC0 manque au dossier (voir assets/typo/LICENCES.md). */
    police: '--font-archivo',
    couleurTitre: '#ffffff',
    couleurAccent: '#841600',
    /* Deux mots, deux couleurs, qui se chevauchent : « THIS » en rouge
       derrière, « NIGHT » en blanc devant. */
    titreOrigine: 'This Night',
    zone: { gauche: 14.8, droite: 87.4, haut: 3, bas: 19.8 },
    ligneBasse: null,
    repli: 'une-couleur',
    couleurSeule: '#ffffff',
    disposition: 'deux-tons',
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
