/**
 * Les opérations pures de l'éditeur : composer, ajouter, retirer, remplacer, échanger, déplacer,
 * réordonner, gabarits, fusion, séparation, planches. Aucune interface, aucune horloge.
 *
 * Chacune rend une `Issue` (le magazine, ou le MÊME objet s'il est refusé, plus le bilan) ou un magazine.
 * Toutes les règles de choix viennent de `gabaritsClasses` : le meilleur gabarit de la note.
 */

import {
  candidats, dispositionDe, ecrireTexte as ecrireTexteMagazine, recadrer as recadrerMagazine, supprimerPlanche as supprimerPlancheMagazine,
  templateParId, vider as viderMagazine,
  type Cible, type Disposition, type Magazine, type Planche, type PhotoRef, type RefCadre, type TexteCadre,
} from "../magazine";
import { MAX_PHOTOS_DOUBLE, MAX_PHOTOS_PAGE } from "../grilles";
import { ZOOM_MIN, cadrer, type Recadrage } from "../recadrage";
import type { Template } from "../types";
import {
  BONUS_ANNEXE, CIBLES, LIBELLE, PENALITE_REPETITION, TOLERANCE_RAPPORT,
  affectation, borner, cadresPhoto, cadresTexte, dimsCadre, egal, estEntier, estNeutre, idsDispo, idsMagazine, idsPlanche,
  indexPlanche, maxDe, neutre, photosDe, plancheDe, porteeDe, saisi, texteDe, textesInitiaux,
} from "./outils";
import type { Dims, Issue, Refus } from "./types";

/** Le catalogue vu par les opérations : seules les mesures comptent. */
export type CatalogueRef = ReadonlyMap<string, PhotoRef>;

/* ─────────────────────────── 2 à 7. Mesures et règles ─────────────────────────── */

/** La photo du catalogue, ou un fantôme carré : la note reste définie, l'id n'est jamais perdu. */
export function refPour(cat: CatalogueRef | null | undefined, id: string | null): PhotoRef {
  const p = cat && id !== null ? cat.get(id) : undefined;
  return p ?? { id: id ?? "", nom: id ?? "", l: 1, h: 1, date: null };
}

const rapport = (o: Dims): number => {
  const l = Number.isFinite(o.l) && o.l > 0 ? o.l : 1;
  const h = Number.isFinite(o.h) && o.h > 0 ? o.h : 1;
  return l / h;
};

/** 1 − min(rp, rc) / max(rp, rc), dans [0, 1[. */
export function perteCadre(photo: Dims, cadre: Dims): number {
  const rp = rapport(photo), rc = rapport(cadre);
  return 1 - Math.min(rp, rc) / Math.max(rp, rc);
}

/** Somme des pertes + pénalité de répétition − petit bonus aux gabarits DESSINÉS (annexe et épingles), jamais aux grilles. */
export function noterGabarit(t: Template, photos: readonly Dims[], precedent: string | null): number {
  const cs = cadresPhoto(t);
  let s = 0;
  for (let i = 0; i < cs.length; i++) s += perteCadre(photos[i] ?? { l: 1, h: 1 }, cs[i]);
  if (t.id === precedent) s += PENALITE_REPETITION;
  if (t.origine !== "grille") s -= BONUS_ANNEXE;
  return s;
}

export type GabaritNote = { template: Template; note: number };

/**
 * Les gabarits de ce nombre et de cette portée, triés par note croissante. Tri stable : à égalité
 * (au milliardième près, pour absorber l'ordre des additions flottantes), l'ordre de `candidats`.
 */
export function gabaritsClasses(portee: "page" | "double", photos: readonly PhotoRef[], precedent: string | null): GabaritNote[] {
  if (!Array.isArray(photos) || photos.length === 0 || photos.length > maxDe(portee)) return [];
  return candidats(portee, [...photos])
    .filter((t) => t.nbPhotos === photos.length && t.portee === portee)
    .map((template, i) => {
      const note = noterGabarit(template, photos, precedent);
      return { template, note, cle: Math.round(note * 1e9), i };
    })
    .sort((a, b) => a.cle - b.cle || a.i - b.i)
    .map(({ template, note }) => ({ template, note }));
}

