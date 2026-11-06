/**
 * Le plan d'un geste qui change le magazine : quelle opération pure, avec quels arguments, quel libellé d'historique.
 * Le lâcher (source × cible) est AUSSI l'aperçu pendant le survol : l'aperçu EST l'opération (P0), jamais une copie.
 */

import type { Cible, Magazine } from "../magazine";
import { MAX_PHOTOS_PAGE } from "../grilles";
import {
  ajouter, ajouterSurPlanche, autreGabarit, choisirGabarit, cibleSurPlanche, creerDoubles, deplacerPhoto, deplacerPlanche, echangerIssue, fusionner,
  insererDouble, issue, remplacer, reordonner, retirer, separer, supprimerPlanche, vider,
} from "./operations";
import { affectation, dimsCadre, dispositionOuNull, idsDispo, indexPlanche } from "./outils";
import { estTour, etiqueter, etiquetteRetiree, garderPosees, marqueDe, marqueEffective, marquePourZone, marquer, reglerVisees, ETIQUETTES, type Marque } from "./tri";
import { selectionOrdonnee } from "./bibliotheque";
import { hesiter, type ActionHesitation } from "./hesitation";
import { ajusterCadre, calque, deplacerCadres, miroir, placerCadre, poserLibre, retirerCadres, type SensCalque } from "./libre";
import type { ArgsPlan, CibleDepot, EtatEditeur, GesteModifiant, OpPlan, Plan, RefCadre, Refus, SourceGlisser } from "./types";

const planRien = (e: EtatEditeur, refus?: Refus): Plan =>
  ({ op: "rien", libelle: "", plancheId: e.plancheCourante, issue: issue(e.magazine, refus ?? "rien"), args: {} });

/** La cible réelle d'un dépôt sur la bande : le segment (gauche/droite/double) et la position dans ce segment. */
export function resoudreBande(m: Magazine, cible: Extract<CibleDepot, { type: "bande" }>): { cible: Cible; position: number } | null {
  const i = indexPlanche(m, cible.plancheId);
  if (i < 0 || !Number.isFinite(cible.position)) return null;
  const p = m.planches[i];
  if (i === 0) return { cible: "droite", position: cible.position };
  if (p.mode === "double") return { cible: "double", position: cible.position };
  if (cible.cote === "gauche" || cible.cote === "droite") return { cible: cible.cote, position: cible.position };
  const nG = idsDispo(p.gauche).length;
  if (cible.position <= nG && nG < MAX_PHOTOS_PAGE) return { cible: "gauche", position: cible.position };
  return { cible: "droite", position: cible.position - nG };
}

const libellePose = (n: number): string => (n > 1 ? `Poser ${n} photos` : "Poser une photo");

function planAjouter(e: EtatEditeur, plancheId: string, cible: Cible, ids: string[], position?: number): Plan {
  const is = ajouter(e.magazine, plancheId, cible, ids, e.catalogue, position);
  return { op: "ajouter", libelle: libellePose(is.posees.length), plancheId, issue: is, args: { plancheId, cible, ids, position } };
}
function planSurPlanche(e: EtatEditeur, plancheId: string, ids: string[]): Plan {
  const is = ajouterSurPlanche(e.magazine, plancheId, ids, e.catalogue);
  return { op: "ajouterSurPlanche", libelle: libellePose(is.posees.length), plancheId, issue: is, args: { plancheId, ids } };
}
function planRemplacer(e: EtatEditeur, ref: RefCadre, photoId: string): Plan {
  const is = remplacer(e.magazine, ref, photoId, e.catalogue);
  return { op: "remplacer", libelle: is.echange ? "Intervertir deux photos" : "Remplacer une photo", plancheId: ref.plancheId, issue: is, args: { ref, photoId } };
}
function planDeplacer(e: EtatEditeur, de: RefCadre, vers: { plancheId: string; cible: Cible; position?: number }): Plan {
  const is = deplacerPhoto(e.magazine, de, vers, e.catalogue);
  return { op: "deplacerPhoto", libelle: "Déplacer une photo", plancheId: de.plancheId, issue: is, args: { ref: de } };
}
function planEchanger(e: EtatEditeur, a: RefCadre, b: RefCadre): Plan {
  const is = echangerIssue(e.magazine, a, b, e.catalogue);
  return { op: "echanger", libelle: "Intervertir deux photos", plancheId: a ? a.plancheId : e.plancheCourante, issue: is, args: {} };
}
function planRetirer(e: EtatEditeur, ref: RefCadre): Plan {
  const is = retirer(e.magazine, ref, e.catalogue);
  return { op: "retirer", libelle: "Retirer une photo", plancheId: ref ? ref.plancheId : e.plancheCourante, issue: is, args: { ref } };
}

