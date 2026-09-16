/**
 * L'impression chez Cloudprinter — la partie PURE (PRD §13, phase 2).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Aucun réseau, aucune variable d'environnement, aucune base : tout ce qui
 * décide du CONTENU d'une commande d'impression vit ici, testable au clavier
 * dans verif-atelier.ts. L'appel HTTP lui-même vit dans cloudprinter.ts.
 *
 * La règle du fichier est celle de prix.ts : une table en dur, UNE seule
 * source de vérité. Le navigateur n'envoie jamais une référence produit ni
 * un prix — tout se déduit du dossier, côté serveur.
 * ══════════════════════════════════════════════════════════════════════════
 */

/* La reliure est décidée par la GRILLE (`grille.ts`, module pur et public) :
   c'est elle qui sait quelles paginations existent et laquelle s'agrafe. Ce
   fichier-ci ne fait plus que traduire une reliure en référence Cloudprinter,
   et les deux ne peuvent donc plus diverger. */
import { reliurePour } from "./grille";

/* ─────────────────────────── le produit ─────────────────────────── */

/**
 * Les fichiers qu'un produit attend, au sens Cloudprinter — vérifié sur
 * products/info le 26/08/2026 :
 *   product — UN PDF complet, couverture intégrée (l'agrafé) ;
 *   cover + book — DEUX PDF (le dos carré) : la couverture est une feuille
 *   ENVELOPPANTE dont la largeur dépend de l'épaisseur du dos, elle ne peut
 *   physiquement pas vivre dans le même PDF que les pages intérieures.
 */
export type TypeFichier = "product" | "cover" | "book";

/** Les cadres de dépôt de la fiche admin, et leurs clés de saisie. */
export const SLOTS_IMPRESSION: Array<{ cle: string; slot: string; type: TypeFichier; label: string }> = [
  { cle: "pdf_produit", slot: "produit", type: "product", label: "PDF du magazine (couverture intégrée)" },
  { cle: "pdf_couverture", slot: "couverture", type: "cover", label: "PDF de la couverture (enveloppante, avec le dos)" },
  { cle: "pdf_interieur", slot: "interieur", type: "book", label: "PDF du bloc intérieur (les pages)" },
];

export type ProduitImpression = {
  /** La référence produit du catalogue Cloudprinter. */
  produit: string;
  /** Le mot que l'atelier lit à l'écran de confirmation. */
  libelle: string;
  /** Les fichiers que CE produit exige (products/info fait foi). */
  fichiers: TypeFichier[];
  /**
   * Les options de finition envoyées avec la commande, en plus de
   * `total_pages`. `count: "pages"` est remplacé par la pagination du
   * dossier (c'est ainsi que Cloudprinter compte le papier intérieur),
   * tout autre count part tel quel.
   */
  finitions: Array<{ type: string; count: number | "pages" }>;
};

/**
 * La référence se DÉDUIT de la pagination, personne ne la choisit à l'écran
 * (décision de Mathias, 26/08/2026) :
 *   20 pages       → agrafé (saddle stitch)
 *   24 à 60 pages  → dos carré collé (perfect binding)
 *
 * ⚠️ LA LISTE DES PAGINATIONS N'EST PLUS ÉCRITE ICI (10/09/2026) : elle vient
 * de la grille, par `reliurePour`. 22 pages et les impairs n'existent pas dans
 * la grille, donc ils ne désignent AUCUN produit — on ne devine plus une
 * reliure de repli pour une pagination qu'on ne sait pas facturer. Une seule
 * table décide de ce qui est composable, et c'est celle qui décide du prix.
 */

/* ─────────────────── LE PAPIER, TRANCHÉ (11/09/2026) ───────────────────
 *
 * T-027 est clos : Mathias a arrêté les références après le relevé
 * `products/info` + `prices/lookup` du 11/09 (consigné dans
 * docs/reference/SPECS-CLOUDPRINTER.md).
 *
 *   intérieur  — 130 g couché SILK (`pageblock_130mcs`) ;
 *   couverture — 250 g couché silk (`cover_250mcs`) ;
 *   pelliculage — AU CHOIX DU CLIENT, brillant ou mat (plus bas).
 *
 * ⚠️ UNE SEULE CONSTANTE POUR LES DEUX RELIURES, ET C'EST VOULU. Un agrafé
 * et un dos carré doivent se toucher pareil : personne ne reçoit un papier
 * différent parce que son histoire tenait en vingt pages. Changer de papier
 * = changer CES DEUX LIGNES, et la géométrie du dos suit toute seule
 * (`GRAMMAGE_INTERIEUR_GSM` et `BULK_INTERIEUR` s'en déduisent plus bas).
 *
 * ⚠️ CE QUE LE RELEVÉ DU 11/09 A MONTRÉ, et qui ne se devine pas : le
 * grammage ne coûte presque rien (90 → 130 g : un centime sur un 32 pages),
 * mais il change d'USINE, et donc de PORT. En France, `pageblock_130mcs`
 * route vers une usine dont le transporteur le moins cher est à 9,22 € HT,
 * là où `pageblock_130mcg` (le même 130 g, en gloss) tombe à 6,46 €. Au
 * Portugal et en Allemagne, les deux donnent exactement le même prix. Le
 * jour où le port français pèse plus que le toucher du papier, la bascule
 * tient en un mot : `mcs` → `mcg`. */
