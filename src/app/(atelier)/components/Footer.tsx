/* Footer — STRUCTURE reprise de celle de la landing (src/app/sections/Footer.tsx),
   transposée dans la charte sombre.
   Décision de Mathias, 24/08/2026 : garder la composition qui fait la
   signature de la marque — deux colonnes, tagline en haut à gauche, Instagram
   et copyright à droite, et le mot « Bellajour » géant coupé par le bas —
   plutôt que la ligne unique de liens qu'avait l'atelier.

   TROIS ÉCARTS VOLONTAIRES AVEC L'ORIGINAL

   1. Le lien « Espace ambassadeur » n'est pas repris (demandé). Il mène à
      l'espace des ambassadeurs de la prévente, qui n'a rien à faire au bas de
      la page d'accueil d'un produit qui, lui, se vend aujourd'hui. La page
      reste en ligne pour ceux qui ont son adresse.

   2. Le lien Instagram est écrit ICI plutôt qu'importé de
      src/app/components/InstagramLink.tsx. Ce composant-là est peint avec
      `--bj-muted`, un token de la palette crème qui n'existe plus dans
      tokens.css : sa couleur est aujourd'hui héritée par accident. L'importer
      ferait dépendre le monde sombre d'un bug du monde crème. Le SVG est
      identique, les tokens sont ceux de l'atelier.

   3. Le mot géant est en graisse 400, pas 700 : le layout de ce groupe ne
      charge QUE la 400 de Cormorant Garamond (une seule graisse, normal +
      italique). Demander 700 donnerait un faux gras synthétisé par le
      navigateur — épais, sale, et différent d'un appareil à l'autre. */

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
      <div className="at-wrap at-footer-top">

        {/* Gauche — tagline, invitation à écrire, liens */}
        <div className="at-footer-left">
          <p className="at-footer-tagline">Vivez. Nous composons.</p>
          <p className="at-footer-label">Une question&nbsp;? Écrivez-nous&nbsp;:</p>
          <nav className="at-footer-links" aria-label="Liens de bas de page">
            <a className="at-footer-mail" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            {LIENS.map((l) => (
              <span key={l.href} className="at-footer-item">
                <span className="at-footer-sep" aria-hidden="true">·</span>
                <a href={l.href}>{l.label}</a>
              </span>
            ))}
          </nav>
        </div>

        {/* Droite — les reseaux, puis le copyright.
             Les deux liens sont groupes pour respirer ensemble : sans ce
             conteneur ils heriteraient de l'ecart de `.at-footer-right`, qui
             est calibre pour separer des BLOCS, pas deux lignes d'une meme
             liste. Le dessin des deux icones est en TRAIT, jamais en aplat :
             c'est ce qui les fait tenir ensemble a 15 px. */}
        <div className="at-footer-right">
          <div className="at-footer-social">
            <a
              className="at-footer-lien-social"
              href="https://www.instagram.com/bellajour__/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bellajour sur Instagram"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
              </svg>
              <span>@bellajour__</span>
            </a>

            <a
              className="at-footer-lien-social"
              href="https://www.tiktok.com/@bellajourmagazine"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bellajour sur TikTok"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {/* la hampe, puis la tete de note */}
                <path d="M13.2 3v12.1a3.6 3.6 0 1 1-3.6-3.6c.31 0 .61.04.9.12" />
                {/* le crochet vers le haut a droite */}
                <path d="M13.2 3c.35 2.5 2.4 4.4 4.9 4.6" />
              </svg>
              <span>@bellajourmagazine</span>
            </a>
          </div>

          <p className="at-footer-copy">©&nbsp;2026 Bellajour</p>
        </div>

      </div>

      {/* Le mot, coupé par le bas — la signature du footer. */}
      <p className="at-footer-word" aria-hidden="true">Bellajour</p>
    </footer>
  )
}
