/**
 * Les tests de la VERSION 2 DANS L'ÉDITEUR et de la page ANALYSE (18/11/2026 au soir, M-30 à M-34, N-60, N-49b), lancés par
 * `verif-atelier.ts` (et seuls : `npx tsx --tsconfig tsconfig.json scripts/verif-mep-analyse-v2.ts`). Sans base ni réseau, sur des lots
 * FABRIQUÉS (aucun nom de client, aucun numéro de photo) :
 *  - M-31 : jamais une personne coupée (personnes au bord non détectées, chaleur au bord sans lecture) ; les côtés protégés ; les tuiles ;
 *  - M-32 : une belle photo n'entre dans une double dense qu'avec du sens ;
 *  - la v2.1 est ce que l'éditeur compose ; la v1 reste rejouable ;
 *  - M-34 : la ligne du projet, les tags corrigés (la correction prime, leçon), le renversement, les filtres, les relations ;
 *  - déterminisme, M-01.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  REGLAGES_EDITEUR, composer, corrigerTagAnalyse, entreeDepuisEditeur, etatAvant, filtrerPhotos, leconTagAnalyse, ligneDuProjet, relationsDe,
  renverser, tagParCle, valeurSuivante, valeurTag,
  type EntreeCompo, type IAPhoto, type PhotoCompo, type ResultatCompo,
} from "@/lib/mise-en-page/compositeur";
import { charger } from "@/lib/mise-en-page/compositeur/selection";
import { cotesProteges, zoneV2 } from "@/lib/mise-en-page/compositeur/recadrageV2";
import { sensPourBelle } from "@/lib/mise-en-page/compositeur/trame";
import { fusionnerVisages, tuilesDe } from "@/lib/mise-en-page/editeur/visagesTuiles";
import { leconValide } from "@/lib/mise-en-page/editeur/lecons";
import { cadresDe } from "@/lib/mise-en-page/magazine";
import { cadrer } from "@/lib/mise-en-page/recadrage";
import { regleParId } from "@/lib/mise-en-page/regles";
import { motsDeProjet } from "./regles-mots-interdits";

type Rapporter = (nom: string, reussi: boolean) => void;

function graine(n: number): () => number { let s = n >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const hex = (r: () => number) => Array.from({ length: 16 }, () => Math.floor(r() * 16).toString(16)).join("");

/** Une carte de chaleur 16 × 16 : chaude aux colonnes données (lignes 4 à 12), tiède ailleurs. */
function chaleur(cols: readonly number[]): string {
  return Array.from({ length: 256 }, (_, i) => (cols.includes(i % 16) && Math.floor(i / 16) >= 4 && Math.floor(i / 16) <= 12 ? "8" : "1")).join("");
}

/** Un lot : des repas et des bancs où l'IA voit plus de personnes que le détecteur (un visage au centre, les autres au bord), des paysages. */
function lot(n = 60, g = 7): PhotoCompo[] {
  const r = graine(g);
  const out: PhotoCompo[] = [];
  for (let i = 0; i < n; i++) {
    const jour = Math.floor(i / 8);
    const groupe = i % 3 === 0;
    const portrait = i % 5 === 1;
    const [l, h] = portrait ? [3024, 4032] : [4032, 3024];
    const ia: IAPhoto = {
      interet: 0.5 + 0.4 * r(), role: "satellite", sujet: groupe ? "personnes" : "paysage", plan: groupe ? "moyen" : "large", personnes: groupe ? "groupe" : "0",
      momentJournee: "jour", ambiance: "calme", lieuLu: null, couverture: false, personnesNombre: groupe ? 3 + (i % 2) : 0, forceImage: 0.4 + 0.5 * r(), pointAccroche: true,
    };
    out.push({
      id: `t${i}`, nom: `T_${String(i).padStart(4, "0")}.JPG`, l, h, date: `2025-07-${String(1 + jour).padStart(2, "0")}T${String(9 + (i % 8)).padStart(2, "0")}:15:00`,
      netteteRel: 0.8 + 0.4 * r(), visages: groupe ? [{ x: 0.46, y: 0.3, l: 0.07, h: 0.09 }] : [], zone: { x: 0.3, y: 0.25, l: 0.4, h: 0.5 },
      palette: ["#4a6fa5", "#d9c7a7", "#2b2b2b"], calme: "haut", moment: `m${jour}-${Math.floor((i % 8) / 4)}`, ecart: null, ia, chapitre: null,
      empreinte: hex(r), numeroGalerie: 100 + i, chaleur: groupe ? chaleur([0, 1, 7, 8, 14, 15]) : chaleur([6, 7, 8, 9]),
    });
  }
  return out;
}
const entree = (photos: PhotoCompo[], o: Partial<EntreeCompo> = {}): EntreeCompo => ({ photos, voyage: null, lieux: null, fiche: { theme: "autre", taille: 24 }, titre: "Essai", piles: 0, quand: "2026-11-18T00:00:00.000Z", v2: REGLAGES_EDITEUR, ...o });

