/**
 * Les états d'une édition, et l'état DÉRIVÉ d'un magazine (PRD §3.1).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * L'ÉTAT STOCKÉ N'EST PAS TOUJOURS L'ÉTAT VRAI
 *
 * La clôture de la collecte n'a besoin d'aucun cron : une édition encore
 * `preparation` en base dont la date de clôture est passée EST en
 * `composition`. `etatEffectif` le calcule à chaque lecture. Tout écran, tout
 * verrou et tout geste lit l'état effectif ; seule l'écriture d'un geste
 * réaligne la base. Lire `edition.etat` directement, c'est laisser le lien
 * participants ouvert une semaine après la clôture.
 *
 * L'état d'un MAGAZINE n'est stocké nulle part : il se déduit de ses lignes
 * (brief validé ?, tours publiés ?, BAT validé ?). Un second champ dirait
 * tôt ou tard le contraire du premier.
 * ══════════════════════════════════════════════════════════════════════════
 */

export type EtatEdition =
  | "preparation"
  | "composition"
  | "bat"
  | "bat_valide"
  | "impression"
  | "expediee"
  | "livree";

/** Dans l'ordre du parcours : le rang sert aux comparaisons « au moins … ». */
export const ETATS_EDITION: readonly EtatEdition[] = [
  "preparation",
  "composition",
  "bat",
  "bat_valide",
  "impression",
  "expediee",
  "livree",
];

/** Le mot que lit l'atelier. Jamais la valeur brute de la base. */
export const LIBELLE_ETAT_EDITION: Record<EtatEdition, string> = {
  preparation: "Préparation",
  composition: "Composition",
  bat: "Bon à tirer",
  bat_valide: "Bon à tirer validé",
  impression: "Impression",
  expediee: "Expédiée",
  livree: "Livrée",
};

export function estEtatEdition(v: unknown): v is EtatEdition {
  return typeof v === "string" && (ETATS_EDITION as readonly string[]).includes(v);
}

export function rangEtat(etat: EtatEdition): number {
  return ETATS_EDITION.indexOf(etat);
}

/** L'édition a-t-elle atteint (ou dépassé) `seuil` ? */
export function atteint(etat: EtatEdition, seuil: EtatEdition): boolean {
  return rangEtat(etat) >= rangEtat(seuil);
}

/* ISO 8601 AVEC fuseau : ce que rend PostgREST pour un timestamptz
   (« 2026-10-11T10:00:00+00:00 ») et ce que l'écran doit envoyer. */
const INSTANT_ISO = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$/;

/**
 * Un instant lisible SANS AMBIGUÏTÉ, en millisecondes, ou `null`.
 *
 * ⚠️ `Date.parse` seul ne suffit pas, et le harnais l'a prouvé le 13/10/2026 :
 * V8 lit « le 4 octobre » comme le 4 octobre 2001, et une date de clôture
 * saisie ainsi aurait FERMÉ la collecte. Il lit aussi « 2026-10-20T22:00 »
 * (sans fuseau) à l'heure de la machine : celle d'un Mac à Paris n'est pas
 * celle de Vercel. On n'accepte donc que l'ISO 8601 avec son fuseau ; c'est à
 * l'écran de convertir l'heure de Paris qu'a tapée l'atelier.
 */
export function lireInstant(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!INSTANT_ISO.test(s)) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/**
 * L'état VRAI d'une édition à l'instant `maintenant`.
 *
 * Une date de clôture illisible ne clôt rien : on reste en préparation, et
 * l'atelier voit une date vide plutôt qu'une collecte fermée par erreur. Sans
 * date du tout, seule « Clore maintenant » fait avancer.
 */
export function etatEffectif(
  stocke: EtatEdition,
  clotureLe: string | null,
  maintenant: Date
): EtatEdition {
  if (stocke !== "preparation" || !clotureLe) return stocke;
  const t = lireInstant(clotureLe);
  if (t === null) return stocke;
  return t <= maintenant.getTime() ? "composition" : "preparation";
}

/** Le lien participants accepte-t-il encore des photos ? */
export function collecteOuverte(
  stocke: EtatEdition,
  clotureLe: string | null,
  maintenant: Date
): boolean {
  return etatEffectif(stocke, clotureLe, maintenant) === "preparation";
}

/* ─────────────────────────── l'état d'un magazine ─────────────────────────── */

export type EtapeMagazine =
  | { etape: "brief_a_faire" }
  | { etape: "brief_valide" }
  | { etape: "tour_publie"; tour: number }
  | { etape: "valide"; tour: number | null };

export type MagazinePourEtat = {
  brief_valide_le: string | null;
  bat_valide_le: string | null;
  /** Les numéros des tours PUBLIÉS de ce magazine (un brouillon ne compte pas). */
  toursPublies: readonly number[];
};

/**
 * Dérivé de ses lignes, jamais stocké. Le BAT validé l'emporte sur tout ; un
 * tour publié l'emporte sur le brief (l'atelier peut composer sur un brief
 * reçu au téléphone, la machine n'a pas à l'en empêcher).
 */
export function etatMagazine(m: MagazinePourEtat): EtapeMagazine {
  const dernier = m.toursPublies.length ? Math.max(...m.toursPublies) : null;
  if (m.bat_valide_le) return { etape: "valide", tour: dernier };
  if (dernier !== null) return { etape: "tour_publie", tour: dernier };
  if (m.brief_valide_le) return { etape: "brief_valide" };
  return { etape: "brief_a_faire" };
}
