/* /edition/[token] — le tableau de bord du client (PRD §14.2, maquettes
   « direction visuelle » du 15/10, Porcelaine et Charbon).

   Un écran, sans défilement de page : l'en-tête (l'événement, « Bonjour »
   dessous, l'échéance unique), puis une grille de deux colonnes : en haut les
   DEUX GRANDS ENCARTS (le style, les photos), en bas, sous chacun, sa ligne :
   ce qui reste à envoyer à l'atelier sous le style, le dernier message sous
   les photos.
   Les étapes numérotées et la phrase « Ensuite » ont disparu avec la
   révision ; le curseur unique « photos par participant » aussi : chaque lien
   de contribution porte désormais son plafond.

   La porte (lien inconnu, archivé, migration absente) est tenue par le
   layout ; la page relit l'édition par le même `cache`, sans requête de plus. */

import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { formaterJour } from '@/lib/atelier/dates'
import { vuesDemandes } from '@/lib/collectif/demandes'
import { peut } from '@/lib/collectif/droits'
import { joursAvant, parler, phraseJours } from '@/lib/collectif/espace'
import { collecteOuverte, etatEffectif } from '@/lib/collectif/etats'
import { stylesOuverts } from '@/lib/collectif/interrupteur'
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
  /* Le responsable sur un appareil pas encore reconnu (T-154) reste salué : il lit, il est lui-même. */
  const prenom = role === 'responsable' || acces.appareilInconnu ? (edition.responsable_nom ?? '').trim().split(/\s+/)[0] : ''
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
          <CarteStyle token={token} tableau={tableau} p={p} ecrire={peut(role, 'choisir_style')} ouverts={stylesOuverts()} />
          <CartePhotos
            token={token}
            ecrire={peut(role, 'deposer_photos')}
            ouverte={ouverte}
            photos={tableau.photos}
            participants={tableau.participants}
            selection={tableau.selection}
            terminer={peut(role, 'terminer_collecte')}
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

          <LigneContenus token={token} demandes={vuesDemandes(edition.contenus_demandes, edition.registre)} envois={tableau.envois} ecrire={peut(role, 'envoyer_contenu')} tu={tu} />

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
      </div>
    </section>
  )
}

/* L'éventail de l'encart Style : trois couvertures de Bellajour, toujours les
   mêmes (Mathias, 15/10 : « avoir vraiment la Côte d'Azur, Lisbonne et
   Aussie », celles de la maquette, plutôt que les couvertures d'essai du mur).
   Lisbonne à gauche, Aussie à droite, la Côte d'Azur devant. Les tuiles du bas
   disent, elles, le vrai style de chaque magazine. */
const EVENTAIL = [
  { nom: 'lisbonne', place: 'gauche' },
  { nom: 'aussie', place: 'droite' },
  { nom: 'cote-azur', place: 'centre' },
] as const

function Eventail() {
  return (
    <div className="ec-tdb-eventail" aria-hidden="true">
      {EVENTAIL.map((c) => (
        <span key={c.nom} className={`ec-tdb-couv ec-tdb-couv--${c.place}`}>
          <img
            src={`/images/v2/accueil/couverture-${c.nom}-360.webp`}
            srcSet={`/images/v2/accueil/couverture-${c.nom}-360.webp 360w, /images/v2/accueil/couverture-${c.nom}-640.webp 640w`}
            sizes="(max-width: 520px) 120px, 240px"
            alt=""
            decoding="async"
          />
        </span>
      ))}
    </div>
  )
}

function CarteStyleBientot({ token, p }: { token: string; p: <T>(vous: T, toi: T) => T }) {
  return (
    <section className="ec-carte ec-tdb-carte ec-tdb-style" aria-labelledby="ec-tdb-style">
      <div className="ec-tdb-carte-tete">
        <span className="ec-tdb-etiquette">1 · Le style</span>
        <span className="ec-tdb-etat">Bientôt</span>
      </div>
      <h2 className="ec-tdb-titre" id="ec-tdb-style">
        {p('L’atelier prépare vos styles', 'L’atelier prépare tes styles')}
      </h2>
      <Eventail />
      <Link href={cheminSection(token, 'style')} prefetch={false} className="ec-bouton ec-bouton--plein">
        Voir nos magazines
      </Link>
    </section>
  )
}

