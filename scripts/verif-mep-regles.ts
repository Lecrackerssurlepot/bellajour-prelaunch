/**
 * Le harnais du REGISTRE DES RÈGLES (18/11, T-216, M-11), appelé par verif-atelier.ts :
 *
 *     npx tsx --tsconfig tsconfig.json scripts/verif-mep-regles.ts
 *
 * Ce qu'il tient (src/lib/mise-en-page/regles/) :
 *   1. la forme : identifiants uniques et bien formés, domaine, famille, statut, profils connus, un énoncé d'une phrase ;
 *   2. les familles : un interdit n'a pas de poids, une préférence en a un ;
 *   3. les retours de Mathias : toute règle `confirmee_mathias` a sa ligne dans RETOURS-MATHIAS.md, et chaque M-… de ce fichier est au
 *      registre (sauf les règles de MÉTHODE, nommées ici) ;
 *   4. une règle `codee` a un contrôle, et ce contrôle existe dans le code (fichier et mot relus) ;
 *   5. M-01 : aucun énoncé, aucune condition, aucune action ne nomme un client, un projet ou une photo (`regles-mots-interdits.ts`) ;
 *   6. chaque réglage cité existe dans `editeur/reglages.ts` ; chaque règle portée par une leçon existe au registre ou dans REGLES-TRI ;
 *   7. la version change quand le registre change (empreinte) ; la reprise suit les cahiers ; REGISTRE.md est à jour ;
 *   8. le pont avec les leçons compte juste.
 * Sans base, sans réseau, sans écriture.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  A_PRECISER, DOMAINES, FAMILLES, ID_REGLE, PROFILS, REGISTRE, STATUTS, SURCHARGES, THEMES_ALBUM, comptesParStatut, correctionsParRegle,
  regleParId, versionDe, versionRegles, type Decision, type Regle,
} from "@/lib/mise-en-page/regles";
import { REPRISE } from "@/lib/mise-en-page/regles/reprise";
import { REGLAGES } from "@/lib/mise-en-page/editeur/reglages";
import { REGLE_IA } from "@/lib/mise-en-page/editeur/lectureIA";
import { REGLE_PREMIER_JET } from "@/lib/mise-en-page/editeur/premierJet";
import { motsDeProjet } from "./regles-mots-interdits";
import { FICHIER_REPRISE, lireCahier, repriseDepuisCahiers, texteReprise } from "./regles-reprise";
import { FICHIER_DOC, texteDoc } from "./regles-doc";

export { MOTS_INTERDITS, motsDeProjet } from "./regles-mots-interdits";

type Rapporter = (nom: string, reussi: boolean) => void;

const RACINE = process.cwd();
const lire = (chemin: string): string => readFileSync(join(RACINE, chemin), "utf8");

/** Les M-… de RETOURS-MATHIAS.md qui sont des règles de MÉTHODE (comment on travaille), pas des règles du moteur. */
export const RETOURS_DE_METHODE: Readonly<Record<string, string>> = {
  "M-01": "une règle est générale : tenue par ce harnais (mots interdits), pas par le compositeur",
  "M-11": "une règle n'existe que dans le dépôt : c'est le registre lui-même",
  "M-12": "une décision d'accès (« Lire les photos » ouvert à l'atelier sur les dossiers), tenue par la garde de la route, pas par le compositeur",
};

/** Ce qu'une leçon peut porter sans être une règle : l'origine d'une proposition ou un jalon. */
export const HORS_REGISTRE: Readonly<Record<string, string>> = {
  [REGLE_IA]: "une proposition de la lecture IA (R142 à R148, REGLES-TRI) : l'origine, pas une règle",
  [REGLE_PREMIER_JET]: "une proposition du premier jet : l'origine, pas une règle",
  G6: "un jalon de la vie du magazine (ouverture, export), plan de l'éditeur G6",
};

const texteDe = (r: Regle): string => [r.enonce, r.quand, r.alors].join(" ");

