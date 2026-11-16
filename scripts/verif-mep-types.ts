/**
 * Le harnais du lot TYPES (T-208, vague 2 du 16/11), appelé par verif-atelier.ts : les TYPES de gabarits (R170 à R179,
 * src/lib/mise-en-page/typesGabarits.ts, fiche docs/moteur/couches/C18-types-de-gabarits.md).
 *
 *     npx tsx --tsconfig tsconfig.json scripts/verif-mep-types.ts
 *
 * Ce qu'il tient :
 *   1. la clé, sur des exemples RÉELS : deux gabarits que Mathias appellerait « le même avec une photo plus grande » (ou l'autre
 *      orientation, ou sans son aplat) ont la même clé ; deux qu'il appellerait différents (pleine page contre encadrée, côte à côte
 *      contre l'une sur l'autre, la page qui porte le texte, une photo à cheval sur le pli…) ne l'ont pas ;
 *   2. les comptes : combien de types pour les dessinés, pour les générés (figés : si la clé bouge, le harnais le dit) ;
 *   3. le rangement : chaque gabarit dans un seul type, l'ordre du classement gardé, un DESSINÉ toujours tête de son type (y compris une
 *      origine dessinée que ce lot ne connaît pas encore, comme les signatures du lot voisin) ;
 *   4. l'éditeur : R passe d'un type à l'autre, V d'une variante à l'autre du type posé ; « Poser » et les ids ne bougent pas.
 * Sans base, sans réseau, sans écriture.
 */

import * as O from "@/lib/mise-en-page/editeur";
import type { EtatEditeur, PhotoMaq } from "@/lib/mise-en-page/editeur";
import { ID_COUVERTURE } from "@/lib/mise-en-page/couverture";
import { TEMPLATES_DESSINES, nouveauMagazine, templateParId, type Magazine, type PhotoRef } from "@/lib/mise-en-page/magazine";
import { EPINGLES_RETIREES } from "@/lib/mise-en-page/epingles";
import { decoupesDePage, genereParId, idsDePage, templateDeDecoupe } from "@/lib/mise-en-page/genere";
import { toutesLesGrilles } from "@/lib/mise-en-page/grilles";
import { contenuValide } from "@/lib/mise-en-page/sauvegarde";
import { REGLAGES_TYPES, estDessine, rangerParTypes, typeContenant, typeDeGabarit } from "@/lib/mise-en-page/typesGabarits";
import type { Template } from "@/lib/mise-en-page/types";

type Rapporter = (nom: string, reussi: boolean) => void;

const t = (id: string): Template => {
  const x = templateParId(id);
  if (!x) throw new Error(`gabarit inconnu : ${id}`);
  return x;
};
const cle = (id: string): string => typeDeGabarit(t(id));

/* ─────────────────────────── 1. la clé sur des exemples réels ─────────────────────────── */

/** « Le même, avec une photo un peu plus grande (ou l'autre orientation, ou sans son aplat) » : même type. */
const MEMES: [string, string, string][] = [
  ["une photo encadrée : la pleine zone et une 4 × 4 au centre", "GG1-EN-0066", "GG1-EN-1144"],
  ["une photo encadrée : en portrait 4 × 5 et en paysage 6 × 3 (l'autre orientation)", "GG1-EN-1045", "GG1-EN-0163"],
  ["une encadrée de la grille de secours et une générée", "G-P1-c", "GG1-EN-0065"],
  ["un héros et un satellite dessous : héros 3 × 3 ou 5 × 4", "GG1-HS-0033.0322", "GG1-HS-0054.0422"],
  ["deux côte à côte : un duo 3 × 2 et deux petites 1 × 1 (les photos plus petites)", "GG1-RG-0032.3032", "GG1-RG-2011.3011"],
  ["un héros côté extérieur et son satellite : héros 3 × 3 ou 4 × 4, satellite 2 × 2 ou 2 × 1", "GG1-HS-0033.3022", "GG1-HS-0044.4021"],
  ["deux égales l'une sur l'autre : en 3 × 3 générées ou en pleine largeur (grille de secours)", "GG1-RG-0033.0333", "G-P2-a"],
  ["la grille 2 × 3 dessinée (E-S5) et la même découpe générée", "E-S5", "GG1-GR-0032.3032.0232.3232.0432.3432"],
  ["une grille 2 × 3 de grandes cases et de petites", "GG1-GR-0032.3032.0232.3232.0432.3432", "GG1-GR-2011.3011.2111.3111.2211.3211"],
  ["un fond plein et une vignette, en haut ou en bas", "GG1-IN-0021", "GG1-IN-0521"],
  ["deux photos qui se chevauchent, coin haut ou coin bas", "GG1-CH-0133.2022", "GG1-CH-0133.2322"],
  ["la double à titres avec ses aplats (retirée) et sans (E-D14a, E-D14c)", "E-D14a", "E-D14c"],
  ["une mosaïque de cinq : la petite paire à gauche, au milieu ou à droite de la rangée du haut", "GG1-MO-0021.2022.4022.0121.0264", "GG1-MO-0022.2021.4022.2121.0264"],
  ["le photomaton sur fond noir (retiré) et sans (E-D8c, E-D8f)", "E-D8c", "E-D8f"],
  ["une double générée : encadrée | héros dessous, à deux tailles", "GD1-EN-0065_HS-0054.0422", "GD1-EN-0066_HS-0033.0322"],
];

