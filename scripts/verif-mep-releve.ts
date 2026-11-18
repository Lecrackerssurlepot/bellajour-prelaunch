/**
 * Les tests du RELEVÉ DES DIFFÉRENCES (18/11/2026, « je repasserai après toi »), lancés par `verif-atelier.ts` (et seuls :
 * `npx tsx --tsconfig tsconfig.json scripts/verif-mep-releve.ts`). Sans base ni réseau : un lot FABRIQUÉ composé par le compositeur v2,
 * chargé dans l'éditeur par le geste `chargerPremierJet`, puis une dizaine de gestes de l'atelier joués par le VRAI réducteur
 * (`appliquer`) : chaque geste doit rendre la bonne différence, rattachée à la règle de la décision de la machine ; aucun geste, aucune
 * différence ; déterminisme ; les leçons `ecart_proposition` (règle, versions) ; `correctionsParRegle` les compte ; M-01.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { composer, REGLAGES_V2_DEFAUT, type EntreeCompo, type PhotoCompo, type ResultatCompo } from "@/lib/mise-en-page/compositeur";
import { leconsDesDifferences, releverDifferences, REGLES_PAR_DEFAUT, type Difference, type PropositionGardee } from "@/lib/mise-en-page/compositeur/releve";
import * as O from "@/lib/mise-en-page/editeur";
import { leconValide } from "@/lib/mise-en-page/editeur/lecons";
import { cadresDe, tousLesTemplates, type Magazine } from "@/lib/mise-en-page/magazine";
import { GABARITS_COUVERTURE } from "@/lib/mise-en-page/couverture";
import { correctionsParRegle } from "@/lib/mise-en-page/regles/retours";
import { versionRegles } from "@/lib/mise-en-page/regles";
import type { EtatEditeur, PhotoMaq } from "@/lib/mise-en-page/editeur/types";
import { motsDeProjet } from "./regles-mots-interdits";

type Rapporter = (nom: string, reussi: boolean) => void;

/* ─────────────── un lot fabriqué (déterministe), une proposition composée ─────────────── */

