import Link from 'next/link'
import { notFound } from 'next/navigation'
import { compteOuvert } from '@/lib/compte/session'
import FormulaireOubli from './FormulaireOubli'
import '../compte.css'

/**
 * /compte/mot-de-passe-oublie — un champ, un bouton, une promesse neutre.
 * La réponse ne dit jamais si l'adresse existe (anti-énumération) : « si un
 * compte existe, un mail arrive », et c'est tout ce qu'on saura ici.
 */

export const dynamic = 'force-dynamic'

export default function MotDePasseOubliePage() {
  if (!compteOuvert()) notFound()

  return (
    <div className="bj-atelier cpt cpt--porte">
      <header className="cpt-top">
        <Link href="/" aria-label="Bellajour, retour à l’accueil">
          <img
            className="cpt-top-logo"
            src="/images/v2/ui/signature-bellajour-240.webp"
            alt=""
            width={240}
            height={92}
            decoding="async"
          />
        </Link>
      </header>

      <main className="cpt-main cpt-main--etroit">
        <h1 className="cpt-titre">Mot de passe oublié</h1>
        <p className="cpt-sous-titre">
          Donnez-nous l’adresse de votre compte : nous vous envoyons de quoi en choisir un
          nouveau.
        </p>
        <FormulaireOubli />
      </main>
    </div>
  )
}