const LIBELLE_HESITER: Record<ActionHesitation, string> = {
  ajouter: "Hésiter entre deux photos", intervertir: "Intervertir l'hésitation", garderDevant: "Hésitation tranchée", garderDerriere: "Hésitation tranchée",
  rouvrir: "Hésiter de nouveau", oublier: "Oublier l'hésitation",
};
/** L'hésitation (lot 3) : la photo mise derrière devient gardée, dans la même entrée d'historique. */
function planHesiter(e: EtatEditeur, ref: RefCadre | null | undefined, action: ActionHesitation, photoId?: string): Plan {
  if (!ref) return planRien(e);
  const is = hesiter(e.magazine, ref, action, e.catalogue, photoId);
  const m2 = !is.refus && action === "ajouter" && photoId ? garderPosees(is.magazine, [photoId]) : is.magazine;
  return { op: "hesiter", libelle: LIBELLE_HESITER[action] ?? "Hésitation", plancheId: ref.plancheId, issue: { ...is, magazine: m2 }, args: { ref, photoId } };
}

/* ─── lot 4 : miroir, libre, calques, plusieurs cadres ─── */
function planMiroir(e: EtatEditeur, plancheId: string): Plan {
  return { op: "miroir", libelle: "Miroir", plancheId, issue: miroir(e.magazine, plancheId), args: { plancheId } };
}
function planLibre(e: EtatEditeur, c: Extract<CibleDepot, { type: "libre" }>, ids: string[]): Plan {
  const is = poserLibre(e.magazine, c.plancheId, c.cible, ids, c.x, c.y, e.catalogue);
  return { op: "poserLibre", libelle: is.posees.length > 1 ? `Poser ${is.posees.length} photos en libre` : "Poser en libre", plancheId: c.plancheId, issue: is, args: { plancheId: c.plancheId, ids } };
}
function planPlacer(e: EtatEditeur, ref: RefCadre, x: number, y: number, l: number, h: number, libelle: string): Plan {
  return { op: "placerCadre", libelle, plancheId: ref.plancheId, issue: placerCadre(e.magazine, ref, { x, y, l, h }, e.catalogue), args: { ref } };
}
const LIBELLE_CALQUE: Record<SensCalque, string> = { devant: "Mettre devant", avancer: "Avancer", reculer: "Reculer", derriere: "Mettre derrière" };
function planRetirerCadres(e: EtatEditeur, refs: RefCadre[]): Plan {
  const is = retirerCadres(e.magazine, refs, e.catalogue);
  const n = Array.isArray(refs) ? refs.length : 0;
  return { op: "retirerCadres", libelle: n > 1 ? `Retirer ${n} photos` : "Retirer une photo", plancheId: refs?.[0]?.plancheId ?? e.plancheCourante, issue: is, args: { refs } };
}
function planDeplacerCadres(e: EtatEditeur, refs: RefCadre[], vers: { plancheId: string; cible: Cible }): Plan {
  const is = deplacerCadres(e.magazine, refs, vers, e.catalogue);
  return { op: "deplacerCadres", libelle: refs.length > 1 ? `Déplacer ${refs.length} photos` : "Déplacer une photo", plancheId: vers.plancheId, issue: is, args: { refs } };
}
/** Une photo de la double lâchée EN LIBRE : sur sa propre page, son cadre va là ; ailleurs, elle quitte son cadre et s'y pose. */
function planCadreLibre(e: EtatEditeur, ref: RefCadre, c: Extract<CibleDepot, { type: "libre" }>): Plan {
  const m = e.magazine;
  const a = affectation(m, ref);
  if (!a || !a.photoId) return planRien(e);
  const i = indexPlanche(m, c.plancheId);
  const p = m.planches[i];
  if (!p) return planRien(e);
  const reelle: Cible = i === 0 ? "droite" : p.mode === "double" ? "double" : c.cible;
  if (ref.plancheId === c.plancheId && ref.cible === reelle) {
    const dims = dimsCadre(dispositionOuNull(m, ref), ref.index);
    if (!dims) return planRien(e);
    return planPlacer(e, ref, c.x - dims.l / 2, c.y - dims.h / 2, dims.l, dims.h, "Déplacer le cadre");
  }
  const r1 = retirer(m, ref, e.catalogue);
  const r2 = poserLibre(r1.magazine, c.plancheId, c.cible, [a.photoId], c.x, c.y, e.catalogue);
  const ok = !r1.refus && !r2.refus && r2.posees.length === 1;
  return { op: "deplacerCadres", libelle: "Déplacer en libre", plancheId: c.plancheId, issue: ok ? issue(r2.magazine, null, { textesPerdus: r1.textesPerdus }) : issue(m, r2.refus ?? "rien"), args: { refs: [ref] } };
}

