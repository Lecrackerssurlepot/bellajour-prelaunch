/**
 * T-159 : la fin des photos d'une édition collective, après la livraison.
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 * Le module qui AGIT est `scripts/collectif-retention.ts`, et lui seul : aucune
 * route web, aucun cron (même doctrine que `atelier/retention.ts`, T-076).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QUI EST DÉCIDÉ, ET CE QUI NE L'EST PAS
 *
 * Mathias, le 20/10/2026 : les photos d'une édition se gardent « 30 jours, un
 * truc comme ça, après la réception de la livraison ». Le chiffre n'est PAS
 * écrit ici : le script l'exige en argument (`--jours N`), sans valeur par
 * défaut, tant que la politique de confidentialité ne l'a pas fixé (projet :
 * `docs/produit/collectif/PROJET-CONFIDENTIALITE-B2B.md`).
 *
 * « La réception de la livraison » se lit dans `livraison.livree_le` : l'heure
 * où l'atelier a cliqué « Marquer livrée » (gestes.ts), écrite dans la même
 * écriture que l'état `livree`. Ce n'est pas l'heure où le carton est arrivé :
 * un atelier qui marque tard fait partir le délai tard (on garde plus
 * longtemps, jamais moins). Sans cette date, on n'efface PAS : on ne devine pas
 * une livraison à partir d'une autre colonne (patron de `depot_sans_date`).
 *
 * Ce qui part et ce qui reste est la table `FAMILLES` ci-dessous : ce qui n'a
 * servi qu'à COMPOSER part (photos, rendus du bon à tirer, contenus envoyés,
 * pièces jointes) ; ce qui sert au CONTRAT ou à une RÉIMPRESSION reste (le PDF
 * de chaque tour, les documents de l'atelier : devis signé, factures) tant que
 * Mathias n'a pas répondu à la question posée dans le projet. Une clé qu'on ne
 * reconnaît pas reste aussi : on n'efface que ce qu'on sait nommer.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Trois refus absolus, que le harnais prouve :
 * - jamais une édition qui n'est pas LIVRÉE (en impression, expédiée, ou avant) ;
 * - jamais deux fois (`photos_supprimees_le`, le marqueur posé par la migration
 *   20261013, phase 7) ;
 * - jamais sans un délai lu, entier, d'au moins un jour.
 * L'archive n'épargne RIEN : c'est précisément le trou de T-159 (« une archive
 * devient une conservation sans limite »).
 */

import { estEtatEdition, etatEffectif, lireInstant, type EtatEdition } from "./etats";

const JOUR_MS = 24 * 60 * 60 * 1000;

/* ─────────────────────────────── le délai ─────────────────────────────── */

/**
 * Le délai, en jours, lu dans la ligne de commande : `--jours 30` ou
 * `--jours=30`. `null` s'il manque ou s'il n'est pas un entier d'au moins 1.
 * ⚠️ AUCUNE valeur par défaut, volontairement : un délai oublié ne doit pas
 * devenir un délai deviné.
 */
export function lireDelaiJours(argv: readonly string[]): number | null {
  let brut: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--jours") {
      brut = argv[i + 1];
      break;
    }
    if (a.startsWith("--jours=")) {
      brut = a.slice("--jours=".length);
      break;
    }
  }
  if (brut === undefined || !/^\d{1,5}$/.test(brut)) return null;
  const n = Number(brut);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/* ───────────────────────────── le verdict ───────────────────────────── */

/** Ce que le verdict lit d'une édition (colonnes de la migration 20261013, aucune fraîche). */
export type EditionPourRetention = {
  etat: string;
  cloture_le: string | null;
  livraison: { livree_le?: string | null } | null;
  photos_supprimees_le: string | null;
};

export type MotifEpargne =
  | "delai_invalide"
  | "deja_effacee"
  | "etat_inconnu"
  | "non_livree"
  | "en_impression"
  | "expediee"
  | "livree_sans_date"
  | "dans_le_delai";

