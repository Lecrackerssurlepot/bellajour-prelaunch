/**
 * LE SOCLE en données (19/11, T-219, D34). Ce qu'il porte, où, et comment l'étendre : `docs/moteur/tunnel/README.md`, section « Le socle ».
 * Rien ici n'est lu par le compositeur ni par l'éditeur : c'est le plan, contrôlé (`scripts/verif-mep-socle.ts`), pas encore câblé.
 * Le navigateur n'importe jamais cet index (les règles pèsent un mégaoctet). Module pur.
 */

import { REGLES_SOCLE } from "./genere/regles";
import { PARAMETRES_SOCLE } from "./genere/parametres";
import { INFORMATIONS_SOCLE } from "./genere/informations";
import { CURSEURS_SOCLE, ECOLES_SOCLE, MODIFICATEURS_SOCLE, PROFILS_SOCLE, THEMES_SOCLE } from "./genere/profils";
import { A_TRANCHER, CONFLITS, REPONSES_19_11 } from "./decisions";
import { QUESTIONS_SOCLE } from "./questions";
import { ROLES_ATELIER } from "./libelles";
import type { InformationSocle, ParametreSocle, RegleSocle } from "./types";

export * from "./types";
export { REGLES_SOCLE, PARAMETRES_SOCLE, INFORMATIONS_SOCLE, PROFILS_SOCLE, THEMES_SOCLE, MODIFICATEURS_SOCLE, CURSEURS_SOCLE, ECOLES_SOCLE };
export { A_TRANCHER, CONFLITS, REPONSES_19_11, QUESTIONS_SOCLE, ROLES_ATELIER };
export { ARBITRAGES_INTEGRATION, PARAMETRES_ARBITRES, QUESTION_OUVERTE_19_11 } from "./decisions";
export { JARGON, JARGON_INTERDIT, LIBELLES_INFO, libelleDe, libelleDuRole } from "./libelles";
export { rivaux, decideDe, sensDe, memeSituation, SEUIL_MEME_SITUATION, type Rival } from "./conflits";

const REGLE = new Map(REGLES_SOCLE.map((r) => [r.id, r] as const));
const PARAMETRE = new Map<string, ParametreSocle>();
for (const p of PARAMETRES_SOCLE) { PARAMETRE.set(p.nom, p); for (const a of p.alias) PARAMETRE.set(a, p); }
const INFORMATION = new Map(INFORMATIONS_SOCLE.map((i) => [i.id, i] as const));

export const regleSocleParId = (id: string): RegleSocle | undefined => REGLE.get(id);
/** Un paramètre par son nom ou par un de ses anciens noms (alias). */
export const parametreParNom = (nom: string): ParametreSocle | undefined => PARAMETRE.get(nom);
export const informationParId = (id: string): InformationSocle | undefined => INFORMATION.get(id);

/** Combien d'éléments par valeur d'un champ. */
export function compter<T>(xs: readonly T[], cle: (x: T) => string): Record<string, number> {
  const c: Record<string, number> = {};
  for (const x of xs) { const k = cle(x); c[k] = (c[k] ?? 0) + 1; }
  return c;
}

function stable(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stable).join(",")}]`;
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(x);
}
/** L'empreinte de tout le socle (FNV-1a, comme `versionRegles`) : `s` + 8 chiffres hexadécimaux. */
export function versionSocle(): string {
  const s = stable([REGLES_SOCLE, PARAMETRES_SOCLE, INFORMATIONS_SOCLE, QUESTIONS_SOCLE, A_TRANCHER, CONFLITS, REPONSES_19_11, PROFILS_SOCLE, THEMES_SOCLE, ROLES_ATELIER]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return `s${h.toString(16).padStart(8, "0")}`;
}