export const PAPIER_INTERIEUR = "pageblock_130mcs";
export const PAPIER_COUVERTURE = "cover_250mcs";

/* ─────────────── LE PELLICULAGE, AU CHOIX DU CLIENT ───────────────
 *
 * Décision de Mathias du 11/09/2026 : brillant ou mat, sur les DEUX
 * reliures, et sans différence de prix — vérifié, pas supposé : un dos
 * carré de 32 pages est devisé 6,6667 € HT en brillant et 6,6722 € en mat.
 * Un demi-centime. Rien à arbitrer, donc rien à facturer.
 *
 * ⚠️ L'ASYMÉTRIE DES RÉFÉRENCES EST CELLE DE CLOUDPRINTER, PAS UNE COQUILLE.
 * Leur famille `type_book_cover_finish` nomme le brillant `finish_gloss`
 * (c'est leur défaut) et le mat `cover_finish_matte`. Relevé le 11/09 sur
 * les deux produits. Ne pas « harmoniser » en `cover_finish_gloss` : cette
 * référence n'existe pas et la commande serait refusée.
 *
 * Le MOT du dossier est le nôtre (`gloss` / `matte`), jamais la référence
 * Cloudprinter : c'est lui qui voyage en base, dans le journal et à
 * l'écran. La traduction en référence se fait ici, au dernier moment. */
export type Finition = "gloss" | "matte";

/** Le défaut Cloudprinter, et le nôtre : un dossier sans choix part brillant. */
export const FINITION_DEFAUT: Finition = "gloss";

/** Notre mot → la référence de leur catalogue. Le seul endroit qui les relie. */
export const FINITION_OPTION: Record<Finition, string> = {
  gloss: "finish_gloss",
  matte: "cover_finish_matte",
};

/** Le mot que le client et l'atelier lisent, au féminin de « couverture ». */
export const FINITION_LIBELLE: Record<Finition, string> = {
  gloss: "brillante",
  matte: "mate",
};

/**
 * Une valeur venue du navigateur (ou d'une colonne fraîche) devient une
 * finition, ou `null`. Aucun repli ici : le repli sur le défaut appartient
 * à l'appelant qui LIT un dossier (`finitionDuDossier`), jamais à celui qui
 * VALIDE une saisie — accepter « brilant » en le corrigeant en silence
 * ferait imprimer autre chose que ce qui a été cliqué.
 */
export function normaliserFinition(v: unknown): Finition | null {
  return v === "gloss" || v === "matte" ? v : null;
}

/**
 * La finition d'un dossier, avec le repli assumé sur le défaut. Un dossier
 * ouvert avant le 11/09 n'a rien choisi : il part en brillant, c'est-à-dire
 * exactement ce qui a été imprimé jusqu'ici.
 */
export function finitionDuDossier(v: unknown): Finition {
  return normaliserFinition(v) ?? FINITION_DEFAUT;
}

/**
 * Les deux produits, avec LE MÊME papier. Le pelliculage n'est PAS dans
 * cette table : il ne dépend pas du produit mais du dossier, et il entre
 * dans les options au moment de composer l'item (`optionsItem`).
 */
const AGRAFE: ProduitImpression = {
  produit: "magazine_sas_a4_p_fc",
  libelle: "Magazine A4 agrafé",
  fichiers: ["product"],
  finitions: [
    { type: PAPIER_INTERIEUR, count: "pages" },
    { type: PAPIER_COUVERTURE, count: 1 },
  ],
};

const DOS_CARRE: ProduitImpression = {
  produit: "magazine_pb_a4_p_fc",
  libelle: "Magazine A4 dos carré collé",
  fichiers: ["cover", "book"],
  finitions: [
    { type: PAPIER_INTERIEUR, count: "pages" },
    { type: PAPIER_COUVERTURE, count: 1 },
  ],
};

/* ─────────── ce que Cloudprinter attend d'un PDF (les SPECS) ───────────
   Source UNIQUE : docs/reference/SPECS-CLOUDPRINTER.md, relevé products/info
   du 30/08/2026 — ces chiffres font foi, ne jamais les remplacer par une
   supposition. Les deux produits partagent le même format. */

/** Format fini (après rognage) : A4 exact, 210 × 297 mm. */
export const FORMAT_FINI_MM = { largeur: 210, hauteur: 297 } as const;

