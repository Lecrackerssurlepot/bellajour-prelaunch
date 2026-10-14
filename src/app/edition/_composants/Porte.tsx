/* L'écran d'une porte de l'Édition collective : la migration qui manque, ou
   l'espace qui n'est pas encore ouvert (phase 0). Composant serveur, aucune
   interaction. Partagé par /edition et /depot (le dossier `_composants` est
   privé : Next n'en fait pas une route). */

import './porte.css'

type Props = {
  surtitre: string
  titre: string
  children: React.ReactNode
  /** Une ligne technique en petit, sous le texte. */
  detail?: string
}

export default function Porte({ surtitre, titre, children, detail }: Props) {
  return (
    <main className="ec-porte">
      <div className="ec-porte-in">
        <img
          className="ec-porte-signature"
          src="/images/v2/ui/signature-bellajour-240.webp"
          alt="Bellajour"
          width={240}
          height={92}
          decoding="async"
        />
        <p className="ec-porte-surtitre">{surtitre}</p>
        <h1 className="ec-porte-titre">{titre}</h1>
        <div className="ec-porte-texte">{children}</div>
        {detail ? <p className="ec-porte-detail">{detail}</p> : null}
      </div>
    </main>
  )
}
