import type { Etat } from '@/lib/atelier/transitions'

/* Les cinq jalons de la cliente — le JUMEAU de ceux de /numero/[token]/page.tsx
   (JALONS + AVANCEMENT y vivent en tête de fichier). La cliente ne connaît pas
   notre machine à neuf états : elle veut savoir où en est son numéro. Si l'un
   des deux fichiers bouge, l'autre DOIT suivre — deux progressions qui se
   contredisent entre le dashboard et la page du numéro se lisent comme une
   panne. */

export const JALONS = ['Photos', 'Couverture', 'Paiement', 'Maquette', 'Livraison']

export const AVANCEMENT: Record<Etat, number> = {
  photos_insuffisantes: 0,
  photos_recues: 1,
  apercu_pret: 2,
  payee: 3,
  maquette_prete: 3,
  validee: 4,
  en_production: 4,
  expediee: 4,
  livree: 5,
}
