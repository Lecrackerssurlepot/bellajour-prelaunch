/* /edition/[token]/dossier — « Votre dossier » (PRD §4.2, maquette Dossier).

   Ce qui est prévu au devis (lu dans la fiche de l'atelier), les documents
   posés par l'atelier (signés pour une heure), et la messagerie. Un chiffre
   que l'atelier n'a pas encore saisi se dit « à confirmer », jamais inventé. */

import { notFound } from 'next/navigation'
import { formaterInstantParis } from '@/lib/collectif/dates'
import { peut } from '@/lib/collectif/droits'
import { parler } from '@/lib/collectif/espace'
import { chargerDossier, chargerEspace, chargerTableau } from '../donnees'
import Messagerie from './Messagerie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const A_CONFIRMER = 'à confirmer avec l’atelier'

export default async function PageDossier({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition: e, role } = acces
  const p = parler(e.registre)
  const [dossier, tableau] = await Promise.all([chargerDossier(e), chargerTableau(e)])

  const prevu: [string, string][] = [
    ['Magazines', tableau.magazines.map((m) => m.nom).join(', ') || A_CONFIRMER],
    ['Tirage', e.tirage ? `${e.tirage} exemplaires` : A_CONFIRMER],
    ['Pagination prévue', e.pagination_prevue ? `${e.pagination_prevue} pages (indicative)` : A_CONFIRMER],
    ['Tours de corrections', e.tours_inclus ? String(e.tours_inclus) : A_CONFIRMER],
    ['Propositions de couverture', e.nb_propositions_couverture ? String(e.nb_propositions_couverture) : A_CONFIRMER],
  ]

  return (
    <section className="ec-page">
      <p className="ec-surtitre">{e.organisation}</p>
      <h1 className="ec-h1">{p('Votre dossier', 'Ton dossier')}</h1>
      <div className="ec-dossier">
        <div>
          <section className="ec-carte ec-section" aria-labelledby="ec-prevu">
            <h2 className="ec-h2" id="ec-prevu">
              Ce qui est prévu
            </h2>
            <ul className="ec-lignes">
              {prevu.map(([libelle, valeur]) => (
                <li key={libelle}>
                  <span>{libelle}</span>
                  <strong>{valeur}</strong>
                </li>
              ))}
            </ul>
          </section>
          <section className="ec-carte" aria-labelledby="ec-documents">
            <h2 className="ec-h2" id="ec-documents">
              Les documents
            </h2>
            {dossier.documents.length === 0 ? (
              <p className="ec-note">{p('L’atelier déposera ici le devis signé, les factures et les conditions.', 'L’atelier déposera ici le devis signé, les factures et les conditions.')}</p>
            ) : (
              <ul className="ec-documents">
                {dossier.documents.map((d) => (
                  <li key={d.id}>
                    <span>
                      <strong>{d.libelle}</strong>
                      <br />
                      <span className="ec-note">
                        {d.libelleType} · {formaterInstantParis(d.quand)}
                        {d.statut ? ` · ${d.statut}` : ''}
                      </span>
                    </span>
                    {d.url ? (
                      <a href={d.url} rel="noopener noreferrer">
                        Télécharger
                      </a>
                    ) : (
                      <span className="ec-note">indisponible</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <Messagerie token={token} initiaux={dossier.messages} peutEcrire={peut(role, 'ecrire_message')} tu={e.registre === 'ecole_tu'} />
      </div>
    </section>
  )
}
