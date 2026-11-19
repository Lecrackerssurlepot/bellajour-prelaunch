/**
 * Le harnais du SOCLE (19/11, T-219, D34), appelé par verif-atelier.ts :
 *
 *     npx tsx --tsconfig tsconfig.json scripts/verif-mep-socle.ts
 *
 * Ce qu'il tient (src/lib/mise-en-page/regles/socle/) :
 *   1. la forme : identifiants uniques et bien formés, moteur du préfixe, priorité P0 à P7, statut et état connus, format complet ;
 *   2. les replis : toute règle de P3 à P7 a un repli, ou est marquée « repli à écrire » ;
 *   3. les paramètres : tout paramètre cité existe (jamais un ancien nom), et chaque paramètre est cité ; les doubles sont fusionnés ;
 *      le réglage du code qu'on dit lui correspondre existe ;
 *   4. les informations : toute information lue par une règle existe, et l'inverse ; un libellé d'atelier clair pour chacune et chaque valeur ;
 *   5. M-01 : aucune donnée ni aucun document du socle ne nomme un client, un projet, un lieu d'un magazine de test ni un numéro de photo ;
 *   6. Mathias : chaque réponse du 19/11 de RETOURS-MATHIAS.md a sa trace en données ; une question tranchée n'est plus ouverte ;
 *      `confirmee_mathias` seulement avec un retour M-… ; `codee` seulement avec un contrôle relu ;
 *   7. l'import est rejouable à l'identique (quand le socle hors git est sur la machine) ; la doc générée est à jour ;
 *   8. LE TEST DES CONFLITS (forme simple, PROCESSUS §7.3 test a) : aucun rival non départagé ; le test voit un rival qu'on lui donne ;
 *   9. les contrats entre moteurs : le cercle Mise en page ↔ Habillage est coupé (annonce avant, écriture après).
 * Sans base, sans réseau, sans écriture.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  A_TRANCHER, CONFLITS, ETATS_INFO, ETATS_INTEGRATION, ETATS_QUESTION, ID_REGLE_SOCLE, INFORMATIONS_SOCLE, JARGON_INTERDIT, MOTEURS,
  MOTEUR_DU_PREFIXE, PARAMETRES_SOCLE, PARAMETRES_ARBITRES, PRIORITES, PRIORITES_AVEC_REPLI, PROFILS_SOCLE, QUESTIONS_SOCLE, REGLES_SOCLE,
  REPLI_A_ECRIRE, REPLI_CONTROLE, REPLI_PAR_DEFAUT, REPONSES_19_11, ROLES_ATELIER, STATUTS_PARAMETRE, STATUTS_SOCLE, THEMES_SOCLE,
  compter, informationParId, libelleDuRole, parametreParNom, regleSocleParId, rivaux, versionSocle, type RegleSocle,
} from "@/lib/mise-en-page/regles/socle";
import { regleParId } from "@/lib/mise-en-page/regles/registre";
import { REGLAGES } from "@/lib/mise-en-page/editeur/reglages";
import { ROLES_IA } from "@/lib/mise-en-page/editeur/lectureIA";
import { PARAMETRES_PROFIL, POIDS_ROLE, REGLES_COMPO, REGLES_POSE, REGLES_V2 } from "@/lib/mise-en-page/compositeur/reglagesCompositeur";
import { ORDRE_MOTEURS, type MoteurHabillage, type MoteurMiseEnPage } from "@/lib/mise-en-page/moteurs/contrats";
import { motsDuSocle } from "./regles-mots-interdits";
import { DOSSIER_DOCS, DOSSIER_GENERE, importer, trouverSource } from "./socle-import";
import { FICHIERS_DOC_SOCLE, texteRegistreSocle } from "./socle-doc";

type Rapporter = (nom: string, reussi: boolean) => void;
const RACINE = process.cwd();
const lire = (chemin: string): string => readFileSync(join(RACINE, chemin), "utf8");
const premiers = (xs: readonly string[], n = 8): string => (xs.length ? ` (${xs.slice(0, n).join(", ")}${xs.length > n ? `, … ${xs.length} en tout` : ""})` : "");
const REPLI_VIDE = /^(?:sans objet|aucun|rien|)$/i;
/** Un repli ÉCRIT par l'auteur (ni le repli par défaut, ni « à écrire », ni le message d'un contrôle). */
const repliEcrit = (r: RegleSocle): boolean => ![REPLI_PAR_DEFAUT, REPLI_A_ECRIRE, REPLI_CONTROLE].includes(r.repli) && !REPLI_VIDE.test(r.repli.trim());

