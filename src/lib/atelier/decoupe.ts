/**
 * LA DÉCOUPE DES PDF D'IMPRESSION — la partie PURE (T-121, 18/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE
 *
 * Le premier dossier réel (Merisa, « Madeira 2026 », 44 pages) a montré ce
 * que l'atelier produit naturellement : un export Canva « PDF pour
 * impression » avec « Traits de coupe et fond perdu » — des DOUBLES pages de
 * 420 × 297 mm, quelques pages simples, une couverture de 420 × 297 sans
 * dos, chaque page entourée de 3 mm de fond perdu rempli d'image puis de
 * 3 mm de marge blanche pour les traits.
 *
 * Cloudprinter, lui, attend autre chose : un bloc intérieur en pages SIMPLES
 * de 216 × 303 mm (le fini 210 × 297 plus 3 mm de fond perdu, sans marge ni
 * trait), dans l'ordre de lecture, et une couverture ENVELOPPANTE de
 * 2 × 213 + dos, dos compris. Le 18/09, la conversion a été faite à la main
 * par un script ; la règle vit désormais ici, et c'est la fiche qui l'applique
 * dans le navigateur au moment du dépôt (`preparerPdf.ts`).
 *
 * Aucun réseau, aucun PDF : ce module raisonne sur des BOÎTES en millimètres
 * (MediaBox, TrimBox) et rend un PLAN — quelle portion de quelle page source
 * devient quelle page de sortie. C'est ce qui le rend éprouvable au harnais
 * sur les mesures réelles de l'export de Merisa.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Repère : celui du PDF, origine en bas à gauche, en millimètres, dans le
 * système de coordonnées de la page SOURCE (un MediaBox de Canva ne commence
 * pas à 0 : les boîtes sont absolues, jamais relatives au coin du média).
 */
import {
  FORMAT_FINI_MM,
  FORMAT_PAGE_PDF_MM,
  FOND_PERDU_MM,
  TOLERANCE_FORMAT_MM,
  dosMmPourPages,
  largeurCouvertureMm,
} from "./impression";

export type BoiteMm = { x: number; y: number; largeur: number; hauteur: number };

/** Ce qu'on lit d'une page source : son média, et sa TrimBox si elle en déclare une. */
export type PageLue = { media: BoiteMm; trim: BoiteMm | null };

/**
 * Ce qu'est une page d'un export :
 *   finale   — déjà une page d'impression (216 × 303) : rien à faire ;
 *   simple   — un fini de 210 × 297 avec fond perdu autour (page 1, page 44) ;
 *   double   — deux finis côte à côte, 420 × 297, à couper au milieu ;
 *   inconnue — tout le reste, et on le dit avec les cotes mesurées.
 */
export type NaturePage = "finale" | "simple" | "double" | "inconnue";

const proche = (a: number, b: number) => Math.abs(a - b) <= TOLERANCE_FORMAT_MM;
const arrondi = (v: number) => Math.round(v * 1000) / 1000;
/* La marge que les flottants d'un export peuvent grignoter sans que ce soit
   un vrai manque de fond perdu (Canva écrit 2,935 mm là où on attend 3). */
const JEU_MM = 0.15;

/** Le fini d'un export en mm, pour les messages : « 419,9 × 297,1 ». */
function cote(b: BoiteMm): string {
  const f = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");
  return `${f(b.largeur)} × ${f(b.hauteur)} mm`;
}

/**
 * La TrimBox QUAND elle dit quelque chose : une trim identique au média (ce
 * que pdf-lib rend par repli quand la boîte manque) n'est pas un fond perdu
 * déclaré, c'est une absence.
 */
export function trimEffective(page: PageLue): BoiteMm | null {
  const t = page.trim;
  if (!t) return null;
  const m = page.media;
  const meme =
    Math.abs(t.x - m.x) < 0.05 &&
    Math.abs(t.y - m.y) < 0.05 &&
    Math.abs(t.largeur - m.largeur) < 0.05 &&
    Math.abs(t.hauteur - m.hauteur) < 0.05;
  return meme ? null : t;
}

export function natureDe(page: PageLue): NaturePage {
  if (proche(page.media.largeur, FORMAT_PAGE_PDF_MM.largeur) && proche(page.media.hauteur, FORMAT_PAGE_PDF_MM.hauteur)) {
    return "finale";
  }
  const trim = trimEffective(page);
  if (!trim) return "inconnue";
  if (!proche(trim.hauteur, FORMAT_FINI_MM.hauteur)) return "inconnue";
  if (proche(trim.largeur, FORMAT_FINI_MM.largeur)) return "simple";
  if (proche(trim.largeur, 2 * FORMAT_FINI_MM.largeur)) return "double";
  return "inconnue";
}

