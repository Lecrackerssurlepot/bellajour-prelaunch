import InstagramLink from '../components/InstagramLink'
import './footer.css'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="footer" data-section="footer" data-theme="light">

      <div className="footer-top">

        {/* Gauche — tagline + liens */}
        <div className="footer-left">
          <p className="footer-tagline">Vivez. Nous composons.</p>
          <p className="footer-contact-label">Une question&nbsp;? &Eacute;crivez-nous&nbsp;:</p>
          <nav className="footer-links" aria-label="Liens footer">
            {/* `prefetch={false}` sur tout le pied de page : ces pages sont
                     DYNAMIQUES (le `?lang=` et le `?ref=` interdisent à Next de
                     les figer) et quasiment jamais ouvertes. Les précharger dès
                     que le pied entre à l'écran ferait tourner cinq fonctions
                     serveur à chaque visite, pour rien. Le clic, lui, reste une
                     navigation côté client. */}
            <a href="mailto:contact@bellajour.com" className="footer-link footer-link--mail">
              contact@bellajour.com
            </a>
            <span className="footer-sep" aria-hidden="true">&middot;</span>
            <Link href="/mentions-legales" prefetch={false} className="footer-link">Mentions l&eacute;gales</Link>
            <span className="footer-sep" aria-hidden="true">&middot;</span>
            <Link href="/confidentialite" prefetch={false} className="footer-link">Confidentialit&eacute;</Link>
            <span className="footer-sep" aria-hidden="true">&middot;</span>
            <Link href="/cgv" prefetch={false} className="footer-link">CGV</Link>
            <span className="footer-sep" aria-hidden="true">&middot;</span>
            <Link href="/remboursement" prefetch={false} className="footer-link">Remboursement</Link>
            <span className="footer-sep" aria-hidden="true">&middot;</span>
            <Link href="/ambassadeurs/espace" prefetch={false} className="footer-link footer-link--amb">
              Espace ambassadeur
            </Link>
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
