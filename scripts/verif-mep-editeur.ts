/**
 * Le harnais de l'éditeur de mise en page (src/lib/mise-en-page/editeur) : les 79 scénarios de la maquette, geste par
 * geste, invariants vérifiés après CHAQUE geste, puis des séquences aléatoires à graine fixe (tous les gestes,
 * y compris les invalides) suivies de « annuler tout, rétablir tout ».
 *
 *     npx tsx --tsconfig tsconfig.json scripts/verif-mep-editeur.ts
 *
 * Appelé aussi par scripts/verif-atelier.ts (bloc « Mise en page » : éditeur). Sans base, sans réseau, sans horloge.
 * Les gestes volontairement invalides du tirage aléatoire passent par `unknown` : c'est le but du test.
 */

import * as O from "@/lib/mise-en-page/editeur";
import type { CibleDepot, EditionMep, EtatEditeur, Geste, Issue, PhotoMaq, ProjetListe, RefCadre, SourceADemarrer, SourceGlisser } from "@/lib/mise-en-page/editeur";
import { nouveauMagazine, tousLesTemplates, type Cible, type Disposition, type Magazine, type Planche } from "@/lib/mise-en-page/magazine";
import type { Cote } from "@/lib/mise-en-page/geometrie";

/* ─────────── outils ─────────── */

function geler<T>(o: T): T {
  if (o === null || typeof o !== "object" || Object.isFrozen(o)) return o;
  Object.freeze(o);
  if (o instanceof Map) return o;
  for (const v of Object.values(o as Record<string, unknown>)) geler(v);
  return o;
}
class Echec extends Error {}
const ok = (c: unknown, msg: string): void => { if (!c) throw new Echec(msg); };
const eq = (a: unknown, b: unknown, msg: string): void => { if (!O.egal(a, b)) throw new Echec(`${msg} : attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`); };
const proche = (a: number | null, b: number, tol: number, msg: string): void => { if (a === null || !(Math.abs(a - b) <= tol)) throw new Echec(`${msg} : attendu ≈${b}, obtenu ${a}`); };
/** Une valeur qui doit exister : sinon l'échec du scénario, pas une exception obscure. */
function def<T>(v: T | null | undefined, msg: string): T { if (v === null || v === undefined) throw new Echec(`${msg} : absent`); return v; }

const DIMS: Record<string, [number, number]> = { P: [2000, 3000], L: [3000, 2000], C: [2000, 2000] };
/** "A:P B:L S:P!" → catalogue ; « ! » = signalée ; dates croissantes dans l'ordre écrit. */
function catalogue(spec: string, extra: Record<string, Partial<PhotoMaq>> = {}): PhotoMaq[] {
  return spec.trim().split(/\s+/).map((tok, i) => {
    const [id, f] = tok.split(":");
    const signalee = f.endsWith("!");
    const o = f.replace("!", "");
    const [l, h] = DIMS[o] ?? (o.split("x").map(Number) as [number, number]);
    return { id, nom: id, l, h, date: `2026-06-11T${String(8 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00.000Z`,
      personne: "Inès", lien: "Lien général", type: "lien", coeur: false, signalee, autresMagazines: [], nouvelle: false, vignette: null, ...(extra[id] ?? {}) };
  });
}
function magazineVide(n: number): Magazine {
  let m = nouveauMagazine("mag-test", "Test", "2026-10-28T10:00:00.000Z");
  for (let k = 1; k < n; k++) m = O.insererDouble(m, m.planches[m.planches.length - 1].id).magazine;
  return m;
}
const pl = (n: number): string => `pl-${n}`;
const ref = (n: number, cible: Cible, index: number): RefCadre => ({ plancheId: pl(n), cible, index });

/** Générateur à graine (mulberry32) : les mêmes tirages à chaque passage. */
function hasard(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type OptsSeance = { extra?: Record<string, Partial<PhotoMaq>>; magazine?: Magazine; planches?: number };

let totalGestes = 0;
class Seance {
  e: EtatEditeur;
  constructor(spec: string | PhotoMaq[], opts: OptsSeance = {}) {
    const cat = typeof spec === "string" ? catalogue(spec, opts.extra) : spec;
    this.e = O.creerEtat({ magazine: opts.magazine ?? magazineVide(opts.planches ?? 10), catalogue: cat });
    this.verifierEtat();
  }
  verifierEtat(): void { const err = O.verifierInvariants(this.e); if (err.length) throw new Echec(`invariants (état) : ${err.join(" ; ")}`); }
  g(geste: Geste): this {
    const avant = geler(this.e);
    const apres = O.appliquer(avant, geste);
    const err = O.verifierInvariants(apres, avant, geste);
    if (err.length) throw new Echec(`invariants après ${JSON.stringify(geste)} : ${err.join(" ; ")}`);
    this.e = apres;
    totalGestes++;
    return this;
  }
  /** Prépare une page avec des gestes réels, puis remet l'historique à zéro. */
  pose(n: number, cible: Cible, ids: string[]): this {
    const c: CibleDepot = cible === "double" ? { type: "double", plancheId: pl(n) } : { type: "page", plancheId: pl(n), cote: cible };
    this.g({ type: "poser", cible: c, ids, confirme: true });
    return this;
  }
  zero(): this { this.e = { ...this.e, historique: { passe: [], futur: [] }, message: null, halo: null, selection: { ids: [], ancre: null } }; return this; }
  planche(n: number): Planche { return def(this.e.magazine.planches.find((x) => x.id === pl(n)), `planche ${n}`); }
  dispo(n: number, cible: Cible): Disposition | null {
    const p = this.planche(n);
    return cible === "double" ? (p.mode === "double" ? p.double : null) : (p.mode === "pages" ? p[cible] : null);
  }
  ids(n: number, cible: Cible): (string | null)[] | null { const d = this.dispo(n, cible); return d ? d.photos.map((a) => a.photoId) : null; }
  /** Les ids d'une disposition qui doit exister. */
  idsPleins(n: number, cible: Cible): string[] { return def(this.ids(n, cible), `ids ${n}/${cible}`).map((x) => def(x, "photo")); }
  tpl(n: number, cible: Cible): string | null { const p = this.planche(n); const d = cible === "double" ? p.double : p[cible]; return d ? d.templateId : null; }
  aff(n: number, cible: Cible, i: number): Disposition["photos"][number] { return def(this.dispo(n, cible), `disposition ${n}/${cible}`).photos[i]; }
  get hist(): number { return this.e.historique.passe.length; }
  /** Glisser complet : départ, survol (aperçu), lâcher ; vérifie P0 (I30) : l'aperçu = le résultat. */
  glisse(source: SourceGlisser, cible: CibleDepot, { attendreConfirmation = false } = {}): Issue {
    this.g({ type: "commencerGlisser", source });
    this.g({ type: "survoler", cible });
    const apercu = def(this.e.glisser?.apercu, "aperçu du survol");
    this.g({ type: "lacher" });
    if (!attendreConfirmation && !this.e.confirmation) ok(O.egal(apercu.magazine, this.e.magazine), "I30 l'aperçu diffère du lâcher");
    return apercu;
  }
  bib(ids: string[]): SourceGlisser { return { type: "bibliotheque", ids }; }
  cadre(n: number, cible: Cible, i: number): SourceGlisser { return { type: "cadre", ref: ref(n, cible, i), photoId: this.aff(n, cible, i).photoId }; }
}
/** Les cadres PHOTO d'une planche (les cadres texte écartés). */
const photosPlanche = (e: EtatEditeur, plancheId?: string): O.CadrePhoto[] =>
  O.cadresPlanche(e, plancheId).filter((c): c is O.CadrePhoto => c.role === "photo");
const page = (n: number, cote: Cote): CibleDepot => ({ type: "page", plancheId: pl(n), cote });
const dbl = (n: number): CibleDepot => ({ type: "double", plancheId: pl(n) });
const cadreC = (n: number, cible: Cible, i: number): CibleDepot => ({ type: "cadre", ref: ref(n, cible, i) });
const premier = (portee: "page" | "double", s: Seance, ids: string[], prec: string | null = null): string =>
  O.gabaritsClasses(portee, ids.map((id) => O.refPour(s.e.catalogue, id)), prec)[0].template.id;

/** Les données de la fiche d'une édition (scénarios 72 et 73) : deux éditions, des projets, des sources. */
function exemple(): { editions: EditionMep[]; projets: ProjetListe[]; sources: SourceADemarrer[] } {
  const ed = "ed-exemple-alpes";
  const edition = (id: string, o: Partial<EditionMep>): EditionMep => ({ id, nom: id, collecte: "close", archivee: false, photosSupprimeesLe: null, nbPhotos: 100, magazines: [1], ...o });
  const projet = (id: string, ref: string, magazine: number, pages: number): ProjetListe =>
    ({ id, nom: id, etat: "en_cours", source: { type: "edition", ref, magazine }, pages, pagesCible: null });
  return {
    editions: [
      edition(ed, { nbPhotos: 1240, magazines: [1, 2, 3] }),
      edition("ed-ex-4", { collecte: "ouverte", nbPhotos: 860, magazines: [1, 2] }),
    ],
    projets: [projet("prj-alpes-1", ed, 1, 13), projet("prj-alpes-2", ed, 2, 7)],
    sources: [
      { id: "src-alpes-3", nom: "Alpes 3", source: { type: "edition", ref: ed, magazine: 3 } },
      { id: "src-alpes-1", nom: "Alpes 1", source: { type: "edition", ref: ed, magazine: 1 } },
      { id: "src-regate-2", nom: "Régate 2", source: { type: "edition", ref: "ed-ex-4", magazine: 2 } },
    ],
  };
}

/* ─────────── les scénarios ─────────── */

const S: { n: number; titre: string; f: () => void }[] = [];
const sc = (n: number, titre: string, f: () => void): void => { S.push({ n, titre, f }); };

// Poser et ajouter
/* Depuis les épingles du 29/10, des gabarits DESSINÉS existent aussi pour les pages : le gabarit attendu est celui de la
   note (`premier`), plus un nom de grille écrit en dur. L'intention de chaque scénario ne change pas. */
sc(1, "A(P) sur Pl.2 droite → le gabarit de la note", () => {
  const s = new Seance("A:P B:L");
  s.g({ type: "naviguer", plancheId: pl(2) });
  s.glisse(s.bib(["A"]), page(2, "droite"));
  eq(s.ids(2, "droite"), ["A"], "droite"); eq(s.tpl(2, "droite"), premier("page", s, ["A"]), "gabarit"); eq(s.ids(2, "gauche"), null, "gauche vide");
  eq(s.hist, 1, "hist");
  const ep = O.etatPhoto(s.e, "A"); ok(ep.fois === 1 && ep.surPlanche, "A utilisée, liseré bleu");
});
sc(2, "B(L) sur Pl.2 gauche → G-P1-b", () => {
  const s = new Seance("A:P B:L");
  s.glisse(s.bib(["B"]), page(2, "gauche"));
  eq(s.tpl(2, "gauche"), "G-P1-b", "gabarit");
});
sc(3, "A(P), B(P) sur Pl.2 droite → le gabarit de la note", () => {
  const s = new Seance("A:P B:P");
  s.g({ type: "cliquerPhoto", id: "A", mode: "simple" }).g({ type: "cliquerPhoto", id: "B", mode: "ajout" });
  s.glisse(s.bib(O.selectionOrdonnee(s.e)), page(2, "droite"));
  eq(s.ids(2, "droite"), ["A", "B"], "ordre"); eq(s.tpl(2, "droite"), premier("page", s, ["A", "B"]), "gabarit");
});
sc(4, "A,B,C(P) sur la zone Double → DP-01", () => {
  const s = new Seance("A:P B:P C:P");
  s.glisse(s.bib(["A", "B", "C"]), dbl(2));
  const p = s.e.magazine.planches[1];
  eq(p.mode, "double", "mode"); eq(s.ids(2, "double"), ["A", "B", "C"], "photos"); eq(s.tpl(2, "double"), "DP-01", "gabarit");
  const dp = def(p.double, "double");
  eq(dp.textes.length, 5, "cadres texte (DP-01 en porte 5, voir ECARTS)");
  ok(dp.textes.every((t) => Object.values(O.LIBELLE).includes(t.contenu)), "textes aux libellés");
  eq(s.hist, 1, "hist");
});
sc(5, "A(L),B(L),C(P) sur la zone Double → G-D3-a, pas DP-03", () => {
  const s = new Seance("A:L B:L C:P");
  s.glisse(s.bib(["A", "B", "C"]), dbl(2));
  eq(s.tpl(2, "double"), "G-D3-a", "gabarit");
  const n = O.gabaritsPour(s.e, pl(2), "double");
  proche(def(n.find((x) => x.id === "G-D3-a"), "G-D3-a").note, 0.186, 0.001, "note G-D3-a"); proche(def(n.find((x) => x.id === "DP-03"), "DP-03").note, 0.59, 0.001, "note DP-03");
});
sc(6, "droite [A] + B → [A, B], gabarit de la note, A reste cadre 1", () => {
  const s = new Seance("A:P B:P").pose(2, "droite", ["A"]).zero();
  s.glisse(s.bib(["B"]), page(2, "droite"));
  eq(s.ids(2, "droite"), ["A", "B"], "ordre"); eq(s.tpl(2, "droite"), premier("page", s, ["A", "B"]), "gabarit");
});
sc(7, "5 + 3 → 6, deux restées à côté, toujours sélectionnées", () => {
  const s = new Seance("A:P B:P C:L D:C E:P F:L G:P H:L").pose(2, "droite", ["A", "B", "C", "D", "E"]).zero();
  s.g({ type: "selectionner", ids: ["F", "G", "H"] });
  s.glisse(s.bib(O.selectionOrdonnee(s.e)), page(2, "droite"));
  eq(s.idsPleins(2, "droite").slice(0, 5), ["A", "B", "C", "D", "E"], "anciennes d'abord"); eq(s.ids(2, "droite"), ["A", "B", "C", "D", "E", "F"], "6 photos");
  eq(def(s.e.message, "message").texte, "2 photos restées à côté", "message"); eq(s.e.selection.ids, ["G", "H"], "restées sélectionnées");
});
sc(8, "page pleine + D → refus", () => {
  const s = new Seance("A:P B:P C:P D:P E:P F:P G:P").pose(2, "droite", ["A", "B", "C", "D", "E", "F"]).zero();
  const m = s.e.magazine;
  const ap = s.glisse(s.bib(["G"]), page(2, "droite"));
  eq(O.resumeIssue(ap), "Page pleine", "aperçu"); ok(s.e.magazine === m, "rien ne change"); eq(s.hist, 0, "hist");
});
sc(9, "double [A,B,C] + D sur la moitié gauche → reste double", () => {
  const s = new Seance("A:P B:P C:P D:L").pose(2, "double", ["A", "B", "C"]).zero();
  s.glisse(s.bib(["D"]), page(2, "gauche"));
  eq(s.e.magazine.planches[1].mode, "double", "mode"); eq(s.ids(2, "double"), ["A", "B", "C", "D"], "photos");
  eq(s.tpl(2, "double"), premier("double", s, ["A", "B", "C", "D"]), "gabarit");
});
sc(10, "6 + 6 → Double page : double de 12, aucune restée", () => {
  const ids = "ABCDEFGHIJKL".split("");
  const s = new Seance(ids.map((x, i) => `${x}:${"PLC"[i % 3]}`).join(" ") + " M:P").pose(2, "gauche", ids.slice(0, 6)).pose(2, "droite", ids.slice(6)).zero();
  s.g({ type: "fusionner", plancheId: pl(2) });
  eq(s.ids(2, "double"), ids, "12 dans l'ordre"); eq(s.e.message, null, "aucun message");
  const m = s.e.magazine;
  const ap = s.glisse(s.bib(["M"]), dbl(2));
  eq(ap.refus, "pleine", "une 13e refusée"); ok(s.e.magazine === m, "inchangé");
});
sc(11, "gauche [A], droite [B] + C, D sur la zone Double → [A,B,C,D]", () => {
  const s = new Seance("A:P B:P C:L D:L").pose(2, "gauche", ["A"]).pose(2, "droite", ["B"]).zero();
  s.glisse(s.bib(["C", "D"]), dbl(2));
  eq(s.ids(2, "double"), ["A", "B", "C", "D"], "photos");
});
sc(12, "Pl.1 : tout va à droite, pas de gauche, pas de zone Double", () => {
  const s = new Seance("A:P");
  ok(!O.cibleAllumee(s.e, s.bib(["A"]), page(1, "gauche")), "gauche de Pl.1 éteinte");
  ok(!O.cibleAllumee(s.e, s.bib(["A"]), dbl(1)), "pas de zone Double");
  ok(!def(O.actionsPlanche(s.e, pl(1)), "actions").zoneDouble, "actions : pas de zone Double");
  s.glisse(s.bib(["A"]), page(1, "gauche"));
  eq(s.ids(1, "droite"), ["A"], "Pl.1 droite");
});
sc(13, "A déjà sur Pl.2, posée sur Pl.3 → ×2", () => {
  const s = new Seance("A:P").pose(2, "droite", ["A"]).zero();
  s.glisse(s.bib(["A"]), page(3, "droite"));
  eq(s.ids(3, "droite"), ["A"], "Pl.3"); eq(O.etatPhoto(s.e, "A").fois, 2, "×2"); eq(O.compteurs(s.e).utilisations.get("A"), 2, "utilisations");
});
sc(14, "A déjà sur la double page → Déjà sur cette double page", () => {
  const s = new Seance("A:P B:P").pose(2, "droite", ["A", "B"]).zero();
  const m = s.e.magazine;
  const ap = s.glisse(s.bib(["A"]), page(2, "gauche"));
  eq(O.resumeIssue(ap), "Déjà sur cette double page", "aperçu"); ok(s.e.magazine === m, "rien ne change");
});
sc(15, "A, C sur la gauche, A déjà là → gauche [C], « 1 déjà là »", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "droite", ["A", "B"]).zero();
  const ap = s.glisse(s.bib(["A", "C"]), page(2, "gauche"));
  eq(s.ids(2, "gauche"), ["C"], "gauche"); eq(O.resumeIssue(ap), "1 déjà là", "aperçu");
});
sc(16, "A (bibliothèque) sur le cadre de C, A sur la planche → échange", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "droite", ["A", "B"]).pose(2, "gauche", ["C"]).zero();
  s.glisse(s.bib(["A"]), cadreC(2, "gauche", 0));
  eq(s.ids(2, "gauche"), ["A"], "gauche"); eq(s.ids(2, "droite"), ["C", "B"], "droite");
});

