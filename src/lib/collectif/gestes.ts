/**
 * La machine à états de l'Édition collective, en UNE table (PRD §3.1).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Même doctrine que `src/lib/atelier/transitions.ts` : les routes écrivent la
 * séquence une fois (vérifier, écrire, journaliser), ce fichier ne dit QUE ce
 * qui change d'un geste à l'autre. Ajouter un geste = ajouter une entrée.
 *
 * Trois règles que la table porte et qu'aucun écran ne doit redire :
 * 1. On juge sur l'état EFFECTIF (etats.ts), jamais sur la colonne brute :
 *    une édition dont la clôture est passée est en composition, même si la
 *    base dit encore préparation.
 * 2. `qui` n'est pas déclaré ici : il vient de la matrice `DROITS` par
 *    l'action du geste. Une seule liste de droits.
 * 3. Une édition archivée ne bouge plus, sauf pour être désarchivée.
 */

import { lireSuivi } from "@/lib/atelier/suivi";
import { DROITS, type Action } from "./droits";
import { etatEffectif, LIBELLE_ETAT_EDITION, lireInstant, type EtatEdition } from "./etats";
import type { Livraison, Role } from "./types";

export type GesteCle =
  | "clore_collecte"
  | "rouvrir_collecte"
  | "publier_tour"
  | "valider_bat"
  | "lancer_impression"
  | "marquer_expediee"
  | "marquer_livree"
  | "archiver"
  | "desarchiver";

export type Geste = {
  cle: GesteCle;
  /** Le bouton, tel qu'il est écrit à l'écran. */
  libelle: string;
  /** Ce que ça fait, en une phrase, sous le bouton. */
  explication: string;
  /** L'action de la matrice des droits : c'est elle qui dit QUI. */
  action: Action;
  /** Les états EFFECTIFS depuis lesquels le geste est accepté. */
  de: readonly EtatEdition[];
  /**
   * L'état d'arrivée. `derive` : il dépend des autres magazines (valider le
   * BAT du dernier fait passer l'édition en `bat_valide`). `inchange` : un
   * marqueur (archive), l'état ne bouge pas.
   */
  vers: EtatEdition | "derive" | "inchange";
  /** Confirmé en deux gestes à l'écran, comme l'admin B2C. */
  deuxTemps: boolean;
};

const TOUS: readonly EtatEdition[] = [
  "preparation",
  "composition",
  "bat",
  "bat_valide",
  "impression",
  "expediee",
  "livree",
];

export const GESTES: Record<GesteCle, Geste> = {
  clore_collecte: {
    cle: "clore_collecte",
    libelle: "Clore maintenant",
    explication:
      "Ferme le lien participants tout de suite et fait passer l'édition en composition. La date de clôture devient maintenant.",
    action: "regler_edition",
    de: ["preparation"],
    vers: "composition",
    deuxTemps: true,
  },

  /* La fiche maquettée le montre (« Rouvrir la collecte ») : une date mal
     saisie, un photographe en retard. Pas une fois un tour publié : le client
     relit déjà un bon à tirer composé sur ces photos-là. */
  rouvrir_collecte: {
    cle: "rouvrir_collecte",
    libelle: "Rouvrir la collecte",
    explication:
      "Rouvre le lien participants jusqu'à la nouvelle date de clôture. Impossible dès qu'un bon à tirer a été publié.",
    action: "regler_edition",
    de: ["composition"],
    vers: "preparation",
    deuxTemps: true,
  },

  /* Composition → bon à tirer à la publication du PREMIER tour d'au moins un
     magazine (PRD §3.1). Les suivants laissent l'état en `bat`. Le tour
     lui-même (publie_le) est écrit par la route : ce geste ne dit que ce que
     devient l'ÉDITION. */
  publier_tour: {
    cle: "publier_tour",
    libelle: "Publier le tour",
    explication:
      "Le client voit ce tour dans « Bon à tirer » et peut l'annoter. Un tour publié est figé : un nouveau PDF fera un nouveau tour.",
    action: "deposer_tour",
    de: ["composition", "bat"],
    vers: "bat",
    deuxTemps: true,
  },

  valider_bat: {
    cle: "valider_bat",
    libelle: "Valider le bon à tirer",
    explication:
      "La validation est définitive. Elle confirme le tirage prévu et lance l'impression de ce magazine.",
    action: "valider_bat",
    de: ["bat"],
    vers: "derive",
    deuxTemps: true,
  },

  lancer_impression: {
    cle: "lancer_impression",
    libelle: "Lancer l'impression",
    explication: "Tous les magazines sont validés : l'édition part chez l'imprimeur.",
    action: "regler_edition",
    de: ["bat_valide"],
    vers: "impression",
    deuxTemps: true,
  },

  marquer_expediee: {
    cle: "marquer_expediee",
    libelle: "Marquer expédiée",
    explication: "Affiche le transporteur et le lien de suivi dans l'espace du client.",
    action: "saisir_livraison",
    de: ["impression"],
    vers: "expediee",
    deuxTemps: false,
  },

  marquer_livree: {
    cle: "marquer_livree",
    libelle: "Marquer livrée",
    explication: "Clôt l'édition.",
    action: "saisir_livraison",
    de: ["expediee"],
    vers: "livree",
    deuxTemps: false,
  },

  /* Un marqueur, pas un état (patron de `numeros.archive_le`). */
  archiver: {
    cle: "archiver",
    libelle: "Archiver",
    explication:
      "Retire l'édition de la liste. Ses liens répondent comme un lien inconnu. Rien n'est effacé.",
    action: "regler_edition",
    de: TOUS,
    vers: "inchange",
    deuxTemps: true,
  },

  desarchiver: {
    cle: "desarchiver",
    libelle: "Récupérer",
    explication: "Remet l'édition dans la liste et rouvre ses liens.",
    action: "regler_edition",
    de: TOUS,
    vers: "inchange",
    deuxTemps: false,
  },
};

