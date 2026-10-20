/**
 * T-159 : la fin des photos d'une édition collective, après la livraison.
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 * Les modules qui AGISSENT : `retentionServeur.ts` (l'ordre des gestes), appelé
 * par `scripts/collectif-retention.ts` (le geste manuel) et par le passage
 * quotidien après la relève (`retentionQuotidienne`), coupé par défaut
 * derrière `COLLECTIF_RETENTION_AUTO` (interrupteur.ts).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QUI EST DÉCIDÉ (Mathias, 20/10/2026, questions 4, 5 et 6 de la page de
 * confidentialité)
 *
 * - Q4 : les photos partent **30 jours après « Marquer livrée »**
 *   (`DELAI_RETENTION_JOURS`). « Les premières fois je le lance avec toi,
 *   ensuite il passe tout seul chaque jour, comme la corbeille » : le script
 *   reste le geste manuel (lecture seule par défaut), et le passage quotidien
 *   existe, FERMÉ tant que Mathias n'a pas posé l'interrupteur.
 * - Q5 : le PDF du magazine terminé (le PDF de chaque tour) est GARDÉ : il reste
 *   dans les familles gardées (`pdf_tour`). Durée fixée le 20/10 au soir :
 *   10 ans après la livraison (`CONSERVATION_PDF_MAGAZINE_ANS`), jamais réutilisé
 *   sans l'accord du client ; la règle est écrite (`verdictConservationPdf`),
 *   rien ne l'applique.
 * - Q6 : l'adresse e-mail des participants part AVEC les photos
 *   (`TABLES_PERSONNES_EFFACEES`). La preuve de l'accord (Q7 : le nom, la
 *   version du texte, l'heure) reste sur les lignes de photos.
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
 * de chaque tour, les documents de l'atelier : devis signé, factures). Une clé
 * qu'on ne reconnaît pas reste aussi : on n'efface que ce qu'on sait nommer.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ══════════════════════════════════════════════════════════════════════════
 * L'ORDRE D'UN EFFACEMENT (l'ordre sûr de l'audit S7, le même que la corbeille)
 *
 * 1. l'INTENTION au journal (`retention_a_effacer`, des clés du coffre et rien
 *    d'autre, `RETENTION_CLES_PAR_INTENTION` au plus par ligne) ; sans elle,
 *    rien ne part ;
 * 2. la BASE : les téléphones puis les personnes SUPPRIMÉS, les métadonnées des
 *    photos vidées (`PATCH_PHOTO_EFFACEE`, aucune ligne de photo supprimée), et
 *    en DERNIER le marqueur `photos_supprimees_le` (posé une seule fois) ; un
 *    refus avant le marqueur n'a rien touché au coffre, l'édition reste
 *    candidate et tout se rejoue au passage suivant ;
 * 3. le COFFRE, clé par clé, seulement les clés de l'intention ;
 * 4. ce qui est réglé (`retention_effacee`). Un objet qui résiste reste dans
 *    l'intention : la reprise (`retentionsEnAttente`) le retente jusqu'à
 *    réussite, et n'efface JAMAIS une clé d'une édition qui n'est pas marquée.
 * ⚠️ À l'inverse de la corbeille, la ligne de la photo RESTE et garde sa
 * `r2_key` : la règle « une clé qu'une ligne porte encore ne s'efface jamais »
 * (`clesLibres`, corbeille.ts) ne peut pas servir ici. C'est le MARQUEUR de
 * l'édition qui libère ses clés (`clesLibresRetention`).
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Trois refus absolus, que le harnais prouve :
 * - jamais une édition qui n'est pas LIVRÉE (en impression, expédiée, ou avant) ;
 * - jamais deux fois (`photos_supprimees_le`, le marqueur posé par la migration
 *   20261013, phase 7) ;
 * - jamais sans un délai lu, entier, d'au moins un jour ; et jamais, pour de
 *   vrai, plus tôt que les 30 jours décidés.
 * L'archive n'épargne RIEN : c'est précisément le trou de T-159 (« une archive
 * devient une conservation sans limite »).
 */

