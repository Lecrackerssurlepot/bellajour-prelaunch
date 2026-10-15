/**
 * Les dossiers des photos d'une édition (T-152, maquette « Photos rangées en
 * dossiers ») : comme sur un ordinateur, à gauche de la page Photos.
 * Module PUR : aucun accès base, aucun réseau.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * UN DOSSIER, C'EST LE NOM SOUS LEQUEL LES PHOTOS ONT ÉTÉ DÉPOSÉES. Aucune
 * table : le responsable dépose sous un nom (« Mes photos » la première
 * fois, puis celui qu'il choisit ou qu'il tape), et ce nom EST le dossier.
 * Un sous-dossier s'écrit « Parent / Enfant » (UN niveau, décision de
 * Mathias du 14/10) : ranger un dossier dans un autre, c'est le renommer.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Trois groupes :
 * - « Déposées par vous » : les dossiers du responsable, et leurs sous-dossiers ;
 * - « Arrivées par les liens » : un dossier par lien de contribution (le lien
 *   général compris), une ligne par personne dedans (le filtre par personne) ;
 * - l'atelier, s'il a déposé.
 * Et deux vues en tête : « Toutes les photos », « Ma sélection ».
 */

import { GROUPE_GENERAL } from "./partage";
import { libellePlafondLien, type ReglagesPlafond } from "./plafonds";
import { TYPES_PROVENANCE } from "./types";

export const SEPARATEUR = " / ";
export const DOSSIER_RESPONSABLE = "Mes photos";
export const NOM_DOSSIER_MAX = 80;

export type LignePhoto = {
  provenance_id: string | null;
  provenance_type: string;
  role_deposant: string;
  deposant: string | null;
  appareil_id?: string | null;
  preselection?: boolean;
};

export type LienEdition = {
  id: string;
  cle: string;
  libelle: string | null;
  sans_plafond: boolean;
  plafond_par_personne: number | null;
  /** Supprimé (migration 20261018) : il ne reçoit plus rien, ses photos restent. */
  retire_le?: string | null;
};

export type Noeud = {
  /** `tout`, `selection`, `resp:<type>:<chemin>`, `lien:<id>`, `participants`, `pers:<id|general>:<nom>`, `atelier`. */
  cle: string;
  nom: string;
  n: number;
  enfants: Noeud[];
  /** Un dossier du responsable, ou le nom d'un lien. */
  renommable: boolean;
  /** Un dossier du responsable qui peut entrer dans un autre (il n'a pas de sous-dossier) ou en sortir. */
  deplacable: boolean;
  /** Peut recevoir un dossier (un dossier du responsable de premier niveau). */
  accueille: boolean;
};

export type Arbre = { vous: Noeud[]; liens: Noeud[]; atelier: Noeud | null };

type Edition = ReglagesPlafond & { responsable_nom: string | null };

/** Les photos du responsable déposées sous son propre nom (« Mes photos »). */
export function estPropre(deposant: string | null, responsable: string | null): boolean {
  return !deposant || deposant === responsable || deposant === "Le responsable";
}

/** Le chemin d'une photo du responsable : « Mes photos », « La soirée », « La soirée / Photobooth ».
 *  Une photo d'avant T-152 déposée sous un TYPE (photographe, autre…) prend son nom tel quel, et le
 *  nom du type seulement s'il n'en a pas (« Le photographe ») : plus de « Autre source · … ». */
export function cheminDe(l: LignePhoto, responsable: string | null): { type: string; brut: string; chemin: string } {
  const type = TYPES_PROVENANCE.some((t) => t.cle === l.provenance_type) ? l.provenance_type : "organisateur";
  const propre = estPropre(l.deposant, responsable);
  const brut = propre ? "" : (l.deposant as string);
  if (type === "organisateur") return { type, brut, chemin: propre ? DOSSIER_RESPONSABLE : brut };
  const libelle = TYPES_PROVENANCE.find((t) => t.cle === type)?.libelle ?? "Autre source";
  return { type, brut, chemin: propre ? libelle : brut };
}

