/**
 * La REPRISE des cahiers des équipes dans le registre des règles (18/11, T-216).
 *
 *     npx tsx --tsconfig tsconfig.json scripts/regles-reprise.ts
 *
 * Lit `docs/moteur/tunnel/regles/` (S-001 à S-158, C-001 à C-064, F-001 à F-018, R-T-40 à R-T-60) et écrit
 * `src/lib/mise-en-page/regles/reprise.ts` : chaque règle entre en `hypothese`, avec son énoncé court, sa condition et son action
 * quand le cahier les écrit (« Quand : », « Quoi : »), ses profils (P1 à P6) et ses données (DATE, VIS, NET…) quand il les donne.
 * Elle GÉNÉRALISE en entrant (M-01) : une parenthèse ou une phrase qui nomme un client, un projet ou une photo est retirée.
 * Ce qui change une règle reprise (statut, condition écrite, réglages, contrôle) va dans `regles/surcharges.ts`, jamais ici.
 * Le harnais (`verif-mep-regles.ts`) rejoue cette reprise et refuse un `reprise.ts` qui ne la suit pas.
 * Local, ni base ni réseau ; n'écrit que `reprise.ts`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { A_PRECISER, PROFIL_DE_CODE, type Domaine, type Profil, type Regle } from "@/lib/mise-en-page/regles/types";
import { motsDeProjet } from "./regles-mots-interdits";

export const DOSSIER_CAHIERS = "docs/moteur/tunnel/regles";
export const FICHIER_REPRISE = "src/lib/mise-en-page/regles/reprise.ts";
const DEPUIS = "2026-11-17";
const LONGUEUR_MAX = 320;

/** Les sections du cahier de structure et de sélection, et le domaine de chacune. */
const DOMAINE_DE_SECTION: Readonly<Record<string, Domaine>> = {
  A: "selection", B: "selection", C: "selection", D: "pose", E: "structure", F: "structure", G: "structure", H: "structure",
  I: "pose", J: "pose", K: "couverture", L: "selection", M: "analyse", N: "selection", O: "structure", P: "structure",
};

/** Les données des cahiers (abréviations de REGLES-STRUCTURE-SELECTION.md). */
const DONNEES_CONNUES = ["DATE", "VIS", "PLAN", "SUJET", "RÔLE", "INT", "PILE", "NET", "LUM", "PAL", "ZC", "SAIL", "RATIO", "DPI", "TXT", "LIEU", "PROV", "SÉRIE", "MOMENT-JOUR", "FICHE"];

const propre = (s: string): string => s.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "").replace(/\s+/g, " ").trim();

function court(s: string): string {
  if (s.length <= LONGUEUR_MAX) return s;
  const coupe = s.slice(0, LONGUEUR_MAX);
  return `${coupe.slice(0, coupe.lastIndexOf(" "))} …`;
}

/** M-01 : retire d'un texte toute parenthèse, puis toute phrase, qui nomme un projet, un client ou une photo. */
export function generaliser(texte: string): string {
  let t = texte;
  for (let i = 0; i < 3; i++) t = t.replace(/\s*\(([^()]*)\)/g, (x, dedans: string) => (motsDeProjet(dedans).length ? "" : x));
  const phrases = t.split(/(?<=[.;])\s+/).filter((p) => !motsDeProjet(p).length);
  return phrases.join(" ").replace(/\s+([,.])/g, "$1").trim();
}

const nettoye = (s: string): string => { const g = court(generaliser(propre(s))); return g.replace(/^[,;:.\s]+/, ""); };

/** « P1, P4, P6 », « tous », « gros lot » : les profils d'un segment, ou null si le segment n'en est pas un. */
function profilsDe(seg: string): Profil[] | "tous" | null {
  const s = propre(seg).replace(/\bjamais\b/g, "");
  if (!s || /[^A-Za-z0-9,\s]/.test(s.replace(/gros lot/g, ""))) return null;
  const reste = s.replace(/P[1-6]|tous|gros lot|et|,/g, "").trim();
  if (reste) return null;
  if (/tous/.test(s) || !/P[1-6]/.test(s)) return "tous";
  return [...new Set((s.match(/P[1-6]/g) ?? []).map((c) => PROFIL_DE_CODE[c]))];
}

function famille(enonce: string): Pick<Regle, "famille" | "poids"> {
  return /\bjamais\b|\binterdit|^aucune?\b|\bn'est pas\b|\bne va pas\b/i.test(enonce) ? { famille: "interdit" } : { famille: "preference", poids: 1 };
}

