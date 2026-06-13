'use client'

import { useEffect, useRef, useState } from 'react'
import './prix.css'
import { preventesHref } from './_ref'

/* Corps de la page /preventes/prix. Tout converge vers le SIMULATEUR.
   Page illustrative : aucun montant n'est envoyé au backend ; la grille ci-dessous
   est figée (fournie au design) et sert uniquement à projeter le « reste à régler ».

   Acompte crédité = 30 € (valeur créditée sur commande, cf. offre prévente).
   Remise parrainage = 5 €/proche, PLAFONNÉE à 20 € (jamais « à l'infini »).
   Parrainage actif au lancement, le 15 août. */

/* Grille TTC, livraison incluse. step=10 sur [30,150] ⇒ chaque réglage du slider
   tombe EXACTEMENT sur une clé ⇒ prix toujours défini, aucune interpolation. */
const LOOKUP: Record<number, number> = {
  30: 64, 40: 69, 50: 82, 60: 94, 70: 107, 80: 120, 90: 133,
  100: 146, 110: 159, 120: 172, 130: 185, 140: 198, 150: 211,
}

const PAGES_MIN = 30
const PAGES_MAX = 150
const PAGES_STEP = 10
const ACOMPTE = 30 // crédité, déjà versé
const PROCHES_MAX = 4
const REMISE_PAR_PROCHE = 5
const REMISE_PLAFOND = 20

const SPECS = [
  'A4 portrait',
  'Couverture rigide',
  'Papier brillant 170 g',
  'Base 30 pages',
  'Livraison incluse',
]

/* Reveal d'entrée (LUX FADE / SLIDE REVEAL). IntersectionObserver ajoute .is-in.
   Fallback : si reduced-motion ou pas d'IO → tout visible immédiatement
   (la classe .is-in force aussi l'état final ; le @media reduced-motion neutralise
   la transition). GPU only : opacity + transform. */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const els = Array.from(root.querySelectorAll<HTMLElement>('.px-reveal'))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return ref
}

