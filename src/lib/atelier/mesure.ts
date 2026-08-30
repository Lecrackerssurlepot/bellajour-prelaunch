/**
 * La mesure du parcours — les règles, sans la base.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN MODULE PUR
 *
 * Reconstruire les jalons d'un dossier depuis le journal, découper la vie en
 * étapes, compter l'entonnoir, croiser réactivité et vente : ce sont des
 * RÈGLES, pas des requêtes. Elles vivaient enfermées dans metriques.ts (côté
 * admin), donc hors de portée de scripts/verif-atelier.ts. Les voici
 * testables au clavier, et metriques.ts comme l'export CSV lisent LA MÊME
 * règle — deux écrans ne peuvent plus se contredire sur une médiane.
 *
 * Tout est dérivé du journal `evenements`, jamais d'un compteur entretenu à
 * côté. Une mesure sans échantillon rend `null`, jamais un zéro : un zéro se
 * lit comme une contre-performance, alors qu'il ne dit que « pas encore ».
 * ══════════════════════════════════════════════════════════════════════════
 */

const H = 3_600_000;

/** Les seuls types d'événements que la mesure sait lire. */
export const TYPES_MESURE = ["numero_cree", "consentements", "checkout_ouvert", "etat_change"] as const;

export type EvenementMesure = {
  numero_id: string;
  type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Les jalons datés d'un dossier, reconstruits depuis le journal.
 *
 * `depot` vient de l'événement `consentements` porteur de consent_photos —
 * le seul signal serveur de fin de dépôt (cf. mails.ts). `checkout` vient de
 * `checkout_ouvert` (la route de paiement le journalise). Les autres viennent
 * des `etat_change`. Un jalon absent reste absent : c'est ce qui permet de
 * distinguer « pas encore mesurable » de « zéro ».
 */
export type Jalons = {
  cree?: number;
  depot?: number;
  apercu?: number;
  checkout?: number;
  paye?: number;
  maquette?: number;
  validee?: number;
  production?: number;
  expediee?: number;
  livree?: number;
};

export type JalonCle = keyof Jalons;

const VERS_JALON: Record<string, JalonCle> = {
  apercu_pret: "apercu",
  payee: "paye",
  maquette_prete: "maquette",
  validee: "validee",
  en_production: "production",
  expediee: "expediee",
  livree: "livree",
};

export function reconstruireJalons(evts: EvenementMesure[]): Map<string, Jalons> {
  const par = new Map<string, Jalons>();
  /* Chronologique : sur un aller-retour (1b puis retour en 1), c'est le
     DERNIER passage qui compte — c'est celui qui a produit la couverture. */
  for (const e of [...evts].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const j = par.get(e.numero_id) ?? {};
    const t = Date.parse(e.created_at);
    if (e.type === "numero_cree") j.cree = t;
    else if (e.type === "consentements" && e.payload?.consent_photos === true) j.depot = t;
    else if (e.type === "checkout_ouvert") j.checkout = t;
    else if (e.type === "etat_change") {
      const vers = e.payload?.vers;
      if (typeof vers === "string" && vers in VERS_JALON) j[VERS_JALON[vers]] = t;
    }
    par.set(e.numero_id, j);
  }
  return par;
}

/* ───────────────────── les étapes de la vie d'un dossier ───────────────── */

export type EtapeVieCle =
  | "creation_depot"
  | "depot_apercu"
  | "apercu_checkout"
  | "checkout_paye"
  | "paye_maquette"
  | "maquette_validee"
  | "validee_production"
  | "production_expediee"
  | "expediee_livree"
  | "depot_livree";

/**
 * Chaque paire de jalons consécutifs, plus le bout-en-bout. C'est LA table :
 * la page métriques et l'export CSV la parcourent, ajouter une étape = une
 * entrée ici, pas un calcul de plus dans un écran.
 */
export const ETAPES_VIE: ReadonlyArray<{ cle: EtapeVieCle; label: string; de: JalonCle; vers: JalonCle }> = [
  { cle: "creation_depot", label: "Création → dépôt terminé", de: "cree", vers: "depot" },
  { cle: "depot_apercu", label: "Dépôt → aperçu publié", de: "depot", vers: "apercu" },
  { cle: "apercu_checkout", label: "Aperçu → checkout ouvert", de: "apercu", vers: "checkout" },
  { cle: "checkout_paye", label: "Checkout → payé", de: "checkout", vers: "paye" },
  { cle: "paye_maquette", label: "Payé → maquette publiée", de: "paye", vers: "maquette" },
  { cle: "maquette_validee", label: "Maquette → validée", de: "maquette", vers: "validee" },
  { cle: "validee_production", label: "Validée → en production", de: "validee", vers: "production" },
  { cle: "production_expediee", label: "Production → expédiée", de: "production", vers: "expediee" },
  { cle: "expediee_livree", label: "Expédiée → livrée", de: "expediee", vers: "livree" },
  { cle: "depot_livree", label: "Bout-en-bout : dépôt → livrée", de: "depot", vers: "livree" },
];

/** Une durée d'étape : médiane + effectif. Sans échantillon, `null` — pas 0. */
export type DureeEtape = { mediane: number | null; echantillon: number };

export function mediane(valeurs: number[]): number | null {
  if (!valeurs.length) return null;
  const t = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
}

/**
 * La durée d'une étape pour un dossier, en heures. `null` si un des deux
 * jalons manque, ou si la « durée » est négative : un aperçu republié après
 * l'ouverture du checkout donnerait un délai négatif — ce n'est pas une
 * durée, c'est un aller-retour, on ne le compte pas.
 */
export function dureeEtape(j: Jalons, de: JalonCle, vers: JalonCle): number | null {
  const a = j[de];
  const b = j[vers];
  if (a === undefined || b === undefined || b < a) return null;
  return (b - a) / H;
}

/**
 * Les durées de toutes les étapes sur une fenêtre. Une durée est comptée
 * dans la fenêtre où elle S'ACHÈVE : c'est là qu'on a appris le délai.
 */
export function dureesEtapes(
  jalons: Map<string, Jalons>,
  debut: number,
  fin: number,
): Record<EtapeVieCle, DureeEtape> {
  const listes = new Map<EtapeVieCle, number[]>(ETAPES_VIE.map((e) => [e.cle, []]));
  for (const j of jalons.values()) {
    for (const e of ETAPES_VIE) {
      const t = j[e.vers];
      if (t === undefined || t < debut || t >= fin) continue;
      const d = dureeEtape(j, e.de, e.vers);
      if (d !== null) listes.get(e.cle)!.push(d);
    }
  }
  const sortie = {} as Record<EtapeVieCle, DureeEtape>;
  for (const e of ETAPES_VIE) {
    const l = listes.get(e.cle)!;
    sortie[e.cle] = { mediane: mediane(l), echantillon: l.length };
  }
  return sortie;
}

/* ────────────────────────────── l'entonnoir ────────────────────────────── */

/** Les marches de l'entonnoir, dans l'ordre du parcours. */
export const ENTONNOIR: ReadonlyArray<{ cle: JalonCle; label: string }> = [
  { cle: "cree", label: "Dossiers créés" },
  { cle: "depot", label: "Dépôts terminés" },
  { cle: "apercu", label: "Aperçus publiés" },
  { cle: "checkout", label: "Checkouts ouverts" },
  { cle: "paye", label: "Payés" },
  { cle: "validee", label: "Validées" },
  { cle: "livree", label: "Livrées" },
];

/**
 * Compte, pour chaque marche, les dossiers dont CE jalon tombe dans la
 * fenêtre. Ce n'est pas une cohorte (un payé de la semaine peut venir d'un
 * dépôt du mois dernier) : c'est le débit de chaque étape sur la période,
 * la même règle que les compteurs historiques de la page.
 */
export function compterEntonnoir(
  jalons: Map<string, Jalons>,
  debut: number,
  fin: number,
): Record<JalonCle, number> {
  const n = {
    cree: 0, depot: 0, apercu: 0, checkout: 0, paye: 0,
    maquette: 0, validee: 0, production: 0, expediee: 0, livree: 0,
  } as Record<JalonCle, number>;
  for (const j of jalons.values()) {
    for (const cle of Object.keys(n) as JalonCle[]) {
      const t = j[cle];
      if (t !== undefined && t >= debut && t < fin) n[cle]++;
    }
  }
  return n;
}

/* ─────────────────── réactivité ↔ conversion (les seaux) ───────────────── */

export type SeauCle = "moins24" | "de24a48" | "plus48";

export type Seau = {
  cle: SeauCle;
  label: string;
  /** Aperçus publiés dans la fenêtre, ce délai de couverture-là. */
  n: number;
  /** Parmi eux, combien ont payé (à ce jour, pas forcément dans la fenêtre). */
  payes: number;
  /** payes / n, en % entier. `null` sans échantillon. */
  taux: number | null;
};

/** En-dessous, un seau ne CONCLUT rien : il s'affiche, avec sa réserve. */
export const SEUIL_CONCLUANT = 3;

/**
 * LE croisement qui dit si répondre vite fait vendre : les dossiers dont
 * l'aperçu a été publié dans la fenêtre, répartis selon le délai
 * dépôt → aperçu, chacun avec son taux de paiement.
 *
 * Le paiement est regardé À CE JOUR, pas borné à la fenêtre : une cliente
 * couverte le 28 et payée le 2 compte comme payée, sinon les seaux de fin
 * de période mentiraient toujours à la baisse.
 */
export function reactiviteConversion(
  jalons: Map<string, Jalons>,
  debut: number,
  fin: number,
): Seau[] {
  const seaux: Seau[] = [
    { cle: "moins24", label: "Couverte en moins de 24 h", n: 0, payes: 0, taux: null },
    { cle: "de24a48", label: "Couverte entre 24 et 48 h", n: 0, payes: 0, taux: null },
    { cle: "plus48", label: "Couverte en plus de 48 h", n: 0, payes: 0, taux: null },
  ];
  for (const j of jalons.values()) {
    if (j.apercu === undefined || j.apercu < debut || j.apercu >= fin) continue;
    const d = dureeEtape(j, "depot", "apercu");
    if (d === null) continue; // dossier avancé en SQL : pas de dépôt journalisé
    const s = d < 24 ? seaux[0] : d < 48 ? seaux[1] : seaux[2];
    s.n++;
    if (j.paye !== undefined) s.payes++;
  }
  for (const s of seaux) s.taux = s.n ? Math.round((s.payes / s.n) * 100) : null;
  return seaux;
}

/* ─────────────────────────────── la lecture ────────────────────────────── */

function heuresEnMots(h: number): string {
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} j`;
}

export type MatiereConstats = {
  seaux: Seau[];
  entonnoir: Array<{ label: string; n: number }>;
  /** Le bout-en-bout dépôt → livrée de la période. */
  boutEnBout: DureeEtape;
  /** Checkout → payé de la période. */
  checkoutPaye: DureeEtape;
};

/**
 * Deux à quatre constats DÉRIVÉS des chiffres — jamais une recommandation,
 * jamais un chiffre qui ne soit pas calculé plus haut. Quand l'effectif ne
 * permet pas de conclure, la phrase le dit au lieu de conclure quand même.
 */
export function composerConstats(m: MatiereConstats): string[] {
  const constats: string[] = [];

  /* 1. Réactivité ↔ vente — le constat qui compte le plus. */
  const rapide = m.seaux.find((s) => s.cle === "moins24");
  const lent = m.seaux.find((s) => s.cle === "plus48");
  const apercus = m.seaux.reduce((t, s) => t + s.n, 0);
  if (rapide && lent && rapide.n >= SEUIL_CONCLUANT && lent.n >= SEUIL_CONCLUANT) {
    constats.push(
      `Les dossiers couverts sous 24 h paient à ${rapide.taux} % (n=${rapide.n}), ` +
        `contre ${lent.taux} % au-delà de 48 h (n=${lent.n}).`,
    );
  } else if (apercus > 0) {
    constats.push(
      `Trop tôt pour lire l'effet de la réactivité sur la vente : ${apercus} aperçu${apercus > 1 ? "s" : ""} ` +
        `publié${apercus > 1 ? "s" : ""} sur la période, il en faut au moins ${SEUIL_CONCLUANT} par seau.`,
    );
  }

  /* 2. La marche de l'entonnoir qui perd le plus — seulement si l'amont
     porte assez de dossiers pour que le taux veuille dire quelque chose. */
  let pire: { de: string; vers: string; taux: number; amont: number; aval: number } | null = null;
  for (let i = 1; i < m.entonnoir.length; i++) {
    const amont = m.entonnoir[i - 1];
    const aval = m.entonnoir[i];
    if (amont.n < 5) continue;
    const taux = Math.round((aval.n / amont.n) * 100);
    if (pire === null || taux < pire.taux) {
      pire = { de: amont.label, vers: aval.label, taux, amont: amont.n, aval: aval.n };
    }
  }
  if (pire && pire.taux < 100) {
    constats.push(
      `La marche qui perd le plus : « ${pire.de} » → « ${pire.vers} », ` +
        `${pire.taux} % de passage (${pire.amont} → ${pire.aval}).`,
    );
  }

  /* 3. Le bout-en-bout, quand il existe. */
  if (m.boutEnBout.mediane !== null && m.boutEnBout.echantillon >= SEUIL_CONCLUANT) {
    constats.push(
      `Du dépôt à la livraison : ${heuresEnMots(m.boutEnBout.mediane)} en médiane (n=${m.boutEnBout.echantillon}).`,
    );
  }

  /* 4. La vitesse de paiement une fois le checkout ouvert. */
  if (m.checkoutPaye.mediane !== null && m.checkoutPaye.echantillon >= SEUIL_CONCLUANT) {
    constats.push(
      `Une fois le checkout ouvert, le paiement tombe en ${heuresEnMots(m.checkoutPaye.mediane)} ` +
        `en médiane (n=${m.checkoutPaye.echantillon}).`,
    );
  }

  if (!constats.length) {
    constats.push("Pas encore assez de dossiers pour dégager une lecture : les constats viendront avec le volume.");
  }
  return constats.slice(0, 4);
}
