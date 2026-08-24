/**
 * Persistance du questionnaire — localStorage, écrite à CHAQUE écran.
 *
 * Test d'acceptation §17.6 : « Fermer l'onglet au milieu de l'écran 3, rouvrir :
 * tout est retrouvé. » C'est aussi la raison pour laquelle le questionnaire est
 * une vraie route et non une modale : une URL se rouvre, pas un overlay.
 *
 * Tout est enveloppé : un navigateur en navigation privée, un quota plein ou un
 * storage désactivé ne doit jamais casser le parcours — au pire on perd la reprise.
 */

const KEY = 'atelier_draft_v1'

export type Draft = {
  screen: number
  occasion: string
  histoire: string
  titre: string
  prenom: string
  email: string
  telephone: string
  /* Posé au retour de /api/atelier/numero (fin d'écran 4). Sa présence
     signifie « le dossier existe en base » : on ne le recrée jamais. */
  token: string | null
  consentPhotos: boolean
  consentCommunication: boolean
}

export const EMPTY_DRAFT: Draft = {
  screen: 1,
  occasion: '',
  histoire: '',
  titre: '',
  prenom: '',
  email: '',
  telephone: '',
  token: null,
  consentPhotos: false,
  consentCommunication: false,
}

export function loadDraft(): Draft {
  if (typeof window === 'undefined') return EMPTY_DRAFT
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return EMPTY_DRAFT
    const parsed = JSON.parse(raw) as Partial<Draft>
    /* Fusion sur EMPTY_DRAFT : un brouillon d'une version antérieure à qui
       il manque un champ ne fait pas planter l'écran, il repart à vide. */
    return { ...EMPTY_DRAFT, ...parsed }
  } catch {
    return EMPTY_DRAFT
  }
}

export function saveDraft(draft: Draft): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    /* Quota plein ou storage refusé : on continue sans reprise.
       L'écran ne promet jamais que la sauvegarde a eu lieu. */
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* sans effet */
  }
}
