'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import InviterReferral from './InviterReferral'
import { isValidRefCode } from '@/lib/validation'
import './inviter.css'

function InviterClient() {
  const searchParams = useSearchParams()
  const rawRef = searchParams.get('ref')?.trim() ?? ''
  const action = searchParams.get('action')?.trim() ?? ''
  const refCode = isValidRefCode(rawRef) ? rawRef : null

  const [prenomParrain, setPrenomParrain] = useState<string | null>(null)
  const [referrerLoaded, setReferrerLoaded] = useState(false)

  useEffect(() => {
    if (!refCode) return
    let cancelled = false
    fetch(`/api/referrer?code=${encodeURIComponent(refCode)}`)
      .then(r => r.json())
      .then((d: { prenom?: string | null }) => {
        if (cancelled) return
        setPrenomParrain(typeof d?.prenom === 'string' && d.prenom.length > 0 ? d.prenom : null)
        setReferrerLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setReferrerLoaded(true)
      })
    return () => { cancelled = true }
  }, [refCode])

  if (!refCode) {
    return (
      <main className="inviter inviter--error" data-theme="light">
        <img src="/images/ui/logo.webp" alt="Bellajour" className="inviter-logo" />
        <h1 className="inviter-title">Lien de parrainage invalide.</h1>
        <p className="inviter-sub">Le lien que vous avez suivi est incomplet ou ne correspond à aucun code Bellajour.</p>
        <Link href="/" className="inviter-back-btn">Retour à l&rsquo;accueil</Link>
      </main>
    )
  }

  const subtitle = prenomParrain
    ? `${prenomParrain}, partagez votre code avec vos proches.`
    : 'Partagez votre code avec vos proches.'

  return (
    <main className="inviter" data-theme="light">
      <img src="/images/ui/logo.webp" alt="Bellajour" className="inviter-logo" />
      <h1 className="inviter-title">Votre lien de parrainage</h1>
      <p className="inviter-sub">{subtitle}</p>

      {referrerLoaded && (
        <InviterReferral
          refCode={refCode}
          autoCopyOnMount={action !== 'share'}
          autoShareOnMount={action === 'share'}
        />
      )}
    </main>
  )
}

export default function InviterPage() {
  return (
    <Suspense fallback={null}>
      <InviterClient />
    </Suspense>
  )
}
