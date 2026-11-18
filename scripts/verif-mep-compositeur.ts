/**
 * Les tests du COMPOSITEUR (C20, 18/11/2026), lancés par `verif-atelier.ts`. Sans base, sans réseau, sans photo : des lots FABRIQUÉS
 * (dimensions, dates, visages comptés, tags de lecture), un par profil :
 *   - voyage en famille aux photos très larges (21:9), thème road trip, étapes saisies dans la fiche ;
 *   - fête de nuit (des groupes, une soirée), ambiance stylisée ;
 *   - lot sans aucune date ni lecture IA ;
 *   - lot avec rafales, doublons et floues (lecture locale) ;
 *   - lot minuscule.
 * Pour chacun : un premier jet que l'éditeur accepte (`lirePremierJet`, `appliquerPremierJet`), zéro faute dure, des pages multiples de 4,
 * une réserve faite de photos FAIBLES seulement (M-09), le déterminisme. Puis : chapitres par lieux (M-05), la fiche qui prime, M-10,
 * aucune donnée de client dans le code, la garde de la route pour les étapes nouvelles, la lecture IA v3.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { autresTailles, composer, composerSur, entreeDepuisEditeur, lireFiche, motLaissee, motPlace, motsPorteurs, titreImprimable, type EntreeCompo, type IAPhoto, type PhotoCompo, type ResultatCompo } from "@/lib/mise-en-page/compositeur";
import { appliquerPremierJet, lirePremierJet } from "@/lib/mise-en-page/editeur/premierJet";
import { nouveauMagazine } from "@/lib/mise-en-page/magazine";
import * as O from "@/lib/mise-en-page/editeur";
import { verifierCompositeurV2 } from "./verif-mep-compositeur-v2";

/* ─────────────── la fabrique de lots (déterministe : un générateur à graine) ─────────────── */

