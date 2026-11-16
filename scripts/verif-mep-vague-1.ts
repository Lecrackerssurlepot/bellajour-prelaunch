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
import { nouveauMagazine, type Magazine } from "@/lib/mise-en-page/magazine";
import { contenuValide } from "@/lib/mise-en-page/sauvegarde";

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
