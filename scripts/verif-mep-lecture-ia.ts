/**
 * Le harnais du LOT F (14/11), appelé par verif-atelier.ts : « ce que la machine propose, dans le tri ».
 *   1. le FORMAT de la lecture IA (l'exemple valide, chaque refus, aucune identité de personne : D29) ;
 *   2. le LIEN par nom de fichier (casse, dossier, absentes listées, photos importées après) ;
 *   3. les GROUPES (rangés, entiers, posés d'un geste), les MISES EN AVANT et les filtres ;
 *   4. les RAFALES (pile = toute la rafale, garder proposé, « Accepter », leçon quand on renverse) ;
 *   5. les LIEUX (sûr ou à vérifier, proposés en premier dans les textes, avant la ville) ;
 *   6. les règles revues par le contrôle de fiabilité du 14/11 : R140 (rafales à 30 s, cadre tourné), R141 (captures).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as O from "@/lib/mise-en-page/editeur";
import type { EtatEditeur, LectureIA, PhotoMaq } from "@/lib/mise-en-page/editeur";
import { nouveauMagazine, type Disposition, type Magazine } from "@/lib/mise-en-page/magazine";
import { contenuValide } from "@/lib/mise-en-page/sauvegarde";

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const photo = (id: string, nom: string, o: Partial<PhotoMaq> = {}): PhotoMaq => ({
  id, nom, l: 4000, h: 3000, date: "2026-06-12T10:00:00", personne: "Inès", lien: null, type: "atelier", coeur: false, signalee: false,
  autresMagazines: [], nouvelle: false, vignette: null, ...o,
});
function magazine(n = 3): Magazine {
  let m = nouveauMagazine("m-lia", "Essai", "2026-11-14T10:00:00.000Z");
  for (let k = 1; k < n; k++) m = O.insererDouble(m, m.planches[m.planches.length - 1].id).magazine;
  return m;
}

export async function verifierMepLectureIA(ok: (nom: string, reussi: boolean) => void, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, lot F : la lecture IA dans le tri (rôles, groupes, rafales, captures, lieux) —");

  /* ── 1. le format ── */
  const exemple = readFileSync(resolve(process.cwd(), "docs/moteur/exemple-lecture-ia.json"), "utf8");
  const lu = O.lireLectureIA(exemple);
  ok("format : l'exemple de la doc (docs/moteur/exemple-lecture-ia.json) est valide : 7 photos, une rafale, un trio, un combo de couleurs, un projet compté",
    lu.ok && Object.keys(lu.lecture.photos).length === 7 && lu.lecture.rafales.length === 1 && lu.lecture.groupes[0]?.type === "trio" && lu.lecture.couleurs?.length === 1 && lu.lecture.projet?.source === "comptage");
  if (!lu.ok) return;
  const L0 = lu.lecture;
  const refuse = (x: unknown, mot: string): boolean => { const r = O.lireLectureIA(x); return !r.ok && r.phrase.includes(mot); };
  const avec = (f: (l: Record<string, unknown>) => void): unknown => { const l = clone(L0) as unknown as Record<string, unknown>; f(l); return l; };
  const photos = (l: Record<string, unknown>) => l.photos as Record<string, Record<string, unknown>>;
  ok("format : refus en UNE phrase : JSON illisible, autre format, version 2, champ en trop à la racine",
    refuse("{", "JSON") && refuse({ ...clone(L0), format: "bellajour-premier-jet" }, "format") && refuse({ ...clone(L0), version: 2 }, "Version 2")
      && refuse({ ...clone(L0), personnes: ["P1"] }, "« personnes »"));
  ok("D29 : AUCUNE identité de personne : un champ « personnes », « principaux » ou « empreinte » sur une photo est refusé ; « visages » n'admet que nombre, plusGrand, selfie",
    refuse(avec((l) => { photos(l)["IMG_0101.JPG"].personnes = ["P1", "P2"]; }), "« personnes »")
      && refuse(avec((l) => { photos(l)["IMG_0101.JPG"].principaux = 2; }), "« principaux »")
      && refuse(avec((l) => { (photos(l)["IMG_0101.JPG"].visages as Record<string, unknown>).empreinte = "abc"; }), "visages")
      && refuse(avec((l) => { (photos(l)["IMG_0101.JPG"].visages as Record<string, unknown>).qui = "P1"; }), "visages"));
  ok("format : un rôle inconnu, un intérêt hors de 0 à 1, une raison de 9 mots sont refusés ; 8 mots passent",
    refuse(avec((l) => { (photos(l)["IMG_0101.JPG"].role as Record<string, unknown>).role = "vedette"; }), "rôle inconnu")
      && refuse(avec((l) => { (photos(l)["IMG_0101.JPG"].role as Record<string, unknown>).interet = 1.2; }), "interet")
      && refuse(avec((l) => { (photos(l)["IMG_0101.JPG"].role as Record<string, unknown>).raison = "un deux trois quatre cinq six sept huit neuf"; }), "8 mots")
      && O.lireLectureIA(avec((l) => { (photos(l)["IMG_0101.JPG"].role as Record<string, unknown>).raison = "un deux trois quatre cinq six sept huit"; })).ok);
  ok("format : un lieu « sûr » sans preuve est refusé (il est « à vérifier ») ; une preuve inconnue aussi",
    refuse(avec((l) => { delete (photos(l)["IMG_0101.JPG"].lieu as Record<string, unknown>).preuve; }), "preuve")
      && refuse(avec((l) => { (photos(l)["IMG_0101.JPG"].lieu as Record<string, unknown>).preuve = "intuition"; }), "preuve"));
  ok("format : une capture d'un type inconnu est refusée ; deux entrées pour le même nom (casse, dossier) aussi",
    refuse(avec((l) => { (photos(l)["IMG_0105.JPG"].capture as Record<string, unknown>).type = "selfie"; }), "capture")
      && refuse(avec((l) => { photos(l)["DCIM/img_0101.jpg"] = {}; }), "même nom de fichier"));
  ok("format : une rafale dont une photo à garder n'est pas dans la rafale, une rafale d'une seule photo, une photo dans deux rafales : refusées",
    refuse(avec((l) => { (l.rafales as Record<string, unknown>[])[0].garder = ["IMG_0101.JPG"]; }), "garder")
      && refuse(avec((l) => { (l.rafales as Record<string, unknown>[])[0].photos = ["IMG_0106.JPG"]; }), "de 2 à 60")
      && refuse(avec((l) => { (l.rafales as unknown[]).push({ photos: ["IMG_0107.JPG", "IMG_0101.JPG"], garder: ["IMG_0101.JPG"], usage: "sequence", pourquoi: "x" }); }), "deux rafales"));
  ok("format : un groupe dont le type ne dit pas le nombre (trio de deux), une idée de 7 mots, une photo dans deux groupes : refusés",
    refuse(avec((l) => { (l.groupes as Record<string, unknown>[])[0].photos = ["IMG_0102.JPG", "IMG_0103.JPG"]; }), "duo")
      && refuse(avec((l) => { (l.groupes as Record<string, unknown>[])[0].idee = "un deux trois quatre cinq six sept"; }), "6 mots")
      && refuse(avec((l) => { (l.groupes as unknown[]).push({ type: "duo", photos: ["IMG_0102.JPG", "IMG_0106.JPG"], idee: "Deux" }); }), "deux groupes"));
  ok("format : un combo de couleurs sans ses six rôles (ou en majuscules) est refusé ; sans « couleurs » ni « projet », la lecture reste valide",
    refuse(avec((l) => { ((l.couleurs as Record<string, unknown>[])[0].couleurs as Record<string, unknown>).papier = "#FFFFFF"; }), "six couleurs")
      && O.lireLectureIA(avec((l) => { delete l.couleurs; delete l.projet; })).ok);
  ok("format : le bouton reconnaît une lecture à son seul champ « format » (un premier jet n'en est pas une)",
    O.estLectureIA(JSON.parse(exemple)) && !O.estLectureIA({ format: "bellajour-premier-jet" }) && !O.estLectureIA(null));

  /* ── 2. le lien par nom de fichier ── */
  const cat = new Map<string, PhotoMaq>([
    ["a", photo("a", "img_0101.jpg", { ville: "Munich", pays: "Allemagne" })], ["b", photo("b", "Dossier/IMG_0102.JPG", { ville: "Munich" })],
    ["c", photo("c", "IMG_0103.JPG", { ville: "Munich" })], ["d", photo("d", "IMG_0104.JPG", { ville: "Munich" })],
    ["e", photo("e", "IMG_0105.JPG")], ["f", photo("f", "IMG_0106.JPG", { date: "2026-06-12T11:00:00" })],
  ]);
  const r = O.relierLectureIA(L0, cat);
  ok("lien : par le NOM DE FICHIER (casse et dossier ignorés) : 6 photos reliées sur 7, la 7e (IMG_0107.JPG) listée, rien ne casse",
    r.reliees === 6 && r.total === 7 && r.manquantes.join() === "IMG_0107.JPG" && r.photos.get("a")?.role?.role === "pleine" && r.photos.get("b")?.lieu?.statut === "a_verifier");
  ok("lien : une rafale dont une photo manque garde ce qu'elle peut ; réduite à une photo, elle disparaît (pas de pile d'une photo)",
    r.rafales.length === 0 && O.relierLectureIA(L0, new Map([...cat, ["g", photo("g", "IMG_0107.JPG")]])).rafales[0]?.photos.join() === "f,g");

  const e0 = O.creerEtat({ magazine: magazine(), catalogue: cat });
  const e1 = O.appliquer(e0, { type: "poserLectureIA", lecture: L0 });
  ok("lien : la lecture ne touche JAMAIS au magazine (même objet, aucune entrée d'historique, sauvegarde intacte et valide)",
    e1.magazine === e0.magazine && e1.historique.passe.length === 0 && e1.sauvegarde === e0.sauvegarde && contenuValide(e1.magazine) && e1.lectureIA?.reliees === 6);
  const e2 = O.appliquer(e1, { type: "ajouterAuCatalogue", photos: [photo("g", "IMG_0107.JPG", { date: "2026-06-12T11:00:05" })] });
  ok("lien : une photo importée APRÈS la lecture s'y relie aussitôt (sans recharger le fichier) : la rafale de deux apparaît",
    e2.lectureIA?.reliees === 7 && e2.lectureIA.rafales.length === 1 && e2.lecture.piles.some((p) => p.tete === "f" && p.autres.join() === "g" && p.source === "ia"));
  ok("lien : « poserLectureIA » avec null retire la lecture, ses piles et ses lieux ; une lecture mal formée ne change rien",
    O.appliquer(e2, { type: "poserLectureIA", lecture: null }).lectureIA === null && O.appliquer(e2, { type: "poserLectureIA", lecture: null }).lecture.piles.length === 0
      && ![...O.appliquer(e2, { type: "poserLectureIA", lecture: null }).catalogue.values()].some((p) => p.lieuIA)
      && O.appliquer(e2, { type: "poserLectureIA", lecture: { format: "x" } as unknown as LectureIA }) === e2);

  /* ── 3. groupes, mises en avant, filtres ── */
  const eg = O.appliquer(e2, { type: "filtrer", filtres: { groupe: "ia" } });
  const gs = O.groupes(eg);
  ok("groupes (R144) : « Grouper › Groupes » range le trio en tête avec son idée (« Trio · Le titre dans le ciel »), le reste « Sans groupe » à la fin",
    gs[0]?.libelle === "Trio · Le titre dans le ciel" && gs[0].ids.join() === "b,c,d" && gs[gs.length - 1].libelle === "Sans groupe" && O.libelleGroupeIA({ type: "duo", idee: "Deux" }) === "Duo · Deux");
  const ePoser = O.appliquer(eg, { type: "creerDoubles", ids: gs[0].ids });
  const pl = ePoser.magazine.planches.find((p) => p.double?.photos.some((a) => a.photoId === "b"));
  ok("groupes (R144) : « Poser » met le groupe ENTIER sur UNE double neuve, en un geste annulable",
    !!pl && pl.mode === "double" && !!pl.double && pl.double.photos.filter((a) => a.photoId).map((a) => a.photoId).sort().join() === "b,c,d" && ePoser.historique.passe.length === 1
      && O.appliquer(ePoser, { type: "annuler" }).magazine === eg.magazine);
  const lecPile: O.Lecture = { ...O.LECTURE_VIDE, piles: [{ tete: "b", autres: ["c"], raison: "rafale" }], mesurees: 2 };
  const egPile = O.appliquer(O.appliquer(eg, { type: "poserLecture", lecture: lecPile }), { type: "poserLectureIA", lecture: L0 });
  ok("groupes : rangé par groupes, une photo d'un groupe se montre même rangée sous une pile (le groupe reste entier) ; en rangement par jour, la pile la cache",
    O.visibles(egPile).includes("c") && !O.visibles(O.appliquer(egPile, { type: "filtrer", filtres: { groupe: "jour" } })).includes("c"));
  const t = O.tagsIA(e2.lectureIA);
  ok("mises en avant (R143) : seulement les photos proposées en couverture, pleine page ou double (a : pleine et candidate couverture, f : double et candidate « paysage ») ; rien sur les autres",
    O.misesEnAvant(e2.lectureIA!.photos.get("a")).join() === "couverture,pleine" && O.misesEnAvant(e2.lectureIA!.photos.get("f")).join() === "couverture,double"
      && O.misesEnAvant(e2.lectureIA!.photos.get("b")).length === 0 && !!t.get("a")?.includes("ia_couverture") && !t.get("c")?.some((x) => ["ia_couverture", "ia_pleine", "ia_double"].includes(x)));
  const filtre = (tag: string) => O.visibles(O.appliquer(e2, { type: "filtrer", filtres: { lecture: tag } as Partial<O.Filtres> }));
  ok("filtres : les tags de la lecture IA se filtrent (« Couverture » → a, f ; « Pleine page » → a ; « Double page » → f ; « Billet » → e ; « En groupe » → b, c, d ; « Lieu à vérifier » → b) ; un tag inconnu ne filtre pas",
    filtre("ia_couverture").join() === "a,f" && filtre("ia_pleine").join() === "a" && filtre("ia_double").join() === "f" && filtre("ia_billet").join() === "e" && filtre("ia_groupe").join() === "b,c,d"
      && filtre("ia_lieu_a_verifier").join() === "b" && O.appliquer(e2, { type: "filtrer", filtres: { lecture: "ia_inconnu" } as unknown as Partial<O.Filtres> }).filtres.lecture === "");

  /* ── 4. les rafales ── */
  const local: O.Lecture = { ...O.LECTURE_VIDE, piles: [{ tete: "f", autres: ["e"], raison: "doublon" }, { tete: "c", autres: ["d"], raison: "rafale" }], mesurees: 6 };
  const er = O.appliquer(O.appliquer(e2, { type: "poserLecture", lecture: local }), { type: "poserLectureIA", lecture: L0 });
  ok("rafales (R145) : la rafale de la lecture devient une pile (tête = la photo gardée par la machine) et prime sur la pile mesurée qui la touchait ; les autres piles restent",
    er.lecture.piles.some((p) => p.source === "ia" && p.tete === "f" && p.autres.join() === "g") && !er.lecture.piles.some((p) => p.source !== "ia" && [p.tete, ...p.autres].includes("f"))
      && er.lecture.piles.some((p) => p.tete === "c" && p.autres.join() === "d") && er.lectureMesuree.piles.length === 2);
  ok("rafales : fermée, la pile cache sa photo non gardée ; ouverte, elle montre TOUTE la rafale",
    !O.visibles(er).includes("g") && O.visibles(O.appliquer(er, { type: "basculerPile", tete: "f" })).includes("g"));
  const ea = O.appliquer(O.appliquer(er, { type: "basculerPile", tete: "f" }), { type: "accepterRafale", tete: "f" });
  ok("rafales : « Accepter » pose la proposition d'un geste : f gardée, g écartée ; une entrée d'historique ; des propositions « IA » ; Annuler la défait",
    O.marqueDe(ea.magazine, "f") === "choisie" && O.marqueDe(ea.magazine, "g") === "ecartee" && ea.historique.passe.length === 1
      && ea.pretri.g?.regle === O.REGLE_IA && ea.pretri.f?.marque === "choisie" && O.motProposition(ea.pretri.g) === "IA"
      && O.triDe(O.appliquer(ea, { type: "annuler" }).magazine).choisies.length === 0);
  const eDeja = O.appliquer({ ...er, magazine: O.marquer(er.magazine, ["g"], "coupDeCoeur") }, { type: "accepterRafale", tete: "f" });
  ok("rafales : une marque de l'atelier n'est jamais touchée (g en coup de cœur le reste, seule f est gardée) ; rien à accepter = rien ne se passe",
    O.marqueDe(eDeja.magazine, "g") === "coupDeCoeur" && O.marqueDe(eDeja.magazine, "f") === "choisie"
      && O.appliquer(ea, { type: "accepterRafale", tete: "f" }).magazine === ea.magazine && O.appliquer(er, { type: "accepterRafale", tete: "a" }).magazine === er.magazine);
  const eRenv = O.appliquer(ea, { type: "marquer", ids: ["g"], marque: "choisie" });
  ok("leçons (R148) : garder la photo que la machine écartait est une leçon « pretri_renverse » de règle IA, avec la raison de la machine",
    eRenv.lecons.some((l) => l.type === "pretri_renverse" && l.regle === "IA" && l.photos[0] === "g" && l.proposition.startsWith("écartée : ") && O.leconValide(l)));
  const eAutre = O.appliquer(O.appliquer(er, { type: "basculerPile", tete: "f" }), { type: "marquer", ids: ["g"], marque: "choisie" });
  ok("leçons : sans « Accepter », garder une autre photo d'une rafale de la lecture est une leçon de règle IA (pas R74)",
    eAutre.lecons.some((l) => l.regle === "IA" && l.type === "pile_autre_gardee" && O.leconValide(l)));

  /* ── 5. les lieux ── */
  ok("lieux (R147) : sûr (preuve) et confiant (≥ 0,7) = proposé ; « à vérifier », ou sûr mais à 0,6 : jamais",
    O.lieuSur({ lieu: { nom: "BMW Welt", confiance: 0.9, source: "ia", statut: "sur", preuve: "panneau" } }) === "BMW Welt"
      && O.lieuSur({ lieu: { nom: "Olympiapark", confiance: 0.95, source: "ia", statut: "a_verifier" } }) === null
      && O.lieuSur({ lieu: { nom: "Ailleurs", confiance: 0.6, source: "gps", statut: "sur", preuve: "gps" } }) === null && O.lieuSur(undefined) === null);
  ok("lieux : le lieu sûr rejoint la photo du catalogue (a : BMW Welt) ; le lieu à vérifier non (b) ; le magazine n'en sait rien",
    e2.catalogue.get("a")?.lieuIA === "BMW Welt" && !e2.catalogue.get("b")?.lieuIA && contenuValide(e2.magazine));
  const dispo = (ids: string[]): Disposition => ({ templateId: "E-S1", photos: ids.map((photoId) => ({ photoId, recadrage: { zoom: 1, dx: 0, dy: 0 } })), textes: [{ contenu: "Titre", taille: 60, gras: true }, { contenu: "Légende", taille: 7, gras: false }] });
  const avant = O.lieuxParDefaut(dispo(["a"]), "droite", e0.catalogue);
  const apres = O.lieuxParDefaut(dispo(["a"]), "droite", e2.catalogue);
  const aVerifier = O.lieuxParDefaut(dispo(["b"]), "droite", e2.catalogue);
  ok("lieux (R147) : un titre non écrit prend le lieu NOMMÉ sûr avant la ville (« BMW Welt » au lieu de « Munich ») ; un lieu à vérifier laisse la ville",
    avant[0] === "Munich" && apres[0] === "BMW Welt" && aVerifier[0] === "Munich" && O.lieuDeTexte({ ...e2.catalogue.get("a")! }) === "BMW Welt");
  ok("lieux : la couverture et les séjours gardent la ville (le lieu nommé ne vaut que pour les titres et légendes d'une page)",
    O.lieuCourt(e2.catalogue.get("a")!) === "Munich");

  /* ── 6. R140 et R141 : le contrôle de fiabilité du 14/11 ── */
  const sec = (s: number) => `2026-06-11T10:00:${String(s).padStart(2, "0")}`;
  /* empreintes à distance contrôlée de la référence (que des zéros) : les n premiers bits à 1 */
  const bits = (n: number): string => Array.from({ length: 16 }, (_, k) => { const b = Math.max(0, Math.min(4, n - 4 * k)); return ((1 << b) - 1).toString(16); }).join("");
  const paire = (dt: number, d: number, l2 = 4000, h2 = 3000): boolean => {
    const c = new Map<string, PhotoMaq>([["P", photo("P", "P.jpg", { date: sec(0) })], ["Q", photo("Q", "Q.jpg", { date: sec(dt), l: l2, h: h2 })]]);
    return O.lireMesures(c, new Map([["P", { nettete: 500, dhash: bits(0) }], ["Q", { nettete: 400, dhash: bits(d) }]])).piles.some((p) => p.raison === "rafale");
  };
  ok("R140 : deux photos qui se suivent à 20 s, proches (18 bits) : une rafale (avant : seulement sous 2 s ou 16 bits)",
    paire(20, 18) && O.REGLAGES.rafale_suite_secondes.valeur === 30 && O.REGLAGES.rafale_suite_hamming.valeur === 20);
  ok("R140 : à 20 s mais 22 bits, même orientation : pas une rafale ; à 40 s et 18 bits : pas une rafale ; à 50 s et 16 bits : toujours une rafale (R74)",
    !paire(20, 22) && !paire(40, 18) && paire(50, 16));
  ok("R140 : un CADRE TOURNÉ (paysage puis portrait) n'exclut plus la paire : à 6 s et 22 bits, une rafale (marge de 4) ; à 6 s et 26 bits, non",
    paire(6, 22, 3000, 4000) && !paire(6, 26, 3000, 4000) && O.REGLAGES.rafale_tournee_marge.valeur === 4);
  const cap = (nom: string, l: number, hh: number, o: Partial<PhotoMaq> = {}, m: Partial<O.Mesure> = {}) =>
    O.estCapture({ nom, l, h: hh, date: null, appareil: null, ...o }, { nettete: 1, dhash: bits(0), ...m });
  ok("R141 : les deux vraies captures des six lots restent trouvées (candice 004 et lara 039 : PNG, 1170 × 2532, sans appareil)",
    cap("004 - 18 dec 2023 - IMG_9264.png", 1170, 2532) && cap("39-IMG_4439.png", 1170, 2532));
  ok("R141 : les 7 exports Snapchat de marjorie (JPEG 1 : 2,05, ni appareil ni date, sans texte) ne sont PLUS des captures",
    ["30", "31", "34", "36", "89", "90", "91"].every((n) => !cap(`${n}-Snapchat-1720891300.jpeg`, 1080, 2214, {}, { aplats: 0.2, visages: [{ x: 0.3, y: 0.2, l: 0.2, h: 0.2 }] })));
  ok("R141 : sans PNG, il faut du texte abondant (10 lignes et plus) sur un grand aplat (0,3) SANS visage ; le seuil de forme (1,9) ne baisse pas (16 : 9 n'en est pas une)",
    cap("x.jpeg", 1170, 2532, {}, { texte: 22, aplats: 0.47 }) && !cap("x.jpeg", 1170, 2532, {}, { texte: 22, aplats: 0.47, visages: [{ x: 0.4, y: 0.3, l: 0.2, h: 0.2 }] })
      && !cap("x.jpeg", 1170, 2532, {}, { texte: 5, aplats: 0.6 }) && !cap("x.jpeg", 1170, 2532, {}, { texte: 22, aplats: 0.2 }) && !cap("x.png", 1080, 1920)
      && !cap("x.png", 1170, 2532, { date: sec(1), appareil: "Apple iPhone 15" }));
  ok("R141 : le pré-tri suit la règle : une capture PNG va en réserve, l'export Snapchat de même forme n'est plus touché pour cela",
    (() => {
      const c = new Map<string, PhotoMaq>([["S", photo("S", "s.png", { l: 1170, h: 2532, date: null, appareil: null })], ["N", photo("N", "Snapchat-1.jpeg", { l: 1080, h: 2214, date: null, appareil: null })]]);
      const lect = O.lireMesures(c, new Map([["S", { nettete: 500, dhash: bits(0) }], ["N", { nettete: 500, dhash: bits(40) }]]));
      const pt = O.preTrier(c, magazine(2), lect);
      return pt.propositions.S?.marque === "reserve" && pt.propositions.N?.raison !== "capture d'écran probable";
    })());

  /* ── la lecture ne s'invite pas dans un état sans elle (rien ne change pour un projet d'avant) ── */
  const eSans: EtatEditeur = O.creerEtat({ magazine: magazine(), catalogue: cat });
  ok("sans lecture IA : aucun tag, aucune pile ajoutée, le groupe « ia » ne range rien (tout « Sans groupe »), le titre garde la ville",
    O.tagsIA(eSans.lectureIA).size === 0 && eSans.lecture.piles.length === 0
      && O.groupes(O.appliquer(eSans, { type: "filtrer", filtres: { groupe: "ia" } })).every((g) => g.libelle === "Sans groupe")
      && O.lieuxParDefaut(dispo(["a"]), "droite", eSans.catalogue)[0] === "Munich");
}
