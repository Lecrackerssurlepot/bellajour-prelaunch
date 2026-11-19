/**
 * LA DOC GÉNÉRÉE DU SOCLE (19/11, T-219).
 *
 *     npx tsx --tsconfig tsconfig.json scripts/socle-doc.ts
 *
 * Écrit depuis `src/lib/mise-en-page/regles/socle/` : `docs/moteur/tunnel/socle/PARAMETRES.md`, `INFORMATIONS-TABLE.md`,
 * `QUESTIONS-TABLE.md`, `A-TRANCHER.md` ; la partie « socle » de `docs/moteur/tunnel/REGISTRE.md` est écrite par `regles-doc.ts`, qui
 * appelle `texteRegistreSocle` d'ici. Le harnais (`verif-mep-socle.ts`) refuse un fichier qui n'est pas celui que ce script écrirait.
 * Local, ni base ni réseau ; n'écrit que ces fichiers.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  A_TRANCHER, CONFLITS, CURSEURS_SOCLE, ECOLES_SOCLE, ETATS_INFO, ETATS_INTEGRATION, INFORMATIONS_SOCLE, MODIFICATEURS_SOCLE, MOTEURS,
  NOM_PRIORITE, PARAMETRES_SOCLE, PRIORITES, PROFILS_SOCLE, QUESTIONS_SOCLE, REGLES_SOCLE, REPONSES_19_11, ROLES_ATELIER, STATUTS_PARAMETRE,
  STATUTS_SOCLE, THEMES_SOCLE, compter, versionSocle, type RegleSocle,
} from "@/lib/mise-en-page/regles/socle";

export const DOCS_SOCLE = "docs/moteur/tunnel/socle";
const c = (s: string): string => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const ENTETE = (titre: string, quoi: string): string[] => [
  `# ${titre}`, "",
  "> **Fichier généré, ne pas éditer.** Source : `src/lib/mise-en-page/regles/socle/` ; régénérer par",
  "> `npx tsx --tsconfig tsconfig.json scripts/socle-doc.ts`. Le harnais refuse ce fichier s'il n'est pas à jour.", "",
  `Version du socle : \`${versionSocle()}\`. ${quoi}`, "",
];
const liste = (o: Record<string, number>, ordre: readonly string[]): string => ordre.map((k) => `${k} ${o[k] ?? 0}`).join(" · ");

const NOM_ETAT: Readonly<Record<string, string>> = { gardee: "gardée", doublon: "doublon", a_corriger: "à corriger", a_trancher: "à trancher", dormante: "dormante", morte: "morte" };
function ligneRegle(r: RegleSocle): string {
  const etat = r.etat === "doublon" && r.doublonDe ? `doublon de ${r.doublonDe}` : NOM_ETAT[r.etat];
  const statut = r.statut === "confirmee_mathias" ? `confirmée (${(r.confirmePar ?? []).join(", ")})` : r.statut === "codee" ? `codée (${r.controle})` : "hypothèse";
  const lien = [r.reprend.length ? `reprend ${r.reprend.join(", ")}` : "", r.remplace.length ? `remplace ${r.remplace.join(", ")}` : ""].filter(Boolean).join(" ; ");
  const reste = [r.note, r.aPreciser ? `À préciser : ${r.aPreciser}` : ""].filter(Boolean).join(" · ");
  return `| ${r.id} | ${etat} | ${c(statut)} | **Quand** ${c(r.quand)}<br>**Alors** ${c(r.alors)}${reste ? `<br>*${c(reste)}*` : ""} | ${c(r.parametres.join(", "))} | ${c(r.repli)} | ${c(r.profils)} | ${c([r.source, lien].filter(Boolean).join(" ; "))} |`;
}

/** La partie « socle » de REGISTRE.md : par moteur, puis par priorité. */
export function texteRegistreSocle(): string[] {
  const l: string[] = [
    "", "---", "", "# Le socle : sept moteurs, priorités P0 à P7 (19/11, D34)", "",
    `Version du socle : \`${versionSocle()}\` · ${REGLES_SOCLE.length} règles. RIEN N'EST CÂBLÉ : le compositeur ne lit pas ces règles.`, "",
    `Par statut : ${liste(compter(REGLES_SOCLE, (r) => r.statut), STATUTS_SOCLE)}.`, "",
    `Par état d'intégration : ${liste(compter(REGLES_SOCLE, (r) => r.etat), ETATS_INTEGRATION)} · repli à écrire ${REGLES_SOCLE.filter((r) => r.repliAEcrire).length}.`, "",
    `Par priorité : ${liste(compter(REGLES_SOCLE, (r) => r.priorite), PRIORITES)}.`, "",
    "L'échelle : une règle d'un niveau ne peut JAMAIS forcer la violation d'une règle d'un niveau au-dessus. P0 et P1 filtrent ; de P3 à P7",
    "chaque règle dit son repli (sinon le repli par défaut de PROCESSUS §7.2 : elle cède, avec une pénalité au journal).",
  ];
  for (const m of MOTEURS) {
    const rs = REGLES_SOCLE.filter((r) => r.moteur === m);
    l.push("", `## ${m} (${rs.length})`);
    for (const p of PRIORITES) {
      const rp = rs.filter((r) => r.priorite === p);
      if (!rp.length) continue;
      l.push("", `### ${m} · ${p} ${NOM_PRIORITE[p]} (${rp.length})`, "", "| Id | État | Statut | Règle | Paramètres | Repli | Profils | Source |", "|---|---|---|---|---|---|---|---|");
      for (const r of rp) l.push(ligneRegle(r));
    }
  }
  return l;
}

