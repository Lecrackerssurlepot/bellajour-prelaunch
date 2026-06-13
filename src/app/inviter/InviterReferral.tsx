'use client'

import { useReferralShare } from '../components/useReferralShare'
import InstagramLink from '../components/InstagramLink'

/**
 * Carte parrainage de la page /inviter — charte PRÉVENTE
 * (glass, --bj-action #4a90d9, radius --bj-r-*, fonts --bj-font-display/ui).
 *
 * Calqué sur MerciReferral : composant de STYLE dédié posé sur le hook partagé
 * useReferralShare (logique copie/partage/toast/fallback réutilisée VERBATIM,
 * + auto-copy/auto-share au mount pilotés par la page). ReferralCard.tsx reste
 * intact (partagé avec FinalWaitlist). Ici on ne fait QUE le style + le texte.
 */
export default function InviterReferral({
  refCode,
  autoCopyOnMount,
  autoShareOnMount,
}: {
  refCode: string
  autoCopyOnMount?: boolean
  autoShareOnMount?: boolean
}) {
  const { copied, toastVisible, copyLink, shareLink, referralLink } = useReferralShare(refCode, {
    autoCopyOnMount,
    autoShareOnMount,
  })

  return (
    <div className="inviter-ref">
      <div className="inviter-ref-code" aria-label={`Votre code de parrainage : ${refCode}`}>
        {refCode}
      </div>

      <p className="inviter-ref-link-label">Votre lien de parrainage</p>

      <div className="inviter-ref-link-row">
        <span className="inviter-ref-link-text">{referralLink}</span>
        <button
          type="button"
          className="inviter-ref-copy-btn"
          onClick={() => copyLink(false)}
          aria-label="Copier le lien de parrainage"
        >
          {copied ? 'Lien copié ✓' : 'Copier le lien'}
        </button>
      </div>

      <button
        type="button"
        className="inviter-ref-share-btn"
        onClick={shareLink}
        aria-label="Partager votre lien de parrainage"
      >
        Partager à vos proches
      </button>

      <p className="inviter-ref-reassurance">
        Vous allez recevoir un mail avec toutes les informations. Si ce n&rsquo;est pas le cas, n&rsquo;hésitez pas à vérifier vos spams.
      </p>

      <p className="inviter-ref-footer">
        Vos 5 pages s&rsquo;appliquent dès que chacun de vos proches passera commande au lancement. Pas de limite — plus vous parrainez, plus vous cumulez.
      </p>

      <InstagramLink className="inviter-ref-insta" />

      <div
        className={`inviter-ref-toast${toastVisible ? ' inviter-ref-toast--visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        Lien copié ✓
      </div>
    </div>
  )
}
