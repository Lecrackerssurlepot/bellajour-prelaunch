/**
 * L'IMPORT DU SOCLE (19/11, T-219) : du socle écrit hors git aux données et aux documents du dépôt.
 *
 *     npx tsx --tsconfig tsconfig.json scripts/socle-import.ts [--depuis <dossier du socle>]
 *
 * Lit (lecture seule) `design-explorations/tunnel-2026-11-17/socle/` : `regles.json` (1 234 règles et leur état d'intégration),
 * `parametres.json`, `outils/informations.json`, `outils/arbitrages.json`, `12-QUESTIONS-PARAMETRES.md` (tables des paramètres
 * transverses, des profils, des thèmes, des curseurs et des écoles) et les documents 10, 11, 12, 13, 30, 32.
 * Applique : le NETTOYAGE M-01 (aucun client, projet, lieu d'un magazine de test ni numéro de photo : les magazines de référence sont
 * nommés par leur profil), les arbitrages de l'intégration et les réponses de Mathias (`regles/socle/decisions.ts`).
 * Écrit : `src/lib/mise-en-page/regles/socle/genere/{regles,parametres,informations,profils}.ts` et les copies nettoyées
 * `docs/moteur/tunnel/socle/{PROCESSUS,INFORMATIONS,QUESTIONS-PARAMETRES,ENTRAINEMENT,INTEGRATION,AVIS}.md`. Rien d'autre.
 * Rejouable à l'identique : le harnais (`verif-mep-socle.ts`) rejoue l'import quand le socle est sur la machine et compare à l'octet.
 * Sans base, sans réseau, sans IA.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { regleParId } from "@/lib/mise-en-page/regles/registre";
import { REGLAGES } from "@/lib/mise-en-page/editeur/reglages";
import { REGLES_COMPO, REGLES_POSE, REGLES_V2 } from "@/lib/mise-en-page/compositeur/reglagesCompositeur";
import { ARBITRAGES_INTEGRATION, PARAMETRES_ARBITRES, REPONSES_19_11 } from "@/lib/mise-en-page/regles/socle/decisions";
import { QUESTIONS_SOCLE } from "@/lib/mise-en-page/regles/socle/questions";
import { decideDe, sensDe } from "@/lib/mise-en-page/regles/socle/conflits";
import { LIBELLES_INFO, libelleDe } from "@/lib/mise-en-page/regles/socle/libelles";
import {
  MOTEURS, MOTEUR_DU_PREFIXE, PRIORITES, PRIORITES_AVEC_REPLI, REPLI_A_ECRIRE, REPLI_CONTROLE, REPLI_PAR_DEFAUT,
  type EtatInfo, type EtatIntegration, type InformationSocle, type Moteur, type NiveauInfo, type ParametreSocle, type Priorite,
  type RegleSocle, type StatutParametre, type StatutSocle,
} from "@/lib/mise-en-page/regles/socle/types";
import { motsDuSocle } from "./regles-mots-interdits";

export const DOSSIER_GENERE = "src/lib/mise-en-page/regles/socle/genere";
export const DOSSIER_DOCS = "docs/moteur/tunnel/socle";
const SOCLE_RELATIF = "design-explorations/tunnel-2026-11-17/socle";

/** Le dossier du socle : `--depuis`, sinon en remontant depuis le dossier courant (un worktree est sous le dépôt principal). */
export function trouverSource(argv: readonly string[] = process.argv): string | null {
  const i = argv.indexOf("--depuis");
  if (i >= 0 && argv[i + 1]) return existsSync(join(argv[i + 1], "regles.json")) ? resolve(argv[i + 1]) : null;
  let d = process.cwd();
  for (let n = 0; n < 8; n++) {
    const c = join(d, SOCLE_RELATIF);
    if (existsSync(join(c, "regles.json"))) return c;
    const p = dirname(d);
    if (p === d) break;
    d = p;
  }
  return null;
}

/* ─────────────────────────── le nettoyage M-01 ─────────────────────────── */