export const TEXTE_MOTIF: Record<MotifEpargne, string> = {
  delai_invalide: "délai illisible (jamais d'effacement sans un nombre de jours)",
  deja_effacee: "coffre déjà effacé (photos_supprimees_le posé)",
  etat_inconnu: "état inconnu (on n'efface pas ce qu'on ne sait pas lire)",
  non_livree: "pas encore livrée",
  en_impression: "en impression",
  expediee: "expédiée, pas encore marquée livrée",
  livree_sans_date: "livrée sans date de livraison lisible (on ne devine pas)",
  dans_le_delai: "livrée, encore dans le délai",
};

export type VerdictRetention =
  | { effacable: true; jours: number; livreeLe: string }
  | { effacable: false; motif: MotifEpargne; jours: number | null };

/**
 * L'édition peut-elle perdre son coffre aujourd'hui, avec ce délai ?
 *
 * L'ordre des refus est volontaire : le délai d'abord (sans lui rien n'a de
 * sens), puis « déjà fait », puis l'état, puis la date. `jours` est l'âge de
 * la livraison en jours (décimal), rendu dès qu'il est connu pour que le
 * rapport le montre.
 */
export function verdictRetention(e: EditionPourRetention, maintenant: Date, delaiJours: number): VerdictRetention {
  if (!Number.isInteger(delaiJours) || delaiJours < 1) return { effacable: false, motif: "delai_invalide", jours: null };
  if (e.photos_supprimees_le) return { effacable: false, motif: "deja_effacee", jours: null };
  if (!estEtatEdition(e.etat)) return { effacable: false, motif: "etat_inconnu", jours: null };

  const etat: EtatEdition = etatEffectif(e.etat, e.cloture_le, maintenant);
  if (etat === "impression") return { effacable: false, motif: "en_impression", jours: null };
  if (etat === "expediee") return { effacable: false, motif: "expediee", jours: null };
  if (etat !== "livree") return { effacable: false, motif: "non_livree", jours: null };

  const brut = e.livraison?.livree_le ?? null;
  const t = lireInstant(brut);
  if (t === null || brut === null) return { effacable: false, motif: "livree_sans_date", jours: null };

  const jours = (maintenant.getTime() - t) / JOUR_MS;
  if (jours < delaiJours) return { effacable: false, motif: "dans_le_delai", jours };
  return { effacable: true, jours, livreeLe: brut };
}

/* ─────────────────────────── ce qui part, ce qui reste ─────────────────────────── */

export type FamilleCoffre =
  | "photos"
  | "rendus_bat"
  | "contenus"
  | "pieces_jointes"
  | "pdf_tour"
  | "documents"
  | "autre"
  | "hors_edition";

/**
 * LA table de ce qu'un effacement emporte. Changer d'avis = changer `efface`
 * sur une ligne (le harnais relit la table). ⚠️ `autre` et `hors_edition`
 * restent toujours : une clé qu'on ne sait pas nommer ne s'efface pas.
 */
export const FAMILLES: Record<FamilleCoffre, { libelle: string; efface: boolean; pourquoi: string }> = {
  photos: {
    libelle: "Photos (originaux et vignettes)",
    efface: true,
    pourquoi: "décision de Mathias du 20/10 : les photos ne se gardent pas après la livraison",
  },
  rendus_bat: {
    libelle: "Rendus du bon à tirer (pages, miniatures, gris, couvertures proposées)",
    efface: true,
    pourquoi: "des copies des photos composées, servies au client pour relire ; le PDF reste",
  },
  contenus: {
    libelle: "Contenus envoyés par le client (logo, programme, liste…)",
    efface: true,
    pourquoi: "envoyés pour composer, comme les photos (proposition, à confirmer)",
  },
  pieces_jointes: {
    libelle: "Pièces jointes des messages",
    efface: true,
    pourquoi: "jointes pour composer ; le texte des messages reste en base (proposition, à confirmer)",
  },
  pdf_tour: {
    libelle: "PDF de chaque tour (le magazine composé)",
    efface: false,
    pourquoi: "de quoi réimprimer et la preuve de ce qui a été validé : QUESTION ouverte à Mathias",
  },
  documents: {
    libelle: "Documents de l'atelier (devis signé, factures, propositions)",
    efface: false,
    pourquoi: "pièces du contrat et de la comptabilité : durée à fixer avec la relecture",
  },
  autre: {
    libelle: "Clé non reconnue",
    efface: false,
    pourquoi: "on n'efface que ce qu'on sait nommer",
  },
  hors_edition: {
    libelle: "Clé d'une autre édition",
    efface: false,
    pourquoi: "jamais : le listage ne devrait pas la rendre",
  },
};