function verifierForme(ok: Rapporter): void {
  const ids = REGISTRE.map((r) => r.id);
  const doublons = ids.filter((id, i) => ids.indexOf(id) !== i);
  ok(`registre : ${REGISTRE.length} règles, identifiants uniques${doublons.length ? ` (doublons : ${doublons.join(", ")})` : ""}`, REGISTRE.length > 250 && doublons.length === 0);
  const malFormes = ids.filter((id) => !ID_REGLE.test(id));
  ok(`registre : identifiants bien formés (M-, S-, C-, F-, R-T-, N-, DA-, I-)${malFormes.length ? ` (${malFormes.join(", ")})` : ""}`, malFormes.length === 0);
  const horsListes = REGISTRE.filter((r) => !DOMAINES.includes(r.domaine) || !FAMILLES.includes(r.famille) || !STATUTS.includes(r.statut)
    || !(r.profils === "tous" || (r.profils.length > 0 && r.profils.every((p) => PROFILS.includes(p))))
    || !(r.themes ?? []).every((t) => THEMES_ALBUM.includes(t)) || !/^\d{4}-\d{2}-\d{2}$/.test(r.depuis) || !r.source.trim());
  ok(`registre : domaine, famille, statut, profils, thèmes, date et source connus${horsListes.length ? ` (${horsListes.map((r) => r.id).join(", ")})` : ""}`, horsListes.length === 0);
  const enonces = REGISTRE.filter((r) => !r.enonce.trim() || r.enonce === A_PRECISER || /\n/.test(r.enonce) || r.enonce.length > 400 || !r.quand.trim() || !r.alors.trim());
  ok(`registre : chaque règle a un énoncé d'une phrase (400 signes au plus), une condition et une action${enonces.length ? ` (${enonces.map((r) => r.id).join(", ")})` : ""}`, enonces.length === 0);
  const ecrites = REGISTRE.filter((r) => r.statut !== "hypothese" && (r.quand === A_PRECISER || r.alors === A_PRECISER));
  ok(`registre : hors hypothèse, la condition et l'action sont écrites en données (jamais « ${A_PRECISER} »)${ecrites.length ? ` (${ecrites.map((r) => r.id).join(", ")})` : ""}`, ecrites.length === 0);
  const cadratin = REGISTRE.filter((r) => /—/.test(texteDe(r)));
  ok(`registre : aucun cadratin dans les textes${cadratin.length ? ` (${cadratin.map((r) => r.id).join(", ")})` : ""}`, cadratin.length === 0);
}

function verifierFamilles(ok: Rapporter): void {
  const interditsPeses = REGISTRE.filter((r) => r.famille === "interdit" && r.poids !== undefined);
  ok(`familles : un interdit n'a jamais de poids${interditsPeses.length ? ` (${interditsPeses.map((r) => r.id).join(", ")})` : ""}`, interditsPeses.length === 0);
  const preferencesSansPoids = REGISTRE.filter((r) => r.famille === "preference" && !(typeof r.poids === "number" && Number.isFinite(r.poids) && r.poids > 0));
  ok(`familles : une préférence a un poids positif${preferencesSansPoids.length ? ` (${preferencesSansPoids.map((r) => r.id).join(", ")})` : ""}`, preferencesSansPoids.length === 0);
}

function verifierRetoursMathias(ok: Rapporter): void {
  const retours = lire("docs/moteur/tunnel/RETOURS-MATHIAS.md");
  const dansLeFichier = new Set([...retours.matchAll(/\*\*(M-\d{2})\*\*/g)].map((m) => m[1]));
  const confirmees = REGISTRE.filter((r) => r.statut === "confirmee_mathias");
  const sansLigne = confirmees.filter((r) => !dansLeFichier.has(r.id));
  ok(`Mathias : ${confirmees.length} règles confirmées, chacune a sa ligne dans RETOURS-MATHIAS.md${sansLigne.length ? ` (${sansLigne.map((r) => r.id).join(", ")})` : ""}`, confirmees.length >= 9 && sansLigne.length === 0);
  const absentes = [...dansLeFichier].filter((id) => !RETOURS_DE_METHODE[id] && regleParId(id)?.statut !== "confirmee_mathias");
  ok(`Mathias : chaque retour M-… du fichier est au registre et confirmé (hors méthode : ${Object.keys(RETOURS_DE_METHODE).join(", ")})${absentes.length ? ` (${absentes.join(", ")})` : ""}`, absentes.length === 0);
  const seulesM = confirmees.filter((r) => !r.id.startsWith("M-"));
  ok("Mathias : seul un M-… porte le statut confirmee_mathias", seulesM.length === 0);
}

function verifierControles(ok: Rapporter): void {
  const codees = REGISTRE.filter((r) => r.statut === "codee");
  const sans = codees.filter((r) => !r.controle);
  ok(`contrôles : ${codees.length} règles codées, chacune avec son contrôle${sans.length ? ` (${sans.map((r) => r.id).join(", ")})` : ""}`, codees.length >= 7 && sans.length === 0);
  const introuvables = REGISTRE.filter((r) => r.controle).filter((r) => {
    const [fichier, mot] = (r.controle as string).split("#");
    const chemin = join(RACINE, "src/lib/mise-en-page", fichier);
    return !mot || !existsSync(chemin) || !readFileSync(chemin, "utf8").includes(mot);
  });
  ok(`contrôles : chaque contrôle nommé existe dans le code (fichier#mot relu)${introuvables.length ? ` (${introuvables.map((r) => `${r.id} → ${r.controle}`).join(", ")})` : ""}`, introuvables.length === 0);
}

