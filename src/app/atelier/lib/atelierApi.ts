/* ============================================================
   Couche API de l'atelier — VERSION SIMULÉE (V1).
   SEUL fichier à modifier pour brancher N8N/Supabase plus tard :
   conserver les signatures, remplacer les délais par des fetch.
   Zéro appel réseau dans cette version.
   ============================================================ */

import {
  ANALYSIS_DELAY_MS,
  ASSETS,
  EMAIL_DELAY_MS,
  GENERATION_DELAY_MS,
  INTERACTIONS_KEY,
  type BindingColorId,
} from '../constants'
import { safeLocalAppend } from './storage'

export interface AnalysisResult {
  titre: string
  texte: string
  placement: string
}

export interface IllustrationResult {
  illustrationUrl: string
  noteIntention: string
}

export interface ApiOptions {
  signal?: AbortSignal
}

/* Délai annulable — remplacé par le vrai fetch(url, { signal }) au branchement. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
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

/* L'atelier étudie les deux photos confiées.
   V1 : réponse fixe après 8 s — les photos ne quittent jamais le navigateur.
   // TODO: brancher webhook N8N (envoi des photos → analyse vision réelle) */
export async function analyzePhotos(
  photo1: File,
  photo2: File,
  opts?: ApiOptions
): Promise<AnalysisResult> {
  void photo1
  void photo2
  await delay(ANALYSIS_DELAY_MS, opts?.signal)
  return {
    titre: 'Lumière du soir sur la rade',
    texte:
      'Une composition qui respire. Cette lumière dorée mérite une pleine page, en ouverture de chapitre de votre album.',
    placement: 'pleine-page',
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
