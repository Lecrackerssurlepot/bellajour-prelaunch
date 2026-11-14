/**
 * Les réglages du moteur (lot 2, 09/11 : G7). Chaque seuil a un NOM, une valeur, une date et la raison de sa dernière
 * valeur. Une leçon (lecons.ts) garde les réglages en vigueur au moment du geste : on peut la rejouer avec d'autres.
 * Rien ne change ici sans un oui de Mathias et une preuve chiffrée (plan de l'éditeur, 09/11).
 * Module pur.
 */

export type Reglage = { valeur: number; regle: string; depuis: string; raison: string };

export const REGLAGES = {
  flou_absolu: { valeur: 40, regle: "R73", depuis: "2026-11-10", raison: "toujours floue sous 40 (netteté de la zone la plus nette, vignette de 256 px) ; avant le 10/11 : 120 ET relatif, sur la moyenne de l'image, aucune floue vue au test de Mathias" },
  flou_relatif: { valeur: 0.2, regle: "R73", depuis: "2026-11-10", raison: "OU sous 20 % de la médiane de l'album (calibration du 10/11 sur 408 photos de bêta-test : 30 % prenait des photos nettes mais douces)" },
  flou_min_mesures: { valeur: 12, regle: "R73", depuis: "2026-11-09", raison: "il faut assez de photos pour parler de médiane" },
  rafale_secondes: { valeur: 2, regle: "R74", depuis: "2026-11-09", raison: "réglage de départ" },
  rafale_proche_hamming: { valeur: 24, regle: "R74", depuis: "2026-11-09", raison: "essai du 09/11 : deux images sans rapport diffèrent d'environ 32 bits" },
  rafale_large_secondes: { valeur: 60, regle: "R74", depuis: "2026-11-10", raison: "une rafale de téléphone s'étale souvent au-delà de 10 s ; avant le 10/11 : 10" },
  rafale_hamming: { valeur: 16, regle: "R74", depuis: "2026-11-10", raison: "avant le 10/11 : 14" },
  doublon_hamming: { valeur: 8, regle: "R75", depuis: "2026-11-10", raison: "avant le 10/11 : 6, aucun doublon vu au test de Mathias (le site utilise ≤ 2 sur un pHash DCT, plus strict)" },
  air_tete: { valeur: 0.15, regle: "R-21", depuis: "2026-11-09", raison: "15 % de la hauteur du visage au-dessus de la tête, rapport ch.03" },
  masse_saillance: { valeur: 0.85, regle: "R-20", depuis: "2026-11-09", raison: "la zone protégée garde 85 % de la masse saillante, rapport ch.03" },
  visage_confiance: { valeur: 0.5, regle: "A6", depuis: "2026-11-09", raison: "seuil par défaut du détecteur MediaPipe" },
  pli_mm: { valeur: 5, regle: "R-25", depuis: "2026-11-09", raison: "HYPOTHÈSE : largeur perdue de chaque côté du pli, à confirmer avec Cloudprinter" },
  sombre_moyenne: { valeur: 35, regle: "A3", depuis: "2026-11-09", raison: "réglage de départ : gris moyen sous 35 sur 255" },
  claire_moyenne: { valeur: 225, regle: "A3", depuis: "2026-11-09", raison: "réglage de départ : gris moyen au-dessus de 225" },
  ecretage_part: { valeur: 0.4, regle: "A3", depuis: "2026-11-09", raison: "réglage de départ : 40 % des pixels bouchés ou brûlés" },
  capture_rapport: { valeur: 1.9, regle: "A4", depuis: "2026-11-09", raison: "sans date et plus allongée que 1,9 : la forme d'un écran de téléphone" },
  visage_flou: { valeur: 0.35, regle: "A7", depuis: "2026-11-09", raison: "réglage de départ : le plus grand visage est trois fois moins net que la photo" },
  horloge_hamming: { valeur: 10, regle: "A5", depuis: "2026-11-09", raison: "photos jumelles entre deux déposants" },
  horloge_paires_min: { valeur: 3, regle: "A5", depuis: "2026-11-09", raison: "au moins trois paires qui concordent avant de recaler" },
  horloge_tolerance_s: { valeur: 120, regle: "A5", depuis: "2026-11-09", raison: "deux minutes de tolérance entre les paires" },
  moment_deposant: { valeur: 0.5, regle: "A9", depuis: "2026-11-09", raison: "chaque déposant de plus pèse la moitié d'un moment (« vu par trois, moment fort »)" },
  variete_lambda: { valeur: 0.7, regle: "A12", depuis: "2026-11-09", raison: "R-43 du rapport : 70 % qualité, 30 % différence" },
  similaire_hamming: { valeur: 12, regle: "R93", depuis: "2026-11-10", raison: "calibration du 10/11 : sur 302 vraies photos, la plus ressemblante de presque chacune est entre 13 et 24 (le bruit) ; 12 et moins = vraiment la même scène" },
  similaire_minutes: { valeur: 10, regle: "R93", depuis: "2026-11-10", raison: "prises à 10 minutes au plus l'une de l'autre" },
  capture_aplats: { valeur: 0.45, regle: "A4", depuis: "2026-11-10", raison: "information seulement (panneau Lecture) : les aplats seuls prenaient des ciels pour des captures" },
  flou_nuit: { valeur: 70, regle: "R73", depuis: "2026-11-10", raison: "calibration du 10/11 : sous ce gris moyen (nuit, aurores, feu), peu de contours par nature : on ne juge pas le flou par rapport à l'album, seulement sous le plancher absolu" },
  /* lot F (14/11) : le contrôle de fiabilité à l'œil sur les six lots de la démo (demo-2026-11-13/jugements/fiabilite.md) */
  rafale_suite_secondes: { valeur: 30, regle: "R140", depuis: "2026-11-14", raison: "11 rafales manquées sur six lots, toutes à plus de 10 s ou à cadre tourné : deux photos qui se SUIVENT à 30 s au plus et proches (empreinte) sont une rafale ; rejoué sur le cache de la démo : 62 paires vraies sur 83 au lieu de 57, trois paires de plus hors du jugement, deux scènes vues à l'œil, chacune une vraie rafale (une allée sous des arceaux, un restaurant cadré deux fois)" },
  rafale_suite_hamming: { valeur: 20, regle: "R140", depuis: "2026-11-14", raison: "à 22 et 24 : 64 et 67 vraies, mais 34 et 36 hors du jugement (contre 32) ; 20 garde le meilleur rapport" },
  rafale_tournee_marge: { valeur: 4, regle: "R140", depuis: "2026-11-14", raison: "un cadre tourné (portrait et paysage) ne se compare pas case à case : l'empreinte s'éloigne de 4 à 8 de plus pour la même scène (candice 123/124, 157/091)" },
  capture_texte_lignes: { valeur: 10, regle: "R141", depuis: "2026-11-14", raison: "les deux vraies captures des six lots portent 22 et 29 lignes de texte, les sept fausses (exports Snapchat) 0 à 1 ; l'éditeur ne lit pas encore le texte : branche dormante tant qu'aucune mesure ne l'apporte" },
  capture_aplat_texte: { valeur: 0.3, regle: "R141", depuis: "2026-11-14", raison: "aplats des deux vraies captures : 0,47 et 0,40 ; un aplat seul prenait des ciels pour des écrans" },
  lieu_ia_confiance: { valeur: 0.7, regle: "R147", depuis: "2026-11-14", raison: "brief du lot F : un lieu nommé n'est proposé en premier dans les textes qu'à 0,7 et plus, ET sûr (panneau lisible ou GPS qui confirme)" },
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
