/**
 * Le bon à tirer (PRD §6) : rendre, apparier, comparer, annoter.
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 * Importable par le navigateur (le dépôt d'un tour se fait chez l'atelier).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * APPARIER PAR RESSEMBLANCE, PAS PAR NUMÉRO
 * Ajouter une page au tour 2 décale toutes les suivantes : comparer « page 12
 * contre page 12 » montrerait vingt pages « modifiées » qui ne le sont pas.
 * Chaque page porte ses mots et son empreinte ; on aligne les deux tours
 * (voir `apparierPages`). Sans équivalent : « nouvelle page ». Ancienne
 * jamais reprise : « page retirée ». Les zones modifiées se calculent ensuite
 * entre pages APPARIÉES, sur des gris réduits.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { distanceHamming } from "@/lib/atelier/empreinte";
import { estTypeNote } from "./types";

/**
 * La largeur de rendu d'une page de BAT, en pixels.
 * ⚠️ PROVISOIRE : décision ouverte (PRD §12.10, qualité contre poids). Assez
 * pour lire un texte courant à l'écran ; à mesurer sur un vrai export
 * Affinity, puis à trancher par Mathias.
 */
export const LARGEUR_RENDU_PX = 1600;

/* ─────────────────────────── apparier deux tours ─────────────────────────── */

/**
 * Deux indices disent qu'une page du tour 2 « est » une page du tour 1 :
 *
 * 1. Son TEXTE (lu par pdf.js dans le PDF d'Affinity), quand les deux pages
 *    en ont : la part de mots communs. C'est l'indice fort. Une photo changée
 *    laisse le texte en place ; deux pages de même gabarit mais d'histoires
 *    différentes (le cas courant d'un magazine) n'ont pas les mêmes mots.
 * 2. Son EMPREINTE d'image (pHash 64 bits, atelier/empreinte.ts), pour les
 *    pages sans texte (une pleine photo). Mesuré le 13/10 sur un essai : deux
 *    pages de même gabarit sont à 0 à 4 bits l'une de l'autre MÊME quand leur
 *    contenu diffère, une page dont la photo a bougé s'éloigne de 20 à 28 bits.
 *    L'image seule ne suffit donc pas à dire « même page ».
 *
 * L'appariement respecte l'ORDRE des pages (un alignement, comme un « diff ») :
 * une page ajoutée ne décale pas les suivantes, et une page de même gabarit
 * plus loin dans le magazine ne vole pas sa place à la bonne. Une page
 * déplacée se lit « retirée » ici et « nouvelle » là : c'est vrai, et rare.
 */
export const SEUIL_TEXTE = 0.35;
export const MOTS_MIN = 5;
export const PLAFOND_EMPREINTE = 26;
/** Laisser une page sans équivalent coûte ce prix : apparier coûte moins tant que les pages se ressemblent. */
export const COUT_SAUT = 16;

export type PageEmpreinte = { index: number; empreinte: string | null; mots?: string | null };

export type Appariement = {
  /** Pour chaque nouvelle page : l'index de l'ancienne qui lui correspond, ou null (nouvelle). */
  apparie: Map<number, number | null>;
  /** Les anciennes pages que plus aucune nouvelle ne reprend. */
  retirees: number[];
};

/** Les mots d'une page : minuscules, sans accent, trois lettres au moins, sans chiffre, chacun une fois. */
export function motsDePage(texte: string): string[] {
  const vus = new Set<string>();
  for (const m of texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z]+/)) {
    if (m.length >= 3) vus.add(m);
  }
  return [...vus];
}

/**
 * Retirer les mots présents sur plus de la moitié des pages d'un tour (titre
 * courant, pied de page, nom de l'organisation) : sinon toutes les pages
 * partagent ces mots et se ressemblent toutes. Les mots gardés se rangent en
 * une chaîne bornée, ce que le tour stocke.
 */
export function motsUtiles(pages: readonly string[][], max = 150): string[] {
  const presence = new Map<string, number>();
  for (const mots of pages) for (const m of mots) presence.set(m, (presence.get(m) ?? 0) + 1);
  const trop = pages.length >= 4 ? pages.length / 2 : Infinity;
  return pages.map((mots) => mots.filter((m) => (presence.get(m) ?? 0) <= trop).slice(0, max).join(" "));
}