export function texteParametres(): string {
  const l = ENTETE("Les paramètres du socle", `${PARAMETRES_SOCLE.length} paramètres (les noms en double fusionnés, anciens noms en alias).`);
  l.push(`Par statut : ${liste(compter(PARAMETRES_SOCLE, (p) => p.statut), STATUTS_PARAMETRE)}. Avec un réglage du code qui porte déjà la valeur : ${PARAMETRES_SOCLE.filter((p) => p.code).length}.`, "",
    "Statuts : `reglage_depart` (une proposition, à régler au banc) ; `valide` (Mathias a posé la valeur) ; `a_mesurer` (attend une mesure ou",
    "l'imprimeur) ; `a_preciser` (sa réponse laisse un chiffre ouvert). Ces paramètres NE REMPLACENT PAS encore `editeur/reglages.ts` ni",
    "`compositeur/reglagesCompositeur.ts` : la colonne « code » dit seulement où la même valeur vit aujourd'hui.", "");
  for (const m of MOTEURS) {
    const ps = PARAMETRES_SOCLE.filter((p) => p.moteur === m);
    if (!ps.length) continue;
    l.push(`## ${m} (${ps.length})`, "", "| Nom | Ce qu'il règle | Valeur de départ | Par profil | Plage | Statut | Source | Règles | Alias | Code |", "|---|---|---|---|---|---|---|---|---|---|");
    for (const p of ps) {
      const pp = p.parProfil ? Object.entries(p.parProfil).map(([k, v]) => `${k} ${v}`).join(" ; ") : "";
      const valeur = `${p.valeur}${p.variantes ? `<br>*variantes : ${p.variantes.join(" ; ")}*` : ""}${p.confirmePar ? ` (${p.confirmePar})` : ""}`;
      l.push(`| \`${p.nom}\` | ${c(p.regle)} | ${c(valeur)} | ${c(pp)} | ${c(p.plage)} | ${p.statut} | ${c(p.source)} | ${p.regles.length} | ${c(p.alias.join(", "))} | ${c(p.code ?? "")} |`);
    }
    l.push("");
  }
  return l.join("\n");
}