import { estEtatEdition, etatEffectif, lireInstant, type EtatEdition } from "./etats";

const JOUR_MS = 24 * 60 * 60 * 1000;

/* ─────────────────────────────── le délai ─────────────────────────────── */

/**
 * 30 jours après « Marquer livrée ». Décision de Mathias du 20/10/2026
 * (question 4). Le seul réglage : le passage quotidien le lit tel quel, le
 * script le prend quand `--jours` n'est pas tapé.
 */
export const DELAI_RETENTION_JOURS = 30;

/**
 * Le délai, en jours, lu dans la ligne de commande : `--jours 30` ou
 * `--jours=30`. `null` s'il manque ou s'il n'est pas un entier d'au moins 1.
 * C'est la LECTURE de l'argument ; le choix du délai est `delaiDuScript`.
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

/** L'argument `--jours` est-il TAPÉ (même mal) ? Un argument mal tapé ne devient jamais le délai par défaut. */
export function joursTapes(argv: readonly string[]): boolean {
  return argv.some((a) => a === "--jours" || a.startsWith("--jours="));
}

export type DelaiDuScript = { ok: true; jours: number; source: "decision" | "argument" } | { ok: false; erreur: string };

/**
 * Le délai du script. Sans `--jours` : la décision (`DELAI_RETENTION_JOURS`).
 * Avec : il doit se lire (un entier d'au moins 1), et pour EFFACER il ne peut
 * pas être plus court que la décision : effacer avant le délai promis serait
 * mentir dans l'autre sens. Un délai plus court reste permis en lecture seule
 * (pour voir ce qui viendrait).
 */