/** Une boîte tient-elle dans le média de sa page source (au jeu près) ? */
function tientDans(boite: BoiteMm, media: BoiteMm): boolean {
  return (
    boite.x >= media.x - JEU_MM &&
    boite.y >= media.y - JEU_MM &&
    boite.x + boite.largeur <= media.x + media.largeur + JEU_MM &&
    boite.y + boite.hauteur <= media.y + media.hauteur + JEU_MM
  );
}

/**
 * La page de sortie (216 × 303) centrée sur UN fini de 210 × 297 posé à
 * `xFini` dans la page source. Le fini d'un export Canva mesure 209,945 ou
 * 210,08 : centrer absorbe l'écart des deux côtés au lieu de le reporter sur
 * un seul bord.
 */
function boitePage(trim: BoiteMm, xFini: number, largeurFini: number): BoiteMm {
  const cx = xFini + largeurFini / 2;
  const cy = trim.y + trim.hauteur / 2;
  return {
    x: arrondi(cx - FORMAT_PAGE_PDF_MM.largeur / 2),
    y: arrondi(cy - FORMAT_PAGE_PDF_MM.hauteur / 2),
    largeur: FORMAT_PAGE_PDF_MM.largeur,
    hauteur: FORMAT_PAGE_PDF_MM.hauteur,
  };
}

const MANQUE_FOND_PERDU = (i: number, page: PageLue) =>
  `Page ${i + 1} (${cote(page.media)}) : aucun fond perdu déclaré. Exporter depuis Canva en « PDF pour impression » avec « Traits de coupe et fond perdu » coché.`;

/* ─────────────────────────── le bloc intérieur ─────────────────────────── */

/**
 * Un morceau d'une page de sortie : une boîte de la page source, posée à `x`
 * (mm) dans la page de sortie, éventuellement ÉTIRÉE à `largeurSortie`.
 * La hauteur est toujours celle de la page (303), posée à y = 0.
 */
export type Partie = { boite: BoiteMm; x: number; largeurSortie: number };

/** Une page de sortie : ses morceaux, tous tirés de la même page source. */
export type SortiePage = { source: number; parties: Partie[] };

export type PlanInterieur =
  /** Toutes les pages sont déjà des pages d'impression : le fichier part tel quel. */
  | { ok: true; inchange: true; nbPages: number }
  | { ok: true; inchange: false; sorties: SortiePage[]; simples: number; doubles: number; nbPages: number }
  | { ok: false; raison: string };

/**
 * Le plan du bloc intérieur. Une page simple devient une page ; une double
 * en devient deux, gauche puis droite, coupée au milieu de son fini. L'ORDRE
 * est celui de l'export : la première page simple est la page 1 (seule, à
 * droite), la dernière est la page N (seule, à gauche) — c'est ainsi qu'un
 * dos carré s'ouvre.
 *
 * ⚠️ LA RÉSERVE CÔTÉ COUTURE EST LE PROPRE BORD DE LA PAGE (décision de
 * Mathias, 19/09/2026). L'usage des imprimeurs est d'y mettre la page
 * voisine (c'est ce qui se trouve là, et la suite exacte d'une photo qui
 * traverse). Mais dans un PDF, chaque page porte alors 3 mm de sa voisine
 * au bord, et Mathias, qui a déjà vu des magazines décalés, lisait ça comme
 * un défaut. Les deux règles donnent le même objet relié : ces 3 mm sont
 * rabotés et collés. On étire donc le dernier millimètre de la page sur ses
 * 3 mm de réserve, comme pour le dos d'une couverture : une photo qui
 * s'arrête au pli donne sa propre couleur, une marge blanche donne du blanc.
 */
