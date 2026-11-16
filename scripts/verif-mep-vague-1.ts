/**
 * Le harnais de la VAGUE 1 (16/11), les retours de Mathias du 16/11 sur l'éditeur, appelé par verif-atelier.ts :
 *   1. T-210 : le pré-tri retiré (rien d'actif ne l'appelle, ses leçons restent lisibles, les étiquettes gardent ce qu'il voyait) ;
 *   2. T-211 : la couverture ouverte, ses photos candidates en tête de la barre (tri, puis lecture IA, puis le reste) ;
 *   3. T-213 : la grille de mise en page (6 × 6 du moteur, 8 × 8 dans les mêmes marges), l'aimant qui s'y accroche ;
 *   4. T-209 : les trois gabarits à aplat ne sont plus proposés, mais se relisent ; leurs copies sans aplat ;
 *   5. T-212 : ajouter un texte proprement (zone libre et calme, alignée, jamais sur un visage, une seule entrée d'historique).
 * Sans base, sans réseau, sans écriture.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import * as O from "@/lib/mise-en-page/editeur";
import type { EtatEditeur, LectureIA, PhotoMaq } from "@/lib/mise-en-page/editeur";
import { MODIFIANTS } from "@/lib/mise-en-page/editeur/etat";
import { ID_COUVERTURE } from "@/lib/mise-en-page/couverture";
import { TEMPLATES_DESSINES, candidats, cadresDe, decorDe, nouveauMagazine, templateParId, type Magazine, type PhotoRef } from "@/lib/mise-en-page/magazine";
import { EPINGLES_RETIREES } from "@/lib/mise-en-page/epingles";
import { GABARITS_COUVERTURE } from "@/lib/mise-en-page/couverture";
import { contenuValide } from "@/lib/mise-en-page/sauvegarde";
import { GRILLE, MARGES, PAGE_H, PAGE_L, caseGrille, zoneUtile, type Rect } from "@/lib/mise-en-page/geometrie";

type Rapporter = (nom: string, reussi: boolean) => void;

const photo = (id: string, o: Partial<PhotoMaq> = {}): PhotoMaq => ({
  id, nom: `${id}.jpg`, l: 4000, h: 3000, date: "2026-06-12T10:00:00", personne: "Inès", lien: null, type: "atelier", coeur: false, signalee: false,
  autresMagazines: [], nouvelle: false, vignette: null, ...o,
});
const heure = (h: number): string => `2026-06-12T${String(h).padStart(2, "0")}:00:00`;
function magazine(n = 3): Magazine {
  let m = nouveauMagazine("m-v1", "Vague 1", "2026-11-16T10:00:00.000Z");
  for (let k = 1; k < n; k++) m = O.insererDouble(m, m.planches[m.planches.length - 1].id).magazine;
  return m;
}
const lectureIA = (photos: Record<string, unknown>): LectureIA => {
  const r = O.lireLectureIA({ format: "bellajour-lecture-ia", version: 1, photos, rafales: [], groupes: [] });
  if (!r.ok) throw new Error(r.phrase);
  return r.lecture;
};
/** Tous les fichiers .ts / .tsx de src/ (lecture seule). */
function sources(dossier: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dossier)) {
    const p = join(dossier, n);
    if (statSync(p).isDirectory()) out.push(...sources(p));
    else if (/\.tsx?$/.test(n)) out.push(p);
  }
  return out;
}

export async function verifierMepVague1(ok: Rapporter, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, vague 1 (16/11) : pré-tri retiré, couverture, grille, gabarits à aplat, texte ajouté —");
  verifierT210(ok);
  verifierT211(ok);
  verifierT213(ok);
  verifierT209(ok);
}

/* ─────────────────────────── 1. T-210 : le pré-tri retiré ─────────────────────────── */