// Remplacer, échanger, déplacer
sc(17, "D sur le cadre de B → [A, D], gabarit gardé, D neutre, B libre", () => {
  const s = new Seance("A:P B:P D:L").pose(2, "droite", ["A", "B"]).zero();
  const t = s.tpl(2, "droite");
  s.glisse(s.bib(["D"]), cadreC(2, "droite", 1));
  eq(s.ids(2, "droite"), ["A", "D"], "photos"); eq(s.tpl(2, "droite"), t, "gabarit inchangé");
  eq(s.aff(2, "droite", 1).recadrage, { zoom: 1, dx: 0, dy: 0 }, "D neutre"); eq(O.etatPhoto(s.e, "B").fois, 0, "B libre");
});
sc(18, "B aussi sur Pl.4 → reste utilisée, ×2 disparaît", () => {
  const s = new Seance("A:P B:P D:P").pose(2, "droite", ["A", "B"]).pose(4, "droite", ["B"]).zero();
  eq(O.etatPhoto(s.e, "B").fois, 2, "×2 avant");
  s.glisse(s.bib(["D"]), cadreC(2, "droite", 1));
  eq(O.etatPhoto(s.e, "B").fois, 1, "B utilisée une fois");
});
sc(19, "D, E sur le cadre de B : la page s'allume, ajout", () => {
  const s = new Seance("A:P B:P D:P E:P").pose(2, "droite", ["A", "B"]).zero();
  ok(!O.cibleAllumee(s.e, s.bib(["D", "E"]), cadreC(2, "droite", 1)), "cadre éteint"); ok(O.cibleAllumee(s.e, s.bib(["D", "E"]), page(2, "droite")), "page allumée");
  s.glisse(s.bib(["D", "E"]), cadreC(2, "droite", 1));
  eq(s.ids(2, "droite"), ["A", "B", "D", "E"], "ajoutées");
});
sc(20, "A glissée sur B → [B, A], aperçu d'échange, gabarit gardé", () => {
  const s = new Seance("A:P B:P").pose(2, "droite", ["A", "B"]).zero();
  const t = s.tpl(2, "droite");
  const ap = s.glisse(s.cadre(2, "droite", 0), cadreC(2, "droite", 1));
  eq(s.ids(2, "droite"), ["B", "A"], "échangées"); eq(s.tpl(2, "droite"), t, "gabarit");
  ok(ap.refus === null, "aperçu d'échange disponible pendant le survol");
});
sc(21, "Échange : rapport voisin = recadrage gardé, paysage = neutre", () => {
  const s = new Seance("A:P B:P C:P X:L").pose(2, "double", ["A", "B", "C"]).pose(3, "droite", ["X"]).zero();
  s.g({ type: "ouvrirRecadrage", ref: ref(2, "double", 0) }).g({ type: "recadrer", recadrage: { zoom: 2, dx: 5, dy: 0 } }).g({ type: "fermerRecadrage" });
  eq(s.aff(2, "double", 0).recadrage, { zoom: 2, dx: 5, dy: 0 }, "recadrage posé");
  s.g({ type: "echanger", a: ref(2, "double", 0), b: ref(2, "double", 1) });
  eq(s.aff(2, "double", 1), { photoId: "A", recadrage: { zoom: 2, dx: 5, dy: 0 } }, "même rapport : gardé");
  const r = O.reporterRecadrage({ zoom: 2, dx: 5, dy: 0 }, { l: 2000, h: 3000 }, { l: 85, h: 128.5 }, { l: 175, h: 262 });
  eq(r.zoom, 2, "zoom gardé vers un cadre voisin plus grand"); proche(r.dx, 5 * 175 / 85, 1e-9, "dx mis à l'échelle");
  eq(s.tpl(3, "droite"), "G-P1-b", "Pl.3 en paysage");
  s.g({ type: "echanger", a: ref(2, "double", 1), b: ref(3, "droite", 0) });
  eq(s.aff(3, "droite", 0), { photoId: "A", recadrage: { zoom: 1, dx: 0, dy: 0 } }, "cadre paysage : neutre");
});
sc(22, "C vers la gauche hors cadre → gauche [A, C], droite [B]", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "gauche", ["A"]).pose(2, "droite", ["B", "C"]).zero();
  s.glisse(s.cadre(2, "droite", 1), page(2, "gauche"));
  eq(s.ids(2, "gauche"), ["A", "C"], "gauche"); eq(s.ids(2, "droite"), ["B"], "droite");
  eq(s.tpl(2, "gauche"), premier("page", s, ["A", "C"]), "gauche recomposée"); eq(s.tpl(2, "droite"), premier("page", s, ["B"]), "droite recomposée");
  eq(s.hist, 1, "hist");
});
sc(23, "B vers une gauche pleine → refus « Page pleine »", () => {
  const s = new Seance("A:P B:P C:P D:P E:P F:P G:P").pose(2, "gauche", ["A", "C", "D", "E", "F", "G"]).pose(2, "droite", ["B"]).zero();
  const m = s.e.magazine;
  const ap = s.glisse(s.cadre(2, "droite", 0), page(2, "gauche"));
  eq(O.resumeIssue(ap), "Page pleine", "aperçu"); ok(s.e.magazine === m, "atomique");
});
sc(24, "A lâchée sur sa propre page → Rien ne change", () => {
  const s = new Seance("A:P B:P").pose(2, "droite", ["A", "B"]).zero();
  const m = s.e.magazine;
  const ap = s.glisse(s.cadre(2, "droite", 0), page(2, "droite"));
  eq(O.resumeIssue(ap), "Rien ne change", "aperçu"); ok(s.e.magazine === m, "inchangé");
});
sc(25, "Ressort 600 ms vers Pl.5, échange entre planches, annuler revient à Pl.2", () => {
  const s = new Seance("A:P B:P X:P").pose(2, "droite", ["A", "B"]).pose(5, "droite", ["X"]).zero();
  s.g({ type: "naviguer", plancheId: pl(2) });
  const avant = s.e.magazine;
  s.g({ type: "commencerGlisser", source: s.cadre(2, "droite", 0) });
  s.g({ type: "survoler", cible: { type: "vignette", plancheId: pl(5) }, depuis: 0 });
  s.g({ type: "naviguer", plancheId: pl(5) }); // l'écran le déclenche après 600 ms immobile
  eq(s.e.plancheCourante, pl(5), "planche affichée"); ok(s.e.glisser, "le glisser continue");
  s.g({ type: "survoler", cible: cadreC(5, "droite", 0) });
  const ap = def(s.e.glisser?.apercu, "aperçu");
  s.g({ type: "lacher" });
  ok(O.egal(ap.magazine, s.e.magazine), "I30");
  eq(s.ids(2, "droite"), ["X", "B"], "Pl.2"); eq(s.ids(5, "droite"), ["A"], "Pl.5"); eq(s.hist, 1, "hist");
  s.g({ type: "annuler" });
  eq(s.e.plancheCourante, pl(2), "retour à Pl.2"); ok(s.e.magazine === avant, "état d'avant");
});
sc(26, "A posée lâchée sur la vignette Pl.6 → fin de la page la moins remplie", () => {
  const s = new Seance("A:P Z:P G1:P G2:P D1:P").pose(2, "droite", ["A", "Z"]).pose(6, "gauche", ["G1", "G2"]).pose(6, "droite", ["D1"]).zero();
  s.glisse(s.cadre(2, "droite", 0), { type: "vignette", plancheId: pl(6) });
  eq(s.ids(6, "droite"), ["D1", "A"], "Pl.6 droite"); eq(s.ids(2, "droite"), ["Z"], "Pl.2");
});
sc(27, "D sur la vignette d'une planche pleine → « Pleine », refus", () => {
  const ids = "ABCDEFGHIJKL".split("");
  const s = new Seance(ids.map((x) => `${x}:P`).join(" ") + " M:P").pose(7, "double", ids).zero();
  ok(O.cheminDeFer(s.e)[6].pleine, "vignette Pleine");
  const m = s.e.magazine;
  const ap = s.glisse(s.bib(["M"]), { type: "vignette", plancheId: pl(7) });
  eq(ap.refus, "pleine", "refus"); ok(s.e.magazine === m, "inchangé"); eq(s.hist, 0, "hist");
});

