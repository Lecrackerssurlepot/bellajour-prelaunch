/**
 * Les invariants (I1 à I32, plus I16 bis et T41) : ce que l'éditeur ne doit JAMAIS laisser casser.
 * `verifierInvariants(etat)` lit un état seul ; avec `avant` et le geste, il vérifie aussi la transition en
 * rejouant le plan à blanc. Vide = tout tient. C'est le filet des tests (verif-mep-editeur.ts), jamais appelé
 * par l'écran en production.
 */

import { TEMPLATE_LIBRE, cadresPropres, dispositionDe, templateParId, utilisations, type Cible, type Magazine } from "../magazine";
import { cadrer } from "../recadrage";
import { contenuValide } from "../sauvegarde";
import { styleValide } from "../style";
import { MODIFIANTS, estModifiant, lectureSeule, numeroDe, preparer } from "./etat";
import { planifier } from "./plans";
import { cibleSurPlanche, gabaritsClasses, precedentDe, refPour, type CatalogueRef } from "./operations";
import {
  HISTORIQUE_MAX, affectation, egal, estNeutre, idsDispo, idsMagazine, idsPlanche, indexPlanche, maxDe, photosDe,
  plancheDe, porteeDe, saisi,
} from "./outils";
import type { EtatEditeur, GestePrimitif, Geste, Plan } from "./types";
import { ID_COUVERTURE, cadresPhotoCouverture, gabaritCouverture, idsCouverture } from "../couverture";

function multiset(ids: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) || 0) + 1);
  return m;
}
function diffMultiset(avant: readonly string[], apres: readonly string[]): { plus: string[]; moins: string[] } {
  const a = multiset(avant), b = multiset(apres);
  const plus: string[] = [], moins: string[] = [];
  for (const [k, n] of b) for (let i = (a.get(k) || 0); i < n; i++) plus.push(k);
  for (const [k, n] of a) for (let i = (b.get(k) || 0); i < n; i++) moins.push(k);
  return { plus: plus.sort(), moins: moins.sort() };
}
const memes = (x: readonly string[], y: readonly string[]): boolean => egal([...x].sort(), [...y].sort());
const saisisDe = (m: Magazine): number => {
  let n = 0;
  for (const p of m.planches) for (const d of [p.double, p.gauche, p.droite]) if (d) n += d.textes.filter(saisi).length;
  return n;
};

