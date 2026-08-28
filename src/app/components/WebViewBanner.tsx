'use client'

import { useState } from 'react'
import './webviewbanner.css'
import { useAndroid, useValeurClient } from '@/hooks/useClient'

/* Détecteur WebView Instagram / Facebook.
   Dans le navigateur intégré des apps Meta, l'autofill CB et Apple Pay ne
   fonctionnent pas → checkout Stripe dégradé. On invite le visiteur à ouvrir
   la page dans son vrai navigateur :
   - Android → redirection forcée vers Chrome via URL intent:// (fallback natif
     vers le lien https si Chrome est absent).
   - iOS → Apple interdit toute redirection sortante depuis le WebView : le
     bouton affiche l'instruction manuelle (menu ⋯ → « Ouvrir dans Safari »).
   Monté une seule fois dans le layout racine ; rend null partout hors WebView.
   La détection est un instantané CLIENT (useValeurClient) : le serveur rend
   null, le navigateur tranche au premier rendu. Zéro rendu SSR, zéro flash,
   et zéro effet — c'est une lecture, pas une synchronisation. */

const DISMISS_KEY = 'bj-webview-dismissed'

export default function WebViewBanner() {
  /* Instagram signe son WebView avec "Instagram", Facebook/Messenger avec
     FBAN / FBAV / FB_IAB. Double verrou mobile : ces WebViews n'existent que
     sur iOS/Android, tout UA desktop est exclu d'office. */
  const dansWebViewMeta = useValeurClient(() => {
    const ua = navigator.userAgent
    return /Instagram|FBAN|FBAV|FB_IAB/i.test(ua) && /Android|iPhone|iPad|iPod/i.test(ua)
  }, false)

  const isAndroid = useAndroid()

  /* Renvoyé lors d'une visite précédente de la même session. */
  const dejaRenvoye = useValeurClient(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) !== null
    } catch {
      /* sessionStorage indisponible dans certains WebViews → on affiche */
      return false
    }
  }, false)

  /* Renvoyé À L'INSTANT, par le bouton. Distinct du précédent, et pas
     redondant : c'est lui qui fait disparaître le bandeau quand l'écriture
     dans sessionStorage échoue — le cas même que le catch ci-dessus couvre. */
  const [ferme, setFerme] = useState(false)
  const [showIosHelp, setShowIosHelp] = useState(false)

  const dismiss = () => {
    setFerme(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* best-effort : sans storage, le bandeau reviendra au prochain chargement */
    }
  }

  if (!dansWebViewMeta || dejaRenvoye || ferme) return null

  const openInBrowser = () => {
    if (isAndroid) {
      const { host, pathname, search, href } = window.location
      window.location.href =
        'intent://' +
        host +
        pathname +
        search +
        '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
        encodeURIComponent(href) +
        ';end'
    } else {
      setShowIosHelp(true)
    }
  }

  return (
    <div className="wvb" role="region" aria-label="Ouvrir dans le navigateur">
      <div className="wvb-body">
        {showIosHelp ? (
          <p className="wvb-text wvb-text--help">
            Appuyez sur <span className="wvb-glyph">⋯</span> en haut à droite,
            puis «&nbsp;Ouvrir dans Safari&nbsp;».
          </p>
        ) : (
          <>
            <p className="wvb-text">
              Pour réserver votre album dans les meilleures conditions, ouvrez
              cette page dans votre navigateur.
            </p>
            <button type="button" className="wvb-cta" onClick={openInBrowser}>
              Ouvrir dans le navigateur
            </button>
          </>
        )}
      </div>
      <button type="button" className="wvb-close" onClick={dismiss} aria-label="Fermer">
        ×
      </button>
    </div>
  )
}