function ensemble(mots: string | null | undefined): Set<string> {
  return new Set((mots ?? "").split(" ").filter(Boolean));
}

/** Le coût d'apparier deux pages, ou `Infinity` si rien ne dit qu'elles sont la même. */
export function coutPaire(a: { empreinte: string | null; mots: Set<string> }, b: { empreinte: string | null; mots: Set<string> }): number {
  if (a.mots.size >= MOTS_MIN && b.mots.size >= MOTS_MIN) {
    let communs = 0;
    for (const m of a.mots) if (b.mots.has(m)) communs++;
    const jaccard = communs / (a.mots.size + b.mots.size - communs);
    return jaccard >= SEUIL_TEXTE ? Math.round((1 - jaccard) * 30) : Infinity;
  }
  if (!a.empreinte || !b.empreinte) return Infinity;
  const d = distanceHamming(a.empreinte, b.empreinte);
  return d <= PLAFOND_EMPREINTE ? d : Infinity;
}

/** L'alignement le moins coûteux des deux suites de pages, ordre respecté. */
export function apparierPages(anciennes: readonly PageEmpreinte[], nouvelles: readonly PageEmpreinte[]): Appariement {
  const A = [...anciennes].sort((x, y) => x.index - y.index).map((p) => ({ ...p, empreinte: p.empreinte, mots: ensemble(p.mots) }));
  const N = [...nouvelles].sort((x, y) => x.index - y.index).map((p) => ({ ...p, empreinte: p.empreinte, mots: ensemble(p.mots) }));
  const n = A.length;
  const m = N.length;
  const L = m + 1;
  const D = new Float64Array((n + 1) * L);
  const pas = new Uint8Array((n + 1) * L); /* 0 apparier, 1 ancienne retirée, 2 nouvelle page */
  for (let i = 1; i <= n; i++) {
    D[i * L] = i * COUT_SAUT;
    pas[i * L] = 1;
  }
  for (let j = 1; j <= m; j++) {
    D[j] = j * COUT_SAUT;
    pas[j] = 2;
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = D[(i - 1) * L + j - 1] + coutPaire(A[i - 1], N[j - 1]);
      const haut = D[(i - 1) * L + j] + COUT_SAUT;
      const gauche = D[i * L + j - 1] + COUT_SAUT;
      const k = i * L + j;
      if (diag <= haut && diag <= gauche) {
        D[k] = diag;
        pas[k] = 0;
      } else if (haut <= gauche) {
        D[k] = haut;
        pas[k] = 1;
      } else {
        D[k] = gauche;
        pas[k] = 2;
      }
    }
  }
  const apparie = new Map<number, number | null>(N.map((p) => [p.index, null]));
  const prises = new Set<number>();
  for (let i = n, j = m; i > 0 || j > 0; ) {
    const k = i * L + j;
    if (i > 0 && j > 0 && pas[k] === 0) {
      apparie.set(N[j - 1].index, A[i - 1].index);
      prises.add(A[i - 1].index);
      i--;
      j--;
    } else if (i > 0 && (j === 0 || pas[k] === 1)) i--;
    else j--;
  }
  return { apparie, retirees: A.map((a) => a.index).filter((i) => !prises.has(i)) };
}

export type Zone = { x: number; y: number; l: number; h: number };

/**
 * Les zones qui ont changé entre deux pages appariées, en POURCENTAGES de la
 * page (le lecteur les dessine à n'importe quelle taille).
 *
 * Les deux pages arrivent en gris, à la MÊME taille réduite. On découpe en
 * cellules carrées ; une cellule « bouge » si l'écart MOYEN dépasse le seuil
 * (une photo changée), OU si quelques pixels changent FRANCHEMENT (une ligne
 * de texte : mesuré le 13/10, un mot corrigé décale la fin de sa ligne de
 * quelques pixels, l'écart moyen de la cellule reste sous le seuil, mais
 * l'encre passe du noir au blanc). Les cellules voisines qui bougent forment
 * une zone (rectangle englobant). Deux rendus d'une même page vectorielle
 * sont identiques ; le bruit d'une photo recompressée reste sous les deux
 * critères (écarts faibles et diffus).
 */
