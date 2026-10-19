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
import { compositionDu, stylesDeLaComposition, type BriefLigne } from "./brief";
import { lireInstant } from "./etats";
import { estJour } from "./livraison";
import { lireEntierPositif, reglerPlafondAtelier, type ReglagesPlafond } from "./plafonds";
import { CONTENUS, REGISTRES, SEGMENTS, type CleContenu, type Registre, type Segment } from "./types";

export type Erreur = { champ: string; message: string };

/** Garde technique : au-delà, une édition se découpe en deux. */
export const MAX_MAGAZINES = 12;

/**
 * Les valeurs fréquentes en un clic sous un chiffre (T-190, planche 11 du 19/10 au
 * soir) : seulement là où la maquette en montre. Ce sont des RACCOURCIS, jamais une
 * valeur par défaut : le champ part vide (`null`, « à fixer »).
 */
export const VALEURS_RAPIDES: Readonly<Record<string, readonly number[]>> = {
  plafond_participant_atelier: [10, 20, 30, 50],
};

/**
 * Ce que lit un participant quand le message d'accueil est vide : la phrase de la
 * page `/depot/[token]`, MOT POUR MOT (le harnais compare les deux). Le formulaire
 * la cite sous le champ et dans l'aperçu (T-190, planche 11).
 */
export function accueilParDefaut(registre: string): string {
  return registre === "ecole_tu" ? "Dépose ici tes photos de l’événement." : "Déposez ici vos photos de l’événement.";
}

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

/* T-190, planche 10 du 19/10 au soir, validée par Mathias (« la renumérotation des
   magazines dans les réglages me va ») : une poubelle sur CHAQUE magazine. À la
   création rien n'existe, les numéros se resserrent ; en réglages, seul un magazine
   ENCORE VIDE se retire, et les suivants prennent le numéro libéré (le client lit
   « magazine 2 » devenir « magazine 1 »). Un magazine commencé ne se retire pas. */

export type MagazineActuel = {
  id: string;
  rang: number;
  nom: string;
  /** Rien n'y est attaché : aucune pièce de brief, aucun tour, rien de validé (`magazineVide`). */
  vide: boolean;
};

/** Ce que dit la poubelle grisée d'un magazine commencé (planche 10, mot pour mot). */
export const RAISON_MAGAZINE_COMMENCE = "Le client a commencé ce magazine : il ne se retire pas. Changez son nom si besoin.";
/** Ce que dit la poubelle grisée du seul magazine qui reste. */
export const RAISON_DERNIER_MAGAZINE = "Une édition garde au moins un magazine.";

/**
 * Un magazine est VIDE si rien ne le référence ni ne le remplit : aucune pièce de
 * brief (palette, typographies, doubles pages, couvertures aimées, part de texte,
 * de n'importe quel style, D24), ni brief ni bon à tirer validé, et aucun tour
 * (`collectif_tours`, la seule table qui pointe vers un magazine ; les notes et
 * les couvertures proposées pointent vers un tour). Lu par la fiche ET par le PATCH,
 * dont la suppression redit les colonnes brutes (`style_id`, `palette_cle`, `texte`,
 * les deux validations) : une ligne qu'on croit vide l'est aussi pour la base.
 */
export function magazineVide(m: BriefLigne & { bat_valide_le?: string | null }, nbTours: number): boolean {
  const c = compositionDu(m);
  return (
    stylesDeLaComposition(c).length === 0 &&
    c.couvertures.length === 0 &&
    !c.texte &&
    !m.style_id &&
    !m.palette_cle &&
    !m.texte &&
    !m.brief_valide_le &&
    !m.bat_valide_le &&
    nbTours === 0
  );
}

/** La ligne d'un magazine dans le formulaire : `id` nul tant qu'il n'est pas enregistré. */
export type MagazineRetirable = { id: string | null; vide: boolean };

/**
 * La poubelle d'une ligne : un magazine pas encore enregistré ou encore vide se
 * retire, tant qu'il en reste un autre. Sinon, la raison à dire.
 */
export function retraitMagazine(m: MagazineRetirable, total: number): { ok: true } | { ok: false; raison: string } {
  if (total <= 1) return { ok: false, raison: RAISON_DERNIER_MAGAZINE };
  if (m.id !== null && !m.vide) return { ok: false, raison: RAISON_MAGAZINE_COMMENCE };
  return { ok: true };
}

/** La liste sans la ligne `i` (si elle se retire) : les suivantes remontent d'un rang. */
export function retirerMagazine<T extends MagazineRetirable>(liste: T[], i: number): T[] {
  const m = liste[i];
  if (!m || !retraitMagazine(m, liste.length).ok) return liste;
  return liste.filter((_, j) => j !== i);
}

export type EtiquetteMagazine = { texte: string; ton: "vide" | "fait" | "en_cours" };

