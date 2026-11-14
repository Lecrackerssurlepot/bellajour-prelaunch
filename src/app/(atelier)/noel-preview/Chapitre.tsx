'use client'

/* Le chapitre de Noël, à glisser parmi les sept pages de l'accueil.

   Un récit en trois temps, piloté par le défilement :
   1. une enveloppe s'ouvre ;
   2. la carte en sort ;
   3. elle cède la place à ce que la personne recevra : son magazine.
   Puis la phrase d'appel, le bouton et le compteur de places.

   Mécanique (src/app/CLAUDE.md : défilement = rAF + JS, pas de librairie) :
   la scène est collante dans une piste haute de trois écrans. Une boucle
   `requestAnimationFrame` ne tourne que tant que la piste est visible
   (IntersectionObserver), lit sa position et écrit UNE propriété, `--p`
   (0 → 1), sur la scène. La feuille de style en tire des `transform` et des
   `opacity`, rien d'autre. Sous `prefers-reduced-motion`, pas de piste :
   la scène s'affiche directement dans son état final. */

import { useEffect, useRef } from 'react'
import CarteCadeau from './CarteCadeau'
import { COUVERTURES_ACCUEIL, PLACES_EXEMPLE, TEXTES, type Ton } from './contenu'

export default function Chapitre({ ton, phrase }: { ton: Ton; phrase: string }) {
  const piste = useRef<HTMLDivElement>(null)
  const t = TEXTES[ton]

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
    <div className="nl-chapitre" ref={piste} data-ouverte="0">
      <div className="nl-scene">
        <div className="nl-scene-texte nl-scene-texte--1">
          <span className="nl-surtitre">Pour Noël</span>
          <h3 className="nl-scene-titre">{t.titre}</h3>
        </div>

        <div className="nl-scene-objet">
          <div className="nl-enveloppe" aria-hidden="true">
            <span className="nl-env-fond" />
            <span className="nl-env-rabat" />
          </div>
          <div className="nl-scene-carte">
            <CarteCadeau phrase={phrase} montant="35 €" prenom="Camille" message="" entree={false} />
          </div>
          <span className="nl-env-poche" aria-hidden="true" />
          <div className="nl-scene-couvs">
            {COUVERTURES_ACCUEIL.map((c, i) => (
              <img key={c.src} className={`nl-scene-couv nl-scene-couv--${i + 1}`} src={c.src} alt={c.alt} loading="lazy" />
            ))}
          </div>
        </div>

        <div className="nl-scene-texte nl-scene-texte--2">
          <p className="nl-scene-sous">{t.sousTitre}</p>
          <a className="nl-cta" href="#offrir">Offrir une carte</a>
          <p className="nl-scene-places">
            <span className="nl-scene-places-n">{PLACES_EXEMPLE}</span> places avant le 7 décembre
          </p>
        </div>
      </div>
    </div>
  )
}
