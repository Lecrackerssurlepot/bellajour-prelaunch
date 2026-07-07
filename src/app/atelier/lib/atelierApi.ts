/* ============================================================
   Couche API de l'atelier — VERSION SIMULÉE (V1).
   SEUL fichier à modifier pour brancher N8N/Supabase plus tard :
   conserver les signatures, remplacer les délais par des fetch.
   Zéro appel réseau dans cette version.
   ============================================================ */

import {
  ANALYSE_WEBHOOK_URL,
  ANALYSIS_TIMEOUT_MS,
  ASSETS,
  EMAIL_DELAY_MS,
  GENERATION_DELAY_MS,
  INTERACTIONS_KEY,
  type BindingColorId,
} from '../constants'
import { anySignal, blobToBase64, timeoutSignal } from './imagePrep'
import { safeLocalAppend } from './storage'

/* Contrat de réponse du webhook N8N (analyse vision Claude). */
export type AnalyseStatut =
  | 'ok'
  | 'doublon'
  | 'mixte'
  | 'personnes'
  | 'hors-sujet'
  | 'sensible'
  | 'matiere-insuffisante'

export interface PhotoAnalyse {
  ref: string
  statut_photo: string
  titre: string | null
  observation: string | null
  texte: string | null
  geste: string | null
  placement: string | null
  placement_pourquoi: string | null
}

export interface AnalysisResult {
  statut: AnalyseStatut
  consomme: boolean
  paire: string | null
  photos: PhotoAnalyse[]
  message_front: string | null
}

/* Échec réseau / timeout / réponse invalide — À DISTINGUER d'un statut
   non-ok, qui est une réponse parfaitement valide de l'atelier. */
export class AnalysisNetworkError extends Error {
  constructor(message = 'network') {
    super(message)
    this.name = 'AnalysisNetworkError'
  }
}

export interface IllustrationResult {
  illustrationUrl: string
  noteIntention: string
}

export interface ApiOptions {
  signal?: AbortSignal
}

const STATUTS: readonly AnalyseStatut[] = [
  'ok',
  'doublon',
  'mixte',
  'personnes',
  'hors-sujet',
  'sensible',
  'matiere-insuffisante',
]

function looksLikeAnalysis(x: unknown): x is Partial<AnalysisResult> {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (!STATUTS.includes(o.statut as AnalyseStatut)) return false
  if (!Array.isArray(o.photos)) return false
  return true
}

/* Délai annulable — réutilisé par l'orchestrateur pour le plancher d'attente. */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/* L'atelier étudie les deux photos confiées → webhook N8N (Claude Vision).
   Les deux blobs sont déjà redimensionnés (voir imagePrep). Timeout 120 s
   composé avec le signal d'annulation de l'appelant (unmount / navigation). */
export async function analyzePhotos(
  photoA: Blob,
  photoB: Blob,
  opts?: ApiOptions
): Promise<AnalysisResult> {
  const [a, b] = await Promise.all([blobToBase64(photoA), blobToBase64(photoB)])
  const timeout = timeoutSignal(ANALYSIS_TIMEOUT_MS)
  const signal = opts?.signal ? anySignal([opts.signal, timeout]) : timeout

  let res: Response
  try {
    res = await fetch(ANALYSE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoA: a, photoB: b }),
      signal,
    })
  } catch (err) {
    /* Vrai abort demandé par l'appelant (démontage) → on le laisse remonter.
       Sinon : timeout 120 s ou coupure réseau → erreur métier. */
    if (opts?.signal?.aborted) throw err
    throw new AnalysisNetworkError('network')
  }

  if (!res.ok) throw new AnalysisNetworkError(`http ${res.status}`)

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new AnalysisNetworkError('invalid-json')
  }
  if (!looksLikeAnalysis(data)) throw new AnalysisNetworkError('invalid-shape')

  /* `consomme` est en principe posé par le workflow ; on le dérive par
     sécurité si absent (règle : ok/mixte consomment le regard offert). */
  const parsed = data as AnalysisResult
  const consomme =
    typeof (data as Record<string, unknown>).consomme === 'boolean'
      ? (data as Record<string, unknown>).consomme === true
      : parsed.statut === 'ok' || parsed.statut === 'mixte'

  return {
    statut: parsed.statut,
    consomme,
    paire: parsed.paire ?? null,
    photos: Array.isArray(parsed.photos) ? parsed.photos : [],
    message_front: parsed.message_front ?? null,
  }
}

/* Enregistre prénom + email et ouvre un dossier à l'atelier.
   // TODO: brancher webhook N8N (création du lead + jobId réel) */
export async function submitEmail(
  prenom: string,
  email: string
): Promise<{ jobId: string }> {
  await delay(EMAIL_DELAY_MS)
  const jobId = `atelier-${Date.now().toString(36)}`
  console.info('[atelier] submitEmail', { prenom, email, jobId })
  return { jobId }
}

/* L'illustration se peint — V1 : placeholder après 15 s.
   // TODO: brancher webhook N8N (polling du job Apiframe → URL réelle) */
export async function generateIllustration(
  jobId: string,
  opts?: ApiOptions
): Promise<IllustrationResult> {
  void jobId
  await delay(GENERATION_DELAY_MS, opts?.signal)
  return {
    illustrationUrl: ASSETS.illustration,
    noteIntention:
      'Nous avons gardé la lumière dorée de votre première photo et la silhouette de la seconde.',
  }
}

/* Trace chaque geste de composition (titre, couleur de reliure).
   // TODO: brancher webhook N8N (tracking des interactions éditeur) */
export function saveInteraction(
  jobId: string,
  data: { couleur?: BindingColorId; titre?: string }
): void {
  const entry = { jobId, ...data, at: new Date().toISOString() }
  console.info('[atelier] interaction', entry)
  safeLocalAppend(INTERACTIONS_KEY, entry)
}