const parent = (chemin: string) => (chemin.includes(SEPARATEUR) ? chemin.slice(0, chemin.indexOf(SEPARATEUR)) : null);
const feuille = (chemin: string) => (chemin.includes(SEPARATEUR) ? chemin.slice(chemin.indexOf(SEPARATEUR) + SEPARATEUR.length) : chemin);

/** La clé d'un dossier du responsable, à partir de son type et de son déposant tel qu'en base (vide : son propre nom). */
export const cleResp = (type: string, brut: string) => `resp:${type}:${brut}`;

/** L'arbre des dossiers. `avecLiensVides` : montrer aussi les liens qui n'ont rien reçu (le responsable, qui partage). */
export function arbreDesPhotos(lignes: readonly LignePhoto[], liens: readonly LienEdition[], edition: Edition, avecLiensVides: boolean): Arbre {
  const resp = edition.responsable_nom;
  /* ── « Déposées par vous » : un nœud par chemin de premier niveau, ses sous-dossiers dedans. ── */
  const hauts = new Map<string, Noeud>();
  const sous = new Map<string, Noeud>();
  const haut = (type: string, brut: string, nom: string) => {
    const cle = cleResp(type, brut);
    let n = hauts.get(cle);
    if (!n) {
      n = { cle, nom, n: 0, enfants: [], renommable: true, deplacable: true, accueille: type === "organisateur" };
      hauts.set(cle, n);
    }
    return n;
  };
  /* ── « Arrivées par les liens » ── */
  const parLien = new Map<string, Map<string, number>>();
  let atelier = 0;
  for (const l of lignes) {
    if (l.role_deposant === "responsable" && !l.provenance_id) {
      const c = cheminDe(l, resp);
      const p = c.type === "organisateur" ? parent(c.chemin) : null;
      if (p) {
        const brutParent = p === DOSSIER_RESPONSABLE ? "" : p;
        const h = haut("organisateur", brutParent, p);
        h.n++;
        const cleSous = cleResp("organisateur", c.brut);
        let s = sous.get(cleSous);
        if (!s) {
          s = { cle: cleSous, nom: feuille(c.chemin), n: 0, enfants: [], renommable: true, deplacable: true, accueille: false };
          sous.set(cleSous, s);
          h.enfants.push(s);
        }
        s.n++;
      } else {
        haut(c.type, c.brut, c.chemin).n++;
      }
    } else if (l.role_deposant === "participant" || l.provenance_id) {
      const id = l.provenance_id ?? "general";
      const m = parLien.get(id) ?? new Map<string, number>();
      const nom = l.deposant?.trim() || "Sans nom";
      m.set(nom, (m.get(nom) ?? 0) + 1);
      parLien.set(id, m);
    } else {
      atelier++;
    }
  }
  const vous = [...hauts.values()]
    .map((h) => ({ ...h, deplacable: h.enfants.length === 0, enfants: [...h.enfants].sort((a, b) => a.nom.localeCompare(b.nom, "fr")) }))
    .sort((a, b) => (a.nom === DOSSIER_RESPONSABLE ? -1 : b.nom === DOSSIER_RESPONSABLE ? 1 : a.nom.localeCompare(b.nom, "fr")));

  const personnes = (id: string, nomLien: string): Noeud[] => {
    const m = parLien.get(id);
    if (!m) return [];
    const l = [...m].map(([nom, n]) => ({ cle: `pers:${id}:${nom}`, nom, n, enfants: [], renommable: false, deplacable: false, accueille: false }));
    /* Une seule personne qui porte le nom du lien : rien à détailler. */
    return l.length === 1 && l[0].nom === nomLien ? [] : l.sort((a, b) => b.n - a.n || a.nom.localeCompare(b.nom, "fr"));
  };
  const total = (id: string) => [...(parLien.get(id)?.values() ?? [])].reduce((a, b) => a + b, 0);
  const noeudsLiens: Noeud[] = [];
  const general = total("general");
  if (general || avecLiensVides) {
    noeudsLiens.push({ cle: "participants", nom: GROUPE_GENERAL, n: general, enfants: personnes("general", GROUPE_GENERAL), renommable: false, deplacable: false, accueille: false });
  }
  for (const l of liens) {
    const n = total(l.id);
    if (!n && (l.retire_le || !avecLiensVides)) continue;
    const nom = l.libelle?.trim() || "Lien de contribution";
    noeudsLiens.push({ cle: `lien:${l.id}`, nom, n, enfants: personnes(l.id, nom), renommable: !l.retire_le, deplacable: false, accueille: false });
  }
  return {
    vous,
    liens: noeudsLiens,
    atelier: atelier ? { cle: "atelier", nom: "L'atelier", n: atelier, enfants: [], renommable: false, deplacable: false, accueille: false } : null,
  };
}