export function delaiDuScript(argv: readonly string[], vraiment: boolean): DelaiDuScript {
  if (!joursTapes(argv)) return { ok: true, jours: DELAI_RETENTION_JOURS, source: "decision" };
  const n = lireDelaiJours(argv);
  if (n === null) return { ok: false, erreur: "--jours N attend un entier d'au moins 1 (sans --jours : les 30 jours décidés)." };
  if (vraiment && n < DELAI_RETENTION_JOURS) {
    return { ok: false, erreur: `--jours ${n} est plus court que les ${DELAI_RETENTION_JOURS} jours décidés : accepté en lecture seule, jamais avec --vraiment.` };
  }
  return { ok: true, jours: n, source: "argument" };
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
    pourquoi: "décision de Mathias du 20/10 (question 5) : le PDF du magazine terminé est GARDÉ 10 ans après la livraison, jamais réutilisé sans l'accord du client (réimpression, preuve du BAT)",
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

export type ParFamille = Record<FamilleCoffre, { n: number; octets: number }>;

export type PlanEffacement = {
  /** Les clés qui partiraient, dans l'ordre du listage, sans doublon. */
  aEffacer: string[];
  /** Combien d'objets restent (familles gardées, clés inconnues). */
  gardes: number;
  parFamille: ParFamille;
};

/** Ce que l'effacement ferait d'un coffre listé : la table `FAMILLES`, rien d'autre. */
export function planEffacement(objets: readonly { cle: string; taille: number }[], editionId: string): PlanEffacement {
  const parFamille = Object.fromEntries(ORDRE_FAMILLES.map((f) => [f, { n: 0, octets: 0 }])) as ParFamille;
  const aEffacer: string[] = [];
  const vues = new Set<string>();
  let gardes = 0;
  for (const o of objets) {
    if (vues.has(o.cle)) continue;
    vues.add(o.cle);
    const f = familleDeCle(o.cle, editionId);
    parFamille[f].n++;
    parFamille[f].octets += Number.isFinite(o.taille) && o.taille > 0 ? o.taille : 0;
    if (FAMILLES[f].efface) aEffacer.push(o.cle);
    else gardes++;
  }
  return { aEffacer, gardes, parFamille };
}

/* ─────────────────── la seconde règle : le PDF du magazine terminé, 10 ans ─────────────────── */

/**
 * Le PDF du magazine terminé se GARDE 10 ans après la livraison, et ne se
 * réutilise jamais sans l'accord du client. Décision de Mathias du 20/10 au
 * soir (question 5), relayée par le coordinateur du lot.
 *
 * ⚠️ RÈGLE SEULEMENT : rien ne l'applique. Aucun script, aucun passage, aucune
 * porte du coffre n'efface un PDF de tour (`FAMILLES.pdf_tour.efface` reste
 * `false`, et `supprimerClesEdition` le refuse). Le jour où l'on voudra tenir
 * aussi cette fin-là, il faudra un geste écrit pour, sur le modèle de
 * `effacerEdition`, et l'accord de Mathias.
 *
 * PROPOSITION, NON DÉCIDÉE (à trancher par Mathias) : seul le PDF du DERNIER
 * tour d'un magazine validé est « le magazine terminé ». Les PDF des tours
 * précédents (les bons à tirer corrigés depuis) pourraient partir avec les
 * photos, à 30 jours. Rien n'en est codé : aujourd'hui, TOUS les PDF de tours
 * restent.
 */
export const CONSERVATION_PDF_MAGAZINE_ANS = 10;

/**
 * L'instant où le PDF d'une édition livrée le `livreeLe` cesse d'être gardé :
 * la même date, dix ans plus tard, en temps UTC (un 29 février donne le 1er
 * mars : un jour de plus, jamais un de moins). `null` si la date est illisible.
 */
export function finConservationPdf(livreeLe: string | null | undefined): number | null {
  const t = lireInstant(livreeLe);
  if (t === null) return null;
  const d = new Date(t);
  d.setUTCFullYear(d.getUTCFullYear() + CONSERVATION_PDF_MAGAZINE_ANS);
  return d.getTime();
}

export type MotifGardePdf = "etat_inconnu" | "non_livree" | "livree_sans_date" | "dans_les_dix_ans";

export type VerdictPdf = { effacable: true; finLe: string } | { effacable: false; motif: MotifGardePdf; finLe: string | null };

/**
 * Le PDF du magazine de cette édition pourrait-il partir aujourd'hui ? Seulement
 * une édition LIVRÉE (état effectif), dont la date de livraison se lit, et dont
 * les dix ans sont révolus. RÈGLE PURE, SANS EFFET : voir l'en-tête.
 * ⚠️ Le marqueur `photos_supprimees_le` n'entre pas dans ce verdict : il dit
 * que les PHOTOS sont parties, pas le PDF.
 */
export function verdictConservationPdf(e: Pick<EditionPourRetention, "etat" | "cloture_le" | "livraison">, maintenant: Date): VerdictPdf {
  if (!estEtatEdition(e.etat)) return { effacable: false, motif: "etat_inconnu", finLe: null };
  if (etatEffectif(e.etat, e.cloture_le, maintenant) !== "livree") return { effacable: false, motif: "non_livree", finLe: null };
  const fin = finConservationPdf(e.livraison?.livree_le ?? null);
  if (fin === null) return { effacable: false, motif: "livree_sans_date", finLe: null };
  const finLe = new Date(fin).toISOString();
  if (maintenant.getTime() < fin) return { effacable: false, motif: "dans_les_dix_ans", finLe };
  return { effacable: true, finLe };
}

/* ─────────────────────────────── les lignes ─────────────────────────────── */

/**
 * Ce que deviennent les lignes `collectif_photos` une fois leurs objets partis.
 * AUCUNE ligne n'est supprimée (les comptes de l'édition restent vrais) ; on
 * vide ce qui décrit l'image, son lieu et son appareil. Toutes ces colonnes
 * sont dans la migration 20261013 (aucune colonne fraîche, rien à replier).
 *
 * RESTENT, volontairement : `deposant` (le nom), `accord_version` et
 * `accord_le` (Q7 : la preuve que la personne a accepté que sa photo serve au
 * magazine, qui, lui, existe toujours sur papier), `r2_key` (ce qui a été
 * effacé). ⚠️ `cle_fichier` porte encore le nom d'origine du fichier : colonne
 * obligatoire et unique, une ligne ne peut pas la vider sans une écriture par
 * photo (voir le projet, « ce qui reste »).
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

/**
 * Q6 (Mathias, 20/10) : l'adresse e-mail des participants part avec les photos.
 * Les LIGNES sont SUPPRIMÉES, les téléphones d'abord, les personnes ensuite (cet
 * ordre-là, même si la clé étrangère des téléphones est `on delete cascade` :
 * chacune des deux suppressions se compte et se journalise).
 *
 * Pourquoi supprimer plutôt que vider : `collectif_participants.email`,
 * `prenom` et `nom` sont `not null` sous contrainte (migration 20261023) ; une
 * ligne « vidée » devrait porter une fausse adresse, c'est-à-dire un mensonge
 * en base qui resterait unique par édition. La clé étrangère des photos
 * (`collectif_photos.participant_id … on delete set null`) a été écrite pour
 * ce geste : les photos perdent le lien vers la personne et GARDENT ce qui
 * prouve l'accord (le nom dans `deposant`, la version, l'heure : Q7). Le
 * regroupement par personne ne servait qu'à la collecte, close depuis la
 * livraison. ⚠️ Le journal garde l'adresse MASQUÉE et les noms
 * (`participant_retrouve`, `participant_nom_different`) : question C3, non
 * tranchée, rien n'y est touché (le journal ne s'efface pas).
 */
export const TABLES_PERSONNES_EFFACEES = ["collectif_participants_appareils", "collectif_participants"] as const;

/** Le type de la ligne de journal qui résume un effacement (`collectif_evenements`). */
export const TYPE_JOURNAL_RETENTION = "coffre_efface";

/* ─────────────────────────── l'intention et la reprise ─────────────────────────── */

/** L'intention, écrite AVANT la base : `{ cles, n, … }`, des clés du coffre que la table `FAMILLES` efface. */
export const EVT_RETENTION_A_EFFACER = "retention_a_effacer";
/** Ce qui est réglé d'une intention : `{ evenement, cles }` (partis, ou gardés parce que l'édition n'est pas marquée). */
export const EVT_RETENTION_EFFACEE = "retention_effacee";

/** Au plus, par ligne d'intention (un payload de quelques dizaines de Ko). */
export const RETENTION_CLES_PAR_INTENTION = 500;
/** Au plus, par reprise : le reste attend le passage suivant. */
export const RETENTION_REPRISE_MAX_CLES = 2000;
/** Au plus, par passage quotidien : une ou deux éditions, jamais un balayage de tout le coffre. */
export const RETENTION_AUTO_MAX_EDITIONS = 2;
/**
 * Une intention n'est reprise qu'une fois vieille de ce délai : l'effacement qui
 * l'a écrite a fini (une requête vit 300 s au plus). Sinon la reprise croiserait
 * un effacement en cours et réglerait « gardée » une clé dont l'édition va être
 * marquée dans la seconde.
 */
export const DELAI_REPRISE_RETENTION_MS = 15 * 60 * 1000;

const UUID_MIN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const CLE_EDITION = new RegExp(`^collectif/(${UUID_MIN})/[A-Za-z0-9._/-]+$`);

/**
 * Les clés d'une intention, relues SANS confiance : sous `collectif/<uuid de
 * l'édition>/` seulement, jamais `..`, 300 caractères au plus, et seulement
 * celles que la table `FAMILLES` efface. Une clé gardée (PDF d'un tour,
 * document) glissée dans un payload ne s'efface donc jamais par la reprise.
 */
export function lireClesRetention(v: unknown, editionId: string): string[] {
  if (!Array.isArray(v)) return [];
  const ed = editionId.toLowerCase();
  return [
    ...new Set(
      v.filter((k): k is string => typeof k === "string" && k.length <= 300 && !k.includes("..") && CLE_EDITION.exec(k)?.[1] === ed && cleEffacee(k, ed))
    ),
  ];
}

/** Une ligne du journal telle que la reprise la lit. */
export type EvenementRetention = { id: string; edition_id: string | null; type: string; payload: Record<string, unknown> | null; created_at: string };

export type RetentionEnAttente = { editionId: string; evenement: string; cles: string[] };

/**
 * Les clés de chaque intention qui ne sont pas encore réglées (aucun
 * `retention_effacee` de la même édition ne les nomme pour cette intention),
 * pour les intentions vieilles d'au moins `DELAI_REPRISE_RETENTION_MS`. La plus
 * ancienne d'abord.
 */
export function retentionsEnAttente(evenements: readonly EvenementRetention[], maintenant: Date): RetentionEnAttente[] {
  const reglees = new Map<string, Set<string>>();
  for (const e of evenements) {
    if (e.type !== EVT_RETENTION_EFFACEE || typeof e.payload?.evenement !== "string" || !e.edition_id) continue;
    const cle = `${e.edition_id}|${e.payload.evenement}`;
    const s = reglees.get(cle) ?? new Set<string>();
    for (const k of lireClesRetention(e.payload.cles, e.edition_id)) s.add(k);
    reglees.set(cle, s);
  }
  const limite = maintenant.getTime() - DELAI_REPRISE_RETENTION_MS;
  const out: RetentionEnAttente[] = [];
  const intentions = evenements
    .filter((e) => e.type === EVT_RETENTION_A_EFFACER && e.edition_id)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
  for (const e of intentions) {
    const t = Date.parse(e.created_at);
    if (!Number.isFinite(t) || t > limite || !e.edition_id) continue;
    const faites = reglees.get(`${e.edition_id}|${e.id}`);
    const cles = lireClesRetention(e.payload?.cles, e.edition_id).filter((k) => !faites?.has(k));
    if (cles.length) out.push({ editionId: e.edition_id, evenement: e.id, cles });
  }
  return out;
}

/**
 * Les clés que la reprise peut effacer : AUCUNE tant que l'édition n'est pas
 * marquée (la base n'a pas fini : l'édition reste candidate, et son prochain
 * passage écrira sa propre intention) ; une fois marquée, celles que la table
 * `FAMILLES` efface.
 */
export function clesLibresRetention(cles: readonly string[], editionId: string, marqueeLe: string | null | undefined): string[] {
  if (!marqueeLe) return [];
  return cles.filter((k) => cleEffacee(k, editionId));
}

/* ─────────────────────────────── les phrases ─────────────────────────────── */

const JOUR_LONG = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });

