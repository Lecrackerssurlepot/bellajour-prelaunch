/**
 * Les trois liens d'une édition, tels que l'atelier les copie (PRD §2, §3).
 * Module PUR : aucun accès base, aucun réseau ; l'environnement, quand il sert,
 * est passé par l'appelant.
 *
 * Deux origines, et elles ne se mélangent pas (T-164) :
 * - les liens AFFICHÉS (la fiche, l'écran des liens, l'espace) prennent celle de
 *   la requête, `origineDepuis` : en local, `http://localhost:3006/…` s'ouvre
 *   tout de suite ;
 * - les liens qui PARTENT PAR MAIL prennent celle du site, `origineDesMails`.
 *   Jamais un en-tête : `x-forwarded-host` s'écrit par l'appelant, et
 *   « Retrouver mon espace » enverrait alors un vrai mail de Bellajour dont le
 *   lien porte le token du responsable vers le domaine d'un tiers.
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

/** L'origine du site quand `NEXT_PUBLIC_SITE_URL` manque ou ne se lit pas (la même que le B2C). */
export const ORIGINE_SITE = "https://www.bellajour.fr";

/**
 * L'origine des liens qui partent par mail : `NEXT_PUBLIC_SITE_URL` (posée sur
 * Vercel), sinon `ORIGINE_SITE`. Une origine nue seulement : https, ou http
 * vers le poste local ; un chemin, un autre protocole ou une valeur illisible
 * retombent sur `ORIGINE_SITE`. Ne lit AUCUN en-tête de la requête.
 */
export function origineDesMails(env: Record<string, string | undefined>): string {
  const brut = (env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "").toLowerCase();
  if (/^https:\/\/[a-z0-9.-]+(:\d{1,5})?$/.test(brut)) return brut;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(brut)) return brut;
  return ORIGINE_SITE;
}

/** `https://bellajour.fr` ou `http://localhost:3006`, sans barre finale ; `""` si illisible. Pour un lien AFFICHÉ, jamais envoyé. */
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

/**
 * Un lien de dépôt qui ne mène plus nulle part (T-196, 20/10) : régénéré par
 * l'atelier, supprimé par le responsable (un lien de bateau), ou inconnu. La
 * page `/depot/[token]` le dit en clair, au registre de l'édition quand on la
 * retrouve (vous sinon), et le moteur d'envoi dit la même chose si le lien
 * meurt pendant un envoi. Le code HTTP, lui, reste 404 dans tous les cas : un
 * lien régénéré ne se distingue pas d'un lien qui n'a jamais existé
 * (`reponses.ts`, pas d'annuaire).
 */
export function lienMort(tu: boolean): { titre: string; suite: string; phrase: string } {
  const titre = "Ce lien ne fonctionne plus";
  const suite = tu ? "Demande le nouveau lien à l'organisateur." : "Demandez le nouveau lien à l'organisateur.";
  return { titre, suite, phrase: `${titre}. ${suite}` };
}

/** Le code du verrou du mail « votre lien a changé » (T-196) : un par lien régénéré, jamais deux fois le même. */
export function codeMailLienRegenere(quel: QuelLien, empreinteNouveau: string): string {
  return `LIEN-${quel}-${empreinteNouveau.slice(0, 10)}`;
}