/** « Vraiment différents en termes de position » : deux types. */
const AUTRES: [string, string, string][] = [
  ["une pleine page contre une encadrée", "G-P1-d", "GG1-EN-0066"],
  ["deux côte à côte contre deux l'une sur l'autre", "GG1-RG-0032.3032", "GG1-RG-0132.0332"],
  ["deux côte à côte contre deux en diagonale", "G-P2-b", "G-P2-d"],
  ["deux côte à côte contre deux qui se chevauchent", "GG1-RG-0032.3032", "GG1-CH-0133.2022"],
  ["deux égales côte à côte contre un héros et son satellite (franchement plus grand)", "GG1-RG-0032.3032", "GG1-HS-0033.3022"],
  ["le héros en haut et son satellite dessous contre le satellite en haut", "GG1-HS-0054.0422", "GG1-HS-0022.0254"],
  ["le héros côté extérieur contre côté pli", "GG1-HS-0044.4022", "GG1-HS-0022.2044"],
  ["un fond plein et sa vignette contre une encadrée et une petite", "GG1-IN-0021", "GG1-HS-0033.0322"],
  ["un héros avec ses satellites dessous contre dessus", "GG1-HS-0133.0422.2422", "GG1-HS-0021.2021.0133"],
  ["un héros avec ses satellites dessous contre à côté", "GG1-HS-0133.0422.2422", "GG1-HS-0033.3021.3121"],
  ["trois en colonne contre trois en rangée", "GG1-RG-0111.0211.0311", "GG1-RG-0011.1011.2011"],
  ["une photo à cheval sur le pli contre deux pages séparées", "G-D2-h", "G-D2-e"],
  ["la pleine double contre une seule page photo", "G-D1-a", "G-D1-b"],
  ["la page qui porte le texte : la pleine à gauche et le titre à droite, ou l'inverse", "E-D3b", "E-D4b"],
  ["une page avec une légende contre la même photo sans texte", "E-S3a", "GG1-EN-1144"],
  ["la page qui porte la pleine photo : à gauche ou à droite", "GD1-IN-0033_EN-0163", "GD1-EN-0163_IN-0033"],
  ["des bandes au fond perdu contre des colonnes dans les marges", "E-D9a", "GD1-RG-0132.0332_RG-0132.0332"],
  ["des tirages tournés contre une colonne droite", "E-S8a", "GG1-RG-0111.0211.0311"],
];