/** « 21 novembre 2026 », « 1er décembre 2026 », heure de Paris. Vide si illisible. */
export function jourEffacement(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const rendu = JOUR_LONG.format(new Date(t));
  return rendu.startsWith("1 ") ? `1er ${rendu.slice(2)}` : rendu;
}

/**
 * Ce que l'espace et la fiche disent d'une édition effacée, au lieu de
 * vignettes vides (prérequis du premier effacement, T-159). Sans point final :
 * l'écran le pose. `null` : l'édition n'est pas effacée.
 */
export function phrasePhotosEffacees(photosSupprimeesLe: string | null | undefined): string | null {
  if (!photosSupprimeesLe) return null;
  const jour = jourEffacement(photosSupprimeesLe);
  return jour ? `Les photos de cette édition ont été supprimées le ${jour}` : "Les photos de cette édition ont été supprimées";
}

/** Le bon à tirer d'une édition effacée : ses pages rendues sont parties avec les photos (le PDF reste à l'atelier). */
export function phraseBatEfface(photosSupprimeesLe: string | null | undefined): string | null {
  if (!photosSupprimeesLe) return null;
  const jour = jourEffacement(photosSupprimeesLe);
  return jour ? `Les pages du bon à tirer ont été supprimées avec les photos le ${jour}` : "Les pages du bon à tirer ont été supprimées avec les photos";
}

/** Un fichier envoyé ou joint (contenu, pièce jointe) d'une édition effacée : son nom reste, le fichier non. */
export function phraseFichierEfface(photosSupprimeesLe: string | null | undefined): string | null {
  if (!photosSupprimeesLe) return null;
  const jour = jourEffacement(photosSupprimeesLe);
  return jour ? `Fichier supprimé le ${jour}` : "Fichier supprimé";
}
