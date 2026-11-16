'use client'

export default function Imprimer() {
  return (
    <button type="button" className="nl-suivant nl-imprimer-non" onClick={() => window.print()}>
      Imprimer la carte
    </button>
  )
}