export function planInterieur(pages: PageLue[]): PlanInterieur {
  if (!pages.length) return { ok: false, raison: "PDF sans aucune page." };
  const natures = pages.map(natureDe);
  if (natures.every((n) => n === "finale")) return { ok: true, inchange: true, nbPages: pages.length };

  const sorties: SortiePage[] = [];
  let simples = 0;
  let doubles = 0;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const nature = natures[i];
    if (nature === "finale") {
      return {
        ok: false,
        raison: `Page ${i + 1} : déjà au format d'impression (216 × 303) au milieu d'un export en doubles pages. Un fichier ne mélange pas les deux.`,
      };
    }
    const trim = trimEffective(page);
    if (nature === "inconnue" || !trim) {
      if (!trim) return { ok: false, raison: MANQUE_FOND_PERDU(i, page) };
      return {
        ok: false,
        raison: `Page ${i + 1} : fini de ${cote(trim)}, ni une page simple (210 × 297), ni une double (420 × 297).`,
      };
    }
    const L = FORMAT_PAGE_PDF_MM.largeur;
    const H = FORMAT_PAGE_PDF_MM.hauteur;
    const y = arrondi(trim.y + trim.hauteur / 2 - H / 2);
    const tropCourt = {
      ok: false as const,
      raison: `Page ${i + 1} : le fond perdu exporté est trop court (il faut ${FOND_PERDU_MM} mm au-delà de la coupe de chaque côté).`,
    };
    if (nature === "simple") {
      /* Une page seule a son fond perdu des quatre côtés dans l'export : une
         seule boîte, centrée sur le fini. */
      const boite = boitePage(trim, trim.x, trim.largeur);
      if (!tientDans(boite, page.media)) return tropCourt;
      sorties.push({ source: i, parties: [{ boite, x: 0, largeurSortie: L }] });
      simples++;
    } else {
      const demi = trim.largeur / 2;
      const milieu = arrondi(trim.x + demi);
      /* ⚠️ LE RETRAIT AU PLI (19/09/2026, vu sur le fichier de Merisa). Canva
         laisse une photo déborder de 0,2 mm sur la coupe du milieu : une face
         prise jusqu'au milieu exact emporte ce fil de la page voisine, et il
         se voit, un trait sombre au bord d'une page blanche. La face s'arrête
         donc 0,4 mm AVANT le pli, et la réserve étirée couvre ce qui manque.
         Ces 0,4 mm sont dans la colle : personne ne les verra jamais. */
      const retrait = 0.4;
      /* La face avec son fond perdu EXTÉRIEUR, jusqu'à 0,4 mm de la coupe. */
      const face = arrondi(FOND_PERDU_MM + demi - retrait);
      /* Ce qui reste jusqu'à 216 : la réserve côté couture (3,055 mm chez
         Canva, dont le fini fait 209,945 et pas 210) plus le retrait, rempli
         en étirant un millimètre de la face. */
      const reserve = arrondi(L - face);
      const gauche: BoiteMm = { x: arrondi(trim.x - FOND_PERDU_MM), y, largeur: face, hauteur: H };
      const droite: BoiteMm = { x: arrondi(milieu + retrait), y, largeur: face, hauteur: H };
      if (!tientDans(gauche, page.media) || !tientDans(droite, page.media)) return tropCourt;
      /* Le millimètre étiré est pris à 0,5 mm du pli, chez soi à coup sûr. */
      const bordGauche: BoiteMm = { x: arrondi(milieu - 1.5), y, largeur: 1, hauteur: H };
      const bordDroit: BoiteMm = { x: arrondi(milieu + 0.5), y, largeur: 1, hauteur: H };
      sorties.push({
        source: i,
        parties: [
          { boite: gauche, x: 0, largeurSortie: face },
          { boite: bordGauche, x: face, largeurSortie: reserve },
        ],
      });
      sorties.push({
        source: i,
        parties: [
          { boite: bordDroit, x: 0, largeurSortie: reserve },
          { boite: droite, x: reserve, largeurSortie: face },
        ],
      });
      doubles++;
    }
  }
  return { ok: true, inchange: false, sorties, simples, doubles, nbPages: sorties.length };
}

/* ─────────────────────────── la couverture ─────────────────────────── */

/**
 * Un morceau de la couverture de sortie : une boîte de la page source, posée
 * à `x` (mm) dans la feuille de sortie, éventuellement ÉTIRÉE à
 * `largeurSortie` (le dos, quand il faut l'inventer).
 */
export type PartieCouverture = { boite: BoiteMm; x: number; largeurSortie: number };

/** Une page source de la couverture (extérieur, puis intérieur), et ses morceaux. */
export type FaceCouverture = { source: number; parties: PartieCouverture[] };

