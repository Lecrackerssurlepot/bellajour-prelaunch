/* ════════════════════════════════════════════════════════════
   LANCEMENT — Données visuelles à fournir
   Tant que le tableau est VIDE, la section Galerie ne se rend pas
   (return null) : la page reste complète et propre. Le remplir quand
   les couvertures sont prêtes — la section apparaît toute seule,
   sans toucher aux composants.
   ════════════════════════════════════════════════════════════ */

export interface GalerieCover {
  /* Chemin public de la couverture, ex. '/images/lancement/galerie/bali.webp'
     (format attendu : portrait 2/3). */
  src: string
  /* Destination affichée au survol, ex. 'Bali'. */
  destination: string
}

/* Mur de couvertures de la section « La galerie ».
   Cible : ~36 couvertures (3 bandes de 12) dans public/images/lancement/galerie/. */
export const GALERIE_COVERS: GalerieCover[] = []