/* L'encart Style (PRD §14.2, maquettes du 15/10) : en haut à droite « Fait »
   quand tous les briefs sont validés ; au centre l'éventail ; en bas une tuile
   par magazine (son nom, son style, ce qui reste à faire, qui y mène) et
   « Modifier ». */
function CarteStyle({ token, tableau, p, ecrire, ouverts }: { token: string; tableau: Tableau; p: <T>(vous: T, toi: T) => T; ecrire: boolean; ouverts: boolean }) {
  /* Le choix du style est fermé (interrupteur.ts, 19/10 au soir) : l'encart garde l'éventail,
     dit « Bientôt » et mène à la vitrine, jamais à un mur ou un brief fermés. */
  if (!ouverts) return <CarteStyleBientot token={token} p={p} />
  const mags = tableau.magazines
  const n = mags.length
  const avecStyle = mags.filter((m) => m.style).length
  const valides = mags.filter((m) => m.briefValide).length
  const fait = n > 0 && valides === n
  const sansStyle = mags.filter((m) => !m.style).length
  const aValider = mags.filter((m) => m.style && !m.briefValide).length
  const mur = cheminSection(token, 'style')
  const brief = `${mur}/brief`
  const titre =
    avecStyle === 0
      ? n > 1
        ? p('Choisissez l’univers de vos magazines', 'Choisis l’univers de tes magazines')
        : p('Choisissez l’univers de votre magazine', 'Choisis l’univers de ton magazine')
      : sansStyle
        ? sansStyle > 1
          ? `${sansStyle} magazines attendent leur style`
          : n > 1
            ? 'Un magazine attend son style'
            : 'Le magazine attend son style'
        : aValider
          ? aValider > 1
            ? `${aValider} briefs restent à valider`
            : n > 1
              ? 'Un brief reste à valider'
              : 'Le brief reste à valider'
          : p('Vos styles sont choisis', 'Tes styles sont choisis')

  return (
    <section className="ec-carte ec-tdb-carte ec-tdb-style" aria-labelledby="ec-tdb-style">
      <div className="ec-tdb-carte-tete">
        <span className="ec-tdb-etiquette">1 · Le style</span>
        {fait ? (
          <span className="ec-tdb-fait">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5 9-10" />
            </svg>
            Fait
          </span>
        ) : (
          <span className="ec-tdb-etat">{avecStyle === 0 ? 'À faire' : `${valides} brief${valides > 1 ? 's' : ''} validé${valides > 1 ? 's' : ''} sur ${n}`}</span>
        )}
      </div>

      <h2 className="ec-tdb-titre" id="ec-tdb-style">
        {titre}
      </h2>

      <Eventail />

      {avecStyle === 0 ? (
        <Link href={mur} prefetch={false} className="ec-bouton ec-bouton--plein">
          Découvrir les styles
        </Link>
      ) : (
        <div className="ec-tdb-style-pied">
          {mags.map((m) => {
            const reste = !m.style ? 'Choisir le style' : !m.briefValide && ecrire ? 'Valider le brief' : null
            return (
              <Link
                key={m.id}
                href={!m.style ? `${mur}?m=${m.rang}` : !m.briefValide && ecrire ? `${brief}?m=${m.rang}` : `${mur}?m=${m.rang}`}
                prefetch={false}
                className={reste ? 'ec-tdb-tuile ec-tdb-tuile--a-faire' : 'ec-tdb-tuile'}
              >
                <span className="ec-note">{m.nom}</span>
                <strong>{m.style ?? 'À composer'}</strong>
                {reste ? <span className="ec-tdb-tuile-action">{reste} →</span> : null}
              </Link>
            )
          })}
          <Link href={mur} prefetch={false} className="ec-tdb-modifier">
            {ecrire ? 'Modifier' : 'Voir'}
          </Link>
        </div>
      )}
    </section>
  )
}