type Sub = readonly [RegExp, string];
/** Un groupe de milliers qui commence par 0 (« 2 000 ») se colle (« 2000 ») : sinon il ressemble à un numéro de photo. */
const MILLIERS: Sub = [/(\d)[\u00a0\u202f ](0\d{2})(?!\d)/g, "$1$2"];
const NOMS: readonly Sub[] = [
  MILLIERS,
  [/\b(?:Joëlle|Joelle|Eloïse|Eloise|Klervie|Candice|Marjorie|Laraclette|Lara|Lulu|Merisa|Jeanne|Mathilde|Justine|Geffroy)\b/g, "le client"],
  [/\bAudencia\b/g, "une édition collective"],
  [/\b(?:Blue Elephant|Mutekiya|Boatshed|Galaxy)\b/g, "une enseigne"],
  [/\btorii\b/gi, "portique de temple"], [/\bdaruma\b/gi, "objet traditionnel"],
  [/\b(?:Tokyo|Kyoto|Osaka|Nara|Hiroshima|Hakone|Hatsukaichi|Sydney|Melbourne|Brisbane|Cairns|Madrid)\b/gi, "une ville"],
  [/\b(?:Miyajima|Uluru|Fuji)\b/g, "un site connu"],
  [/\b(?:Queensland|Hautes-Alpes)\b/g, "une région"],
  [/\b(?:Madère|Martinique|Antilles)\b/g, "un autre album"],
];
/** Dans le corps d'une règle, un pays de test devient « un pays ». */
const CORPS: readonly Sub[] = [
  ...NOMS,
  [/\bjaponais(e?s?)\b/gi, "local$1"], [/\b(?:Japon|Japan|Australie)\b/g, "un pays"],
  [/\bp\d{2}\b/g, "une double"],
];
/** Dans une source, une vérification ou un document, le magazine de référence est nommé par son profil. */
const REFERENCE: readonly Sub[] = [
  [/`?enquete-japon[^`\s|)]*`?/g, "l'enquête sur la réf. couple (hors dépôt)"],
  [/\[(?:AUS|AU)\]/g, "[réf. famille]"], [/\[(?:JAP|JP)\]/g, "[réf. couple]"], [/\[(?:AN|CL|VT|PRO|MQ|MV|RA|AC|MN)\]/g, "[réf. autre album]"],
  [/\bJAP-R\b/g, "réf. couple (rejeu)"], [/\b(?:JAP|JP)\b/g, "réf. couple"], [/\b(?:AUS|AU)\b/g, "réf. famille"],
  [/\b(?:Japon|Japan)\b/gi, "réf. couple"], [/\bAustralie\b/gi, "réf. famille"], [/\bjaponais(e?s?)\b/gi, "local$1"],
  [/\b(\d{2,3})\/(\d{3})\b/g, "$1 sur $2"],
  ...NOMS,
  [/\bp\d{2}\b/g, "une double"],
  [/\bIMG[_-]?\d+/gi, "une photo"],
  [/\bphotos? (?:n° ?)?\d{2,4}(?:\s*(?:,|et|à|\/)\s*\d{2,4})*\b(?![:,])/gi, "des photos"],
  [/(?<![\d,.\-:/h°A-Za-z#])(?<!h )0\d(?:\s*(?:,|et|à)\s*\d{1,3})+(?![\d,.:/h%\-])/g, "quelques photos"],
  [/(?<![\d,.\-:/h°A-Za-z#])(?<!h )0\d(?![\d,.:/h%\-])/g, "une photo"],
];
/** Dans un document : un numéro d'information ou de paramètre écrit sans son préfixe le reprend (« 028 » → « INFO-028 »). */
const PREFIXE_DOC: Readonly<Record<string, string>> = { "11-INFORMATIONS.md": "INFO-", "12-QUESTIONS-PARAMETRES.md": "PARAM-TRV-" };
const appliquer = (t: string, subs: readonly Sub[]): string => subs.reduce((s, [m, r]) => s.replace(m, r), t);

export const nettoyerCorps = (t: string): string => appliquer(t, CORPS);
export const nettoyerReference = (t: string): string => appliquer(t, REFERENCE);
/** Une source ou une vérification encore sale après nettoyage est remplacée (jamais gardée sale). */
function referencePropre(t: string, repli: string): string {
  const n = nettoyerReference(t).replace(/\s+/g, " ").trim();
  return motsDuSocle(n).length ? repli : n;
}

/* ─────────────────────────── les fichiers bruts ─────────────────────────── */

type RegleBrute = {
  id: string; moteur: string; priorite: string; quand: string; alors: string; parametres: string; repli: string; profils: string;
  informations: string; source: string; verifiable: string; fichier: string; section: string; statut: string; params: string[];
  repli_present: boolean; integration: string; integration_note: string; integration_lien: string[];
};
type ParamBrut = { nom: string; valeurs: { regle: string; valeur: string }[]; regles: string[]; moteurs: string[]; moteur_principal: string; valeur_depart: string; synonyme_de?: string[]; nom_garde?: string; transverse?: string; transverse_definition?: string; meme_nom_deux_sens?: string };
type InfoBrute = { id: string; nom: string; niveau: string; definition: string; source: string; cout: string; fiabilite: string; lue_par_11: string; etat: string; lue_par_regles: string[]; produite_par_regles: string[] };
type Arbitrages = { regles: Record<string, { etat: string; avec: string[]; note: string }>; parametres_synonymes: { noms: string[]; garder: string; valeurs_divergent: boolean; note: string }[]; parametres_meme_nom: { nom: string; note: string }[] };

const lireJson = <T>(chemin: string): T => JSON.parse(readFileSync(chemin, "utf8")) as T;

/** Les lignes d'un tableau Markdown placé après un titre (cellules nettoyées des espaces). */
export function tableApres(md: string, titre: string): string[][] {
  const i = md.indexOf(titre);
  if (i < 0) throw new Error(`titre introuvable : ${titre}`);
  const lignes = md.slice(i).split("\n");
  const rangs: string[][] = [];
  let dans = false;
  for (const l of lignes.slice(1)) {
    if (l.startsWith("|")) { dans = true; rangs.push(l.slice(1, l.endsWith("|") ? -1 : undefined).split(" | ").map((c) => c.replace(/^\|?\s*|\s*\|?$/g, "").trim())); }
    else if (dans) break;
    else if (/^#{2,4} /.test(l)) break;
  }
  return rangs.filter((r) => !r.every((c) => /^[-|:\s]+$/.test(c))).slice(1);
}

/* ─────────────────────────── les règles ─────────────────────────── */

const ETAT_INTEGRATION: Readonly<Record<string, EtatIntegration>> = {
  "gardée": "gardee", "gardée, repli à écrire": "gardee", "doublon": "doublon", "à corriger": "a_corriger", "à trancher": "a_trancher",
  "dormante": "dormante", "morte": "morte",
};
const ID_REGISTRE = /\b(?:R-T-\d{2}|(?:M|S|C|F|N|DA|I)-\d{1,3}[a-z]?)\b/g;
const REPLI_VIDE = /^(?:sans objet|aucun|rien|—|-|)(?:\s*[:(].*)?$/i;

function repliDe(r: RegleBrute, moteur: Moteur, priorite: Priorite, aEcrire: boolean): string {
  const ecrit = r.repli.trim();
  if (r.repli_present && !REPLI_VIDE.test(ecrit)) return nettoyerCorps(ecrit);
  if (!PRIORITES_AVEC_REPLI.includes(priorite)) return ecrit ? nettoyerCorps(ecrit) : "aucun : règle dure";
  if (aEcrire) return REPLI_A_ECRIRE;
  return moteur === "Revérification" ? REPLI_CONTROLE : REPLI_PAR_DEFAUT;
}

function construireRegles(brutes: readonly RegleBrute[], alias: ReadonlyMap<string, string>, infosParRegle: ReadonlyMap<string, string[]>): RegleSocle[] {
  const confirmations = new Map<string, string[]>();
  for (const rep of REPONSES_19_11) for (const id of Object.keys(rep.regles)) confirmations.set(id, [...(confirmations.get(id) ?? []), rep.id]);
  const inconnues = [...Object.keys(ARBITRAGES_INTEGRATION), ...confirmations.keys()].filter((id) => !brutes.some((r) => r.id === id));
  if (inconnues.length) throw new Error(`décisions sur des règles inconnues : ${inconnues.join(", ")}`);

  return brutes.map((b): RegleSocle => {
    const moteur = MOTEUR_DU_PREFIXE[b.id.split("-")[0]];
    if (!moteur || moteur !== b.moteur) throw new Error(`${b.id} : moteur ${b.moteur} inattendu`);
    let priorite = b.priorite as Priorite;
    if (!PRIORITES.includes(priorite)) throw new Error(`${b.id} : priorité ${b.priorite}`);
    const aEcrire = b.integration === "gardée, repli à écrire";
    let etat = ETAT_INTEGRATION[b.integration];
    if (!etat) throw new Error(`${b.id} : intégration ${b.integration}`);
    let quand = nettoyerCorps(b.quand);
    let alors = nettoyerCorps(b.alors);
    let repli = repliDe(b, moteur, priorite, aEcrire);
    const notes: string[] = b.integration_note ? [nettoyerCorps(b.integration_note)] : [];
    const aPreciser: string[] = [];

    /* les registres cités dans la source : `reprend` (et `remplace` quand la source le dit) */
    const ids = [...new Set([...b.source.matchAll(ID_REGISTRE)].map((m) => m[0]))].filter((id) => regleParId(id));
    const remplace = ids.filter((id) => new RegExp(`remplace[^;.]*\\b${id.replace(/-/g, "\\-")}\\b`, "i").test(b.source));

    /* arbitrage de l'intégration, puis réponses de Mathias (qui priment) */
    const retouches = [ARBITRAGES_INTEGRATION[b.id], ...REPONSES_19_11.map((rep) => rep.regles[b.id])].filter((x) => x !== undefined);
    for (const t of retouches) {
      if (t.etat) etat = t.etat;
      if (t.priorite) priorite = t.priorite;
      if (t.quand) quand = t.quand;
      if (t.alors) alors = t.alors;
      if (t.repli) repli = t.repli;
      if (t.note) notes.push(t.note);
      if (t.aPreciser) aPreciser.push(t.aPreciser);
    }
    if (PRIORITES_AVEC_REPLI.includes(priorite) && /règle dure|^aucun/.test(repli)) repli = aEcrire ? REPLI_A_ECRIRE : (moteur === "Revérification" ? REPLI_CONTROLE : REPLI_PAR_DEFAUT);

    /* le statut, honnête : Mathias seulement pour ce qu'il a dit ; codee seulement si une règle reprise est codée au dépôt */
    const mCites = ids.filter((id) => /^M-/.test(id) && regleParId(id)?.statut === "confirmee_mathias");
    const confirmePar = [...new Set([...(confirmations.get(b.id) ?? []), ...(b.statut === "validée" ? mCites : [])])].sort();
    const codees = ids.filter((id) => regleParId(id)?.statut === "codee" && regleParId(id)?.controle);
    let statut: StatutSocle = "hypothese";
    if (confirmePar.length) statut = "confirmee_mathias";
    else if (codees.length) statut = "codee";
    if (b.statut === "validée" && !confirmePar.length) notes.push("marquée « VALIDÉE » par l'auteur sans retour M-… cité : reste une hypothèse");

    const parametres = [...new Set(b.params.map((p) => alias.get(p) ?? p))].sort();
    return {
      id: b.id, moteur, priorite, quand, alors,
      parametresTexte: nettoyerCorps(b.parametres), parametres, repli, repliAEcrire: aEcrire && repli === REPLI_A_ECRIRE,
      profils: nettoyerCorps(b.profils), informationsTexte: nettoyerCorps(b.informations), informations: infosParRegle.get(b.id) ?? [],
      source: referencePropre(b.source, "socle (source détaillée hors dépôt, M-01)"),
      verification: referencePropre(b.verifiable, "sur un magazine de référence (détail hors dépôt, M-01)"),
      statut, ...(confirmePar.length ? { confirmePar } : {}),
      ...(statut === "codee" ? { controle: regleParId(codees[0])?.controle as string } : {}),
      etat, ...(etat === "doublon" && b.integration_lien[0] ? { doublonDe: b.integration_lien[0] } : {}),
      reprend: ids, remplace, note: notes.join(" ; "), ...(aPreciser.length ? { aPreciser: aPreciser.join(" ; ") } : {}),
      decide: decideDe(alors), sens: sensDe(alors), lot: b.fichier.replace(/^\d+-/, ""), section: nettoyerCorps(b.section),
    };
  });
}

/* ─────────────────────────── les paramètres ─────────────────────────── */

const CODE: readonly [string, Readonly<Record<string, unknown>>][] = [
  ["editeur/reglages.ts#", REGLAGES], ["compositeur/reglagesCompositeur.ts#REGLES_COMPO.", REGLES_COMPO],
  ["compositeur/reglagesCompositeur.ts#REGLES_POSE.", REGLES_POSE], ["compositeur/reglagesCompositeur.ts#REGLES_V2.", REGLES_V2],
];
/** Les correspondances qui ne se lisent pas au nom (relues à la main dans le code le 19/11). */
const CODE_A_LA_MAIN: Readonly<Record<string, string>> = {
  seuil_ppp_pleine: "compositeur/reglagesCompositeur.ts#REGLES_COMPO.PLEINE_MIN_DPI",
  seuil_ppp_double: "editeur/reglages.ts#definition_double_ppp",
  ppp_plancher: "compositeur/reglagesCompositeur.ts#REGLES_V2.INIMPRIMABLE_DPI",
  densite_plafond: "compositeur/reglagesCompositeur.ts#PARAMETRES_PROFIL.plafond",
  densite_visee: "compositeur/reglagesCompositeur.ts#PARAMETRES_PROFIL.moyenne",
  part_pleines_pages: "compositeur/reglagesCompositeur.ts#PARAMETRES_PROFIL.pleines",
  pages_min_vendues: "compositeur/reglagesCompositeur.ts#REGLES_V2.VENDABLE_MIN",
  pages_max_vendues: "compositeur/reglagesCompositeur.ts#REGLES_V2.VENDABLE_MAX",
  entorses_max: "compositeur/reglagesCompositeur.ts#REGLES_V2.ENTORSES_NORMAL",
  personnes_max_double: "compositeur/reglagesCompositeur.ts#REGLES_V2.PERSONNES_MAX_DOUBLE",
  page_presque_vide: "compositeur/reglagesCompositeur.ts#REGLES_POSE.OCCUPATION_MIN",
  occupation_min: "editeur/reglages.ts#page_occupee_min",
};

function codeDe(nom: string, alias: readonly string[]): string | undefined {
  if (CODE_A_LA_MAIN[nom]) return CODE_A_LA_MAIN[nom];
  for (const n of [nom, ...alias]) for (const [prefixe, objet] of CODE) {
    const cle = Object.keys(objet).find((k) => k.toLowerCase() === n.toLowerCase());
    if (cle) return `${prefixe}${cle}`;
  }
  return undefined;
}

function statutParametre(valeur: string): StatutParametre {
  if (/à préciser/i.test(valeur)) return "a_preciser";
  if (/à mesurer|non mesur|provisoire|imprimeur|à fixer|inconnu/i.test(valeur)) return "a_mesurer";
  return "reglage_depart";
}
const sourceDe = (valeur: string): string => {
  const p = [...valeur.matchAll(/\(([^()]*)\)/g)].map((m) => m[1]).filter((s) => !/réglage de départ|^RD$/i.test(s));
  return p.length ? nettoyerReference(p.join(" ; ")) : /\bRD\b|réglage de départ/i.test(valeur) ? "réglage de départ du socle" : "socle (valeur de l'auteur)";
};


function construireParametres(brutes: readonly ParamBrut[], arb: Arbitrages, regles: readonly RegleSocle[], profils: Readonly<Record<string, Readonly<Record<string, string>>>>, transverses: ReadonlyMap<string, { regle: string; plage: string; moteurs: string; source: string }>): { parametres: ParametreSocle[]; alias: Map<string, string> } {
  const alias = new Map<string, string>();
  for (const g of arb.parametres_synonymes) for (const n of g.noms) if (n !== g.garder) alias.set(n, g.garder);
  for (const p of brutes) if (p.nom_garde && p.nom_garde !== p.nom && !alias.has(p.nom)) alias.set(p.nom, p.nom_garde);
  /* une chaîne d'alias se résout jusqu'au nom gardé */
  const garde = (n: string): string => { let x = n; for (let i = 0; i < 6 && alias.has(x); i++) x = alias.get(x) as string; return x; };
  for (const k of [...alias.keys()]) alias.set(k, garde(k));

  const groupes = new Map<string, ParamBrut[]>();
  for (const p of brutes) { const g = garde(p.nom); (groupes.get(g) ?? groupes.set(g, []).get(g) as ParamBrut[]).push(p); }
  const divergents = new Map(arb.parametres_synonymes.map((g) => [g.garder, g] as const));
  const deuxSens = new Map(arb.parametres_meme_nom.map((g) => [g.nom, g.note] as const));
  const citants = new Map<string, Set<string>>();
  for (const r of regles) for (const p of r.parametres) (citants.get(p) ?? citants.set(p, new Set()).get(p) as Set<string>).add(r.id);

  const sortie: ParametreSocle[] = [];
  for (const [nom, membres] of [...groupes].sort(([a], [b]) => a.localeCompare(b))) {
    const tete = membres.find((m) => m.nom === nom) ?? membres[0];
    const autres = [...new Set(membres.map((m) => m.nom).filter((n) => n !== nom))].sort();
    for (const [a, g] of alias) if (g === nom && !autres.includes(a)) autres.push(a);
    autres.sort();
    const moteurs = [...new Set(membres.flatMap((m) => m.moteurs).filter((m): m is Moteur => (MOTEURS as readonly string[]).includes(m)))];
    const moteur = (MOTEURS as readonly string[]).includes(tete.moteur_principal) ? tete.moteur_principal as Moteur : (moteurs[0] ?? "Lecture");
    const tr = transverses.get(nom) ?? autres.map((a) => transverses.get(a)).find(Boolean);
    const valeurs = [...new Set(membres.flatMap((m) => m.valeurs.filter((v) => !/^PARAM-/.test(v.regle)).map((v) => `${v.regle} : ${nettoyerCorps(v.valeur)}`)))];
    const distinctes = new Set(membres.flatMap((m) => m.valeurs.map((v) => v.valeur.replace(/\s*\(.*$/, "").trim())));
    const g = divergents.get(nom);
    const variantes = g?.valeurs_divergent || distinctes.size > 1 ? valeurs : undefined;
    const exemple = regles.find((r) => (citants.get(nom) ?? new Set()).has(r.id));
    const regle = tr?.regle ?? (exemple ? `lu par ${exemple.id} : ${exemple.alors.length > 160 ? `${exemple.alors.slice(0, 157)}…` : exemple.alors}` : "lu par aucune règle (paramètre de l'auteur)");
    const valeur = nettoyerCorps(tete.valeur_depart || "non écrite");
    const parProfil = profils[nom] ?? autres.map((a) => profils[a]).find(Boolean);
    const notes = [g ? nettoyerCorps(g.note) : "", deuxSens.get(nom) ? `même nom, deux sens : ${nettoyerCorps(deuxSens.get(nom) as string)}` : ""].filter(Boolean);
    sortie.push({
      nom, alias: autres, moteur, moteurs: moteurs.length ? moteurs : [moteur], regle: nettoyerCorps(regle), valeur,
      ...(parProfil ? { parProfil } : {}), plage: tr?.plage ? nettoyerCorps(tr.plage) : "non écrite",
      source: tr?.source ? nettoyerReference(tr.source) : sourceDe(tete.valeur_depart), statut: statutParametre(valeur),
      regles: [...(citants.get(nom) ?? [])].sort(), transverse: !!(tete.transverse || tr),
      ...(codeDe(nom, autres) ? { code: codeDe(nom, autres) } : {}), ...(variantes && variantes.length > 1 ? { variantes } : {}),
      note: notes.join(" ; "),
    });
  }

  /* les paramètres qu'une règle cite sans fiche, ceux des questions et des réponses de Mathias : jamais un nom sans fiche */
  const ajouter = (nom: string, valeur: string, regle: string, source: string, statut: StatutParametre): void => {
    if (sortie.some((p) => p.nom === nom) || alias.has(nom)) return;
    sortie.push({ nom, alias: [], moteur: "Lecture", moteurs: ["Lecture"], regle, valeur, plage: "non écrite", source, statut, regles: [...(citants.get(nom) ?? [])].sort(), transverse: true, ...(codeDe(nom, []) ? { code: codeDe(nom, []) } : {}), note: "fiche créée à l'import" });
  };
  for (const [nom] of citants) ajouter(nom, "non écrite", "cité par une règle sans fiche de l'auteur", "socle", "a_preciser");
  for (const rep of REPONSES_19_11) for (const [nom, v] of Object.entries(rep.parametres)) ajouter(garde(nom), v.valeur, `posé par la réponse de Mathias (${rep.id}, ${rep.sur})`, rep.id, "valide");
  for (const q of QUESTIONS_SOCLE) for (const r of q.reponses) for (const e of r.effets) ajouter(garde(e.parametre), "selon la réponse", `réglé par la question ${q.id}`, `question ${q.id}`, "reglage_depart");

  /* les valeurs tranchées : l'intégration d'abord, Mathias ensuite (il prime) */
  for (const [nom, v] of Object.entries(PARAMETRES_ARBITRES)) {
    const p = sortie.find((x) => x.nom === garde(nom));
    if (!p) throw new Error(`arbitrage sur un paramètre inconnu : ${nom}`);
    Object.assign(p, { valeur: v.valeur, note: [p.note, v.note].filter(Boolean).join(" ; "), statut: statutParametre(v.valeur) });
  }
  for (const rep of REPONSES_19_11) for (const [nom, v] of Object.entries(rep.parametres)) {
    const p = sortie.find((x) => x.nom === garde(nom)) as ParametreSocle;
    Object.assign(p, { valeur: v.valeur, confirmePar: rep.id, statut: /à préciser/i.test(v.valeur) || v.note?.includes("à préciser") ? "a_preciser" : "valide", note: [p.note, `${rep.id} : ${rep.mots}`, v.note].filter(Boolean).join(" ; ") });
  }
  sortie.sort((a, b) => a.nom.localeCompare(b.nom));
  return { parametres: sortie, alias };
}

/* ─────────────────────────── les informations ─────────────────────────── */

const NIVEAU: Readonly<Record<string, NiveauInfo>> = { Ph: "photo", En: "ensemble", Pr: "projet", "Ré": "reponse" };
function etatInfo(e: string): EtatInfo {
  const x = e.replace(/\*/g, "");
  if (/^OU/.test(x)) return "obtenue_utilisee";
  if (/^(ONU|RET)/.test(x)) return "obtenue_gardee";
  return "pas_obtenue";
}

/** Les deux informations nées de la réponse M-37 (la part d'un sujet dit un profil). */
const INFOS_19_11: readonly InfoBrute[] = [
  { id: "INFO-150", nom: "part_par_sujet", niveau: "Pr", definition: "part du lot de chaque sujet lu (personnes, paysage, lieu, plat, objet, animal, document) · 0 à 1 par sujet", source: "DED", cout: "0", fiabilite: "celle du sujet lu par photo (INFO-046)", lue_par_11: "REC : un sujet très présent reste dans l'histoire (M-37) ; profil", etat: "PO (nouvelle, M-37)", lue_par_regles: ["REC-092"], produite_par_regles: [] },
  { id: "INFO-151", nom: "profil_de_sujets", niveau: "Pr", definition: "le profil que dit la part des sujets (gens, paysages, plats…) · le sujet dominant ou aucun", source: "DED", cout: "0", fiabilite: "non mesurée", lue_par_11: "profil, à l'atelier d'abord (M-37)", etat: "PO (nouvelle, M-37)", lue_par_regles: [], produite_par_regles: [] },
];

function valeursDe(definition: string): string[] {
  const i = definition.lastIndexOf(" · ");
  if (i < 0) return [];
  return definition.slice(i + 3).split(/\s*(?:,|;| \/ )\s*/).map((v) => v.trim()).filter(Boolean);
}

/** Un numéro d'information écrit sans son préfixe le reprend (« 028 » → « INFO-028 »). */
const avecInfo = (t: string): string => t.replace(/(^|[^\d,.\-A-Za-z])(0\d{2})(?![\d,.])/g, "$1INFO-$2");

function construireInformations(brutes: readonly InfoBrute[], regles: readonly RegleSocle[]): InformationSocle[] {
  const moteurDe = new Map(regles.map((r) => [r.id, r.moteur] as const));
  return [...brutes, ...INFOS_19_11].map((b): InformationSocle => {
    const etatAuteur = b.etat.replace(/\*/g, "");
    const etat = etatInfo(etatAuteur);
    const lue = b.lue_par_regles.filter((id) => moteurDe.has(id));
    const nom = b.nom.replace(/,\s*/g, "_").trim();
    const note = [
      etat === "obtenue_gardee" ? "gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage)" : "",
      /^BANC/.test(etatAuteur) ? "calculée au banc seulement, absente de l'éditeur et du compositeur" : "",
      /faux/.test(etatAuteur) ? "obtenue mais FAUSSE à ce jour (voir INFORMATIONS.md)" : "",
      /partiel/.test(etatAuteur) ? "obtenue en partie" : "",
      nettoyerReference(avecInfo(b.lue_par_11)),
    ].filter(Boolean).join(" ; ");
    return {
      id: b.id, nom, libelle: LIBELLES_INFO[nom] ?? libelleDe(nom), niveau: NIVEAU[b.niveau] ?? "photo", definition: nettoyerCorps(avecInfo(b.definition)),
      valeurs: valeursDe(nettoyerCorps(avecInfo(b.definition))).map((v) => ({ valeur: v, libelle: libelleDe(v) })),
      source: avecInfo(b.source), cout: b.cout || "non écrit", fiabilite: referencePropre(b.fiabilite || "non mesurée", "mesurée sur les magazines de référence (détail hors dépôt, M-01)"),
      moteurs: [...new Set(lue.map((id) => moteurDe.get(id) as Moteur))].sort((x, y) => MOTEURS.indexOf(x) - MOTEURS.indexOf(y)),
      lueParRegles: lue, produiteParRegles: b.produite_par_regles.filter((id) => moteurDe.has(id)), etat, etatAuteur, note,
    };
  });
}

/* ─────────────────────────── les profils, thèmes, curseurs, écoles ─────────────────────────── */

const CODES_PROFIL = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;
const CLE_PROFIL: Readonly<Record<string, string>> = { P1: "long_voyage_famille", P2: "fete_entre_jeunes", P3: "couple", P4: "evenement", P5: "annee_de_vie", P6: "sejour_court" };

function construireProfils(md: string) {
  const table = tableApres(md, "### 3.4 Ce que règle chaque profil");
  const entetes = ["P1 long voyage", "P2 vacances festives", "P3 couple", "P4 événement", "P5 année de vie", "P6 séjour court"];
  const parParametre: Record<string, Record<string, string>> = {};
  const regle: Record<string, Record<string, string>> = Object.fromEntries(CODES_PROFIL.map((c) => [c, {}]));
  for (const l of table) {
    const nom = l[0].replace(/\s*\(.*\)\s*$/, "").replace(/ \/ .*$/, "").trim().replace(/\s+/g, "_");
    parParametre[nom] = {};
    CODES_PROFIL.forEach((c, i) => { const v = nettoyerCorps(l[i + 1] ?? ""); parParametre[nom][c] = v; regle[c][nom] = v; });
  }
  const reco = tableApres(md, "### 3.2 Reconnaître le profil");
  const profils = CODES_PROFIL.map((c, i) => ({
    code: c, cle: CLE_PROFIL[c], nom: entetes[i].replace(/^P\d /, ""),
    reconnaissance: reco.filter((l) => l[2].startsWith(c)).map((l) => `ordre ${l[0]} : ${nettoyerCorps(l[1])}`).join(" ; ") || "par défaut",
    regle: regle[c],
  }));
  const themes = tableApres(md, "### 3.3 Reconnaître le thème").map((l) => ({ cle: l[1], si: nettoyerCorps(l[0]), decoupe: nettoyerCorps(l[2]), nomDuChapitre: nettoyerCorps(l[3]), source: nettoyerReference(l[4]) }));
  const curseurs = tableApres(md, "### 4.1 Les neuf curseurs").map((l) => ({ cle: l[0], de: l[1], a: l[2], place: l[3].replace(/`/g, ""), regles: l[4] }));
  const noms = ["Densité", "Rythme", "Couleur", "Typo", "Récit", "Sujet", "Texte", "Ton", "Finition"];
  const ecoles = tableApres(md, "### 4.2 Les huit écoles").map((l) => ({ atelier: l[0], client: l[1], marquants: l[2], curseurs: Object.fromEntries(noms.map((n, i) => [n, Number((l[3 + i] ?? "").replace(",", "."))])) }));
  const modificateurs = [
    { cle: "gros_lot", si: "au moins `gros_lot_seuil` photos", decale: "exigence du tri vers exclusif d'un cran ; planches de lecture plus denses" },
    { cle: "fete", si: "des moments de fête dans un autre profil", decale: "noir et blanc proposé une double sur 3 ; fonds noirs teintés la nuit" },
    { cle: "sans_date", si: "15 à 40 % de photos sans date", decale: "placement par ressemblance ; les doutes « où va cette photo » d'abord" },
  ];
  return { profils, themes, curseurs, ecoles, modificateurs, parParametre };
}