export function texteInformations(): string {
  const l = ENTETE("Les informations du socle", `${INFORMATIONS_SOCLE.length} informations, chacune avec son libellé d'atelier (M-57).`);
  l.push(`Par état : ${liste(compter(INFORMATIONS_SOCLE, (i) => i.etat), ETATS_INFO)}.`, "",
    "États : `obtenue_utilisee` (le dépôt l'a, une décision la lit) ; `obtenue_gardee` (gardée pour l'atelier, M-56 : jamais retirée faute",
    "d'usage) ; `pas_obtenue` (à créer, ou calculée au banc seulement). Sources : FICH fichier, PIX pixels, IA-P planche, IA-R regard fin,",
    "IA-V voyage, GEO géocodage, Q-CLI et Q-AT questions, COR correction, DED déduite.", "",
    "## Les rôles d'une photo et leur libellé d'atelier", "", "| Clé | Libellé d'atelier | Ce que c'est | D'où |", "|---|---|---|---|",
    ...ROLES_ATELIER.map((r) => `| \`${r.cle}\` | **${r.libelle}** | ${c(r.sens)} | ${c(r.ou)} |`), "",
    "## Les informations", "", "| Id | Nom | Libellé d'atelier | Niveau | Valeurs (libellé) | Source | Coût | Fiabilité | Lue par | État |", "|---|---|---|---|---|---|---|---|---|---|");
  for (const i of INFORMATIONS_SOCLE) {
    const v = i.valeurs.map((x) => (x.libelle === x.valeur ? x.valeur : `${x.valeur} (${x.libelle})`)).join(", ");
    l.push(`| ${i.id} | \`${i.nom}\` | **${c(i.libelle)}** | ${i.niveau} | ${c(v)} | ${c(i.source)} | ${c(i.cout)} | ${c(i.fiabilite)} | ${i.lueParRegles.length} règles (${i.moteurs.join(", ")}) | ${i.etat}${i.note ? `<br>*${c(i.note)}*` : ""} |`);
  }
  l.push("");
  return l.join("\n");
}

export function texteQuestions(): string {
  const l = ENTETE("Les questions, les profils, les thèmes", `${QUESTIONS_SOCLE.length} questions.`);
  l.push(`Par état : ${Object.entries(compter(QUESTIONS_SOCLE, (q) => q.etat)).map(([k, n]) => `${k} ${n}`).join(" · ")}.`, "",
    "Une réponse règle des PARAMÈTRES, jamais une règle directement. `posee_site` : le dossier la porte déjà (on la lit, M-54) ;",
    "`atelier` : posée à l'atelier, ou écrite sans écran client encore ; `tranchee` : question de réglage tranchée par Mathias ; `reserve`, `retiree`.", "",
    "## Les questions", "", "| Id | À qui | Question | Réponses → paramètres | Deviner avec | État | Dans le dossier |", "|---|---|---|---|---|---|---|");
  for (const q of QUESTIONS_SOCLE) {
    const r = q.reponses.map((x) => `**${x.reponse}** : ${x.effets.map((e) => `\`${e.parametre}\` ${e.valeur}`).join(", ") || "rien"}`).join("<br>");
    l.push(`| ${q.id} | ${q.a} | ${c(q.question)} | ${c(r)} | ${c(q.devineur)} | ${q.etat}${q.parMathias ? ` (${q.parMathias})` : ""}${q.note ? `<br>*${c(q.note)}*` : ""} | ${c((q.depuisLeDossier ?? []).map((d) => `\`${d}\``).join(", "))} |`);
  }
  l.push("", "## Les profils (ce que chacun règle)", "");
  const params = Object.keys(PROFILS_SOCLE[0]?.regle ?? {});
  l.push(`| Paramètre | ${PROFILS_SOCLE.map((p) => `${p.code} ${p.nom}`).join(" | ")} |`, `|---|${PROFILS_SOCLE.map(() => "---").join("|")}|`);
  for (const k of params) l.push(`| \`${k}\` | ${PROFILS_SOCLE.map((p) => c(p.regle[k] ?? "")).join(" | ")} |`);
  l.push("", "Reconnaître le profil :", "", ...PROFILS_SOCLE.map((p) => `- **${p.code} ${p.nom}** (\`${p.cle}\`) : ${p.reconnaissance}`));
  l.push("", "## Les thèmes d'album", "", "| Thème | Si… | Découpe | Nom du chapitre | Source |", "|---|---|---|---|---|",
    ...THEMES_SOCLE.map((t) => `| \`${t.cle}\` | ${c(t.si)} | ${c(t.decoupe)} | ${c(t.nomDuChapitre)} | ${c(t.source)} |`));
  l.push("", "## Les modificateurs", "", ...MODIFICATEURS_SOCLE.map((m) => `- **${m.cle}** (${c(m.si)}) : ${m.decale}`));
  l.push("", "## Les neuf curseurs de goût", "", "| Curseur | de (0) | à (1) | Paramètres qu'il place | Règles (Notion) |", "|---|---|---|---|---|",
    ...CURSEURS_SOCLE.map((k) => `| ${k.cle} | ${c(k.de)} | ${c(k.a)} | ${c(k.place)} | ${c(k.regles)} |`));
  const noms = Object.keys(ECOLES_SOCLE[0]?.curseurs ?? {});
  l.push("", "## Les huit écoles", "", `| École (atelier) | Nom client | ${noms.join(" | ")} |`, `|---|---|${noms.map(() => "---").join("|")}|`,
    ...ECOLES_SOCLE.map((e) => `| ${c(e.atelier)} | ${c(e.client)} | ${noms.map((n) => String(e.curseurs[n]).replace(".", ",")).join(" | ")} |`), "");
  return l.join("\n");
}

