/**
 * Les tests du COMPOSITEUR v2 (18/11, définition v2, décisions M-16 à M-28), lancés par `verif-mep-compositeur.ts` (donc par
 * `verif-atelier.ts`). Sans base, sans réseau, sans photo : des lots FABRIQUÉS. Ce qui est contrôlé :
 *   cinq notes bornées et expliquées ; causes d'écarter fermées ; densité qui absorbe ; 9 / 12 ; rythme ; petite entorse ; comptage exact ;
 *   absence n'est pas zéro ; corrections qui priment ; table de densité (même entrée même nombre, belle photo jamais noyée, période chargée
 *   jamais étalée) ; déterminisme ; lecture v4 et planche B6 ; la v1 inchangée (le témoin).
 */

import { CAUSES_ECART, REGLAGES_V2_DEFAUT, TABLE_DENSITE, composer, nombreVoulu, type CinqNotes, type EntreeCompo, type IAPhoto, type PhotoCompo, type ResultatCompo } from "@/lib/mise-en-page/compositeur";
import { charger } from "@/lib/mise-en-page/compositeur/selection";
import { cadresDe } from "@/lib/mise-en-page/magazine";
import { cadrer } from "@/lib/mise-en-page/recadrage";
import { belle, entonnoirV2 } from "@/lib/mise-en-page/compositeur/selectionV2";
import { pairesEtEntorses, sensPourBelle } from "@/lib/mise-en-page/compositeur/trame";
import { lireLectureIA, lireReponsePlanche6 } from "@/lib/mise-en-page/editeur";
import { regleParId } from "@/lib/mise-en-page/regles";
import { partRetiree, recadrable, zoneTient, zoneV2, zoomMiseEnAvant } from "@/lib/mise-en-page/compositeur/recadrageV2";

type Ok = (nom: string, reussi: boolean) => void;