/** Fond perdu exigé : 3 mm de chaque côté. */
export const FOND_PERDU_MM = 3;

/** La page PDF attendue = fini + fond perdu : 216 × 303 mm. */
export const FORMAT_PAGE_PDF_MM = {
  largeur: FORMAT_FINI_MM.largeur + 2 * FOND_PERDU_MM,
  hauteur: FORMAT_FINI_MM.hauteur + 2 * FOND_PERDU_MM,
} as const;

/**
 * Tolérance de comparaison, en mm. Ce n'est PAS une spec Cloudprinter :
 * c'est la marge d'arrondi d'un export (un MediaBox en points flottants
 * converti en mm ne tombe jamais pile). Un demi-millimètre absorbe
 * l'arrondi sans laisser passer un vrai mauvais format.
 */
export const TOLERANCE_FORMAT_MM = 0.5;

/**
 * La règle de pagination du FICHIER intérieur, par produit (même source) :
 *   agrafé    — le PDF `product` doit compter un multiple de 4 pages,
 *               8 au minimum (une feuille agrafée = 4 faces) ;
 *   dos carré — le PDF `book` doit compter un multiple de 2.
 * La couverture (`cover`) n'a pas de règle de compte relevée.
 */
export const REGLE_PAGES_FICHIER: Record<string, { multiple: number; min: number | null }> = {
  magazine_sas_a4_p_fc: { multiple: 4, min: 8 },
  magazine_pb_a4_p_fc: { multiple: 2, min: null },
};

/* ────────────── LA GÉOMÉTRIE DU DOS (dos carré seulement) ──────────────
 *
 * Trouvée le 02/09 dans la doc Cloudprinter atteinte par un lien-annotation
 * du gabarit `templates/2216`, recopiée telle quelle dans
 * docs/reference/SPECS-CLOUDPRINTER.md :
 *
 *     dos_mm = (grammage × bulk × (pages / 2)) / 1000 + 2 × épaisseur_couv
 *
 * Elle est restée lettre morte jusqu'au 11/09 parce qu'elle exige un
 * grammage, et que le grammage n'était pas tranché (T-028). Il l'est : ces
 * deux constantes se DÉDUISENT de `PAPIER_INTERIEUR`, elles ne se saisissent
 * pas — changer le papier plus haut change le dos ici, sans que personne
 * n'ait à s'en souvenir.
 */

/** Le grammage, lu dans la référence : `pageblock_130mcs` → 130. */
export const GRAMMAGE_INTERIEUR_GSM = Number(
  /pageblock_(\d+)/.exec(PAPIER_INTERIEUR)?.[1] ?? 0,
);

/**
 * Le « bulk » (foisonnement) du papier, valeurs moyennes Cloudprinter :
 * MCG (gloss) 0,80 · MCS (silk) 0,90 · ECB 1,20 · OFF 1,22. Comme le
 * grammage, il se déduit du SUFFIXE de la référence — `…130mcs` → silk.
 * Un suffixe inconnu rend 0 : le dos vaudra alors le seul terme de
 * couverture, visiblement faux, plutôt qu'un chiffre inventé (interdit nº5).
 */
export const BULK_PAR_PAPIER: Record<string, number> = {
  mcg: 0.8,
  mcs: 0.9,
  ecb: 1.2,
  off: 1.22,
};

export const BULK_INTERIEUR =
  BULK_PAR_PAPIER[/pageblock_\d+([a-z]+)/.exec(PAPIER_INTERIEUR)?.[1] ?? ""] ?? 0;

/**
 * Le terme de couverture de la formule, en mm. Cloudprinter le fixe par
 * RELIURE, pas par grammage : Case Wrap 3 mm → 6,0 · Case Wrap 2 mm → 4,0 ·
 * **Perfect Binding / Softcover → 1,0** (2 × 0,5). `magazine_pb_a4_p_fc`
 * est un softcover, donc 1,0. Ce n'est PAS l'épaisseur du 250 g : c'est leur
 * forfait, et on le recopie sans l'améliorer.
 */
export const EPAISSEUR_COUVERTURE_MM = 1.0;

/**
 * L'épaisseur du dos, en mm, pour une pagination donnée. `null` quand la
 * pagination ne désigne pas un dos carré : un agrafé n'a pas de dos, et
 * rendre 0 laisserait croire qu'on a calculé quelque chose.
 *
 * Arrondi au centième : c'est la précision de la formule source, et celle
 * que `decouperCouverture` rend déjà sur le dos MESURÉ (souvenir.ts) — les
 * deux chiffres doivent pouvoir se comparer sans bruit d'arrondi.
 */
