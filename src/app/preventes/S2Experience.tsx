'use client'

import { useRef } from 'react'
import './s2-experience.css'

/* PRD §5.2 — S2 Expérience Bellajour.
   Carrousel horizontal de 4 cartes. Desktop ~2,5 cartes / mobile 1,2 carte (D3).
   Scroll-snap CSS + flèches. Wording figé du PRD (UX + Algo par carte). */

interface Carte {
  num: string
  label: string
  ux: string
  algo: string
  cloture?: string
}

const CARTES: Carte[] = [
  {
    num: '01',
    label: 'L’upload',
    ux: 'Ajoutez l’ensemble de vos photos, même si elles ne sont pas triées. Invitez vos proches à contribuer directement sur votre projet.',
    algo: 'Bellajour analyse chaque photo : netteté, lumière, doublons, valeur émotionnelle… afin de préparer la composition.',
  },
  {
    num: '02',
    label: 'Le questionnaire',
    ux: 'Choisissez vos préférences de mise en page parmi nos différents styles, ajustez la densité. Définissez les rôles des protagonistes de votre histoire.',
    algo: 'Vos réponses calibrent l’algorithme de sélection. Il sait maintenant qui compte pour vous, quelles photos prioriser, dans quel ordre, et avec quelle intention narrative.',
  },
  {
    num: '03',
    label: 'La mise en page',
    ux: 'Votre album est déjà là. Feuilletez, admirez, et si une photo vous manque, échangez-la en un geste selon vos envies.',
    algo: 'Bellajour a sélectionné, ordonné et mis en page vos meilleures photos. Les autres sont triées par critères — lieu, moment, personne — pour que comparer et choisir ne prenne que quelques secondes.',
  },
  {
    num: '04',
    label: 'L’illustration',
    ux: 'Choisissez une illustration générée uniquement pour votre album, créée pour refléter votre histoire. Ajoutez-la en couverture, complétez avec une de vos photos si vous le souhaitez. Sélectionnez vos couleurs, donnez un titre à vos souvenirs.',
    algo: 'Bellajour a analysé l’ensemble de votre album — les lieux, les visages, les émotions — pour générer une illustration qui lui ressemble. Rien n’est pioché dans une bibliothèque. C’est la vôtre !',
    cloture: 'Votre album est prêt !',
  },
]

export default function S2Experience() {
  const trackRef = useRef<HTMLDivElement>(null)

  const scrollByCard = (dir: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>('.s2-card')
    const step = card ? card.offsetWidth + 24 : track.clientWidth * 0.8
    track.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <section className="s2" data-section="s2-experience" data-theme="light">
      <div className="s2-head">
        <h2 className="s2-title">Tout le parcours, sans la complexité.</h2>
        <div className="s2-arrows">
          <button type="button" className="s2-arrow" aria-label="Précédent" onClick={() => scrollByCard(-1)}>‹</button>
          <button type="button" className="s2-arrow" aria-label="Suivant" onClick={() => scrollByCard(1)}>›</button>
        </div>
      </div>

      <div className="s2-track" ref={trackRef}>
        {CARTES.map((c) => (
          <article key={c.num} className="s2-card">
            <div className="s2-card-media" aria-hidden="true">
              <span className="s2-card-media-label">MOCKUP CARTE {c.num}</span>
            </div>
            <div className="s2-card-body">
              <span className="s2-card-label">{c.label}</span>
              <p className="s2-card-ux">{c.ux}</p>
              <p className="s2-card-algo">{c.algo}</p>
              {c.cloture && <p className="s2-card-cloture">{c.cloture}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