function verifierForme(ok: Rapporter): void {
  const ids = REGLES_SOCLE.map((r) => r.id);
  const doublons = ids.filter((id, i) => ids.indexOf(id) !== i);
  ok(`socle : ${REGLES_SOCLE.length} règles, identifiants uniques${premiers(doublons)}`, REGLES_SOCLE.length === 1234 && doublons.length === 0);
  const mal = REGLES_SOCLE.filter((r) => !ID_REGLE_SOCLE.test(r.id) || MOTEUR_DU_PREFIXE[r.id.split("-")[0]] !== r.moteur).map((r) => r.id);
  ok(`socle : identifiants bien formés, moteur = celui du préfixe${premiers(mal)}`, mal.length === 0);
  const horsListe = REGLES_SOCLE.filter((r) => !MOTEURS.includes(r.moteur) || !PRIORITES.includes(r.priorite) || !STATUTS_SOCLE.includes(r.statut) || !ETATS_INTEGRATION.includes(r.etat)).map((r) => r.id);
  ok(`socle : moteur, priorité P0 à P7, statut et état d'intégration connus${premiers(horsListe)}`, horsListe.length === 0);
  const incomplet = REGLES_SOCLE.filter((r) => [r.quand, r.alors, r.repli, r.profils, r.source, r.verification, r.lot, r.section].some((x) => !x.trim()) || /—/.test(`${r.quand}${r.alors}`)).map((r) => r.id);
  ok(`socle : format complet (quand, alors, repli, profils, source, vérification, lot) et aucun cadratin dans quand / alors${premiers(incomplet)}`, incomplet.length === 0);
  const sansMoteur = MOTEURS.filter((m) => !REGLES_SOCLE.some((r) => r.moteur === m));
  ok(`socle : les sept moteurs ont leurs règles (${MOTEURS.map((m) => `${m} ${REGLES_SOCLE.filter((r) => r.moteur === m).length}`).join(", ")})`, sansMoteur.length === 0);
  const doublonsMal = REGLES_SOCLE.filter((r) => r.etat === "doublon" && (!r.doublonDe || !regleSocleParId(r.doublonDe) || regleSocleParId(r.doublonDe)?.etat === "doublon")).map((r) => r.id);
  ok(`socle : chaque doublon nomme la règle gardée, qui n'est pas elle-même un doublon${premiers(doublonsMal)}`, doublonsMal.length === 0);
}

function verifierReplis(ok: Rapporter): void {
  const sans = REGLES_SOCLE.filter((r) => PRIORITES_AVEC_REPLI.includes(r.priorite) && (REPLI_VIDE.test(r.repli.trim()) || /règle dure/.test(r.repli)) && !r.repliAEcrire).map((r) => r.id);
  ok(`replis : toute règle de P3 à P7 a un repli ou est marquée « ${REPLI_A_ECRIRE} »${premiers(sans)}`, sans.length === 0);
  const aEcrire = REGLES_SOCLE.filter((r) => r.repliAEcrire);
  ok(`replis : ${aEcrire.length} interdictions de P3 à P7 attendent leur repli (marquées, elles cèdent par défaut en attendant)`, aEcrire.every((r) => r.repli === REPLI_A_ECRIRE && PRIORITES_AVEC_REPLI.includes(r.priorite)));
}

