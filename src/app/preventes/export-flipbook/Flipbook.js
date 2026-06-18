'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Img from './Img.js'
import Filmstrip from './Filmstrip.js'
import { buildSpreads } from './spreads.js'
import { useBookFit } from './useBookFit.js'
import './flipbook.css'

const cls = (...a) => a.filter(Boolean).join(' ')
const MOBILE_Q = '(max-width: 767px)'
const SWIPE_THRESHOLD = 45 // px — au-delà, on change de page

/* ── Détection mobile (JS) : choisit double-page vs page seule ────────────────
   SSR-safe : false au 1er rendu serveur, recalé en effet client (layout effect
   pour éviter un flash de la mauvaise variante). */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_Q)
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return isMobile
}

/* ── Flèche de navigation (ex-NavArrow.jsx) ───────────────────────────────────
   `reduce` neutralise les micro-anim hover/tap (prefers-reduced-motion). */
function NavArrow({ direction, onClick, disabled, reduce }) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled || reduce ? {} : { scale: 1.08 }}
      whileTap={disabled || reduce ? {} : { scale: 0.93 }}
      animate={{ opacity: disabled ? 0 : 1 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
      className={cls('fb-arrow', disabled && 'is-disabled')}
      aria-label={direction === 'prev' ? 'Page précédente' : 'Page suivante'}
    >
      {direction === 'prev' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </motion.button>
  )
}

/* ── Une page du livre (image .webp clippée, ou crème si absente) ──────────────── */
function Page({ url, seed, eager }) {
  return (
    <div className="fb-spread__page">
      {url && <Img src={url} seed={seed} eager={eager} className="fb-spread__img" />}
    </div>
  )
}

/* ── DESKTOP : coque « livre double-page » (transition framer-motion conservée) ── */
function Book({ spread, reduce }) {
  // Couverture + 1re double-page chargées en priorité (LCP) ; le reste lazy.
  const eager = spread.index <= 1
  return (
    <motion.div
      key={spread.index}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.988 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.993 }}
      transition={reduce ? { duration: 0 } : { duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="fb-book"
    >
      <div className="fb-book__shell">
        {/* Reliure SUBTILE : deux versants très doux + une vallée centrale
            dégradée (aucun trait net) → suggère le pli sans le souligner.
            Gradients statiques : GPU-friendly, zéro reflow. */}
        <div
          className="fb-book__spine-l"
          style={{ left: 'calc(50% - 56px)', width: '56px', background: 'linear-gradient(to right, transparent, rgba(28,28,28,0.05))' }}
        />
        <div
          className="fb-book__spine-r"
          style={{ left: '50%', width: '56px', background: 'linear-gradient(to right, rgba(28,28,28,0.05), transparent)' }}
        />
        <div
          className="fb-book__crease"
          style={{ left: '50%', width: '24px', transform: 'translateX(-50%)', background: 'linear-gradient(to right, transparent 0%, rgba(28,28,28,0.08) 50%, transparent 100%)' }}
        />
        {/* Titre de tranche, posé verticalement AU CENTRE du pli, par-dessus la
            reliure. Cormorant (--bj-font-display). UNIQUEMENT sur la couverture
            (spread index 0 = [p39 | p01]). Desktop only (rendu dans Book). */}
        {spread.index === 0 && (
          <div className="fb-book__title" aria-hidden="true">Australie Bellajour</div>
        )}

        {/* Surface des pages — clip strict : aucune image ne bave hors du livre.
            Ratio EXACT de 2 pages A4 côte à côte (1000×1414 chacune → 2000/1414)
            → chaque demi-page = A4 pile → object-fit:contain remplit sans bande
            ni rognage. La reliure (spine/crease) est un overlay absolu par-dessus
            la couture centrale ; pas de colonne « gouttière » qui rognerait. */}
        <div className="fb-book__pages" style={{ aspectRatio: '2000 / 1414' }}>
          <div className="fb-book__inner">
            <div className="fb-spread">
              <Page url={spread.left} seed={`${spread.index}-l`} eager={eager} />
              <Page url={spread.right} seed={`${spread.index}-r`} eager={eager} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ── DESKTOP : album double-page + filmstrip (logique d'origine du proto) ──────── */
function FlipbookDesktop({ pages, chapters, initialIndex, onSpreadChange, reduce }) {
  const spreads = useMemo(() => buildSpreads(pages), [pages])
  const [index, setIndex] = useState(initialIndex)

  // Le livre tient ENTIÈREMENT (fit hauteur+largeur) ; padH réserve les flèches.
  const [rowRef, bookWidth] = useBookFit(1.414, 24, 140)

  const clamped = Math.min(Math.max(index, 0), Math.max(spreads.length - 1, 0))
  const current = spreads[clamped]
  const canPrev = clamped > 0
  const canNext = clamped < spreads.length - 1

  const go = (next) => {
    const v = Math.min(Math.max(next, 0), spreads.length - 1)
    setIndex(v)
    onSpreadChange?.(v)
  }

  // Navigation clavier (flèches gauche/droite).
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' && canNext) go(clamped + 1)
      else if (e.key === 'ArrowLeft' && canPrev) go(clamped - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, canPrev, canNext, spreads.length])

  if (!current) return null

  return (
    <div className="fb">
      <div className="fb__stage">
        <div className="fb__viewer">
          <div className="fb__row" ref={rowRef}>
            <NavArrow direction="prev" disabled={!canPrev} reduce={reduce} onClick={() => go(clamped - 1)} />
            <div
              className="fb__book-wrap"
              style={bookWidth ? { width: `${bookWidth}px`, flex: 'none' } : undefined}
            >
              <AnimatePresence mode="wait">
                <Book key={current.index} spread={current} reduce={reduce} />
              </AnimatePresence>
            </div>
            <NavArrow direction="next" disabled={!canNext} reduce={reduce} onClick={() => go(clamped + 1)} />
          </div>
        </div>
      </div>

      <Filmstrip items={spreads} chapters={chapters} currentIndex={clamped} onSpreadChange={go} />
    </div>
  )
}

/* ── MOBILE : UNE page à la fois, swipe horizontal + filmstrip (1 vignette/page) ── */
function FlipbookMobile({ pages, initialIndex, onSpreadChange, reduce }) {
  const list = useMemo(() => (Array.isArray(pages) ? pages.filter(Boolean) : []), [pages])
  const items = useMemo(
    () => list.map((url, i) => ({ index: i, url, label: i === 0 ? 'Couv.' : String(i + 1) })),
    [list],
  )
  const [index, setIndex] = useState(initialIndex)
  const touch = useRef(null) // { x, y }

  const clamped = Math.min(Math.max(index, 0), Math.max(list.length - 1, 0))
  const go = (next) => {
    const v = Math.min(Math.max(next, 0), list.length - 1)
    setIndex(v)
    onSpreadChange?.(v)
  }

  // Swipe : on ne preventDefault jamais (le scroll vertical reste natif via
  // touch-action: pan-y). On n'agit qu'au touchend, et seulement si le geste est
  // à dominante HORIZONTALE et dépasse le seuil → pas de vol du scroll vertical.
  const onTouchStart = (e) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return
    if (dx < 0) go(clamped + 1) // swipe gauche → page suivante
    else go(clamped - 1) // swipe droite → page précédente
  }

  const url = list[clamped]
  if (url === undefined) return null
  const eager = clamped <= 1

  return (
    <div className="fb-m">
      <div
        className="fb-m__viewer"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="fb-m__book">
          <div className="fb-m__shell">
            <div className="fb-m__pages">
              <AnimatePresence mode="wait">
                <motion.div
                  key={clamped}
                  className="fb-m__page"
                  initial={reduce ? false : { opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.994 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Img src={url} seed={`${clamped}`} eager={eager} className="fb-m__img" />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <Filmstrip single items={items} currentIndex={clamped} onSpreadChange={go} />
    </div>
  )
}

/**
 * FLIPBOOK — album feuilletable.
 *   Desktop : double-page (comme le proto). Mobile (≤767px) : UNE page + swipe.
 *
 * Props :
 *   - pages    : string[]  — URLs des images de pages (.webp), DANS L'ORDRE.
 *                page 0 = couverture.
 *   - chapters : optionnel — puces décoratives du filmstrip (desktop only). Non utilisé ici.
 *   - initialIndex : optionnel — index de départ (def. 0).
 *   - onSpreadChange : optionnel — callback(index) à chaque changement.
 */
export default function Flipbook({ pages, chapters = undefined, initialIndex = 0, onSpreadChange = undefined }) {
  const isMobile = useIsMobile()
  const reduce = useReducedMotion()

  return isMobile ? (
    <FlipbookMobile pages={pages} initialIndex={initialIndex} onSpreadChange={onSpreadChange} reduce={reduce} />
  ) : (
    <FlipbookDesktop
      pages={pages}
      chapters={chapters}
      initialIndex={initialIndex}
      onSpreadChange={onSpreadChange}
      reduce={reduce}
    />
  )
}
