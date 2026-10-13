/**
 * La grille des photos d'une édition : filtres, jours, provenances (PRD §4.2
 * Photos, maquette Collecte). Module PUR : aucun accès base, aucun réseau.
 *
 * 2 000 photos ne se signent pas toutes à chaque affichage : la route rend
 * une PAGE (`TAILLE_PAGE`) avec ses vignettes signées, et un curseur. Les
 * doublons se calculent sur l'édition ENTIÈRE (doublons.ts, par tronçons),
 * puis la page les lit.
 */

import { jourDe, jourEnClair } from "@/lib/atelier/metadonnees";
import { formaterJour } from "@/lib/atelier/dates";
import { TYPES_PROVENANCE } from "./types";

export const TAILLE_PAGE = 120;

export const FILTRES = ["toutes", "jour", "provenance", "doublons", "preselection", "signalees"] as const;
export type Filtre = (typeof FILTRES)[number];

export function lireFiltre(v: unknown): Filtre {
  return (FILTRES as readonly string[]).includes(v as string) ? (v as Filtre) : "toutes";
}

/** Le jour d'une photo : sa date de prise de vue, sinon son jour d'arrivée. Libellé lisible. */
export function jourDePhoto(priseLe: string | null, arriveeLe: string): { cle: string; libelle: string } {
  const j = jourDe(priseLe);
  /* `prise_le` est l'heure LOCALE de l'appareil, sans fuseau : on la lit
     telle quelle (jourEnClair), jamais par une `Date`. */
  if (j) return { cle: j, libelle: jourEnClair(j) };
  const a = arriveeLe.slice(0, 10);
  return { cle: `~${a}`, libelle: `Arrivées le ${formaterJour(arriveeLe)} (sans date)` };
}

export function libelleProvenance(type: string, deposant: string | null): string {
  const t = TYPES_PROVENANCE.find((x) => x.cle === type)?.libelle ?? "Autre source";
  if (type === "organisateur") return deposant ? `Le responsable · ${deposant}` : "Le responsable";
  return deposant ? `${t} · ${deposant}` : t;
}

/** Qui a déposé combien : une ligne par provenance et déposant, la plus fournie d'abord. */
export function resumeDeposants(photos: readonly { provenance_type: string; deposant: string | null }[]): { libelle: string; n: number }[] {
  const m = new Map<string, number>();
  for (const p of photos) {
    const l = libelleProvenance(p.provenance_type, p.deposant);
    m.set(l, (m.get(l) ?? 0) + 1);
  }
  return [...m.entries()].map(([libelle, n]) => ({ libelle, n })).sort((a, b) => b.n - a.n || a.libelle.localeCompare(b.libelle));
}
