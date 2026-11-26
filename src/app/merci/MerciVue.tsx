/* L'habit de /merci : le texte de chaque état, présentation seule. page.tsx lit
   Stripe et la base (inchangé) et lui passe l'état. Textes inchangés. */

import Link from 'next/link'
import MerciReferral from './MerciReferral'
import MerciBackLink from './MerciBackLink'
import MerciPendingRefresh from './MerciPendingRefresh'

export type EtatMerci =
  | { kind: 'invalid' }
  | { kind: 'pending' }
  | { kind: 'confirmed'; refCode: string; prenom: string | null; numeroFondateur: number | null }

export default function MerciVue({ state, attempt }: { state: EtatMerci; attempt: number }) {
  return (
    <section className="merci">
      <div className="merci-inner">
        {state.kind === 'confirmed' && (
          <>
            <p className="merci-eyebrow">Paiement confirmé</p>
            <h1 className="merci-title">
              {state.prenom ? `Merci, ${state.prenom}.` : 'Merci.'}
            </h1>
            {state.numeroFondateur != null && (
              <p className="merci-founder">
                Vous êtes le Fondateur n°{state.numeroFondateur}.
              </p>
            )}
            <p className="merci-lede">
              Votre pré-commande est enregistrée. Vous allez recevoir votre e-mail de confirmation
              dans quelques instants.
            </p>
            <MerciReferral refCode={state.refCode} />
            <MerciBackLink />
          </>
        )}

        {state.kind === 'pending' && (
          <>
            <p className="merci-eyebrow">Paiement reçu</p>
            <h1 className="merci-title">Un instant…</h1>
            <p className="merci-lede">Nous finalisons la confirmation de votre pré-commande.</p>
            <MerciPendingRefresh attempt={attempt} />
          </>
        )}

        {state.kind === 'invalid' && (
          <>
            <h1 className="merci-title">Merci pour votre confiance.</h1>
            <p className="merci-lede">
              Nous n&rsquo;avons pas pu afficher le détail de votre pré-commande ici. Si vous venez
              de régler votre acompte, votre e-mail de confirmation vous parviendra sous peu.
            </p>
            <Link className="m-btn merci-back" href="/">
              Retour à Bellajour
            </Link>
          </>
        )}
      </div>
    </section>
  )
}
