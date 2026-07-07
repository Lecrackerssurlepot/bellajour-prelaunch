'use client'

/* Gestion des deux photos confiées : validation (type, taille), préparation
   client (décodage + redimensionnement canvas), cycle de vie des objectURL,
   erreurs et état « en préparation » par slot. Un compteur de génération par
   slot évite les courses si le visiteur change/retire une photo pendant sa
   conversion. Les photos ne quittent le navigateur qu'au moment de l'analyse. */

import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react'
import { ACCEPTED_EXT, ACCEPTED_MIME, HEIC_DECODE_MESSAGE, MAX_FILE_BYTES } from '../constants'
import { ImageDecodeError, prepareForAnalysis } from '../lib/imagePrep'
import type { AtelierAction, AtelierState } from '../lib/atelierState'

const ERROR_MESSAGES = {
  type: 'Confiez-nous une photo au format JPG, PNG, WebP ou HEIC.',
  size: 'Cette photo dépasse 10 Mo — choisissez une version plus légère.',
  decode: HEIC_DECODE_MESSAGE,
} as const

type SlotErrors = [string | null, string | null]
type SlotFlags = [boolean, boolean]

function validateFile(file: File): string | null {
  /* Certains drags n'ont pas de MIME type → fallback sur l'extension */
  const typeOk = file.type ? ACCEPTED_MIME.includes(file.type) : ACCEPTED_EXT.test(file.name)
  if (!typeOk) return ERROR_MESSAGES.type
  if (file.size > MAX_FILE_BYTES) return ERROR_MESSAGES.size
  return null
}

export function usePhotoSlots(
  photos: AtelierState['photos'],
  dispatch: Dispatch<AtelierAction>
) {
  const [errors, setErrors] = useState<SlotErrors>([null, null])
  const [pending, setPending] = useState<SlotFlags>([false, false])
  const photosRef = useRef(photos)
  /* Jeton par slot : incrémenté à chaque sélection/retrait. Une préparation
     dont le jeton a changé est obsolète et son résultat est ignoré. */
  const tokensRef = useRef<[number, number]>([0, 0])

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  const patchError = useCallback((index: 0 | 1, value: string | null) => {
    setErrors((prev) => {
      const next: SlotErrors = [...prev]
      next[index] = value
      return next
    })
  }, [])

  const patchPending = useCallback((index: 0 | 1, value: boolean) => {
    setPending((prev) => {
      const next: SlotFlags = [...prev]
      next[index] = value
      return next
    })
  }, [])

  const setPhoto = useCallback(
    (index: 0 | 1, file: File) => {
      const error = validateFile(file)
      patchError(index, error)
      if (error) return

      const token = tokensRef.current[index] + 1
      tokensRef.current[index] = token
      patchPending(index, true)

      prepareForAnalysis(file)
        .then(({ blob }) => {
          if (tokensRef.current[index] !== token) return /* slot changé entre-temps */
          const previous = photosRef.current[index]
          if (previous) URL.revokeObjectURL(previous.previewUrl)
          dispatch({
            type: 'PHOTO_SET',
            index,
            photo: { file, prepared: blob, previewUrl: URL.createObjectURL(blob) },
          })
          patchPending(index, false)
        })
        .catch((err) => {
          if (tokensRef.current[index] !== token) return
          patchError(index, err instanceof ImageDecodeError ? ERROR_MESSAGES.decode : ERROR_MESSAGES.type)
          patchPending(index, false)
        })
    },
    [dispatch, patchError, patchPending]
  )

  const removePhoto = useCallback(
    (index: 0 | 1) => {
      tokensRef.current[index] += 1 /* invalide toute préparation en cours */
      const previous = photosRef.current[index]
      if (previous) URL.revokeObjectURL(previous.previewUrl)
      patchError(index, null)
      patchPending(index, false)
      dispatch({ type: 'PHOTO_REMOVED', index })
    },
    [dispatch, patchError, patchPending]
  )

  /* Révocation finale au démontage de la page */
  useEffect(
    () => () => {
      photosRef.current.forEach((p) => {
        if (p) URL.revokeObjectURL(p.previewUrl)
      })
    },
    []
  )

  return { errors, pending, setPhoto, removePhoto }
}
