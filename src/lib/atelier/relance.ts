/**
 * La relance MANUELLE — celle que l'atelier déclenche lui-même.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI ELLE N'EXISTAIT PAS
 *
 * Jusqu'ici, toutes les relances partaient du seul balayage quotidien
 * (`/api/atelier/mails/relever`, cron à 7 h). Deux conséquences :
 *
 *   1. Personne ne pouvait dire « relance-le maintenant ». Un coup de fil,
 *      une promesse faite de vive voix, un dossier qu'on veut débloquer avant
 *      le week-end : il fallait attendre le lendemain matin.
 *   2. Et surtout, une relance ne partait QU'UNE FOIS. Le verrou de
 *      `mails_envoyes` est unique sur (numero_id, code) : une fois M2b parti,
 *      le client qui reste muet ne reçoit plus jamais rien. Le dossier
 *      s'éteint en silence.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'ON NE FAIT PAS : ÉCRIRE UN NOUVEAU MAIL
 *
 * Le texte des relances existe déjà, il est écrit et il est bon. Ce qui
 * empêchait de le renvoyer n'était pas son contenu, c'était son VERROU. Une
 * relance manuelle emprunte donc le gabarit Brevo du mail automatique
 * correspondant (`MODELE_RELANCE`) et ne se distingue que par son CODE, qui
 * porte le rang : RP1, RP2, RP3.
 *
 * Conséquence directe, et c'est le but : **aucun template Brevo à créer**.
 * Le jour où l'on voudra un texte propre à la deuxième relance, il suffira de
 * pointer RP2 vers un autre gabarit — le reste ne bouge pas.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * TROIS GARDE-FOUS, ET ILS SONT ICI PARCE QU'ILS SONT PURS
 *
 *   — un PLAFOND (`RELANCES_MAX`) : au-delà, ce n'est plus une relance,
 *     c'est du harcèlement, et le préavis de fermeture (M10) prendra le
 *     relais tout seul ;
 *   — un DÉLAI MINIMUM depuis le dernier mail parti, quel qu'il soit : deux
 *     mails de nous dans la même journée se lisent comme une panne ;
 *   — un MOTIF tiré de l'état, jamais choisi librement : on ne relance pas
 *     quelqu'un sur ses photos quand il les a envoyées.
 *
 * Le quatrième garde-fou — l'adresse qui rebondit — entre ici en paramètre
 * (`emailRebond`) : il vit dans le journal, pas sur `numeros`.
 *
 * Module PUR : aucune base, aucun réseau, `maintenant` toujours passé.
 * ══════════════════════════════════════════════════════════════════════════
 */

import type { Etat } from "./transitions";
import type { EtapeDepot } from "./urgence";

/** Ce sur quoi on relance. Tiré de l'état, jamais saisi. */
export type MotifRelance = "depot" | "photos" | "apercu";

/**
 * Combien de relances manuelles au maximum, par dossier ET par motif.
 *
 * DEUX, décidé par Mathias le 11/09/2026. Au-delà, ce n'est plus une relance :
 * on appelle, ou on laisse le préavis de fermeture (M10) faire son travail.
 * ⚠️ `MODELE_RELANCE` définit volontairement un TROISIÈME rang par motif
 * (RD3, RP3, RA3) : remonter le plafond ne demandera alors pas une ligne de
 * code de plus, juste ce chiffre.
 */
export const RELANCES_MAX = 2;

/**
 * Le silence minimum entre deux mails, quel que soit l'expéditeur du premier
 * (nous ou le balayage). Deux mails de l'atelier dans la même journée ne se
 * lisent pas comme une attention, ils se lisent comme un bug.
 *
 * SOIXANTE-DOUZE HEURES, décidé par Mathias le 11/09/2026 : trois jours
 * laissent passer un week-end entier, ce que quarante-huit ne faisaient pas.
 */
export const DELAI_MIN_RELANCE_MS = 72 * 3_600_000;
/* La phrase du refus LIT la constante : un chiffre écrit à la main dans le
   texte finit par dire autre chose que ce que la règle applique. */
const DELAI_MIN_HEURES = Math.round(DELAI_MIN_RELANCE_MS / 3_600_000);

export type CodeRelance =
  | "RD1" | "RD2" | "RD3"
  | "RP1" | "RP2" | "RP3"
  | "RA1" | "RA2" | "RA3";

/**
 * Le mail dont chaque relance manuelle emprunte le GABARIT et les paramètres.
 *
 * ⚠️ C'est la table qui rend le lot 1 possible sans toucher à Brevo. La
 * changer, c'est changer le texte reçu par un client : rien d'autre dans le
 * code ne décide de ce qu'il lit.
 */
export const MODELE_RELANCE: Record<CodeRelance, "M2" | "M2b" | "M3b"> = {
  /* Rien n'a été déposé : « il manque les photos ». */
  RD1: "M2", RD2: "M2", RD3: "M2",
  /* Les photos sont montées, le bouton « Envoyer » jamais cliqué : surtout
     pas « il manque vos photos », qui laisserait croire qu'on les a perdues. */
  RP1: "M2b", RP2: "M2b", RP3: "M2b",
  /* L'aperçu est publié et non payé : la relance qui rapporte. */
  RA1: "M3b", RA2: "M3b", RA3: "M3b",
};

export const CODES_RELANCE = Object.keys(MODELE_RELANCE) as CodeRelance[];

