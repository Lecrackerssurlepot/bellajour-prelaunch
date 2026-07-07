'use client'

/* Gestion des deux photos confiées : validation (type, taille),
   cycle de vie des objectURL (création / révocation), erreurs par slot.
   Les photos restent en mémoire client — aucun envoi réseau. */

import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react'
import { ACCEPTED_EXT, ACCEPTED_MIME, MAX_FILE_BYTES } from '../constants'
import type { AtelierAction, AtelierState } from '../lib/atelierState'

const ERROR_MESSAGES = {
  type: 'Confiez-nous une photo au format JPG, PNG ou WebP.',
  size: 'Cette photo dépasse 10 Mo — choisissez une version plus légère.',
} as const

type SlotErrors = [string | null, string | null]

function validateFile(file: File): string | null {
  /* Certains drags n'ont pas de MIME type → fallback sur l'extension */
  const typeOk = file.type
    ? ACCEPTED_MIME.includes(file.type)
    : ACCEPTED_EXT.test(file.name)
  if (!typeOk) return ERROR_MESSAGES.type
  if (file.size > MAX_FILE_BYTES) return ERROR_MESSAGES.size
  return null
}

export function usePhotoSlots(
  photos: AtelierState['photos'],
  dispatch: Dispatch<AtelierAction>
) {
  const [errors, setErrors] = useState<SlotErrors>([null, null])
  const photosRef = useRef(photos)

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  const setPhoto = useCallback(
    (index: 0 | 1, file: File) => {
      const error = validateFile(file)
      setErrors((prev) => {
        const next: SlotErrors = [...prev]
        next[index] = error
        return next
      })
      if (error) return
      const previous = photosRef.current[index]
      if (previous) URL.revokeObjectURL(previous.previewUrl)
      dispatch({
        type: 'PHOTO_SET',
        index,
        photo: { file, previewUrl: URL.createObjectURL(file) },
      })
    },
    [dispatch]
  )

  const removePhoto = useCallback(
    (index: 0 | 1) => {
      const previous = photosRef.current[index]
      if (previous) URL.revokeObjectURL(previous.previewUrl)
      setErrors((prev) => {
        const next: SlotErrors = [...prev]
        next[index] = null
        return next
      })
      dispatch({ type: 'PHOTO_REMOVED', index })
    },
    [dispatch]
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

  return { errors, setPhoto, removePhoto }
}
