/* L'habit de /offrir/merci (charte V2, 26/11) : le logo, le titre, LA carte
   (Carte.tsx, la même que /offrir), ce qui va se passer, deux gestes, et « Et
   pour vous ? ». Présentation seule : page.tsx lit Stripe et enregistre la carte,
   rien de cela ne passe par ici. Textes inchangés. */

import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'

type Props = {
  couverture: string | null
  /* Le paiement n'est pas encore confirmé : pas de carte, juste l'attente. */
  attente?: boolean
  titre?: string
  quoi?: string
  essai?: boolean
  imprimerLabel?: string
  lienCarte?: string
  pourVous?: ReactNode
  children?: ReactNode
}

export default function VueMerci({ couverture, attente, titre, quoi, essai, imprimerLabel, lienCarte, pourVous, children }: Props) {
  const style = couverture ? ({ '--carte-visuel': `url(${couverture})` } as CSSProperties) : undefined
  return (
    <main className="m-banc m-retour" style={style}>
      <Link className="rt-logo" href="/" aria-label="Bellajour, accueil"><span className="m-logo" /></Link>
      {attente ? (
        <div className="rt-corps">
          <h1 className="titre rt-titre">Paiement en cours.</h1>
          <p className="rt-note">Rechargez cette page dans un instant. Votre carte arrive aussi par e-mail.</p>
        </div>
      ) : (
        <div className="rt-corps">
          <h1 className="titre rt-titre">{titre}</h1>
          <div className="rt-carte">{children}</div>
          <p className="rt-quoi">{quoi}</p>
          {essai && <p className="rt-note">Paiement de test : cette carte ne vaut rien en vrai.</p>}
          <div className="rt-actions">
            <a className="m-btn" href={lienCarte}>{imprimerLabel}</a>
          </div>
          {/* L'upsell après la carte (16/11) : l'acheteur a un Noël en tête, le sien est
              le magazine qu'il n'a pas encore commandé. Un achat à part : la carte ne
              paie pas sa propre commande. */}
          <aside className="rt-pour-vous">
            <p className="rt-pour-vous-titre">Et pour vous&nbsp;?</p>
            <p className="rt-note">{pourVous}</p>
            <a className="m-second" href="/composer?nouveau=1">Composer mon magazine</a>
          </aside>
        </div>
      )}
    </main>
  )
}