/** I1 à I10, I16, I29, I31, plus la forme de l'historique : ce qui se lit sur un état seul. */
function invariantsStatiques(e: EtatEditeur, err: string[]): void {
  const m = e.magazine;
  if (!contenuValide(m)) err.push("I1 contenuValide faux");
  if (!m.planches.length) { err.push("I5 aucune planche"); return; }
  const ids = new Set<string>();
  const direct = new Map<string, number>();
  m.planches.forEach((p) => {
    if (ids.has(p.id)) err.push(`I6 id de planche en double : ${p.id}`);
    ids.add(p.id);
    if (p.mode === "double" && (p.gauche !== null || p.droite !== null)) err.push(`I4 ${p.id} double avec pages`);
    if (p.mode === "pages" && p.double !== null) err.push(`I4 ${p.id} pages avec double`);
    const vus = new Set<string>();
    const dispos: [Cible, typeof p.double][] = [["double", p.double], ["gauche", p.gauche], ["droite", p.droite]];
    for (const [cible, d] of dispos) {
      if (!d) continue;
      const t = templateParId(d.templateId);
      /* lot 4 : une disposition retouchée lit ses propres cadres ; sinon le gabarit doit exister, à la bonne portée */
      if (!d.cadres) {
        if (!t) { err.push(`I3 gabarit inconnu ${d.templateId}`); continue; }
        if (t.portee !== porteeDe(cible)) err.push(`I3 portée ${d.templateId} sur ${cible}`);
      } else if (!t && d.templateId !== TEMPLATE_LIBRE && !d.templateId.startsWith("M-")) err.push(`I3 gabarit retouché inconnu ${d.templateId}`);
      if (d.miroir && cible !== "double") err.push(`L4 miroir sur une page ${p.id}/${cible}`);
      const propres = cadresPropres(d) ?? [];
      const cP = propres.filter((c) => c.role === "photo");
      if (d.photos.length !== cP.length) err.push(`I2 ${p.id}/${cible} photos ${d.photos.length} ≠ ${cP.length}`);
      if (d.textes.length !== propres.length - cP.length) err.push(`I2 ${p.id}/${cible} textes`);
      if (d.cadres) {
        const xMin = cible === "double" ? -3 : 0, xMax = cible === "double" ? 423 : 213;
        for (const c of d.cadres) if (c.role === "photo" && (c.l < 10 - 1e-9 || c.h < 10 - 1e-9 || c.x < xMin - 1e-9 || c.x + c.l > xMax + 1e-9 || c.y < -3 - 1e-9 || c.y + c.h > 300 + 1e-9)) err.push(`L4 cadre retouché hors de la page ${p.id}/${cible}`);
      }
      const n = idsDispo(d).length;
      if (n > maxDe(porteeDe(cible))) err.push(`I7 ${p.id}/${cible} ${n} photos`);
      if (n === 0) err.push(`I8 ${p.id}/${cible} disposition sans photo`);
      if (d.photos.some((a) => !a.photoId)) err.push(`I8 ${p.id}/${cible} cadre vide`);
      d.photos.forEach((a, k) => {
        if (a.photoId) {
          if (vus.has(a.photoId)) err.push(`I9 ${a.photoId} deux fois sur ${p.id}`);
          vus.add(a.photoId);
          direct.set(a.photoId, (direct.get(a.photoId) || 0) + 1);
        }
        const r = a.recadrage;
        if (!(Number.isFinite(r.zoom) && r.zoom >= 1 && r.zoom <= 8 && Number.isFinite(r.dx) && Number.isFinite(r.dy))) err.push(`I16 recadrage hors bornes ${p.id}/${cible}/${k}`);
        const c = cP[k];
        if (c && a.photoId) {
          const g = cadrer(refPour(e.catalogue, a.photoId), c, r);
          const eps = 1e-9;
          if (!(g.l >= c.l - eps && g.h >= c.h - eps && g.x <= eps && g.y <= eps && g.x + g.l >= c.l - eps && g.y + g.h >= c.h - eps)) err.push(`I16 blanc dans ${p.id}/${cible}/${k}`);
          if (Math.abs(g.dx - r.dx) > 1e-9 || Math.abs(g.dy - r.dy) > 1e-9) err.push(`I16 bis recadrage stocké hors bornes ${p.id}/${cible}/${k}`);
        }
      });
    }
  });
  /* lot B : la couverture, si elle existe, tient comme une disposition (gabarit connu, comptes, recadrages, une photo une fois) */
  if (m.couverture) {
    const c = m.couverture;
    const g = gabaritCouverture(c.templateId);
    if (!g) err.push(`C1 gabarit de couverture inconnu ${c.templateId}`);
    else {
      const cP = cadresPhotoCouverture(g);
      if (c.photos.length !== cP.length || c.textes.length !== g.cadres.length - cP.length) err.push("C2 couverture : comptes faux");
      const vus = new Set<string>();
      c.photos.forEach((a, k) => {
        if (a.photoId) {
          if (vus.has(a.photoId)) err.push(`C3 ${a.photoId} deux fois sur la couverture`);
          vus.add(a.photoId);
          direct.set(a.photoId, (direct.get(a.photoId) || 0) + 1);
          const cd = cP[k];
          if (cd) {
            const k2 = cadrer(refPour(e.catalogue, a.photoId), cd, a.recadrage);
            if (!(k2.l >= cd.l - 1e-9 && k2.h >= cd.h - 1e-9 && k2.x <= 1e-9 && k2.y <= 1e-9)) err.push(`C4 blanc dans la couverture ${k}`);
          }
        }
        const r = a.recadrage;
        if (!(Number.isFinite(r.zoom) && r.zoom >= 1 && r.zoom <= 8 && Number.isFinite(r.dx) && Number.isFinite(r.dy))) err.push(`C4 recadrage de couverture hors bornes ${k}`);
      });
    }
  }
  const p0 = m.planches[0];
  if (p0.mode !== "pages" || p0.gauche !== null) err.push("I5 planche 1 mal formée");
  if (p0.id !== e.premiereId) err.push(`I5 id de la planche 1 changé : ${p0.id} ≠ ${e.premiereId}`);
  if (!egal(utilisations(m), direct)) err.push("I10 utilisations ≠ décompte direct");
  if (e.plancheCourante !== ID_COUVERTURE && indexPlanche(m, e.plancheCourante) < 0) err.push("I29 planche courante absente");
  if (e.selection.ids.length) {
    if (!e.selection.ids.every((id) => e.catalogue.has(id))) err.push("I31 sélection hors du catalogue");
    if (new Set(e.selection.ids).size !== e.selection.ids.length) err.push("I31 doublon dans la sélection");
  }
  if (e.historique.passe.length > HISTORIQUE_MAX) err.push("I43 historique au-delà de 200");
  if (m.planches.some((p) => numeroDe(p.id) >= e.prochainNumero)) err.push("I6 compteur de planches en retard");
}

