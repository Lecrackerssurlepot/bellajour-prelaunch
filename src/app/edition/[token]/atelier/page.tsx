/* /edition/[token]/atelier — « Parler à l'atelier » (PRD §4.2, maquette
   RendezVous). Le rendez-vous est la page Google réglée dans la fiche,
   ouverte dans un nouvel onglet (PRD §0.5) ; « Demander une modification »
   arrive en phase 6 (T-145). En attendant, la messagerie est dans « Votre
   dossier ». */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { parler } from '@/lib/collectif/espace'
import { cheminSection } from '@/lib/collectif/verrous'
import { chargerEspace } from '../donnees'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageAtelier({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition } = acces
  const p = parler(edition.registre)
  return (
    <section className="ec-page">
      <p className="ec-surtitre">{edition.organisation}</p>
      <h1 className="ec-h1">Parler à l&apos;atelier</h1>
      <div className="ec-cartes">
        <section className="ec-carte" aria-labelledby="ec-rdv">
          <h2 className="ec-h2" id="ec-rdv">
            Prendre rendez-vous
          </h2>
          {edition.rdv_url ? (
            <>
              <p className="ec-texte">
                {p('Choisissez un créneau : la page de rendez-vous s’ouvre dans un nouvel onglet.', 'Choisis un créneau : la page de rendez-vous s’ouvre dans un nouvel onglet.')}
              </p>
              <a className="ec-bouton" href={edition.rdv_url} target="_blank" rel="noopener noreferrer">
                Choisir un créneau
              </a>
            </>
          ) : (
            <p className="ec-texte">{p('L’atelier ajoutera bientôt son lien de rendez-vous.', 'L’atelier ajoutera bientôt son lien de rendez-vous.')}</p>
          )}
        </section>
        <section className="ec-carte" aria-labelledby="ec-ecrire">
          <h2 className="ec-h2" id="ec-ecrire">
            Écrire à l&apos;atelier
          </h2>
          <p className="ec-texte">{p('La messagerie est dans votre dossier. L’atelier vous répond là.', 'La messagerie est dans ton dossier. L’atelier te répond là.')}</p>
          <Link className="ec-bouton ec-bouton--clair" href={cheminSection(token, 'dossier')} prefetch={false}>
            Ouvrir la messagerie
          </Link>
        </section>
      </div>
    </section>
  )
}
