'use client'

/**
 * Le pont entre le moteur (mutable, hors React) et l'écran (immuable).
 *
 * Une seule boucle requestAnimationFrame pour tout l'écran : elle republie
 * l'instantané, elle fait avancer le compteur, elle nourrit la jauge. Un
 * envoi émet un événement de progression toutes les quelques dizaines de
 * millisecondes ; multiplié par cinq voies et cent tuiles, en re-rendre à
 * chaque événement mettrait l'interface à genoux sur un iPhone. Ici, quoi
 * qu'il arrive, c'est un rendu par frame au maximum — et zéro quand rien
 * ne bouge : la boucle s'arrête d'elle-même et le moteur la réveille.
 *
 * PRD §15 : le compteur s'incrémente en requestAnimationFrame.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { moteurPour, type Refus, type Vue } from './moteur'

const VUE_VIDE: Vue = {
  photos: [], confirmees: 0, enVol: 0, erreurs: 0,
  octetsEnvoyes: 0, octetsTotal: 0, stockageDegrade: false,
  reductionDegradee: false, clos: false, finalise: false, attendues: 0,
  bandeau: null, serveur: null,
}

export function useDepot(token: string | null) {
  const [vue, setVue] = useState<Vue>(VUE_VIDE)
  /* Le compteur AFFICHÉ, qui court après le compteur réel. */
  const [compteur, setCompteur] = useState(0)

  const reveil = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!token) return

    const moteur = moteurPour(token)
    let vivant = true
    let frame = 0
    let revision = -1
    /* Le compteur repart TOUJOURS de zéro et court après le réel — y compris
       au remontage sur un moteur déjà chargé. C'est voulu : la remontée est
       la seule chose qui donne à voir ce qui a déjà été déposé. */
    let affiche = 0
    let cible = 0
    let enVol = 0

    const reduit =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const boucle = () => {
      if (!vivant) return

      if (moteur.revision !== revision) {
        revision = moteur.revision
        const v = moteur.instantane()
        cible = v.confirmees
        enVol = v.enVol
        setVue(v)
      }

      if (affiche !== cible) {
        if (reduit) {
          affiche = cible
        } else {
          /* Un pas proportionnel : le compteur bondit quand vingt photos
             arrivent d'un coup, et égrène quand elles arrivent une à une.
             Jamais d'attente artificielle — il rattrape toujours le réel. */
          const ecart = cible - affiche
          affiche += ecart > 0 ? Math.max(1, Math.ceil(ecart / 8)) : ecart
        }
        setCompteur(affiche)
      }

      /* Rien en vol et compteur à jour : on rend la main au navigateur.
         Le moteur rallumera la boucle au prochain changement. */
      if (enVol === 0 && affiche === cible) { frame = 0; return }

      frame = requestAnimationFrame(boucle)
    }

    const relancer = () => {
      if (!vivant || frame) return
      frame = requestAnimationFrame(boucle)
    }
    reveil.current = relancer

    const desabonner = moteur.abonner(relancer)
    void moteur.reprendre()
    relancer()

    /* Piège nº23 : iOS ignore cet avertissement. On le pose pour les autres,
       et l'écran ne promet jamais que la sauvegarde a eu lieu. */
    const avantFermeture = (e: BeforeUnloadEvent) => {
      if (enVol === 0) return
      e.preventDefault()
      /* Toujours exigé par Chrome, malgré sa dépréciation dans la spec.
         Il manquait ici : sur l'écran 6, ce garde-fou est désormais le SEUL
         (celui de Screen5Depot est parti avec son composant), et c'est
         précisément le moment où des transferts continuent en tâche de fond. */
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avantFermeture)

    return () => {
      vivant = false
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('beforeunload', avantFermeture)
      desabonner()
      reveil.current = null
      /* Le moteur SURVIT au démontage : « ← Retour » ne doit pas tuer un
         envoi de 80 photos. Seule la boucle d'affichage s'arrête. */
    }
  }, [token])

  const ajouter = useCallback((fichiers: File[]): Refus[] => {
    if (!token) return []
    const refus = moteurPour(token).ajouter(fichiers)
    reveil.current?.()
    return refus
  }, [token])

  const supprimer = useCallback((id: string) => {
    if (!token) return
    void moteurPour(token).supprimer(id)
    reveil.current?.()
  }, [token])

  const reprendrePhoto = useCallback((id: string) => {
    if (!token) return
    moteurPour(token).reprendrePhoto(id)
    reveil.current?.()
  }, [token])

  const finaliser = useCallback(() => {
    if (!token) return Promise.resolve({ ok: false, message: 'Dossier introuvable.' })
    return moteurPour(token).finaliser()
  }, [token])

  return { vue, compteur, ajouter, supprimer, reprendrePhoto, finaliser }
}
