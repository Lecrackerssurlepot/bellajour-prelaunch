import InstagramLink from '../components/InstagramLink'
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
          <InstagramLink handle="@bellajour" />
          <p className="footer-copy">&copy;&nbsp;2026 Bellajour</p>
        </div>

      </div>

      {/* Mot géant coupé en bas */}
      <p className="footer-word" aria-hidden="true">Bellajour</p>

    </footer>
  )
}