function verifierParametres(ok: Rapporter): void {
  const noms = PARAMETRES_SOCLE.map((p) => p.nom);
  const enDouble = noms.filter((n, i) => noms.indexOf(n) !== i);
  const alias = PARAMETRES_SOCLE.flatMap((p) => p.alias);
  const aliasNom = alias.filter((a) => noms.includes(a) || alias.indexOf(a) !== alias.lastIndexOf(a));
  ok(`paramètres : ${PARAMETRES_SOCLE.length} noms uniques, ${alias.length} anciens noms fusionnés en alias, jamais un alias qui soit aussi un nom${premiers([...enDouble, ...aliasNom])}`, enDouble.length === 0 && aliasNom.length === 0 && alias.length >= 75);
  const fusionnes = PARAMETRES_SOCLE.filter((p) => p.alias.length > 0).length;
  ok(`paramètres : les groupes en double de l'intégration sont fusionnés sous un seul nom (${fusionnes} noms portent des alias)`, fusionnes >= 47);
  const citesInconnus = REGLES_SOCLE.flatMap((r) => r.parametres.filter((p) => !noms.includes(p)).map((p) => `${r.id} → ${p}${parametreParNom(p) ? " (alias)" : ""}`));
  ok(`paramètres : tout paramètre cité par une règle existe sous son nom gardé${premiers(citesInconnus)}`, citesInconnus.length === 0);
  const citants = new Map<string, Set<string>>();
  for (const r of REGLES_SOCLE) for (const p of r.parametres) (citants.get(p) ?? citants.set(p, new Set()).get(p) as Set<string>).add(r.id);
  const faux = PARAMETRES_SOCLE.filter((p) => [...(citants.get(p.nom) ?? [])].sort().join() !== [...p.regles].sort().join()).map((p) => p.nom);
  ok(`paramètres : la liste des règles de chaque paramètre est exactement celle des règles qui le citent${premiers(faux)}`, faux.length === 0);
  const ailleurs = new Set<string>([
    ...QUESTIONS_SOCLE.flatMap((q) => q.reponses.flatMap((r) => r.effets.map((e) => e.parametre))),
    ...REPONSES_19_11.flatMap((r) => Object.keys(r.parametres)), ...Object.keys(PARAMETRES_ARBITRES),
    ...CONFLITS.flatMap((c) => c.parametres ?? []), ...PROFILS_SOCLE.flatMap((p) => Object.keys(p.regle)),
  ].map((n) => parametreParNom(n)?.nom ?? n));
  const orphelins = PARAMETRES_SOCLE.filter((p) => !p.regles.length && !p.transverse && !ailleurs.has(p.nom)).map((p) => p.nom);
  ok(`paramètres : chaque paramètre est lu par une règle, une question, une réponse ou un profil, ou est transverse${premiers(orphelins)}`, orphelins.length === 0);
  const horsStatut = PARAMETRES_SOCLE.filter((p) => !STATUTS_PARAMETRE.includes(p.statut) || !p.valeur.trim() || !p.regle.trim() || !p.source.trim()).map((p) => p.nom);
  ok(`paramètres : nom, ce qu'il règle, valeur, source et statut écrits${premiers(horsStatut)}`, horsStatut.length === 0);
  const objets: Record<string, Readonly<Record<string, unknown>>> = {
    "editeur/reglages.ts": REGLAGES, "compositeur/reglagesCompositeur.ts#REGLES_COMPO": REGLES_COMPO, "compositeur/reglagesCompositeur.ts#REGLES_POSE": REGLES_POSE,
    "compositeur/reglagesCompositeur.ts#REGLES_V2": REGLES_V2, "compositeur/reglagesCompositeur.ts#PARAMETRES_PROFIL": PARAMETRES_PROFIL.couple,
  };
  const codesFaux = PARAMETRES_SOCLE.filter((p) => p.code).filter((p) => {
    const [fichier, apres] = (p.code as string).split("#");
    const [objet, cle] = apres.includes(".") ? [`${fichier}#${apres.split(".")[0]}`, apres.split(".")[1]] : [fichier, apres];
    return !(objets[objet] && cle in objets[objet]);
  }).map((p) => `${p.nom} → ${p.code}`);
  ok(`paramètres : ${PARAMETRES_SOCLE.filter((p) => p.code).length} correspondent à un réglage du code, et chacun existe (fichier#clé relu)${premiers(codesFaux)}`, codesFaux.length === 0);
  const valides = PARAMETRES_SOCLE.filter((p) => p.statut === "valide");
  ok(`paramètres : un statut « valide » seulement avec un retour de Mathias (${valides.length})`, valides.every((p) => p.confirmePar && regleParId(p.confirmePar)?.statut === "confirmee_mathias"));
}