function verifierCle(ok: Rapporter): void {
  /* des exemples RÉELS : chaque page générée citée est une découpe du catalogue (pas une recette fabriquée pour le test) */
  const catalogue = new Set(decoupesDePage().map((d) => d.id));
  const cites = [...MEMES, ...AUTRES].flatMap(([, a, b]) => [a, b]).flatMap((id) => (id.startsWith("GD1-") ? idsDePage(id) : [id])).filter((id) => id.startsWith("GG1-"));
  const horsCatalogue = cites.filter((id) => !catalogue.has(id));
  ok(`R171 : les ${cites.length} pages générées citées en exemple sont toutes des découpes du catalogue${horsCatalogue.length ? ` — hors catalogue : ${horsCatalogue.join(", ")}` : ""}`, horsCatalogue.length === 0);
  const memesKo = MEMES.filter(([, a, b]) => cle(a) !== cle(b) || t(a).nbPhotos !== t(b).nbPhotos || t(a).portee !== t(b).portee);
  for (const [n, a, b] of memesKo) console.log(`      même type attendu : ${n} — ${a} ${cle(a)} | ${b} ${cle(b)}`);
  ok(`R171 : ${MEMES.length} paires que Mathias dirait « le même avec une photo plus grande, l'autre orientation, sans son aplat » ont la même clé (même nombre de photos, même portée)`, memesKo.length === 0);
  const autresKo = AUTRES.filter(([, a, b]) => cle(a) === cle(b) || t(a).nbPhotos !== t(b).nbPhotos || t(a).portee !== t(b).portee);
  for (const [n, a, b] of autresKo) console.log(`      types différents attendus : ${n} — ${a} ${cle(a)} | ${b} ${cle(b)}`);
  ok(`R172 à R174 : ${AUTRES.length} paires vraiment différentes (pleine page / encadrée, côte à côte / l'une sur l'autre, diagonale, chevauchement, à cheval sur le pli, la page qui porte le texte, fond perdu, tirages tournés) ont deux clés`, autresKo.length === 0);

  /* quelques clés écrites en clair : la lecture est celle que la fiche décrit */
  const attendu: [string, string][] = [
    ["G-P1-d", "P:F"], ["GG1-EN-0066", "P:o"], ["GG1-RG-0032.3032", "P:R(oo)"], ["GG1-RG-0132.0332", "P:C(oo)"], ["G-P2-d", "P:R~(oo)"],
    ["GG1-CH-0133.2022", "P:S2"], ["GG1-IN-0021", "P:F+o"], ["E-S8a", "P:J3"], ["E-S1", "P:F·T"], ["E-S3a", "P:o·t"], ["E-S2", "P:o~·T"],
    ["E-D1", "G:F|D:F"], ["E-D5", "X:o·t"], ["E-D9a", "G:C(oo)~|D:C(oo)~"], ["GG1-HS-0133.0422.2422", "P:C(OR(oo))"], ["GG1-HS-0022.0254", "P:C(oO)"],
  ];
  const ecarts = attendu.filter(([id, k]) => cle(id) !== k);
  ok(`R170 : la clé se lit (« P:F » pleine page, « R(oo) » côte à côte, « C(oo) » l'une sur l'autre, « ~ » décalées ou au fond perdu, « O » le héros, « S2 » chevauchées, « J3 » tournées, « F+o » fond et vignette, « ·T » titre, « X: » à cheval sur le pli)${ecarts.length ? ` — ${ecarts.map(([id, k]) => `${id} ${cle(id)} au lieu de ${k}`).join(" ; ")}` : ""}`, ecarts.length === 0);

  /* pure et déterministe : la même pour un id décodé deux fois, sans regarder ni l'id, ni le nom, ni l'origine */
  const g = t("GG1-HS-0054.0422");
  const copie: Template = { ...g, id: "autre", nom: "autre", origine: "annexe", cadres: g.cadres.map((c) => ({ ...c })) };
  ok("R170 : la clé ne lit que les cadres (une copie d'un autre id, d'un autre nom et d'une autre origine a la même), elle est stable d'un appel à l'autre",
    typeDeGabarit(copie) === typeDeGabarit(g) && typeDeGabarit(genereParId("GG1-HS-0054.0422")!) === typeDeGabarit(g) && typeDeGabarit(g) === typeDeGabarit(g));
  ok("R170 : les seuils de la clé sont nommés (pli, fond, coupe, décalage, héros, fond perdu) et non nuls ; le héros est entre « presque égal » (1,15) et « franc » (2) du maquettiste",
    Object.isFrozen(REGLAGES_TYPES) && REGLAGES_TYPES.pliMm > 0 && REGLAGES_TYPES.fond > 0.5 && REGLAGES_TYPES.fond < 1 && REGLAGES_TYPES.coupeMm > 0 && REGLAGES_TYPES.decale > 0 && REGLAGES_TYPES.perduMm > 0
      && REGLAGES_TYPES.heros > 1.15 && REGLAGES_TYPES.heros < 2);
}

