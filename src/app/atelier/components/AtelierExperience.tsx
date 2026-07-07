'use client'

/* Orchestrateur du parcours /atelier — seul détenteur de l'état
   (useReducer), effets asynchrones annulables, reprise de session,
   montage progressif des sections (toujours ajoutées SOUS le viewport). */

import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  ANALYSIS_MIN_WAIT_MS,
  MAX_ANALYSIS_STARTS,
  MAX_REFUSALS,
  NETWORK_ERROR_MESSAGE,
  UNLIMITED_REGARDS,
  type BindingColorId,
} from '../constants'
import {
  analyzePhotos,
  delay,
  generateIllustration,
  saveInteraction,
  submitEmail,
} from '../lib/atelierApi'
import {
  atelierReducer,
  canStartAnalysis,
  initialState,
  readLock,
  readSnapshot,
  readVignettes,
  restoreFromSnapshot,
  writeLock,
  writeSnapshot,
  writeVignettes,
  type LockedReason,
} from '../lib/atelierState'
import { makeThumbnail } from '../lib/imagePrep'
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
  const { errors, pending, setPhoto, removePhoto } = usePhotoSlots(state.photos, dispatch)
  const s3Ref = useRef<HTMLDivElement>(null)
  const jobIdRef = useRef(state.jobId)

  useEffect(() => {
    jobIdRef.current = state.jobId
  }, [state.jobId])

  /* Reprise de session (reload) — dans un effect, jamais en initializer,
     pour éviter tout mismatch d'hydratation SSR. Lit le verrou localStorage,
     le snapshot session et les vignettes ; remet inFlight à false (une
     analyse interrompue par un refresh est abandonnée). */
  useEffect(() => {
    const lock = readLock()
    const snap = readSnapshot()
    const vignettes = readVignettes()
    const restored = restoreFromSnapshot(lock, snap, vignettes)
    if (restored) dispatch({ type: 'SESSION_RESTORED', restored })
    if (lock?.inFlight) writeLock({ inFlight: false })
  }, [])

  /* Analyse réelle (webhook N8N), annulée si navigation pendant l'attente.
     Plancher scénarisé : même si l'API répond avant 6 s, on attend la fin
     de la séquence de phrases. Comptabilité du garde-fou au retour. */
  useEffect(() => {
    if (state.phase !== 'analyzing') return
    const [photo1, photo2] = state.photos
    if (!photo1 || !photo2) return
    const ac = new AbortController()
    const startedAt = performance.now()
    let cancelled = false

    analyzePhotos(photo1.prepared, photo2.prepared, { signal: ac.signal })
      .then(async (analysis) => {
        const remaining = ANALYSIS_MIN_WAIT_MS - (performance.now() - startedAt)
        if (remaining > 0) await delay(remaining, ac.signal)
        if (cancelled) return

        if (analysis.consomme) {
          /* Phase de test : on ne pose pas consumed (regards illimités),
             mais on garde le snapshot + vignettes pour la reprise. */
          writeLock({ consumed: !UNLIMITED_REGARDS, inFlight: false })
          writeSnapshot({ checkpoint: 'analysis', analysis })
          /* Miniatures de reprise — best-effort, ne bloque jamais le reveal */
          try {
            const [t1, t2] = await Promise.all([
              makeThumbnail(photo1.prepared),
              makeThumbnail(photo2.prepared),
            ])
            writeVignettes([t1, t2])
          } catch {
            /* pas de vignettes restaurables — dégradation prévue */
          }
        } else {
          const lock = readLock()
          writeLock({ refusals: (lock?.refusals ?? 0) + 1, inFlight: false })
        }

        /* Phase de test : aucun verrou calculé (les compteurs restent
           inoffensifs). Sinon, garde-fou consommation habituel. */
        const lock = readLock()
        const lockedReason: LockedReason = UNLIMITED_REGARDS
          ? null
          : lock?.consumed
            ? 'consumed'
            : lock && (lock.refusals >= MAX_REFUSALS || lock.starts >= MAX_ANALYSIS_STARTS)
              ? 'refusals'
              : null
        dispatch({
          type: 'ANALYSIS_DONE',
          analysis,
          locked: lockedReason !== null,
          lockedReason,
        })
      })
      .catch(() => {
        if (ac.signal.aborted || cancelled) return
        /* Échec réseau / timeout : ni consommé ni refus, retour aux slots */
        writeLock({ inFlight: false })
        dispatch({ type: 'ANALYSIS_FAILED', message: NETWORK_ERROR_MESSAGE })
      })

    return () => {
      cancelled = true
      ac.abort()
    }
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

  /* Garde-fou : incrément du compteur d'envois + drapeau inFlight AU CLIC
     (détection du refresh mi-analyse). Le verrou de coût vit en localStorage. */
  const startAnalysis = useCallback(() => {
    const lock = readLock()
    if (!canStartAnalysis(lock)) return
    writeLock({ starts: (lock?.starts ?? 0) + 1, inFlight: true })
    writeSnapshot({ checkpoint: null })
    dispatch({ type: 'ANALYSIS_STARTED' })
  }, [])

  const retryAnalysis = useCallback(() => {
    dispatch({ type: 'ANALYSIS_RETRY' })
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
        vignettes={state.vignettes}
        errors={errors}
        pending={pending}
        locked={state.locked}
        lockedReason={state.lockedReason}
        analysisError={state.analysisError}
        onSelect={setPhoto}
        onRemove={removePhoto}
        onSubmit={startAnalysis}
        onDiscover={openEmailGate}
        onRetry={retryAnalysis}
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