function verifierInformations(ok: Rapporter): void {
  const ids = INFORMATIONS_SOCLE.map((i) => i.id);
  ok(`informations : ${ids.length} informations (149 du socle et 2 nées de M-37), identifiants uniques`, ids.length === 151 && new Set(ids).size === ids.length);
  const lues = REGLES_SOCLE.flatMap((r) => r.informations.filter((i) => !informationParId(i)).map((i) => `${r.id} → ${i}`));
  ok(`informations : toute information lue par une règle existe${premiers(lues)}`, lues.length === 0);
  const incoherentes = INFORMATIONS_SOCLE.filter((i) => i.lueParRegles.some((id) => !regleSocleParId(id)?.informations.includes(i.id))).map((i) => i.id);
  ok(`informations : la liste « lue par » de chaque information est celle des règles qui la lisent${premiers(incoherentes)}`, incoherentes.length === 0);
  const horsEtat = INFORMATIONS_SOCLE.filter((i) => !ETATS_INFO.includes(i.etat)).map((i) => i.id);
  ok(`informations : état obtenue et utilisée / gardée pour l'atelier / pas obtenue (${Object.entries(compter(INFORMATIONS_SOCLE, (i) => i.etat)).map(([k, n]) => `${k} ${n}`).join(", ")})${premiers(horsEtat)}`, horsEtat.length === 0);
  const retirees = INFORMATIONS_SOCLE.filter((i) => /^(ONU|RET)/.test(i.etatAuteur) && i.etat !== "obtenue_gardee").map((i) => i.id);
  ok(`informations : M-56, une information obtenue sans usage est GARDÉE pour l'atelier, jamais retirée${premiers(retirees)}`, retirees.length === 0 && INFORMATIONS_SOCLE.some((i) => i.etat === "obtenue_gardee"));
  const jargon = (t: string): boolean => JARGON_INTERDIT.some((j) => new RegExp(`(^|[^a-z_])${j}([^a-z_]|$)`, "i").test(t.normalize("NFD").replace(/[̀-ͯ]/g, "")));
  const libelles = INFORMATIONS_SOCLE.filter((i) => !i.libelle.trim() || jargon(i.libelle) || i.valeurs.some((v) => !v.libelle.trim() || jargon(v.libelle))).map((i) => i.id);
  ok(`libellés : chaque information et chaque valeur a un libellé d'atelier, sans jargon (${JARGON_INTERDIT.slice(0, 4).join(", ")}…)${premiers(libelles)}`, libelles.length === 0);
  const rolesCode = [...new Set([...ROLES_IA, ...Object.keys(POIDS_ROLE)])];
  const sansLibelle = rolesCode.filter((r) => !ROLES_ATELIER.some((x) => x.cle === r));
  ok(`libellés : chaque rôle du code (${rolesCode.join(", ")}) a son libellé d'atelier ; « satellite » se dit « ${libelleDuRole("satellite")} »${premiers(sansLibelle)}`,
    sansLibelle.length === 0 && libelleDuRole("satellite") === "photo d'accompagnement" && ROLES_ATELIER.every((r) => !jargon(r.libelle)));
}

