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
import { estJour } from "./livraison";
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
  registre: "Le ton de l'espace",
  cloture_le: "Clôture de la collecte",
  livraison_prevue_le: "Livraison souhaitée",
  plafond_participant_atelier: "Photos par personne",
  plafond_total: "Photos au total",
  preselection_max: "La sélection du client",
  pagination_prevue: "Pagination prévue au devis",
  tirage: "Tirage prévu au devis",
  tours_inclus: "Tours de corrections inclus",
  nb_propositions_couverture: "Propositions de couverture au premier tour",
  couvertures_aimees_max: "Couvertures que le client peut aimer",
  styles_segment: "Styles proposés sur le mur",
  contenus_demandes: "À envoyer par le client",
  invitation_texte: "Message d'accueil du lien des participants",
  responsable_email: "E-mail du responsable",
  responsable_nom: "Nom du responsable",
  rdv_url: "Lien de rendez-vous",
  magazines: "Magazines",
};

/* ─────────────────── les six étapes du formulaire (T-186, planche 5) ─────────────────── */

/** Les étapes de la création et des réglages, dans l'ordre où l'on pense : la même liste pour les deux. */
export const ETAPES_EDITION = [
  { cle: "client", nom: "Le client" },
  { cle: "calendrier", nom: "Le calendrier" },
  { cle: "magazines", nom: "Les magazines" },
  { cle: "photos", nom: "Les photos" },
  { cle: "envoyer", nom: "À envoyer par le client" },
  { cle: "devis", nom: "Le devis" },
] as const;

export type CleEtape = (typeof ETAPES_EDITION)[number]["cle"];

/** L'étape où vit chaque champ : une erreur du serveur y ramène l'écran et la nomme. */
export const ETAPE_DU_CHAMP: Record<string, CleEtape> = {
  organisation: "client",
  evenement: "client",
  registre: "client",
  responsable_nom: "client",
  responsable_email: "client",
  rdv_url: "client",
  cloture_le: "calendrier",
  dates_texte: "calendrier",
  livraison_prevue_le: "calendrier",
  magazines: "magazines",
  couvertures_aimees_max: "magazines",
  styles_segment: "magazines",
  plafond_participant_atelier: "photos",
  plafond_total: "photos",
  preselection_max: "photos",
  invitation_texte: "photos",
  contenus_demandes: "envoyer",
  pagination_prevue: "devis",
  tirage: "devis",
  tours_inclus: "devis",
  nb_propositions_couverture: "devis",
};

/** Le rang (0 à 5) de l'étape d'un champ ; un champ inconnu ramène à la première. */
export function rangEtapeDuChamp(champ: string): number {
  const cle = ETAPE_DU_CHAMP[champ];
  const i = ETAPES_EDITION.findIndex((e) => e.cle === cle);
  return i === -1 ? 0 : i;
}

/** Ce que l'écran sait de l'édition avant la saisie : les plafonds (curseur du client) et la clôture en base. */
export type ActuelEdition = ReglagesPlafond & { cloture_le?: string | null };

/** Deux instants dans la même minute : un champ `datetime-local` ne garde pas les secondes. */
function memeMinute(t: number, iso: string | null | undefined): boolean {
  const a = iso ? lireInstant(iso) : null;
  return a !== null && Math.floor(a / 60_000) === Math.floor(t / 60_000);
}

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
 *
 * La clôture (T-186) : une date PASSÉE est refusée à la création, et en
 * réglage SEULEMENT si on la change (comparée à `actuel.cloture_le`, à la
 * minute : le champ de l'écran ne garde pas les secondes). Une édition close
 * doit rester réglable : son tirage ou ses magazines se changent sans toucher
 * à sa clôture. Inchangée, la clôture n'est pas réécrite (les secondes d'une
 * clôture posée par « Clore maintenant » restent celles de la base).
 *
 * La livraison souhaitée (`livraison_prevue_le`, `AAAA-MM-JJ`) ne se lit qu'à
 * la CRÉATION : elle devient `livraison: { prevue_le }`. En réglage, le jsonb
 * `livraison` appartient à l'onglet Livraison, qui le FUSIONNE ; d'ici, il ne
 * s'écrit jamais (il écraserait l'adresse).
 */
export function lireSaisieEdition(
  corps: unknown,
  mode: "creation" | "modification",
  actuel: ActuelEdition = {
    plafond_participant_atelier: null,
    plafond_participant_client: null,
    plafond_total: null,
  },
  maintenant: Date = new Date()
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
      } else if (mode === "modification" && memeMinute(t, actuel.cloture_le)) {
        /* Inchangée : rien à écrire, et une clôture passée reste ce qu'elle est. */
      } else if (t <= maintenant.getTime()) {
        erreurs.push({ champ: "cloture_le", message: "Clôture de la collecte : cette date est déjà passée. Choisir une date à venir." });
      } else e.cloture_le = new Date(t).toISOString();
    }
  }

  if (mode === "creation") {
    const jour = typeof s.livraison_prevue_le === "string" ? s.livraison_prevue_le.trim() : "";
    if (jour && !estJour(jour)) erreurs.push({ champ: "livraison_prevue_le", message: "Livraison souhaitée : jour illisible." });
    else if (jour) e.livraison = { prevue_le: jour };
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