function graine(n: number): () => number { let s = n >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const DIMS = { L: [4032, 3024], P: [3024, 4032], U: [4000, 1800] } as const;

function photos(): PhotoCompo[] {
  const r = graine(23);
  const out: PhotoCompo[] = [];
  for (let j = 0; j < 8; j++) for (let k = 0; k < 6; k++) {
    const i = j * 6 + k, x = r();
    const forme = x < 0.5 ? "L" : x < 0.85 ? "P" : "U";
    const [l, h] = DIMS[forme];
    const nv = r() < 0.35 ? 2 : 0;
    out.push({
      id: `r${i}`, nom: `R_${String(i).padStart(4, "0")}.JPG`, l, h, date: `2025-08-${String(1 + j).padStart(2, "0")}T${String(9 + 2 * k).padStart(2, "0")}:10:00`, netteteRel: 1,
      visages: Array.from({ length: nv }, (_, q) => ({ x: 0.35 + 0.12 * q, y: 0.3, l: 0.07, h: 0.09 })), zone: { x: 0.25, y: 0.2, l: 0.5, h: 0.6 },
      palette: ["#4a6fa5", "#d9c7a7", "#2b2b2b"], calme: "haut", moment: `2025-08-${j}-${Math.floor(k / 2)}`, ecart: null,
      ia: { interet: 0.35 + 0.6 * r(), role: "satellite", sujet: nv ? "personnes" : "paysage", plan: nv ? "moyen" : "large", personnes: nv ? "2" : "0", momentJournee: "jour", ambiance: "calme", lieuLu: null, couverture: r() < 0.2 },
      chapitre: null,
    });
  }
  return out;
}

const entree = (p: PhotoCompo[]): EntreeCompo => ({
  photos: p, voyage: null, lieux: null, fiche: { taille: 24 }, titre: "Essai relevé", piles: 0, quand: "2026-11-18T00:00:00.000Z", v2: { ...REGLAGES_V2_DEFAUT, recadrage: "normal" },
});

const maq = (p: PhotoCompo): PhotoMaq => ({
  id: p.id, nom: p.nom, l: p.l, h: p.h, date: p.date, personne: "atelier", lien: null, type: "atelier", coeur: false, signalee: false, autresMagazines: [], nouvelle: false, vignette: null,
});

/** La proposition chargée dans l'éditeur, et ce que le projet en garde. */
function charger(r: ResultatCompo, p: PhotoCompo[]): { e: EtatEditeur; prop: PropositionGardee } {
  let e = O.creerEtat({ magazine: { version: 1, id: "mag-releve", titre: "Essai relevé", planches: [], creeLe: "2026-11-18T00:00:00.000Z", modifieLe: "2026-11-18T00:00:00.000Z" } as unknown as Magazine, catalogue: new Map(p.map((x) => [x.id, maq(x)])) });
  e = O.appliquer(e, { type: "chargerPremierJet", jet: r.jet, confirme: true });
  const prop: PropositionGardee = {
    magazine: JSON.parse(JSON.stringify(e.magazine)) as Magazine, versionRegles: versionRegles(), reglages: { v2: { ...REGLAGES_V2_DEFAUT, recadrage: "normal" }, fiche: { taille: 24 } },
    quand: "2026-11-18T00:00:00.000Z", selection: r.selection, decisions: r.decisions, ...(r.doubles ? { doubles: r.doubles } : {}),
  };
  return { e, prop };
}

const geste = (e: EtatEditeur, g: Parameters<typeof O.appliquer>[1]): EtatEditeur => O.appliquer(e, g);

/** Les doubles intérieures qui portent des photos, avec leurs photos. */
function doubles(m: Magazine): { id: string; i: number; cible: "double" | "gauche" | "droite"; ids: string[] }[] {
  const out: { id: string; i: number; cible: "double" | "gauche" | "droite"; ids: string[] }[] = [];
  m.planches.forEach((p, i) => {
    if (i === 0 || i === m.planches.length - 1) return;
    for (const [c, d] of (p.mode === "double" ? [["double", p.double]] : [["gauche", p.gauche], ["droite", p.droite]]) as ["double" | "gauche" | "droite", typeof p.double][]) {
      const ids = d?.photos.map((a) => a.photoId).filter((x): x is string => !!x) ?? [];
      if (ids.length) out.push({ id: p.id, i, cible: c, ids });
    }
  });
  return out;
}

export async function verifierMepReleve(ok: Rapporter, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, le relevé des différences (« je repasserai après toi ») —");
  const lot = photos();
  const r = composer(entree(lot));
  const { e: e0, prop } = charger(r, lot);
  const D = doubles(e0.magazine);
  ok("relevé : la proposition chargée a des doubles posées et une réserve", D.length >= 3 && r.selection.photos.some((x) => x.etat === "reserve"));

  /* aucun geste, aucune différence ; déterminisme */
  const rien = releverDifferences(prop, e0.magazine);
  ok("relevé : aucun geste, aucune différence", rien.length === 0);

  const types = (l: Difference[]) => l.map((d) => d.type);
  const cherche = (l: Difference[], t: Difference["type"], photo?: string) => l.find((d) => d.type === t && (photo === undefined || d.photo === photo));
  const reglesDeLaPhoto = (id: string) => r.selection.photos.find((x) => x.id === id)?.regles ?? [];

  /* 1. faire entrer une photo de la réserve (dans un cadre : elle remplace, donc une retirée aussi) */
  const res = r.selection.photos.find((x) => x.etat === "reserve" && x.regles.length)!;
  const d0 = D[0];
  const sortie = d0.ids[0];
  let e = geste(e0, { type: "remplacer", ref: { plancheId: d0.id, cible: d0.cible, index: 0 }, photoId: res.id, confirme: true });
  let l = releverDifferences(prop, e.magazine);
  const aj = cherche(l, "photo_ajoutee", res.id), re = cherche(l, "photo_retiree", sortie);
  ok("relevé 1 : une photo de la réserve entrée = « Photo ajoutée depuis la réserve », rattachée aux règles de sa mise en réserve", !!aj && aj.phrase === "Photo ajoutée depuis la réserve" && aj.avant === "reserve" && aj.regles.join() === [...new Set(res.regles)].join() && aj.decision === res.raison);
  ok("relevé 1 : la photo qu'elle remplace est « Photo retirée », rattachée à sa raison de pose", !!re && re.regles.join() === [...new Set(reglesDeLaPhoto(sortie))].join() && re.ou === `Double ${d0.i}`);

  /* 2. retirer une photo */
  const d1 = D[1];
  e = geste(e0, { type: "retirer", ref: { plancheId: d1.id, cible: d1.cible, index: d1.ids.length - 1 }, confirme: true });
  l = releverDifferences(prop, e.magazine);
  const retiree = d1.ids[d1.ids.length - 1];
  ok("relevé 2 : retirer une photo = « Photo retirée » sur sa double", !!cherche(l, "photo_retiree", retiree) && cherche(l, "photo_retiree", retiree)!.ou === `Double ${d1.i}`);

  /* 3. agrandir ou réduire : un autre gabarit du même nombre de photos qui change la surface d'un cadre de plus de 20 % */
  const pl = e0.magazine.planches[d1.i];
  const disp = d1.cible === "double" ? pl.double! : pl[d1.cible]!;
  const portee = d1.cible === "double" ? "double" : "page";
  const aires = (tid: string) => { const dd = { ...disp, templateId: tid, cadres: undefined }; return cadresDe(dd, d1.cible).filter((c) => c.role === "photo").map((c) => c.l * c.h); };
  const a0 = cadresDe(disp, d1.cible).filter((c) => c.role === "photo").map((c) => c.l * c.h);
  const autre = tousLesTemplates().find((t) => t.portee === portee && t.nbPhotos === d1.ids.length && t.id !== disp.templateId && (() => { const a = aires(t.id); return a.length === a0.length && a.some((v, k) => v > a0[k] * 1.3 || v < a0[k] / 1.3); })());
  if (autre) {
    e = geste(e0, { type: "choisirGabarit", plancheId: d1.id, cible: d1.cible, templateId: autre.id, confirme: true });
    l = releverDifferences(prop, e.magazine);
    const g = cherche(l, "gabarit_change");
    const taille = l.find((d) => d.type === "photo_agrandie" || d.type === "photo_reduite");
    const pq = r.doubles?.find((x) => x.planche === d1.i);
    ok("relevé 3 : changer de gabarit = « Gabarit changé », rattaché aux décisions de pose de la planche", !!g && g.regles.length > 0 && g.ou === `Double ${d1.i}`);
    ok("relevé 4 : une photo dont le cadre change de plus de 20 % = agrandie ou réduite, rattachée à « N photos ici parce que… »", !!taille && !!pq && taille.regles.join() === [...new Set(pq.regles)].join() && taille.decision === pq.phrase);
  } else { ok("relevé 3 : un autre gabarit du même nombre existe", false); }

  /* 5. déplacer une photo d'une double à une autre */
  const d2 = D[2];
  const bouge = d2.ids[0];
  e = geste(e0, { type: "deplacerPhoto", de: { plancheId: d2.id, cible: d2.cible, index: 0 }, vers: { plancheId: D[0].id, cible: D[0].cible }, confirme: true });
  l = releverDifferences(prop, e.magazine);
  const dep = cherche(l, "photo_deplacee", bouge);
  ok("relevé 5 : déplacer une photo = « Photo déplacée en double N », avant et après nommés", !!dep && dep.avant === `Double ${d2.i}` && dep.apres === `Double ${D[0].i}` && dep.phrase.startsWith("Photo déplacée en double"));

  /* 6. recadrer */
  e = geste(e0, { type: "ouvrirRecadrage", ref: { plancheId: d2.id, cible: d2.cible, index: 0 } });
  e = geste(e, { type: "zoomerImage", zoom: 1.6 });
  e = geste(e, { type: "fermerRecadrage" });
  l = releverDifferences(prop, e.magazine);
  const rc = cherche(l, "recadrage_change", bouge);
  ok("relevé 6 : recadrer = « Recadrage changé », rattaché à M-29 et à la règle de la photo", !!rc && rc.regles[0] === "M-29" && rc.apres === "×1.60");

  /* 7. écrire un texte : la page 1 porte le titre */
  const p1 = e0.magazine.planches[0];
  const nTextes = (p1.droite?.textes.length ?? 0);
  if (nTextes) {
    e = geste(e0, { type: "ouvrirTexte", ref: { plancheId: p1.id, cible: "droite", index: 0 } });
    e = geste(e, { type: "taper", contenu: "Un été autrement" });
    e = geste(e, { type: "fermerTexte" });
    l = releverDifferences(prop, e.magazine);
    const t = cherche(l, "texte_change");
    ok("relevé 7 : écrire un texte = « Texte changé » sur la page 1, avant et après", !!t && t.ou === "Page 1" && (t.apres ?? "").includes("Un été autrement") && t.regles.join() === REGLES_PAR_DEFAUT.texte_change.join());
  } else ok("relevé 7 : la page 1 porte un texte à écrire", false);

  /* 8. ajouter une double */
  e = geste(e0, { type: "insererDouble", apres: D[0].id, confirme: true });
  l = releverDifferences(prop, e.magazine);
  ok("relevé 8 : insérer une double = « Double ajoutée » (et rien d'autre)", types(l).join() === "double_ajoutee" && l[0].regles.join() === REGLES_PAR_DEFAUT.double_ajoutee.join());

  /* 9. supprimer une double : « Double supprimée », rattachée à sa phrase, et ses photos retirées */
  e = geste(e0, { type: "supprimerPlanche", plancheId: D[1].id, confirme: true });
  l = releverDifferences(prop, e.magazine);
  const sup = cherche(l, "double_supprimee");
  ok("relevé 9 : supprimer une double = « Double supprimée », rattachée à sa décision, ses photos retirées", !!sup && sup.ou === `Double ${D[1].i}` && sup.regles.length > 0 && D[1].ids.every((id) => !!cherche(l, "photo_retiree", id)));

  /* 10. la couverture : un autre gabarit, ou une autre photo */
  const cv = e0.magazine.couverture;
  if (cv) {
    const autreCv = GABARITS_COUVERTURE.find((g) => g.id !== cv.templateId);
    e = autreCv ? geste(e0, { type: "choisirGabarit", plancheId: "couverture", cible: "double", templateId: autreCv.id, confirme: true }) : e0;
    l = releverDifferences(prop, e.magazine);
    ok("relevé 10 : la couverture changée = une différence « Couverture », rattachée à M-03", !!autreCv && l.some((d) => d.ou === "Couverture" && d.regles[0] === "M-03"));
  } else {
    const m = { ...e0.magazine, couverture: { templateId: "CV-01", photos: [{ photoId: D[0].ids[0], recadrage: { zoom: 1, dx: 0, dy: 0 } }], textes: [] } } as Magazine;
    l = releverDifferences(prop, m);
    ok("relevé 10 : la couverture posée par l'atelier = « Photo de couverture changée », M-03", !!cherche(l, "couverture_photo") && cherche(l, "couverture_photo")!.regles[0] === "M-03");
  }

  /* les gestes mêlés : déterminisme, tri stable, phrases courtes */
  let m = geste(e0, { type: "retirer", ref: { plancheId: d1.id, cible: d1.cible, index: 0 }, confirme: true });
  m = geste(m, { type: "insererDouble", apres: D[2].id, confirme: true });
  m = geste(m, { type: "deplacerPhoto", de: { plancheId: d2.id, cible: d2.cible, index: 0 }, vers: { plancheId: D[0].id, cible: D[0].cible }, confirme: true });
  const x1 = releverDifferences(prop, m.magazine), x2 = releverDifferences(JSON.parse(JSON.stringify(prop)) as PropositionGardee, JSON.parse(JSON.stringify(m.magazine)) as Magazine);
  ok("relevé : déterministe (deux relevés des mêmes données, copiées, identiques)", x1.length >= 3 && JSON.stringify(x1) === JSON.stringify(x2));
  ok("relevé : une phrase de 2 à 6 mots, sans cadratin, à chaque différence", x1.every((d) => { const n = d.phrase.split(/\s+/).length; return n >= 2 && n <= 6 && !d.phrase.includes("—"); }));
  ok("relevé : chaque différence cite au moins une règle", x1.every((d) => d.regles.length > 0));

  /* les leçons */
  const lecons = leconsDesDifferences(x1, { versionRegles: prop.versionRegles, reglages: prop.reglages });
  ok("relevé : une leçon `ecart_proposition` par différence, relue valide par le serveur (`leconValide`)", lecons.length === x1.length && lecons.every((x) => x.type === "ecart_proposition" && leconValide(x)));
  ok("relevé : la leçon porte la règle principale, la version des règles et les réglages", lecons.every((x, k) => x.regle === x1[k].regles.find((y) => y.length <= 8) && x.proposition.includes(prop.versionRegles) && x.proposition.includes("recadrage normal")));
  const comptes = correctionsParRegle(lecons.map((x) => ({ regle: x.regle, type: x.type, quand: "2026-11-18T10:00:00.000Z" })));
  const attendu = new Map<string, number>();
  for (const x of lecons) attendu.set(x.regle, (attendu.get(x.regle) ?? 0) + 1);
  ok("relevé : `correctionsParRegle` compte les écarts par règle (l'écran « Règles »)", [...attendu].every(([k, n]) => comptes[k]?.corrections === n));
  ok("relevé : sous le type de repli d'avant la migration (`pretri_renverse`), le compte par règle est le même", JSON.stringify(correctionsParRegle(lecons.map((x) => ({ regle: x.regle, type: "pretri_renverse" })))) === JSON.stringify(correctionsParRegle(lecons.map((x) => ({ regle: x.regle, type: x.type })))));

  /* la route : le repli sous un type admis, la migration écrite et jamais appliquée par le code */
  const racine = join(__dirname, "..");
  const route = readFileSync(join(racine, "src/app/api/admin/atelier/mise-en-page/lecons/route.ts"), "utf8");
  const mig = readFileSync(join(racine, "supabase/migrations/20261119_mep_lecons_ecart_proposition.sql"), "utf8");
  ok("relevé : la route renvoie une leçon d'écart refusée (23514) sous `pretri_renverse`, rien ne bloque", /ecart_proposition/.test(route) && /enRepliEcart/.test(route) && /23514/.test(route));
  ok("relevé : la migration 20261119 ajoute `ecart_proposition` à la contrainte sans perdre un type d'avant", ["floue_gardee", "pile_autre_gardee", "pile_pas_un_doublon", "tete_ecartee", "pretri_renverse", "tag_corrige", "ecart_proposition", "reponse", "ouverture", "export"].every((t) => mig.includes(`'${t}'`)));

  /* M-01 : aucun nom de client ni de projet dans le module */
  const fautif = motsDeProjet(readFileSync(join(racine, "src/lib/mise-en-page/compositeur/releve.ts"), "utf8"));
  ok(`relevé : M-01, aucun nom de client ni de projet dans releve.ts${fautif.length ? ` (${fautif.join(", ")})` : ""}`, fautif.length === 0);
}

if (process.argv[1]?.endsWith("verif-mep-releve.ts")) {
  let echecs = 0;
  void verifierMepReleve((nom, reussi) => { if (!reussi) echecs++; console.log(`${reussi ? "OK " : "ÉCHEC"} ${nom}`); }, (t) => console.log(`\n${t}`)).then(() => { console.log(echecs ? `\n${echecs} échec(s)` : "\nTOUT PASSE"); process.exit(echecs ? 1 : 0); });
}
