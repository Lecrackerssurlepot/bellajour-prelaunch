'use client'

import { useState } from 'react'
import './faq.css'

const ITEMS = [
  {
    q: 'Pourquoi rejoindre la liste maintenant\u00a0?',
    a: [
      "L\u2019inscription est gratuite, sans engagement, et vous permet d\u2019\u00eatre pr\u00e9venu avant l\u2019ouverture officielle de Bellajour.",
      "En rejoignant la waitlist, vous devenez l\u2019un des premiers Fondateurs Bellajour\u00a0: acc\u00e8s aux pr\u00e9ventes avant le 1er juin, tarif exclusif pour les 100 premiers inscrits, et programme de parrainage d\u00e8s l\u2019ouverture.",
      "Pas de spam. Pas d\u2019emails inutiles.",
    ],
  },
  {
    q: 'Combien co\u00fbtera un album Bellajour\u00a0?',
    a: [
      "Bellajour est un service premium, mais pens\u00e9 pour rester accessible.",
      "Son prix sera annonc\u00e9 d\u00e8s les pr\u00e9ventes du 1er juin, en toute transparence. Livraison incluse, sans surprise. C\u2019est quelque chose qui nous tient \u00e0 c\u0153ur.",
      "Et en plus, chaque parrainage que vous effectuez vient directement r\u00e9duire le prix.",
    ],
  },
  {
    q: '\u00c0 qui s\u2019adresse Bellajour\u00a0?',
    a: [
      "Bellajour s\u2019adresse aux personnes qui ont accumul\u00e9 des photos importantes, mais pas le temps, l\u2019\u00e9nergie ou l\u2019envie de les trier pour cr\u00e9er un vrai album.",
      "Voyages, famille, couple, naissance, mariage, ann\u00e9e entre amis ou souvenirs du quotidien\u00a0: Bellajour compose une histoire que l\u2019on a enfin envie de feuilleter.",
    ],
  },
  {
    q: 'Quand Bellajour sera-t-il disponible\u00a0?',
    a: [
      "Bellajour est en cours de pr\u00e9paration.",
      "Les pr\u00e9ventes ouvrent le 1er juin 2026, r\u00e9serv\u00e9es en priorit\u00e9 aux inscrits de la waitlist.",
      "Le lancement officiel est pr\u00e9vu le 1er juillet 2026.",
    ],
  },
  {
    q: "Qu\u2019est-ce qui rend Bellajour diff\u00e9rent d\u2019un album photo classique\u00a0?",
    a: [
      "Bellajour ne vous demande pas seulement de d\u00e9poser vos photos dans un mod\u00e8le.",
      "Vous donnez la direction. Nous nous chargeons du reste\u00a0: s\u00e9lection, composition et mise en page pour un album qui raconte vraiment quelque chose.",
      "Et chaque album b\u00e9n\u00e9ficie d\u2019une couverture illustr\u00e9e, compos\u00e9e uniquement pour votre histoire. Aucun autre album n\u2019aura la m\u00eame.",
      "Moins de tri, moins d\u2019h\u00e9sitation, plus d\u2019histoire.",
    ],
  },
  {
    q: 'Est-ce que je peux inviter des proches\u00a0?',
    a: [
      "Oui. Apr\u00e8s votre inscription, vous recevez un lien personnel pour faire d\u00e9couvrir Bellajour \u00e0 vos proches.",
      "Chaque proche qui rejoint la waitlist gr\u00e2ce \u00e0 vous vous offre une attention de 5\u00a0\u20ac, d\u00e9duite directement de votre commande.",
      "Autant de fois que vous le souhaitez.",
    ],
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  const toggle = (i: number) => setOpen(prev => prev === i ? null : i)

  return (
    <section className="faq-section" data-section="faq" data-theme="light">
      <div className="faq-inner">

        <div className="faq-header">
          <span className="faq-eyebrow">{'Questions fr\u00e9quentes'}</span>
          <h2 className="faq-titre">Tout ce que vous voulez savoir.</h2>
        </div>

        <div className="faq-list" role="list">
          {ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <div
                key={i}
                className={`faq-item${isOpen ? ' faq-item--open' : ''}`}
                role="listitem"
              >
                <button
                  className="faq-question"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                >
                  <span className="faq-question-text">{item.q}</span>
                  <span className="faq-icon" aria-hidden="true">
                    {isOpen ? '\u2212' : '\u002B'}
                  </span>
                </button>
                <div className="faq-answer-wrap">
                  <div className="faq-answer">
                    {item.a.map((para, j) => (
                      <p key={j}>{para}</p>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