export type PlanCouverture =
  | { ok: true; inchange: true }
  | {
      ok: true;
      inchange: false;
      /** La feuille de sortie, fond perdu compris. */
      largeur: number;
      hauteur: number;
      dos: number;
      /** Le dos manquait dans l'export (420 mm) : il est ajouté au milieu. */
      dosAjoute: boolean;
      /** Une entrée par page source (l'extérieur, puis l'intérieur s'il existe). */
      faces: FaceCouverture[];
      /** Le fini déclaré sur la sortie (TrimBox) : x et largeur, la hauteur est celle du fini. */
      fini: { x: number; largeur: number };
      /** L'export n'avait qu'une page : une page intérieure vierge est ajoutée (le gabarit en attend deux). */
      interieurAjoute: boolean;
    }
  | { ok: false; raison: string };

/**
 * Le plan de la couverture enveloppante, pour la pagination du DOSSIER.
 *
 * Deux exports acceptés :
 *   420 × 297 — quatrième à gauche, première à droite, PAS de dos : on insère
 *               le dos au milieu, rempli en étirant le dernier millimètre de
 *               la quatrième (une bande de couleur unie donne la couleur
 *               exacte ; une photo donne un dégradé de 3 mm, invisible sur
 *               une tranche). Les deux faces restent entières et centrées ;
 *   420 + dos  — le dos est déjà dessiné : on ne fait que retirer la marge.
 *
 * La largeur de sortie est CELLE DU CODE (`largeurCouvertureMm`) : c'est la
 * cote que la route de transition annonce et que le contrôle juge.
 */
export function planCouverture(pages: PageLue[], nbPagesDossier: number | null | undefined): PlanCouverture {
  const largeur = largeurCouvertureMm(nbPagesDossier);
  const dos = dosMmPourPages(nbPagesDossier);
  if (largeur === null || dos === null) {
    return { ok: false, raison: "La pagination du dossier ne désigne aucun dos carré : impossible de calculer le dos." };
  }
  if (!pages.length) return { ok: false, raison: "PDF sans aucune page." };
  if (pages.length > 2) {
    return { ok: false, raison: `${pages.length} pages : une couverture, c'est l'extérieur et, au plus, l'intérieur.` };
  }
  const hauteur = FORMAT_PAGE_PDF_MM.hauteur;
  if (pages.every((p) => proche(p.media.largeur, largeur) && proche(p.media.hauteur, hauteur))) {
    return { ok: true, inchange: true };
  }

  const faces: FaceCouverture[] = [];
  let fini: { x: number; largeur: number } | null = null;
  let dosAjoute = false;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const trim = trimEffective(page);
    if (!trim) return { ok: false, raison: MANQUE_FOND_PERDU(i, page) };
    if (!proche(trim.hauteur, FORMAT_FINI_MM.hauteur)) {
      return { ok: false, raison: `Page ${i + 1} : fini de ${cote(trim)}, la hauteur attendue est ${FORMAT_FINI_MM.hauteur} mm.` };
    }
    const sansDos = proche(trim.largeur, 2 * FORMAT_FINI_MM.largeur);
    const avecDos = proche(trim.largeur, 2 * FORMAT_FINI_MM.largeur + dos);
    if (!sansDos && !avecDos) {
      return {
        ok: false,
        raison: `Page ${i + 1} : fini de ${cote(trim)}. Une couverture se dessine en 420 × 297 (le dos de ${dos} mm est ajouté ici) ou en ${arrondi(2 * FORMAT_FINI_MM.largeur + dos)} × 297, dos compris.`,
      };
    }
    const y = arrondi(trim.y + trim.hauteur / 2 - hauteur / 2);
    if (sansDos) dosAjoute = true;
    /* Le dos dessiné par l'export, s'il y est ; et la demi-feuille, c'est-à-dire
       une face finie (209,945 chez Canva, pas 210). */
    const dosDessine = sansDos ? 0 : dos;
    const demi = (trim.largeur - dosDessine) / 2;

    /* Trois morceaux, dans l'ordre de la feuille : la quatrième avec son fond
       perdu gauche, le dos, la première avec son fond perdu droit. Le fond
       perdu droit absorbe l'écart entre le fini de Canva (419,89) et les 420
       du calcul : la feuille fait EXACTEMENT `largeur`. */
    const quatrieme: BoiteMm = { x: arrondi(trim.x - FOND_PERDU_MM), y, largeur: arrondi(FOND_PERDU_MM + demi), hauteur };
    const largeurPremiere = arrondi(largeur - quatrieme.largeur - dos);
    const premiere: BoiteMm = { x: arrondi(trim.x + demi + dosDessine), y, largeur: largeurPremiere, hauteur };
    /* Le dos : la bande dessinée par l'export, ou, quand il manque, le
       dernier millimètre de la quatrième étiré à la largeur du dos. */
    const bandeDos: BoiteMm = sansDos
      ? { x: arrondi(trim.x + demi - 1), y, largeur: 1, hauteur }
      : { x: arrondi(trim.x + demi), y, largeur: dos, hauteur };
    if (!tientDans(quatrieme, page.media) || !tientDans(premiere, page.media)) {
      return { ok: false, raison: `Page ${i + 1} : le fond perdu exporté est trop court (il faut ${FOND_PERDU_MM} mm au-delà de la coupe).` };
    }

    const parties: PartieCouverture[] = [];
    if (i === 0) {
      parties.push({ boite: quatrieme, x: 0, largeurSortie: quatrieme.largeur });
      parties.push({ boite: bandeDos, x: quatrieme.largeur, largeurSortie: dos });
      parties.push({ boite: premiere, x: arrondi(quatrieme.largeur + dos), largeurSortie: largeurPremiere });
    } else {
      /* L'INTÉRIEUR de la couverture (gabarit Cloudprinter, page 2) : le dos
         plus 3 mm de chaque côté doivent rester VIERGES, c'est la zone de
         collage du bloc. On n'y pose donc rien : la page de sortie est
         blanche par nature, on retire 3 mm à chaque face et le dos n'est pas
         dessiné. Le design que l'atelier y met s'arrête de lui-même à 3 mm
         du pli, sans qu'il ait à le savoir. */
      const retrait = FOND_PERDU_MM;
      parties.push({ boite: { ...quatrieme, largeur: arrondi(quatrieme.largeur - retrait) }, x: 0, largeurSortie: arrondi(quatrieme.largeur - retrait) });
      parties.push({
        boite: { ...premiere, x: arrondi(premiere.x + retrait), largeur: arrondi(largeurPremiere - retrait) },
        x: arrondi(quatrieme.largeur + dos + retrait),
        largeurSortie: arrondi(largeurPremiere - retrait),
      });
    }
    fini ??= { x: FOND_PERDU_MM, largeur: arrondi(largeur - FOND_PERDU_MM - (largeurPremiere - demi)) };
    faces.push({ source: i, parties });
  }
  return {
    ok: true,
    inchange: false,
    largeur,
    hauteur,
    dos,
    dosAjoute,
    faces,
    fini: fini ?? { x: FOND_PERDU_MM, largeur: arrondi(largeur - 2 * FOND_PERDU_MM) },
    interieurAjoute: pages.length === 1,
  };
}

