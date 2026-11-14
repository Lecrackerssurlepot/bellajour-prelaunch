/**
 * Le harnais du LOT G (14/11) : les COULEURS LIBRES et les COMBOS, appelé par verif-atelier.ts.
 *   1. la sauvegarde : `Planche.fond` et `TexteCadre.couleur`, facultatifs, relus EXACTEMENT (un rôle ou `#rrggbb` minuscule, rien
 *      d'autre) ; un magazine d'avant reste valide ; le sens unique (un validateur d'avant refuse les nouvelles clés) ;
 *   2. les gestes : le fond d'une page, d'une double, d'une page seule, retiré d'un geste, qui survit aux gabarits ; la couleur d'un
 *      texte (intérieur et couverture), seule ou fondue dans la séance d'écriture ; Annuler ; les invariants ;
 *   3. les combos : purs et déterministes, quatre ids stables, un nom et une raison de deux à six mots, jamais un ciel en aplat,
 *      la complémentaire en face de la dominante, lisibles ;
 *   4. le plan PDF : les fonds (page seule, double, une page) et les couleurs de texte, avec et sans style ; le PDF écrit les porte ;
 *   5. l'IDML : les nuances NOMMÉES (rôles, « Libre »), le fond des pages, la couleur des textes, aucune nuance orpheline, la
 *      couverture ; sans couleur libre, rien ne change.
 * Sans base, sans réseau, sans écriture.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import * as O from "@/lib/mise-en-page/editeur";
import type { EtatEditeur, PhotoMaq } from "@/lib/mise-en-page/editeur";
import { nouveauMagazine, tousLesTemplates, type Magazine, type PhotoRef } from "@/lib/mise-en-page/magazine";
import { clesAdmises, contenuValide } from "@/lib/mise-en-page/sauvegarde";
import { BOITE_PAGE_SEULE, ecrirePdf, planPdf, planPdfCouverture, type ObjetPdf } from "@/lib/mise-en-page/pdf";
import { construireIdml, construireIdmlCouverture, type PhotoExport } from "@/lib/mise-en-page/idml";
import { couvertureNeuve, couverturePourExport } from "@/lib/mise-en-page/couverture";
import { COULEURS_ORIGINE, contraste, ecartTeinte, estHex, hexVersRgb, lchDeHex, type CouleursNuancier } from "@/lib/mise-en-page/nuancier";
import { styleDePaire } from "@/lib/mise-en-page/style";
import {
  couleurLibreValide, cssDeCouleur, fondValide, hexDeCouleur, nomDeCouleur, nuanceIdml, piecesDuFond,
} from "@/lib/mise-en-page/couleursLibres";
import { IDS_COMBOS, REGLAGES_COMBOS, comboApplique, combosDeLaLecture, combosProposes, estCielOuMer, proposerCombos } from "@/lib/mise-en-page/combos";

type Rapporter = (nom: string, reussi: boolean) => void;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/* ─────────────────────────── les fixtures ─────────────────────────── */

const maq = (id: string, l: number, h: number): PhotoMaq => ({
  id, nom: `${id}.jpg`, l, h, date: `2026-07-0${(id.charCodeAt(1) % 8) + 1}T10:00:00.000Z`, personne: "Inès", lien: null, type: "atelier", coeur: false, signalee: false,
  autresMagazines: [], nouvelle: false, vignette: null,
});
const IDS = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
const CATALOGUE: Map<string, PhotoMaq> = new Map(IDS.map((id, i) => [id, maq(id, i % 2 ? 3000 : 4000, i % 2 ? 4000 : 3000)]));
const PHOTOS_EXPORT: Map<string, PhotoExport> = new Map(IDS.map((id, i) => [id, { id, nomLien: `${id}.jpg`, l: i % 2 ? 3000 : 4000, h: i % 2 ? 4000 : 3000 }]));

/** Un magazine : page 1 (une photo), une double à titre (trois photos), une planche en deux pages, la dernière page. */
function magazineDeBase(): Magazine {
  const cat = CATALOGUE as unknown as ReadonlyMap<string, PhotoRef>;
  let m = nouveauMagazine("mg", "Madère", "2026-11-14T10:00:00.000Z");
  m = O.insererDouble(m, "pl-1", "pl-2").magazine;
  m = O.insererDouble(m, "pl-2", "pl-3").magazine;
  m = O.ajouter(m, "pl-1", "droite", ["p1"], cat).magazine;
  m = O.ajouter(m, "pl-2", "double", ["p2", "p3", "p4"], cat).magazine;
  const t = tousLesTemplates().find((x) => x.portee === "double" && x.nbPhotos === 3 && x.cadres.some((c) => c.role === "titre"));
  if (t) m = O.choisirGabarit(m, "pl-2", "double", t.id, cat).magazine;
  m = O.ajouter(m, "pl-3", "gauche", ["p5"], cat).magazine;
  m = O.ajouter(m, "pl-3", "droite", ["p6"], cat).magazine;
  m = O.ajouter(m, "pl-fin", "gauche", ["p7"], cat).magazine;
  return m;
}
const etatDe = (m: Magazine): EtatEditeur => O.creerEtat({ magazine: m, catalogue: CATALOGUE });

