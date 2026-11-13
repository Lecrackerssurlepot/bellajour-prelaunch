/**
 * Ce que tous les morceaux de l'éditeur partagent : l'état pur (`EtatEditeur`), l'envoi d'un geste, l'état d'écran
 * (menus, aperçus, survols : jamais dans le magazine) et le geste de glisser.
 */

import { createContext, useContext, type PointerEvent as PointerReact } from "react";
import type { Cible, CibleDepot, EtatEditeur, Filtres, Geste, Guide, Issue, RefCadre, SourceGlisser } from "@/lib/mise-en-page/editeur";
import type { Magazine } from "@/lib/mise-en-page/magazine";

export type Adresse = { vignette: string | null; moyenne: string | null; original: string | null };

/** L'aperçu d'un dépôt au survol d'une zone quand une sélection attend (rien n'est encore posé). */
export type SurvolSel = { cle: string; cible: CibleDepot; source: SourceGlisser; apercu: Issue };

export type Ui = {
  menu: string | null;
  rangee: Cible | null;
  apercuGab: Magazine | null;
  loupe: string | null;
  flash: CibleDepot | null;
  survolSel: SurvolSel | null;
  dir: "d" | "g" | null;
  defilerVers: string | null;
  ressortId: string | null;
  exportOuvert: boolean;
  /** Lot C : le panneau « Style » (paire de polices, nuancier) ouvert sous la barre. Écran seulement. */
  style: boolean;
  /** Le tri : la bande des photos agrandie en plein écran (grille), ou une photo, ou la comparaison. */
  grand: boolean;
  vue: "grille" | "une" | "comparer";
  /** La photo au focus du tri (P, X, Entrée agissent sur elle quand il n'y a pas de sélection de 2+). */
  focus: string | null;
  /** Où va le clavier : la bande des photos (touches du tri) ou la planche (touches de mise en page). */
  zone: "photos" | "planche";
  /** Les photos comparées (2 et plus), et l'active. */
  comparer: string[];
  cmpIci: number;
  /** La loupe 100 % de la vue une photo. */
  loupeTri: boolean;
  /** 10/11 : la lecture dessinée (carte de chaleur, visages, zone) par-dessus les photos posées et la photo ouverte. */
  lecture: boolean;
  /** La hauteur des rangées de la grille plein écran (+ et −). */
  tailleGrand: number;
  bulle: "raccourcis" | "objectif" | null;
  /** Plein écran : le tiroir des doubles pages ouvert (D), ou montré un instant après Poser / N. */
  doubles: boolean;
  doublesFlash: boolean;
  /** L'hésitation d'un cadre en confrontation, côte à côte (lot 3, double-clic sur le cadre). */
  confronter: RefCadre | null;
  /** 06/11 : la vue que retrouve la barre latérale, et le tour que retrouve le grand écran. */
  vueBarre: Filtres["marque"];
  vueTour: Filtres["marque"];
  /** Lot 4 : le cadre qu'on déplace ou redimensionne à la souris (repère planche, mm), avant le lâcher. */
  retouche: { ref: RefCadre; x: number; y: number; l: number; h: number } | null;
  /** Lot 4 : le menu « Position » (ordre des calques) ouvert sur ce cadre (« planche|cible|index »). */
  position: string | null;
  /** 06/11 : l'aimant allumé (gardé sur ce Mac), et les lignes où le cadre s'accroche pendant le glisser. */
  aimant: boolean;
  guides: Guide[];
  /** Lot D (12/11) : la grille d'artiste (tiers, nombre d'or, diagonales) par-dessus chaque page, gardée sur ce Mac. Écran seulement. */
  grille: boolean;
  /** Lot E : ce que le dernier fichier de premier jet a donné (chargé : photos reliées et introuvables ; refusé : la phrase). Écran seulement, jusqu'à « Fermer ». */
  premierJet: BandeauPremierJet | null;
};

/** Lot E : le bandeau du premier jet. */
export type BandeauPremierJet =
  | { type: "ok"; fichier: string; reliees: number; total: number; manquantes: string[]; ambigues: string[] }
  | { type: "refuse"; fichier: string; phrase: string };