function verifierGeneralite(ok: Rapporter): void {
  ok("M-01 : le garde-fou voit un prénom de client, un projet et un numéro de photo",
    motsDeProjet("la photo de Joëlle au phare").length > 0 && motsDeProjet("comme à Madrid").length > 0
      && motsDeProjet("la photo 118 en pleine page").length > 0 && motsDeProjet("IMG_2034").length > 0 && motsDeProjet("voir 042").length > 0);
  ok("M-01 : le garde-fou laisse passer un identifiant de règle, un seuil et une proportion",
    motsDeProjet("S-004, C-047 et R-T-40 : 0,45 ; 150 ppp ; 3,0 photos par double ; à 15 mm du pli").length === 0);
  const nommees = REGISTRE.map((r) => ({ id: r.id, mots: motsDeProjet(texteDe(r)) })).filter((x) => x.mots.length);
  ok(`M-01 : aucune règle ne nomme un client, un projet ou une photo${nommees.length ? ` (${nommees.map((x) => `${x.id} : ${x.mots.join(", ")}`).join(" ; ")})` : ""}`, nommees.length === 0);
}

function verifierReglagesEtLecons(ok: Rapporter): void {
  const inconnus = REGISTRE.flatMap((r) => (r.reglages ?? []).filter((n) => !(n in REGLAGES)).map((n) => `${r.id} → ${n}`));
  ok(`réglages : chaque réglage cité existe dans editeur/reglages.ts${inconnus.length ? ` (${inconnus.join(", ")})` : ""}`, inconnus.length === 0);
  const neufs = ["note_plancher", "page_occupee_min", "personnes_cote_min_mm", "personnes_surface_min_cm2", "densite_tout_garder", "definition_double_ppp"] as const;
  ok("réglages : les six réglages de départ du banc sont nommés, datés, et cités par une règle du registre",
    neufs.every((n) => n in REGLAGES && REGISTRE.some((r) => r.reglages?.includes(n))));
  ok("réglages : valeurs de départ du banc (0,45 ; 40 % ; 70 mm ; 100 cm² ; 3,0 ; 150 ppp provisoire)",
    REGLAGES.note_plancher.valeur === 0.45 && REGLAGES.page_occupee_min.valeur === 0.4 && REGLAGES.personnes_cote_min_mm.valeur === 70
      && REGLAGES.personnes_surface_min_cm2.valeur === 100 && REGLAGES.densite_tout_garder.valeur === 3 && REGLAGES.definition_double_ppp.valeur === 150
      && /PROVISOIRE/.test(REGLAGES.definition_double_ppp.raison) && /Mathias/.test(REGLAGES.definition_double_ppp.raison));
  const regleDeReglage = neufs.filter((n) => !regleParId(REGLAGES[n].regle));
  ok(`réglages : la règle de chaque réglage neuf est au registre${regleDeReglage.length ? ` (${regleDeReglage.join(", ")})` : ""}`, regleDeReglage.length === 0);

  const tri = new Set([...lire("docs/reference/REGLES-TRI.md").matchAll(/\*\*(R\d+)\*\*/g)].map((m) => m[1]));
  const source = lire("src/lib/mise-en-page/editeur/lecons.ts").split("\n").filter((l) => /\bregle\b/.test(l) && !/^\s*(\*|\/\/|\/\*)/.test(l));
  const portees = new Set<string>([REGLE_IA, REGLE_PREMIER_JET]);
  for (const l of source) for (const m of l.matchAll(/"([A-Z][A-Za-z0-9-]{0,7})"/g)) portees.add(m[1]);
  const perdues = [...portees].filter((id) => !regleParId(id) && !tri.has(id) && !HORS_REGISTRE[id]);
  ok(`leçons : chaque règle portée par une leçon (${[...portees].sort().join(", ")}) existe au registre ou dans REGLES-TRI${perdues.length ? ` (inconnues : ${perdues.join(", ")})` : ""}`,
    portees.size >= 5 && perdues.length === 0);
}