/** Des doubles neuves : à `index`, sinon juste après la planche courante. */
function planCreerDoubles(e: EtatEditeur, ids: string[], index?: number): Plan {
  const i = index !== undefined && Number.isFinite(index) ? index : indexPlanche(e.magazine, e.plancheCourante) + 1;
  const is = creerDoubles(e.magazine, i, ids, e.catalogue, e.prochainNumero);
  const n = e.magazine.planches.length;
  const k = is.magazine.planches.length - n;
  return { op: "creerDoubles", libelle: k > 1 ? `Créer ${k} doubles pages` : "Créer une double page", plancheId: is.nouvellePlanche ?? e.plancheCourante, issue: is, args: { ids } };
}

/** Le lâcher : source × cible → l'opération pure. C'est aussi l'aperçu (P0). */
/** Le plan d'un dépôt, tel que l'aperçu le montre et que le lâcher l'exécute : venues de la bibliothèque, les posées deviennent gardées. */
export function planDepot(e: EtatEditeur, source: SourceGlisser | null | undefined, cible: CibleDepot | null | undefined): Plan {
  const p = planDepotBrut(e, source, cible);
  if (p.issue.refus || !p.issue.posees.length || !source || source.type !== "bibliotheque") return p;
  return { ...p, issue: { ...p.issue, magazine: garderPosees(p.issue.magazine, p.issue.posees) } };
}