/** Rejoue des gestes ; rend l'état final et les erreurs d'invariants de chaque pas. */
function jouer(e0: EtatEditeur, gestes: O.Geste[]): { e: EtatEditeur; err: string[] } {
  let e = e0;
  const err: string[] = [];
  for (const g of gestes) {
    const x = O.appliquer(e, g);
    err.push(...O.verifierInvariants(x, e, g));
    e = x;
  }
  return { e, err };
}

/** Un échantillon RÉEL : la palette de lecture (5 couleurs, k-moyennes sur la vignette de 256 px) d'une photo sur quatre du lot de
 *  Merisa (Madère, `design-explorations/cycle-1-2026-11-12/cache/merisa/`, 23 photos) : la mer et le ciel bleus reviennent partout. */
const MERISA: string[][] = [["#99afce","#d8d8de","#d99575","#986d5f","#3f2c26"],["#786a60","#a9978a","#d0d3df","#363e3f","#658bcc"],["#cdb091","#528bd4","#837553","#1a5177","#8dc4f8"],["#c5c6cb","#87754e","#bea27a","#30536a","#628eca"],["#d7dce9","#8a7d5d","#c6a97c","#554936","#97adc1"],["#241910","#a77f56","#e8dfd1","#5d4128","#c8b08f"],["#4b3f2d","#c1b6ab","#7c6c56","#a49685","#1d1b16"],["#4e5d76","#d9d5d3","#262a33","#97a3b5","#7d808e"],["#0a3d66","#729fd0","#e7ecef","#356c8d","#a9c9e7"],["#8f8b84","#cdc6bc","#3f3a33","#665f56","#b0aaa1"],["#4a7cb4","#dbe0e8","#1d3046","#8eb0d7","#79766a"],["#27424d","#8a7a63","#bfb5a2","#5a5243","#e0dad1"],["#384f3a","#7e8a6b","#c2c1b0","#1b261c","#a0a68f"],["#0b62a5","#e8edf4","#3a85c2","#9dc3e6","#08365e"],["#b0a798","#d8d1c3","#3f3a32","#7f7564","#5b5547"],["#626d4b","#1d2116","#a7a589","#3e4430","#cbcbb7"],["#1a6aaa","#ebe9e8","#9bbfe3","#5592cb","#0f3b66"],["#a17b5d","#d8c4ae","#5d4535","#2d241d","#ecb185"],["#b9c0c7","#3f4c58","#7b8590","#e6e5e2","#1f262c"],["#0f5a9e","#e4e9ef","#8ab3dc","#4a87c4","#123b62"],["#8e7558","#c7b49c","#4f4232","#a69680","#e3d8c8"],["#2c3a1e","#6e7a45","#a8a575","#1b1f12","#d1cfaf"],["#0d62a6","#d7e5f2","#5395cf","#93bde3","#0f3963"]];

/** Les opérateurs de couleur de remplissage (« r g b rg ») des pages d'un PDF écrit par pdf-lib. */
async function couleursDuPdf(octets: Uint8Array): Promise<number[][][]> {
  const doc = await PDFDocument.load(octets);
  return doc.getPages().map((pg) => {
    const c = pg.node.Contents();
    const flux = c instanceof PDFArray ? c.asArray() : c ? [c] : [];
    const texte = flux.map((f) => {
      const s = doc.context.lookup(f);
      return s instanceof PDFRawStream ? new TextDecoder("latin1").decode(decodePDFRawStream(s).decode()) : "";
    }).join("\n");
    return [...texte.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) rg/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
  });
}
/** La page remplit-elle avec cette couleur (à 1/255 près) ? */
const remplit = (ops: number[][], hex: string): boolean => {
  const c = hexVersRgb(hex).map((v) => v / 255);
  return ops.some((o) => o.every((v, i) => Math.abs(v - c[i]) < 0.004));
};

/* ─────────────────────────── le harnais ─────────────────────────── */

