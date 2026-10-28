/**
 * Le plan d'un geste qui change le magazine : quelle opération pure, avec quels arguments, quel libellé d'historique.
 * Le lâcher (source × cible) est AUSSI l'aperçu pendant le survol : l'aperçu EST l'opération (P0), jamais une copie.
 */

import type { Cible, Magazine } from "../magazine";
import { MAX_PHOTOS_PAGE } from "../grilles";
import {
  ajouter, ajouterSurPlanche, autreGabarit, choisirGabarit, cibleSurPlanche, deplacerPhoto, deplacerPlanche, echangerIssue, fusionner,
  insererDouble, issue, remplacer, reordonner, retirer, separer, supprimerPlanche, vider,
} from "./operations";
import { affectation, idsDispo, indexPlanche } from "./outils";
import { selectionOrdonnee } from "./bibliotheque";
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

/** Le lâcher : source × cible → l'opération pure. C'est aussi l'aperçu (P0). */
export function planDepot(e: EtatEditeur, source: SourceGlisser | null | undefined, cible: CibleDepot | null | undefined): Plan {
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
      case "bande": { const b = resoudreBande(m, cible); return b ? planAjouter(e, cible.plancheId, b.cible, ids, b.position) : planRien(e); }
      case "vignette": return planSurPlanche(e, cible.plancheId, ids);
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
export function planifier(e: EtatEditeur, g: GesteModifiant): Plan | null {
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
      const is = autreGabarit(m, g.plancheId, g.cible, g.sens, cat);
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
    case "ajouterSurPlanche": return planSurPlanche(e, g.plancheId, Array.isArray(g.ids) ? g.ids : selectionOrdonnee(e));
    default: return null;
  }
}
