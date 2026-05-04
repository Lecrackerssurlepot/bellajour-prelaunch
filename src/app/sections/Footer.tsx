import './footer.css'

export default function Footer() {
  return (
    <footer className="footer" data-section="footer" data-theme="light">
      <div className="footer-inner">

        {/* Logo */}
        <div className="footer-logo-wrap">
          <img src="/images/ui/logo.webp" alt="Bellajour" className="footer-logo" />
        </div>

        {/* Nav liens */}
        <nav className="footer-nav" aria-label="Liens footer">
          <a href="mailto:contact@bellajour.com" className="footer-link">
            contact@bellajour.com
          </a>
          <span className="footer-sep" aria-hidden="true">&middot;</span>
          <a href="/mentions-legales" className="footer-link">
            Mentions l&eacute;gales
          </a>
          <span className="footer-sep" aria-hidden="true">&middot;</span>
          <a href="/confidentialite" className="footer-link">
            Confidentialit&eacute;
          </a>
        </nav>

        {/* Instagram */}
        <a
          href="https://www.instagram.com/bellajour__/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-insta"
          aria-label="Bellajour sur Instagram"
        >
          <svg
            className="footer-insta-icon"
            xmlns="http://www.w3.org/2000/svg"
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
          <span>@bellajour</span>
        </a>

        {/* Bas de page */}
        <p className="footer-legal">
          &copy; 2026 Bellajour. Tous droits r&eacute;serv&eacute;s.
          &ensp;&middot;&ensp;
          Vivez. Nous composons.
        </p>

      </div>
    </footer>
  )
}