function planDepotBrut(e: EtatEditeur, source: SourceGlisser | null | undefined, cible: CibleDepot | null | undefined): Plan {
  const m = e.magazine;
  if (!source || !cible) return planRien(e);
  if (source.type === "bibliotheque") {
    const ids = Array.isArray(source.ids) ? source.ids : [];
    switch (cible.type) {
      case "page": return planAjouter(e, cible.plancheId, cible.cote, ids);
      case "double": return planAjouter(e, cible.plancheId, "double", ids);
      case "cadre":
        if (!cible.ref) return planRien(e);
        return ids.length === 1 ? planRemplacer(e, cible.ref, ids[0]) : planAjouter(e, cible.ref.plancheId, cible.ref.cible, ids);
      case "hesiter": return ids.length === 1 ? planHesiter(e, cible.ref, "ajouter", ids[0]) : planRien(e);
      case "bande": { const b = resoudreBande(m, cible); return b ? planAjouter(e, cible.plancheId, b.cible, ids, b.position) : planRien(e); }
      case "vignette": return planSurPlanche(e, cible.plancheId, ids);
      case "entre": return planCreerDoubles(e, ids, cible.index);
      case "libre": return planLibre(e, cible, ids);
      case "tri": {
        const tour = e.filtres.marque;
        if (!estTour(tour) || (cible.zone !== "jeu" && cible.zone !== "cote")) return planRien(e);
        const z = marquePourZone(m, ids.filter((id) => e.catalogue.has(id)), tour, cible.zone);
        if (!z.ids.length) return planRien(e, "deja_la");
        const n = z.ids.length;
        const mot = z.marque === null ? "Remise en jeu" : cible.zone === "jeu" ? "Remise en jeu" : z.marque === "ecartee" ? "Écartée" : "Mise de côté";
        const m2 = marquer(m, z.ids, z.marque);
        return { op: "marquer", libelle: n > 1 ? `${mot} · ${n} photos` : mot, plancheId: e.plancheCourante, issue: issue(m2, m2 === m ? "rien" : null), args: {} };
      }
      default: return planRien(e);
    }
  }
  if (source.type === "cadres") {
    const refs = Array.isArray(source.refs) ? source.refs : [];
    switch (cible.type) {
      case "page": return planDeplacerCadres(e, refs, { plancheId: cible.plancheId, cible: cible.cote });
      case "double": return planDeplacerCadres(e, refs, { plancheId: cible.plancheId, cible: "double" });
      case "bande": { const b = resoudreBande(m, cible); return b ? planDeplacerCadres(e, refs, { plancheId: cible.plancheId, cible: b.cible }) : planRien(e); }
      case "vignette": {
        const c = cibleSurPlanche(m, cible.plancheId);
        return c ? planDeplacerCadres(e, refs, { plancheId: cible.plancheId, cible: c }) : { ...planRien(e, "pleine"), op: "deplacerCadres" };
      }
      case "miroir": return planMiroir(e, cible.plancheId);
      case "bibliotheque": return planRetirerCadres(e, refs);
      default: return planRien(e);
    }
  }
  if (source.type === "cadre") {
    const ref = source.ref;
    const a = affectation(m, ref);
    if (!a || !a.photoId || (source.photoId && source.photoId !== a.photoId)) return planRien(e);
    switch (cible.type) {
      case "cadre": return planEchanger(e, ref, cible.ref);
      case "page": return planDeplacer(e, ref, { plancheId: cible.plancheId, cible: cible.cote });
      case "double":
        if (cible.plancheId === ref.plancheId) return planRien(e);
        return planDeplacer(e, ref, { plancheId: cible.plancheId, cible: "double" });
      case "bande": {
        const b = resoudreBande(m, cible);
        return b ? planDeplacer(e, ref, { plancheId: cible.plancheId, cible: b.cible, position: b.position }) : planRien(e);
      }
      case "bibliotheque": return planRetirer(e, ref);
      case "libre": return planCadreLibre(e, ref, cible);
      case "vignette": {
        if (cible.plancheId === ref.plancheId || indexPlanche(m, cible.plancheId) < 0) return planRien(e);
        const c = cibleSurPlanche(m, cible.plancheId);
        if (!c) return { ...planRien(e, "pleine"), op: "deplacerPhoto" };
        return planDeplacer(e, ref, { plancheId: cible.plancheId, cible: c });
      }
      default: return planRien(e);
    }
  }
  if (source.type === "planche" && cible.type === "entre" && Number.isFinite(cible.index)) {
    const i = indexPlanche(m, source.plancheId);
    if (i < 0) return planRien(e);
    const v = cible.index > i ? cible.index - 1 : cible.index;
    const m2 = deplacerPlanche(m, source.plancheId, v);
    return { op: "deplacerPlanche", libelle: "Déplacer une planche", plancheId: source.plancheId, issue: issue(m2, m2 === m ? "rien" : null), args: { plancheId: source.plancheId } };
  }
  return planRien(e);
}

const courante = (e: EtatEditeur, id?: string): string => id ?? e.plancheCourante;