/* ─────────────────────────── 2. les comptes ─────────────────────────── */

const compte = (ts: readonly Template[]): number => new Set(ts.map((x) => `${x.portee}|${x.nbPhotos}|${typeDeGabarit(x)}`)).size;

function verifierComptes(ok: Rapporter): void {
  const proposes = TEMPLATES_DESSINES.filter((x) => !EPINGLES_RETIREES.has(x.id));
  const nbDessines = compte(proposes);
  const generes = decoupesDePage().map(templateDeDecoupe);
  const parNombre = [1, 2, 3, 4, 5, 6].map((n) => compte(generes.filter((x) => x.nbPhotos === n)));
  const nbGeneres = compte(generes);
  const grilles = toutesLesGrilles();
  console.log(`      dessinés proposés : ${proposes.length} gabarits, ${nbDessines} types ; générés de page : ${generes.length} découpes, ${nbGeneres} types (1 à 6 photos : ${parNombre.join(", ")}) ; grilles : ${grilles.length}, ${compte(grilles)} types`);
  /* 16/11, fusion du lot Signatures : les 11 signatures (SG-01 à SG-11) s'ajoutent aux 58 ; deux rejoignent une disposition existante
     (SG-06 « Le nom en grand » celle d'E-D3a et E-D4a, SG-08 « Les mots sur l'aplat » celle d'E-D3b) : la clé ignore textes géants et fond. */
  ok(`R179 : les ${proposes.length} gabarits dessinés proposés font ${nbDessines} types (se partagent une disposition : DP-02 et E-D14c ; E-D3a, E-D4a et SG-06 ; E-D3b et SG-08 ; chacun reste une tête)`,
    nbDessines === 65 && proposes.length === 69);
  ok(`R179 : les ${generes.length} découpes de page générées font ${nbGeneres} types (1 photo : ${parNombre[0]}, 2 : ${parNombre[1]}, 3 : ${parNombre[2]}, 4 : ${parNombre[3]}, 5 : ${parNombre[4]}, 6 : ${parNombre[5]}) ; une photo encadrée de toute taille est UN type`,
    nbGeneres === 81 && parNombre.join() === [1, 12, 20, 16, 8, 24].join());
}

/* ─────────────────────────── 3. le rangement ─────────────────────────── */

const DIMS = { P: [3000, 4000], L: [4000, 3000], C: [3000, 3000] } as const;
const refs = (os: string): PhotoRef[] => [...os].map((o, i) => ({ id: `p${i}`, nom: `p${i}`, l: DIMS[o as "P"][0], h: DIMS[o as "P"][1], date: null }));

