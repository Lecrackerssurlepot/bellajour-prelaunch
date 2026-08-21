/* Wording de l'atelier, centralisé.
   Invariant nº5 : un seul libellé de CTA sur tout le site. Il est défini ici
   et nulle part ailleurs — c'est ce qui rend l'invariant mécanique plutôt
   que déclaratif. Aucun bouton secondaire n'existe sur la homepage. */

export const CTA_LABEL = 'Composer avec l’atelier'
export const CTA_HREF = '/atelier/composer'
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
    texte: 'De 40 à 100, directement depuis le téléphone. Ne triez pas trop.',
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
