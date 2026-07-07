/* State machine du parcours /atelier — pur TypeScript, sans React.
   Un seul état source de vérité, transitions gardées (action hors
   phase attendue = no-op). */

import {
  DEFAULT_BINDING,
  LOCK_KEY,
  MAX_ANALYSIS_STARTS,
  MAX_REFUSALS,
  SESSION_KEY,
  TITLE_MAX_LENGTH,
  VIGNETTES_KEY,
  type BindingColorId,
} from '../constants'
import type { AnalysisResult, IllustrationResult } from './atelierApi'
import { safeLocalGet, safeLocalSet, safeSessionGet, safeSessionSet } from './storage'

export type AtelierPhase =
  | 'idle'
  | 'photosReady'
  | 'analyzing'
  | 'analysisShown'
  | 'analysisRefused'
  | 'emailGate'
  | 'generating'
  | 'revealed'
  | 'editing'

export type LockedReason = 'consumed' | 'refusals' | 'returning' | null

export interface SlotPhoto {
  file: File
  prepared: Blob /* JPEG redimensionné — c'est LUI qu'on envoie */
  previewUrl: string /* objectURL du JPEG préparé */
}

export interface AtelierState {
  phase: AtelierPhase
  photos: [SlotPhoto | null, SlotPhoto | null]
  analysis: AnalysisResult | null
  /* Vignettes restaurées après un refresh (dataURL) — fallback quand les
     objectURL des photos ne survivent pas au reload. */
  vignettes: [string | null, string | null]
  prenom: string
  email: string
  jobId: string | null
  illustration: IllustrationResult | null
  titre: string
  couleur: BindingColorId
  /* Verrou du garde-fou (regard consommé / cap de refus / visiteur revenu) */
  locked: boolean
  lockedReason: LockedReason
  /* Erreur réseau transitoire (retour aux slots, ni consommé ni refus) */
  analysisError: string | null
}

export const initialState: AtelierState = {
  phase: 'idle',
  photos: [null, null],
  analysis: null,
  vignettes: [null, null],
  prenom: '',
  email: '',
  jobId: null,
  illustration: null,
  titre: '',
  couleur: DEFAULT_BINDING,
  locked: false,
  lockedReason: null,
  analysisError: null,
}

