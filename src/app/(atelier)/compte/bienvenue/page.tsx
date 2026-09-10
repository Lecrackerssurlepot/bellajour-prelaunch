import Link from 'next/link'
import { notFound } from 'next/navigation'
import { compteOuvert } from '@/lib/compte/session'
import FormulaireBienvenue from './FormulaireBienvenue'
import '../compte.css'

/**
 * /compte/bienvenue?e=<email> — la porte d'invitation des treize fondateurs
 * de la prévente. Leur compte existe déjà (email confirmé, aucun mot de
 * passe) : un seul clic déclenche le flux « mot de passe oublié » existant
 * (mail C2, lien valable une heure). Ce lien de mail, lui, ne doit jamais
 * expirer — c'est pourquoi cette page ne fait rien d'elle-même, elle ne
 * fait que préremplir puis déléguer à /api/compte/mot-de-passe-oublie.
 * Validé par Mathias le 10/09/2026.
 */

export const dynamic = 'force-dynamic'

const EMAIL_PLAUSIBLE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function BienvenuePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>
}) {
  if (!compteOuvert()) notFound()

  const params = await searchParams
  const candidat = (params.e ?? '').trim().toLowerCase()
  const emailInitial = EMAIL_PLAUSIBLE.test(candidat) ? candidat : ''

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
        <h1 className="cpt-titre">Bienvenue, fondateur</h1>
        <p className="cpt-sous-titre">
          Votre compte Bellajour existe déjà avec cette adresse. Il ne manque que votre mot de
          passe : recevez le lien pour le choisir, ou continuez avec Google.
        </p>
        <FormulaireBienvenue emailInitial={emailInitial} />
      </main>
    </div>
  )
}
