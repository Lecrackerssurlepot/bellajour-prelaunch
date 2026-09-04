'use client'

import { useEffect, useState } from 'react'

/**
 * Le coin compte de la barre — la signature du « je suis connectée », et le
 * raccourci vers ce qui est en fabrication.
 *
 * Les cookies de session sont httpOnly : un composant client ne peut pas
 * les lire, et les pages / et /magazine sont STATIQUES — la vérité vient
 * donc d'un fetch unique vers /api/compte/statut après le montage. Le
 * serveur rend l'icône neutre (l'état de départ), le client complète.
 *
 * TROIS RÈGLES DE MATHIAS (04/09), et elles se voient dans le rendu :
 * 1. Le CTA marketing ne disparaît JAMAIS. Ce qui suit s'AJOUTE à côté.
 * 2. Sur MOBILE, la barre ne porte QUE le compte — pas de raccourci de
 *    suivi : il vit dans la page compte, où il y a la place de le dire.
 * 3. Connectée, l'icône devient sa PHOTO Google (ou son initiale) : c'est
 *    à ça qu'on voit qu'on est chez soi.
 *
 * Et le raccourci ne devine rien : un seul numéro en cours, il y mène ;
 * plusieurs, il dit « Mes numéros » et ouvre le compte.
 */

type Statut = {
  ouvert: boolean
  connecte: boolean
  enCours: number
  token: string | null
  photo: string | null
  initiale: string | null
}

export default function NavCompte() {
  const [statut, setStatut] = useState<Statut | null>(null)

  useEffect(() => {
    let vivant = true
    fetch('/api/compte/statut', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Statut>) : null))
      .then((s) => {
        if (vivant && s?.ouvert) setStatut(s)
      })
      .catch(() => {
        /* La barre ne casse jamais une page : sans réponse, l'icône reste. */
      })
    return () => {
      vivant = false
    }
  }, [])

  /* ⚠️ Tant que /api/compte/statut n'a pas dit « ouvert », la barre ne
     montre AUCUNE entrée de compte : proposer une porte qui ne s'ouvre pas
     est pire que ne rien proposer. La place reste réservée pour que le CTA
     ne saute pas à l'arrivée de la réponse. */
  if (!statut?.ouvert) return <span className="at-nav-perso at-nav-perso--vide" />

  const suivi =
    statut && statut.enCours > 0
      ? statut.enCours === 1 && statut.token
        ? { href: `/numero/${statut.token}`, mot: 'Suivre mon numéro' }
        : { href: '/compte', mot: 'Mes numéros' }
      : null

  return (
    <span className="at-nav-perso">
      {/* Le raccourci de suivi : DESKTOP UNIQUEMENT (nav.css le masque sous
          560 px). Sur mobile il vivrait au détriment du CTA. */}
      {suivi ? (
        <a className="at-nav-suivi" href={suivi.href}>
          <i className="at-nav-suivi-point" aria-hidden="true" />
          {suivi.mot}
        </a>
      ) : null}

      <a
        className={`at-nav-compte${statut.connecte ? ' est-connecte' : ''}`}
        href="/compte"
        aria-label={statut.connecte ? 'Mon compte, connectée' : 'Mon compte'}
      >
        {statut.photo ? (
          <img className="at-nav-avatar" src={statut.photo} alt="" width={28} height={28} />
        ) : statut.connecte && statut.initiale ? (
          <span className="at-nav-initiale" aria-hidden="true">
            {statut.initiale}
          </span>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
            <circle cx="12" cy="8.2" r="3.4" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M4.8 19.4c1.4-3.1 4.1-4.7 7.2-4.7s5.8 1.6 7.2 4.7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        )}
      </a>
    </span>
  )
}
