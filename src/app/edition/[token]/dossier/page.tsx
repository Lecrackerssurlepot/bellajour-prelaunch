/* /edition/[token]/dossier — « Documents » (PRD §4.2, révision §14.5,
   maquette Dossier).

   Seulement les documents posés par l'atelier (signés pour une heure), avec
   « Ouvrir » ; en tête, l'encart « Nouvelle proposition » quand une
   proposition complémentaire attend une réponse (elle se lit et s'accepte
   dans « Parler à l'atelier ») ; à droite, ce que prévoit le devis. La
   messagerie n'est plus ici. Un chiffre que l'atelier n'a pas encore saisi
   se dit « à confirmer », jamais inventé. */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formaterInstantParis, formaterJourParis } from '@/lib/collectif/dates'
import { peut } from '@/lib/collectif/droits'
import { parler } from '@/lib/collectif/espace'
import { formaterJour } from '@/lib/collectif/livraison'
import { cheminSection } from '@/lib/collectif/verrous'
import { EnTeteEcran } from '../../_composants/Ecran'
import { chargerDocuments, chargerEspace, chargerTableau, propositionEnAttente } from '../donnees'
import './documents.css'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const A_CONFIRMER = 'à confirmer avec l’atelier'

export default async function PageDocuments({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition: e, role } = acces
  const p = parler(e.registre)
  const [documents, tableau] = await Promise.all([chargerDocuments(e), chargerTableau(e)])
  const enAttente = documents.find(propositionEnAttente) ?? null
  const versAtelier = cheminSection(token, 'atelier')

  const prevu: [string, string][] = [
    ['Magazines', tableau.magazines.map((m) => m.nom).join(', ') || A_CONFIRMER],
    ['Tirage', e.tirage ? `${e.tirage} exemplaires` : A_CONFIRMER],
    ['Pagination prévue', e.pagination_prevue ? `${e.pagination_prevue} pages (indicative)` : A_CONFIRMER],
    ['Tours de corrections', e.tours_inclus ? String(e.tours_inclus) : A_CONFIRMER],
    ['Propositions de couverture', e.nb_propositions_couverture ? String(e.nb_propositions_couverture) : A_CONFIRMER],
    ['Responsable du bon à tirer', e.responsable_nom ?? A_CONFIRMER],
    ['Clôture des photos', e.cloture_le ? formaterJourParis(e.cloture_le) : A_CONFIRMER],
    ['Livraison', [e.livraison?.adresse, e.livraison?.prevue_le ? `prévue le ${formaterJour(e.livraison.prevue_le)}` : null].filter(Boolean).join(' · ') || A_CONFIRMER],
  ]

  return (
    <section className="ec-ecran">
      <EnTeteEcran titre="Documents" sous="Tout ce qui est signé, facturé ou envoyé" />
      <div className="ec-ecran-corps ec-docs">
        <div className="ec-docs-gauche">
          {enAttente ? (
            <Link className="ec-docs-nouvelle" href={versAtelier} prefetch={false}>
              <span className="ec-docs-nouvelle-texte">
                <span className="ec-docs-etiquette ec-docs-accent">Nouvelle proposition</span>
                <span>{enAttente.libelle}</span>
              </span>
              <span className="ec-bouton ec-bouton--petit">{peut(role, 'ecrire_message') ? 'Voir et accepter' : 'Voir'}</span>
            </Link>
          ) : null}
          <section className="ec-docs-liste" aria-labelledby="ec-docs-titre">
            <div className="ec-docs-tete">
              <span className="ec-docs-etiquette" id="ec-docs-titre">
                {p('Vos documents', 'Tes documents')}
              </span>
              <span className="ec-note">{documents.length}</span>
            </div>
            {documents.length === 0 ? (
              <p className="ec-note ec-docs-vide">L&apos;atelier déposera ici le devis signé, les factures et les conditions.</p>
            ) : (
              <ul className="ec-docs-lignes ec-defile">
                {documents.map((d) => (
                  <li key={d.id}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 3h8l4 4v14H6z" />
                      <path d="M14 3v4h4" />
                    </svg>
                    <span className="ec-docs-nom">
                      <span>{d.libelle}</span>
                      <span className="ec-note">
                        {d.libelleType} · {formaterInstantParis(d.quand)}
                      </span>
                    </span>
                    {d.statut ? <span className="ec-docs-statut">{d.statut}</span> : propositionEnAttente(d) ? <span className="ec-docs-statut ec-docs-accent">À lire</span> : null}
                    {d.url ? (
                      <a className="ec-bouton ec-bouton--clair ec-bouton--petit" href={d.url} target="_blank" rel="noopener noreferrer">
                        Ouvrir
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
        <section className="ec-docs-devis" aria-labelledby="ec-docs-devis">
          <span className="ec-docs-etiquette" id="ec-docs-devis">
            Ce que prévoit le devis
          </span>
          <ul className="ec-docs-prevu">
            {prevu.map(([libelle, valeur]) => (
              <li key={libelle}>
                <span>{libelle}</span>
                <span>{valeur}</span>
              </li>
            ))}
          </ul>
          <Link className="ec-docs-question" href={versAtelier} prefetch={false}>
            Une question sur le devis ? Parler à l&apos;atelier →
          </Link>
        </section>
      </div>
    </section>
  )
}
