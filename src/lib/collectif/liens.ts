/**
 * Les trois liens d'une édition, tels que l'atelier les copie (PRD §2, §3).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * L'origine vient de la requête qui affiche la fiche : en local, des liens
 * `http://localhost:3006/…` qu'on peut ouvrir tout de suite ; en production,
 * `https://bellajour.fr/…`. Aucun mail ne part avec eux : l'atelier les envoie
 * lui-même (le mail E1 est la phase 7).
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