const NOM_ETAT_AT: Readonly<Record<string, string>> = { tranchee: "tranchée le 19/11", ouverte: "OUVERTE", par_defaut: "par défaut, non validée" };
export function texteATrancher(): string {
  const l = ENTETE("Ce que Mathias doit trancher, et ce qu'il a tranché", `${A_TRANCHER.length} questions (15 principales, ${A_TRANCHER.length - 15} en annexe).`);
  l.push(`Par état : ${Object.entries(compter(A_TRANCHER, (a) => NOM_ETAT_AT[a.etat])).map(([k, n]) => `${k} ${n}`).join(" · ")}.`, "",
    "Ses mots sont gardés tels quels ; ce que sa réponse laisse ouvert est « à préciser », jamais inventé. Une question de l'annexe sans réponse",
    "prend la valeur annoncée par le socle, marquée « par défaut, non validée ». Le détail de chaque question (ce que fait la machine, ses",
    "magazines) est dans `INTEGRATION.md` et dans la copie de `QUESTIONS-PARAMETRES.md`.", "",
    "| Code | Question | Réponses | Sans réponse | État | Ses mots | Retour | À préciser |", "|---|---|---|---|---|---|---|---|");
  for (const a of A_TRANCHER) l.push(`| ${a.id} | ${c(a.question)} | ${c(a.reponsesPossibles)} | ${c(a.parDefaut)} | ${NOM_ETAT_AT[a.etat]} | ${c(a.sesMots ?? "")} | ${a.retour ?? ""} | ${c(a.aPreciser ?? "")} |`);
  l.push("", "## Ce que chaque réponse règle en données", "", "| Retour | Sur | Règles du socle | Paramètres posés | À préciser |", "|---|---|---|---|---|");
  for (const r of REPONSES_19_11) l.push(`| ${r.id} | ${c(r.sur)} | ${Object.keys(r.regles).join(", ")} | ${c(Object.entries(r.parametres).map(([k, v]) => `\`${k}\` = ${v.valeur}`).join(" ; "))} | ${c(r.aPreciser ?? "")} |`);
  l.push("", "## Les conflits relevés et ce qui les départage", "", "| # | Règles | Conflit | Tenu par | Arbitrage |", "|---|---|---|---|---|",
    ...CONFLITS.map((x) => `| ${x.id} | ${x.regles.join(", ")} | ${c(x.quoi)} | ${x.resolution}${x.retour ? ` (${x.retour})` : ""} | ${c(x.arbitrage)} |`), "");
  return l.join("\n");
}

export const FICHIERS_DOC_SOCLE: readonly { chemin: string; texte: () => string }[] = [
  { chemin: `${DOCS_SOCLE}/PARAMETRES.md`, texte: texteParametres },
  { chemin: `${DOCS_SOCLE}/INFORMATIONS-TABLE.md`, texte: texteInformations },
  { chemin: `${DOCS_SOCLE}/QUESTIONS-TABLE.md`, texte: texteQuestions },
  { chemin: `${DOCS_SOCLE}/A-TRANCHER.md`, texte: texteATrancher },
];

if (process.argv[1]?.endsWith("socle-doc.ts")) {
  for (const f of FICHIERS_DOC_SOCLE) { writeFileSync(join(process.cwd(), f.chemin), f.texte()); console.log(`${f.chemin} écrit`); }
}
