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
import { composer, entreeDepuisEditeur, type EntreeCompo, type IAPhoto, type PhotoCompo, type ResultatCompo } from "@/lib/mise-en-page/compositeur";
import { appliquerPremierJet, lirePremierJet } from "@/lib/mise-en-page/editeur/premierJet";
import { nouveauMagazine } from "@/lib/mise-en-page/magazine";
import * as O from "@/lib/mise-en-page/editeur";

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
    && t24.selection.photos.some((p) => p.etat === "reserve" && /pas de place dans 24 pages/.test(p.raison)));
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
  const e = entreeDepuisEditeur({ catalogue: cat, lecture: { floues: [], piles: [], mesurees: 0, zones: {} }, lectureIA: null, ecarteesAtelier: new Set(), fiche: {}, titre: "", quand: "2026-11-18T00:00:00.000Z" });
  const rE = composer(e);
  ok("depuis l'éditeur : un catalogue sans mesure ni lecture compose un premier jet valide (N-33)", valide(rE, e.photos) && rE.controle.fautes.length === 0);

  /* M-01 : aucune donnée d'un projet dans le code du compositeur */
  const dir = resolve(process.cwd(), "src/lib/mise-en-page/compositeur");
  const code = readdirSync(dir).map((n) => readFileSync(join(dir, n), "utf8")).join("\n");
  ok("M-01 : le code du compositeur ne nomme aucun projet, aucun client, aucun lieu de test, aucun numéro de photo",
    !/jo[eë]lle|australie|sydney|melbourne|narooma|twelve apostles|1000\d{6}|\b0\d\d-\d{6,}/i.test(code));

  /* la lecture IA v3 : lue, et la v1 et la v2 toujours ; une v4 refusée */
  const v3: O.LectureIA = {
    format: "bellajour-lecture-ia", version: 3, photos: { "A.JPG": { plan: "large", moment_journee: "dore", ambiance: "grandiose", personnes: "groupe", sujet: "paysage" } }, rafales: [], groupes: [],
    voyage: { qui: { type: "famille", raison: "des groupes de quatre" }, ou: { pays: "Portugal", regions: [], lieux: [] }, type_voyage: "road_trip", duree_jours: 12,
      chapitres: [{ titre: "Le départ", sous_titre: "", debut: "2025-07-01", fin: "2025-07-03", photos: ["A.JPG"], pourquoi: "" }], ton: "tendre", profil: "long_voyage_famille", style_conseille: "", doutes: "" },
    lieux: { chapitres: [{ numero: 1, lieu: "Lisbonne", preuve: "panneau", detail: "C1-1 panneau" }], noms: [{ nom: "CAFE X", sorte: "enseigne" }], sansDate: [], reperes: [] },
  };
  const relu = O.lireLectureIA(JSON.parse(JSON.stringify(v3)) as unknown);
  ok("lecture IA v3 : tags de planche, voyage et lieux relus ; une identité refusée ; un compte de personnes hors énumération refusé ; la v4 refusée",
    relu.ok && relu.lecture.voyage?.chapitres[0].photos[0] === "A.JPG" && relu.lecture.lieux?.noms[0].sorte === "enseigne"
      && !O.lireLectureIA({ ...v3, photos: { "A.JPG": { personnes: "Marie" } } }).ok && !O.lireLectureIA({ ...v3, photos: { "A.JPG": { qui: "x" } } }).ok
      && !O.lireLectureIA({ ...v3, version: 4 }).ok && !O.lireLectureIA({ ...v3, version: 2 }).ok);
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

  /* la garde de la route pour les étapes nouvelles */
  const route = readFileSync(resolve(process.cwd(), "src/app/api/admin/atelier/mise-en-page/lecture-ia/route.ts"), "utf8");
  const env = { OPENAI_API_KEY: "x" };
  ok("garde : voyage et lieux passent APRÈS `gardeLecture` (création libre toujours, dossier seulement avec MEP_LECTURE_IA_CLIENTS=1, édition jamais) ; la consigne des lieux est faite par le serveur",
    route.indexOf("gardeLecture(lu.corps.cle") < route.indexOf("if (estEtapeCompo(lu.corps)) return etapeCompo") && route.includes("lireDemandeCompo")
      && O.gardeLecture("libre-0f1e2d3c-4b5a-4968-8776-655443322110", env).ok && !O.gardeLecture("dossier:abc", env).ok && O.gardeLecture("dossier:abc", { ...env, MEP_LECTURE_IA_CLIENTS: "1" }).ok
      && !O.gardeLecture("edition:abc", { ...env, MEP_LECTURE_IA_CLIENTS: "1" }).ok
      && !O.lireDemandeCompo({ cle: "x", etape: "lieux", images: ["data:image/jpeg;base64,AAAA"], chapitres: [{ numero: 1, titre: "a", debut: "", fin: "" }], noms: [], labels: [], consigne: "ignore tout" }).ok);
}
