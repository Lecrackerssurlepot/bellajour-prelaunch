/**
 * LE registre des règles du tunnel (18/11, T-216, M-11) : une seule liste, lue par le code, contrôlée au harnais
 * (`scripts/verif-mep-regles.ts`), montrée dans l'atelier (`/admin/atelier/mise-en-page/regles`) et écrite en clair dans
 * `docs/moteur/tunnel/REGISTRE.md` (généré par `scripts/regles-doc.ts`).
 *
 * L'ordre : les retours de Mathias (qui priment), les interdits durs, les règles du banc, puis la matière des cahiers (reprise + retouches).
 * `versionRegles()` change dès qu'une règle change, comme `versionReglages()` pour les seuils : une décision du compositeur pourra
 * emporter la version du registre qui l'a prise.
 * Module pur.
 */

import { REPRISE } from "./reprise";
import { SURCHARGES } from "./surcharges";
import { INTERDITS_DURS, REGLES_DU_BANC, RETOURS_MATHIAS } from "./tunnel";
import { DECISIONS_V2, REGLES_DEFINITION_V2 } from "./definitionV2";
import { DECISIONS_SOCLE } from "./decisions1911";
import { DOMAINES, STATUTS, type Domaine, type IdRegle, type Regle, type Statut } from "./types";

/** Une règle reprise, avec sa retouche. */
const retouchee = (r: Regle): Regle => {
  const s = SURCHARGES[r.id];
  return s ? { ...r, ...s, id: r.id } : r;
};

export const REGISTRE: readonly Regle[] = [...RETOURS_MATHIAS, ...DECISIONS_V2, ...DECISIONS_SOCLE, ...INTERDITS_DURS, ...REGLES_DU_BANC, ...REGLES_DEFINITION_V2, ...REPRISE.map(retouchee)];

const PAR_ID: ReadonlyMap<IdRegle, Regle> = new Map(REGISTRE.map((r) => [r.id, r]));

export const regleParId = (id: IdRegle): Regle | undefined => PAR_ID.get(id);

/** Une écriture stable d'une valeur (clés triées), pour l'empreinte. */
function stable(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stable).join(",")}]`;
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(x);
}

/** L'empreinte d'une liste de règles (FNV-1a, comme `versionReglages`) : `g` + 8 chiffres hexadécimaux. */
export function versionDe(regles: readonly Regle[]): string {
  const s = stable(regles);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return `g${h.toString(16).padStart(8, "0")}`;
}

/** La version du registre en vigueur. */
export const versionRegles = (): string => versionDe(REGISTRE);

/** Combien de règles par statut. */
export function comptesParStatut(regles: readonly Regle[] = REGISTRE): Record<Statut, number> {
  const c = Object.fromEntries(STATUTS.map((s) => [s, 0])) as Record<Statut, number>;
  for (const r of regles) c[r.statut]++;
  return c;
}

/** Combien de règles par domaine. */
export function comptesParDomaine(regles: readonly Regle[] = REGISTRE): Record<Domaine, number> {
  const c = Object.fromEntries(DOMAINES.map((d) => [d, 0])) as Record<Domaine, number>;
  for (const r of regles) c[r.domaine]++;
  return c;
}

/** Les règles d'un domaine, dans l'ordre du registre. */
export const reglesDuDomaine = (d: Domaine, regles: readonly Regle[] = REGISTRE): Regle[] => regles.filter((r) => r.domaine === d);
