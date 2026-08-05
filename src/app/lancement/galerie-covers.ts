/* ════════════════════════════════════════════════════════════
   LANCEMENT — Données visuelles à fournir
   Tant qu'un tableau est VIDE, la section correspondante ne se
   rend pas (return null) : la page reste complète et propre.
   Remplir les tableaux quand les visuels sont prêts — la section
   apparaît toute seule, sans toucher aux composants.
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

export interface InstagramPost {
  /* Chemin public du visuel carré, ex. '/images/lancement/instagram/post-01.webp'. */
  src: string
  /* Lien du post (optionnel) — sinon le visuel n'est pas cliquable. */
  href?: string
}

/* Bande Instagram en tête du footer (6 visuels carrés recommandés). */
export const INSTAGRAM_POSTS: InstagramPost[] = []
