/**
 * Le tri à l'écran (maquette validée le 31/10, `docs/reference/REGLES-TRI.md`) : la cible d'un geste, l'avance du focus, le clavier.
 * Les marques elles-mêmes sont des gestes purs (`marquer`, `ajouterSurPlanche`, `creerDoubles`) : ici on ne fait que
 * choisir la cible, envoyer le geste et déplacer le focus.
 */

import { appliquer, marqueDe, marqueEffective, selectionOrdonnee, visibles, type EtatEditeur, type Geste, type Marque } from "@/lib/mise-en-page/editeur";
import type { Ctx, Ui } from "./contexte";

/** Ce dont le tri a besoin de l'éditeur (le clavier le compose sans attendre un rendu). */
export type CtxTri = Pick<Ctx, "etat" | "ui" | "majUi" | "envoyer" | "lectureSeule">;

/** La photo au focus : celle qu'on regarde si elle est encore visible, sinon la première de la liste. */
export function focusCourant(e: EtatEditeur, ui: Ui): string | null {
  const l = visibles(e);
  return ui.focus && l.includes(ui.focus) ? ui.focus : l[0] ?? null;
}

/** La cible : la sélection (2+), sinon la photo visée (rond au survol), sinon le focus. */
export function cibleTri(e: EtatEditeur, ui: Ui, cibleId?: string): string[] {
  const sel = selectionOrdonnee(e);
  if (sel.length > 1 && (!cibleId || sel.includes(cibleId))) return sel;
  if (cibleId) return [cibleId];
  const f = focusCourant(e, ui);
  return f ? [f] : sel;
}

/** P / X / 0 (et les ronds) : reposer la même marque la retire, un geste sans effet ne fait rien.
 *  Une photo marquée : le focus passe à la suivante ; retirée : il reste ; sortie du filtre : la suivante prend sa place. */
export function marquerTri(c: CtxTri, m: Marque | null, cibleId?: string): void {
  if (c.lectureSeule) return;
  const { etat: e, ui } = c;
  if (ui.grand && ui.vue === "comparer") { marquerComparaison(c, m, false); return; }
  const ids = cibleTri(e, ui, cibleId);
  if (!ids.length) return;
  const seule = ids.length === 1;
  const cur = seule ? ids[0] : focusCourant(e, ui);
  const voulue = marqueEffective(e.magazine, ids, m);
  const geste: Geste = { type: "marquer", ids, marque: m };
  const x = appliquer(e, geste);
  if (x.magazine === e.magazine) {
    if (!seule) c.envoyer({ type: "viderSelection" });
    return;
  }
  c.envoyer(geste);
  if (e.selection.ids.length) c.envoyer({ type: "viderSelection" });
  const avant = visibles(e), apres = visibles(x);
  let suivant = cur;
  if (cur) {
    const pos = apres.indexOf(cur);
    if (pos >= 0) suivant = seule && voulue ? apres[Math.min(pos + 1, apres.length - 1)] : cur;
    else suivant = apres[Math.min(Math.max(avant.indexOf(cur), 0), apres.length - 1)] ?? null;
  }
  c.majUi({ focus: suivant, zone: "photos" });
}

/** En comparaison : P / X / 0 marquent l'active (bascule) ; ⇧P garde l'active et écarte les autres. */
export function marquerComparaison(c: CtxTri, m: Marque | null, lesAutres: boolean): void {
  const { etat: e, ui } = c;
  const id = ui.comparer[ui.cmpIci];
  if (!id || c.lectureSeule) return;
  if (lesAutres) {
    const autres = ui.comparer.filter((x) => x !== id);
    const g: Geste = { type: "marquer", ids: [id], marque: "choisie", autres };
    if (appliquer(e, g).magazine !== e.magazine) c.envoyer(g);
    return;
  }
  const g: Geste = { type: "marquer", ids: [id], marque: m };
  if (appliquer(e, g).magazine === e.magazine) return;
  c.envoyer(g);
  if (marqueEffective(e.magazine, [id], m) && ui.cmpIci < ui.comparer.length - 1) c.majUi({ cmpIci: ui.cmpIci + 1 });
}

/** Entrée : poser la cible sur la double en cours (12 au plus ; les restées restent sélectionnées). */
export function poserTri(c: CtxTri): void {
  if (c.lectureSeule) return;
  const ids = cibleTri(c.etat, c.ui);
  if (ids.length) c.envoyer({ type: "ajouterSurPlanche", plancheId: c.etat.plancheCourante, ids });
}

/** N : une nouvelle double page juste après la double en cours, avec la cible (12 au plus par double). */
export function nouvelleDouble(c: CtxTri): void {
  if (c.lectureSeule) return;
  const ids = cibleTri(c.etat, c.ui);
  c.envoyer(ids.length ? { type: "creerDoubles", ids } : { type: "insererDouble" });
}

/** C : comparer 2 à 4 photos sélectionnées. */
export function ouvrirComparaison(c: CtxTri): void {
  const sel = selectionOrdonnee(c.etat);
  if (sel.length < 2 || sel.length > 4) { c.envoyer({ type: "annoncer", texte: "Comparer : 2 à 4 photos" }); return; }
  c.majUi({ grand: true, vue: "comparer", comparer: sel, cmpIci: 0, loupeTri: false, bulle: null });
}

