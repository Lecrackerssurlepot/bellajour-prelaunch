'use client'

/**
 * Terminer un dépôt resté en plan — depuis SA page, pas depuis le composeur.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * L'INCIDENT DU 25/08
 *
 * Une cliente monte cinquante-cinq photos, puis ferme l'onglet avant le
 * dernier bouton. Côté serveur, tout est là : les cinquante-cinq fichiers
 * sont dans le coffre, vérifiés, comptés. Il ne manque QUE `consent_photos`,
 * le droit d'usage, que seul ce clic pose.
 *
 * Sans ce bouton, la seule issue serait de la renvoyer dans le composeur, où
 * la grille se reconstruit depuis la copie LOCALE de son navigateur. Sur un
 * autre appareil, après un nettoyage de navigateur, ou simplement trois
 * semaines plus tard, cette copie n'existe plus : elle verrait une grille
 * vide et croirait ses photos perdues. Alors qu'elles sont là.
 *
 * Son lien permanent, lui, marche partout et pour toujours (PRD §7.5). C'est
 * donc de sa page que le dépôt se termine, en une requête qui ne dépend de
 * rien de local.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Le PATCH est idempotent et journalisé, et c'est lui qui déclenche M1 — le
 * même chemin exactement que le bouton du composeur. Aucune règle nouvelle,
 * aucune seconde vérité : juste une autre porte vers la même serrure.
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BoutonEnvoyer({ token, nbPhotos }: { token: string; nbPhotos: number }) {
  const router = useRouter()
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const envoyer = useCallback(async () => {
    setOccupe(true)
    setErreur(null)
    try {
      const r = await fetch('/api/atelier/numero', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, consent_photos: true }),
      })
      if (!r.ok) throw new Error('consent')
      /* L'état vient de changer côté serveur : on redemande la page plutôt
         que de peindre localement un état qu'on n'a pas vérifié. */
      router.refresh()
    } catch {
      setErreur('L’envoi n’est pas passé. Réessayez, ou répondez au mail.')
      setOccupe(false)
    }
  }, [token, router])

  return (
    <>
      <div className="nu-actions">
        <button type="button" className="at-cta" onClick={envoyer} disabled={occupe}>
          {occupe ? 'Un instant…' : `Envoyer mes ${nbPhotos} photos`}
          <span className="at-cta-arrow">→</span>
        </button>
      </div>

      {erreur && <p className="nu-erreur" role="alert">{erreur}</p>}

      <p className="nu-note">
        En envoyant, vous nous autorisez à utiliser ces photos pour composer votre numéro, et
        rien d’autre. Elles ne sont ni publiées ni montrées à qui que ce soit.
      </p>
    </>
  )
}