function verifierGeneralite(ok: Rapporter): void {
  ok("M-01 : la garde du socle voit un lieu d'un magazine de test, un code de magazine, une page et un numéro de photo",
    motsDuSocle("titre KYOTO").length > 0 && motsDuSocle("[AUS] : 39 moments").length > 0 && motsDuSocle("JAP p07").length > 0 && motsDuSocle("photos 01, 07").length > 0);
  ok("M-01 : la garde du socle laisse passer une règle, un paramètre, une heure et une proportion",
    motsDuSocle("REC-162, PARAM-TRV-048, INFO-052, Q-C04, 04-METHODES, 12 h 04, Notion #05, 0,45 ; 150 ppp ; 2000 photos").length === 0);
  const donnees: [string, unknown][] = [
    ...REGLES_SOCLE.map((r) => [r.id, r] as [string, unknown]), ...PARAMETRES_SOCLE.map((p) => [p.nom, p] as [string, unknown]),
    ...INFORMATIONS_SOCLE.map((i) => [i.id, i] as [string, unknown]), ...QUESTIONS_SOCLE.map((q) => [q.id, q] as [string, unknown]),
    ...A_TRANCHER.map((a) => [a.id, a] as [string, unknown]), ...CONFLITS.map((c) => [c.id, c] as [string, unknown]),
    ...PROFILS_SOCLE.map((p) => [p.code, p] as [string, unknown]), ...THEMES_SOCLE.map((t) => [t.cle, t] as [string, unknown]),
    ...REPONSES_19_11.map((r) => [r.id, { ...r, mots: "" }] as [string, unknown]),
  ];
  const sales = donnees.map(([id, x]) => ({ id, m: motsDuSocle(JSON.stringify(x)) })).filter((x) => x.m.length).map((x) => `${x.id} : ${[...new Set(x.m)].join(", ")}`);
  ok(`M-01 : aucune donnée du socle (règles, paramètres, informations, questions, conflits, profils) ne nomme un projet ou une photo${premiers(sales)}`, sales.length === 0);
  const docs = readdirSync(join(RACINE, DOSSIER_DOCS)).filter((f) => f.endsWith(".md"));
  const docsSales = docs.map((f) => ({ f, m: motsDuSocle(lire(`${DOSSIER_DOCS}/${f}`)) })).filter((x) => x.m.length).map((x) => `${x.f} : ${[...new Set(x.m)].slice(0, 4).join(", ")}`);
  const registreSocle = texteRegistreSocle().join("\n");
  ok(`M-01 : les ${docs.length} documents de ${DOSSIER_DOCS}/ et la partie socle de REGISTRE.md sont propres${premiers([...docsSales, ...(motsDuSocle(registreSocle).length ? ["REGISTRE.md (socle)"] : [])])}`,
    docs.length >= 10 && docsSales.length === 0 && motsDuSocle(registreSocle).length === 0);
}

