/**
 * Les réglages du moteur (lot 2, 09/11 : G7). Chaque seuil a un NOM, une valeur, une date et la raison de sa dernière
 * valeur. Une leçon (lecons.ts) garde les réglages en vigueur au moment du geste : on peut la rejouer avec d'autres.
 * Rien ne change ici sans un oui de Mathias et une preuve chiffrée (plan de l'éditeur, 09/11).
 * Module pur.
 */

export type Reglage = { valeur: number; regle: string; depuis: string; raison: string };

export const REGLAGES = {
  flou_absolu: { valeur: 120, regle: "R73", depuis: "2026-11-09", raison: "réglage de départ, variance du laplacien sur une vignette de 256 px" },
  flou_relatif: { valeur: 0.2, regle: "R73", depuis: "2026-11-09", raison: "réglage de départ : sous 20 % de la médiane de l'album" },
  flou_min_mesures: { valeur: 12, regle: "R73", depuis: "2026-11-09", raison: "il faut assez de photos pour parler de médiane" },
  rafale_secondes: { valeur: 2, regle: "R74", depuis: "2026-11-09", raison: "réglage de départ" },
  rafale_proche_hamming: { valeur: 24, regle: "R74", depuis: "2026-11-09", raison: "essai du 09/11 : deux images sans rapport diffèrent d'environ 32 bits" },
  rafale_large_secondes: { valeur: 10, regle: "R74", depuis: "2026-11-09", raison: "réglage de départ" },
  rafale_hamming: { valeur: 14, regle: "R74", depuis: "2026-11-09", raison: "réglage de départ" },
  doublon_hamming: { valeur: 6, regle: "R75", depuis: "2026-11-09", raison: "réglage de départ (le site utilise ≤ 2 sur un pHash DCT, plus strict)" },
  air_tete: { valeur: 0.15, regle: "R-21", depuis: "2026-11-09", raison: "15 % de la hauteur du visage au-dessus de la tête, rapport ch.03" },
  masse_saillance: { valeur: 0.85, regle: "R-20", depuis: "2026-11-09", raison: "la zone protégée garde 85 % de la masse saillante, rapport ch.03" },
  visage_confiance: { valeur: 0.5, regle: "A6", depuis: "2026-11-09", raison: "seuil par défaut du détecteur MediaPipe" },
  pli_mm: { valeur: 5, regle: "R-25", depuis: "2026-11-09", raison: "HYPOTHÈSE : largeur perdue de chaque côté du pli, à confirmer avec Cloudprinter" },
} as const satisfies Record<string, Reglage>;

export type NomReglage = keyof typeof REGLAGES;

/** Les valeurs seules, telles qu'une leçon les emporte. */
export const valeursReglages = (): Record<NomReglage, number> =>
  Object.fromEntries((Object.keys(REGLAGES) as NomReglage[]).map((k) => [k, REGLAGES[k].valeur])) as Record<NomReglage, number>;

/** Une empreinte courte des réglages : deux leçons de même version ont été prises avec les mêmes seuils. */
export function versionReglages(): string {
  const s = (Object.keys(REGLAGES) as NomReglage[]).sort().map((k) => `${k}=${REGLAGES[k].valeur}`).join(";");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return `r${h.toString(16).padStart(8, "0")}`;
}
