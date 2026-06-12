'use client'

/**
 * Lien « Retour à Bellajour » sur /merci (état confirmed).
 *
 * La personne a déjà payé : elle n'est plus un filleul à convertir. Au clic, on
 * vide le cache parrainage (sessionStorage 'bellajour_referral', posé à l'arrivée
 * via ?ref=) AVANT de naviguer vers /preventes, pour que la page s'affiche en
 * version normale (titre standard, aucune mention « 3 pages offertes par {Prénom} »).
 *
 * Navigation full-page (window.location.href) → S4Reservation se réinitialise sans
 * cache parrain. Le marqueur ?merci=1 indique à S4 qu'on revient après paiement
 * (titre « Votre commande est validée ! »). href reste en fallback si JS désactivé.
 */
export default function MerciBackLink() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    try {
      sessionStorage.removeItem('bellajour_referral')
    } catch {
      /* sessionStorage indispo (Safari privé) — no-op */
    }
    window.location.href = '/preventes?merci=1'
  }

  return (
    <a className="merci-back" href="/preventes?merci=1" onClick={handleClick}>
      Retour à Bellajour
    </a>
  )
}
