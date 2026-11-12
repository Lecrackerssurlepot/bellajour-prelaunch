"use client";

import { grilleArtiste, pagesDeLaPlanche } from "@/lib/mise-en-page/editeur";
import { PAGE_H, PLANCHE_L } from "@/lib/mise-en-page/geometrie";

/* Lot D (12/11) : la grille d'artiste. Par page, les tiers, le nombre d'or et les deux diagonales, posés par-dessus les
   cadres et sous le cadre actif. Une aide pour juger : écran seulement, jamais dans Mini, l'IDML ni le PDF, et le
   pointeur la traverse. Les lignes viennent de `grilleArtiste` (mm, repère planche) : l'écran ne calcule rien. */

export function GrilleArtiste({ premiere }: { premiere: boolean }) {
  return (
    <svg className="ed-grille-art" viewBox={`0 0 ${PLANCHE_L} ${PAGE_H}`} preserveAspectRatio="none" aria-hidden="true">
      {pagesDeLaPlanche(premiere).map((page, i) => grilleArtiste(page).map((l, j) => (
        <line key={`${i}-${j}`} className={`ed-grille-art--${l.genre}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} vectorEffect="non-scaling-stroke" />
      )))}
    </svg>
  );
}