export function dosMmPourPages(nbPages: number | null | undefined): number | null {
  if (reliurePour(nbPages) !== "dos_carre" || typeof nbPages !== "number") return null;
  const dos =
    (GRAMMAGE_INTERIEUR_GSM * BULK_INTERIEUR * (nbPages / 2)) / 1000 + EPAISSEUR_COUVERTURE_MM;
  return Math.round(dos * 100) / 100;
}

/**
 * La largeur de la COUVERTURE ENVELOPPANTE attendue par Cloudprinter, fonds
 * perdus compris : deux faces finies, leurs deux fonds perdus extérieurs, et
 * le dos entre elles.
 *
 *     2 × (210 + 3) + dos
 *
 * C'est la cote que `verdictTaillePage` peut enfin juger : jusqu'au 11/09
 * elle se contentait d'un « constat » sur la largeur d'une `cover`, faute de
 * savoir ce qu'elle aurait dû valoir. La hauteur, elle, n'a jamais dépendu
 * du dos (303 mm, fini + fonds perdus).
 */
export function largeurCouvertureMm(nbPages: number | null | undefined): number | null {
  const dos = dosMmPourPages(nbPages);
  if (dos === null) return null;
  return Math.round((2 * (FORMAT_FINI_MM.largeur + FOND_PERDU_MM) + dos) * 100) / 100;
}

export function produitPour(nbPages: number | null | undefined): ProduitImpression | null {
  const reliure = reliurePour(nbPages);
  if (reliure === "agrafe") return AGRAFE;
  if (reliure === "dos_carre") return DOS_CARRE;
  return null;
}

/**
 * Le niveau d'expédition, identique pour toute la zone FR/BE/LU. `cp_saver`
 * est le suivi économique de Cloudprinter — le délai public (10 jours après
 * validation, PRD §13) garde de la marge même avec lui.
 */
export const SHIPPING_LEVEL = "cp_saver";

/**
 * Le contact de la COMMANDE côté Cloudprinter (leur champ `email` racine) :
 * c'est nous qu'ils préviennent en cas de souci de production, jamais la
 * cliente. La même adresse que l'expéditeur des mails (PRD §3).
 */
export const EMAIL_CONTACT = "contact@bellajour.com";

/**
 * Le repli quand le dossier n'a pas de téléphone : celui de la maison.
 * `phone` est OBLIGATOIRE chez Cloudprinter (vérifié le 26/08/2026 : leur
 * orders/add répond `missing_required_parameter 'phone'`) — c'est le numéro
 * que le transporteur appelle si la livraison coince, donc celui du dossier
 * d'abord, le nôtre à défaut : mieux vaut nous qu'un refus de commande.
 */
export const TELEPHONE_CONTACT = "+33680009071";

/* ─────────────────────────── le fichier ─────────────────────────── */

/**
 * Plafond du PDF print-ready. Les photos plafonnent à 50 Mo (formats.ts),
 * mais un magazine de soixante pages en 300 dpi les dépasse largement :
 * plafond dédié, sans toucher au contrat des photos.
 */
export const MAX_PDF_BYTES = 200 * 1024 * 1024; /* 200 Mo */

/**
 * Une clé du coffre, jamais une adresse externe : Cloudprinter exige le
 * md5 du fichier, et on ne sait le donner que pour un objet qui est à nous
 * (l'ETag R2). Un lien externe partirait avec une empreinte fausse ou
 * absente — refus silencieux côté imprimeur.
 */
export function estCleImpression(v: string): boolean {
  return v.length > 0 && !/^https?:\/\//i.test(v) && !v.includes("..");
}

/* ─────────────────────── le contrôle du PDF ─────────────────────── */

/**
 * Un point PDF = 1/72 de pouce, un pouce = 25,4 mm. Arrondi au dixième de
 * millimètre : c'est la précision qu'un œil d'atelier peut exploiter, et
 * elle absorbe les flottants d'un MediaBox exporté par Canva ou InDesign
 * (`841.8897…` doit se lire 297,0 et pas 296,99999).
 */
export function pointsEnMm(points: number): number {
  return Math.round((points * 25.4 * 10) / 72) / 10;
}

/**
 * Ce que le contrôle technique peut DIRE du nombre de pages d'un PDF face
 * au DOSSIER, et rien de plus.
 *
 *   product / book — la pagination du dossier (`nb_pages`) est l'attente
 *   naturelle : c'est elle qui part chez Cloudprinter en `total_pages`.
 *   Écart ≠ refus : l'écran signale, l'atelier tranche — un `product`
 *   agrafé peut légitimement porter ses faces de couverture en plus, et le
 *   relevé products/info ne dit pas comment `total_pages` les compte.
 *
 *   cover — AUCUNE attente de compte relevée (SPECS-CLOUDPRINTER.md) :
 *   on constate, on ne juge pas.
 */
export type VerdictPages =
  | { genre: "conforme"; attendu: number }
  | { genre: "ecart"; attendu: number }
  | { genre: "constat" };