export async function verifierMepCouleurs(ok: Rapporter, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, lot G : les couleurs libres (fond d'une page, couleur d'un texte) et les combos —");

  /* ── 1. la sauvegarde ── */
  const m0 = magazineDeBase();
  const pl2 = m0.planches.find((p) => p.id === "pl-2")!;
  const avecFond = (i: number, fond: unknown): Magazine => ({ ...m0, planches: m0.planches.map((p, k) => (k === i ? ({ ...p, fond } as typeof p) : p)) });
  const iDouble = m0.planches.indexOf(pl2), iDerniere = m0.planches.length - 1;
  ok("sauvegarde : un magazine SANS fond ni couleur de texte reste valide tel quel (le format d'avant le lot G), et sa double porte un titre (le test a de quoi colorer)",
    contenuValide(m0) && contenuValide(clone(m0)) && !!pl2.double && pl2.double.textes.length > 0 && m0.planches.every((p) => !("fond" in p)));
  ok("sauvegarde : un fond valide passe : un rôle des deux côtés d'une double, un hexa d'un côté, la page droite de la page 1, la page gauche de la dernière",
    contenuValide(avecFond(iDouble, { gauche: "accent", droite: "accent" })) && contenuValide(avecFond(iDouble, { droite: "#ca7749" }))
      && contenuValide(avecFond(0, { droite: "aplatClair" })) && contenuValide(avecFond(iDerniere, { gauche: "nuit" })));
  const fondsCasses: unknown[] = [{}, undefined, null, "accent", [], { haut: "accent" }, { gauche: "#CA7749" }, { gauche: "#abc" }, { gauche: "blanc" }, { gauche: "rouge" }, { gauche: "accent", droite: undefined }, { gauche: 3 }];
  ok("sauvegarde : un fond cassé est REFUSÉ (vide, `undefined`, null, une chaîne, un tableau, un côté inconnu, un hexa en majuscules ou court, « blanc », un nom, un côté à `undefined`, un nombre)",
    fondsCasses.every((f) => !contenuValide(avecFond(iDouble, f))));
  ok("sauvegarde : la page 1 n'a pas de fond GAUCHE, la dernière page pas de fond DROIT (le côté absent d'une page seule est refusé)",
    !contenuValide(avecFond(0, { gauche: "accent" })) && !contenuValide(avecFond(0, { gauche: "accent", droite: "accent" })) && !contenuValide(avecFond(iDerniere, { droite: "accent" })));
  const avecCouleurTexte = (c: unknown): Magazine => ({ ...m0, planches: m0.planches.map((p, k) => (k === iDouble && p.double ? { ...p, double: { ...p.double, textes: p.double.textes.map((t, j) => (j === 0 ? ({ ...t, couleur: c } as typeof t) : t)) } } : p)) });
  ok("sauvegarde : la couleur d'un texte passe en rôle ou en `#rrggbb` minuscule ; tout le reste est refusé (majuscules, « blanc », #fff, un nom, `undefined`, null, une clé en trop)",
    contenuValide(avecCouleurTexte("accent")) && contenuValide(avecCouleurTexte("#1f3a5c")) && contenuValide(avecCouleurTexte("papier"))
      && ["#1F3A5C", "blanc", "#fff", "noir", undefined, null, 0, ""].every((c) => !contenuValide(avecCouleurTexte(c)))
      && !contenuValide({ ...m0, planches: m0.planches.map((p, k) => (k === iDouble && p.double ? { ...p, double: { ...p.double, textes: p.double.textes.map((t, j) => (j === 0 ? { ...t, couleur: "accent", police: "Arial" } : t)) } } : p)) }));
  const couv = { ...couvertureNeuve("CV-01"), textes: couvertureNeuve("CV-01").textes.map((t, i) => (i === 0 ? { ...t, contenu: "MADÈRE", couleur: "encre" as const } : t)) };
  ok("sauvegarde : un texte de la COUVERTURE porte sa couleur aussi (le mot-titre à l'encre) ; une couleur cassée y est refusée",
    contenuValide({ ...m0, couverture: couv }) && !contenuValide({ ...m0, couverture: { ...couv, textes: couv.textes.map((t, i) => (i === 0 ? { ...t, couleur: "#FFF" } : t)) } as unknown as Magazine["couverture"] }));
  ok("sauvegarde, sens unique : un validateur d'AVANT (planche aux cinq clés exactes, texte aux trois clés exactes) refuse une planche qui porte `fond` et un texte qui porte `couleur` : déployer avant la première sauvegarde",
    !clesAdmises({ ...pl2, fond: { gauche: "accent" } }, ["id", "mode", "double", "gauche", "droite"], []) && clesAdmises(pl2, ["id", "mode", "double", "gauche", "droite"], [])
      && !clesAdmises({ contenu: "a", taille: 10, gras: false, couleur: "accent" }, ["contenu", "taille", "gras"], []));
  ok("couleur libre : `couleurLibreValide` n'admet que les six rôles et `#rrggbb` minuscule ; `fondValide` relit les côtés d'une page seule",
    ["papier", "encre", "aplatClair", "aplatSourd", "accent", "nuit", "#000000", "#ca7749"].every(couleurLibreValide)
      && !["aplat", "noir", "blanc", "#CA7749", "#ca774", "ca7749", "", null, undefined, 7].some(couleurLibreValide)
      && fondValide({ droite: "accent" }, "droite") && !fondValide({ gauche: "accent" }, "droite") && fondValide({ gauche: "accent", droite: "nuit" }, null));

  /* ── 2. les gestes ── */
  const e0 = etatDe(m0);
  {
    const { e, err } = jouer(e0, [{ type: "colorerFond", plancheId: "pl-2", cible: "double", couleur: "accent" }]);
    const p = e.magazine.planches.find((x) => x.id === "pl-2")!;
    ok("geste : « Fond » d'une double pose les DEUX côtés (une entrée d'historique « Fond · Accent »), ne touche ni photo ni texte ni autre planche, invariants tenus",
      p.fond?.gauche === "accent" && p.fond?.droite === "accent" && e.historique.passe.length === 1 && e.historique.passe[0].libelle === "Fond · Accent"
        && p.double === pl2.double && e.magazine.planches.filter((x) => x.id !== "pl-2").every((x, i) => x === m0.planches.filter((y) => y.id !== "pl-2")[i]) && err.length === 0 && contenuValide(e.magazine));
    const deux = O.appliquer(e, { type: "colorerFond", plancheId: "pl-2", cible: "double", couleur: "accent" });
    const sans = O.appliquer(e, { type: "colorerFond", plancheId: "pl-2", cible: "double", couleur: null });
    ok("geste : reposer la même couleur ne change rien (même magazine, pas d'entrée) ; « Sans fond » retire la CLÉ (aucun `fond` vide), Annuler la rend",
      deux.magazine === e.magazine && deux.historique.passe.length === 1 && !("fond" in sans.magazine.planches.find((x) => x.id === "pl-2")!)
        && sans.historique.passe[1].libelle === "Fond retiré" && O.appliquer(sans, { type: "annuler" }).magazine === e.magazine && contenuValide(sans.magazine));
    const ann = O.appliquer(e, { type: "annuler" });
    ok("geste : Annuler rend le magazine d'avant, au même objet ; Rétablir le fond", ann.magazine === m0 || ann.magazine === e0.magazine ? O.appliquer(ann, { type: "retablir" }).magazine === e.magazine : false);
  }
  {
    const { e, err } = jouer(e0, [
      { type: "colorerFond", plancheId: "pl-3", cible: "gauche", couleur: "#ca7749" },
      { type: "colorerFond", plancheId: "pl-1", cible: "double", couleur: "aplatClair" },
      { type: "colorerFond", plancheId: "pl-fin", cible: "droite", couleur: "nuit" },
      { type: "colorerFond", plancheId: "couverture", cible: "double", couleur: "accent" },
      { type: "colorerFond", plancheId: "pl-2", cible: "double", couleur: "#ABCDEF" as never },
      { type: "colorerFond", plancheId: "pl-9", cible: "double", couleur: "accent" },
    ]);
    const pl = (id: string) => e.magazine.planches.find((x) => x.id === id)!;
    ok("geste : le fond d'UNE page (gauche) laisse l'autre au papier ; sur une page seule, toute cible vise SA page (page 1 : droite, dernière : gauche) ; la couverture, un hexa en majuscules, une planche inconnue : rien",
      pl("pl-3").fond?.gauche === "#ca7749" && pl("pl-3").fond?.droite === undefined && pl("pl-1").fond?.droite === "aplatClair" && !("gauche" in (pl("pl-1").fond ?? {}))
        && pl("pl-fin").fond?.gauche === "nuit" && !("droite" in (pl("pl-fin").fond ?? {})) && !("fond" in pl("pl-2")) && e.historique.passe.length === 3 && err.length === 0 && contenuValide(e.magazine));
    const apres = jouer(e, [
      { type: "autreGabarit", plancheId: "pl-3", cible: "gauche", sens: 1 },
      { type: "fusionner", plancheId: "pl-3" },
      { type: "separer", plancheId: "pl-3" },
      { type: "deplacerPlanche", plancheId: "pl-3", versIndex: 1 },
      { type: "vider", plancheId: "pl-3" },
    ]);
    ok("geste : le fond est INDÉPENDANT du gabarit : il reste après « autre gabarit », « Double page », « Séparer », le déplacement et le vidage de la planche",
      apres.e.magazine.planches.find((x) => x.id === "pl-3")?.fond?.gauche === "#ca7749" && apres.e.magazine.planches[1].id === "pl-3" && apres.err.length === 0 && contenuValide(apres.e.magazine));
  }
  {
    const refT = { plancheId: "pl-2", cible: "double" as const, index: 0 };
    const seul = jouer(e0, [{ type: "colorerTexte", ref: refT, couleur: "#1f3a5c" }]);
    const t = (e: EtatEditeur) => e.magazine.planches.find((x) => x.id === "pl-2")!.double!.textes[0];
    ok("geste : la couleur d'un texte hors écriture = une entrée d'historique (« Texte · Bleu nuit profond #1f3a5c »), le contenu ne bouge pas, invariants tenus",
      t(seul.e).couleur === "#1f3a5c" && t(seul.e).contenu === pl2.double!.textes[0].contenu && seul.e.historique.passe.length === 1 && /^Texte · .+ #1f3a5c$/.test(seul.e.historique.passe[0].libelle) && seul.err.length === 0);
    const seance = jouer(e0, [{ type: "ouvrirTexte", ref: refT }, { type: "colorerTexte", ref: refT, couleur: "accent" }, { type: "colorerTexte", ref: refT, couleur: "nuit" }, { type: "taper", contenu: "Funchal" }]);
    const ferme = O.appliquer(seance.e, { type: "fermerTexte" });
    ok("geste : PENDANT l'écriture, la couleur se pose dans la séance (aucune entrée tant qu'on écrit) ; à la fermeture, UNE entrée « Modifier un texte » porte le texte ET sa couleur ; Annuler défait les deux",
      seance.e.historique.passe.length === 0 && t(seance.e).couleur === "nuit" && ferme.historique.passe.length === 1 && ferme.historique.passe[0].libelle === "Modifier un texte"
        && t(ferme).couleur === "nuit" && t(ferme).contenu === "Funchal" && O.appliquer(ferme, { type: "annuler" }).magazine === e0.magazine && seance.err.length === 0);
    const retire = O.appliquer(seul.e, { type: "colorerTexte", ref: refT, couleur: null });
    ok("geste : « Couleur du gabarit » retire la CLÉ `couleur` du texte (le texte revient à la couleur de son gabarit), en une entrée",
      !("couleur" in t(retire)) && retire.historique.passe.length === 2 && retire.historique.passe[1].libelle === "Couleur du gabarit" && contenuValide(retire.magazine));
    /* la couleur SUIT le texte quand le gabarit change (report par rôle et par rang) */
    const ecrit = jouer(seul.e, [{ type: "ouvrirTexte", ref: refT }, { type: "taper", contenu: "Funchal" }, { type: "fermerTexte" }]).e;
    const autre = O.gabaritsPour(ecrit, "pl-2", "double").find((g) => !g.courant && g.template.cadres.some((c) => c.role === "titre"));
    const change = autre ? O.appliquer(ecrit, { type: "choisirGabarit", plancheId: "pl-2", cible: "double", templateId: autre.id }) : ecrit;
    const titreApres = change.magazine.planches.find((x) => x.id === "pl-2")!.double!.textes.find((x) => x.contenu === "Funchal");
    ok("geste : la couleur d'un titre SUIT le titre quand la double change de gabarit (report par rôle et par rang, comme le texte écrit)",
      !!autre && titreApres?.couleur === "#1f3a5c" && contenuValide(change.magazine) && O.verifierInvariants(change, ecrit, { type: "choisirGabarit", plancheId: "pl-2", cible: "double", templateId: autre.id }).length === 0);
    const refC = { plancheId: "couverture", cible: "double" as const, index: 0 };
    const surCouv = jouer(e0, [{ type: "colorerTexte", ref: refC, couleur: "encre" }]);
    ok("geste : le mot-titre de la COUVERTURE prend sa couleur (l'encre sur un ciel clair) ; la couverture s'écrit, l'intérieur ne bouge pas",
      surCouv.e.magazine.couverture?.textes[0].couleur === "encre" && surCouv.e.magazine.planches === e0.magazine.planches && surCouv.err.length === 0 && contenuValide(surCouv.e.magazine));
    const gab = O.appliquer(surCouv.e, { type: "choisirGabarit", plancheId: "couverture", cible: "double", templateId: "CV-04" });
    ok("geste : la couleur du mot-titre suit le changement de gabarit de couverture", gab.magazine.couverture?.templateId === "CV-04" && gab.magazine.couverture.textes[0].couleur === "encre");
  }

  /* ── 3. les combos ── */
  const base: CouleursNuancier = { ...COULEURS_ORIGINE };
  /* un lot synthétique : un ciel bleu partout, un sable, et une veste ocre franche dans trois photos */
  const ciel = "#7cb6d8", sable = "#cdbb9a", veste = "#c8662e", ombre = "#2a2622";
  const lot: string[][] = Array.from({ length: 10 }, (_, i) => (i < 3 ? [ciel, veste, sable, ombre, "#e8e4dc"] : [ciel, sable, ombre, "#e8e4dc", "#8a9a6a"]));
  const avant = JSON.stringify([lot, base]);
  const c1 = proposerCombos(lot, base), c2 = proposerCombos(clone(lot), { ...base });
  ok("combos : PURS et déterministes (mêmes palettes, même nuancier : mêmes combos ; rien de reçu n'est modifié)",
    JSON.stringify(c1) === JSON.stringify(c2) && JSON.stringify([lot, base]) === avant && c1.length > 0);
  ok("combos : quatre ids stables dans l'ordre (dominante, complémentaire, douce, contraste), un nom court, une raison de deux à six mots, des hexas `#rrggbb` minuscules",
    c1.map((c) => c.id).join() === IDS_COMBOS.join() && c1.every((c) => c.nom.length > 0 && c.nom.length <= 32)
      && c1.every((c) => { const n = c.raison.split(/\s+/).filter(Boolean).length; return n >= 2 && n <= 6; })
      && c1.every((c) => Object.values(c.couleurs).every((x) => estHex(x))));
  ok("combos : le papier, l'encre et la nuit restent ceux du nuancier de départ ; chaque combo pose l'aplat sourd, l'aplat clair et l'accent",
    c1.every((c) => c.couleurs.papier === base.papier && c.couleurs.encre === base.encre && c.couleurs.nuit === base.nuit && [...c.roles].sort().join() === "accent,aplatClair,aplatSourd"));
  const hDom = lchDeHex(c1[0].couleurs.aplatSourd).h;
  ok("combos, règle du DA : jamais le ciel en aplat : la dominante est la VESTE ocre (trois photos), pas le bleu qui revient partout ; aucun aplat sourd ni clair des quatre n'est bleu",
    ecartTeinte(hDom, lchDeHex(veste).h) <= 10 && c1[0].source === veste
      && c1.every((c) => (["aplatSourd", "aplatClair"] as const).every((r) => { const x = lchDeHex(c.couleurs[r]); return x.C < 8 || x.h < REGLAGES_COMBOS.CIEL_H_MIN || x.h > REGLAGES_COMBOS.CIEL_H_MAX; })));
  const comp = c1.find((c) => c.id === "complementaire")!;
  ok("combos : la complémentaire est EN FACE de la dominante (accent à 180° ± 30°), dite « dans les photos » quand une couleur des photos est là (ici le ciel : il donne l'accent, jamais l'aplat)",
    ecartTeinte(lchDeHex(comp.couleurs.accent).h, (hDom + 180) % 360) <= 30 && comp.dansLesPhotos && comp.raison === "Son opposée, dans les photos");
  const sansBleu = lot.map((p) => p.filter((x) => x !== ciel));
  const compHors = proposerCombos(sansBleu, base).find((c) => c.id === "complementaire")!;
  ok("combos : sans aucun bleu dans les photos, la complémentaire est posée quand même et dite « hors des photos »",
    !!compHors && !compHors.dansLesPhotos && compHors.raison === "Son opposée, hors des photos" && ecartTeinte(lchDeHex(compHors.couleurs.accent).h, (hDom + 180) % 360) <= 30);
  ok("combos : tout se lit : un texte (encre ou papier) à 4,5:1 sur chaque aplat sourd, chaque accent à 3:1 sur le papier",
    c1.every((c) => Math.max(contraste(c.couleurs.encre, c.couleurs.aplatSourd), contraste(c.couleurs.papier, c.couleurs.aplatSourd)) >= 4.5 && contraste(c.couleurs.accent, c.couleurs.papier) >= 3));
  const douce = c1.find((c) => c.id === "douce")!, fort = c1.find((c) => c.id === "contraste")!;
  ok("combos : l'harmonie douce reste douce (aplat sourd à C ≤ 23), le contraste fort est fort (aplat sourd L ≤ 34, le papier s'y lit à 4,5:1, l'aplat clair L ≥ 85)",
    lchDeHex(douce.couleurs.aplatSourd).C <= 23 && lchDeHex(fort.couleurs.aplatSourd).L <= 34 && contraste(fort.couleurs.papier, fort.couleurs.aplatSourd) >= 4.5 && lchDeHex(fort.couleurs.aplatClair).L >= 79);
  ok("combos : rien à proposer quand aucune couleur d'objet ne revient (du ciel, de la mer, du gris) ou sans palette : la liste est vide",
    proposerCombos(Array.from({ length: 8 }, () => [ciel, "#3b6fa8", "#9a9a9a", "#2b2b2b", "#e6e6e6"]), base).length === 0 && proposerCombos([], base).length === 0 && proposerCombos([["pas", "un", "hexa"]], base).length === 0);
  ok("combos : `comboApplique` reconnaît le combo que le nuancier porte (ses trois rôles), et aucun sur le nuancier d'origine",
    comboApplique(c1, c1[2].couleurs)?.id === c1[2].id && comboApplique(c1, base) === null && comboApplique(c1, null) === null);
  /* lot F : les combos de la lecture IA chargée (`lecture.couleurs`), proposés après ceux des photos */
  const exemple = O.lireLectureIA(JSON.parse(readFileSync(resolve(process.cwd(), "docs/moteur/exemple-lecture-ia.json"), "utf8")));
  const ia = combosDeLaLecture(exemple.ok ? exemple.lecture.couleurs : []);
  const tous = combosProposes(c1, [...ia, { ...ia[0], id: "ia-9" as const, couleurs: { ...c1[0].couleurs } }]);
  ok("combos de la lecture IA : l'exemple du lot F se lit, son combo devient `ia-1` (origine « lecture », six rôles posés, l'aplat et l'accent en tête), proposé APRÈS les quatre des photos ; un combo qui répète un des photos n'est pas redit",
    exemple.ok && ia.length === 1 && ia[0].id === "ia-1" && ia[0].origine === "lecture" && ia[0].nom === "Terre cuite et crème" && ia[0].roles.length === 6 && ia[0].roles[0] === "aplatSourd"
      && tous.length === c1.length + 1 && tous[c1.length].id === "ia-1" && tous.slice(0, c1.length).every((c) => c.origine === "photos") && combosDeLaLecture(null).length === 0);
  ok("combos de la lecture IA : appliqué, il est reconnu sur ses SIX rôles (un nuancier qui n'a que ses trois couleurs d'aplat ne le porte pas)",
    comboApplique(tous, ia[0].couleurs)?.id === "ia-1" && comboApplique(ia, { ...base, aplatSourd: ia[0].couleurs.aplatSourd, aplatClair: ia[0].couleurs.aplatClair, accent: ia[0].couleurs.accent }) === null);
  const merisa = proposerCombos(MERISA, base);
  const nMerisa = MERISA.length;
  ok("combos, rejeu sur un lot réel (Merisa, Madère, 23 palettes) : quatre combos ; la mer et le ciel (bleus qui reviennent) sont PRÉSUMÉS ciel ; aucun aplat sourd n'est bleu",
    merisa.length === 4
      && merisa.every((c) => { const x = lchDeHex(c.couleurs.aplatSourd); return x.C < 8 || x.h < REGLAGES_COMBOS.CIEL_H_MIN || x.h > REGLAGES_COMBOS.CIEL_H_MAX; })
      && estCielOuMer({ h: 260, photos: Math.ceil(nMerisa * 0.15), rep: { hex: "#0d62a6", lch: lchDeHex("#0d62a6") } }, nMerisa));

  /* ── 4. le plan PDF ── */
  const style = styleDePaire("T-03", { ...COULEURS_ORIGINE, accent: "#a46849", aplatClair: "#f9d6c5", nuit: "#211d1a" })!;
  const refTitre = { plancheId: "pl-2", cible: "double" as const, index: 0 };
  const colore = jouer(etatDe({ ...m0, style }), [
    { type: "colorerFond", plancheId: "pl-1", cible: "droite", couleur: "#ca7749" },
    { type: "colorerFond", plancheId: "pl-2", cible: "double", couleur: "accent" },
    { type: "colorerFond", plancheId: "pl-3", cible: "gauche", couleur: "aplatClair" },
    { type: "ouvrirTexte", ref: refTitre }, { type: "taper", contenu: "Funchal" }, { type: "fermerTexte" },
    { type: "colorerTexte", ref: refTitre, couleur: "#1f3a5c" },
  ]).e.magazine;
  const plan = planPdf(colore);
  const fonds = (i: number) => plan[i].objets.filter((o): o is Extract<ObjetPdf, { type: "fond" }> => o.type === "fond");
  const r = (x: { x: number; y: number; l: number; h: number }) => [x.x, x.y, x.l, x.h].join(",");
  ok("PDF : la page 1 (page seule) porte son fond sur TOUTE sa boîte, ses quatre fonds perdus compris (216 × 303), en premier objet, dans l'hexa choisi",
    plan[0].objets[0].type === "fond" && fonds(0).length === 1 && r(fonds(0)[0].rect) === r(BOITE_PAGE_SEULE) && fonds(0)[0].couleur === "#ca7749");
  ok("PDF : la double colorée des deux côtés = UN fond, planche entière et fond perdu extérieur (426 × 303), à la couleur du rôle dans le style ; une seule page = sa moitié (213 × 303)",
    fonds(1).length === 1 && r(fonds(1)[0].rect) === "-3,-3,426,303" && fonds(1)[0].couleur === "#a46849" && fonds(1)[0].teinte === "accent"
      && fonds(2).length === 1 && r(fonds(2)[0].rect) === "-3,-3,213,303" && fonds(2)[0].couleur === "#f9d6c5" && plan[2].objets[0].type === "fond");
  const titrePdf = plan[1].objets.find((o): o is Extract<ObjetPdf, { type: "texte" }> => o.type === "texte" && /funchal/i.test(o.contenu));
  ok("PDF : sous un style, le titre coloré s'écrit dans sa couleur libre (le style lui donne police et capitales)", titrePdf?.style?.couleur === "#1f3a5c");
  const sansStyle = planPdf({ ...colore, style: undefined } as Magazine);
  const titreNu = sansStyle[1].objets.find((o): o is Extract<ObjetPdf, { type: "texte" }> => o.type === "texte" && o.contenu === "Funchal");
  ok("PDF : SANS style, le fond d'un rôle se lit dans le nuancier d'origine et le texte garde sa couleur (`couleur` de l'objet texte)",
    sansStyle[1].objets[0].type === "fond" && (sansStyle[1].objets[0] as { couleur: string }).couleur === COULEURS_ORIGINE.accent && titreNu?.couleur === "#1f3a5c" && !titreNu.style);
  const pdf = await ecrirePdf(plan, new Map(), "Madère");
  const ops = await couleursDuPdf(pdf.octets);
  ok("PDF écrit : chaque page porte la couleur de son fond (opérateur de remplissage), et le titre sa couleur libre",
    pdf.pages === plan.length && remplit(ops[0], "#ca7749") && remplit(ops[1], "#a46849") && remplit(ops[2], "#f9d6c5") && remplit(ops[1], "#1f3a5c") && !remplit(ops[3], "#1f3a5c"));
  const planCouv = planPdfCouverture(couverturePourExport(couv, null, style), 3, style);
  const motTitre = planCouv.objets.find((o): o is Extract<ObjetPdf, { type: "texte" }> => o.type === "texte" && /MAD/.test(o.contenu));
  ok("PDF couverture : le mot-titre colore à l'encre s'écrit à l'encre du style (il était blanc dans son gabarit)", motTitre?.style?.couleur === style.couleurs.encre && motTitre.cadre.couleur === "blanc");
  ok("PDF : un magazine sans fond ni couleur de texte n'a AUCUN objet « fond » et aucun texte coloré (le plan d'avant)",
    planPdf(m0).every((pg) => pg.objets.every((o) => o.type !== "fond" && !(o.type === "texte" && o.couleur))));

  /* ── 5. l'IDML ── */
  const lireIdml = (f: { chemin: string; contenu: string }[], debut: string): string => f.filter((x) => x.chemin.startsWith(debut)).map((x) => x.contenu).join("\n");
  const idml = construireIdml(colore, PHOTOS_EXPORT, { liens: { mode: "relatif" } });
  const graphic = lireIdml(idml, "Resources/Graphic.xml"), spreads = lireIdml(idml, "Spreads/"), stories = lireIdml(idml, "Stories/");
  ok("IDML : les nuances NOMMÉES : le hexa libre du fond (« Ocre #ca7749 », 202 119 73) et celui du titre sont déclarées, en plus des six rôles du style",
    graphic.includes(`<Color Self="Color/Libre-ca7749" Model="Process" Space="RGB" ColorValue="202 119 73" Name="${nomDeCouleur("#ca7749").replace(/^./, (x) => x.toUpperCase())} #ca7749"/>`)
      && graphic.includes(`Self="Color/Libre-1f3a5c"`) && graphic.includes(`Self="Color/Accent"`) && (graphic.match(/Self="Color\/Libre-ca7749"/g) ?? []).length === 1);
  ok("IDML : le fond des pages : « Fond » (double, nuance Accent), « Fond droite » (page 1, Libre), « Fond gauche » (Aplat clair), des rectangles sans contour sur le calque",
    /<Rectangle [^>]*Name="Fond" [^>]*FillColor="Color\/Accent" StrokeWeight="0"/.test(spreads) && /<Rectangle [^>]*Name="Fond droite" [^>]*FillColor="Color\/Libre-ca7749"/.test(spreads)
      && /<Rectangle [^>]*Name="Fond gauche" [^>]*FillColor="Color\/AplatClair"/.test(spreads) && (spreads.match(/Name="Fond/g) ?? []).length === 3 && /Name="Fond"[^>]*ItemLayer="ly1"/.test(spreads));
  ok("IDML : la couleur du texte : le titre porte `FillColor=\"Color/Libre-1f3a5c\"` dans sa plage, le reste du style ne change pas",
    /<CharacterStyleRange [^>]*FillColor="Color\/Libre-1f3a5c"[^>]*>(?:(?!<\/CharacterStyleRange>).)*Funchal/.test(stories));
  const declarees = new Set([...graphic.matchAll(/<Color Self="([^"]+)"/g)].map((x) => x[1]));
  const utilisees = new Set([...`${spreads}${stories}`.matchAll(/(?:FillColor|StrokeColor)="([^"]+)"/g)].map((x) => x[1]));
  ok("IDML : aucune nuance ORPHELINE (tout FillColor et StrokeColor des planches et des textes est déclaré dans Graphic.xml)", [...utilisees].every((u) => declarees.has(u) || u === "Swatch/None"));
  const nu = construireIdml({ ...colore, style: undefined } as Magazine, PHOTOS_EXPORT, { liens: { mode: "relatif" } });
  const gNu = lireIdml(nu, "Resources/Graphic.xml");
  ok("IDML SANS style : un rôle posé (Aplat clair, Accent) est déclaré avec la valeur d'origine, l'ancienne nuance « Aplat » reste, le texte libre garde la sienne",
    gNu.includes(`<Color Self="Color/AplatClair" Model="Process" Space="RGB" ColorValue="${hexVersRgb(COULEURS_ORIGINE.aplatClair).join(" ")}" Name="Aplat clair"/>`)
      && gNu.includes(`Self="Color/Accent"`) && gNu.includes(`Self="Color/Aplat"`) && lireIdml(nu, "Stories/").includes(`FillColor="Color/Libre-1f3a5c"`));
  const vierge = construireIdml(m0, PHOTOS_EXPORT, { liens: { mode: "relatif" } });
  ok("IDML : sans couleur libre, Graphic.xml est celui d'avant (Black, Paper, Aplat) et aucun « Fond » n'est écrit",
    !lireIdml(vierge, "Resources/Graphic.xml").includes("Libre") && !lireIdml(vierge, "Spreads/").includes('Name="Fond') && (lireIdml(vierge, "Resources/Graphic.xml").match(/<Color /g) ?? []).length === 3);
  const idCouv = construireIdmlCouverture(couverturePourExport(couv, null, style), PHOTOS_EXPORT, { liens: { mode: "relatif" }, dosMm: 3, style });
  const stCouv = lireIdml(idCouv, "Stories/");
  const plageMot = /<CharacterStyleRange [^>]*>(?:(?!<\/CharacterStyleRange>).)*MADÈRE/.exec(stCouv)?.[0] ?? "";
  ok("IDML couverture : le mot-titre blanc du gabarit, passé à l'encre, n'a plus `FillColor=Papier` (l'encre est celle du style de paragraphe)",
    plageMot.length > 0 && !plageMot.includes("FillColor") && couvertureNeuve("CV-01").textes.length > 0);
  ok("nuances : `nuanceIdml` nomme un rôle sous un style sans le redéclarer, déclare un rôle sans style (le papier reste Color/Paper), et nomme un hexa « Libre »",
    nuanceIdml("accent", true).declarer === null && nuanceIdml("accent", false).declarer?.includes('ColorValue="133 96 69"') === true && nuanceIdml("papier", false).self === "Color/Paper"
      && nuanceIdml("#ca7749", true).self === "Color/Libre-ca7749");
  ok("écran : un rôle se lit dans sa variable CSS (`--mep-r-aplat-clair`), un hexa tel quel ; sans style, un rôle a sa valeur d'origine",
    cssDeCouleur("aplatClair") === "var(--mep-r-aplat-clair)" && cssDeCouleur("#ca7749") === "#ca7749" && hexDeCouleur("accent", null) === COULEURS_ORIGINE.accent && hexDeCouleur("accent", style) === "#a46849");
  ok("écran : les pièces du fond sans fond perdu restent dans la planche (0 à 420 × 0 à 297), une double d'un seul tenant",
    r(piecesDuFond({ gauche: "nuit", droite: "nuit" }, null, { perdu: false })[0].rect) === "0,0,420,297" && r(piecesDuFond({ droite: "nuit" }, "droite", { perdu: false })[0].rect) === "210,0,210,297"
      && piecesDuFond({ gauche: "nuit", droite: "accent" }, null, { perdu: false }).length === 2 && piecesDuFond(undefined, null, { perdu: true }).length === 0
      && planPdf({ ...m0, planches: m0.planches.map((p, i) => (i === 0 ? { ...p, fond: { droite: "nuit" as const } } : p)) })[0].objets.filter((o) => o.type === "fond").length === 1);
}
