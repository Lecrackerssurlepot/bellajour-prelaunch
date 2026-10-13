/* /edition/[token]/atelier — « Parler à l'atelier » (PRD §4.2, maquette
   RendezVous, phase 6).
   1. Demander une modification : motifs + texte → un message à l'atelier et
      une ligne de journal (jusqu'à la validation du bon à tirer).
   2. Un appel : la page de rendez-vous Google réglée dans la fiche, dans un
      nouvel onglet (PRD §0.5 : pas de grille de créneaux maison).
   3. Les propositions complémentaires posées par l'atelier dans le dossier :
      « Accepter » journalise et prévient l'atelier, rien n'est payé ici. */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { peut } from '@/lib/collectif/droits'
import { parler } from '@/lib/collectif/espace'
import { etatEffectif } from '@/lib/collectif/etats'
import { demandePossible } from '@/lib/collectif/livraison'
import { cheminSection } from '@/lib/collectif/verrous'
import { chargerEspace, chargerPropositions } from '../donnees'
import DemandeModification from './DemandeModification'
import Propositions from './Propositions'
import './atelier.css'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageAtelier({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition, role } = acces
  const p = parler(edition.registre)
  const ecrire = peut(role, 'ecrire_message')
  const possible = demandePossible(etatEffectif(edition.etat, edition.cloture_le, new Date()))
  const propositions = await chargerPropositions(edition)

  return (
    <section className="ec-page">
      <p className="ec-surtitre">
        {edition.organisation} · {possible ? 'modifications possibles jusqu’à la validation du bon à tirer' : 'le bon à tirer est validé'}
      </p>
      <h1 className="ec-h1">Parler à l&apos;atelier</h1>
      <div className="ec-cartes">
        <section className="ec-carte" aria-labelledby="ec-demande">
          <p className="ec-surtitre">1 · {p('Votre demande', 'Ta demande')}</p>
          <h2 className="ec-h2" id="ec-demande">
            Demander une modification
          </h2>
          {!ecrire ? (
            <p className="ec-texte">Ce lien permet de tout voir, sans rien modifier.</p>
          ) : possible ? (
            <DemandeModification token={token} tu={edition.registre === 'ecole_tu'} lienDossier={cheminSection(token, 'dossier')} />
          ) : (
            <p className="ec-texte">
              {p('Le bon à tirer est validé : le magazine part tel quel. Pour une question, écrivez à l’atelier dans votre dossier.', 'Le bon à tirer est validé : le magazine part tel quel. Pour une question, écris à l’atelier dans ton dossier.')}
            </p>
          )}
          <p className="ec-note">
            {p('Une demande qui change le contenu du devis fait l’objet d’une proposition complémentaire, que vous acceptez ici même après l’appel.', 'Une demande qui change le contenu du devis fait l’objet d’une proposition complémentaire, que tu acceptes ici même après l’appel.')}
          </p>
        </section>

        <section className="ec-carte" aria-labelledby="ec-rdv">
          <p className="ec-surtitre">2 · Un appel</p>
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
          <p className="ec-note">
            {p('La messagerie est dans votre dossier : l’atelier vous répond là.', 'La messagerie est dans ton dossier : l’atelier te répond là.')}{' '}
            <Link className="ec-lien-texte" href={cheminSection(token, 'dossier')} prefetch={false}>
              Ouvrir la messagerie
            </Link>
          </p>
        </section>
      </div>

      {propositions.length ? (
        <section className="ec-section" aria-labelledby="ec-propositions">
          <p className="ec-surtitre">Après l&apos;appel</p>
          <h2 className="ec-h2" id="ec-propositions">
            {propositions.length > 1 ? 'Les propositions complémentaires' : 'La proposition complémentaire'}
          </h2>
          <Propositions token={token} ecrire={ecrire} propositions={propositions} tu={edition.registre === 'ecole_tu'} />
        </section>
      ) : null}
    </section>
  )
}
