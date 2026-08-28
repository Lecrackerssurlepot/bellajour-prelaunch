'use client'

import { useEffect, useRef, useState } from 'react'
import { useValeurClient } from '@/hooks/useClient'
import './s1b-album.css'

/* PRD — S2 « Découvrez Bellajour ».
   Vidéo de présentation YouTube (remplace l'ancien flipbook album).
   100% présentation — zéro backend. Un espace est réservé sous la vidéo
   pour un futur bloc de preuve sociale.

   La section vit dans le scroll (hauteur CONTENUE, pas 100dvh). */

// SOCIAL PROOF COUNT — à brancher Supabase (compteur d'inscrits affiché dans
// la 3e carte « +N » et la ligne « … et N autres »).
const SOCIAL_PROOF_COUNT = 8

export default function S1bAlbum() {
  const sectionRef = useRef<HTMLElement>(null)
  /* Filet : sans IntersectionObserver, rien ne s'arme et la section resterait
     invisible à vie. Lu comme un fait du navigateur, pas posé par un effet —
     `false` côté serveur veut dire « l'observateur existe », donc le HTML servi
     cache la section exactement comme avant. */
  const sansObserver = useValeurClient(
    () => typeof IntersectionObserver === 'undefined',
    false,
  )
  const [vu, setVu] = useState(false)
  const revealed = vu || sansObserver

  // Apparition au scroll (fade + translateY léger), GPU-only, one-shot.
  // prefers-reduced-motion neutralisé en CSS (cf. s1b-album.css).
  useEffect(() => {
    const el = sectionRef.current
    if (!el || sansObserver) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVu(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [sansObserver])

  return (
    <section
      ref={sectionRef}
      id="album-flip"
      data-theme="light"
      className={`fbsec${revealed ? ' is-in' : ''}`}
    >
      <header className="fbsec__head">
        <h2 className="fbsec__title">Découvrez Bellajour</h2>
      </header>

      {/* Embed YouTube responsive 16:9. Pas d'autoplay, pas de mute.
          loading="lazy" : la section est en S2 (sous la ligne de flottaison),
          l'iframe ne pénalise pas le LCP. Fond #000 (CSS) → pas de flash blanc. */}
      <div className="fbsec__video">
        <iframe
          className="fbsec__iframe"
          src="https://www.youtube.com/embed/9eSYZ-bcTJQ"
          title="Découvrez Bellajour"
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      {/* PREUVE SOCIALE — 3 mini-cartes album empilées (overlap) + texte.
          Mockups 100% CSS (zéro image). Apparition LUX FADE pilotée par
          .fbsec.is-in (même IntersectionObserver que le titre). */}
      <div
        className="pv-sp"
        aria-label={`Aude, Candice et ${SOCIAL_PROOF_COUNT} autres attendent déjà leur album`}
      >
        <div className="pv-sp__stack" aria-hidden="true">
          <span className="pv-sp__card pv-sp__card--1">
            <img
              className="pv-sp__cover"
              src="/images/prevente/social-proof/aude.webp"
              alt="Album de Aude"
              loading="lazy"
            />
          </span>
          <span className="pv-sp__card pv-sp__card--2">
            <img
              className="pv-sp__cover"
              src="/images/prevente/social-proof/candice.webp"
              alt="Album de Candice"
              loading="lazy"
            />
          </span>
          <span className="pv-sp__card pv-sp__card--3">+{SOCIAL_PROOF_COUNT}</span>
        </div>
        <div className="pv-sp__text" aria-hidden="true">
          <span className="pv-sp__line1">Aude, Candice et {SOCIAL_PROOF_COUNT} autres</span>
          <span className="pv-sp__line2">attendent déjà leur album</span>
        </div>
      </div>
    </section>
  )
}
