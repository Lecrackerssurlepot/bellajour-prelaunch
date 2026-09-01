/**
 * Ce qui a le droit de sortir vers Vercel Web Analytics — module PUR, zéro effet.
 *
 * POURQUOI CE FICHIER EXISTE
 * Le script de Vercel n'envoie PAS le motif de route : il envoie
 * `location.href` tel quel (champ `o` du corps POST — lu dans
 * https://va.vercel-scripts.com/v1/script.js le 01/09/2026, fonction
 * `v({type,data})`). Sur /numero/<token>, c'est le token de 32 caractères de la
 * cliente qui partirait chez un tiers ; sur /ambassadeurs/espace?token=…, celui
 * d'une ambassadrice ; sur /composer?reprendre=…, le lien de reprise. Ces trois
 * jetons ne sont pas des identifiants : ce sont des mots de passe. Qui les a,
 * entre — et la page cliente porte nom, adresse et photos.
 *
 * CE QU'ON NE PERD PAS EN MASQUANT
 * Le paquet calcule à côté un « Dynamic Path » (`computeRoute`, champ `dp`),
 * qui vaut déjà `/numero/[token]` sans aucune valeur dedans. C'est LUI qui
 * regroupe les vues dans le tableau de bord. Masquer l'URL ne coûte donc rien
 * au comptage : on garde le motif, on jette la valeur.
 *
 * LES RÈGLES, DANS L'ORDRE
 * 1. `/admin/**` ne part pas du tout. C'est l'arrière-boutique, pas l'audience,
 *    et Mathias n'est pas une visiteuse à mesurer.
 * 2. Tout segment porteur d'un token est remplacé par `[token]` : d'abord par
 *    la table des routes dynamiques connues, ensuite par un filet générique
 *    pour celles qui n'existent pas encore.
 * 3. La chaîne de requête est VIDÉE, sauf `utm_*`, et le fragment est jeté.
 *    (Sur le plan Hobby, Vercel n'affiche de toute façon pas les UTM — on les
 *    garde parce qu'ils ne coûtent rien et servent le jour d'un passage Pro.)
 *
 * Et si quelque chose ne se lit pas, on n'envoie rien : le doute se tranche
 * toujours du côté de la cliente, jamais du côté de la mesure.
 */

import { NUMERO_TOKEN_PATTERN } from '@/lib/atelier/tokenForme'

/* Ce qui remplace une valeur secrète dans le chemin. Volontairement identique
   au motif Next (`[token]`) pour que la ligne du tableau de bord se lise comme
   le nom du dossier dans le dépôt. */
export const MASQUE = '[token]'

/* Les seuls paramètres de requête qui survivent. Aucun n'est saisi par une
   visiteuse : ce sont les nôtres, posés dans nos propres liens de campagne. */
const PARAM_CONSERVE = /^utm_[a-z]+$/
const VALEUR_MAX = 64

type RouteDynamique = {
  /* Le préfixe fixe, sans slash final. */
  readonly prefixe: string
  /* Les enfants STATIQUES de ce préfixe, qu'il ne faut surtout pas masquer :
     sans cette liste, /admin/atelier/metriques deviendrait un « token ». */
  readonly statiques: readonly string[]
}

/* Table des routes dont le segment suivant est une valeur, pas un nom.
   Ordre = préfixe le plus long d'abord ; la première qui matche gagne.
   Ajouter une route dynamique = une entrée ici, plus un cas dans
   scripts/verif-atelier.ts. */
const ROUTES_DYNAMIQUES: readonly RouteDynamique[] = [
  { prefixe: '/admin/atelier/demo', statiques: [] },
  { prefixe: '/admin/atelier', statiques: ['demo', 'metriques', 'sante'] },
  { prefixe: '/numero', statiques: [] },
]

/**
 * Le filet générique, pour les routes qui n'existent pas encore.
 * Un nom de route dans ce dépôt est en minuscules, coupé par des tirets, sans
 * chiffre (`mentions-legales`, `ambassadeurs`, `composer`). Un token est un
 * bloc long qui mélange casses ou chiffres. On ne masque que le second.
 */
export function ressembleAUnToken(segment: string): boolean {
  if (NUMERO_TOKEN_PATTERN.test(segment)) return true
  if (segment.length < 16) return false
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) return false
  const aUnChiffre = /[0-9]/.test(segment)
  const aDeuxCasses = /[a-z]/.test(segment) && /[A-Z]/.test(segment)
  return aUnChiffre || aDeuxCasses
}

function masquerChemin(pathname: string): string {
  const segments = pathname.split('/')

  for (const { prefixe, statiques } of ROUTES_DYNAMIQUES) {
    const attendus = prefixe.split('/')
    if (segments.length <= attendus.length) continue
    if (!attendus.every((s, i) => s === segments[i])) continue
    const suivant = segments[attendus.length]
    if (suivant && !statiques.includes(suivant)) segments[attendus.length] = MASQUE
    break
  }

  return segments.map((s) => (ressembleAUnToken(s) ? MASQUE : s)).join('/')
}

/**
 * L'URL telle qu'elle a le droit de partir, ou `null` pour « n'envoie rien ».
 * @param url URL absolue (c'est ce que `beforeSend` reçoit : `location.href`).
 */
export function cheminPublic(url: string): string | null {
  let lue: URL
  try {
    lue = new URL(url)
  } catch {
    /* Illisible : on ne devine pas ce qu'il y a dedans, donc on n'envoie rien. */
    return null
  }

  /* Règle 1 — l'arrière-boutique reste dedans. Posée sur le chemin BRUT, avant
     tout masquage, pour qu'aucune réécriture ne puisse la contourner. */
  if (lue.pathname === '/admin' || lue.pathname.startsWith('/admin/')) return null

  const conserves = new URLSearchParams()
  for (const [cle, valeur] of lue.searchParams) {
    if (PARAM_CONSERVE.test(cle) && valeur.length <= VALEUR_MAX) conserves.set(cle, valeur)
  }
  const requete = conserves.toString()

  /* Le fragment n'est jamais recopié : il ne sert à rien à la mesure et il a
     déjà servi de cachette à des jetons ailleurs sur le web. */
  return `${lue.origin}${masquerChemin(lue.pathname)}${requete ? `?${requete}` : ''}`
}
