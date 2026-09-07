'use client'

/* La frontière d'erreur du questionnaire (07/09/2026).
 *
 * Six écrans, du code client de bout en bout, un moteur d'envoi de photos qui
 * vit hors de React : une exception en cours de route blanchissait l'écran.
 * Or c'est le seul endroit du site où quelqu'un a déjà DONNÉ quelque chose —
 * son histoire, son titre, parfois ses photos — sans que rien ne soit encore
 * parti chez nous.
 *
 * Le brouillon est sauvegardé sur l'appareil à chaque écran (draft.ts) et
 * survit très bien à un rechargement. Personne ne le savait à cet
 * instant-là : c'est ce que cette page dit, et c'est toute son utilité.
 *
 * `reset()` remonte le sous-arbre sans recharger la page — la reprise est
 * immédiate quand la panne était passagère. Le rechargement complet reste
 * offert en second, parce qu'il repart d'un moteur d'envoi neuf. */

import { useEffect } from 'react'
import { CONTACT_EMAIL } from '../content'
import './composer.css'

export default function ErreurComposer({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    /* Le seul endroit où cette panne laisse une trace : les journaux du
       serveur. Sans ça, une exception ici ne serait vue de personne. */
    console.error('[composer] écran en erreur', error.digest ?? '', error.message)
  }, [error])

  return (
    <div className="at-q">
      <div className="at-q-scroll">
        <div className="at-q-screen">
          <p className="at-kicker">Un instant</p>
          <h2>Quelque chose s’est mal passé de notre côté.</h2>
          <p className="at-lede at-q-lede">
            <b>Vos réponses sont enregistrées sur cet appareil</b> : elles n’ont
            pas bougé, et vous reprendrez là où vous en étiez. Si des photos
            étaient en cours d’envoi, elles reprendront aussi.
          </p>
          <div className="at-q-actions" style={{ marginTop: 28 }}>
            <button type="button" className="at-cta" onClick={reset}>
              Reprendre <span className="at-cta-arrow">→</span>
            </button>
            {/* Rechargement complet : il repart d'un moteur d'envoi neuf,
                ce que `reset()` seul ne fait pas. */}
            <a className="at-skip" href="/composer">
              Recharger la page
            </a>
          </div>
          <p className="at-hint at-hint--calme" style={{ marginTop: 32 }}>
            Si cela se reproduit, écrivez-nous à <b>{CONTACT_EMAIL}</b> : on
            retrouve votre dossier et on termine avec vous.
          </p>
        </div>
      </div>
    </div>
  )
}