function verifierMathias(ok: Rapporter): void {
  const retours = lire("docs/moteur/tunnel/RETOURS-MATHIAS.md");
  const i = retours.indexOf("## 19/11/2026, ses réponses sur le socle");
  const section = i >= 0 ? retours.slice(i) : "";
  const dansLeFichier = [...section.matchAll(/\*\*(M-\d{2})\*\*/g)].map((m) => m[1]);
  const ids = REPONSES_19_11.map((r) => r.id);
  ok(`Mathias : les ${ids.length} réponses du 19/11 (${ids[0]} à ${ids[ids.length - 1]}) sont dans RETOURS-MATHIAS.md, et rien de plus`, section !== "" && dansLeFichier.join() === ids.join());
  const motsFaux = REPONSES_19_11.filter((r) => !section.includes(r.mots.replace(/\|/g, "\\|"))).map((r) => r.id);
  ok(`Mathias : ses mots en données sont ceux du fichier des retours, à la lettre${premiers(motsFaux)}`, motsFaux.length === 0);
  const sansTrace = REPONSES_19_11.filter((r) => !Object.keys(r.regles).length && !Object.keys(r.parametres).length && !QUESTIONS_SOCLE.some((q) => q.parMathias === r.id) && !A_TRANCHER.some((a) => a.retour === r.id)
    && !JSON.stringify([INFORMATIONS_SOCLE, ROLES_ATELIER]).includes(r.id)).map((r) => r.id);
  ok(`Mathias : chaque réponse a sa trace en données (règle, paramètre, question, question à trancher, information ou libellé)${premiers(sansTrace)}`, sansTrace.length === 0);
  const auRegistre = REPONSES_19_11.filter((r) => regleParId(r.id)?.statut !== "confirmee_mathias").map((r) => r.id);
  ok(`Mathias : chaque réponse est au registre des règles du tunnel, confirmée${premiers(auRegistre)}`, auRegistre.length === 0);
  const nonPortees = REPONSES_19_11.flatMap((r) => [
    ...Object.keys(r.regles).filter((id) => !regleSocleParId(id)?.confirmePar?.includes(r.id) || regleSocleParId(id)?.statut !== "confirmee_mathias").map((id) => `${r.id} → ${id}`),
    ...Object.entries(r.parametres).filter(([n, v]) => parametreParNom(n)?.confirmePar !== r.id || parametreParNom(n)?.valeur !== v.valeur).map(([n]) => `${r.id} → ${n}`),
  ]);
  ok(`Mathias : chaque règle qu'il confirme porte son retour, chaque paramètre qu'il pose porte sa valeur${premiers(nonPortees)}`, nonPortees.length === 0);
  const confirmeesSans = REGLES_SOCLE.filter((r) => r.statut === "confirmee_mathias" && !(r.confirmePar?.length && r.confirmePar.every((m) => regleParId(m)?.statut === "confirmee_mathias"))).map((r) => r.id);
  ok(`statuts : « confirmée par Mathias » seulement avec un retour M-… confirmé au registre (${REGLES_SOCLE.filter((r) => r.statut === "confirmee_mathias").length} règles)${premiers(confirmeesSans)}`, confirmeesSans.length === 0);
  const codees = REGLES_SOCLE.filter((r) => r.statut === "codee");
  const controlesFaux = codees.filter((r) => {
    const [f, mot] = (r.controle ?? "").split("#");
    const chemin = join(RACINE, "src/lib/mise-en-page", f);
    return !mot || !existsSync(chemin) || !readFileSync(chemin, "utf8").includes(mot) || !r.reprend.some((id) => regleParId(id)?.statut === "codee");
  }).map((r) => r.id);
  ok(`statuts : « codée » seulement quand elle reprend une règle codée du registre, son contrôle relu dans le code (${codees.length} règles)${premiers(controlesFaux)}`, controlesFaux.length === 0);
  const reprisesInconnues = REGLES_SOCLE.flatMap((r) => [...r.reprend, ...r.remplace].filter((id) => !regleParId(id)).map((id) => `${r.id} → ${id}`));
  ok(`liens : chaque règle reprise ou remplacée existe au registre (${REGLES_SOCLE.filter((r) => r.reprend.length).length} règles du socle en reprennent une)${premiers(reprisesInconnues)}`, reprisesInconnues.length === 0);

  const malTranchees = A_TRANCHER.filter((a) => (a.etat === "tranchee") !== !!a.retour || (a.etat === "tranchee" && !REPONSES_19_11.some((r) => r.id === a.retour) && regleParId(a.retour as string)?.statut !== "confirmee_mathias")).map((a) => a.id);
  ok(`à trancher : une question tranchée a son retour, une question avec un retour n'est plus « ouverte »${premiers(malTranchees)}`, malTranchees.length === 0);
  const ouvertes = A_TRANCHER.filter((a) => a.etat === "ouverte").map((a) => a.id);
  ok(`à trancher : ${A_TRANCHER.length} questions (${Object.entries(compter(A_TRANCHER, (a) => a.etat)).map(([k, n]) => `${k} ${n}`).join(", ")}) ; seule la n° 8 reste ouverte (« Je ne comprends pas »)`, A_TRANCHER.length === 58 && ouvertes.join() === "Q-08");
  const qMal = QUESTIONS_SOCLE.filter((q) => !ETATS_QUESTION.includes(q.etat) || ((q.etat === "tranchee" || q.etat === "retiree") && !q.parMathias)).map((q) => q.id);
  ok(`questions : ${QUESTIONS_SOCLE.length} questions, état connu, une question tranchée ou retirée cite son retour${premiers(qMal)}`, QUESTIONS_SOCLE.length === 27 && qMal.length === 0);
  const c09 = QUESTIONS_SOCLE.find((q) => q.id === "Q-C09");
  const c04 = QUESTIONS_SOCLE.find((q) => q.id === "Q-C04");
  ok("questions : Q-C09 est retirée (M-55) ; Q-C04 se lit dans le dossier (M-54), jamais redemandée", c09?.etat === "retiree" && c04?.etat === "posee_site" && c04.parMathias === "M-54");
  const champs = QUESTIONS_SOCLE.flatMap((q) => (q.depuisLeDossier ?? []).filter((d) => { const [f, mot] = d.split("#"); return !existsSync(join(RACINE, f)) || !readFileSync(join(RACINE, f), "utf8").includes(mot); }).map((d) => `${q.id} → ${d}`));
  ok(`questions : chaque champ du dossier cité (particulier et édition collective) existe dans le code (fichier#mot relu)${premiers(champs)}`, champs.length === 0 && QUESTIONS_SOCLE.some((q) => (q.depuisLeDossier ?? []).some((d) => d.startsWith("src/lib/collectif/"))));
  const effetsInconnus = QUESTIONS_SOCLE.flatMap((q) => q.reponses.flatMap((r) => r.effets.filter((e) => !parametreParNom(e.parametre)).map((e) => `${q.id} → ${e.parametre}`)));
  ok(`questions : chaque réponse règle des paramètres qui existent${premiers(effetsInconnus)}`, effetsInconnus.length === 0);
  ok("valeurs tranchées : fin auto, couverture jamais à l'intérieur, quatre tailles de texte, recadrage normal, aucun repli de titre sans lieu",
    parametreParNom("fin_type")?.valeur === "auto" && parametreParNom("couverture_dans_interieur")?.valeur === "non" && parametreParNom("tailles_max")?.valeur === "4"
      && /^normal/.test(parametreParNom("recadrage_franchise")?.valeur ?? "") && parametreParNom("repli_titre_sans_lieu")?.valeur === "rien");
}

