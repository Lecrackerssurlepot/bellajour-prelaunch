"use client";

import { grilleArtiste, grillePage, type ChoixGrille, type PagePosee, type Trame } from "@/lib/mise-en-page/editeur";
import { PAGE_H, PAGE_L } from "@/lib/mise-en-page/geometrie";

/* Les grilles posées par-dessus les pages (au-dessus des cadres, sous le cadre actif, le pointeur les traverse). Une aide pour
   placer et pour juger : écran seulement, jamais dans Mini, l'IDML ni le PDF. Les lignes viennent des modules purs (mm) : l'écran
   ne calcule rien. `largeur` = la largeur du repère (planche 420, ou couverture 420 + dos), `pages` = où sont les pages dedans.
   - T-213 (16/11) : la grille de MISE EN PAGE (6 × 6 du moteur, 8 × 8) : les marges, les modules et leurs gouttières ;
   - lot D (12/11) : la grille d'ARTISTE : tiers, nombre d'or, diagonales, sur la page entière. */

export function GrilleEcran({ largeur, pages, choix }: { largeur: number; pages: readonly PagePosee[]; choix: ChoixGrille }) {
  return choix === "artiste" ? <GrilleArtiste largeur={largeur} pages={pages} /> : <GrilleMiseEnPage largeur={largeur} pages={pages} trame={choix} />;
}

export function GrilleMiseEnPage({ largeur, pages, trame }: { largeur: number; pages: readonly PagePosee[]; trame: Trame }) {
  return (
    <svg className="ed-grille-mep" viewBox={`0 0 ${largeur} ${PAGE_H}`} preserveAspectRatio="none" aria-hidden="true" data-trame={trame}>
      {pages.map((p, i) => {
        const g = grillePage(p, trame);
        return (
          <g key={i}>
            {g.lignes.flatMap((l, j) => g.colonnes.map((c, k) => (
              <rect key={`${j}-${k}`} className="ed-grille-mep-module" x={c.debut} y={l.debut} width={c.fin - c.debut} height={l.fin - l.debut} vectorEffect="non-scaling-stroke" />
            )))}
            <rect className="ed-grille-mep-marges" x={g.marges.x} y={g.marges.y} width={g.marges.l} height={g.marges.h} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </svg>
  );
}

export function GrilleArtiste({ largeur, pages }: { largeur: number; pages: readonly PagePosee[] }) {
  return (
    <svg className="ed-grille-art" viewBox={`0 0 ${largeur} ${PAGE_H}`} preserveAspectRatio="none" aria-hidden="true">
      {pages.map((p, i) => grilleArtiste({ x: p.x, y: 0, l: PAGE_L, h: PAGE_H }).map((l, j) => (
        <line key={`${i}-${j}`} className={`ed-grille-art--${l.genre}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} vectorEffect="non-scaling-stroke" />
      )))}
    </svg>
  );
}