/** La vignette voisine dans la grille affichée (rangées de largeurs différentes : on vise la plus proche en x). */
function voisineVerticale(sens: 1 | -1, focus: string): string | null {
  const g = document.querySelector<HTMLElement>(".ed-ph .ed-grille");
  const cur = g?.querySelector<HTMLElement>(`[data-photo="${CSS.escape(focus)}"]`);
  if (!g || !cur) return null;
  const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2;
  let best: string | null = null, bd = Infinity;
  g.querySelectorAll<HTMLElement>("[data-photo]").forEach((b) => {
    const q = b.getBoundingClientRect();
    if (sens > 0 ? q.top > r.top + 4 : q.bottom < r.bottom - 4) {
      const s = Math.abs(q.top - r.top) * 4 + Math.abs(q.left + q.width / 2 - cx);
      if (s < bd) { bd = s; best = b.dataset.photo ?? null; }
    }
  });
  return best;
}

/**
 * Le clavier du tri. Actif en plein écran, ou quand la bande des photos a la main (clic dans la bande).
 * Rend true si la touche est prise. ⌘Z / ⇧⌘Z restent à l'éditeur (un seul historique).
 */
export function clavierTri(c: CtxTri, ev: KeyboardEvent): boolean {
  const { etat: e, ui, majUi } = c;
  if (!ui.grand && ui.zone !== "photos") return false;
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return false;
  const k = ev.key.toLowerCase();
  const l = visibles(e);
  const f = focusCourant(e, ui);
  const aller = (id: string | null | undefined) => { if (id) majUi({ focus: id }); };
  const de = (d: number) => { const i = f ? l.indexOf(f) : -1; aller(l[Math.max(0, Math.min(l.length - 1, i + d))]); };
  const prends = () => { ev.preventDefault(); return true; };

  if (k === "escape") {
    if (ui.bulle) { majUi({ bulle: null }); return prends(); }
    if (ui.loupeTri) { majUi({ loupeTri: false }); return prends(); }
    if (ui.grand && ui.vue === "comparer") { c.envoyer({ type: "selectionner", ids: ui.comparer }); majUi({ vue: "grille", focus: ui.comparer[ui.cmpIci] ?? f }); return prends(); }
    if (e.selection.ids.length) { c.envoyer({ type: "viderSelection" }); return prends(); }
    if (ui.grand && ui.vue === "une") { majUi({ vue: "grille" }); return prends(); }
    if (ui.grand) { majUi({ grand: false, vue: "grille" }); return prends(); }
    majUi({ zone: "planche" });
    return prends();
  }
  if (ui.grand && ui.vue === "comparer") {
    if (k === "arrowright" || k === "arrowleft") { majUi({ cmpIci: Math.max(0, Math.min(ui.comparer.length - 1, ui.cmpIci + (k === "arrowright" ? 1 : -1))) }); return prends(); }
    if (k === "p") { marquerComparaison(c, "choisie", ev.shiftKey); return prends(); }
    if (k === "x") { marquerComparaison(c, "ecartee", false); return prends(); }
    if (k === "0" || k === "backspace") { marquerComparaison(c, null, false); return prends(); }
    if (k === " ") { c.envoyer({ type: "selectionner", ids: ui.comparer }); majUi({ vue: "grille" }); return prends(); }
    return false;
  }
  switch (k) {
    case "p": marquerTri(c, "choisie"); return prends();
    case "x": marquerTri(c, "ecartee"); return prends();
    case "0": case "backspace": marquerTri(c, null); return prends();
    case "arrowright": de(1); return prends();
    case "arrowleft": de(-1); return prends();
    case "arrowdown": case "arrowup":
      if (ui.grand && ui.vue === "une") return false;
      if (f) aller(voisineVerticale(k === "arrowdown" ? 1 : -1, f));
      return prends();
    case "home": aller(l[0]); return prends();
    case "end": aller(l[l.length - 1]); return prends();
    case "u": {
      const i = f ? l.indexOf(f) : -1;
      const libre = (id: string) => marqueDe(e.magazine, id) === null;
      const j = l.findIndex((id, n) => n > i && libre(id));
      const k2 = j >= 0 ? j : l.findIndex(libre);
      if (k2 >= 0) aller(l[k2]); else c.envoyer({ type: "annoncer", texte: "Tout est trié" });
      return prends();
    }
    case " ":
      if (ui.vue !== "une" && e.selection.ids.length > 1) c.envoyer({ type: "viderSelection" });
      if (!ui.grand) majUi({ grand: true, vue: "une", focus: f, loupeTri: false });
      else majUi({ vue: ui.vue === "une" ? "grille" : "une", loupeTri: false });
      return prends();
    case "enter": poserTri(c); return prends();
    case "n": nouvelleDouble(c); return prends();
    case "c": ouvrirComparaison(c); return prends();
    case "z": if (ui.grand && ui.vue === "une") majUi({ loupeTri: !ui.loupeTri }); return prends();
    case "t": majUi(ui.grand ? { grand: false, vue: "grille", loupeTri: false } : { grand: true, vue: "grille" }); return prends();
    case "+": case "=": if (ui.grand) majUi({ tailleGrand: Math.min(420, ui.tailleGrand + 40) }); return prends();
    case "-": case "_": if (ui.grand) majUi({ tailleGrand: Math.max(100, ui.tailleGrand - 40) }); return prends();
    default: return false;
  }
}