export const UI_NEUVE: Ui = {
  menu: null, rangee: null, apercuGab: null, loupe: null, flash: null, survolSel: null, dir: null, defilerVers: null, ressortId: null, exportOuvert: false, style: false,
  grand: false, vue: "grille", focus: null, zone: "planche", comparer: [], cmpIci: 0, loupeTri: false, lecture: false, tailleGrand: 200, bulle: null, doubles: false, doublesFlash: false, confronter: null, vueBarre: "toutes", vueTour: "ecarter",
  retouche: null, position: null, aimant: true, guides: [], grille: false, premierJet: null,
};

/** L'aimant et la grille d'artiste se rappellent d'une séance à l'autre, sur ce Mac seulement. Jamais d'exception. */
export const CLE_AIMANT = "bj-mep-aimant";
export const CLE_GRILLE = "bj-mep-grille";
export function uiDeDepart(): Ui {
  try { return { ...UI_NEUVE, aimant: window.localStorage.getItem(CLE_AIMANT) !== "0", grille: window.localStorage.getItem(CLE_GRILLE) === "1" }; } catch { return UI_NEUVE; }
}
/** Allume ou éteint la grille d'artiste (la barre et la touche O) et s'en souvient ; le stockage refusé = l'état vaut pour la séance. */
export function basculerGrille(ui: Ui, majUi: (p: Partial<Ui>) => void): void {
  const grille = !ui.grille;
  majUi({ grille });
  try { window.localStorage.setItem(CLE_GRILLE, grille ? "1" : "0"); } catch { /* stockage refusé */ }
}

/** Création libre : importer des photos de l'ordinateur (absent pour un dossier ou une édition). */
export type Import = {
  importer: (fichiers: File[]) => void;
  /** L'import en cours : fichiers décodés sur le total. */
  enCours: { fait: number; total: number } | null;
  /** Ce que le dernier import n'a pas pu lire, en deux ou trois mots. */
  bilan: string | null;
};

export type Ctx = {
  etat: EtatEditeur;
  envoyer: (g: Geste, silencieux?: boolean) => void;
  /** Un geste calculé sur l'état le plus récent (molette, glisser de recadrage). */
  envoyerAvec: (f: (e: EtatEditeur) => Geste | null) => void;
  adresses: ReadonlyMap<string, Adresse>;
  ui: Ui;
  majUi: (p: Partial<Ui>) => void;
  lectureSeule: boolean;
  /** Le pointeur est appuyé : un glisser commence au-delà de 8 px. */
  commencerAppui: (e: PointerReact, source: SourceGlisser) => void;
  /** Vrai juste après un glisser : le clic qui suit le lâcher est ignoré. */
  clicSupprime: () => boolean;
  flasher: (cible: CibleDepot) => void;
  /** Un geste annulable, avec un message court et « Annuler ». */
  gesteAvecAnnuler: (g: Geste, texte: string) => void;
  imp?: Import;
};

export const CtxEd = createContext<Ctx | null>(null);

export function useEd(): Ctx {
  const c = useContext(CtxEd);
  if (!c) throw new Error("useEd hors de l'éditeur");
  return c;
}

export const memeRef = (a: { plancheId: string; cible: string; index: number } | null | undefined, b: { plancheId: string; cible: string; index: number } | null | undefined): boolean =>
  !!a && !!b && a.plancheId === b.plancheId && a.cible === b.cible && a.index === b.index;

export const pc = (v: number, tot: number): string => `${(v / tot) * 100}%`;
export const pluriel = (n: number, s: string, p?: string): string => `${n.toLocaleString("fr-FR")} ${n > 1 ? (p ?? `${s}s`) : s}`;
export const cls = (...l: (string | false | null | undefined)[]): string => l.filter(Boolean).join(" ");

/** Fermer la séance de texte avec ce qui est tapé : une seule entrée d'annulation. */
export function fermerTexteDom(envoyer: (g: Geste, silencieux?: boolean) => void): void {
  const n = document.querySelector(".ed-txt--edit");
  if (n) envoyer({ type: "taper", contenu: (n.textContent ?? "").trim() }, true);
  envoyer({ type: "fermerTexte" });
}
