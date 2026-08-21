'use client'

/* Le questionnaire — 6 écrans, une question par écran (PRD §7.2).
   Aucun compte, retour possible, persistance localStorage à chaque écran.

   L'écriture en base a lieu UNE SEULE FOIS, à la fin de l'écran 4 : la présence
   d'un token dans le brouillon signifie « le dossier existe », on ne le recrée
   jamais, même si la cliente revient en arrière puis ré-avance. */

import { useCallback, useEffect, useRef, useState } from 'react'
import Screen1Occasion from './screens/Screen1Occasion'
import Screen2Histoire from './screens/Screen2Histoire'
import Screen3Titre from './screens/Screen3Titre'
import Screen4Contact from './screens/Screen4Contact'
import Screen5Depot from './screens/Screen5Depot'
import Screen6Fin from './screens/Screen6Fin'
import { EMPTY_DRAFT, loadDraft, saveDraft, type Draft } from './draft'
import './composer.css'

const TOTAL = 6
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function Composer() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pret, setPret] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  /* Reprise au montage — jamais pendant le rendu serveur, sinon l'HTML
     livré et l'HTML hydraté divergent. */
  useEffect(() => {
    setDraft(loadDraft())
    setPret(true)
  }, [])

  /* Sauvegarde à chaque changement, une fois la reprise faite. */
  useEffect(() => {
    if (pret) saveDraft(draft)
  }, [draft, pret])

  const patch = useCallback((p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }))
  }, [])

  const aller = useCallback((n: number) => {
    if (n < 1 || n > TOTAL) return
    setErreur(null)
    setDraft((d) => ({ ...d, screen: n }))
    scroller.current?.scrollTo({ top: 0 })
  }, [])

  /* Fin d'écran 4 : création du dossier. Idempotent par le token. */
  const creerNumero = useCallback(async () => {
    if (!draft.prenom.trim()) {
      setErreur('Il nous faut votre prénom pour vous écrire.')
      return
    }
    if (!EMAIL_PATTERN.test(draft.email.trim())) {
      setErreur('Cette adresse email ne semble pas valide.')
      return
    }
    if (draft.token) { aller(5); return }

    setEnvoi(true)
    setErreur(null)
    try {
      const res = await fetch('/api/atelier/numero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion: draft.occasion,
          histoire: draft.histoire,
          titre: draft.titre,
          prenom: draft.prenom,
          email: draft.email,
          telephone: draft.telephone,
        }),
      })
      const data = (await res.json()) as { token?: string; error?: string }

      if (!res.ok || !data.token) {
        setErreur(
          data.error === 'rate_limited'
            ? 'Trop de tentatives. Réessayez dans un instant.'
            : 'L’atelier n’a pas pu enregistrer votre demande. Réessayez.'
        )
        return
      }
      setDraft((d) => ({ ...d, token: data.token!, screen: 5 }))
      scroller.current?.scrollTo({ top: 0 })
    } catch {
      setErreur('Connexion perdue. Vérifiez votre réseau, puis réessayez.')
    } finally {
      setEnvoi(false)
    }
  }, [draft, aller])

  /* On rend TOUJOURS quelque chose, dès le serveur.
     Un garde `if (!pret) return <coquille vide />` donnait un écran noir
     entièrement vide tant que React n'avait pas hydraté — sur un téléphone
     lent ou un réseau lent, ça se lit comme un site cassé.
     Le rendu serveur part donc de l'écran 1 (EMPTY_DRAFT), identique au
     premier rendu client : aucun décalage d'hydratation. L'effet de reprise
     corrige ensuite l'écran. Un visiteur qui revient voit l'écran 1 une
     frame avant de retomber sur le sien — infiniment préférable au vide. */
  const n = draft.screen

  return (
    <div className="at-q">
      {/* PRD §15 : la barre ne s'anime jamais en width — scaleX seul. */}
      <div className="at-bar">
        <i style={{ transform: `scaleX(${n / TOTAL})` }} />
      </div>

      <div className="at-q-top">
        <button
          type="button"
          className="at-q-back"
          onClick={() => aller(n - 1)}
          style={{ visibility: n === 1 || n === 6 ? 'hidden' : 'visible' }}
        >
          ← Retour
        </button>
        <span className="at-q-logo">Bellajour</span>
        <a className="at-q-close" href="/atelier">Fermer ✕</a>
      </div>

      <div className="at-q-scroll" ref={scroller}>
        <div className="at-q-screen" key={n}>
          {n === 1 && (
            <Screen1Occasion value={draft.occasion} onChange={(v) => patch({ occasion: v })} />
          )}
          {n === 2 && (
            <Screen2Histoire value={draft.histoire} onChange={(v) => patch({ histoire: v })} />
          )}
          {n === 3 && (
            <Screen3Titre
              value={draft.titre}
              onChange={(v) => patch({ titre: v })}
              onSkip={() => { patch({ titre: '' }); aller(4) }}
            />
          )}
          {n === 4 && (
            <Screen4Contact
              prenom={draft.prenom}
              email={draft.email}
              telephone={draft.telephone}
              onChange={(champ, v) => patch({ [champ]: v } as Partial<Draft>)}
              erreur={erreur}
            />
          )}
          {n === 5 && <Screen5Depot token={draft.token} />}
          {n === 6 && (
            <Screen6Fin
              titre={draft.titre}
              consentCommunication={draft.consentCommunication}
              onConsent={(v) => patch({ consentCommunication: v })}
            />
          )}

          <div className="at-q-actions">
            {n < 4 && (
              <button type="button" className="at-cta" onClick={() => aller(n + 1)}>
                Continuer <span className="at-cta-arrow">→</span>
              </button>
            )}
            {n === 4 && (
              <button type="button" className="at-cta" onClick={creerNumero} disabled={envoi}>
                {envoi ? 'Un instant…' : 'Continuer'} <span className="at-cta-arrow">→</span>
              </button>
            )}
            {/* Le libellé du dépôt dit « Envoyer à l'atelier », jamais « Valider ». */}
            {n === 5 && (
              <button type="button" className="at-cta" onClick={() => aller(6)}>
                Envoyer à l’atelier <span className="at-cta-arrow">→</span>
              </button>
            )}
            {n === 6 && (
              <a className="at-cta" href="/atelier">
                Revenir au site <span className="at-cta-arrow">→</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
