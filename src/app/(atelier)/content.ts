/* Wording de l'atelier, centralisé.
   Invariant nº5 : un seul libellé de CTA sur tout le site. Il est défini ici
   et nulle part ailleurs — c'est ce qui rend l'invariant mécanique plutôt
   que déclaratif. Aucun bouton secondaire n'existe sur la homepage. */

import { GRILLE, EUROS_MIN } from '@/lib/atelier/grille'

export const CTA_LABEL = 'Composer avec l’atelier'
export const CTA_MAGAZINE_LABEL = 'Découvrir les magazines'
/* Quand un brouillon vit sur l'appareil (draftEnCours), les boutons vers
   /composer disent la reprise plutôt que le départ (03/09/2026). Le brouillon
   reprend tout seul à l'ouverture de /composer : même adresse, aucun
   paramètre — ne JAMAIS y accrocher `?reprendre=`, voir plus bas. */
export const CTA_REPRISE_LABEL = 'Continuer la composition'
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

/* Les trois paliers — affichage d'orientation sur la page produit.
   DÉRIVÉS de la source unique `@/lib/atelier/grille` (07/09/2026) : les
   bornes et les montants ne s'écrivent plus ici, ils ne peuvent donc plus
   contredire le prix ferme calculé par prix.ts (qui dérive de la même
   grille). Le prix FERME n'existe qu'à l'état 2, calculé sur le nombre de
   pages composé par l'atelier ; rien n'est dû avant la couverture.

   NOUVEL ORDRE D'AFFICHAGE (chantier barème par pages, 07/09) : les PAGES
   en tête de carte — ce sont elles qui déterminent le prix —, puis le
   prix, puis les photos en ligne secondaire (« ~40 à 59 photos », un
   ordre de grandeur, d'où le tilde). L'espace insécable entre le montant
   et € vient de la dérivation : un prix ne se coupe jamais en fin de
   ligne. */
export const PALIERS = GRILLE.map((g) => ({
  pages: `${g.minPages} à ${g.maxPages} pages`,
  prix: `${g.euros} €`,
  photos: `~${g.photosMin} à ${g.photosMax} photos`,
}))

/* « dès 30 € » — le prix d'appel est le MIN de la grille, jamais
   recopié à la main. */
export const CTA_NOTE_PRICE = `${EUROS_MIN} €`

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
    r: 'Oui. La quasi-totalité des numéros sont composés à partir de photos de téléphone. Une seule condition : envoyez-les en qualité d’origine — pas de capture d’écran, pas d’export compressé par une messagerie. Le dépôt les prend telles quelles, on s’occupe du reste.',
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
