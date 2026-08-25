/**
 * Le journal, en français.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI TRADUIRE PLUTÔT QU'AFFICHER
 *
 * `evenements` est fait pour le débogage : un `type` et un `payload` bruts.
 * C'est parfait quand on cherche pourquoi un dossier est coincé, et illisible
 * quand on veut simplement savoir ce qui s'est passé. « etat_change
 * {"de":"payee","vers":"maquette_prete","par":"Mathias"} » ne se lit pas, il
 * se déchiffre.
 *
 * Ce module rend une PHRASE. Le payload brut reste accessible d'un clic sur
 * la fiche : on ajoute une lecture, on n'en retire aucune.
 *
 * Module PUR — aucune base, aucun réseau, aucune date « maintenant ».
 * ══════════════════════════════════════════════════════════════════════════
 */

import { LIBELLE_ETAT, type Etat } from "./transitions";
import { OBJET_MAIL } from "./mails";

/** Qui a agi : ça décide de la couleur et du verbe. */
export type Ton = "nous" | "elle" | "mail" | "alerte" | "neutre";

export type Recit = {
  texte: string;
  /** Précision facultative, affichée en gris à la suite. */
  detail: string | null;
  ton: Ton;
};

/* Ce que chaque mail dit vraiment. « M3 est parti » n'apprend rien à qui n'a
   pas le PRD sous les yeux.

   ⚠️ La table vit dans mails.ts, pas ici : elle y sert aussi à la page santé,
   et deux copies des mêmes dix libellés auraient divergé au premier mail
   dont on change le propos. */
function texteMail(code: string): string {
  const objet = OBJET_MAIL[code as keyof typeof OBJET_MAIL];
  return objet ? `${code} — « ${objet} »` : code;
}

function auteur(payload: Record<string, unknown>): string | null {
  const par = payload.par;
  return typeof par === "string" && par.trim() ? par.trim() : null;
}

/* « Mathias a publié l'aperçu » si on sait qui, « L'aperçu a été publié »
   sinon. Les dossiers d'avant les comptes nominatifs n'ont pas de prénom :
   la phrase doit rester correcte sans lui. */
function fait(qui: string | null, verbeAvecSujet: string, verbePassif: string): string {
  return qui ? `${qui} ${verbeAvecSujet}` : verbePassif;
}

/**
 * La phrase d'un événement.
 *
 * Ne throw jamais et n'échoue jamais : un type inconnu (un événement écrit
 * par un lot futur) ressort tel quel plutôt que de faire disparaître une
 * ligne du journal. Un récit incomplet vaut mieux qu'un récit muet.
 */
