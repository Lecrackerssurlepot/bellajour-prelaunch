import '../numero.css'
import '@/app/(atelier)/compte/compte.css'

/**
 * L'écran d'attente de la page d'un numéro.
 *
 * `/numero/<token>` est `force-dynamic` et doit le rester : elle raconte un
 * état qui change dans le dos de la cliente, et un cache y afficherait la
 * fabrication d'hier. Avant de répondre, elle lit le dossier, vérifie la
 * session, rattache le numéro au compte et signe chaque visuel.
 *
 * Sans ce fichier, Next gardait l'écran précédent figé pendant tout ce
 * temps-là — le « clic mort » que Mathias décrit le 08/09. La silhouette ne
 * raccourcit pas l'attente, elle la rend visible.
 *
 * ⚠️ Le haut de page est rendu POUR DE VRAI : il ne dépend d'aucune donnée.
 * Le bouton « Mon compte », lui, est absent — il n'apparaît que pour une
 * cliente connectée sur SON dossier, et on ne le sait pas encore. Mieux vaut
 * un haut de page sobre qui se complète qu'un bouton promis puis retiré.
 */

export default function Chargement() {
  return (
    <div className="nu cpt-squelette" aria-busy="true" aria-live="polite">
      <header className="nu-top">
        <span className="nu-top-cale" />
        <img
          className="nu-top-logo-img"
          src="/images/ui/signature-blanche.webp"
          alt="Bellajour"
          width={320}
          height={122}
          decoding="async"
        />
        <span className="nu-top-cale" />
      </header>

      <main className="nu-main">
        <span className="cpt-sr-only">Chargement de votre numéro…</span>
        <div className="cpt-sq cpt-sq--titre" />
        <div className="cpt-sq cpt-sq--sous" />
        <div className="cpt-sq cpt-sq--bloc" />
      </main>
    </div>
  )
}
