/* Préparation des photos côté client, avant l'appel N8N :
   - décodage avec orientation EXIF appliquée (photos iPhone droites)
   - redimensionnement canvas (côté long ≤ 1568px, JPEG 0.8)
   - encodage base64 SANS préfixe data URL (payload allégé)
   - miniatures de reprise (600px) pour restaurer les vignettes post-refresh
   Aucune clé, aucun réseau ici — pur traitement navigateur. */

import {
  IMAGE_JPEG_QUALITY,
  IMAGE_MAX_SIDE,
  THUMB_JPEG_QUALITY,
  THUMB_MAX_SIDE,
} from '../constants'

/* Le navigateur ne sait pas décoder ce fichier (ex. HEIC iPhone sur Chrome). */
export class ImageDecodeError extends Error {
  constructor(message = 'decode-failed') {
    super(message)
    this.name = 'ImageDecodeError'
  }
}

export interface PreparedPhoto {
  blob: Blob /* JPEG ≤ 1568px, qualité 0.8 — prêt à envoyer */
}

interface DecodedSource {
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  close: () => void
}

/* Décode un Blob/File en source dessinable, orientation EXIF cuite dans
   les pixels. Deux chemins : createImageBitmap (rapide, GPU) puis, en
   dernier recours, <img> + objectURL (Safari décode le HEIC nativement ici). */
async function decodeSource(input: Blob): Promise<DecodedSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(input, { imageOrientation: 'from-image' })
      return {
        width: bmp.width,
        height: bmp.height,
        draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h),
        close: () => bmp.close(),
      }
    } catch {
      /* Anciens moteurs refusant l'options bag → réessai sans options */
      try {
        const bmp = await createImageBitmap(input)
        return {
          width: bmp.width,
          height: bmp.height,
          draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h),
          close: () => bmp.close(),
        }
      } catch {
        /* HEIC non supporté par createImageBitmap → tenter <img> */
      }
    }
  }

  const url = URL.createObjectURL(input)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      /* Les navigateurs appliquent l'orientation EXIF aux <img> (image-orientation:
         from-image par défaut) → drawImage utilise les pixels déjà orientés. */
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      close: () => URL.revokeObjectURL(url),
    }
  } catch {
    URL.revokeObjectURL(url)
    throw new ImageDecodeError()
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

function drawScaled(src: DecodedSource, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height))
  const w = Math.max(1, Math.round(src.width * scale))
  const h = Math.max(1, Math.round(src.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageDecodeError('no-2d-context')
  src.draw(ctx, w, h)
  return canvas
}

/* Redimensionne + réencode en JPEG. L'orientation étant cuite dans les
   pixels, le JPEG ne porte aucun tag EXIF → toujours droit côté backend. */
export async function prepareForAnalysis(file: File): Promise<PreparedPhoto> {
  const src = await decodeSource(file)
  try {
    const canvas = drawScaled(src, IMAGE_MAX_SIDE)
    const blob = await canvasToBlob(canvas, IMAGE_JPEG_QUALITY)
    if (!blob) throw new ImageDecodeError('encode-failed')
    return { blob }
  } finally {
    src.close()
  }
}

/* Miniature dataURL (~20-60 Ko) pour restaurer une vignette après un
   refresh — stockée en sessionStorage, best-effort. */
export async function makeThumbnail(blob: Blob): Promise<string> {
  const src = await decodeSource(blob)
  try {
    const canvas = drawScaled(src, THUMB_MAX_SIDE)
    return canvas.toDataURL('image/jpeg', THUMB_JPEG_QUALITY)
  } finally {
    src.close()
  }
}

/* base64 SANS le préfixe data URL (le backend accepte les deux, on économise). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('read-failed'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('read-failed'))
    reader.readAsDataURL(blob)
  })
}

/* Signal de timeout — natif si dispo, sinon AbortController + setTimeout. */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(new DOMException('TimeoutError', 'TimeoutError')), ms)
  return ctrl.signal
}

/* Combine plusieurs signaux — natif si dispo, sinon fallback (Safari < 17.4). */
export function anySignal(signals: AbortSignal[]): AbortSignal {
  const list = signals.filter(Boolean)
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return AbortSignal.any(list)
  }
  const ctrl = new AbortController()
  for (const s of list) {
    if (s.aborted) {
      ctrl.abort(s.reason)
      break
    }
    s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true })
  }
  return ctrl.signal
}
