'use client'

/**
 * La « feuille d'ajustement » de l'état 2 (T-091) — la porte de sortie douce.
 *
 * Avant, une cliente pas tout à fait convaincue par sa couverture ne pouvait
 * que RÉPONDRE AU MAIL, ou partir. Ici elle coche ce qui cloche (motifs) et,
 * si elle veut, laisse un mot — et ça part à l'atelier en deux gestes, sans
 * écrire de mail. Elle reste dans le flux ; l'atelier reçoit une demande
 * structurée, journalisée dans `evenements` (route PATCH /api/atelier/numero,
 * champ `ajustement_mot` / `ajustement_motifs`).
 *
 * AUCUN changement d'état, AUCUN mail : le paiement reste possible juste après.
 * C'est une demande, pas un engagement — la cliente peut toujours commander.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const MOTIFS = [
  'L’ambiance, les couleurs',
  'Une photo à changer',
  'Le titre',
  'La mise en page',
  'Autre chose',
] as const

export default function FeuilleAjustement({
  token, ouvert, onFermer,
}: {
  token: string
  ouvert: boolean
  onFermer: () => void
}) {
  const [choisis, setChoisis] = useState<string[]>([])
  const [mot, setMot] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  /* Escape ferme la feuille ; le focus part sur la carte à l'ouverture pour
     que le lecteur d'écran et le clavier entrent dans le dialogue. */
  useEffect(() => {
    if (!ouvert) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', onKey)
    cardRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [ouvert, onFermer])

  const basculer = useCallback((motif: string) => {
    setErreur(null)
    setChoisis((liste) =>
      liste.includes(motif) ? liste.filter((m) => m !== motif) : [...liste, motif],
    )
  }, [])

  const peutEnvoyer = choisis.length > 0 || mot.trim().length > 0

  const envoyer = useCallback(async () => {
    if (!peutEnvoyer || occupe) return
    setOccupe(true)
    setErreur(null)
    try {
      const r = await fetch('/api/atelier/numero', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ajustement_motifs: choisis,
          ajustement_mot: mot.trim(),
        }),
      })
      if (!r.ok) throw new Error('ajustement')
      setEnvoye(true)
    } catch {
      setErreur('Votre demande n’est pas partie. Réessayez dans un instant.')
      setOccupe(false)
    }
  }, [token, choisis, mot, peutEnvoyer, occupe])

  if (!ouvert) return null

  return (
    <div
      className="nu-feuille"
      data-open="true"
      onMouseDown={(e) => {
        /* Clic sur le fond (jamais sur la carte) → on ferme. */
        if (e.target === e.currentTarget) onFermer()
      }}
    >
      <div
        ref={cardRef}
        className="nu-feuille-carte"
        role="dialog"
        aria-modal="true"
        aria-label="Envie d’un ajustement"
        tabIndex={-1}
      >
        {envoye ? (
          <>
            <p className="nu-feuille-done">C’est noté. L’atelier repasse dessus.</p>
            <p className="nu-feuille-sub" style={{ textAlign: 'center' }}>
              Vous recevrez une nouvelle version — rien n’est dû tant que vous n’avez pas dit oui.
            </p>
            <div className="nu-feuille-row" style={{ justifyContent: 'center' }}>
              <button type="button" className="nu-feuille-send" onClick={onFermer}>
                Fermer
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="nu-feuille-titre">Envie d’un ajustement&nbsp;?</h3>
            <p className="nu-feuille-sub">
              Dites-le en deux mots — l’atelier repasse dessus, et vous recevez une nouvelle
              version. Pas besoin d’écrire un mail.
            </p>

            <div className="nu-feuille-chips">
              {MOTIFS.map((motif) => {
                const actif = choisis.includes(motif)
                return (
                  <button
                    key={motif}
                    type="button"
                    className="nu-feuille-chip"
                    aria-pressed={actif}
                    onClick={() => basculer(motif)}
                  >
                    {motif}
                  </button>
                )
              })}
            </div>

            <textarea
              className="nu-feuille-mot"
              value={mot}
              onChange={(e) => {
                setErreur(null)
                setMot(e.target.value)
              }}
              placeholder="Un mot de plus, si vous voulez (facultatif)"
              maxLength={2000}
            />

            {erreur && <p className="nu-erreur" role="alert">{erreur}</p>}

            <div className="nu-feuille-row">
              <button type="button" className="nu-feuille-cancel" onClick={onFermer}>
                Annuler
              </button>
              <button
                type="button"
                className="nu-feuille-send"
                onClick={() => void envoyer()}
                disabled={!peutEnvoyer || occupe}
              >
                {occupe ? 'Un instant…' : 'Envoyer à l’atelier'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