/** Le préfixe de code, par motif. */
const PREFIXE: Record<MotifRelance, string> = { depot: "RD", photos: "RP", apercu: "RA" };

/** Ce que l'atelier lit sur le bouton, par motif. */
export const LIBELLE_MOTIF: Record<MotifRelance, string> = {
  depot: "ses photos",
  photos: "son accord",
  apercu: "son aperçu",
};

export function estCodeRelance(code: string): code is CodeRelance {
  return Object.prototype.hasOwnProperty.call(MODELE_RELANCE, code);
}

export type Relance =
  | {
      possible: true;
      motif: MotifRelance;
      /** 1, 2 ou 3 — le rang de CETTE relance parmi les manuelles du motif. */
      rang: number;
      code: CodeRelance;
      /** Ce que l'atelier lit : « 2ᵉ relance sur son aperçu ». */
      libelle: string;
    }
  | {
      possible: false;
      raison: string;
      /**
       * Ce dossier est-il dans une situation où une relance aurait un sens ?
       *
       * Sert à l'écran, pas à la règle : un bouton éteint sur un dossier
       * livré serait du bruit sur vingt lignes, alors qu'un bouton éteint sur
       * un aperçu relancé hier est une INFORMATION (« pas avant demain »).
       */
      pertinent: boolean;
    };

/**
 * Le dernier mail parti, tous codes confondus — son code ET sa date.
 *
 * Sert deux fois : au délai minimum entre deux relances, et à la colonne
 * « Dernier mot » de la liste. Une seule lecture de la même vérité.
 */
export function dernierMailParti(
  envoyes: Map<string, string>,
): { code: string; iso: string } | null {
  let dernier: { code: string; iso: string } | null = null;
  for (const [code, iso] of envoyes) {
    if (!dernier || iso > dernier.iso) dernier = { code, iso };
  }
  return dernier;
}

function rangDe(n: number): string {
  return n === 1 ? "1re" : `${n}e`;
}

/** « il y a 6 j ». Exportée : la colonne « Dernier mot » dit la même chose. */
export function depuisEnMots(iso: string, maintenant: Date): string {
  const h = Math.round((maintenant.getTime() - Date.parse(iso)) / 3_600_000);
  if (!Number.isFinite(h)) return "récemment";
  if (h < 1) return "il y a moins d'une heure";
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

/**
 * Peut-on relancer ce dossier, et avec quoi ?
 *
 * Rend TOUJOURS une réponse lisible : quand c'est non, `raison` est la phrase
 * que l'atelier verra au survol du bouton grisé. Un bouton éteint sans
 * explication finit par être contourné à la main, en base.
 */
export function evaluerRelance(args: {
  etat: Etat;
  depot: EtapeDepot;
  paye: boolean;
  emailRebond: boolean;
  email: string | null;
  /** code -> date d'envoi ISO, tel que `lireEnvoyes` le rend. */
  envoyes: Map<string, string>;
  maintenant: Date;
}): Relance {
  const { etat, depot, paye, emailRebond, email, envoyes, maintenant } = args;

  if (!email?.trim()) {
    return { possible: false, raison: "Aucune adresse sur ce dossier.", pertinent: true };
  }

  /* Le seul cas où l'on ne propose PAS un mail mais un téléphone. Il passe
     avant le motif : un dossier injoignable n'est pas relançable, quel que
     soit l'endroit où il est coincé. */
  if (emailRebond) {
    return {
      possible: false,
      raison: "Un de nos mails a définitivement rebondi : il faut appeler, pas écrire.",
      pertinent: true,
    };
  }

  const motif: MotifRelance | null =
    etat === "photos_recues" && depot === "vide"
      ? "depot"
      : etat === "photos_recues" && depot === "abandonne"
        ? "photos"
        : etat === "apercu_pret" && !paye
          ? "apercu"
          : null;

  if (!motif) {
    /* Dit ce qui est vrai plutôt que « impossible » : à l'état 1 dépôt
       terminé, la balle est chez NOUS, et la relance serait un aveu. */
    return {
      possible: false,
      raison:
        etat === "photos_recues"
          ? "Son dépôt est terminé : c'est à nous de jouer, pas à lui."
          : "Rien à relancer dans cet état : la balle n'est pas chez lui.",
      pertinent: false,
    };
  }

  const prefixe = PREFIXE[motif];
  const deja = CODES_RELANCE.filter((c) => c.startsWith(prefixe) && envoyes.has(c)).length;
  if (deja >= RELANCES_MAX) {
    return {
      possible: false,
      raison: `${RELANCES_MAX} relances sont déjà parties sur ${LIBELLE_MOTIF[motif]}. Au-delà, on appelle.`,
      pertinent: true,
    };
  }

  const dernier = dernierMailParti(envoyes);
  if (dernier && maintenant.getTime() - Date.parse(dernier.iso) < DELAI_MIN_RELANCE_MS) {
    return {
      possible: false,
      raison: `Un mail lui est parti ${depuisEnMots(dernier.iso, maintenant)}. On laisse ${DELAI_MIN_HEURES} h entre deux.`,
      pertinent: true,
    };
  }

  const rang = deja + 1;
  return {
    possible: true,
    motif,
    rang,
    code: `${prefixe}${rang}` as CodeRelance,
    libelle: `${rangDe(rang)} relance sur ${LIBELLE_MOTIF[motif]}`,
  };
}
