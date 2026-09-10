/* Wording de l'atelier, centralisé.
   Invariant nº5 : un seul libellé de CTA sur tout le site. Il est défini ici
   et nulle part ailleurs — c'est ce qui rend l'invariant mécanique plutôt
   que déclaratif. Aucun bouton secondaire n'existe sur la homepage. */

import {
  BANDES_PHOTOS,
  EUROS_MAX_PUBLIC,
  EUROS_MIN,
  PAGES_MAX_PUBLIC,
  PAGES_MIN,
} from '@/lib/atelier/grille'

export const CTA_LABEL = 'Composer avec l’atelier'
export const CTA_MAGAZINE_LABEL = 'Découvrir les magazines'
/* Quand un brouillon vit sur l'appareil (draftEnCours), les boutons vers
   /composer disent la reprise plutôt que le départ (03/09/2026). Le brouillon
   reprend tout seul à l'ouverture de /composer : même adresse, aucun
   paramètre — ne JAMAIS y accrocher `?reprendre=`, voir plus bas. */
export const CTA_REPRISE_LABEL = 'Continuer la composition'
/* LE TROISIÈME LIBELLÉ, ET LE DERNIER (08/09/2026).
   Il ne vaut QUE dans /compte, et seulement quand la cliente a déjà quelque
   chose sur son étagère ou en cours. Là, « Composer avec l'atelier » est un
   libellé de découverte proposé à quelqu'un qui a déjà découvert : ce qu'elle
   fait en cliquant, c'est en commencer UN AUTRE, et le bouton doit le dire.
   Partout ailleurs — accueil, page produit, univers, page du numéro — les
   deux libellés du dessus restent les seuls. */
export const CTA_NOUVEAU_LABEL = 'Composer un nouveau numéro'
/* DEUX ADRESSES, DEUX LIBELLÉS (01/09/2026).
   Jusqu'ici un seul libellé (« Composer avec l'atelier ») servait les deux
   destinations : l'ancien invariant nº5. Il tombe, à la demande de Mathias, car
   un même mot pour « voir le produit » et « remplir le formulaire » brouillait
   la marche. Désormais LE LIBELLÉ SUIT LA DESTINATION :

   CTA_HREF → CTA_MAGAZINE_LABEL — la porte du récit. Depuis l'accueil, la barre
   de tête et la page 07 de l'univers, le bouton mène à la PAGE PRODUIT, pas au
   questionnaire. Qui vient de lire sept pages de récit ne connaît toujours ni
   le prix, ni le papier, ni le délai : l'envoyer droit dans un formulaire à
   six écrans, c'est lui demander de s'engager avant d'avoir vu ce qu'il achète.
   Le libellé le dit maintenant : « Découvrir les magazines ».

   COMPOSER_HREF → CTA_LABEL — l'entrée du questionnaire. Utilisée par la page
   produit, dernier écran où l'on peut encore hésiter, et par /numero/[token],
   où la cliente REPREND un dépôt en cours : lui repasser par la page produit
   serait lui vendre ce qu'elle a déjà payé. Là le bouton compose : « Composer
   avec l'atelier ».

   ⚠️ Ne jamais recâbler `?reprendre=` sur CTA_HREF. Le paramètre n'est lu que
   par /composer ; sur la page produit il serait ignoré EN SILENCE, et la
   cliente repartirait sur un dépôt vide en croyant reprendre le sien. */
export const CTA_HREF = '/magazine'
export const COMPOSER_HREF = '/composer'

export const CONTACT_EMAIL = 'contact@bellajour.com'

/* ─────────────────────────── LE PRIX, EN TROIS FORMES ───────────────────────
   Tout est DÉRIVÉ de `@/lib/atelier/grille`, la source unique : un prix TTC
   par nombre de pages, de 20 à 60. Rien ici ne recopie un montant, donc rien
   ici ne peut contredire le prix ferme calculé par le serveur.

   ⚠️ LES TROIS ENCARTS « 20 à 29 pages / 30 € » ONT DISPARU (10/09/2026, lot 2).
   Ils décrivaient les trois anciens paliers ; avec vingt prix il n'y a plus
   trois formats à comparer, il y a une échelle. Le bloc JSX qui les rendait
   est archivé dans `archive/pdp-trois-formats/`. Le prix se dit maintenant en
   une ligne (PRIX_LIGNE) et en une phrase (PRIX_PHRASE). */

/* « dès 25 € » — le prix d'appel est le MIN de la grille, jamais recopié. */
export const CTA_NOTE_PRICE = `${EUROS_MIN} €`