// Retirer
sc(28, "× sur B dans la bande → [A, C], meilleur gabarit, halo", () => {
  const s = new Seance("A:P B:L C:P").pose(2, "droite", ["A", "B", "C"]).zero();
  s.g({ type: "naviguer", plancheId: pl(2) });
  s.g({ type: "retirer", ref: O.bande(s.e)[1].photos[1].ref });
  eq(s.ids(2, "droite"), ["A", "C"], "photos"); eq(s.tpl(2, "droite"), premier("page", s, ["A", "C"]), "gabarit"); eq(s.e.halo, "B", "halo");
});
sc(29, "Retour arrière sur A seule → page vide", () => {
  const s = new Seance("A:P").pose(2, "droite", ["A"]).zero();
  s.g({ type: "activerCadre", ref: ref(2, "droite", 0) }).g({ type: "touche", cle: "Backspace" });
  eq(s.ids(2, "droite"), null, "droite vide");
});
sc(30, "Double [A] vidée vers la bibliothèque → double vide, mode gardé, « Séparer »", () => {
  const s = new Seance("A:P").pose(2, "double", ["A"]).zero();
  s.glisse(s.cadre(2, "double", 0), { type: "bibliotheque" });
  const p = s.e.magazine.planches[1];
  eq(p.mode, "double", "mode gardé"); eq(p.double, null, "vide"); ok(def(O.actionsPlanche(s.e, pl(2)), "actions").separer, "Séparer proposé");
});
sc(31, "Filtre « Utilisées » : retirée masquée, « Voir » rend Toutes", () => {
  const s = new Seance("A:P B:P").pose(2, "droite", ["A"]).zero();
  s.g({ type: "filtrer", filtres: { statut: "utilisees" } });
  s.g({ type: "retirer", ref: ref(2, "droite", 0) });
  eq(def(s.e.message, "message").texte, "Retirée · masquée par les filtres", "message"); eq(def(s.e.message, "message").action, { libelle: "Voir", id: "A" }, "action");
  eq(s.e.filtres.statut, "utilisees", "le filtre ne change pas seul");
  s.g({ type: "voirRetiree", id: "A" });
  eq(s.e.filtres.statut, "toutes", "statut Toutes"); eq(s.e.halo, "A", "halo"); ok(O.visibles(s.e).includes("A"), "visible");
});
sc(32, "Filtre « Sur cette double page » : même message, filtre inchangé", () => {
  const s = new Seance("A:P B:P").pose(2, "droite", ["A", "B"]).zero();
  s.g({ type: "naviguer", plancheId: pl(2) }).g({ type: "filtrer", filtres: { statut: "planche" } });
  s.g({ type: "retirer", ref: ref(2, "droite", 0) });
  eq(def(s.e.message, "message").texte, "Retirée · masquée par les filtres", "message"); eq(s.e.filtres.statut, "planche", "filtre gardé");
});

// Gabarits
sc(33, "R, R, Maj+R : le classement → 2e → 3e → 2e", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "droite", ["A", "B", "C"]).zero();
  s.g({ type: "naviguer", plancheId: pl(2) });
  const liste = O.gabaritsPour(s.e, pl(2), "droite").map((x) => x.id);
  ok(liste.length >= 3, "au moins trois gabarits classés");
  eq(s.tpl(2, "droite"), liste[0], "départ");
  s.g({ type: "touche", cle: "r" }); eq(s.tpl(2, "droite"), liste[1], "R");
  s.g({ type: "touche", cle: "r" }); eq(s.tpl(2, "droite"), liste[2], "R");
  s.g({ type: "touche", cle: "R", shift: true }); eq(s.tpl(2, "droite"), liste[1], "Maj+R");
  eq(s.hist, 3, "hist"); eq(s.ids(2, "droite"), ["A", "B", "C"], "photos et ordre");
  const n = O.gabaritsPour(s.e, pl(2), "droite");
  ok(n.every((x, i) => i === 0 || n[i - 1].note <= x.note + 1e-9 || n[i - 1].courant || x.courant), "notes croissantes");
});
sc(34, "Survol d'un gabarit = aperçu, sortir sans cliquer = rien", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "droite", ["A", "B", "C"]).zero();
  const avant = s.e;
  const depart = s.tpl(2, "droite");
  const vu = O.apercu(s.e, { type: "choisirGabarit", plancheId: pl(2), cible: "droite", templateId: "G-P3-a" });
  eq(def(vu.magazine.planches[1].droite, "droite").templateId, "G-P3-a", "aperçu en G-P3-a");
  ok(depart !== "G-P3-a" && s.e === avant && s.tpl(2, "droite") === depart && s.hist === 0, "rien n'a changé");
  ok(def(O.gabaritsPour(s.e, pl(2), "droite").find((x) => x.courant), "gabarit courant").id === depart, "l'actuel coché");
});
sc(35, "DP-01 + « Lisbonne » → grille : 1 texte retiré ; Annuler rend tout", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "double", ["A", "B", "C"]).zero();
  s.g({ type: "ouvrirTexte", ref: ref(2, "double", 2) }).g({ type: "taper", contenu: "Lisbonne" }).g({ type: "fermerTexte" });
  const avant = s.e.magazine;
  s.g({ type: "choisirGabarit", plancheId: pl(2), cible: "double", templateId: "G-D3-a" });
  eq(s.e.message, { texte: "1 texte retiré", action: { libelle: "Annuler" } }, "message");
  s.g({ type: "annuler" });
  ok(s.e.magazine === avant, "retour exact"); eq(s.tpl(2, "double"), "DP-01", "DP-01"); eq(def(s.e.magazine.planches[1].double, "double").textes[2].contenu, "Lisbonne", "Lisbonne");
});
sc(36, "DP-01 légende tapée → DP-04 : passe à la 1re légende", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "double", ["A", "B", "C"]).zero();
  s.g({ type: "ouvrirTexte", ref: ref(2, "double", 1) }).g({ type: "taper", contenu: "Sommet" }).g({ type: "fermerTexte" });
  s.g({ type: "choisirGabarit", plancheId: pl(2), cible: "double", templateId: "DP-04" });
  eq(def(s.e.magazine.planches[1].double, "double").textes[0].contenu, "Sommet", "1re légende de DP-04"); eq(s.e.message, null, "aucun texte retiré");
});
sc(37, "gauche [A,B] + droite [C,D,E] → Double page [A..E]", () => {
  const s = new Seance("A:P B:P C:L D:L E:P").pose(2, "gauche", ["A", "B"]).pose(2, "droite", ["C", "D", "E"]).zero();
  s.g({ type: "fusionner", plancheId: pl(2) });
  eq(s.ids(2, "double"), ["A", "B", "C", "D", "E"], "ordre");
});
sc(38, "double [A..E] → Séparer : [A,B,C] | [D,E]", () => {
  const s = new Seance("A:P B:P C:L D:L E:P").pose(2, "double", ["A", "B", "C", "D", "E"]).zero();
  s.g({ type: "separer", plancheId: pl(2) });
  eq(s.ids(2, "gauche"), ["A", "B", "C"], "gauche"); eq(s.ids(2, "droite"), ["D", "E"], "droite");
});
sc(39, "double [A] → Séparer : [A] | vide", () => {
  const s = new Seance("A:P").pose(2, "double", ["A"]).zero();
  s.g({ type: "separer", plancheId: pl(2) });
  eq(s.ids(2, "gauche"), ["A"], "gauche"); eq(s.ids(2, "droite"), null, "droite vide");
});
sc(40, "Séparer puis Double page, puis Annuler ×2 → départ exact", () => {
  const s = new Seance("A:P B:L C:P").pose(2, "double", ["A", "B", "C"]).zero();
  const depart = s.e.magazine;
  s.g({ type: "separer", plancheId: pl(2) }).g({ type: "fusionner", plancheId: pl(2) });
  eq(s.ids(2, "double"), ["A", "B", "C"], "photos"); eq(s.tpl(2, "double"), premier("double", s, ["A", "B", "C"]), "gabarit de la note");
  s.g({ type: "annuler" }).g({ type: "annuler" });
  ok(s.e.magazine === depart, "départ exact");
});
sc(41, "R pendant un recadrage : le recadrage s'enregistre, puis le gabarit change (Hist +2)", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "droite", ["A", "B", "C"]).zero();
  s.g({ type: "ouvrirRecadrage", ref: ref(2, "droite", 0) }).g({ type: "zoomerImage", zoom: 2 });
  s.g({ type: "touche", cle: "r" });
  eq(s.hist, 2, "Hist +2"); eq(s.e.recadrage, null, "recadrage fermé"); eq(s.tpl(2, "droite"), O.gabaritsPour(s.e, pl(2), "droite").map((x) => x.id)[1], "gabarit suivant");
  eq(s.e.historique.passe.map((x) => x.libelle), ["Recadrer", "Autre disposition"], "les deux entrées");
});
sc(42, "Répétition pénalisée : Pl.3 ne reprend pas le gabarit de Pl.2", () => {
  const s = new Seance("X:P Y:P").pose(2, "droite", ["X"]).zero();
  const t2 = s.tpl(2, "droite");
  eq(t2, premier("page", s, ["X"]), "Pl.2");
  s.glisse(s.bib(["Y"]), page(3, "droite"));
  ok(s.tpl(3, "droite") !== t2, "Pl.3 change de gabarit"); eq(s.tpl(3, "droite"), premier("page", s, ["Y"], t2), "Pl.3 = la note avec la pénalité");
});

// Bande, ordre
sc(43, "Bande : C avant A → [C, A, B], gabarit gardé, recadrages reportés", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "droite", ["A", "B", "C"]).zero();
  s.g({ type: "ouvrirRecadrage", ref: ref(2, "droite", 1) }).g({ type: "recadrer", recadrage: { zoom: 1.5, dx: 3, dy: 0 } }).g({ type: "fermerRecadrage" });
  const t = s.tpl(2, "droite");
  s.glisse(s.cadre(2, "droite", 2), { type: "bande", plancheId: pl(2), cote: "droite", position: 0 });
  eq(s.ids(2, "droite"), ["C", "A", "B"], "ordre"); eq(s.tpl(2, "droite"), t, "gabarit");
  eq(s.aff(2, "droite", 2).recadrage, { zoom: 1.5, dx: 3, dy: 0 }, "B : même cadre P, recadrage gardé");
  eq(s.aff(2, "droite", 0).recadrage, { zoom: 1, dx: 0, dy: 0 }, "C : cadre paysage, neutre");
});
sc(44, "Bande : A dans le segment droit, position 0 → [B] | [A, C]", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "gauche", ["A", "B"]).pose(2, "droite", ["C"]).zero();
  s.glisse(s.cadre(2, "gauche", 0), { type: "bande", plancheId: pl(2), cote: "droite", position: 0 });
  eq(s.ids(2, "gauche"), ["B"], "gauche"); eq(s.ids(2, "droite"), ["A", "C"], "droite");
});
sc(45, "D dans la bande entre A et B → [A, D, B], aperçu avant de lâcher", () => {
  const s = new Seance("A:P B:P D:P").pose(2, "droite", ["A", "B"]).zero();
  const ap = s.glisse(s.bib(["D"]), { type: "bande", plancheId: pl(2), cote: "droite", position: 1 });
  eq(def(ap.magazine.planches[1].droite, "droite").photos.map((a) => a.photoId), ["A", "D", "B"], "aperçu"); eq(s.ids(2, "droite"), ["A", "D", "B"], "résultat");
});

