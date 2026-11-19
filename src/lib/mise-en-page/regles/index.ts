/**
 * Le registre des règles du tunnel (18/11, T-216). Comment ajouter une règle : `src/lib/mise-en-page/CLAUDE.md`, section « Le registre
 * des règles ».
 */

export * from "./types";
export { REGISTRE, regleParId, versionDe, versionRegles, comptesParStatut, comptesParDomaine, reglesDuDomaine } from "./registre";
export { correctionsParRegle, type Corrections, type LeconComptee } from "./retours";
export { SURCHARGES, type Surcharge } from "./surcharges";
export { RETOURS_MATHIAS, INTERDITS_DURS, REGLES_DU_BANC } from "./tunnel";
export { DECISIONS_V2, REGLES_DEFINITION_V2 } from "./definitionV2";
export { DECISIONS_SOCLE } from "./decisions1911";
