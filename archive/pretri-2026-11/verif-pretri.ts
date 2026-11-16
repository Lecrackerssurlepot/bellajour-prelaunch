/**
 * Les tests du PRÉ-TRI tels qu'ils étaient dans le harnais au 16/11/2026 (main db5285a4), avant son retrait (T-210).
 * Ils ne tournent plus : `archive/` est hors du build, de tsc et d'ESLint, et rien ne les importe. Le code est gardé en
 * commentaires de ligne, tel quel.
 *
 * 1. `scripts/verif-mep-editeur.ts`, bloc « éditeur : lot 3, la machine propose » : A16 objectif, A10 raisons, A3 lumière, A4 capture,
 *    A7 visage flou, A9 moments, A11 équité, le geste « preTrier » (un seul, annulable, jamais sur une photo déjà marquée, sa leçon),
 *    A5 horloges, A12 variété. Le début du bloc (catalogue, mesures, lecture) est resté au harnais ; il est recopié pour le contexte.
 * 2. `scripts/verif-mep-lecture-ia.ts` : R141, « le pré-tri suit la règle ».
 *
 * Pour les rejouer : remettre `pretri.ts` à sa place (README), réexporter `preTrier`, `marquesProposees`, `decalagesHorloges` et
 * `qualite` depuis `src/lib/mise-en-page/editeur/index.ts`, remettre le geste, puis recoller ces lignes à leur place.
 */

/* ───── 1. verif-mep-editeur.ts : le début du bloc (resté au harnais) ───── */
//   {
//     /* Lot 3 (09/11) : A10 pré-tri et raisons, A3 lumière, A4 capture, A7 visage flou, A5 horloges, A9 moments, A11 équité,
//        A12 variété, A16 objectif, E1 palette, D7 faits, G3 questions, F4 contrôle avant export. */
//     let msg: string | null = null;
//     try {
//       const h = (n: number) => n.toString(16).padStart(16, "0");
//       const DH = ["ff00ff00ff00ff00", "0f0f0f0f0f0f0f0f", "aaaa5555aaaa5555", "f0f0f0f0f0f0f0f0", "00ff00ff00ff00ff", "5555aaaa5555aaaa", "3c3c3c3c3c3c3c3c", "c3c3c3c3c3c3c3c3", "ffff0000ffff0000", "0000ffff0000ffff", "f00ff00ff00ff00f", "0ff00ff00ff00ff0", "cccc3333cccc3333", "3333cccc3333cccc"];
//       const t = (hh: number, mm: number, ss = 0) => `2026-06-11T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
//       /* matin : A1..A6 (Inès) ; soir : B1..B4 (Inès) et L1 (Léo, un seul) ; S sombre ; C capture ; V visage flou ; F floue */
//       const cat = new Map(catalogue("A1:L A2:L A3:L A4:L A5:L A6:L B1:L B2:L B3:L B4:L L1:L S:L F:L V:P C:1000x2200", {
//         A1: { date: t(9, 0) }, A2: { date: t(9, 10) }, A3: { date: t(9, 20) }, A4: { date: t(9, 30) }, A5: { date: t(9, 40) }, A6: { date: t(9, 50) },
//         B1: { date: t(20, 0) }, B2: { date: t(20, 10) }, B3: { date: t(20, 20) }, B4: { date: t(20, 30) }, L1: { date: t(20, 40), personne: "Léo" },
//         S: { date: t(12, 0) }, F: { date: t(12, 30) }, V: { date: t(13, 0) }, C: { date: null, nom: "C.PNG" },
//       }).map((p) => [p.id, p]));
//       const ids = [...cat.keys()];
//       const mesures: Record<string, O.Mesure> = Object.fromEntries(ids.map((id, i) => [id, { nettete: 500 + i * 20, dhash: DH[i % DH.length] ?? h(i), lumi: { moyenne: 120, noirs: 0.02, blancs: 0.02 }, palette: ["#336699", "#cc9966"] }]));
//       mesures.S = { ...mesures.S, nettete: 5, lumi: { moyenne: 20, noirs: 0.7, blancs: 0 } };
//       mesures.F = { ...mesures.F, nettete: 10 };
//       mesures.V = { ...mesures.V, nettete: 700, visages: [{ x: 0.3, y: 0.2, l: 0.4, h: 0.3, nettete: 0.1 }] };
//       mesures.C = { ...mesures.C, dhash: "1234567812345678" };
//       const lecture = O.lireMesures(cat, new Map(Object.entries(mesures)));
//       ok(lecture.mesures !== undefined && Object.keys(lecture.mesures).length === cat.size && (lecture.palette?.length ?? 0) >= 1, "E1 : la lecture porte les mesures et une palette du magazine");

