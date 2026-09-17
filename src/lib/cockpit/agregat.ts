/**
 * L'agrégat d'une semaine : ce que le job du lundi écrit dans
 * `weekly_metrics`. Module PUR, éprouvé par scripts/verif-atelier.ts ; le
 * job (job.ts) ne fait que charger et écrire.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CHAUD, FROID, OU RIEN
 *
 * Une commande est CHAUDE si `numeros.origine` le dit, ou si le dossier est
 * celui d'un fondateur (le journal en porte la preuve : crédit appliqué,
 * consommé, ou rattachement à la main). Elle est FROIDE si l'atelier l'a
 * posée depuis la fiche. Sinon elle n'est NI l'un NI l'autre : on la compte
 * à part (`sansOrigine`) au lieu de deviner. Compter l'inconnu en froid
 * ferait approcher le mur ; le compter en chaud ferait manquer la fenêtre.
 * Les deux erreurs coûtent, le cockpit préfère dire « N sans origine ».
 * ══════════════════════════════════════════════════════════════════════════
 */

export type Origine = "chaud" | "froid";

export function origineValide(v: unknown): v is Origine {
  return v === "chaud" || v === "froid";
}

/** Les types d'événements qui prouvent qu'un dossier est celui d'un fondateur. */
export const TYPES_FONDATEUR = [
  "credit_fondatrice_applique",
  "credit_fondatrice_consomme",
  "fondateur_rattache",
] as const;

/** Ce qu'on retient d'un dossier commandé pour le classer. */
export type CommandeAgregat = {
  id: string;
  /** L'instant du passage à `payee` (ms). */
  payeA: number;
  origine: Origine | null;
  fondateur: boolean;
  nbPages: number | null;
};

/** Un dossier livré : le délai se mesure du dépôt terminé à la livraison. */
export type LivraisonAgregat = {
  id: string;
  livreeA: number;
  depotA: number | null;
};

export function origineEffective(c: Pick<CommandeAgregat, "origine" | "fondateur">): Origine | null {
  if (c.origine) return c.origine;
  return c.fondateur ? "chaud" : null;
}

export type LigneAgregat = {
  commandes_totales: number;
  commandes_froides: number;
  commandes_chaudes: number;
  commandes_sans_origine: number;
  pages_moy: number | null;
  /* Toujours null aujourd'hui : aucun coût d'impression par commande n'est
     enregistré (le devis journalisé ne porte que le port). Le champ existe
     pour que le jour où il l'est, la page n'ait rien à changer. */
  marge_moy: number | null;
  delai_moy_jours: number | null;
};

const J = 86_400_000;

function moyenne(valeurs: number[], decimales = 2): number | null {
  if (!valeurs.length) return null;
  const m = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
  const f = 10 ** decimales;
  return Math.round(m * f) / f;
}

export function agregerSemaine(
  commandes: CommandeAgregat[],
  livraisons: LivraisonAgregat[],
  debut: number,
  fin: number,
): LigneAgregat {
  const dans = (t: number) => t >= debut && t < fin;
  const dedans = commandes.filter((c) => dans(c.payeA));

  let froides = 0;
  let chaudes = 0;
  let sans = 0;
  const pages: number[] = [];
  for (const c of dedans) {
    const o = origineEffective(c);
    if (o === "froid") froides++;
    else if (o === "chaud") chaudes++;
    else sans++;
    if (typeof c.nbPages === "number" && Number.isFinite(c.nbPages) && c.nbPages > 0) pages.push(c.nbPages);
  }

  const delais = livraisons
    .filter((l) => dans(l.livreeA) && l.depotA !== null && l.livreeA >= l.depotA)
    .map((l) => (l.livreeA - (l.depotA as number)) / J);

  return {
    commandes_totales: dedans.length,
    commandes_froides: froides,
    commandes_chaudes: chaudes,
    commandes_sans_origine: sans,
    pages_moy: moyenne(pages, 1),
    marge_moy: null,
    delai_moy_jours: moyenne(delais, 1),
  };
}