function verifierRangement(ok: Rapporter): void {
  const cas: ["page" | "double", string][] = [["page", "P"], ["page", "PL"], ["page", "LPP"], ["page", "PPPP"], ["page", "PLPLPL"], ["double", "PL"], ["double", "PPL"], ["double", "LPPLPL"], ["double", "PPLLPPLL"]];
  const fautes: string[] = [];
  const bilan: string[] = [];
  for (const [portee, os] of cas) {
    const liste = O.gabaritsClasses(portee, refs(os), null);
    const types = rangerParTypes(liste);
    const ids = types.flatMap((x) => x.membres.map((g) => g.template.id));
    bilan.push(`${portee} ${os} : ${liste.length} → ${types.length}`);
    if (ids.length !== liste.length || new Set(ids).size !== liste.length) fautes.push(`${portee} ${os} : un gabarit absent ou deux fois`);
    if (types.some((x) => x.membres.some((g) => typeDeGabarit(g.template) !== x.cle))) fautes.push(`${portee} ${os} : un membre d'une autre clé`);
    if (types.some((x) => x.membres[0] !== x.tete)) fautes.push(`${portee} ${os} : la tête n'est pas en premier`);
    /* un dessiné est toujours une tête ; sans dessiné, la tête est le meilleur membre */
    const tetes = new Set(types.map((x) => x.tete.template.id));
    if (liste.some((g) => estDessine(g.template) && !tetes.has(g.template.id))) fautes.push(`${portee} ${os} : un dessiné caché sous une variante`);
    if (types.some((x) => !estDessine(x.tete.template) && liste.indexOf(x.tete) !== Math.min(...x.membres.map((g) => liste.indexOf(g))))) fautes.push(`${portee} ${os} : une tête générée qui n'est pas la meilleure`);
    /* l'ordre des types suit le classement : chacun à la place de son meilleur membre */
    const rangs = types.map((x) => Math.min(...x.membres.map((g) => liste.indexOf(g))));
    if (rangs.some((r, i) => i > 0 && r <= rangs[i - 1])) fautes.push(`${portee} ${os} : l'ordre des types ne suit pas le classement`);
    if (rangerParTypes(liste).map((x) => x.tete.template.id).join() !== types.map((x) => x.tete.template.id).join()) fautes.push(`${portee} ${os} : pas déterministe`);
    if (types.length >= liste.length && liste.length > 20) fautes.push(`${portee} ${os} : aucun regroupement`);
  }
  console.log(`      ${bilan.join(" ; ")}`);
  ok(`R175, R176 : sur ${cas.length} jeux de photos (pages et doubles, 1 à 8 photos), chaque gabarit est dans un seul type, sous sa clé ; l'ordre des types suit le classement ; un dessiné est toujours une tête, une tête générée est la meilleure de son type${fautes.length ? ` — ${fautes.slice(0, 3).join(" ; ")}` : ""}`, fautes.length === 0);

  /* un dessiné et ses variantes générées : E-S5 tête, la même découpe générée dessous, même si elle est mieux classée */
  const s5 = { template: t("E-S5") }, gr = { template: t("GG1-GR-0032.3032.0232.3232.0432.3432") }, gr2 = { template: t("GG1-GR-2011.3011.2111.3111.2211.3211") };
  const r = rangerParTypes([gr, gr2, s5]);
  ok("R175 : un gabarit dessiné (E-S5) est la tête de son type même quand ses variantes générées sont mieux classées ; le type prend la place de la meilleure",
    r.length === 1 && r[0].tete === s5 && r[0].membres.join() === [s5, gr, gr2].join());
  /* une origine dessinée que ce module ne connaît pas (les signatures du lot voisin) : traitée comme les autres dessinés, jamais cachée */
  const signature = { template: { ...t("E-S5"), id: "SG-essai", origine: "signature" } as unknown as Template };
  const r2 = rangerParTypes([gr, s5, signature, gr2]);
  ok("R175 : une origine dessinée à venir (« signature ») se range sans être nommée : deux dessinés de même disposition sont deux têtes, les générées vont sous le premier",
    estDessine(signature.template) && r2.length === 2 && r2[0].tete === s5 && r2[0].membres.join() === [s5, gr, gr2].join() && r2[1].tete === signature && r2[1].membres.length === 1);
  ok("R175 : les grilles de secours et les générés ne sont pas des dessinés ; l'annexe, les épingles et les gabarits de l'atelier le sont",
    !estDessine(t("G-P1-a")) && !estDessine(t("GG1-EN-0066")) && estDessine(t("DP-01")) && estDessine(t("E-S1")) && estDessine({ ...t("E-S1"), origine: "atelier" }));
  ok("R176 : typeContenant retrouve le type d'un gabarit, −1 pour un gabarit absent", typeContenant(r, gr2.template.id) === 0 && typeContenant(r, "E-S1") === -1);
}

/* ─────────────────────────── 4. l'éditeur : R, V, « Poser » ─────────────────────────── */

const photo = (id: string, l: number, h: number, k: number): PhotoMaq => ({
  id, nom: `${id}.jpg`, l, h, date: `2026-06-12T${String(8 + k).padStart(2, "0")}:00:00`, personne: "Inès", lien: null, type: "atelier", coeur: false, signalee: false,
  autresMagazines: [], nouvelle: false, vignette: null,
});
function magazine(n = 3): Magazine {
  let m = nouveauMagazine("m-types", "Types", "2026-11-16T10:00:00.000Z");
  for (let k = 1; k < n; k++) m = O.insererDouble(m, m.planches[m.planches.length - 1].id).magazine;
  return m;
}