export function verdictPagesPdf(
  type: TypeFichier,
  nbPagesFichier: number,
  nbPagesDossier: number | null | undefined
): VerdictPages {
  if (type === "cover") return { genre: "constat" };
  if (typeof nbPagesDossier !== "number" || !Number.isInteger(nbPagesDossier) || nbPagesDossier <= 0) {
    /* Dossier sans pagination : rien à quoi comparer, on constate. */
    return { genre: "constat" };
  }
  return nbPagesFichier === nbPagesDossier
    ? { genre: "conforme", attendu: nbPagesDossier }
    : { genre: "ecart", attendu: nbPagesDossier };
}

/**
 * Le verdict de FORMAT d'une page, contre les specs relevées
 * (SPECS-CLOUDPRINTER.md, 30/08/2026) :
 *
 *   conforme        — ~216 × 303 mm : le fini plus les 3 mm de fond perdu,
 *                     ce que Cloudprinter attend ;
 *   sans_fond_perdu — ~210 × 297 mm : le format FINI. Imprimable, mais le
 *                     rognage mordra dans l'image au bord ;
 *   hors_format     — ni l'un ni l'autre ;
 *   constat         — on ne sait pas juger : c'est une `cover` et la
 *                     pagination du dossier est inconnue, donc le dos aussi.
 *
 * ⚠️ LA `cover` SE JUGE DEPUIS LE 11/09/2026, et c'est le seul changement de
 * cette fonction. Sa largeur dépend de l'épaisseur du dos, qui dépend du
 * grammage, qui n'était pas tranché : on constatait. Le papier est arrêté,
 * `largeurCouvertureMm` sait donc ce que la feuille doit mesurer, et une
 * couverture au mauvais dos est le défaut qu'on ne voit JAMAIS à l'écran et
 * toujours sur l'objet imprimé — un titre décalé sur la tranche.
 */
export type VerdictTaille = "conforme" | "sans_fond_perdu" | "hors_format" | "constat";

function proche(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE_FORMAT_MM;
}

export function verdictTaillePage(
  type: TypeFichier,
  largeurMm: number,
  hauteurMm: number,
  /**
   * La pagination du DOSSIER, qui donne le dos et donc la largeur attendue
   * d'une couverture enveloppante. Absente (ou hors grille) : on retombe
   * exactement sur le comportement d'avant le 11/09 — la hauteur est jugée,
   * la largeur constatée.
   */
  nbPagesDossier?: number | null,
): VerdictTaille {
  if (type === "cover") {
    /* La hauteur d'abord : elle ne dépend pas du dos, et une hauteur fausse
       condamne la feuille quelle que soit sa largeur. */
    if (proche(hauteurMm, FORMAT_FINI_MM.hauteur)) return "sans_fond_perdu";
    if (!proche(hauteurMm, FORMAT_PAGE_PDF_MM.hauteur)) return "hors_format";

    /* Puis la largeur, SI on sait ce qu'elle devrait valoir. */
    const attendue = largeurCouvertureMm(nbPagesDossier);
    if (attendue === null) return "constat";
    return proche(largeurMm, attendue) ? "conforme" : "hors_format";
  }
  if (proche(largeurMm, FORMAT_PAGE_PDF_MM.largeur) && proche(hauteurMm, FORMAT_PAGE_PDF_MM.hauteur)) {
    return "conforme";
  }
  if (proche(largeurMm, FORMAT_FINI_MM.largeur) && proche(hauteurMm, FORMAT_FINI_MM.hauteur)) {
    return "sans_fond_perdu";
  }
  return "hors_format";
}

/**
 * Le compte de pages du fichier respecte-t-il la règle du PRODUIT
 * (multiple de 4 min 8 pour l'agrafé, multiple de 2 pour le dos carré) ?
 * `null` quand aucune règle ne s'applique : une `cover`, ou un dossier
 * dont la pagination ne désigne aucun produit.
 */
export function verdictMultiplePages(
  type: TypeFichier,
  nbPagesFichier: number,
  produit: ProduitImpression | null
): { ok: boolean; regle: string } | null {
  if (type === "cover" || !produit) return null;
  const regle = REGLE_PAGES_FICHIER[produit.produit];
  if (!regle) return null;
  const libelle =
    regle.min !== null
      ? `multiple de ${regle.multiple}, minimum ${regle.min}`
      : `multiple de ${regle.multiple}`;
  const ok =
    nbPagesFichier % regle.multiple === 0 && (regle.min === null || nbPagesFichier >= regle.min);
  return { ok, regle: libelle };
}

/* ─────────────────────────── l'adresse ─────────────────────────── */

export type AdresseCp = {
  type: "delivery";
  firstname: string;
  lastname: string;
  street1: string;
  street2?: string;
  zip: string;
  city: string;
  state?: string;
  country: string;
  email: string;
  phone?: string;
};

