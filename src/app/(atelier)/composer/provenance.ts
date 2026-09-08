/**
 * D'OÙ L'ON VIENT, ET DONC OÙ L'ON RETOURNE.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT, SIGNALÉ PAR MATHIAS LE 08/09/2026
 *
 * « Quand je clique sur la croix d'une demande et je vais quitter, ça ne
 * m'emmène pas sur la page où j'étais avant. »
 *
 * C'était vrai, et à trois endroits, pas un : la croix du questionnaire
 * ouvre une confirmation dont la sortie était écrite EN DUR sur `/magazine`.
 * Or on entre dans /composer depuis trois pages :
 *   — /magazine (le bouton de la page produit) → /magazine est juste ;
 *   — /compte (« Reprendre le dépôt », « Composer un nouveau numéro »)
 *     → on ressortait sur la page produit, loin de son espace ;
 *   — /numero/<token> (« Ajouter des photos » de l'état 1b, et le second CTA)
 *     → on ressortait sur la page produit, alors qu'on venait de SON numéro.
 *
 * Le troisième cas est le plus rude : une cliente à qui l'atelier demande des
 * photos supplémentaires quitte le dépôt et se retrouve devant une fiche
 * produit, comme si elle n'avait jamais rien commandé.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ POURQUOI UNE CLÉ ET PAS UNE URL. Le retour arrive par l'URL, donc par
 * quelqu'un qui peut écrire ce qu'il veut. On ne redirige JAMAIS vers un
 * chemin lu tel quel dans un paramètre — c'est la définition d'une
 * redirection ouverte. Ce module ne lit qu'une CLÉ d'une liste fermée, et
 * CONSTRUIT le chemin lui-même. Le seul morceau variable est un token de
 * numéro, vérifié par la même expression que partout ailleurs
 * (`isValidNumeroToken`), 32 caractères sans rien à échapper.
 *
 * ⚠️ POURQUOI PAS `document.referrer`. Il est vide quand on arrive d'un autre
 * site, il ment derrière certaines politiques de référent, et surtout il est
 * PERDU au premier rechargement — or le questionnaire se recharge (le moteur
 * d'envoi est un singleton hors React, voir la croix dans Composer.tsx). Un
 * paramètre d'URL survit à tout ça.
 */

import { isValidNumeroToken } from '@/lib/atelier/tokenForme'
import { CTA_HREF } from '../content'

/** Le nom du paramètre. Court, sans accent, illisible pour personne. */
export const PARAM_PROVENANCE = 'de'

/** Les provenances sans token. `numero` s'écrit `numero:<token>`. */
export type CleProvenance = 'compte' | 'magazine' | 'accueil'

/**
 * La valeur à mettre dans l'URL.
 *
 * `/composer?de=compte`, ou `/composer?de=numero:AbC…` — et pour ce dernier,
 * si le token n'a pas la bonne forme on n'écrit RIEN plutôt qu'une valeur
 * boiteuse : le défaut (`/magazine`) vaut mieux qu'un lien cassé.
 */
export function marqueProvenance(
  cle: CleProvenance | 'numero',
  token?: string,
): string | null {
  if (cle === 'numero') {
    return token && isValidNumeroToken(token) ? `numero:${token}` : null
  }
  return cle
}

/** Le chemin de retour, construit ici et jamais lu tel quel. */
export function cheminRetour(de: string | null | undefined): string {
  if (de === 'compte') return '/compte'
  if (de === 'accueil') return '/'
  if (de?.startsWith('numero:')) {
    const token = de.slice('numero:'.length)
    if (isValidNumeroToken(token)) return `/numero/${token}`
  }
  /* `magazine`, une clé inconnue, ou rien : la page produit. C'est le
     comportement d'avant ce module, gardé comme filet — un paramètre absurde
     ne doit pas casser la sortie, seulement la rendre moins fine. */
  return CTA_HREF
}

/**
 * Ce que dit le bouton qui quitte. Le libellé NOMME la destination : « quitter
 * et revenir » sans dire où, c'est demander à quelqu'un de sauter les yeux
 * fermés au moment précis où il hésite déjà.
 */
export function motRetour(de: string | null | undefined): string {
  if (de === 'compte') return 'Quitter et revenir à mon compte'
  if (de === 'accueil') return 'Quitter et revenir à l’accueil'
  if (de?.startsWith('numero:') && isValidNumeroToken(de.slice(7))) {
    return 'Quitter et revenir à mon numéro'
  }
  return 'Quitter et revenir à la page du magazine'
}
