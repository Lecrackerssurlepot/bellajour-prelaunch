/**
 * Les projets : la porte d'entrée depuis la fiche d'une édition, les boutons « Composer » / « Reprendre »,
 * les onglets de la liste, le bandeau « un autre modifie ». Aucune horloge : l'instant vient de l'appelant.
 */

import { pluriel } from "./outils";
import type { BoutonEdition, BoutonSource, EditionMep, PorteEdition, ProjetListe, SourceADemarrer, SourceProjet } from "./types";

/** T47 : un autre a modifié il y a moins de 2 minutes. */
export function bandeauOuverture(
  meta: { modifie_par?: string | null; modifie_le?: string } | null | undefined, moi: string, maintenantIso: string,
): string | null {
  if (!meta || !meta.modifie_par || meta.modifie_par === moi || !meta.modifie_le) return null;
  const ecart = Date.parse(maintenantIso) - Date.parse(meta.modifie_le);
  return Number.isFinite(ecart) && ecart >= 0 && ecart < 2 * 60 * 1000 ? `${meta.modifie_par} modifie ce magazine` : null;
}

/** Jamais deux projets pour la même source : « Composer » ou « Reprendre ». */
export function boutonSource(projets: readonly ProjetListe[], source: SourceProjet): BoutonSource {
  const p = projets.find((x) => x.etat !== "archive" && x.source.type === source.type && x.source.ref === source.ref && (x.source.magazine ?? null) === (source.magazine ?? null));
  const quoi = source.magazine ? ` le Magazine ${source.magazine}` : "";
  if (p) return { action: "reprendre", libelle: `Reprendre${quoi}`, projetId: p.id, avancement: p.pagesCible ? `${p.pages} / ${p.pagesCible} pages` : `${p.pages} pages` };
  return { action: "composer", libelle: source.type === "particulier" ? "Mettre en page" : `Composer${quoi}`, projetId: null };
}

/** Séparateur de milliers : l'espace fine insécable (U+202F), comme la maquette. */
const nombreFr = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");

/** La porte d'entrée depuis la fiche d'une édition (E2a, T46). */
export function porteEdition(edition: EditionMep, projets: readonly ProjetListe[]): PorteEdition {
  if (edition.archivee) return { mode: "archivee", mention: "Archivée", boutons: [] };
  if (edition.photosSupprimeesLe) return { mode: "photos_supprimees", mention: `Photos supprimées le ${edition.photosSupprimeesLe}`, boutons: [] };
  const boutons: BoutonEdition[] = edition.magazines.map((rang) => ({ rang, ...boutonSource(projets, { type: "edition", ref: edition.id, magazine: rang }) }));
  if (edition.collecte === "ouverte") {
    return { mode: "collecte_ouverte", lienDiscret: "Mise en page", avertissement: "Collecte ouverte : des photos peuvent encore arriver", boutons };
  }
  return { mode: "pret", carte: `Prêt à composer · ${nombreFr(edition.nbPhotos)} photos · ${pluriel(edition.magazines.length, "magazine", "magazines")}`, boutons };
}

export function ongletsProjets(donnees: { projets: readonly ProjetListe[]; sources: readonly SourceADemarrer[] }): {
  aDemarrer: SourceADemarrer[]; enCours: ProjetListe[]; archives: ProjetListe[]; comptes: { aDemarrer: number; enCours: number; archives: number };
} {
  const enCours = donnees.projets.filter((p) => p.etat === "en_cours");
  const archives = donnees.projets.filter((p) => p.etat === "archive");
  const aDemarrer = donnees.sources.filter((s) => boutonSource(donnees.projets, s.source).action === "composer");
  return { aDemarrer, enCours, archives, comptes: { aDemarrer: aDemarrer.length, enCours: enCours.length, archives: archives.length } };
}
