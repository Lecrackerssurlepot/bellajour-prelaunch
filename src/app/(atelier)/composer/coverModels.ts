/**
 * Les deux couvertures d'exemple de l'écran 3 (PRD §7.3).
 *
 * CE SONT DES EXEMPLES, PAS UN CHOIX. Rien n'est enregistré, aucune sélection
 * n'a de conséquence produit : elles existent pour lui montrer son titre exister.
 * Elles restent cliquables (effet de survol) — c'est tout.
 *
 * Les polices d'exemple seront remplacées par des fichiers fournis par Mathias.
 * D'où ce tableau : ajouter un modèle, c'est ajouter une entrée ICI, sans jamais
 * toucher au composant. `fichier: null` = on utilise la police de la charte.
 */

export type CoverModel = {
  id: string
  nom: string
  /* Chemin d'un fichier de police fourni. null → police de la charte.
     ⚠️ Ne jamais inventer un chemin : tant que le fichier n'existe pas
     dans /public, la valeur reste null. */
  fichier: string | null
  famille: 'display' | 'ui'
  taille: string
  casse: 'uppercase' | 'none'
  alignement: 'centre' | 'bas-gauche'
  interlettrage: string
  graisse: number
  tag: string
}

export const COVER_MODELS: CoverModel[] = [
  {
    id: 'a',
    nom: 'Modèle A',
    fichier: null,
    famille: 'display',
    taille: 'clamp(17px, 4vw, 26px)',
    casse: 'uppercase',
    alignement: 'centre',
    interlettrage: '.14em',
    graisse: 400,
    tag: 'Glamour',
  },
  {
    id: 'b',
    nom: 'Modèle B',
    fichier: null,
    famille: 'ui',
    taille: 'clamp(15px, 3.4vw, 21px)',
    casse: 'none',
    alignement: 'bas-gauche',
    interlettrage: '-.01em',
    graisse: 500,
    tag: 'Contemporain',
  },
]

/* Titre affiché dans les couvertures tant que la cliente n'a rien tapé. */
export const TITRE_PLACEHOLDER = 'Nuits Sonores'
export const TITRE_MAX = 34