/** T23 : rapport à moins de 15 % = zoom gardé, décalages à l'échelle, rebornés ; sinon neutre. */
export function reporterRecadrage(r: Recadrage | null, photo: Dims, ancien: Dims | null, nouveau: Dims | null): Recadrage {
  if (!r || !ancien || !nouveau || estNeutre(r)) return neutre();
  const q = rapport(nouveau) / rapport(ancien);
  if (q < 1 / TOLERANCE_RAPPORT || q > TOLERANCE_RAPPORT) return neutre();
  const c = cadrer(photo, nouveau, { zoom: r.zoom, dx: r.dx * (nouveau.l / ancien.l), dy: r.dy * (nouveau.h / ancien.h) });
  return { zoom: c.zoom, dx: c.dx, dy: c.dy };
}

/** T24 : textes saisis reportés par rôle et par rang (1er titre → 1er titre) ; sans place = perdu. */
export function reporterTextes(anciens: readonly TexteCadre[], tA: Template | null, tB: Template): { textes: TexteCadre[]; perdus: number } {
  if (tA && tA.id === tB.id && anciens.length === cadresTexte(tB).length) {
    return { textes: anciens.map((t) => ({ ...t })), perdus: 0 };
  }
  const textes = textesInitiaux(tB);
  const rolesB = cadresTexte(tB).map((c) => c.role);
  const rolesA = tA ? cadresTexte(tA).map((c) => c.role) : [];
  const rang: Record<string, number> = {};
  let perdus = 0;
  anciens.forEach((t, j) => {
    const role = rolesA[j];
    if (!role) { if (saisi(t)) perdus++; return; }
    rang[role] = (rang[role] ?? -1) + 1;
    if (!saisi(t)) return;
    let vu = -1, cible = -1;
    for (let x = 0; x < rolesB.length; x++) if (rolesB[x] === role && ++vu === rang[role]) { cible = x; break; }
    if (cible < 0) perdus++;
    else textes[cible] = { ...textes[cible], contenu: t.contenu };
  });
  return { textes, perdus };
}

/* ─────────────────────────── 8. Le cœur : composer ─────────────────────────── */

type SourcePhoto = { r: Recadrage | null; cadre: Dims | null };

/** Recadrage et cadre de chaque photo posée sur la planche (pour le report T23). */
function sourcesDe(p: Planche): Map<string, SourcePhoto> {
  const s = new Map<string, SourcePhoto>();
  for (const x of photosDe(p)) {
    if (!x.photoId) continue;
    const d = dispositionDe(p, x.ref.cible);
    if (!d) continue;
    s.set(x.photoId, { r: d.photos[x.ref.index].recadrage, cadre: dimsCadre(d, x.ref.index) });
  }
  return s;
}

/** Le gabarit de la même cible sur la planche d'avant (page : même côté ; double : sa double). */
export function precedentDe(m: Magazine, i: number, cible: Cible): string | null {
  if (i <= 0) return null;
  const q = m.planches[i - 1];
  if (cible === "double") return q.mode === "double" && q.double ? q.double.templateId : null;
  return q.mode === "pages" && q[cible] ? q[cible].templateId : null;
}

export function composerDisposition(
  ids: readonly string[], portee: "page" | "double", cat: CatalogueRef, precedent: string | null, templateId: string | null,
  sources: ReadonlyMap<string, SourcePhoto>, anciens: readonly TexteCadre[], tA: Template | null,
): { disposition: Disposition | null; textesPerdus: number } {
  if (ids.length === 0) return { disposition: null, textesPerdus: anciens.filter(saisi).length };
  if (ids.length > maxDe(portee)) throw new Error(`composer : ${ids.length} photos pour une ${portee}`);
  const refs = ids.map((id) => refPour(cat, id));
  let t: Template | null = null;
  if (templateId) {
    const x = templateParId(templateId);
    if (x && x.portee === portee && x.nbPhotos === ids.length) t = x;
  }
  if (!t) t = gabaritsClasses(portee, refs, precedent)[0].template;
  const cs = cadresPhoto(t);
  const photos = ids.map((id, i) => {
    const src = sources.get(id);
    return { photoId: id, recadrage: src ? reporterRecadrage(src.r, refs[i], src.cadre, { l: cs[i].l, h: cs[i].h }) : neutre() };
  });
  const { textes, perdus } = reporterTextes(anciens, tA, t);
  return { disposition: { templateId: t.id, photos, textes }, textesPerdus: perdus };
}

export function remplacerPlanche(m: Magazine, i: number, p: Planche): Magazine {
  if (m.planches[i] === p) return m;
  const planches = m.planches.slice();
  planches[i] = p;
  return { ...m, planches };
}

