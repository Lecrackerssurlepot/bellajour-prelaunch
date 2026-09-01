/* Wording de l'atelier, centralisé.
   Invariant nº5 : un seul libellé de CTA sur tout le site. Il est défini ici
   et nulle part ailleurs — c'est ce qui rend l'invariant mécanique plutôt
   que déclaratif. Aucun bouton secondaire n'existe sur la homepage. */

export const CTA_LABEL = 'Composer avec l’atelier'
export const CTA_MAGAZINE_LABEL = 'Découvrir les magazines'
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
export const CTA_NOTE_PRICE = '30 €'

export const CONTACT_EMAIL = 'contact@bellajour.com'

/* Les trois paliers — affichage d'orientation sur la homepage.
   Le prix FERME n'existe qu'à l'état 2, calculé sur le nombre de pages
   (20-29 = 30 € · 30-39 = 40 € · 40-50 = 45 €). Le fascicule de bas de
   grille le dit explicitement : rien n'est dû avant la couverture. */
export const PALIERS = [
  { photos: '40 à 59 photos', prix: '30 €', pages: '20 à 28 pages' },
  { photos: '60 à 79 photos', prix: '40 €', pages: '30 à 38 pages' },
  { photos: '80 à 100 photos', prix: '45 €', pages: '40 à 50 pages' },
] as const

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
    r: 'Oui. La quasi-totalité des numéros sont composés à partir de photos de téléphone. Envoyez-les en qualité d’origine, on s’occupe du reste.',
  },
  {
    q: 'Et si la couverture ne me plaît pas ?',
    r: 'Vous ne payez rien et on s’arrête là. Ou vous nous dites ce qui cloche et on ajuste, sans frais.',
  },
  {
    q: 'Je le reçois quand ?',
    r: 'Votre couverture sous 48 h. Le magazine imprimé chez vous sous 10 jours après validation.',
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