/** I19 : le gabarit d'une cible recomposée est le premier de `gabaritsClasses`. */
function verifierChoix(m: Magazine, plancheId: string, cat: CatalogueRef, err: string[], op: string, seule?: Cible): void {
  const i = indexPlanche(m, plancheId);
  if (i < 0) return;
  const p = m.planches[i];
  const cibles: Cible[] = seule ? [seule] : p.mode === "double" ? ["double"] : ["gauche", "droite"];
  for (const cible of cibles) {
    const d = dispositionDe(p, cible);
    if (!d || d.cadres) continue;
    const premier = gabaritsClasses(porteeDe(cible), idsDispo(d).map((id) => refPour(cat, id)), precedentDe(m, i, cible))[0];
    if (!premier || premier.template.id !== d.templateId) err.push(`I19 ${op} ${plancheId}/${cible} : ${d.templateId} au lieu de ${premier && premier.template.id}`);
  }
}

/** I12 à I15, I17 à I19, I21, I23, I24 : ce qu'une opération pure doit tenir. */
function verifierOperation(plan: Plan, mAvant: Magazine, cat: CatalogueRef, err: string[]): void {
  const is = plan.issue;
  const m2 = is.magazine;
  const op = plan.op;
  if (is.refus && m2 !== mAvant) err.push(`I21 ${op} refusé mais magazine changé`);
  if (op === "deplacerPhoto" && is.refus && m2 !== mAvant) err.push("I23 déplacement refusé non atomique");
  if (is.refus || op === "rien") return;
  if (m2 === mAvant) err.push(`I21 ${op} sans refus mais même référence`);
  const { plus, moins } = diffMultiset(idsMagazine(mAvant), idsMagazine(m2));
  const ancienIds = new Set(idsMagazine(mAvant));
  for (const id of plus) if (!cat.has(id) && !ancienIds.has(id)) err.push(`I11 id inconnu introduit : ${id}`);
  const a = plan.args;
  /* lot B : un geste de couverture ne touche jamais l'intérieur, et son bilan se lit sur la couverture */
  if (op.startsWith("couv")) {
    if (m2.planches !== mAvant.planches) err.push(`C5 ${op} a touché l'intérieur`);
    const cA = idsCouverture(mAvant.couverture), cB = idsCouverture(m2.couverture);
    const d = diffMultiset(cA, cB);
    if (!egal(d, { plus, moins })) err.push(`C5 ${op} bilan hors de la couverture`);
    if (op === "couvPoser" && !is.echange && (!egal(plus, [a.photoId]) || !egal(moins, is.retiree ? [is.retiree] : []))) err.push(`C6 couvPoser bilan faux (+${plus} −${moins})`);
    if ((op === "couvEchanger" || (op === "couvPoser" && is.echange) || op === "couvPages") && (plus.length || moins.length)) err.push(`C6 ${op} bilan non nul`);
    if (op === "couvRetirer" && (plus.length || !egal(moins, is.retiree ? [is.retiree] : ["?"]))) err.push("C6 couvRetirer bilan faux");
    if (op === "couvGabarit" && (plus.length || !memes(moins, is.restees))) err.push(`C6 couvGabarit : les photos perdues ne sont pas les restées (+${plus} −${moins} restées ${is.restees})`);
    return;
  }
  switch (op) {
    case "ajouter": case "ajouterSurPlanche": {
      if (!memes(plus, is.posees) || moins.length) err.push(`I12 ${op} bilan faux (+${plus} −${moins} posées ${is.posees})`);
      const demandees = (a.ids ?? []).length;
      if (is.posees.length + is.restees.length + is.dejaLa + is.ignorees !== demandees) err.push(`I13 ${op} compte ${is.posees.length}+${is.restees.length}+${is.dejaLa}+${is.ignorees} ≠ ${demandees}`);
      const pA = a.plancheId ? plancheDe(mAvant, a.plancheId) : null, pB = a.plancheId ? plancheDe(m2, a.plancheId) : null;
      if (a.plancheId && pA && pB) {
        const avantIds = idsPlanche(pA), apresIds = idsPlanche(pB).filter((id) => avantIds.includes(id));
        if (!egal(avantIds, apresIds)) err.push(`I13 ${op} ordre relatif des présentes perdu`);
        for (const x of photosDe(pB)) {
          const d = dispositionDe(pB, x.ref.cible);
          if (x.photoId && is.posees.includes(x.photoId) && d && !estNeutre(d.photos[x.ref.index].recadrage)) err.push("I17 photo ajoutée non neutre");
        }
        const cible = pB.mode === "double" ? "double" : indexPlanche(m2, a.plancheId) === 0 ? "droite" : a.cible ?? cibleSurPlanche(mAvant, a.plancheId) ?? undefined;
        verifierChoix(m2, a.plancheId, cat, err, op, cible);
      }
      break;
    }
    case "retirer": {
      const aff = affectation(mAvant, a.ref);
      if (!a.ref || !aff) break;
      if (plus.length || !egal(moins, [aff.photoId])) err.push(`I12 retirer bilan faux`);
      verifierChoix(m2, a.ref.plancheId, cat, err, op, a.ref.cible);
      break;
    }
    case "remplacer": {
      if (is.echange) { if (plus.length || moins.length) err.push("I12 remplacer (échange) bilan faux"); break; }
      if (!a.ref) break;
      const old = affectation(mAvant, a.ref)?.photoId;
      if (!egal(plus, [a.photoId]) || !egal(moins, [old])) err.push("I12 remplacer bilan faux");
      const r = affectation(m2, a.ref);
      if (!r || r.photoId !== a.photoId || !estNeutre(r.recadrage)) err.push("I17 remplacer : nouvelle photo non neutre");
      const pAv = plancheDe(mAvant, a.ref.plancheId), pAp = plancheDe(m2, a.ref.plancheId);
      const tA = pAv ? dispositionDe(pAv, a.ref.cible)?.templateId : undefined;
      if ((pAp ? dispositionDe(pAp, a.ref.cible)?.templateId : undefined) !== tA) err.push("T17 remplacer a changé le gabarit");
      break;
    }
    case "creerDoubles": {
      if (!memes(plus, is.posees) || moins.length) err.push(`I12 creerDoubles bilan faux`);
      const k = m2.planches.length - mAvant.planches.length;
      if (k !== Math.ceil(is.posees.length / 12)) err.push(`creerDoubles : ${k} planches pour ${is.posees.length} photos`);
      if (m2.planches[0].id !== mAvant.planches[0].id) err.push("I5 planche 1 déplacée par creerDoubles");
      break;
    }
    case "vider": case "supprimerPlanche": {
      const p = a.plancheId ? plancheDe(mAvant, a.plancheId) : null;
      if (!a.plancheId || !p) break;
      if (plus.length || !memes(moins, idsPlanche(p))) err.push(`I12 ${op} bilan faux`);
      if (op === "supprimerPlanche" && indexPlanche(mAvant, a.plancheId) === 0 && m2.planches[0].id !== mAvant.planches[0].id) err.push("I5 planche 1 supprimée");
      break;
    }
    case "poserLibre": {
      /* lot 4 : comme un ajout, mais rien ne se recompose : les cadres d'avant restent, la photo arrive devant */
      if (!memes(plus, is.posees) || moins.length) err.push(`I12 poserLibre bilan faux (+${plus} −${moins})`);
      const demandees = (a.ids ?? []).length;
      if (is.posees.length + is.restees.length + is.dejaLa + is.ignorees !== demandees) err.push("I13 poserLibre compte faux");
      break;
    }
    case "retirerCadres": {
      const cles = new Set<string>();
      const avant = (a.refs ?? []).flatMap((r) => {
        const x = affectation(mAvant, r), k = r ? `${r.plancheId}|${r.cible}|${r.index}` : "";
        if (!x?.photoId || cles.has(k)) return [];
        cles.add(k);
        return [x.photoId];
      });
      if (plus.length || !memes(moins, avant)) err.push(`I12 retirerCadres bilan faux (+${plus} −${moins})`);
      break;
    }
    case "deplacerCadres":
      if (!memes(plus, moins)) err.push(`I12 deplacerCadres a perdu ou gagné une photo (+${plus} −${moins})`);
      break;
    case "miroir": case "placerCadre": case "ajusterCadre": case "calque": {
      if (plus.length || moins.length) err.push(`I12 ${op} bilan non nul (+${plus} −${moins})`);
      const id = a.plancheId ?? a.ref?.plancheId;
      const pA = id ? plancheDe(mAvant, id) : null, pB = id ? plancheDe(m2, id) : null;
      if (!pA || !pB || !memes(idsPlanche(pA), idsPlanche(pB))) err.push(`L4 ${op} a changé les photos de la planche`);
      if (op !== "miroir" && pA && pB && pA.mode !== pB.mode) err.push(`L4 ${op} a changé le mode`);
      if (op === "miroir" && pA && pB && pA.mode === "pages" && (pB.gauche !== pA.droite || pB.droite !== pA.gauche)) err.push("L4 miroir : pages non échangées");
      for (const id2 of mAvant.planches.map((x) => x.id)) if (id2 !== id && plancheDe(mAvant, id2) !== plancheDe(m2, id2)) err.push(`L4 ${op} a touché une autre planche`);
      break;
    }
    case "styler":
      /* lot C : le style ne touche ni une photo ni une planche, et ce qu'il écrit se relit */
      if (plus.length || moins.length || m2.planches !== mAvant.planches) err.push("S1 styler a touché les planches ou les photos");
      if (m2.style !== undefined && !styleValide(m2.style)) err.push("S1 styler a écrit un style invalide");
      break;
    case "hesiter": {
      /* lot 3 : au plus la photo de devant change (intervertir, trancher pour celle de derrière), le gabarit jamais */
      if (plus.length > 1 || plus.length !== moins.length) err.push(`I12 hesiter bilan faux (+${plus} −${moins})`);
      const pAv = a.ref ? plancheDe(mAvant, a.ref.plancheId) : null, pAp = a.ref ? plancheDe(m2, a.ref.plancheId) : null;
      const dAv = pAv && a.ref ? dispositionDe(pAv, a.ref.cible) : null, dAp = pAp && a.ref ? dispositionDe(pAp, a.ref.cible) : null;
      if (!dAv || !dAp || dAv.templateId !== dAp.templateId || !egal(dAv.textes, dAp.textes)) err.push("hesiter a touché le gabarit ou les textes");
      break;
    }
    default:
      if (plus.length || moins.length) err.push(`I12 ${op} bilan non nul (+${plus} −${moins})`);
  }
  if (op === "choisirGabarit" || op === "autreGabarit" || op === "fusionner" || op === "separer") {
    const id = a.plancheId;
    const pAv = id ? plancheDe(mAvant, id) : null, pAp = id ? plancheDe(m2, id) : null;
    if (id && pAv && pAp) {
      const lA = photosDe(pAv).map((x) => x.photoId), lB = photosDe(pAp).map((x) => x.photoId);
      if (!egal(lA, lB)) err.push(`I14 ${op} ordre de lecture changé`);
      if (op === "separer") {
        const g = Math.ceil(lA.length / 2);
        if (!egal(idsDispo(pAp.gauche), lA.slice(0, g)) || !egal(idsDispo(pAp.droite), lA.slice(g))) err.push("I15 séparer mal réparti");
      }
      if (op === "fusionner" || op === "separer") verifierChoix(m2, id, cat, err, op);
    }
  }
  if (op !== "vider" && op !== "supprimerPlanche") {
    const sA = saisisDe(mAvant), sB = saisisDe(m2);
    if (sA !== sB + is.textesPerdus) err.push(`I18 ${op} textes : ${sA} ≠ ${sB} + ${is.textesPerdus}`);
  }
  if (op === "deplacerPlanche") {
    if (m2.planches[0].id !== mAvant.planches[0].id) err.push("I24 planche 1 déplacée");
    if (!memes(m2.planches.map((p) => p.id), mAvant.planches.map((p) => p.id))) err.push("I24 pas une permutation");
  }
  if (op === "insererDouble") {
    if (m2.planches.length !== mAvant.planches.length + 1) err.push("insererDouble : pas une planche de plus");
  }
}

