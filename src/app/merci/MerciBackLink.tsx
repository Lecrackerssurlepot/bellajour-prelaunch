'use client'

/**
 * Lien « Retour à Bellajour » sur /merci (état confirmed).
 *
 * La personne a déjà payé : elle n'est plus un filleul à convertir. Au clic, on
 * vide le cache parrainage (sessionStorage 'bellajour_referral', posé à l'arrivée
 * via ?ref=) AVANT de naviguer, pour qu'aucune page n'affiche plus « 3 pages
 * offertes par {Prénom} » à quelqu'un dont la commande est déjà passée.
 *
 * ⚠️ Le nettoyage RESTE, la destination a changé. Le lien menait à
 * `/preventes?merci=1`, où le marqueur basculait le titre de S4 en « Votre
 * commande est validée ! ». /preventes a été retirée de la ligne le 28/08/2026 :
 * le marqueur n'a plus de lecteur, on ramène à l'accueil. Mais le cache
 * parrainage, lui, est lu par d'autres pages — le vider a toujours un sens.
 *
 * Navigation full-page (window.location.href) plutôt qu'un routeur : elle
 * garantit que rien du cache vidé ne survit en mémoire. `href` reste en repli
 * si JS est désactivé.
 */
export default function MerciBackLink() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    try {
      sessionStorage.removeItem('bellajour_referral')
    } catch {
      /* sessionStorage indispo (Safari privé) — no-op */
    }
    window.location.href = '/'
  }

  return (
    /* eslint-disable-next-line @next/next/no-html-link-for-pages --
       un <Link> ferait une navigation CÔTÉ CLIENT, qui garde la mémoire de
       l'onglet : c'est précisément ce que ce composant cherche à éviter. */
    <a className="merci-back" href="/" onClick={handleClick}>
      Retour à Bellajour
    </a>
  )
}
