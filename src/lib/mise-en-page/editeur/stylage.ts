/**
 * Le geste « styler » (lot C, 12/11) : poser, changer ou retirer la feuille de style du magazine. Pur : le même objet si rien ne
 * change, la clé `style` écrite seulement quand elle existe (jamais `style: undefined`, que `contenuValide` refuse), un style qui
 * ne se relit pas est ignoré. Ne touche à aucune planche : une entrée d'historique à part, comme le tri.
 */

import type { Magazine } from "../magazine";
import { ROLES_COULEUR, NOM_ROLE, paireParId, styleEgal, styleValide, type StyleMagazine } from "../style";

/** Le magazine avec ce style (ou sans, avec `null`) ; le MÊME objet si le style est déjà celui-là ou s'il est invalide. */
export function avecStyle(m: Magazine, s: StyleMagazine | null): Magazine {
  if (s === null) {
    if (m.style === undefined) return m;
    const { style: _style, ...reste } = m;
    void _style;
    return reste;
  }
  if (!styleValide(s) || styleEgal(m.style, s)) return m;
  return { ...m, style: { paire: s.paire, couleurs: { ...s.couleurs } } };
}

/** Ce que l'entrée d'historique dit : « Style · Bodoni Moda + Hanken Grotesk », « Nuancier », « Aplat sourd », « Style retiré ». */
export function libelleStyle(avant: StyleMagazine | undefined, apres: StyleMagazine | null): string {
  if (apres === null) return "Style retiré";
  if (!avant || avant.paire !== apres.paire) return `Style · ${paireParId(apres.paire)?.nom ?? apres.paire}`;
  const changes = ROLES_COULEUR.filter((r) => avant.couleurs[r] !== apres.couleurs[r]);
  return changes.length === 1 ? NOM_ROLE[changes[0]] : "Nuancier";
}
