import '../components/navbar.css'

/* Barre de tête de /merci.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE PAGE A SA PROPRE BARRE DEPUIS LE 28/08/2026
 *
 * Elle importait celle de /preventes, qui a été retirée de la ligne. Mais la
 * recopier telle quelle aurait traîné du comportement mort : cette barre-là
 * observe `#s1` pour se rendre solide et fait défiler vers `#s4`. Ni l'un ni
 * l'autre n'existe sur /merci — l'observateur ne s'armait jamais, la barre
 * restait donc en état transparent au-dessus d'un fond crème, et le bouton
 * « Participer aux préventes » faisait défiler vers rien.
 *
 * Ici : solide d'emblée (il n'y a pas de hero à révéler), et un seul chemin
 * de sortie, vers l'Atelier. C'est la page que voient les 14 fondateurs quand
 * ils rouvrent leur mail de confirmation : elle doit rester juste.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Composant SERVEUR : plus rien ici ne lit le navigateur.
 *
 * ⚠️ `<a>` et non `<Link>`, comme le faisait la barre d'origine : `/` est
 * l'Atelier, un autre groupe de routes avec son thème sombre, ses deux polices
 * et une séquence d'ouverture. Un chargement complet est la garantie simple que
 * rien de la charte crème ne traverse. C'est un lien qu'on suit une fois, pas
 * une navigation d'application.
 * ⚠️ `pv-nav--flat` (le repli anti-jank d'Android) n'est pas posé, et c'est
 * volontaire : la règle vise les barres qu'on garde sous les yeux pendant un
 * long défilement. /merci tient sur un écran.
 */
export default function Navbar() {
  return (
    <nav className="pv-nav pv-nav--solid" aria-label="Navigation">
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="pv-nav-logo-btn" aria-label="Accueil Bellajour">
        <img
          src="/images/ui/logo.webp"
          className="pv-nav-logo"
          alt="Bellajour"
          width="204"
          height="144"
          decoding="async"
        />
      </a>

      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="pv-nav-cta" href="/">
        Composer mon numéro
      </a>
    </nav>
  )
}