export type AtelierAction =
  | { type: 'PHOTO_SET'; index: 0 | 1; photo: SlotPhoto }
  | { type: 'PHOTO_REMOVED'; index: 0 | 1 }
  | { type: 'ANALYSIS_STARTED' }
  | { type: 'ANALYSIS_DONE'; analysis: AnalysisResult; locked: boolean; lockedReason: LockedReason }
  | { type: 'ANALYSIS_FAILED'; message: string }
  | { type: 'ANALYSIS_RETRY' }
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
      return {
        ...state,
        photos,
        analysisError: null,
        phase: photos.every(Boolean) ? 'photosReady' : 'idle',
      }
    }
    case 'PHOTO_REMOVED': {
      if (state.phase !== 'idle' && state.phase !== 'photosReady') return state
      const photos: AtelierState['photos'] = [...state.photos]
      photos[action.index] = null
      return { ...state, photos, phase: 'idle' }
    }
    case 'ANALYSIS_STARTED': {
      if (state.phase !== 'photosReady' || state.locked) return state
      return { ...state, phase: 'analyzing', analysisError: null }
    }
    case 'ANALYSIS_DONE': {
      if (state.phase !== 'analyzing') return state
      const shown = action.analysis.statut === 'ok' || action.analysis.statut === 'mixte'
      return {
        ...state,
        phase: shown ? 'analysisShown' : 'analysisRefused',
        analysis: action.analysis,
        locked: action.locked,
        lockedReason: action.lockedReason,
      }
    }
    case 'ANALYSIS_FAILED': {
      if (state.phase !== 'analyzing') return state
      /* Retour aux slots, photos conservées, message doux sous le bouton */
      return { ...state, phase: 'photosReady', analysisError: action.message }
    }
    case 'ANALYSIS_RETRY': {
      if (state.phase !== 'analysisRefused' || state.locked) return state
      return {
        ...state,
        phase: state.photos.every(Boolean) ? 'photosReady' : 'idle',
        analysis: null,
        analysisError: null,
      }
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

/* ============================================================
   Stockage en 2 couches (durées de vie différentes)
   ------------------------------------------------------------
   localStorage 'atelier_regard'   — VERROU DE COÛT, survit à la fermeture
     de l'onglet (sinon fermer/rouvrir = regard gratuit illimité). Juste
     des compteurs, aucune donnée personnelle.
   sessionStorage 'atelier_analysis' — snapshot du parcours, éphémère : on
     ne conserve pas les souvenirs du visiteur au-delà de l'onglet.
   sessionStorage 'atelier_vignettes' — miniatures de reprise (clé séparée :
     si le quota saute, le snapshot analyse reste intact).
   ============================================================ */

export interface AnalysisLock {
  v: 1
  consumed: boolean /* un statut consomme:true a été livré (ok/mixte) */
  refusals: number /* nb de statuts non-ok reçus (doublon inclus) */
  starts: number /* nb de clics « Envoyer » (anti-spam reload) */
  inFlight: boolean /* true entre le clic et la réponse — détecte le refresh mi-analyse */
}

export interface AtelierSnapshot {
  v: 2
  checkpoint: 'analysis' | 'revealed' | null
  analysis?: AnalysisResult
  prenom?: string
  email?: string
  jobId?: string
  illustration?: IllustrationResult
  titre?: string
  couleur?: BindingColorId
}

const EMPTY_LOCK: AnalysisLock = {
  v: 1,
  consumed: false,
  refusals: 0,
  starts: 0,
  inFlight: false,
}

export function readLock(): AnalysisLock | null {
  const lock = safeLocalGet<AnalysisLock>(LOCK_KEY)
  if (lock && lock.v === 1) return lock
  /* Migration d'un ancien snapshot v1 (même onglet, à cheval sur un déploiement) :
     un parcours « done » ne doit pas redonner un regard gratuit. */
  const legacy = safeSessionGet<{ v?: number; status?: string }>(SESSION_KEY)
  if (legacy && legacy.v === 1 && legacy.status === 'done') {
    const migrated: AnalysisLock = { v: 1, consumed: true, refusals: 0, starts: 1, inFlight: false }
    safeLocalSet(LOCK_KEY, migrated)
    return migrated
  }
  return null
}

export function writeLock(patch: Partial<AnalysisLock>): void {
  const base = readLock() ?? EMPTY_LOCK
  safeLocalSet(LOCK_KEY, { ...base, ...patch, v: 1 })
}

export function readSnapshot(): AtelierSnapshot | null {
  const snap = safeSessionGet<AtelierSnapshot>(SESSION_KEY)
  return snap && snap.v === 2 ? snap : null
}

export function writeSnapshot(patch: Partial<AtelierSnapshot>): void {
  const base: AtelierSnapshot = readSnapshot() ?? { v: 2, checkpoint: null }
  safeSessionSet(SESSION_KEY, { ...base, ...patch, v: 2 })
}

export function readVignettes(): [string, string] | null {
  const v = safeSessionGet<[string, string]>(VIGNETTES_KEY)
  return Array.isArray(v) && v.length === 2 ? v : null
}

export function writeVignettes(vignettes: [string, string]): void {
  safeSessionSet(VIGNETTES_KEY, vignettes)
}

/* Le prochain « Envoyer » est-il autorisé ? (garde-fou consommation) */
export function canStartAnalysis(lock: AnalysisLock | null): boolean {
  if (!lock) return true
  if (lock.consumed) return false
  if (lock.refusals >= MAX_REFUSALS) return false
  if (lock.starts >= MAX_ANALYSIS_STARTS) return false
  return true
}

/* Reconstruit l'état à restaurer au chargement de la page.
   Retourne null si le parcours repart de zéro (slots vierges). */
export function restoreFromSnapshot(
  lock: AnalysisLock | null,
  snap: AtelierSnapshot | null,
  vignettes: [string, string] | null
): Partial<AtelierState> | null {
  if (lock?.consumed) {
    const base: Partial<AtelierState> = {
      prenom: snap?.prenom ?? '',
      email: snap?.email ?? '',
      jobId: snap?.jobId ?? null,
      titre: snap?.titre ?? '',
      couleur: snap?.couleur ?? DEFAULT_BINDING,
      locked: true,
      lockedReason: 'consumed',
    }
    /* Reprise après révélation → retour direct à l'éditeur */
    if (snap?.checkpoint === 'revealed' && snap.illustration && snap.analysis) {
      return { ...base, analysis: snap.analysis, illustration: snap.illustration, phase: 'revealed' }
    }
    /* Reprise même onglet : l'analyse consommée est en session → reveal verrouillé,
       vignettes restaurées si présentes (objectURL perdus au reload). */
    if (snap?.analysis) {
      return {
        ...base,
        analysis: snap.analysis,
        vignettes: vignettes ?? [null, null],
        phase: 'analysisShown',
      }
    }
    /* Visiteur qui revient (nouvel onglet, verrou localStorage seul) → écran dédié */
    return { locked: true, lockedReason: 'returning' }
  }

  /* Cap de refus / d'envois atteint → verrou doux, message de clôture */
  if (lock && (lock.refusals >= MAX_REFUSALS || lock.starts >= MAX_ANALYSIS_STARTS)) {
    return { locked: true, lockedReason: 'refusals' }
  }

  /* inFlight (refresh mi-analyse) ou rien à restaurer → parcours vierge.
     La réponse est perdue, les File ne survivent pas ; ni consommé ni refus.
     Le plafond `starts` protège du spam-reload. */
  return null
}
