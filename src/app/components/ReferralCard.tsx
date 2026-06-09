'use client'

import { type ReactNode } from 'react'
import InstagramLink from './InstagramLink'
import { useReferralShare } from './useReferralShare'
import './referralcard.css'

interface ReferralCardProps {
  refCode: string
  variant: 'hero' | 'full'
  title?: ReactNode
  subtitle?: ReactNode
  showFooter?: boolean
  autoCopyOnMount?: boolean
  autoShareOnMount?: boolean
}

export default function ReferralCard({
  refCode,
  variant,
  title,
  subtitle,
  showFooter,
  autoCopyOnMount,
  autoShareOnMount,
}: ReferralCardProps) {
  const { copied, toastVisible, copyLink, shareLink, referralLink } = useReferralShare(refCode, {
    autoCopyOnMount,
    autoShareOnMount,
  })
  const footerVisible = showFooter ?? variant === 'full'

  return (
    <div className={`ref-card ref-card--${variant}`}>
      {title && <h2 className="ref-card-title">{title}</h2>}
      {subtitle && <p className="ref-card-sub">{subtitle}</p>}

      <div className="ref-card-code" aria-label={`Votre code de parrainage : ${refCode}`}>{refCode}</div>

      {variant === 'full' && (
        <p className="ref-card-link-label">Votre lien de parrainage</p>
      )}

      <div className="ref-card-link-row">
        <span className="ref-card-link-text">{referralLink}</span>
        <button
          type="button"
          className="ref-card-copy-btn"
          onClick={() => copyLink(false)}
          aria-label="Copier le lien de parrainage"
        >
          {copied ? 'Lien copié ✓' : 'Copier le lien'}
        </button>
      </div>

      <button
        type="button"
        className="ref-card-share-btn"
        onClick={shareLink}
        aria-label="Partager votre lien de parrainage"
      >
        Partager à vos proches
      </button>

      <p className="ref-card-reassurance">
        Vous allez recevoir un mail avec toutes les informations. Si ce n&rsquo;est pas le cas, n&rsquo;hésitez pas à vérifier vos spams.
      </p>

      {footerVisible && (
        <p className="ref-card-footer">
          Vos 5 pages s&rsquo;appliquent dès que chacun de vos proches passera commande au lancement. Pas de limite — plus vous parrainez, plus vous cumulez.
        </p>
      )}

      {variant === 'full' && (
        <InstagramLink className="ref-card-insta" />
      )}

      <div
        className={`ref-card-toast${toastVisible ? ' ref-card-toast--visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        Lien copié ✓
      </div>
    </div>
  )
}