export function zonesModifiees(
  a: Uint8Array,
  b: Uint8Array,
  largeur: number,
  hauteur: number,
  opts: { cellule?: number; seuil?: number } = {}
): Zone[] {
  const cellule = opts.cellule ?? 8;
  const seuil = opts.seuil ?? 18;
  /* « Franchement » : un quart de l'échelle de gris ; et il en faut au moins
     deux, ou 5 % de la cellule. */
  const fort = 64;
  if (a.length !== largeur * hauteur || b.length !== a.length) throw new Error("zonesModifiees : tailles différentes");
  const cx = Math.ceil(largeur / cellule);
  const cy = Math.ceil(hauteur / cellule);
  const bouge = new Uint8Array(cx * cy);
  for (let j = 0; j < cy; j++) {
    for (let i = 0; i < cx; i++) {
      let somme = 0;
      let forts = 0;
      let n = 0;
      for (let y = j * cellule; y < Math.min(hauteur, (j + 1) * cellule); y++) {
        for (let x = i * cellule; x < Math.min(largeur, (i + 1) * cellule); x++) {
          const d = Math.abs(a[y * largeur + x] - b[y * largeur + x]);
          somme += d;
          if (d > fort) forts++;
          n++;
        }
      }
      if (n && (somme / n > seuil || forts >= Math.max(2, Math.ceil(n * 0.05)))) bouge[j * cx + i] = 1;
    }
  }
  /* Les cellules voisines (8-connexité) forment une zone. */
  const vu = new Uint8Array(cx * cy);
  const zones: Zone[] = [];
  for (let k = 0; k < bouge.length; k++) {
    if (!bouge[k] || vu[k]) continue;
    let minX = cx, minY = cy, maxX = -1, maxY = -1;
    const pile = [k];
    vu[k] = 1;
    while (pile.length) {
      const c = pile.pop()!;
      const i = c % cx;
      const j = Math.floor(c / cx);
      minX = Math.min(minX, i); maxX = Math.max(maxX, i);
      minY = Math.min(minY, j); maxY = Math.max(maxY, j);
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= cx || nj >= cy) continue;
          const v = nj * cx + ni;
          if (bouge[v] && !vu[v]) {
            vu[v] = 1;
            pile.push(v);
          }
        }
      }
    }
    const pct = (v: number, total: number) => Math.round((v / total) * 1000) / 10;
    zones.push({
      x: pct(minX * cellule, largeur),
      y: pct(minY * cellule, hauteur),
      l: pct(Math.min(largeur, (maxX + 1) * cellule) - minX * cellule, largeur),
      h: pct(Math.min(hauteur, (maxY + 1) * cellule) - minY * cellule, hauteur),
    });
  }
  return zones;
}

/**
 * Les doubles pages d'un magazine de `n` pages (indices 0…n-1) : la
 * première seule (page de droite), puis deux par deux, la dernière seule si
 * le compte l'impose. C'est ainsi qu'on le feuillette.
 */
export function doublesPages(n: number): number[][] {
  if (n <= 0) return [];
  const sortie: number[][] = [[0]];
  for (let i = 1; i < n; i += 2) sortie.push(i + 1 < n ? [i, i + 1] : [i]);
  return sortie;
}

/**
 * Où rogner une page rendue pour ne garder que le FORMAT FINI (la TrimBox).
 * Un export Affinity porte son fond perdu dans la MediaBox : sans ce rognage,
 * le client verrait trois millimètres qui partent au massicot.
 * `vue` = la boîte que pdf.js rend ([x0, y0, x1, y1], unités PDF, y vers le
 * haut), `trim` = la TrimBox lue par pdf-lib, `echelle` = pixels par unité.
 */
export function rectRognage(
  vue: readonly [number, number, number, number],
  trim: { x: number; y: number; width: number; height: number } | null,
  echelle: number
): { sx: number; sy: number; sl: number; sh: number } {
  const [x0, , , y1] = vue;
  const largeurVue = vue[2] - vue[0];
  const hauteurVue = vue[3] - vue[1];
  const t = trim && trim.width > 0 && trim.height > 0 ? trim : { x: x0, y: vue[1], width: largeurVue, height: hauteurVue };
  const sx = Math.max(0, (t.x - x0) * echelle);
  const sy = Math.max(0, (y1 - (t.y + t.height)) * echelle);
  return {
    sx: Math.round(sx),
    sy: Math.round(sy),
    sl: Math.round(Math.min(t.width, largeurVue) * echelle),
    sh: Math.round(Math.min(t.height, hauteurVue) * echelle),
  };
}

