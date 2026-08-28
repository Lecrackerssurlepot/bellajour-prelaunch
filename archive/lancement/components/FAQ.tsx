'use client'

import { useState } from 'react'
import './faq.css'
/* Prix et bornes interpolés depuis la grille (source unique) — AUCUN montant
   ni nombre de pages en dur. */
import { ALBUM_PAGES, PRICE_LOOKUP, PRIX_ALBUM_BASE } from '@/lib/pricing'

/* Plafond de pages dérivé de la grille elle-même. */
const PAGES_MAX = Math.max(...Object.keys(PRICE_LOOKUP).map(Number))

/* LANCEMENT — FAQ.
   Recréée proprement sur les tokens --bj-* : sections/faq.css référence des
   tokens legacy non définis (--bj-bg, --bj-gold…) — même raison pour laquelle
   S5Garanties avait déjà réimplémenté son accordéon côté prévente.
   Accordéon exclusif, question en Cormorant italic, « + » qui pivote.
   C'est ici que le prix, le format et le délai réapparaissent en clair.
   (Le parrainage n'est volontairement pas mis en avant sur la homepage.) */

const ITEMS: { q: string; r: string }[] = [
  {
    q: 'Combien coûte un album ?',
    r: `À partir de ${PRIX_ALBUM_BASE} € pour ${ALBUM_PAGES} pages, livraison comprise. Le prix suit ensuite le nombre de pages, jusqu’à ${PAGES_MAX}. Rien ne s’ajoute au dernier écran : ni frais de port, ni option, ni supplément couverture.`,
  },
  {
    q: 'Quel est le format de l’album ?',
    r: 'Portrait 21 × 28 cm, couverture rigide, papier brillant 170 g. Trente pages de base, et la tranche porte le titre de votre voyage — c’est ce qui le rend reconnaissable sur une étagère.',
  },
  {
    q: 'Combien de temps pour le recevoir ?',
    r: 'Comptez 7 à 10 jours ouvrés après votre validation : quelques jours d’impression et de façonnage, puis deux à trois jours de livraison. Le délai ne court qu’à partir du moment où vous validez — vous gardez votre album ouvert aussi longtemps que vous le souhaitez.',
  },
  {
    q: 'Puis-je valider avant impression ?',
    r: 'Oui, et c’est le principe même. Vous recevez votre album entièrement composé : vous le feuilletez page par page, remplacez une photo, changez l’ordre, ajustez la couverture. Rien ne part à l’impression tant que vous n’avez pas validé.',
  },
  {
    q: 'Puis-je inviter mes proches à ajouter leurs photos ?',
    r: 'Oui. Un lien d’invitation suffit : chacun dépose ses photos dans le même album, depuis son téléphone, sans créer de compte. Vous restez seul à décider de ce qui entre dans la version finale.',
  },
  {
    q: 'Mes photos sont-elles protégées ?',
    r: 'Vos photos ne servent qu’à composer votre album. Elles ne sont jamais publiées, jamais partagées, jamais revendues. Vous pouvez les supprimer à tout moment depuis votre compte, et la suppression de votre compte entraîne celle de vos fichiers.',
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
