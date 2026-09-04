'use client'

import { useEffect, useState } from 'react'

/**
 * Le coin compte de la barre — « Mon compte », et « Suivre mon numéro »
 * quand un magazine est en fabrication.
 *
 * Les cookies de session sont httpOnly : un composant client ne peut pas
 * les lire, et les pages / et /magazine sont STATIQUES — la vérité vient
 * donc d'un fetch unique vers /api/compte/statut après le montage. Le
 * serveur rend l'icône seule (l'état de départ), le client complète :
 * même famille de mécanique que le libellé de reprise dans Nav.
 *
 * RÈGLE DE MATHIAS : le CTA marketing ne disparaît jamais. « Suivre mon
 * numéro » S'AJOUTE — lien texte cuivre sur grand écran ; sous 560 px,
 * l'emplacement compte devient LUI-MÊME la pastille « Suivre mon numéro »
 * (l'icône s'efface, nav.css fait la bascule via .a-suivi). L'accès au
 * compte n'est pas perdu : la page du numéro porte le lien « Mon compte ».
 */

type Statut = {
  connecte: boolean
  numeroEnCours: { token: string; etat: string } | null
}

export default function NavCompte() {
  const [suivi, setSuivi] = useState<{ token: string } | null>(null)

  useEffect(() => {
    let vivant = true
    fetch('/api/compte/statut', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Statut>) : null))
      .then((s) => {
        if (vivant && s?.numeroEnCours) setSuivi({ token: s.numeroEnCours.token })
      })
      .catch(() => {
        /* La barre ne casse jamais une page : sans réponse, l'icône reste. */
      })
    return () => {
      vivant = false
    }
  }, [])

  return (
    <span className={`at-nav-perso${suivi ? ' a-suivi' : ''}`}>
      {suivi ? (
        <a className="at-nav-suivi" href={`/numero/${suivi.token}`} aria-label="Suivre mon numéro">
          <i className="at-nav-suivi-point" aria-hidden="true" />
          {/* Deux libellés, un seul visible (nav.css) : le plein partout,
              le court sous 470 px — « logo + pastille + CTA complet » ne
              tient pas dans 375 px, mesuré le 04/09. La destination ne
              change pas, l'aria-label dit toujours la phrase entière. */}
          <span className="at-nav-suivi-long" aria-hidden="true">Suivre mon numéro</span>
          <span className="at-nav-suivi-court" aria-hidden="true">Mon numéro</span>
        </a>
      ) : null}
      <a className="at-nav-compte" href="/compte" aria-label="Mon compte">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
          <circle cx="12" cy="8.2" r="3.4" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M4.8 19.4c1.4-3.1 4.1-4.7 7.2-4.7s5.8 1.6 7.2 4.7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </a>
    </span>
  )
}