/* ─────────────────────────────── les notes ─────────────────────────────── */

export type NoteSaisie = {
  page_index: number | null;
  x_pct: number | null;
  y_pct: number | null;
  type: string;
  contenu: Record<string, string>;
};

function txt(v: unknown, max = 1000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * Une note telle que le client la pose (PRD §6.2). Les types viennent de
 * `TYPES_NOTE` (liste extensible) ; chacun dit ce qu'il exige :
 * - texte : le texte touché OU le remplacement ;
 * - photo : une photo de l'édition choisie OU une description ;
 * - idee : un texte libre ;
 * - retirer : la raison est facultative.
 * Sans page : une note générale, sans position.
 */
export function lireNote(corps: Record<string, unknown>, nbPages: number): { ok: true; note: NoteSaisie } | { ok: false; message: string } {
  if (!estTypeNote(corps.type)) return { ok: false, message: "Type de note inconnu." };
  const c = (corps.contenu && typeof corps.contenu === "object" ? corps.contenu : {}) as Record<string, unknown>;
  const contenu: Record<string, string> = {};
  for (const k of ["cible", "remplacement", "photo", "description", "texte", "raison"]) {
    const v = txt(c[k]);
    if (v) contenu[k] = v;
  }
  const t = corps.type;
  if (t === "texte" && !contenu.cible && !contenu.remplacement) return { ok: false, message: "Dire quel texte corriger, ou par quoi le remplacer." };
  if (t === "photo" && !contenu.photo && !contenu.description) return { ok: false, message: "Choisir une photo, ou décrire celle qu'il faudrait." };
  if (t === "idee" && !contenu.texte) return { ok: false, message: "Écrire l'idée." };

  const pageBrute = corps.page_index;
  if (pageBrute === null || pageBrute === undefined) {
    return { ok: true, note: { page_index: null, x_pct: null, y_pct: null, type: t, contenu } };
  }
  const page = Number(pageBrute);
  if (!Number.isInteger(page) || page < 0 || page >= nbPages) return { ok: false, message: "Page inconnue." };
  const pct = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 100) / 100)) : null;
  };
  return { ok: true, note: { page_index: page, x_pct: pct(corps.x_pct), y_pct: pct(corps.y_pct), type: t, contenu } };
}

export type EtatNote = "brouillon" | "a_traiter" | "resolue" | "retiree";

export function etatNote(n: { envoyee_le: string | null; resolue_le: string | null; retiree_le: string | null }): EtatNote {
  if (n.retiree_le) return "retiree";
  if (n.resolue_le) return "resolue";
  if (n.envoyee_le) return "a_traiter";
  return "brouillon";
}

/** La phrase de validation du BAT (PRD §6.2), le tirage lu dans la fiche, jamais deviné. */
export function texteValidationBat(tirage: number | null): string {
  return tirage
    ? `La validation est définitive. Elle confirme le tirage de ${tirage} exemplaires et lance l'impression.`
    : "La validation est définitive. Elle confirme le tirage prévu au devis et lance l'impression.";
}

/**
 * Ce que rappelle la fenêtre « Valider ce magazine » (révision §14.4) : en
 * résumé le tour et la couverture retenue, puis le tirage (la phrase du PRD
 * §6.2). Sans couverture choisie, le résumé n'en dit rien : la validation est
 * alors refusée (gestes.ts), et la fenêtre le dit.
 */
export function rappelValidation(
  tirage: number | null,
  tour: number,
  couverture: { sansPreference: boolean; rang: number | null }
): { resume: string; tirage: string } {
  const c = couverture.sansPreference
    ? " · couverture : sans préférence, l'atelier choisit"
    : couverture.rang !== null
      ? ` · couverture : la proposition ${couverture.rang}`
      : "";
  return { resume: `Tour ${tour}${c}.`, tirage: texteValidationBat(tirage) };
}