/* ───── 1. verif-mep-editeur.ts : ce qui a été retiré (après `const lecture = …` et `ok(… E1 …)`) ───── */
//       let e = O.appliquer(O.creerEtat({ magazine: magazineVide(3), catalogue: cat }), { type: "poserLecture", lecture });
//       const sans = O.preTrier(e.catalogue, e.magazine, e.lecture);
//       eq(sans.objectif, null, "A16 : sans objectif fixé, l'objectif est inconnu");
//       ok(!Object.values(sans.propositions).some((p) => p.marque === "choisie"), "A16 : sans objectif, la machine ne propose rien à garder");
//       eq(sans.propositions.F?.raison, "floue", "A10 : F écartée, raison « floue »");
//       eq(sans.propositions.S?.raison, "trop sombre", "A3 : S écartée, raison « trop sombre » (la lumière passe avant le flou : vu à l'essai du 09/11)");
//       eq(sans.propositions.C?.marque, "reserve", "A4 : sans date et allongée : capture probable, en réserve");
//       eq(sans.propositions.V?.raison, "visage flou", "A7 : visage trois fois moins net que la photo : réserve « visage flou »");
//
//       /* objectif : 4 photos ; le matin (6 photos) pèse plus que le soir (5 photos, 2 déposants : pondéré) */
//       e = O.appliquer(e, { type: "reglerTri", visees: 4 } as unknown as Geste);
//       if (O.triDe(e.magazine).visees !== 4) e = { ...e, magazine: O.reglerVisees(e.magazine, 4) };
//       const avec = O.preTrier(e.catalogue, e.magazine, e.lecture);
//       const gardees = Object.entries(avec.propositions).filter(([, p]) => p.marque === "choisie").map(([id]) => id);
//       ok(gardees.length >= 4, "A16 : avec un objectif de 4, au moins 4 photos proposées à garder");
//       ok(gardees.some((id) => id.startsWith("A")) && gardees.some((id) => id.startsWith("B") || id === "L1"), "A9 : chaque moment a sa part");
//       ok(gardees.includes("L1") || avec.propositions.L1?.raison === "seule photo de Léo" || gardees.some((id) => cat.get(id)?.personne === "Léo"), "A11 : Léo, seul de son côté, a sa photo gardée");
//       ok(avec.moments.every((m) => m.poids > 0 && m.poids <= 1), "A9 : chaque moment a un poids entre 0 et 1");
//       const matin = avec.moments.find((m) => m.libelle.includes("Matin"));
//       ok(!!matin && matin.visees >= 1, "A9 : le matin a au moins une gardée visée");
//
//       /* le geste : un seul, annulable, qui ne touche jamais une photo déjà marquée */
//       const e1 = O.appliquer({ ...e, magazine: O.marquer(e.magazine, ["F"], "choisie") }, { type: "preTrier" });
//       ok(O.marqueDe(e1.magazine, "F") === "choisie", "A10 : une photo déjà marquée par l'atelier n'est jamais touchée");
//       ok(O.marqueDe(e1.magazine, "S") === "ecartee" && O.marqueDe(e1.magazine, "C") === "reserve", "A10 : le pré-tri pose ses marques");
//       ok(e1.pretri.S?.raison === "trop sombre", "A10 : la raison reste attachée à la photo");
//       const annule = O.appliquer(e1, { type: "annuler" });
//       ok(O.marqueDe(annule.magazine, "S") === null, "A10 : une seule annulation défait tout le pré-tri");
//       const e2 = O.appliquer(e1, { type: "marquer", ids: ["S"], marque: "choisie" });
//       ok(e2.lecons.some((l) => l.type === "pretri_renverse" && l.photos[0] === "S" && l.proposition.includes("trop sombre")), "A10 : renverser une marque du pré-tri est une leçon, avec sa raison");
//
//       /* A5 : Léo a 1 h de retard sur Inès, trois photos jumelles le prouvent */
//       const cat2 = new Map(catalogue("I1:L I2:L I3:L I4:L J1:L J2:L J3:L", {
//         I1: { date: t(10, 0) }, I2: { date: t(11, 0) }, I3: { date: t(12, 0) }, I4: { date: t(12, 30) },
//         J1: { date: t(9, 0), personne: "Léo" }, J2: { date: t(10, 0), personne: "Léo" }, J3: { date: t(11, 0), personne: "Léo" },
//       }).map((p) => [p.id, p]));
//       const m2 = new Map<string, O.Mesure>([["I1", { nettete: 1, dhash: DH[0] }], ["I2", { nettete: 1, dhash: DH[1] }], ["I3", { nettete: 1, dhash: DH[2] }], ["I4", { nettete: 1, dhash: DH[3] }],
//         ["J1", { nettete: 1, dhash: DH[0] }], ["J2", { nettete: 1, dhash: DH[1] }], ["J3", { nettete: 1, dhash: DH[2] }]]);
//       eq(O.decalagesHorloges(cat2, m2), { Léo: 3600 }, "A5 : trois photos jumelles concordent : Léo est recalé d'une heure");
//       eq(O.decalagesHorloges(cat2, new Map([...m2].slice(0, 5))), {}, "A5 : moins de trois paires : on ne recale rien");
//
//       /* A12 : deux quasi-jumelles très nettes et une différente : la variété l'emporte */
//       const cat3 = new Map(catalogue("X:L Y:L Z:L", { X: { date: t(8, 0) }, Y: { date: t(8, 5) }, Z: { date: t(8, 10) } }).map((p) => [p.id, p]));
//       const lec3 = { ...O.LECTURE_VIDE, mesurees: 3, mesures: { X: { nettete: 900, dhash: "ff00ff00ff00ff00" }, Y: { nettete: 880, dhash: "ff00ff00ff00ff0f" }, Z: { nettete: 600, dhash: "00ff00ff00ff00ff" } } };
//       const mag3 = O.reglerVisees(magazineVide(2), 2);
//       const g3 = Object.entries(O.preTrier(cat3, mag3, lec3).propositions).filter(([, p]) => p.marque === "choisie").map(([id]) => id).sort();
//       eq(g3, ["X", "Z"], "A12 : deux à garder : la plus nette, puis la différente (pas sa jumelle)");

/* ───── 2. verif-mep-lecture-ia.ts : ce qui a été retiré ───── */
//   ok("R141 : le pré-tri suit la règle : une capture PNG va en réserve, l'export Snapchat de même forme n'est plus touché pour cela",
//     (() => {
//       const c = new Map<string, PhotoMaq>([["S", photo("S", "s.png", { l: 1170, h: 2532, date: null, appareil: null })], ["N", photo("N", "Snapchat-1.jpeg", { l: 1080, h: 2214, date: null, appareil: null })]]);
//       const lect = O.lireMesures(c, new Map([["S", { nettete: 500, dhash: bits(0) }], ["N", { nettete: 500, dhash: bits(40) }]]));
//       const pt = O.preTrier(c, magazine(2), lect);
//       return pt.propositions.S?.marque === "reserve" && pt.propositions.N?.raison !== "capture d'écran probable";
//     })());

export {};
