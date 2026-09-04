import Link from 'next/link'
import FormulaireReinitialisation from './FormulaireReinitialisation'
import '../compte.css'

/**
 * /compte/reinitialiser — l'atterrissage du mail C2.
 * Le lien porte `?token_hash=` ; la page ne fait RIEN du token au rendu
 * (pas de session ouverte par un simple clic — invariant nº4) : c'est le
 * bouton « Enregistrer » qui le dépense, en une fois.
 */

export const dynamic = 'force-dynamic'

export default async function ReinitialiserPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>
}) {
  const params = await searchParams
  const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : ''

  return (
    <div className="bj-atelier cpt cpt--porte">
      <header className="cpt-top">
        <Link href="/" aria-label="Bellajour, retour à l’accueil">
          <img
            className="cpt-top-logo"
            src="/images/ui/signature-blanche.webp"
            alt=""
            width={320}
            height={122}
            decoding="async"
          />
        </Link>
      </header>

      <main className="cpt-main cpt-main--etroit">
        <h1 className="cpt-titre">Nouveau mot de passe</h1>
        {tokenHash ? (
          <>
            <p className="cpt-sous-titre">Choisissez-le, et il prend effet tout de suite.</p>
            <FormulaireReinitialisation tokenHash={tokenHash} />
          </>
        ) : (
          <div className="cpt-envoye" role="alert">
            <p className="cpt-envoye-mot">Ce lien est incomplet.</p>
            <p className="cpt-envoye-sub">
              Ouvrez le mail « réinitialiser votre mot de passe » et suivez son lien tel quel —
              ou redemandez-en un.
            </p>
            <a className="cpt-lien" href="/compte/mot-de-passe-oublie">
              Redemander un lien
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
