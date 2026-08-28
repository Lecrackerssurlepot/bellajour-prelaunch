/**
 * Lire le navigateur sans mentir à l'hydratation.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LE PROBLÈME QUE CES DEUX CROCHETS REMPLACENT
 *
 * Une quinzaine de composants faisaient tous la même chose :
 *
 *     const [flat, setFlat] = useState(false)
 *     useEffect(() => { setFlat(/Android/i.test(navigator.userAgent)) }, [])
 *
 * L'intention est juste et les commentaires du dépôt la disent bien : lire
 * `navigator` ou `window.location` pendant le rendu donnerait une valeur côté
 * serveur et une autre côté navigateur, et React refuserait l'hydratation. On
 * décide donc APRÈS le premier rendu.
 *
 * Mais l'écrire avec un effet coûte deux rendus au lieu d'un, et surtout
 * `react-hooks/set-state-in-effect` le refuse — or `reactCompiler` est ACTIF
 * dans `next.config.ts`, et ce sont exactement les règles sur lesquelles il
 * décide de mémoïser. Une règle enfreinte n'est pas un avertissement de style :
 * c'est le compilateur qui n'a plus de garantie.
 *
 * `useSyncExternalStore` est la réponse prévue par React pour ce cas précis :
 * on lui donne un instantané SERVEUR et un instantané CLIENT, il rend le
 * premier au rendu du serveur puis bascule sur le second, en UN rendu, sans
 * effet et sans désaccord d'hydratation.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Les deux crochets rendent des valeurs PRIMITIVES uniquement (booléen,
 * chaîne, nombre). React relit l'instantané à chaque rendu et le compare par
 * `Object.is` : un lecteur qui rendrait un objet neuf à chaque appel ferait
 * boucler le rendu à l'infini. Pour un objet, calculer la primitive ici et
 * composer l'objet chez l'appelant.
 */

import { useCallback, useSyncExternalStore } from 'react'

/* Un abonnement qui n'écoute rien. La valeur ne bouge pas de la vie de la
   page : l'agent utilisateur ne change pas, et une lecture d'URL faite au
   montage n'a pas à suivre les navigations — c'est l'existant, on ne change
   pas le comportement en passant à `useSyncExternalStore`.
   Défini au niveau du module, donc d'identité stable : passé en ligne, React
   se réabonnerait à chaque rendu. */
const sansAbonnement = () => () => {}

/**
 * Une valeur que seul le navigateur connaît.
 *
 * @param lireClient   lu dans le navigateur, à chaque rendu — garder ça court.
 * @param valeurServeur ce que le HTML du serveur contient. C'est LUI qui est
 *                      peint en premier : choisir la valeur qui ne dérange pas
 *                      si elle est fausse une fraction de seconde.
 *
 *     const androide = useValeurClient(() => /Android/i.test(navigator.userAgent), false)
 */
export function useValeurClient<T extends string | number | boolean | null>(
  lireClient: () => T,
  valeurServeur: T,
): T {
  return useSyncExternalStore(sansAbonnement, lireClient, () => valeurServeur)
}

/**
 * Une media query, SUIVIE : la valeur change si le réglage change.
 *
 * Différence assumée avec `useValeurClient` : `prefers-reduced-motion` se
 * modifie pendant qu'une page est ouverte (réglages système, mode économie
 * d'énergie). Les composants qui la lisaient une fois au montage ne le
 * voyaient jamais ; ils le voient maintenant. C'est le sens de la préférence :
 * quelqu'un qui coupe les animations veut qu'elles s'arrêtent, pas qu'elles
 * s'arrêtent au prochain rechargement.
 *
 * ⚠️ `valeurServeur` est ce que le serveur suppose. Pour le mouvement, la
 * réponse est `false` (« pas de réduction demandée ») : le HTML servi anime, et
 * seul un visiteur qui a réellement demandé le contraire voit la bascule.
 */
export function useMediaQuery(requete: string, valeurServeur = false): boolean {
  const abonner = useCallback(
    (auChangement: () => void) => {
      const mq = window.matchMedia(requete)
      mq.addEventListener('change', auChangement)
      return () => mq.removeEventListener('change', auChangement)
    },
    [requete],
  )

  return useSyncExternalStore(
    abonner,
    () => window.matchMedia(requete).matches,
    () => valeurServeur,
  )
}

/** Le mouvement est-il refusé ? Le seul appelant de `useMediaQuery` aujourd'hui. */
export function useMouvementReduit(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/**
 * Sommes-nous sur Android ?
 *
 * Écrit ici parce que cinq composants posaient la même détection, mot pour
 * mot, pour la même raison : `backdrop-filter` sur une barre `position: fixed`
 * est re-rastérisé à chaque frame de défilement sur Chrome/Android, et rame.
 * La règle anti-jank de CLAUDE.md (mesurée en juin, commit 246d8e5) veut un
 * fond quasi opaque là-bas, et le verre dépoli partout ailleurs.
 *
 * ⚠️ `false` côté serveur, et ce n'est pas un défaut : le HTML servi porte le
 * verre dépoli, un visiteur Android bascule sur le fond plat au premier rendu
 * client. L'inverse — supposer Android — priverait tout le monde de l'effet le
 * temps de l'hydratation.
 *
 * ⚠️ Reniflage d'agent utilisateur, oui. Aucune media query ne dit « ce
 * moteur rame sur cet effet ». Le jour où l'une existe, c'est ici qu'on change.
 */
export function useAndroid(): boolean {
  return useValeurClient(() => /Android/i.test(navigator.userAgent), false)
}