/**
 * « Valider ce magazine » n'apparaît qu'au DERNIER tour inclus (retour de Mathias du 28/10 : « au tour 1, alors qu'il
 * y en a plusieurs, personne ne va valider maintenant »). Tours inclus pas encore fixés : jamais au premier tour.
 */
export function validationOuverte(tour: number, toursInclus: number | null): boolean {
  return toursInclus === null ? tour >= 2 : tour >= toursInclus;
}

/** Le libellé court d'une double page dans la bande : « 1 », « 2–3 ». */
export function libelleBande(indices: readonly number[]): string {
  return indices.length === 1 ? String(indices[0] + 1) : `${indices[0] + 1}–${indices[indices.length - 1] + 1}`;
}

/* ───────────────────────── le gris, pour comparer deux tours ───────────────────────── */

/**
 * Chaque page d'un tour laisse au coffre un petit plan de gris (un fichier
 * par tour, compressé, `cleGrisTour`). Le tour suivant le relit pour calculer
 * ses zones modifiées : on compare deux pages à la MÊME taille, quelles que
 * soient leurs proportions (les zones sont en pourcentages).
 * 240 × 340 : mesuré le 13/10, à 120 px de large un mot corrigé dans un
 * texte courant de 10 pt passait SOUS le seuil (la ligne fait 2 px) ; à 240,
 * la ligne fait 4 px et le mot se voit. Compressé, le fichier d'un tour de
 * 40 pages tient sous le Mo.
 */
export const GRIS_L = 240;
export const GRIS_H = 340;
/** Le fichier décompressé ne dépasse jamais ceci (200 pages) : au-delà, on refuse (bombe de décompression). */
export const GRIS_MAX_OCTETS = 10 + 200 * GRIS_L * GRIS_H;
const MAGIE_GRIS = [0x42, 0x4a, 0x47, 0x31]; /* « BJG1 » */

/** `BJG1`, le nombre de pages, la largeur, la hauteur (u16 gros-boutistes), puis les plans à la suite. */
export function encoderGris(pages: readonly Uint8Array[], l = GRIS_L, h = GRIS_H): Uint8Array {
  const sortie = new Uint8Array(10 + pages.length * l * h);
  sortie.set(MAGIE_GRIS, 0);
  const vue = new DataView(sortie.buffer);
  vue.setUint16(4, pages.length);
  vue.setUint16(6, l);
  vue.setUint16(8, h);
  pages.forEach((p, i) => {
    if (p.length !== l * h) throw new Error(`encoderGris : page ${i} de ${p.length} octets, ${l * h} attendus`);
    sortie.set(p, 10 + i * l * h);
  });
  return sortie;
}

/** L'inverse ; `null` pour un fichier qui n'en est pas un (on ne compare pas plutôt que de comparer faux). */
export function decoderGris(octets: Uint8Array): { l: number; h: number; pages: Uint8Array[] } | null {
  if (octets.length < 10 || MAGIE_GRIS.some((b, i) => octets[i] !== b)) return null;
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  const n = vue.getUint16(4);
  const l = vue.getUint16(6);
  const h = vue.getUint16(8);
  if (!l || !h || octets.length !== 10 + n * l * h) return null;
  const pages: Uint8Array[] = [];
  for (let i = 0; i < n; i++) pages.push(octets.slice(10 + i * l * h, 10 + (i + 1) * l * h));
  return { l, h, pages };
}

/* ─────────────────────────── les pages d'un tour, à l'arrivée ─────────────────────────── */

/** Au-delà, ce n'est plus un magazine : la saisie est refusée. */
export const MAX_PAGES_TOUR = 200;
export const MAX_ZONES_PAGE = 40;

const EMPREINTE = /^[0-9a-f]{16}$/;

/**
 * Les pages qu'annonce le navigateur de l'atelier, relues par le serveur
 * avant d'entrer dans `collectif_tours.pages`. Les clés sont RECALCULÉES et
 * comparées (une page ne peut désigner que son propre emplacement du coffre),
 * les index se suivent depuis 0, un appariement désigne une page qui existe
 * au tour précédent et une seule fois.
 */
export type PageLue = {
  index: number;
  image_key: string;
  vignette_key: string | null;
  empreinte: string | null;
  mots: string | null;
  apparie_a: number | null;
  zones: Zone[];
};

