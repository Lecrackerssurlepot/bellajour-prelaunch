/* /edition/[token] — le tableau de bord du client (PRD §14.2, maquette Espace).

   Un écran, sans défilement de page : l'en-tête (l'événement, « Bonjour »,
   l'échéance unique), DEUX GRANDS ENCARTS côte à côte (le style, les photos),
   la ligne de ce qui reste à envoyer à l'atelier, puis le dernier message.
   Les étapes numérotées et la phrase « Ensuite » ont disparu avec la
   révision ; le curseur unique « photos par participant » aussi : chaque lien
   de contribution porte désormais son plafond.

   La porte (lien inconnu, archivé, migration absente) est tenue par le
   layout ; la page relit l'édition par le même `cache`, sans requête de plus. */

import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { formaterJour } from '@/lib/atelier/dates'
import { peut } from '@/lib/collectif/droits'
import { joursAvant, parler, phraseJours } from '@/lib/collectif/espace'
import { collecteOuverte, etatEffectif } from '@/lib/collectif/etats'
import { origineDepuis } from '@/lib/collectif/liens'
import { plafondLienMax } from '@/lib/collectif/plafonds'
import { cheminSection } from '@/lib/collectif/verrous'
import { EnTeteEcran } from '../_composants/Ecran'
import CartePhotos from './CartePhotos'
import LigneContenus from './LigneContenus'
import { chargerEspace, chargerTableau, type Tableau } from './donnees'
import './tableau.css'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function TableauDeBord({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition, role } = acces

  const maintenant = new Date()
  const p = parler(edition.registre)
  const tu = edition.registre === 'ecole_tu'
  const etat = etatEffectif(edition.etat, edition.cloture_le, maintenant)
  const ouverte = collecteOuverte(edition.etat, edition.cloture_le, maintenant)
  const h = await headers()
  const origine = origineDepuis(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto'))
  const tableau = await chargerTableau(edition, origine)
  const prenom = role === 'responsable' ? (edition.responsable_nom ?? '').trim().split(/\s+/)[0] : ''
  const delai = edition.cloture_le ? phraseJours(joursAvant(edition.cloture_le, maintenant)) : ''
  const cloture = edition.cloture_le ? formaterJour(edition.cloture_le) : ''

  return (
    <section className="ec-ecran ec-tdb">
      <EnTeteEcran titre={edition.evenement} sous={prenom ? `Bonjour ${prenom}` : edition.organisation}>
        {edition.cloture_le && etat === 'preparation' ? (
          <span className="ec-pilule">
            <span className="ec-pilule-point" aria-hidden="true" />
            Tout avant le {cloture} · {delai}
          </span>
        ) : (
          <span className="ec-pilule">{ouverte ? 'Collecte ouverte' : 'Collecte close : l’atelier compose'}</span>
        )}
      </EnTeteEcran>

      <div className="ec-ecran-corps">
        <div className="ec-tdb-grille">
          <CarteStyle token={token} tableau={tableau} p={p} />
          <CartePhotos
            token={token}
            ecrire={peut(role, 'deposer_photos')}
            ouverte={ouverte}
            photos={tableau.photos}
            participants={tableau.participants}
            dossiers={tableau.dossiers}
            mosaique={tableau.mosaique}
            liens={tableau.liens}
            max={plafondLienMax(edition)}
            organisation={edition.organisation}
            evenement={edition.evenement}
            cloture={cloture}
            statut={edition.cloture_le && ouverte ? `Clôture ${delai}` : ouverte ? 'Ouverte' : 'Collecte close'}
            lienPhotos={cheminSection(token, 'photos')}
            tu={tu}
          />
        </div>

        <LigneContenus token={token} demandes={edition.contenus_demandes ?? []} envois={tableau.envois} ecrire={peut(role, 'envoyer_contenu')} tu={tu} />

        <Link href={cheminSection(token, 'atelier')} prefetch={false} className="ec-tdb-message">
          <span className="ec-tdb-message-avatar" aria-hidden="true">
            B
          </span>
          {tableau.dernierMessage ? (
            <>
              <span className="ec-tdb-message-texte">
                <span className="ec-note">L&apos;atelier · {formaterJour(tableau.dernierMessage.quand)}</span>
                <span className="ec-tdb-message-ligne">{tableau.dernierMessage.texte}</span>
              </span>
              <span className="ec-tdb-message-action">{role === 'responsable' ? 'Répondre' : 'Lire'}</span>
            </>
          ) : (
            <>
              <span className="ec-tdb-message-texte">
                <span className="ec-note">L&apos;atelier</span>
                <span className="ec-tdb-message-ligne">{p('Aucun message pour l’instant. Une question ? Écrivez-nous.', 'Aucun message pour l’instant. Une question ? Écris-nous.')}</span>
              </span>
              <span className="ec-tdb-message-action">{role === 'responsable' ? 'Écrire' : 'Ouvrir'}</span>
            </>
          )}
        </Link>
      </div>
    </section>
  )
}

/* L'encart Style, deux états (PRD §14.2) : rien choisi = trois couvertures de
   styles en éventail ; au moins un choisi = une couverture par magazine. */
function CarteStyle({ token, tableau, p }: { token: string; tableau: Tableau; p: <T>(vous: T, toi: T) => T }) {
  const mags = tableau.magazines
  const n = mags.length
  const avecStyle = mags.filter((m) => m.style).length
  const valides = mags.filter((m) => m.briefValide).length
  const reste = mags.find((m) => !m.style) ?? null
  const aValider = mags.find((m) => m.style && !m.briefValide) ?? null
  const mur = cheminSection(token, 'style')
  const brief = `${mur}/brief`
  const statut = valides === n && n > 0 ? 'Fait' : avecStyle === 0 ? 'À faire' : `${avecStyle} magazine${avecStyle > 1 ? 's' : ''} sur ${n}`

  return (
    <section className="ec-carte ec-tdb-carte" aria-labelledby="ec-tdb-style">
      <div className="ec-tdb-carte-tete">
        <span className="ec-tdb-etiquette">1 · Le style</span>
        <span className="ec-note">{statut}</span>
      </div>

      {avecStyle === 0 ? (
        <>
          <h2 className="ec-tdb-titre" id="ec-tdb-style">
            {n > 1 ? p("Choisissez l’univers de vos magazines", 'Choisis l’univers de tes magazines') : p("Choisissez l’univers de votre magazine", 'Choisis l’univers de ton magazine')}
          </h2>
          <div className="ec-tdb-eventail" aria-hidden="true">
            {tableau.eventail.map((c, i, tout) => (
              /* Une seule couverture se tient au centre ; deux, sur les côtés. */
              <span key={i} className={`ec-tdb-couv ec-tdb-couv--${tout.length === 1 ? 1 : tout.length === 2 ? i * 2 : i}`}>
                {c.url ? <img src={c.url} alt="" decoding="async" /> : null}
              </span>
            ))}
            {tableau.eventail.length === 0 ? <span className="ec-note">Les styles arrivent sur le mur.</span> : null}
          </div>
          <Link href={mur} prefetch={false} className="ec-bouton ec-bouton--plein">
            Découvrir les styles
          </Link>
        </>
      ) : (
        <>
          <h2 className="ec-tdb-titre" id="ec-tdb-style">
            {reste ? `Il reste le style de « ${reste.nom} »` : aValider ? `Il reste à valider le brief de « ${aValider.nom} »` : p('Vos styles sont choisis', 'Tes styles sont choisis')}
          </h2>
          <div className={`ec-tdb-magazines ec-tdb-magazines--${Math.min(n, 4)}`}>
            {mags.map((m) =>
              m.style ? (
                <Link key={m.id} href={`${brief}?m=${m.rang}`} prefetch={false} className="ec-tdb-magazine">
                  <span className={`ec-tdb-couv-mag${m.rang % 2 ? ' ec-tdb-couv-mag--gauche' : ''}`}>
                    {m.styleCouverture ? <img src={m.styleCouverture} alt="" decoding="async" /> : null}
                  </span>
                  <span className="ec-note">{m.nom}</span>
                  <span className="ec-tdb-style-nom">{m.style}</span>
                  <span className="ec-tdb-lien">{m.briefValide ? 'Brief validé · voir ou modifier' : 'Voir ou modifier le brief'}</span>
                </Link>
              ) : (
                <Link key={m.id} href={`${mur}?m=${m.rang}`} prefetch={false} className="ec-tdb-magazine">
                  <span className="ec-tdb-couv-mag ec-tdb-couv-mag--vide">+</span>
                  <span className="ec-note">{m.nom}</span>
                  <span className="ec-tdb-style-nom">À choisir</span>
                  <span className="ec-tdb-lien">Ouvrir le mur</span>
                </Link>
              )
            )}
          </div>
          {reste ? (
            <Link href={`${mur}?m=${reste.rang}`} prefetch={false} className="ec-bouton ec-bouton--plein">
              Choisir le style de « {reste.nom} »
            </Link>
          ) : aValider ? (
            <Link href={`${brief}?m=${aValider.rang}`} prefetch={false} className="ec-bouton ec-bouton--plein">
              Valider le brief de « {aValider.nom} »
            </Link>
          ) : null}
        </>
      )}
    </section>
  )
}