/**
 * Tous les invariants applicables. Sans `avant` : ceux d'un état seul. Avec `avant` et `geste` : aussi ceux
 * de la transition (I11, I12 à I15, I17 à I19, I21, I23, I24, I27, I28, I32), en rejouant le plan à blanc.
 */
export function verifierInvariants(etat: EtatEditeur, avant?: EtatEditeur, geste?: Geste): string[] {
  const err: string[] = [];
  invariantsStatiques(etat, err);
  if (!avant || !geste) return err;
  const { e: ep, g } = preparer(avant, geste);
  const hA = avant.historique, hB = etat.historique;
  const histoire = g.type === "annuler" || g.type === "retablir" || g.type === "prendreSaVersion" || g.type === "recupererCopieLocale";
  const gOp: GestePrimitif = g.type === "confirmer" && ep.confirmation ? ep.confirmation.geste : g;
  if (estModifiant(gOp) && MODIFIANTS.has(gOp.type) && !lectureSeule(ep)) {
    const plan = planifier(ep, gOp);
    if (plan) {
      verifierOperation(plan, ep.magazine, ep.catalogue, err);
      const attenduConf = !plan.issue.refus && !gOp.confirme && plan.issue.posees.some((id) => { const ph = ep.catalogue.get(id); return ph && ph.signalee; });
      if (attenduConf) {
        if (!etat.confirmation || etat.magazine !== ep.magazine) err.push("I32 signalée posée sans confirmation");
      } else if (!egal(etat.magazine, plan.issue.magazine)) err.push("I19 déterminisme : le plan rejoué diffère du magazine adopté");
    }
  }
  if (!histoire && etat.magazine !== avant.magazine) {
    const ancien = new Set([...idsMagazine(avant.magazine), ...(avant.recadrage ? idsMagazine(avant.recadrage.avant) : []), ...(avant.texte ? idsMagazine(avant.texte.avant) : [])]);
    for (const id of idsMagazine(etat.magazine)) if (!etat.catalogue.has(id) && !ancien.has(id)) err.push(`I11 id inconnu introduit : ${id}`);
  }
  if (!histoire) {
    const sigA = idsMagazine(avant.magazine).filter((id) => { const ph = avant.catalogue.get(id); return ph && ph.signalee; }).length;
    const sigB = idsMagazine(etat.magazine).filter((id) => { const ph = etat.catalogue.get(id); return ph && ph.signalee; }).length;
    const confirme = estModifiant(g) && g.confirme;
    if (sigB > sigA && g.type !== "confirmer" && !confirme) err.push("I32 signalée entrée sans confirmation");
  }
  if (hB.passe.length > hA.passe.length) {
    const en = hB.passe[hB.passe.length - 1];
    if (!histoire && hB.futur.length) err.push("I27 une action n'a pas vidé futur");
    if (en.avant === en.apres || egal(en.avant, en.apres)) err.push(`I28 entrée sans effet : ${en.libelle}`);
    if (!histoire && hB.passe.length - hA.passe.length > 2) err.push("I28 plus de deux entrées pour un geste");
  }
  const retourSeance = (avant.recadrage && etat.magazine === avant.recadrage.avant) || (avant.texte && etat.magazine === avant.texte.avant);
  if (!histoire && !retourSeance && hB.passe.length === hA.passe.length && etat.magazine !== avant.magazine && !etat.recadrage && !etat.texte) {
    err.push(`I28 magazine changé sans entrée d'historique (${g.type})`);
  }
  if (g.type === "annuler" || g.type === "retablir") {
    /* l'entrée qui a vraiment changé de pile (une séance fermée par le même geste n'en est pas une) */
    const dernier = <T,>(l: readonly T[]): T | undefined => l[l.length - 1];
    const en = g.type === "annuler"
      ? (hB.futur.length && dernier(hB.futur) !== dernier(hA.futur) ? dernier(hB.futur) : null)
      : (hA.futur.length && dernier(hB.passe) === dernier(hA.futur) ? dernier(hB.passe) : null);
    /* une entrée qui ne touche que le tri (planches identiques) laisse la double affichée : REGLES-TRI R25 */
    const seulTri = !!en && en.avant.planches === en.apres.planches && en.avant.couverture === en.apres.couverture;
    if (en && !seulTri && (en.plancheId === ID_COUVERTURE || indexPlanche(etat.magazine, en.plancheId) >= 0) && etat.plancheCourante !== en.plancheId) err.push(`T41 ${g.type} ne ramène pas à la planche concernée`);
    if (en && seulTri && etat.plancheCourante !== avant.plancheCourante) err.push(`T41 ${g.type} d'un geste de tri a changé de double`);
  }
  if (["filtrer", "retirerFiltre", "effacerFiltres", "cliquerPhoto", "selectionner", "viderSelection", "naviguer", "panneau"].includes(g.type)) {
    if (!egal(etat.magazine, ep.magazine) || hB.passe.length !== ep.historique.passe.length || hB.futur.length !== ep.historique.futur.length) err.push(`T43 ${g.type} a touché le magazine ou l'historique`);
  }
  return err;
}
