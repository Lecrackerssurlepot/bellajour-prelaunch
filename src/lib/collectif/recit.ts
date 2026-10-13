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