export default function PrixContent() {
  const reveal = useReveal()

  const [pages, setPages] = useState(PAGES_MIN)
  const [proches, setProches] = useState(0)

  const prix = LOOKUP[pages]
  const remise = Math.min(proches * REMISE_PAR_PROCHE, REMISE_PLAFOND)
  const reste = Math.max(0, prix - ACOMPTE - remise)

  /* CTA final + (implicite) navbar partagent preventesHref ; résolu client. */
  const [ctaHref, setCtaHref] = useState('/preventes#s4')
  useEffect(() => setCtaHref(preventesHref()), [])

  const decr = () => setProches((n) => Math.max(0, n - 1))
  const incr = () => setProches((n) => Math.min(PROCHES_MAX, n + 1))

  return (
    <div className="px" ref={reveal}>

      {/* ════════════ HERO ════════════ */}
      <header className="px-hero px-reveal">
        <p className="px-eyebrow">Nos prix</p>
        <h1 className="px-hero-title">
          Le prix que vous voyez est le prix que vous payez.
        </h1>
        <p className="px-hero-sub">
          Pas de frais cachés, pas de promotions gonflées.<br />
          Un prix juste, et tout ce qui le rend plus doux.
        </p>
      </header>

      {/* ════════════ POURQUOI 30 PAGES ════════════ */}
      <section className="px-why px-reveal" aria-labelledby="px-why-title">
        <h2 id="px-why-title" className="px-why-title">
          Pourquoi 30 pages, et pas 24.
        </h2>
        <p className="px-why-body">
          Le minimum d’impression en usine est de 24 pages. La plupart des albums
          démarrent là. Nous commençons à 30, parce que 24 pages, c’est trop peu
          pour raconter une histoire.
        </p>
        <ul className="px-specs" aria-label="Caractéristiques de l’album">
          {SPECS.map((s) => (
            <li key={s} className="px-spec">{s}</li>
          ))}
        </ul>
      </section>

      {/* ════════════ SIMULATEUR ★ ════════════ */}
      <section className="px-sim-wrap px-reveal" aria-labelledby="px-sim-title">
        <div className="px-sim">
          <div className="px-sim-head">
            <h2 id="px-sim-title" className="px-sim-title">
              Composez, et voyez votre prix se dessiner.
            </h2>
            <p className="px-sim-intro">
              Faites glisser le nombre de pages, ajoutez les proches que vous
              parrainez. On vous montre ce qu’il vous restera vraiment à régler.
            </p>
          </div>

          {/* ── Contrôles ── */}
          <div className="px-controls">
            <div className="px-field">
              <label className="px-field-label" htmlFor="px-pages">
                Nombre de pages
              </label>
              <input
                id="px-pages"
                className="px-slider"
                type="range"
                min={PAGES_MIN}
                max={PAGES_MAX}
                step={PAGES_STEP}
                value={pages}
                onChange={(e) => setPages(Number(e.target.value))}
                aria-valuetext={`${pages} pages`}
              />
              <div className="px-slider-scale" aria-hidden="true">
                <span>{PAGES_MIN}</span>
                <span>{PAGES_MAX}</span>
              </div>
            </div>

            <div className="px-field">
              <span className="px-field-label" id="px-proches-label">
                Proches parrainés{' '}
                <span className="px-field-hint">(actif dès le 15 août)</span>
              </span>
              <div
                className="px-stepper"
                role="group"
                aria-labelledby="px-proches-label"
              >
                <button
                  type="button"
                  className="px-step-btn"
                  onClick={decr}
                  disabled={proches === 0}
                  aria-label="Retirer un proche"
                >
                  −
                </button>
                <span className="px-step-val" aria-live="polite">{proches}</span>
                <button
                  type="button"
                  className="px-step-btn"
                  onClick={incr}
                  disabled={proches === PROCHES_MAX}
                  aria-label="Ajouter un proche"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* ── Affichage prix ── */}
          <div className="px-readout">
            <div className="px-price-row">
              <span className="px-price">{prix}<span className="px-price-cur"> €</span></span>
              <span className="px-price-pages">{pages} pages</span>
            </div>

            {/* Ligne PERSISTANTE — visible à TOUT réglage (jamais conditionnelle). */}
            <p className="px-included">
              Livraison incluse (valeur 7 €) · Version digitale HD · Aucun frais caché
            </p>

            <ul className="px-breakdown">
              <li className="px-line">
                <span className="px-line-op">— {ACOMPTE} €</span>
                <span className="px-line-note">votre acompte, déjà crédité</span>
              </li>
              {proches > 0 && (
                <li className="px-line">
                  <span className="px-line-op">— {remise} €</span>
                  <span className="px-line-note">
                    {proches} proche{proches > 1 ? 's' : ''} parrainé{proches > 1 ? 's' : ''}
                  </span>
                </li>
              )}
            </ul>

            <div className="px-rest">
              <span className="px-rest-label">Il vous reste</span>
              {/* key={reste} → rejoue une micro-transition douce à chaque changement
                  (opacity/transform, GPU). Pas de drum-roll. */}
              <span className="px-rest-val" key={reste}>{reste} €</span>
            </div>
          </div>

          <p className="px-sim-micro">
            L’acompte versé en prévente est intégralement crédité. Le parrainage
            s’active au lancement, le 15 août.
          </p>
        </div>
      </section>

      {/* ════════════ POSITIONNEMENT ════════════ */}
      <section className="px-stance px-reveal">
        <p className="px-stance-text">
          Pas de promotions, pas de frais cachés.<br />
          Juste un prix honnête pour un objet pensé comme une œuvre, imprimé en
          Europe, au plus proche de chez vous.<br />
          Et la seule maison à composer votre album par l’image, puis à en générer
          la couverture rien que pour vous.
        </p>
      </section>

      {/* ════════════ CTA FINAL ════════════ */}
      <section className="px-cta px-reveal">
        <h2 className="px-cta-title">Votre album vous attend le 15 août.</h2>
        <a href={ctaHref} className="px-cta-btn">Accéder aux préventes</a>
      </section>

    </div>
  )
}
