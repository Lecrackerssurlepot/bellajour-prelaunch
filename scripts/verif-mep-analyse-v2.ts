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
import { PAGES_MAX_PUBLIC, PAGES_MIN as PAGES_MIN_GRILLE } from "@/lib/atelier/grille";
import { PARAMETRES_PROFIL, REGLAGES_V2, autresTailles, densiteVisee, fondreChapitresMinuscules, tailleDeLaMachine } from "@/lib/mise-en-page/compositeur";

/** N-62 : un lot DÉJÀ TRIÉ (aucun doublon, aucune floue), des jours de 14 photos, des gens sur 40 % des photos, des très larges. */
function lotTrie(n: number, g = 5): PhotoCompo[] {
  const r = graine(g + n);
  const DIMS = { U: [4000, 1800], L: [4032, 3024], P: [3024, 4032] } as const;
  const jours = Math.max(3, Math.round(n / 14));
  const out: PhotoCompo[] = [];
  for (let i = 0; i < n; i++) {
    const jour = Math.floor((i * jours) / n), h = 8 + Math.floor(r() * 12), x = r();
    const forme = (x < 0.15 ? "U" : x < 0.45 ? "P" : "L") as keyof typeof DIMS;
    const pers = r() < 0.4 ? 1 + Math.floor(r() * 3) : 0;
    const [l, hh] = DIMS[forme];
    const ia: IAPhoto = { interet: 0.5 + 0.45 * r(), role: "satellite", sujet: pers ? "personnes" : "paysage", plan: pers ? "moyen" : "large", personnes: pers >= 3 ? "groupe" : (String(pers) as "0" | "1" | "2"), momentJournee: "jour", ambiance: "calme", lieuLu: null, couverture: false, personnesNombre: pers, forceImage: 0.4 + 0.5 * r(), pose: pers ? "spontane" : null, pointAccroche: true };
    out.push({ id: `d${i}`, nom: `D_${String(i).padStart(4, "0")}.JPG`, l, h: hh, date: `2025-06-${String(1 + jour).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(Math.floor(r() * 59)).padStart(2, "0")}:00`, netteteRel: 0.8 + 0.5 * r(),
      visages: Array.from({ length: pers }, (_, k) => ({ x: 0.3 + 0.12 * k, y: 0.25, l: 0.07, h: 0.09 })), zone: { x: 0.25, y: 0.2, l: 0.5, h: 0.6 }, palette: ["#4a6fa5", "#d9c7a7", "#2b2b2b"], calme: "haut", moment: null, ecart: null, ia, chapitre: null, empreinte: hex(r), numeroGalerie: 100 + i });
  }
  out.sort((a, b) => (a.date! < b.date! ? -1 : 1));
  for (const p of out) p.moment = p.date!.slice(0, 12);
  return out;
}
const densiteDe = (r: ResultatCompo): number => {
  const inter = r.jet.magazine.planches.slice(1, -1);
  const tot = inter.reduce((a, p) => a + [p.double, p.gauche, p.droite].reduce((b, d) => b + (d?.photos.filter((y) => y.photoId).length ?? 0), 0), 0);
  return tot / Math.max(1, inter.length);
};

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

  /* ── N-62 (18/11 au soir) : la machine propose la taille qui tient la densité visée du profil ── */
  ok("N-62 : les tailles vendues sont celles de la grille des prix (24 à 60 pages au public), relues ici", REGLAGES_V2.VENDABLE_MIN === PAGES_MIN_GRILLE && REGLAGES_V2.VENDABLE_MAX === PAGES_MAX_PUBLIC);
  ok("N-62 : pages ≈ 2 × photos gardées ÷ densité visée, au multiple de 4, bornées : 65 photos à 2,75 → 48 ; 30 → 24 (le plus petit vendu) ; 400 → 60 (le plus grand)",
    tailleDeLaMachine(65, 2.75) === 48 && tailleDeLaMachine(30, 3.5) === 24 && tailleDeLaMachine(400, 2.6) === 60 && densiteVisee("long_voyage_famille", true, false) === 2.6);
  for (const n of [30, 65, 164, 400]) {
    const rl = composer({ photos: lotTrie(n), voyage: null, lieux: null, fiche: {}, titre: "Essai", piles: 0, quand: "2026-11-18T00:00:00.000Z", v2: REGLAGES_EDITEUR });
    const d = densiteDe(rl), m = PARAMETRES_PROFIL[rl.profil].moyenne;
    const borne = rl.pages === REGLAGES_V2.VENDABLE_MIN ? "min" : rl.pages === REGLAGES_V2.VENDABLE_MAX ? "max" : null;
    const dansLaFourchette = d >= m[0] - 0.5 && d <= m[1] + 0.5;
    /* à une borne vendue, la densité ne peut pas suivre : au plus petit elle descend (jamais sous 2), au plus grand elle monte jusqu'au
       plafond du profil (N-47b) avant la réserve « pas de place » */
    const tenue = borne === "min" ? d >= 2 && d <= m[1] + 0.5 : borne === "max" ? d >= m[0] - 0.5 && d <= PARAMETRES_PROFIL[rl.profil].plafond + 1e-9 : dansLaFourchette;
    const rien = rl.selection.photos.filter((p) => p.etat === "reserve" && /pas de place/.test(p.detail ?? "")).every((p) => !rl.selection.photos.find((q) => q.id === p.id)?.regles.includes("atelier"));
    ok(`N-62 : ${n} photos déjà triées : ${rl.pages} pages proposées (« la machine propose »), ${densiteDe(rl).toFixed(2)} photos par double (profil ${rl.profil}, fourchette ${m.join(" à ")}${borne ? `, taille ${borne === "min" ? "la plus petite" : "la plus grande"} vendue` : ""}), jamais sous 2`,
      rl.origineTaille === "machine" && rl.pages % 4 === 0 && rl.pages >= REGLAGES_V2.VENDABLE_MIN && rl.pages <= REGLAGES_V2.VENDABLE_MAX && tenue && d >= 2 && rien);
    ok(`M-31 : ${n} photos, la taille proposée : aucune personne ni aucun visage coupé`, !rl.controle.fautes.some((f) => f.regle === "M-31" || f.faute === "visage coupé"));
    const vides = rl.controle.fautes.filter((f) => f.regle === "M-07").length;
    const tout = composer({ photos: lotTrie(n), voyage: null, lieux: null, fiche: { taille: "tout" }, titre: "Essai", piles: 0, quand: "2026-11-18T00:00:00.000Z", v2: REGLAGES_EDITEUR });
    ok(`M-07 : ${n} photos : la taille proposée n'ajoute aucune page presque vide à « tout garder » (${vides} contre ${tout.controle.fautes.filter((f) => f.regle === "M-07").length})`,
      vides <= tout.controle.fautes.filter((f) => f.regle === "M-07").length);
  }
  const au = autresTailles(60, "machine", null);
  ok("N-62 : à côté de la taille proposée, « Tout garder » et « Plus court » (jamais sous 24 pages)", au.some((a) => a.taille === "tout") && au.every((a) => a.taille === "tout" || (a.taille as number) >= 24));

  /* ── N-61 : un chapitre minuscule se fond dans son voisin ── */
  const Pc = charger(entree(lot(20, 3)), null, new Map());
  const xs = [...Pc.values()];
  xs.forEach((x, i) => { x.chap = i < 9 ? 1 : i < 11 ? 2 : 3; });
  const journalC: { quoi: string; ou: string; detail: string; regles: string[] }[] = [];
  fondreChapitresMinuscules(Pc, xs, new Map([[1, "Un"], [2, "Deux"], [3, "Trois"]]), journalC);
  ok("N-61 : un chapitre de 2 photos se fond dans le précédent (il ne coûte plus une double d'ouverture) ; les autres ne bougent pas ; la décision le dit",
    xs.slice(9, 11).every((x) => x.chap === 1) && xs.slice(11).every((x) => x.chap === 3) && journalC.some((d) => d.regles.includes("N-61")));

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
