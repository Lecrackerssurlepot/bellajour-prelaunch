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
import { lireSuivi } from "./suivi";

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
  /* T2-2 — LE format de dépôt : la couverture à plat (C4 | dos | C1), telle
     que Canva l'exporte. S'il est fourni, il gagne : c1/c4 sont ignorés.
     Les deux cadres séparés restent acceptés pour corriger un dossier
     publié avant ce format. */
  apercu_plat?: string | null;
  apercu_c1?: string | null;
  apercu_c4?: string | null;
  apercu_double?: string | null;
  /* T-090 — la liste ORDONNÉE des doubles pages (0 à trois), clés du coffre,
     telles que l'atelier les a montées et rangées. Ne vaut que pour le format
     à plat ; le trio historique garde sa `double` unique. Elle arrive en
     tableau depuis le navigateur. */
  apercu_doubles?: string[];
  canva_url?: string | null;
  maquette_pdf_url?: string | null;
  /* Les PDF print-ready, clés du coffre. Le produit décide desquels il a
     besoin (impression.ts) : `pdf_produit` seul pour l'agrafé,
     `pdf_couverture` + `pdf_interieur` pour le dos carré. */
  pdf_produit?: string | null;
  pdf_couverture?: string | null;
  pdf_interieur?: string | null;
  transporteur?: string | null;
  /** Un numéro de suivi OU une adresse : les deux sont acceptés (suivi.ts). */
  tracking_url?: string | null;
  /* T2-3 — le mot facultatif de l'atelier sur « Demander plus de photos ».
     Il part dans M9 (param MOT), jamais en base : ce n'est pas une colonne. */
  mot?: string | null;
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
   * Ce qu'il faut savoir sur les mails de cette étape, quand la règle ne
   * suffit pas à le dire.
   *
   * ⚠️ LE MAIL QUI PART N'EST PAS DÉCLARÉ ICI. Il est DÉRIVÉ de `codesPour`
   * (mails.ts) au moment du rendu, en projetant le dossier dans son état
   * d'arrivée. Une déclaration à la main créait une seconde vérité, et elle
   * mentait déjà sur trois actions : « Envoyer à l'impression » annonçait M6
   * alors qu'il était parti à la validation, « Marquer livrée » annonçait M8
   * alors qu'il part trois jours plus tard, et « Corriger l'aperçu »
   * annonçait « aucun » alors qu'une relance pouvait partir.
   *
   * Ce champ ne sert donc qu'à EXPLIQUER, jamais à promettre.
   */
  note?: string;
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
    note: "Elle découvre son prix et peut payer dans la foulée.",
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
    note: "Le mail d'annonce ne repart pas : il est déjà parti. Une relance peut en revanche être due si elle n'a toujours pas payé.",
    surPlace: true,
  },

  photos_insuffisantes: {
    cle: "photos_insuffisantes",
    libelle: "Demander plus de photos",
    explication:
      "Sa page lui propose de reprendre le dépôt. Le dossier revient ici dès qu'elle a rajouté ses photos.",
    de: ["photos_recues"],
    vers: "photos_insuffisantes",
    note: "Ses photos déjà déposées sont conservées.",
  },

  /* Depuis « payee » : la première publication. Depuis « maquette_prete » :
     la REpublication après des retouches (T2-13) — même écran, même saisie,
     et l'échéance d'auto-validation repart de zéro puisque `etat_maj_le` est
     réécrit par la route. La suspension posée par « j'ai demandé des
     retouches » est levée dans le patch, ici même (module pur). */
  publier_maquette: {
    cle: "publier_maquette",
    libelle: "Publier la maquette",
    explication:
      "Elle découvre le numéro complet et le bouton « Tout est bon, imprimez ». Rien ne part à l'impression avant.",
    de: ["payee", "maquette_prete"],
    vers: "maquette_prete",
    note: "L'échéance d'auto-validation à J+7 part de maintenant. Republier après des retouches lève leur suspension.",
  },

  envoyer_impression: {
    cle: "envoyer_impression",
    libelle: "Envoyer à l'impression",
    explication:
      "Passe la commande chez l'imprimeur : le PDF et l'adresse de livraison partent chez Cloudprinter. Le suivi arrivera tout seul.",
    de: ["validee"],
    vers: "en_production",
    note: "Elle a déjà été prévenue au moment où elle a validé : rien de nouveau ne part ici.",
  },

  marquer_expediee: {
    cle: "marquer_expediee",
    libelle: "Marquer expédiée",
    explication: "Affiche le transporteur et le lien de suivi sur sa page.",
    de: ["en_production"],
    vers: "expediee",
    note: "Le suivi apparaît aussi sur sa page.",
  },

  marquer_livree: {
    cle: "marquer_livree",
    libelle: "Marquer livrée",
    explication: "Clôt le numéro et lui propose le prochain moment.",
    de: ["expediee"],
    vers: "livree",
    note: "Le message « et le prochain moment ? » part trois jours plus tard, pas maintenant.",
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
      /** Paramètres de template en PLUS de `parametresPour` (T2-3 : le MOT
          de M9). Jamais dans `patch` — rien de tout ça n'est une colonne. */
      params?: Record<string, string>;
    }
  | { ok: false; erreurs: Erreur[] };

