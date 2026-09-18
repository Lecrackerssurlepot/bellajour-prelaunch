/**
 * PRÉPARER UN PDF POUR L'IMPRIMEUR, DANS LE NAVIGATEUR (T-121, 18/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * L'atelier dépose l'export Canva tel quel — doubles pages, marge des traits
 * de coupe, couverture sans dos — et ce module en fait ce que Cloudprinter
 * attend AVANT que le fichier ne parte au coffre :
 *   - le bloc intérieur en pages simples de 216 × 303 mm, dans l'ordre ;
 *   - la couverture enveloppante à sa largeur exacte, dos compris.
 *
 * La RÈGLE est dans `@/lib/atelier/decoupe` (pur, au harnais) ; ici,
 * seulement pdf-lib : lire les boîtes, incorporer des portions de pages,
 * poser les boîtes de sortie. Aucun re-rendu, aucune image recompressée :
 * les mêmes objets, d'autres cadres. C'est ce qui garde la qualité intacte
 * et le fichier à peu près au même poids.
 *
 * POURQUOI ICI ET PAS SUR LE SERVEUR : un PDF de magazine pèse 130 Mo, et
 * la règle du dépôt (presign/route.ts) est qu'il ne traverse jamais Vercel.
 * Le navigateur de l'atelier, lui, l'a déjà en mémoire.
 *
 * Ce module tourne aussi sous Node (tsx) : c'est ainsi qu'il a été éprouvé
 * sur les fichiers réels de Merisa le 18/09.
 * ══════════════════════════════════════════════════════════════════════════
 */
import { PDFDocument, type PDFPage } from "pdf-lib";
import {
  planCouverture,
  planInterieur,
  resumeCouverture,
  resumeInterieur,
  type BoiteMm,
  type PageLue,
} from "@/lib/atelier/decoupe";
import { FORMAT_FINI_MM, FORMAT_PAGE_PDF_MM, FOND_PERDU_MM, type TypeFichier } from "@/lib/atelier/impression";

const PT = 72 / 25.4;
const mm = (v: number) => v * PT;

function boite(b: { x: number; y: number; width: number; height: number }): BoiteMm {
  return { x: b.x / PT, y: b.y / PT, largeur: b.width / PT, hauteur: b.height / PT };
}

function lirePage(p: PDFPage): PageLue {
  return { media: boite(p.getMediaBox()), trim: boite(p.getTrimBox()) };
}

/** La boîte d'incorporation pdf-lib (points, coins) d'une boîte en mm. */
function cadre(b: BoiteMm) {
  return { left: mm(b.x), bottom: mm(b.y), right: mm(b.x + b.largeur), top: mm(b.y + b.hauteur) };
}

export type Preparation =
  | { inchange: true; resume: string }
  | { inchange: false; octets: Uint8Array; resume: string }
  | { refus: string };

/**
 * Le point d'entrée : les octets déposés, le type du cadre, la pagination du
 * dossier. Rend le fichier à envoyer (ou « inchangé »), et la phrase que
 * l'écran affiche sous le cadre.
 */
export async function preparerPdfImpression(
  source: ArrayBuffer | Uint8Array,
  type: TypeFichier,
  nbPagesDossier: number | null,
): Promise<Preparation> {
  /* L'agrafé (archivé le 15/09) prenait UN PDF complet : plus aucune règle
     ne le décrit, on ne touche pas à ce qu'on ne sait pas juger. */
  if (type === "product") return { inchange: true, resume: "Déposé tel quel." };

  let src: PDFDocument;
  try {
    src = await PDFDocument.load(source, { updateMetadata: false });
  } catch {
    return { refus: "PDF illisible : le fichier n'a pas pu être ouvert comme un PDF valide." };
  }
  const pages = src.getPages();
  const lues = pages.map(lirePage);

  if (type === "book") {
    const plan = planInterieur(lues);
    if (!plan.ok) return { refus: plan.raison };
    if (plan.inchange) return { inchange: true, resume: resumeInterieur(plan) };

    const out = await PDFDocument.create();
    /* Un seul `embedPages` pour tout : pdf-lib copie les ressources UNE fois
       par appel, donc une double page dont on tire deux moitiés n'embarque
       ses photos qu'une fois. */
    const incorporees = await out.embedPages(
      plan.sorties.map((s) => pages[s.source]),
      plan.sorties.map((s) => cadre(s.boite)),
    );
    const W = mm(FORMAT_PAGE_PDF_MM.largeur);
    const H = mm(FORMAT_PAGE_PDF_MM.hauteur);
    for (const e of incorporees) {
      const page = out.addPage([W, H]);
      page.drawPage(e, { x: 0, y: 0 });
      page.setBleedBox(0, 0, W, H);
      page.setTrimBox(mm(FOND_PERDU_MM), mm(FOND_PERDU_MM), mm(FORMAT_FINI_MM.largeur), mm(FORMAT_FINI_MM.hauteur));
      page.setArtBox(mm(FOND_PERDU_MM), mm(FOND_PERDU_MM), mm(FORMAT_FINI_MM.largeur), mm(FORMAT_FINI_MM.hauteur));
    }
    const octets = await out.save({ useObjectStreams: false });
    return { inchange: false, octets, resume: resumeInterieur(plan) };
  }

  const plan = planCouverture(lues, nbPagesDossier);
  if (!plan.ok) return { refus: plan.raison };
  if (plan.inchange) return { inchange: true, resume: resumeCouverture(plan) };

  const out = await PDFDocument.create();
  const W = mm(plan.largeur);
  const H = mm(plan.hauteur);
  const poserBoites = (page: PDFPage) => {
    page.setBleedBox(0, 0, W, H);
    page.setTrimBox(mm(plan.fini.x), mm(FOND_PERDU_MM), mm(plan.fini.largeur), mm(FORMAT_FINI_MM.hauteur));
    page.setArtBox(mm(plan.fini.x), mm(FOND_PERDU_MM), mm(plan.fini.largeur), mm(FORMAT_FINI_MM.hauteur));
  };
  for (const face of plan.faces) {
    const incorporees = await out.embedPages(
      face.parties.map(() => pages[face.source]),
      face.parties.map((p) => cadre(p.boite)),
    );
    const page = out.addPage([W, H]);
    face.parties.forEach((p, k) => {
      /* `width` étire la bande du dos à sa largeur ; partout ailleurs elle
         vaut la largeur de la boîte, donc rien ne bouge. */
      page.drawPage(incorporees[k], { x: mm(p.x), y: 0, width: mm(p.largeurSortie), height: H });
    });
    poserBoites(page);
  }
  if (plan.interieurAjoute) poserBoites(out.addPage([W, H]));
  const octets = await out.save({ useObjectStreams: false });
  return { inchange: false, octets, resume: resumeCouverture(plan) };
}
