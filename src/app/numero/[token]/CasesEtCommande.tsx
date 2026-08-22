'use client'

/**
 * Les deux cases et le bouton de commande — état 2 (PRD §8, invariant nº3).
 *
 * « Aucun paiement possible sans les deux cases cochées et horodatées. »
 * Elles sont donc écrites EN BASE au clic, pas seulement dans le composant :
 * une case qui ne vit que dans le navigateur ne prouve rien le jour où une
 * cliente conteste la fabrication d'un bien personnalisé. La seconde case
 * repose sur l'article L221-28 3° du code de la consommation — sans
 * reconnaissance explicite AVANT paiement, elle conserve 14 jours de
 * rétractation sur un objet qui ne peut être revendu à personne.
 *
 * Si l'enregistrement échoue, la case revient à sa position précédente. Une
 * case cochée à l'écran mais absente en base est le pire des deux mondes :
 * le paiement serait refusé plus loin sans que personne ne comprenne pourquoi.
 *
 * Le montant affiché ici DESCEND DU SERVEUR, calculé depuis le nombre de pages
 * (invariant nº2). Il n'est jamais renvoyé au serveur : /api/atelier/checkout
 * ne reçoit que le token et rechoisit le prix lui-même.
 */

import { useCallback, useState } from 'react'
import { formaterEuros } from '@/lib/atelier/prix'

type Props = {
  token: string
  titre: string
  nbPages: number | null
  euros: number | null
  cgvOk: boolean
  renonciation: boolean
}

export default function CasesEtCommande({
  token, titre, nbPages, euros, cgvOk, renonciation,
}: Props) {
  const [cgv, setCgv] = useState(cgvOk)
  const [reno, setReno] = useState(renonciation)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  const enregistrer = useCallback(
    async (champ: 'cgv_ok' | 'renonciation_retractation', valeur: boolean) => {
      const poser = champ === 'cgv_ok' ? setCgv : setReno
      poser(valeur)
      setErreur(null)
      try {
        const r = await fetch('/api/atelier/numero', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, [champ]: valeur }),
        })
        if (!r.ok) throw new Error('patch')
      } catch {
        poser(!valeur)
        setErreur('Votre accord n’a pas pu être enregistré. Réessayez dans un instant.')
      }
    },
    [token]
  )

  const commander = useCallback(async () => {
    setOccupe(true)
    setErreur(null)
    try {
      /* Le navigateur n'envoie que le token : ni prix, ni palier, ni pages.
         Le serveur relit la ligne, revérifie les deux cases et choisit le
         price_id lui-même. */
      const r = await fetch('/api/atelier/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = (await r.json().catch(() => ({}))) as { url?: string }
      if (!r.ok || !data.url) throw new Error('checkout')
      window.location.href = data.url
    } catch {
      setErreur(
        'Le paiement n’a pas pu démarrer. Répondez au mail de votre couverture, on s’en occupe.'
      )
      setOccupe(false)
    }
  }, [token])

  const prixConnu = euros !== null
  const pret = cgv && reno && prixConnu && !occupe

  return (
    <>
      <p className="nu-prix">
        {prixConnu && nbPages ? (
          <>
            Votre numéro fera {nbPages} pages — <b>{formaterEuros(euros)}</b>,
            impression et livraison comprises.
          </>
        ) : (
          <>Votre numéro est en cours de chiffrage.</>
        )}
      </p>
      <p className="nu-prix-sub">
        {prixConnu
          ? 'Chez vous sous 10 jours après validation.'
          : 'Le prix vous sera confirmé par mail, avant tout paiement.'}
      </p>

      <div className="nu-cases">
        <label className="nu-check">
          <input
            type="checkbox"
            checked={cgv}
            onChange={(e) => enregistrer('cgv_ok', e.target.checked)}
          />
          <span>
            J’accepte les{' '}
            <a className="nu-lien" href="/cgv" target="_blank" rel="noopener noreferrer">
              conditions générales de vente
            </a>
            .
          </span>
        </label>

        <label className="nu-check">
          <input
            type="checkbox"
            checked={reno}
            onChange={(e) => enregistrer('renonciation_retractation', e.target.checked)}
          />
          <span>
            J’accepte que la fabrication démarre immédiatement et renonce à mon droit
            de rétractation, ce numéro étant personnalisé.
          </span>
        </label>
      </div>

      <button type="button" className="nu-order" onClick={commander} disabled={!pret}>
        {occupe ? 'Un instant…' : `Commander ${titre}${prixConnu ? ` — ${formaterEuros(euros)}` : ''}`}
      </button>

      {erreur && <p className="nu-erreur">{erreur}</p>}

      <p className="nu-note">Un détail à changer ? Répondez au mail, on ajuste sans frais.</p>
    </>
  )
}
