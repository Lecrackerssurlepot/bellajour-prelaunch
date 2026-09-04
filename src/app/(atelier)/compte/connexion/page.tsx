import Link from 'next/link'
import { redirect } from 'next/navigation'
import { utilisateurConnecte } from '@/lib/compte/session'
import { suiteSure } from '@/lib/compte/garde'
import FormulaireConnexion from './FormulaireConnexion'
import '../compte.css'

/**
 * /compte/connexion — la porte du compte. Google d'abord (un seul geste),
 * email + mot de passe dessous, et la bascule connexion ↔ inscription sur
 * la même page : personne ne cherche « où s'inscrire ».
 *
 * `?suite=` ramène où la cliente allait (borné par suiteSure) ; `?erreur=`
 * porte les mots des retours ratés (lien mort, Google interrompu).
 */

export const dynamic = 'force-dynamic'

const MOTS_ERREUR: Record<string, string> = {
  lien: 'Ce lien a déjà servi ou a expiré. Connectez-vous, ou redemandez-en un.',
  google: 'La connexion avec Google ne s’est pas terminée. Réessayez, ou utilisez votre mot de passe.',
  indisponible: 'La connexion est indisponible pour le moment. Réessayez dans quelques minutes.',
}

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; erreur?: string }>
}) {
  const params = await searchParams
  const suite = suiteSure(params.suite)

  const qui = await utilisateurConnecte()
  if (qui) redirect(suite)

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
        <h1 className="cpt-titre">Mon compte</h1>
        <p className="cpt-sous-titre">
          Tous vos numéros au même endroit — le suivi, les anciens projets, les PDF.
        </p>
        {params.erreur && MOTS_ERREUR[params.erreur] ? (
          <p className="cpt-alerte" role="alert">
            {MOTS_ERREUR[params.erreur]}
          </p>
        ) : null}
        <FormulaireConnexion suite={suite} />
      </main>
    </div>
  )
}