// Planches
sc(46, "Sur Pl.3, « + Double page » → index 3, pages, vide, affichée", () => {
  const s = new Seance("A:P", { planches: 4 });
  const pages = O.pagesDe(s.e.magazine);
  s.g({ type: "naviguer", plancheId: pl(3) }).g({ type: "insererDouble" });
  const p = s.e.magazine.planches[3];
  ok(p.mode === "pages" && !p.gauche && !p.droite, "vide en pages"); eq(s.e.plancheCourante, p.id, "affichée"); eq(O.pagesDe(s.e.magazine), pages + 2, "pages +2");
  ok(!["pl-1", "pl-2", "pl-3", "pl-4"].includes(p.id), "id neuf");
});
sc(47, "Réordonner : Pl.4 avant Pl.2 ; jamais avant Pl.1", () => {
  const s = new Seance("A:P", { planches: 4 });
  s.g({ type: "deposer", source: { type: "planche", plancheId: pl(4) }, cible: { type: "entre", index: 1 } });
  eq(s.e.magazine.planches.map((p) => p.id), ["pl-1", "pl-4", "pl-2", "pl-3"], "ordre");
  ok(!O.cibleAllumee(s.e, { type: "planche", plancheId: pl(3) }, { type: "entre", index: 0 }), "pas de ligne avant Pl.1");
  s.g({ type: "deposer", source: { type: "planche", plancheId: pl(3) }, cible: { type: "entre", index: 0 } });
  eq(s.e.magazine.planches[0].id, "pl-1", "Pl.1 en tête"); eq(s.e.magazine.planches[1].id, "pl-3", "bornée à l'index 1");
});
sc(48, "Supprimer Pl.3 [A, B] puis Annuler → même index, même id", () => {
  const s = new Seance("A:P B:P").pose(3, "droite", ["A", "B"]).zero();
  const avant = s.e.magazine;
  s.g({ type: "supprimerPlanche", plancheId: pl(3) });
  eq(O.etatPhoto(s.e, "A").fois + O.etatPhoto(s.e, "B").fois, 0, "A et B libres");
  s.g({ type: "annuler" });
  ok(s.e.magazine === avant, "revenue"); eq(s.e.magazine.planches[2].id, "pl-3", "index 2, même id"); eq(s.ids(3, "droite"), ["A", "B"], "mêmes photos");
});
sc(49, "Menu de Pl.1 : Vider seulement", () => {
  const s = new Seance("A:P").pose(1, "droite", ["A"]).zero();
  const a = O.actionsPlanche(s.e, pl(1));
  ok(a && a.vider && !a.supprimer && !a.deplacable, "Vider seulement");
  s.g({ type: "supprimerPlanche", plancheId: pl(1) });
  eq(s.e.magazine.planches[0].id, "pl-1", "Pl.1 toujours là"); eq(s.ids(1, "droite"), null, "vidée");
});
sc(50, "Vider Pl.2 (4 photos) puis Annuler → mêmes gabarits, mêmes recadrages", () => {
  const s = new Seance("A:P B:L C:P D:C").pose(2, "gauche", ["A", "B"]).pose(2, "droite", ["C", "D"]).zero();
  s.g({ type: "ouvrirRecadrage", ref: ref(2, "gauche", 0) }).g({ type: "zoomerImage", zoom: 1.7 }).g({ type: "fermerRecadrage" });
  const avant = s.e.magazine;
  s.g({ type: "vider", plancheId: pl(2) });
  eq(s.ids(2, "gauche"), null, "vidée");
  s.g({ type: "annuler" });
  ok(s.e.magazine === avant, "identique");
});

// Annulation dans le désordre
sc(51, "Annuler ramène à la planche concernée, Rétablir aussi", () => {
  const s = new Seance("A:P B:P");
  s.g({ type: "naviguer", plancheId: pl(2) }).g({ type: "poser", cible: page(2, "droite"), ids: ["A"] });
  s.g({ type: "naviguer", plancheId: pl(5) }).g({ type: "poser", cible: page(5, "droite"), ids: ["B"] });
  s.g({ type: "naviguer", plancheId: pl(9) });
  s.g({ type: "touche", cle: "z", meta: true });
  eq(s.e.plancheCourante, pl(5), "Pl.5 affichée"); eq(s.ids(5, "droite"), null, "B retirée");
  s.g({ type: "touche", cle: "z", meta: true });
  eq(s.e.plancheCourante, pl(2), "Pl.2 affichée"); eq(s.ids(2, "droite"), null, "A retirée");
  s.g({ type: "touche", cle: "z", meta: true, shift: true });
  eq(s.e.plancheCourante, pl(2), "Pl.2"); eq(s.ids(2, "droite"), ["A"], "A revient");
});
sc(52, "Poser, annuler, poser → Rétablir désactivé", () => {
  const s = new Seance("A:P B:P");
  s.g({ type: "poser", cible: page(2, "droite"), ids: ["A"] }).g({ type: "annuler" });
  ok(O.libelleRetablir(s.e), "Rétablir possible");
  s.g({ type: "poser", cible: page(2, "droite"), ids: ["B"] });
  eq(s.e.historique.futur.length, 0, "futur vidé"); eq(O.libelleRetablir(s.e), null, "Rétablir désactivé");
});
sc(53, "Recadrer en 15 mouvements et 3 crans, Échap → Hist +1 ; Annuler", () => {
  const s = new Seance("A:P").pose(2, "droite", ["A"]).zero();
  const avant = s.e.magazine;
  s.g({ type: "ouvrirRecadrage", ref: ref(2, "droite", 0) });
  s.g({ type: "zoomerImage", zoom: 1.5 });
  for (let k = 0; k < 15; k++) s.g({ type: "deplacerImage", ddx: (k % 3) - 1, ddy: k % 2 ? 2 : -1 });
  s.g({ type: "zoomerImage", zoom: 2 }).g({ type: "zoomerImage", zoom: 2.5 });
  s.g({ type: "touche", cle: "Escape" });
  eq(s.hist, 1, "Hist +1"); ok(s.aff(2, "droite", 0).recadrage.zoom === 2.5, "recadrage enregistré");
  s.g({ type: "annuler" });
  ok(s.e.magazine === avant, "recadrage d'avant la séance");
});
sc(54, "« Été 2026 » en 12 frappes puis clic ailleurs → Hist +1", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "double", ["A", "B", "C"]).zero();
  s.g({ type: "ouvrirTexte", ref: ref(2, "double", 2) });
  for (const t of ["É", "Ét", "Été", "Été ", "Été 2", "Été 20", "Été 202", "Été 2027", "Été 202", "Été 2026", "Été 2026!", "Été 2026"]) s.g({ type: "taper", contenu: t });
  s.g({ type: "activerCadre", ref: null });
  eq(s.hist, 1, "Hist +1"); eq(def(s.e.magazine.planches[1].double, "double").textes[2].contenu, "Été 2026", "texte");
});
sc(55, "Pendant la saisie : Retour arrière, R et Cmd+Z restent dans le champ", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "double", ["A", "B", "C"]).zero();
  s.g({ type: "naviguer", plancheId: pl(2) }).g({ type: "activerCadre", ref: ref(2, "double", 0) });
  s.g({ type: "ouvrirTexte", ref: ref(2, "double", 2) }).g({ type: "taper", contenu: "Été" });
  const m = s.e.magazine, t = s.tpl(2, "double");
  s.g({ type: "touche", cle: "Backspace" }); s.g({ type: "taper", contenu: "Ét" });
  eq(s.ids(2, "double"), ["A", "B", "C"], "aucune photo retirée");
  s.g({ type: "touche", cle: "r" }); eq(s.tpl(2, "double"), t, "R n'a pas changé le gabarit");
  s.g({ type: "taper", contenu: "ÉtR" });
  const m2 = s.e.magazine;
  s.g({ type: "touche", cle: "z", meta: true }); s.g({ type: "annuler" });
  ok(s.e.magazine === m2 && s.hist === 0 && s.e.texte, "Cmd+Z ne touche pas le magazine");
  ok(m !== m2, "la saisie a bien écrit");
});
sc(56, "Filtres, tri, taille, panneau, navigation → Hist inchangé", () => {
  const s = new Seance("A:P B:L").pose(2, "droite", ["A"]).zero();
  s.g({ type: "poser", cible: page(3, "droite"), ids: ["B"] });
  const m = s.e.magazine, h = s.hist;
  s.g({ type: "filtrer", filtres: { tri: "nom", taille: "L", groupe: "personne", statut: "libres" } }).g({ type: "panneau", basculer: true }).g({ type: "naviguer", sens: 1 }).g({ type: "touche", cle: "p" });
  ok(s.e.magazine === m && s.hist === h, "rien dans l'historique");
});

// Sélection et filtres
sc(57, "Clic A, Maj+clic E → 5 ; Cmd+clic C → 4 ; clic dans le vide → 0", () => {
  const s = new Seance("A:P B:P C:P D:P E:P F:P");
  s.g({ type: "cliquerPhoto", id: "A", mode: "simple" }).g({ type: "cliquerPhoto", id: "E", mode: "plage" });
  eq(s.e.selection.ids, ["A", "B", "C", "D", "E"], "5");
  s.g({ type: "cliquerPhoto", id: "C", mode: "ajout" }); eq(s.e.selection.ids.length, 4, "4");
  s.g({ type: "viderSelection" }); eq(s.e.selection.ids.length, 0, "0");
});
sc(58, "Filtre Paysage : B (portrait) reste sélectionnée, marquée masquée (ECARTS 12, 28/10)", () => {
  const s = new Seance("A:L B:P");
  s.g({ type: "selectionner", ids: ["A", "B"] }).g({ type: "filtrer", filtres: { orientations: ["L"] } });
  eq(s.e.selection.ids, ["A", "B"], "B gardée"); eq(O.selectionMasquee(s.e), ["B"], "B masquée");
  eq(O.compteurs(s.e).libelleSelection, "2 sélectionnées", "compteur");
  s.g({ type: "retirerFiltre", cle: "orientations" }); eq(O.selectionMasquee(s.e), [], "plus rien de masqué");
});
sc(59, "Recherche « B » : seule B visible, A reste sélectionnée en fin d'ordre", () => {
  const s = new Seance("A:P B:P");
  s.g({ type: "selectionner", ids: ["A", "B"] }).g({ type: "filtrer", filtres: { recherche: "B" } });
  eq(O.visibles(s.e), ["B"], "visibles"); eq(O.selectionOrdonnee(s.e), ["B", "A"], "visible d'abord, masquée ensuite");
});
sc(60, "Clic sur la page avec une sélection = poser, aperçu identique", () => {
  const s = new Seance("A:P B:P C:L");
  s.g({ type: "selectionner", ids: ["A", "B", "C"] });
  const geste: Geste = { type: "cliquerCible", cible: page(2, "droite") };
  const vu = O.apercu(s.e, geste);
  const viaPoser = O.appliquer(s.e, { type: "poser", cible: page(2, "droite") });
  s.g(geste);
  ok(O.egal(vu.magazine, s.e.magazine) && O.egal(viaPoser.magazine, s.e.magazine), "même résultat"); eq(s.ids(2, "droite"), ["A", "B", "C"], "posées");
});
sc(61, "Personne = Inès puis Tout effacer → défauts, signalées masquées", () => {
  const s = new Seance("A:P B:P S:P!", { extra: { B: { personne: "Yanis" } } });
  s.g({ type: "filtrer", filtres: { personnes: ["Inès"], coeur: true } }).g({ type: "effacerFiltres" });
  eq(s.e.filtres, { ...O.FILTRES_DEFAUT }, "défauts"); ok(!O.visibles(s.e).includes("S"), "signalée masquée");
});

