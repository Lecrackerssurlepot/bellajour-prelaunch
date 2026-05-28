'use client'

import { useState } from 'react'
import './faq.css'

const ITEMS = [
  {
    q: 'Pourquoi rejoindre la liste maintenant\u00a0?',
    a: [
      "L\u2019inscription est gratuite et sans engagement\u00a0: vous serez averti par mail avant l\u2019ouverture officielle.",
      "En rejoignant la liste d\u2019attente, vous faites partie des premiers Fondateurs Bellajour\u00a0: acc\u00e8s aux pr\u00e9ventes d\u00e8s le 13 juin, 48 heures avant tout le monde, et tarif r\u00e9serv\u00e9 aux 100 premiers inscrits.",
      "Le programme de parrainage s\u2019ouvre pour toute la p\u00e9riode de waitlist. Pour 25\u00a0\u20ac d\u2019acompte, vous obtenez 30\u00a0\u20ac d\u00e9duits de votre premi\u00e8re commande d\u00e8s le 15 ao\u00fbt.",
      "Et d\u2019autres avantages exclusifs r\u00e9serv\u00e9s aux 100 premiers, pour remercier ceux qui nous font confiance depuis le d\u00e9but.",
    ],
  },
  {
    q: 'Combien co\u00fbte un album\u00a0?',
    a: [
      "Nos albums commencent \u00e0 60\u00a0\u20ac pour 30 pages. En dessous de 30 pages, nous trouvons qu\u2019il n\u2019y a pas assez de place pour raconter.",
      "Puis, comptez 1\u00a0\u20ac par page ajout\u00e9e. La livraison est toujours comprise. Le prix comprendra toujours notre analyse IA pouss\u00e9e, votre version digitale HD et la cr\u00e9ation de l\u2019illustration Bellajour unique \u00e0 chaque album. Toutes ces attentions nous tiennent \u00e0 c\u0153ur.",
      "Nous mettons tout en place pour vous proposer les meilleurs prix gr\u00e2ce \u00e0 notre syst\u00e8me d\u2019offre pr\u00e9ventes, notre syst\u00e8me de points (appel\u00e9 \u00ab\u00a0Instants\u00a0\u00bb) et notre syst\u00e8me de parrainage. Chaque proche que vous parrainez r\u00e9duit directement le prix de votre album, ceci \u00e0 l\u2019infini.",
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
      "Bellajour se pr\u00e9pare.",
      "Les pr\u00e9ventes ouvrent le 15 juin 2026, en priorit\u00e9 pour les inscrits.",
      "Le lancement officiel est pr\u00e9vu le 15 ao\u00fbt 2026.",
      "Deux mois peuvent sembler longs, c\u2019est en r\u00e9alit\u00e9 le moment id\u00e9al pour photographier votre \u00e9t\u00e9 et recevoir votre album d\u00e8s la rentr\u00e9e.",
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
                  <span className="faq-icon" aria-hidden="true">+</span>
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
