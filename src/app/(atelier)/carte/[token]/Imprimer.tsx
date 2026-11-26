'use client'

export default function Imprimer() {
  return (
    <button type="button" className="m-btn nl-imprimer-non" onClick={() => window.print()}>
      Imprimer la carte
    </button>
  )
}
