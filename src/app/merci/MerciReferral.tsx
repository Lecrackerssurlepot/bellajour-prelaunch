'use client'

import { useReferralShare } from '../components/useReferralShare'

/**
 * Affichage du code de parrainage sur /merci — charte PRÉVENTE
 * (glass, #4a90d9, radius ≥12px, fonts --bj-*).
 *
 * Réutilise la logique copier/partager TELLE QUELLE via useReferralShare
 * (le même code testé que ReferralCard). Ici on ne fait QUE le style + le texte.
 * La page ne gère AUCUN crédit : elle affiche le code et l'explique, point.
 */
export default function MerciReferral({ refCode }: { refCode: string }) {
  const { copied, toastVisible, copyLink, shareLink, referralLink } = useReferralShare(refCode)

  return (
    <div className="merci-ref">
      <p className="merci-ref-label">Votre code de parrainage</p>
      <div className="merci-ref-code" aria-label={`Votre code de parrainage : ${refCode}`}>
        {refCode}
      </div>

      <div className="merci-ref-link-row">
        <span className="merci-ref-link-text">{referralLink}</span>
        <button
          type="button"
          className="merci-ref-copy-btn"
          onClick={() => copyLink(false)}
          aria-label="Copier le lien de parrainage"
        >
          {copied ? 'Lien copié ✓' : 'Copier le lien'}
        </button>
      </div>

      <button
        type="button"
        className="merci-ref-share-btn"
        onClick={shareLink}
        aria-label="Partager votre lien de parrainage"
      >
        Partager à vos proches
      </button>

      <p className="merci-ref-explain">
        Partagez ce lien. Pour chaque proche qui pré-commande, vous gagnez des pages offertes :{' '}
        <strong>1 page = 1 €</strong>. La remise s&rsquo;active au lancement, le <strong>15 août</strong>.
      </p>

      <div
        className={`merci-ref-toast${toastVisible ? ' merci-ref-toast--visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        Lien copié ✓
      </div>
    </div>
  )
}