export const avecDispo = (p: Planche, cible: Cible, d: Disposition | null): Planche => (cible === "double"
  ? { ...p, mode: "double", double: d, gauche: null, droite: null }
  : { ...p, mode: "pages", double: null, [cible]: d });

export type OptionsComposer = { templateId?: string | null; sources?: ReadonlyMap<string, SourcePhoto> };

/**
 * Reconstruit la disposition d'une cible avec `ids` dans cet ordre : gabarit imposé ou le meilleur de la note,
 * photo i → cadre i, recadrages reportés, textes reportés. `ids` vide → null. Une cible « double » sur une
 * planche en pages la fait passer en double (fusion) ; une cible page sur une double est refusée (perte).
 */
export function composer(
  m: Magazine, plancheId: string, cible: Cible, ids: readonly string[], cat: CatalogueRef, opts?: OptionsComposer,
): { magazine: Magazine; textesPerdus: number } {
  const o = opts ?? {};
  const i = indexPlanche(m, plancheId);
  if (i < 0 || !CIBLES.includes(cible)) return { magazine: m, textesPerdus: 0 };
  const p = m.planches[i];
  if (cible !== "double" && p.mode === "double") return { magazine: m, textesPerdus: 0 };
  if (i === 0 && cible !== "droite") return { magazine: m, textesPerdus: 0 };
  const ancienne = dispositionDe(p, cible);
  const tA = ancienne ? templateParId(ancienne.templateId) : null;
  const sources = sourcesDe(p);
  if (o.sources) for (const [k, v] of o.sources) if (!sources.has(k)) sources.set(k, v);
  const r = composerDisposition(ids, porteeDe(cible), cat, precedentDe(m, i, cible), o.templateId ?? null,
    sources, ancienne ? ancienne.textes : [], tA);
  /* Pages → double : les textes saisis sur les deux pages ne passent pas dans le gabarit double, ils sont perdus
     ET comptés (I18). Latent tant qu'aucun gabarit de page n'avait de texte ; les épingles du 29/10 en ont. */
  const pagesPerdues = cible === "double" && p.mode === "pages"
    ? [p.gauche, p.droite].reduce((n, d) => n + (d ? d.textes.filter(saisi).length : 0), 0) : 0;
  return { magazine: remplacerPlanche(m, i, avecDispo(p, cible, r.disposition)), textesPerdus: r.textesPerdus + pagesPerdues };
}

/* ─────────────────────────── 9 à 21. Les opérations ─────────────────────────── */

export const issue = (magazine: Magazine, refus: Refus | null, extra?: Partial<Issue>): Issue => ({
  magazine, restees: [], textesPerdus: 0, refus, dejaLa: 0, posees: [], ignorees: 0, ...(extra ?? {}),
});

/** La cible réelle d'un dépôt : planche 1 → droite ; planche en double → double. */
function cibleReelle(m: Magazine, i: number, cible: Cible): Cible {
  if (i === 0) return "droite";
  return m.planches[i].mode === "double" ? "double" : cible;
}

export type OptionsAjouter = { sources?: ReadonlyMap<string, SourcePhoto>; autorises?: ReadonlySet<string> };

/**
 * 9. Ajouter (T3, T5, T6, T7, T9) : n'évince jamais. Ids déjà sur la planche ignorés, ids inconnus du
 * catalogue ignorés (sauf `opts.autorises`), insertion à `position` ou à la fin, surplus dans `restees`.
 */