/* LA LIGNE DE PRIX (08/09/2026, généralisée le 10/09).
   Sur un écran de 375 px, les trois encarts faisaient 104 px de large chacun :
   pour tenir, leurs libellés étaient descendus à 11 et 12 px, et on demandait
   un arbitrage — quel palier ? — à quelqu'un qui n'avait pas encore lu ce
   qu'on vend. Le premier écran ne porte donc qu'UNE information de prix.
   ⚠️ Les bornes sont DÉRIVÉES de la grille, jamais recopiées, et par
   `Math.min`/`Math.max` sur toute la table plutôt qu'en indexant la première
   et la dernière ligne (`.at(-1)!` serait un non-null de confort qui casserait
   en silence sur une grille vide). L'espace insécable avant € est celui de
   CTA_NOTE_PRICE : un prix ne se coupe jamais en fin de ligne. */
const PHOTOS_MIN = Math.min(...BANDES_PHOTOS.map((b) => b.photosMin))
const PHOTOS_MAX = Math.max(...BANDES_PHOTOS.map((b) => b.photosMax))

export const PRIX_LIGNE = {
  des: `Dès ${EUROS_MIN} €`,
  pages: `${PAGES_MIN} à ${PAGES_MAX_PUBLIC} pages`,
  photos: `${PHOTOS_MIN} à ${PHOTOS_MAX} photos`,
}

/* LA PHRASE DE PRIX (10/09/2026). Ce que les trois encarts disaient en neuf
   nombres, dit en une phrase et sans arbitrage à rendre : l'échelle complète,
   ses deux bouts, et ce qui la fait varier. Le lot 6 y ajoutera la livraison,
   qui sera facturée en sus sur devis — d'où une phrase et non une constante
   collée dans un JSX. */
/* DEUX phrases depuis le lot 6 (10/09/2026) : la livraison sort du prix, et
   une page produit qui ne le dit pas ferait découvrir le port au moment de
   payer. On ne donne AUCUN montant ici — il vient d'un devis, destination par
   destination (interdit nº5) — mais on dit qu'il existe et quand il s'affiche. */
/* Retirée de la page produit le 10/09/2026 à la demande de Mathias ; gardée
   dérivée (offre publique) pour un usage futur. */
export const PRIX_PHRASE = `De ${EUROS_MIN} € pour ${PAGES_MIN} pages à ${EUROS_MAX_PUBLIC} € pour ${PAGES_MAX_PUBLIC} pages. Livraison en sus, affichée avant paiement.`

/* Le titre de la bande parcours (lot 3, 07/09 — arbitrage T-086 rendu par
   Mathias : la bande gagne un vrai titre au lieu de flotter sans nom). */
export const PARCOURS_TITRE = 'Le parcours avec l’atelier'
export const PARCOURS_SOUS_TITRE = 'Depuis le téléphone ou l’ordinateur, en trois gestes.'

export const ETAPES = [
  {
    titre: 'Vous racontez le moment',
    texte: 'Deux minutes. Vous choisissez même le titre de votre numéro.',
  },
  {
    titre: 'Vous déposez vos photos',
    texte: 'De 40 à 100, directement depuis le téléphone.',
  },
  {
    titre: 'Vous recevez votre couverture',
    texte: 'Sous 48 h, gratuitement. Vous décidez après, jamais avant.',
  },
] as const

export const FAQ = [
  {
    q: 'Les photos de mon téléphone suffisent ?',
    r: 'Oui. La quasi-totalité des numéros sont composés à partir de photos de téléphone. Une seule condition : envoyez-les en qualité d’origine, pas de capture d’écran, pas d’export compressé par une messagerie. Le dépôt les prend telles quelles, on s’occupe du reste.',
  },
  {
    q: 'Et si la couverture ne me plaît pas ?',
    r: 'Vous ne payez rien et on s’arrête là. Ou vous nous dites ce qui cloche et on ajuste, sans frais.',
  },
  {
    q: 'Je le reçois quand ?',
    r: 'Votre couverture sous 48 h. Le magazine imprimé chez vous sous 10 jours après validation, avec un lien de suivi du colis dès l’expédition.',
  },
  {
    q: 'Comment composez-vous mon magazine ?',
    r: 'À la main, page à page, dans l’atelier. Vos photos et votre histoire donnent le rythme : pas de gabarit automatique, pas de remplissage. Vous voyez la maquette complète avant l’impression.',
  },
  {
    q: 'Je peux l’offrir ?',
    r: 'Oui. Indiquez-le en racontant le moment, on adapte la première page et on livre à l’adresse de votre choix.',
  },
] as const

/* Les quatre dos de l'étagère (S2) — exemples de collection. */
export const SPINES = [
  { titre: 'Nuits Sonores', variant: 1, hauteur: 230 },
  { titre: 'Portugal', variant: 2, hauteur: 262 },
  { titre: 'L’été', variant: 3, hauteur: 212 },
  { titre: 'Chez Léa', variant: 4, hauteur: 248 },
] as const