function verifierRejeuEtDocs(ok: Rapporter): void {
  const source = trouverSource([]);
  if (source) {
    const a = importer(source);
    const b = importer(source);
    ok("import : deux rejeux donnent les mêmes fichiers, octet pour octet", a.length === b.length && a.every((f, i) => f.chemin === b[i].chemin && f.texte === b[i].texte));
    const ecarts = a.filter((f) => !existsSync(join(RACINE, f.chemin)) || lire(f.chemin) !== f.texte).map((f) => f.chemin);
    ok(`import : ${a.length} fichiers ; le dépôt est l'import du socle, à l'identique (sinon : scripts/socle-import.ts)${premiers(ecarts)}`, ecarts.length === 0);
  } else {
    ok("import : le socle (hors git) n'est pas sur cette machine : rejeu SAUTÉ, seuls les fichiers générés sont relus", ["regles", "parametres", "informations", "profils"].every((f) => existsSync(join(RACINE, DOSSIER_GENERE, `${f}.ts`))));
  }
  const enRetard = FICHIERS_DOC_SOCLE.filter((f) => !existsSync(join(RACINE, f.chemin)) || lire(f.chemin) !== f.texte()).map((f) => f.chemin);
  ok(`doc : ${FICHIERS_DOC_SOCLE.map((f) => f.chemin.split("/").pop()).join(", ")} à jour, version ${versionSocle()} (sinon : scripts/socle-doc.ts)${premiers(enRetard)}`, enRetard.length === 0);
  ok("doc : REGISTRE.md porte la partie socle (par moteur, par priorité) à jour", lire("docs/moteur/tunnel/REGISTRE.md").includes(texteRegistreSocle().join("\n")));
  ok(`doc : les copies nettoyées du socle sont là (PROCESSUS, INFORMATIONS, QUESTIONS-PARAMETRES, ENTRAINEMENT, INTEGRATION, AVIS)`,
    ["PROCESSUS", "INFORMATIONS", "QUESTIONS-PARAMETRES", "ENTRAINEMENT", "INTEGRATION", "AVIS"].every((f) => existsSync(join(RACINE, DOSSIER_DOCS, `${f}.md`))));
}

