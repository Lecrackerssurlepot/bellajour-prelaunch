'use client'

import { useState } from 'react'
import './faq.css'

const ITEMS = [
  {
    q: 'Pourquoi rejoindre la liste maintenant\u00a0?',
    a: [
      "L\u2019inscription est gratuite, sans engagement, et vous permet d\u2019\u00eatre pr\u00e9venu avant l\u2019ouverture officielle de Bellajour.",
      "Les premiers inscrits seront inform\u00e9s des prochaines \u00e9tapes, des premiers acc\u00e8s disponibles et des \u00e9ventuels avantages de lancement.",
      "Pas de spam. Pas d\u2019emails inutiles. Et vous pouvez vous d\u00e9sinscrire \u00e0 tout moment.",
    ],
  },
  {
    q: 'Combien co\u00fbtera un album Bellajour\u00a0?',
    a: [
      "Le prix d\u00e9pendra du nombre de pages et des options choisies au moment de la cr\u00e9ation.",
      "L\u2019objectif est de proposer un album premium, imprim\u00e9 avec soin, avec un prix clair et transparent avant toute commande.",
      "Les personnes inscrites \u00e0 la liste d\u2019attente seront pr\u00e9venues en priorit\u00e9 des premi\u00e8res offres de lancement.",
    ],
  },
  {
    q: '\u00c0 qui s\u2019adresse Bellajour\u00a0?',
    a: [
      "Bellajour s\u2019adresse aux personnes qui ont des centaines \u2014 parfois des milliers \u2014 de photos importantes, mais pas le temps, l\u2019\u00e9nergie ou l\u2019envie de les trier pour cr\u00e9er un vrai album.",
      "Voyages, famille, couple, naissance, mariage, ann\u00e9e entre amis ou souvenirs du quotidien\u00a0: Bellajour transforme vos photos en une histoire que l\u2019on a enfin envie de feuilleter.",
    ],
  },
  {
    q: 'Quand Bellajour sera-t-il disponible\u00a0?',
    a: [
      "Bellajour est en cours de pr\u00e9paration.",
      "L\u2019objectif est d\u2019ouvrir les premiers acc\u00e8s dans les prochains mois, avec une phase de lancement progressive avant l\u2019ouverture officielle.",
      "Les inscrits seront les premiers inform\u00e9s des dates, des acc\u00e8s disponibles et des prochaines \u00e9tapes.",
    ],
  },
  {
    q: "Qu\u2019est-ce qui rend Bellajour diff\u00e9rent d\u2019un album photo classique\u00a0?",
    a: [
      "Bellajour ne vous demande pas seulement de d\u00e9poser vos photos dans un mod\u00e8le.",
      "L\u2019objectif est de vous aider \u00e0 choisir, organiser et composer vos souvenirs pour cr\u00e9er un album qui raconte vraiment quelque chose.",
      "Moins de tri, moins d\u2019h\u00e9sitation, plus d\u2019histoire.",
    ],
  },
  {
    q: 'Est-ce que je peux inviter des proches\u00a0?',
    a: [
      "Oui. Apr\u00e8s votre inscription, vous pourrez partager Bellajour \u00e0 vos proches gr\u00e2ce \u00e0 votre lien personnel.",
      "Si vos proches rejoignent la liste gr\u00e2ce \u00e0 vous, vous pourrez d\u00e9bloquer certains avantages au moment du lancement\u00a0: acc\u00e8s prioritaire, offres r\u00e9serv\u00e9es ou r\u00e9compenses de parrainage.",
      "Une belle fa\u00e7on de faire d\u00e9couvrir Bellajour\u2026 et de prendre un peu d\u2019avance.",
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