export function ajouter(
  m: Magazine, plancheId: string, cible: Cible, ids: readonly string[], cat: CatalogueRef, position?: number, opts?: OptionsAjouter,
): Issue {
  const o = opts ?? {};
  const i = indexPlanche(m, plancheId);
  if (i < 0 || !Array.isArray(ids)) return issue(m, "rien");
  const c = cibleReelle(m, i, cible);
  if (!CIBLES.includes(c)) return issue(m, "rien");
  const p = m.planches[i];
  const fusion = c === "double" && p.mode === "pages";
  const existantes = fusion ? [...idsDispo(p.gauche), ...idsDispo(p.droite)] : idsDispo(dispositionDe(p, c));
  const surPlanche = new Set(idsPlanche(p));
  const vus = new Set<string>();
  const nouvelles: string[] = [];
  let dejaLa = 0, ignorees = 0;
  for (const id of ids) {
    if (typeof id !== "string" || !(cat.has(id) || o.autorises?.has(id))) { ignorees++; continue; }
    if (surPlanche.has(id) || vus.has(id)) { dejaLa++; continue; }
    vus.add(id);
    nouvelles.push(id);
  }
  if (nouvelles.length === 0) return issue(m, dejaLa > 0 ? "deja_la" : "rien", { dejaLa, ignorees });
  const place = maxDe(porteeDe(c)) - existantes.length;
  if (place <= 0) return issue(m, "pleine", { restees: nouvelles, dejaLa, ignorees });
  const posees = nouvelles.slice(0, place);
  const restees = nouvelles.slice(place);
  const pos = position !== undefined && Number.isFinite(position) ? borner(Math.trunc(position), 0, existantes.length) : existantes.length;
  const liste = [...existantes.slice(0, pos), ...posees, ...existantes.slice(pos)];
  const r = composer(m, plancheId, c, liste, cat, { sources: o.sources });
  return issue(r.magazine, null, { restees, textesPerdus: r.textesPerdus, dejaLa, ignorees, posees });
}

/** 10. Retirer : la cible se recompose à n − 1 (meilleur gabarit), null à 0. */
export function retirer(m: Magazine, ref: RefCadre, cat: CatalogueRef): Issue {
  const a = affectation(m, ref);
  if (!a || !a.photoId) return issue(m, "rien");
  const p = plancheDe(m, ref.plancheId);
  const d = p ? dispositionDe(p, ref.cible) : null;
  if (!d) return issue(m, "rien");
  const liste = d.photos.flatMap((x, k) => (k === ref.index || !x.photoId ? [] : [x.photoId]));
  const r = composer(m, ref.plancheId, ref.cible, liste, cat);
  return issue(r.magazine, null, { textesPerdus: r.textesPerdus, retiree: a.photoId });
}

function poserAffectation(m: Magazine, ref: RefCadre, aff: Disposition["photos"][number]): Magazine {
  const i = indexPlanche(m, ref.plancheId);
  const p = m.planches[i];
  const d = dispositionDe(p, ref.cible);
  if (!d) return m;
  const photos = d.photos.slice();
  photos[ref.index] = aff;
  return remplacerPlanche(m, i, avecDispo(p, ref.cible, { ...d, photos }));
}

const dimsDeRef = (m: Magazine, ref: RefCadre): Dims | null => {
  const p = plancheDe(m, ref.plancheId);
  return p ? dimsCadre(dispositionDe(p, ref.cible), ref.index) : null;
};

/** 12. Échanger deux photos posées ; gabarits inchangés ; recadrages reportés. Refus si doublon sur une planche (I9). */
export function echangerIssue(m: Magazine, a: RefCadre, b: RefCadre, cat: CatalogueRef): Issue {
  const fa = affectation(m, a), fb = affectation(m, b);
  if (!fa || !fb || !fa.photoId || !fb.photoId) return issue(m, "rien");
  if (a.plancheId === b.plancheId && a.cible === b.cible && a.index === b.index) return issue(m, "rien");
  if (fa.photoId === fb.photoId) return issue(m, "rien");
  if (a.plancheId !== b.plancheId) {
    const pa = plancheDe(m, a.plancheId), pb = plancheDe(m, b.plancheId);
    if (!pa || !pb) return issue(m, "rien");
    if (idsPlanche(pa).includes(fb.photoId) || idsPlanche(pb).includes(fa.photoId)) return issue(m, "deja_la");
  }
  const ca = dimsDeRef(m, a);
  const cb = dimsDeRef(m, b);
  const nA = { photoId: fb.photoId, recadrage: reporterRecadrage(fb.recadrage, refPour(cat, fb.photoId), cb, ca) };
  const nB = { photoId: fa.photoId, recadrage: reporterRecadrage(fa.recadrage, refPour(cat, fa.photoId), ca, cb) };
  return issue(poserAffectation(poserAffectation(m, a, nA), b, nB), null);
}
export const echanger = (m: Magazine, a: RefCadre, b: RefCadre, cat: CatalogueRef): Magazine => echangerIssue(m, a, b, cat).magazine;

