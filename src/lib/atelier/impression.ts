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
 *   20 pages        → agrafé (saddle stitch)
 *   22 à 50 pages   → dos carré collé (perfect binding)
 *
 * 22 pages n'arrive jamais en pratique (la grille commerciale saute de 20 à
 * 24) : si un dossier en porte quand même, le dos carré est le repli
 * arbitraire — il accepte cette pagination, l'agrafé de Cloudprinter non.
 *
 * ⚠️ Les finitions (grammage intérieur, papier de couverture) sont le choix
 * par défaut d'aujourd'hui. L'étude de prix de Mathias tranchera le choix
 * commercial définitif : cette table est LE seul endroit à retoucher.
 */
const AGRAFE: ProduitImpression = {
  produit: "magazine_sas_a4_p_fc",
  libelle: "Magazine A4 agrafé",
  fichiers: ["product"],
  finitions: [
    { type: "pageblock_130mcs", count: "pages" },
    { type: "cover_250mcs", count: 1 },
  ],
};

const DOS_CARRE: ProduitImpression = {
  produit: "magazine_pb_a4_p_fc",
  libelle: "Magazine A4 dos carré collé",
  fichiers: ["cover", "book"],
  finitions: [
    { type: "pageblock_130mcs", count: "pages" },
    { type: "cover_250mcs", count: 1 },
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

export function produitPour(nbPages: number | null | undefined): ProduitImpression | null {
  if (typeof nbPages !== "number" || !Number.isInteger(nbPages)) return null;
  if (nbPages === 20) return AGRAFE;
  if (nbPages >= 22 && nbPages <= 50) return DOS_CARRE;
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
 * mais un magazine de 50 pages en 300 dpi les dépasse largement : plafond
 * dédié, sans toucher au contrat des photos.
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
 *   constat         — la LARGEUR d'une `cover` de dos carré dépend de
 *                     l'épaisseur du dos, dont la formule n'est pas dans
 *                     products/info (T-078) : on juge sa hauteur, on
 *                     constate sa largeur.
 */
export type VerdictTaille = "conforme" | "sans_fond_perdu" | "hors_format" | "constat";

function proche(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE_FORMAT_MM;
}

export function verdictTaillePage(
  type: TypeFichier,
  largeurMm: number,
  hauteurMm: number
): VerdictTaille {
  if (type === "cover") {
    /* Seule la hauteur est jugeable : fini + fond perdu, ou fini nu. */
    if (proche(hauteurMm, FORMAT_PAGE_PDF_MM.hauteur)) return "constat";
    if (proche(hauteurMm, FORMAT_FINI_MM.hauteur)) return "sans_fond_perdu";
    return "hors_format";
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

/* Les indicatifs des SEULS pays où l'on livre (PAYS_LIVRAISON). Des faits, pas
   une invention : +33 France, +32 Belgique, +352 Luxembourg. Un pays hors de
   cette liste ne devrait jamais arriver ici (Stripe ne collecte que ces trois),
   et s'il arrivait on ne devinerait pas son indicatif. */
const INDICATIFS_PAYS: Record<string, string> = { FR: "33", BE: "32", LU: "352" };

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
  const indicatif = INDICATIFS_PAYS[(pays ?? "").toUpperCase()];
  if (!indicatif) return p; // pays inconnu : mieux vaut le national que l'invention
  return "+" + indicatif + p.replace(/^0+/, "");
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
export function payloadCommande(args: {
  reference: string;
  emailContact: string;
  adresse: AdresseCp;
  produit: ProduitImpression;
  pages: number;
  fichiers: Partial<Record<TypeFichier, { url: string; md5: string }>>;
  titre?: string | null;
}): PayloadCommande {
  const { reference, emailContact, adresse, produit, pages, fichiers, titre } = args;

  const options: Array<{ type: string; count: string }> = [
    { type: "total_pages", count: String(pages) },
    ...produit.finitions.map((f) => ({
      type: f.type,
      count: String(f.count === "pages" ? pages : f.count),
    })),
  ];

  return {
    reference,
    email: emailContact,
    addresses: [adresse],
    items: [
      {
        reference: `${reference}-1`,
        product: produit.produit,
        count: "1",
        shipping_level: SHIPPING_LEVEL,
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

export type EffetSignal = "expedier" | "alerte" | "journal";

/**
 * Ce qu'un signal CloudSignal FAIT chez nous. Trois effets seulement :
 *
 *   expedier — ItemShipped : le seul qui change l'état (6 → 7). Il porte le
 *              transporteur et le suivi ; M7 part dans la foulée.
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
 * `ItemDeliveryCompleted` reste volontairement au journal : le passage en
 * « livrée » (qui arme M8) demeure un geste de l'atelier.
 */
const SIGNAUX_ALERTE = new Set([
  "ItemError",
  "ItemCanceled",
  "CloudprinterOrderCanceled",
  "ItemDeliveryFailed",
]);

export function interpreterSignal(type: string): { effet: EffetSignal } {
  if (type === "ItemShipped") return { effet: "expedier" };
  if (SIGNAUX_ALERTE.has(type)) return { effet: "alerte" };
  return { effet: "journal" };
}
