/**
 * Les petits signes dessinés de la page de suivi (18/09/2026).
 * Inline SVG, jamais un caractère : ils suivent la couleur du texte et ne
 * dépendent d'aucune police. Partagés entre la carte du document (état
 * maquette) et la carte du colis (état expédiée).
 */

/** « S'ouvre ailleurs » : le PDF, le Canva, le suivi du transporteur. */
export const ICONE_EXTERNE = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3H3v10h10v-3M9 3h4v4M13 3L7 9" />
  </svg>
)
