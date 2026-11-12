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
import { gabaritDepuisDisposition, gabaritValide, ligneEnTemplate } from "@/lib/mise-en-page/gabaritsAtelier";
import { enregistrerGabarits, nouveauMagazine, templateParId, tousLesTemplates, type Cible, type Disposition, type Magazine, type Planche } from "@/lib/mise-en-page/magazine";
import type { Cote } from "@/lib/mise-en-page/geometrie";
import * as L from "@/lib/mise-en-page/lieux";

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
  proche(def(n.find((x) => x.id === "G-D3-a"), "G-D3-a").note, 0.237, 0.001, "note G-D3-a"); proche(def(n.find((x) => x.id === "DP-03"), "DP-03").note, 1.049, 0.001, "note DP-03");
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
sc(80, "06/11 : R ne parcourt que la famille choisie (avec texte, sans texte), le tiroir aussi", () => {
  const s = new Seance("A:P B:L C:P").pose(2, "double", ["A", "B", "C"]).zero();
  s.g({ type: "naviguer", plancheId: pl(2) });
  const tous = O.gabaritsPour(s.e, pl(2), "double");
  ok(tous.some((x) => O.avecTexte(x.template)) && tous.some((x) => !O.avecTexte(x.template)), "les deux familles existent à 3 photos");
  for (const f of ["avec", "sans"] as const) {
    const h0 = s.hist;
    s.g({ type: "familleGabarits", famille: f });
    eq(s.hist, h0, "changer de famille n'entre pas dans l'historique");
    const liste = O.gabaritsPour(s.e, pl(2), "double");
    ok(liste.every((x) => x.courant || O.dansFamille(x.template, f)), `tiroir : seulement « ${f} » (et le gabarit en place)`);
    for (let k = 0; k < 4; k++) {
      s.g({ type: "touche", cle: "r" });
      ok(O.dansFamille(def(templateParId(def(s.tpl(2, "double"), "gabarit")), "template"), f), `R ${k + 1} reste dans « ${f} »`);
    }
    eq(def(s.ids(2, "double"), "photos").slice().sort(), ["A", "B", "C"], "les photos ne bougent pas");
  }
  s.g({ type: "familleGabarits", famille: "tous" });
  eq(O.gabaritsPour(s.e, pl(2), "double").length, tous.length, "« Tous » rend la liste entière");
  const e0 = s.e; s.g(G({ type: "familleGabarits", famille: "bof" })); ok(s.e === e0, "une famille inconnue ne change rien");
});
sc(81, "06/11 : l'aimant accroche bords et centres sous le seuil, jamais au-delà", () => {
  const L = O.lignesAimant([{ x: 250, y: 40, l: 60, h: 80 }]);
  /* déplacement : le centre (104 → 105) tombe sur le milieu de la page gauche */
  const a = O.aimanter({ x: 54, y: 100, l: 100, h: 50 }, O.DEPLACEMENT, L, 2);
  eq(a.rect.x, 55, "centre de page"); ok(a.guides.some((g) => g.axe === "x" && g.pos === 105), "guide vertical au milieu de la page");
  /* le bord haut s'accroche au bas de l'autre cadre (120) */
  const b = O.aimanter({ x: 260, y: 121.5, l: 40, h: 40 }, O.DEPLACEMENT, L, 2);
  eq(b.rect.y, 120, "bas de l'autre cadre");
  /* au-delà du seuil : rien */
  const c = O.aimanter({ x: 60, y: 60, l: 100, h: 50 }, O.DEPLACEMENT, L, 2);
  eq(c.rect, { x: 60, y: 60, l: 100, h: 50 }, "trop loin : pas d'accroche"); eq(c.guides, [], "… ni de guide");
  /* redimensionnement : seul le bord tiré bouge, l'autre reste */
  const d = O.aimanter({ x: 20, y: 20, l: 168.8, h: 50 }, { gauche: false, droite: true, haut: false, bas: false }, L, 2);
  eq([d.rect.x, d.rect.x + d.rect.l], [20, 190], "bord droit à la marge intérieure, bord gauche immobile");
  /* coin qui garde le format : la hauteur suit */
  const e = O.aimanter({ x: 20, y: 20, l: 168.8, h: 84.4 }, { gauche: false, droite: true, haut: false, bas: true }, L, 2, true);
  proche(e.rect.l / e.rect.h, 2, 1e-9, "format gardé");
  eq(O.aimanter({ x: 54, y: 100, l: 100, h: 50 }, O.DEPLACEMENT, L, 0).guides, [], "seuil nul = aimant coupé");
});

sc(82, "09/11 : moments (pause de 2 h, changement de jour) et séjours (la ville change), dans l'ordre du temps", () => {
  const ph = (id: string, date: string | null, ville: string | null): PhotoMaq => ({ id, nom: id, l: 4, h: 3, date, personne: "Moi", lien: null, type: "atelier",
    coeur: false, signalee: false, autresMagazines: [], nouvelle: false, vignette: null, ville, pays: ville ? "Portugal" : null });
  const cat: O.Catalogue = new Map([
    ph("a", "2026-08-12T09:10:00", "Lisbonne"), ph("b", "2026-08-12T10:40:00", null), ph("c", "2026-08-12T13:30:00", "Sintra"),
    ph("d", "2026-08-12T19:05:00", "Sintra"), ph("e", "2026-08-13T08:00:00", "Lisbonne"), ph("f", null, "Porto"),
  ].map((x) => [x.id, x]));
  const m = (id: string) => O.rangementDe(cat, "moment", id), l = (id: string) => O.rangementDe(cat, "lieu", id);
  eq([m("a").cle === m("b").cle, m("b").cle === m("c").cle, m("c").cle === m("d").cle, m("d").cle === m("e").cle], [true, false, false, false], "coupures de moment");
  eq([m("a").libelle, m("c").libelle, m("d").libelle, m("f").libelle], ["12 août · Matin, 9 h à 10 h", "12 août · Midi, 13 h", "12 août · Soir, 19 h", "Sans date"], "noms des moments");
  eq([l("a").libelle, l("b").libelle, l("c").libelle, l("e").libelle, l("f").cle], ["Lisbonne · 12 août", "Lisbonne · 12 août", "Sintra · 12 août", "Lisbonne · 13 août", "~"], "séjours : la photo sans lieu suit celle d'avant");
  ok(m("a").cle < m("c").cle && l("c").cle < l("e").cle && l("e").cle < "~", "les clés se trient dans l'ordre du temps, « Sans date » à la fin");
  eq(O.nomDuMoment(23), "Nuit", "23 h = nuit");
});