function graine(n: number): () => number {
  let s = n >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const DIMS = { U: [4000, 1800], L: [4032, 3024], P: [3024, 4032], H: [1800, 4000] } as const;
type Gabarit = { forme: keyof typeof DIMS; date: string | null; visages: number; ia?: Partial<IAPhoto> | null };

function lot(prefixe: string, l: Gabarit[]): PhotoCompo[] {
  return l.map((g, i) => {
    const [w, h] = DIMS[g.forme];
    const visages = Array.from({ length: g.visages }, (_, k) => ({ x: 0.2 + 0.12 * k, y: 0.25, l: 0.07, h: 0.09 }));
    const ia: IAPhoto | null = g.ia === null ? null : {
      interet: 0.65, role: "satellite", sujet: g.visages ? "personnes" : "paysage", plan: g.visages ? "moyen" : "large",
      personnes: g.visages >= 3 ? "groupe" : (String(g.visages) as "0" | "1" | "2"), momentJournee: "jour", ambiance: "calme", lieuLu: null, couverture: false, ...(g.ia ?? {}),
    };
    return {
      id: `${prefixe}${i}`, nom: `${prefixe.toUpperCase()}_${String(i).padStart(4, "0")}.JPG`, l: w, h, date: g.date, netteteRel: 1,
      visages, zone: { x: 0.25, y: 0.2, l: 0.5, h: 0.6 }, palette: ["#4a6fa5", "#d9c7a7", "#2b2b2b"], calme: "haut", moment: g.date ? g.date.slice(0, 13) : null,
      ecart: null, ia, chapitre: null,
    };
  });
}
const heure = (j: number, h: number, m = 0) => `2025-07-${String(1 + j).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;

function voyageLarge(): PhotoCompo[] {
  const r = graine(7);
  const l: Gabarit[] = [];
  for (let j = 0; j < 12; j++) for (let k = 0; k < 5; k++) {
    const x = r();
    l.push({ forme: x < 0.45 ? "U" : x < 0.7 ? "H" : x < 0.85 ? "P" : "L", date: heure(j, 9 + 2 * k, Math.floor(r() * 50)), visages: r() < 0.3 ? (r() < 0.5 ? 4 : 2) : 0, ia: { interet: 0.5 + 0.4 * r() } });
  }
  return lot("v", l);
}
function feteDeNuit(): PhotoCompo[] {
  const r = graine(11);
  const l: Gabarit[] = [];
  for (let k = 0; k < 48; k++) l.push({ forme: r() < 0.6 ? "P" : "L", date: `2025-06-21T${String(20 + Math.floor(k / 12)).padStart(2, "0")}:${String((k * 5) % 60).padStart(2, "0")}:00`, visages: 1 + Math.floor(r() * 4), ia: { interet: 0.5 + 0.4 * r(), momentJournee: "nuit", ambiance: "festif" } });
  return lot("f", l);
}
function sansDate(): PhotoCompo[] {
  const r = graine(3);
  return lot("s", Array.from({ length: 30 }, () => ({ forme: (r() < 0.5 ? "P" : "L") as "P" | "L", date: null, visages: r() < 0.3 ? 2 : 0, ia: null })));
}
function rafales(): PhotoCompo[] {
  const r = graine(5);
  const l: Gabarit[] = [];
  for (let k = 0; k < 40; k++) l.push({ forme: r() < 0.5 ? "P" : "L", date: heure(Math.floor(k / 10), 10 + (k % 10), 0), visages: r() < 0.25 ? 2 : 0, ia: { interet: 0.5 + 0.4 * r() } });
  const ps = lot("r", l);
  ps[3].ecart = { raison: "une autre de la rafale est gardée", regle: "S-027" };
  ps[4].ecart = { raison: "doublon d'une autre photo du dépôt", regle: "S-020" };
  ps[9].ecart = { raison: "floue", regle: "S-023" };
  ps[12].ia = { ...ps[12].ia!, interet: 0.1 };
  ps[13].ia = { ...ps[13].ia!, role: "a_ecarter" };
  return ps;
}
function minuscule(): PhotoCompo[] {
  return lot("m", [{ forme: "P", date: heure(0, 10), visages: 0 }, { forme: "L", date: heure(0, 11), visages: 2 }, { forme: "P", date: heure(0, 12), visages: 0 }, { forme: "L", date: heure(0, 13), visages: 0 }, { forme: "P", date: heure(0, 14), visages: 3 }]);
}

const entree = (photos: PhotoCompo[], o: Partial<EntreeCompo> = {}): EntreeCompo => ({ photos, voyage: null, lieux: null, fiche: {}, titre: "Vacances", piles: 0, quand: "2026-11-18T00:00:00.000Z", ...o });

function valide(r: ResultatCompo, photos: readonly PhotoCompo[]): boolean {
  const lu = lirePremierJet(JSON.stringify(r.jet));
  if (!lu.ok) return false;
  const cat = new Map(photos.map((p) => [p.id, { nom: p.nom }]));
  const b = appliquerPremierJet(lu.jet, nouveauMagazine("essai", "essai", "2026-11-18T00:00:00.000Z"), cat);
  return b.refus === null && b.manquantes.length === 0;
}
const FAIBLES = /^(S-017|S-025|M-09|M-05|S-133|S-034|DA-6|M-10)$/;
const reserveFaible = (r: ResultatCompo): boolean => r.selection.photos.filter((p) => p.etat === "reserve").every((p) => p.regles.some((x) => FAIBLES.test(x)));

export async function verifierMepCompositeur(ok: (nom: string, reussi: boolean) => void, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, le compositeur (C20, 18/11) : questions, composition, contrôle —");

  const cas: [string, PhotoCompo[], Partial<EntreeCompo>][] = [
    ["voyage en famille aux photos très larges", voyageLarge(), { fiche: { theme: "road_trip", lieux: ["Lisbonne", "Porto", "Coimbra", "Faro"] } }],
    ["fête de nuit", feteDeNuit(), { fiche: { theme: "fete", ambiance: "stylise" } }],
    ["lot sans date", sansDate(), {}],
    ["lot avec rafales", rafales(), { piles: 2 }],
    ["lot minuscule", minuscule(), {}],
  ];
  const resultats = new Map<string, ResultatCompo>();
  for (const [nom, photos, o] of cas) {
    let r: ResultatCompo | null = null, erreur = "";
    try { r = composer(entree(photos, o)); } catch (e) { erreur = (e as Error).message; }
    if (!r) { ok(`${nom} : le compositeur rend un magazine (${erreur})`, false); continue; }
    resultats.set(nom, r);
    ok(`${nom} : premier jet VALIDE (lirePremierJet, appliquerPremierJet sans photo manquante), ${r.pages} pages multiple de 4, ${r.selection.compte.posee} posées`,
      valide(r, photos) && r.pages % 4 === 0 && r.pages >= 4 && r.selection.compte.posee > 0);
    const pourquoi = (ou: string) => r.decisions.filter((d) => d.quoi === ou.replace("double", "planche")).map((d) => `${d.ou} ${d.detail}`).join(" / ");
    ok(`${nom} : zéro faute dure${r.controle.fautes.length ? ` (${r.controle.fautes.map((f) => `${f.faute} · ${f.ou} · ${f.detail} [${pourquoi(f.ou)}]`).join(" ; ")})` : ""}`, r.controle.fautes.length === 0);
    ok(`${nom} : la réserve n'a que des photos faibles (M-09), chaque photo a sa raison et sa règle (M-02), chaque décision cite une règle`,
      reserveFaible(r) && r.selection.photos.length === photos.length && r.selection.photos.every((p) => p.raison && p.regles.length) && r.decisions.every((d) => d.regles.length > 0));
    const r2 = composer(entree(photos, o));
    ok(`${nom} : déterministe (même entrée, même sortie)`, JSON.stringify(r2) === JSON.stringify(r));
  }

  /* M-05 : un road trip aux étapes saisies : autant de chapitres, nommés par elles, dans l'ordre */
  const v = resultats.get("voyage en famille aux photos très larges");
  ok("M-05 : road trip, étapes saisies : chapitres nommés par les lieux, dans l'ordre, statut « saisi dans la fiche »",
    !!v && v.chapitres.map((c) => c.titre).join() === "Lisbonne,Porto,Coimbra,Faro" && v.chapitres.every((c) => c.statut.includes("fiche")) && v.sobre);
  const f = resultats.get("fête de nuit");
  ok("M-06 : la fête stylisée n'est pas sobre ; le profil suit le thème de la fiche", !!f && !f.sobre && f.profil === "vacances_festives_jeunes");
  const ra = resultats.get("lot avec rafales");
  ok("M-02 : les écartées (rafale, doublon, floue) sont listées avec leur raison ; les faibles (note basse, « à écarter ») vont en réserve",
    !!ra && ["r3", "r4", "r9"].every((id) => ra.selection.photos.find((p) => p.id === id)?.etat === "ecartee")
      && ["r12", "r13"].every((id) => ra.selection.photos.find((p) => p.id === id)?.etat === "reserve"));

  /* la fiche prime : la taille saisie, le nombre de personnes */
  const t24 = composer(entree(voyageLarge(), { fiche: { taille: 24, theme: "road_trip" } }));
  ok("la fiche prime : 24 pages saisies → 24 pages, les bonnes photos sans place vont en réserve avec cette raison", t24.pages === 24
    && t24.selection.photos.some((p) => p.etat === "reserve" && /pas de place en 24 pages/.test(p.raison) && /pas de place dans 24 pages/.test(p.detail ?? "")));
  const devine = O.estimerComposition(10, 0, false);
  void devine;

  /* M-10 : la couverture choisie par l'atelier ne revient jamais à l'intérieur */
  if (v) {
    const dedans = v.selection.photos.filter((p) => p.etat === "posee").map((p) => p.id);
    const choisie = dedans[Math.floor(dedans.length / 2)];
    const m10 = composer(entree(voyageLarge(), { fiche: { theme: "road_trip", lieux: ["Lisbonne", "Porto", "Coimbra", "Faro"] }, couverture: { premiere: [choisie], quatrieme: [] } }));
    const enCouv = (m10.jet.magazine.couverture?.photos ?? []).map((a) => a.photoId);
    const interieur = new Set(m10.jet.magazine.planches.flatMap((p) => [p.double, p.gauche, p.droite]).flatMap((d) => d?.photos.map((a) => a.photoId) ?? []));
    ok("M-10 : une photo choisie en couverture sort de l'intérieur (recomposé), aucun doublon, aucune faute « couverture aussi à l'intérieur »",
      enCouv.includes(choisie) && !interieur.has(choisie) && !m10.controle.fautes.some((x) => x.regle === "M-10") && valide(m10, voyageLarge()));
  }

  /* l'adaptateur de l'éditeur : un catalogue sans lecture compose */
  const cat = new Map(minuscule().map((p) => [p.id, { id: p.id, nom: p.nom, l: p.l, h: p.h, date: p.date, personne: "", lien: null, type: "atelier" as const, coeur: false, signalee: false, autresMagazines: [], nouvelle: false, vignette: null }]));
  const e = entreeDepuisEditeur({ catalogue: cat, lecture: { floues: [], piles: [], mesurees: 0, zones: {} }, lectureIA: null, ecarteesAtelier: new Set(), fiche: {}, titre: "", quand: "2026-11-18T00:00:00.000Z", version: 1 });
  const rE = composer(e);
  ok("depuis l'éditeur : un catalogue sans mesure ni lecture compose un premier jet valide (N-33)", valide(rE, e.photos) && rE.controle.fautes.length === 0);

  /* M-01 : aucune donnée d'un projet dans le code du compositeur */
  const dir = resolve(process.cwd(), "src/lib/mise-en-page/compositeur");
  const code = readdirSync(dir).map((n) => readFileSync(join(dir, n), "utf8")).join("\n");
  ok("M-01 : le code du compositeur ne nomme aucun projet, aucun client, aucun lieu de test, aucun numéro de photo",
    !/jo[eë]lle|australie|sydney|melbourne|narooma|twelve apostles|1000\d{6}|\b0\d\d-\d{6,}/i.test(code));

  /* la lecture IA v3 : lue, et la v1 et la v2 toujours ; une v6 refusée (la v4 et la v5 existent depuis le 18/11) */
  const v3: O.LectureIA = {
    format: "bellajour-lecture-ia", version: 3, photos: { "A.JPG": { plan: "large", moment_journee: "dore", ambiance: "grandiose", personnes: "groupe", sujet: "paysage" } }, rafales: [], groupes: [],
    voyage: { qui: { type: "famille", raison: "des groupes de quatre" }, ou: { pays: "Portugal", regions: [], lieux: [] }, type_voyage: "road_trip", duree_jours: 12,
      chapitres: [{ titre: "Le départ", sous_titre: "", debut: "2025-07-01", fin: "2025-07-03", photos: ["A.JPG"], pourquoi: "" }], ton: "tendre", profil: "long_voyage_famille", style_conseille: "", doutes: "" },
    lieux: { chapitres: [{ numero: 1, lieu: "Lisbonne", preuve: "panneau", detail: "C1-1 panneau" }], noms: [{ nom: "CAFE X", sorte: "enseigne" }], sansDate: [], reperes: [] },
  };
  const relu = O.lireLectureIA(JSON.parse(JSON.stringify(v3)) as unknown);
  ok("lecture IA v3 : tags de planche, voyage et lieux relus ; une identité refusée ; un compte de personnes hors énumération refusé ; la v6 refusée",
    relu.ok && relu.lecture.voyage?.chapitres[0].photos[0] === "A.JPG" && relu.lecture.lieux?.noms[0].sorte === "enseigne"
      && !O.lireLectureIA({ ...v3, photos: { "A.JPG": { personnes: "Marie" } } }).ok && !O.lireLectureIA({ ...v3, photos: { "A.JPG": { qui: "x" } } }).ok
      && !O.lireLectureIA({ ...v3, version: 6 }).ok && !O.lireLectureIA({ ...v3, version: 2 }).ok);
  const b5 = O.lireReponsePlanche5({ photos: [{ numero: 1, role: "heros", sujet: "personnes", candidate: "aucune", interet: 0.7, texte_lisible: false, plan: "moyen", moment_journee: "jour", ambiance: "vivant", personnes: "2" }] }, 1, 1);
  ok("planche B5 : les quatre tags relus ; un tag hors énumération refusé ; le schéma ne porte qu'un COMPTE de personnes (D29)",
    b5.ok && b5.valeur.photos[0].personnes === "2" && !O.lireReponsePlanche5({ photos: [{ numero: 1, role: "heros", sujet: "personnes", candidate: "aucune", interet: 0.7, texte_lisible: false, plan: "moyen", moment_journee: "jour", ambiance: "vivant", personnes: "Paul" }] }, 1, 1).ok
      && JSON.stringify(O.SCHEMA_B5.properties.photos.items.properties.personnes.enum) === JSON.stringify(["0", "1", "2", "groupe"]) && O.CONSIGNE_B5.includes("Compte, n'identifie pas"));
  const vo = O.lireReponseVoyage({ qui: { type: "famille", raison: "x" }, ou: { pays: "Portugal", regions: [], lieux: [] }, type_voyage: "road_trip", duree_jours: 3, chapitres: [{ titre: "Un", sous_titre: "", debut: "2025-07-01", fin: "2025-07-02", numeros: [1, 2, 2, 9], pourquoi: "" }], ton: "tendre", profil: "couple", style_conseille: "", doutes: "" }, ["A.JPG", "B.JPG"]);
  ok("voyage : les numéros deviennent des noms de fichier, un numéro repris ou inconnu est oublié ; le relevé n'envoie aucun nom de fichier",
    vo.ok && vo.valeur.chapitres[0].photos.join() === "A.JPG,B.JPG" && !O.releveVoyage([{ date: null, role: null, sujet: null, plan: null, moment: null, ambiance: null, personnes: null, visages: 0, lieu: "", raconte: "" }]).lignes[0].includes(".JPG"));
  const li = O.lireReponseLieux({ chapitres: [{ numero: 1, lieu: "Porto", preuve: "reconnu", detail: "C1-2 pont" }, { numero: 9, lieu: "X", preuve: "panneau", detail: "" }, { numero: 2, lieu: "", preuve: "panneau", detail: "" }], noms_lus: [], sans_date: [{ label: "S1", chapitre: 1, raison: "même pont" }, { label: "S9", chapitre: 1, raison: "" }] }, [1, 2], ["S1"]);
  ok("lieux : un chapitre inconnu oublié, un lieu « prouvé » sans nom devient « aucune », une étiquette inconnue oubliée",
    li.ok && li.valeur.chapitres.length === 2 && li.valeur.chapitres[1].preuve === "aucune" && li.valeur.sansDate.length === 1 && O.consigneLieux("", [], [], false).includes("Une enseigne (commerce, marque, restaurant) n'est jamais un lieu"));
  const deg = O.planDegradation(Array.from({ length: 700 }, (_, i) => `p${i}`), new Map(Array.from({ length: 700 }, (_, i) => [`p${i}`, (i % 16).toString(16).repeat(16)])));
  const est = O.estimerComposition(800, 0, true);
  ok("dégradation : au-delà de 600, 600 lues réparties et les autres héritent d'une lue ; regard plafonné à 40 + 20 ; l'estimation la suit",
    deg.aLire.length === 600 && deg.heritage.size === 100 && [...deg.heritage.values()].every((s) => deg.aLire.includes(s)) && est.lues === 600 && est.heritees === 200 && est.regard === 40
      && O.choisirPourRegard(Array.from({ length: 400 }, (_, i) => ({ id: `q${i}`, candidate: "pleine" as const, interet: 0.5, texte: true })), new Set()).length === 60);

  /* ── 18/11 soir (« C'est un échec ! ») : M-13, M-14, M-15 et les trois défauts de la recette (E) ── */
  titre("— compositeur, 18/11 soir : jamais d'impasse (M-14), la machine propose la taille (M-15), les marques de l'atelier priment (M-13) —");
  const gros = (n: number, role: string | null, interet = 0.65): PhotoCompo[] => {
    const r = graine(n);
    return Array.from({ length: n }, (_, i) => {
      const x = r(); const [l, h] = x < 0.5 ? DIMS.L : x < 0.8 ? DIMS.P : DIMS.U;
      return {
        id: `g${i}`, nom: `G_${String(i).padStart(4, "0")}.JPG`, l, h, date: heure(Math.floor((i * 12) / n), 8 + (i % 12), (i * 7) % 60), netteteRel: 1,
        visages: r() < 0.3 ? [{ x: 0.3, y: 0.3, l: 0.07, h: 0.09 }, { x: 0.5, y: 0.3, l: 0.07, h: 0.09 }] : [], zone: { x: 0.25, y: 0.2, l: 0.5, h: 0.6 },
        palette: ["#4a6fa5"], calme: "haut" as const, moment: null, ecart: null, chapitre: null,
        ia: role ? { interet, role, sujet: "paysage", plan: "large" as const, personnes: "0" as const, momentJournee: "jour" as const, ambiance: "calme" as const, lieuLu: null, couverture: false } : null,
      };
    });
  };
  const lignes: string[] = [];
  let toutesOk = true;
  for (const n of [10, 85, 164]) for (const t of [4, 8, 60, 200] as const) {
    const i = composerSur(entree(gros(n, "satellite"), { fiche: { taille: t } }));
    const bon = i.ok ? valide(i.r, gros(n, "satellite")) && i.r.pages % 4 === 0 && (i.r.pages === t || (!!i.r.ajustement && i.r.ajustement.phrase === `${t} pages impossible avec ${i.r.ajustement.photos} photos : ${i.r.pages} pages proposées`))
      : !!i.phrase && !/répartition|undefined|Error/.test(`${i.phrase} ${i.cause} ${i.geste}`);
    toutesOk &&= bon;
    lignes.push(`${n}/${t}→${i.ok ? i.r.pages : "phrase"}`);
  }
  ok(`M-14 : toute taille demandée donne un magazine valide ou une phrase claire, jamais une impasse : 4, 8, 60, 200 pages sur 10, 85 et 164 photos (${lignes.join(" ")}) ; une taille infaisable est remplacée par la plus proche et DITE`, toutesOk);
  const g164 = composerSur(entree(gros(164, "satellite"), { fiche: { taille: "tout" } }));
  ok("M-14 : 164 photos en « tout garder » (le banc n'avait AUCUNE taille : 4 chapitres de 41 photos, 12 doubles au plus) composent en repli, et le disent", g164.ok && g164.r.pages >= 4 && valide(g164.r, gros(164, "satellite")));
  const rien = composerSur(entree(gros(12, "a_ecarter", 0.1)));
  const deux = composerSur(entree(gros(2, "satellite")));
  ok("M-14 : pas de quoi composer (toutes « à écarter », ou 2 photos) : une phrase en clair, la cause comptée, le geste ; jamais un message technique",
    !rien.ok && rien.phrase === "Aucune photo utilisable : pas de quoi faire un magazine." && rien.cause.includes("12 jugées faibles à la lecture") && rien.geste.startsWith("Relis les photos")
      && !deux.ok && deux.phrase.startsWith("Seulement 2 photos utilisables"));
  const codeCompo = readdirSync(resolve(process.cwd(), "src/lib/mise-en-page/compositeur")).map((n) => readFileSync(join(resolve(process.cwd(), "src/lib/mise-en-page/compositeur"), n), "utf8")).join("\n");
  const ecranC = readFileSync(resolve(process.cwd(), "src/app/admin/atelier/mise-en-page/[id]/Composer.tsx"), "utf8");
  ok("M-14 : aucun `throw` nu ne remonte à l'écran : chaque `throw` du compositeur est une `ImpasseComposition` (phrase, cause, geste) et l'écran ne passe que par `composerSur`, qui n'en laisse sortir aucune",
    (codeCompo.match(/\bthrow\b/g) ?? []).length === (codeCompo.match(/throw new ImpasseComposition\(/g) ?? []).length && (codeCompo.match(/throw new ImpasseComposition\(/g) ?? []).length >= 4
      && !/\bcomposer\(entreeDepuisEditeur|\bcomposer\(entreeLocale/.test(ecranC) && ecranC.includes("composerSur(entreeLocale(") && ecranC.includes("return (entreeDepuisEditeur({") && !ecranC.includes("(err as Error).message"));

  /* M-15 : la machine propose la taille */
  const m0 = composer(entree(voyageLarge(), { fiche: {} }));
  const m48 = composer(entree(voyageLarge(), { fiche: {}, pagesCommandees: 48 }));
  const mChoisi = composer(entree(voyageLarge(), { fiche: { taille: 24 }, pagesCommandees: 48 }));
  ok("M-15 : sans rien demander, « la machine propose » (M-09 : tout garder) ; un nombre de pages COMMANDÉ devient la taille par défaut et le dit ; une taille choisie après coup prime",
    m0.origineTaille === "machine" && m0.taille === "tout"
      && m48.origineTaille === "commandee" && m48.pages === 48 && m48.decisions.some((d) => d.detail === "48 pages : le nombre commandé")
      && mChoisi.origineTaille === "choisie" && mChoisi.pages === 24);
  const au = autresTailles(92, "machine", null), auC = autresTailles(48, "commandee", 48), auCh = autresTailles(24, "choisie", 48);
  ok("M-15 : après la proposition, les autres tailles (« Plus court », « Tout garder », « Commandé ») ; chacune sera composée pour donner ses vrais chiffres",
    au.map((a) => `${a.mot}:${a.taille}`).join() === "Plus court:48" && auC.map((a) => `${a.mot}:${a.taille}`).join() === "Plus court:24,Tout garder:tout"
      && auCh.map((a) => `${a.mot}:${a.taille}`).join() === "Plus court:12,Tout garder:tout,Commandé:48" && autresTailles(28, "machine", null).map((a) => a.taille).join() === "16");
  /* 18/11 soir : les questions vivent dans la page Analyse (`Analyse.tsx`) */
  const questions = readFileSync(resolve(process.cwd(), "src/app/admin/atelier/mise-en-page/[id]/Analyse.tsx"), "utf8");
  ok("M-15 : la feuille des questions ne demande plus le nombre de pages (aucun bouton « N pages », aucun « Tout garder ») ; une taille gardée d'avant n'est pas reprise ; chaque question peut rester vide",
    !questions.includes("TAILLES_PROPOSEES") && !questions.includes("Tout garder") && questions.includes("La machine propose la taille") && ecranC.includes("const { taille: _t, ...sansTaille } = saisie;")
      && lireFiche({ taille: "machine" }).taille === "machine" && !questions.includes("required"));

  /* M-13 : une photo gardée par l'atelier n'est jamais écartée par la machine */
  const poison = gros(40, "a_ecarter", 0.1);
  const gardees = poison.slice(0, 20).map((p) => p.id);
  for (const p of poison) if (gardees.includes(p.id)) p.gardee = true;
  poison[3].ecart = { raison: "floue", regle: "S-023" };
  const rg = composer(entree(poison, { marques: { coeurs: [gardees[0]], gardees: gardees.slice(1) } }));
  const etatDe = (id: string) => rg.selection.photos.find((p) => p.id === id)?.etat;
  ok("M-13 : une photo gardée par l'atelier (coup de cœur ou gardée) n'est JAMAIS écartée ni mise en réserve par la machine (ni « à écarter », ni note basse, ni floue) ; les 20 autres « à écarter » vont en réserve",
    gardees.every((id) => etatDe(id) === "posee" || etatDe(id) === "couverture") && poison.slice(20).every((p) => etatDe(p.id) === "reserve")
      && rg.jet.magazine.tri?.coupsDeCoeur?.join() === gardees[0] && gardees.slice(1).every((id) => rg.jet.magazine.tri?.choisies.includes(id)) && !(rg.jet.magazine.tri?.reserve ?? []).some((id) => gardees.includes(id)));

  /* M-13 : une lecture douteuse n'est pas utilisée par l'adaptateur de l'éditeur */
  const catD = new Map(gros(30, null).map((p) => [p.id, { id: p.id, nom: p.nom, l: p.l, h: p.h, date: p.date, personne: "", lien: null, type: "atelier" as const, coeur: false, signalee: false, autresMagazines: [], nouvelle: false, vignette: null }]));
  const lD: O.LectureIA = { format: "bellajour-lecture-ia", version: 2, photos: Object.fromEntries([...catD.values()].map((p) => [p.nom, { role: { role: "a_ecarter" as const, interet: 0.1, raison: "x" }, sujet: "autre" as const }])), rafales: [], groupes: [] };
  const relD = O.relierLectureIA(lD, catD);
  const susD = O.lectureSuspecte(O.verdictsDeLecture(lD, catD, [...catD.keys()]));
  const baseD = { catalogue: catD, lecture: { floues: [], piles: [], mesurees: 0, zones: {} }, lectureIA: relD, ecarteesAtelier: new Set<string>(), fiche: {}, titre: "", quand: "2026-11-18T00:00:00.000Z", version: 1 as const };
  const sansGarde = composerSur(entreeDepuisEditeur(baseD));
  const avecGarde = composerSur(entreeDepuisEditeur({ ...baseD, douteuse: { photos: susD.douteuses, toute: susD.toute, raison: susD.raisons.join(", ") } }));
  ok("M-13 : une lecture empoisonnée (30 « à écarter » sur 30) est vue DOUTEUSE ; sans la garde le compositeur n'a rien à poser (une phrase, plus d'impasse) ; avec elle il compose sans elle et le dit (décision M-13)",
    susD.toute && !sansGarde.ok && avecGarde.ok && avecGarde.r.selection.compte.posee >= 20 && avecGarde.r.decisions.some((d) => d.regles.includes("M-13") && d.detail.startsWith("douteuse")));

  /* E : la page 1 sans repère, un bout de panneau jamais en chapitre, des raisons en mots d'atelier */
  const p1 = composer(entree(sansDate(), { titre: "" })).jet.magazine.planches[0];
  const textesP1 = [...(p1.droite?.textes ?? []), ...(p1.double?.textes ?? [])];
  ok("E : la page 1 ne montre JAMAIS un repère (« Titre », « Légende ») comme un contenu : sans titre ni date, aucun cadre de texte vide ; avec un titre, il est écrit ; un nom par défaut de l'outil n'est pas un titre",
    textesP1.every((t) => t.contenu.trim() !== "" && !/^(titre|légende|texte)$/i.test(t.contenu.trim()))
      && composer(entree(minuscule(), { titre: "Été à Porto" })).jet.magazine.planches[0].droite?.textes.some((t) => t.contenu === "Été à Porto") === true
      && titreImprimable("Création libre") === "" && titreImprimable("Dossier de Paul") === "" && titreImprimable("Été à Porto") === "Été à Porto");
  const pano = voyageLarge();
  for (const [i, x] of pano.entries()) if (i % 5 === 0 && x.ia) x.ia = { ...x.ia, lieuLu: "VIEW" };
  for (const [i, x] of pano.entries()) if (i % 7 === 1 && x.ia) x.ia = { ...x.ia, lieuLu: "SCENIC VIEW POINT" };
  const rv = composer(entree(pano, { fiche: { theme: "road_trip" } }));
  ok("E : un bout de panneau (« View », « Scenic View Point » : moins de deux mots porteurs) ne devient JAMAIS un nom de chapitre ; le nom thématique reste",
    rv.chapitres.length > 0 && rv.chapitres.every((c) => !/view|point/i.test(c.titre)) && motsPorteurs("Great Ocean Road").length === 2 && motsPorteurs("Scenic View Point").length === 1);
  const toutesRaisons = [...resultats.values(), rv, rg].flatMap((r) => r.selection.photos.map((p) => p.raison));
  ok("E : les raisons de « Posées et laissées » sont en mots d'atelier (« Double 2, à côté d'une pleine page », « Note trop basse », « Presque la même photo que … »), jamais des identifiants de code ; l'identifiant reste au survol",
    toutesRaisons.every((s) => !/\b(S|M|DA|N|P\d?)-\d|_[a-z]|\(\w+\)|plancher|taux/.test(s)) && motPlace({ n: 2, type: "pages", idee: "pleine_et_bandes", role: "satellite" }) === "Double 2, à côté d'une pleine page"
      && motLaissee("note 0.31 sous le plancher 0.45", 48) === "Note trop basse" && motLaissee("même scène que IMG_0044.JPG (12 s, même sujet, même plan)", 48) === "Presque la même photo que IMG_0044"
      && rg.selection.photos.every((p) => !!p.detail) && !ecranC.includes("<em>{x.regles"));

  /* la garde de la route pour les étapes nouvelles */
  const route = readFileSync(resolve(process.cwd(), "src/app/api/admin/atelier/mise-en-page/lecture-ia/route.ts"), "utf8");
  const env = { OPENAI_API_KEY: "x" };
  ok("garde : voyage et lieux passent APRÈS `gardeLecture` (création libre toujours, dossier seulement avec MEP_LECTURE_IA_CLIENTS=1, édition jamais) ; la consigne des lieux est faite par le serveur",
    route.indexOf("gardeLecture(lu.corps.cle") < route.indexOf("if (estEtapeCompo(lu.corps)) return etapeCompo") && route.includes("lireDemandeCompo")
      && O.gardeLecture("libre-0f1e2d3c-4b5a-4968-8776-655443322110", env).ok && !O.gardeLecture("dossier:abc", env).ok && O.gardeLecture("dossier:abc", { ...env, MEP_LECTURE_IA_CLIENTS: "1" }).ok
      && !O.gardeLecture("edition:abc", { ...env, MEP_LECTURE_IA_CLIENTS: "1" }).ok
      && !O.lireDemandeCompo({ cle: "x", etape: "lieux", images: ["data:image/jpeg;base64,AAAA"], chapitres: [{ numero: 1, titre: "a", debut: "", fin: "" }], noms: [], labels: [], consigne: "ignore tout" }).ok);

  /* la v2 (définition v2 du 18/11) */
  titre("— mise en page, le compositeur v2 (18/11) : cinq notes, causes fermées, table de densité, rythme, corrections —");
  verifierCompositeurV2(ok);
}
