/**
 * Ce que l'atelier saisit pour ouvrir ou régler une édition (PRD §8, §9.1).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Toutes les valeurs arrivent en texte du navigateur ; la conversion et le
 * contrôle se font ICI, une seule fois, pour la création comme pour la
 * modification (même règle, deux écrans).
 *
 * ⚠️ AUCUN CHIFFRE PRÉ-REMPLI. Un champ chiffré laissé vide vaut `null`, et la
 * fiche l'affiche `[À FIXER]`. Un dépôt dont le plafond n'est pas réglé est
 * refusé (plafonds.ts) : on ne devine rien.
 */

import { EMAIL_PATTERN, suggestionEmail } from "@/lib/atelier/questionnaire";
import { lireInstant } from "./etats";
import { lireEntierPositif, reglerPlafondAtelier, type ReglagesPlafond } from "./plafonds";
import { CONTENUS, REGISTRES, SEGMENTS, type CleContenu, type Registre, type Segment } from "./types";

export type Erreur = { champ: string; message: string };

/** Garde technique : au-delà, une édition se découpe en deux. */
export const MAX_MAGAZINES = 12;

const LONGUEURS = {
  organisation: 120,
  evenement: 160,
  dates_texte: 120,
  invitation_texte: 1000,
  responsable_nom: 120,
  rdv_url: 500,
  magazine: 80,
} as const;

/** Les champs chiffrés : ≥ 1, sauf ceux où zéro a un sens. */
const ENTIERS_POSITIFS = [
  "plafond_participant_atelier",
  "plafond_total",
  "pagination_prevue",
  "tirage",
  "tours_inclus",
  "nb_propositions_couverture",
] as const;
const ENTIERS_NATURELS = ["preselection_max", "couvertures_aimees_max"] as const;

export const LIBELLE_CHAMP: Record<string, string> = {
  organisation: "Organisation",
  evenement: "Nom de l'événement",
  dates_texte: "Dates de l'événement",
  registre: "Registre",
  cloture_le: "Clôture de la collecte",
  plafond_participant_atelier: "Photos au plus par participant",
  plafond_total: "Photos au plus pour toute l'édition",
  preselection_max: "Présélection remise à l'atelier",
  pagination_prevue: "Pagination prévue au devis",
  tirage: "Tirage prévu au devis",
  tours_inclus: "Tours de corrections inclus",
  nb_propositions_couverture: "Propositions de couverture au premier tour",
  couvertures_aimees_max: "Couvertures aimées au plus, par magazine",
  styles_segment: "Styles proposés sur le mur",
  contenus_demandes: "Ce qu'on demande au client",
  invitation_texte: "Message d'accueil du lien participants",
  responsable_email: "E-mail du responsable",
  responsable_nom: "Nom du responsable",
  rdv_url: "Lien de rendez-vous",
  magazines: "Magazines",
};

function texte(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Un entier ≥ 0 saisi à l'écran, `null` pour un champ vide, `undefined` si illisible. */
function lireEntierNaturel(v: unknown): number | null | undefined {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isInteger(n) || n < 0) return undefined;
  return n;
}

/** Une adresse web sûre : https seulement (un `javascript:` ne s'ouvre jamais). */
export function estUrlSure(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && Boolean(u.hostname);
  } catch {
    return false;
  }
}

export type MagazineSaisi = { id: string | null; nom: string };

export type SaisieEdition =
  | {
      ok: true;
      /** Les colonnes de `collectif_editions` à écrire (sans les tokens). */
      edition: Record<string, unknown>;
      /** La liste demandée, dans l'ordre ; `null` si le corps ne la contenait pas. */
      magazines: MagazineSaisi[] | null;
      /** Une faute de frappe probable dans l'adresse : on la SUGGÈRE, on ne bloque pas. */
      suggestion: string | null;
    }
  | { ok: false; erreurs: Erreur[] };

