/**
 * Ce que tous les morceaux de l'éditeur partagent : l'état pur (`EtatEditeur`), l'envoi d'un geste, l'état d'écran
 * (menus, aperçus, survols : jamais dans le magazine) et le geste de glisser.
 */

import { createContext, useContext, type PointerEvent as PointerReact } from "react";
import type { Cible, CibleDepot, EtatEditeur, Geste, Issue, SourceGlisser } from "@/lib/mise-en-page/editeur";
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
  /** L'écran de tri est ouvert (les touches de l'éditeur se taisent). */
  trier: boolean;
};

export const UI_NEUVE: Ui = {
  menu: null, rangee: null, apercuGab: null, loupe: null, flash: null, survolSel: null, dir: null, defilerVers: null, ressortId: null, exportOuvert: false, trier: false,
};

/** Création libre : importer des photos de l'ordinateur (absent pour un dossier ou une édition). */
export type Import = {
  importer: (fichiers: File[]) => void;
  /** L'import en cours : fichiers décodés sur le total. */
  enCours: { fait: number; total: number } | null;
  /** Ce que le dernier import n'a pas pu lire, en deux ou trois mots. */
  bilan: string | null;
};

export type Projet = { nom: string; source: "particulier" | "edition" | "libre"; nbPagesCible: number | null };

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
