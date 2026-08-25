/**
 * /numero/[token] — LA page d'état (PRD §7.5).
 *
 * Une seule page, huit rendus. Pas de login : le token fait foi. C'est le seul
 * lien que la cliente possède, et il vaut pour toute la vie du numéro — de
 * « on a vos photos » à « le voilà chez vous ». C'est ce qui remplace un
 * espace client sans en coder un.
 *
 * Ce fichier est un composant SERVEUR : la ligne `numeros` est lue avec la
 * service key et seuls les champs nécessaires à l'affichage traversent le
 * réseau. Rien de sensible ne descend dans le navigateur — ni l'id interne,
 * ni l'email, ni les clés R2 (les aperçus descendent en URL signée à durée
 * de vie courte). Les deux seuls morceaux interactifs sont isolés dans des
 * composants clients : les cases de l'état 2 et le bouton de l'état 4.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Footer from '../../(atelier)/components/Footer'
import { CTA_HREF, CTA_LABEL, CONTACT_EMAIL } from '../../(atelier)/content'
import { makeSupabase } from '@/lib/supabase'
import { isValidNumeroToken } from '@/lib/atelier/tokenForme'
import { resoudreApercu } from '@/lib/atelier/apercu'
import { eurosPour, type PalierCle } from '@/lib/atelier/prix'
import { ajouterJours, formaterJour } from '@/lib/atelier/dates'
import CasesEtCommande from './CasesEtCommande'
import AttentePaiement from './AttentePaiement'
import BoutonValider from './BoutonValider'
import Apercu from './Apercu'
import '../numero.css'

/* L'état change dans le dos de la cliente — un mail la ramène ici juste après
   une action de l'atelier. Aucune mise en cache : une page d'état périmée est
   pire qu'une page lente. */
export const dynamic = 'force-dynamic'

type Etat =
  | 'photos_recues'
  | 'photos_insuffisantes'
  | 'apercu_pret'
  | 'payee'
  | 'maquette_prete'
  | 'validee'
  | 'en_production'
  | 'expediee'
  | 'livree'

type Numero = {
  token: string
  etat: Etat
  titre: string | null
  prenom: string | null
  nb_photos: number
  nb_pages: number | null
  palier: PalierCle | null
  apercu_urls: unknown
  maquette_pdf_url: string | null
  canva_url: string | null
  cgv_ok: boolean
  renonciation_retractation: boolean
  transporteur: string | null
  tracking_url: string | null
  valide_le: string | null
  etat_maj_le: string
}

const CHAMPS =
  'token, etat, titre, prenom, nb_photos, nb_pages, palier, apercu_urls, ' +
  'maquette_pdf_url, canva_url, cgv_ok, renonciation_retractation, ' +
  'transporteur, tracking_url, valide_le, etat_maj_le'

/* Cinq jalons, pas huit. La cliente ne connaît pas notre machine à états :
   elle veut savoir où en est son numéro, pas dans quelle case il dort. */
const JALONS = ['Photos', 'Couverture', 'Paiement', 'Maquette', 'Livraison']

const AVANCEMENT: Record<Etat, number> = {
  photos_insuffisantes: 0,
  photos_recues: 1,
  apercu_pret: 2,
  payee: 3,
  maquette_prete: 3,
  validee: 4,
  en_production: 4,
  expediee: 4,
  livree: 5,
}

/* Délai d'auto-validation (PRD §11). Sans lui, une part des dossiers payés
   dort indéfiniment et la production ne se ferme jamais. */
const JOURS_AUTO_VALIDATION = 7
/* Annoncé au public : 10 jours après validation (PRD §13, marge incluse). */
const JOURS_LIVRAISON = 10

async function lireNumero(token: string): Promise<Numero | null | 'panne'> {
  try {
    const supabase = makeSupabase()
    const { data, error } = await supabase
      .from('numeros')
      .select(CHAMPS)
      .eq('token', token)
      .maybeSingle<Numero>()

    if (error) {
      console.error('[numero] lecture échouée', error.code, error.message)
      return 'panne'
    }
    return data ?? null
  } catch (err) {
    console.error('[numero] exception', (err as Error)?.message)
    return 'panne'
  }
}

/* Le titre d'onglet ne dit jamais le nom du numéro : cette page vit dans
   l'historique d'un téléphone qu'on prête, et dans la liste des onglets
   ouverts qu'on montre par-dessus l'épaule. */
export const metadata: Metadata = {
  title: 'Votre numéro — Bellajour',
  robots: { index: false, follow: false },
}

