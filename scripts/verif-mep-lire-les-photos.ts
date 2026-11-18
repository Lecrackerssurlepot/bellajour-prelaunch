/**
 * Le harnais de « Lire les photos » (17/11), appelé par verif-atelier.ts. AUCUN appel réseau : les réponses d'OpenAI sont simulées.
 *   1. l'ENTONNOIR (A local : écartées, têtes de pile, floues, trop petites ; le cache ; les planches ; le plafond de C ; le texte lisible) ;
 *   2. la RELECTURE stricte des réponses (enum inconnu, numéro hors planche, champ en trop, doublon ; l'enveloppe et ses jetons) ;
 *   3. le COÛT (jetons × prix datés) et l'ESTIMATION (l'essai du 17/11) ;
 *   4. la CONVERSION en lecture IA v2 (relue par `lireLectureIA`), la v1 toujours lue, une version inconnue refusée ;
 *   5. la CORRECTION qui prime et devient une leçon valide ;
 *   6. la GARDE de la route (création libre seulement, sans clé 503), la demande bornée, D29, `maxDuration` littéral.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as O from "@/lib/mise-en-page/editeur";
import type { Lecture, LectureIA, LuPlanche, LuRegard, PhotoMaq } from "@/lib/mise-en-page/editeur";
import { LIBRE_PATTERN } from "@/app/admin/atelier/mise-en-page/libelles";

const photo = (id: string, nom: string, o: Partial<PhotoMaq> = {}): PhotoMaq => ({
  id, nom, l: 4000, h: 3000, date: "2026-06-12T10:00:00", personne: "Atelier", lien: null, type: "atelier", coeur: false, signalee: false,
  autresMagazines: [], nouvelle: false, vignette: null, ...o,
});
const presque = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
const UUID = "0f1e2d3c-4b5a-4968-8776-655443322110";

export async function verifierMepLireLesPhotos(ok: (nom: string, reussi: boolean) => void, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, « Lire les photos » (17/11) : l'entonnoir A → B → C, sans appel réseau —");

  /* ── 1. l'entonnoir ── */
  const cat = new Map<string, PhotoMaq>([
    ["a", photo("a", "A.JPG", { date: "2026-06-12T10:00:00" })],
    ["b", photo("b", "B.JPG", { date: "2026-06-12T10:01:00" })],
    ["c", photo("c", "C.JPG", { date: "2026-06-12T10:02:00" })],
    ["d", photo("d", "D.JPG", { date: "2026-06-12T10:02:01" })],
    ["e", photo("e", "E.JPG", { date: "2026-06-12T10:03:00", l: 1200, h: 900 })],
    ["f", photo("f", "F.JPG", { date: "2026-06-12T10:04:00" })],
    ["g", photo("g", "G.JPG", { date: "2026-06-12T09:00:00" })],
  ]);
  const lecture: Lecture = { floues: ["b"], piles: [{ tete: "c", autres: ["d"], raison: "rafale" }], mesurees: 7, zones: {} };
  const A = O.entonnoirA(cat, lecture, new Set(["f"]));
  ok("A : ne partent que les photos non écartées, UNE par pile (sa tête), dans l'ordre du temps ; floue, autre de la pile, trop petite (< 1 600 px), écartée par l'atelier restent",
    JSON.stringify(A.lues) === JSON.stringify(["g", "a", "c"]) && A.ecartees.get("b") === "floue" && A.ecartees.get("d") === "pile"
      && A.ecartees.get("e") === "petite" && A.ecartees.get("f") === "ecartee" && O.TROP_PETITE_PX === 1600);
  ok("R192 : une photo déjà lue n'est jamais renvoyée ; « Relire tout » la renvoie",
    JSON.stringify(O.aEnvoyer(A.lues, new Set(["a"]), false)) === JSON.stringify(["g", "c"]) && O.aEnvoyer(A.lues, new Set(["a"]), true).length === 3);
  const quarante = Array.from({ length: 40 }, (_, i) => `p${i}`);
  const pl = O.planchesDe(quarante);
  ok("B : des planches de 16, numérotées à la suite (1, 17, 33), la dernière incomplète ; 4 colonnes, cases de 384 px, 1 536 px au plus",
    pl.length === 3 && pl.map((x) => x.n0).join() === "1,17,33" && pl.map((x) => x.ids.length).join() === "16,16,8"
      && O.PAR_PLANCHE === 16 && O.COLONNES_PLANCHE === 4 && O.CASE_PLANCHE_PX === 384 && O.PLANCHE_MAX_PX === 1536 && O.REGARD_MAX_PX === 1024
      && O.COLONNES_PLANCHE * O.CASE_PLANCHE_PX <= O.PLANCHE_MAX_PX && (O.PAR_PLANCHE / O.COLONNES_PLANCHE) * O.CASE_PLANCHE_PX <= O.PLANCHE_MAX_PX);
  const vingt = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, candidate: (i < 8 ? (["couverture", "pleine", "double"] as const)[i % 3] : "aucune") as O.CandidateIA, interet: i / 20, texte: i === 15 || i === 7 }));
  const choix = O.choisirPourRegard(vingt, new Set());
  ok("C : au plus 25 % des photos lues en B (5 sur 20), les candidates les PLUS intéressantes d'abord, PLUS toute photo à texte lisible (une seule fois)",
    O.plafondRegard(20) === 5 && choix.filter((x) => x.pourquoi !== "panneau").map((x) => x.id).join() === "q7,q6,q5,q4,q3"
      && choix.filter((x) => x.pourquoi === "panneau").map((x) => x.id).join() === "q15" && choix.length === 6);
  ok("C : une photo déjà regardée n'est pas reprise ; sans candidate, seules les photos à texte lisible ; plafond d'au moins 1",
    !O.choisirPourRegard(vingt, new Set(["q7"])).some((x) => x.id === "q7") && O.plafondRegard(3) === 1 && O.plafondRegard(0) === 0
      && O.choisirPourRegard([{ id: "z", candidate: "aucune", interet: 1, texte: true }], new Set()).map((x) => x.pourquoi).join() === "panneau");

  /* ── 2. la relecture stricte ── */
  const e = (numero: number, o: Record<string, unknown> = {}) => ({ numero, role: "heros", sujet: "personnes", candidate: "aucune", interet: 0.5, texte_lisible: false, ...o });
  const bon = O.lireReponsePlanche(JSON.stringify({ photos: [e(17), e(18, { role: "detail", sujet: "plat" })] }), 17, 3);
  ok("B relue : le texte JSON du modèle se lit ; un numéro sans réponse est LISTÉ (19), jamais inventé",
    bon.ok && bon.valeur.photos.length === 2 && bon.valeur.photos[1].sujet === "plat" && bon.valeur.absents.join() === "19");
  const refuseB = (photos: unknown[], n0 = 1, n = 16) => !O.lireReponsePlanche({ photos }, n0, n).ok;
  ok("B relue : refus d'un rôle, d'un sujet ou d'une candidate inconnus, d'un intérêt hors de 0 à 1",
    refuseB([e(1, { role: "vedette" })]) && refuseB([e(1, { sujet: "chat" })]) && refuseB([e(1, { candidate: "poster" })]) && refuseB([e(1, { interet: 1.3 })]));
  ok("B relue : refus d'un numéro hors de la planche (16 sur une planche 17 à 32 ; 33), d'un numéro en double, d'un champ en trop (une description)",
    refuseB([e(16)], 17, 16) && refuseB([e(33)], 17, 16) && refuseB([e(17), e(17)], 17, 16) && refuseB([e(1, { description: "un chat" })])
      && !O.lireReponsePlanche({ photos: [], note: "x" }, 1, 1).ok);
  const rg = (o: Record<string, unknown> = {}) => ({ couverture: true, type_couverture: "paysage", lieu_lu: "Parc Güell", plat: "", moment: "un deux trois quatre cinq six sept", idee: "pleine page", recadrage: "", ...o });
  const c1 = O.lireReponseRegard(JSON.stringify(rg()));
  ok("C relu : sept champs ; le moment coupé à 6 mots ; un type de couverture inconnu, un champ en trop, un lieu de plus de 120 signes refusés",
    c1.ok && c1.valeur.moment.split(" ").length === 6 && c1.valeur.lieu === "Parc Güell" && c1.valeur.couverture && c1.valeur.type === "paysage"
      && !O.lireReponseRegard(rg({ type_couverture: "poster" })).ok && !O.lireReponseRegard({ ...rg(), personne: "x" }).ok
      && !O.lireReponseRegard(rg({ lieu_lu: "x".repeat(121) })).ok);
  ok("C relu : « couverture » faux = aucune, quel que soit le type rendu",
    (() => { const r = O.lireReponseRegard(rg({ couverture: false })); return r.ok && !r.valeur.couverture && r.valeur.type === "aucune"; })());
  const env = { status: "completed", output: [{ type: "reasoning" }, { type: "message", content: [{ type: "output_text", text: "{\"photos\":[]}" }] }], usage: { input_tokens: 12000, output_tokens: 800 } };
  const ev = O.lireEnveloppe(env);
  ok("l'enveloppe de la Responses API : le texte de sortie et les jetons (`usage`) ; un refus ou une réponse incomplète ne passent pas",
    ev.ok && ev.valeur.texte === "{\"photos\":[]}" && ev.valeur.jetons.entree === 12000 && ev.valeur.jetons.sortie === 800
      && !O.lireEnveloppe({ ...env, status: "incomplete" }).ok
      && !O.lireEnveloppe({ output: [{ type: "message", content: [{ type: "refusal", refusal: "non" }] }] }).ok);

  /* ── 3. le coût et l'estimation ── */
  ok("prix datés (13/11, PRIX.md) : gpt-5.4 2,50 / 15,00 $ ; gpt-5.1 1,25 / 10,00 $ par million de jetons ; source nommée",
    O.PRIX_MODELES["gpt-5.4"].entree === 2.5 && O.PRIX_MODELES["gpt-5.4"].sortie === 15 && O.PRIX_MODELES["gpt-5.1"].entree === 1.25 && O.PRIX_MODELES["gpt-5.1"].sortie === 10
      && O.PRIX_LUS_LE === "2026-11-13" && O.PRIX_SOURCE.includes("PRIX.md") && O.MODELE_PLANCHE === "gpt-5.4" && O.MODELE_REGARD === "gpt-5.1");
  ok("coût réel = jetons × prix : 10 000 + 2 000 jetons valent 0,055 $ chez gpt-5.4, 0,0325 $ chez gpt-5.1",
    presque(O.coutDollars("gpt-5.4", { entree: 10000, sortie: 2000 }), 0.055) && presque(O.coutDollars("gpt-5.1", { entree: 10000, sortie: 2000 }), 0.0325));
  const est = O.estimer(57);
  ok("estimation d'après l'essai du 17/11 : 57 photos en B ≈ 0,061 $, et le quart (14) regardées à 0,034 $ pour 17, soit ≈ 0,089 $ ; 0 photo = 0 $",
    est.regard === 14 && presque(est.dollars, 0.061 + (14 * 0.034) / 17) && O.estimer(0).dollars === 0 && O.motDollars(0.089) === "0,09 $" && O.motDollars(0.001) === "< 0,01 $");

  /* ── 4. la conversion en lecture v2 ── */
  const lu = (o: Partial<LuPlanche>): LuPlanche => ({ numero: 1, role: "heros", sujet: "personnes", candidate: "aucune", interet: 0.6, texte: false, ...o });
  const vu = (o: Partial<LuRegard>): LuRegard => ({ couverture: false, type: "aucune", lieu: "", plat: "", moment: "deux amis rient", idee: "pleine page à gauche", recadrage: "", ...o });
  const res = {
    planche: new Map<string, LuPlanche>([["a", lu({ candidate: "pleine", interet: 0.9 })], ["c", lu({ role: "vue_ensemble", sujet: "lieu", candidate: "couverture", texte: true })], ["g", lu({ role: "detail", sujet: "plat" })]]),
    regard: new Map<string, LuRegard>([["c", vu({ couverture: true, type: "paysage", lieu: "Parc Güell" })], ["g", vu({ plat: "Paella" })]]),
    dollars: 0.0123, modeles: ["gpt-5.4", "gpt-5.1"], quand: "2026-11-17T12:00:00.000Z",
  };
  const v2 = O.versLectureIA(null, cat, res);
  const relu = O.lireLectureIA(JSON.parse(JSON.stringify(v2)) as unknown);
  ok("conversion : une lecture IA VERSION 2 que `lireLectureIA` accepte telle quelle, avec { modeles, dollars, quand }",
    relu.ok && relu.lecture.version === 2 && relu.lecture.lecture?.dollars === 0.0123 && relu.lecture.lecture.modeles.join() === "gpt-5.4,gpt-5.1");
  const pa = v2.photos["A.JPG"], pc = v2.photos["C.JPG"], pg = v2.photos["G.JPG"];
  ok("conversion : une candidate pleine devient le rôle « pleine » ; une couverture confirmée par C porte son type ; le sujet et le texte lisible sont gardés",
    pa?.role?.role === "pleine" && pa.role.interet === 0.9 && pc?.role?.role === "vue_ensemble" && pc.role.couverture === "paysage" && pc.sujet === "lieu" && pc.texte === true);
  ok("conversion : un lieu LU devient un lieu sûr, preuve panneau, confiance 0,9, source IA, et `lieuSur` le propose ; le plat et le moment vont dans `regard`",
    pc?.lieu?.nom === "Parc Güell" && pc.lieu.confiance === 0.9 && pc.lieu.source === "ia" && pc.lieu.statut === "sur" && pc.lieu.preuve === "panneau"
      && O.lieuSur(pc) === "Parc Güell" && pg?.regard?.plat === "Paella" && pg.regard.moment === "deux amis rient" && !pa.regard);
  const rel = O.relierLectureIA(v2, cat);
  const tg = O.tagsIA(rel);
  ok("R193 : les tags de rôle et de sujet existent et se filtrent (Héros, Détail, Personnes, Plat, Lieu) ; la pleine reste une mise en avant",
    (tg.get("g") ?? []).includes("ia_detail") && (tg.get("g") ?? []).includes("ia_plat") && (tg.get("c") ?? []).includes("ia_sujet_lieu")
      && (tg.get("a") ?? []).includes("ia_pleine") && (tg.get("a") ?? []).includes("ia_personnes") && O.TAGS_IA.every((t) => !!O.MOT_TAG_IA[t]?.mot));
  const plus = O.versLectureIA(v2, cat, { planche: new Map(), regard: new Map([["a", vu({ lieu: "Sagrada Família" })]]), dollars: 0.002, modeles: ["gpt-5.1"], quand: "2026-11-17T13:00:00.000Z" });
  ok("un second passage garde la lecture d'avant, ajoute son coût, et pose un regard sur une photo déjà lue en planche sans la relire",
    presque(plus.lecture?.dollars ?? 0, 0.0143) && plus.photos["A.JPG"]?.regard?.moment === "deux amis rient" && plus.photos["A.JPG"]?.lieu?.nom === "Sagrada Família"
      && plus.photos["G.JPG"]?.regard?.plat === "Paella" && O.photosLues(plus, cat).size === 3);
  const exemple = readFileSync(resolve(process.cwd(), "docs/moteur/exemple-lecture-ia.json"), "utf8");
  const v1 = O.lireLectureIA(exemple);
  const v1Ex = JSON.parse(exemple) as { photos: Record<string, Record<string, unknown>> };
  const avecSujet = { ...v1Ex, photos: { ...v1Ex.photos, "IMG_0101.JPG": { ...v1Ex.photos["IMG_0101.JPG"], sujet: "personnes" } } };
  ok("la v1 est toujours lue (l'exemple de la doc, version 1) ; un champ de la v2 dans un fichier v1 reste un champ en trop ; la v2 l'accepte ; une version inconnue (5) est refusée (la v3 et la v4 existent depuis le 18/11, C20)",
    v1.ok && v1.lecture.version === 1 && !O.lireLectureIA(avecSujet).ok && O.lireLectureIA({ ...avecSujet, version: 2 }).ok
      && !O.lireLectureIA({ ...v1Ex, version: 5 }).ok && !O.lireLectureIA({ ...v1Ex, lecture: { modeles: [], dollars: 0, quand: "2026-11-17" } }).ok);
  ok("v2 refusée : un sujet inconnu, un moment de 7 mots, une correction vide ou d'un rôle inconnu",
    !O.lireLectureIA({ ...v2, photos: { "A.JPG": { sujet: "chat" } } }).ok
      && !O.lireLectureIA({ ...v2, photos: { "A.JPG": { regard: { moment: "un deux trois quatre cinq six sept", idee: "", recadrage: "", plat: "" } } } }).ok
      && !O.lireLectureIA({ ...v2, photos: { "A.JPG": { corrige: {} } } }).ok && !O.lireLectureIA({ ...v2, photos: { "A.JPG": { corrige: { role: "vedette" } } } }).ok);

  /* ── 5. la correction ── */
  const cor = O.corrigerTag(v2, cat, "g", { role: "heros" });
  const relCor = cor ? O.relierLectureIA(cor.lecture, cat) : null;
  ok("R194 : corriger le rôle l'écrit dans `corrige`, la proposition reste, et la correction PRIME partout (photo reliée, tags)",
    !!cor && cor.lecture.photos["G.JPG"]?.corrige?.role === "heros" && cor.lecture.photos["G.JPG"]?.role?.role === "detail"
      && relCor?.photos.get("g")?.role?.role === "heros" && (O.tagsIA(relCor).get("g") ?? []).includes("ia_heros") && !(O.tagsIA(relCor).get("g") ?? []).includes("ia_detail")
      && O.lireLectureIA(JSON.parse(JSON.stringify(cor.lecture)) as unknown).ok);
  ok("R194 : la correction devient une LEÇON `tag_corrige` de règle IA, valide pour la route (`leconValide`), avec la proposition et le geste",
    !!cor?.lecon && cor.lecon.type === "tag_corrige" && cor.lecon.regle === "IA" && cor.lecon.proposition === "rôle : Détail" && cor.lecon.geste === "rôle : Héros"
      && cor.lecon.photos[0] === "g" && O.leconValide(cor.lecon));
  const cor2 = cor ? O.corrigerTag(cor.lecture, cat, "g", { sujet: "objet" }) : null;
  const retour = cor2 ? O.corrigerTag(cor2.lecture, cat, "g", { role: "detail" }) : null;
  ok("R194 : corriger le sujet garde la correction du rôle ; revenir à la proposition retire la correction, sans leçon ; corrigée « à écarter », plus de couverture",
    cor2?.lecture.photos["G.JPG"]?.corrige?.sujet === "objet" && cor2.lecture.photos["G.JPG"]?.corrige?.role === "heros"
      && retour?.lecon === null && retour.lecture.photos["G.JPG"]?.corrige?.role === undefined && retour.lecture.photos["G.JPG"]?.corrige?.sujet === "objet"
      && O.photoCorrigee({ role: { role: "vue_ensemble", interet: 1, raison: "x", couverture: "paysage" }, corrige: { role: "a_ecarter" } }).role?.couverture === undefined
      && O.corrigerTag(v2, cat, "g", { role: "detail" }) === null && O.corrigerTag(v2, cat, "inconnue", { role: "heros" }) === null);
  const v1Corr = O.corrigerTag(v1.ok ? v1.lecture : (null as unknown as LectureIA), new Map([["x", photo("x", "IMG_0101.JPG")]]), "x", { sujet: "paysage" });
  ok("R194 : corriger une lecture v1 la fait passer en v2 (une v1 n'a pas de `corrige`)",
    !!v1Corr && v1Corr.lecture.version === 2 && O.lireLectureIA(JSON.parse(JSON.stringify(v1Corr.lecture)) as unknown).ok);

  /* ── 6. la garde, la demande, D29, la route ── */
  const libre = `libre-${UUID}`;
  ok("garde (T-203) : une création libre passe ; un dossier reçoit 403 sauf MEP_LECTURE_IA_CLIENTS=1 ; une édition reçoit 403 TOUJOURS",
    O.gardeLecture(libre, { OPENAI_API_KEY: "k" }).ok
      && JSON.stringify(O.gardeLecture("dossier:abc", { OPENAI_API_KEY: "k" })) === JSON.stringify({ ok: false, statut: 403, erreur: "photos_clients_non_autorisees" })
      && JSON.stringify(O.gardeLecture(`edition:${UUID}:${UUID}`, { OPENAI_API_KEY: "k", MEP_LECTURE_IA_CLIENTS: "0" })) === JSON.stringify({ ok: false, statut: 403, erreur: "photos_clients_non_autorisees" })
      && O.gardeLecture("dossier:abc", { OPENAI_API_KEY: "k", MEP_LECTURE_IA_CLIENTS: "1" }).ok
      && !O.gardeLecture(`edition:${UUID}:${UUID}`, { OPENAI_API_KEY: "k", MEP_LECTURE_IA_CLIENTS: "1" }).ok);
  ok("garde : sans clé OpenAI, 503 openai_absente ; une clé de projet absente ou trop longue, 400 ; la garde des clients passe AVANT la clé",
    JSON.stringify(O.gardeLecture(libre, {})) === JSON.stringify({ ok: false, statut: 503, erreur: "openai_absente" })
      && (O.gardeLecture(undefined, { OPENAI_API_KEY: "k" }) as { statut?: number }).statut === 400 && (O.gardeLecture("x".repeat(121), { OPENAI_API_KEY: "k" }) as { statut?: number }).statut === 400
      && (O.gardeLecture("dossier:abc", {}) as { statut?: number }).statut === 403);
  ok("garde : la forme d'une création libre est EXACTEMENT `LIBRE_PATTERN` (libelles.ts) ; l'écran envoie l'id libre (« libre:<id> » → « <id> »)",
    O.CLE_LIBRE.source === LIBRE_PATTERN.source && O.cleDeRoute(`libre:${libre}`) === libre && O.estCleLibre(libre) && !O.estCleLibre(`libre:${libre}`) && O.cleDeRoute("dossier:t") === "dossier:t");
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x06, 0x00, 0x04, 0x00, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  ok("les dimensions d'un JPEG se lisent sans le décoder (1 024 × 1 536 ici) ; un PNG n'est pas un JPEG",
    JSON.stringify(O.dimensionsJpeg(jpeg)) === JSON.stringify({ h: 1536, l: 1024 }) && O.dimensionsJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])) === null);
  const img = "data:image/jpeg;base64,/9j/4AAQ";
  const d1 = O.lireDemande({ cle: libre, etape: "planche", image: img, numeros: [17, 16] });
  const d2 = O.lireDemande({ cle: libre, etape: "photo", image: img, candidate: "panneau", indice: "« Japon »\nen famille" });
  ok("la demande : une planche [n0, n] (16 au plus), une photo avec sa raison (couverture, pleine, double, panneau) ; l'indice nettoyé",
    d1.ok && d1.valeur.etape === "planche" && d1.valeur.n0 === 17 && d2.ok && d2.valeur.etape === "photo" && d2.valeur.pourquoi === "panneau" && d2.valeur.indice === "Japon en famille");
  ok("la demande : refus d'un PNG, d'une planche de 17, d'une raison inconnue, d'un champ inconnu, d'une image trop lourde",
    !O.lireDemande({ cle: libre, etape: "planche", image: "data:image/png;base64,AAAA", numeros: [1, 1] }).ok
      && !O.lireDemande({ cle: libre, etape: "planche", image: img, numeros: [1, 17] }).ok
      && !O.lireDemande({ cle: libre, etape: "photo", image: img, candidate: "poster" }).ok
      && !O.lireDemande({ cle: libre, etape: "photo", image: img, candidate: "pleine", visage: "x" }).ok
      && !O.lireDemande({ cle: libre, etape: "photo", image: `${img}${"A".repeat(O.TAILLE_MAX_DEMANDE)}`, candidate: "pleine" }).ok);
  const cb = O.corpsPlanche(img), cr = O.corpsRegard(img, "pleine", "un festival");
  ok("les corps : gpt-5.4 effort « low » pour la planche, gpt-5.1 effort « none » (repli « minimal ») pour le regard ; image en détail « high » ; schéma JSON strict",
    cb.model === "gpt-5.4" && cb.reasoning.effort === "low" && cr.model === "gpt-5.1" && cr.reasoning.effort === "none" && O.repliEffort("none") === "minimal" && O.repliEffort("low") === null
      && cb.input[0].content.some((c) => c.type === "input_image" && c.detail === "high") && cb.text.format.strict && cr.text.format.name === "regard_fin");
  const cs = O.consigneRegard("pleine", "un festival"), sans = O.consigneRegard("panneau", "");
  ok("l'indice du client n'est qu'un INDICE (« qui peut être faux ou vague », « Ne le reprends JAMAIS si la photo ne le montre pas ») ; sans indice, rien n'en est dit ; le nom par défaut d'une création libre n'est pas un indice",
    cs.includes("Indice donné par le client, qui peut être faux ou vague : « un festival ». Ne le reprends JAMAIS si la photo ne le montre pas.")
      && !sans.includes("Indice") && sans.includes("pressentie comme un panneau à lire") && O.indiceDuProjet("Création libre") === "" && O.indiceDuProjet("Japon") === "Japon");
  const champs = (s: { properties: Record<string, unknown> }): string[] => Object.keys(s.properties);
  const champsB = champs(O.SCHEMA_B.properties.photos.items), champsC = champs(O.SCHEMA_C);
  const identite = /personne|^nom|identit|^qui|visage|prenom|genre|^age$/i;
  ok("D29 : les deux consignes interdisent d'identifier ou de nommer une personne ; aucun champ d'identité dans les schémas (B : 6 champs, C : 7)",
    O.CONSIGNE_B.includes("Interdit : identifier, nommer ou décrire l'identité d'une personne") && cs.includes("Interdit : identifier ou nommer une personne")
      && champsB.join() === "numero,role,sujet,candidate,interet,texte_lisible" && champsC.join() === "couverture,type_couverture,lieu_lu,plat,moment,idee,recadrage"
      && ![...champsB, ...champsC].some((k) => identite.test(k)) && O.SCHEMA_B.additionalProperties === false && O.SCHEMA_C.additionalProperties === false);
  ok("B ne décrit rien : la consigne le dit (« Ne décris pas les photos ») et le schéma n'a aucun champ de texte libre",
    O.CONSIGNE_B.includes("Ne décris pas les photos") && Object.values(O.SCHEMA_B.properties.photos.items.properties).every((p) => p.type !== "string" || "enum" in p));
  const route = readFileSync(resolve(process.cwd(), "src/app/api/admin/atelier/mise-en-page/lecture-ia/route.ts"), "utf8");
  ok("la route : `maxDuration = 60` LITTÉRAL, admin revérifié, garde AVANT tout appel, aucune base, aucune image journalisée",
    /export const maxDuration = 60;/.test(route) && route.includes("quiEstConnecteRequete") 
      && route.indexOf("gardeLecture(") < route.lastIndexOf("await appeler(") && !/supabase/i.test(route) && !/console\.\w+\([^)]*image/.test(route)
      && route.includes("ATTENTES_MS = [3_000, 6_000]") && route.includes("lireReponsePlanche") && route.includes("lireReponseRegard"));
  const lecons = readFileSync(resolve(process.cwd(), "src/app/api/admin/atelier/mise-en-page/lecons/route.ts"), "utf8");
  const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261117_mep_lecons_tag_corrige.sql"), "utf8");
  ok("la leçon `tag_corrige` : la migration 20261117 l'ajoute à la contrainte ; sans elle, la route envoie les autres leçons et dit `perdues` (23514), jamais un lot bloqué",
    migration.includes("'tag_corrige'") && lecons.includes("\"23514\"") && lecons.includes("perdues") && lecons.includes("20261117_mep_lecons_tag_corrige.sql"));

  /* ── 7. M-13 (18/11 soir, « C'est un échec ! ») : jamais une case vide chez l'IA, jamais une lecture douteuse utilisée ── */
  titre("— M-13 (18/11) : jamais une case vide chez l'IA, arrêt avant de payer, lecture douteuse —");
  const S = O.lectureSure();
  const seize = Array.from({ length: 16 }, (_, i) => `x${i}`);
  const sv = O.plancheSansVide(seize, (id) => id !== "x3", 17);
  ok("M-13 : une photo illisible est RETIRÉE de la planche (ni case, ni numéro) : 15 photos numérotées à la suite depuis 17, l'illisible comptée",
    sv.ids.length === 15 && !sv.ids.includes("x3") && sv.illisibles.join() === "x3" && sv.n0 === 17 && sv.ids[3] === "x4");
  const a1 = O.arretIllisibles(16, 1), a2 = O.arretIllisibles(16, 2), a37 = O.arretIllisibles(164, 37), a16 = O.arretIllisibles(164, 16), a17 = O.arretIllisibles(164, 17);
  ok("M-13 : au-delà de 10 % (seuil nommé `lecture_illisibles_max`) on s'ARRÊTE avant de payer : 1 sur 16 continue, 2 sur 16 arrête ; 16 sur 164 continue, 17 arrête ; la phrase dit le nombre et le geste",
    S.illisiblesMax === 0.1 && !a1.arreter && a2.arreter && !a16.arreter && a17.arreter
      && a37.arreter && a37.phrase === "37 photos ne se chargent pas. Recharge la page, puis relance." && !O.arretIllisibles(0, 0).arreter);
  const client = readFileSync(resolve(process.cwd(), "src/app/admin/atelier/mise-en-page/[id]/lireLesPhotosClient.ts"), "utf8");
  const ecranCompo = readFileSync(resolve(process.cwd(), "src/app/admin/atelier/mise-en-page/[id]/Composer.tsx"), "utf8");
  const ecranLire = readFileSync(resolve(process.cwd(), "src/app/admin/atelier/mise-en-page/[id]/LireLesPhotos.tsx"), "utf8");
  const avantPaiement = (src: string) => src.indexOf("controlerImages(") > 0 && src.indexOf("controlerImages(") < src.indexOf("lirePlanche(")
    && src.indexOf("plancheSansVide(") < src.indexOf("lirePlanche(") && src.indexOf("arretIllisibles(lot.ids.length") < src.indexOf("lirePlanche(")
    && /if \(!image\) \{ illisibles \+= 1/.test(src);
  ok("M-13 : case illisible JAMAIS envoyée : la planche ne se compose qu'avec des images chargées (`composerPlanche(ims: readonly ImageBitmap[]`), chaque image essayée à toutes ses tailles (moyenne, vignette, original), adresses relues avant ; les deux écrans contrôlent les images, retirent les illisibles et s'arrêtent AVANT `lirePlanche` ; le regard fin ne part jamais sans image",
    /export function composerPlanche\(ims: readonly ImageBitmap\[\], n0: number\)/.test(client) && !/fillRect\(0, 0[^]*?if \(im\)/.test(client.slice(client.indexOf("composerPlanche")))
      && /\[a\?\.moyenne, a\?\.vignette, a\?\.original\]/.test(client) && client.includes("await rafraichir(true)")
      && avantPaiement(ecranCompo) && avantPaiement(ecranLire));
  const ed = readFileSync(resolve(process.cwd(), "src/app/admin/atelier/mise-en-page/[id]/EditeurMagazine.tsx"), "utf8");
  ok("M-13 : l'éditeur relit ses adresses signées (périmées après une à deux heures) quand elles ne sont plus sûres (`adressesEncoreValables`) ; une création libre n'en a pas besoin",
    ed.includes("adressesEncoreValables(c, Date.now())") && ed.includes("rafraichirAdresses,") && ed.includes("projet.source === \"libre\""));

  const v = (n: number, role: (i: number) => string, corrige: (i: number) => boolean = () => false): O.VerdictLu[][] => {
    const l = Array.from({ length: n }, (_, i) => ({ id: `v${i}`, role: role(i), corrige: corrige(i) }));
    const out: O.VerdictLu[][] = [];
    for (let i = 0; i < l.length; i += 16) out.push(l.slice(i, i + 16));
    return out;
  };
  const ROLES = ["heros", "satellite", "detail", "vue_ensemble"];
  const empoisonnee = O.lectureSuspecte(v(164, () => "a_ecarter"));
  const saine = O.lectureSuspecte(v(161, (i) => (i === 7 || i === 90 ? "a_ecarter" : ROLES[i % 4])));
  const uniforme = O.lectureSuspecte(v(48, (i) => (i >= 16 && i < 32 ? "satellite" : ROLES[i % 4])));
  const derniere = O.lectureSuspecte(v(36, (i) => (i >= 32 ? "detail" : ROLES[i % 4])));
  const corrigee = O.lectureSuspecte(v(16, () => "a_ecarter", (i) => i < 10));
  ok("M-13 : 164 photos « à écarter » sur 164 = lecture DOUTEUSE (plus de la moitié, `lecture_ecarter_max` = 0,5), toutes à relire, voyage et lieux compris ; un lot réel (2 sur 161, le banc) fait foi",
    S.ecarterMax === 0.5 && empoisonnee.suspecte && empoisonnee.toute && empoisonnee.douteuses.size === 164 && empoisonnee.raisons[0].startsWith("164 photos sur 164")
      && !saine.suspecte && saine.douteuses.size === 0);
  ok("M-13 : une planche de 16 au même verdict partout est douteuse (ses 16 photos seulement) ; une dernière planche de 4 ne l'est pas (`lecture_planche_uniforme_min` = 8) ; un rôle corrigé par l'atelier n'est jamais douteux",
    S.uniformeMin === 8 && uniforme.suspecte && !uniforme.toute && uniforme.douteuses.size === 16 && [...uniforme.douteuses].every((id) => Number(id.slice(1)) >= 16 && Number(id.slice(1)) < 32)
      && !derniere.suspecte && corrigee.douteuses.size === 6 && [...corrigee.douteuses].every((id) => Number(id.slice(1)) >= 10));
  const catV = new Map<string, PhotoMaq>(Array.from({ length: 20 }, (_, i) => [`p${i}`, photo(`p${i}`, `P${i}.JPG`, { date: `2026-06-12T10:${String(i).padStart(2, "0")}:00` })]));
  const lV: LectureIA = { format: "bellajour-lecture-ia", version: 2, photos: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`P${i}.JPG`, { role: { role: "a_ecarter" as const, interet: 0.1, raison: "x" }, sujet: "autre" as const }])), rafales: [], groupes: [] };
  const rejouee = O.verdictsDeLecture(lV, catV, [...catV.keys()]);
  ok("M-13 : une lecture GARDÉE est rejouée en planches de 16 dans l'ordre d'envoi : 20 photos = 16 + 4, et la lecture empoisonnée est vue douteuse",
    rejouee.length === 2 && rejouee[0].length === 16 && rejouee[1].length === 4 && O.lectureSuspecte(rejouee).toute);
  ok("M-13 : « Composer le magazine » propose de RELIRE une lecture douteuse au lieu de composer sur du faux (« Lecture douteuse », « Relire N photos · ≈ X $ », « Relire tout » toujours là) ; une lecture qui vient d'être lue douteuse ne paie ni regard, ni voyage, ni lieux",
    ecranCompo.includes("Lecture douteuse") && /Relire \{pluriel\(aRelire, "photo"\)\} · ≈ \{motDollars\(est\.dollars\)\}/.test(ecranCompo) && ecranCompo.includes(">Relire tout<")
      && ecranCompo.includes("!douteuseLue && (!base?.voyage") && ecranLire.includes("Lecture douteuse"));
}
