'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Logique copier/partager du lien de parrainage.
 *
 * Extraite VERBATIM de ReferralCard (déjà testée) pour être partagée par
 * ReferralCard (waitlist) ET la page /merci (prévente). Source unique :
 * aucune réécriture, aucune duplication. Seul le style/texte diffère côté
 * composant consommateur.
 */

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

interface UseReferralShareOptions {
  autoCopyOnMount?: boolean
  autoShareOnMount?: boolean
}

export function useReferralShare(
  refCode: string,
  { autoCopyOnMount, autoShareOnMount }: UseReferralShareOptions = {}
) {
  const [copied, setCopied] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didAutoTriggerRef = useRef(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.bellajour.fr'
  const referralLink = `${origin}/preventes?ref=${refCode}`

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

  return { copied, toastVisible, copyLink, shareLink, referralLink }
}