/** 11. Remplacer (T17) : même gabarit, recadrage neutre ; déjà sur la planche → échange (T3). */
export function remplacer(m: Magazine, ref: RefCadre, photoId: string, cat: CatalogueRef): Issue {
  const a = affectation(m, ref);
  if (!a || !a.photoId || typeof photoId !== "string" || !cat.has(photoId) || a.photoId === photoId) return issue(m, "rien");
  const p = plancheDe(m, ref.plancheId);
  const autre = p ? photosDe(p).find((x) => x.photoId === photoId) : undefined;
  if (autre) {
    const r = echangerIssue(m, ref, autre.ref, cat);
    return issue(r.magazine, r.refus, { echange: true });
  }
  return issue(poserAffectation(m, ref, { photoId, recadrage: neutre() }), null, { posees: [photoId], retiree: a.photoId });
}

/** 14. Réordonner dans la même disposition ; gabarit gardé ; recadrages reportés. */
export function reordonner(m: Magazine, plancheId: string, cible: Cible, de: number, vers: number, cat: CatalogueRef): Magazine {
  const i = indexPlanche(m, plancheId);
  if (i < 0) return m;
  const p = m.planches[i];
  const d = dispositionDe(p, cible);
  if (!d) return m;
  const n = d.photos.length;
  if (!estEntier(de) || !estEntier(vers) || de < 0 || vers < 0 || de >= n || vers >= n || de === vers) return m;
  const t = templateParId(d.templateId);
  if (!t) return m;
  const ordre = d.photos.map((a, k) => ({ a, k }));
  const [x] = ordre.splice(de, 1);
  ordre.splice(vers, 0, x);
  const cs = cadresPhoto(t);
  const photos = ordre.map(({ a, k }, j) => ({
    photoId: a.photoId,
    recadrage: a.photoId ? reporterRecadrage(a.recadrage, refPour(cat, a.photoId), cs[k], cs[j]) : neutre(),
  }));
  return remplacerPlanche(m, i, avecDispo(p, cible, { ...d, photos }));
}

/** 13. Déplacer : retirer puis ajouter, atomique (refus = même magazine). Même cible : réordonner si position. */
export function deplacerPhoto(
  m: Magazine, de: RefCadre, vers: { plancheId: string; cible: Cible; position?: number } | null | undefined, cat: CatalogueRef,
): Issue {
  const a = affectation(m, de);
  if (!a || !a.photoId || !vers) return issue(m, "rien");
  const iv = indexPlanche(m, vers.plancheId);
  if (iv < 0) return issue(m, "rien");
  const c = cibleReelle(m, iv, vers.cible);
  if (!CIBLES.includes(c)) return issue(m, "rien");
  if (vers.plancheId === de.plancheId) {
    if (c === de.cible) {
      if (vers.position === undefined || !Number.isFinite(vers.position)) return issue(m, "rien");
      const g = Math.trunc(vers.position);
      const v = g > de.index ? g - 1 : g;
      const pd = plancheDe(m, de.plancheId);
      const dd = pd ? dispositionDe(pd, de.cible) : null;
      const n = dd ? dd.photos.length : 0;
      const m2 = reordonner(m, de.plancheId, de.cible, de.index, borner(v, 0, n - 1), cat);
      return issue(m2, m2 === m ? "rien" : null);
    }
    if (c === "double") return issue(m, "rien");
  }
  const photoId = a.photoId;
  const pd = plancheDe(m, de.plancheId);
  const src = new Map<string, SourcePhoto>([[photoId, { r: a.recadrage, cadre: pd ? dimsCadre(dispositionDe(pd, de.cible), de.index) : null }]]);
  const r1 = retirer(m, de, cat);
  const r2 = ajouter(r1.magazine, vers.plancheId, c, [photoId], cat, vers.position, { sources: src, autorises: new Set([photoId]) });
  if (r2.refus || r2.posees.length === 0) return issue(m, r2.refus ?? "pleine");
  return issue(r2.magazine, null, { textesPerdus: r1.textesPerdus + r2.textesPerdus });
}

/** 15. Choisir un gabarit de même nombre et même portée : photos et ordre gardés. */
export function choisirGabarit(m: Magazine, plancheId: string, cible: Cible, templateId: string, cat: CatalogueRef): Issue {
  const i = indexPlanche(m, plancheId);
  if (i < 0) return issue(m, "rien");
  const d = dispositionDe(m.planches[i], cible);
  const t = templateParId(templateId);
  const ids = idsDispo(d);
  if (!d || !t || t.portee !== porteeDe(cible) || t.nbPhotos !== ids.length || t.id === d.templateId) return issue(m, "rien");
  const r = composer(m, plancheId, cible, ids, cat, { templateId });
  return issue(r.magazine, null, { textesPerdus: r.textesPerdus });
}