export function quiPour(cle: GesteCle): readonly Role[] {
  return DROITS[GESTES[cle].action];
}

/* ─────────────────────────────── la préparation ─────────────────────────────── */

export type Erreur = { champ: string; message: string };

/** Ce que le geste doit savoir d'un magazine, déjà lu par la route. */
export type MagazinePourGeste = {
  id: string;
  rang: number;
  bat_valide_le: string | null;
  couverture_choisie_id: string | null;
  couverture_sans_preference: boolean;
  /** Combien de tours PUBLIÉS. */
  toursPublies: number;
};

export type ContexteGeste = {
  role: Role;
  /** L'état STOCKÉ ; l'état effectif est recalculé ici. */
  etat: EtatEdition;
  clotureLe: string | null;
  archiveLe: string | null;
  maintenant: Date;
  magazines: readonly MagazinePourGeste[];
  /** Le magazine visé (publier_tour, valider_bat). */
  magazineId?: string | null;
  /** Ce que l'atelier a saisi à l'écran, en texte brut. */
  saisie?: {
    cloture_le?: unknown;
    transporteur?: unknown;
    suivi?: unknown;
  };
};

export type Preparation =
  | {
      ok: true;
      geste: Geste;
      /** L'état d'arrivée (égal à l'état effectif pour un marqueur). */
      vers: EtatEdition;
      /** Les colonnes de `collectif_editions` à écrire. */
      patch: Record<string, unknown>;
      /** Les clés de `livraison` à FUSIONNER dans le jsonb existant (jamais remplacer). */
      livraison?: Partial<Livraison>;
      /** Le magazine visé et ses colonnes à écrire. */
      magazine?: { id: string; patch: Record<string, unknown> };
    }
  | { ok: false; erreurs: Erreur[] };

function refus(champ: string, message: string): Preparation {
  return { ok: false, erreurs: [{ champ, message }] };
}

