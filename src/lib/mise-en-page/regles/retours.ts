/**
 * Le pont entre les LEÇONS de l'atelier (`mep_lecons`, `editeur/lecons.ts`) et les règles (18/11, T-216) : combien de fois l'atelier a
 * corrigé la machine, règle par règle, et quand pour la dernière fois. Lecture seule : rien n'est écrit en base.
 * Une leçon porte l'identifiant de la règle qui proposait (`regle`, une R… de REGLES-TRI ou une règle du registre) ; les jalons
 * (ouverture, export) ne sont pas des corrections, une réponse à une question non plus (elle commente une leçon déjà comptée).
 * Module pur.
 */

/** Ce qu'il faut d'une leçon pour la compter (une ligne de `mep_lecons`, ou une `Lecon` datée par l'écran). */
export type LeconComptee = { regle: string; type: string; quand?: string | null };

export type Corrections = { corrections: number; derniere: string | null };

const PAS_UNE_CORRECTION: ReadonlySet<string> = new Set(["ouverture", "export", "reponse"]);

/** Le compte par règle : nombre de corrections et date de la dernière (la plus récente des dates ISO connues). */
export function correctionsParRegle(lecons: readonly LeconComptee[]): Record<string, Corrections> {
  const c: Record<string, Corrections> = {};
  for (const l of lecons) {
    if (!l || typeof l.regle !== "string" || !l.regle || PAS_UNE_CORRECTION.has(l.type)) continue;
    const x = (c[l.regle] ??= { corrections: 0, derniere: null });
    x.corrections++;
    if (typeof l.quand === "string" && (x.derniere === null || l.quand > x.derniere)) x.derniere = l.quand;
  }
  return c;
}
