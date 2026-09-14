/**
 * La boîte du jour : ce qui est ENTRÉ dans l'atelier depuis hier.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE RÉPOND, ET QUE QUATRE COMPTEURS NE RÉPONDAIENT PAS
 *
 * Le 11/09/2026, Mathias : « les nouvelles demandes de la journée ne sont pas
 * claires ». En tête de la table de travail, il y avait « jamais ouverts »
 * (par personne), « arrivées aujourd'hui » (comptées sur la date du
 * QUESTIONNAIRE, pas sur celle du dépôt) et « dépôt non terminé ». Trois
 * définitions de « nouveau », quatre nombres, aucune liste.
 *
 * Ici, une seule question, celle qu'on se pose en arrivant : QU'EST-CE QUI
 * EST ENTRÉ, ET QU'EST-CE QUE ÇA ME DEMANDE. Trois motifs, dans l'ordre où on
 * les lit :
 *
 *   nouvelle_demande  le client a envoyé ses photos (ou les a redéposées) ;
 *                     c'est du travail d'atelier, la promesse de 48 h court.
 *   reponse_client    il a payé, validé, demandé des retouches ou un
 *                     ajustement : la balle vient de revenir chez nous.
 *   sans_photos       un questionnaire rempli, aucun dépôt. Rien à faire,
 *                     la relance M2 s'en occupe : en gris, pour information.
 *
 * Une ligne par dossier, et l'événement le plus récent gagne : un dossier qui
 * a envoyé ses photos ce matin puis payé à midi se lit « a payé », pas deux
 * fois.
 *
 * Et une ligne DISPARAÎT D'ELLE-MÊME dès qu'on a joué : une demande n'est
 * affichée que tant que la balle est chez nous (pile « retard » ou « à
 * faire »). Publier l'aperçu la fait sortir de la boîte sans qu'on ait rien à
 * cocher. C'est ce qui distingue une boîte d'arrivée d'un journal.
 *
 * Tout vient du journal `evenements` : aucune colonne, aucune migration,
 * même source que le fil d'activité. Module PUR, `maintenant` en paramètre.
 * ══════════════════════════════════════════════════════════════════════════
 */

import type { Etat } from "./transitions";
import type { EtapeDepot, Pile } from "./urgence";

export type MotifArrivee = "nouvelle_demande" | "reponse_client" | "sans_photos";

/** L'ordre de lecture des trois groupes. */
export const ORDRE_MOTIFS: MotifArrivee[] = ["nouvelle_demande", "reponse_client", "sans_photos"];

export const LIBELLE_MOTIF: Record<MotifArrivee, string> = {
  nouvelle_demande: "Nouvelles demandes",
  reponse_client: "Le client a répondu",
  sans_photos: "Questionnaire sans photos",
};

export const SOUS_TITRE_MOTIF: Record<MotifArrivee, string> = {
  nouvelle_demande: "photos envoyées, à composer",
  reponse_client: "la balle revient chez nous",
  sans_photos: "rien à faire, la relance est automatique",
};

/** Un événement du journal, réduit à ce que la règle lit. */
export type EvenementArrivee = {
  numeroId: string;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

/** Ce que la règle doit savoir d'un dossier pour décider s'il s'affiche. */
export type DossierArrivee = {
  numeroId: string;
  etat: Etat;
  pile: Pile;
  depot: EtapeDepot;
};

export type Arrivee = {
  numeroId: string;
  motif: MotifArrivee;
  /** « a payé 47 € », « a envoyé ses photos ». Se lit après le prénom. */
  quoi: string;
  /** L'instant de l'événement, ISO. */
  quand: string;
};

/* ─────────────────────────── la fenêtre ─────────────────────────── */

/**
 * Le lundi, la fenêtre remonte au vendredi : « depuis hier » un lundi matin
 * ne montrerait que le dimanche, et tout ce qui est entré samedi serait
 * passé sous silence.
 *
 * Réglage par défaut, pas une décision de Mathias.
 */
export const JOURS_REMONTES_LE_LUNDI = 3;

const FUSEAU = "Europe/Paris";

const CIVIL = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSEAU,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hour12: false,
});

function partiesParis(d: Date): { y: number; m: number; j: number; h: number; min: number; jourSemaine: string } {
  const p = Object.fromEntries(CIVIL.formatToParts(d).map((x) => [x.type, x.value]));
  return {
    y: Number(p.year),
    m: Number(p.month),
    j: Number(p.day),
    /* `hour12: false` rend parfois « 24 » à minuit : on le ramène à 0. */
    h: Number(p.hour) % 24,
    min: Number(p.minute),
    jourSemaine: p.weekday,
  };
}

/** Minuit, heure de Paris, du jour civil (y, m, j) : l'instant UTC exact. */
function minuitParis(y: number, m: number, j: number): Date {
  /* On part de minuit UTC du même jour civil, on lit l'heure qu'il est alors
     à Paris (01:00 ou 02:00 selon la saison), et on recule d'autant. Les
     changements d'heure ont lieu à 2 h ou 3 h du matin : minuit n'est jamais
     dans la zone floue. */
  const essai = new Date(Date.UTC(y, m - 1, j, 0, 0, 0));
  const { h, min } = partiesParis(essai);
  return new Date(essai.getTime() - (h * 60 + min) * 60_000);
}

