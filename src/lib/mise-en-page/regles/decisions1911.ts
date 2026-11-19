/**
 * Les réponses de Mathias du 19/11 sur le SOCLE (M-35 à M-57) au registre des règles du tunnel : une seule source, `socle/decisions.ts`
 * (`REPONSES_19_11`), d'où ces règles sont tirées telles quelles. `confirmee_mathias` : ce sont ses mots (RETOURS-MATHIAS.md).
 * Rien n'est câblé : le compositeur ne les applique pas encore (D34). Module pur.
 */

import { REPONSES_19_11 } from "./socle/decisions";
import type { Regle } from "./types";

export const DECISIONS_SOCLE: readonly Regle[] = REPONSES_19_11.map((r): Regle => ({
  id: r.id, domaine: r.domaine, famille: r.famille, ...(r.famille === "preference" ? { poids: 1 } : {}),
  enonce: r.enonce, quand: r.quand, alors: r.alors, profils: "tous",
  donnees: Object.keys(r.parametres).length ? Object.keys(r.parametres) : ["réponse de Mathias"],
  statut: "confirmee_mathias", source: `${r.id} (socle, ${r.sur})`, depuis: "2026-11-19",
}));
