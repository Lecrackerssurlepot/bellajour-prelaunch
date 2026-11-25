// Lit brand/tokens.json (format DTCG) et rend la liste plate des jetons, alias résolus.
// Partagé par build-tokens.mjs, contrastes.mjs et controle-charte.mjs : une seule lecture de la charte.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE_BRAND = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PREFIXE = '--m-';

export function lireArbre() {
  return JSON.parse(readFileSync(join(RACINE_BRAND, 'tokens.json'), 'utf8'));
}

/** Parcourt l'arbre : un nœud avec $value est un jeton ; $type s'hérite du groupe. */
export function aplatir(arbre) {
  const jetons = [];
  (function marcher(noeud, chemin, typeHerite) {
    const type = noeud.$type ?? typeHerite;
    if (Object.prototype.hasOwnProperty.call(noeud, '$value')) {
      jetons.push({
        chemin: chemin.join('.'),
        type,
        valeur: noeud.$value,
        telephone: noeud.$extensions?.bellajour?.telephone,
        description: noeud.$description,
      });
      return;
    }
    for (const [cle, enfant] of Object.entries(noeud)) {
      if (cle.startsWith('$') || typeof enfant !== 'object' || enfant === null) continue;
      marcher(enfant, [...chemin, cle], type);
    }
  })(arbre, [], undefined);
  return jetons;
}

const ALIAS = /^\{([^}]+)\}$/;
export const estAlias = (v) => typeof v === 'string' && ALIAS.test(v);
export const cibleAlias = (v) => v.match(ALIAS)[1];

/** Valeur brute d'un jeton, alias suivis jusqu'au bout. */
export function resoudre(jetons) {
  const parChemin = new Map(jetons.map((j) => [j.chemin, j]));
  const brut = (v, vus = new Set()) => {
    if (!estAlias(v)) return v;
    const cible = cibleAlias(v);
    if (vus.has(cible)) throw new Error(`Alias circulaire : ${cible}`);
    const j = parChemin.get(cible);
    if (!j) throw new Error(`Alias inconnu : {${cible}}`);
    vus.add(cible);
    return brut(j.valeur, vus);
  };
  return jetons.map((j) => ({ ...j, brut: brut(j.valeur), brutTelephone: j.telephone === undefined ? undefined : brut(j.telephone) }));
}

export const nomCss = (chemin) => PREFIXE + chemin.replace(/\./g, '-');

/** Écrit une valeur DTCG en CSS. `versCss` transforme un alias en var(). */
export function enCss(type, v, versCss = (x) => x) {
  if (estAlias(v)) return versCss(v);
  if (type === 'fontFamily') {
    const liste = Array.isArray(v) ? v : [v];
    return liste.map((f) => (/^(serif|sans-serif|cursive|monospace)$/.test(f) ? f : `"${f}"`)).join(', ');
  }
  if (type === 'shadow') {
    const o = v;
    return `${o.offsetX} ${o.offsetY} ${o.blur} ${o.spread} ${o.color}`;
  }
  if (type === 'cubicBezier') return `cubic-bezier(${v.join(', ')})`;
  if (type === 'boolean') return v ? '1' : '0';
  return String(v);
}

export function lireJetons() {
  return resoudre(aplatir(lireArbre()));
}