type Brut = Record<string, unknown>;

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/* Les indicatifs des pays où l'on livre (PAYS_LIVRAISON : toute l'Europe
   depuis le 11/09/2026). Des faits publics (UIT E.164), pas une invention. Un
   pays hors de cette liste ne devrait jamais arriver ici, et s'il arrivait on
   ne devinerait pas son indicatif : le numéro partirait tel quel. */
const INDICATIFS_PAYS: Record<string, string> = {
  AT: "43", BE: "32", BG: "359", HR: "385", CY: "357", CZ: "420", DK: "45", EE: "372",
  FI: "358", FR: "33", DE: "49", GR: "30", HU: "36", IE: "353", IT: "39", LV: "371",
  LT: "370", LU: "352", MT: "356", NL: "31", PL: "48", PT: "351", RO: "40", SK: "421",
  SI: "386", ES: "34", SE: "46", GB: "44", CH: "41", NO: "47",
};

/* ⚠️ L'ITALIE GARDE SON ZÉRO. Presque partout en Europe le 0 de tête est un
   préfixe national qu'on retire derrière l'indicatif (« 06 12 » → +33 6 12).
   En Italie, ce 0 fait partie du numéro fixe (« 02 1234567 » → +39 02 1234567) :
   le retirer ferait un numéro qui n'existe pas, et un transporteur qui n'appelle
   personne. Fait public, figé par le harnais. */
const GARDE_LE_ZERO: ReadonlySet<string> = new Set(["IT"]);

/** L'indicatif d'un pays de la zone, ou null : exporté pour que le harnais
 *  prouve qu'AUCUN pays de PAYS_LIVRAISON n'en manque. */
export function indicatifPour(pays: string): string | null {
  return INDICATIFS_PAYS[(pays ?? "").toUpperCase()] ?? null;
}

/**
 * Le téléphone en E.164 (« +33612345678 »), à l'aide du PAYS de livraison.
 *
 * ⚠️ POURQUOI ICI, ET PAS AU QUESTIONNAIRE. On ne peut normaliser un numéro
 * national qu'en connaissant le pays — et le pays n'est PAS connu à l'écran 4
 * (le questionnaire ne le demande pas) : il n'arrive qu'avec l'adresse que
 * Stripe collecte au paiement. Ce module-ci est donc le premier endroit du
 * parcours qui a les deux à la fois. `normaliserTelephone` (questionnaire.ts)
 * se contente d'enlever les séparateurs ; la mise au format international se
 * fait ici, au moment de composer la commande Cloudprinter.
 *
 * Règles : déjà en « +… » → gardé tel quel (la cliente a saisi l'international).
 * « 00xx… » (préfixe international composé) → « +xx… ». Sinon, numéro national :
 * on retire le zéro de tête et on préfixe l'indicatif du pays. Pays hors zone
 * ou numéro vide → on rend ce qu'on a sans deviner. Fonction PURE, éprouvée
 * par verif-atelier.ts.
 */
export function telephoneE164(brut: string, pays: string): string {
  const p = (brut ?? "").replace(/[^\d+]/g, "");
  if (!p) return "";
  if (p.startsWith("+")) return p;
  if (p.startsWith("00")) return "+" + p.slice(2);
  const code = (pays ?? "").toUpperCase();
  const indicatif = INDICATIFS_PAYS[code];
  if (!indicatif) return p; // pays inconnu : mieux vaut le national que l'invention
  return "+" + indicatif + (GARDE_LE_ZERO.has(code) ? p : p.replace(/^0+/, ""));
}

/**
 * Le blob Stripe (`adresse_livraison`) devient une adresse Cloudprinter — ou
 * la liste de ce qui manque, champ par champ, pour que l'écran le dise.
 *
 * Tolérant comme `versAdresse` (donnees.ts) : la forme imbriquée
 * `{name, address:{line1,…}}` de Stripe, ou une forme à plat posée à la main.
 *
 * Stripe ne fournit ni découpage prénom/nom ni téléphone : le `name` est
 * coupé au premier espace (un seul mot sert deux fois — Cloudprinter exige
 * les deux champs), et le téléphone vient du DOSSIER (le questionnaire le
 * collecte), avec `TELEPHONE_CONTACT` en repli — leur API l'exige.
 */
