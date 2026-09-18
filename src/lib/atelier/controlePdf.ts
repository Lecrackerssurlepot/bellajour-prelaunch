/**
 * L'INSPECTION D'UN PDF D'IMPRESSION — côté serveur (pdf-lib).
 *
 * Extraite de `/api/admin/atelier/impression/controle` le 18/09/2026 (T-121)
 * pour que la route de transition puisse JUGER les fichiers avant de
 * commander, avec exactement les mêmes verdicts que l'écran de contrôle :
 * deux copies auraient fini par dire deux choses différentes du même PDF.
 *
 * Elle lit, elle ne modifie rien. Les règles (verdicts) vivent dans
 * `impression.ts` ; ici, seulement la lecture des boîtes et le comptage.
 */
import { PDFDocument } from "pdf-lib";
import {
  pointsEnMm,
  verdictMultiplePages,
  verdictPagesPdf,
  verdictTaillePage,
  dosMmPourPages,
  largeurCouvertureMm,
  FORMAT_PAGE_PDF_MM,
  GRAMMAGE_INTERIEUR_GSM,
  type ProduitImpression,
  type TypeFichier,
  type VerdictPages,
  type VerdictTaille,
} from "./impression";

export type DimensionMm = { largeur: number; hauteur: number };

export type Inspection = {
  nbPages: number;
  /** MediaBox de la première page, en mm. */
  pageMm: DimensionMm;
  /** TrimBox si le PDF en déclare une DIFFÉRENTE du MediaBox, sinon null. */
  trimMm: DimensionMm | null;
  taillesUniformes: boolean;
  /** Les autres formats rencontrés quand les pages divergent. */
  autresTaillesMm: DimensionMm[];
  verdict: VerdictPages;
  /** Le format contre les specs relevées (SPECS-CLOUDPRINTER.md). */
  verdictTaille: VerdictTaille;
  /**
   * Ce que la feuille AURAIT DÛ mesurer, quand c'est calculable — une
   * `cover` de dos carré sur un dossier paginé. `null` partout ailleurs.
   */
  attenduCouverture: { largeurMm: number; hauteurMm: number; dosMm: number; grammageGsm: number } | null;
  /** La règle de compte du produit, quand elle s'applique. */
  multiple: { ok: boolean; regle: string } | null;
};

function memeDim(a: DimensionMm, b: DimensionMm): boolean {
  return a.largeur === b.largeur && a.hauteur === b.hauteur;
}

/** Ouvre le PDF et en tire tout ce que le contrôle affiche et que la commande juge. */
export async function inspecterPdf(
  bytes: Uint8Array,
  type: TypeFichier,
  nbPagesDossier: number | null,
  produit: ProduitImpression | null,
): Promise<Inspection> {
  /* `updateMetadata: false` : on LIT, on ne veut pas qu'une date de
     modification bouge dans un objet qu'on ne réécrira jamais. */
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const pages = doc.getPages();
  if (pages.length === 0) throw new Error("PDF sans aucune page");

  const dimsDe = (boite: { width: number; height: number }): DimensionMm => ({
    largeur: pointsEnMm(boite.width),
    hauteur: pointsEnMm(boite.height),
  });

  const premiere = pages[0];
  const pageMm = dimsDe(premiere.getMediaBox());

  /* pdf-lib replie TrimBox → CropBox → MediaBox quand la boîte manque : une
     trim IDENTIQUE au MediaBox ne dit donc rien, on ne montre que celle qui
     existe vraiment (fond perdu déclaré). */
  const trim = dimsDe(premiere.getTrimBox());
  const trimMm = memeDim(trim, pageMm) ? null : trim;

  const dosAttendu = dosMmPourPages(nbPagesDossier);
  const largeurAttendue = largeurCouvertureMm(nbPagesDossier);

  const autresTaillesMm: DimensionMm[] = [];
  for (const page of pages.slice(1)) {
    const d = dimsDe(page.getMediaBox());
    if (!memeDim(d, pageMm) && !autresTaillesMm.some((a) => memeDim(a, d))) {
      autresTaillesMm.push(d);
    }
  }

  return {
    nbPages: pages.length,
    pageMm,
    trimMm,
    taillesUniformes: autresTaillesMm.length === 0,
    autresTaillesMm,
    verdict: verdictPagesPdf(type, pages.length, nbPagesDossier),
    /* Le MediaBox EST la « page PDF » que les specs mesurent (216 × 303
       attendus, fond perdu compris) — la TrimBox, quand elle existe, ne
       fait que déclarer où tombera le rognage. */
    verdictTaille: verdictTaillePage(type, pageMm.largeur, pageMm.hauteur, nbPagesDossier),
    attenduCouverture:
      type === "cover" && largeurAttendue !== null && dosAttendu !== null
        ? {
            largeurMm: largeurAttendue,
            hauteurMm: FORMAT_PAGE_PDF_MM.hauteur,
            dosMm: dosAttendu,
            grammageGsm: GRAMMAGE_INTERIEUR_GSM,
          }
        : null,
    multiple: verdictMultiplePages(type, pages.length, produit),
  };
}

/**
 * Ce qui EMPÊCHE une commande, en une phrase lisible, ou null si le fichier
 * peut partir. C'est la règle que `envoyer_impression` applique (T-121) :
 * jusqu'au 18/09, le contrôle annonçait un format faux et le bouton restait
 * armé, un export Canva brut serait parti chez Cloudprinter avec sa marge.
 */
export function refusDeCommande(type: TypeFichier, i: Inspection): string | null {
  const c = (d: DimensionMm) => `${d.largeur} × ${d.hauteur} mm`;
  if (i.verdictTaille === "sans_fond_perdu") {
    return `${c(i.pageMm)} : le format fini, sans les 3 mm de fond perdu. Il faut ${FORMAT_PAGE_PDF_MM.largeur} × ${FORMAT_PAGE_PDF_MM.hauteur} mm.`;
  }
  if (i.verdictTaille === "hors_format") {
    const attendu =
      type === "cover" && i.attenduCouverture
        ? `${i.attenduCouverture.largeurMm} × ${i.attenduCouverture.hauteurMm} mm (dos de ${i.attenduCouverture.dosMm} mm)`
        : `${FORMAT_PAGE_PDF_MM.largeur} × ${FORMAT_PAGE_PDF_MM.hauteur} mm`;
    return `${c(i.pageMm)} au lieu de ${attendu}.`;
  }
  if (!i.taillesUniformes) {
    return `Les pages n'ont pas toutes la même taille (${c(i.pageMm)} puis ${i.autresTaillesMm.map(c).join(", ")}).`;
  }
  if (i.verdict.genre === "ecart") {
    return `${i.nbPages} pages au lieu des ${i.verdict.attendu} du dossier.`;
  }
  if (i.multiple && !i.multiple.ok) {
    return `${i.nbPages} pages : le produit exige un ${i.multiple.regle}.`;
  }
  return null;
}