/**
 * Création : organisation, événement, registre, e-mail du responsable et au
 * moins un magazine sont exigés. Modification : seuls les champs présents
 * sont lus. Les plafonds passent par `reglerPlafondAtelier`, qui ramène le
 * curseur du client s'il dépasse (sinon la contrainte de la base refuserait).
 */
export function lireSaisieEdition(
  corps: unknown,
  mode: "creation" | "modification",
  actuel: ReglagesPlafond = {
    plafond_participant_atelier: null,
    plafond_participant_client: null,
    plafond_total: null,
  }
): SaisieEdition {
  const s = (corps && typeof corps === "object" ? corps : {}) as Record<string, unknown>;
  const erreurs: Erreur[] = [];
  const e: Record<string, unknown> = {};
  const present = (c: string) => mode === "creation" || c in s;
  let suggestion: string | null = null;

  for (const c of ["organisation", "evenement"] as const) {
    if (!present(c)) continue;
    const v = texte(s[c], LONGUEURS[c]);
    if (!v) erreurs.push({ champ: c, message: `${LIBELLE_CHAMP[c]} : à remplir.` });
    e[c] = v;
  }
  if (present("dates_texte")) e.dates_texte = texte(s.dates_texte, LONGUEURS.dates_texte) || null;

  if (present("registre")) {
    const r = s.registre as Registre;
    if (!REGISTRES.includes(r)) erreurs.push({ champ: "registre", message: "Choisir le registre (vous ou tu)." });
    else e.registre = r;
  }

  if (present("cloture_le")) {
    const brut = s.cloture_le;
    if (brut === null || brut === undefined || brut === "") e.cloture_le = null;
    else {
      const t = lireInstant(brut);
      if (t === null) {
        erreurs.push({ champ: "cloture_le", message: "Date de clôture illisible." });
      } else e.cloture_le = new Date(t).toISOString();
    }
  }

  for (const c of ENTIERS_POSITIFS) {
    if (!present(c) || c === "plafond_participant_atelier") continue;
    const n = lireEntierPositif(s[c]);
    if (n === undefined) erreurs.push({ champ: c, message: `${LIBELLE_CHAMP[c]} : un nombre entier, au moins 1, ou vide.` });
    else e[c] = n;
  }
  for (const c of ENTIERS_NATURELS) {
    if (!present(c)) continue;
    const n = lireEntierNaturel(s[c]);
    if (n === undefined) erreurs.push({ champ: c, message: `${LIBELLE_CHAMP[c]} : un nombre entier, ou vide.` });
    else e[c] = n;
  }
  if (present("plafond_participant_atelier")) {
    const r = reglerPlafondAtelier(s.plafond_participant_atelier ?? null, actuel);
    if (!r.ok) erreurs.push({ champ: "plafond_participant_atelier", message: r.message });
    else Object.assign(e, r.patch);
  }

  if (present("styles_segment")) {
    const seg = (s.styles_segment ?? "tous") as Segment;
    if (!SEGMENTS.includes(seg)) erreurs.push({ champ: "styles_segment", message: "Choix de styles inconnu." });
    else e.styles_segment = seg;
  }

  if (present("contenus_demandes")) {
    const brut = Array.isArray(s.contenus_demandes) ? s.contenus_demandes : [];
    const connus = CONTENUS.map((c) => c.cle) as string[];
    e.contenus_demandes = connus.filter((c) => brut.includes(c)) as CleContenu[];
  }

  if (present("invitation_texte")) e.invitation_texte = texte(s.invitation_texte, LONGUEURS.invitation_texte) || null;
  if (present("responsable_nom")) e.responsable_nom = texte(s.responsable_nom, LONGUEURS.responsable_nom) || null;

  if (present("responsable_email")) {
    const email = texte(s.responsable_email, 254).toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      erreurs.push({ champ: "responsable_email", message: "E-mail du responsable : adresse invalide." });
    } else {
      e.responsable_email = email;
      suggestion = suggestionEmail(email);
    }
  }

  if (present("rdv_url")) {
    const url = texte(s.rdv_url, LONGUEURS.rdv_url);
    if (url && !estUrlSure(url)) {
      erreurs.push({ champ: "rdv_url", message: "Lien de rendez-vous : une adresse qui commence par https://." });
    } else e.rdv_url = url || null;
  }

  let magazines: MagazineSaisi[] | null = null;
  if (present("magazines")) {
    const brut = Array.isArray(s.magazines) ? s.magazines : [];
    magazines = brut.slice(0, MAX_MAGAZINES + 1).map((m) => {
      const o = (m && typeof m === "object" ? m : { nom: m }) as Record<string, unknown>;
      return { id: typeof o.id === "string" && o.id ? o.id : null, nom: texte(o.nom, LONGUEURS.magazine) };
    });
    if (magazines.length === 0) erreurs.push({ champ: "magazines", message: "Au moins un magazine." });
    if (magazines.length > MAX_MAGAZINES) {
      erreurs.push({ champ: "magazines", message: `Au plus ${MAX_MAGAZINES} magazines par édition.` });
    }
    if (magazines.some((m) => !m.nom)) erreurs.push({ champ: "magazines", message: "Chaque magazine a un nom." });
  }

  /* La démonstration est une phase 7 : la case existe, désactivée. Elle ne
     s'écrit jamais d'ici. */
  return erreurs.length ? { ok: false, erreurs } : { ok: true, edition: e, magazines, suggestion };
}

