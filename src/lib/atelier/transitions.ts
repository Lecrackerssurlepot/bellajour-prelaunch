/**
 * La machine à états de l'atelier, en UNE table (PRD §6).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI UNE TABLE ET PAS SIX ROUTES
 *
 * Six actions, c'était six routes qui font toutes la même chose : vérifier
 * l'état de départ, valider des champs, écrire, journaliser, envoyer un mail.
 * Six fois la même séquence, c'est six occasions d'oublier l'invariant nº6
 * (« chaque transition d'état écrit dans `evenements` »).
 *
 * Ici la séquence est écrite UNE fois dans /api/admin/atelier/transition, et
 * ce fichier ne dit QUE ce qui change d'une action à l'autre. Ajouter une
 * action, c'est ajouter une entrée — pas un fichier.
 *
 * Ce module est PUR : aucun accès base, aucun réseau, aucune variable
 * d'environnement. Tout y est testable au clavier.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { palierPourPages, eurosPour, type PalierCle } from "./prix";

export type Etat =
  | "photos_recues"
  | "photos_insuffisantes"
  | "apercu_pret"
  | "payee"
  | "maquette_prete"
  | "validee"
  | "en_production"
  | "expediee"
  | "livree";

export const ETATS: Etat[] = [
  "photos_recues",
  "photos_insuffisantes",
  "apercu_pret",
  "payee",
  "maquette_prete",
  "validee",
  "en_production",
  "expediee",
  "livree",
];

/** Le mot que l'atelier lit à l'écran. Jamais l'énum brute de la base. */
export const LIBELLE_ETAT: Record<Etat, string> = {
  photos_recues: "Photos reçues",
  photos_insuffisantes: "Photos insuffisantes",
  apercu_pret: "Aperçu publié",
  payee: "Payée",
  maquette_prete: "Maquette prête",
  validee: "Validée",
  en_production: "En production",
  expediee: "Expédiée",
  livree: "Livrée",
};

/** Le numéro d'étape du PRD §6 — repère commun avec le document. */
export const ETAPE_ETAT: Record<Etat, string> = {
  photos_recues: "1",
  photos_insuffisantes: "1b",
  apercu_pret: "2",
  payee: "3",
  maquette_prete: "4",
  validee: "5",
  en_production: "6",
  expediee: "7",
  livree: "8",
};

export type ActionCle =
  | "publier_apercu"
  | "corriger_apercu"
  | "photos_insuffisantes"
  | "publier_maquette"
  | "envoyer_impression"
  | "marquer_expediee"
  | "marquer_livree";

/* Ce que l'atelier saisit à l'écran. Toutes les valeurs arrivent en texte du
   navigateur : la conversion et le contrôle se font ICI, une seule fois. */
export type Saisie = {
  nb_pages?: string | number | null;
  apercu_c1?: string | null;
  apercu_c4?: string | null;
  apercu_double?: string | null;
  canva_url?: string | null;
  maquette_pdf_url?: string | null;
  transporteur?: string | null;
  tracking_url?: string | null;
};

export type Action = {
  cle: ActionCle;
  /** Le bouton, tel qu'il est écrit à l'écran (PRD §12). */
  libelle: string;
  /** Ce que ça fait, en une phrase, sous le bouton. */
  explication: string;
  /** Les seuls états depuis lesquels l'action est acceptée. */
  de: Etat[];
  vers: Etat;
  /**
   * Le mail que cette étape déclenche (PRD §10). `null` = aucun mail prévu.
   *
   * ⚠️ On ne dit PAS ici si le mail partira vraiment : ça dépend de la
   * présence du template Brevo dans l'environnement, qui change sans que ce
   * fichier bouge. C'est `donnees.ts` qui interroge `templateExiste()` au
   * moment du rendu et remplit `absent`. Un drapeau écrit en dur mentirait le
   * jour où la variable arrive — ou pire, le jour où elle disparaît.
   */
  mail: { code: string } | null;
  /** Une transition « sur place » ne rejournalise pas un changement d'état. */
  surPlace?: boolean;
};

