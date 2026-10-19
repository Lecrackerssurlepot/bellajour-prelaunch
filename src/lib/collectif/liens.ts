/**
 * Les trois liens d'une édition, tels que l'atelier les copie (PRD §2, §3).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * L'origine vient de la requête qui affiche la fiche : en local, des liens
 * `http://localhost:3006/…` qu'on peut ouvrir tout de suite ; en production,
 * `https://bellajour.fr/…`. Le mail « Votre espace est prêt » les porte tous
 * les trois (T-187), et ne part que si l'atelier le confirme.
 */

import type { TokensEdition } from "./droits";

export type QuelLien = "responsable" | "equipe" | "depot";
export const QUELS_LIENS: readonly QuelLien[] = ["responsable", "equipe", "depot"];

export const LIBELLE_LIEN: Record<QuelLien, { titre: string; aide: string }> = {
  responsable: {
    titre: "Lien du responsable",
    aide: "Privé. Une seule personne, la seule à choisir le style, noter et valider le bon à tirer.",
  },
  equipe: {
    titre: "Lien de l'équipe",
    aide: "Lecture seule : les collègues voient tout, sans rien pouvoir modifier.",
  },
  depot: {
    titre: "Lien des participants",
    aide: "À partager à tous : il ne sert qu'à déposer des photos, jusqu'à la clôture.",
  },
};

/** La colonne de `collectif_editions` qui porte chaque lien. */
export const COLONNE_LIEN: Record<QuelLien, keyof TokensEdition> = {
  responsable: "token_responsable",
  equipe: "token_equipe",
  depot: "token_depot",
};

/** `https://bellajour.fr` ou `http://localhost:3006`, sans barre finale ; `""` si illisible. */
export function origineDepuis(hote: string | null, proto: string | null): string {
  const h = (hote ?? "").trim();
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/i.test(h)) return "";
  const p = (proto ?? "").split(",")[0].trim().toLowerCase();
  const schema = p === "http" || p === "https" ? p : h.startsWith("localhost") || h.startsWith("127.0.0.1") ? "http" : "https";
  return `${schema}://${h}`;
}

export function liensEdition(origine: string, e: TokensEdition): Record<QuelLien, string> {
  const o = origine.replace(/\/+$/, "");
  return {
    responsable: `${o}/edition/${e.token_responsable}`,
    equipe: `${o}/edition/${e.token_equipe}`,
    depot: `${o}/depot/${e.token_depot}`,
  };
}

/**
 * L'adresse telle que l'écran la MONTRE (« bellajour.fr/edition/kq3f… », planche 6) :
 * sans le protocole, le token réduit à ses quatre premiers caractères. Le lien
 * entier ne sort que par « Copier » : une capture d'écran ou un regard par-dessus
 * l'épaule ne l'emporte pas.
 */
export function lienAbrege(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/([A-Za-z0-9_-]{4})[A-Za-z0-9_-]{20,}/g, "$1…");
}

/** « Copier les trois liens » (T-187) : chacun sur sa ligne, avec son rôle, à coller dans un mail. */
export function texteTroisLiens(l: Record<QuelLien, string>): string {
  return [
    `Le lien du responsable, à garder pour soi : ${l.responsable}`,
    `Le lien de l'équipe, en lecture seule : ${l.equipe}`,
    `Le lien des participants, pour déposer ses photos : ${l.depot}`,
  ].join("\n");
}
