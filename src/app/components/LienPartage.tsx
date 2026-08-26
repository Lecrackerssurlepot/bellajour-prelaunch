'use client'

/**
 * Le lien permanent, en deux gestes au lieu d'une URL (T2-12).
 *
 * Personne n'enregistre une URL de 32 caractères affichée en toutes lettres :
 * elle ne donne aucun geste à faire. Deux boutons le donnent — « Copier mon
 * lien » (presse-papiers) et, là où le navigateur le propose, « Partager »
 * (le menu natif du téléphone : Notes, Messages, favoris). L'URL n'apparaît
 * plus en clair.
 *
 * Servi par la page /numero (pied de page) ET par l'écran 6 du composeur :
 * la même consigne « gardez ce lien » doit offrir les mêmes gestes partout.
 * Comme la Loupe, le composant pose son propre CSS (lienpartage.css) : il vit
 * dans deux mises en page différentes et n'emprunte à aucune des deux.
 */

import { useState, useSyncExternalStore } from 'react'
import './lienpartage.css'

const RIEN = () => () => {}

export default function LienPartage({ url }: { url: string }) {
  const [copie, setCopie] = useState(false)
  /* `navigator.share` n'existe qu'au navigateur : le serveur rend `false`
     (pas de bouton), le client la vérité — sans setState d'hydratation. */
  const partage = useSyncExternalStore(
    RIEN,
    () => typeof navigator.share === 'function',
    () => false,
  )

  /* `url` peut être relative (l'écran 6 du composeur ne connaît pas son
     origine au rendu serveur) : résolue au CLIC, où window existe toujours. */
  const absolue = () => new URL(url, window.location.origin).toString()

  async function copier() {
    try {
      await navigator.clipboard.writeText(absolue())
      setCopie(true)
      setTimeout(() => setCopie(false), 2500)
    } catch {
      /* Presse-papiers refusé (permission, vieux navigateur) : on montre
         l'URL dans une invite, le geste reste possible à la main. */
      window.prompt('Copiez ce lien :', absolue())
    }
  }

  async function partager() {
    try {
      await navigator.share({ title: 'Mon numéro Bellajour', url: absolue() })
    } catch {
      /* Annulé par la personne : pas une erreur. */
    }
  }

  return (
    <span className="bj-lienpartage">
      <button type="button" className="bj-lienpartage-btn" onClick={copier}>
        {copie ? 'Copié !' : 'Copier mon lien'}
      </button>
      {partage && (
        <button type="button" className="bj-lienpartage-btn" onClick={partager}>
          Partager
        </button>
      )}
    </span>
  )
}