/** Les blocs `**<id>…` d'un cahier, avec la section où chacun se trouve. */
function blocs(texte: string, motif: RegExp): { id: string; titre: string; corps: string; section: string }[] {
  const l: { id: string; titre: string; corps: string; section: string }[] = [];
  let section = "";
  let cur: { id: string; titre: string; corps: string; section: string } | null = null;
  for (const ligne of texte.split("\n")) {
    const sec = ligne.match(/^## ([A-Z])\. /);
    if (sec) section = sec[1];
    const m = ligne.match(motif);
    if (m) {
      if (cur) l.push(cur);
      cur = { id: m[1], titre: (m[2] ?? "").trim(), corps: ligne.slice(m[0].length), section };
    } else if (cur && (ligne.trim() === "" || ligne.startsWith("#"))) {
      l.push(cur);
      cur = null;
    } else if (cur) cur.corps += ` ${ligne}`;
  }
  if (cur) l.push(cur);
  return l;
}

/** Le texte entre deux étiquettes (« Quand : » … « Quoi : »). */
function entre(corps: string, debut: RegExp, fin: RegExp): string {
  const i = corps.search(debut);
  if (i < 0) return "";
  const apres = corps.slice(i).replace(debut, "");
  const j = apres.search(fin);
  return j < 0 ? apres : apres.slice(0, j);
}

function structureSelection(texte: string, source: string): Regle[] {
  return blocs(texte, /^\*\*(S-\d{3})\*\*/).map((b) => {
    const segs = b.corps.split(" · ");
    const enonce = nettoye(segs[0]) || A_PRECISER;
    let profils: Profil[] | "tous" = "tous";
    let donnees: string[] = [];
    for (let i = 1; i < segs.length; i++) {
      const p = profilsDe(segs[i]);
      if (p) {
        profils = p;
        const d = segs[i + 1] ?? "";
        donnees = DONNEES_CONNUES.filter((x) => new RegExp(`(^|[^A-ZÉÔ-])${x}([^A-ZÉÔ-]|$)`).test(d));
        break;
      }
    }
    return { id: b.id, domaine: DOMAINE_DE_SECTION[b.section] ?? "structure", ...famille(enonce), enonce, quand: A_PRECISER, alors: A_PRECISER, profils, donnees, statut: "hypothese", source, depuis: DEPUIS };
  });
}

function couleur(texte: string, source: string): Regle[] {
  return blocs(texte, /^\*\*(C-\d{3}) ([^*]+)\*\*/).map((b) => {
    const enonce = nettoye(b.titre) || A_PRECISER;
    const alors = nettoye(entre(b.corps, /Énoncé\s*:\s*/, /Raison\s*:/)) || A_PRECISER;
    return { id: b.id, domaine: "couleur", ...famille(enonce), enonce, quand: A_PRECISER, alors, profils: "tous", donnees: ["PAL"], statut: "hypothese", source, depuis: DEPUIS };
  });
}

function etiquetees(texte: string, source: string, motif: RegExp, domaine: Domaine, quand: [RegExp, RegExp], quoi: [RegExp, RegExp], donnees: string[]): Regle[] {
  return blocs(texte, motif).map((b) => {
    const enonce = nettoye(b.titre) || A_PRECISER;
    return {
      id: b.id, domaine, ...famille(enonce), enonce,
      quand: nettoye(entre(b.corps, ...quand)) || A_PRECISER,
      alors: nettoye(entre(b.corps, ...quoi)) || A_PRECISER,
      profils: "tous", donnees, statut: "hypothese", source, depuis: DEPUIS,
    };
  });
}

/** Un identifiant écrit deux fois dans un cahier (C-043 le 17/11) : la seconde devient C-043b, la suivante C-043c. */
function sansDoublon(regles: Regle[]): Regle[] {
  const vus = new Map<string, number>();
  return regles.map((r) => {
    const n = vus.get(r.id) ?? 0;
    vus.set(r.id, n + 1);
    return n ? { ...r, id: `${r.id}${String.fromCharCode(97 + n)}` } : r;
  });
}

/** La reprise, pure : les cahiers lus par `lire(nom de fichier)`. */
export function repriseDepuisCahiers(lire: (nom: string) => string): Regle[] {
  return sansDoublon([
    ...structureSelection(lire("REGLES-STRUCTURE-SELECTION.md"), "REGLES-STRUCTURE-SELECTION.md"),
    ...couleur(lire("REGLES-COULEUR.md"), "REGLES-COULEUR.md"),
    ...etiquetees(lire("FILTRES.md"), "FILTRES.md", /^\*\*(F-\d{3}) ([^*]+)\*\*/, "filtre", [/Quand\s*:\s*/, /Quoi\s*:/], [/Quoi\s*:\s*/, /Pourquoi\s*:/], ["PAL", "LUM"]),
    ...etiquetees(lire("COMBOS-TYPO.md"), "COMBOS-TYPO.md", /^\*\*(R-T-\d{2}) ([^*]+)\*\*/, "typo", [/QUAND\s*:\s*/, /QUOI\s*:/], [/QUOI\s*:\s*/, /POURQUOI\s*:/], []),
  ]);
}

/** Le texte exact de `reprise.ts`. */
export function texteReprise(regles: readonly Regle[]): string {
  return [
    "/**",
    " * FICHIER GÉNÉRÉ par `scripts/regles-reprise.ts`, NE PAS ÉDITER : la matière d'origine des cahiers des équipes",
    " * (`docs/moteur/tunnel/regles/`), reprise en hypothèses et généralisée (M-01). Une règle reprise se change dans `surcharges.ts`.",
    " */",
    "",
    'import type { Regle } from "./types";',
    "",
    "export const REPRISE: readonly Regle[] = [",
    ...regles.map((r) => `  ${JSON.stringify(r)},`),
    "];",
    "",
  ].join("\n");
}

export const lireCahier = (racine: string) => (nom: string): string => readFileSync(join(racine, DOSSIER_CAHIERS, nom), "utf8");

if (process.argv[1]?.endsWith("regles-reprise.ts")) {
  const regles = repriseDepuisCahiers(lireCahier(process.cwd()));
  writeFileSync(join(process.cwd(), FICHIER_REPRISE), texteReprise(regles));
  const aPreciser = regles.filter((r) => r.enonce === A_PRECISER).length;
  console.log(`${regles.length} règles reprises dans ${FICHIER_REPRISE} (${aPreciser} énoncés à généraliser à la main).`);
}
