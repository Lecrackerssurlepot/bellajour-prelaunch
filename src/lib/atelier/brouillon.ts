/**
 * Le BROUILLON d'aperçu — voir la page du client avant de publier.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI LE BROUILLON VIT DANS LE JOURNAL, ET PAS DANS `numeros`
 *
 * Demande de Mathias (10/09/2026) : « avant d'envoyer, pouvoir visualiser la
 * page à venir ». Le seul rendu fidèle de cette page est la page elle-même —
 * la même route, le même `resoudreApercu`, le même calcul de prix. Il faut
 * donc lui donner la ligne `numeros` TELLE QU'ELLE SERA, sans l'écrire.
 *
 * Écrire dans `numeros` était exclu : une publication à moitié faite est
 * exactement le mensonge d'écran que ce back-office supprime (un dossier en
 * `apercu_pret` sans mail parti, un prix gelé sur une saisie qu'on allait
 * corriger). Le journal, lui, est APPEND-ONLY et sans conséquence : une ligne
 * de plus n'engage rien, ne déclenche aucun mail, et raconte au passage que
 * quelqu'un a regardé avant d'envoyer.
 *
 * UN DRY-RUN = UN BROUILLON, LE DERNIER GAGNE. Deux vérifications de suite
 * laissent deux lignes ; c'est la plus récente qui décrit ce que l'atelier a
 * sous les yeux. On ne nettoie rien : le journal ne se réécrit pas.
 *
 * Module PUR — aucune base, aucun réseau. Éprouvé par verif-atelier.ts.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { paysValide } from "./pays";

/** Le `type` de la ligne d'`evenements` qui porte un brouillon. */
export const TYPE_BROUILLON = "apercu_brouillon";

/**
 * L'état que la prévisualisation force, toujours.
 *
 * Publier l'aperçu, c'est faire passer le dossier à `apercu_pret` — et c'est
 * CETTE page-là que Mathias veut voir. « corriger_apercu » se joue sur place
 * (le dossier y est déjà), donc la valeur est juste dans les deux cas.
 */
export const ETAT_BROUILLON = "apercu_pret";

/**
 * LES SEULES COLONNES QU'UN BROUILLON A LE DROIT DE SUPERPOSER.
 *
 * Une liste blanche, et pas un filtre de ce qu'on refuse : le payload vient
 * d'une ligne de journal, donc d'une donnée qu'on relit des mois plus tard,
 * écrite par une version du code qui n'est plus celle qui la lit. Tout ce qui
 * n'est pas nommé ici est IGNORÉ EN SILENCE — en particulier `id`, `token` et
 * `email`, qui identifient le dossier : un brouillon ne doit jamais pouvoir
 * faire afficher la page d'un autre client, ni changer l'adresse à qui la
 * page appartient.
 */
export const COLONNES_BROUILLON = [
  "apercu_urls",
  "nb_pages",
  "palier",
  "prix_centimes",
  "livraison_centimes",
  "livraison_niveau",
  "pays_livraison",
] as const;

export type ColonneBrouillon = (typeof COLONNES_BROUILLON)[number];

/** Ce qu'une ligne d'`evenements` porte, vu d'ici. */
export type LigneJournal = {
  type?: unknown;
  payload?: unknown;
};

/** Un brouillon relu et jugé exploitable. */
export type Brouillon = {
  /** Les colonnes retenues, déjà filtrées et validées. */
  patch: Partial<Record<ColonneBrouillon, unknown>>;
  /** Le prénom de l'admin qui a préparé, quand il est connu. */
  par: string | null;
};

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function entier(v: unknown, minimum: number): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= minimum ? v : null;
}

/**
 * La valeur retenue pour une colonne, ou `undefined` si elle est refusée.
 *
 * Les mêmes bornes que celles de `preparerTransition` et de la base : un prix
 * gelé est strictement positif, un port peut valoir zéro (offrir la livraison
 * est une décision légitime), un niveau d'expédition respecte le `check` de la
 * colonne. Une valeur abîmée ne fait pas tomber la prévisualisation, elle
 * disparaît — la page retombe alors sur ce que la ligne réelle porte déjà.
 */