/** Le plan d'un geste primitif qui change le magazine (null sinon). */
/** Le geste pose-t-il des photos venues de la bibliothèque ? */
const MARQUES_SURES: readonly Marque[] = ["coupDeCoeur", "choisie", "reserve", "ecartee"];
const MOTS: Record<Marque, string> = { coupDeCoeur: "Coup de cœur", choisie: "Gardée", reserve: "Réserve", ecartee: "Écartée" };
const MOTS_N: Record<Marque, (n: number) => string> = { coupDeCoeur: (n) => `${n} coups de cœur`, choisie: (n) => `${n} photos gardées`, reserve: (n) => `${n} photos en réserve`, ecartee: (n) => `${n} photos écartées` };

export const depuisBibliotheque = (g: GesteModifiant): boolean =>
  (g.type === "deposer" && !!g.source && g.source.type === "bibliotheque") || g.type === "ajouterSurPlanche" || g.type === "remplacer" || g.type === "creerDoubles";

/** Le plan d'un geste modifiant. Une photo posée depuis la bibliothèque devient gardée (★), dans le MÊME plan,
 *  donc dans la même entrée d'historique (REGLES-TRI R22). */
export function planifier(e: EtatEditeur, g: GesteModifiant): Plan | null {
  const p = planifierBrut(e, g);
  if (!p || p.issue.refus || !p.issue.posees.length || !depuisBibliotheque(g)) return p;
  return { ...p, issue: { ...p.issue, magazine: garderPosees(p.issue.magazine, p.issue.posees) } };
}

