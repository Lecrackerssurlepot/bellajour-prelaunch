/**
 * L'hésitation (lot 3, plan de Mathias du 30/10) : deux photos dans le même cadre. Celle de devant est posée,
 * celle de derrière attend ; T les intervertit, on tranche dans la confrontation, et la délaissée reste notée
 * pour revenir dessus. Seule la photo de devant compte partout ailleurs (export, ×n, bilans).
 * Purs : aucune interface, aucune horloge.
 */

import type { Hesitation, Magazine, RefCadre } from "../magazine";
import { dispositionDe } from "../magazine";
import { issue, remplacerPlanche, avecDispo, type CatalogueRef } from "./operations";
import { affectation, idsPlanche, indexPlanche, neutre } from "./outils";
import type { Issue } from "./types";

export type ActionHesitation = "ajouter" | "intervertir" | "garderDevant" | "garderDerriere" | "rouvrir" | "oublier";

/** L'hésitation du cadre, ou null. `ouverte` : pas encore tranchée. */
export function hesitationDe(m: Magazine, ref: RefCadre | null | undefined): (Hesitation & { ouverte: boolean }) | null {
  const h = affectation(m, ref)?.hesitation;
  return h ? { ...h, ouverte: !h.tranchee } : null;
}

/** Les cadres du magazine qui hésitent encore (dans l'ordre des planches). */
export function hesitationsOuvertes(m: Magazine, plancheId?: string): RefCadre[] {
  const out: RefCadre[] = [];
  for (const p of m.planches) {
    if (plancheId && p.id !== plancheId) continue;
    for (const cible of ["double", "gauche", "droite"] as const) {
      const d = dispositionDe(p, cible);
      d?.photos.forEach((a, index) => { if (a.hesitation && !a.hesitation.tranchee) out.push({ plancheId: p.id, cible, index }); });
    }
  }
  return out;
}

/** Les photos derrière un cadre : `ouvertes` (on hésite encore), `delaissees` (tranchées contre elles). */
export function photosEnHesitation(m: Magazine): { ouvertes: Set<string>; delaissees: Set<string> } {
  const ouvertes = new Set<string>(), delaissees = new Set<string>();
  for (const p of m.planches) for (const d of [p.double, p.gauche, p.droite]) for (const a of d?.photos ?? []) {
    if (a.hesitation) (a.hesitation.tranchee ? delaissees : ouvertes).add(a.hesitation.photoId);
  }
  return { ouvertes, delaissees };
}

/** Réécrit l'affectation du cadre (même gabarit, mêmes textes). */
function poser(m: Magazine, ref: RefCadre, aff: NonNullable<ReturnType<typeof affectation>>): Magazine {
  const i = indexPlanche(m, ref.plancheId);
  const p = m.planches[i];
  const d = p ? dispositionDe(p, ref.cible) : null;
  if (!d) return m;
  const photos = d.photos.slice();
  photos[ref.index] = aff;
  return remplacerPlanche(m, i, avecDispo(p, ref.cible, { ...d, photos }));
}

/** Devant ↔ derrière, chacune avec son recadrage. Refus si la photo de derrière est déjà posée ailleurs sur la planche. */
function permuter(m: Magazine, ref: RefCadre, tranchee: boolean): Issue {
  const a = affectation(m, ref);
  const h = a?.hesitation;
  if (!a || !a.photoId || !h) return issue(m, "rien");
  const p = m.planches[indexPlanche(m, ref.plancheId)];
  if (p && idsPlanche(p).includes(h.photoId)) return issue(m, "deja_la");
  const derriere: Hesitation = tranchee ? { photoId: a.photoId, recadrage: a.recadrage, tranchee: true } : { photoId: a.photoId, recadrage: a.recadrage };
  return issue(poser(m, ref, { photoId: h.photoId, recadrage: h.recadrage, hesitation: derriere }), null, { posees: [h.photoId], retiree: a.photoId });
}

/**
 * Le geste d'hésitation sur un cadre.
 * - `ajouter` : `photoId` passe derrière (remplace une hésitation précédente, ouverte ou tranchée) ;
 * - `intervertir` (T) : devant ↔ derrière, l'hésitation reste ouverte ;
 * - `garderDevant` / `garderDerriere` : on tranche, la délaissée reste notée derrière ;
 * - `rouvrir` : on hésite de nouveau ; `oublier` : la délaissée n'est plus notée.
 */
export function hesiter(m: Magazine, ref: RefCadre, action: ActionHesitation, cat: CatalogueRef, photoId?: string): Issue {
  const a = affectation(m, ref);
  if (!a || !a.photoId) return issue(m, "rien");
  const h = a.hesitation;
  switch (action) {
    case "ajouter": {
      if (typeof photoId !== "string" || !cat.has(photoId) || photoId === a.photoId) return issue(m, "rien");
      if (h && h.photoId === photoId && !h.tranchee) return issue(m, "rien");
      const p = m.planches[indexPlanche(m, ref.plancheId)];
      if (p && idsPlanche(p).includes(photoId)) return issue(m, "deja_la");
      return issue(poser(m, ref, { photoId: a.photoId, recadrage: a.recadrage, hesitation: { photoId, recadrage: neutre() } }), null);
    }
    case "intervertir": return h && !h.tranchee ? permuter(m, ref, false) : issue(m, "rien");
    case "garderDerriere": return h && !h.tranchee ? permuter(m, ref, true) : issue(m, "rien");
    case "garderDevant":
      if (!h || h.tranchee) return issue(m, "rien");
      return issue(poser(m, ref, { ...a, hesitation: { ...h, tranchee: true } }), null);
    case "rouvrir": {
      if (!h || !h.tranchee) return issue(m, "rien");
      return issue(poser(m, ref, { ...a, hesitation: { photoId: h.photoId, recadrage: h.recadrage } }), null);
    }
    case "oublier": {
      if (!h) return issue(m, "rien");
      return issue(poser(m, ref, { photoId: a.photoId, recadrage: a.recadrage }), null);
    }
    default: return issue(m, "rien");
  }
}
