'use client'

import { useState } from 'react'
import './faq.css'
/* Prix interpolé depuis la grille (source unique) — jamais de montant en dur. */
import { ALBUM_PAGES, PRIX_ALBUM_BASE } from '../../preventes/pricing'

/* LANCEMENT — FAQ (maquette 08).
   Recréée proprement sur les tokens --bj-* : sections/faq.css référence des
   tokens legacy non définis (--bj-bg, --bj-gold…) — même raison pour laquelle
   S5Garanties avait déjà réimplémenté son accordéon côté prévente.
   Accordéon exclusif, question en Cormorant italic, « + » qui pivote.
   C'est ici que le prix et le délai réapparaissent en clair. */

const ITEMS: { q: string; r: string }[] = [
  {
    q: 'Combien coûte un album ?',
    r: `À partir de ${PRIX_ALBUM_BASE} € pour ${ALBUM_PAGES} pages, livraison comprise. Le prix suit le nombre de pages, et rien ne s’ajoute au dernier écran.`,
  },
  {
    q: 'Combien de temps pour le recevoir ?',
    r: 'Comptez une semaine de production, puis deux à quatre jours de livraison. Vous suivez chaque étape depuis votre compte.',
  },
  {
    q: 'Puis-je valider avant impression ?',
    r: 'Oui. Rien n’est imprimé sans votre validation. Vous feuilletez, vous ajustez, et vous seul décidez du moment.',
  },
  {
    q: 'Mes photos sont-elles protégées ?',
    r: 'Vos photos servent uniquement à composer votre album. Elles ne sont jamais partagées ni réutilisées, et vous pouvez les supprimer à tout moment.',
  },
  {
    q: 'Comment fonctionne le parrainage ?',
    r: 'Chaque proche qui commande grâce à votre code vous offre une page. Sans plafond, et sans date de fin.',
  },
]

export default function FAQ() {
  /* Première question ouverte par défaut (maquette). */
  const [open, setOpen] = useState<number | null>(0)

  const toggle = (i: number) => setOpen((prev) => (prev === i ? null : i))

  return (
    <section className="lc-sec lc-faq" data-section="faq" data-theme="light">
      <div className="lc-wrap">
        <span className="lc-eyebrow">Les questions</span>
        <h2 className="lc-h2 lc-faq-title">Ce que l’on nous demande</h2>

        <div className="lc-faq-list">
          {ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q} className={`lc-faq-q${isOpen ? ' lc-faq-q--on' : ''}`}>
                <button
                  type="button"
                  className="lc-faq-h"
                  aria-expanded={isOpen}
                  aria-controls={`lc-faq-r-${i}`}
                  onClick={() => toggle(i)}
                >
                  <span className="lc-faq-t">{item.q}</span>
                  <span className="lc-faq-p" aria-hidden="true">
                    +
                  </span>
                </button>
                <div id={`lc-faq-r-${i}`} className="lc-faq-b" role="region">
                  <p>{item.r}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
