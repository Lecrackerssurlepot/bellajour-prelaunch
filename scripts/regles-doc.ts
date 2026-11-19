/**
 * La DOC GÉNÉRÉE du registre des règles (18/11, T-216).
 *
 *     npx tsx --tsconfig tsconfig.json scripts/regles-doc.ts
 *
 * Écrit `docs/moteur/tunnel/REGISTRE.md` depuis `src/lib/mise-en-page/regles/` : la version, les comptes, puis le tableau des règles
 * par domaine. Le harnais (`verif-mep-regles.ts`) refuse un REGISTRE.md qui n'est pas celui que ce script écrirait.
 * Local, ni base ni réseau ; n'écrit que ce fichier.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { REGISTRE, comptesParDomaine, comptesParStatut, reglesDuDomaine, versionRegles } from "@/lib/mise-en-page/regles";
import { A_PRECISER, DOMAINES, STATUTS, type Regle } from "@/lib/mise-en-page/regles/types";
import { REGLAGES } from "@/lib/mise-en-page/editeur/reglages";
import { texteRegistreSocle } from "./socle-doc";

export const FICHIER_DOC = "docs/moteur/tunnel/REGISTRE.md";

const NOM_DOMAINE: Record<(typeof DOMAINES)[number], string> = {
  analyse: "Analyse", selection: "Sélection", structure: "Structure", pose: "Pose", couleur: "Couleur", filtre: "Filtres",
  typo: "Typographie", couverture: "Couverture", texte: "Textes",
};

const cellule = (s: string): string => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

function ligne(r: Regle): string {
  const regle = r.quand !== A_PRECISER || r.alors !== A_PRECISER
    ? `${r.enonce}<br>**Quand** ${r.quand}<br>**Alors** ${r.alors}`
    : r.enonce;
  const profils = r.profils === "tous" ? "tous" : r.profils.join(", ");
  const themes = r.themes?.length ? ` (thème : ${r.themes.join(", ")})` : "";
  const reglages = (r.reglages ?? []).map((n) => `${n} = ${REGLAGES[n].valeur}`).join(", ");
  const famille = r.famille === "interdit" ? "interdit" : `préférence (${r.poids})`;
  const controle = r.controle ? ` · contrôle ${r.controle}` : r.banc ? ` · banc (${r.banc.etat === "jouee" ? "jouée" : "écrite"})` : "";
  return `| ${r.id} | ${famille} | ${r.statut}${controle} | ${cellule(regle)} | ${profils}${themes} | ${cellule(reglages)} | ${cellule(r.source)}, ${r.depuis} |`;
}

/** Le texte exact de REGISTRE.md. */
export function texteDoc(): string {
  const st = comptesParStatut();
  const dom = comptesParDomaine();
  const l: string[] = [
    "# Le registre des règles du tunnel",
    "",
    "> **Fichier généré, ne pas éditer.** Source : `src/lib/mise-en-page/regles/` ; régénérer par",
    "> `npx tsx --tsconfig tsconfig.json scripts/regles-doc.ts`. Le harnais refuse ce fichier s'il n'est pas à jour.",
    "",
    `Version du registre : \`${versionRegles()}\` · ${REGISTRE.length} règles.`,
    "",
    `Par statut : ${STATUTS.map((s) => `${s} ${st[s]}`).join(" · ")}.`,
    "",
    `Par domaine : ${DOMAINES.map((d) => `${NOM_DOMAINE[d]} ${dom[d]}`).join(" · ")}.`,
    "",
    "Un INTERDIT bloque, une PRÉFÉRENCE pèse (poids relatif, 1 = ordinaire). « à préciser » : la condition ou l'action n'est pas encore",
    "écrite en données mesurables (règle reprise d'un cahier). Les réglages sont ceux de `editeur/reglages.ts`, avec leur valeur actuelle.",
  ];
  for (const d of DOMAINES) {
    const rs = reglesDuDomaine(d);
    if (!rs.length) continue;
    l.push("", `## ${NOM_DOMAINE[d]} (${rs.length})`, "", "| Id | Famille | Statut | Règle | Profils | Réglages | Source |", "|---|---|---|---|---|---|---|");
    for (const r of rs) l.push(ligne(r));
  }
  /* 19/11 (T-226) : le socle, par moteur et par priorité */
  l.push(...texteRegistreSocle());
  l.push("");
  return l.join("\n");
}

if (process.argv[1]?.endsWith("regles-doc.ts")) {
  writeFileSync(join(process.cwd(), FICHIER_DOC), texteDoc());
  console.log(`${FICHIER_DOC} écrit (${REGISTRE.length} règles, version ${versionRegles()}).`);
}