/** La phrase de l'écran, une fois le plan fait. */
export function resumeInterieur(plan: PlanInterieur): string {
  if (!plan.ok) return plan.raison;
  if (plan.inchange) return `${plan.nbPages} pages déjà au format d'impression, déposées telles quelles.`;
  const d = plan.doubles ? `${plan.doubles} double${plan.doubles > 1 ? "s" : ""}` : "";
  const s = plan.simples ? `${plan.simples} simple${plan.simples > 1 ? "s" : ""}` : "";
  const quoi = [d, s].filter(Boolean).join(" et ");
  return `Export Canva reconnu (${quoi}) → ${plan.nbPages} pages d'impression de ${FORMAT_PAGE_PDF_MM.largeur} × ${FORMAT_PAGE_PDF_MM.hauteur} mm.`;
}

export function resumeCouverture(plan: PlanCouverture): string {
  if (!plan.ok) return plan.raison;
  if (plan.inchange) return "Couverture déjà au format d'impression, déposée telle quelle.";
  const dosTxt = String(plan.dos).replace(".", ",");
  const l = String(plan.largeur).replace(".", ",");
  return plan.dosAjoute
    ? `Couverture recoupée à ${l} × ${plan.hauteur} mm, dos de ${dosTxt} mm ajouté au milieu${plan.interieurAjoute ? ", intérieur vierge ajouté" : ""}.`
    : `Couverture recoupée à ${l} × ${plan.hauteur} mm, dos de ${dosTxt} mm déjà dessiné${plan.interieurAjoute ? ", intérieur vierge ajouté" : ""}.`;
}
