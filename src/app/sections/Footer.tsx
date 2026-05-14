import './footer.css'

export default function Footer() {
  return (
    <footer className="footer" data-section="footer" data-theme="light">

      <div className="footer-top">

        {/* Gauche — tagline + liens */}
        <div className="footer-left">
          <p className="footer-tagline">Vivez. Nous composons.</p>
          <p className="footer-contact-label">Une question&nbsp;? &Eacute;crivez-nous&nbsp;:</p>
          <nav className="footer-links" aria-label="Liens footer">
            <a href="mailto:contact@bellajour.com" className="footer-link footer-link--mail">
              contact@bellajour.com
            </a>
            <span className="footer-sep" aria-hidden="true">&middot;</span>
            <span className="footer-link">Mentions l&eacute;gales</span>
            <span className="footer-sep" aria-hidden="true">&middot;</span>
            <span className="footer-link">Confidentialit&eacute;</span>
          </nav>
        </div>

        {/* Droite — Instagram + copyright */}
        <div className="footer-right">
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
          <p className="footer-copy">&copy;&nbsp;2026 Bellajour</p>
        </div>

      </div>

      {/* Mot géant coupé en bas */}
      <p className="footer-word" aria-hidden="true">Bellajour</p>

    </footer>
  )
}
