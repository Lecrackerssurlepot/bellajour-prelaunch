'use client'

/* Le chapitre de Noël de l'accueil (ton « sobre », gardé tel quel par
   Mathias). Posé APRÈS les sept pages de l'univers et avant le pied de page :
   le séquenceur (Univers.tsx), le chemin de fer `.pas` et les `data-t` ne le
   connaissent pas, il ne les dérange pas.

   Un récit au défilement : la scène est collante dans une piste de trois
   écrans ; une boucle rAF ne tourne que tant que la piste est visible
   (IntersectionObserver) et n'écrit que `--p` (0 → 1). Le style en tire des
   `transform` et des `opacity`. Sous `prefers-reduced-motion`, pas de piste :
   la scène finale directement. */

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import CarteCadeau from '../noel-preview/CarteCadeau'
import { COUVERTURES_ACCUEIL, PHRASES, TEXTES } from '../noel-preview/contenu'
import { NOEL_REMISE_MEME_PCT } from '@/lib/atelier/exemplaires'
import { ligneCompteur, useFenetreNoel, usePlaces } from './places'
import { VERS_NOEL_MAGAZINE } from './glisser'
import './noel.css'

const T = TEXTES.sobre

export default function ChapitreAccueil() {
  const piste = useRef<HTMLDivElement>(null)
  const places = usePlaces()
  const fenetre = useFenetreNoel()

  useEffect(() => {
    const el = piste.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--p', '1')
      el.dataset.ouverte = '1'
      return
    }
    let boucle = 0
    let derniere = -1
    const lire = () => {
      const r = el.getBoundingClientRect()
      const course = r.height - window.innerHeight
      const p = course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 1
      if (Math.abs(p - derniere) > 0.001) {
        derniere = p
        el.style.setProperty('--p', p.toFixed(4))
        /* Le rabat passe derrière la carte une fois ouvert : un z-index ne
           s'interpole pas, on le bascule d'un coup. */
        el.dataset.ouverte = p > 0.16 ? '1' : '0'
      }
      boucle = requestAnimationFrame(lire)
    }
    const io = new IntersectionObserver((entrees) => {
      cancelAnimationFrame(boucle)
      if (entrees.some((e) => e.isIntersecting)) boucle = requestAnimationFrame(lire)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(boucle)
    }
  }, [])

  return (
    <section id="noel-accueil" className="nl-noel nl-noel-chapitre" ref={piste} data-ouverte="0" aria-label="Pour Noël">
      <div className="nl-scene">
        <div className="nl-scene-texte nl-scene-texte--1">
          <span className="nl-surtitre">Pour Noël</span>
          <h2 className="nl-scene-titre">{T.titre}</h2>
        </div>

        <div className="nl-scene-objet">
          <div className="nl-enveloppe" aria-hidden="true">
            <span className="nl-env-fond" />
            <span className="nl-env-rabat" />
          </div>
          <div className="nl-scene-carte">
            <CarteCadeau phrase={PHRASES[0]} montant="50 €" prenom="Camille" message="" entree={false} />
          </div>
          <span className="nl-env-poche" aria-hidden="true" />
          <div className="nl-scene-couvs">
            {COUVERTURES_ACCUEIL.map((c, i) => (
              <img key={c.src} className={`nl-scene-couv nl-scene-couv--${i + 1}`} src={c.src} alt={c.alt} loading="lazy" />
            ))}
          </div>
        </div>

        <div className="nl-scene-texte nl-scene-texte--2">
          <p className="nl-scene-sous">{T.sousTitre}</p>
          {fenetre && (
            <p className="nl-scene-offre">
              Le 2<sup>e</sup> magazine à <strong>−{NOEL_REMISE_MEME_PCT}&nbsp;%</strong>
            </p>
          )}
          <Link className="nl-cta nl-cta--plein" href={VERS_NOEL_MAGAZINE} prefetch={false}>Offrir une carte cadeau</Link>
          {places !== null && <p className="nl-scene-places">{ligneCompteur(places)}</p>}
        </div>
      </div>
    </section>
  )
}
