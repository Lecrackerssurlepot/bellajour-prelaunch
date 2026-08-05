import './footer.css'
import { INSTAGRAM_POSTS } from '../galerie-covers'
import { LOGIN_HREF } from '../links'

/* LANCEMENT — Footer calqué sur sections/Footer de /preventes (maquette 09,
   corrigée) : fond CLAIR, deux colonnes, puis le mot « Bellajour » en géant
   coupé en bas (overflow hidden + translateY(0.2em)) — la signature visuelle
   de la page.
   Ajouts lancement : liens « Mon compte » / « Ma bibliothèque », et la bande
   Instagram AU-DESSUS du bloc deux colonnes, gouvernée par INSTAGRAM_POSTS
   (tableau vide → bande absente). Le lien Instagram de la colonne droite,
   lui, est toujours là, comme sur /preventes.
   Copie lancement uniquement : sections/Footer.tsx + footer.css restent
   strictement intacts (leurs tokens morts y compris). */

export default function Footer() {
  return (
    <footer className="lc-foot" data-section="footer" data-theme="light">
      {/* Bande Instagram — flux STATIQUE, jamais un widget tiers. */}
      {INSTAGRAM_POSTS.length > 0 && (
        <div className="lc-foot-insta">
          {INSTAGRAM_POSTS.map((post) =>
            post.href ? (
              <a
                key={post.src}
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={post.src} alt="Publication Instagram Bellajour" />
              </a>
            ) : (
              <img
                key={post.src}
                src={post.src}
                alt="Publication Instagram Bellajour"
              />
            )
          )}
        </div>
      )}

      <div className="lc-foot-top">
        {/* Gauche — tagline + liens */}
        <div className="lc-foot-left">
          <p className="lc-foot-tagline">Vivez. Nous composons.</p>
          <p className="lc-foot-contact-label">Une question&nbsp;? Écrivez-nous&nbsp;:</p>
          <nav className="lc-foot-links" aria-label="Liens footer">
            <a href="mailto:contact@bellajour.com" className="lc-foot-link lc-foot-link--mail">
              contact@bellajour.com
            </a>
            <span className="lc-foot-sep" aria-hidden="true">&middot;</span>
            <a href={LOGIN_HREF} className="lc-foot-link">Mon compte</a>
            <span className="lc-foot-sep" aria-hidden="true">&middot;</span>
            <a href={LOGIN_HREF} className="lc-foot-link">Ma bibliothèque</a>
            <span className="lc-foot-sep" aria-hidden="true">&middot;</span>
            <a href="/mentions-legales" className="lc-foot-link">Mentions légales</a>
            <span className="lc-foot-sep" aria-hidden="true">&middot;</span>
            <a href="/confidentialite" className="lc-foot-link">Confidentialité</a>
            <span className="lc-foot-sep" aria-hidden="true">&middot;</span>
            <a href="/cgv" className="lc-foot-link">CGV</a>
            <span className="lc-foot-sep" aria-hidden="true">&middot;</span>
            <a href="/remboursement" className="lc-foot-link">Remboursement</a>
            <span className="lc-foot-sep" aria-hidden="true">&middot;</span>
            <a href="/ambassadeurs/espace" className="lc-foot-link">Espace ambassadeur</a>
          </nav>
        </div>

        {/* Droite — Instagram + copyright */}
        <div className="lc-foot-right">
          <a
            href="https://www.instagram.com/bellajour__/"
            target="_blank"
            rel="noopener noreferrer"
            className="lc-foot-ig"
            aria-label="Bellajour sur Instagram"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
            </svg>
            <span>@bellajour</span>
          </a>
          <p className="lc-foot-copy">&copy;&nbsp;2026 Bellajour</p>
        </div>
      </div>

      {/* Mot géant coupé en bas — la signature du footer. */}
      <p className="lc-foot-word" aria-hidden="true">Bellajour</p>
    </footer>
  )
}