export function raconter(type: string, payload: Record<string, unknown> = {}): Recit {
  const qui = auteur(payload);
  const vers = typeof payload.vers === "string" ? (payload.vers as Etat) : null;
  const nbPages = typeof payload.nbPages === "number" ? payload.nbPages : null;
  const euros = typeof payload.euros === "number" ? payload.euros : null;

  switch (type) {
    case "numero_cree":
      return {
        texte: "Dossier ouvert",
        detail: typeof payload.occasion === "string" ? (payload.occasion as string) : null,
        ton: "elle",
      };

    case "consentements": {
      /* Le seul signal serveur de fin de dépôt (cf. mails.ts) : c'est le
         moment où elle a vraiment envoyé ses photos. */
      if (payload.consent_photos === true) {
        return { texte: "Elle a terminé son dépôt", detail: null, ton: "elle" };
      }
      if ("cgv_ok" in payload || "renonciation_retractation" in payload) {
        const coche = payload.cgv_ok === true || payload.renonciation_retractation === true;
        return {
          texte: coche ? "Elle a coché les cases avant paiement" : "Elle a décoché une case",
          detail: null,
          ton: "elle",
        };
      }
      return { texte: "Consentements mis à jour", detail: null, ton: "elle" };
    }

    case "etat_change": {
      const source = typeof payload.source === "string" ? payload.source : "";
      if (vers === "apercu_pret") {
        return {
          texte: fait(qui, "a publié l'aperçu", "Aperçu publié"),
          detail: nbPages ? `${nbPages} pages${euros ? `, ${euros} €` : ""}` : null,
          ton: "nous",
        };
      }
      if (vers === "photos_insuffisantes") {
        return {
          texte: fait(qui, "a demandé plus de photos", "Photos jugées insuffisantes"),
          detail: null,
          ton: "nous",
        };
      }
      if (vers === "photos_recues" && source === "depot_repris") {
        return { texte: "Elle a redéposé ses photos", detail: null, ton: "elle" };
      }
      if (vers === "payee") {
        return { texte: "Paiement reçu", detail: euros ? `${euros} €` : null, ton: "elle" };
      }
      if (vers === "maquette_prete") {
        return { texte: fait(qui, "a publié la maquette", "Maquette publiée"), detail: null, ton: "nous" };
      }
      if (vers === "validee") {
        /* Le PRD prévoit une validation automatique à J+7 : la distinction
           compte, c'est la différence entre un accord et un silence. */
        return {
          texte: qui === "auto" ? "Validée automatiquement (sans réponse)" : "Elle a validé la maquette",
          detail: null,
          ton: qui === "auto" ? "neutre" : "elle",
        };
      }
      if (vers === "en_production") {
        return { texte: fait(qui, "a lancé l'impression", "Parti à l'impression"), detail: null, ton: "nous" };
      }
      if (vers === "expediee") {
        return {
          texte: fait(qui, "a marqué le numéro expédié", "Expédié"),
          detail: typeof payload.transporteur === "string" ? (payload.transporteur as string) : null,
          ton: "nous",
        };
      }
      if (vers === "livree") {
        return { texte: fait(qui, "a marqué le numéro livré", "Livré"), detail: null, ton: "nous" };
      }
      return {
        texte: vers ? `Passé à « ${LIBELLE_ETAT[vers] ?? vers} »` : "Changement d'état",
        detail: qui,
        ton: "neutre",
      };
    }

    case "apercu_corrige":
      return {
        texte: fait(qui, "a corrigé l'aperçu", "Aperçu corrigé"),
        detail: nbPages ? `${nbPages} pages${euros ? `, ${euros} €` : ""}` : null,
        ton: "nous",
      };

    case "mail_envoye":
      return {
        texte: `Mail parti : ${texteMail(String(payload.code ?? ""))}`,
        detail: null,
        ton: "mail",
      };

    case "mail_echec":
      return {
        texte: `Mail NON parti : ${texteMail(String(payload.code ?? ""))}`,
        detail: "La relève réessaiera",
        ton: "alerte",
      };

    /* Une relance retiree A LA MAIN. Le verrou dans `mails_envoyes` suffit a
       ce que le mail ne parte pas, mais il ne dit RIEN : le journal est le
       seul endroit ou l'on saura, dans six mois, pourquoi cette cliente n'a
       jamais ete relancee. */
    case "relance_annulee":
      return {
        texte: `Relance ${String(payload.code ?? "")} retirée à la main${qui ? ` par ${qui}` : ""}`,
        detail: typeof payload.raison === "string" ? (payload.raison as string) : null,
        ton: "neutre",
      };

    case "canva_travail":
      return {
        texte: payload.pose
          ? `${qui ?? "L'atelier"} a ouvert un document de travail`
          : `${qui ?? "L'atelier"} a retiré le document de travail`,
        detail: "Interne, jamais partagé avec elle",
        ton: "nous",
      };

    /* Retiré du récit à l'affichage (cf. donnees.ts), mais un vieux dossier
       peut encore en porter : autant qu'il se lise. */
    case "photos_confirmees":
      return {
        texte: `${payload.combien ?? ""} photo(s) reçues`.trim(),
        detail: null,
        ton: "elle",
      };

    case "checkout_expire":
      return { texte: "Panier abandonné (session expirée)", detail: "Le numéro reste commandable", ton: "neutre" };

    case "remboursement":
      return {
        texte: "Remboursement",
        detail: euros ? `${euros} €` : null,
        ton: "alerte",
      };

    case "paiement_inattendu":
      return { texte: "Paiement inattendu", detail: "À vérifier chez Stripe", ton: "alerte" };

    default:
      /* Un événement d'un lot futur ne doit pas disparaître du journal. */
      return { texte: type.replace(/_/g, " "), detail: null, ton: "neutre" };
  }
}