/** 16. Le suivant (ou précédent) dans `gabaritsClasses`, en boucle. */
export function autreGabarit(m: Magazine, plancheId: string, cible: Cible, sens: 1 | -1, cat: CatalogueRef): Issue {
  const i = indexPlanche(m, plancheId);
  if (i < 0) return issue(m, "rien");
  const d = dispositionDe(m.planches[i], cible);
  if (!d) return issue(m, "rien");
  const ids = idsDispo(d);
  const liste = gabaritsClasses(porteeDe(cible), ids.map((id) => refPour(cat, id)), precedentDe(m, i, cible));
  if (liste.length < 2) return issue(m, "rien");
  const k = liste.findIndex((x) => x.template.id === d.templateId);
  const s = sens === -1 ? -1 : 1;
  const suivant = k < 0 ? liste[0].template : liste[(k + s + liste.length) % liste.length].template;
  return choisirGabarit(m, plancheId, cible, suivant.id, cat);
}

/** 17. Pages → double, gauche puis droite. Jamais de surplus (6 + 6 = 12). */
export function fusionner(m: Magazine, plancheId: string, cat: CatalogueRef): Issue {
  const i = indexPlanche(m, plancheId);
  if (i <= 0 || m.planches[i].mode !== "pages") return issue(m, "rien");
  const p = m.planches[i];
  const r = composer(m, plancheId, "double", [...idsDispo(p.gauche), ...idsDispo(p.droite)], cat);
  return issue(r.magazine, null, { textesPerdus: r.textesPerdus });
}

/** 18. Double → pages : ceil(n/2) à gauche, le reste à droite (T26). */
export function separer(m: Magazine, plancheId: string, cat: CatalogueRef): Issue {
  const i = indexPlanche(m, plancheId);
  if (i <= 0 || m.planches[i].mode !== "double") return issue(m, "rien");
  const p = m.planches[i];
  const d = p.double;
  const ids = idsDispo(d);
  const g = Math.ceil(ids.length / 2);
  const sources = sourcesDe(p);
  const tA = d ? templateParId(d.templateId) : null;
  const gauche = composerDisposition(ids.slice(0, g), "page", cat, precedentDe(m, i, "gauche"), null, sources, d ? d.textes : [], tA);
  const droite = composerDisposition(ids.slice(g), "page", cat, precedentDe(m, i, "droite"), null, sources, [], null);
  const q: Planche = { ...p, mode: "pages", double: null, gauche: gauche.disposition, droite: droite.disposition };
  return issue(remplacerPlanche(m, i, q), null, { textesPerdus: gauche.textesPerdus + droite.textesPerdus });
}

/** La règle d'ids du vrai code (`prochainId`) : pl-(max + 1). */
export function prochainId(m: Magazine): string {
  const max = m.planches.reduce((acc, p) => {
    const k = /^pl-(\d+)$/.exec(p.id);
    return k ? Math.max(acc, Number(k[1])) : acc;
  }, 0);
  return `pl-${max + 1}`;
}

/** 19. Une planche « pages » vide juste après. `idImpose` (unique) prime sur `prochainId`. */
export function insererDouble(m: Magazine, apresPlancheId: string, idImpose?: string): { magazine: Magazine; plancheId: string | null } {
  const i = indexPlanche(m, apresPlancheId);
  if (i < 0) return { magazine: m, plancheId: null };
  const id = idImpose && indexPlanche(m, idImpose) < 0 ? idImpose : prochainId(m);
  const planches = m.planches.slice();
  planches.splice(i + 1, 0, { id, mode: "pages", double: null, gauche: null, droite: null });
  return { magazine: { ...m, planches }, plancheId: id };
}

/** 20. Réordonner les planches ; la planche 1 ne bouge pas, rien ne passe devant elle. */
export function deplacerPlanche(m: Magazine, plancheId: string, versIndex: number): Magazine {
  const i = indexPlanche(m, plancheId);
  if (i <= 0 || !Number.isFinite(versIndex)) return m;
  const v = borner(Math.trunc(versIndex), 1, m.planches.length - 1);
  if (v === i) return m;
  const planches = m.planches.slice();
  const [p] = planches.splice(i, 1);
  planches.splice(v, 0, p);
  return { ...m, planches };
}