/** Ce que la ligne d'un magazine montre en réglages : « vide », ou où en est le client. */
export function etiquetteMagazine(m: {
  vide: boolean;
  brief_valide_le: string | null;
  bat_valide_le: string | null;
  toursPublies: number;
  briefCommence: boolean;
}): EtiquetteMagazine {
  if (m.vide) return { texte: "vide", ton: "vide" };
  if (m.bat_valide_le) return { texte: "bon à tirer validé", ton: "fait" };
  if (m.toursPublies > 0) return { texte: `${m.toursPublies} tour${m.toursPublies > 1 ? "s" : ""} publié${m.toursPublies > 1 ? "s" : ""}`, ton: "en_cours" };
  if (m.brief_valide_le) return { texte: "brief validé", ton: "fait" };
  if (m.briefCommence) return { texte: "brief commencé", ton: "en_cours" };
  return { texte: "tour en préparation", ton: "en_cours" };
}

/**
 * Les rangs resserrés 1, 2, 3… dans l'ordre actuel : seulement ceux qui changent,
 * du plus petit au plus grand. Appliqués UN PAR UN dans cet ordre, ils ne heurtent
 * jamais `unique (edition_id, rang)` : chaque magazine DESCEND (son nouveau rang
 * est au plus l'ancien) et la place qu'il prend vient d'être libérée par un retrait
 * ou par le magazine d'avant.
 */
export function resserrerRangs(restants: { id: string; rang: number }[]): { id: string; rang: number }[] {
  return [...restants]
    .sort((a, b) => a.rang - b.rang)
    .map((m, i) => ({ id: m.id, avant: m.rang, rang: i + 1 }))
    .filter((m) => m.rang !== m.avant)
    .map(({ id, rang }) => ({ id, rang }));
}

export type PlanMagazines =
  | {
      ok: true;
      renommer: { id: string; nom: string }[];
      /** À appliquer APRÈS les retraits, dans l'ordre (`resserrerRangs`). */
      renumeroter: { id: string; rang: number }[];
      ajouter: { rang: number; nom: string }[];
      retirer: string[];
    }
  | { ok: false; message: string; /** Un magazine commencé : 409, pas une saisie fautive. */ conflit?: boolean };

/**
 * Ce que le formulaire demande, face à ce qui existe.
 *
 * Renommer : toujours. Ajouter : à la suite. Retirer : n'importe quel magazine
 * ENCORE VIDE ; les suivants descendent d'un rang (`resserrerRangs`). Refusé :
 * retirer un magazine commencé (`conflit`), changer l'ordre, un nouveau glissé
 * entre deux anciens, un id d'une autre édition ou demandé deux fois.
 */
export function planMagazines(actuels: MagazineActuel[], demandes: MagazineSaisi[]): PlanMagazines {
  const tries = [...actuels].sort((a, b) => a.rang - b.rang);
  const parId = new Map(tries.map((m) => [m.id, m]));

  for (const d of demandes) {
    if (d.id && !parId.has(d.id)) return { ok: false, message: "Un magazine demandé n'appartient pas à cette édition." };
  }
  const gardes = demandes.filter((d) => d.id).map((d) => d.id as string);
  const nouveaux = demandes.filter((d) => !d.id);
  if (new Set(gardes).size !== gardes.length) return { ok: false, message: "Un magazine est demandé deux fois." };

  /* Les magazines gardés restent dans leur ordre, et les nouveaux viennent après eux. */
  const ordre = tries.filter((m) => gardes.includes(m.id)).map((m) => m.id);
  if (ordre.join() !== gardes.join()) return { ok: false, message: "L'ordre des magazines ne se change pas." };
  const premierNouveau = demandes.findIndex((d) => !d.id);
  if (premierNouveau !== -1 && demandes.slice(premierNouveau).some((d) => d.id)) {
    return { ok: false, message: "Un nouveau magazine s'ajoute à la suite des autres." };
  }

  const retires = tries.filter((m) => !gardes.includes(m.id));
  const commence = retires.find((m) => !m.vide);
  if (commence) {
    return {
      ok: false,
      conflit: true,
      message: `« ${commence.nom} » : le client a commencé ce magazine, il ne se retire pas. Changez son nom si besoin.`,
    };
  }

  const restants = tries.filter((m) => gardes.includes(m.id));
  const renommer = demandes
    .filter((d) => d.id && parId.get(d.id)!.nom !== d.nom)
    .map((d) => ({ id: d.id as string, nom: d.nom }));
  const ajouter = nouveaux.map((d, i) => ({ rang: restants.length + i + 1, nom: d.nom }));

  return { ok: true, renommer, renumeroter: resserrerRangs(restants), ajouter, retirer: retires.map((m) => m.id) };
}