function verifierT210(ok: Rapporter): void {
  const racine = process.cwd();
  const src = sources(resolve(racine, "src"));
  const appelants = src.filter((f) => /from\s+["'][^"']*\/pretri["']|\bpreTrier\(|marquesProposees\(|<BoutonPreTri|type:\s*"preTrier"/.test(readFileSync(f, "utf8")));
  ok("T-210 : le module du pré-tri est dans archive/pretri-2026-11/ (avec son README, son bouton et ses tests), plus dans src/",
    !existsSync(resolve(racine, "src/lib/mise-en-page/editeur/pretri.ts")) && ["pretri.ts", "README.md", "BoutonPreTri.tsx", "verif-pretri.ts"].every((f) => existsSync(resolve(racine, "archive/pretri-2026-11", f))));
  ok(`T-210 : aucun fichier actif de src/ n'importe le pré-tri ni ne l'appelle${appelants.length ? ` (${appelants.join(", ")})` : ""}`, appelants.length === 0);
  const tri = readFileSync(resolve(racine, "src/app/admin/atelier/mise-en-page/[id]/TriBulles.tsx"), "utf8");
  ok("T-210 : plus de bouton « Pré-trier » dans la barre, et le geste « preTrier » n'est plus un geste de l'éditeur",
    !tri.includes("Pré-trier") && !MODIFIANTS.has("preTrier") && !("preTrier" in O));

  /* un vieux geste rejoué (une copie locale, un test) ne fait rien */
  const cat = new Map<string, PhotoMaq>([["a", photo("a")], ["b", photo("b")]]);
  const e = O.creerEtat({ magazine: magazine(2), catalogue: cat });
  const e2 = O.appliquer(e, { type: "preTrier" } as unknown as O.Geste);
  ok("T-210 : un geste « preTrier » rejoué ne touche pas au magazine et n'ouvre aucune entrée d'historique",
    e2.magazine === e.magazine && e2.historique.passe.length === 0);

  /* les leçons déjà enregistrées avec une règle du pré-tri restent lisibles */
  const vieille: O.Lecon = { type: "pretri_renverse", regle: "A10", photos: ["a"], proposition: "écartée : trop sombre", geste: "gardée", reglages: O.valeursReglages(), version: O.versionReglages() };
  ok("T-210 : une leçon « pretri_renverse » de règle A10 (ou R74) reste valide, et son mot reste « pré-tri »",
    O.leconValide(vieille) && O.leconValide({ ...vieille, regle: "R74" }) && O.motProposition({ regle: "A10" }) === "pré-tri" && O.motProposition({ regle: "PJ" }) === "premier jet");
  const qs = O.troisQuestions([vieille, vieille, { ...vieille, photos: ["b"] }]);
  ok("T-210 : les questions de fin d'export savent encore la poser", qs.length === 1 && qs[0].type === "pretri_renverse");

  /* ce que le pré-tri voyait de juste reste visible : rafales, sombres, floues */
  const mes = (n: number, o: Partial<O.Mesure> = {}): O.Mesure => ({ nettete: n, dhash: "0f0f0f0f0f0f0f0f", lumi: { moyenne: 120, noirs: 0.02, blancs: 0.02 }, ...o });
  const catR = new Map<string, PhotoMaq>([
    ...Array.from({ length: 13 }, (_, i) => [`n${i}`, photo(`n${i}`, { date: heure(8 + (i % 10)) })] as const),
    ["r1", photo("r1", { date: "2026-06-12T20:00:00" })], ["r2", photo("r2", { date: "2026-06-12T20:00:01" })],
    ["s", photo("s", { date: heure(21) })], ["f", photo("f", { date: heure(22) })],
  ]);
  const dh = (i: number): string => ["ff00ff00ff00ff00", "00ff00ff00ff00ff", "aaaa5555aaaa5555", "5555aaaa5555aaaa", "3c3c3c3c3c3c3c3c", "c3c3c3c3c3c3c3c3", "ffff0000ffff0000",
    "0000ffff0000ffff", "f00ff00ff00ff00f", "0ff00ff00ff00ff0", "cccc3333cccc3333", "3333cccc3333cccc", "f0f0f0f0f0f0f0f0"][i];
  const mesR = new Map<string, O.Mesure>([
    ...Array.from({ length: 13 }, (_, i) => [`n${i}`, mes(500 + i, { dhash: dh(i) })] as const),
    ["r1", mes(600, { dhash: "123456789abcdef0" })], ["r2", mes(400, { dhash: "123456789abcdef1" })],
    ["s", mes(300, { dhash: "fedcba9876543210", lumi: { moyenne: 20, noirs: 0.7, blancs: 0 } })], ["f", mes(5, { dhash: "0123012301230123" })],
  ]);
  const eR = O.appliquer(O.creerEtat({ magazine: magazine(2), catalogue: catR }), { type: "poserLecture", lecture: O.lireMesures(catR, mesR) });
  const tags = O.tagsDeLecture(eR.catalogue, eR.lecture);
  const filtre = (t: O.Tag) => O.visibles(O.appliquer(eR, { type: "filtrer", filtres: { lecture: t } }));
  ok("T-210 : sans pré-tri, la rafale, la sombre et la floue gardent leur étiquette, et chaque filtre les retrouve",
    (tags.get("r2") ?? []).includes("rafale") && (tags.get("s") ?? []).includes("sombre") && (tags.get("f") ?? []).includes("floue")
      && filtre("rafale").includes("r2") && filtre("sombre").includes("s") && filtre("floue").includes("f") && !filtre("floue").includes("n0"));
}

/* ─────────────────────────── 2. T-211 : la couverture ouverte ─────────────────────────── */

function verifierT211(ok: Rapporter): void {
  /* six photos dans l'ordre du temps ; « e » étiquetée Couverture au tri ; « b » et « f » proposées par la lecture IA (« Couv. ») */
  const cat = new Map<string, PhotoMaq>(["a", "b", "c", "d", "e", "f"].map((id, i) => [id, photo(id, { date: heure(8 + i) })]));
  let e: EtatEditeur = O.creerEtat({ magazine: magazine(2), catalogue: cat });
  e = O.appliquer(e, { type: "marquer", ids: ["e"], marque: "choisie" });
  e = O.appliquer(e, { type: "etiqueter", ids: ["e"], etiquette: "couverture" });
  e = O.appliquer(e, { type: "poserLectureIA", lecture: lectureIA({ "b.jpg": { role: { role: "couverture", interet: 0.9, raison: "le groupe au complet" } }, "f.jpg": { role: { role: "pleine", interet: 0.8, raison: "la vue", couverture: "paysage" } }, "c.jpg": { role: { role: "pleine", interet: 0.7, raison: "un détail" } } }) });
  const surPage = O.groupes(e);
  const couv = O.appliquer(e, { type: "naviguer", plancheId: ID_COUVERTURE });
  const g = O.groupes(couv);
  ok("T-211 : la couverture ouverte, la barre commence par « Pour la couverture » : l'étiquetée du tri, puis les « Couv. » de la lecture IA dans l'ordre habituel",
    couv.plancheCourante === ID_COUVERTURE && g[0].tete === true && g[0].libelle === "Pour la couverture" && g[0].ids.join() === "e,b,f");
  ok("T-211 : puis le reste, dans l'ordre habituel, sans les candidates (rien n'est montré deux fois, rien ne manque)",
    g.slice(1).flatMap((x) => x.ids).join() === "a,c,d" && g.flatMap((x) => x.ids).length === cat.size);
  ok("T-211 : sans groupement, le reste prend un titre (« Les autres »), sinon il se lirait comme la suite des candidates",
    couv.filtres.groupe !== "aucun" || g[1]?.libelle === "Les autres");
  ok("T-211 : sur une page, la barre est celle d'avant (aucun groupe de tête)", !surPage.some((x) => x.tete) && surPage.flatMap((x) => x.ids).join() === "a,b,c,d,e,f");
  const groupe = O.appliquer(couv, { type: "filtrer", filtres: { groupe: "jour" } });
  ok("T-211 : groupée par jour, la couverture garde sa tête, et le reste garde ses jours", O.groupes(groupe)[0].ids.join() === "e,b,f" && O.groupes(groupe)[1].libelle === "12 juin");
  const cherche = O.appliquer(couv, { type: "filtrer", filtres: { recherche: "f.jpg" } });
  ok("T-211 : les filtres valent pour la tête aussi (on range, on n'ajoute rien) : chercher « f.jpg » ne garde que f, en tête",
    O.groupes(cherche).length === 1 && O.groupes(cherche)[0].ids.join() === "f");
  ok("T-211 : visibles (sélection, ⇧-clic, flèches) suit l'ordre affiché", O.visibles(couv).join() === "e,b,f,a,c,d");

  /* sans aucune candidate, rien ne change */
  const sans: EtatEditeur = O.appliquer(O.creerEtat({ magazine: magazine(2), catalogue: cat }), { type: "naviguer", plancheId: ID_COUVERTURE });
  const ref: EtatEditeur = O.creerEtat({ magazine: magazine(2), catalogue: cat });
  ok("T-211 : sans photo étiquetée ni proposée, la couverture ouverte ne change rien à la barre",
    JSON.stringify(O.groupes(sans)) === JSON.stringify(O.groupes(ref)) && O.candidatesCouverture(sans).length === 0);
  ok("T-211 : la candidate du tri compte une seule fois, même proposée aussi par la lecture IA",
    O.candidatesCouverture(O.appliquer(couv, { type: "poserLectureIA", lecture: lectureIA({ "e.jpg": { role: { role: "couverture", interet: 0.9, raison: "x" } } }) })).join() === "e");
  void contenuValide;
}

/* ─────────────────────────── 3. T-213 : la grille de mise en page ─────────────────────────── */

function verifierT213(ok: Rapporter): void {
  const proche = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const memeRect = (a: Rect, b: Rect) => proche(a.x, b.x) && proche(a.y, b.y) && proche(a.l, b.l) && proche(a.h, b.h);
  const m6 = O.modulesDe(6), m8 = O.modulesDe(8);
  ok("T-213 : par défaut, la grille de structure du moteur (6 × 6, `GRILLE` de geometrie.ts) : 25 × 39,5 mm, gouttière 5 mm",
    O.TRAME_DEFAUT === 6 && m6.colonnes === GRILLE.colonnes && m6.lignes === GRILLE.lignes && m6.moduleL === GRILLE.moduleL && m6.moduleH === GRILLE.moduleH && m6.gouttiere === GRILLE.gouttiere);
  const z = zoneUtile("droite");
  ok("T-213 : le 8 × 8 dans les MÊMES marges et avec la MÊME gouttière : 17,5 × 28,375 mm, 8 modules + 7 gouttières = la zone utile (175 × 262)",
    m8.colonnes === 8 && m8.lignes === 8 && m8.gouttiere === GRILLE.gouttiere && proche(m8.moduleL, 17.5) && proche(m8.moduleH, 28.375)
      && proche(8 * m8.moduleL + 7 * m8.gouttiere, z.l) && proche(8 * m8.moduleH + 7 * m8.gouttiere, z.h) && z.l === 175 && z.h === 262);
  const pl = O.pagesPosees(null);
  const gG = O.grillePage(pl[0], 6), gD = O.grillePage(pl[1], 6);
  ok("T-213 : les marges par page : gauche 15 / 20 au pli (x 15 à 190), droite 20 au pli / 15 (x 230 à 405), haut 15, bas 20",
    pl.length === 2 && pl[0].cote === "gauche" && pl[1].cote === "droite" && memeRect(gG.marges, { x: MARGES.exterieure, y: MARGES.haut, l: 175, h: 262 })
      && memeRect(gD.marges, { x: PAGE_L + MARGES.interieure, y: MARGES.haut, l: 175, h: 262 }) && proche(gD.marges.x + gD.marges.l, 2 * PAGE_L - MARGES.exterieure) && proche(gG.marges.y + gG.marges.h, PAGE_H - MARGES.bas));
  ok("T-213 : six colonnes et six lignes séparées d'une gouttière, de la marge à la marge",
    gG.colonnes.length === 6 && gG.lignes.length === 6 && gG.colonnes.every((c, i) => i === 0 || proche(c.debut - gG.colonnes[i - 1].fin, 5))
      && proche(gG.colonnes[0].debut, gG.marges.x) && proche(gG.colonnes[5].fin, gG.marges.x + gG.marges.l) && proche(gG.lignes[5].fin, gG.marges.y + gG.marges.h));
  let toutes = true;
  for (const cote of ["gauche", "droite"] as const) for (let c = 0; c < 6; c++) for (let l = 0; l < 6; l++) for (let nc = 1; c + nc <= 6; nc++) for (let nl = 1; l + nl <= 6; nl++)
    toutes &&= memeRect(O.caseTrame(cote, 6, c, l, nc, nl), caseGrille(cote, c, l, nc, nl));
  ok("T-213 : chaque case 6 × 6 de l'écran est EXACTEMENT celle sur laquelle les gabarits sont bâtis (`caseGrille`), sur les deux pages", toutes);
  ok("T-213 : une case 8 × 8 tient dans les marges ; les huit colonnes font la zone utile",
    memeRect(O.caseTrame("gauche", 8, 0, 0, 8, 8), zoneUtile("gauche")) && O.grillePage(pl[1], 8).colonnes.length === 8);
  ok("T-213 : planche 1 = la page droite seule, dernière page = la gauche seule ; la couverture : la 4e à 0 (gauche), la 1re après le dos (droite)",
    O.pagesPosees("droite").length === 1 && O.pagesPosees("droite")[0].x === PAGE_L && O.pagesPosees("gauche")[0].cote === "gauche"
      && JSON.stringify(O.pagesDeCouverture(12)) === JSON.stringify([{ x: 0, cote: "gauche" }, { x: PAGE_L + 12, cote: "droite" }])
      && proche(O.grillePage(O.pagesDeCouverture(12)[1], 6).marges.x, PAGE_L + 12 + MARGES.interieure));

  /* l'aimant : il accroche aux lignes de la grille AFFICHÉE, en cadre libre */
  const L6 = O.lignesDeGrille(pl, 6);
  ok("T-213 : les lignes de l'aimant : les bords de chaque colonne et de chaque ligne (12 par page en x, 12 en y), sans doublon",
    L6.x.length === 24 && L6.y.length === 12 && L6.x.includes(40) && L6.x.includes(45) && L6.x.includes(405) && L6.y.includes(54.5));
  const LA = O.lignesDeGrille(pl, "artiste");
  ok("T-213 : la grille d'artiste prête ses tiers et son nombre d'or (pas ses diagonales)", LA.x.includes(70) && LA.x.includes(280) && LA.y.includes(99) && LA.x.length === 8);
  const r = { x: 41.5, y: 120, l: 60, h: 40 };
  const sans = O.aimanter(r, O.DEPLACEMENT, O.lignesAimant([]), 2);
  const avec = O.aimanter(r, O.DEPLACEMENT, O.lignesAimant([], L6), 2);
  ok("T-213 : un cadre lâché à 41,5 mm n'accroche rien sans grille ; grille affichée, il se cale sur la colonne (40 mm) et le guide le dit",
    sans.rect.x === 41.5 && proche(avec.rect.x, 40) && avec.guides.some((g) => g.axe === "x" && proche(g.pos, 40)));
  const r8 = O.aimanter({ x: 31.5, y: 120, l: 20, h: 40 }, O.DEPLACEMENT, O.lignesAimant([], O.lignesDeGrille(pl, 8)), 2);
  ok("T-213 : en 8 × 8, il se cale sur la colonne de 8 (15 + 17,5 = 32,5 mm)", proche(r8.rect.x, 32.5));

  /* écran seulement */
  const lire = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
  const E = "src/app/admin/atelier/mise-en-page/[id]/";
  const dehors = ["src/lib/mise-en-page/idml.ts", "src/lib/mise-en-page/pdf.ts", "src/lib/mise-en-page/magazine.ts", "src/lib/mise-en-page/sauvegarde.ts", `${E}exporter.ts`, `${E}exporterPdf.ts`, `${E}exporterPur.ts`]
    .every((f) => !/grilleMiseEnPage|lignesDeGrille|GrilleEcran|trame/.test(lire(f)));
  const couv = lire(`${E}SceneCouverture.tsx`);
  ok("T-213 : écran seulement (ni l'IDML, ni le PDF, ni la sauvegarde) ; la couverture la montre aussi, sur la 4e et la 1re",
    dehors && /<GrilleEcran largeur=\{W\} pages=\{pagesDeCouverture\(d\)\}/.test(couv));
}

/* ─────────────────────────── 4. T-209 : les gabarits à aplat ─────────────────────────── */

function verifierT209(ok: Rapporter): void {
  const RETIRES = ["E-D8c", "E-D14a", "E-D14b"];
  const COPIES: [string, string][] = [["E-D8c", "E-D8f"], ["E-D14a", "E-D14c"], ["E-D14b", "E-D14d"]];
  ok("T-209 : les trois gabarits à aplat sont retirés (E-D8c, E-D14a, E-D14b), et ce sont bien les seuls gabarits dessinés qui portaient un aplat",
    [...EPINGLES_RETIREES].sort().join() === [...RETIRES].sort().join() && RETIRES.every((id) => (templateParId(id)?.decor?.length ?? 0) > 0)
      && TEMPLATES_DESSINES.filter((t) => !EPINGLES_RETIREES.has(t.id)).every((t) => !(t.decor?.length)));
  ok("T-209 : leurs dispositions restent proposées SANS aplat, sous un nouvel id (mêmes cadres, aucun décor)",
    COPIES.every(([a, b]) => { const ta = templateParId(a), tb = templateParId(b); return !!ta && !!tb && !tb.decor && JSON.stringify(ta.cadres) === JSON.stringify(tb.cadres) && ta.nbPhotos === tb.nbPhotos; }));

  /* ni au tiroir, ni sous R, ni par « Poser » : `candidats` les écarte, pour tous les nombres et toutes les orientations */
  const ph = (i: number, l: number, h: number): PhotoRef => ({ id: `p${i}`, nom: `p${i}.jpg`, l, h, date: `2026-06-12T1${i % 10}:00:00` });
  let jamais = true;
  for (let n = 1; n <= 12; n++) for (const forme of [[4000, 3000], [3000, 4000], [3000, 3000]] as const) {
    const photos = Array.from({ length: n }, (_, i) => ph(i, forme[0], forme[1]));
    jamais &&= candidats("double", photos).every((t) => !EPINGLES_RETIREES.has(t.id)) && O.gabaritsClasses("double", photos, null).every((x) => !EPINGLES_RETIREES.has(x.template.id));
  }
  ok("T-209 : `candidats` et `gabaritsClasses` (le tiroir, R, Poser) ne proposent jamais un gabarit retiré, de 1 à 12 photos, paysage, portrait ou carré", jamais);

  const cat = new Map<string, PhotoMaq>(Array.from({ length: 9 }, (_, i) => [`p${i}`, photo(`p${i}`, { date: heure(8 + i), l: i % 2 ? 3000 : 4000, h: i % 2 ? 4000 : 3000 })]));
  let e: EtatEditeur = O.creerEtat({ magazine: magazine(3), catalogue: cat });
  const pl2 = e.magazine.planches[1].id;
  e = O.appliquer(e, { type: "deposer", source: { type: "bibliotheque", ids: ["p0", "p1"] }, cible: { type: "double", plancheId: pl2 } });
  const tiroir = O.gabaritsPour(e, pl2, "double").map((g) => g.id);
  let vus = new Set<string>();
  let x = e;
  for (let k = 0; k < tiroir.length + 2; k++) { x = O.appliquer(x, { type: "autreGabarit", plancheId: pl2, cible: "double", sens: 1 }); vus.add(x.magazine.planches[1].double?.templateId ?? ""); }
  ok("T-209 : deux photos sur une double : le tiroir n'offre ni E-D14a ni sa copie retirée, mais E-D14c ; R fait le tour sans jamais tomber sur un retiré",
    tiroir.length > 2 && !tiroir.some((id) => EPINGLES_RETIREES.has(id)) && tiroir.includes("E-D14c") && ![...vus].some((id) => EPINGLES_RETIREES.has(id)) && vus.size > 2);
  let e9: EtatEditeur = O.creerEtat({ magazine: magazine(3), catalogue: cat });
  e9 = O.appliquer(e9, { type: "deposer", source: { type: "bibliotheque", ids: [...cat.keys()] }, cible: { type: "double", plancheId: e9.magazine.planches[1].id } });
  vus = new Set(O.gabaritsPour(e9, e9.magazine.planches[1].id, "double").map((g) => g.id));
  ok("T-209 : neuf photos : le photomaton sans aplat (E-D8f) est au tiroir, celui à fond noir (E-D8c) n'y est plus", vus.has("E-D8f") && !vus.has("E-D8c"));

  /* un magazine sauvegardé qui s'en sert s'ouvre toujours, avec son aplat */
  const neutre = { zoom: 1, dx: 0, dy: 0 };
  const vieux: Magazine = { ...magazine(3) };
  vieux.planches = vieux.planches.map((p, i) => (i !== 1 ? p : { ...p, mode: "double" as const, gauche: null, droite: null,
    double: { templateId: "E-D14a", photos: [{ photoId: "p0", recadrage: neutre }, { photoId: "p1", recadrage: neutre }], textes: [{ contenu: "Madère", taille: 28, gras: true }, { contenu: "Texte", taille: 9, gras: false }, { contenu: "Titre", taille: 28, gras: true }, { contenu: "Texte", taille: 9, gras: false }] } }));
  const ouvert = O.creerEtat({ magazine: vieux, catalogue: cat });
  const d = ouvert.magazine.planches[1].double!;
  ok("T-209 : un magazine sauvegardé sur E-D14a est valide, s'ouvre sans erreur d'invariant, et garde ses cadres et ses deux aplats",
    contenuValide(vieux) && O.verifierInvariants(ouvert).length === 0 && cadresDe(d, "double").length === 6 && decorDe(d, "double").length === 2);
  const r = O.appliquer(ouvert, { type: "autreGabarit", plancheId: vieux.planches[1].id, cible: "double", sens: 1 });
  ok("T-209 : R depuis un gabarit retiré passe à un gabarit proposé (le titre écrit le suit, s'il a une place)",
    !EPINGLES_RETIREES.has(r.magazine.planches[1].double?.templateId ?? "E-D14a") && r.magazine !== ouvert.magazine);
  ok("T-209 : les gabarits de couverture gardent leurs aplats (la couverture n'a pas encore de fond libre)", GABARITS_COUVERTURE.some((g) => g.decor.length > 0));
}
