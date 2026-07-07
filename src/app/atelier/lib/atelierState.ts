/* State machine du parcours /atelier — pur TypeScript, sans React.
   Un seul état source de vérité, transitions gardées (action hors
   phase attendue = no-op). */

import {
  DEFAULT_BINDING,
  MAX_ANALYSIS_ATTEMPTS,
  SESSION_KEY,
  TITLE_MAX_LENGTH,
  type BindingColorId,
} from '../constants'
import type { AnalysisResult, IllustrationResult } from './atelierApi'
import { safeSessionGet, safeSessionSet } from './storage'

export type AtelierPhase =
  | 'idle'
  | 'photosReady'
  | 'analyzing'
  | 'analysisShown'
  | 'emailGate'
  | 'generating'
  | 'revealed'
  | 'editing'

export interface SlotPhoto {
  file: File
  previewUrl: string /* objectURL — jamais envoyé sur le réseau */
}

export interface AtelierState {
  phase: AtelierPhase
  photos: [SlotPhoto | null, SlotPhoto | null]
  analysis: AnalysisResult | null
  prenom: string
  email: string
  jobId: string | null
  illustration: IllustrationResult | null
  titre: string
  couleur: BindingColorId
  /* Verrou définitif du garde-fou (analyse déjà consommée / max atteint) */
  locked: boolean
}

export const initialState: AtelierState = {
  phase: 'idle',
  photos: [null, null],
  analysis: null,
  prenom: '',
  email: '',
  jobId: null,
  illustration: null,
  titre: '',
  couleur: DEFAULT_BINDING,
  locked: false,
}

export type AtelierAction =
  | { type: 'PHOTO_SET'; index: 0 | 1; photo: SlotPhoto }
  | { type: 'PHOTO_REMOVED'; index: 0 | 1 }
  | { type: 'ANALYSIS_STARTED' }
  | { type: 'ANALYSIS_DONE'; analysis: AnalysisResult }
  | { type: 'EMAIL_GATE_OPENED' }
  | { type: 'GENERATION_STARTED'; jobId: string; prenom: string; email: string }
  | { type: 'GENERATION_DONE'; illustration: IllustrationResult }
  | { type: 'EDIT_TITRE'; titre: string }
  | { type: 'EDIT_COULEUR'; couleur: BindingColorId }
  | { type: 'SESSION_RESTORED'; restored: Partial<AtelierState> }

export function atelierReducer(state: AtelierState, action: AtelierAction): AtelierState {
  switch (action.type) {
    case 'PHOTO_SET': {
      if (state.phase !== 'idle' && state.phase !== 'photosReady') return state
      const photos: AtelierState['photos'] = [...state.photos]
      photos[action.index] = action.photo
      return { ...state, photos, phase: photos.every(Boolean) ? 'photosReady' : 'idle' }
    }
    case 'PHOTO_REMOVED': {
      if (state.phase !== 'idle' && state.phase !== 'photosReady') return state
      const photos: AtelierState['photos'] = [...state.photos]
      photos[action.index] = null
      return { ...state, photos, phase: 'idle' }
    }
    case 'ANALYSIS_STARTED': {
      if (state.phase !== 'photosReady' || state.locked) return state
      return { ...state, phase: 'analyzing' }
    }
    case 'ANALYSIS_DONE': {
      if (state.phase !== 'analyzing') return state
      return { ...state, phase: 'analysisShown', analysis: action.analysis, locked: true }
    }
    case 'EMAIL_GATE_OPENED': {
      if (state.phase !== 'analysisShown') return state
      return { ...state, phase: 'emailGate' }
    }
    case 'GENERATION_STARTED': {
      if (state.phase !== 'emailGate') return state
      return {
        ...state,
        phase: 'generating',
        jobId: action.jobId,
        prenom: action.prenom,
        email: action.email,
      }
    }
    case 'GENERATION_DONE': {
      if (state.phase !== 'generating') return state
      return { ...state, phase: 'revealed', illustration: action.illustration }
    }
    case 'EDIT_TITRE': {
      if (state.phase !== 'revealed' && state.phase !== 'editing') return state
      return { ...state, phase: 'editing', titre: action.titre.slice(0, TITLE_MAX_LENGTH) }
    }
    case 'EDIT_COULEUR': {
      if (state.phase !== 'revealed' && state.phase !== 'editing') return state
      return { ...state, phase: 'editing', couleur: action.couleur }
    }
    case 'SESSION_RESTORED': {
      /* Uniquement au mount, avant toute interaction */
      if (state.phase !== 'idle') return state
      return { ...state, ...action.restored }
    }
    default:
      return state
  }
}

/* ---------- Snapshot de session (garde-fou + reprise) ----------
   sessionStorage 'atelier_analysis' :
   - clic « Envoyer »   → { status: 'started', attempts: n }
   - fin d'analyse      → status: 'done' + résultat (titre, texte)
   - jalons suivants    → prenom/email/jobId, checkpoint 'revealed', titre/couleur
   Max 2 analyses par session : un reload accidentel pendant l'attente
   autorise UNE reprise, ensuite verrou définitif. */

export interface AtelierSnapshot {
  v: 1
  status: 'started' | 'done'
  attempts: number
  checkpoint: 'analysis' | 'revealed' | null
  analysis?: AnalysisResult
  prenom?: string
  email?: string
  jobId?: string
  illustration?: IllustrationResult
  titre?: string
  couleur?: BindingColorId
}

export function readSnapshot(): AtelierSnapshot | null {
  const snap = safeSessionGet<AtelierSnapshot>(SESSION_KEY)
  return snap && snap.v === 1 ? snap : null
}

export function writeSnapshot(patch: Partial<AtelierSnapshot>): void {
  const base: AtelierSnapshot =
    readSnapshot() ?? { v: 1, status: 'started', attempts: 0, checkpoint: null }
  safeSessionSet(SESSION_KEY, { ...base, ...patch })
}

/* Le prochain « Envoyer » est-il autorisé ? (garde-fou) */
export function canStartAnalysis(snap: AtelierSnapshot | null): boolean {
  if (!snap) return true
  if (snap.status === 'done') return false
  return snap.attempts < MAX_ANALYSIS_ATTEMPTS
}

/* Reconstruit l'état à restaurer au chargement de la page.
   Retourne null si le parcours repart de zéro. */
export function restoreFromSnapshot(snap: AtelierSnapshot): Partial<AtelierState> | null {
  if (snap.status === 'done') {
    const base: Partial<AtelierState> = {
      analysis: snap.analysis ?? null,
      prenom: snap.prenom ?? '',
      email: snap.email ?? '',
      jobId: snap.jobId ?? null,
      titre: snap.titre ?? '',
      couleur: snap.couleur ?? DEFAULT_BINDING,
      locked: true,
    }
    if (snap.checkpoint === 'revealed' && snap.illustration) {
      /* Reprise après révélation : retour direct à l'éditeur.
         Les photos (objectURL) ne survivent pas au reload → placeholders. */
      return { ...base, illustration: snap.illustration, phase: 'revealed' }
    }
    if (snap.analysis) {
      /* Analyse faite, email pas encore confié : gate à refaire */
      return { ...base, phase: 'analysisShown' }
    }
    return base /* done sans résultat (anormal) → verrou simple */
  }
  /* status 'started' : reload pendant l'attente d'analyse */
  if (snap.attempts >= MAX_ANALYSIS_ATTEMPTS) {
    return { locked: true } /* verrou définitif, message doux en S2 */
  }
  return null /* une reprise autorisée — parcours vierge */
}