// Signalées, indisponibles, définition
sc(62, "Signalée : confirmation dans la page ; Annuler puis Poser quand même", () => {
  const s = new Seance("A:P S:P!");
  s.g({ type: "filtrer", filtres: { montrerSignalees: true } });
  const m = s.e.magazine;
  s.glisse(s.bib(["S"]), page(2, "droite"), { attendreConfirmation: true });
  eq(s.e.confirmation && [s.e.confirmation.nb, s.e.confirmation.total], [1, 1], "confirmation"); ok(s.e.magazine === m, "rien posé");
  s.g({ type: "annulerConfirmation" }); ok(s.e.magazine === m && !s.e.confirmation, "Annuler → rien");
  s.glisse(s.bib(["S"]), page(2, "droite"), { attendreConfirmation: true });
  s.g({ type: "confirmer" });
  eq(s.ids(2, "droite"), ["S"], "posée"); ok(def(photosPlanche(s.e, pl(2)).find((c) => c.photoId === "S"), "cadre S").signalee, "drapeau sur le cadre"); eq(s.hist, 1, "hist");
});
sc(63, "Lot S, A, B : « 1 signalée sur 3 » ; Annuler = aucune posée", () => {
  const s = new Seance("S:P! A:P B:P");
  s.g({ type: "filtrer", filtres: { montrerSignalees: true } }).g({ type: "selectionner", ids: ["S", "A", "B"] });
  s.g({ type: "poser", cible: page(2, "droite") });
  eq([def(s.e.confirmation, "confirmation").nb, def(s.e.confirmation, "confirmation").total], [1, 3], "1 sur 3");
  s.g({ type: "annulerConfirmation" });
  eq(s.ids(2, "droite"), null, "aucune posée"); eq(s.hist, 0, "hist");
});
sc(64, "S posée puis signalées masquées : elle reste, l'export la liste", () => {
  const s = new Seance("A:P S:P!");
  s.g({ type: "filtrer", filtres: { montrerSignalees: true } }).g({ type: "poser", cible: page(2, "droite"), ids: ["S"] }).g({ type: "confirmer" });
  s.g({ type: "filtrer", filtres: { montrerSignalees: false } });
  eq(s.ids(2, "droite"), ["S"], "reste"); ok(O.bande(s.e, pl(2))[1].photos[0].signalee, "drapeau dans la bande");
  eq(O.avertissementsExport(s.e).signaleesPosees, ["S"], "export");
});
sc(65, "Photo indisponible : jamais perdue par Séparer, Double page, R ; l'export l'annonce", () => {
  const cat = catalogue("A:P B:L");
  let m = magazineVide(3);
  m = O.ajouter(m, pl(2), "droite", ["A", "B"], new Map(cat.map((p) => [p.id, p]))).magazine;
  const s = new Seance(cat.filter((p) => p.id !== "A"), { magazine: m });
  s.g({ type: "naviguer", plancheId: pl(2) });
  ok(def(photosPlanche(s.e).find((c) => c.photoId === "A"), "cadre A").indisponible, "cadre « Photo indisponible »");
  s.g({ type: "fusionner" }); ok(s.idsPleins(2, "double").includes("A"), "Double page : A là");
  s.g({ type: "touche", cle: "r" }); ok(s.idsPleins(2, "double").includes("A"), "R : A là");
  s.g({ type: "separer" }); ok([...(s.ids(2, "gauche") ?? []), ...(s.ids(2, "droite") ?? [])].includes("A"), "Séparer : A là");
  eq(O.avertissementsExport(s.e).indisponibles, ["A"], "export");
});
sc(66, "800 × 1200 dans G-P1-a → ≈ 116 dpi, point orange ; zoom 2 → ≈ 58", () => {
  const s = new Seance("A:800x1200").pose(2, "droite", ["A"]).zero();
  if (s.tpl(2, "droite") !== "G-P1-a") s.g({ type: "choisirGabarit", plancheId: pl(2), cible: "droite", templateId: "G-P1-a" });
  eq(s.tpl(2, "droite"), "G-P1-a", "gabarit");
  const c = photosPlanche(s.e, pl(2))[0];
  proche(c.dpi, 116.11, 0.01, "dpi"); ok(c.basseDef, "point orange"); ok(O.etatPhoto(s.e, "A").basseDef, "repère en bibliothèque");
  s.g({ type: "ouvrirRecadrage", ref: ref(2, "droite", 0) }).g({ type: "zoomerImage", zoom: 2 });
  proche(photosPlanche(s.e, pl(2))[0].dpi, 58.06, 0.01, "dpi en direct");
});
sc(67, "4000 × 6000 dans le même cadre → ≈ 581 dpi, aucun repère", () => {
  const s = new Seance("A:4000x6000").pose(2, "droite", ["A"]).zero();
  if (s.tpl(2, "droite") !== "G-P1-a") s.g({ type: "choisirGabarit", plancheId: pl(2), cible: "droite", templateId: "G-P1-a" });
  const c = photosPlanche(s.e, pl(2))[0];
  proche(c.dpi, 580.6, 0.1, "dpi"); ok(!c.basseDef, "aucun repère");
});

// Sauvegarde, plusieurs personnes, ouverture
sc(68, "Enregistrement, hors ligne, reprise", () => {
  const s = new Seance("A:P B:P");
  s.g({ type: "poser", cible: page(2, "droite"), ids: ["A"] }); eq(s.e.sauvegarde.etat, "en_attente", "en attente");
  s.g({ type: "sauvegardeEnvoi" }); eq(s.e.sauvegarde.etat, "envoi", "Enregistrement…");
  s.g({ type: "sauvegardeOk", le: "2026-10-28T10:00:02.000Z", magazine: s.e.magazine }); eq([s.e.sauvegarde.etat, s.e.sauvegarde.version], ["enregistre", 2], "Enregistré, version +1");
  s.g({ type: "poser", cible: page(2, "droite"), ids: ["B"] }).g({ type: "sauvegardeEnvoi" }).g({ type: "sauvegardeHorsLigne" });
  eq(s.e.sauvegarde.etat, "hors_ligne", "Hors ligne · copie locale");
  s.g({ type: "sauvegardeEnvoi" }).g({ type: "sauvegardeOk", le: "2026-10-28T10:01:00.000Z", magazine: s.e.magazine });
  eq([s.e.sauvegarde.etat, s.e.sauvegarde.version], ["enregistre", 3], "Enregistré");
});
sc(69, "409 : lecture seule ; Prendre sa version ; ma version récupérable une fois", () => {
  const s = new Seance("A:P B:P L1:L");
  s.g({ type: "poser", cible: page(2, "droite"), ids: ["A"] }).g({ type: "sauvegardeEnvoi" });
  s.g({ type: "sauvegardeConflit", enBase: { version: 5, modifie_par: "Louis", modifie_le: "2026-10-28T14:32:00.000Z" } });
  ok(O.lectureSeule(s.e), "lecture seule");
  const m = s.e.magazine;
  s.g({ type: "poser", cible: page(2, "gauche"), ids: ["B"] }).g({ type: "commencerGlisser", source: s.bib(["B"]) });
  ok(s.e.magazine === m && !s.e.glisser, "les glisser sont coupés");
  const louis = O.ajouter(magazineVide(10), pl(3), "droite", ["L1"], s.e.catalogue).magazine;
  s.g({ type: "prendreSaVersion", magazine: louis, version: 5, le: "2026-10-28T14:32:00.000Z" });
  ok(s.e.magazine === louis && s.hist === 0 && !O.lectureSeule(s.e), "sa version, historique vidé"); ok(s.e.copieLocale === m, "ma version en copie locale");
  s.g({ type: "recupererCopieLocale" }); ok(O.egal(s.e.magazine, m), "récupérée");
  const m2 = s.e.magazine; s.g({ type: "recupererCopieLocale" }); ok(s.e.magazine === m2, "une seule fois");
});
sc(70, "409 : Garder la mienne → PUT avec la version reçue, Enregistré", () => {
  const s = new Seance("A:P");
  s.g({ type: "poser", cible: page(2, "droite"), ids: ["A"] }).g({ type: "sauvegardeEnvoi" });
  s.g({ type: "sauvegardeConflit", enBase: { version: 5, modifie_par: "Louis", modifie_le: "2026-10-28T14:32:00.000Z" } });
  s.g({ type: "garderLaMienne" }); eq([s.e.sauvegarde.etat, s.e.sauvegarde.version], ["envoi", 5], "envoi avec la version 5");
  s.g({ type: "sauvegardeOk", le: "2026-10-28T14:33:00.000Z", magazine: s.e.magazine }); eq([s.e.sauvegarde.etat, s.e.sauvegarde.version], ["enregistre", 6], "Enregistré");
});
sc(71, "Ouvert par Louis il y a 1 min → bandeau doux, édition possible", () => {
  const maintenant = "2026-10-28T10:00:00.000Z";
  eq(O.bandeauOuverture({ modifie_par: "Louis", modifie_le: "2026-10-28T09:59:00.000Z" }, "Mathias", maintenant), "Louis modifie ce magazine", "bandeau");
  eq(O.bandeauOuverture({ modifie_par: "Louis", modifie_le: "2026-10-28T09:57:00.000Z" }, "Mathias", maintenant), null, "plus de 2 min : rien");
  eq(O.bandeauOuverture({ modifie_par: "Mathias", modifie_le: "2026-10-28T09:59:30.000Z" }, "Mathias", maintenant), null, "moi : rien");
  const s = new Seance("A:P"); s.g({ type: "poser", cible: page(2, "droite"), ids: ["A"] }); eq(s.ids(2, "droite"), ["A"], "édition possible");
});
sc(72, "Collecte ouverte → lien discret + avertissement, on ne bloque pas", () => {
  const ex = exemple();
  const porte = O.porteEdition(def(ex.editions.find((x) => x.collecte === "ouverte"), "édition ouverte"), ex.projets);
  if (porte.mode !== "collecte_ouverte") throw new Echec(`mode ${porte.mode}`);
  eq(porte.mode, "collecte_ouverte", "mode"); eq(porte.lienDiscret, "Mise en page", "lien"); eq(porte.avertissement, "Collecte ouverte : des photos peuvent encore arriver", "avertissement");
  ok(porte.boutons.length > 0, "on peut quand même ouvrir");
});
sc(73, "Collecte close, Magazine 1 déjà en projet → « Reprendre le Magazine 1 », jamais un second", () => {
  const ex = exemple();
  const ed = ex.editions[0];
  const porte = O.porteEdition(ed, ex.projets);
  if (porte.mode !== "pret") throw new Echec(`mode ${porte.mode}`);
  eq(porte.carte, "Prêt à composer · 1 240 photos · 3 magazines", "carte");
  eq([porte.boutons[0].libelle, porte.boutons[0].projetId], ["Reprendre le Magazine 1", "prj-alpes-1"], "Reprendre");
  eq(porte.boutons[2].libelle, "Composer le Magazine 3", "Mag. 3 à composer");
  ok(!O.ongletsProjets(ex).aDemarrer.some((x) => x.source.ref === ed.id && x.source.magazine === 1), "le Mag. 1 n'est pas « à démarrer »");
});

/* ─────────── en plus : I20 et I22 sur les opérations pures ─────────── */
sc(74, "I20 : gabaritsClasses non vide, trié, bon nombre (1 à 6 page, 1 à 12 double)", () => {
  const h = hasard(5);
  for (const [portee, max] of [["page", 6], ["double", 12]] as const) for (let n = 1; n <= max; n++) for (let k = 0; k < 20; k++) {
    const ph = Array.from({ length: n }, (_, i) => ({ id: `x${i}`, nom: "x", l: [2000, 3000, 2000][Math.floor(h() * 3)], h: [3000, 2000, 2000][Math.floor(h() * 3)], date: null }));
    const l = O.gabaritsClasses(portee, ph, null);
    ok(l.length > 0, `${portee} ${n} vide`);
    ok(l.every((x, i) => x.template.nbPhotos === n && x.template.portee === portee && (i === 0 || x.note >= l[i - 1].note - 1e-9)), `${portee} ${n} mal trié`);
  }
  eq(O.gabaritsClasses("page", [], null), [], "0 photo"); eq(O.gabaritsClasses("page", Array(7).fill({ l: 1, h: 1 }), null), [], "7 photos");
});

sc(75, "R vise la page survolée, puis le cadre actif, puis la gauche", () => {
  const s = new Seance("A:P B:P C:P D:P E:P").pose(2, "gauche", ["A", "B"]).pose(2, "droite", ["C", "D", "E"]).zero();
  s.g({ type: "naviguer", plancheId: pl(2) });
  const g0 = s.tpl(2, "gauche"), d0 = s.tpl(2, "droite");
  s.g({ type: "touche", cle: "r", survol: { plancheId: pl(2), cible: "droite" } });
  eq(s.tpl(2, "gauche"), g0, "survol droite : la gauche ne bouge pas"); ok(s.tpl(2, "droite") !== d0, "survol droite : la droite change");
  const d1 = s.tpl(2, "droite");
  s.g({ type: "activerCadre", ref: ref(2, "droite", 0) });
  s.g({ type: "touche", cle: "r", survol: { plancheId: pl(2), cible: "gauche" } });
  ok(s.tpl(2, "gauche") !== g0, "le survol passe avant le cadre actif"); eq(s.tpl(2, "droite"), d1, "droite inchangée");
  const g1 = s.tpl(2, "gauche");
  s.g({ type: "touche", cle: "r" });
  ok(s.tpl(2, "droite") !== d1, "sans survol : le cadre actif (droite)"); eq(s.tpl(2, "gauche"), g1, "gauche inchangée");
  const d2 = s.tpl(2, "droite");
  s.g({ type: "touche", cle: "r", survol: { plancheId: pl(3), cible: "droite" } });
  ok(s.tpl(2, "droite") !== d2, "survol d'une autre planche ignoré : cadre actif");
  s.g({ type: "touche", cle: "r", survol: { plancheId: pl(2), cible: "double" } });
  eq(s.e.magazine.planches[1].mode, "pages", "survol « double » en mode pages ignoré, rien ne casse");
});

