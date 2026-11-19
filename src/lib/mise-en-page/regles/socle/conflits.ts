/**
 * LE TEST DES RIVAUX (PROCESSUS §7.3, test a), dans sa forme SIMPLE (19/11, T-219).
 *
 * Deux règles sont RIVALES quand elles sont du même moteur et de la même priorité, décident la même variable, poussent dans des sens
 * opposés, dans la même situation (conditions « quand » proches), et que rien ne les départage : ni un repli écrit par l'auteur, ni un
 * paramètre commun, ni un arbitrage nommé (`CONFLITS`). Un rival non départagé fait échouer le harnais, nommé.
 *
 * Ce qu'une règle décide et le sens où elle pousse ne sont pas encore déclarés par les auteurs : ils sont DÉDUITS du texte de l'action
 * (`decideDe`, `sensDe`), à l'import. C'est la limite de cette forme simple : elle ne voit que ce que les mots disent ; le test « qui fait
 * céder qui » sur les magazines de référence (§7.3, test b) reste à construire. Module pur.
 */

import { SENS_OPPOSES, type RegleSocle, type Sens, type Variable } from "./types";

const sansAccent = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const MOTIFS_VARIABLE: readonly (readonly [Variable, RegExp])[] = [
  ["statut", /reserve|ecart|garde|sort/], ["chapitre", /chapitre/], ["ordre", /chronolog|ordre|avant|apres/],
  ["double", /meme double|sur la double|ensemble|voisin|separe/], ["nombre", /photos par double|densite|nombre de photos|au plus \d|plafond/],
  ["heros", /heros|photo principale/], ["cadre", /pleine page|vignette|en grand|en petit|quart de page|demi-page/], ["recadrage", /recadr|rogn/],
  ["texte", /titre|legende|texte/], ["couleur", /couleur|fond|aplat/], ["police", /police|corps/], ["filtre", /filtre|noir et blanc/],
  ["couverture", /couverture/], ["pages", /nombre de pages|taille du magazine/],
];
const MOTIFS_SENS: readonly (readonly [Sens, RegExp])[] = [
  ["plus", /\bplus\b|au moins|monte|agrand|en grand|pleine page/], ["moins", /au plus|moins|baisse|en petit|vignette|reduit/],
  ["ensemble", /ensemble|meme double|reuni|rassembl/], ["separe", /separe|jamais sur la meme double|jamais voisin|eloign|coupe/],
  ["vide", /aucun titre|muet|vide|rien|ne s.imprime pas/], ["plein", /\btitre\b|nomme|legende/],
];

/** Les variables que l'action touche. */
export const decideDe = (alors: string): Variable[] => { const a = sansAccent(alors); return MOTIFS_VARIABLE.filter(([, m]) => m.test(a)).map(([v]) => v); };
/** Les sens où l'action pousse. */
export const sensDe = (alors: string): Sens[] => { const a = sansAccent(alors); return MOTIFS_SENS.filter(([, m]) => m.test(a)).map(([s]) => s); };

/** Les mots d'une condition (quatre lettres et plus, sans accent). */
const motsDe = (quand: string): Set<string> => new Set(sansAccent(quand).match(/[a-z]{4,}/g) ?? []);

/** La ressemblance de deux conditions (Jaccard des mots). */
export function memeSituation(a: string, b: string): number {
  const x = motsDe(a); const y = motsDe(b);
  let commun = 0;
  for (const m of x) if (y.has(m)) commun++;
  const union = x.size + y.size - commun;
  return union ? commun / union : 0;
}

/** Le seuil de « même situation » (réglage de départ de cette forme simple). */
export const SEUIL_MEME_SITUATION = 0.25;

/** Le sens de A s'oppose à celui de B (et ni l'un ni l'autre ne pousse des deux côtés). */
function opposes(a: readonly Sens[], b: readonly Sens[]): boolean {
  return SENS_OPPOSES.some(([x, y]) => (a.includes(x) && b.includes(y) && !a.includes(y) && !b.includes(x)) || (a.includes(y) && b.includes(x) && !a.includes(x) && !b.includes(y)));
}

/** Un repli écrit par l'auteur (pas le repli par défaut ni « à écrire »). */
export type AvecRepliEcrit = (r: RegleSocle) => boolean;

export type Rival = { a: string; b: string; variables: Variable[]; situation: number };

/**
 * Les paires rivales non départagées. `departagees` : les paires déjà arbitrées (clé « A|B », ordre alphabétique).
 * Les doublons et les règles mortes ne comptent pas (elles ne décident plus).
 */
export function rivaux(regles: readonly RegleSocle[], repliEcrit: AvecRepliEcrit, departagees: ReadonlySet<string>): Rival[] {
  const vivantes = regles.filter((r) => r.etat !== "doublon" && r.etat !== "morte");
  const groupes = new Map<string, RegleSocle[]>();
  for (const r of vivantes) { const k = `${r.moteur}|${r.priorite}`; (groupes.get(k) ?? groupes.set(k, []).get(k) as RegleSocle[]).push(r); }
  const sortie: Rival[] = [];
  for (const rs of groupes.values()) {
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i]; const b = rs[j];
      const variables = a.decide.filter((v) => b.decide.includes(v));
      if (!variables.length || !opposes(a.sens, b.sens)) continue;
      const situation = memeSituation(a.quand, b.quand);
      if (situation < SEUIL_MEME_SITUATION) continue;
      if (repliEcrit(a) || repliEcrit(b)) continue;
      if (a.parametres.some((p) => b.parametres.includes(p))) continue;
      const cle = [a.id, b.id].sort().join("|");
      if (departagees.has(cle)) continue;
      sortie.push({ a: a.id, b: b.id, variables, situation: Math.round(situation * 100) / 100 });
    }
  }
  return sortie;
}