function verifierVersionEtDocs(ok: Rapporter): void {
  const v = versionRegles();
  ok(`version : ${v}, stable et courte`, /^g[0-9a-f]{8}$/.test(v) && v === versionRegles() && v === versionDe([...REGISTRE]));
  const change = (f: (r: Regle) => Regle): string => versionDe(REGISTRE.map((r, i) => (i === 0 ? f(r) : r)));
  ok("version : elle change quand un énoncé, un statut, un poids ou une règle change",
    change((r) => ({ ...r, enonce: `${r.enonce} ` })) !== v && change((r) => ({ ...r, statut: "codee" })) !== v
      && change((r) => ({ ...r, poids: 9 })) !== v && versionDe(REGISTRE.slice(1)) !== v);
  ok("version : l'ordre des clés d'une règle ne la change pas", change((r) => Object.fromEntries(Object.entries(r).reverse()) as Regle) === v);

  const attendue = texteReprise(repriseDepuisCahiers(lireCahier(RACINE)));
  ok(`reprise : ${REPRISE.length} règles des cahiers (S, C, F, R-T) ; ${FICHIER_REPRISE} suit les cahiers (sinon : scripts/regles-reprise.ts)`,
    REPRISE.length >= 250 && lire(FICHIER_REPRISE) === attendue);
  ok("reprise : les règles reprises entrent en hypothèse", REPRISE.every((r) => r.statut === "hypothese"));
  const orphelines = Object.keys(SURCHARGES).filter((id) => !REPRISE.some((r) => r.id === id));
  ok(`surcharges : chacune retouche une règle reprise${orphelines.length ? ` (${orphelines.join(", ")})` : ""}`, orphelines.length === 0);

  ok(`doc : ${FICHIER_DOC} est à jour (sinon : scripts/regles-doc.ts) et porte la version`, existsSync(join(RACINE, FICHIER_DOC)) && lire(FICHIER_DOC) === texteDoc() && lire(FICHIER_DOC).includes(v));
  ok("doc : en tête « fichier généré, ne pas éditer »", /Fichier généré, ne pas éditer/.test(lire(FICHIER_DOC)));
  const st = comptesParStatut();
  ok(`comptes : ${STATUTS.map((s) => `${s} ${st[s]}`).join(", ")}`, STATUTS.reduce((s, x) => s + st[x], 0) === REGISTRE.length);
}

function verifierPont(ok: Rapporter): void {
  const c = correctionsParRegle([
    { regle: "R73", type: "floue_gardee", quand: "2026-11-10T10:00:00.000Z" },
    { regle: "R73", type: "floue_gardee", quand: "2026-11-12T09:00:00.000Z" },
    { regle: "R73", type: "reponse", quand: "2026-11-13T09:00:00.000Z" },
    { regle: "G6", type: "ouverture", quand: "2026-11-13T09:00:00.000Z" },
    { regle: "M-09", type: "pretri_renverse", quand: null },
  ]);
  ok("pont : deux corrections de R73, la dernière le 12/11 ; une réponse et un jalon ne comptent pas ; sans date, comptée sans date",
    c.R73?.corrections === 2 && c.R73.derniere === "2026-11-12T09:00:00.000Z" && !c.G6 && c["M-09"]?.corrections === 1 && c["M-09"].derniere === null);
  ok("pont : sans leçon, aucun compte (sans table, zéro partout)", Object.keys(correctionsParRegle([])).length === 0);
  /* le compositeur (lot suivant) citera une règle à chaque décision : le type le permet dès maintenant */
  const d: Decision = { regle: "M-08", nature: "refus", objet: { photo: "p1", planche: "pl-3" }, raison: "photo de personnes trop petite", mesures: { cote_mm: 52 } };
  ok("décision : une décision cite une règle du registre", !!regleParId(d.regle));
}

export async function verifierMepRegles(ok: Rapporter, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, registre des règles du tunnel (T-216, M-11) : forme, familles, retours de Mathias, contrôles, M-01, réglages, leçons, version, docs —");
  verifierForme(ok);
  verifierFamilles(ok);
  verifierRetoursMathias(ok);
  verifierControles(ok);
  verifierGeneralite(ok);
  verifierReglagesEtLecons(ok);
  verifierVersionEtDocs(ok);
  verifierPont(ok);
}

if (process.argv[1]?.endsWith("verif-mep-regles.ts")) {
  let ko = 0;
  void verifierMepRegles((n, c) => { console.log(`${c ? "  ok " : "  KO "} ${n}`); if (!c) ko++; }, (t) => console.log(`\n${t}`)).then(() => {
    console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
    process.exit(ko === 0 ? 0 : 1);
  });
}