function planifierBrut(e: EtatEditeur, g: GesteModifiant): Plan | null {
  const m = e.magazine, cat = e.catalogue;
  const simple = (op: OpPlan, libelle: string, plancheId: string, m2: Magazine, args: ArgsPlan): Plan =>
    ({ op, libelle, plancheId, issue: issue(m2, m2 === m ? "rien" : null), args });
  switch (g.type) {
    case "deposer": return planDepot(e, g.source, g.cible);
    case "retirer": return planRetirer(e, g.ref);
    case "remplacer": return g.ref ? planRemplacer(e, g.ref, g.photoId) : planRien(e);
    case "echanger": return planEchanger(e, g.a, g.b);
    case "deplacerPhoto": return g.de ? planDeplacer(e, g.de, g.vers) : planRien(e);
    case "reordonner": return simple("reordonner", "Réordonner", g.plancheId, reordonner(m, g.plancheId, g.cible, g.de, g.vers, cat), { plancheId: g.plancheId, cible: g.cible });
    case "choisirGabarit": {
      const is = choisirGabarit(m, g.plancheId, g.cible, g.templateId, cat);
      return { op: "choisirGabarit", libelle: "Changer de gabarit", plancheId: g.plancheId, issue: is, args: { plancheId: g.plancheId, cible: g.cible } };
    }
    case "autreGabarit": {
      const is = autreGabarit(m, g.plancheId, g.cible, g.sens, cat, e.familleGabarits);
      return { op: "autreGabarit", libelle: "Autre disposition", plancheId: g.plancheId, issue: is, args: { plancheId: g.plancheId, cible: g.cible } };
    }
    case "fusionner": {
      const id = courante(e, g.plancheId);
      return { op: "fusionner", libelle: "Passer en double page", plancheId: id, issue: fusionner(m, id, cat), args: { plancheId: id } };
    }
    case "separer": {
      const id = courante(e, g.plancheId);
      return { op: "separer", libelle: "Séparer en deux pages", plancheId: id, issue: separer(m, id, cat), args: { plancheId: id } };
    }
    case "insererDouble": {
      const r = insererDouble(m, courante(e, g.apres), `pl-${e.prochainNumero}`);
      return { op: "insererDouble", libelle: "Ajouter une double page", plancheId: r.plancheId ?? e.plancheCourante,
        issue: issue(r.magazine, r.plancheId ? null : "rien", { nouvellePlanche: r.plancheId }), args: {} };
    }
    case "deplacerPlanche": return simple("deplacerPlanche", "Déplacer une planche", g.plancheId, deplacerPlanche(m, g.plancheId, g.versIndex), { plancheId: g.plancheId });
    case "supprimerPlanche": {
      const i = indexPlanche(m, g.plancheId);
      return simple("supprimerPlanche", i === 0 ? "Vider une planche" : "Supprimer une planche", g.plancheId, supprimerPlanche(m, g.plancheId), { plancheId: g.plancheId });
    }
    case "vider": return simple("vider", "Vider une planche", g.plancheId, vider(m, g.plancheId), { plancheId: g.plancheId });
    case "marquer": {
      const ids = Array.isArray(g.ids) ? g.ids.filter((id) => cat.has(id)) : [];
      const autres = Array.isArray(g.autres) ? g.autres.filter((id) => cat.has(id) && !ids.includes(id)) : [];
      if (autres.length) {
        /* ⇧P en comparaison : celle-ci gardée, les autres écartées, une seule annulation */
        const m2 = marquer(garderPosees(m, ids), autres, "ecartee");
        return simple("marquer", `Gardée · ${autres.length} écartée${autres.length > 1 ? "s" : ""}`, e.plancheCourante, m2, {});
      }
      /* reposer une marque déjà là la retire (sur toutes, ou sur aucune) ; `poser` (vue une photo) ne retire jamais */
      const demandee = MARQUES_SURES.includes(g.marque as Marque) ? (g.marque as Marque) : null;
      const voulue = g.poser ? demandee : marqueEffective(m, ids, demandee);
      const n = ids.filter((id) => marqueDe(m, id) !== voulue).length;
      const libelle = voulue ? (n > 1 ? MOTS_N[voulue](n) : MOTS[voulue]) : (n > 1 ? `${n} photos sans marque` : "Marque retirée");
      return simple("marquer", libelle, e.plancheCourante, marquer(m, ids, voulue), {});
    }
    case "hesiter": return planHesiter(e, g.ref, g.action, g.photoId);
    case "miroir": return planMiroir(e, courante(e, g.plancheId));
    case "placerCadre": return g.ref ? planPlacer(e, g.ref, g.x, g.y, g.l, g.h, "Retoucher le cadre") : planRien(e);
    case "ajusterCadre":
      return g.ref ? { op: "ajusterCadre", libelle: "Ajuster au format", plancheId: g.ref.plancheId, issue: ajusterCadre(m, g.ref, cat), args: { ref: g.ref } } : planRien(e);
    case "calque":
      return g.ref ? { op: "calque", libelle: LIBELLE_CALQUE[g.sens] ?? "Calque", plancheId: g.ref.plancheId, issue: calque(m, g.ref, g.sens), args: { ref: g.ref } } : planRien(e);
    case "retirerCadres": return planRetirerCadres(e, Array.isArray(g.refs) ? g.refs : []);
    case "reglerTri": return simple("reglerTri", "Photos visées", e.plancheCourante, reglerVisees(m, g.visees), {});
    case "etiqueter": {
      const ids = Array.isArray(g.ids) ? [...new Set(g.ids.filter((id) => cat.has(id)))] : [];
      if (!ETIQUETTES.includes(g.etiquette) || !ids.length) return planRien(e);
      const retirer = etiquetteRetiree(m, ids, g.etiquette);
      const nom = { couverture: "Couverture", double: "Double page", pleine: "Pleine page" }[g.etiquette];
      return simple("etiqueter", retirer ? `${nom} retirée` : ids.length > 1 ? `${nom} · ${ids.length} photos` : nom, e.plancheCourante, etiqueter(m, ids, g.etiquette, !retirer), {});
    }
    case "creerDoubles": return planCreerDoubles(e, Array.isArray(g.ids) ? g.ids : [], g.index);
    case "ajouterSurPlanche": return planSurPlanche(e, g.plancheId, Array.isArray(g.ids) ? g.ids : selectionOrdonnee(e));
    default: return null;
  }
}
