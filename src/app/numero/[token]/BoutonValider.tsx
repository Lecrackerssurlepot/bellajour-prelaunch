'use client'

/**
 * L'état 4 — la maquette complète et la validation (PRD §11).
 *
 * Le lien Canva est partagé EN COMMENTAIRE, jamais en édition : en édition,
 * la cliente casse les fonds perdus, écrase une police ou colle une image en
 * 72 dpi, et cela se découvre à la livraison. Le partage se règle dans Canva,
 * pas ici — ce composant ne fait qu'ouvrir l'URL que l'atelier a collée.
 *
 * « Je valide » est la SEULE transition d'état déclenchée par la cliente de
 * toute la machine. Elle est irréversible depuis cette page, et le serveur la
 * refuse depuis n'importe quel autre état.
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BoutonValider({
  token, pdfUrl, canvaUrl, dateAuto, retouchesLe,
}: {
  token: string
  pdfUrl: string | null
  canvaUrl: string | null
  dateAuto: string
  /** T2-13 — posée si elle a déjà cliqué « j'ai noté des retouches ». */
  retouchesLe: string | null
}) {
  const router = useRouter()
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  /* Peinture optimiste du troisième geste : le serveur est idempotent, et
     un rechargement relira la vérité en base. */
  const [retouchesDites, setRetouchesDites] = useState(Boolean(retouchesLe))

  const valider = useCallback(async () => {
    setOccupe(true)
    setErreur(null)
    try {
      const r = await fetch('/api/atelier/valider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!r.ok) throw new Error('valider')
      /* L'état vient de changer côté serveur : on redemande la page plutôt
         que de peindre localement un état qu'on n'a pas vérifié. */
      router.refresh()
    } catch {
      setErreur('La validation n’est pas passée. Réessayez, ou répondez au mail.')
      setOccupe(false)
    }
  }, [token, router])

  /* T2-13 — le troisième geste de l'état 4. Sans lui, l'atelier ne SAIT PAS
     qu'elle a commenté dans le Canva, et l'auto-validation à J+7 imprimerait
     d'office par-dessus ses demandes de correction. */
  const signalerRetouches = useCallback(async () => {
    setOccupe(true)
    setErreur(null)
    try {
      const r = await fetch('/api/atelier/numero', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, retouches_demandees: true }),
      })
      if (!r.ok) throw new Error('retouches')
      setRetouchesDites(true)
      router.refresh()
    } catch {
      setErreur('Votre demande n’est pas passée. Réessayez, ou répondez au mail.')
    } finally {
      setOccupe(false)
    }
  }, [token, router])

  return (
    <>
      {pdfUrl && (
        /* Le PDF est feuilleté par le lecteur natif du navigateur : aucune
           librairie, aucun poids ajouté sur un téléphone en 4G. */
        <iframe className="nu-pdf" src={pdfUrl} title="Votre numéro, en entier" />
      )}

      <div className="nu-liens">
        {pdfUrl && (
          <a className="nu-lien" href={pdfUrl} target="_blank" rel="noopener noreferrer">
            Ouvrir le PDF en grand
          </a>
        )}
        {canvaUrl && (
          <a className="nu-lien" href={canvaUrl} target="_blank" rel="noopener noreferrer">
            Ouvrir le Canva pour commenter
          </a>
        )}
      </div>

      <div className="nu-actions">
        <button type="button" className="at-cta" onClick={valider} disabled={occupe}>
          {occupe ? 'Un instant…' : 'Tout est bon, imprimez'}
          <span className="at-cta-arrow">→</span>
        </button>
        {!retouchesDites && (
          <button type="button" className="nu-lien nu-retouches" onClick={signalerRetouches} disabled={occupe}>
            J’ai noté des retouches dans le Canva
          </button>
        )}
      </div>

      {erreur && <p className="nu-erreur">{erreur}</p>}

      {retouchesDites ? (
        <p className="nu-note">
          <b>C’est noté, l’atelier repasse dessus.</b> Rien ne partira à
          l’impression tant que la maquette corrigée ne vous a pas été
          représentée.
        </p>
      ) : (
        <p className="nu-note">
          Un détail à changer ? Écrivez-le dans le Canva, puis dites-le nous
          avec le bouton ci-dessus : on repasse dessus.
          {dateAuto && <> Sans réponse d’ici le {dateAuto}, nous lançons l’impression telle quelle.</>}
        </p>
      )}
    </>
  )
}