/** Pour chaque photo posée : la part retirée à gauche et à droite par son recadrage (fractions de la photo). */
function coupesLaterales(r: ResultatCompo, dims: ReadonlyMap<string, { l: number; h: number }>): Map<string, { g: number; d: number }> {
  const out = new Map<string, { g: number; d: number }>();
  for (const pl of r.jet.magazine.planches) {
    for (const [cible, d] of (pl.mode === "double" ? [["double", pl.double]] : [["gauche", pl.gauche], ["droite", pl.droite]]) as ["double" | "gauche" | "droite", typeof pl.double][]) {
      if (!d) continue;
      let k = 0;
      for (const c of cadresDe(d, cible)) {
        if (c.role !== "photo") continue;
        const a = d.photos[k++];
        const px = a?.photoId ? dims.get(a.photoId) : undefined;
        if (!a?.photoId || !px) continue;
        const cc = cadrer(px, { l: c.l, h: c.h }, a.recadrage);
        const x = -cc.x / cc.l, w = c.l / cc.l;
        out.set(a.photoId, { g: Math.max(0, x), d: Math.max(0, 1 - x - w) });
      }
    }
  }
  return out;
}

export function verifierMepAnalyseV2(ok: Rapporter, titre: (t: string) => void): void {
  titre("Mise en page · la v2 dans l'éditeur, la page Analyse (18/11 soir, M-30 à M-34)");

  /* ── M-31 : jamais une personne coupée ── */
  const ph = lot();
  const P = charger(entree(ph), null, new Map());
  const g0 = P.get("t0")!, p1 = P.get("t1")!;
  const z0 = zoneV2(g0, ph[0].chaleur, "normal"), z1 = zoneV2(p1, ph[1].chaleur, "normal");
  const c0 = cotesProteges(g0, z0), c1 = cotesProteges(p1, z1);
  ok("M-31 (N-60) : l'IA lit 3 personnes, le détecteur 1 visage : la photo n'est plus rognée en largeur ; une photo sans personne lue ni chaleur au bord n'est pas protégée",
    !!c0 && c0.gauche && c0.droite && !c1);
  const sansIA = { ...P.get("t3")!, v2: { ...P.get("t3")!.v2!, ia: null } };
  const cS = cotesProteges(sansIA, zoneV2(sansIA, ph[3].chaleur, "normal"));
  ok("M-31 : sans lecture des personnes, chaque côté où la chaleur touche le bord est protégé, jamais le haut ni le bas qu'elle ne touche pas",
    !!cS && (cS.gauche || cS.droite) && !cS.haut && !cS.bas);
  const vu = { ...g0, nbPers: 1 };
  ok("M-31 : autant de visages trouvés que de personnes lues : rien de plus que les visages et corps détectés", cotesProteges(vu, z0) === null);

  const r = composer(entree(ph));
  const dims = new Map(ph.map((p) => [p.id, { l: p.l, h: p.h }]));
  const coupes = coupesLaterales(r, dims);
  const groupes = ph.filter((p) => (p.ia?.personnesNombre ?? 0) > p.visages.length).map((p) => p.id);
  const rognees = groupes.filter((id) => { const c = coupes.get(id); return c && c.g + c.d > 0.02 + 1e-6; });
  ok(`M-31 : composé en v2.1, aucune photo de groupe (plus de personnes lues que de visages) n'est rognée en largeur : ${groupes.filter((id) => coupes.has(id)).length} posées, ${rognees.length} rognée(s)${rognees.length ? ` (${rognees.join(", ")})` : ""}`,
    groupes.some((id) => coupes.has(id)) && !rognees.length);
  ok("M-31 : le contrôle ne relève AUCUNE personne ni aucun visage coupé (faute dure « personne coupée », M-31)",
    !r.controle.fautes.some((f) => f.regle === "M-31" || f.faute === "visage coupé"));
  ok("M-31 : la décision dit combien de photos sont protégées, et pourquoi (N-60)", r.decisions.some((d) => d.regles.includes("M-31") && /protégées/.test(d.detail)));
  ok("M-31 : la zone de chaque photo protégée dit pourquoi elle n'est jamais rognée (pour l'Analyse)", groupes.every((id) => !!r.zones?.[id]?.proteges));

  /* les visages en tuiles (N-60) */
  const tl = tuilesDe(4000, 1600), tc = tuilesDe(1000, 1000);
  ok("N-60 : une photo très large se relit en tuiles carrées qui se chevauchent sur toute sa longueur ; une presque carrée seulement entière",
    tl.length >= 3 && tl[0].join() === "0,0,4000,1600" && tl.slice(1).every((t) => t[2] === 1600 && t[3] === 1600) && tl[tl.length - 1][0] === 2400 && tc.length === 1);
  const fus = fusionnerVisages([{ x: 0.1, y: 0.1, l: 0.1, h: 0.1, score: 0.7 }, { x: 0.105, y: 0.1, l: 0.1, h: 0.1, score: 1.8 }, { x: 0.8, y: 0.2, l: 0.05, h: 0.06, score: 0.65 }]);
  ok("N-60 : les boîtes qui se recouvrent sont UN visage (la meilleure note gagne) ; un visage du bord trouvé en tuile s'ajoute",
    fus.length === 2 && fus[0].x === 0.105 && fus.some((v) => v.x === 0.8));
  const mc = readFileSync(join(process.cwd(), "src/app/admin/atelier/mise-en-page/[id]/mesuresClient.ts"), "utf8");
  ok("N-60 : l'éditeur cherche les visages en tuiles (et sa mesure change de version : l'ancien cache n'est pas relu)",
    mc.includes("tuilesDe(im.width, im.height)") && mc.includes("fusionnerVisages(toutes)") && /const VERSION = "v5"/.test(mc));

  /* ── M-32 : une belle photo en double dense, seulement avec du sens ── */
  const ids = [...P.values()].slice(8, 15);
  const b = ids[0];
  const memes = ids.map((x) => ({ ...x, moment: "M" }));
  const autres = ids.map((x, i) => ({ ...x, moment: `A${i}`, date: `2025-01-0${1 + (i % 7)}T0${i}:00:00` }));
  ok("M-32 (N-49b) : la même scène ou le même moment donne du sens ; des photos de jours et moments différents n'en donnent pas ; une paire en donne",
    sensPourBelle(memes[0], memes, new Set()) === "le même moment" && sensPourBelle(autres[0], autres, new Set()) === null
      && sensPourBelle(autres[0], autres, new Set([`${autres[0].id}|${autres[1].id}`])) === "une paire de la double" && !!b);
  const trameTxt = readFileSync(join(process.cwd(), "src/lib/mise-en-page/compositeur/trame.ts"), "utf8");
  ok("M-32 : l'interdit dur est remplacé : noyée seulement SANS sens, et admise la belle photo est le héros (seules les recettes qui la posent en grand restent)",
    trameTxt.includes("const noyee = belles.length > 0 && !admise;") && trameTxt.includes("p.role === \"heros\""));

  /* ── la v2.1 est ce que l'éditeur compose ; la v1 reste rejouable ── */
  const cat = new Map(ph.slice(0, 12).map((p) => [p.id, { id: p.id, nom: p.nom, l: p.l, h: p.h, date: p.date, personne: "", lien: null, type: "atelier" as const, coeur: false, signalee: false, autresMagazines: [], nouvelle: false, vignette: null }]));
  const base = { catalogue: cat, lecture: { floues: [], piles: [], mesurees: 0, zones: {} }, lectureIA: null, ecarteesAtelier: new Set<string>(), fiche: {}, titre: "", quand: "2026-11-18T00:00:00.000Z" };
  const e2 = entreeDepuisEditeur(base), e1 = entreeDepuisEditeur({ ...base, version: 1 });
  ok("v2.1 par défaut dans l'éditeur (recadrage « normal », densité par les règles) ; `version: 1` rend la v1 témoin",
    e2.v2?.recadrage === "normal" && e2.v2.densite === "serree" && !e1.v2 && REGLAGES_EDITEUR.recadrage === "normal");
  const r1 = composer({ ...entree(ph), v2: null });
  ok("la v1 reste rejouable sur le même lot (premier jet valide, sans cinq notes)", r1.pages > 0 && !r1.selection.photos.some((p) => p.notes));

  /* ── déterminisme ── */
  const r2 = composer(entree(lot()));
  ok("déterminisme : le même lot rend le même magazine, au caractère près (protections et cadres pliés compris)", JSON.stringify(r.jet) === JSON.stringify(r2.jet) && JSON.stringify(r.controle) === JSON.stringify(r2.controle));

  /* ── M-34 : la page Analyse ── */
  const ligne = ligneDuProjet(r, { personnes: 4, pays: "Côte" }, { theme: "road_trip" }, { pays: null, qui: null }, ph.map((p) => p.date));
  ok("M-34 (a) : la ligne du projet porte qui, où, type, durée, profil, ambiance ; ce que l'atelier saisit prime et se voit ; la durée est un fait lu (non corrigeable)",
    ligne.map((m) => m.cle).join() === "qui,ou,type,duree,profil,ambiance" && ligne[0].mot === "4 personnes" && ligne[0].corrige && ligne[1].mot === "Côte"
      && ligne[3].mot === "8 jours" && !ligne[3].corrigeable && ligne[2].mot === "Road trip" && !ligne[2].corrige);
  const def = tagParCle("personnesNombre")!;
  const lu = valeurTag(ph[0].ia, "personnesNombre");
  const suiv = valeurSuivante(def, lu);
  const cor = corrigerTagAnalyse({}, "t0", "personnesNombre", 1, lu);
  const retour = corrigerTagAnalyse(cor, "t0", "personnesNombre", lu ?? null, lu);
  ok("M-34 (d) : un tag se corrige d'un clic (valeur suivante) ; la correction est gardée à part ; revenir à la valeur lue la retire",
    lu === 3 && suiv === 4 && cor.tags?.t0?.personnesNombre === 1 && !retour.tags?.t0);
  const rc = composer(entree(ph, { corrections: cor }));
  ok("M-34 : la correction PRIME (D12) : 1 personne corrigée = autant que de visages, la photo n'est plus protégée en largeur", !rc.zones?.t0?.proteges && !!r.zones?.t0?.proteges);
  const lec = leconTagAnalyse("t0", def, lu, 1);
  ok("M-27 : un tag corrigé devient une leçon `tag_corrige` valide, qui cite M-27 (le compte par règle de l'écran « Règles »)", leconValide(lec) && lec.type === "tag_corrige" && lec.regle === "M-27" && /personnes : 3/.test(lec.proposition));
  const gardee = r.selection.photos.find((p) => etatAvant(p) === "gardee")!;
  const sortie = renverser({}, gardee.id, "gardee");
  const rs = composer(entree(ph, { corrections: sortie }));
  const reserve = rs.selection.photos.find((p) => p.id === gardee.id)!;
  const reprise = renverser(sortie, gardee.id, "reserve");
  ok("M-34 (f) : gardée → en réserve d'un clic (la marque de l'atelier prime), et retour d'un clic (gardée)",
    etatAvant(reserve) === "reserve" && !!sortie.marques?.sorties?.includes(gardee.id) && !reprise.marques?.sorties?.includes(gardee.id) && !!reprise.marques?.gardees?.includes(gardee.id));
  const ia = new Map(ph.map((p) => [p.id, p.ia]));
  const f1 = filtrerPhotos(r.selection.photos, ia, { tag: { cle: "personnesNombre", v: 3 } });
  const f2 = filtrerPhotos(r.selection.photos, ia, { note: { nom: "gens", cran: "forte" } });
  ok("M-34 (e) : les filtres par tag et par note ne gardent que les photos qui y répondent",
    f1.length > 0 && f1.every((p) => ia.get(p.id)?.personnesNombre === 3) && f2.every((p) => p.notes?.gens.cran === "forte"));
  const rel = relationsDe(r, "t0", new Map(ph.map((p) => [p.id, p.moment])));
  ok("M-34 (d) : les relations d'une photo : même scène (même moment), paires de la trame", rel.scene.length >= 1 && rel.scene.every((id) => ph.find((p) => p.id === id)?.moment === ph[0].moment) && Array.isArray(rel.paires));

  /* ── registre ── */
  ok("M-30 à M-34 confirmées par Mathias au registre ; N-60 et N-49b codées avec leur contrôle",
    ["M-30", "M-31", "M-32", "M-33", "M-34"].every((id) => regleParId(id)?.statut === "confirmee_mathias") && ["N-60", "N-49b"].every((id) => regleParId(id)?.statut === "codee" && !!regleParId(id)?.controle));

  /* ── M-01 : aucune donnée d'un projet dans le code neuf ── */
  const fichiers = [
    "src/lib/mise-en-page/compositeur/analyse.ts", "src/lib/mise-en-page/compositeur/recadrageV2.ts", "src/lib/mise-en-page/editeur/visagesTuiles.ts",
    "src/app/admin/atelier/mise-en-page/[id]/Analyse.tsx", "src/app/admin/atelier/mise-en-page/[id]/Composer.tsx",
  ];
  const trouves = fichiers.flatMap((f) => motsDeProjet(readFileSync(join(process.cwd(), f), "utf8")).map((m) => `${f} : ${m}`));
  ok(`M-01 : aucun nom de client ni numéro de photo dans le code de la v2 et de l'Analyse${trouves.length ? ` (${trouves.join(", ")})` : ""}`, !trouves.length);
}

if (process.argv[1]?.endsWith("verif-mep-analyse-v2.ts")) {
  let echecs = 0;
  verifierMepAnalyseV2((n, r) => { if (!r) echecs++; console.log(`  ${r ? "ok" : "KO"}  ${n}`); }, (t) => console.log(`\n${t}`));
  console.log(echecs ? `\n${echecs} ECHEC(S)` : "\nTOUT PASSE");
  process.exit(echecs ? 1 : 0);
}