sc(76, "Cmd+clic retire d'une sélection ; une masquée se retire aussi (cercle, ×), sans en ajouter", () => {
  const s = new Seance("A:P B:P C:L");
  s.g({ type: "cliquerPhoto", id: "A", mode: "simple" }).g({ type: "cliquerPhoto", id: "B", mode: "ajout" }).g({ type: "cliquerPhoto", id: "C", mode: "ajout" });
  eq(s.e.selection.ids, ["A", "B", "C"], "3");
  s.g({ type: "cliquerPhoto", id: "B", mode: "ajout" }); eq(s.e.selection.ids, ["A", "C"], "Cmd+clic retire B");
  s.g({ type: "filtrer", filtres: { orientations: ["P"] } });
  eq(O.selectionMasquee(s.e), ["C"], "C masquée");
  s.g({ type: "cliquerPhoto", id: "C", mode: "ajout" }); eq(s.e.selection.ids, ["A"], "C retirée bien que masquée");
  s.g({ type: "cliquerPhoto", id: "C", mode: "ajout" }); eq(s.e.selection.ids, ["A"], "une masquée ne s'ajoute pas");
});
sc(77, "Glisser la sélection, masquées comprises : posées sortent, restées restent", () => {
  const s = new Seance("A:P B:P C:P D:P E:P F:P G:L H:L").pose(2, "droite", ["A", "B", "C", "D"]).zero();
  s.g({ type: "naviguer", plancheId: pl(2) });
  s.g({ type: "selectionner", ids: ["E", "F", "G", "H"] }).g({ type: "filtrer", filtres: { orientations: ["P"] } });
  eq(O.selectionMasquee(s.e), ["G", "H"], "G, H masquées");
  const lot = O.selectionOrdonnee(s.e); eq(lot, ["E", "F", "G", "H"], "le glisser prend tout");
  s.glisse(s.bib(lot), page(2, "droite"));
  eq(s.ids(2, "droite"), ["A", "B", "C", "D", "E", "F"], "6 posées"); eq(s.e.selection.ids, ["G", "H"], "les restées restent");
});
sc(78, "Poser une photo seule hors sélection : la sélection ne bouge pas, sauf la posée", () => {
  const s = new Seance("A:P B:P C:P D:P");
  s.g({ type: "selectionner", ids: ["A", "B"] });
  s.glisse(s.bib(["C"]), page(2, "droite"));
  eq(s.e.selection.ids, ["A", "B"], "sélection intacte");
  s.glisse(s.bib(["A"]), page(2, "droite"));
  eq(s.e.selection.ids, ["B"], "A posée sort");
});
sc(79, "« Utilisées » masquées : les posées disparaissent de la bibliothèque, pas des repères", () => {
  const s = new Seance("A:P B:P C:P").pose(2, "droite", ["A"]).zero();
  s.g({ type: "filtrer", filtres: { masquerUtilisees: true } });
  eq(O.visibles(s.e), ["B", "C"], "A masquée"); eq(O.compteurs(s.e).photosPosees, 1, "compteur");
  s.g({ type: "effacerFiltres" }); eq(s.e.filtres.masquerUtilisees, true, "Tout effacer garde ce réglage d'affichage");
  s.g({ type: "retirer", ref: ref(2, "droite", 0) }); ok(O.visibles(s.e).includes("A"), "retirée = libre = visible");
});

/* ═══════════ le test aléatoire à graine ═══════════
   Des séquences de 20 à 60 gestes tirés parmi TOUS les gestes (parfois à côté, parfois invalides), invariants
   vérifiés après chaque geste, puis « annuler tout, rétablir tout ». En cas d'échec : la graine et la séquence
   minimale réduite (rejouable). */

type Libre = Record<string, unknown>;
/** Un geste tiré au hasard n'a aucune raison d'être valide : le réducteur doit le tenir quand même. */
const G = (g: Libre): Geste => g as unknown as Geste;
const pickDe = <T,>(h: () => number, l: readonly T[]): T => l[Math.floor(h() * l.length)];

/** Le monde de départ (ARCHI §4 : 42 photos, 3 signalées, 2 indisponibles). */
function monde(graine: number): EtatEditeur {
  const h = hasard(graine);
  const pick = <T,>(l: readonly T[]): T => pickDe(h, l);
  const dims: [number, number][] = [[2000, 3000], [3000, 2000], [2000, 2000], [800, 1200], [4000, 3000], [3024, 4032]];
  const personnes = ["Inès", "Bastien", "Camille", "Yanis", "Léa", "Hugo"];
  const types: PhotoMaq["type"][] = ["lien", "responsable", "atelier"];
  const photos: PhotoMaq[] = Array.from({ length: 42 }, (_, i) => {
    const [l, hh] = pick(dims);
    return { id: `p${i}`, nom: `IMG_${100 + i}.jpg`, l, h: hh, date: i % 13 === 5 ? null : `2026-06-1${1 + (i % 3)}T${String(8 + (i % 12)).padStart(2, "0")}:00:00.000Z`,
      personne: pick(personnes), lien: null, type: pick(types), coeur: h() < 0.2, signalee: i === 3 || i === 17 || i === 29,
      autresMagazines: i % 9 === 0 ? [1] : [], nouvelle: false, vignette: null };
  });
  const catTout = new Map(photos.map((p) => [p.id, p]));
  let m = nouveauMagazine("mag-alea", "Aléa", "2026-10-28T10:00:00.000Z");
  const nbPl = 2 + Math.floor(h() * 7);
  for (let k = 1; k < nbPl; k++) m = O.insererDouble(m, m.planches[m.planches.length - 1].id).magazine;
  const indispo = ["p40", "p41"];
  // des doubles en portraits : l'annexe (DP-01, DP-02) et ses cadres texte entrent dans le jeu
  const portraits = photos.filter((p) => p.h > p.l && p.l >= 2000).map((p) => p.id);
  for (let k = 1; k < m.planches.length; k += 2) {
    if (h() < 0.5 && portraits.length >= 3) m = O.ajouter(m, m.planches[k].id, "double", [pick(portraits), pick(portraits), pick(portraits)].slice(0, h() < 0.5 ? 2 : 3), catTout).magazine;
  }
  for (const p of m.planches) {
    if (h() < 0.25) continue;
    const i = m.planches.indexOf(p);
    const tirer = (n: number): string[] => Array.from({ length: n }, () => `p${Math.floor(h() * 42)}`);
    if (i > 0 && h() < 0.3) m = O.ajouter(m, p.id, "double", tirer(1 + Math.floor(h() * 8)), catTout).magazine;
    else {
      if (i > 0) m = O.ajouter(m, p.id, "gauche", tirer(1 + Math.floor(h() * 4)), catTout).magazine;
      m = O.ajouter(m, p.id, "droite", tirer(1 + Math.floor(h() * 4)), catTout).magazine;
    }
  }
  // les deux indisponibles : posées, puis retirées du catalogue
  m = O.ajouter(m, m.planches[0].id, "droite", indispo.slice(0, 1), catTout).magazine;
  if (m.planches[1]) m = O.ajouter(m, m.planches[1].id, m.planches[1].mode === "double" ? "double" : "gauche", indispo.slice(1), catTout).magazine;
  const cat = photos.filter((p) => !indispo.includes(p.id));
  return O.creerEtat({ magazine: m, catalogue: cat, projet: { nom: "Aléa", source: "edition", nbPagesCible: h() < 0.5 ? 28 : null } });
}