export function lirePagesTour(
  brut: unknown,
  cles: {
    page: (index: number, extension: "webp" | "jpg") => string;
    vignette: (index: number, extension: "webp" | "jpg") => string;
  },
  nbAnciennes: number | null
): { ok: true; pages: PageLue[] } | { ok: false; message: string } {
  if (!Array.isArray(brut) || brut.length === 0) return { ok: false, message: "Aucune page." };
  if (brut.length > MAX_PAGES_TOUR) return { ok: false, message: `Plus de ${MAX_PAGES_TOUR} pages : refusé.` };
  const reprises = new Set<number>();
  const pages: PageLue[] = [];
  for (let i = 0; i < brut.length; i++) {
    const p = (brut[i] ?? {}) as Record<string, unknown>;
    if (p.index !== i) return { ok: false, message: `Page ${i + 1} : index inattendu.` };
    const key = typeof p.image_key === "string" ? p.image_key : "";
    if (key !== cles.page(i, "webp") && key !== cles.page(i, "jpg")) return { ok: false, message: `Page ${i + 1} : clé inattendue.` };
    const vBrute = typeof p.vignette_key === "string" ? p.vignette_key : null;
    if (vBrute !== null && vBrute !== cles.vignette(i, "webp") && vBrute !== cles.vignette(i, "jpg")) {
      return { ok: false, message: `Page ${i + 1} : clé de vignette inattendue.` };
    }
    const empreinte = typeof p.empreinte === "string" && EMPREINTE.test(p.empreinte) ? p.empreinte : null;
    /* Les mots relus : des lettres minuscules et des espaces, bornés. */
    const mots = typeof p.mots === "string" ? p.mots.replace(/[^a-z ]/g, "").replace(/ +/g, " ").trim().slice(0, 3000) || null : null;
    let apparie: number | null = null;
    if (p.apparie_a !== null && p.apparie_a !== undefined) {
      const a = Number(p.apparie_a);
      if (nbAnciennes === null || !Number.isInteger(a) || a < 0 || a >= nbAnciennes || reprises.has(a)) {
        return { ok: false, message: `Page ${i + 1} : appariement impossible.` };
      }
      reprises.add(a);
      apparie = a;
    }
    const zonesBrutes = Array.isArray(p.zones) ? p.zones.slice(0, MAX_ZONES_PAGE) : [];
    const zones: Zone[] = [];
    for (const z of zonesBrutes as Record<string, unknown>[]) {
      const v = [z?.x, z?.y, z?.l, z?.h].map(Number);
      if (v.some((n) => !Number.isFinite(n))) continue;
      const [x, y, l, h] = v.map((n) => Math.min(100, Math.max(0, Math.round(n * 10) / 10)));
      if (l > 0 && h > 0) zones.push({ x, y, l, h });
    }
    pages.push({ index: i, image_key: key, vignette_key: vBrute, empreinte, mots, apparie_a: apparie, zones: apparie === null ? [] : zones });
  }
  return { ok: true, pages };
}

/** Ce qu'un tour a changé depuis le précédent (rien à dire pour le premier). */
export function resumeTour(
  pages: readonly { apparie_a: number | null; zones: readonly Zone[] }[],
  nbAnciennes: number | null
): { nouvelles: number; modifiees: number; retirees: number[] } {
  if (nbAnciennes === null) return { nouvelles: 0, modifiees: 0, retirees: [] };
  const reprises = new Set(pages.map((p) => p.apparie_a).filter((a): a is number => a !== null));
  return {
    nouvelles: pages.filter((p) => p.apparie_a === null).length,
    modifiees: pages.filter((p) => p.apparie_a !== null && p.zones.length > 0).length,
    retirees: Array.from({ length: nbAnciennes }, (_, i) => i).filter((i) => !reprises.has(i)),
  };
}

/** « Page 1 », « Pages 2 et 3 » (les index commencent à 0, les pages à 1). */
export function libelleDouble(indices: readonly number[]): string {
  if (indices.length === 1) return `Page ${indices[0] + 1}`;
  return `Pages ${indices[0] + 1} et ${indices[indices.length - 1] + 1}`;
}

/** Le tour que le client relit : le dernier PUBLIÉ. Les précédents sont archivés. */
export function tourCourant<T extends { numero: number; publie_le: string | null }>(tours: readonly T[]): T | null {
  return tours.filter((t) => t.publie_le).sort((a, b) => b.numero - a.numero)[0] ?? null;
}