function texte(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/* T-090 — les doubles pages d'une planche, telles que l'atelier les a montées :
   des clés de coffre, dans l'ordre, les vides ignorées. Bornées à trois — c'est
   MAX_DOUBLES (apercu.ts), redit ici plutôt qu'importé pour garder ce module
   PUR (apercu.ts importe r2, donc l'environnement). Le lecteur borne de nouveau
   à la résolution : ceci est l'hygiène d'écriture, pas la seule garde. */
const MAX_DOUBLES_ADMIN = 3;
function doublesDeSaisie(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, 600))
    .slice(0, MAX_DOUBLES_ADMIN);
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

    /* ── les visuels ──────────────────────────────────────────────────
       Clé d'objet du coffre (dépôt depuis /admin) ou adresse absolue :
       `resoudreApercu` sait lire les deux. Une page qui vend avec un cadre
       vide ne vend pas — tout ce que le format choisi exige est obligatoire.

       T2-2 / T-090 : le format normal est LA PLANCHE À PLAT (C4 | dos | C1,
       un seul fichier, l'export naturel de Canva) plus 0 à trois doubles
       pages. La page cliente découpe les deux faces de la planche en CSS et la
       loupe montre l'objet entier — une vraie couverture qu'on retourne. Zéro
       double page est permis (décision de Mathias, 02/09) : une planche seule
       est publiable, la visionneuse montre alors ses trois faces. Le trio
       historique c1 + c4 + double reste accepté UNIQUEMENT pour corriger un
       dossier publié avant ce format : si `apercu_plat` est fourni, il gagne
       et c1/c4 sont ignorés (jamais de mélange des deux formats en base). */
    const plat = texte(saisie.apercu_plat, 600);

    if (plat) {
      /* Les doubles pages dans l'ordre monté par l'atelier. On n'écrit la clé
         `doubles` que s'il y en a : une liste vide ne dit rien en base, et la
         planche seule reste un aperçu complet. */
      const doubles = doublesDeSaisie(saisie.apercu_doubles);
      patch.apercu_urls = { plat, ...(doubles.length ? { doubles } : {}) };
    } else {
      const visuels: Array<[keyof Saisie, string, string]> = [
        ["apercu_c1", "c1", "la couverture à plat (ou, à défaut, la première de couverture)"],
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

    /* T2-13 : publier (ou republier) la maquette lève la suspension posée
       par « j'ai demandé des retouches ». L'échéance J+7 repart avec le
       `etat_maj_le` que la route ajoute au patch. */
    patch.retouches_demandees_le = null;
  }

  if (cle === "envoyer_impression") {
    /* ── les PDF print-ready ──────────────────────────────────────────
       Des clés du coffre, JAMAIS des adresses externes : Cloudprinter exige
       l'empreinte md5 de chaque fichier, et on ne sait la donner que pour un
       objet qui est à nous (son ETag). LESQUELS sont requis dépend du
       produit, donc de la pagination — que ce module ne connaît pas : la
       route complète le contrôle (fichiers requis + présence au coffre),
       comme elle vérifie déjà le coffre des aperçus. Ici : au moins un
       fichier, et chacun est une clé sûre.
       ⚠️ Ces fichiers ne sont PAS `maquette_pdf_url` (le feuilletable de la
       cliente) : l'un se regarde, les autres s'impriment. */
    const fournis: Array<[string, string]> = [];
    for (const [champ, cleJson] of [
      ["pdf_produit", "product"],
      ["pdf_couverture", "cover"],
      ["pdf_interieur", "book"],
    ] as const) {
      const v = texte(saisie[champ], 600);
      if (!v) continue;
      if (/^https?:\/\//i.test(v) || v.includes("..")) {
        erreurs.push({
          champ,
          message: "Dépose le PDF dans le coffre : un lien externe ne peut pas partir à l'impression.",
        });
      } else {
        fournis.push([cleJson, v]);
      }
    }
    if (!fournis.length && !erreurs.length) {
      erreurs.push({ champ: "pdf_produit", message: "Dépose le ou les PDF d'impression." });
    }
    if (fournis.length) patch.impression_fichiers = Object.fromEntries(fournis);
    /* `cloudprinter_order_id` n'est PAS posé ici : la commande est un appel
       réseau, et ce module n'en fait aucun. La route l'ajoute au patch une
       fois la commande passée, comme elle ajoute `etat_maj_le`. */
  }

  if (cle === "marquer_expediee") {
    const t = texte(saisie.transporteur, 80);
    if (!t) erreurs.push({ champ: "transporteur", message: "Indique le transporteur." });
    else patch.transporteur = t;

    /* Le champ accepte les DEUX formes, parce que c'est ce qu'un transporteur
       donne : un numéro le plus souvent, une adresse parfois. Un numéro seul
       devient un lien quand on connaît le transporteur (suivi.ts), et reste
       de toute façon écrit sur la page de la cliente. C'est le même chemin
       que celui du webhook Cloudprinter : une seule règle de suivi, valable
       que le colis parte tout seul ou à la main.
       Un numéro de suivi ne contient ni « : » ni « / » : ce qui en porte est
       une adresse, et une adresse doit être sûre (un `javascript:` recopié
       par mégarde finirait cliquable chez une cliente). */
    const brut = texte(saisie.tracking_url, 600);
    if (brut && /[:/]/.test(brut) && !estUrlSure(brut)) {
      erreurs.push({
        champ: "tracking_url",
        message: "Ce lien n'est pas une adresse valide. Le numéro de suivi seul suffit.",
      });
    } else if (brut && t) {
      const suivi = lireSuivi(t, brut);
      /* Le transporteur reste ÉCRIT COMME L'ATELIER L'A TAPÉ : suivi.ts sert
         ici à construire le lien, pas à corriger l'orthographe de personne. */
      patch.tracking_url = suivi.url;
      patch.tracking_code = suivi.code;
    }
  }

  /* T2-3 — le mot de l'atelier, facultatif, sur « Demander plus de photos ».
     Le cas réel : le problème était la QUALITÉ des photos, pas leur nombre —
     le mail générique tombait à côté. Le mot part dans M9 (encart « Un mot
     de l'atelier ») ; des espaces seuls ne sont pas un mot. */
  let params: Record<string, string> | undefined;
  if (cle === "photos_insuffisantes") {
    const mot = texte(saisie.mot, 500);
    if (mot) params = { MOT: mot };
  }

  if (erreurs.length) return { ok: false, erreurs };

  if (!action.surPlace) patch.etat = action.vers;

  return { ok: true, action, patch, resume, ...(params ? { params } : {}) };
}