sc(83, "09/11 : lieux détaillés (réponses Geoapify) et lieu par défaut des titres et légendes, à l'écran comme à l'export", () => {
  const inv = { features: [{ properties: { result_type: "amenity", name: "Palácio Nacional de Sintra", town: "Sintra", city: "Sintra (Santa Maria e São Miguel)", county: "Lisbonne", country: "Portugal" } }] };
  const lieu = def(L.assembler(inv, { features: [{ properties: { name: "Plage", distance: 900 } }, { properties: { distance: 20 } }] }, { features: [{ properties: { name: "Lisboa", name_international: { fr: "Lisbonne", en: "Lisbon" }, distance: 20000 } }] }), "lieu");
  eq(lieu, { precis: "Palácio Nacional de Sintra", commune: "Sintra", villeProche: "Lisbonne", departement: "Lisbonne", region: null, pays: "Portugal" }, "lieu assemblé : nom du lieu connu, commune sans parenthèse, plage trop loin ignorée");
  eq(L.choixDeLieux([lieu, lieu]).map((c) => c.valeur), ["Palácio Nacional de Sintra", "Sintra", "Lisbonne", "Portugal"], "propositions sans doublon, du plus précis au plus large");
  eq(L.assembler(null, null, null), null, "rien de lu : null");
  eq([L.pointsValides({ points: [{ lat: 91, lon: 0 }] }), L.pointsValides({ points: [] }), L.pointsValides({ points: [{ lat: 1, lon: 2 }] })], [null, null, [{ lat: 1, lon: 2 }]], "points relus");
  /* le lieu par défaut : un gabarit de page à un titre et une légende */
  const t = tousLesTemplates().find((x) => x.portee === "page" && x.cadres.some((c) => c.role === "titre") && x.cadres.some((c) => c.role === "legende"));
  if (!t) return;
  const nP = t.cadres.filter((c) => c.role === "photo").length;
  const ids = ["a", "b", "c", "d", "e", "f"].slice(0, nP);
  const cat = new Map(ids.map((id, i) => [id, { id, nom: id, l: 4, h: 3, date: null, ville: i === 0 ? "Sintra" : "Lisbonne", pays: "Portugal" }]));
  const d: Disposition = { templateId: t.id, photos: ids.map((id) => ({ photoId: id, recadrage: { zoom: 1, dx: 0, dy: 0 } })),
    textes: t.cadres.filter((c) => c.role !== "photo").map((c) => ({ contenu: O.LIBELLE[c.role as "titre"], taille: 10, gras: false })) };
  const def0 = O.lieuxParDefaut(d, "droite", cat);
  const roles = t.cadres.filter((c) => c.role !== "photo").map((c) => c.role);
  ok(!!def0[roles.indexOf("titre")] && roles.every((r, i) => r !== "texte" || def0[i] === null), "le titre reçoit un lieu, un « Texte » jamais");
  if (nP > 1) {
    eq(def0[roles.indexOf("titre")], "Lisbonne", "le titre prend le lieu le plus présent");
    eq(def0[roles.indexOf("legende")], "Sintra", "la légende de la photo prise ailleurs dit son lieu");
  } else eq(def0[roles.indexOf("legende")], null, "une légende au même lieu que le titre ne le répète pas");
  /* trois titres, cinq légendes au même endroit : un seul lieu écrit */
  const dp = templateParId("DP-03");
  if (dp) {
    const n3 = dp.cadres.filter((c) => c.role === "photo").length;
    const cat3 = new Map(Array.from({ length: n3 }, (_, i) => [`x${i}`, { id: `x${i}`, nom: "x", l: 4, h: 3, date: null, ville: "Lisbonne" }]));
    const d3: Disposition = { templateId: "DP-03", photos: [...cat3.keys()].map((id) => ({ photoId: id, recadrage: { zoom: 1, dx: 0, dy: 0 } })),
      textes: dp.cadres.filter((c) => c.role !== "photo").map(() => ({ contenu: "Titre", taille: 10, gras: false })) };
    eq(O.lieuxParDefaut(d3, "double", cat3).filter(Boolean), ["Lisbonne"], "DP-03 tout à Lisbonne : « Lisbonne » une seule fois");
  }
  const m: Magazine = { ...nouveauMagazine("m", "M", "2026-11-09T00:00:00Z") };
  const m1: Magazine = { ...m, planches: [{ ...m.planches[0], droite: d }] };
  const ex = O.avecLieuxParDefaut(m1, cat);
  eq(def(ex.planches[0].droite, "droite").textes[roles.indexOf("titre")].contenu, def0[roles.indexOf("titre")], "l'export écrit le lieu");
  const ecrit: Disposition = { ...d, textes: d.textes.map((x, i) => (i === roles.indexOf("titre") ? { ...x, contenu: "Nos vacances" } : x)) };
  eq(def(O.avecLieuxParDefaut({ ...m, planches: [{ ...m.planches[0], droite: ecrit }] }, cat).planches[0].droite, "d").textes[roles.indexOf("titre")].contenu, "Nos vacances", "un titre écrit n'est jamais remplacé");
  ok(O.avecLieuxParDefaut(m1, new Map()) === m1, "sans lieu connu : le même magazine");
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
  return O.creerEtat({ magazine: m, catalogue: cat, projet: { nom: "Aléa", source: "edition", nbPagesCible: h() < 0.5 ? 28 : null, finition: null } });
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
      case 4: return h() < 0.6 ? { type: "bibliotheque" } : { type: "tri", zone: pick(["jeu", "cote", "bidon"]) };
      case 5: return h() < 0.5 ? { type: "vignette", plancheId: plancheId(e) } : { type: "hesiter", ref: uneRef(e) };
      case 6: return h() < 0.4 ? { type: "entre", index: int(-1, e.magazine.planches.length + 1) }
        : h() < 0.5 ? { type: "miroir", plancheId: plancheId(e) }
        : { type: "libre", plancheId: plancheId(e), cible: cible(), x: pick([0, 50, 105, 210, 300, 420, -40, NaN]), y: pick([0, 100, 148, 297, 400]) };
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
    if (h() < 0.5) return { type: "cadres", refs: Array.from({ length: int(1, 4) }, () => uneRef(e)) };
    return { type: "planche", plancheId: plancheId(e) };
  };
  const filtres = (): Libre => {
    const f: Libre = {};
    const k = int(0, 12);
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
    if (k === 11) f.marque = pick(["toutes", "ecarter", "retenues", "choisies", "a_trier", "reserve", "ecartees", "bidon"]);
    if (k === 12) f.etiquette = pick(["", "couverture", "double", "pleine", "bidon"]);
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
    [4, (e) => ({ type: "marquer", ids: ids(e, int(1, 4)), marque: pick(["coupDeCoeur", "choisie", "reserve", "ecartee", null, "bidon"]), ...(h() < 0.3 ? { poser: true } : {}), ...(h() < 0.15 ? { autres: ids(e, int(1, 3)) } : {}) })],
    [5, (e) => ({ type: "hesiter", ref: uneRef(e), action: pick(["ajouter", "ajouter", "intervertir", "garderDevant", "garderDerriere", "rouvrir", "oublier", "bidon"]), photoId: ids(e, 1)[0] })],
    [2, (e) => ({ type: "touche", cle: pick(["t", "T"]), ...(h() < 0.3 ? { survol: { plancheId: plancheId(e), cible: pick(["gauche", "droite", "double"]) } } : {}) })],
    /* lot 4 : miroir, cadres retouchés, calques, plusieurs cadres */
    [3, (e) => ({ type: "miroir", ...(h() < 0.7 ? { plancheId: plancheId(e) } : {}) })],
    [4, (e) => ({ type: "placerCadre", ref: uneRef(e), x: pick([0, 20, 150, 300, -50, NaN]), y: pick([0, 40, 200, 320]), l: pick([5, 40, 90, 200, 500]), h: pick([5, 60, 120, 400, Infinity]) })],
    [3, (e) => ({ type: "ajusterCadre", ref: uneRef(e) })],
    [3, (e) => ({ type: "calque", ref: uneRef(e), sens: pick(["devant", "avancer", "reculer", "derriere", "bidon"]) })],
    [2, (e) => ({ type: "retirerCadres", refs: Array.from({ length: int(0, 4) }, () => uneRef(e)) })],
    [3, (e) => ({ type: "basculerCadre", ref: uneRef(e) })],
    [3, () => ({ type: "touche", cle: pick(["m", "M", "]", "[", "ArrowUp", "ArrowDown", "Backspace"]), meta: h() < 0.6, alt: h() < 0.3, shift: h() < 0.2 })],
    [1, () => ({ type: "reglerTri", visees: pick([null, 1, 120, 2.5, 0, 6000]) })],
    [2, (e) => ({ type: "etiqueter", ids: ids(e, int(1, 3)), etiquette: pick(["couverture", "double", "pleine", "bidon"]) })],
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
  /* Le tri (REGLES-TRI, maquette du 31/10) : garder, écarter, bascule, gestes sans effet, filtres, jauge, posée = gardée. */
  {
    let msg: string | null = null;
    try {
      const s = new Seance("A:P B:L C:L D:P E:C", { extra: { D: { personne: "Louise" }, E: { personne: "Louise" } } }).zero();
      const m0 = s.e.magazine;
      s.g({ type: "marquer", ids: ["A", "B", "D"], marque: "choisie" });
      eq(O.triDe(s.e.magazine).choisies, ["A", "B", "D"], "trois gardées");
      ok(s.hist === 1 && s.e.eclair === null, "une annulation, pas d'éclair");
      ok(s.e.message?.texte === "3 photos gardées" && s.e.message.action?.libelle === "Annuler", "R8 : le bandeau propose Annuler");
      s.g({ type: "marquer", ids: ["B", "C"], marque: "ecartee" });
      eq([O.triDe(s.e.magazine).choisies, O.triDe(s.e.magazine).ecartees], [["A", "D"], ["B", "C"]], "B passe de gardée à écartée");
      /* R2 : écarter une écartée la RETIRE, jamais une seconde fois */
      s.g({ type: "marquer", ids: ["C"], marque: "ecartee" });
      ok(O.marqueDe(s.e.magazine, "C") === null && s.hist === 3, "R2 : X sur une écartée retire la marque");
      s.g({ type: "annuler" });
      ok(O.marqueDe(s.e.magazine, "C") === "ecartee", "annuler la remet");
      /* R1 : P sur une gardée retire */
      s.g({ type: "marquer", ids: ["A"], marque: "choisie" });
      ok(O.marqueDe(s.e.magazine, "A") === null, "R1 : P sur une gardée retire la marque");
      s.g({ type: "annuler" });
      /* R5 : une sélection mêlée reçoit la marque ; toute déjà marquée, on retire de toutes */
      s.g({ type: "marquer", ids: ["A", "E"], marque: "choisie" });
      eq(O.triDe(s.e.magazine).choisies, ["A", "D", "E"], "R5 : sélection mêlée → toutes gardées, A garde sa place");
      s.g({ type: "marquer", ids: ["A", "E"], marque: "choisie" });
      eq(O.triDe(s.e.magazine).choisies, ["D"], "R5 : toutes déjà gardées → marque retirée de toutes");
      s.g({ type: "annuler" }).g({ type: "annuler" });
      /* R3 / R7 : un geste sans effet ne fait rien */
      const h0 = s.hist, mag0 = s.e.magazine;
      s.g({ type: "marquer", ids: ["E"], marque: null });
      ok(s.e.magazine === mag0 && s.hist === h0, "R3 : 0 sur une photo sans marque : ni changement ni historique");
      eq(O.visibles(s.e).sort(), ["A", "B", "C", "D", "E"], "barre latérale par défaut (06/11) : toutes, les non gardées à leur date");
      eq(O.aCote(s.e), [], "… et pas de colonne « À côté » hors des tours");
      s.g({ type: "filtrer", filtres: { marque: "ecarter" } });
      eq(O.visibles(s.e).sort(), ["A", "D", "E"], "tour ① : les écartées passent à côté");
      eq(O.aCote(s.e).sort(), ["B", "C"], "… et restent visibles dans la colonne « À côté »");
      eq(O.aCoteParJour(s.e).flatMap((g) => g.ids).sort(), ["B", "C"], "… rangées par jour, sans en perdre");
      eq(O.quandPhoto({ date: "2026-08-12T14:32:00" }), "12 août · 14:32", "la date au survol");
      eq(O.quandPhoto({ date: null }), "Sans date", "… ou « Sans date »");
      s.g({ type: "filtrer", filtres: { marque: "choisies" } }); eq(O.visibles(s.e).sort(), ["A", "D"], "filtre Gardées");
      s.g({ type: "filtrer", filtres: { marque: "a_trier" } }); eq(O.visibles(s.e), ["E"], "filtre À trier");
      s.g({ type: "filtrer", filtres: { marque: "ecartees" } }); eq(O.visibles(s.e).sort(), ["B", "C"], "filtre Écartées");
      s.g({ type: "filtrer", filtres: { marque: "toutes" } });
      eq(O.listeTri(s.e, "a_trier"), ["E"], "vue du tri : à trier");
      const b = O.bilanTri(s.e);
      eq([b.total, b.choisies, b.ecartees, b.aTrier, b.visees, b.posees], [5, 2, 2, 1, null, 0], "bilan sans objectif : aucun chiffre inventé");
      eq(b.parPersonne.map((x) => [x.personne, x.choisies, x.total, x.part]), [["Inès", 1, 3, 0.5], ["Louise", 1, 2, 0.5]], "répartition par personne");
      s.g({ type: "reglerTri", visees: 180 });
      ok(O.bilanTri(s.e).visees === 180, "R19 : objectif sur l'ensemble du magazine");
      const avant = s.e.magazine;
      s.g({ type: "reglerTri", visees: 2.5 }).g({ type: "reglerTri", visees: 0 }).g({ type: "reglerTri", visees: -3 });
      ok(s.e.magazine === avant, "R19 : décimal, zéro, négatif refusés");
      ok(O.contenuValide(s.e.magazine), "un magazine trié se sauvegarde");
      ok(!O.contenuValide({ ...s.e.magazine, tri: { choisies: ["A"], ecartees: ["A"], visees: null } }), "une photo gardée ET écartée est refusée");
      ok(!O.contenuValide({ ...s.e.magazine, tri: { choisies: [], ecartees: [], photosParPage: 3 } as unknown as typeof s.e.magazine.tri }), "l'ancienne forme (photos par page) est refusée");
      /* R22 : posée depuis la bibliothèque = gardée, dans la même annulation */
      const h1 = s.hist;
      s.g({ type: "ajouterSurPlanche", plancheId: s.e.plancheCourante, ids: ["C", "E"] });
      ok(O.marqueDe(s.e.magazine, "C") === "choisie" && O.marqueDe(s.e.magazine, "E") === "choisie" && s.hist === h1 + 1, "R22 : posées → gardées, une seule entrée");
      ok(O.bilanTri(s.e).posees === 2, "jauge : photos posées");
      /* R25 : annuler une marque ne change pas la double affichée */
      s.g({ type: "insererDouble" });
      const pl = s.e.plancheCourante;
      s.g({ type: "marquer", ids: ["B"], marque: "choisie" });
      s.g({ type: "naviguer", sens: -1 });
      const ailleurs = s.e.plancheCourante;
      ok(ailleurs !== pl, "on est allé sur une autre double");
      s.g({ type: "annuler" });
      ok(s.e.plancheCourante === ailleurs && O.marqueDe(s.e.magazine, "B") === "ecartee", "R25 : ⌘Z d'une marque reste sur la double affichée");
      s.g({ type: "annuler" }).g({ type: "annuler" });
      ok(O.marqueDe(s.e.magazine, "C") === "ecartee", "annuler la pose rend aussi la marque d'avant");
      s.g({ type: "marquer", ids: ["A", "B", "C", "D"], marque: null }).g({ type: "reglerTri", visees: null });
      ok(s.e.magazine.tri === undefined && O.egal(s.e.magazine, m0), "tri revenu à vide : le magazine redevient celui d'avant");

      /* Les quatre marques (maquette du 02/11) : ✦ coup de cœur, ★ gardée, ◐ réserve, ✕ écartée */
      s.g({ type: "marquer", ids: ["A"], marque: "coupDeCoeur" }).g({ type: "marquer", ids: ["B"], marque: "reserve" }).g({ type: "marquer", ids: ["C"], marque: "choisie" });
      ok(O.marqueDe(s.e.magazine, "A") === "coupDeCoeur" && O.marqueDe(s.e.magazine, "B") === "reserve", "F et R posent coup de cœur et réserve");
      eq(s.e.magazine.tri, { choisies: ["C"], ecartees: [], visees: null, coupsDeCoeur: ["A"], reserve: ["B"] }, "une photo, une seule liste");
      s.g({ type: "filtrer", filtres: { marque: "choisies" } }); eq(O.visibles(s.e).sort(), ["A", "C"], "Gardées compte les coups de cœur");
      s.g({ type: "filtrer", filtres: { marque: "reserve" } }); eq(O.visibles(s.e), ["B"], "onglet Réserve");
      s.g({ type: "filtrer", filtres: { marque: "a_trier" } }); eq(O.visibles(s.e).sort(), ["D", "E"], "la réserve n'est plus à trier");
      s.g({ type: "filtrer", filtres: { marque: "toutes" } });
      const b4 = O.bilanTri(s.e);
      eq([b4.choisies, b4.coupsDeCoeur, b4.reserve, b4.aTrier], [2, 1, 1, 2], "jauge : gardées (coups de cœur compris), ✦, réserve, à trier");
      s.g({ type: "marquer", ids: ["A"], marque: "coupDeCoeur", poser: true });
      ok(O.marqueDe(s.e.magazine, "A") === "coupDeCoeur", "vue une photo : reposer F ne retire jamais");
      s.g({ type: "marquer", ids: ["A"], marque: "coupDeCoeur" });
      ok(O.marqueDe(s.e.magazine, "A") === null, "grille : reposer F retire (bascule)");
      s.g({ type: "marquer", ids: ["A"], marque: "coupDeCoeur" });
      s.g({ type: "ajouterSurPlanche", plancheId: s.e.plancheCourante, ids: ["A", "B"] });
      ok(O.marqueDe(s.e.magazine, "A") === "coupDeCoeur" && O.marqueDe(s.e.magazine, "B") === "choisie", "posée : un coup de cœur le reste, une réserve devient gardée");
      ok(O.contenuValide(s.e.magazine), "un tri à quatre marques se sauvegarde");
      const base = { ...s.e.magazine };
      ok(O.contenuValide({ ...base, tri: { choisies: ["A"], ecartees: [], visees: null } }), "une sauvegarde d'avant le 02/11 reste valide");
      ok(!O.contenuValide({ ...base, tri: { choisies: [], ecartees: [], visees: null, reserve: [] } }), "une liste facultative vide est refusée");
      ok(!O.contenuValide({ ...base, tri: { choisies: ["A"], ecartees: [], visees: null, coupsDeCoeur: ["A"] } }), "gardée ET coup de cœur est refusé");
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter("éditeur : le tri (bascule, gestes sans effet, filtres, objectif, posée = gardée, annuler sans changer de double)", msg === null);
  }
  /* Les trois tours et les deux étiquettes (05/11) : un tour est un filtre, une étiquette garde la photo et ne survit pas à l'écart. */
  {
    let msg: string | null = null;
    try {
      const s = new Seance("A:P B:P C:L D:P E:L");
      s.g({ type: "marquer", ids: ["A"], marque: "ecartee" }).g({ type: "marquer", ids: ["B"], marque: "coupDeCoeur" }).g({ type: "marquer", ids: ["C"], marque: "reserve" });
      s.g({ type: "filtrer", filtres: { marque: "toutes" } }); eq(O.visibles(s.e).length, 5, "« Toutes » : tout, écartées comprises");
      eq(O.aCote(s.e), [], "hors des tours, pas de colonne « À côté »");
      s.g({ type: "filtrer", filtres: { marque: "ecarter" } }); eq(O.visibles(s.e).sort(), ["B", "C", "D", "E"], "tour ① : en jeu sans les écartées");
      eq(O.aCote(s.e), ["A"], "tour ① : les écartées à côté");
      s.g({ type: "filtrer", filtres: { marque: "retenues" } }); eq(O.visibles(s.e).sort(), ["B", "D", "E"], "tour ② : sans les écartées ni la réserve");
      eq(O.aCote(s.e).sort(), ["A", "C"], "tour ② : écartées et réserve à côté");
      s.g({ type: "filtrer", filtres: { marque: "choisies" } }); eq(O.visibles(s.e), ["B"], "tour ③ : gardées et coups de cœur");
      eq(O.aCote(s.e).sort(), ["A", "C", "D", "E"], "tour ③ : tout le reste à côté, rien n'est caché");
      /* glisser entre la grille et la colonne */
      s.g({ type: "deposer", source: { type: "bibliotheque", ids: ["A"] }, cible: { type: "tri", zone: "jeu" } });
      ok(O.marqueDe(s.e.magazine, "A") === "choisie", "tour ③ : reglisser une écartée la garde");
      s.g({ type: "deposer", source: { type: "bibliotheque", ids: ["A"] }, cible: { type: "tri", zone: "cote" } });
      ok(O.marqueDe(s.e.magazine, "A") === "reserve", "tour ③ : glisser à côté la met en réserve");
      s.g({ type: "filtrer", filtres: { marque: "ecarter" } });
      s.g({ type: "deposer", source: { type: "bibliotheque", ids: ["D"] }, cible: { type: "tri", zone: "cote" } });
      ok(O.marqueDe(s.e.magazine, "D") === "ecartee", "tour ① : glisser à côté l'écarte");
      s.g({ type: "deposer", source: { type: "bibliotheque", ids: ["D"] }, cible: { type: "tri", zone: "jeu" } });
      ok(O.marqueDe(s.e.magazine, "D") === null, "tour ① : reglisser la remet sans marque");
      const avantB = s.e.magazine; s.g({ type: "deposer", source: { type: "bibliotheque", ids: ["B"] }, cible: { type: "tri", zone: "jeu" } });
      ok(s.e.magazine === avantB && O.marqueDe(s.e.magazine, "B") === "coupDeCoeur", "déjà en jeu : rien, un coup de cœur le reste");
      s.g({ type: "marquer", ids: ["A"], marque: "ecartee" });
      s.g({ type: "filtrer", filtres: { marque: "choisies" } });
      s.g({ type: "etiqueter", ids: ["D"], etiquette: "couverture" });
      ok(O.marqueDe(s.e.magazine, "D") === "choisie" && O.etiquettesDe(s.e.magazine, "D").join() === "couverture", "étiqueter garde la photo");
      s.g({ type: "etiqueter", ids: ["B"], etiquette: "couverture" });
      ok(O.marqueDe(s.e.magazine, "B") === "coupDeCoeur", "un coup de cœur le reste");
      s.g({ type: "etiqueter", ids: ["E"], etiquette: "pleine" });
      ok(O.marqueDe(s.e.magazine, "E") === "choisie" && O.etiquettesDe(s.e.magazine, "E").join() === "pleine", "3 : Pleine page, et la photo est gardée");
      s.g({ type: "etiqueter", ids: ["B", "D"], etiquette: "couverture" });
      eq(O.etiquettesDe(s.e.magazine, "B"), [], "toutes l'ont : la même touche la retire");
      s.g({ type: "etiqueter", ids: ["B", "D"], etiquette: "couverture" }).g({ type: "etiqueter", ids: ["D"], etiquette: "double" });
      eq(O.etiquettesDe(s.e.magazine, "D"), ["couverture", "double"], "deux étiquettes à la fois");
      s.g({ type: "filtrer", filtres: { marque: "choisies", etiquette: "double" } }); eq(O.visibles(s.e), ["D"], "tour 3 filtré par étiquette");
      s.g({ type: "filtrer", filtres: { marque: "retenues" } }); eq(s.e.filtres.etiquette, "", "changer de tour relâche l'étiquette");
      const b = O.bilanTri(s.e); eq([b.couverture, b.double, b.pleine], [2, 1, 1], "bilan des étiquettes");
      ok(O.contenuValide(s.e.magazine), "un tri étiqueté se sauvegarde");
      s.g({ type: "marquer", ids: ["D"], marque: "ecartee" });
      eq(O.etiquettesDe(s.e.magazine, "D"), [], "écarter retire les étiquettes");
      s.g({ type: "annuler" });
      eq(O.etiquettesDe(s.e.magazine, "D"), ["couverture", "double"], "⌘Z rend les étiquettes");
      s.g({ type: "marquer", ids: ["D"], marque: "reserve" }); eq(O.etiquettesDe(s.e.magazine, "D"), [], "la réserve les retire aussi");
      const avant = s.e.magazine; s.g({ type: "etiqueter", ids: ["inconnue"], etiquette: "double" }); ok(s.e.magazine === avant, "photo inconnue : rien");
      const base = { ...s.e.magazine };
      ok(!O.contenuValide({ ...base, tri: { choisies: [], ecartees: ["A"], visees: null, etiquettes: { couverture: ["A"] } } }), "étiquette sur une écartée refusée");
      ok(!O.contenuValide({ ...base, tri: { choisies: ["A"], ecartees: [], visees: null, etiquettes: {} } }), "étiquettes vides refusées");
      ok(!O.contenuValide({ ...base, tri: { choisies: ["A"], ecartees: [], visees: null, etiquettes: { couverture: ["A", "A"] } } }), "doublon refusé");
      ok(!O.contenuValide({ ...base, tri: { choisies: ["A"], ecartees: [], visees: null, etiquettes: { pano: ["A"] } } as unknown as typeof base.tri }), "étiquette inconnue refusée");
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter("éditeur : les trois tours et les étiquettes (filtres, garder en étiquetant, écarter retire, sauvegarde)", msg === null);
  }
  /* L'hésitation (lot 3, plan du 30/10) : deux photos dans un cadre, T, trancher, rouvrir ; seule celle de devant compte. */
  {
    let msg: string | null = null;
    try {
      const s = new Seance("A:P B:P C:L D:P").pose(1, "droite", ["A"]).zero();
      const ref = { plancheId: pl(1), cible: "droite" as const, index: 0 };
      const glisse = s.glisse({ type: "bibliotheque", ids: ["B"] }, { type: "hesiter", ref });
      ok(!glisse.refus, "lâcher sur l'encart « Hésiter » accepté");
      eq(s.idsPleins(1, "droite"), ["A"], "A reste devant");
      eq(O.hesitationDe(s.e.magazine, ref)?.photoId, "B", "B est derrière");
      ok(O.marqueDe(s.e.magazine, "B") === "choisie", "la photo mise derrière devient gardée");
      ok(!O.idsMagazine(s.e.magazine).includes("B") && (O.reperesBibliotheque(s.e).utilisations.get("B") ?? 0) === 0, "derrière : ni posée, ni ×n");
      ok(O.contenuValide(s.e.magazine), "une hésitation se sauvegarde");
      s.zero().g({ type: "touche", cle: "t" });
      eq(s.idsPleins(1, "droite"), ["B"], "T : B passe devant");
      ok(O.hesitationDe(s.e.magazine, ref)?.photoId === "A" && O.hesitationDe(s.e.magazine, ref)?.ouverte === true, "A derrière, on hésite encore");
      ok(s.hist === 1, "T : une annulation");
      s.g({ type: "touche", cle: "t" });
      eq(s.idsPleins(1, "droite"), ["A"], "T encore : retour à A");
      s.g({ type: "hesiter", ref, action: "garderDerriere" });
      eq(s.idsPleins(1, "droite"), ["B"], "garder celle de derrière : B devant");
      ok(O.hesitationDe(s.e.magazine, ref)?.photoId === "A" && O.hesitationDe(s.e.magazine, ref)?.ouverte === false, "A délaissée, toujours notée");
      ok(O.photosEnHesitation(s.e.magazine).delaissees.has("A"), "la bibliothèque sait que A était l'hésitation");
      const avantT = s.e.magazine;
      s.g({ type: "touche", cle: "t" });
      ok(s.e.magazine === avantT, "T sur une hésitation tranchée : rien");
      s.g({ type: "hesiter", ref, action: "rouvrir" });
      ok(O.hesitationDe(s.e.magazine, ref)?.ouverte === true, "on peut changer d'avis : l'hésitation se rouvre");
      s.g({ type: "hesiter", ref, action: "garderDevant" }).g({ type: "hesiter", ref, action: "oublier" });
      ok(O.hesitationDe(s.e.magazine, ref) === null && O.contenuValide(s.e.magazine), "oublier : plus rien derrière");
      s.g({ type: "hesiter", ref, action: "ajouter", photoId: "B" });
      ok(O.hesitationDe(s.e.magazine, ref) === null, "la photo de devant ne peut pas être derrière elle-même");
      s.g({ type: "hesiter", ref, action: "ajouter", photoId: "C" });
      s.g({ type: "ajouterSurPlanche", plancheId: pl(1), ids: ["D"] });
      const refB = O.cadresPlanche(s.e, pl(1)).find((c) => c.role === "photo" && c.photoId === "B");
      ok(!!refB && refB.role === "photo" && refB.hesitation?.photoId === "C", "la page se recompose : l'hésitation suit sa photo");
      s.g({ type: "annuler" }).g({ type: "annuler" });
      ok(O.hesitationDe(s.e.magazine, ref) === null, "annuler défait l'hésitation");
      const base = s.e.magazine;
      const d = base.planches[0].droite!;
      const avec = (h: unknown) => ({ ...base, planches: [{ ...base.planches[0], droite: { ...d, photos: [{ ...d.photos[0], hesitation: h }] } }] });
      ok(!O.contenuValide(avec({ photoId: d.photos[0].photoId, recadrage: { zoom: 1, dx: 0, dy: 0 } })), "derrière elle-même : refusé à la sauvegarde");
      ok(!O.contenuValide(avec({ photoId: "C", recadrage: { zoom: 1, dx: 0, dy: 0 }, tranchee: false })), "tranchee ne vaut que true");
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter("éditeur : l'hésitation (deux photos dans un cadre, T, trancher, rouvrir, seule celle de devant compte)", msg === null);
  }
  /* Le lot 4 (plan du 02/11) : miroir, ⇧-clic, pose en libre, cadres retouchés, calques, sans gabarit neuf. */
  {
    let msg: string | null = null;
    try {
      const s = new Seance("A:P B:P C:L D:P E:L F:P G:L").pose(2, "gauche", ["A", "B"]).pose(2, "droite", ["C", "D", "E"]).zero();
      /* miroir : deux à gauche, trois à droite → l'inverse, une seule annulation */
      s.g({ type: "naviguer", plancheId: pl(2) }).g({ type: "touche", cle: "m" });
      eq(s.idsPleins(2, "gauche"), ["C", "D", "E"], "M : les trois passent à gauche");
      eq(s.idsPleins(2, "droite"), ["A", "B"], "M : les deux passent à droite");
      ok(s.hist === 1, "M : une annulation");
      s.g({ type: "touche", cle: "m" });
      eq(s.idsPleins(2, "gauche"), ["A", "B"], "M encore : retour");
      s.g({ type: "naviguer", plancheId: pl(1) }).g({ type: "touche", cle: "m" });
      ok(s.hist === 2, "M sur la planche 1 : rien");
      /* ⇧-clic : deux cadres, Suppr les retire ensemble */
      s.g({ type: "naviguer", plancheId: pl(2) }).g({ type: "activerCadre", ref: ref(2, "droite", 0) }).g({ type: "basculerCadre", ref: ref(2, "droite", 2) });
      ok(s.e.cadresSel.length === 2, "⇧-clic : deux cadres sélectionnés");
      s.g({ type: "basculerCadre", ref: ref(2, "gauche", 0) });
      ok(s.e.cadresSel.length === 3, "⇧-clic sur l'autre page de la double : trois");
      s.g({ type: "basculerCadre", ref: ref(2, "gauche", 0) }).g({ type: "touche", cle: "Backspace" });
      eq(s.idsPleins(2, "droite"), ["D"], "Suppr : les deux retirées d'un coup");
      ok(s.hist === 3, "Suppr à plusieurs : une annulation");
      s.g({ type: "annuler" });
      /* toute une page glissée sur l'autre : la bande « Inverser » ou l'ajout */
      const gauche = [ref(2, "gauche", 0), ref(2, "gauche", 1)];
      ok(O.pageEntiere(s.e.magazine, gauche)?.cote === "gauche", "la page gauche entière est reconnue");
      ok(O.pageEntiere(s.e.magazine, [ref(2, "gauche", 0)]) === null, "une seule photo : pas de bande « Inverser »");
      s.glisse({ type: "cadres", refs: gauche }, { type: "miroir", plancheId: pl(2) });
      eq(s.idsPleins(2, "droite"), ["A", "B"], "lâcher sur « Inverser » : miroir");
      s.g({ type: "annuler" });
      s.glisse({ type: "cadres", refs: gauche }, { type: "page", plancheId: pl(2), cote: "droite" });
      eq(s.idsPleins(2, "droite"), ["C", "D", "E", "A", "B"], "lâcher ailleurs sur la page : les deux s'ajoutent");
      ok(s.dispo(2, "gauche") === null, "la page gauche est vide");
      s.g({ type: "annuler" });
      /* pose en libre : rien ne se recompose */
      const avant = s.dispo(2, "droite")!;
      s.glisse({ type: "bibliotheque", ids: ["F"] }, { type: "libre", plancheId: pl(2), cible: "droite", x: 315, y: 148 });
      const d = s.dispo(2, "droite")!;
      eq(d.photos.map((a) => a.photoId), ["C", "D", "E", "F"], "⌥ : F posée en libre, les trois restent");
      ok(!!d.cadres && d.cadres.length === 4 && d.templateId === avant.templateId, "la page garde son gabarit, ses cadres sont retouchés");
      const f = photosPlanche(s.e, pl(2)).find((c) => c.photoId === "F")!;
      const phF0 = s.e.catalogue.get("F")!;
      ok(Math.abs(f.x + f.l / 2 - 315) < 1e-6 && Math.abs(f.h - O.COTE_LIBRE) < 1e-6 && Math.abs(f.l / f.h - phF0.l / phF0.h) < 1e-6, "centrée au lâcher, à son format (portrait : 80 mm de haut)");
      ok(O.marqueDe(s.e.magazine, "F") === "choisie" && O.contenuValide(s.e.magazine), "posée = gardée ; se sauvegarde");
      /* une page vide reçoit une photo libre */
      s.glisse({ type: "bibliotheque", ids: ["G"] }, { type: "libre", plancheId: pl(3), cible: "gauche", x: 100, y: 100 });
      ok(s.tpl(3, "gauche") === "libre" && s.idsPleins(3, "gauche")[0] === "G", "page vide : disposition libre");
      /* déplacer, agrandir, ajuster au format */
      const rF = ref(2, "droite", 3);
      s.g({ type: "placerCadre", ref: rF, x: 230, y: 20, l: 120, h: 90 });
      const f2 = photosPlanche(s.e, pl(2)).find((c) => c.photoId === "F")!;
      ok(Math.abs(f2.x - 230) < 1e-6 && Math.abs(f2.l - 120) < 1e-6, "le cadre va où on le pose");
      s.g({ type: "placerCadre", ref: rF, x: 100, y: -50, l: 5, h: 5 });
      const f3 = photosPlanche(s.e, pl(2)).find((c) => c.photoId === "F")!;
      ok(f3.x >= 210 - 1e-9 && f3.y >= -3 - 1e-9 && f3.l >= O.COTE_MIN - 1e-9, "jamais au-delà du pli, du fond perdu, ni plus petit que 10 mm");
      s.g({ type: "ajusterCadre", ref: rF });
      const f4 = photosPlanche(s.e, pl(2)).find((c) => c.photoId === "F")!;
      const phF = s.e.catalogue.get("F")!;
      ok(Math.abs(f4.l / f4.h - phF.l / phF.h) < 1e-6, "ajuster : le cadre prend le format de la photo");
      const nAvant = s.hist;
      s.g({ type: "ajusterCadre", ref: rF });
      ok(s.hist === nAvant, "ajuster deux fois : sans effet");
      /* calques : ⌘[ recule, ⌥⌘[ derrière, le cadre actif suit */
      s.g({ type: "activerCadre", ref: rF }).g({ type: "touche", cle: "[", meta: true });
      eq(s.idsPleins(2, "droite"), ["C", "D", "F", "E"], "⌘[ : F recule d'un calque");
      ok(O.egal(s.e.cadreActif, ref(2, "droite", 2)), "le cadre actif suit F");
      s.g({ type: "touche", cle: "[", meta: true, alt: true });
      eq(s.idsPleins(2, "droite")[0], "F", "⌥⌘[ : F derrière tout");
      s.g({ type: "touche", cle: "ArrowUp", meta: true, alt: true });
      eq(s.idsPleins(2, "droite").at(-1), "F", "⌥⌘↑ : F devant tout");
      /* retirer sur une page retouchée : seul ce cadre part */
      const autres = s.dispo(2, "droite")!.cadres!.filter((_, k) => k !== 0);
      s.g({ type: "retirer", ref: ref(2, "droite", 0) });
      ok(O.egal(s.dispo(2, "droite")!.cadres, autres), "retirer : les autres cadres ne bougent pas");
      /* le même gabarit remet la page d'origine */
      const tpl = s.tpl(2, "droite")!;
      s.g({ type: "choisirGabarit", plancheId: pl(2), cible: "droite", templateId: tpl });
      ok(templateParId(tpl)?.nbPhotos === 3 && s.idsPleins(2, "droite").length === 3, "trois photos, un gabarit de trois");
      ok(s.dispo(2, "droite")?.cadres === undefined, "le même gabarit efface les retouches");
      /* une double retournée reste retournée quand elle change */
      const s2 = new Seance("A:L B:P C:P D:L").pose(2, "double", ["A", "B", "C"]).zero();
      s2.g({ type: "miroir", plancheId: pl(2) });
      ok(s2.dispo(2, "double")?.miroir === true, "double : miroir posé");
      const xs = photosPlanche(s2.e, pl(2)).map((c) => c.x);
      s2.g({ type: "annuler" });
      const xs0 = photosPlanche(s2.e, pl(2)).map((c, k) => 420 - c.x - photosPlanche(s2.e, pl(2))[k].l);
      ok(O.egal(xs.map((v) => Math.round(v * 1e6)), xs0.map((v) => Math.round(v * 1e6))), "double : chaque cadre est retourné autour du milieu");
      s2.g({ type: "retablir" }).g({ type: "ajouterSurPlanche", plancheId: pl(2), ids: ["D"] });
      ok(s2.dispo(2, "double")?.miroir === true, "ajouter une photo garde le miroir");
      /* la sauvegarde refuse ce qui ne se relit pas */
      const m = s2.e.magazine;
      const dd = m.planches[1].double!;
      const avecD = (x: Record<string, unknown>) => ({ ...m, planches: [m.planches[0], { ...m.planches[1], double: { ...dd, ...x } }, ...m.planches.slice(2)] });
      ok(!O.contenuValide(avecD({ miroir: false })), "miroir ne vaut que true");
      ok(!O.contenuValide(avecD({ cadres: [{ x: 0, y: 0, l: -4, h: 10, role: "photo" }] })), "un cadre de largeur négative est refusé");
      ok(!O.contenuValide(avecD({ cadres: [] })), "des cadres en moins que de photos sont refusés");
      /* les gabarits enregistrés : ce que l'écran voit, relu par le serveur, proposé en premier, copié dans la page */
      const gd = def(gabaritDepuisDisposition(s2.dispo(2, "double")!, "double", "Essai"), "gabarit depuis la double");
      const vus = photosPlanche(s2.e, pl(2)).map((c) => Math.round(c.x * 1e6));
      ok(O.egal(gd.cadres.filter((c) => c.role === "photo").map((c) => Math.round(c.x * 1e6)), vus), "le gabarit garde la double telle qu'on la voit (miroir compris)");
      ok(!!gabaritValide(gd) && !gabaritValide({ ...gd, nom: "" }) && !gabaritValide({ ...gd, portee: "page", cadres: [...gd.cadres, ...gd.cadres] }), "le serveur relit le gabarit (nom, portée, nombre)");
      const t = def(ligneEnTemplate({ id: "abc", nom: gd.nom, portee: gd.portee, cadres: gd.cadres, decor: gd.decor }), "ligne relue");
      enregistrerGabarits([t]);
      try {
        const s3 = new Seance("A:L B:P C:P D:L").pose(2, "double", ["A", "B", "C", "D"]).zero();
        const d3 = s3.dispo(2, "double")!;
        ok(d3.templateId === "M-abc" && !!d3.cadres && d3.cadres.length === gd.cadres.length, "même nombre de photos : le gabarit enregistré passe en premier, ses cadres copiés");
        ok(O.contenuValide(s3.e.magazine), "une page faite d'un gabarit enregistré se sauvegarde sans lui");
      } finally { enregistrerGabarits([]); }
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter("éditeur : le lot 4 (miroir, ⇧-clic, glisser une page, pose en libre, cadres retouchés, calques)", msg === null);
  }
  {
    /* R72 à R77 (09/11, couche 1) : netteté, empreinte, floues, rafales et doublons en piles, la bibliothèque les range. */
    let msg: string | null = null;
    try {
      /* une image nette (damier) contre la même floutée (aplat) */
      const L = 32, H = 24;
      const damier = Array.from({ length: L * H }, (_, i) => (((i % L) >> 2) + ((Math.floor(i / L)) >> 2)) % 2 ? 230 : 20);
      const aplat = Array.from({ length: L * H }, (_, i) => 100 + (i % L));
      ok(O.varianceLaplacien(damier, L, H) > 10 * O.varianceLaplacien(aplat, L, H), "R72 : un damier est bien plus net qu'un dégradé");
      eq(O.dHash(damier, L, H), O.dHash(damier, L, H), "R72 : l'empreinte est stable");
      eq(O.distanceHash("0000000000000000", "000000000000000f"), 4, "R72 : distance entre empreintes = bits différents");
      eq(O.distanceHash("zz", "0000000000000000"), 64, "R72 : empreinte mal formée = distance maximale");

      const sec = (s: number) => `2026-06-11T10:00:${String(s).padStart(2, "0")}`;
      const cat = new Map(catalogue("A:L B:L C:L D:L E:L F:P G:P H:P I:P J:P K:P L:P M:P Z:L!", {
        A: { date: sec(0) }, B: { date: sec(1) }, C: { date: sec(2) },          /* une rafale de trois */
        D: { date: "2026-06-11T12:00:00" }, E: { date: "2026-06-12T09:00:00" }, /* deux doublons à un jour d'écart */
        Z: { date: sec(3) },                                                     /* signalée : jamais dans une pile */
      }).map((p) => [p.id, p]));
      const h = (n: number) => n.toString(16).padStart(16, "0");
      const mes = new Map<string, O.Mesure>([
        ["A", { nettete: 300, dhash: h(0x1) }], ["B", { nettete: 900, dhash: h(0xff0000) }], ["C", { nettete: 500, dhash: h(0xf0f0f0f000) }],
        ["D", { nettete: 400, dhash: h(0xabcdef) }], ["E", { nettete: 450, dhash: h(0xabcdee) }],
        /* des empreintes très différentes : F..M ne forment ni rafale ni doublon entre elles (photos à une minute d'écart) */
        ["F", { nettete: 20, dhash: "ff00ff00ff00ff00" }], ["G", { nettete: 800, dhash: "0f0f0f0f0f0f0f0f" }], ["H", { nettete: 700, dhash: "aaaa5555aaaa5555" }],
        ["I", { nettete: 600, dhash: "f0f0f0f0f0f0f0f0" }], ["J", { nettete: 650, dhash: "00ff00ff00ff00ff" }], ["K", { nettete: 750, dhash: "5555aaaa5555aaaa" }],
        ["L", { nettete: 550, dhash: "3c3c3c3c3c3c3c3c" }], ["M", { nettete: 850, dhash: "c3c3c3c3c3c3c3c3" }], ["Z", { nettete: 900, dhash: h(0x1) }],
      ]);
      const lu = O.lireMesures(cat, mes);
      const raf = def(lu.piles.find((x) => x.raison === "rafale"), "R74 : la rafale");
      eq([raf.tete, ...raf.autres], ["B", "A", "C"], "R74, R76 : la rafale A B C, la plus nette (B) dessus, les autres dans l'ordre du temps");
      const dbl = def(lu.piles.find((x) => x.raison === "doublon"), "R75 : le doublon");
      eq([dbl.tete, ...dbl.autres], ["E", "D"], "R75 : D et E à un jour d'écart, même empreinte : un doublon, E (plus nette) dessus");
      ok(!lu.piles.some((x) => x.tete === "Z" || x.autres.includes("Z")), "les « à ne pas publier » restent hors des piles");
      eq(lu.floues, ["F"], "R73 : F, très en dessous de la médiane et du seuil, est floue ; les autres non");
      eq(O.photosEnMoins(lu), 3, "trois photos rangées sous une pile");
      eq(O.lireMesures(cat, new Map([["F", mes.get("F")!]])).floues, [], "R73 : trop peu de mesures, aucune floue");
      const meme = new Map(catalogue("P:L Q:L", { P: { date: sec(5) }, Q: { date: sec(5) } }).map((p) => [p.id, p]));
      eq(O.lireMesures(meme, new Map([["P", { nettete: 500, dhash: h(0) }], ["Q", { nettete: 500, dhash: "ffffffff00000000" }]])).piles, [], "R74 : même seconde mais images sans rapport : pas une rafale");

      /* R77 : la bibliothèque */
      const e0 = O.creerEtat({ magazine: magazineVide(3), catalogue: cat });
      const e1 = O.appliquer(e0, { type: "poserLecture", lecture: lu });
      const vis = (e: EtatEditeur) => O.visibles(e);
      ok(!vis(e1).includes("A") && !vis(e1).includes("C") && !vis(e1).includes("D") && vis(e1).includes("B") && vis(e1).includes("E"), "R77 : sous une pile, seule la tête se montre");
      const e2 = O.appliquer(e1, { type: "basculerPile", tete: "B" });
      ok(vis(e2).includes("A") && vis(e2).includes("C"), "R77 : une pile ouverte montre tout");
      ok(O.appliquer(e2, { type: "basculerPile", tete: "B" }).pilesOuvertes.length === 0, "R77 : un second clic la referme");
      ok(O.appliquer(e1, { type: "basculerPile", tete: "A" }) === e1, "R77 : seule une tête ouvre une pile");
      const e3 = { ...e1, magazine: O.marquer(e1.magazine, ["A"], "reserve") };
      ok(vis(e3).includes("A") && !vis(e3).includes("C"), "R77 : une photo déjà jugée par l'atelier ne se cache jamais");
      const e4 = O.appliquer({ ...e1, magazine: O.marquer(e1.magazine, ["B"], "ecartee") }, { type: "filtrer", filtres: { marque: "ecarter" } });
      ok(!vis(e4).includes("B") && vis(e4).includes("A") && vis(e4).includes("C"), "R77 : tête cachée par le filtre (écartée au tour ①), ses photos réapparaissent");
      ok(O.contenuValide(e2.magazine), "la lecture ne touche pas au magazine : il se sauvegarde tel quel");
      ok(O.appliquer(e2, { type: "poserLecture", lecture: O.LECTURE_VIDE }).pilesOuvertes.length === 0, "une nouvelle lecture oublie les piles qui n'existent plus");
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter("éditeur : couche 1, floues, rafales et doublons en piles (R72 à R77)", msg === null);
  }
  {
    /* Lot 2 (09/11) : G7 réglages versionnés, G1 leçons tirées d'un geste contraire, G2 instantané. */
    let msg: string | null = null;
    try {
      ok(/^r[0-9a-f]{8}$/.test(O.versionReglages()) && O.versionReglages() === O.versionReglages(), "G7 : la version des réglages est stable et courte");
      ok(O.REGLAGES.doublon_hamming.valeur === O.DOUBLON_HAMMING && O.REGLAGES.flou_absolu.valeur === O.FLOU_ABSOLU, "G7 : mesures.ts lit ses seuils dans les réglages");
      ok(Object.values(O.REGLAGES).every((r) => r.regle && r.depuis && r.raison), "G7 : chaque réglage a sa règle, sa date et sa raison");

      const sec = (s: number) => `2026-06-11T10:00:${String(s).padStart(2, "0")}`;
      const cat = new Map(catalogue("A:L B:L C:L F:P G:P H:P I:P J:P K:P L:P M:P N:P", { A: { date: sec(0) }, B: { date: sec(1) }, C: { date: sec(2) } }).map((p) => [p.id, p]));
      const h = (n: number) => n.toString(16).padStart(16, "0");
      const mes = new Map<string, O.Mesure>([["A", { nettete: 300, dhash: h(1) }], ["B", { nettete: 900, dhash: h(2) }], ["C", { nettete: 500, dhash: h(3) }], ["F", { nettete: 10, dhash: h(0x1111111111) }],
        ...["G", "H", "I", "J", "K", "L", "M", "N"].map((id, i) => [id, { nettete: 600 + i * 10, dhash: ["ff00ff00ff00ff00", "0f0f0f0f0f0f0f0f", "aaaa5555aaaa5555", "f0f0f0f0f0f0f0f0", "00ff00ff00ff00ff", "5555aaaa5555aaaa", "3c3c3c3c3c3c3c3c", "c3c3c3c3c3c3c3c3"][i] }] as [string, O.Mesure])]);
      const lu = O.lireMesures(cat, mes);
      ok(lu.floues.includes("F") && lu.piles.some((p) => p.tete === "B"), "lecture d'essai : F floue, B tête de la rafale A B C");
      const e0 = O.appliquer(O.creerEtat({ magazine: magazineVide(3), catalogue: cat }), { type: "poserLecture", lecture: lu });
      eq(e0.lecons.length, 0, "G1 : aucune leçon avant un geste");
      const e1 = O.appliquer(e0, { type: "marquer", ids: ["F"], marque: "choisie" });
      eq(e1.lecons.map((l) => l.type), ["floue_gardee"], "G1 : garder une floue est une leçon (R73)");
      ok(e1.lecons[0].version === O.versionReglages() && e1.lecons[0].reglages.flou_absolu === O.FLOU_ABSOLU, "G1 : la leçon emporte les réglages en vigueur");
      const e2 = O.appliquer(e1, { type: "marquer", ids: ["A"], marque: "choisie" });
      eq(e2.lecons[e2.lecons.length - 1].type, "pile_autre_gardee", "G1 : garder A au lieu de la tête B est une leçon (R74)");
      const e3 = O.appliquer(e2, { type: "marquer", ids: ["B"], marque: "choisie" });
      const e4 = O.appliquer(e3, { type: "marquer", ids: ["C"], marque: "choisie" });
      eq(e4.lecons[e4.lecons.length - 1].type, "pile_pas_un_doublon", "G1 : garder C en plus de la tête gardée = « pas un doublon »");
      const e5 = O.appliquer(e4, { type: "marquer", ids: ["B"], marque: "ecartee", poser: true });
      eq(e5.lecons[e5.lecons.length - 1].type, "tete_ecartee", "G1 : écarter la tête quand une autre est gardée (R76)");
      const sans = O.appliquer(O.creerEtat({ magazine: magazineVide(3), catalogue: cat }), { type: "marquer", ids: ["F"], marque: "choisie" });
      eq(sans.lecons.length, 0, "G1 : sans lecture, aucune leçon (la machine n'avait rien proposé)");
      const e6 = O.appliquer(e5, { type: "leconsEnvoyees", n: 2 });
      eq(e6.lecons.length, e5.lecons.length - 2, "G1 : l'écran retire les leçons envoyées");
      const pose = O.appliquer(e0, { type: "deposer", source: { type: "bibliotheque", ids: ["A"] }, cible: { type: "vignette", plancheId: pl(2) } });
      ok(pose.lecons.some((l) => l.type === "pile_autre_gardee" && l.geste === "posée à la place de la tête"), "G1 : poser une photo rangée sous une pile est une leçon");
      const j = O.jalon("export", "essai");
      ok(O.leconValide(j) && !O.leconValide({ ...j, type: "autre" }) && !O.leconValide({ ...j, version: "x" }), "le serveur relit une leçon (type, version)");
      const inst = O.instantane(e5, mes);
      ok(inst.photos.length === cat.size && inst.photos.find((p) => p.id === "B")?.nettete === 900 && inst.planches.length === 3 && inst.lecture.piles.length === lu.piles.length, "G2 : l'instantané porte mesures, lecture, planches, sans pixels");
      ok(O.contenuValide(e5.magazine), "les leçons ne touchent pas au magazine sauvegardé");
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter("éditeur : lot 2, la mémoire (réglages versionnés, leçons d'un geste contraire, instantané)", msg === null);
  }
  {
    /* Lot 2 (09/11) : B1 carte de chaleur, B2 recadrage par le contenu, B3 rien dans le pli. */
    let msg: string | null = null;
    try {
      const L = 96, H = 64;
      /* un fond uni et une tache claire en haut à gauche : la saillance doit la trouver */
      const g = new Uint8Array(L * H).fill(90);
      for (let y = 6; y < 22; y++) for (let x = 8; x < 28; x++) g[y * L + x] = 240;
      const carte = O.carteSaillance(g, L, H);
      proche(carte.reduce((a, b) => a + b, 0), 1, 1e-6, "B1 : la carte est normalisée");
      const z = def(O.zoneImportante([], carte), "B1 : une zone sans visage");
      ok(z.x + z.l / 2 < 0.45 && z.y + z.h / 2 < 0.5, "B1 : la zone saillante est en haut à gauche, là où est la tache");
      const v = O.zoneImportante([{ x: 0.6, y: 0.5, l: 0.2, h: 0.3 }], null);
      ok(!!v && v.y < 0.5 && v.y + v.h >= 0.8 - 1e-9 && v.x === 0.6, "B1 : un visage impose sa zone, avec de l'air au-dessus de la tête (R-21)");
      ok(O.zoneImportante([], null) === null, "B1 : sans visage ni carte, pas de zone");

      /* B2 : un portrait 2000 × 3000 dans un cadre carré 100 × 100 : remplissage par la largeur, l'image fait 150 mm de haut */
      const photo = { l: 2000, h: 3000 }, cadre = { l: 100, h: 100 };
      const haut = O.recadrageParContenu(photo, cadre, { x: 0.3, y: 0.05, l: 0.4, h: 0.2 });
      ok(haut.zoom === 1 && haut.dx === 0 && haut.dy > 0, "B2 : une zone en haut fait glisser l'image vers le bas (dy > 0)");
      const bas = O.recadrageParContenu(photo, cadre, { x: 0.3, y: 0.8, l: 0.4, h: 0.15 });
      ok(bas.dy < 0 && Math.abs(bas.dy) <= 25 + 1e-9, "B2 : une zone en bas glisse vers le haut, bornée par le bord de l'image (25 mm)");
      eq(O.recadrageParContenu(photo, cadre, null), { zoom: 1, dx: 0, dy: 0 }, "B2 : sans zone, le neutre");
      const centre = O.recadrageParContenu(photo, cadre, { x: 0.4, y: 0.45, l: 0.2, h: 0.1 });
      proche(centre.dy, 0, 0.01, "B2 : une zone au centre ne bouge rien");

      /* B3 : une double pleine page (cadre sur toute la planche) et un visage au milieu de la photo = sur le pli */
      const pleine = { x: 0, y: 0, l: 420, h: 297 };
      const paysage = { l: 4200, h: 2970 };
      const auPli = O.partDansLePli(paysage, pleine, { x: 0.49, y: 0.3, l: 0.02, h: 0.1 });
      ok(auPli > 0.9, "B3 : un visage au centre d'une pleine double est dans le pli");
      eq(O.partDansLePli(paysage, pleine, { x: 0.1, y: 0.3, l: 0.1, h: 0.1 }), 0, "B3 : un visage à gauche n'y est pas");
      eq(O.partDansLePli(paysage, { x: 0, y: 0, l: 200, h: 297 }, { x: 0.5, y: 0.3, l: 0.1, h: 0.1 }), 0, "B3 : un cadre qui ne touche pas le pli ne compte pas");
      /* la note d'un gabarit pleine double monte quand la zone est au pli : un gabarit à deux cadres doit passer devant */
      const refPli = { id: "p", nom: "p", l: 4200, h: 2970, date: null, zone: { x: 0.49, y: 0.3, l: 0.02, h: 0.1 } };
      const refOk = { ...refPli, zone: { x: 0.1, y: 0.3, l: 0.1, h: 0.1 } };
      const gab = (r: typeof refPli) => O.gabaritsClasses("double", [r], null);
      const notePli = gab(refPli).find((x) => x.template.cadres.some((c) => c.role === "photo" && c.l > 400))?.note;
      const noteOk = gab(refOk).find((x) => x.template.cadres.some((c) => c.role === "photo" && c.l > 400))?.note;
      ok(notePli !== undefined && noteOk !== undefined && notePli > noteOk + 3, "B3 : la pleine double est pénalisée quand le visage tombe dans le pli (R-25)");
      ok(O.REGLAGES.pli_mm.raison.startsWith("HYPOTHÈSE"), "B3 : la largeur du pli est une hypothèse à confirmer avec Cloudprinter");

      /* la zone rejoint le catalogue par la lecture, et la pose s'en sert */
      const cat = new Map(catalogue("A:P B:L").map((p) => [p.id, p]));
      const e0 = O.creerEtat({ magazine: magazineVide(3), catalogue: cat });
      const e1 = O.appliquer(e0, { type: "poserLecture", lecture: { ...O.LECTURE_VIDE, mesurees: 2, zones: { A: { x: 0.3, y: 0.02, l: 0.4, h: 0.2 } } } });
      ok(e1.catalogue.get("A")?.zone?.y === 0.02 && !e1.catalogue.get("B")?.zone, "la zone de la lecture rejoint la photo du catalogue");
      const e2 = O.appliquer(e1, { type: "deposer", source: { type: "bibliotheque", ids: ["A"] }, cible: { type: "vignette", plancheId: pl(2) } });
      const dispo = e2.magazine.planches[1].gauche ?? e2.magazine.planches[1].droite ?? e2.magazine.planches[1].double;
      const aff = dispo?.photos.find((a) => a.photoId === "A");
      ok(!!aff && (aff.recadrage.dy !== 0 || aff.recadrage.dx !== 0 || aff.recadrage.zoom === 1), "B2 : à la pose, le recadrage lit la zone (ou reste neutre si le cadre a le même rapport)");
      ok(O.contenuValide(e2.magazine), "le magazine posé par contenu se sauvegarde");
      const e3 = O.appliquer(e1, { type: "poserLecture", lecture: O.LECTURE_VIDE });
      ok(!e3.catalogue.get("A")?.zone, "une lecture sans zone retire la zone");
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter("éditeur : lot 2, des yeux (carte de chaleur, recadrage par le contenu, rien dans le pli)", msg === null);
  }
  {
    /* Lot 3 (09/11) : A10 pré-tri et raisons, A3 lumière, A4 capture, A7 visage flou, A5 horloges, A9 moments, A11 équité,
       A12 variété, A16 objectif, E1 palette, D7 faits, G3 questions, F4 contrôle avant export. */
    let msg: string | null = null;
    try {
      const h = (n: number) => n.toString(16).padStart(16, "0");
      const DH = ["ff00ff00ff00ff00", "0f0f0f0f0f0f0f0f", "aaaa5555aaaa5555", "f0f0f0f0f0f0f0f0", "00ff00ff00ff00ff", "5555aaaa5555aaaa", "3c3c3c3c3c3c3c3c", "c3c3c3c3c3c3c3c3", "ffff0000ffff0000", "0000ffff0000ffff", "f00ff00ff00ff00f", "0ff00ff00ff00ff0", "cccc3333cccc3333", "3333cccc3333cccc"];
      const t = (hh: number, mm: number, ss = 0) => `2026-06-11T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
      /* matin : A1..A6 (Inès) ; soir : B1..B4 (Inès) et L1 (Léo, un seul) ; S sombre ; C capture ; V visage flou ; F floue */
      const cat = new Map(catalogue("A1:L A2:L A3:L A4:L A5:L A6:L B1:L B2:L B3:L B4:L L1:L S:L F:L V:P C:1000x2200", {
        A1: { date: t(9, 0) }, A2: { date: t(9, 10) }, A3: { date: t(9, 20) }, A4: { date: t(9, 30) }, A5: { date: t(9, 40) }, A6: { date: t(9, 50) },
        B1: { date: t(20, 0) }, B2: { date: t(20, 10) }, B3: { date: t(20, 20) }, B4: { date: t(20, 30) }, L1: { date: t(20, 40), personne: "Léo" },
        S: { date: t(12, 0) }, F: { date: t(12, 30) }, V: { date: t(13, 0) }, C: { date: null },
      }).map((p) => [p.id, p]));
      const ids = [...cat.keys()];
      const mesures: Record<string, O.Mesure> = Object.fromEntries(ids.map((id, i) => [id, { nettete: 500 + i * 20, dhash: DH[i % DH.length] ?? h(i), lumi: { moyenne: 120, noirs: 0.02, blancs: 0.02 }, palette: ["#336699", "#cc9966"] }]));
      mesures.S = { ...mesures.S, nettete: 5, lumi: { moyenne: 20, noirs: 0.7, blancs: 0 } };
      mesures.F = { ...mesures.F, nettete: 10 };
      mesures.V = { ...mesures.V, nettete: 700, visages: [{ x: 0.3, y: 0.2, l: 0.4, h: 0.3, nettete: 0.1 }] };
      mesures.C = { ...mesures.C, dhash: "1234567812345678" };
      const lecture = O.lireMesures(cat, new Map(Object.entries(mesures)));
      ok(lecture.mesures !== undefined && Object.keys(lecture.mesures).length === cat.size && (lecture.palette?.length ?? 0) >= 1, "E1 : la lecture porte les mesures et une palette du magazine");
      let e = O.appliquer(O.creerEtat({ magazine: magazineVide(3), catalogue: cat }), { type: "poserLecture", lecture });
      const sans = O.preTrier(e.catalogue, e.magazine, e.lecture);
      eq(sans.objectif, null, "A16 : sans objectif fixé, l'objectif est inconnu");
      ok(!Object.values(sans.propositions).some((p) => p.marque === "choisie"), "A16 : sans objectif, la machine ne propose rien à garder");
      eq(sans.propositions.F?.raison, "floue", "A10 : F écartée, raison « floue »");
      eq(sans.propositions.S?.raison, "trop sombre", "A3 : S écartée, raison « trop sombre » (la lumière passe avant le flou : vu à l'essai du 09/11)");
      eq(sans.propositions.C?.marque, "reserve", "A4 : sans date et allongée : capture probable, en réserve");
      eq(sans.propositions.V?.raison, "visage flou", "A7 : visage trois fois moins net que la photo : réserve « visage flou »");

      /* objectif : 4 photos ; le matin (6 photos) pèse plus que le soir (5 photos, 2 déposants : pondéré) */
      e = O.appliquer(e, { type: "reglerTri", visees: 4 } as unknown as Geste);
      if (O.triDe(e.magazine).visees !== 4) e = { ...e, magazine: O.reglerVisees(e.magazine, 4) };
      const avec = O.preTrier(e.catalogue, e.magazine, e.lecture);
      const gardees = Object.entries(avec.propositions).filter(([, p]) => p.marque === "choisie").map(([id]) => id);
      ok(gardees.length >= 4, "A16 : avec un objectif de 4, au moins 4 photos proposées à garder");
      ok(gardees.some((id) => id.startsWith("A")) && gardees.some((id) => id.startsWith("B") || id === "L1"), "A9 : chaque moment a sa part");
      ok(gardees.includes("L1") || avec.propositions.L1?.raison === "seule photo de Léo" || gardees.some((id) => cat.get(id)?.personne === "Léo"), "A11 : Léo, seul de son côté, a sa photo gardée");
      ok(avec.moments.every((m) => m.poids > 0 && m.poids <= 1), "A9 : chaque moment a un poids entre 0 et 1");
      const matin = avec.moments.find((m) => m.libelle.includes("Matin"));
      ok(!!matin && matin.visees >= 1, "A9 : le matin a au moins une gardée visée");

      /* le geste : un seul, annulable, qui ne touche jamais une photo déjà marquée */
      const e1 = O.appliquer({ ...e, magazine: O.marquer(e.magazine, ["F"], "choisie") }, { type: "preTrier" });
      ok(O.marqueDe(e1.magazine, "F") === "choisie", "A10 : une photo déjà marquée par l'atelier n'est jamais touchée");
      ok(O.marqueDe(e1.magazine, "S") === "ecartee" && O.marqueDe(e1.magazine, "C") === "reserve", "A10 : le pré-tri pose ses marques");
      ok(e1.pretri.S?.raison === "trop sombre", "A10 : la raison reste attachée à la photo");
      const annule = O.appliquer(e1, { type: "annuler" });
      ok(O.marqueDe(annule.magazine, "S") === null, "A10 : une seule annulation défait tout le pré-tri");
      const e2 = O.appliquer(e1, { type: "marquer", ids: ["S"], marque: "choisie" });
      ok(e2.lecons.some((l) => l.type === "pretri_renverse" && l.photos[0] === "S" && l.proposition.includes("trop sombre")), "A10 : renverser une marque du pré-tri est une leçon, avec sa raison");

      /* A5 : Léo a 1 h de retard sur Inès, trois photos jumelles le prouvent */
      const cat2 = new Map(catalogue("I1:L I2:L I3:L I4:L J1:L J2:L J3:L", {
        I1: { date: t(10, 0) }, I2: { date: t(11, 0) }, I3: { date: t(12, 0) }, I4: { date: t(12, 30) },
        J1: { date: t(9, 0), personne: "Léo" }, J2: { date: t(10, 0), personne: "Léo" }, J3: { date: t(11, 0), personne: "Léo" },
      }).map((p) => [p.id, p]));
      const m2 = new Map<string, O.Mesure>([["I1", { nettete: 1, dhash: DH[0] }], ["I2", { nettete: 1, dhash: DH[1] }], ["I3", { nettete: 1, dhash: DH[2] }], ["I4", { nettete: 1, dhash: DH[3] }],
        ["J1", { nettete: 1, dhash: DH[0] }], ["J2", { nettete: 1, dhash: DH[1] }], ["J3", { nettete: 1, dhash: DH[2] }]]);
      eq(O.decalagesHorloges(cat2, m2), { Léo: 3600 }, "A5 : trois photos jumelles concordent : Léo est recalé d'une heure");
      eq(O.decalagesHorloges(cat2, new Map([...m2].slice(0, 5))), {}, "A5 : moins de trois paires : on ne recale rien");

      /* A12 : deux quasi-jumelles très nettes et une différente : la variété l'emporte */
      const cat3 = new Map(catalogue("X:L Y:L Z:L", { X: { date: t(8, 0) }, Y: { date: t(8, 5) }, Z: { date: t(8, 10) } }).map((p) => [p.id, p]));
      const lec3 = { ...O.LECTURE_VIDE, mesurees: 3, mesures: { X: { nettete: 900, dhash: "ff00ff00ff00ff00" }, Y: { nettete: 880, dhash: "ff00ff00ff00ff0f" }, Z: { nettete: 600, dhash: "00ff00ff00ff00ff" } } };
      const mag3 = O.reglerVisees(magazineVide(2), 2);
      const g3 = Object.entries(O.preTrier(cat3, mag3, lec3).propositions).filter(([, p]) => p.marque === "choisie").map(([id]) => id).sort();
      eq(g3, ["X", "Z"], "A12 : deux à garder : la plus nette, puis la différente (pas sa jumelle)");

      /* E1 */
      const px = new Uint8Array(400 * 4); for (let i = 0; i < 400; i++) { const r = i < 300; px.set(r ? [200, 30, 30, 255] : [20, 40, 200, 255], i * 4); }
      const pal = O.paletteDePixels(px, 1);
      ok(pal[0] === "#c81e1e" && pal.includes("#1428c8"), "E1 : la palette d'une photo, la teinte dominante d'abord");

      /* D7 */
      const f = O.faitsDePage(["A1", "A2"], cat).map((x) => x.valeur);
      ok(f.includes("Jeudi 11 juin") && f.some((v) => v.includes("matin")) && f.includes("Juin 2026"), "D7 : jour, moment et mois, calculés");
      ok(O.faitsDePage(["C"], cat).length === 0, "D7 : une photo sans date ne donne aucun fait (R-66)");
      ok(O.faitsDePage(["A1"], cat).some((x) => x.valeur === "9 h 00") && O.faitsDePage(["A1"], cat).some((x) => /photos ce jour-là/.test(x.valeur)), "D7 : l'heure d'une photo seule et le nombre de photos du jour");

      /* G3 */
      const qs = O.troisQuestions([...e2.lecons, ...e2.lecons, O.jalon("export", "x")]);
      ok(qs.length >= 1 && qs.length <= 3 && qs.every((q) => q.type !== "export"), "G3 : au plus trois questions, jamais un jalon");
      const rep = O.reponse(qs[0], "atelier", "  trop sombre mais belle  ");
      ok(rep.type === "reponse" && rep.geste === "j'avais raison : trop sombre mais belle" && O.leconValide(rep), "G3 : la réponse est une leçon valide, la note nettoyée");

      /* F4 */
      const e3 = O.appliquer(e, { type: "deposer", source: { type: "bibliotheque", ids: ["F"] }, cible: { type: "vignette", plancheId: pl(2) } });
      const av = O.avertissementsExport(e3);
      ok(av.flouesPosees.some((z) => z.photoId === "F"), "F4 : une photo floue posée est signalée avant l'export");
      ok(av.pagesVides.includes(3), "F4 : une planche vide est signalée");
    } catch (er) { msg = er instanceof Error ? er.message : String(er); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter("éditeur : lot 3, la machine propose (pré-tri, raisons, horloges, équité, variété, faits, questions, contrôle)", msg === null);
  }
  {
    /* 10/11 : la lecture VISIBLE (retour du test de Mathias) : tags, filtre, captures, similaires, chaleur dessinable, panneau. */
    let msg: string | null = null;
    try {
      const t = (mm: number, ss = 0) => `2026-06-11T10:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
      const cat = new Map(catalogue("A:L B:L C:L D:L E:L F:L G:L H:L I:L J:L K:L L:L CAP:1170x2532 WA:L", {
        A: { date: t(0) }, B: { date: t(3) }, C: { date: t(20) }, D: { date: t(21) }, E: { date: t(30) }, F: { date: t(31) }, G: { date: t(32) }, H: { date: t(33) },
        I: { date: t(34) }, J: { date: t(35) }, K: { date: t(36) }, L: { date: t(37) },
        CAP: { date: "2026-06-11T10:40:00", appareil: null }, WA: { date: t(50), appareil: null },
      }).map((p) => [p.id, p]));
      const D = ["ff00ff00ff00ff00", "0f0f0f0f0f0f0f0f", "aaaa5555aaaa5555", "f0f0f0f0f0f0f0f0", "00ff00ff00ff00ff", "5555aaaa5555aaaa", "3c3c3c3c3c3c3c3c", "c3c3c3c3c3c3c3c3", "ffff0000ffff0000", "0000ffff0000ffff", "f00ff00ff00ff00f", "0ff00ff00ff00ff0", "cccc3333cccc3333", "3333cccc3333cccc"];
      const mes = new Map<string, O.Mesure>([...cat.keys()].map((id, i) => [id, { nettete: 400 + i * 10, dhash: D[i], lumi: { moyenne: 120, noirs: 0.01, blancs: 0.01 }, aplats: 0.2 }]));
      /* A et B : même scène à 3 minutes, 12 cases d'écart : SIMILAIRES, pas doublons */
      mes.set("B", { ...mes.get("B")!, dhash: "ff00ff00ff00f0ff" });
      mes.set("CAP", { ...mes.get("CAP")!, aplats: 0.7 });
      mes.set("WA", { ...mes.get("WA")!, aplats: 0.2 });
      mes.set("E", { ...mes.get("E")!, nettete: 30 });
      mes.set("F", { ...mes.get("F")!, visages: [{ x: 0.4, y: 0.3, l: 0.2, h: 0.3 }] });
      const lu = O.lireMesures(cat, mes);
      const tags = O.tagsDeLecture(cat, lu);
      ok((lu.similaires ?? []).some((g) => g.includes("A") && g.includes("B")) && !lu.piles.some((p) => p.tete === "A" || p.tete === "B"), "R93 : A et B (même scène, 3 min, 12 cases) sont SIMILAIRES, pas une pile");
      ok(tags.get("A")?.includes("similaire") && tags.get("B")?.includes("similaire"), "R94 : le tag « Similaire » est posé sur les deux");
      ok(tags.get("E")?.includes("floue"), "R73 (10/11) : sous le plancher de 40, floue même sans écart à la médiane");
      ok(tags.get("CAP")?.includes("capture"), "A4 (10/11) : sans appareil et avec aplats, capture, MÊME avec une date (le fichier en a toujours une en création libre)");
      ok(!tags.get("WA")?.includes("capture"), "A4 : sans appareil mais sans aplats ni forme d'écran (photo reçue par messagerie) : pas une capture");
      ok(!O.estCapture({ l: 1170, h: 2532, date: t(1), appareil: "Apple iPhone 15" }, { nettete: 1, dhash: D[0], aplats: 0.9 }), "A4 : une photo d'appareil n'est jamais une capture");
      ok(tags.get("F")?.includes("visages") && O.MOT_TAG.visages.vignette === false, "A6 : « Avec visages » est filtrable, jamais sur la vignette");
      const n = O.comptesTags(tags);
      ok(n.similaire === 2 && n.capture === 1 && n.floue >= 1, "les comptes du filtre");

      /* le filtre : une seule photo de chaque tag, rien de caché sous une pile pendant le filtre */
      let e = O.appliquer(O.creerEtat({ magazine: magazineVide(2), catalogue: cat }), { type: "poserLecture", lecture: lu });
      e = O.appliquer(e, { type: "filtrer", filtres: { lecture: "similaire" } });
      eq(O.visibles(e).sort(), ["A", "B"], "R94 : filtrer « Similaire » ne montre que A et B");
      e = O.appliquer(e, { type: "filtrer", filtres: { lecture: "nimporte" as never } });
      eq(e.filtres.lecture, "similaire", "un tag inconnu ne change pas le filtre");
      e = O.appliquer(e, { type: "retirerFiltre", cle: "lecture" });
      eq(e.filtres.lecture, "", "retirer le filtre");

      /* la chaleur dessinable et le panneau */
      const carte = new Float64Array(64 * 64); carte[10 * 64 + 10] = 1;
      const c = O.chaleurCompacte(carte);
      ok(c.length === 256 && c[2 * 16 + 2] === "9" && [...c].filter((x) => x !== "0").length === 1, "B1 : la carte réduite à 16 × 16 se dessine (la case chaude au bon endroit)");
      const l = O.lectureDePhoto("A", cat, lu, O.distanceHash);
      ok(l.plusProche?.id === "B" && l.plusProche.ecart <= 18 && l.tags.includes("similaire") && l.seuilFloue >= 40, "le panneau Lecture explique le tag : la plus ressemblante, son écart, le seuil");
    } catch (er) { msg = er instanceof Error ? er.message : String(er); }
    if (msg !== null) { echecs++; console.log(`   ${msg}`); }
    rapporter("éditeur : la lecture visible (tags, filtre, captures, similaires, chaleur, panneau) (R93, R94)", msg === null);
  }
  const archi = S.filter((x) => x.n <= 73).length;
  rapporter(`éditeur : ${S.length} scénarios (ARCHI ${archi} + ${S.length - archi} en plus), ${totalGestes} gestes joués, ${echecs} échec(s)`, echecs === 0 && S.length === 83 && archi === 73);
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
