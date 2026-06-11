'use client'

import { useEffect, useState } from 'react'
import './s5-garanties.css'
import { PRIX_ALBUM_BASE } from './offer-state'
import { isValidRefCode } from '@/lib/validation'

interface FaqItem {
  q: string
  a: string
  /* Affiche le renvoi inline « Voir le détail de nos prix » → /preventes/prix. */
  priceLink?: boolean
}

/* PRD §5.5 — S5 Garanties + FAQ courte.
   4 garanties + accordéon 5 Q/R (wording figé du PRD).
   Accordéon : même pattern que sections/FAQ.tsx mais tokens --bj-* valides
   (faq.css existant référence des tokens legacy non définis — non réutilisé). */

const GARANTIES = [
  { titre: 'Photos privées', texte: 'Vos photos ne servent qu’à composer votre album.' },
  { titre: 'Validation avant impression', texte: 'Rien n’est imprimé sans votre accord final.' },
  { titre: 'Paiement sécurisé', texte: 'Transaction chiffrée, acompte uniquement.' },
  { titre: 'Acompte remboursable', texte: 'Remboursé si l’album ne peut pas être produit.' },
]

const FAQ: FaqItem[] = [
  {
    q: 'Quand pourrai-je créer mon album ?',
    a: 'Le lancement a lieu le 15 août. En réservant pendant la prévente, vous faites partie des tout premiers à concevoir votre album, dès l’ouverture.',
  },
  {
    q: 'Combien coûtera l’album final ?',
    a: `L’album se règle selon son nombre de pages, à partir de ${PRIX_ALBUM_BASE} € pour 30 pages (le format de base). Votre acompte est intégralement crédité sur ce prix : il n’est pas un surcoût, il est déduit de votre commande.`,
    priceLink: true,
  },
  {
    q: 'Puis-je valider avant impression ?',
    a: 'Oui. Rien n’est imprimé sans votre validation finale. Vous feuilletez votre album, ajustez ce que vous voulez, et vous seul décidez du moment de lancer l’impression.',
  },
  {
    q: 'Mes photos sont-elles sécurisées ?',
    a: 'Vos photos sont privées et protégées. Elles ne servent qu’à composer votre album, ne sont jamais partagées ni réutilisées, et vous pouvez les supprimer à tout moment.',
  },
  {
    q: 'Que se passe-t-il si Bellajour n’est pas prêt à temps ?',
    a: 'Votre acompte est intégralement remboursable si l’album ne peut pas être produit. Vous ne prenez aucun risque en réservant aujourd’hui.',
  },
]

export default function S5Garanties() {
  const [open, setOpen] = useState<number | null>(null)
  const toggle = (i: number) => setOpen((prev) => (prev === i ? null : i))

  /* Lien prix avec ?ref préservé (lecture URL uniquement, pas de storage). */
  const [prixHref, setPrixHref] = useState('/preventes/prix')
  useEffect(() => {
    const ref = (new URLSearchParams(window.location.search).get('ref') || '').trim()
    if (ref && isValidRefCode(ref)) {
      setPrixHref(`/preventes/prix?ref=${encodeURIComponent(ref)}`)
    }
  }, [])

  return (
    <section className="s5" data-section="s5-garanties" data-theme="light">
      <div className="s5-inner">

        <ul className="s5-garanties" aria-label="Garanties">
          {GARANTIES.map((g) => (
            <li key={g.titre} className="s5-garantie">
              <span className="s5-garantie-titre">{g.titre}</span>
              <span className="s5-garantie-texte">{g.texte}</span>
            </li>
          ))}
        </ul>

        <div className="s5-faq">
          <h2 className="s5-faq-title">Questions fréquentes</h2>
          <div className="s5-faq-list" role="list">
            {FAQ.map((item, i) => {
              const isOpen = open === i
              return (
                <div
                  key={i}
                  className={`s5-faq-item${isOpen ? ' s5-faq-item--open' : ''}`}
                  role="listitem"
                >
                  <button
                    className="s5-faq-q"
                    onClick={() => toggle(i)}
                    aria-expanded={isOpen}
                  >
                    <span className="s5-faq-q-text">{item.q}</span>
                    <span className="s5-faq-icon" aria-hidden="true">+</span>
                  </button>
                  <div className="s5-faq-answer-wrap">
                    <div className="s5-faq-answer">
                      <p>
                        {item.a}
                        {item.priceLink && (
                          <>
                            {' '}
                            <a className="s5-faq-link" href={prixHref}>
                              Voir le détail de nos prix
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </section>
  )
}