export default async function NumeroPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ paiement?: string; essai?: string }>
}) {
  const { token } = await params
  const { paiement, essai } = await searchParams

  /* Test §17.7 : un token inexistant donne une page d'erreur propre, et
     AUCUNE information ne fuite. Forme invalide et dossier introuvable
     rendent donc exactement la même page. */
  if (!isValidNumeroToken(token)) notFound()

  const numero = await lireNumero(token)
  if (numero === null) notFound()

  if (numero === 'panne') {
    return (
      <Coquille titre="Votre numéro" avancement={-1}>
        <p className="nu-mot">La page ne répond pas.</p>
        <p className="nu-sub">
          Le dossier est intact — c’est l’affichage qui bloque. Rechargez dans
          un instant, ou écrivez-nous à <b>{CONTACT_EMAIL}</b>.
        </p>
      </Coquille>
    )
  }

  const titre = numero.titre?.trim() || 'Votre numéro'
  const apercu = numero.etat === 'apercu_pret' ? await resoudreApercu(numero.apercu_urls) : null
  const euros = eurosPour(numero.palier)

  /* Retour de Stripe, webhook pas encore arrivé. Tant que l'état n'a pas
     basculé, on masque le bouton de commande : le lui remontrer juste après
     un paiement réussi, c'est l'inviter à payer deux fois. */
  const retourDePaiement = paiement === 'ok' && numero.etat === 'apercu_pret'
  const essaiNum = Number(essai) || 0
  const ESSAIS_MAX = 5

  /* La ligne naît à la fin de l'écran 4, DÉJÀ en `photos_recues`, avant que la
     moindre photo n'existe. Une cliente qui abandonne à l'écran 5 puis rouvre
     son lien lirait sinon « l'atelier a vos 0 photos ». C'est aussi l'état que
     vise le mail M2 (« il manque les photos »), qui ramène ici. */
  const sansPhotos = numero.etat === 'photos_recues' && numero.nb_photos === 0
  const attendPhotos = sansPhotos || numero.etat === 'photos_insuffisantes'

  return (
    <Coquille titre={titre} avancement={attendPhotos ? 0 : AVANCEMENT[numero.etat] ?? 0}>
      {numero.etat === 'photos_recues' && !sansPhotos && (
        <>
          <p className="nu-mot">L’atelier a vos {numero.nb_photos} photos.</p>
          <p className="nu-sub">
            Votre couverture arrive <b>sous 48 h</b>, par mail et sur cette page.
            Vous ne payez qu’après l’avoir vue — et seulement si elle vous plaît.
          </p>
        </>
      )}

      {attendPhotos && (
        <>
          <p className="nu-mot">
            {sansPhotos
              ? 'Il manque vos photos.'
              : 'On peut faire mieux avec quelques photos de plus.'}
          </p>
          <p className="nu-sub">
            {sansPhotos ? (
              <>
                Le dossier est ouvert, votre titre est réservé. Il faut{' '}
                <b>40 photos</b> au minimum pour composer un numéro — comptez
                deux minutes depuis votre téléphone.
              </>
            ) : (
              <>
                Nous en avons {numero.nb_photos}. À partir de <b>40</b>, il y a de
                quoi composer un vrai numéro sans répéter deux fois le même
                moment. Reprenez là où vous vous étiez arrêtée.
              </>
            )}
          </p>
          <div className="nu-actions">
            {/* Reprise du dépôt sur le MÊME dossier : le token voyage dans
                l'URL, l'écran 5 le reconnaît et ne recrée rien. */}
            <a className="at-cta" href={`${CTA_HREF}?reprendre=${numero.token}`}>
              {sansPhotos ? 'Déposer mes photos' : 'Ajouter des photos'}{' '}
              <span className="at-cta-arrow">→</span>
            </a>
          </div>
        </>
      )}

      {/* ── L'ÉTAT 2 — la page qui vend (PRD §8) ─────────────────────
          La seule page où l'on a le droit d'être spectaculaire. */}
      {numero.etat === 'apercu_pret' && (
        <>
          {retourDePaiement ? (
            <>
              <p className="nu-mot">Paiement reçu.</p>
              <p className="nu-sub">
                {essaiNum < ESSAIS_MAX ? (
                  <>
                    On enregistre votre commande. Cette page se met à jour
                    toute seule dans quelques secondes — vous pouvez la
                    laisser ouverte.
                  </>
                ) : (
                  <>
                    Votre paiement est bien passé, mais l’enregistrement prend
                    plus de temps que prévu. Rien n’est perdu et vous n’avez
                    rien à refaire : votre numéro basculera tout seul. Si cette
                    page n’a pas changé d’ici une heure, écrivez-nous à{' '}
                    <b>{CONTACT_EMAIL}</b>.
                  </>
                )}
              </p>
              {essaiNum < ESSAIS_MAX && (
                <AttentePaiement
                  href={`/numero/${numero.token}?paiement=ok&essai=${essaiNum + 1}`}
                />
              )}
            </>
          ) : (
            <>
              <p className="nu-mot">Votre couverture.</p>
              <p className="nu-sub">
                Composée à la main à partir de vos {numero.nb_photos} photos. Rien
                n’est dû tant que vous n’avez pas dit oui.
              </p>
            </>
          )}

          <Apercu
            c1={apercu?.c1 ?? null}
            c4={apercu?.c4 ?? null}
            double={apercu?.double ?? null}
          />

          {!retourDePaiement && (
            <CasesEtCommande
              token={numero.token}
              titre={titre}
              nbPages={numero.nb_pages}
              euros={euros}
              cgvOk={numero.cgv_ok}
              renonciation={numero.renonciation_retractation}
            />
          )}
        </>
      )}

      {numero.etat === 'payee' && (
        <>
          <p className="nu-mot">Reçu. On compose.</p>
          <p className="nu-sub">
            Votre numéro complet vous attend ici <b>sous 3 jours ouvrés</b>. Votre
            facture est partie par mail au moment du paiement.
          </p>
          <p className="nu-note">
            Un détail à changer ? Répondez au mail, on ajuste sans frais.
          </p>
        </>
      )}

      {numero.etat === 'maquette_prete' && (
        <>
          <p className="nu-mot">{titre}, en entier.</p>
          <p className="nu-sub">
            Feuilletez, puis dites-nous si on imprime. Un détail à changer ?
            Écrivez-le dans le Canva, on repasse dessus.
          </p>
          <BoutonValider
            token={numero.token}
            pdfUrl={numero.maquette_pdf_url}
            canvaUrl={numero.canva_url}
            dateAuto={formaterJour(ajouterJours(numero.etat_maj_le, JOURS_AUTO_VALIDATION))}
          />
        </>
      )}

      {numero.etat === 'validee' && (
        <>
          <p className="nu-mot">Parti à l’impression.</p>
          <p className="nu-sub">
            Plus rien à faire. Chez vous autour du{' '}
            <b>{formaterJour(ajouterJours(numero.valide_le ?? numero.etat_maj_le, JOURS_LIVRAISON))}</b>.
          </p>
        </>
      )}

      {numero.etat === 'en_production' && (
        <>
          <p className="nu-mot">Sous presse.</p>
          <p className="nu-sub">
            Livraison estimée autour du{' '}
            <b>{formaterJour(ajouterJours(numero.valide_le ?? numero.etat_maj_le, JOURS_LIVRAISON))}</b>.
            Vous recevrez le suivi dès le départ du colis.
          </p>
        </>
      )}

      {numero.etat === 'expediee' && (
        <>
          <p className="nu-mot">{titre} est en route.</p>
          <p className="nu-sub">Vous pouvez suivre le colis jusqu’à votre porte.</p>
          <dl className="nu-carte">
            <dt>Transporteur</dt>
            <dd>{numero.transporteur?.trim() || 'En cours d’attribution'}</dd>
            {numero.tracking_url && (
              <>
                <dt>Suivi</dt>
                <dd>
                  <a
                    className="nu-lien"
                    href={numero.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Suivre le colis
                  </a>
                </dd>
              </>
            )}
          </dl>
        </>
      )}

      {numero.etat === 'livree' && (
        <>
          <p className="nu-mot">Et le prochain moment ?</p>
          <p className="nu-sub">
            {titre} est chez vous. Un numéro par moment : la collection commence
            au deuxième.
          </p>
          <div className="nu-actions">
            <a className="at-cta" href={CTA_HREF}>
              {CTA_LABEL} <span className="at-cta-arrow">→</span>
            </a>
          </div>
        </>
      )}
    </Coquille>
  )
}

/* ---------------------------------------------------------------- coquille */

function Coquille({
  titre,
  avancement,
  children,
}: {
  titre: string
  /* -1 = on ne sait pas où en est le dossier : le fil disparaît plutôt que
     de mentir. */
  avancement: number
  children: React.ReactNode
}) {
  return (
    <div className="nu">
      <header className="nu-top">
        <span className="nu-top-logo">Bellajour</span>
        <span className="nu-top-ref">Votre numéro</span>
      </header>

      <main className="nu-main">
        <p className="at-kicker">Maison d’édition du souvenir</p>
        <h1 className="nu-titre">{titre}</h1>

        {avancement >= 0 && (
          <ol className="nu-fil">
            {JALONS.map((jalon, i) => (
              <li
                key={jalon}
                className={i < avancement ? 'is-fait' : i === avancement ? 'is-now' : ''}
                aria-current={i === avancement ? 'step' : undefined}
              >
                {jalon}
              </li>
            ))}
          </ol>
        )}

        {children}
      </main>

      <Footer />
    </div>
  )
}