/* ─────────────────────────── publier un tour ─────────────────────────── */

export type CouverturePourPublier = { rang: number; image_key: string | null; interieur2_key: string | null; interieur3_key: string | null };

/**
 * Ce qui manque pour publier (vide = publiable). Le tour 1 porte les
 * propositions de couverture : leur NOMBRE est un réglage de la fiche, et
 * `null` refuse (on ne devine pas « 3 par défaut »). Chaque proposition est
 * complète : 1re, 2e et 3e de couverture (PRD §6.1).
 */
export function manquesPourPublierTour(
  tour: { pdf_key: string | null; nb_pages: number | null; pages: readonly unknown[]; echeance_retours: string | null },
  premier: boolean,
  couvertures: readonly CouverturePourPublier[],
  nbPropositions: number | null,
  maintenant: Date
): string[] {
  const m: string[] = [];
  if (!tour.pdf_key || !tour.nb_pages || tour.pages.length === 0) m.push("le PDF du tour, rendu page par page");
  if (!tour.echeance_retours) m.push("l'échéance des retours");
  else if (Date.parse(tour.echeance_retours) <= maintenant.getTime()) m.push("une échéance des retours à venir (celle-ci est passée)");
  if (premier) {
    if (nbPropositions === null) {
      m.push("le nombre de propositions de couverture (réglage de la fiche)");
    } else if (couvertures.length !== nbPropositions) {
      m.push(`${nbPropositions} proposition${nbPropositions > 1 ? "s" : ""} de couverture (${couvertures.length} déposée${couvertures.length > 1 ? "s" : ""})`);
    }
    for (const c of couvertures) {
      const faces = [!c.image_key && "1re", !c.interieur2_key && "2e", !c.interieur3_key && "3e"].filter(Boolean);
      if (faces.length) m.push(`la ${faces.join(", ")} de couverture de la proposition ${c.rang}`);
    }
  }
  return m;
}

/* ─────────────────────────── le choix de couverture ─────────────────────────── */

export type ChoixCouverture =
  | { ok: true; patch: { couverture_choisie_id: string | null; couverture_sans_preference: boolean } }
  | { ok: false; message: string };

/** Une proposition du magazine, ou « Sans préférence ». Changer d'avis est permis jusqu'à la validation. */
export function lireChoixCouverture(corps: Record<string, unknown>, propositions: readonly { id: string }[]): ChoixCouverture {
  if (corps.sans_preference === true) return { ok: true, patch: { couverture_choisie_id: null, couverture_sans_preference: true } };
  const id = typeof corps.couvertureId === "string" ? corps.couvertureId : "";
  if (!propositions.some((p) => p.id === id)) return { ok: false, message: "Cette proposition n'existe pas pour ce magazine." };
  return { ok: true, patch: { couverture_choisie_id: id, couverture_sans_preference: false } };
}

/* ─────────────────────────── lire une note ─────────────────────────── */

export const FILTRES_NOTES = [
  { cle: "toutes", libelle: "Toutes" },
  { cle: "a_traiter", libelle: "À traiter" },
  { cle: "resolues", libelle: "Résolues" },
] as const;
export type FiltreNotes = (typeof FILTRES_NOTES)[number]["cle"];

/** La note en une phrase, pour la carte (client) et la fiche (atelier). */
export function resumeNote(type: string, contenu: Record<string, unknown>): string {
  const t = (k: string) => (typeof contenu[k] === "string" ? (contenu[k] as string) : "");
  switch (type) {
    case "texte":
      if (t("cible") && t("remplacement")) return `« ${t("cible")} » devient « ${t("remplacement")} »`;
      return t("remplacement") ? `Remplacer par « ${t("remplacement")} »` : `Corriger « ${t("cible")} »`;
    case "photo":
      return t("description") || "Changer pour une photo choisie parmi celles de l'édition";
    case "idee":
      return t("texte");
    case "retirer":
      return t("raison") ? `Retirer cet élément : ${t("raison")}` : "Retirer cet élément";
    default:
      return Object.values(contenu).filter((v) => typeof v === "string").join(" · ");
  }
}
