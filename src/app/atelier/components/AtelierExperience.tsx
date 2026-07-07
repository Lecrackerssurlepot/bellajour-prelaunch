'use client'

/* Orchestrateur du parcours /atelier — seul détenteur de l'état
   (useReducer), effets asynchrones annulables, reprise de session,
   montage progressif des sections (toujours ajoutées SOUS le viewport). */

import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { BindingColorId } from '../constants'
import {
  analyzePhotos,
  generateIllustration,
  saveInteraction,
  submitEmail,
} from '../lib/atelierApi'
import {
  atelierReducer,
  canStartAnalysis,
  initialState,
  readSnapshot,
  restoreFromSnapshot,
  writeSnapshot,
} from '../lib/atelierState'
import { usePhotoSlots } from '../hooks/usePhotoSlots'
import S1Hero from './S1Hero'
import S2Selection from './S2Selection'
import S3Revelation from './S3Revelation'
import S4Editor from './S4Editor'
import S5Prevente from './S5Prevente'

function motionAllowed(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: no-preference)').matches
}

export default function AtelierExperience() {
  const [state, dispatch] = useReducer(atelierReducer, initialState)
  const { errors, setPhoto, removePhoto } = usePhotoSlots(state.photos, dispatch)
  const s3Ref = useRef<HTMLDivElement>(null)
  const jobIdRef = useRef(state.jobId)

  useEffect(() => {
    jobIdRef.current = state.jobId
  }, [state.jobId])

  /* Reprise de session (reload) — dans un effect, jamais en initializer,
     pour éviter tout mismatch d'hydratation SSR. */
  useEffect(() => {
    const snap = readSnapshot()
    if (!snap) return
    const restored = restoreFromSnapshot(snap)
    if (restored) dispatch({ type: 'SESSION_RESTORED', restored })
  }, [])

  /* Analyse — 8s simulées, annulée si navigation pendant l'attente */
  useEffect(() => {
    if (state.phase !== 'analyzing') return
    const [photo1, photo2] = state.photos
    if (!photo1 || !photo2) return
    const ac = new AbortController()
    analyzePhotos(photo1.file, photo2.file, { signal: ac.signal })
      .then((analysis) => {
        writeSnapshot({ status: 'done', checkpoint: 'analysis', analysis })
        dispatch({ type: 'ANALYSIS_DONE', analysis })
      })
      .catch(() => {
        /* abort à la navigation — rien à faire */
      })
    return () => ac.abort()
  }, [state.phase, state.photos])

  /* Génération — 15s simulées */
  useEffect(() => {
    if (state.phase !== 'generating' || !state.jobId) return
    const ac = new AbortController()
    generateIllustration(state.jobId, { signal: ac.signal })
      .then((illustration) => {
        writeSnapshot({ checkpoint: 'revealed', illustration })
        dispatch({ type: 'GENERATION_DONE', illustration })
      })
      .catch(() => {
        /* abort à la navigation */
      })
    return () => ac.abort()
  }, [state.phase, state.jobId])

  /* Scroll doux vers le gate quand il se monte (CTA « Découvrir ») */
  useEffect(() => {
    if (state.phase !== 'emailGate') return
    const raf = requestAnimationFrame(() => {
      s3Ref.current?.scrollIntoView({
        behavior: motionAllowed() ? 'smooth' : 'auto',
        block: 'start',
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [state.phase])

  /* Garde-fou : verrou posé AU CLIC (status started, attempts+1).
     Max 2 analyses/session — une reprise tolérée après reload accidentel. */
  const startAnalysis = useCallback(() => {
    const snap = readSnapshot()
    if (!canStartAnalysis(snap)) return
    writeSnapshot({ status: 'started', attempts: (snap?.attempts ?? 0) + 1, checkpoint: null })
    dispatch({ type: 'ANALYSIS_STARTED' })
  }, [])

  const openEmailGate = useCallback(() => {
    dispatch({ type: 'EMAIL_GATE_OPENED' })
  }, [])

  const submitGate = useCallback(async (prenom: string, email: string) => {
    const { jobId } = await submitEmail(prenom, email)
    writeSnapshot({ prenom, email, jobId })
    dispatch({ type: 'GENERATION_STARTED', jobId, prenom, email })
  }, [])

  const editTitre = useCallback((titre: string) => {
    dispatch({ type: 'EDIT_TITRE', titre })
    writeSnapshot({ titre })
  }, [])

  const commitTitre = useCallback((titre: string) => {
    saveInteraction(jobIdRef.current ?? 'atelier-session', { titre })
  }, [])

  const editCouleur = useCallback((couleur: BindingColorId) => {
    dispatch({ type: 'EDIT_COULEUR', couleur })
    writeSnapshot({ couleur })
    saveInteraction(jobIdRef.current ?? 'atelier-session', { couleur })
  }, [])

  const showS3 =
    state.phase === 'emailGate' ||
    state.phase === 'generating' ||
    state.phase === 'revealed' ||
    state.phase === 'editing'
  const showS4S5 = state.phase === 'revealed' || state.phase === 'editing'

  return (
    <main className="at-main">
      <S1Hero />
      <div className="at-sep" aria-hidden="true" />
      <S2Selection
        phase={state.phase}
        photos={state.photos}
        analysis={state.analysis}
        errors={errors}
        locked={state.locked}
        onSelect={setPhoto}
        onRemove={removePhoto}
        onSubmit={startAnalysis}
        onDiscover={openEmailGate}
      />
      {showS3 && (
        <div ref={s3Ref}>
          <div className="at-sep" aria-hidden="true" />
          <S3Revelation
            phase={state.phase}
            photos={state.photos}
            prenom={state.prenom}
            illustration={state.illustration}
            onSubmit={submitGate}
          />
        </div>
      )}
      {showS4S5 && (
        <>
          <div className="at-sep" aria-hidden="true" />
          <S4Editor
            titre={state.titre}
            couleur={state.couleur}
            onTitre={editTitre}
            onTitreCommit={commitTitre}
            onCouleur={editCouleur}
          />
          <div className="at-sep" aria-hidden="true" />
          <S5Prevente titre={state.titre} couleur={state.couleur} email={state.email} />
        </>
      )}
    </main>
  )
}
