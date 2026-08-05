import './footer.css'
import { INSTAGRAM_POSTS } from '../galerie-covers'
import { LOGIN_HREF } from '../links'

/* LANCEMENT — Footer sombre + bande Instagram (maquette 09, FUSION).
   La section Instagram autonome disparaît : le flux devient la première bande
   du footer (un bloc de moins, la sortie chaude reste au même endroit).
   Flux STATIQUE (tableau INSTAGRAM_POSTS), jamais un widget tiers.
   Tant que le tableau est vide, la bande (et son sur-titre) ne se rend pas. */

export default function Footer() {
  return (
    <footer className="lc-foot" data-section="footer" data-theme="dark">
      <div className="lc-wrap">
        {INSTAGRAM_POSTS.length > 0 && (
          <>
            <span className="lc-eyebrow lc-foot-eyebrow">
              Sur Instagram, @bellajour__
            </span>
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
          </>
        )}

        <div className="lc-foot-in">
          <div>
            <img
              className="lc-foot-logo"
              src="/images/ui/bellajour-blanc.webp"
              alt="Bellajour"
            />
            <p className="lc-foot-sign">Vivez, nous composons</p>
          </div>
          <nav className="lc-foot-links" aria-label="Liens footer">
            <a href="mailto:contact@bellajour.com">Contact</a>
            <a href={LOGIN_HREF}>Mon compte</a>
            <a href={LOGIN_HREF}>Ma bibliothèque</a>
            <a href="/mentions-legales">Mentions légales</a>
            <a href="/confidentialite">Confidentialité</a>
            <a href="/cgv">CGV</a>
            <a href="/remboursement">Remboursement</a>
            <a href="/ambassadeurs/espace">Espace ambassadeur</a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
