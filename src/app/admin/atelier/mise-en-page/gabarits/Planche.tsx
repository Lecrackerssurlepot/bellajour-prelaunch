/* Le dessin d'un template, à l'échelle, en millimètres (viewBox en mm).
 *
 * Composant serveur pur : aucune mesure n'est tapée ici, tout vient de
 * `@/lib/mise-en-page/geometrie` (zone utile, grille 6 × 6, fond perdu) et des
 * cadres du template. Ce qu'on voit est donc ce que l'export reçoit. */

import { FOND_PERDU, PAGE_H, PAGE_L, PLANCHE_L, GRILLE, caseGrille, zoneUtile, type Cote } from "@/lib/mise-en-page/geometrie";
import { orientationCadre, pourCote, type Cadre, type Template } from "@/lib/mise-en-page/types";

const LIBELLE_ROLE: Record<Cadre["role"], string> = { photo: "photo", titre: "titre", texte: "texte", legende: "légende" };

/** Les marges et la grille d'une page, décalées de `dx` dans le repère du dessin. */
function GrillePage({ cote, dx }: { cote: Cote; dx: number }) {
  const z = zoneUtile(cote);
  const cases: { k: string; x: number; y: number; l: number; h: number }[] = [];
  for (let lig = 0; lig < GRILLE.lignes; lig++) {
    for (let col = 0; col < GRILLE.colonnes; col++) {
      const r = caseGrille(cote, col, lig, 1, 1);
      cases.push({ k: `${col}-${lig}`, ...r });
    }
  }
  return (
    <g>
      {cases.map((c) => (
        <rect key={c.k} className="mep-case" x={c.x + dx} y={c.y} width={c.l} height={c.h} />
      ))}
      <rect className="mep-marge" x={z.x + dx} y={z.y} width={z.l} height={z.h} />
    </g>
  );
}

function CadreDessin({ c }: { c: Cadre }) {
  const cx = c.x + c.l / 2;
  const cy = c.y + c.h / 2;
  const transform = c.rotation ? `rotate(${c.rotation} ${cx} ${cy})` : undefined;
  if (c.role === "photo") {
    const lettre = Math.min(14, Math.max(4, Math.min(c.l, c.h) * 0.28));
    return (
      <g transform={transform}>
        <rect className="mep-photo" x={c.x} y={c.y} width={c.l} height={c.h} />
        <line className="mep-croix" x1={c.x} y1={c.y} x2={c.x + c.l} y2={c.y + c.h} />
        <line className="mep-croix" x1={c.x + c.l} y1={c.y} x2={c.x} y2={c.y + c.h} />
        <text className="mep-orient" x={cx} y={cy} fontSize={lettre} textAnchor="middle" dominantBaseline="central">
          {orientationCadre(c)}
        </text>
      </g>
    );
  }
  const corps = Math.min(6, Math.max(2.6, c.h * 0.7));
  return (
    <g transform={transform}>
      <rect className={`mep-texte mep-texte--${c.role}`} x={c.x} y={c.y} width={c.l} height={c.h} />
      <text className="mep-texte-lib" x={c.x + 1.2} y={cy} fontSize={corps} dominantBaseline="central">
        {LIBELLE_ROLE[c.role]}
        {c.taille ? ` ${c.taille} pt` : ""}
        {c.gras ? " · gras" : ""}
      </text>
    </g>
  );
}

/** Une double en repère planche, ou un template page posé sur une page DROITE. */
export default function Planche({ t }: { t: Template }) {
  const double = t.portee === "double";
  const cadres = double ? t.cadres : pourCote(t, "droite");
  const largeur = double ? PLANCHE_L : PAGE_L;
  /* Le fond perdu court sur les bords extérieurs, jamais au pli : une page
     droite seule n'en a pas à gauche. */
  const vb = double
    ? `${-FOND_PERDU} ${-FOND_PERDU} ${PLANCHE_L + 2 * FOND_PERDU} ${PAGE_H + 2 * FOND_PERDU}`
    : `0 ${-FOND_PERDU} ${PAGE_L + FOND_PERDU} ${PAGE_H + 2 * FOND_PERDU}`;
  const perdu = double
    ? { x: -FOND_PERDU, l: PLANCHE_L + 2 * FOND_PERDU }
    : { x: 0, l: PAGE_L + FOND_PERDU };
  return (
    <svg className="mep-svg" viewBox={vb} role="img" aria-label={`${t.id}, ${t.nom}`}>
      <rect className="mep-perdu" x={perdu.x} y={-FOND_PERDU} width={perdu.l} height={PAGE_H + 2 * FOND_PERDU} />
      <rect className="mep-papier" x={0} y={0} width={largeur} height={PAGE_H} />
      {double ? (
        <>
          <GrillePage cote="gauche" dx={0} />
          <GrillePage cote="droite" dx={PAGE_L} />
        </>
      ) : (
        <GrillePage cote="droite" dx={0} />
      )}
      {cadres.map((c, i) => (
        <CadreDessin key={i} c={c} />
      ))}
      <rect className="mep-coupe" x={0} y={0} width={largeur} height={PAGE_H} />
      {double ? <line className="mep-pli" x1={PAGE_L} y1={-FOND_PERDU} x2={PAGE_L} y2={PAGE_H + FOND_PERDU} /> : null}
    </svg>
  );
}
