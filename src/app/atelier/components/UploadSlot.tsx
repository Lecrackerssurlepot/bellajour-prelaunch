'use client'

/* Slot photo — drag & drop + clic, préview immédiate (objectURL).
   Les photos restent en mémoire client, aucun envoi réseau. */

import './upload-slot.css'
import { useRef, useState } from 'react'
import type { SlotPhoto } from '../lib/atelierState'

interface UploadSlotProps {
  index: 0 | 1
  photo: SlotPhoto | null
  error: string | null
  disabled?: boolean
  onSelect: (file: File) => void
  onRemove: () => void
}

export default function UploadSlot({
  index,
  photo,
  error,
  disabled = false,
  onSelect,
  onRemove,
}: UploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (disabled || !files || files.length === 0) return
    /* Un fichier par slot — on ne garde que le premier déposé */
    onSelect(files[0])
  }

  return (
    <div className="at-slot-wrap">
      <div
        className={`at-slot${dragOver ? ' is-dragover' : ''}${photo ? ' has-photo' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
      >
        {photo ? (
          <>
            <img
              className="at-slot-img"
              src={photo.previewUrl}
              alt={`Photo confiée ${index + 1}`}
              decoding="async"
              draggable={false}
            />
            {!disabled && (
              <button
                type="button"
                className="at-slot-remove"
                onClick={onRemove}
                aria-label={`Retirer la photo ${index + 1}`}
              >
                ×
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className="at-slot-trigger"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <span className="at-slot-plus" aria-hidden="true">
              +
            </span>
            <span className="at-label">Photo {index + 1}</span>
            <span className="at-slot-hint">JPG · PNG · WebP — 10 Mo max</span>
          </button>
        )}
        <input
          ref={inputRef}
          className="at-slot-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            handleFiles(e.target.files)
            /* reset → re-sélectionner le même fichier re-déclenche onChange */
            e.target.value = ''
          }}
        />
      </div>
      {error ? (
        <p className="at-slot-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
