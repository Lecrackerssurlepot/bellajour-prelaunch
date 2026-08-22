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

export type Apercu = { c1: string | null; c4: string | null; double: string | null };

const VIDE: Apercu = { c1: null, c4: null, double: null };

function lire(source: Record<string, unknown>, ...noms: string[]): string | null {
  for (const nom of noms) {
    const v = source[nom];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
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

  const [c1, c4, double] = await Promise.all([
    resoudre(lire(source, "c1", "couverture", "recto")),
    resoudre(lire(source, "c4", "dos", "verso")),
    resoudre(lire(source, "double", "double_page", "doublePage")),
  ]);

  return { c1, c4, double };
}
