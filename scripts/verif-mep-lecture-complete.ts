/**
 * Le harnais de la LECTURE COMPLÈTE (18/11, feat/analyse-et-v2, point 3), appelé par verif-atelier.ts. AUCUN appel réseau : les réponses
 * d'OpenAI sont simulées.
 *   1. la RELECTURE stricte des trois nouveaux schémas (planche de complément P et P10, classement K, regard complémentaire R) ;
 *   2. la DEMANDE du navigateur (bornée, aucun champ inconnu) ;
 *   3. le PLAN : une lecture se complète sans tout repayer (v4 sans regard complémentaire, lecture complète, lecture v2) ;
 *   4. la lecture COMPLÉTÉE : relue par `lireLectureIA` (v5), déterministe, absence ≠ zéro jusqu'au compositeur ;
 *   5. la route (même garde, étapes branchées), M-01 (aucun nom de client ni numéro de photo dans le code).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as O from "@/lib/mise-en-page/editeur";
import type { LectureIA, PhotoIA, PhotoMaq } from "@/lib/mise-en-page/editeur";
import { entreeDepuisEditeur } from "@/lib/mise-en-page/compositeur";
import { motsDeProjet } from "./regles-mots-interdits";

const photo = (id: string, nom: string, o: Partial<PhotoMaq> = {}): PhotoMaq => ({
  id, nom, l: 4000, h: 3000, date: "2026-06-12T10:00:00", personne: "Atelier", lien: null, type: "atelier", coeur: false, signalee: false,
  autresMagazines: [], nouvelle: false, vignette: null, ...o,
});
const presque = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
const six = { personnes_nombre: 2, sujet_special: "aucun", force_image: 0.7, pose: "spontane", geste: false, insolite: false } as const;
const quatre = { plan: "moyen", moment_journee: "jour", ambiance: "vivant", personnes: "2" } as const;

export async function verifierMepLectureComplete(ok: (nom: string, reussi: boolean) => void, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, la lecture COMPLÈTE (18/11) : tous les tags de la définition, une lecture ancienne complétée sans tout repayer —");

  /* ── 1. la relecture stricte ── */
  const P = (photos: unknown[]) => JSON.stringify({ photos });
  const p1 = O.lireReponseComplement(P([{ numero: 1, ...six }, { numero: 2, ...six, personnes_nombre: 0 }]), 1, 3, "six");
  ok("P : six champs lus par numéro, un numéro manquant listé (jamais inventé), 0 personne lu reste 0",
    p1.ok && p1.valeur.photos.length === 2 && p1.valeur.absents.join() === "3" && p1.valeur.photos[1].personnes_nombre === 0 && p1.valeur.photos[0].plan === undefined);
  ok("P : un champ en trop (même un tag de B5) est refusé ; un champ en moins aussi",
    !O.lireReponseComplement(P([{ numero: 1, ...six, plan: "moyen" }]), 1, 1, "six").ok && !O.lireReponseComplement(P([{ numero: 1, personnes_nombre: 1 }]), 1, 1, "six").ok);
  ok("P : bornes (8 personnes, force 1,2, pose inconnue, numéro hors planche, numéro repris) refusées",
    [P([{ numero: 1, ...six, personnes_nombre: 8 }]), P([{ numero: 1, ...six, force_image: 1.2 }]), P([{ numero: 1, ...six, pose: "debout" }]), P([{ numero: 5, ...six }]), P([{ numero: 1, ...six }, { numero: 1, ...six }])]
      .every((x) => !O.lireReponseComplement(x, 1, 2, "six").ok));
  const p10 = O.lireReponseComplement(P([{ numero: 17, ...quatre, ...six }]), 17, 1, "dix");
  ok("P10 : les dix champs (quatre de B5 + six de B6) lus ; sans l'un des quatre, refusé ; un plan inconnu, refusé",
    p10.ok && p10.valeur.photos[0].plan === "moyen" && p10.valeur.photos[0].personnes === "2"
    && !O.lireReponseComplement(P([{ numero: 17, ...six }]), 17, 1, "dix").ok && !O.lireReponseComplement(P([{ numero: 17, ...quatre, ...six, plan: "loin" }]), 17, 1, "dix").ok);
  ok("P : ne demande jamais le rôle, le sujet, la candidature, l'intérêt ni le texte lisible (déjà lus, jamais repayés)",
    ["role", "sujet", "candidate", "interet", "texte_lisible"].every((k) => !(O.SCHEMA_P10.properties.photos.items.required as readonly string[]).includes(k) && !(O.SCHEMA_P.properties.photos.items.required as readonly string[]).includes(k)));

  const K = (c: unknown[]) => JSON.stringify({ classement: c });
  const k1 = O.lireReponseClassement(K([{ numero: 2, rang: 1, type: "groupe", raison: "le groupe entier sur la plage au soleil couchant du soir" }, { numero: 1, rang: 2, type: "lieu", raison: "un lieu" }]), 2);
  ok("K : rangés par rang, la raison coupée à 8 mots",
    k1.ok && k1.valeur[0].numero === 2 && k1.valeur[0].raison.split(" ").length === 8 && k1.valeur[1].type === "lieu");
  ok("K : champ inconnu, numéro hors planche, rang hors bornes, type inconnu, numéro repris : refusés",
    [K([{ numero: 1, rang: 1, type: "lieu", raison: "", nom: "x" }]), K([{ numero: 3, rang: 1, type: "lieu", raison: "" }]), K([{ numero: 1, rang: 3, type: "lieu", raison: "" }]),
      K([{ numero: 1, rang: 1, type: "selfie", raison: "" }]), K([{ numero: 1, rang: 1, type: "lieu", raison: "" }, { numero: 1, rang: 2, type: "lieu", raison: "" }]), JSON.stringify({ classement: [], autre: 1 })]
      .every((x) => !O.lireReponseClassement(x, 2).ok));

  const R = { expression: "sourire", yeux_fermes: "non", point_accroche: true, accroche: "un bateau rouge seul sur la mer calme", regard: "gauche" };
  const r1 = O.lireReponseRegardComplement(JSON.stringify(R));
  ok("R : les cinq champs lus, l'accroche coupée à 5 mots, « regard » devient regard_vers",
    r1.ok && r1.valeur.regard_vers === "gauche" && r1.valeur.accroche.split(" ").length === 5 && r1.valeur.expression === "sourire");
  ok("R : champ en trop, champ en moins, expression ou regard inconnus : refusés ; « sans_visage » est une réponse",
    !O.lireReponseRegardComplement({ ...R, nom: "x" }).ok && !O.lireReponseRegardComplement({ ...R, regard: undefined }).ok
    && !O.lireReponseRegardComplement({ ...R, expression: "colère" }).ok && !O.lireReponseRegardComplement({ ...R, regard: "haut" }).ok
    && O.lireReponseRegardComplement({ ...R, expression: "sans_visage", yeux_fermes: "sans_visage", regard: "sans_visage" }).ok);
  ok("consignes du banc reprises : R et P telles quelles, K généralisée (aucun profil nommé), toutes interdisent l'identité",
    O.CONSIGNE_R.includes("de NOTRE point de vue (gauche, droite, face)") && O.CONSIGNE_P.includes("Compte, n'identifie jamais")
    && !/voyage en famille/.test(O.CONSIGNE_K) && O.CONSIGNE_K.includes("jamais une partie du groupe")
    && [O.CONSIGNE_R, O.CONSIGNE_P, O.CONSIGNE_P10, O.CONSIGNE_K].every((c) => c.includes("Interdit : identifier")));
  ok("corps : P et K en gpt-5.4 (effort « low »), R en gpt-5.1 (effort « none »), schémas stricts",
    O.corpsComplement("x", "six").model === "gpt-5.4" && O.corpsComplement("x", "dix").text.format.schema === O.SCHEMA_P10 && O.corpsClassement("x").model === "gpt-5.4"
    && O.corpsRegardComplement("x").model === "gpt-5.1" && O.corpsRegardComplement("x").reasoning.effort === "none" && O.corpsClassement("x").text.format.strict === true);

  /* ── 2. la demande ── */
  const img = "data:image/jpeg;base64,/9j/AAAA";
  ok("demande : complément (numéros, champs), classement (de 1 à n, 2 à 16), regard ; champ inconnu, champs inconnus, classement d'une seule, refusés",
    O.lireDemandeComplement({ cle: "k", etape: "complement", image: img, numeros: [1, 16], champs: "six" }).ok
    && O.lireDemandeComplement({ cle: "k", etape: "classement", image: img, numeros: [1, 5] }).ok
    && O.lireDemandeComplement({ cle: "k", etape: "regard_complement", image: img }).ok
    && !O.lireDemandeComplement({ cle: "k", etape: "regard_complement", image: img, indice: "x" }).ok
    && !O.lireDemandeComplement({ cle: "k", etape: "complement", image: img, numeros: [1, 17], champs: "six" }).ok
    && !O.lireDemandeComplement({ cle: "k", etape: "complement", image: img, numeros: [1, 4], champs: "tout" }).ok
    && !O.lireDemandeComplement({ cle: "k", etape: "classement", image: img, numeros: [1, 1] }).ok
    && !O.lireDemandeComplement({ cle: "k", etape: "classement", image: img, numeros: [2, 5] }).ok
    && !O.lireDemandeComplement({ cle: "k", etape: "complement", image: "data:image/png;base64,AAAA", numeros: [1, 4], champs: "six" }).ok
    && O.estEtapeComplement({ etape: "classement" }) && !O.estEtapeComplement({ etape: "planche" }));

  /* ── 3. le plan ── */
  const cat = new Map<string, PhotoMaq>(["a", "b", "c", "d", "e"].map((id, i) => [id, photo(id, `${id.toUpperCase()}.JPG`, { date: `2026-06-12T1${i}:00:00` })]));
  const lues = ["a", "b", "c", "d", "e"];
  const role = (interet: number, couverture?: "groupe" | "lieu") => ({ role: "heros" as const, interet, raison: "planche", ...(couverture ? { couverture } : {}) });
  const v4: LectureIA = {
    format: "bellajour-lecture-ia", version: 4, rafales: [], groupes: [],
    photos: {
      "A.JPG": { role: role(0.9, "groupe"), sujet: "personnes", candidate: "couverture", ...quatre, ...six },
      "B.JPG": { role: role(0.5), sujet: "paysage", candidate: "aucune", ...quatre, ...six, personnes: "0", personnes_nombre: 0 },
      "C.JPG": { role: role(0.7, "lieu"), sujet: "lieu", candidate: "pleine", ...quatre, ...six, personnes: "0", personnes_nombre: 0 },
      "D.JPG": { role: role(0.6), sujet: "personnes", candidate: "aucune", ...quatre, ...six },
    },
  };
  const pl4 = O.planComplement(v4, cat, lues);
  ok("plan, lecture v4 sans regard complémentaire : aucune planche ; seuls les regards manquants (gens ou candidates, par intérêt) ; E, jamais lue, n'est pas complétée",
    pl4.planche.length === 0 && pl4.regard.join() === "a,c,d" && pl4.regardPossible.length === 0 && !pl4.regard.includes("e") && !pl4.regard.includes("b"));
  ok("plan, lecture v4 : les deux candidates couverture à classer ensemble ; coût = 3 regards + 1 classement, aux chiffres du banc",
    pl4.classement?.join() === "a,c" && presque(pl4.cout.dollars, (3 * O.BANC_18_11_COMPLEMENT.regard.dollars) / 40 + O.BANC_18_11_COMPLEMENT.classement.dollars) && pl4.cout.appels === 4);
  const complet: LectureIA = { ...v4, version: 5, photos: Object.fromEntries(Object.entries(v4.photos).map(([n, p], i) => [n, { ...p, expression: "neutre", yeux_fermes: "non", point_accroche: false, regard_vers: "face", ...(p.role?.couverture ? { couverture_classee: { rang: i + 1, type: "lieu", raison: "" } } : {}) } as PhotoIA])) };
  const plC = O.planComplement(complet, cat, lues);
  ok("plan, lecture complète : plan vide, coût 0, aucun appel", plC.planche.length === 0 && plC.regard.length === 0 && plC.classement === null && plC.cout.dollars === 0 && plC.cout.appels === 0);
  ok("plan sans lecture : vide, coût 0", O.planComplement(null, cat, lues).cout.dollars === 0);
  const v2: LectureIA = {
    format: "bellajour-lecture-ia", version: 2, rafales: [], groupes: [],
    photos: { "A.JPG": { role: role(0.8), sujet: "personnes", candidate: "aucune", corrige: { role: "detail" } }, "B.JPG": { role: role(0.4), sujet: "paysage", candidate: "double" }, "C.JPG": { visages: { nombre: 1, plusGrand: 0.1, selfie: false } } },
  };
  const pl2 = O.planComplement(v2, cat, lues);
  ok("plan, lecture v2 : une planche P10 (dix champs) pour chaque photo lue, aucune planche B relue (C sans rôle n'est pas reprise) ; la double candidate est à regarder, l'autre « possible »",
    pl2.planche.map((x) => `${x.id}:${x.champs}`).join() === "a:dix,b:dix" && pl2.regard.join() === "b" && pl2.regardPossible.join() === "a"
    && presque(pl2.cout.planche, (2 * O.BANC_17_11.planche.dollars) / O.BANC_17_11.planche.photos));
  const v3: LectureIA = { ...v2, version: 3, photos: { "A.JPG": { ...v2.photos["A.JPG"], ...quatre } } };
  ok("plan, lecture v3 (B5 sans B6) : planche P à six champs seulement", O.planComplement(v3, cat, lues).planche.map((x) => x.champs).join() === "six");

  /* ── 4. la lecture complétée ── */
  const res = {
    planche: new Map([["a", { numero: 1, ...quatre, ...six }], ["b", { numero: 2, ...quatre, ...six, personnes: "0" as const, personnes_nombre: 0 }]]),
    regard: new Map([["a", { expression: "rire" as const, yeux_fermes: "non" as const, point_accroche: false, accroche: "", regard_vers: "droite" as const }]]),
    classement: null, dollars: 0.05, modeles: ["gpt-5.4"], quand: "2026-11-18T10:00:00.000Z",
  };
  const c1 = O.appliquerComplement(v2, cat, res), c2 = O.appliquerComplement(v2, cat, res);
  const relu = O.lireLectureIA(JSON.stringify(c1));
  ok("lecture complétée : version 5, relue par lireLectureIA, le rôle et la correction de l'atelier gardés, le coût s'ajoute",
    c1.version === 5 && relu.ok && relu.lecture.photos["A.JPG"].corrige?.role === "detail" && relu.lecture.photos["A.JPG"].role?.role === "heros"
    && relu.lecture.photos["A.JPG"].expression === "rire" && relu.lecture.photos["B.JPG"].personnes_nombre === 0 && presque(c1.lecture?.dollars ?? 0, 0.05));
  ok("lecture complétée : déterministe (même entrée, même JSON)", JSON.stringify(c1) === JSON.stringify(c2));
  ok("absence ≠ zéro : un regard non lu reste ABSENT (ni « neutre », ni « non »), une accroche vide n'est pas écrite",
    relu.ok && relu.lecture.photos["B.JPG"].expression === undefined && relu.lecture.photos["B.JPG"].point_accroche === undefined && relu.lecture.photos["A.JPG"].accroche === undefined);
  const cl = O.appliquerComplement(complet, cat, { planche: new Map(), regard: new Map(), classement: new Map([["c", { rang: 1, type: "lieu", raison: "le lieu" }]]), dollars: 0, modeles: [], quand: "q" });
  ok("un classement neuf remplace l'ancien sur toutes les photos (un rang ne vaut que dans son ensemble)",
    cl.photos["C.JPG"].couverture_classee?.rang === 1 && cl.photos["A.JPG"].couverture_classee === undefined);
  ok("format : une v5 inconnue d'un champ est refusée (rang 0, type inconnu, clé en trop), une v4 ne lit pas un champ v5",
    !O.lireLectureIA({ ...c1, photos: { "A.JPG": { couverture_classee: { rang: 0, type: "lieu", raison: "" } } } }).ok
    && !O.lireLectureIA({ ...c1, photos: { "A.JPG": { expression: "colère" } } }).ok
    && !O.lireLectureIA({ ...c1, version: 4, photos: { "A.JPG": { expression: "rire" } } }).ok
    && O.lireLectureIA({ ...v4 }).ok && O.versionPour(v4.photos) === 4);
  ok("versLectureIA garde la v5 : une photo relue en planche garde son regard complémentaire, la version reste 5",
    (() => { const l = O.versLectureIA(c1, cat, { planche: new Map([["a", { numero: 1, role: "heros", sujet: "personnes", candidate: "aucune", interet: 0.6, texte: false }]]), regard: new Map(), dollars: 0, modeles: [], quand: "2026-11-18T11:00:00.000Z" }); return l.version === 5 && l.photos["A.JPG"].expression === "rire" && O.lireLectureIA(JSON.stringify(l)).ok; })());

  /* jusqu'au compositeur : « sans_visage » devient null (lu, aucun visage), un champ absent reste absent */
  const lv = O.appliquerComplement(c1, cat, { planche: new Map(), regard: new Map([["b", { expression: "sans_visage", yeux_fermes: "sans_visage", point_accroche: true, accroche: "un arbre seul", regard_vers: "sans_visage" }]]), classement: new Map([["a", { rang: 1, type: "groupe", raison: "" }], ["b", { rang: 2, type: "lieu", raison: "" }]]), dollars: 0, modeles: [], quand: "q" });
  const e = entreeDepuisEditeur({ catalogue: cat, lecture: { floues: [], piles: [], mesurees: 0, zones: {} }, lectureIA: O.relierLectureIA(lv, cat), ecarteesAtelier: new Set(), fiche: {}, titre: "", quand: "q" });
  const ia = (id: string) => e.photos.find((p) => p.id === id)?.ia;
  ok("compositeur : expression, yeux fermés, point d'accroche, regard, rang de couverture arrivent dans IAPhoto ; « sans_visage » = null ; absent = absent",
    ia("a")?.expression === "rire" && ia("a")?.regardVers === "droite" && ia("a")?.rangCouverture === 1 && ia("a")?.pointAccroche === false
    && ia("b")?.expression === null && ia("b")?.yeuxFermes === null && ia("b")?.regardVers === null && ia("b")?.pointAccroche === true && ia("b")?.rangCouverture === 2
    && ia("c") === null && !("expression" in (e.photos.find((p) => p.id === "d")?.ia ?? {})));

  /* ── 5. la route, M-01 ── */
  const route = readFileSync(resolve("src/app/api/admin/atelier/mise-en-page/lecture-ia/route.ts"), "utf8");
  const posGarde = route.indexOf("gardeLecture(lu.corps.cle"), posEtape = route.indexOf("estEtapeComplement(lu.corps)");
  ok("route : les trois étapes passent APRÈS la même garde, relues strictement, image bornée, coût rendu même hors contrat",
    posGarde > 0 && posEtape > posGarde && /lireReponseComplement\(/.test(route) && /lireReponseClassement\(/.test(route) && /lireReponseRegardComplement\(/.test(route)
    && route.includes("MAX_PX_COMPLEMENT[dem.etape]") && /export const maxDuration = 60;/.test(route));
  const fichiers = ["src/lib/mise-en-page/editeur/lectureComplete.ts", "src/app/admin/atelier/mise-en-page/[id]/completerClient.ts"];
  const trouves = fichiers.flatMap((f) => motsDeProjet(readFileSync(resolve(f), "utf8")).map((m) => `${f} : ${m}`));
  ok(`M-01 : aucun nom de client ni numéro de photo dans le code de la lecture complète${trouves.length ? ` (${trouves.join(" ; ")})` : ""}`, !trouves.length);
  const client = readFileSync(resolve(fichiers[1]), "utf8");
  ok("navigateur : M-13 (planche sans case vide, arrêt au-delà de 10 % d'illisibles), aucun écran importé", client.includes("plancheSansVide(") && client.includes("arretIllisibles(") && !/from "\.\/Composer"/.test(client));
}