function verifierEditeur(ok: Rapporter): void {
  const os = "LPPLPL";
  const cat = new Map<string, PhotoMaq>([...os].map((o, i) => [`p${i}`, photo(`p${i}`, DIMS[o as "P"][0], DIMS[o as "P"][1], i)]));
  let e: EtatEditeur = O.creerEtat({ magazine: magazine(3), catalogue: cat });
  const pl = e.magazine.planches[1].id;
  const fautes: string[] = [];
  const pas = (g: O.Geste): void => {
    const avant = e;
    e = O.appliquer(avant, g);
    const err = O.verifierInvariants(e, avant, g);
    if (err.length) fautes.push(`${JSON.stringify(g)} : ${err.join(" ; ")}`);
  };
  /* « Poser » : le premier du classement, comme avant (I19) */
  pas({ type: "deposer", source: { type: "bibliotheque", ids: [...cat.keys()] }, cible: { type: "double", plancheId: pl } });
  pas({ type: "naviguer", plancheId: pl });
  const tpl = (): string => e.magazine.planches[1].double!.templateId;
  const liste = O.gabaritsPour(e, pl, "double");
  const types = O.typesPour(e, pl, "double", liste);
  const depart = tpl();
  ok(`R177 : « Poser » six photos sur une double pose toujours le premier du classement (${depart}), qui est dans le premier type, marqué posé`,
    depart === O.gabaritsClasses("double", [...cat.values()], null)[0].template.id && types[0].pose?.id === depart && types.filter((x) => x.pose).length === 1);

  /* R : chaque type une fois, sa tête, puis retour au premier type ; Maj+R recule */
  const vus: string[] = [];
  for (let i = 0; i < types.length; i++) { pas({ type: "touche", cle: "r" }); vus.push(tpl()); }
  const attendus = [...types.slice(1), types[0]].map((x) => x.tete.id);
  ok(`R177 : R passe par la TÊTE de chaque type, dans l'ordre du tiroir (${types.length} types pour ${liste.length} gabarits), puis revient au premier type ; Maj+R recule d'un type`,
    vus.join() === attendus.join() && new Set(vus.map((id) => typeDeGabarit(t(id)))).size === types.length && (pas({ type: "touche", cle: "R", shift: true }), tpl() === types[types.length - 1].tete.id));
  ok("R177 : chaque pas de R est une entrée « Autre disposition », passe les invariants et reste sauvegardable",
    fautes.length === 0 && e.historique.passe.at(-1)?.libelle === "Autre disposition" && contenuValide(JSON.parse(JSON.stringify(e.magazine))));

  /* V : les variantes du type posé, une fois chacune, puis retour ; jamais un autre type */
  pas({ type: "choisirGabarit", plancheId: pl, cible: "double", templateId: depart });
  const t0 = O.typesPour(e, pl, "double")[0];
  const vv: string[] = [];
  for (let i = 0; i < t0.membres.length; i++) { pas({ type: "touche", cle: "v" }); vv.push(tpl()); }
  const ordre = t0.membres.map((g) => g.id);
  const j = ordre.indexOf(depart);
  ok(`R178 : V fait le tour des ${t0.membres.length} variantes du type posé, dans l'ordre (la tête, puis le classement), sans en sortir, et revient ; une entrée « Autre variante » chacune`,
    t0.membres.length > 1 && vv.join() === [...ordre.slice(j + 1), ...ordre.slice(0, j + 1)].join() && vv.every((id) => typeDeGabarit(t(id)) === t0.cle) && e.historique.passe.at(-1)?.libelle === "Autre variante" && fautes.length === 0);
  pas({ type: "touche", cle: "V", shift: true });
  ok("R178 : Maj+V recule d'une variante", tpl() === ordre[(j - 1 + ordre.length) % ordre.length]);

  /* un type seul : V ne fait rien, ni historique ni message de refus */
  const seul = O.typesPour(e, pl, "double").find((x) => x.membres.length === 1);
  if (seul) {
    pas({ type: "choisirGabarit", plancheId: pl, cible: "double", templateId: seul.tete.id });
    const h = e.historique.passe.length, m0 = e.magazine;
    pas({ type: "touche", cle: "v" });
    ok(`R178 : sur un type sans variante (${seul.tete.id}), V ne fait rien`, e.magazine === m0 && e.historique.passe.length === h);
  } else ok("R178 : sur un type sans variante, V ne fait rien (aucun type seul ici : rien à vérifier)", true);

  /* la couverture n'a pas de types : V ne fait rien ; R garde ses onze gabarits */
  const surCouv = O.primitif({ ...e, plancheCourante: ID_COUVERTURE }, { type: "touche", cle: "v" });
  const rCouv = O.primitif({ ...e, plancheCourante: ID_COUVERTURE }, { type: "touche", cle: "r" });
  ok("R178 : sur la couverture, V ne fait rien ; R y parcourt toujours ses gabarits CV-",
    surCouv.type === "rien" && rCouv.type === "autreGabarit" && "plancheId" in rCouv && rCouv.plancheId === ID_COUVERTURE);

  /* la famille : R reste dans « Avec texte », chaque type du tiroir aussi */
  pas({ type: "familleGabarits", famille: "avec" });
  const avec = O.typesPour(e, pl, "double");
  let dans = true;
  for (let k = 0; k < Math.min(4, avec.length); k++) { pas({ type: "touche", cle: "r" }); dans &&= O.avecTexte(t(tpl())); }
  ok(`R176 : la famille « Avec texte » range ses propres types (${avec.length}) et R n'en sort pas`, avec.every((x) => x.pose || x.membres.every((g) => O.avecTexte(g.template))) && dans);
  pas({ type: "familleGabarits", famille: "tous" });

  /* un magazine sauvegardé garde ses ids : un gabarit retiré s'ouvre, R le quitte pour la tête d'un type proposé, V ne fait rien */
  const neutre = { zoom: 1, dx: 0, dy: 0 };
  const cat2 = new Map<string, PhotoMaq>([["a", photo("a", 4000, 3000, 0)], ["b", photo("b", 3000, 4000, 1)]]);
  const vieux: Magazine = magazine(3);
  vieux.planches = vieux.planches.map((p, i) => (i !== 1 ? p : { ...p, mode: "double" as const, gauche: null, droite: null,
    double: { templateId: "E-D14a", photos: [{ photoId: "a", recadrage: neutre }, { photoId: "b", recadrage: neutre }], textes: [{ contenu: "Madère", taille: 28, gras: true }, { contenu: "Texte", taille: 9, gras: false }, { contenu: "Titre", taille: 28, gras: true }, { contenu: "Texte", taille: 9, gras: false }] } }));
  const ouvert = O.creerEtat({ magazine: vieux, catalogue: cat2 });
  const idPl = vieux.planches[1].id;
  const parV = O.appliquer(ouvert, { type: "autreGabarit", plancheId: idPl, cible: "double", sens: 1, variante: true });
  const parR = O.appliquer(ouvert, { type: "autreGabarit", plancheId: idPl, cible: "double", sens: 1 });
  const tetes = O.typesPour(ouvert, idPl, "double").map((x) => x.tete.id);
  ok("R177 : un magazine sauvegardé sur un gabarit retiré (E-D14a) s'ouvre avec son id ; V n'y fait rien, R pose la tête du premier type proposé",
    contenuValide(vieux) && ouvert.magazine.planches[1].double?.templateId === "E-D14a" && parV.magazine === ouvert.magazine
      && parR.magazine.planches[1].double?.templateId === tetes[0] && !EPINGLES_RETIREES.has(tetes[0]));
}

export async function verifierMepTypes(ok: Rapporter, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, types de gabarits (T-208, vague 2 du 16/11) : la clé, les comptes, le rangement, R et V —");
  verifierCle(ok);
  verifierComptes(ok);
  verifierRangement(ok);
  verifierEditeur(ok);
}

/* lancé seul : npx tsx --tsconfig tsconfig.json scripts/verif-mep-types.ts */
if (process.argv[1]?.endsWith("verif-mep-types.ts")) {
  let echecs = 0, total = 0;
  void verifierMepTypes((nom, reussi) => { total++; if (!reussi) echecs++; console.log(`${reussi ? "✓" : "✗"} ${nom}`); }, (x) => console.log(`\n${x}`))
    .then(() => { console.log(`\n${total - echecs}/${total}`); process.exit(echecs ? 1 : 0); });
}
