'use client'

import { useEffect, useState } from 'react'
import './webviewbanner.css'

/* Détecteur WebView Instagram / Facebook.
   Dans le navigateur intégré des apps Meta, l'autofill CB et Apple Pay ne
   fonctionnent pas → checkout Stripe dégradé. On invite le visiteur à ouvrir
   la page dans son vrai navigateur :
   - Android → redirection forcée vers Chrome via URL intent:// (fallback natif
     vers le lien https si Chrome est absent).
   - iOS → Apple interdit toute redirection sortante depuis le WebView : le
     bouton affiche l'instruction manuelle (menu ⋯ → « Ouvrir dans Safari »).
   Monté une seule fois dans le layout racine ; rend null partout hors WebView
   (détection dans useEffect → zéro rendu SSR, zéro flash). */

const DISMISS_KEY = 'bj-webview-dismissed'

export default function WebViewBanner() {
  const [shown, setShown] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    /* Instagram signe son WebView avec "Instagram", Facebook/Messenger avec
       FBAN / FBAV / FB_IAB. Double verrou mobile : ces WebViews n'existent que
       sur iOS/Android, tout UA desktop est exclu d'office. */
    const isMetaWebView = /Instagram|FBAN|FBAV|FB_IAB/i.test(ua)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)
    if (!isMetaWebView || !isMobile) return
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return
    } catch {
      /* sessionStorage peut être indisponible dans certains WebViews → on affiche */
    }
    setIsAndroid(/Android/i.test(ua))
    setShown(true)
  }, [])

  if (!shown) return null

  const dismiss = () => {
    setShown(false)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* best-effort : sans storage, le bandeau reviendra au prochain chargement */
    }
  }

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