/** L'ordre du rapport. */
export const ORDRE_FAMILLES: readonly FamilleCoffre[] = [
  "photos",
  "rendus_bat",
  "contenus",
  "pieces_jointes",
  "pdf_tour",
  "documents",
  "autre",
  "hors_edition",
];

/**
 * La famille d'une clé du coffre, lue sur la forme qu'écrit `cles.ts` :
 * `collectif/<edition>/photos/<id>/original.ext`, `…/tours/<id>/source.pdf`,
 * `…/tours/<id>/pages/007.webp`, `…/contenus/<id>.ext`, `…/documents/<id>.ext`,
 * `…/messages/<id>.ext`. Une clé hors de `collectif/<editionId>/` est
 * `hors_edition`, une forme inconnue est `autre` (les deux restent).
 */
export function familleDeCle(cle: string, editionId: string): FamilleCoffre {
  const prefixe = `collectif/${editionId.toLowerCase()}/`;
  if (!cle.startsWith(prefixe) || cle.includes("..")) return "hors_edition";
  const reste = cle.slice(prefixe.length);
  const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  if (new RegExp(`^photos/${UUID}/(original\\.[a-z0-9]{1,5}|vignette\\.jpg)$`).test(reste)) return "photos";
  if (new RegExp(`^tours/${UUID}/source\\.pdf$`).test(reste)) return "pdf_tour";
  if (new RegExp(`^tours/${UUID}/(pages/\\d{3}(-v)?\\.(webp|jpg)|gris\\.bin|couvertures/\\d{1,2}-c[123]\\.(webp|jpg))$`).test(reste)) {
    return "rendus_bat";
  }
  if (new RegExp(`^contenus/${UUID}\\.[a-z0-9]{1,5}$`).test(reste)) return "contenus";
  if (new RegExp(`^documents/${UUID}\\.[a-z0-9]{1,5}$`).test(reste)) return "documents";
  if (new RegExp(`^messages/${UUID}\\.[a-z0-9]{1,5}$`).test(reste)) return "pieces_jointes";
  return "autre";
}

/** La clé part-elle avec l'effacement ? Une seule lecture de `FAMILLES`. */
export function cleEffacee(cle: string, editionId: string): boolean {
  return FAMILLES[familleDeCle(cle, editionId)].efface;
}

/* ─────────────────────────────── les lignes ─────────────────────────────── */

/**
 * Ce que deviennent les lignes `collectif_photos` une fois leurs objets partis.
 * AUCUNE ligne n'est supprimée (les comptes de l'édition restent vrais) ; on
 * vide ce qui décrit l'image, son lieu et son appareil. Toutes ces colonnes
 * sont dans la migration 20261013 (aucune colonne fraîche, rien à replier).
 *
 * RESTENT, volontairement, et c'est une question posée à Mathias : `deposant`
 * (le nom), `accord_version` et `accord_le` (la preuve que la personne a
 * accepté que sa photo serve au magazine, qui, lui, existe toujours sur papier),
 * `r2_key` (ce qui a été effacé). ⚠️ `cle_fichier` porte encore le nom
 * d'origine du fichier : colonne obligatoire et unique, une ligne ne peut pas
 * la vider sans une écriture par photo (voir le projet, « ce qui reste »).
 */
export const PATCH_PHOTO_EFFACEE = {
  vignette_key: null,
  nom_origine: null,
  appareil_id: null,
  prise_le: null,
  appareil: null,
  gps_lat: null,
  gps_lon: null,
  empreinte: null,
  lieu_ville: null,
  lieu_pays: null,
  lieu_code_pays: null,
} as const;

/** Les colonnes que l'effacement garde exprès (le harnais vérifie qu'il ne les touche pas). */
export const COLONNES_GARDEES = ["deposant", "accord_version", "accord_le", "r2_key", "edition_id", "id"] as const;

/** Le type de la ligne de journal (`collectif_evenements`). */
export const TYPE_JOURNAL_RETENTION = "coffre_efface";