function verifierConflits(ok: Rapporter): void {
  const departagees = new Set<string>();
  for (const c of CONFLITS) for (let i = 0; i < c.regles.length; i++) for (let j = i + 1; j < c.regles.length; j++) departagees.add([c.regles[i], c.regles[j]].sort().join("|"));
  const inconnues = CONFLITS.flatMap((c) => c.regles.filter((id) => !regleSocleParId(id)).map((id) => `${c.id} → ${id}`));
  ok(`conflits : ${CONFLITS.length} conflits relevés par l'intégration, chacun sur des règles qui existent${premiers(inconnues)}`, CONFLITS.length === 24 && inconnues.length === 0);
  const ouverts = CONFLITS.filter((c) => c.resolution === "ouvert" || (c.resolution === "mathias" && regleParId(c.retour ?? "")?.statut !== "confirmee_mathias")).map((c) => c.id);
  ok(`conflits : chacun est tenu (échelle, intégration ou Mathias avec son retour confirmé)${premiers(ouverts)}`, ouverts.length === 0);
  const r = rivaux(REGLES_SOCLE, repliEcrit, departagees);
  ok(`conflits : la table des rivaux (même moteur, même priorité, même situation, sens opposés, ni repli écrit ni paramètre commun) est vide${premiers(r.map((x) => `${x.a} contre ${x.b} sur ${x.variables.join("/")}`))}`, r.length === 0);
  /* le test du test : deux règles fabriquées qui se contredisent sont vues ; un paramètre commun les départage */
  const base = REGLES_SOCLE.find((x) => x.moteur === "Récit" && x.priorite === "P3") as RegleSocle;
  const a: RegleSocle = { ...base, id: "REC-998", quand: "une réunion de sujet se pose sur la double", alors: "les photos restent ensemble sur la même double", repli: REPLI_PAR_DEFAUT, parametres: [], decide: ["double"], sens: ["ensemble"], etat: "gardee" };
  const b: RegleSocle = { ...a, id: "REC-999", alors: "les photos sont séparées, jamais sur la même double", decide: ["double"], sens: ["separe"] };
  const vus = rivaux([a, b], repliEcrit, new Set());
  ok("conflits : le test voit un rival qu'on lui donne, et un paramètre commun ou un arbitrage le départage",
    vus.length === 1 && vus[0].a === "REC-998" && rivaux([{ ...a, parametres: ["p"] }, { ...b, parametres: ["p"] }], repliEcrit, new Set()).length === 0
      && rivaux([a, b], repliEcrit, new Set(["REC-998|REC-999"])).length === 0);
}

function verifierContrats(ok: Rapporter): void {
  const avant = ORDRE_MOTEURS.indexOf("annonce_textes");
  ok("contrats : l'annonce des textes (6a) tourne AVANT la mise en page, l'écriture (6b) APRÈS ; la revérification en dernier",
    avant >= 0 && avant < ORDRE_MOTEURS.indexOf("mise_en_page") && ORDRE_MOTEURS.indexOf("mise_en_page") < ORDRE_MOTEURS.indexOf("habillage") && ORDRE_MOTEURS[ORDRE_MOTEURS.length - 1] === "reverification");
  /* la signature dit qui lit quoi : la mise en page reçoit l'annonce, l'habillage reçoit la maquette (vérifié par le compilateur) */
  const mep: Parameters<MoteurMiseEnPage>[2] = { textes: [] };
  const hab: Parameters<MoteurHabillage>[2] = { doubles: [] };
  ok("contrats : la mise en page reçoit les textes annoncés, l'habillage reçoit la maquette (types relus par le compilateur)", Array.isArray(mep.textes) && Array.isArray(hab.doubles));
}

export async function verifierMepSocle(ok: Rapporter, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, le SOCLE du moteur (T-219, D34) : forme, replis, paramètres, informations, M-01, réponses de Mathias, rejeu, docs, conflits, contrats —");
  verifierForme(ok);
  verifierReplis(ok);
  verifierParametres(ok);
  verifierInformations(ok);
  verifierGeneralite(ok);
  verifierMathias(ok);
  verifierRejeuEtDocs(ok);
  verifierConflits(ok);
  verifierContrats(ok);
  const st = compter(REGLES_SOCLE, (r) => r.statut);
  const et = compter(REGLES_SOCLE, (r) => r.etat);
  ok(`comptes : ${Object.entries(st).map(([k, n]) => `${k} ${n}`).join(", ")} ; ${Object.entries(et).map(([k, n]) => `${k} ${n}`).join(", ")} ; ${PARAMETRES_SOCLE.length} paramètres ; ${INFORMATIONS_SOCLE.length} informations ; ${QUESTIONS_SOCLE.length} questions`,
    Object.values(st).reduce((s, n) => s + n, 0) === REGLES_SOCLE.length);
}

if (process.argv[1]?.endsWith("verif-mep-socle.ts")) {
  let ko = 0;
  void verifierMepSocle((n, c) => { console.log(`${c ? "  ok " : "  KO "} ${n}`); if (!c) ko++; }, (t) => console.log(`\n${t}`)).then(() => {
    console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
    process.exit(ko === 0 ? 0 : 1);
  });
}