/** Cette photo est-elle dans ce dossier ? (La grille filtre l'édition entière par cette règle.) */
/** Les deux VUES d'ensemble de la page Photos (15/10) : on y voit des vignettes de dossiers ou de liens, pas une grille. */
export const VUES_ENSEMBLE = ["vous", "liens"] as const;
export const estVueEnsemble = (cle: string) => (VUES_ENSEMBLE as readonly string[]).includes(cle);

/** Le rayon d'une clé : l'onglet de la page Photos qui l'éclaire. */
export function rayonDe(cle: string): "tout" | "selection" | "vous" | "liens" | "atelier" {
  if (cle === "selection" || cle === "atelier" || cle === "vous" || cle === "liens") return cle;
  if (cle.startsWith("resp:")) return "vous";
  if (cle === "participants" || cle.startsWith("lien:") || cle.startsWith("pers:")) return "liens";
  return "tout";
}

export function dansLeDossier(l: LignePhoto, cle: string, responsable: string | null): boolean {
  if (cle === "tout") return true;
  if (cle === "selection") return Boolean(l.preselection);
  if (cle === "vous") return l.role_deposant === "responsable" && !l.provenance_id;
  if (cle === "liens") return l.role_deposant === "participant" || Boolean(l.provenance_id);
  if (cle === "atelier") return l.role_deposant !== "responsable" && l.role_deposant !== "participant" && !l.provenance_id;
  if (cle === "participants") return !l.provenance_id && l.role_deposant === "participant";
  if (cle.startsWith("lien:")) return l.provenance_id === cle.slice(5);
  if (cle.startsWith("pers:")) {
    const reste = cle.slice(5);
    const i = reste.indexOf(":");
    const id = reste.slice(0, i);
    const nom = reste.slice(i + 1);
    const lienOk = id === "general" ? !l.provenance_id && l.role_deposant === "participant" : l.provenance_id === id;
    return lienOk && (l.deposant?.trim() || "Sans nom") === nom;
  }
  const r = lireCleResp(cle);
  if (!r || l.role_deposant !== "responsable" || l.provenance_id) return false;
  const c = cheminDe(l, responsable);
  if (r.type !== "organisateur") return c.type === r.type && c.brut === r.brut;
  if (c.type !== "organisateur") return false;
  if (r.brut === "") return c.brut === "" || c.chemin.startsWith(DOSSIER_RESPONSABLE + SEPARATEUR);
  return c.brut === r.brut || c.brut.startsWith(r.brut + SEPARATEUR);
}

/** Relire la clé d'un dossier du responsable. */
export function lireCleResp(cle: unknown): { type: string; brut: string } | null {
  if (typeof cle !== "string" || cle.length > 400) return null;
  const m = /^resp:([a-z]+):([^]*)$/.exec(cle);
  if (!m || !TYPES_PROVENANCE.some((t) => t.cle === m[1])) return null;
  return { type: m[1], brut: m[2] };
}

