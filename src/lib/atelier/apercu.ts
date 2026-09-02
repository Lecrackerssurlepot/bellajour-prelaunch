/**
 * Les trois visuels de l'état 2 — C1, C4, la double page (PRD §8).
 *
 * `numeros.apercu_urls` est un jsonb libre : c'est /admin qui l'écrit (lot 7).
 * On accepte donc DEUX écritures possibles, et on les résout ici plutôt que de
 * contraindre l'atelier à un format unique le jour où il aura une couverture
 * exportée de Canva sous la main :
 *   — une clé d'objet R2 (« numeros/…/apercu/c1.jpg ») → signée à chaque rendu ;
 *   — une URL absolue (https://…) → servie telle quelle.
 *
 * Le bucket reste PRIVÉ. Le rendre public exposerait, dans le dossier voisin,
 * les photos brutes de toutes les clientes.
 *
 * Un visuel manquant ne casse jamais la page : la vignette laisse place à un
 * cadre de la charte. Même règle qu'au dépôt — jamais de case cassée.
 */

import { signerGet } from "./r2";

/**
 * `plat` (T2-2) : la couverture À PLAT, C4 | dos | C1 dans un seul fichier —
 * le format d'export naturel de Canva et le format normal des nouvelles
 * publications. Quand il est présent, c1/c4 sont null par construction
 * (transitions.ts n'écrit jamais les deux formats ensemble) ; les dossiers
 * publiés avant ce format portent c1/c4 et un plat null. L'affichage choisit
 * son rendu sur cette seule distinction.
 */
/** On montre au plus TROIS doubles pages (décision de Mathias, 02/09). */
export const MAX_DOUBLES = 3;

export type Apercu = {
  plat: string | null;
  c1: string | null;
  c4: string | null;
  /** 0 à `MAX_DOUBLES` doubles pages résolues, dans l'ordre d'affichage. */
  doubles: string[];
  /**
   * ⚠️ RÉTROCOMPAT : la PREMIÈRE double page (= `doubles[0]`). Le format
   * historique n'écrit qu'une seule double page sous la clé `double` ; les
   * écrans qui n'ont pas encore migré vers `doubles` lisent encore ce champ.
   * À retirer le jour où tous les consommateurs liront `doubles`.
   */
  double: string | null;
};

const VIDE: Apercu = { plat: null, c1: null, c4: null, doubles: [], double: null };

function lire(source: Record<string, unknown>, ...noms: string[]): string | null {
  for (const nom of noms) {
    const v = source[nom];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Les clés (ou URL) des doubles pages, TELLES QUELLES, avant résolution R2.
 *
 * Deux formats acceptés, comme pour les couvertures :
 *   — nouveau : un TABLEAU sous `doubles` (1 à `MAX_DOUBLES` entrées) ;
 *   — historique : une valeur UNIQUE sous `double`, traitée comme une liste
 *     d'un seul élément.
 * Le tableau prime sur la valeur unique. Les entrées vides ou non-chaînes sont
 * ignorées, et on borne à `MAX_DOUBLES` : l'admin ne peut pas en publier plus
 * que ce que la visionneuse sait montrer. Pur — éprouvé par verif-atelier.ts.
 */
export function lireDoublesBrutes(source: Record<string, unknown>): string[] {
  for (const nom of ["doubles", "doubles_pages", "doublesPages"]) {
    const v = source[nom];
    if (Array.isArray(v)) {
      return v
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
        .slice(0, MAX_DOUBLES);
    }
  }
  const unique = lire(source, "double", "double_page", "doublePage");
  return unique ? [unique] : [];
}

async function resoudre(valeur: string | null): Promise<string | null> {
  if (!valeur) return null;
  if (/^https?:\/\//i.test(valeur)) return valeur;
  try {
    return await signerGet(valeur);
  } catch (err) {
    /* Coffre mal configuré : la page s'affiche sans visuel plutôt que de
       rendre un 500 à une cliente qui vient voir sa couverture. */
    console.error("[apercu] signature impossible", valeur, (err as Error)?.message);
    return null;
  }
}

export async function resoudreApercu(brut: unknown): Promise<Apercu> {
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return VIDE;
  const source = brut as Record<string, unknown>;

  const [plat, c1, c4, doublesResolues] = await Promise.all([
    resoudre(lire(source, "plat", "couverture_plat", "a_plat")),
    resoudre(lire(source, "c1", "couverture", "recto")),
    resoudre(lire(source, "c4", "dos", "verso")),
    Promise.all(lireDoublesBrutes(source).map(resoudre)),
  ]);

  /* Une double page qui ne se résout pas (clé morte) est retirée plutôt que de
     laisser un trou dans la visionneuse — même règle que les couvertures. */
  const doubles = doublesResolues.filter((x): x is string => x !== null);
  return { plat, c1, c4, doubles, double: doubles[0] ?? null };
}