/** La planche est-elle pleine ? (planche 1 : sa seule page droite). */
export function estPleine(p: Planche, index: number): boolean {
  const n = (d: Disposition | null) => idsDispo(d).length;
  if (index === 0) return n(p.droite) >= MAX_PHOTOS_PAGE;
  if (p.mode === "double") return n(p.double) >= MAX_PHOTOS_DOUBLE;
  return n(p.gauche) >= MAX_PHOTOS_PAGE && n(p.droite) >= MAX_PHOTOS_PAGE;
}

/** T12 : la cible d'un dépôt sur une vignette ; null si la planche est pleine. */
export function cibleSurPlanche(m: Magazine, plancheId: string): Cible | null {
  const i = indexPlanche(m, plancheId);
  if (i < 0) return null;
  const p = m.planches[i];
  if (estPleine(p, i)) return null;
  if (i === 0) return "droite";
  if (p.mode === "double") return "double";
  return idsDispo(p.gauche).length <= idsDispo(p.droite).length ? "gauche" : "droite";
}

/** 21. Ajouter sur une planche du chemin de fer (T12). */
export function ajouterSurPlanche(m: Magazine, plancheId: string, ids: readonly string[], cat: CatalogueRef): Issue {
  if (indexPlanche(m, plancheId) < 0) return issue(m, "rien");
  const c = cibleSurPlanche(m, plancheId);
  if (!c) return issue(m, "pleine", { restees: Array.isArray(ids) ? ids.filter((id) => cat.has(id)) : [] });
  return ajouter(m, plancheId, c, ids, cat);
}

/** Vider sans effet si déjà vide (le vrai `vider` rend toujours un nouvel objet). */
export function vider(m: Magazine, plancheId: string): Magazine {
  const p = plancheDe(m, plancheId);
  if (!p || (!p.double && !p.gauche && !p.droite)) return m;
  return viderMagazine(m, plancheId);
}
export function supprimerPlanche(m: Magazine, plancheId: string): Magazine {
  const i = indexPlanche(m, plancheId);
  if (i < 0) return m;
  if (i === 0) return vider(m, plancheId);
  return supprimerPlancheMagazine(m, plancheId);
}

/** Recadrage borné (jamais de blanc), sans effet si identique. */
export function recadrerCadre(m: Magazine, ref: RefCadre, r: Recadrage | null | undefined, cat: CatalogueRef): Magazine {
  const a = affectation(m, ref);
  if (!a || !a.photoId || !r) return m;
  const cadre = dimsDeRef(m, ref) ?? { l: 1, h: 1 };
  const c = cadrer(refPour(cat, a.photoId), cadre, {
    zoom: Number.isFinite(r.zoom) ? r.zoom : ZOOM_MIN, dx: Number.isFinite(r.dx) ? r.dx : 0, dy: Number.isFinite(r.dy) ? r.dy : 0,
  });
  const b = { zoom: c.zoom, dx: c.dx, dy: c.dy };
  if (egal(b, a.recadrage)) return m;
  return recadrerMagazine(m, ref, b);
}

/** Écrire un texte ; vide = le libellé revient (T29). */
export function ecrireTexteCadre(m: Magazine, ref: RefCadre, contenu: string): Magazine {
  const t = texteDe(m, ref);
  if (!t || typeof contenu !== "string") return m;
  const p = plancheDe(m, ref.plancheId);
  const d = p ? dispositionDe(p, ref.cible) : null;
  const tpl = d ? templateParId(d.templateId) : null;
  const cadre = tpl ? cadresTexte(tpl)[ref.index] : undefined;
  if (!cadre) return m;
  const v = contenu === "" ? LIBELLE[cadre.role] : contenu;
  if (v === t.contenu) return m;
  return ecrireTexteMagazine(m, ref, { contenu: v });
}

/* ─────────────────────────── 22. Mesures diverses ─────────────────────────── */

export function photosIndisponibles(m: Magazine, cat: CatalogueRef): string[] {
  return [...new Set(idsMagazine(m).filter((id) => !cat.has(id)))];
}
export const dpi = (photo: Dims, cadre: Dims, r?: Recadrage | null): number => 25.4 / cadrer(photo, cadre, r ?? neutre()).echelle;
export const pagesDe = (m: Magazine): number => 1 + 2 * (m.planches.length - 1);