/** Le tireur de gestes : lit l'état pour viser juste, parfois à côté. */
function tireur(h: () => number): (e: EtatEditeur) => Libre {
  const pick = <T,>(l: readonly T[]): T => pickDe(h, l);
  const int = (a: number, b: number): number => a + Math.floor(h() * (b - a + 1));
  const plancheId = (e: EtatEditeur): string => (h() < 0.06 ? "pl-999" : pick(e.magazine.planches).id);
  const cible = (): Cible => pick<Cible>(["gauche", "droite", "double"]);
  const refs = (e: EtatEditeur): RefCadre[] => {
    const out: RefCadre[] = [];
    for (const p of e.magazine.planches) for (const x of O.photosDe(p)) out.push(x.ref);
    return out;
  };
  const uneRef = (e: EtatEditeur): RefCadre => {
    const r = refs(e);
    if (!r.length || h() < 0.07) return { plancheId: plancheId(e), cible: cible(), index: int(-1, 7) };
    return { ...pick(r) };
  };
  const refTexte = (e: EtatEditeur): RefCadre => {
    const out: RefCadre[] = [];
    for (const p of e.magazine.planches) for (const c of ["double", "gauche", "droite"] as const) {
      const d = c === "double" ? p.double : p[c];
      if (d && (c === "double") === (p.mode === "double")) d.textes.forEach((_, index) => out.push({ plancheId: p.id, cible: c, index }));
    }
    return out.length && h() < 0.9 ? pick(out) : { plancheId: plancheId(e), cible: cible(), index: int(0, 6) };
  };
  const ids = (e: EtatEditeur, n: number): string[] => {
    const tous = [...e.catalogue.keys()];
    const out: string[] = [];
    for (let k = 0; k < n; k++) out.push(h() < 0.04 ? pick(["inconnu", "p40", "p41"]) : pick(tous));
    return out;
  };
  const cibleDepot = (e: EtatEditeur): Libre => {
    switch (int(0, 6)) {
      case 0: return { type: "page", plancheId: plancheId(e), cote: pick(["gauche", "droite"]) };
      case 1: return { type: "double", plancheId: plancheId(e) };
      case 2: return { type: "cadre", ref: uneRef(e) };
      case 3: return { type: "bande", plancheId: plancheId(e), position: int(-1, 8), ...(h() < 0.7 ? { cote: pick(["gauche", "droite", "double"]) } : {}) };
      case 4: return { type: "bibliotheque" };
      case 5: return { type: "vignette", plancheId: plancheId(e) };
      default: return { type: "entre", index: int(-1, e.magazine.planches.length + 1) };
    }
  };
  const source = (e: EtatEditeur): Libre => {
    const k = int(0, 4);
    if (k <= 1) return { type: "bibliotheque", ids: ids(e, int(1, 5)) };
    if (k <= 3) {
      const r = uneRef(e);
      const p = e.magazine.planches.find((x) => x.id === r.plancheId);
      const trouvee = p ? O.photosDe(p).find((x) => x.ref.cible === r.cible && x.ref.index === r.index) : undefined;
      return { type: "cadre", ref: r, photoId: trouvee?.photoId };
    }
    return { type: "planche", plancheId: plancheId(e) };
  };
  const filtres = (): Libre => {
    const f: Libre = {};
    const k = int(0, 10);
    if (k === 0) f.recherche = pick(["", "IMG_1", "1", "zz", "img_12"]);
    if (k === 1) f.statut = pick(["toutes", "libres", "utilisees", "planche", "n'importe"]);
    if (k === 2) f.personnes = h() < 0.5 ? [] : [pick(["Inès", "Léa", "Hugo"])];
    if (k === 3) f.types = h() < 0.5 ? [] : [pick(["lien", "responsable", "atelier"])];
    if (k === 4) f.coeur = h() < 0.5;
    if (k === 5) f.orientations = h() < 0.5 ? [] : [pick(["P", "L", "C"])];
    if (k === 6) f.montrerSignalees = h() < 0.6;
    if (k === 7) f.tri = pick(["date", "nom", "personne"]);
    if (k === 8) f.groupe = pick(["jour", "personne", "type", "aucun"]);
    if (k === 9) f.taille = pick(["S", "M", "L"]);
    if (k === 10) f.masquerUtilisees = h() < 0.5;
    return f;
  };

  const tirages: [number, (e: EtatEditeur) => Libre][] = [
    [8, (e) => ({ type: "poser", cible: cibleDepot(e), ...(h() < 0.6 ? { ids: ids(e, int(1, 7)) } : {}) })],
    [3, (e) => ({ type: "ajouter", cible: { type: "page", plancheId: plancheId(e), cote: cible() }, ids: ids(e, int(1, 4)) })],
    [8, (e) => ({ type: "deposer", source: source(e), cible: cibleDepot(e), ...(h() < 0.1 ? { confirme: true } : {}) })],
    [4, (e) => ({ type: "remplacer", ref: uneRef(e), photoId: ids(e, 1)[0] })],
    [5, (e) => ({ type: "echanger", a: uneRef(e), b: uneRef(e) })],
    [5, (e) => ({ type: "deplacerPhoto", de: uneRef(e), vers: { plancheId: plancheId(e), cible: cible(), ...(h() < 0.5 ? { position: int(-1, 7) } : {}) } })],
    [4, (e) => ({ type: "retirer", ref: uneRef(e) })],
    [3, (e) => { const r = uneRef(e); return { type: "reordonner", plancheId: r.plancheId, cible: r.cible, de: r.index, vers: int(-1, 7) }; }],
    [4, (e) => { const r = uneRef(e); const t = pick(tousLesTemplates()); return { type: "choisirGabarit", plancheId: r.plancheId, cible: r.cible, templateId: h() < 0.1 ? "X-0" : t.id }; }],
    [5, (e) => { const r = uneRef(e); const l = O.gabaritsPour(e, r.plancheId, r.cible); return { type: "choisirGabarit", plancheId: r.plancheId, cible: r.cible, templateId: l.length ? pick(l).id : "G-P1-a" }; }],
    [4, (e) => { const r = uneRef(e); return { type: "autreGabarit", plancheId: r.plancheId, cible: r.cible, sens: pick([1, -1, 3]) }; }],
    [3, (e) => ({ type: "fusionner", plancheId: plancheId(e) })],
    [3, (e) => ({ type: "separer", plancheId: plancheId(e) })],
    [2, (e) => ({ type: "insererDouble", ...(h() < 0.5 ? { apres: plancheId(e) } : {}) })],
    [2, (e) => ({ type: "deplacerPlanche", plancheId: plancheId(e), versIndex: int(-2, 10) })],
    [1, (e) => ({ type: "supprimerPlanche", plancheId: plancheId(e) })],
    [1, (e) => ({ type: "vider", plancheId: plancheId(e) })],
    [2, (e) => ({ type: "ajouterSurPlanche", plancheId: plancheId(e), ...(h() < 0.7 ? { ids: ids(e, int(1, 4)) } : {}) })],
    [3, (e) => ({ type: "ouvrirRecadrage", ref: uneRef(e) })],
    [3, () => ({ type: "deplacerImage", ddx: (h() - 0.5) * 80, ddy: (h() - 0.5) * 80 })],
    [2, () => ({ type: "zoomerImage", zoom: pick([0, 1, 1.3, 2, 5, 9, NaN]) })],
    [1, () => ({ type: "recadrer", recadrage: { zoom: pick([1, 2, 8, 20, NaN]), dx: pick([0, 5, -300, Infinity]), dy: pick([0, 4, 1e9]) } })],
    [1, () => ({ type: "recentrer" })],
    [2, () => ({ type: "fermerRecadrage" })],
    [3, (e) => ({ type: "ouvrirTexte", ref: refTexte(e) })],
    [3, () => ({ type: "taper", contenu: pick(["Lisbonne", "", "Été 2026", "Titre", "R", "Légende"]) })],
    [2, () => ({ type: "fermerTexte" })],
    [2, () => ({ type: "confirmer" })],
    [1, () => ({ type: "annulerConfirmation" })],
    [5, () => ({ type: "filtrer", filtres: {} })],
    [5, () => ({ type: "filtrer", filtres: filtres() })],
    [1, () => ({ type: "retirerFiltre", cle: pick(["statut", "personnes", "montrerSignalees", "bidon"]) })],
    [1, () => ({ type: "effacerFiltres" })],
    [5, (e) => ({ type: "cliquerPhoto", id: ids(e, 1)[0], mode: pick(["simple", "plage", "ajout"]) })],
    [1, (e) => ({ type: "selectionner", ids: ids(e, int(0, 6)) })],
    [1, () => ({ type: "viderSelection" })],
    [2, (e) => ({ type: "activerCadre", ref: h() < 0.2 ? null : uneRef(e) })],
    [1, (e) => ({ type: "armerEchange", ...(h() < 0.5 ? { ref: uneRef(e) } : {}) })],
    [1, () => ({ type: "desarmerEchange" })],
    [4, (e) => ({ type: "cliquerCible", cible: cibleDepot(e) })],
    [1, () => ({ type: "panneau", basculer: true })],
    [3, (e) => ({ type: "commencerGlisser", source: source(e) })],
    [3, (e) => ({ type: "commencerGlisser", source: { type: "bibliotheque", ids: O.selectionOrdonnee(e) }, depuisBande: true })],
    [4, (e) => ({ type: "survoler", cible: h() < 0.1 ? null : cibleDepot(e) })],
    [4, () => ({ type: "lacher" })],
    [1, () => ({ type: "abandonnerGlisser" })],
    [6, (e) => ({ type: "touche", cle: pick(["r", "R", "x", "Escape", "Enter", "Backspace", "Delete", "ArrowLeft", "ArrowRight", "p", "z", "q"]),
      shift: h() < 0.3, meta: h() < 0.15, alt: h() < 0.15, ...(h() < 0.4 ? { survol: { plancheId: plancheId(e), cible: pick(["gauche", "droite", "double"]) } } : {}) })],
    [4, (e) => ({ type: "naviguer", ...(h() < 0.5 ? { sens: pick([1, -1]) } : { plancheId: plancheId(e) }) })],
    [5, () => ({ type: "annuler", rafale: 1 + Math.floor(h() * 6) })],
    [4, () => ({ type: "retablir", rafale: 1 + Math.floor(h() * 6) })],
    [1, () => ({ type: "fermerMessage" })],
    [1, (e) => ({ type: "voirRetiree", id: ids(e, 1)[0] })],
    [1, () => ({ type: pick(["sauvegardeEnvoi", "sauvegardeOk", "sauvegardeHorsLigne", "sauvegardeErreur"]), le: "2026-10-28T10:00:00.000Z" })],
    [1, () => ({ type: "rien" })],
    [1, () => ({ type: "geste-inconnu" })],
  ];
  const total = tirages.reduce((s, [p]) => s + p, 0);
  const seanceRecadrage: (() => Libre)[] = [
    () => ({ type: "deplacerImage", ddx: (h() - 0.5) * 60, ddy: (h() - 0.5) * 60 }),
    () => ({ type: "zoomerImage", zoom: 1 + h() * 7.5 }),
    () => ({ type: "recadrer", recadrage: { zoom: pick([1, 2, 8, 20, NaN]), dx: pick([0, 5, -300, Infinity]), dy: pick([0, 4, 1e9]) } }),
    () => ({ type: "recentrer" }),
    () => ({ type: "fermerRecadrage" }),
    () => ({ type: "touche", cle: pick(["Escape", "Enter", "r"]) }),
  ];
  const seanceTexte: (() => Libre)[] = [
    () => ({ type: "taper", contenu: pick(["Lisbonne", "", "Été 2026", "Titre", "R", "Légende", "Chamonix", "Sommet"]) }),
    () => ({ type: "taper", contenu: "Mot " + Math.floor(h() * 100) }),
    () => ({ type: "touche", cle: pick(["Backspace", "r", "z"]), meta: h() < 0.3 }),
    () => ({ type: "annuler" }),
    () => ({ type: "fermerTexte" }),
  ];
  return (e) => {
    if (e.recadrage && h() < 0.75) return pick(seanceRecadrage)();
    if (e.texte && h() < 0.75) return pick(seanceTexte)();
    if (e.confirmation && h() < 0.5) return { type: h() < 0.8 ? "confirmer" : "annulerConfirmation" };
    let x = h() * total;
    for (const [p, f] of tirages) { if ((x -= p) < 0) return f(e); }
    return { type: "rien" };
  };
}

type Stats = { gestes: number; tires: number; parOp: Map<string, number> };
const neFerme: Geste = { type: "activerCadre", ref: null }; // « clic ailleurs » : ferme les séances

/** Joue les gestes ; rend null si tout tient, sinon le message d'échec. `stats` compte les gestes. */
function jouer(depart: EtatEditeur, gestes: Libre[], stats: Stats | null): string | null {
  let e = depart;
  const vus = new Set(depart.magazine.planches.map((p) => p.id)); // I6 : un id de planche disparu ne revient jamais
  try {
    for (let k = 0; k < gestes.length; k++) {
      const l = gestes[k];
      const g = G(l);
      const fois = (l.type === "annuler" || l.type === "retablir") && typeof l.rafale === "number" && l.rafale ? l.rafale : 1;
      for (let r = 0; r < fois; r++) {
        const avant = geler(e);
        const apres = O.appliquer(avant, g);
        if (stats) stats.gestes++;
        const err = O.verifierInvariants(apres, avant, g);
        if (err.length) return `geste ${k} ${JSON.stringify(l)} : ${err.join(" ; ")}`;
        if (l.type !== "annuler" && l.type !== "retablir" && !(l.type === "touche" && (l.meta || l.ctrl))) {
          const avantIds = new Set(avant.magazine.planches.map((p) => p.id));
          for (const p of apres.magazine.planches) if (!avantIds.has(p.id) && vus.has(p.id)) return `geste ${k} : I6 id de planche réutilisé ${p.id}`;
        }
        for (const p of apres.magazine.planches) vus.add(p.id);
        if (stats) {
          const op = O.primitif(avant, g).type;
          const cle = op + (apres.magazine !== avant.magazine ? " (change)" : avant.confirmation !== apres.confirmation && apres.confirmation ? " (confirmation)" : "");
          stats.parOp.set(cle, (stats.parOp.get(cle) || 0) + 1);
        }
        // Bande de sélection : un glisser qui en part emporte toute la sélection, masquées comprises
        if (l.depuisBande && apres.glisser) {
          const srcG = apres.glisser.source;
          const src = srcG.type === "bibliotheque" ? srcG.ids : [];
          const demandee = (l.source as { ids?: string[] }).ids ?? [];
          const voulu = demandee.filter((id) => avant.catalogue.has(id));
          if (!voulu.every((id) => src.includes(id))) return `geste ${k} : le glisser de la bande perd des photos (${src.length} sur ${voulu.length})`;
        }
        // Après un dépôt de la bibliothèque : posées hors sélection, restées dedans
        if (apres.magazine !== avant.magazine && !apres.confirmation && apres.derniere && apres.derniere !== avant.derniere && !apres.derniere.refus) {
          const pg = O.primitif(avant, g);
          if ((pg.type === "deposer" && pg.source && pg.source.type === "bibliotheque") || pg.type === "ajouterSurPlanche") {
            const sel = new Set(apres.selection.ids);
            const avantMag = O.idsMagazine(avant.magazine);
            const posees = O.idsMagazine(apres.magazine).filter((id) => !avantMag.includes(id));
            if (posees.some((id) => sel.has(id))) return `geste ${k} : une photo posée reste sélectionnée`;
            if ((apres.derniere.restees || []).some((id) => !sel.has(id) && apres.catalogue.has(id))) return `geste ${k} : une restée à côté a quitté la sélection ${JSON.stringify(l)} ${JSON.stringify(apres.derniere)} sel=${JSON.stringify(apres.selection.ids)}`;
          }
        }
        // I30 : un lâcher adopte exactement l'aperçu
        if (l.type === "lacher" && avant.glisser && avant.glisser.survol && avant.glisser.apercu) {
          const ap = avant.glisser.apercu;
          const attendu = apres.confirmation ? O.appliquer(apres, { type: "confirmer" }).magazine : apres.magazine;
          if (!O.lectureSeule(avant) && !ap.refus && !O.egal(ap.magazine, attendu)) return `geste ${k} : I30 l'aperçu diffère du lâcher`;
        }
        // I30 bis : apercu(etat, geste) rend exactement l'état du geste (P0)
        if (stats && k % 7 === 0 && !O.egal(O.apercu(avant, g).magazine, apres.magazine)) return `geste ${k} : apercu ≠ appliquer`;
        // I25 : si une entrée est poussée, annuler puis rétablir rend le même magazine (même référence)
        if (apres.historique.passe.length > avant.historique.passe.length && !apres.texte && !apres.recadrage) {
          const a1 = O.annuler(apres);
          const a2 = O.retablir(a1);
          if (a2.magazine !== apres.magazine) return `geste ${k} : I25 annuler puis rétablir ne rend pas le même magazine`;
          const e1 = O.verifierInvariants(a1); if (e1.length) return `geste ${k} : après annuler, ${e1.join(" ; ")}`;
        }
        e = apres;
      }
    }
    // Fin : fermer les séances, annuler tout (I26), rétablir tout (I25 en k pas)
    e = O.appliquer(e, neFerme);
    const final = e.magazine;
    const n = e.historique.passe.length;
    let x = e;
    for (let k = 0; k < n; k++) {
      const y = O.appliquer(x, { type: "annuler" });
      const err = O.verifierInvariants(y, x, { type: "annuler" });
      if (err.length) return `annuler-tout ${k} : ${err.join(" ; ")}`;
      x = y;
    }
    if (!O.lectureSeule(x) && !O.egal(x.magazine, depart.magazine)) return "I26 annuler tout ne rend pas le magazine de départ";
    for (let k = 0; k < n; k++) x = O.appliquer(x, { type: "retablir" });
    if (!O.lectureSeule(x) && x.magazine !== final) return "I25 rétablir tout ne rend pas le magazine final (même référence)";
    return null;
  } catch (err) {
    return `exception : ${err instanceof Error && err.stack ? err.stack.split("\n").slice(0, 4).join(" | ") : String(err)}`;
  }
}