/**
 * Le début de « depuis hier » : hier à minuit, heure de Paris. Le lundi,
 * vendredi à minuit.
 *
 * Heure de Paris et non UTC parce que le serveur tourne en UTC et que la
 * table de travail se lit à Paris comme à Lisbonne : « hier » à 1 h du matin
 * doit vouloir dire la veille pour les deux.
 */
export function debutFenetre(maintenant: Date): Date {
  const p = partiesParis(maintenant);
  const recul = p.jourSemaine === "Mon" ? JOURS_REMONTES_LE_LUNDI : 1;
  /* Reculer en UTC sur le jour civil, puis retrouver minuit Paris : on ne
     soustrait jamais 24 h à un instant, un changement d'heure ferait glisser
     la borne d'une heure. */
  const civil = new Date(Date.UTC(p.y, p.m - 1, p.j - recul));
  return minuitParis(civil.getUTCFullYear(), civil.getUTCMonth() + 1, civil.getUTCDate());
}

/* ─────────────────────────── la règle ─────────────────────────── */

/** Ce qu'un événement veut dire pour la boîte, ou rien. */
function lireEvenement(e: EvenementArrivee): { motif: MotifArrivee; quoi: string } | null {
  const p = e.payload ?? {};
  switch (e.type) {
    case "consentements":
      /* Le SEUL signal serveur du dépôt terminé (cf. urgence.ts, etapeDepot).
         Les autres consentements (CGV, renonciation) ne sont pas une entrée. */
      return p.consent_photos === true ? { motif: "nouvelle_demande", quoi: "a envoyé ses photos" } : null;

    case "etat_change": {
      const vers = typeof p.vers === "string" ? p.vers : "";
      const par = typeof p.par === "string" ? p.par : "";
      const source = typeof p.source === "string" ? p.source : "";
      if (vers === "payee") {
        const euros = typeof p.euros === "number" ? p.euros : null;
        return { motif: "reponse_client", quoi: euros ? `a payé ${euros} €` : "a payé son numéro" };
      }
      if (vers === "validee") {
        /* La validation automatique à J+7 n'est pas une réponse, c'est un
           silence. Mais la balle est chez nous quand même : on le dit tel
           quel plutôt que de faire passer un silence pour un accord. */
        return par === "auto"
          ? { motif: "reponse_client", quoi: "n'a rien dit à J+7, la maquette est validée" }
          : { motif: "reponse_client", quoi: "a validé sa maquette" };
      }
      if (vers === "photos_recues" && source === "depot_repris") {
        return { motif: "nouvelle_demande", quoi: "a redéposé ses photos" };
      }
      return null;
    }

    case "retouches_demandees":
      return { motif: "reponse_client", quoi: "demande des retouches sur la maquette" };

    case "ajustement_demande":
      return { motif: "reponse_client", quoi: "demande un ajustement de couverture" };

    case "numero_cree":
      return { motif: "sans_photos", quoi: "a rempli le questionnaire" };

    default:
      return null;
  }
}

/**
 * Les arrivées à afficher, une par dossier, dans l'ordre de lecture.
 *
 * Les événements peuvent arriver dans n'importe quel ordre : on trie ici.
 * Les dossiers absents de `dossiers` (supprimés, anonymisés) n'ont plus de
 * ligne à raconter : ignorés.
 */
export function releverArrivees(
  evenements: EvenementArrivee[],
  dossiers: DossierArrivee[],
  maintenant: Date,
): Arrivee[] {
  const depuis = debutFenetre(maintenant).toISOString();
  const parId = new Map(dossiers.map((d) => [d.numeroId, d]));

  /* Du plus récent au plus ancien : la première lecture utile par dossier
     est la bonne, les suivantes sont de l'histoire. */
  const recents = evenements
    .filter((e) => e.createdAt >= depuis && parId.has(e.numeroId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const retenues = new Map<string, Arrivee>();
  for (const e of recents) {
    if (retenues.has(e.numeroId)) continue;
    const lu = lireEvenement(e);
    if (!lu) continue;
    retenues.set(e.numeroId, { numeroId: e.numeroId, motif: lu.motif, quoi: lu.quoi, quand: e.createdAt });
  }

  const visibles = [...retenues.values()].filter((a) => {
    const d = parId.get(a.numeroId)!;
    if (a.motif === "sans_photos") {
      /* Tant qu'il n'a pas envoyé. Dès qu'il envoie, un `consentements`
         plus récent l'aura de toute façon fait passer en demande. */
      return d.etat === "photos_recues" && d.depot !== "termine";
    }
    /* Tant que la balle est chez nous. Une fois l'aperçu publié, la maquette
       envoyée ou la commande passée, il n'y a plus rien à lire ici. */
    return d.pile === "retard" || d.pile === "a_faire";
  });

  const rang = (m: MotifArrivee) => ORDRE_MOTIFS.indexOf(m);
  return visibles.sort((a, b) => rang(a.motif) - rang(b.motif) || b.quand.localeCompare(a.quand));
}
