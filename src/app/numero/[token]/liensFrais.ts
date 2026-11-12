'use client'

/**
 * Des visuels qui ne disparaissent pas quand leur lien expire (12/11/2026).
 *
 * Les couvertures et doubles pages sont servies par des liens R2 SIGNÉS,
 * valables une heure (`APERCU_TTL_SECONDS`, lib/atelier/r2.ts) : le coffre
 * reste privé. Mais une page ouverte n'est pas rechargée. Le client ouvre le
 * lien du mail, quitte Safari, revient deux heures plus tard : le téléphone
 * rend la page gardée en mémoire, et chaque image qui n'était pas encore
 * chargée (les doubles pages, en `loading="lazy"`, la loupe) demande un lien
 * mort. R2 répond 403 `ExpiredRequest`, l'image reste vide, sans un mot.
 * Héloïse (« La Geffroy family en Martinique ») a vu une page sans visuels.
 *
 * Le remède ne touche ni au coffre ni à la durée des liens : on redemande la
 * page au serveur (`router.refresh()`), qui signe des liens neufs, sans
 * recharger le document ni perdre le choix de couverture en cours.
 *   — au RETOUR sur l'onglet, quand les liens ont plus de `AGE_MAX_MS` ;
 *   — à la première image qui échoue, au cas où le retour n'aurait pas été vu.
 * Borné à `ESSAIS_MAX` rafraîchissements après erreur : un fichier vraiment
 * absent du coffre ne doit pas faire tourner la page en boucle.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/** Avant l'heure de validité, pour ne jamais demander un lien à la limite. */
const AGE_MAX_MS = 50 * 60 * 1000
const ESSAIS_MAX = 3
const ECART_MIN_MS = 5000

export function useLiensFrais(): () => void {
  const router = useRouter()
  const signesLe = useRef(0)
  const essais = useRef(0)
  const dernier = useRef(0)

  useEffect(() => {
    signesLe.current = Date.now()
    const auRetour = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - signesLe.current < AGE_MAX_MS) return
      signesLe.current = Date.now()
      router.refresh()
    }
    const pageRendue = (e: PageTransitionEvent) => {
      if (e.persisted) auRetour()
    }
    document.addEventListener('visibilitychange', auRetour)
    window.addEventListener('pageshow', pageRendue)
    return () => {
      document.removeEventListener('visibilitychange', auRetour)
      window.removeEventListener('pageshow', pageRendue)
    }
  }, [router])

  return useCallback(() => {
    const maintenant = Date.now()
    if (essais.current >= ESSAIS_MAX) return
    if (maintenant - dernier.current < ECART_MIN_MS) return
    essais.current += 1
    dernier.current = maintenant
    signesLe.current = maintenant
    router.refresh()
  }, [router])
}