/* ─────────────────────────── les magazines d'une édition ─────────────────────────── */

export type MagazineActuel = {
  id: string;
  rang: number;
  nom: string;
  /** Rien n'y est attaché : ni brief commencé, ni tour. Seul un magazine vide se retire. */
  vide: boolean;
};

export type PlanMagazines =
  | {
      ok: true;
      renommer: { id: string; nom: string }[];
      ajouter: { rang: number; nom: string }[];
      retirer: string[];
    }
  | { ok: false; message: string };

/**
 * Ce que la fiche demande, face à ce qui existe.
 *
 * Renommer : toujours. Ajouter : à la suite. Retirer : seulement le DERNIER,
 * et seulement s'il est vide. Ainsi les rangs restent 1, 2, 3 sans jamais
 * renuméroter (le rang est unique en base, et c'est lui que le client lit :
 * « magazine 2 »).
 */
export function planMagazines(actuels: MagazineActuel[], demandes: MagazineSaisi[]): PlanMagazines {
  const tries = [...actuels].sort((a, b) => a.rang - b.rang);
  const parId = new Map(tries.map((m) => [m.id, m]));

  for (const d of demandes) {
    if (d.id && !parId.has(d.id)) return { ok: false, message: "Un magazine demandé n'appartient pas à cette édition." };
  }
  const gardes = demandes.filter((d) => d.id).map((d) => d.id as string);
  const nouveaux = demandes.filter((d) => !d.id);

  /* Les magazines gardés doivent être les premiers, dans leur ordre. */
  const prefixe = tries.slice(0, gardes.length).map((m) => m.id);
  if (gardes.join() !== prefixe.join()) {
    return { ok: false, message: "On ne retire que le dernier magazine, et on ne change pas leur ordre." };
  }
  const retires = tries.slice(gardes.length);
  if (retires.some((m) => !m.vide)) {
    return { ok: false, message: "Ce magazine a déjà un brief ou un bon à tirer : il ne se retire pas." };
  }
  if (retires.length && nouveaux.length) {
    return { ok: false, message: "Retirer et ajouter un magazine en même temps : faire l'un, puis l'autre." };
  }

  const renommer = demandes
    .filter((d) => d.id && parId.get(d.id)!.nom !== d.nom)
    .map((d) => ({ id: d.id as string, nom: d.nom }));
  const dernierRang = gardes.length ? parId.get(gardes[gardes.length - 1])!.rang : 0;
  const ajouter = nouveaux.map((d, i) => ({ rang: dernierRang + i + 1, nom: d.nom }));

  return { ok: true, renommer, ajouter, retirer: retires.map((m) => m.id) };
}
