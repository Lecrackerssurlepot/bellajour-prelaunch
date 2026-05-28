'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import InstagramLink from './InstagramLink'
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

const SHARE_TEXT =
  "Je viens de découvrir Bellajour, une maison d'édition d'albums photos. Voici mon lien si ça t'intéresse :"

function fallbackCopy(text: string): boolean {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
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
  const [copied, setCopied] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didAutoTriggerRef = useRef(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.bellajour.fr'
  const referralLink = `${origin}/?ref=${refCode}`
  const footerVisible = showFooter ?? variant === 'full'

  const flashToast = (duration = 3000) => {
    setToastVisible(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastVisible(false), duration)
  }

  const flashCopiedLabel = (duration = 2200) => {
    setCopied(true)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), duration)
  }

  const copyLink = async (showToast: boolean) => {
    let ok = false
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(referralLink)
        ok = true
      } catch {
        ok = fallbackCopy(referralLink)
      }
    } else {
      ok = fallbackCopy(referralLink)
    }
    if (ok) {
      flashCopiedLabel()
      if (showToast) flashToast()
    }
  }

  const shareLink = async () => {
    const shareData = { title: 'Bellajour', text: SHARE_TEXT, url: referralLink }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    await copyLink(true)
  }

  useEffect(() => {
    if (didAutoTriggerRef.current) return
    didAutoTriggerRef.current = true
    if (autoShareOnMount) {
      void shareLink()
    } else if (autoCopyOnMount) {
      void copyLink(true)
    }
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