export function adresseCloudprinter(
  brut: unknown,
  email: string,
  telephone?: string | null
): { ok: true; adresse: AdresseCp } | { ok: false; manque: string[] } {
  const o = (brut && typeof brut === "object" ? brut : {}) as Brut;
  const a = (o.address && typeof o.address === "object" ? o.address : o) as Brut;

  const nom = s(o.name) || s(o.nom);
  const ligne1 = s(a.line1) || s(a.ligne1);
  const ligne2 = s(a.line2) || s(a.ligne2);
  const zip = s(a.postal_code) || s(a.code_postal) || s(a.zip);
  const ville = s(a.city) || s(a.ville);
  const pays = (s(a.country) || s(a.pays)).toUpperCase();
  const etat = s(a.state);

  const manque: string[] = [];
  if (!nom) manque.push("nom");
  if (!ligne1) manque.push("adresse");
  if (!zip) manque.push("code postal");
  if (!ville) manque.push("ville");
  if (!/^[A-Z]{2}$/.test(pays)) manque.push("pays");
  if (!email) manque.push("email");
  if (manque.length) return { ok: false, manque };

  const mots = nom.split(/\s+/);
  const firstname = mots[0];
  const lastname = mots.length > 1 ? mots.slice(1).join(" ") : mots[0];

  /* Le numéro au format international, avec le pays qu'on vient de lire :
     « 0612345678 » livré en France devient « +33612345678 ». C'est ici, et
     nulle part avant, qu'on connaît le pays (telephoneE164, plus haut). */
  const tel = telephoneE164(telephone ?? "", pays);

  return {
    ok: true,
    adresse: {
      type: "delivery",
      firstname,
      lastname,
      street1: ligne1,
      ...(ligne2 ? { street2: ligne2 } : {}),
      zip,
      city: ville,
      ...(etat ? { state: etat } : {}),
      country: pays,
      email,
      phone: tel || TELEPHONE_CONTACT,
    },
  };
}

/* ─────────────────────────── la commande ─────────────────────────── */

/**
 * Les OPTIONS d'un item : la pagination, puis les finitions du produit.
 *
 * Extraites de `payloadCommande` (10/09/2026) pour que le DEVIS et la
 * COMMANDE en partagent une seule et même construction. La règle est celle
 * du script de relevé (`cloudprinter-produits.mjs devis`) : « les mêmes
 * options que la commande, sinon le devis ne chiffre pas ce qu'on
 * commandera ». Deux listes recopiées auraient divergé au premier changement
 * de grammage — et l'écart n'aurait pas fait d'erreur, seulement un prix
 * faux. `scripts/verif-atelier.ts` compare les deux à chaque exécution.
 */
function optionsItem(
  produit: ProduitImpression,
  pages: number,
  /* ⚠️ LE PELLICULAGE VIENT DU DOSSIER, PAS DU PRODUIT (11/09/2026). Il est
     le seul paramètre d'impression que le client choisit lui-même, et il
     doit donc traverser le devis ET la commande de la même façon que le
     papier — sinon le jour où le mat coûterait quelque chose, on chiffrerait
     un objet et on en commanderait un autre. Aujourd'hui l'écart relevé est
     d'un demi-centime ; la règle vaut pour demain. */
  finition: Finition,
): Array<{ type: string; count: string }> {
  return [
    { type: "total_pages", count: String(pages) },
    ...produit.finitions.map((f) => ({
      type: f.type,
      count: String(f.count === "pages" ? pages : f.count),
    })),
    { type: FINITION_OPTION[finition], count: "1" },
  ];
}

export type PayloadDevis = {
  country: string;
  currency: "EUR";
  items: Array<{
    reference: string;
    product: string;
    count: string;
    options: Array<{ type: string; count: string }>;
  }>;
};

/**
 * Le corps de `prices/lookup` — le DEVIS de port, sans rien commander.
 *
 * Aucun fichier, aucune adresse, aucune référence de dossier : un devis ne
 * dit que « combien coûte l'envoi de CET objet vers CE pays ». La référence
 * d'item est une chaîne fixe, comme dans le script de relevé : elle ne sert
 * qu'à relier la réponse à la demande, elle n'entre dans aucune commande.
 *
 * ⚠️ `count: "1"` : le devis chiffre UN exemplaire, exactement comme le
 * checkout (verrou `QUANTITE_MAX`, prix.ts). Le jour où les multi-exemplaires
 * s'ouvrent, ce « 1 » doit bouger EN MÊME TEMPS que celui du line_item.
 */
export function payloadDevis(args: {
  pays: string;
  produit: ProduitImpression;
  pages: number;
  /** La finition du dossier. Absente = le défaut, comme partout ailleurs. */
  finition?: Finition | null;
}): PayloadDevis {
  const { pays, produit, pages } = args;
  const finition = finitionDuDossier(args.finition);
  return {
    country: pays,
    currency: "EUR",
    items: [
      {
        reference: "devis",
        product: produit.produit,
        count: "1",
        options: optionsItem(produit, pages, finition),
      },
    ],
  };
}

export type PayloadCommande = {
  reference: string;
  email: string;
  addresses: AdresseCp[];
  items: Array<{
    reference: string;
    product: string;
    count: string;
    shipping_level: string;
    title?: string;
    files: Array<{ type: string; url: string; md5sum: string }>;
    options: Array<{ type: string; count: string }>;
  }>;
};

