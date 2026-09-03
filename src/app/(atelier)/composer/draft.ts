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
  /* Les deux mots de couverture FACULTATIFS de l'écran 3 (03/09/2026).
     Vides par défaut : un brouillon antérieur fusionne sans casse. */
  sousTitre: string
  motQuatrieme: string
  prenom: string
  email: string
  telephone: string
  /* Posé au retour de /api/atelier/numero (fin d'écran 4). Sa présence
     signifie « le dossier existe en base » : on ne le recrée jamais. */
  token: string | null
  consentPhotos: boolean
  consentCommunication: boolean
  /* Posé à l'arrivée sur l'écran 6, quand le dépôt est réellement envoyé.
     Un brouillon terminé n'est plus un brouillon : voir loadDraft. */
  termine: boolean
}

export const EMPTY_DRAFT: Draft = {
  screen: 1,
  occasion: '',
  histoire: '',
  titre: '',
  sousTitre: '',
  motQuatrieme: '',
  prenom: '',
  email: '',
  telephone: '',
  token: null,
  consentPhotos: false,
  consentCommunication: false,
  termine: false,
}

export function loadDraft(): Draft {
  if (typeof window === 'undefined') return EMPTY_DRAFT
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return EMPTY_DRAFT
    const parsed = JSON.parse(raw) as Partial<Draft>

    /* ── UN BROUILLON TERMINÉ N'EST PLUS UN BROUILLON ──────────────────
       Le dépôt est parti : son dossier vit désormais sur /numero/<token>,
       et c'est là que son mail l'envoie. Revenir sur le questionnaire ne
       peut donc vouloir dire qu'une chose : composer un AUTRE numéro.

       Sans cette ligne, le token du premier numéro survivait indéfiniment
       dans le navigateur, et `creerNumero` refusait d'en créer un second —
       une cliente ne pouvait composer qu'UN SEUL numéro par appareil, à
       vie. Sur un produit dont le modèle est « un numéro par moment » et
       dont le dernier mail dit « composer un nouveau numéro », c'était la
       boucle de retour toute entière qui était coupée.

       Reprendre un dépôt INACHEVÉ reste possible : son brouillon n'est pas
       terminé, et sa page d'état propose de toute façon `?reprendre=`. */
    if (parsed.termine) return EMPTY_DRAFT

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

/**
 * Une composition est-elle en cours sur CET appareil ?
 *
 * Sert au CTA de la page produit : « Composer avec l'atelier » devient
 * « Continuer la composition » quand un brouillon vivant existe. Un brouillon
 * terminé rend déjà EMPTY_DRAFT (loadDraft), donc il ne compte pas.
 * Le seuil est volontairement bas : avoir avancé d'un écran ou écrit un mot
 * suffit — c'est exactement ce que « continuer » promet de retrouver.
 */
export function draftEnCours(): boolean {
  const d = loadDraft()
  return Boolean(
    d.token ||
    d.screen > 1 ||
    d.occasion.trim() ||
    d.histoire.trim() ||
    d.titre.trim(),
  )
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* sans effet */
  }
}
