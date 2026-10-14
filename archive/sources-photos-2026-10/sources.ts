/**
 * « Qui a déposé », avec les liens au même endroit (retours du 14/10, points 9
 * et 10, maquette Photos validée) : une SOURCE par lien de contribution, le
 * lien général des participants, les dossiers du responsable, l'atelier.
 * Chaque source porte son nombre de photos et, si elle en a un, SON lien.
 * Module PUR : aucun accès base, aucun réseau. Lu par la page Photos (la
 * colonne de droite) et par l'encart Photos du tableau de bord (les dossiers).
 *
 * L'ordre est STABLE (rien ne saute quand une photo arrive) : les dossiers du
 * responsable, puis les liens dans leur ordre de création, puis le lien
 * général, puis l'atelier.
 */

import { GROUPE_GENERAL } from "./partage";
import { libellePlafondLien, type ReglagesPlafond } from "./plafonds";
import { TYPES_PROVENANCE } from "./types";

export type LignePourSource = {
  provenance_id: string | null;
  provenance_type: string;
  role_deposant: string;
  deposant: string | null;
  appareil_id: string | null;
};

export type LienPourSource = {
  id: string;
  cle: string;
  libelle: string | null;
  sans_plafond: boolean;
  plafond_par_personne: number | null;
};

export type Source = {
  /** Stable : `lien:<id>`, `participants`, `resp:<type>:<déposant tel qu'en base, vide pour le responsable lui-même>`, `atelier`. */
  cle: string;
  libelle: string;
  detail: string;
  n: number;
  /** Le lien à partager : la clé `?p=` d'un lien de contribution, `null` pour le lien général. Absent : pas de lien. */
  lien?: { cle: string | null; plafond: string };
};

/** Le nom de dossier par défaut du responsable (ZoneDepot, PanneauDepot). */
export const DOSSIER_RESPONSABLE = "Mes photos";

function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

/**
 * Les sources d'une édition. `tousLesLiens` : montrer aussi les liens qui
 * n'ont encore rien reçu (le responsable, qui partage) ; l'équipe ne voit que
 * ce qui a été déposé, sans aucun lien.
 */
export function sourcesDesPhotos(
  lignes: readonly LignePourSource[],
  liens: readonly LienPourSource[],
  edition: ReglagesPlafond & { responsable_nom: string | null },
  tousLesLiens: boolean
): Source[] {
  const parLien = new Map<string, { n: number; appareils: Set<string> }>();
  const general = { n: 0, appareils: new Set<string>() };
  const responsable = new Map<string, Source>();
  let atelier = 0;
  const nomResponsable = edition.responsable_nom ?? "";

  for (const l of lignes) {
    if (l.provenance_id) {
      const c = parLien.get(l.provenance_id) ?? { n: 0, appareils: new Set<string>() };
      c.n++;
      if (l.appareil_id) c.appareils.add(l.appareil_id);
      parLien.set(l.provenance_id, c);
    } else if (l.role_deposant === "participant") {
      general.n++;
      if (l.appareil_id) general.appareils.add(l.appareil_id);
    } else if (l.role_deposant === "responsable") {
      /* Le responsable dépose sous un nom de dossier (« Mes photos » par
         défaut) ou pour quelqu'un (« Le photographe · Jean »). */
      const propre = !l.deposant || l.deposant === nomResponsable || l.deposant === "Le responsable";
      const type = TYPES_PROVENANCE.some((t) => t.cle === l.provenance_type) ? l.provenance_type : "organisateur";
      const libelle =
        type === "organisateur"
          ? propre
            ? DOSSIER_RESPONSABLE
            : (l.deposant as string)
          : `${TYPES_PROVENANCE.find((t) => t.cle === type)?.libelle ?? "Autre source"}${propre ? "" : ` · ${l.deposant}`}`;
      const cle = `resp:${type}:${propre ? "" : l.deposant}`;
      const s = responsable.get(cle);
      if (s) s.n++;
      else responsable.set(cle, { cle, libelle, detail: "Déposées depuis votre espace", n: 1 });
    } else {
      atelier++;
    }
  }

  const sources: Source[] = [...responsable.values()].sort((a, b) =>
    a.libelle === DOSSIER_RESPONSABLE ? -1 : b.libelle === DOSSIER_RESPONSABLE ? 1 : a.libelle.localeCompare(b.libelle, "fr")
  );
  for (const l of liens) {
    const c = parLien.get(l.id);
    if (!c && !tousLesLiens) continue;
    const plafond = libellePlafondLien(l, edition);
    const personnes = c?.appareils.size ?? 0;
    sources.push({
      cle: `lien:${l.id}`,
      libelle: l.libelle?.trim() || "Lien de contribution",
      detail: `Lien · ${plafond.toLowerCase()}${personnes ? ` · ${pluriel(personnes, "personne")}` : ""}`,
      n: c?.n ?? 0,
      ...(tousLesLiens ? { lien: { cle: l.cle, plafond } } : {}),
    });
  }
  if (general.n || tousLesLiens) {
    const plafond = libellePlafondLien({ sans_plafond: false, plafond_par_personne: null }, edition);
    const personnes = general.appareils.size;
    sources.push({
      cle: "participants",
      libelle: GROUPE_GENERAL,
      detail: `Le lien général · ${plafond.toLowerCase()}${personnes ? ` · ${pluriel(personnes, "personne")}` : ""}`,
      n: general.n,
      ...(tousLesLiens ? { lien: { cle: null, plafond } } : {}),
    });
  }
  if (atelier) sources.push({ cle: "atelier", libelle: "L'atelier", detail: "Déposées par l'atelier", n: atelier });
  return sources;
}

/* ─────────────────────────── renommer un dossier ─────────────────────────── */

/** Les dossiers qui se renomment (retours du 14/10, point 3) : un lien de contribution, ou un dossier du responsable. */
export type DossierRenommable =
  | { genre: "lien"; id: string }
  /** `deposant` nul : les photos que le responsable a déposées sous son propre nom (« Mes photos »). */
  | { genre: "responsable"; type: string; deposant: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Relire la clé d'une source : le lien général et l'atelier ne se renomment pas. */
export function dossierRenommable(cle: unknown): DossierRenommable | null {
  if (typeof cle !== "string" || cle.length > 200) return null;
  if (cle.startsWith("lien:")) {
    const id = cle.slice(5);
    return UUID.test(id) ? { genre: "lien", id } : null;
  }
  const m = /^resp:([a-z]+):([^]*)$/.exec(cle);
  if (!m || !TYPES_PROVENANCE.some((t) => t.cle === m[1])) return null;
  return { genre: "responsable", type: m[1], deposant: m[2] || null };
}

export const NOM_DOSSIER_MAX = 80;

/** Un nouveau nom : du texte, une ligne, 80 caractères au plus. */
export function lireNomDossier(brut: unknown): { ok: true; nom: string } | { ok: false; message: string } {
  const nom = typeof brut === "string" ? brut.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : "";
  if (!nom) return { ok: false, message: "Écrire un nom." };
  if (nom.length > NOM_DOSSIER_MAX) return { ok: false, message: `${NOM_DOSSIER_MAX} caractères au plus.` };
  return { ok: true, nom };
}

/** Une source se renomme-t-elle (pour l'écran) ? */
export function sourceRenommable(s: Pick<Source, "cle">): boolean {
  return dossierRenommable(s.cle) !== null;
}
