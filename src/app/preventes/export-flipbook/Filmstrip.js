import { Fragment, useEffect, useRef } from 'react'
import Img from './Img.js'

const cls = (...a) => a.filter(Boolean).join(' ')

/**
 * Barre de miniatures sous l'album.
 *
 * Deux variantes (prop `single`) :
 *   - single=false (DESKTOP, défaut) : une vignette par DOUBLE-PAGE (cellule
 *     gauche | droite). `items` = spreads { index, left, right, label }.
 *   - single=true  (MOBILE) : une vignette par PAGE (1 cellule). `items` =
 *     pages { index, url, label }. Tap sur une vignette = aller à cette page.
 *
 * GARDÉ du proto : navigation au clic + auto-scroll centrant l'élément actif.
 * Les puces de chapitre (mode double-page) restent DÉCORATIVES — non utilisées
 * ici (on ne passe jamais `chapters`).
 */

/** Mini d'une double-page : 2 cellules (gauche | droite). */
function ThumbSpread({ item, active, onClick, refEl }) {
  const cell = (url, seed) => (
    <div className="fb-film__cell">{url && <Img src={url} seed={seed} />}</div>
  )
  return (
    <button
      ref={refEl}
      type="button"
      onClick={onClick}
      className={cls('fb-film__thumb', active && 'is-active')}
      aria-label={`Aller à la double-page ${item.label}`}
    >
      <div className="fb-film__mini">
        {cell(item.left, `${item.index}-l`)}
        {cell(item.right, `${item.index}-r`)}
      </div>
      <div className="fb-film__pages">{item.label}</div>
    </button>
  )
}

/** Mini d'une page unique : 1 cellule (mobile). */
function ThumbSingle({ item, active, onClick, refEl }) {
  return (
    <button
      ref={refEl}
      type="button"
      onClick={onClick}
      className={cls('fb-film__thumb', active && 'is-active')}
      aria-label={`Aller à la page ${item.label}`}
    >
      <div className="fb-film__mini fb-film__mini--single">
        <div className="fb-film__cell">
          {item.url && <Img src={item.url} seed={`${item.index}`} />}
        </div>
      </div>
      <div className="fb-film__pages">{item.label}</div>
    </button>
  )
}

export default function Filmstrip({ items, chapters, currentIndex, onSpreadChange, single = false }) {
  const scrollRef = useRef(null)
  const activeRef = useRef(null)

  // Re-centre UNIQUEMENT au changement d'élément actif (jamais au survol).
  useEffect(() => {
    const el = activeRef.current
    const container = scrollRef.current
    if (!el || !container) return
    const offset = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2
    container.scrollTo({ left: offset, behavior: 'smooth' })
  }, [currentIndex])

  const Thumb = single ? ThumbSingle : ThumbSpread
  const thumb = (it) => (
    <Thumb
      key={it.index}
      item={it}
      active={it.index === currentIndex}
      refEl={it.index === currentIndex ? activeRef : null}
      onClick={() => onSpreadChange(it.index)}
    />
  )

  // Avec chapitres (mode double-page seulement) : puce décorative + `count` vignettes.
  const hasChapters = !single && Array.isArray(chapters) && chapters.length > 0

  return (
    <div className="fb-film">
      <div ref={scrollRef} className="fb-film__scroll">
        <div className="fb-film__row">
          {hasChapters
            ? (() => {
                let cursor = 0
                return chapters.map((ch, ci) => {
                  const slice = items.slice(cursor, cursor + ch.count)
                  cursor += ch.count
                  return (
                    <Fragment key={ci}>
                      {/* Puce de chapitre — DÉCORATIVE (plus aucune action). */}
                      <div className="fb-film__chip" aria-hidden="true">
                        <span className="fb-film__chip-num" style={{ color: ch.color }}>
                          {String(ch.num).padStart(2, '0')}
                        </span>
                        <span className="fb-film__chip-title">{ch.title}</span>
                      </div>
                      {slice.map(thumb)}
                    </Fragment>
                  )
                })
              })()
            : items.map(thumb)}
        </div>
      </div>
    </div>
  )
}
