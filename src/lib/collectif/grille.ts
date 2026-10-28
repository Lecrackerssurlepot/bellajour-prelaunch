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
import { clePersonne, compterPersonnes, deParticipant, nomDePersonne, personnesDe, poidsDe, type LignePhoto } from "./dossiers";
import { TYPES_PROVENANCE } from "./types";

export const TAILLE_PAGE = 120;

export const FILTRES = ["toutes", "jour", "provenance", "doublons", "preselection", "signalees"] as const;
export type Filtre = (typeof FILTRES)[number];

export function lireFiltre(v: unknown): Filtre {
  return (FILTRES as readonly string[]).includes(v as string) ? (v as Filtre) : "toutes";
}

/** La clé du groupe des photos sans date de prise de vue (copie WhatsApp, capture d'écran) : UN seul groupe, rangé en fin. */
export const CLE_SANS_DATE = "~";
export const LIBELLE_SANS_DATE = "Sans date";

/** Le jour d'une photo : sa date de prise de vue ; sans date, le groupe « Sans date » (jamais son jour d'envoi, qui doublonnait un jour daté). */
export function jourDePhoto(priseLe: string | null): { cle: string; libelle: string } {
  const j = jourDe(priseLe);
  /* `prise_le` est l'heure LOCALE de l'appareil, sans fuseau : on la lit
     telle quelle (jourEnClair), jamais par une `Date`. */
  if (j) return { cle: j, libelle: jourEnClair(j) };
  return { cle: CLE_SANS_DATE, libelle: LIBELLE_SANS_DATE };
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

/* ══════════════════════════════════════════════════════════════════════════
   QUI A DÉPOSÉ, PAR LIEN (T-193, 20/10/2026).

   Pour Audencia : huit bateaux, dix personnes par lien. L'atelier doit retrouver
   chaque lien (le nom que le responsable lui a donné), les personnes qui sont
   dedans, les photos de chacune, et le tout. L'ancien « type · nom » (« Un
   participant · Léa Martin ») ne disait jamais « Bateau 3 » : `resumeDeposants`
   reste plus haut, mais l'écran de l'atelier lit désormais CE regroupement-ci.

   UN lien est une clé de dossier de `dossiers.ts` (`lien:<id>`, `participants`,
   `vous`, `atelier`) : la même règle que la page Photos du client, une seule
   définition de « cette photo est dans ce lien ». Une personne est un NOM
   comparé sans la casse ni les espaces (`clePersonne`).
   ══════════════════════════════════════════════════════════════════════════ */

export const LIBELLE_LIEN_GENERAL = "Lien général";
export const LIBELLE_RESPONSABLE = "Le responsable";
export const LIBELLE_ATELIER = "L'atelier";
/** Le nom d'un lien qui n'en a pas (créé avant qu'on exige un nom). */
export const NOM_LIEN_SANS_NOM = "Lien de contribution";

export type GenreDeLien = "lien" | "general" | "responsable" | "atelier";

/** Ce que ce regroupement lit d'une photo. */
export type PhotoDeLien = Pick<LignePhoto, "provenance_id" | "role_deposant" | "deposant"> & {
  appareil_id?: string | null;
  /** Une ligne du résumé en base pèse `n` photos (fiche de l'atelier) ; absent = une photo. */
  poids?: number;
};
/** Ce qu'il lit d'un lien de contribution. */
export type LienNomme = { id: string; libelle: string | null; retire_le?: string | null };

/** La clé du lien d'une photo : `lien:<id>`, `participants` (le lien général), `vous` (le responsable), `atelier`. */
export function cleDuLien(l: Pick<LignePhoto, "provenance_id" | "role_deposant">): string {
  if (l.role_deposant === "responsable" && !l.provenance_id) return "vous";
  if (deParticipant(l)) return l.provenance_id ? `lien:${l.provenance_id}` : "participants";
  return "atelier";
}

const CLE_LIEN = /^(?:vous|participants|atelier|lien:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
/** Une clé de lien relue du navigateur : la route ne filtre jamais sur autre chose. */
export function estCleDeLien(v: unknown): v is string {
  return typeof v === "string" && CLE_LIEN.test(v);
}

/**
 * Le nom de chaque lien, rendu UNIQUE. Deux liens qui portent le même nom (le
 * responsable peut les créer, rien ne l'en empêche) se mêleraient dans le
 * dossier « Lot - Bateau 1 » et dans les noms de fichiers : le second devient
 * « Bateau 1 (2) », dans l'ordre de création. Les trois groupes fixes gardent
 * leur nom : un lien appelé « Lien général » passe, lui, en « (2) ».
 */
export function nomsDesLiens(liens: readonly LienNomme[]): Map<string, string> {
  const pris = new Set([LIBELLE_LIEN_GENERAL, LIBELLE_RESPONSABLE, LIBELLE_ATELIER].map((n) => clePersonne(n)));
  const noms = new Map<string, string>();
  for (const l of liens) {
    const brut = (l.libelle ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
    const base = brut || NOM_LIEN_SANS_NOM;
    let nom = base;
    let n = 2;
    while (pris.has(clePersonne(nom))) nom = `${base} (${n++})`;
    pris.add(clePersonne(nom));
    noms.set(l.id, nom);
  }
  return noms;
}

/** La personne d'une photo : le responsable sous son nom, l'atelier sous le sien, un participant sous le nom qu'il a tapé (« Sans nom » sinon). */
export function personneDeLaPhoto(l: Pick<LignePhoto, "provenance_id" | "role_deposant" | "deposant">, responsable: string | null): string {
  const cle = cleDuLien(l);
  if (cle === "vous") return nomDePersonne(responsable?.trim() || LIBELLE_RESPONSABLE);
  if (cle === "atelier") return nomDePersonne(l.deposant?.trim() || LIBELLE_ATELIER);
  return nomDePersonne(l.deposant);
}

export type PersonneDeLien = {
  /** Le nom COMPARÉ (`clePersonne`) : c'est ce que le navigateur renvoie pour télécharger cette personne. */
  cle: string;
  nom: string;
  n: number;
  /** Pour « Sans nom » : combien de téléphones se cachent derrière (un par appareil), quand ils sont plusieurs. */
  telephones?: number;
};

export type LienDepose = {
  /** `lien:<id>`, `participants`, `vous` ou `atelier` (`cleDuLien`). */
  cle: string;
  /** L'id du lien de contribution ; `null` pour les trois groupes fixes. */
  id: string | null;
  /** « Bateau 3 », « Lien général », « Le responsable » : le nom donné par le responsable, rendu unique. */
  nom: string;
  genre: GenreDeLien;
  n: number;
  /** « 9 personnes » : la règle de `compterPersonnes` (un téléphone par anonyme), la même partout. */
  nbPersonnes: number;
  personnes: PersonneDeLien[];
  /** Supprimé par le responsable (il ne reçoit plus rien, ses photos restent). */
  retire: boolean;
};

const SANS_NOM_CLE = clePersonne(null);

function personnesDuGroupe(photos: readonly PhotoDeLien[], responsable: string | null): PersonneDeLien[] {
  const noms = photos.map((p) => ({ deposant: personneDeLaPhoto(p, responsable), poids: p.poids }));
  return personnesDe(noms).map((x) => {
    if (x.cle !== SANS_NOM_CLE) return x;
    const appareils = new Set(photos.filter((p) => clePersonne(p.deposant) === SANS_NOM_CLE).map((p) => p.appareil_id ?? ""));
    return appareils.size > 1 ? { ...x, telephones: appareils.size } : x;
  });
}

/**
 * L'ordre des liens de contribution à l'écran de l'atelier : les ouverts d'abord, par NOM dans
 * l'ordre naturel (« Bateau 2 » avant « Bateau 10 »), les supprimés ensuite. Ce n'est pas l'ordre
 * de création : le responsable peut avoir créé « Bateau 3 » avant « Bateau 1 », et l'atelier
 * cherche un nom, pas une date.
 */
export function comparerLiens(a: { nom: string; retire: boolean }, b: { nom: string; retire: boolean }): number {
  return Number(a.retire) - Number(b.retire) || a.nom.localeCompare(b.nom, "fr", { numeric: true, sensitivity: "base" });
}

/**
 * Qui a déposé, RANGÉ PAR LIEN : les liens de contribution par nom (« Bateau 1 » … « Bateau 8 »,
 * `comparerLiens`), puis le lien général, le responsable et l'atelier quand ils ont déposé. Un lien actif qui n'a rien
 * reçu reste là (on voit quel bateau n'a pas encore envoyé) ; un lien supprimé
 * sans photo disparaît. Dans chaque lien, les personnes, la plus fournie d'abord.
 */
export function deposantsParLien(photos: readonly PhotoDeLien[], liens: readonly LienNomme[], responsable: string | null): LienDepose[] {
  const parCle = new Map<string, PhotoDeLien[]>();
  for (const p of photos) {
    const cle = cleDuLien(p);
    const m = parCle.get(cle) ?? [];
    m.push(p);
    parCle.set(cle, m);
  }
  const noms = nomsDesLiens(liens);
  const groupe = (cle: string, id: string | null, nom: string, genre: GenreDeLien, retire: boolean): LienDepose => {
    const lignes = parCle.get(cle) ?? [];
    const personnes = personnesDuGroupe(lignes, responsable);
    return {
      cle,
      id,
      nom,
      genre,
      n: lignes.reduce((t, l) => t + poidsDe(l), 0),
      nbPersonnes: genre === "responsable" ? (lignes.length ? 1 : 0) : genre === "atelier" ? personnes.length : compterPersonnes(lignes),
      personnes,
      retire,
    };
  };
  const nommes: LienDepose[] = [];
  const connus = new Set<string>();
  for (const l of liens) {
    const cle = `lien:${l.id}`;
    connus.add(cle);
    const g = groupe(cle, l.id, noms.get(l.id) ?? NOM_LIEN_SANS_NOM, "lien", Boolean(l.retire_le));
    if (g.n || !g.retire) nommes.push(g);
  }
  /* Une provenance que la liste ne connaît pas (jamais en principe : la clé étrangère la retient). */
  for (const cle of parCle.keys()) {
    if (cle.startsWith("lien:") && !connus.has(cle)) nommes.push(groupe(cle, cle.slice(5), NOM_LIEN_SANS_NOM, "lien", false));
  }
  const rendu = nommes.sort(comparerLiens);
  for (const [cle, nom, genre] of [
    ["participants", LIBELLE_LIEN_GENERAL, "general"],
    ["vous", LIBELLE_RESPONSABLE, "responsable"],
    ["atelier", LIBELLE_ATELIER, "atelier"],
  ] as const) {
    if (parCle.has(cle)) rendu.push(groupe(cle, null, nom, genre, false));
  }
  return rendu;
}

/**
 * Cette photo est-elle dans le lot demandé ? `lien` (une clé de lien) et
 * `personne` (un nom comparé) se cumulent ; `null` ne filtre pas. La route du
 * lot et l'écran lisent CETTE règle : le bouton « Télécharger » d'une personne
 * ne peut pas rendre autre chose que ce que la ligne annonce.
 */
export function dansLeLot(l: Pick<LignePhoto, "provenance_id" | "role_deposant" | "deposant">, lien: string | null, personne: string | null, responsable: string | null): boolean {
  if (lien !== null && cleDuLien(l) !== lien) return false;
  if (personne !== null && clePersonne(personneDeLaPhoto(l, responsable)) !== personne) return false;
  return true;
}