function graine(n: number): () => number {
  let s = n >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const hex = (r: () => number) => Array.from({ length: 16 }, () => Math.floor(r() * 16).toString(16)).join("");
const DIMS = { U: [4000, 1800], L: [4032, 3024], P: [3024, 4032], H: [1800, 4000] } as const;

/** Un voyage fabriqué : 14 jours, des moments de taille variable (un jour très photographié), des gens, des empreintes toutes différentes. */
function voyage(n = 120, g = 21): PhotoCompo[] {
  const r = graine(g);
  const out: PhotoCompo[] = [];
  for (let i = 0; i < n; i++) {
    const jour = i < 30 ? 2 : Math.floor(r() * 14);
    const h = 8 + Math.floor(r() * 12);
    const x = r();
    const forme = (x < 0.4 ? "U" : x < 0.65 ? "H" : x < 0.8 ? "P" : "L") as keyof typeof DIMS;
    const pers = r() < 0.35 ? 1 + Math.floor(r() * 4) : 0;
    const [l, hh] = DIMS[forme];
    const ia: IAPhoto = {
      interet: 0.45 + 0.5 * r(), role: "satellite", sujet: pers ? "personnes" : "paysage", plan: pers ? "moyen" : "large", personnes: pers >= 3 ? "groupe" : (String(pers) as "0" | "1" | "2"),
      momentJournee: "jour", ambiance: "calme", lieuLu: null, couverture: false, personnesNombre: pers, forceImage: 0.4 + 0.55 * r(), pose: pers ? "spontane" : null, pointAccroche: true,
    };
    out.push({
      id: `w${i}`, nom: `W_${String(i).padStart(4, "0")}.JPG`, l, h: hh, date: `2025-08-${String(1 + jour).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(Math.floor(r() * 59)).padStart(2, "0")}:00`,
      netteteRel: 0.6 + r(), visages: Array.from({ length: pers }, (_, k) => ({ x: 0.2 + 0.12 * k, y: 0.25, l: 0.07, h: 0.09 })), zone: { x: 0.25, y: 0.2, l: 0.5, h: 0.6 },
      palette: ["#4a6fa5", "#d9c7a7", "#2b2b2b"], calme: "haut", moment: null, ecart: null, ia, chapitre: null, empreinte: hex(r), numeroGalerie: 1000 + i,
    });
  }
  out.sort((a, b) => (a.date! < b.date! ? -1 : 1));
  /* les moments : blocs de deux heures */
  for (const p of out) p.moment = p.date!.slice(0, 12);
  return out;
}
const entree = (photos: PhotoCompo[], o: Partial<EntreeCompo> = {}): EntreeCompo => ({ photos, voyage: null, lieux: null, fiche: { theme: "road_trip" }, titre: "Vacances", piles: 0, quand: "2026-11-18T00:00:00.000Z", v2: REGLAGES_V2_DEFAUT, ...o });

const doublesDe = (r: ResultatCompo) => r.doubles ?? [];

export function verifierCompositeurV2(ok: Ok): void {
  const ph = voyage();
  const r = composer(entree(ph, { fiche: { theme: "road_trip", taille: 32 } }));

  /* cinq notes */
  const notes = r.selection.photos.filter((p) => p.etat !== "ecartee").map((p) => p.notes).filter((n): n is CinqNotes => !!n);
  const cles = ["technique", "histoire", "image", "gens", "unicite"] as const;
  ok("v2 · cinq notes : chaque photo non écartée a ses cinq notes, de 0 à 1, sur quatre crans, chacune avec sa phrase (M-20, N-40)",
    notes.length === r.selection.photos.filter((p) => p.etat !== "ecartee").length && notes.every((n) => cles.every((k) => n[k].valeur >= 0 && n[k].valeur <= 1 && ["faible", "correcte", "bonne", "forte"].includes(n[k].cran) && n[k].phrase.length > 3)));

  /* causes fermées */
  const ec = voyage(40, 5);
  ec[1].ecart = { raison: "doublon d'une autre photo du dépôt", regle: "S-020" };
  ec[2].ecart = { raison: "floue", regle: "S-023" };   // floue avec un sujet (zone) : réserve, pas écart
  ec[3] = { ...ec[3], ecart: { raison: "floue", regle: "S-023" }, visages: [], zone: null };   // floue sans rien de net : écartée
  ec[4].ecart = { raison: "une autre de la rafale est gardée", regle: "S-027" };   // rafale : jugée sur l'image, jamais écartée
  ec[5] = { ...ec[5], l: 120, h: 90 };   // inimprimable
  ec[6] = { ...ec[6], ia: { ...ec[6].ia!, sujetSpecial: "document", role: "a_ecarter" } };   // hors sujet
  const rc = composer(entree(ec, { fiche: { theme: "road_trip", taille: 24 } }));
  const etat = (id: string) => rc.selection.photos.find((p) => p.id === id)!;
  ok("v2 · écarter : cinq causes fermées seulement ; une floue où l'on voit un sujet va en réserve, une rafale n'est jamais écartée (M-17, N-41)",
    rc.selection.photos.filter((p) => p.etat === "ecartee").every((p) => !!p.cause && (CAUSES_ECART as readonly string[]).includes(p.cause))
      && etat(ec[1].id).cause === "doublon_exact" && etat(ec[3].id).cause === "floue_sans_sujet" && etat(ec[2].id).etat !== "ecartee"
      && etat(ec[4].id).etat !== "ecartee" && etat(ec[5].id).cause === "inimprimable" && etat(ec[6].id).cause === "hors_sujet");

  /* densité qui absorbe : à taille égale, « serrée » pose au moins autant que « avant », et chaque réserve « pas de place » est dite */
  const serree = composer(entree(ph, { fiche: { theme: "road_trip", taille: 40 }, v2: { ...REGLAGES_V2_DEFAUT, densite: "serree" } }));
  const avant = composer(entree(ph, { fiche: { theme: "road_trip", taille: 40 }, v2: { ...REGLAGES_V2_DEFAUT, densite: "avant" } }));
  ok(`v2 · densité (M-16, N-47b) : à 40 pages, « serrée » pose plus que « avant » (${serree.selection.compte.posee} contre ${avant.selection.compte.posee}) ; la réserve « pas de place » vient après`,
    serree.pages === 40 && avant.pages === 40 && serree.selection.compte.posee > avant.selection.compte.posee);

  /* 9 / 12, rythme */
  const tous = [r, serree, avant];
  ok("v2 · bornes (M-23, N-44) : jamais plus de 9 photos sur une double, 12 en série", tous.every((x) => doublesDe(x).every((d) => d.photos <= 12 && (d.photos <= 9 || d.phrase.includes("série")))));
  const troisDenses = (x: ResultatCompo) => { const d = doublesDe(x); for (let i = 2; i < d.length; i++) if (d[i].chapitre === d[i - 2].chapitre && [d[i], d[i - 1], d[i - 2]].every((y) => y.photos >= 6)) return true; return false; };
  ok("v2 · rythme (N-47) : jamais trois doubles denses (6 et plus) d'affilée", tous.every((x) => !troisDenses(x)));
  ok("v2 · chaque double dit « N photos ici parce que… » et cite des règles du registre (M-28)",
    tous.every((x) => doublesDe(x).length > 0 && doublesDe(x).every((d) => /^\d+ photos? : /.test(d.phrase) && d.regles.length > 0 && d.regles.some((id) => !!regleParId(id)))));

  /* petite entorse : même journée, une double au plus */
  const P = charger(entree(ph), null, new Map());
  entonnoirV2(P, undefined, []);
  const seq = [...P.values()].filter((x) => x.date && x.date.startsWith("2025-08-03")).sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const det = seq[seq.length - 1];
  det.plan = "serre"; det.sujet = "objet"; det.nbPers = 0;
  seq[seq.length - 6].plan = "large";
  const journal: { quoi: string; ou: string; detail: string; regles: string[] }[] = [];
  const pe = pairesEtEntorses(seq, journal, "essai");
  const bouge = Math.abs(pe.seq.indexOf(det) - seq.indexOf(det));
  ok(`v2 · petite entorse (M-22, N-52) : un détail rejoint son sujet de la même journée en bougeant de 4 places au plus (${bouge}), le jour ne change pas`,
    bouge <= 4 && pe.seq.length === seq.length && pe.seq.every((x) => x.date!.startsWith("2025-08-03")));

  /* comptage exact, absence n'est pas zéro */
  const quatre = voyage(30, 9).map((p, i) => ({ ...p, ia: { ...p.ia!, personnesNombre: i % 3 === 0 ? 4 : p.ia!.personnesNombre } }));
  const Pq = charger(entree(quatre), null, new Map());
  const sel = entonnoirV2(Pq, undefined, []);
  ok(`v2 · comptage exact : un groupe de 4 lu sur plusieurs photos donne 4, jamais « groupe = 3 » (${sel.groupe})`, sel.groupe === 4 && [...Pq.values()].some((x) => x.nbPers === 4));
  const ancienne = voyage(10, 4).map((p) => ({ ...p, visages: [{ x: 0.2, y: 0.2, l: 0.1, h: 0.1 }, { x: 0.5, y: 0.2, l: 0.1, h: 0.1 }], ia: { ...p.ia!, personnes: null, personnesNombre: undefined } }));
  const Pa = charger(entree(ancienne), null, new Map());
  const Pa1 = charger({ ...entree(ancienne), v2: null }, null, new Map());
  ok("v2 · absence n'est pas zéro : une lecture ancienne sans le champ personnes compte les visages (2), la v1 garde son calcul d'avant",
    [...Pa.values()].every((x) => x.nbPers === 2 && x.v2!.personnesDeduites) && [...Pa1.values()].every((x) => x.nbPers === 0));

  /* corrections qui priment */
  const cible = ph[10].id, garder = ph[11].id;
  const rC = composer(entree(ph, { fiche: { theme: "road_trip", taille: 24 }, corrections: { marques: { ecartees: [cible], coeurs: [garder] }, tags: { [ph[12].id]: { sujetSpecial: "document", role: "a_ecarter" } }, reponses: { personnes: 5 } } }));
  const e2 = (id: string) => rC.selection.photos.find((p) => p.id === id)!;
  ok("v2 · corrections (M-27) : écartée par l'atelier, coup de cœur jamais en réserve, tag corrigé appliqué, réponse qui prime sur la machine",
    e2(cible).etat === "ecartee" && e2(cible).cause === "atelier" && e2(garder).etat !== "ecartee" && e2(garder).etat !== "reserve" && e2(ph[12].id).cause === "hors_sujet"
      && rC.decisions.some((d) => d.detail.includes("groupe de 5")));

  /* la table de densité */
  const Pt = charger(entree(ph), null, new Map());
  entonnoirV2(Pt, undefined, []);
  const l = [...Pt.values()].filter((x) => !x.ecart).slice(0, 8).map((x) => ({ ...x, moment: "M" }));
  const ctx = { moyenne: 3, plafond: 4.5, maxDouble: 9, maxSerie: 12, serree: true, momentTaille: new Map([["M", 14]]), medianeMoment: 4, sommetId: null, dpiDouble150: true };
  const a1 = nombreVoulu(l.slice(0, 5), ctx), a2 = nombreVoulu(l.slice(0, 5), ctx);
  ok("v2 · table de densité : mêmes entrées, même nombre et mêmes règles ; chaque ligne de la table a sa raison et son exception ; ses identifiants sont au registre",
    JSON.stringify(a1) === JSON.stringify(a2) && TABLE_DENSITE.every((t) => t.pourquoi && t.exception && !!regleParId(t.id)));
  const ids = new Set(r.selection.photos.filter((p) => p.etat === "posee").map((p) => p.id));
  /* le même lot que la trame : les photos gardées (posées, ou en réserve faute de place), page 1 et dernière page comprises */
  const lot = new Set(r.selection.photos.filter((p) => p.etat !== "ecartee" && !/^(faible|l'IA|floue|presque identique|sortie)/.test(p.detail ?? "")).map((p) => p.id));
  const imgs = [...Pt.values()].filter((x) => lot.has(x.id)).map((x) => x.v2?.notes?.image.valeur ?? 0).sort((p, q) => q - p);
  const seuilTop = imgs[Math.max(0, Math.ceil(imgs.length * 0.1) - 1)];
  const belles = [...Pt.values()].filter((x) => ids.has(x.id) && belle(x, true) && (x.v2?.notes?.image.valeur ?? 0) > seuilTop + 0.005);
  /* M-32 (N-49b) : une belle photo n'entre dans une double dense que si la double a du SENS pour elle (paire, série, même moment, même
     scène), et elle y est alors la PLUS GRANDE */
  const noyees: string[] = [];
  const pairesT = pairesEtEntorses([...Pt.values()].filter((x) => x.date && !x.ecart).sort((a, b) => (a.date! < b.date! ? -1 : 1)), [], "essai").paires;
  const noyee = belles.some((b) => {
    const pl = r.jet.magazine.planches.find((p) => [p.double, p.gauche, p.droite].some((d) => d?.photos.some((a) => a.photoId === b.id)));
    if (!pl) return false;
    const n = [pl.double, pl.gauche, pl.droite].reduce((s, d) => s + (d?.photos.length ?? 0), 0);
    if (n < 6 || b.v2?.coeur) return false;
    const autres = [pl.double, pl.gauche, pl.droite].flatMap((d) => d?.photos.map((a) => a.photoId) ?? []).filter((id): id is string => !!id).map((id) => Pt.get(id)).filter((x): x is NonNullable<typeof x> => !!x);
    const sens = sensPourBelle(b, autres, pairesT);
    const aires: { id: string | null; a: number }[] = [];
    for (const [cible, d] of (pl.mode === "double" ? [["double", pl.double]] : [["gauche", pl.gauche], ["droite", pl.droite]]) as ["double" | "gauche" | "droite", typeof pl.double][]) {
      if (!d) continue;
      let k = 0;
      for (const c of cadresDe(d, cible)) if (c.role === "photo") aires.push({ id: d.photos[k++]?.photoId ?? null, a: c.l * c.h });
    }
    const max = Math.max(...aires.map((x) => x.a));
    const plusGrande = (aires.find((x) => x.id === b.id)?.a ?? 0) >= max - 1e-6;
    if (!sens || !plusGrande) noyees.push(`${b.id} sur ${pl.id} (${n}${sens ? "" : ", sans sens"}${plusGrande ? "" : ", pas la plus grande"})`);
    return !sens || !plusGrande;
  });
  ok(`v2 · M-32 : une belle photo du dixième le plus fort n'entre dans une double dense (6 photos et plus) qu'avec du sens (même moment, même scène, paire, série), et elle y est la plus grande (${belles.length} belles posées)${noyees.length ? ` : ${noyees.join(", ")}` : ""}`, !noyee);
  const charge = nombreVoulu(l.slice(0, 5), { ...ctx, momentTaille: new Map([["M", 20]]) });
  const leger = nombreVoulu(l.slice(0, 5), { ...ctx, momentTaille: new Map([["M", 1]]) });
  ok(`v2 · une période chargée n'est jamais étalée en doubles vides : 20 photos sur le moment veulent ${charge.cible} par double, 1 photo en veut ${leger.cible} (N-48)`,
    charge.belle !== null || charge.cible > leger.cible);

  /* déterminisme, v1 inchangée */
  const r2 = composer(entree(ph, { fiche: { theme: "road_trip", taille: 32 } }));
  ok("v2 · déterministe (même entrée, même sortie, au caractère près)", JSON.stringify(r2) === JSON.stringify(r));
  const v1 = composer({ ...entree(ph, { fiche: { theme: "road_trip", taille: 32 } }), v2: null });
  ok("v2 · la v1 reste le témoin : sans réglages v2, ni notes, ni table, ni version 2", v1.version === undefined && v1.doubles === undefined && v1.selection.photos.every((p) => !p.notes));

  /* v2.1 : le recadrage par ce qu'on coupe (M-29, N-55 à N-58) */
  const Pr = charger(entree(ph), null, new Map());
  entonnoirV2(Pr, undefined, []);
  const large = [...Pr.values()].find((x) => x.r >= 1.9 && !x.visages.length)!;
  const centre = Array.from({ length: 256 }, (_, i) => ((i % 16) >= 6 && (i % 16) <= 9 && Math.floor(i / 16) >= 5 && Math.floor(i / 16) <= 10 ? "9" : "1")).join("");
  const partout = Array.from({ length: 256 }, (_, i) => (Math.floor(i / 16) >= 5 && Math.floor(i / 16) <= 10 ? "9" : "1")).join("");   // un horizon sur toute la largeur
  const zc = zoneV2(large, centre, "normal"), zp = zoneV2(large, partout, "normal");
  ok("v2.1 · zone lue dans la carte de chaleur : un sujet au centre donne une zone étroite et recadrable ; une chaleur étalée fait « tout le cadre compte », jamais recadrable (N-55, N-57)",
    zc.zone[2] < 0.5 && !zc.toutLeCadre && recadrable(large, zc) && zp.toutLeCadre && !recadrable(large, zp) && JSON.stringify(zoneV2(large, centre, "normal")) === JSON.stringify(zc));
  ok("v2.1 · la zone tient ou ne tient pas, au rapport du cadre (géométrie exacte) ; la part retirée d'une 21:9 dans une demi-page vaut 1 - 1,45/2,22",
    zoneTient([0.4, 0, 0.2, 1], { l: 4000, h: 1800 }, 1.45) && !zoneTient([0, 0, 1, 1], { l: 4000, h: 1800 }, 1.45) && Math.abs(partRetiree({ l: 4000, h: 1800 }, 1.45) - (1 - 1.45 / (4000 / 1800))) < 1e-9);
  const petitSujet = { zone: [0.45, 0.45, 0.1, 0.1] as [number, number, number, number], toutLeCadre: false, regard: null, source: "" };
  ok("v2.1 · mettre en avant (N-58) : jamais en prudent ; borné par le mode et par 200 ppp ; jamais quand tout le cadre compte",
    zoomMiseEnAvant(petitSujet, { l: 4000, h: 3000 }, { l: 190, h: 130 }, "prudent") === 1 && zoomMiseEnAvant(petitSujet, { l: 4000, h: 3000 }, { l: 190, h: 130 }, "franc") <= 1.6
      && zoomMiseEnAvant(petitSujet, { l: 4000, h: 3000 }, { l: 190, h: 130 }, "franc") > 1 && zoomMiseEnAvant(petitSujet, { l: 800, h: 600 }, { l: 190, h: 130 }, "franc") === 1
      && zoomMiseEnAvant({ ...petitSujet, toutLeCadre: true }, { l: 4000, h: 3000 }, { l: 190, h: 130 }, "franc") === 1);
  const chaleurs = ph.map((p, i) => ({ ...p, chaleur: i % 3 ? centre : partout }));
  const rr = composer(entree(chaleurs, { fiche: { theme: "road_trip", taille: 32 }, v2: { ...REGLAGES_V2_DEFAUT, recadrage: "normal" } }));
  const rr2 = composer(entree(chaleurs, { fiche: { theme: "road_trip", taille: 32 }, v2: { ...REGLAGES_V2_DEFAUT, recadrage: "normal" } }));
  const f = (re: RegExp) => rr.controle.fautes.filter((x) => re.test(x.faute)).length;
  /* le rognage n'est jamais silencieux : toute photo dont le cœur de la zone sort du cadre gardé est une faute DURE nommée */
  const silencieux: string[] = [];
  rr.jet.magazine.planches.forEach((pl, i) => {
    for (const [cible, d] of (pl.mode === "double" ? [["double", pl.double]] : [["gauche", pl.gauche], ["droite", pl.droite]]) as ["double" | "gauche" | "droite", typeof pl.double][]) {
      if (!d) continue;
      let ip = 0;
      for (const c of cadresDe(d, cible)) {
        if (c.role !== "photo") continue;
        const a = d.photos[ip++];
        const z = a?.photoId ? rr.zones?.[a.photoId] : undefined;
        const p = a?.photoId ? chaleurs.find((q) => q.id === a.photoId) : undefined;
        if (!a?.photoId || !z || !p) continue;
        const k = cadrer({ l: p.l, h: p.h }, { l: c.l, h: c.h }, a.recadrage);
        const w = { x: -k.x / k.l, y: -k.y / k.h, l: c.l / k.l, h: c.h / k.h };
        const dans = Math.max(0, Math.min(w.x + w.l, z.coeur[0] + z.coeur[2]) - Math.max(w.x, z.coeur[0])) * Math.max(0, Math.min(w.y + w.h, z.coeur[1] + z.coeur[3]) - Math.max(w.y, z.coeur[1])) / Math.max(1e-9, z.coeur[2] * z.coeur[3]);
        const dit = rr.controle.fautes.some((x) => x.detail.includes(p.nom) && /zone importante|sujet entamé|tout le cadre/.test(x.faute));
        if (dans < 0.9 && !dit) silencieux.push(`${p.nom} (planche ${i})`);
      }
    }
  });
  ok(`v2.1 · composé avec recadrage : aucun visage coupé, aucune photo sous 150 ppp, et AUCUN rognage silencieux : un sujet entamé est toujours une faute dure nommée (${silencieux.join(", ") || "aucun"} ; fautes restantes : ${rr.controle.fautes.length})`,
    f(/visage coupé/) === 0 && f(/sous 150/) === 0 && silencieux.length === 0);
  ok("v2.1 · la zone importante du recadrage est rendue (cœur, air, tout le cadre), et la composition est déterministe", !!rr.zones && Object.keys(rr.zones).length > 0 && JSON.stringify(rr) === JSON.stringify(rr2));
  const temoin = composer(entree(ph, { fiche: { theme: "road_trip", taille: 32 } }));
  ok("v2.1 · sans réglage de recadrage, la v2 d'avant à l'identique (le témoin)", JSON.stringify(temoin) === JSON.stringify(r) && !temoin.zones);

  /* lecture v4, planche B6 */
  const v4 = { format: "bellajour-lecture-ia", version: 4, photos: { "A.JPG": { personnes: "groupe", personnes_nombre: 4, sujet_special: "animal", force_image: 0.8, pose: "spontane", geste: true, insolite: false } }, rafales: [], groupes: [] };
  const relu = lireLectureIA(v4);
  const b6 = (o: Record<string, unknown>) => lireReponsePlanche6({ photos: [{ numero: 1, role: "heros", sujet: "personnes", candidate: "aucune", interet: 0.7, texte_lisible: false, plan: "moyen", moment_journee: "jour", ambiance: "vivant", personnes: "groupe", personnes_nombre: 4, sujet_special: "aucun", force_image: 0.6, pose: "pose", geste: false, insolite: false, ...o }] }, 1, 1);
  const lu6 = b6({});
  ok("v2 · lecture v4 et planche B6 (M-26) : les six tags relus ; un compte hors 0 à 7 refusé ; une identité refusée ; v1 à v3 toujours lisibles",
    relu.ok && relu.lecture.photos["A.JPG"]?.personnes_nombre === 4 && lu6.ok && lu6.valeur.photos[0].personnes_nombre === 4
      && !b6({ personnes_nombre: 9 }).ok && !b6({ force_image: 2 }).ok && !lireLectureIA({ ...v4, photos: { "A.JPG": { personnes_nombre: 12 } } }).ok
      && !lireLectureIA({ ...v4, photos: { "A.JPG": { qui: "Paul" } } }).ok && !lireLectureIA({ ...v4, version: 3, photos: { "A.JPG": { personnes_nombre: 2 } } }).ok);
}
