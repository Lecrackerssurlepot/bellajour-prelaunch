/**
 * Les réglages d'écran et les petits outils partagés par tout l'éditeur.
 * Pas des données métier : des seuils de confort (tolérance, dpi, taille de l'historique).
 */

import { MAX_PHOTOS_DOUBLE, MAX_PHOTOS_PAGE } from "../grilles";
import type { Cadre, Portee, RoleCadre, Template } from "../types";
import type { Cible, Disposition, Magazine, Planche, RefCadre, TexteCadre } from "../magazine";
import { dispositionDe, templateParId } from "../magazine";
import type { Recadrage } from "../recadrage";
import type { Filtres } from "./types";

export const PENALITE_REPETITION = 0.25;
export const BONUS_ANNEXE = 0.05;
export const TOLERANCE_RAPPORT = 1.15;
export const SEUIL_DPI = 200;
export const HISTORIQUE_MAX = 200;

export type RoleTexte = Exclude<RoleCadre, "photo">;
export const LIBELLE: Readonly<Record<RoleTexte, string>> = { titre: "Titre", texte: "Texte", legende: "Légende" };
export const TAILLE_DEFAUT: Readonly<Record<RoleTexte, number>> = { titre: 16, texte: 10, legende: 7 };
const LIBELLES = new Set<string>(Object.values(LIBELLE));
export const CIBLES: readonly Cible[] = ["gauche", "droite", "double"];

export const FILTRES_DEFAUT: Readonly<Filtres> = Object.freeze({
  recherche: "", statut: "toutes", personnes: [], types: [], coeur: false, orientations: [],
  montrerSignalees: false, masquerUtilisees: false, tri: "date", groupe: "jour", taille: "M",
} satisfies Filtres);

/* ─────────────────────────── Petits outils ─────────────────────────── */

export const neutre = (): Recadrage => ({ zoom: 1, dx: 0, dy: 0 });
export const estNeutre = (r: Recadrage): boolean => r.zoom === 1 && r.dx === 0 && r.dy === 0;
/** Un texte est « saisi » dès qu'il n'est plus le libellé d'origine. */
export const saisi = (t: TexteCadre): boolean => !LIBELLES.has(t.contenu);
export const porteeDe = (cible: Cible): Portee => (cible === "double" ? "double" : "page");
export const maxDe = (portee: Portee): number => (portee === "page" ? MAX_PHOTOS_PAGE : MAX_PHOTOS_DOUBLE);
export const cadresPhoto = (t: Template): Cadre[] => t.cadres.filter((c) => c.role === "photo");
export const cadresTexte = (t: Template): (Cadre & { role: RoleTexte })[] =>
  t.cadres.filter((c): c is Cadre & { role: RoleTexte } => c.role !== "photo");
export const textesInitiaux = (t: Template): TexteCadre[] => cadresTexte(t).map((c) => ({
  contenu: LIBELLE[c.role], taille: c.taille ?? TAILLE_DEFAUT[c.role], gras: c.gras ?? c.role === "titre",
}));
export const estEntier = (v: unknown): v is number => Number.isInteger(v);
export const borner = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
export const pluriel = (n: number, s: string, p: string): string => `${n} ${n > 1 ? p : s}`;

/** Égalité profonde (objets, tableaux, Map, NaN) : sert aux « sans effet » et aux invariants. */
export function egal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b);
  }
  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map && b instanceof Map) || a.size !== b.size) return false;
    for (const [k, v] of a) if (!b.has(k) || !egal(v, b.get(k))) return false;
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => egal(x, b[i]));
  const oa = a as Record<string, unknown>, ob = b as Record<string, unknown>;
  const ka = Object.keys(oa), kb = Object.keys(ob);
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(ob, k) && egal(oa[k], ob[k]));
}

/* ─────────────────────────── Lecture d'une planche ─────────────────────────── */

export type PhotoLue = { ref: RefCadre; photoId: string | null };

/** L'ordre de lecture : la double, ou gauche puis droite ; un élément par cadre photo. */
export function photosDe(p: Planche): PhotoLue[] {
  const out: PhotoLue[] = [];
  const pousser = (d: Disposition | null, cible: Cible) => {
    if (d) d.photos.forEach((a, index) => out.push({ ref: { plancheId: p.id, cible, index }, photoId: a.photoId }));
  };
  if (p.mode === "double") pousser(p.double, "double");
  else { pousser(p.gauche, "gauche"); pousser(p.droite, "droite"); }
  return out;
}
export const idsDispo = (d: Disposition | null): string[] => (d ? d.photos.flatMap((a) => (a.photoId ? [a.photoId] : [])) : []);
export const idsPlanche = (p: Planche): string[] => photosDe(p).flatMap((x) => (x.photoId ? [x.photoId] : []));
export const indexPlanche = (m: Magazine, id: string): number => m.planches.findIndex((p) => p.id === id);
export const plancheDe = (m: Magazine, id: string): Planche | null => m.planches.find((p) => p.id === id) ?? null;

/** Tous les ids posés du magazine, en multiset (avec répétitions). */
export function idsMagazine(m: Magazine): string[] {
  const out: string[] = [];
  for (const p of m.planches) for (const d of [p.double, p.gauche, p.droite]) out.push(...idsDispo(d));
  return out;
}

/** La disposition d'une planche, ou null : jamais d'exception sur un id périmé. */
export const dispositionOuNull = (m: Magazine, ref: RefCadre): Disposition | null => {
  if (!ref || !CIBLES.includes(ref.cible)) return null;
  const p = plancheDe(m, ref.plancheId);
  return p ? dispositionDe(p, ref.cible) : null;
};

/** L'affectation visée par une référence, ou null. */
export function affectation(m: Magazine, ref: RefCadre | null | undefined): Disposition["photos"][number] | null {
  if (!ref || !estEntier(ref.index)) return null;
  const d = dispositionOuNull(m, ref);
  return d?.photos[ref.index] ?? null;
}
export const aPhoto = (m: Magazine, ref: RefCadre | null | undefined): boolean => !!affectation(m, ref)?.photoId;

export function texteDe(m: Magazine, ref: RefCadre | null | undefined): TexteCadre | null {
  if (!ref || !estEntier(ref.index)) return null;
  const d = dispositionOuNull(m, ref);
  return d?.textes[ref.index] ?? null;
}

/** Mesures {l, h} du cadre photo n° index d'une disposition. */
export function dimsCadre(d: Disposition | null, index: number): { l: number; h: number } | null {
  const t = d ? templateParId(d.templateId) : null;
  const c = t ? cadresPhoto(t)[index] : undefined;
  return c ? { l: c.l, h: c.h } : null;
}
