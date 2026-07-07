/* Accès storage sûrs pour /atelier : try/catch systématique (Safari privé,
   WebView Meta où le storage peut être indisponible) + guard SSR.
   Même pattern que sessionStorage 'bellajour_referral' sur la landing. */

export function safeSessionGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function safeSessionSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* no-op — le parcours fonctionne sans persistance */
  }
}

/* Lecture/écriture JSON sûres en localStorage (verrou de coût — survit à
   la fermeture de l'onglet, contrairement à sessionStorage). */
export function safeLocalGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function safeLocalSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* no-op — le garde-fou dégrade vers la mémoire de page */
  }
}

/* Ajoute une entrée à une liste JSON en localStorage (saveInteraction). */
export function safeLocalAppend(key: string, entry: unknown): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(key)
    const list: unknown[] = raw ? JSON.parse(raw) : []
    list.push(entry)
    window.localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* no-op */
  }
}
