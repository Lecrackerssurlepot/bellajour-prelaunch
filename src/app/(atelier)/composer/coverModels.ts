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
 * ── ÉTAT : LES COUVERTURES PORTENT LEUR PROPRE LETTRAGE ───────────────────
 * Ce que le client voit, ce sont les visuels livrés, AVEC le titre du
 * graphiste (« Aussie », « 26 », « SICILE », « THIS NIGHT »). Son propre
 * titre ne s'y écrit pas.
 *
 * ⚠️ CE N'EST PAS UN MANQUE, C'EST UNE DÉCISION. Le mécanisme a existé et
 * marchait : le titre du client s'écrivait en direct sur la plaque nue, à
 * l'emplacement, à la police et à la couleur relevés sur chaque visuel.
 * Mathias l'a débranché le 15/09 après l'avoir vu — « le titre ne change
 * pas, tu mets juste les visuels qu'on a avec les titres, et la personne
 * peut sélectionner si elle aime bien ». La question de l'écran est « un
 * style vous parle déjà ? » : on demande de reconnaître une ambiance, pas de
 * se projeter dans une maquette de son numéro. Ça, c'est le travail de
 * l'atelier, et la vraie maquette le montrera plus tard.
 *
 * Tout est dans `archive/titre-vivant-composer/` : la règle de découpe, la
 * mesure, la police Interlope avec sa licence, et la marche à suivre pour
 * rallumer. NE PAS LE RÉÉCRIRE.
 *
 * ⚠️ LES CHAMPS CI-DESSOUS RESTENT, ET CE N'EST PAS DU CODE MORT. `zone`,
 * `zoneBis`, `ligneBasse`, les couleurs, `disposition`, `repli`, `police` :
 * ce sont des MESURES, obtenues en superposant la version titrée et la
 * plaque nue de chaque master, pixel à pixel. L'écran ne les lit plus ; elles
 * sont ce qui permettrait de tout rallumer en une demi-heure, et elles ne
 * coûtent rien. Le jour où on les jette, il faut les remesurer.
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
  /* Chemin sous /images/v2/, SANS la largeur ni l'extension.
     ⚠️ Il porte son dossier depuis le 15/09 : les six couvertures de la bande
     de l'accueil rejoignent l'écran 3 (« on peut rajouter d'autres visuels du
     coup, ceux de la homepage »), et elles vivent sous `accueil/`. Les
     recopier sous `composer/` aurait dupliqué des pixels identiques. */
  image: string
  /* Les largeurs réellement produites pour CE fichier par images-v2.mjs.
     Elles diffèrent d'un dossier à l'autre : 168/336/900 pour les quatre
     premiers modèles, 240/360/640 pour la bande de l'accueil, qui les avait
     déjà. 640 couvre une vignette de 200 px CSS à trois fois la densité. */
  largeurs: readonly number[]
  /* La plaque SANS lettrage, quand le titre du client s'y écrit en direct.
     null = la police du modèle manque encore, on sert la version titrée.
     ⚠️ Deux modèles sur quatre au 15/09 : Sicile attend le nom de sa police
     (la bibliothèque n'a aucun didone) et This Night la notice CC0
     d'Aileron. Servir leur plaque nue sans lettrage donnerait une couverture
     vide — pire que la maquette d'origine. */
  plaqueNue?: string | null
  /* ⚠️ DOCUMENTATION, PLUS UN POINTEUR VIVANT (15/09, quatrième passage).
     Ce champ portait le nom d'une variable CSS déclarée par next/font ;
     depuis que le titre vivant est archivé, ces polices ne sont plus
     chargées, et laisser `--font-bodoni` ici aurait été une référence
     pendante. Il porte donc le NOM DE LA FAMILLE : ce qu'il faut redemander
     à Google Fonts le jour où on rallume, et rien de plus. */
  police?: string | null
  /* La couleur du lettrage, RELEVÉE dans le visuel livré (médiane du 2 % de
     pixels les plus extrêmes de la zone du titre : le cœur du trait, pas son
     antialiasing). Jamais choisie à l'œil. */
  couleurTitre?: string | null
  /* Le titre porté par le visuel livré. Sert l'`alt` aujourd'hui, et dira
     à l'étape 2 quel mot la plaque nue a perdu. */
  titreOrigine: string
  /* Où le titre se pose. Absent sur les modèles jamais mesurés. */
  zone?: ZoneTexte
  /* La seconde ligne, quand le modèle en porte une (« 2026 », « MON ANNEE »).
     null = le modèle n'en a pas.
     ⚠️ TRANCHÉ PAR MATHIAS LE 15/09 : c'est un texte FIXE, posé par le site —
     SAUF si le client écrit un sous-titre à l'écran 3, auquel cas le sous-titre
     prend sa place. La ligne ne disparaît donc jamais, elle change de source.
     C'est aussi ce qui donne enfin une destination visible au champ
     « sous-titre · première de couverture », resté jusqu'ici sans effet. */
  ligneBasse?: { texte: string; zone: ZoneTexte } | null
  /* Comment le titre se réarrange quand il ne tient plus. Voir DÉCOUPE. */
  repli?: 'reduire' | 'une-ligne-au-dessus' | 'une-couleur'
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
  disposition?: 'simple' | 'haut-et-bas' | 'deux-tons'
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

/* Produites par images-v2.mjs pour `composer/` : la vignette fait au plus
   200 px CSS (colonne de droite, bureau), 336 couvre le double de densité et
   900 le triple avec de la marge. */
const COMPOSER_LARGEURS = [168, 336, 900] as const

/* La bande de l'accueil les avait déjà. 640 couvre 200 px CSS à trois fois
   la densité : inutile d'en produire d'autres, ce sont les mêmes pixels. */