function transversesDe(md: string): Map<string, { regle: string; plage: string; moteurs: string; source: string }> {
  const m = new Map<string, { regle: string; plage: string; moteurs: string; source: string }>();
  const i = md.indexOf("### 1.3 Les paramètres transverses");
  const j = md.indexOf("## 2. Les questions");
  for (const l of md.slice(i, j).split("\n")) {
    const c = l.split(" | ").map((x) => x.replace(/^\|\s*|\s*\|$/g, "").trim());
    if (!/^PARAM-TRV-\d{3}$/.test(c[0] ?? "")) continue;
    m.set(c[1].replace(/`/g, ""), { regle: c[2], plage: c[4], moteurs: c[3], source: c[7] ?? "" });
  }
  return m;
}

/* ─────────────────────────── l'écriture ─────────────────────────── */

const ENTETE = (quoi: string): string => `/**
 * FICHIER GÉNÉRÉ par \`scripts/socle-import.ts\`, NE PAS ÉDITER : ${quoi}
 * Source : le socle du 19/11 (hors git), nettoyé (M-01), arbitrages et réponses de Mathias appliqués (\`../decisions.ts\`).
 */
`;
const ligneJson = (x: unknown): string => `  ${JSON.stringify(x)},`;
const TAILLE_PAQUET = 100;
const paquets = <T>(xs: readonly T[]): T[][] => Array.from({ length: Math.ceil(xs.length / TAILLE_PAQUET) }, (_, i) => xs.slice(i * TAILLE_PAQUET, (i + 1) * TAILLE_PAQUET));

function texteRegles(regles: readonly RegleSocle[]): string {
  return `${ENTETE("les 1 234 règles du socle, une par ligne.")}
import type { RegleSocle } from "../types";

${paquets(regles).map((p, i) => `const R${i}: readonly RegleSocle[] = [\n${p.map(ligneJson).join("\n")}\n];`).join("\n\n")}

/* par paquets de ${TAILLE_PAQUET} : un seul tableau de 1 234 objets dépasse ce que le compilateur sait typer */
export const REGLES_SOCLE: readonly RegleSocle[] = [${paquets(regles).map((_, i) => `...R${i}`).join(", ")}];
`;
}
function texteParametres(p: readonly ParametreSocle[]): string {
  return `${ENTETE("les paramètres du socle, les noms en double fusionnés (alias gardés).")}
import type { ParametreSocle } from "../types";

export const PARAMETRES_SOCLE: readonly ParametreSocle[] = [
${p.map(ligneJson).join("\n")}
];
`;
}
function texteInformations(i: readonly InformationSocle[]): string {
  return `${ENTETE("les informations du socle et leur libellé d'atelier.")}
import type { InformationSocle } from "../types";

export const INFORMATIONS_SOCLE: readonly InformationSocle[] = [
${i.map(ligneJson).join("\n")}
];
`;
}
function texteProfils(x: ReturnType<typeof construireProfils>): string {
  return `${ENTETE("les profils, thèmes, modificateurs, curseurs et écoles (QUESTIONS-PARAMETRES §3 et §4).")}
import type { CurseurSocle, EcoleSocle, ModificateurSocle, ProfilSocle, ThemeSocle } from "../types";

export const PROFILS_SOCLE: readonly ProfilSocle[] = [
${x.profils.map(ligneJson).join("\n")}
];

export const THEMES_SOCLE: readonly ThemeSocle[] = [
${x.themes.map(ligneJson).join("\n")}
];

export const MODIFICATEURS_SOCLE: readonly ModificateurSocle[] = [
${x.modificateurs.map(ligneJson).join("\n")}
];

export const CURSEURS_SOCLE: readonly CurseurSocle[] = [
${x.curseurs.map(ligneJson).join("\n")}
];

export const ECOLES_SOCLE: readonly EcoleSocle[] = [
${x.ecoles.map(ligneJson).join("\n")}
];
`;
}

/** Les documents copiés, et ce que les réponses du 19/11 y changent (dit en tête, le texte de l'auteur gardé). */
const DOCS: readonly { de: string; vers: string; maj: readonly string[] }[] = [
  { de: "10-PROCESSUS.md", vers: "PROCESSUS.md", maj: [
    "§1 principe 2 (« une information lue par aucune décision est retirée ») est REMPLACÉ par M-56 : toute information lue est gardée pour l'atelier.",
    "Le cercle Mise en page ↔ Habillage (trou T1) est coupé dans les contrats : l'Habillage annonce les textes AVANT la Mise en page (6a), les écrit APRÈS (6b) : `src/lib/mise-en-page/moteurs/contrats.ts`.",
    "La correction de l'atelier face à P0 et P1 : il ne force pas une faute (M-46).",
  ] },
  { de: "11-INFORMATIONS.md", vers: "INFORMATIONS.md", maj: [
    "Les états ONU et RET deviennent « obtenue, gardée pour l'atelier » (M-56) ; la liste (a) ne retire plus rien.",
    "Deux informations nées de M-37 : INFO-150 (la part de chaque sujet dans le lot) et INFO-151 (le profil que disent les sujets).",
    "Chaque information et chaque valeur a un libellé d'atelier (M-57) : `INFORMATIONS-TABLE.md` (généré).",
  ] },
  { de: "12-QUESTIONS-PARAMETRES.md", vers: "QUESTIONS-PARAMETRES.md", maj: [
    "Q-C04 (l'occasion) se lit dans le dossier, jamais une question de plus (M-54) ; Q-C09 est retirée (M-55).",
    "Q-A08 à Q-A13 sont tranchées (M-42, M-38, M-35, M-36, M-45, M-40) ; la question « un couple reste couple » reste ouverte (il ne l'a pas comprise).",
    "Les tables de cette page sont en données : `QUESTIONS-TABLE.md` et `PARAMETRES.md` (générés).",
  ] },
  { de: "13-ENTRAINEMENT.md", vers: "ENTRAINEMENT.md", maj: ["Les quatre questions de la fin (§10) sont l'annexe A-40 et A-41 de `A-TRANCHER.md`, sans réponse : valeur par défaut, non validée."] },
  { de: "30-INTEGRATION.md", vers: "INTEGRATION.md", maj: [
    "Les arbitrages de ce fichier sont appliqués aux données (`regles/socle/decisions.ts`) ; les conflits que Mathias a tranchés le 19/11 (B1, B5, B6, B11, B15, B20 à B24) portent son retour.",
  ] },
  { de: "32-AVIS.md", vers: "AVIS.md", maj: [] },
];

function texteDoc(md: string, de: string, maj: readonly string[]): string {
  const prefixe = PREFIXE_DOC[de];
  const avecPrefixes = prefixe ? md.replace(/(^|[^\d,.\-A-Za-z])(0\d{2})(?![\d,.])/g, `$1${prefixe}$2`) : md;
  const propre = nettoyerReference(avecPrefixes).replace(/\s*Hors git\.?/g, "");
  const tete = [
    `> **Copie nettoyée (M-01) de \`${de}\` du socle du 19/11**, écrite par \`scripts/socle-import.ts\` : ne pas éditer à la main.`,
    "> Les magazines de référence y sont nommés par leur profil (« réf. couple », « réf. famille »). Les règles vivent en données",
    "> (`src/lib/mise-en-page/regles/socle/`) ; les réponses de Mathias du 19/11 sont dans `A-TRANCHER.md` (M-35 à M-57).",
    ...(maj.length ? [">", "> **À jour des réponses du 19/11 :**", ...maj.map((m) => `> - ${m}`)] : []),
    "",
  ].join("\n");
  return `${tete}\n${propre.endsWith("\n") ? propre : `${propre}\n`}`;
}

export type Fichier = { chemin: string; texte: string };

/** L'import entier, sans rien écrire : la liste des fichiers et leur texte exact. */
export function importer(source: string): Fichier[] {
  const brutes = lireJson<RegleBrute[]>(join(source, "regles.json"));
  const params = lireJson<ParamBrut[]>(join(source, "parametres.json"));
  const infos = lireJson<InfoBrute[]>(join(source, "outils/informations.json"));
  const arb = lireJson<Arbitrages>(join(source, "outils/arbitrages.json"));
  const md12 = readFileSync(join(source, "12-QUESTIONS-PARAMETRES.md"), "utf8");

  const infosParRegle = new Map<string, string[]>();
  for (const i of [...infos, ...INFOS_19_11]) for (const r of i.lue_par_regles) infosParRegle.set(r, [...(infosParRegle.get(r) ?? []), i.id]);
  /* les alias d'abord (sans les règles), puis les règles, puis les paramètres avec les règles qui les citent */
  const { alias } = construireParametres(params, arb, [], {}, new Map());
  const regles = construireRegles(brutes, alias, infosParRegle);
  const pr = construireProfils(md12);
  const { parametres } = construireParametres(params, arb, regles, pr.parParametre, transversesDe(md12));
  const informations = construireInformations(infos, regles);

  const fichiers: Fichier[] = [
    { chemin: `${DOSSIER_GENERE}/regles.ts`, texte: texteRegles(regles) },
    { chemin: `${DOSSIER_GENERE}/parametres.ts`, texte: texteParametres(parametres) },
    { chemin: `${DOSSIER_GENERE}/informations.ts`, texte: texteInformations(informations) },
    { chemin: `${DOSSIER_GENERE}/profils.ts`, texte: texteProfils(pr) },
  ];
  for (const d of DOCS) fichiers.push({ chemin: `${DOSSIER_DOCS}/${d.vers}`, texte: texteDoc(readFileSync(join(source, d.de), "utf8"), d.de, d.maj) });
  return fichiers;
}

if (process.argv[1]?.endsWith("socle-import.ts")) {
  const source = trouverSource();
  if (!source) { console.error(`Socle introuvable (${SOCLE_RELATIF}) : passer --depuis <dossier>.`); process.exit(1); }
  for (const f of importer(source)) {
    const chemin = join(process.cwd(), f.chemin);
    mkdirSync(dirname(chemin), { recursive: true });
    writeFileSync(chemin, f.texte);
    const sales = f.chemin.endsWith(".md") ? motsDuSocle(f.texte) : [];
    console.log(`${f.chemin} écrit${sales.length ? ` (RESTE À NETTOYER : ${[...new Set(sales)].slice(0, 12).join(", ")})` : ""}`);
  }
}