function texte(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * Le geste est-il permis, et qu'écrit-il ?
 *
 * L'ordre des refus est volontaire : d'abord QUI (un lien d'équipe n'apprend
 * rien de l'état d'une édition), puis l'archive, puis l'état, puis la saisie.
 */
export function preparerGeste(cle: GesteCle, ctx: ContexteGeste): Preparation {
  const geste = GESTES[cle];
  if (!geste) return refus("geste", "Geste inconnu.");

  if (!quiPour(cle).includes(ctx.role)) {
    return refus("role", "Ce geste n'est pas permis depuis ce lien.");
  }

  if (cle === "desarchiver") {
    if (!ctx.archiveLe) return refus("archive", "L'édition n'est pas archivée.");
    const actuel = etatEffectif(ctx.etat, ctx.clotureLe, ctx.maintenant);
    return { ok: true, geste, vers: actuel, patch: { archive_le: null } };
  }
  if (ctx.archiveLe) return refus("archive", "L'édition est archivée. La récupérer d'abord.");

  const actuel = etatEffectif(ctx.etat, ctx.clotureLe, ctx.maintenant);
  if (!geste.de.includes(actuel)) {
    return refus(
      "etat",
      `Impossible depuis l'état « ${LIBELLE_ETAT_EDITION[actuel]} ».`
    );
  }

  const iso = ctx.maintenant.toISOString();
  /* Toute arrivée dans un autre état réaligne la base ET date le passage.
     Écrit même quand la colonne brute dit déjà la même chose qu'`actuel`
     (préparation passée en composition à la lecture) : c'est ce réalignement
     qui fait que la base finit par dire vrai. */
  const changement = (vers: EtatEdition): Record<string, unknown> =>
    vers === ctx.etat ? {} : { etat: vers, etat_maj_le: iso };

  switch (cle) {
    case "clore_collecte":
      return {
        ok: true,
        geste,
        vers: "composition",
        /* La date de clôture devient maintenant : c'est elle que lit le lien
           participants, une seule source pour « la collecte est-elle ouverte ». */
        patch: { etat: "composition", etat_maj_le: iso, cloture_le: iso },
      };

    case "rouvrir_collecte": {
      if (ctx.magazines.some((m) => m.toursPublies > 0)) {
        return refus("tours", "Un bon à tirer a déjà été publié : la collecte ne peut plus rouvrir.");
      }
      /* ISO avec fuseau seulement (lireInstant) : « le 20 » ne se devine pas. */
      const t = lireInstant(ctx.saisie?.cloture_le);
      if (t === null) {
        return refus("cloture_le", "Indiquer la nouvelle date de clôture.");
      }
      if (t <= ctx.maintenant.getTime()) {
        return refus("cloture_le", "La nouvelle date de clôture doit être dans le futur.");
      }
      return {
        ok: true,
        geste,
        vers: "preparation",
        patch: { etat: "preparation", etat_maj_le: iso, cloture_le: new Date(t).toISOString() },
      };
    }

    case "publier_tour": {
      const m = ctx.magazines.find((x) => x.id === ctx.magazineId);
      if (!m) return refus("magazine", "Magazine introuvable dans cette édition.");
      if (m.bat_valide_le) {
        return refus("magazine", `Le bon à tirer du magazine ${m.rang} est déjà validé : plus de nouveau tour.`);
      }
      return { ok: true, geste, vers: "bat", patch: changement("bat") };
    }

    case "valider_bat": {
      const m = ctx.magazines.find((x) => x.id === ctx.magazineId);
      if (!m) return refus("magazine", "Magazine introuvable dans cette édition.");
      if (m.bat_valide_le) return refus("magazine", "Ce bon à tirer est déjà validé.");
      if (m.toursPublies < 1) return refus("magazine", "Aucun bon à tirer publié pour ce magazine.");
      /* On n'imprime pas sans savoir quelle couverture. « Sans préférence »
         est une réponse ; le silence n'en est pas une. */
      if (!m.couverture_choisie_id && !m.couverture_sans_preference) {
        return refus(
          "couverture",
          "Choisir une couverture, ou « Sans préférence », avant de valider."
        );
      }
      const resteAValider = ctx.magazines.some((x) => x.id !== m.id && !x.bat_valide_le);
      const vers: EtatEdition = resteAValider ? "bat" : "bat_valide";
      return {
        ok: true,
        geste,
        vers,
        patch: changement(vers),
        magazine: { id: m.id, patch: { bat_valide_le: iso } },
      };
    }

    case "lancer_impression":
      return { ok: true, geste, vers: "impression", patch: changement("impression") };

    case "marquer_expediee": {
      const transporteur = texte(ctx.saisie?.transporteur);
      const suivi = texte(ctx.saisie?.suivi, 500);
      if (!transporteur) return refus("transporteur", "Indiquer le transporteur.");
      if (!suivi) return refus("suivi", "Indiquer le numéro ou le lien de suivi.");
      /* `lireSuivi` (atelier) : jamais de lien approximatif. Un transporteur
         inconnu garde son numéro SANS adresse plutôt qu'avec une fausse. */
      const lu = lireSuivi(transporteur, suivi);
      return {
        ok: true,
        geste,
        vers: "expediee",
        patch: changement("expediee"),
        livraison: { transporteur: lu.transporteur, code: lu.code, url: lu.url, expediee_le: iso },
      };
    }

    case "marquer_livree":
      return {
        ok: true,
        geste,
        vers: "livree",
        patch: changement("livree"),
        livraison: { livree_le: iso },
      };

    case "archiver":
      return { ok: true, geste, vers: actuel, patch: { archive_le: iso } };
  }
}

/** Les gestes qu'un rôle peut tenter depuis un état effectif, pour l'écran. */
export function gestesDepuis(etat: EtatEdition, role: Role): Geste[] {
  return Object.values(GESTES).filter(
    (g) => g.de.includes(etat) && quiPour(g.cle).includes(role) && g.vers !== "inchange"
  );
}

/**
 * Les gestes que la FICHE atelier propose (phase 1). `publier_tour` n'y est
 * pas : un tour se publie depuis son dépôt (phase 5), avec son PDF. Et
 * `valider_bat` appartient au responsable, jamais à l'atelier.
 */
export const GESTES_DE_LA_FICHE: readonly GesteCle[] = [
  "clore_collecte",
  "rouvrir_collecte",
  "lancer_impression",
  "marquer_expediee",
  "marquer_livree",
  "archiver",
  "desarchiver",
];
