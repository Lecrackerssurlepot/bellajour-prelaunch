/**
 * Le harnais du lot D (12/11) : les gabarits de page GÉNÉRÉS par la grammaire (src/lib/mise-en-page/genere.ts) et la
 * GRILLE D'ARTISTE (editeur/grilleArtiste.ts).
 *
 *     npx tsx --tsconfig tsconfig.json scripts/verif-mep-generes.ts
 *
 * Appelé aussi par scripts/verif-atelier.ts. Sans base, sans réseau, sans écriture. Ce qu'il tient :
 *   - les comptes du script du maquettiste (grammaire-combinatoire.py) : chaque schéma, chaque nombre de photos ;
 *   - l'id est la RECETTE : décodé il redonne les mêmes cadres au micron, sans table, et des mesures figées (si la grille
 *     bouge un jour, les vieux magazines bougeraient : le harnais le dit) ;
 *   - déterminisme, marges, rien à moins de 20 mm du pli, aucun doublon de découpe, les dessinés au moins deux par nombre,
 *     les grilles de secours inchangées ;
 *   - l'ordre : à qualité égale, dessinés, puis générés, puis grilles ; le tiroir plafonné ; R à travers les centaines ;
 *   - la grille d'artiste : lignes exactes, écran seulement, montée une fois, sans pointeur.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as O from "@/lib/mise-en-page/editeur";
import type { EtatEditeur, PhotoMaq } from "@/lib/mise-en-page/editeur";
import {
  SCHEMAS, affecter, decoupesDePage, decoupesPour, genereParId, genereesParSchema, genereesPour, idDeRecette, nomDe, templateDeDecoupe, type CaseG,
} from "@/lib/mise-en-page/genere";
import { FOND_PERDU, GRILLE, MARGES, PAGE_H, PAGE_L, PLEINE_PAGE_DROITE, zoneUtile, type Rect } from "@/lib/mise-en-page/geometrie";
import { grillesDouble, grillesPage, toutesLesGrilles } from "@/lib/mise-en-page/grilles";
import {
  TEMPLATES_DESSINES, candidats, cadresDe, nouveauMagazine, signaturesCompatibles, templateParId, tousLesTemplates, type Magazine, type PhotoRef,
} from "@/lib/mise-en-page/magazine";
import { orientationDe, pourCote, signatureDe, type Orientation, type Template } from "@/lib/mise-en-page/types";

const EPS = 1e-6;
const um = (v: number): number => Math.round(v * 1e6);
const cadresUm = (t: Template): string => JSON.stringify(t.cadres.map((c) => [c.role, um(c.x), um(c.y), um(c.l), um(c.h), c.bord ?? null, c.rotation ?? null]));

/** Un hasard à graine (mulberry32) : les mêmes tirages à chaque passage. */
function hasard(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const fnv = (s: string): string => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); };

const DIMS: [number, number][] = [[4000, 3000], [6000, 4000], [3000, 4000], [4000, 6000], [3000, 3000], [1920, 1080], [1080, 1920]];
const DIMS_O: Record<Orientation, [number, number]> = { P: [2000, 3000], L: [3000, 2000], C: [2000, 2000] };
const refs = (os: readonly Orientation[]): PhotoRef[] => os.map((o, i) => ({ id: `p${i}`, nom: `p${i}`, l: DIMS_O[o][0], h: DIMS_O[o][1], date: null }));
const sequences = (n: number): Orientation[][] => {
  let out: Orientation[][] = [[]];
  for (let i = 0; i < n; i++) out = out.flatMap((s) => (["P", "L", "C"] as const).map((o) => [...s, o]));
  return out;
};
const nomsOrient = (t: Template): Orientation[] => t.cadres.filter((c) => c.role === "photo").map((c) => c.orientation ?? orientationDe(c.l, c.h));

/** Les comptes du script (grammaire-combinatoire.py) APRÈS dédoublonnage et sans les grilles à neuf photos (la page en porte six). */
const COMPTES_SCHEMA: Record<string, number> = { EN: 87, RG: 98, GR: 52, HS: 863, MO: 166, FL: 498, CH: 196, IN: 102 };
const COMPTES_NOMBRE: Record<number, number> = { 1: 87, 2: 934, 3: 614, 4: 246, 5: 22, 6: 159 };

/** Le catalogue d'essai de l'éditeur : « A:P B:L … ». */
function catalogue(os: readonly Orientation[]): PhotoMaq[] {
  return os.map((o, i) => ({
    id: String.fromCharCode(65 + i), nom: String.fromCharCode(65 + i), l: DIMS_O[o][0], h: DIMS_O[o][1], date: `2026-06-11T08:${String(i).padStart(2, "0")}:00.000Z`,
    personne: "Inès", lien: "Lien général", type: "lien", coeur: false, signalee: false, autresMagazines: [], nouvelle: false, vignette: null,
  }));
}