export const ACTIONS: Record<ActionCle, Action> = {
  publier_apercu: {
    cle: "publier_apercu",
    libelle: "Publier l'aperçu",
    explication:
      "Ouvre la page qui vend : elle découvre sa couverture, son nombre de pages et son prix, et peut payer.",
    de: ["photos_recues", "photos_insuffisantes"],
    vers: "apercu_pret",
    mail: { code: "M3" },
  },

  /* Corriger sans refaire l'histoire. Une coquille dans la pagination ou une
     couverture à remplacer arrive APRÈS la publication, donc depuis l'état 2 :
     sans cette entrée, il faudrait repasser en base à la main, ce que ce lot
     est précisément censé supprimer. Le mail ne repart pas (le verrou de
     `mails_envoyes` s'en charge) et l'état ne bouge pas. */
  corriger_apercu: {
    cle: "corriger_apercu",
    libelle: "Corriger l'aperçu",
    explication:
      "Remplace les visuels ou la pagination d'un aperçu déjà publié. Le prix suit. Aucun mail n'est renvoyé.",
    de: ["apercu_pret"],
    vers: "apercu_pret",
    mail: null,
    surPlace: true,
  },

  photos_insuffisantes: {
    cle: "photos_insuffisantes",
    libelle: "Demander plus de photos",
    explication:
      "Sa page lui propose de reprendre le dépôt. Le dossier revient ici dès qu'elle a rajouté ses photos.",
    de: ["photos_recues"],
    vers: "photos_insuffisantes",
    mail: { code: "M9" },
  },

  publier_maquette: {
    cle: "publier_maquette",
    libelle: "Publier la maquette",
    explication:
      "Elle découvre le numéro complet et le bouton « Tout est bon, imprimez ». Rien ne part à l'impression avant.",
    de: ["payee"],
    vers: "maquette_prete",
    mail: { code: "M5" },
  },

  envoyer_impression: {
    cle: "envoyer_impression",
    libelle: "Envoyer à l'impression",
    explication:
      "À faire une fois la commande passée chez l'imprimeur. Le numéro de suivi se saisit à l'étape suivante.",
    de: ["validee"],
    vers: "en_production",
    mail: { code: "M6" },
  },

  marquer_expediee: {
    cle: "marquer_expediee",
    libelle: "Marquer expédiée",
    explication: "Affiche le transporteur et le lien de suivi sur sa page.",
    de: ["en_production"],
    vers: "expediee",
    mail: { code: "M7" },
  },

  marquer_livree: {
    cle: "marquer_livree",
    libelle: "Marquer livrée",
    explication: "Clôt le numéro et lui propose le prochain moment.",
    de: ["expediee"],
    vers: "livree",
    mail: { code: "M8" },
  },
};

/** Les actions proposées depuis un état — l'écran n'affiche que celles-là. */
export function actionsDepuis(etat: Etat): Action[] {
  return Object.values(ACTIONS).filter((a) => a.de.includes(etat));
}

/* ─────────────────────────── la préparation ─────────────────────────── */

export type Erreur = { champ: string; message: string };

export type Preparation =
  | {
      ok: true;
      action: Action;
      /** Les colonnes de `numeros` à écrire. `etat_maj_le` est ajouté par la route. */
      patch: Record<string, unknown>;
      /** Ce que l'écran de confirmation annonce (jamais recalculé ailleurs). */
      resume: { nbPages?: number; palier?: PalierCle; euros?: number };
    }
  | { ok: false; erreurs: Erreur[] };

