'use client'

/**
 * La case FACULTATIVE « montrer des extraits » (PRD §14), sur la page du
 * numéro — plus sur l'écran 6 du composeur (T2-1).
 *
 * Elle a quitté le moment de conclusion pour un endroit où elle a du contexte
 * et du temps : la page que la cliente rouvre pendant toute la vie du numéro.
 * Sur l'écran final du dépôt, une case seule se lisait comme une condition à
 * remplir ; ici, en pied de page et annoncée « facultatif », elle redevient
 * ce qu'elle est — une faveur qu'on peut accorder, retirer, ou ignorer.
 *
 * Même mécanique que l'ancien écran 6 : bascule optimiste, PATCH
 * `consent_communication` (décochable, contrairement à consent_photos), et
 * retour en arrière si l'enregistrement échoue — une case cochée à l'écran
 * mais absente en base est le pire des deux mondes.
 */

import { useCallback, useState } from 'react'

export default function ConsentCommunication({
  token, valeur,
}: {
  token: string
  /** L'état en base au rendu de la page : la vérité de départ. */
  valeur: boolean
}) {
  const [cochee, setCochee] = useState(valeur)
  const [erreur, setErreur] = useState<string | null>(null)

  const basculer = useCallback(
    async (v: boolean) => {
      setCochee(v)
      setErreur(null)
      try {
        const r = await fetch('/api/atelier/numero', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, consent_communication: v }),
        })
        if (!r.ok) throw new Error('patch')
      } catch {
        setCochee(!v)
        setErreur('Votre choix n’a pas pu être enregistré. Réessayez, ou dites-le-nous par mail.')
      }
    },
    [token],
  )

  return (
    <div className="nu-facultatif">
      <p className="nu-facultatif-titre">Facultatif</p>
      <label className="nu-check">
        <input type="checkbox" checked={cochee} onChange={(e) => basculer(e.target.checked)} />
        <span>
          J’accepte que Bellajour montre un extrait de mon numéro — une couverture, une
          page — pour donner envie à d’autres.
        </span>
      </label>
      <p className="nu-facultatif-note">
        Cochée ou non, cela ne change rien à votre numéro, ni à son prix, ni à son délai.
        Vous pouvez changer d’avis quand vous voulez.
      </p>
      {erreur && <p className="nu-erreur">{erreur}</p>}
    </div>
  )
}
