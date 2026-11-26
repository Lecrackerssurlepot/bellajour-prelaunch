import { notFound, redirect } from 'next/navigation'
import { compteOuvert, utilisateurConnecte } from '@/lib/compte/session'
import { suiteSure } from '@/lib/compte/garde'
import { lireInterrupteur } from '@/lib/collectif/interrupteur'
import { noelAuSite } from '@/lib/atelier/carteCadeau'
import Nav from '../../components/Nav'
import Footer from '../../components/Footer'
import Bandeau from '../../noel/Bandeau'
import { COMPOSER_HREF, CTA_LABEL } from '../../content'
import FormulaireConnexion from './FormulaireConnexion'
import '../compte.css'
import '../../magazine/magazine.css'
import './connexion.css'

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
  /* L'espace n'est pas encore ouvert au public (compteOuvert) : cette
     page n'existe pas. */
  if (!compteOuvert()) notFound()

  const params = await searchParams
  const suite = suiteSure(params.suite)

  const qui = await utilisateurConnecte()
  if (qui) redirect(suite)

  /* Charte V2 : la page « Mon compte » du duplicata (26/11). La barre, le
     bandeau et le pied du site ; une boîte de 440 px au centre. */
  const noel = lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert && noelAuSite(new Date())

  return (
    <>
      {noel && <Bandeau />}
      <Nav href={COMPOSER_HREF} label={CTA_LABEL} retour="/" compteOuvert={compteOuvert()} />
      <main className="m-banc m-connexion" aria-label="Mon compte">
        <section className="connexion">
          <div className="boite">
            <span className="lab sub">Mon compte</span>
            <h1 className="titre">Tous vos numéros au même endroit.</h1>
            <p className="chapo sub">Le suivi, les anciens projets, les PDF.</p>
            {params.erreur && Object.hasOwn(MOTS_ERREUR, params.erreur) ? (
              <p className="cpt-alerte" role="alert">
                {MOTS_ERREUR[params.erreur]}
              </p>
            ) : null}
            <FormulaireConnexion suite={suite} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
