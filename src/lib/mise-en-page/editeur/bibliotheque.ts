/**
 * La bibliothèque : filtres, tri, groupes, sélection. Tout se lit sur l'état, rien ne s'écrit ici.
 * Chaque critère est isolé : il sert au filtrage ET à « Voir » (T16, retrouver une photo retirée).
 */

import { comparerChrono, utilisations } from "../magazine";
import { orientationDe } from "../types";
import { idsPlanche, plancheDe } from "./outils";
import { triDe } from "./tri";
import type { EtatEditeur, Filtres, GroupeBibliotheque, PhotoMaq, TypeDossier } from "./types";

const sansAccent = (s: string): string => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const ORDRE_TYPES: readonly TypeDossier[] = ["lien", "responsable", "atelier"];
const LIBELLE_TYPE: Readonly<Record<TypeDossier, string>> = { lien: "Liens d'équipe", responsable: "Le responsable", atelier: "Atelier" };
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export type CleCritere = Exclude<keyof Filtres, "tri" | "groupe" | "taille">;
export type Criteres = Record<CleCritere, (ph: PhotoMaq) => boolean>;

/** Chaque critère, isolé : sert au filtrage et à « Voir » (T16). */
export function criteres(e: EtatEditeur): Criteres {
  const f = e.filtres;
  const u = utilisations(e.magazine);
  const p = plancheDe(e.magazine, e.plancheCourante);
  const surPlanche = new Set(p ? idsPlanche(p) : []);
  const q = sansAccent(f.recherche.trim());
  const t = triDe(e.magazine);
  const ch = new Set(t.choisies), ec = new Set(t.ecartees);
  return {
    recherche: (ph) => !q || sansAccent(ph.nom).includes(q),
    statut: (ph) => f.statut === "toutes" || (f.statut === "libres" && !u.has(ph.id))
      || (f.statut === "utilisees" && u.has(ph.id)) || (f.statut === "planche" && surPlanche.has(ph.id)),
    personnes: (ph) => f.personnes.length === 0 || f.personnes.includes(ph.personne),
    types: (ph) => f.types.length === 0 || f.types.includes(ph.type),
    coeur: (ph) => !f.coeur || ph.coeur,
    orientations: (ph) => f.orientations.length === 0 || f.orientations.includes(orientationDe(ph.l, ph.h)),
    montrerSignalees: (ph) => f.montrerSignalees || !ph.signalee,
    masquerUtilisees: (ph) => !f.masquerUtilisees || !u.has(ph.id),
    marque: (ph) => f.marque === "choisies" ? ch.has(ph.id) : f.marque === "ecartees" ? ec.has(ph.id)
      : f.marque === "a_trier" ? !ch.has(ph.id) && !ec.has(ph.id) : !ec.has(ph.id),
  };
}

const CLES_CRITERES: readonly CleCritere[] = ["recherche", "statut", "personnes", "types", "coeur", "orientations", "montrerSignalees", "masquerUtilisees", "marque"];
export const clesCriteres = (): readonly CleCritere[] => CLES_CRITERES;

/** La photo passe-t-elle tous les filtres ? */
export function passeLesFiltres(e: EtatEditeur, ph: PhotoMaq): boolean {
  const c = criteres(e);
  return CLES_CRITERES.every((k) => c[k](ph));
}

function comparateur(tri: Filtres["tri"]): (a: PhotoMaq, b: PhotoMaq) => number {
  if (tri === "nom") return (a, b) => (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (tri === "personne") return (a, b) => a.personne.localeCompare(b.personne, "fr") || comparerChrono(a, b);
  return comparerChrono;
}

function cleGroupe(groupe: Filtres["groupe"], ph: PhotoMaq): string {
  if (groupe === "jour") return ph.date ? ph.date.slice(0, 10) : "~";
  if (groupe === "personne") return ph.personne;
  if (groupe === "type") return String(ORDRE_TYPES.indexOf(ph.type));
  return "";
}
function libelleGroupe(groupe: Filtres["groupe"], cle: string, ph: PhotoMaq): string {
  if (groupe === "jour") {
    if (cle === "~") return "Sans date";
    const [, mo, j] = cle.split("-");
    return `${Number(j)} ${MOIS[Number(mo) - 1]}`;
  }
  if (groupe === "personne") return ph.personne;
  if (groupe === "type") return LIBELLE_TYPE[ph.type] || ph.type;
  return "Toutes";
}

/** Les groupes de la bibliothèque, dans l'ordre d'affichage. */
export function groupes(e: EtatEditeur): GroupeBibliotheque[] {
  const c = criteres(e);
  const photos = [...e.catalogue.values()].filter((ph) => CLES_CRITERES.every((k) => c[k](ph)));
  const cmp = comparateur(e.filtres.tri);
  const g = e.filtres.groupe;
  const parCle = new Map<string, PhotoMaq[]>();
  for (const ph of photos) {
    const k = cleGroupe(g, ph);
    const l = parCle.get(k);
    if (l) l.push(ph); else parCle.set(k, [ph]);
  }
  const cles = [...parCle.keys()].sort((a, b) => (g === "personne" ? a.localeCompare(b, "fr") : a < b ? -1 : a > b ? 1 : 0));
  return cles.map((k) => {
    const liste = (parCle.get(k) ?? []).sort(cmp);
    return { cle: k, libelle: libelleGroupe(g, k, liste[0]), ids: liste.map((ph) => ph.id) };
  });
}
export const visibles = (e: EtatEditeur): string[] => groupes(e).flatMap((g) => g.ids);

/**
 * La sélection dans l'ordre de la bibliothèque ; les photos masquées par les filtres
 * viennent après, dans l'ordre où elles ont été choisies.
 */
export function selectionOrdonnee(e: EtatEditeur): string[] {
  const ordre = new Map(visibles(e).map((id, i) => [id, i]));
  const rang = new Map(e.selection.ids.map((id, i) => [id, i]));
  return [...e.selection.ids].sort((a, b) => ((ordre.get(a) ?? 1e9) - (ordre.get(b) ?? 1e9)) || ((rang.get(a) ?? 0) - (rang.get(b) ?? 0)));
}

/** Les photos sélectionnées que les filtres cachent (elles restent dans la bande de sélection). */
export function selectionMasquee(e: EtatEditeur): string[] {
  if (!e.selection.ids.length) return [];
  const vis = new Set(visibles(e));
  return e.selection.ids.filter((id) => !vis.has(id));
}

/** Une photo précise passe-t-elle les filtres ? (halo après un retrait.) */
export function visible(e: EtatEditeur, id: string): boolean {
  const ph = e.catalogue.get(id);
  return ph ? passeLesFiltres(e, ph) : false;
}
