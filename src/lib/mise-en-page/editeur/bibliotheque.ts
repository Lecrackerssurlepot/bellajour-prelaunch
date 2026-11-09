/**
 * La bibliothèque : filtres, tri, groupes, sélection. Tout se lit sur l'état, rien ne s'écrit ici.
 * Chaque critère est isolé : il sert au filtrage ET à « Voir » (T16, retrouver une photo retirée).
 */

import { comparerChrono, utilisations } from "../magazine";
import { orientationDe } from "../types";
import { idsPlanche, plancheDe } from "./outils";
import { rangementDe } from "./moments";
import { dansVue, estTour, marqueDe, triDe, type Marque } from "./tri";
import { sousPiles } from "./mesures";
import type { Catalogue, EtatEditeur, Filtres, GroupeBibliotheque, PhotoMaq, TypeDossier } from "./types";

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
  const mq = new Map<string, Marque>();
  for (const [l, k] of [[t.coupsDeCoeur, "coupDeCoeur"], [t.choisies, "choisie"], [t.reserve, "reserve"], [t.ecartees, "ecartee"]] as const) for (const id of l) mq.set(id, k);
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
    marque: (ph) => dansVue(mq.get(ph.id) ?? null, f.marque),
    etiquette: (ph) => !f.etiquette || f.marque !== "choisies" || t.etiquettes[f.etiquette].includes(ph.id),
  };
}

const CLES_CRITERES: readonly CleCritere[] = ["recherche", "statut", "personnes", "types", "coeur", "orientations", "montrerSignalees", "masquerUtilisees", "marque", "etiquette"];
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

function cleGroupe(groupe: Filtres["groupe"], ph: PhotoMaq, cat?: Catalogue): string {
  if ((groupe === "moment" || groupe === "lieu") && cat) return rangementDe(cat, groupe, ph.id).cle;
  if (groupe === "jour") return ph.date ? ph.date.slice(0, 10) : "~";
  if (groupe === "personne") return ph.personne;
  if (groupe === "type") return String(ORDRE_TYPES.indexOf(ph.type));
  return "";
}
function libelleGroupe(groupe: Filtres["groupe"], cle: string, ph: PhotoMaq, cat?: Catalogue): string {
  if ((groupe === "moment" || groupe === "lieu") && cat) return rangementDe(cat, groupe, ph.id).libelle;
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
  const passent = [...e.catalogue.values()].filter((ph) => CLES_CRITERES.every((k) => c[k](ph)));
  const photos = horsPiles(e, passent);
  const cmp = comparateur(e.filtres.tri);
  const g = e.filtres.groupe;
  const parCle = new Map<string, PhotoMaq[]>();
  for (const ph of photos) {
    const k = cleGroupe(g, ph, e.catalogue);
    const l = parCle.get(k);
    if (l) l.push(ph); else parCle.set(k, [ph]);
  }
  const cles = [...parCle.keys()].sort((a, b) => (g === "personne" ? a.localeCompare(b, "fr") : a < b ? -1 : a > b ? 1 : 0));
  /* dans un tour, les photos déjà posées passent après les autres de leur groupe : rien n'est caché, tout est rangé (05/11) */
  const u = estTour(e.filtres.marque) ? utilisations(e.magazine) : null;
  const rang = (ph: PhotoMaq) => (u?.has(ph.id) ? 1 : 0);
  return cles.map((k) => {
    const liste = (parCle.get(k) ?? []).sort((a, b) => rang(a) - rang(b) || cmp(a, b));
    return { cle: k, libelle: libelleGroupe(g, k, liste[0], e.catalogue), ids: liste.map((ph) => ph.id) };
  });
}
export const visibles = (e: EtatEditeur): string[] => groupes(e).flatMap((g) => g.ids);

/** R77 (couche 1, 09/11) : une photo rangée sous une pile se cache derrière sa tête, sauf si la pile est ouverte, si la
 *  tête ne passe pas les filtres (rien ne disparaît sans sa tête), ou si l'atelier l'a déjà jugée ou posée. */
function horsPiles(e: EtatEditeur, passent: PhotoMaq[]): PhotoMaq[] {
  if (!e.lecture.piles.length) return passent;
  const sous = sousPiles(e.lecture);
  const ici = new Set(passent.map((p) => p.id));
  const ouvertes = new Set(e.pilesOuvertes);
  const u = utilisations(e.magazine);
  return passent.filter((p) => {
    const tete = sous.get(p.id);
    if (!tete || ouvertes.has(tete) || !ici.has(tete)) return true;
    return marqueDe(e.magazine, p.id) !== null || u.has(p.id);
  });
}

/** La colonne « à côté » d'un tour (05/11) : les photos qui passent tous les autres filtres mais ne sont pas en jeu,
 *  dans l'ordre du temps. Vide hors des tours. */
export function aCote(e: EtatEditeur): string[] {
  if (!estTour(e.filtres.marque)) return [];
  const c = criteres(e);
  return [...e.catalogue.values()]
    .filter((ph) => !c.marque(ph) && CLES_CRITERES.every((k) => k === "marque" || k === "etiquette" || c[k](ph)))
    .sort(comparerChrono).map((ph) => ph.id);
}

/** La colonne « à côté » rangée par jour, avec les mêmes intertitres que la grille (06/11). */
export function aCoteParJour(e: EtatEditeur): GroupeBibliotheque[] {
  const out: GroupeBibliotheque[] = [];
  for (const id of aCote(e)) {
    const ph = e.catalogue.get(id);
    if (!ph) continue;
    const k = cleGroupe("jour", ph);
    const g = out[out.length - 1];
    if (g && g.cle === k) g.ids.push(id); else out.push({ cle: k, libelle: libelleGroupe("jour", k, ph), ids: [id] });
  }
  return out;
}

/** « 12 août · 14:32 » (ou « Sans date ») : ce qu'on lit au survol d'une photo mise de côté. */
export function quandPhoto(ph: { date: string | null }): string {
  if (!ph.date) return "Sans date";
  const jour = libelleGroupe("jour", ph.date.slice(0, 10), ph as PhotoMaq);
  const h = /[T ](\d{2}:\d{2})/.exec(ph.date)?.[1];
  return h ? `${jour} · ${h}` : jour;
}

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