/** Un nom de dossier : une ligne, sans « / » (il sépare un dossier de son sous-dossier), 80 caractères au plus. */
export function lireNomDossier(brut: unknown): { ok: true; nom: string } | { ok: false; message: string } {
  const nom = typeof brut === "string" ? brut.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\//g, "-").replace(/\s+/g, " ").trim() : "";
  if (!nom) return { ok: false, message: "Écrire un nom." };
  if (nom.length > NOM_DOSSIER_MAX) return { ok: false, message: `${NOM_DOSSIER_MAX} caractères au plus.` };
  return { ok: true, nom };
}

/** Le déposant à écrire pour un chemin (« Mes photos » redevient le nom du responsable). */
export function deposantPour(chemin: string, responsable: string | null): string {
  return chemin === DOSSIER_RESPONSABLE ? responsable || "Le responsable" : chemin;
}

export type Deplacement = { ok: true; avant: string; apres: string } | { ok: false; message: string };

/**
 * Ranger un dossier du responsable dans un autre (glisser-déposer), ou l'en
 * sortir (`dans` nul). UN niveau : un dossier qui a des sous-dossiers ne
 * s'emboîte pas, et un sous-dossier ne reçoit rien. Rend les chemins avant
 * et après ; l'écriture renomme les photos.
 */
export function planDeplacement(source: Noeud | undefined, dans: Noeud | null | undefined, arbre: Arbre): Deplacement {
  if (!source || !source.cle.startsWith("resp:")) return { ok: false, message: "Ce dossier ne se range pas." };
  const estSous = arbre.vous.some((h) => h.enfants.some((e) => e.cle === source.cle));
  const cheminSource = estSous
    ? `${arbre.vous.find((h) => h.enfants.some((e) => e.cle === source.cle))?.nom}${SEPARATEUR}${source.nom}`
    : source.nom;
  if (dans === null) {
    if (!estSous) return { ok: false, message: "Ce dossier est déjà au premier niveau." };
    return { ok: true, avant: cheminSource, apres: source.nom };
  }
  if (!dans || !dans.accueille) return { ok: false, message: "On ne range un dossier que dans un dossier de premier niveau." };
  if (dans.cle === source.cle) return { ok: false, message: "Un dossier ne se range pas dans lui-même." };
  if (source.enfants.length) return { ok: false, message: "Ce dossier contient déjà des dossiers : un seul niveau, il ne se range pas dans un autre." };
  return { ok: true, avant: cheminSource, apres: `${dans.nom}${SEPARATEUR}${source.nom}` };
}

/** Le plafond d'un lien, tel que la carte du lien le montre. */
export function plafondDuLien(l: Pick<LienEdition, "sans_plafond" | "plafond_par_personne">, edition: Edition): string {
  return libellePlafondLien(l, edition);
}

/**
 * Le chemin d'une photo après un renommage ou un rangement : la photo du
 * dossier lui-même prend le nouveau chemin, celle d'un de ses sous-dossiers
 * le garde sous le nouveau nom ; les autres ne bougent pas (`null`).
 */
export function nouveauChemin(cheminPhoto: string, avant: string, apres: string): string | null {
  if (cheminPhoto === avant) return apres;
  if (cheminPhoto.startsWith(avant + SEPARATEUR)) return apres + cheminPhoto.slice(avant.length);
  return null;
}

/** Le chemin complet d'un dossier de l'arbre (« La soirée / Photobooth » pour un sous-dossier). */
export function cheminDuNoeud(arbre: Arbre, cle: string): string | null {
  for (const h of arbre.vous) {
    if (h.cle === cle) return h.nom;
    const e = h.enfants.find((x) => x.cle === cle);
    if (e) return `${h.nom}${SEPARATEUR}${e.nom}`;
  }
  return null;
}

/** Trouver un nœud de l'arbre par sa clé, à tous les niveaux. */
export function noeudDe(arbre: Arbre, cle: string): Noeud | undefined {
  for (const n of [...arbre.vous, ...arbre.liens, ...(arbre.atelier ? [arbre.atelier] : [])]) {
    if (n.cle === cle) return n;
    const e = n.enfants.find((x) => x.cle === cle);
    if (e) return e;
  }
  return undefined;
}