function valeurRetenue(colonne: ColonneBrouillon, v: unknown): unknown {
  switch (colonne) {
    /* jsonb libre : c'est `resoudreApercu` qui sait le lire, pas nous. On
       exige seulement que ce soit un objet, sinon la visionneuse recevrait
       une chaîne et n'afficherait rien. */
    case "apercu_urls":
      return estObjet(v) ? v : undefined;
    case "nb_pages":
      return entier(v, 1) ?? undefined;
    case "prix_centimes":
      return entier(v, 1) ?? undefined;
    /* ⚠️ ZÉRO EST VALIDE ICI, et nulle part ailleurs : le port offert. */
    case "livraison_centimes":
      return entier(v, 0) ?? undefined;
    case "palier":
      return typeof v === "string" && v.trim() ? v.trim() : undefined;
    /* Le motif du `check` de la base, recopié : un niveau abîmé est ignoré. */
    case "livraison_niveau":
      return typeof v === "string" && /^[a-z_]{2,32}$/.test(v) ? v : undefined;
    /* Le pays décide du port ET de la phrase « Livraison en France » : on
       n'accepte que ceux de la zone (pays.ts), jamais un code libre. */
    case "pays_livraison":
      return paysValide(v) ? v : undefined;
  }
}

/**
 * Le dernier brouillon exploitable d'une liste de lignes de journal.
 *
 * ⚠️ LES LIGNES SONT ATTENDUES DANS L'ORDRE CHRONOLOGIQUE (la plus ancienne
 * d'abord) : on remonte depuis la fin et on s'arrête au premier payload
 * valide. Un appelant qui lit en `created_at desc` doit donc renverser sa
 * liste — c'est ce que fait la page d'état.
 *
 * Rend `null` sur une liste vide, sur des payloads malformés, ou sur un
 * brouillon qui ne porte aucune colonne connue : dans ces trois cas il n'y a
 * rien à montrer, et la page du client s'affiche telle qu'elle est vraiment.
 */
export function lireBrouillon(lignes: ReadonlyArray<LigneJournal> | null | undefined): Brouillon | null {
  if (!Array.isArray(lignes)) return null;
  for (let i = lignes.length - 1; i >= 0; i--) {
    const ligne = lignes[i];
    if (!estObjet(ligne)) continue;
    /* Le type est facultatif (l'appelant a pu filtrer en SQL), mais s'il est
       là il fait foi : on ne prend pas un `etat_change` pour un brouillon. */
    if (typeof ligne.type === "string" && ligne.type !== TYPE_BROUILLON) continue;
    const payload = ligne.payload;
    if (!estObjet(payload)) continue;
    const patchBrut = payload.patch;
    if (!estObjet(patchBrut)) continue;

    const patch: Partial<Record<ColonneBrouillon, unknown>> = {};
    for (const colonne of COLONNES_BROUILLON) {
      if (!(colonne in patchBrut)) continue;
      const valeur = valeurRetenue(colonne, patchBrut[colonne]);
      if (valeur !== undefined) patch[colonne] = valeur;
    }
    if (Object.keys(patch).length === 0) continue;

    const par = typeof payload.par === "string" && payload.par.trim() ? payload.par.trim() : null;
    return { patch, par };
  }
  return null;
}

/**
 * La ligne `numeros`, telle qu'elle SERA une fois l'aperçu publié.
 *
 * Une copie superposée, jamais une mutation : l'objet d'origine reste celui
 * qui a été lu en base, et la page qui n'est pas en prévisualisation ne peut
 * donc rien voir de ce brouillon.
 *
 * Trois garanties, dans cet ordre :
 *   1. seules `COLONNES_BROUILLON` traversent — `id`, `token` et `email` ne
 *      bougent JAMAIS, même si le payload prétend le contraire ;
 *   2. une colonne absente du brouillon garde sa valeur réelle ;
 *   3. `etat` est FORCÉ à `apercu_pret`, parce que c'est la page qu'on veut
 *      voir et que le patch d'une correction sur place ne la porte pas.
 */
export function appliquerBrouillon<T extends object>(ligne: T, brouillon: Brouillon | null): T {
  if (!brouillon) return ligne;
  const sortie: Record<string, unknown> = { ...(ligne as Record<string, unknown>) };
  for (const colonne of COLONNES_BROUILLON) {
    const valeur = brouillon.patch[colonne];
    if (valeur !== undefined) sortie[colonne] = valeur;
  }
  sortie.etat = ETAT_BROUILLON;
  return sortie as T;
}
