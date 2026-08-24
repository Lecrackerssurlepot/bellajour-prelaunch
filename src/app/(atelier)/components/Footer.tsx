/* Footer sombre — PRD §14 amendée.
   Le footer crème de la landing (src/app/sections/Footer.tsx) reste en place
   sur /preventes ; il n'a pas sa place au bas d'un site noir. On reprend les
   MÊMES liens légaux et les MÊMES URL, dans la charte de l'atelier. */

import { CONTACT_EMAIL } from '../content'
import './footer.css'

const LIENS = [
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/cgv', label: 'CGV' },
  { href: '/remboursement', label: 'Remboursement' },
]

export default function Footer() {
  return (
    <footer className="at-footer">
      <div className="at-wrap at-footer-inner">
        <span>Bellajour — composé à la main, en France</span>
        <nav className="at-footer-links" aria-label="Liens légaux">
          {LIENS.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </div>
    </footer>
  )
}