function texte(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/* Une adresse collée depuis Canva ou un transporteur. On refuse tout ce qui
   n'est pas http(s) : un `javascript:` recopié par mégarde finirait cliquable
   sur la page d'une cliente. */
function estUrlSure(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Valide une saisie et rend les colonnes à écrire — ou la liste de ce qui
 * manque, champ par champ, pour que l'écran le dise à l'endroit exact.
 *
 * Ne fait AUCUNE écriture : la route décide, cette fonction juge.
 */
export function preparerTransition(
  cle: ActionCle,
  etatCourant: Etat,
  saisie: Saisie
): Preparation {
  const action = ACTIONS[cle];
  if (!action) return { ok: false, erreurs: [{ champ: "action", message: "Action inconnue." }] };

  if (!action.de.includes(etatCourant)) {
    return {
      ok: false,
      erreurs: [
        {
          champ: "etat",
          message: `« ${action.libelle} » n'est pas possible depuis « ${LIBELLE_ETAT[etatCourant]} ».`,
        },
      ],
    };
  }

  const erreurs: Erreur[] = [];
  const patch: Record<string, unknown> = {};
  const resume: { nbPages?: number; palier?: PalierCle; euros?: number } = {};

  if (cle === "publier_apercu" || cle === "corriger_apercu") {
    /* ── la pagination, donc le prix ──────────────────────────────────
       C'est le SEUL nombre saisi de tout le back-office, et il décide du
       montant débité. Hors grille, on refuse : `palierPourPages` rendrait
       null, la page d'état 2 afficherait une couverture sans prix et M3
       partirait sans montant. Un UPDATE à la main passe ce mur sans le voir
       — c'est exactement ce qu'on vient supprimer. */
    const brut = typeof saisie.nb_pages === "number" ? saisie.nb_pages : Number(texte(saisie.nb_pages, 8));
    if (!Number.isInteger(brut) || brut <= 0) {
      erreurs.push({ champ: "nb_pages", message: "Indique le nombre de pages composées." });
    } else {
      const palier = palierPourPages(brut);
      if (!palier) {
        erreurs.push({
          champ: "nb_pages",
          message: `${brut} pages : hors grille (20 à 50 pages). Rien ne peut être facturé.`,
        });
      } else {
        patch.nb_pages = brut;
        patch.palier = palier;
        resume.nbPages = brut;
        resume.palier = palier;
        resume.euros = eurosPour(palier) ?? undefined;
      }
    }

    /* ── les trois visuels ────────────────────────────────────────────
       Clé d'objet du coffre (dépôt depuis /admin) ou adresse absolue :
       `resoudreApercu` sait lire les deux. Les trois sont obligatoires —
       une page qui vend avec un cadre vide ne vend pas. */
    const visuels: Array<[keyof Saisie, string, string]> = [
      ["apercu_c1", "c1", "la première de couverture"],
      ["apercu_c4", "c4", "la quatrième de couverture"],
      ["apercu_double", "double", "la double page"],
    ];
    const apercu: Record<string, string> = {};
    for (const [champ, cleJson, nom] of visuels) {
      const v = texte(saisie[champ], 600);
      if (!v) erreurs.push({ champ, message: `Il manque ${nom}.` });
      else apercu[cleJson] = v;
    }
    if (Object.keys(apercu).length === 3) patch.apercu_urls = apercu;
  }

  if (cle === "publier_maquette") {
    /* Le lien PARTAGÉ, celui qui part chez la cliente. Le PRD §11 est
       catégorique : en commentaire, jamais en édition. Le lien de travail
       interne ne passe pas par ici et n'est jamais envoyé. */
    const canva = texte(saisie.canva_url, 600);
    if (!canva) erreurs.push({ champ: "canva_url", message: "Colle le lien Canva à partager (mode commentaire)." });
    else if (!estUrlSure(canva)) erreurs.push({ champ: "canva_url", message: "Ce lien n'est pas une adresse valide." });
    else patch.canva_url = canva;

    const pdf = texte(saisie.maquette_pdf_url, 600);
    if (pdf && !estUrlSure(pdf)) {
      erreurs.push({ champ: "maquette_pdf_url", message: "Ce lien n'est pas une adresse valide." });
    } else if (pdf) {
      patch.maquette_pdf_url = pdf;
    }
  }

  if (cle === "marquer_expediee") {
    const t = texte(saisie.transporteur, 80);
    if (!t) erreurs.push({ champ: "transporteur", message: "Indique le transporteur." });
    else patch.transporteur = t;

    const suivi = texte(saisie.tracking_url, 600);
    if (suivi && !estUrlSure(suivi)) {
      erreurs.push({ champ: "tracking_url", message: "Ce lien n'est pas une adresse valide." });
    } else if (suivi) {
      patch.tracking_url = suivi;
    }
  }

  if (erreurs.length) return { ok: false, erreurs };

  if (!action.surPlace) patch.etat = action.vers;

  return { ok: true, action, patch, resume };
}