/**
 * Le corps d'`orders/add`, SANS la clé API : elle est injectée par le module
 * réseau (cloudprinter.ts), et ce fichier reste pur et sans secret.
 *
 * Un seul item ; ses fichiers sont EXACTEMENT ceux que le produit déclare
 * (`produit.fichiers`) — un PDF `product` pour l'agrafé, le duo
 * `cover` + `book` pour le dos carré. Un fichier requis absent est une
 * erreur de programmation de l'appelant : la route contrôle avant.
 * Les counts sont des CHAÎNES : c'est la forme que l'API documente.
 */
export function payloadCommande(
  args: {
    reference: string;
    emailContact: string;
    adresse: AdresseCp;
    produit: ProduitImpression;
    pages: number;
    fichiers: Partial<Record<TypeFichier, { url: string; md5: string }>>;
    titre?: string | null;
    /**
     * Le pelliculage CHOISI PAR LE CLIENT sur sa page de commande
     * (`numeros.finition`). Absent ou illisible = brillant, le défaut
     * Cloudprinter et ce qui a été imprimé jusqu'au 11/09 : un dossier
     * d'avant ce lot ne change donc pas d'objet.
     */
    finition?: Finition | null;
  },
  /**
   * Le niveau d'expédition GELÉ AU DEVIS (`numeros.livraison_niveau`).
   *
   * ⚠️ POURQUOI IL SE PASSE ET NE SE DEVINE PAS. Le premier devis réel
   * (10/09/2026) a montré que `SHIPPING_LEVEL` — `cp_saver` — n'est PAS
   * proposé partout : la France en 32 pages n'offrait que `cp_ground`,
   * `cp_fast` et `cp_limited`. Commander sous un niveau qui n'a pas été
   * chiffré, c'est facturer un service et en acheter un autre. Le niveau
   * retenu au devis remonte donc jusqu'ici. `null`/absent = dossier chiffré
   * avant ce lot (ou devis manqué) : on retombe sur la constante, exactement
   * comme avant.
   */
  niveau?: string | null,
): PayloadCommande {
  const { reference, emailContact, adresse, produit, pages, fichiers, titre } = args;

  const options = optionsItem(produit, pages, finitionDuDossier(args.finition));

  return {
    reference,
    email: emailContact,
    addresses: [adresse],
    items: [
      {
        reference: `${reference}-1`,
        product: produit.produit,
        count: "1",
        shipping_level: niveau ?? SHIPPING_LEVEL,
        ...(titre ? { title: titre.slice(0, 120) } : {}),
        files: produit.fichiers.map((type) => {
          const f = fichiers[type];
          if (!f) throw new Error(`fichier ${type} manquant pour ${produit.produit}`);
          return { type, url: f.url, md5sum: f.md5 };
        }),
        options,
      },
    ],
  };
}

/* ─────────────────────────── les signaux ─────────────────────────── */

export type EffetSignal = "expedier" | "livrer" | "alerte" | "journal";

/**
 * Ce qu'un signal CloudSignal FAIT chez nous. Quatre effets seulement :
 *
 *   expedier — ItemShipped : 6 → 7. Il porte le transporteur et le suivi ;
 *              M7 part dans la foulée.
 *   livrer   — ItemDeliveryCompleted : 7 → 8 (décision de Mathias, 03/09).
 *              Le colis est chez le client ; M7b « votre magazine est
 *              arrivé » part dans la foulée, M8 s'arme pour J+3. Le geste
 *              manuel « Marquer livrée » RESTE le repli : transporteur sans
 *              signal, ou mode manuel sans CLOUDPRINTER_API_KEY.
 *   alerte   — un échec : journalisé en ton d'alerte, AUCUN changement
 *              d'état. Un problème d'impression ou de livraison se traite au
 *              téléphone et au dashboard, pas par une machine qui déciderait
 *              seule de reculer un dossier.
 *   journal  — tout le reste (validation, production, emballage…) : le fil
 *              de production devient lisible dans le Parcours, rien ne bouge.
 *
 * La liste vient de l'écran d'abonnement du dashboard (Signal Interface
 * Method 2.1, relevé le 26/08/2026) — plus complète que la doc v1.1.
 * Un type inconnu tombe en `journal` : un signal d'une version future de
 * leur API ne doit ni casser le webhook ni disparaître du récit.
 */
const SIGNAUX_ALERTE = new Set([
  "ItemError",
  "ItemCanceled",
  "CloudprinterOrderCanceled",
  "ItemDeliveryFailed",
]);

export function interpreterSignal(type: string): { effet: EffetSignal } {
  if (type === "ItemShipped") return { effet: "expedier" };
  if (type === "ItemDeliveryCompleted") return { effet: "livrer" };
  if (SIGNAUX_ALERTE.has(type)) return { effet: "alerte" };
  return { effet: "journal" };
}
