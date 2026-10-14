/**
 * Le journal de l'Édition collective, en français (patron de atelier/recit.ts).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * ⚠️ AUCUN TOKEN DANS LE JOURNAL. Régénérer un lien écrit QUEL lien a changé,
 * jamais sa valeur : le journal se lit à l'écran, et un token lu est un accès.
 */

import { GESTES, type GesteCle } from "./gestes";
import { LIBELLE_CHAMP } from "./saisie";

const LIBELLE_LIEN: Record<string, string> = {
  responsable: "du responsable",
  equipe: "de l'équipe",
  depot: "de dépôt des participants",
};

function nom(v: unknown): string {
  return typeof v === "string" && v ? v : "l'atelier";
}

function champs(v: unknown): string {
  if (!Array.isArray(v) || v.length === 0) return "";
  return v
    .map((c) => (typeof c === "string" ? LIBELLE_CHAMP[c] ?? c : ""))
    .filter(Boolean)
    .join(", ");
}

/** Une ligne de journal → une phrase. Un type inconnu reste lisible (son nom brut). */
export function phraseEvenement(type: string, payload: Record<string, unknown>): string {
  const par = nom(payload.par);
  switch (type) {
    case "edition_creee":
      return `Édition ouverte par ${par}.`;
    case "reglages_modifies": {
      const c = champs(payload.champs);
      return c ? `Réglages modifiés par ${par} : ${c}.` : `Réglages modifiés par ${par}.`;
    }
    case "magazines_modifies":
      return `Magazines modifiés par ${par}.`;
    case "geste": {
      const g = GESTES[payload.cle as GesteCle];
      return g ? `${g.libelle}, par ${par}.` : `Geste ${String(payload.cle)}, par ${par}.`;
    }
    case "lien_regenere": {
      const quel = LIBELLE_LIEN[String(payload.quel)] ?? "";
      return `Lien ${quel} régénéré par ${par} : l'ancien ne fonctionne plus.`;
    }
    case "message_client":
      return `Message du client (${par}).`;
    case "message_atelier":
      return `Message de l'atelier, par ${par}.`;
    case "plafond_client":
      return `Photos par participant réglées à ${String(payload.valeur)} par ${par}.`;
    case "document_pose":
      return `Document déposé par ${par} : ${String(payload.libelle ?? "")}.`;
    case "photos_confirmees":
      return `${String(payload.n)} photo(s) arrivée(s) (${payload.role === "responsable" ? "le responsable" : "un participant"}).`;
    case "metadonnees_lues":
      return `Métadonnées lues : ${String(payload.traitees ?? 0)} photo(s), ${String(payload.lieux ?? 0)} lieu(x).`;
    case "photo_preselectionnee":
      return "Une photo ajoutée à la présélection du client.";
    case "photo_deselectionnee":
      return "Une photo retirée de la présélection du client.";
    case "photo_signalee":
      return "Une photo signalée « à ne pas publier ».";
    case "photo_designalee":
      return "Un signalement de photo retiré.";
    case "provenance_creee":
      return `Lien de dépôt créé : ${String(payload.libelle ?? "")}${payload.sansPlafond ? " (sans plafond)" : ""}.`;
    case "brief_style_choisi":
      return `Magazine ${String(payload.magazine)} : style ${String(payload.style ?? "")} choisi par le client.`;
    case "brief_valide":
      return `Magazine ${String(payload.magazine)} : brief validé par le client.`;
    case "brief_rouvert":
      return `Magazine ${String(payload.magazine)} : brief rouvert par le client.`;
    case "brief_repris":
      return `Magazine ${String(payload.magazine)} : style repris du magazine ${String(payload.depuis)}.`;
    case "couverture_aimee":
      return `Magazine ${String(payload.magazine)} : une couverture aimée.`;
    case "couverture_retiree":
      return `Magazine ${String(payload.magazine)} : une couverture n'est plus aimée.`;
    case "tour_cree":
      return `Magazine ${String(payload.magazine)} : tour ${String(payload.tour)} ouvert par ${par}.`;
    case "tour_pages":
      return `Magazine ${String(payload.magazine)} : tour ${String(payload.tour)} rendu (${String(payload.pages)} pages) par ${par}.`;
    case "tour_echeance":
      return `Magazine ${String(payload.magazine)} : échéance du tour ${String(payload.tour)} réglée par ${par}.`;
    case "tour_couverture":
      return `Magazine ${String(payload.magazine)} : proposition de couverture ${String(payload.rang)} déposée par ${par}.`;
    case "tour_couverture_retiree":
      return `Magazine ${String(payload.magazine)} : proposition de couverture ${String(payload.rang)} retirée par ${par}.`;
    case "tour_publie":
      return `Magazine ${String(payload.magazine)} : tour ${String(payload.tour)} publié par ${par}.`;
    case "notes_envoyees":
      return `Magazine ${String(payload.magazine)} : ${String(payload.n)} note(s) envoyée(s) par le client.`;
    case "note_resolue":
      return `Magazine ${String(payload.magazine)} : une note marquée résolue par le client.`;
    case "note_rouverte":
      return `Magazine ${String(payload.magazine)} : une note rouverte par le client.`;
    case "note_repondue":
      return `Magazine ${String(payload.magazine)} : réponse de l'atelier à une note, par ${par}.`;
    case "couverture_choisie":
      return payload.sansPreference
        ? `Magazine ${String(payload.magazine)} : couverture « sans préférence ».`
        : `Magazine ${String(payload.magazine)} : proposition de couverture ${String(payload.rang)} choisie.`;
    case "couverture_note":
      return `Magazine ${String(payload.magazine)} : note sur la couverture.`;
    case "bat_valide":
      return `Magazine ${String(payload.magazine)} : bon à tirer VALIDÉ par le client.`;
    case "contenu_recu":
      return `Contenu reçu du client : ${String(payload.type ?? "")}.`;
    case "modification_demandee":
      return `Demande de modification du client : ${String(payload.motif ?? "")}.`;
    case "proposition_acceptee":
      return `Proposition complémentaire acceptée par le client : ${String(payload.libelle ?? "")}.`;
    case "proposition_a_reparler":
      return `Le client veut reparler de la proposition : ${String(payload.libelle ?? "")}.`;
    case "livraison_reglee":
      return `Adresse ou jour de livraison réglés par ${par}.`;
    case "style_cree":
      return `Style créé par ${par}.`;
    case "style_modifie": {
      const c = Array.isArray(payload.champs) ? payload.champs.join(", ") : "";
      return c ? `Style modifié par ${par} (${c}).` : `Style modifié par ${par}.`;
    }
    case "style_publie":
      return `Style publié sur le mur par ${par}.`;
    case "style_depublie":
      return `Style retiré du mur par ${par}.`;
    case "style_image":
      return `Image ajoutée par ${par}.`;
    default:
      return type;
  }
}
