/* /edition/[token]/livraison — la livraison (PRD §4.2, maquette Livraison,
   phase 6). Verrouillée tant que le bon à tirer n'est pas validé : la page
   relit `verrousPour` comme le menu, et une URL tapée à la main affiche la
   même phrase, jamais une erreur (PRD §3.2).

   PRD §0.5 : pas de suivi en direct (aucune API transporteur). Les étapes
   sont posées par les gestes de l'atelier, avec leurs dates LUES ; le colis
   montre le transporteur, le numéro et un bouton vers le site du
   transporteur quand `suivi.ts` sait construire l'adresse (jamais un lien
   approximatif). Les « derniers passages » sont la phase 7. */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { etatEffectif } from '@/lib/collectif/etats'
import { parler } from '@/lib/collectif/espace'
import { etapesLivraison, formaterJour, titreLivraison } from '@/lib/collectif/livraison'
import { cheminSection, verrousPour } from '@/lib/collectif/verrous'
import { Verrou } from '../../_composants/EnPreparation'
import { chargerEspace, chargerSuiviLivraison } from '../donnees'
import Copier from './Copier'
import './livraison.css'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition } = acces
  const etat = etatEffectif(edition.etat, edition.cloture_le, new Date())
  const raison = verrousPour(etat).livraison
  if (raison) return <Verrou titre="Livraison" raison={raison} />

  const p = parler(edition.registre)
  const { quand } = await chargerSuiviLivraison(edition)
  const etapes = etapesLivraison(etat, quand)
  const l = edition.livraison ?? {}
  const prevue = formaterJour(l.prevue_le)

  return (
    <section className="ec-page ec-livraison">
      <div className="ec-livraison-tete">
        <div>
          <p className="ec-surtitre">Livraison</p>
          <h1 className="ec-h1">{titreLivraison(etat)}</h1>
          <p className="ec-texte">
            {edition.tirage ? `${edition.tirage} exemplaires · ` : ''}
            {p('le bon à tirer validé reste consultable dans l’onglet ', 'le bon à tirer validé reste consultable dans l’onglet ')}
            <Link className="ec-lien-texte" href={cheminSection(token, 'bat')} prefetch={false}>
              Bon à tirer
            </Link>
          </p>
        </div>
        {prevue && etat !== 'livree' ? (
          <div className="ec-livraison-prevue">
            <span className="ec-note">Livraison prévue</span>
            <strong>{prevue}</strong>
          </div>
        ) : null}
      </div>

      <ol className="ec-livraison-etapes">
        {etapes.map((e) => (
          <li key={e.cle} className={e.courante ? 'ec-livraison-etape ec-livraison-etape--courante' : e.faite ? 'ec-livraison-etape ec-livraison-etape--faite' : 'ec-livraison-etape'}>
            <span className="ec-livraison-point" aria-hidden="true" />
            <span className="ec-livraison-libelle">{e.libelle}</span>
            <span className="ec-note">{e.quand ?? (e.faite ? '' : 'à venir')}</span>
          </li>
        ))}
      </ol>

      <div className="ec-cartes">
        <section className="ec-carte" aria-labelledby="ec-colis">
          <h2 className="ec-h2" id="ec-colis">
            Le colis
          </h2>
          {l.transporteur ? (
            <>
              <p className="ec-livraison-ligne">
                <span className="ec-note">Transporteur</span>
                <span>{l.transporteur}</span>
              </p>
              {l.code ? (
                <p className="ec-livraison-ligne">
                  <span className="ec-note">Numéro de suivi</span>
                  <span className="ec-livraison-code">
                    {l.code}
                    <Copier texte={l.code} />
                  </span>
                </p>
              ) : null}
              {l.url ? (
                <a className="ec-bouton" href={l.url} target="_blank" rel="noopener noreferrer">
                  Suivre chez le transporteur
                </a>
              ) : (
                <p className="ec-note">
                  {p('Le site de ce transporteur se consulte avec le numéro ci-dessus.', 'Le site de ce transporteur se consulte avec le numéro ci-dessus.')}
                </p>
              )}
            </>
          ) : (
            <p className="ec-texte">
              {p('Le transporteur et le numéro de suivi s’afficheront ici dès que le colis lui sera remis.', 'Le transporteur et le numéro de suivi s’afficheront ici dès que le colis lui sera remis.')}
            </p>
          )}
        </section>

        <section className="ec-carte" aria-labelledby="ec-adresse">
          <h2 className="ec-h2" id="ec-adresse">
            L&apos;adresse
          </h2>
          {l.adresse ? (
            <p className="ec-texte ec-livraison-adresse">{l.adresse}</p>
          ) : (
            <p className="ec-texte">{p('L’atelier confirme l’adresse avec vous avant l’expédition.', 'L’atelier confirme l’adresse avec toi avant l’expédition.')}</p>
          )}
          <p className="ec-note">
            {p('Une question sur la livraison ?', 'Une question sur la livraison ?')}{' '}
            <Link className="ec-lien-texte" href={cheminSection(token, 'atelier')} prefetch={false}>
              {p('Écrire à l’atelier', 'Écrire à l’atelier')}
            </Link>
          </p>
        </section>
      </div>
    </section>
  )
}
