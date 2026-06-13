'use client'

import { useEffect, useRef } from 'react'
import './calculateur.css'

/* Calculateur de pages/albums gagnés. Deux curseurs (directs 0→25, indirects 0→50).
   Calcul temps réel SANS re-render React : on lit les <input range> et on écrit le
   résultat dans le DOM via refs, coalescé par requestAnimationFrame (transform/opacity
   seulement côté anim, ici simple textContent). Paliers officiels figés. */

const ALBUM_PAGES = 30
const PAGE_VALUE = 1 // 1 page restante ≈ 1 € de valeur
const ALBUM_VALUE = 64 // un album de 30 pages = 64 €

export default function Calculateur() {
  const directsRef = useRef<HTMLInputElement>(null)
  const indirectsRef = useRef<HTMLInputElement>(null)
  const directsValRef = useRef<HTMLSpanElement>(null)
  const indirectsValRef = useRef<HTMLSpanElement>(null)

  const pagesRef = useRef<HTMLSpanElement>(null)
  const albumsRef = useRef<HTMLSpanElement>(null)
  const bonusRef = useRef<HTMLSpanElement>(null)
  const valeurRef = useRef<HTMLParagraphElement>(null)
  const creditNoteRef = useRef<HTMLParagraphElement>(null)
  const fillDirectsRef = useRef<HTMLDivElement>(null)
  const fillIndirectsRef = useRef<HTMLDivElement>(null)

  const rafId = useRef<number>(0)

  useEffect(() => {
    const render = () => {
      rafId.current = 0
      const directs = Number(directsRef.current?.value ?? 0)
      const indirects = Number(indirectsRef.current?.value ?? 0)

      const parrainages = directs + indirects
      const pages = parrainages * 5
      const albumsBase = Math.floor(pages / ALBUM_PAGES)
      const restePages = pages % ALBUM_PAGES
      const valeurEuros = albumsBase * ALBUM_VALUE + restePages * PAGE_VALUE

      if (directsValRef.current) directsValRef.current.textContent = String(directs)
      if (indirectsValRef.current) indirectsValRef.current.textContent = String(indirects)

      // Remplissage visuel des pistes (transform: scaleX → GPU, pas de layout).
      if (fillDirectsRef.current)
        fillDirectsRef.current.style.transform = `scaleX(${directs / 25})`
      if (fillIndirectsRef.current)
        fillIndirectsRef.current.style.transform = `scaleX(${indirects / 50})`

      if (pagesRef.current) pagesRef.current.textContent = String(pages)

      if (albumsRef.current) {
        if (albumsBase > 0) {
          const albumWord = albumsBase > 1 ? 'albums' : 'album'
          const offWord = albumsBase > 1 ? 'offerts' : 'offert'
          albumsRef.current.textContent = `soit ${albumsBase} ${albumWord} de 30 pages ${offWord}`
        } else {
          albumsRef.current.textContent = ''
        }
      }

      if (bonusRef.current) {
        bonusRef.current.textContent =
          restePages > 0 && albumsBase > 0 ? ` + ${restePages} pages bonus` : ''
      }

      if (valeurRef.current) {
        valeurRef.current.textContent = `jusqu'à ${valeurEuros} € de valeur, sans rien payer.`
      }

      if (creditNoteRef.current) {
        creditNoteRef.current.style.display = pages > 0 && pages < 30 ? 'block' : 'none'
      }
    }

    const schedule = () => {
      if (rafId.current) return
      rafId.current = requestAnimationFrame(render)
    }

    const d = directsRef.current
    const i = indirectsRef.current
    d?.addEventListener('input', schedule)
    i?.addEventListener('input', schedule)
    render() // état initial

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
      d?.removeEventListener('input', schedule)
      i?.removeEventListener('input', schedule)
    }
  }, [])

  return (
    <section className="amb-calc" data-section="amb-calc" data-theme="light">
      <div className="amb-calc-inner">
        <h2 className="amb-calc-title">Combien pouvez-vous gagner&nbsp;?</h2>
        <p className="amb-calc-lead">
          Bougez les curseurs. Chaque parrainage vous rapporte 5&nbsp;pages.
        </p>

        <div className="amb-calc-grid">
          {/* Curseurs */}
          <div className="amb-calc-controls">
            <div className="amb-calc-field">
              <label className="amb-calc-label" htmlFor="amb-directs">
                Vos filleuls directs
                <span ref={directsValRef} className="amb-calc-val">
                  0
                </span>
              </label>
              <div className="amb-calc-track">
                <div ref={fillDirectsRef} className="amb-calc-track-fill" />
                <input
                  ref={directsRef}
                  id="amb-directs"
                  className="amb-calc-range"
                  type="range"
                  min={0}
                  max={25}
                  step={1}
                  defaultValue={0}
                  aria-label="Vos filleuls directs"
                />
              </div>
            </div>

            <div className="amb-calc-field">
              <label className="amb-calc-label" htmlFor="amb-indirects">
                Les filleuls de vos filleuls
                <span ref={indirectsValRef} className="amb-calc-val">
                  0
                </span>
              </label>
              <div className="amb-calc-track">
                <div ref={fillIndirectsRef} className="amb-calc-track-fill" />
                <input
                  ref={indirectsRef}
                  id="amb-indirects"
                  className="amb-calc-range"
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  defaultValue={0}
                  aria-label="Les filleuls de vos filleuls"
                />
              </div>
            </div>
          </div>

          {/* Résultat */}
          <div className="amb-calc-result" aria-live="polite">
            <p className="amb-calc-pages">
              <span ref={pagesRef} className="amb-calc-pages-num">
                0
              </span>{' '}
              pages
            </p>
            <p className="amb-calc-albums">
              <span ref={albumsRef} />
              <span ref={bonusRef} className="amb-calc-bonus" />
            </p>
            <p ref={valeurRef} className="amb-calc-valeur">
              jusqu&apos;à 0 € de valeur, sans rien payer.
            </p>
            <p ref={creditNoteRef} className="amb-calc-credit-note">
              Vos pages sont créditées sur vos prochaines commandes.
            </p>
          </div>
        </div>

        <p className="amb-calc-fixed">
          Et vous offrez 3 pages à chacun de vos filleuls dès leur premier paiement.
        </p>
        <p className="amb-calc-punch">6 parrainages cumulés = un album offert.</p>
      </div>
    </section>
  )
}
