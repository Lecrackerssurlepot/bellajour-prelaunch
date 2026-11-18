/**
 * Les RETOUCHES des règles reprises des cahiers (`reprise.ts`, généré) : tout ce qui change une règle reprise s'écrit ICI, jamais dans
 * la reprise (le harnais la regénère et refuse une retouche à la main). Une surcharge peut écrire la condition et l'action en données,
 * changer le statut, ajouter des réglages, un contrôle, un poids, ou dire qu'elle a été jouée au banc.
 *
 * 18/11 (T-216) : les règles des cahiers que le compositeur du banc dit appliquer (`REGLES-CODEES-AU-BANC.md` §1 et §5).
 * Module pur.
 */

import type { Regle } from "./types";

export type Surcharge = Partial<Omit<Regle, "id">>;

const BANC = "design-explorations/tunnel-2026-11-17 (hors git)";
const jouee = (ou: string, controle?: string): Surcharge => ({ banc: { ou: `${BANC} : ${ou}`, etat: "jouee", ...(controle ? { controle } : {}) } });

/** Par identifiant de règle reprise. */
export const SURCHARGES: Readonly<Record<string, Surcharge>> = {
  "S-001": jouee("decider.py score"),
  "S-002": jouee("decider.py score"),
  "S-004": { ...jouee("plein_def"), reglages: ["definition_double_ppp"] },
  "S-008": jouee("decider.py score"),
  "S-009": jouee("tri par chapitre"),
  "S-010": jouee("decider.py score"),
  "S-012": jouee("LIEUX_AFFICHES, MARQUES"),
  "S-013": jouee("réserve « oeuvre »"),
  "S-017": jouee("entonnoir"),
  "S-020": jouee("entonnoir"),
  "S-022": jouee("score, recettes"),
  "S-023": jouee("entonnoir"),
  "S-025": jouee("entonnoir, selection.json"),
  "S-026": jouee("entonnoir, selection.json"),
  "S-027": jouee("entonnoir"),
  "S-034": jouee("entonnoir"),
  "S-046": jouee("roles_satellites"),
  "S-048": jouee("MARQUES, légendes N-02"),
  "S-049": jouee("page 1"),
  "S-050": jouee("page 1"),
  "S-055": jouee("dernière page"),
  "S-057": jouee("textes"),
  "S-059": jouee("decouper"),
  "S-060": jouee("decouper"),
  "S-064": jouee("répartition conjointe"),
  "S-066": jouee("tri par chapitre"),
  "S-069": jouee("decouper"),
  "S-073": jouee("tri_chrono"),
  "S-087": jouee("decouper"),
  "S-091": jouee("decouper"),
  "S-093": jouee("roles_satellites"),
  "S-094": jouee("recettes bandes_et_bandes"),
  "S-095": jouee("mesurer.ts", "mesurer.ts part de pleines pages"),
  "S-097": jouee("decouper", "mesurer.ts regles_da (DA-2)"),
  /* la reprise a retiré le sujet de la phrase (il nommait le projet de test) : l'énoncé est redit en général */
  "S-098": { ...jouee("pose.ts PERTE_MAX_LARGE", "mesurer.ts"), enonce: "Une photo 21:9 est une bande : elle va en bande, en double ou en pleine page paysage, jamais seule en portrait." },
  "S-105": { ...jouee("recette pano"), reglages: ["definition_double_ppp"] },
  "S-107": jouee("recettes"),
  "S-109": jouee("recette pano"),
  "S-112": jouee("recettes"),
  "S-113": { ...jouee("recette pano"), reglages: ["definition_double_ppp"] },
  "S-115": jouee("couvertures, poseur P-19"),
  "S-116": jouee("couvertures, poseur P-19"),
  "S-117": jouee("couvertures, poseur P-19"),
  "S-118": jouee("couvertures, poseur P-19"),
  "S-119": jouee("couvertures"),
  "S-120": jouee("couvertures, poseur P-19"),
  "S-121": jouee("couvertures, poseur P-19"),
  "S-124": jouee("textes"),
  "S-133": jouee("ancre"),
  "S-134": jouee("légendes N-02"),
  "C-025": jouee("fond des ouvertures paires"),
  "C-047": jouee("teinte_de (DA-10)", "mesurer.ts regles_da (DA-10)"),
  "C-060": jouee("fond des ouvertures paires"),
};
