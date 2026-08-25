/* Écran 6 — « {{titre}} est entre nos mains. »

   ══════════════════════════════════════════════════════════════════════════
   DEUX CORRECTIONS DU 26/08

   1. LA CASE N'ARRIVAIT NULLE PART. `consentCommunication` n'existait que dans
      le brouillon localStorage : aucune requête ne le portait jamais au
      serveur, et `numeros.consent_communication` restait false quoi qu'on
      coche. La case ne faisait donc rien du tout. Elle écrit désormais en
      base, par le même PATCH que les cases de l'état 2, et revient à sa
      position précédente si l'enregistrement échoue — une case cochée à
      l'écran mais absente en base est le pire des deux mondes.

   2. ELLE AVAIT L'AIR OBLIGATOIRE. Recette du 25/08 : « en quoi consiste
      cette case ? puisque la demande est déjà arrivée ». Sur un écran qui
      ressemble à une validation, une case seule se lit comme une condition à
      remplir. Elle est FACULTATIVE et sans le moindre effet sur la commande
      (PRD §14). Elle est donc désormais annoncée comme telle, en toutes
      lettres, et séparée de ce qui précède — et le libellé dit ce qu'on
      demande vraiment, pas seulement qu'on demande quelque chose.
   ══════════════════════════════════════════════════════════════════════════ */

import { useCallback, useState } from 'react'
import { TITRE_PLACEHOLDER } from '../coverModels'

export default function Screen6Fin({
  titre, token, consentCommunication, onConsent,
}: {
  titre: string
  /** Le dossier existe depuis l'écran 4 : sans token, on n'écrit rien. */
  token: string | null
  consentCommunication: boolean
  onConsent: (v: boolean) => void
}) {
  const nom = titre.trim() || TITRE_PLACEHOLDER
  const [erreur, setErreur] = useState<string | null>(null)

  const basculer = useCallback(
    async (valeur: boolean) => {
      onConsent(valeur)
      setErreur(null)
      if (!token) return
      try {
        const r = await fetch('/api/atelier/numero', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, consent_communication: valeur }),
        })
        if (!r.ok) throw new Error('patch')
      } catch {
        onConsent(!valeur)
        setErreur('Votre choix n’a pas pu être enregistré. Réessayez, ou dites-le-nous par mail.')
      }
    },
    [token, onConsent],
  )

  return (
    <>
      <div className="at-done" aria-hidden="true">✓</div>
      <p className="at-kicker">C’est fait</p>
      <h2>{nom}<br />est entre nos mains.</h2>
      <p className="at-lede at-q-lede">
        Votre couverture arrive sous 48 h par mail. Vous ne payez qu’après
        l’avoir vue — et seulement si elle vous plaît.
      </p>

      {/* Elle est ici, maintenant, et c'est le meilleur moment pour lui dire
          de garder son lien : il n'y a ni compte ni mot de passe, ce lien EST
          son espace client, et le mail qui le porte peut tomber en
          Promotions. */}
      <p className="at-q-note">
        <b>Gardez le lien ci-dessous.</b> C’est le seul, il suit votre numéro jusqu’à la
        livraison. Mettez-le en favori, ou gardez le mail qu’on vient de vous envoyer.
      </p>

      {/* ── FACULTATIF ───────────────────────────────────────────────
          Séparé, annoncé, et sans conséquence. Dans cet ordre : on dit
          d'abord que ça n'engage à rien, on demande ensuite. */}
      <div className="at-facultatif">
        <p className="at-facultatif-titre">Facultatif</p>
        <p className="at-facultatif-note">
          Cochée ou non, cela ne change rien à votre numéro, ni à son prix, ni à son délai.
        </p>
        <label className="at-check">
          <input
            type="checkbox"
            checked={consentCommunication}
            onChange={(e) => basculer(e.target.checked)}
          />
          <span>
            J’accepte que Bellajour montre un extrait de mon numéro — une couverture, une
            page — pour donner envie à d’autres.
          </span>
        </label>
        <p className="at-facultatif-note">
          Vous pouvez changer d’avis quand vous voulez : répondez à l’un de nos mails.
        </p>
        {erreur && <p className="at-erreur">{erreur}</p>}
      </div>
    </>
  )
}
