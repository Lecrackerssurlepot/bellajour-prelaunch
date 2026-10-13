/* /edition/[token] — le tableau de bord du client (PRD §4.2, maquette Espace).

   Le titre, l'échéance unique « Tout avant le … », les étapes, deux encarts
   (le style, les photos), ce qui reste à envoyer à l'atelier, et « Ensuite ».
   L'état vide ET l'état en cours se lisent dans les mêmes encarts.

   La porte (lien inconnu, archivé, migration absente) est tenue par le
   layout ; la page relit l'édition par le même `cache`, sans requête de plus. */

import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { formaterJour } from '@/lib/atelier/dates'
import { peut } from '@/lib/collectif/droits'
import { contenusAEnvoyer, ETAPES_CLIENT, etapeClient, joursAvant, parler, phraseJours } from '@/lib/collectif/espace'
import { etatEffectif } from '@/lib/collectif/etats'
import { liensEdition, origineDepuis } from '@/lib/collectif/liens'
import { cheminSection } from '@/lib/collectif/verrous'
import CartePhotos from './CartePhotos'
import { chargerEspace, chargerTableau } from './donnees'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function TableauDeBord({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition, role } = acces

  const maintenant = new Date()
  const p = parler(edition.registre)
  const etat = etatEffectif(edition.etat, edition.cloture_le, maintenant)
  const courante = etapeClient(etat)
  const tableau = await chargerTableau(edition)
  const h = await headers()
  const lienDepot = liensEdition(origineDepuis(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto')), edition).depot
  const contenus = contenusAEnvoyer(edition.contenus_demandes ?? [], tableau.contenusRecus)
  const prenom = role === 'responsable' ? (edition.responsable_nom ?? '').trim().split(/\s+/)[0] : ''
  const briefsValides = tableau.magazines.filter((m) => m.briefValide).length
  const n = tableau.magazines.length

  return (
    <section className="ec-page">
      <p className="ec-surtitre">{prenom ? `Bonjour ${prenom}` : edition.organisation}</p>
      <h1 className="ec-h1">{edition.evenement}</h1>
      {edition.cloture_le && etat === 'preparation' ? (
        <p className="ec-echeance">
          <span>
            Tout avant le <strong>{formaterJour(edition.cloture_le)}</strong>
          </span>
          <span className="ec-echeance-delai">{phraseJours(joursAvant(edition.cloture_le, maintenant))}</span>
        </p>
      ) : null}

      <ol className="ec-etapes" aria-label="Les étapes de l'édition">
        {ETAPES_CLIENT.map((e, i) => (
          <li
            key={e.cle}
            className={i === courante ? 'ec-etape ec-etape--courante' : i < courante ? 'ec-etape ec-etape--faite' : 'ec-etape'}
            aria-current={i === courante ? 'step' : undefined}
          >
            {i < courante ? '✓ ' : ''}
            {e.libelle}
          </li>
        ))}
      </ol>

      <div className="ec-cartes">
        <section className="ec-carte" aria-labelledby="ec-carte-style">
          <div className="ec-carte-tete">
            <span>1 · Le style</span>
            <span className={briefsValides === n && n > 0 ? 'ec-statut ec-statut--ok' : 'ec-statut'}>
              {briefsValides === n && n > 0 ? 'Fait' : briefsValides > 0 ? `${briefsValides} magazine${briefsValides > 1 ? 's' : ''} sur ${n}` : 'À faire'}
            </span>
          </div>
          <h2 className="ec-h2" id="ec-carte-style">
            {briefsValides === 0
              ? n > 1
                ? p(`Choisissez le style de vos ${n} magazines`, `Choisis le style de tes ${n} magazines`)
                : p('Choisissez le style de votre magazine', 'Choisis le style de ton magazine')
              : briefsValides < n
                ? p('Il reste un style à choisir', 'Il reste un style à choisir')
                : p('Vos styles sont choisis', 'Tes styles sont choisis')}
          </h2>
          <ul className="ec-lignes">
            {tableau.magazines.map((m) => (
              <li key={m.rang}>
                <span>
                  Magazine {m.rang} · <strong>{m.nom}</strong>
                </span>
                <span>{m.briefValide ? m.style ?? 'Choisi' : 'À choisir'}</span>
              </li>
            ))}
          </ul>
          <Link href={cheminSection(token, 'style')} className="ec-bouton" prefetch={false}>
            Ouvrir le mur des styles
          </Link>
        </section>

        <CartePhotos
          token={token}
          lienDepot={lienDepot}
          photos={tableau.photos}
          participants={tableau.participants}
          plafondAtelier={edition.plafond_participant_atelier}
          plafondClient={edition.plafond_participant_client}
          peutRegler={peut(role, 'regler_plafond_participant')}
          tu={edition.registre === 'ecole_tu'}
        />
      </div>

      {contenus.length ? (
        <section className="ec-section" aria-labelledby="ec-envoyer">
          <h2 className="ec-h2" id="ec-envoyer">
            À envoyer à l&apos;atelier
          </h2>
          <div className="ec-puces">
            {contenus.map((c) => (
              <span key={c.cle} className={c.recu ? 'ec-puce ec-puce--recue' : 'ec-puce'}>
                {c.recu ? '✓ ' : ''}
                {c.libelle}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <p className="ec-ensuite">
        {p(
          'Après la clôture, l’atelier compose. Le premier bon à tirer et vos propositions de couverture arrivent ici, dans « Bon à tirer ».',
          'Après la clôture, l’atelier compose. Le premier bon à tirer et tes propositions de couverture arrivent ici, dans « Bon à tirer ».'
        )}
      </p>
    </section>
  )
}