export function verifierMepGeneres(rapporter: (nom: string, reussi: boolean) => void, titre: (t: string) => void): void {
  titre("— Mise en page : les gabarits générés (lot D, 12/11) —");

  /* ─── 1. les comptes du script ─── */
  const tout = decoupesDePage();
  const parSchema: Record<string, number> = {};
  for (const d of tout) parSchema[d.schema] = (parSchema[d.schema] ?? 0) + 1;
  rapporter(`générés : les comptes du script du maquettiste par schéma (${JSON.stringify(parSchema)}) : EN 87, RG 98, GR 52 (62 moins 10 à neuf photos), HS 863, MO 166 (170 moins 4 déjà HS), FL 498, CH 196, IN 102`,
    SCHEMAS.every((s) => parSchema[s.code] === COMPTES_SCHEMA[s.code]) && tout.length === 2062);
  const parNombre: Record<number, number> = {};
  for (const d of tout) parNombre[d.nbPhotos] = (parNombre[d.nbPhotos] ?? 0) + 1;
  rapporter(`générés : compte par nombre de photos (${JSON.stringify(parNombre)}), le même que le script (IN : le fond compte une photo)`,
    Object.entries(COMPTES_NOMBRE).every(([n, c]) => parNombre[+n] === c && decoupesPour(+n).length === c) && decoupesPour(7).length === 0 && decoupesPour(0).length === 0);
  /* les signatures du script (page « 2.3 » de grammaire.md) : le même partage P / L / C, hors incrustations (le script les compte à part) */
  const sig = (n: number): Record<string, number> => {
    const r: Record<string, number> = {};
    for (const d of decoupesPour(n)) if (d.schema !== "IN") { const k = [...d.orientations].sort().join(","); r[k] = (r[k] ?? 0) + 1; }
    return Object.fromEntries(Object.entries(r).sort(([a], [b]) => (a < b ? -1 : 1)));
  };
  rapporter("générés : les signatures du script (1 photo : P 54, L 24, C 9 ; 2 : P,P 342, L,P 410, L,L 96, C,P 28, C,L 20, C,C 8 ; 3 : P,P,P 130, L,P,P 89, L,L,P 241, L,L,L 62, C,L,L 20… ; 4 : L,L,L,P 105 et C,P,P,P 2, les 4 pavages que HS a déjà) et deux paysages + deux portraits : zéro",
    JSON.stringify(sig(1)) === JSON.stringify({ C: 9, L: 24, P: 54 })
      && JSON.stringify(sig(2)) === JSON.stringify({ "C,C": 8, "C,L": 20, "C,P": 28, "L,L": 96, "L,P": 410, "P,P": 342 })
      && JSON.stringify(sig(3)) === JSON.stringify({ "C,C,C": 4, "C,L,L": 20, "C,L,P": 4, "C,P,P": 4, "L,L,L": 62, "L,L,P": 241, "L,P,P": 89, "P,P,P": 130 })
      && JSON.stringify(sig(4)) === JSON.stringify({ "C,C,C,C": 2, "C,L,L,L": 8, "C,P,P,P": 2, "L,L,L,L": 45, "L,L,L,P": 105, "L,P,P,P": 9, "P,P,P,P": 63 }) && (sig(4)["L,L,P,P"] ?? 0) === 0);

  /* ─── 2. l'id est la recette : décodable, stable, sans table ─── */
  const memeTemplate = (a: Template, b: Template | null) => !!b && a.id === b.id && a.nom === b.nom && a.nbPhotos === b.nbPhotos && a.signature === b.signature && cadresUm(a) === cadresUm(b);
  rapporter("id : chaque découpe, encodée puis décodée (genereParId, puis templateParId du magazine), redonne les mêmes cadres au micron et le même nom",
    tout.every((d) => { const t = templateDeDecoupe(d); return t.id === idDeRecette(d.schema, d.cases) && memeTemplate(t, genereParId(d.id)) && memeTemplate(t, templateParId(d.id)); }));
  /* chaque liste rangée (ordre des cadres permuté) : l'id porte l'ordre, le décodage le retrouve */
  const echantillon: Orientation[][] = [["L", "P", "P"], ["P", "L", "P", "L"], ["C", "P"], ["P", "P", "P", "P", "L", "L"], ["L"], ["P", "L"]];
  rapporter("id : les gabarits rangés pour des photos (suffixe -p… quand l'ordre n'est pas celui de la lecture) se décodent à l'identique, sans table",
    echantillon.every((os) => genereesPour(os).every((t) => memeTemplate(t, genereParId(t.id)) && memeTemplate(t, templateParId(t.id))))
      && genereesPour(["L", "P", "P"]).some((t) => /-p\d+$/.test(t.id)));
  const g = (id: string): Template | null => genereParId(id);
  const cadresDe_ = (id: string) => (g(id)?.cadres ?? []).map((c) => [c.x, c.y, c.l, c.h]);
  rapporter("id : des mesures FIGÉES (en mm, à la main : zone utile 20 / 15, module 25 × 39,5, gouttière 5) : si la grille ou caseGrille bougeait, les magazines sauvegardés bougeraient avec",
    JSON.stringify(cadresDe_("GG1-EN-1242")) === JSON.stringify([[50, 104, 115, 84]])
      && JSON.stringify(cadresDe_("GG1-HS-0063.0322.2322")) === JSON.stringify([[20, 15, 175, 128.5], [20, 148.5, 55, 84], [80, 148.5, 55, 84]])
      && JSON.stringify(cadresDe_("GG1-HS-0122.2122.0363-p201")) === JSON.stringify([[20, 148.5, 175, 128.5], [20, 59.5, 55, 84], [80, 59.5, 55, 84]])
      && JSON.stringify(cadresDe_("GG1-CH-0133.2121")) === JSON.stringify([[20, 59.5, 85, 128.5], [80, 59.5, 55, 39.5]])
      && JSON.stringify(cadresDe_("GG1-IN-0021")) === JSON.stringify([[0, -3, 213, 303], [20, 15, 55, 39.5]])
      && g("GG1-IN-0021")?.cadres[1].bord === 2.5
      && g("GG1-HS-0063.0322.2322")?.nom === "Héros et deux satellites · dessous" && g("GG1-IN-0021")?.nom === "Fond plein et une vignette · en haut, côté pli");
  const refus = [
    "", "GG1", "GG1-", "GG2-EN-1242", "GG0-EN-1242", "gg1-EN-1242", "GG1-XX-1242", "GG1-EN-", "GG1-EN-124", "GG1-EN-12420", "GG1-EN-1242 ", " GG1-EN-1242", "GG1-EN-1242-",
    "GG1-EN-5242", "GG1-EN-0001", "GG1-EN-0033.3033", "GG1-RG-0033.3033-p01", "GG1-RG-0033.3033-p00", "GG1-RG-0033.3033-p012", "GG1-RG-0033.3033-p2",
    "GG1-CH-0133", "GG1-CH-0133.2121-p10", "GG1-IN-0021-p01", "GG1-MO-0033.3033.0333-p0123", "G-P1-b", "E-S1", "DP-01", "GG1-EN-1242-p0",
    "GG1-FL-0011.0111.0211.0311.0411.0511.0021", /* sept photos par page : la page n'en porte que six */
  ];
  rapporter(`id : refuse ce qui n'est pas la forme exacte (${refus.length} ids : version inconnue, schéma inconnu, case hors de la grille, ordre qui n'est pas une permutation ni sous sa forme canonique, trop de photos)`,
    refus.every((id) => genereParId(id) === null && (!/^[Gg][Gg]/.test(id) || templateParId(id) === null)));

  /* ─── 3. déterminisme ─── */
  const idsDe = (l: readonly Template[]) => l.map((t) => t.id).join("|");
  rapporter("déterminisme : les mêmes photos donnent les mêmes gabarits dans le même ordre (listes, découpes, catalogue par schéma)",
    echantillon.every((os) => idsDe(genereesPour(os)) === idsDe(genereesPour([...os])))
      && fnv(tout.map((d) => d.id).join("|")) === fnv(decoupesDePage().map((d) => d.id).join("|"))
      && JSON.stringify(genereesParSchema().map((s) => [s.code, s.parNombre.map((x) => [x.n, x.liste.length])])) === JSON.stringify(genereesParSchema().map((s) => [s.code, s.parNombre.map((x) => [x.n, x.liste.length])])));

  /* ─── 4. marges, pli, texte ─── */
  const z = zoneUtile("droite");
  const dehors: string[] = [];
  const surPli: string[] = [];
  for (const d of tout) {
    const t = templateDeDecoupe(d);
    t.cadres.forEach((c, i) => {
      const pleine = d.schema === "IN" && i === 0;
      if (pleine) { if (Math.abs(c.x - PLEINE_PAGE_DROITE.x) > EPS || Math.abs(c.y - PLEINE_PAGE_DROITE.y) > EPS || Math.abs(c.l - PLEINE_PAGE_DROITE.l) > EPS || Math.abs(c.h - PLEINE_PAGE_DROITE.h) > EPS) dehors.push(d.id); return; }
      if (c.x < z.x - EPS || c.y < z.y - EPS || c.x + c.l > z.x + z.l + EPS || c.y + c.h > z.y + z.h + EPS) dehors.push(d.id);
      /* page gauche = miroir : aucun cadre ne passe la marge extérieure (15) ni la marge du pli (20) */
    });
    for (const c of pourCote(t, "gauche")) if (c.x + c.l > PAGE_L - MARGES.interieure + EPS && !(d.schema === "IN" && c.l > 200)) surPli.push(d.id);
  }
  rapporter(`marges : chaque cadre photo dans la zone utile (20, 15, 175 × 262), sauf la pleine page d'une incrustation (0, −3, 213 × 303) ; aucun cadre d'une page gauche sur la marge du pli${dehors.length ? ` — hors : ${[...new Set(dehors)].slice(0, 5).join(", ")}` : ""}`,
    dehors.length === 0 && surPli.length === 0 && Math.abs(PLEINE_PAGE_DROITE.x) < EPS && PLEINE_PAGE_DROITE.y === -FOND_PERDU);
  rapporter("texte : aucun cadre texte (photos seulement) donc rien à moins de 20 mm du pli ; chaque gabarit rangé pour des photos de même (cadres, nombre, signature)",
    tout.every((d) => templateDeDecoupe(d).cadres.every((c) => c.role === "photo"))
      && echantillon.every((os) => genereesPour(os).every((t) => t.cadres.every((c) => c.role === "photo" ? true : c.x >= MARGES.interieure - EPS) && t.nbPhotos === os.length && t.cadres.length === os.length && t.signature === signatureDe(t.cadres) && t.portee === "page" && t.origine === "genere")));
  /* les cadres ne se recouvrent que là où la grammaire le veut : CH (un module, 25 × 39,5) et IN (les vignettes sur le fond) */
  const inter = (a: Rect, b: Rect): number => Math.max(0, Math.min(a.x + a.l, b.x + b.l) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const recouvrements: string[] = [];
  for (const d of tout) {
    const cs = templateDeDecoupe(d).cadres;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const s = inter(cs[i], cs[j]);
      if (d.schema === "CH") { if (Math.abs(s - GRILLE.moduleL * GRILLE.moduleH) > EPS) recouvrements.push(d.id); }
      else if (d.schema === "IN") { if (i !== 0 && s > EPS) recouvrements.push(d.id); }
      else if (s > EPS) recouvrements.push(d.id);
    }
  }
  rapporter(`superposition : aucun cadre n'en recouvre un autre, sauf CH (exactement un module) et les vignettes sur le fond d'une incrustation${recouvrements.length ? ` — ${[...new Set(recouvrements)].slice(0, 5).join(", ")}` : ""}`, recouvrements.length === 0);

  /* ─── 5. aucun doublon ─── */
  const geo = (d: { schema: string; cases: readonly CaseG[] }) => `${d.schema === "CH" || d.schema === "IN" ? d.schema : "P"}|${(d.schema === "CH" || d.schema === "IN" ? d.cases : [...d.cases].sort((a, b) => a[1] - b[1] || a[0] - b[0])).map((r) => r.join("")).join(".")}`;
  const noms = new Set(tout.map((d) => templateDeDecoupe(d).nom));
  rapporter(`doublons : aucune découpe deux fois (ids et géométries uniques), dans la liste de chaque nombre et dans celle de chaque suite de photos ; ${noms.size} noms lisibles`,
    new Set(tout.map((d) => d.id)).size === tout.length && new Set(tout.map(geo)).size === tout.length
      && echantillon.every((os) => { const l = genereesPour(os); return new Set(l.map((t) => t.id)).size === l.length && new Set(l.map((t) => JSON.stringify(t.cadres.map((c) => [c.x, c.y, c.l, c.h]).sort()))).size === l.length; })
      && noms.size >= 100);
  rapporter("noms : tous en français lisible (majuscule, jamais vides, aucun tiret long), tirés du schéma ; la page de catalogue les range par schéma",
    tout.every((d) => { const n = templateDeDecoupe(d).nom; return /^[A-ZÉ]/.test(n) && n.length >= 5 && !/[—–]/.test(n) && !/ {2}/.test(n) && n === nomDe(d.schema, d.cases); })
      && genereesParSchema().reduce((s, x) => s + x.parNombre.reduce((u, y) => u + y.liste.length, 0), 0) === tout.length);

  /* ─── 6. les photos filtrent : la compatibilité des formes ─── */
  let incoherent = 0, faussePosition = 0;
  for (const n of [1, 2, 3, 4, 5]) {
    for (const os of sequences(n)) {
      for (const d of decoupesPour(n)) {
        if (d.schema === "CH" || d.schema === "IN") continue;
        if ((affecter(d.orientations, os) !== null) !== signaturesCompatibles([...d.orientations], os)) incoherent++;
      }
      for (const t of genereesPour(os)) {
        const o = nomsOrient(t);
        if (!o.every((x, i) => x === os[i] || x === "C" || os[i] === "C")) faussePosition++;
      }
    }
  }
  rapporter(`formes : la règle de rangement dit oui exactement quand signaturesCompatibles dit oui (3 + 9 + 27 + 81 + 243 suites, 0 écart : ${incoherent}) ; chaque photo tombe dans un cadre de sa forme ou un carré (${faussePosition} écart)`, incoherent === 0 && faussePosition === 0);
  const six = genereesPour(["P", "P", "P", "P", "L", "L"]);
  rapporter("formes : deux paysages + deux portraits sur une page : la grammaire n'a que les quatre carrés (C,C,C,C), le choix ne tombe jamais à vide (dessinés et grilles en renfort)",
    genereesPour(["L", "L", "P", "P"]).every((t) => nomsOrient(t).every((o) => o === "C")) && candidats("page", refs(["L", "L", "P", "P"])).length > 0
      && candidats("page", refs(["P", "L", "P", "L"])).every((t) => t.nbPhotos === 4) && [1, 2, 3, 4, 5, 6].every((n) => sequences(n).every((os) => candidats("page", refs(os)).length > 0)));
  const compte3 = genereesPour(["P", "P", "P"]).length;
  rapporter(`volume : trois portraits sur une page : ${compte3} gabarits générés (des centaines par nombre de photos : 1 : ${genereesPour(["P"]).length} · 2 portraits : ${genereesPour(["P", "P"]).length} · 4 : ${genereesPour(["P", "P", "P", "P"]).length} · 6 : ${six.length})`,
    compte3 >= 100 && genereesPour(["P", "P"]).length >= 100 && genereesPour(["P"]).length >= 50);

  /* ─── 7. les dessinés, les grilles ─── */
  const manques: string[] = [];
  for (let n = 1; n <= 12; n++) if (TEMPLATES_DESSINES.filter((t) => t.portee === "double" && t.nbPhotos === n).length < 2) manques.push(`double ${n}`);
  for (let n = 1; n <= 6; n++) if (TEMPLATES_DESSINES.filter((t) => t.portee === "page" && t.nbPhotos === n).length < 2) manques.push(`page ${n}`);
  rapporter(`dessinés : toujours au moins deux par nombre (double 1 à 12, page 1 à 6), aucun généré parmi eux, aucun généré dans la table des ids${manques.length ? ` — manquent : ${manques.join(", ")}` : ""}`,
    manques.length === 0 && TEMPLATES_DESSINES.every((t) => t.origine !== "genere") && tousLesTemplates().every((t) => t.origine !== "genere"));
  rapporter("grilles : inchangées (117 grilles, mêmes cadres : empreinte 391722d3 ; page 4,4,4,4,3,3 ; double 7 puis 8 jusqu'à 12), jamais loger le générateur dans grilles.ts",
    toutesLesGrilles().length === 117 && fnv(JSON.stringify(toutesLesGrilles())) === "391722d3"
      && [1, 2, 3, 4, 5, 6].map((n) => grillesPage(n).length).join() === "4,4,4,4,3,3" && Array.from({ length: 12 }, (_, i) => grillesDouble(i + 1).length).join() === "7,8,8,8,8,8,8,8,8,8,8,8"
      && toutesLesGrilles().every((t) => t.origine === "grille" && /^G-[PD]\d+-[a-h]$/.test(t.id)));
  /* les doubles ne changent pas : aucun générés pour une double */
  rapporter("doubles : aucun gabarit généré (pages seulement) ; la liste d'une double est celle d'avant",
    [1, 2, 3, 5, 8, 12].every((n) => candidats("double", refs(Array.from({ length: n }, () => "L" as const))).every((t) => t.origine !== "genere")));

  /* ─── 8. l'ordre : dessinés, puis générés, puis grilles ─── */
  {
    const h = hasard(20261112);
    let paires = 0, malRanges = 0, ordreListe = 0, essais = 0;
    for (let k = 0; k < 400; k++) {
      const n = 1 + Math.floor(h() * 6);
      const photos: PhotoRef[] = Array.from({ length: n }, (_, i) => { const d = DIMS[Math.floor(h() * DIMS.length)]; return { id: `p${i}`, nom: `p${i}`, l: d[0], h: d[1], date: null }; });
      const rang = new Map(O.gabaritsClasses("page", photos, null).map((x, i) => [x.template.id, i] as const));
      const brut = (t: Template) => O.noterGabarit(t, photos, null) + O.BONUS_ORIGINE[t.portee][t.origine];
      const tous = O.gabaritsClasses("page", photos, null).map((x) => x.template);
      const des = tous.filter((t) => t.origine === "epingle" || t.origine === "annexe");
      const gen = tous.filter((t) => t.origine === "genere");
      const gri = tous.filter((t) => t.origine === "grille");
      essais++;
      for (const d of des) for (const x of gen) { paires++; if (brut(d) <= brut(x) + O.AVANCE_DESSINES + 1e-12 && rang.get(d.id)! > rang.get(x.id)!) malRanges++; }
      for (const x of gen) for (const r of gri) { paires++; if (brut(x) <= brut(r) + O.AVANCE_GENERES + 1e-12 && rang.get(x.id)! > rang.get(r.id)!) malRanges++; }
      /* à fit égal, exactement : un dessiné avant un généré, un généré avant une grille */
      for (const d of des) for (const x of gen) if (Math.abs(brut(d) - brut(x)) < 1e-12 && rang.get(d.id)! > rang.get(x.id)!) malRanges++;
      const l = candidats("page", photos);
      const premierGen = l.findIndex((t) => t.origine === "genere"), premiereGrille = l.findIndex((t) => t.origine === "grille");
      const dernierDessine = l.map((t) => t.origine === "epingle" || t.origine === "annexe" || t.origine === "atelier").lastIndexOf(true);
      if (!(dernierDessine < (premierGen < 0 ? l.length : premierGen)) || (premierGen >= 0 && premiereGrille >= 0 && premierGen > premiereGrille)) ordreListe++;
    }
    rapporter(`ordre : à qualité égale, les dessinés d'abord (jusqu'à ${O.AVANCE_DESSINES} de note), puis les générés (jusqu'à ${O.AVANCE_GENERES}), puis les grilles : ${paires} paires lues sur ${essais} lots de photos, ${malRanges} mal rangée(s)`, malRanges === 0 && paires > 10000);
    rapporter(`ordre : dans candidats, tous les dessinés, puis les générés, puis les grilles (${ordreListe} lot(s) à l'envers)`, ordreListe === 0);
    rapporter("ordre : les réglages sont nommés (un seul tableau BONUS_ORIGINE par portée) ; la double garde BONUS_ANNEXE sur les grilles, comme avant",
      O.BONUS_ORIGINE.double.epingle === O.BONUS_ANNEXE && O.BONUS_ORIGINE.double.annexe === O.BONUS_ANNEXE && O.BONUS_ORIGINE.double.grille === 0 && O.BONUS_ORIGINE.double.genere === 0
        && O.BONUS_ORIGINE.page.genere === O.AVANCE_GENERES && O.BONUS_ORIGINE.page.grille === 0 && O.BONUS_ORIGINE.page.epingle === O.AVANCE_DESSINES + O.AVANCE_GENERES
        && O.AVANCE_DESSINES > 0 && O.AVANCE_GENERES > 0);
  }

  /* ─── 9. l'éditeur : composer, le tiroir, R, annuler, sauvegarder ─── */
  {
    const os: Orientation[] = ["L", "P", "P"];
    const cat = catalogue(os);
    let e: EtatEditeur = O.creerEtat({ magazine: nouveauMagazine("mag-test", "Test", "2026-11-12T10:00:00.000Z"), catalogue: cat });
    const pas = (geste: O.Geste) => {
      const avant = e;
      e = O.appliquer(avant, geste);
      const err = O.verifierInvariants(e, avant, geste);
      if (err.length) throw new Error(`invariants après ${JSON.stringify(geste)} : ${err.join(" ; ")}`);
    };
    let msg: string | null = null;
    let nbListe = 0, nbR = 0, vus = 0, tousGeneres = true, valide = true, retour = true;
    try {
      pas({ type: "poser", cible: { type: "page", plancheId: "pl-1", cote: "droite" }, ids: ["A", "B", "C"], confirme: true });
      const d0 = e.magazine.planches[0].droite!;
      const liste = O.gabaritsPour(e, "pl-1", "droite");
      nbListe = liste.length;
      if (!liste.some((x) => x.courant && x.id === d0.templateId)) throw new Error("le gabarit courant n'est pas dans le tiroir");
      if (new Set(liste.map((x) => x.id)).size !== liste.length) throw new Error("un gabarit deux fois dans le tiroir");
      /* R : on parcourt toute la liste, une fois, et on revient au départ ; chaque pas passe les invariants (I19, etc.) et reste sauvegardable */
      const depart = d0.templateId;
      const vusIds = new Set<string>([depart]);
      for (let i = 0; i < liste.length; i++) {
        pas({ type: "touche", cle: "r", shift: false, meta: false, ctrl: false, alt: false, survol: { plancheId: "pl-1", cible: "droite" } });
        nbR++;
        const t = e.magazine.planches[0].droite!.templateId;
        vusIds.add(t);
        if (!templateParId(t)) valide = false;
        if (i % 7 === 0 && !O.contenuValide(JSON.parse(JSON.stringify(e.magazine)))) valide = false;
      }
      vus = vusIds.size;
      retour = e.magazine.planches[0].droite!.templateId === depart;
      tousGeneres = [...vusIds].some((id) => id.startsWith("GG1-"));
      /* annuler tout ce qu'on vient de faire : on retrouve le gabarit du départ */
      for (let i = 0; i < nbR; i++) pas({ type: "annuler" });
      if (e.magazine.planches[0].droite!.templateId !== depart) throw new Error("annuler tout ne ramène pas au gabarit du départ");
    } catch (x) { msg = x instanceof Error ? x.message : String(x); }
    if (msg) console.log(`   ${msg}`);
    rapporter(`éditeur : trois photos (L, P, P) sur une page : ${nbListe} gabarits au tiroir ; R les parcourt tous (${nbR} pas, ${vus} différents) et revient au départ ; chaque pas passe les invariants et la sauvegarde ; annuler tout revient`,
      msg === null && nbListe > 100 && vus === nbListe && retour && valide && tousGeneres);
    rapporter(`tiroir : le plafond (${O.PLAFOND_TIROIR}) est bien plus petit que la liste (${nbListe}) : « Plus » ajoute ${O.PAS_TIROIR} à chaque clic`, O.PLAFOND_TIROIR >= 10 && O.PLAFOND_TIROIR < nbListe && O.PAS_TIROIR >= O.PLAFOND_TIROIR);
  }
  {
    /* un magazine sauvegardé avec un gabarit généré se relit au micron ; un id inconnu, ou d'une autre portée, est refusé */
    const os: Orientation[] = ["P", "L", "P", "P"];
    let e: EtatEditeur = O.creerEtat({ magazine: nouveauMagazine("mag-test", "Test", "2026-11-12T10:00:00.000Z"), catalogue: catalogue(os) });
    e = O.appliquer(e, { type: "poser", cible: { type: "page", plancheId: "pl-1", cote: "droite" }, ids: ["A", "B", "C", "D"], confirme: true });
    const m: Magazine = e.magazine;
    const id = m.planches[0].droite!.templateId;
    const relu = JSON.parse(JSON.stringify(m)) as Magazine;
    const mAutre = (templateId: string): Magazine => ({ ...m, planches: [{ ...m.planches[0], droite: { ...m.planches[0].droite!, templateId } }, ...m.planches.slice(1)] });
    const surDouble: Magazine = { ...m, planches: [m.planches[0], { id: "pl-2", mode: "double", gauche: null, droite: null, double: { ...m.planches[0].droite!, templateId: id } }] };
    rapporter(`sauvegarde : un magazine posé sur un gabarit généré (${id}) se relit tel quel (mêmes cadres au micron, page droite et page gauche), son id inconnu ou sur une double est refusé`,
      O.contenuValide(relu) && cadresDe(relu.planches[0].droite!, "droite").map((c) => [um(c.x), um(c.y), um(c.l), um(c.h)]).join() === cadresDe(m.planches[0].droite!, "droite").map((c) => [um(c.x), um(c.y), um(c.l), um(c.h)]).join()
        && id.startsWith("GG1-") && O.contenuValide(mAutre("GG1-EN-1242")) === false /* une photo pour quatre cadres : refusé */
        && !O.contenuValide(mAutre("GG1-ZZ-0000")) && !O.contenuValide(surDouble));
  }

  /* ─── 10. la vitesse : mémoïsée ─── */
  {
    const photos = refs(["P", "P", "L"]);
    O.gabaritsClasses("page", photos, null);
    const t0 = performance.now();
    for (let i = 0; i < 300; i++) O.gabaritsClasses("page", photos, i % 2 ? null : "E-S1");
    const ms = performance.now() - t0;
    const a = O.gabaritsClasses("page", photos, null), b = O.gabaritsClasses("page", photos, null);
    console.log(`      300 classements d'une page de 3 photos (${a.length} gabarits) : ${Math.round(ms)} ms`);
    rapporter("vitesse : le classement d'une page est mémoïsé (300 appels en moins de 1,5 s même sur une machine lente), et la liste rendue est une copie : la modifier ne touche pas la suivante",
      ms < 1500 && a !== b && a.length === b.length && (a.pop(), O.gabaritsClasses("page", photos, null).length === b.length));
  }

  /* ─── 11. la grille d'artiste ─── */
  {
    const page: Rect = { x: 0, y: 0, l: PAGE_L, h: PAGE_H };
    const ls = O.grilleArtiste(page);
    const par = (genre: string) => ls.filter((l) => l.genre === genre);
    const v = (genre: string) => par(genre).filter((l) => l.x1 === l.x2).map((l) => l.x1).sort((a, b) => a - b);
    const hz = (genre: string) => par(genre).filter((l) => l.y1 === l.y2).map((l) => l.y1).sort((a, b) => a - b);
    const proche = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-9);
    rapporter("grille d'artiste : 10 lignes pour un rectangle (tiers 4, nombre d'or 4, diagonales 2) ; tiers à 1/3 et 2/3 (70 et 140 sur 210 ; 99 et 198 sur 297) ; or à 0,382 et 0,618 (80,22 et 129,78 ; 113,454 et 183,546)",
      ls.length === 10 && par("tiers").length === 4 && par("or").length === 4 && par("diagonale").length === 2
        && proche(v("tiers"), [70, 140]) && proche(hz("tiers"), [99, 198]) && proche(v("or"), [0.382 * 210, 0.618 * 210]) && proche(hz("or"), [0.382 * 297, 0.618 * 297])
        && O.OR_PETIT + O.OR_GRAND === 1 && Math.abs(O.OR_PETIT - 1 / (((1 + Math.sqrt(5)) / 2) ** 2)) < 1e-3);
    const diag = par("diagonale");
    rapporter("grille d'artiste : les deux diagonales vont de coin à coin ; chaque ligne reste dans le rectangle ; un rectangle sans surface n'a aucune ligne",
      diag.length === 2 && diag[0].x1 === 0 && diag[0].y1 === 0 && diag[0].x2 === PAGE_L && diag[0].y2 === PAGE_H && diag[1].x1 === PAGE_L && diag[1].y1 === 0 && diag[1].x2 === 0 && diag[1].y2 === PAGE_H
        && ls.every((l) => [l.x1, l.x2].every((x) => x >= -EPS && x <= PAGE_L + EPS) && [l.y1, l.y2].every((y) => y >= -EPS && y <= PAGE_H + EPS))
        && O.grilleArtiste({ x: 5, y: 5, l: 0, h: 10 }).length === 0 && O.grilleArtiste({ x: 5, y: 5, l: 10, h: -1 }).length === 0);
    const droite = O.grilleArtiste({ x: PAGE_L, y: 0, l: PAGE_L, h: PAGE_H });
    rapporter("grille d'artiste : la page droite (x = 210) est la gauche décalée de 210 ; une planche 0 n'a que la page droite, les autres deux pages, du pli à la tranche",
      droite.every((l, i) => Math.abs(l.x1 - (ls[i].x1 + PAGE_L)) < 1e-9 && Math.abs(l.x2 - (ls[i].x2 + PAGE_L)) < 1e-9 && l.y1 === ls[i].y1 && l.y2 === ls[i].y2)
        && O.pagesDeLaPlanche(true).length === 1 && O.pagesDeLaPlanche(true)[0].x === PAGE_L && O.pagesDeLaPlanche(false).length === 2
        && O.pagesDeLaPlanche(false)[0].x === 0 && O.pagesDeLaPlanche(false)[1].x === PAGE_L);
    /* écran seulement : rien de la grille n'entre dans le magazine, l'IDML, le PDF ni la mini-planche */
    const lire = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
    const E = "src/app/admin/atelier/mise-en-page/[id]/";
    const scene = lire(`${E}Scene.tsx`), gab = lire(`${E}Gabarits.tsx`), css = lire("src/app/admin/atelier/mise-en-page/mise-en-page.css");
    const dehors = ["src/lib/mise-en-page/idml.ts", "src/lib/mise-en-page/pdf.ts", "src/lib/mise-en-page/magazine.ts", "src/lib/mise-en-page/sauvegarde.ts", `${E}exporter.ts`, `${E}exporterPdf.ts`, `${E}exporterPur.ts`, `${E}ExportFeuille.tsx`]
      .every((f) => !/grilleArtiste|GrilleArtiste|ui\.grille/.test(lire(f)));
    const mini = gab.slice(gab.indexOf("export function Mini"), gab.indexOf("/* ─── le dessin d'un gabarit"));
    const montage = scene.match(/<GrilleArtiste /g) ?? [];
    const z = Number(/\.ed-grille-art \{[^}]*z-index: (\d+)/.exec(css)?.[1]);
    rapporter("grille d'artiste : écran seulement (ni l'IDML, ni le PDF, ni les exports, ni la sauvegarde, ni Mini n'en parlent) ; montée en UNE ligne dans Scene, après les cadres et avant les sélections ; sans pointeur, sous le cadre actif (z entre 2 et 8)",
      dehors && !/Grille/.test(mini) && montage.length === 1 && scene.indexOf("<GrilleArtiste ") > scene.indexOf("{frames.map") && scene.indexOf("<GrilleArtiste ") < scene.indexOf("<Selections frames")
        && /\.ed-grille-art \{[^}]*pointer-events: none/.test(css) && z > 2 && z < 8 && /\.ed-cs \{ position: absolute; z-index: 8/.test(css));
    /* la touche et la mémoire */
    const ed = lire(`${E}EditeurMagazine.tsx`), ctx = lire(`${E}contexte.ts`), barre = lire(`${E}Barre.tsx`);
    const liste = /!calque && !\[([^\]]*)\]\.includes\(k\)/.exec(ed)?.[1] ?? "";
    rapporter("grille d'artiste : la touche O (libre : planche M R X P T Z, tri X P F R U C Z N D G T 0 à 3, lecture L), jamais pendant une saisie, jamais avec ⌘ ou Ctrl ; bouton dans la barre avec mémoire locale (bj-mep-grille), jamais d'exception",
      /e\.key === "o" \|\| e\.key === "O"\) && !e\.metaKey && !e\.ctrlKey && !e\.altKey/.test(ed) && !/"o"|"O"/.test(liste) && ed.indexOf("e.key === \"o\"") > ed.indexOf("pendant la saisie")
        && /CLE_GRILLE = "bj-mep-grille"/.test(ctx) && /grille: false/.test(ctx) && /localStorage\.getItem\(CLE_GRILLE\) === "1"/.test(ctx) && /catch \{ \/\* stockage refusé \*\/ \}/.test(ctx)
        && /aria-label="Grille d'artiste"/.test(barre) && /basculerGrille\(ui, majUi\)/.test(barre)
        && !["m", "r", "x", "p", "t", "z", "l", "f", "u", "c", "n", "d", "g"].includes("o"));
  }

  /* ─── 12. le catalogue : par schéma ─── */
  {
    const page = readFileSync(resolve(process.cwd(), "src/app/admin/atelier/mise-en-page/gabarits/page.tsx"), "utf8");
    rapporter("catalogue : /admin/atelier/mise-en-page/gabarits montre les générés, par schéma (un <details> chacun, dessin léger), et compte leur total",
      /genereesParSchema\(\)/.test(page) && /<details key=\{g\.code\}/.test(page) && /PlancheLegere/.test(page) && /decoupesDePage\(\)\.length/.test(page));
  }
}

/* Lancé seul : `npx tsx --tsconfig tsconfig.json scripts/verif-mep-generes.ts` */
if (process.argv[1] && /verif-mep-generes\.ts$/.test(process.argv[1])) {
  let ko = 0;
  verifierMepGeneres((nom, reussi) => { console.log(`${reussi ? "  ok " : "  KO "} ${nom}`); if (!reussi) ko++; }, (t) => console.log(`\n${t}`));
  console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
  process.exit(ko === 0 ? 0 : 1);
}