const ACCUEIL_LARGEURS = [240, 360, 640] as const

export const COVER_MODELS: CoverModel[] = [
  {
    id: 'aussie',
    nom: 'Aussie',
    tag: 'Vacances',
    image: 'composer/modele-aussie',
    largeurs: COMPOSER_LARGEURS,
    plaqueNue: 'modele-aussie-nu',
    police: 'Interlope',
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
    /* ⚠️ LE MASTER EST LA GRANDE VARIANTE DU « 26 » depuis le 15/09 :
       « pour le 26 tu prends le gros ». Le graphiste en avait livré deux, un
       petit chiffre en haut à gauche et un grand qui tient la moitié de la
       couverture. Le petit ne se lisait pas sur une vignette. Les zones
       ci-dessous ont été mesurées sur le PETIT : à remesurer si le titre
       vivant est un jour rallumé. */
    tag: 'Doux',
    image: 'composer/modele-mon-annee-grand',
    largeurs: COMPOSER_LARGEURS,
    plaqueNue: 'modele-mon-annee-nu',
    police: 'Interlope',
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
    image: 'composer/modele-sicile',
    largeurs: COMPOSER_LARGEURS,
    plaqueNue: 'modele-sicile-nu',
    /* Bodoni Moda : un vrai didone, c'est-à-dire exactement ce que fait cette
       couverture — fûts épais, empattements filiformes non raccordés. La
       bibliothèque `assets/typo/` n'en contenait aucun ; Google Fonts si, et
       en OFL, donc auto-hébergée par next/font comme Cormorant et DM Sans. */
    police: 'Bodoni Moda 700',
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
    image: 'composer/modele-this-night',
    largeurs: COMPOSER_LARGEURS,
    plaqueNue: 'modele-this-night-nu',
    /* Archivo Black : la grotesque noire la plus proche du lettrage livré —
       même largeur, même graisse, même G à barre et éperon. OFL, Google
       Fonts. Elle remplace Aileron, qui correspondait aussi bien mais dont
       la notice CC0 manque au dossier (voir assets/typo/LICENCES.md). */
    police: 'Archivo Black',
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

  /* ── LES COUVERTURES DE L'ACCUEIL (15/09/2026) ────────────────────────
     Mathias : « on peut rajouter d'autres visuels du coup, ceux de la
     homepage. » Ce sont les six couvertures de la bande de la page 04, déjà
     en production, déjà converties, déjà à leur place sous `accueil/`. Elles
     n'ont rien à faire de plus pour servir ici : elles sont au même format A
     (4066 x 5750) et portent déjà leur propre lettrage.

     ⚠️ « THIS NIGHT » N'EST PAS REPRISE ICI : c'est le master A07, et c'est
     déjà le modèle `this-night` ci-dessus. Un même visuel deux fois dans la
     grille se lirait comme un bug.

     ⚠️ AUCUNE MESURE sur ces cinq-là. Les champs `zone`, `police`,
     `plaqueNue`… restent absents, et c'est normal : elles n'ont jamais été
     livrées en paire avec/sans lettrage. Il faudrait les mesurer avant de
     pouvoir y écrire un titre vivant — voir `archive/titre-vivant-composer/`.

     ⚠️ Deux modèles s'appellent « Aussie » (celui aux palmiers et celui de la
     ville de nuit). C'est l'ÉTIQUETTE qui les distingue à l'écran, pas le
     titre imprimé : « Vacances » et « Ville ». */
  {
    id: 'the-boys',
    nom: 'The Boys',
    tag: 'Smoking',
    image: 'accueil/couverture-the-boys',
    largeurs: ACCUEIL_LARGEURS,
    titreOrigine: 'The Boys',
  },
  {
    id: 'lisbonne',
    nom: 'Lisbonne',
    tag: 'Néon',
    image: 'accueil/couverture-lisbonne',
    largeurs: ACCUEIL_LARGEURS,
    titreOrigine: 'Lisbonne',
  },
  {
    id: 'cote-azur',
    nom: 'Côte d’Azur',
    tag: 'Classique',
    image: 'accueil/couverture-cote-azur',
    largeurs: ACCUEIL_LARGEURS,
    titreOrigine: 'Côte d’Azur',
  },
  {
    id: 'aussie-ville',
    nom: 'Aussie, la ville',
    tag: 'Ville',
    image: 'accueil/couverture-aussie',
    largeurs: ACCUEIL_LARGEURS,
    titreOrigine: 'Aussie',
  },
  {
    id: 'thats-life',
    nom: 'That’s Life',
    tag: 'Crépuscule',
    image: 'accueil/couverture-thats-life',
    largeurs: ACCUEIL_LARGEURS,
    titreOrigine: 'That’s Life',
  },
]

export function modeleSrcSet(m: CoverModel): string {
  return m.largeurs.map((l) => `/images/v2/${m.image}-${l}.webp ${l}w`).join(', ')
}

/* La source de repli du `<img>` : la taille du milieu, celle que sert un
   écran ordinaire. Jamais la plus grande — un navigateur sans srcset
   téléchargerait 900 px pour en peindre 200. */
export function modeleSrc(m: CoverModel): string {
  const milieu = m.largeurs[Math.min(1, m.largeurs.length - 1)]
  return `/images/v2/${m.image}-${milieu}.webp`
}

/* La plus grande largeur produite : celle que sert un agrandissement (la
   loupe de la fiche admin, 21/09). Jamais dans un `<img>` de vignette. */
export function modeleSrcGrand(m: CoverModel): string {
  const grand = m.largeurs[m.largeurs.length - 1]
  return `/images/v2/${m.image}-${grand}.webp`
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