/** Réduction : on retire des gestes tant que l'échec persiste (par blocs, puis un par un). */
function reduire(depart: EtatEditeur, gestes: Libre[]): Libre[] {
  let courant = gestes.slice();
  let bloc = Math.max(1, Math.floor(courant.length / 2));
  while (bloc >= 1) {
    let progres = false;
    for (let i = 0; i + bloc <= courant.length;) {
      const essai = [...courant.slice(0, i), ...courant.slice(i + bloc)];
      if (jouer(depart, essai, null)) { courant = essai; progres = true; } else i += bloc;
    }
    if (!progres) bloc = Math.floor(bloc / 2);
  }
  return courant;
}

/** Nombre de séquences et graine globale : FIXES (le harnais complet reste de l'ordre de la seconde). */
export const SEQUENCES_ALEATOIRES = 600;
export const GRAINE_ALEATOIRE = 20261028;

/** Rend le bilan de la campagne aléatoire ; `echecs` = 0 si tout tient. */
function campagneAleatoire(nb: number, graine: number): { echecs: number; sequences: number; tires: number; joues: number; types: number; changes: number; confirmations: number } {
  const stats: Stats = { gestes: 0, tires: 0, parOp: new Map() };
  const typesVus = new Map<string, number>();
  let echecs = 0;
  const h = hasard(graine);
  for (let s = 0; s < nb; s++) {
    const graineSeq = Math.floor(h() * 2 ** 31);
    const hs = hasard(graineSeq);
    const depart = monde(graineSeq);
    const tirer = tireur(hs);
    const longueur = 20 + Math.floor(hs() * 41);
    // la séquence est tirée en jouant (le tireur lit l'état), puis rejouée telle quelle pour la vérification
    const gestes: Libre[] = [];
    let e = depart;
    for (let k = 0; k < longueur; k++) {
      const l = tirer(e);
      gestes.push(l);
      const t = String(l.type);
      typesVus.set(t, (typesVus.get(t) || 0) + 1);
      const fois = (l.type === "annuler" || l.type === "retablir") && typeof l.rafale === "number" && l.rafale ? l.rafale : 1;
      try { for (let r = 0; r < fois; r++) e = O.appliquer(e, G(l)); } catch { break; }
    }
    stats.tires += gestes.length;
    const echec = jouer(depart, gestes, stats);
    if (echec) {
      echecs++;
      const min = reduire(depart, gestes);
      console.log(`\nÉCHEC séquence ${s} (graine de séquence ${graineSeq}, graine globale ${graine})`);
      console.log(`  ${echec}`);
      console.log(`  séquence minimale (${min.length} gestes) : ${JSON.stringify(min)}`);
      console.log(`  après réduction : ${jouer(depart, min, null)}`);
      if (echecs >= 5) break;
    }
  }
  const ch = [...stats.parOp].filter(([k]) => k.endsWith("(change)"));
  return {
    echecs, sequences: nb, tires: stats.tires, joues: stats.gestes, types: typesVus.size,
    changes: ch.reduce((s, [, n]) => s + n, 0),
    confirmations: [...stats.parOp].filter(([k]) => k.endsWith("(confirmation)")).reduce((s, [, n]) => s + n, 0),
  };
}

/* ═══════════ l'entrée : appelée par verif-atelier.ts, ou seule ═══════════ */

/** Joue les scénarios puis la campagne aléatoire ; rapporte chaque scénario par `rapporter(nom, réussi)`. */
export function verifierMepEditeur(rapporter: (nom: string, reussi: boolean) => void, titre: (t: string) => void): void {
  titre("— Mise en page : l'éditeur (79 scénarios geste par geste, invariants après chaque geste) —");
  let echecs = 0;
  for (const { n, titre: nom, f } of S) {
    let msg: string | null = null;
    try { f(); } catch (e) { msg = e instanceof Echec ? e.message : e instanceof Error ? (e.stack ?? e.message) : String(e); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter(`éditeur ${n}. ${nom}`, msg === null);
  }
  /* Création libre : l'import ajoute au catalogue sans toucher au magazine, ni à l'historique ; un id connu est ignoré. */
  {
    let msg: string | null = null;
    try {
      const s = new Seance("A:P B:L").pose(1, "droite", ["A"]).zero();
      const m0 = s.e.magazine;
      const ajout = catalogue("B:P C:L D:C");
      s.g({ type: "ajouterAuCatalogue", photos: ajout });
      eq([...s.e.catalogue.keys()], ["A", "B", "C", "D"], "catalogue après import");
      ok(s.e.catalogue.get("B")?.l === 3000, "B gardée telle quelle (id connu ignoré)");
      ok(s.e.magazine === m0 && s.hist === 0, "magazine et historique intacts");
      const meme = s.e;
      s.g({ type: "ajouterAuCatalogue", photos: ajout });
      ok(s.e === meme, "réimport du même lot : état inchangé");
      s.g({ type: "poser", cible: { type: "page", plancheId: pl(2), cote: "gauche" }, ids: ["C", "D"], confirme: true });
      eq(s.idsPleins(2, "gauche").sort(), ["C", "D"], "les photos importées se posent");
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter("éditeur : création libre, des photos importées rejoignent le catalogue (ajout seul)", msg === null);
  }
  /* Doubles neuves : « Poser » un groupe (au plus 12 par double, à parts égales), lâcher sur le chemin de fer, ×n. */
  {
    let msg: string | null = null;
    try {
      const vingt = Array.from({ length: 20 }, (_, i) => `F${String(i + 1).padStart(2, "0")}:${i % 3 ? "L" : "P"}`).join(" ");
      const s = new Seance(vingt, { planches: 3 }).zero();
      const ids = [...s.e.catalogue.keys()];
      s.g({ type: "creerDoubles", ids });
      eq(s.e.magazine.planches.map((p) => p.id), ["pl-1", "pl-4", "pl-5", "pl-2", "pl-3"], "deux doubles après la planche courante");
      eq([s.idsPleins(4, "double").length, s.idsPleins(5, "double").length], [10, 10], "20 photos : 10 + 10");
      eq([...s.idsPleins(4, "double"), ...s.idsPleins(5, "double")], ids, "l'ordre du groupe suivi");
      ok(s.e.plancheCourante === "pl-4" && s.e.prochainNumero === 6 && s.hist === 1, "on arrive sur la première, une seule annulation");
      s.g({ type: "annuler" });
      eq(s.e.magazine.planches.length, 3, "annuler retire les deux doubles");
      s.g({ type: "retablir" }).zero();
      const issueGlisse = s.glisse({ type: "bibliotheque", ids: ["F01", "F02", "F03"] }, { type: "entre", index: 3 });
      ok(!issueGlisse.refus, "lâcher entre deux planches accepté");
      eq(s.e.magazine.planches[3].id, "pl-6", "la double neuve est à la place 4");
      eq(s.idsPleins(6, "double"), ["F01", "F02", "F03"], "avec les trois photos");
      eq(O.emplacements(s.e, "F01").map((x) => [x.numero, x.pages]), [[2, "2-3"], [4, "6-7"]], "×2 : les deux emplacements");
      const avant = s.e;
      s.g({ type: "creerDoubles", ids: ["inconnue"] });
      ok(s.e.magazine === avant.magazine, "photo inconnue : rien ne change");
      ok(!O.cibleAllumee(s.e, { type: "bibliotheque", ids: ["F01"] }, { type: "entre", index: 0 }), "jamais avant la planche 1");
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter("éditeur : doubles pages neuves (poser un groupe, lâcher sur le chemin de fer, emplacements ×n)", msg === null);
  }
  /* Le tri (lot 2) : pré-choisir, écarter, retirer la marque ; filtres ; jauge et répartition ; sauvegarde. */
  {
    let msg: string | null = null;
    try {
      const s = new Seance("A:P B:L C:L D:P E:C", { extra: { D: { personne: "Louise" }, E: { personne: "Louise" } } }).zero();
      const m0 = s.e.magazine;
      s.g({ type: "marquer", ids: ["A", "B", "D"], marque: "choisie" });
      eq(O.triDe(s.e.magazine).choisies, ["A", "B", "D"], "trois pré-choisies");
      ok(s.hist === 1 && s.e.eclair === null, "une annulation, pas d'éclair");
      s.g({ type: "marquer", ids: ["B", "C"], marque: "ecartee" });
      eq([O.triDe(s.e.magazine).choisies, O.triDe(s.e.magazine).ecartees], [["A", "D"], ["B", "C"]], "B passe de pré-choisie à écartée");
      eq(O.visibles(s.e).sort(), ["A", "D", "E"], "les écartées sont cachées par défaut");
      s.g({ type: "filtrer", filtres: { marque: "choisies" } }); eq(O.visibles(s.e).sort(), ["A", "D"], "filtre Pré-choisies");
      s.g({ type: "filtrer", filtres: { marque: "a_trier" } }); eq(O.visibles(s.e), ["E"], "filtre À trier");
      s.g({ type: "filtrer", filtres: { marque: "ecartees" } }); eq(O.visibles(s.e).sort(), ["B", "C"], "filtre Écartées");
      eq(O.listeTri(s.e, "a_trier"), ["E"], "vue du tri : à trier");
      ok(O.marqueDe(s.e.magazine, "B") === "ecartee" && O.marqueDe(s.e.magazine, "E") === null, "marqueDe");
      let b = O.bilanTri(s.e);
      eq([b.total, b.choisies, b.ecartees, b.aTrier, b.besoin], [5, 2, 2, 1, null], "bilan sans ratio : aucun besoin inventé");
      eq(b.parPersonne.map((x) => [x.personne, x.choisies, x.total, x.part]), [["Inès", 1, 3, 0.5], ["Louise", 1, 2, 0.5]], "répartition par personne");
      s.g({ type: "reglerTri", photosParPage: 3 });
      b = O.bilanTri(s.e);
      eq([b.photosParPage, b.besoin], [3, 3 * b.pages], "besoin = pages × photos par page");
      const avant = s.e.magazine;
      s.g({ type: "reglerTri", photosParPage: 40 });
      ok(s.e.magazine === avant, "ratio hors bornes refusé");
      ok(O.contenuValide(s.e.magazine), "un magazine trié se sauvegarde");
      ok(!O.contenuValide({ ...s.e.magazine, tri: { choisies: ["A"], ecartees: ["A"], photosParPage: null } }), "une photo pré-choisie ET écartée est refusée");
      s.g({ type: "marquer", ids: ["A", "B", "C", "D"], marque: null }).g({ type: "reglerTri", photosParPage: null });
      ok(s.e.magazine.tri === undefined && O.egal(s.e.magazine, m0), "tri revenu à vide : le magazine redevient celui d'avant");
      s.g({ type: "annuler" }).g({ type: "annuler" });
      eq(O.triDe(s.e.magazine).choisies, ["A", "D"], "annuler revient au tri précédent");
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter("éditeur : le tri (pré-choisir, écarter, filtres, jauge, répartition, sauvegarde)", msg === null);
  }
  const archi = S.filter((x) => x.n <= 73).length;
  rapporter(`éditeur : ${S.length} scénarios (ARCHI ${archi} + ${S.length - archi} en plus), ${totalGestes} gestes joués, ${echecs} échec(s)`, echecs === 0 && S.length === 79 && archi === 73);
  titre(`— Mise en page : l'éditeur, ${SEQUENCES_ALEATOIRES} séquences aléatoires (graine ${GRAINE_ALEATOIRE}) —`);
  const b = campagneAleatoire(SEQUENCES_ALEATOIRES, GRAINE_ALEATOIRE);
  console.log(`   séquences : ${b.sequences} · gestes tirés : ${b.tires} · gestes joués (rafales comprises) : ${b.joues} · types de gestes : ${b.types} · gestes qui ont changé le magazine : ${b.changes} · confirmations ouvertes : ${b.confirmations} · échecs : ${b.echecs}`);
  rapporter(`éditeur : ${b.sequences} séquences aléatoires, ${b.joues} gestes, invariants tenus, annuler tout / rétablir tout`, b.echecs === 0 && b.types >= 50 && b.changes > 0 && b.confirmations > 0);
}

/* Lancé seul : `npx tsx --tsconfig tsconfig.json scripts/verif-mep-editeur.ts` */
if (process.argv[1] && /verif-mep-editeur\.ts$/.test(process.argv[1])) {
  let ko = 0;
  verifierMepEditeur((nom, reussi) => { console.log(`${reussi ? "  ok " : "  KO "} ${nom}`); if (!reussi) ko++; }, (t) => console.log(`\n${t}`));
  console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
  process.exit(ko === 0 ? 0 : 1);
}
