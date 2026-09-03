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
import { COMPOSER_HREF, CTA_LABEL, CONTACT_EMAIL } from '../../(atelier)/content'
import { makeSupabase } from '@/lib/supabase'
import { isValidNumeroToken } from '@/lib/atelier/tokenForme'
import { resoudreApercu } from '@/lib/atelier/apercu'
import { eurosPour, type PalierCle } from '@/lib/atelier/prix'
import { DELAIS, JOURS_LIVRAISON, etapeDepot, QUI_ATTEND, type Camp, type EtapeDepot } from '@/lib/atelier/urgence'
import { JOURS_AVANT_AUTO_VALIDATION } from '@/lib/atelier/mails'
import { MIN_PHOTOS } from '../../(atelier)/composer/depot/paliers'
import { ajouterJours, formaterJour } from '@/lib/atelier/dates'
import CasesEtCommande from './CasesEtCommande'
import AttentePaiement from './AttentePaiement'
import BoutonValider from './BoutonValider'
import BoutonEnvoyer from './BoutonEnvoyer'
import Apercu from './Apercu'
import LienPartage from '../../components/LienPartage'
import '../numero.css'

/* L'adresse publique du site, pour écrire le lien EN TOUTES LETTRES sous les
   yeux de la cliente. Même valeur que celle des mails (mails.ts) : le lien
   qu'elle lit ici doit être exactement celui qu'elle a reçu. */
const SITE_URL_PUBLIC = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bellajour.fr'

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
  /* Le SEUL signal serveur du dépôt terminé (cf. lib/atelier/urgence.ts). */
  consent_photos: boolean | null
  transporteur: string | null
  tracking_url: string | null
  /* Le NUMÉRO de suivi (le lien, lui, est dans `tracking_url`). Cloudprinter
     donne presque toujours un numéro : sans cette colonne, il se perdait. */
  tracking_code: string | null
  valide_le: string | null
  etat_maj_le: string
  /* T2-13 — la date du clic « j'ai noté des retouches », ou null. */
  retouches_demandees_le: string | null
  /* T2-1 — la case facultative « montrer des extraits », affichée en pied. */
  consent_communication: boolean | null
  /* T2-11 — hosted_invoice_url de Stripe, capté au webhook (best-effort). */
  facture_url: string | null
  /* Le magazine numérique (03/09) : clé R2 du PDF souvenir, et son poids —
     affiché avant le clic, le fichier garde le poids d'impression. */
  souvenir_pdf_key: string | null
  souvenir_pdf_octets: number | null
}

const CHAMPS =
  'token, etat, titre, prenom, nb_photos, nb_pages, palier, apercu_urls, ' +
  'maquette_pdf_url, canva_url, cgv_ok, renonciation_retractation, consent_photos, ' +
  'transporteur, tracking_url, valide_le, etat_maj_le, retouches_demandees_le, ' +
  'consent_communication, facture_url'

/* Les colonnes arrivées après les autres (`tracking_code`, puis le souvenir
   20260903) : tant qu'une migration n'est pas passée, PostgREST répond 42703
   et la page entière tomberait pour une colonne d'affichage. Le repli est
   celui de `lireNumeros` côté atelier — d'abord sans le souvenir, puis sans
   rien de frais. */
const CHAMPS_AVEC_SUIVI = `${CHAMPS}, tracking_code`

/**
 * De qui c'est le tour, en une phrase.
 *
 * Recette du 25/08 : « sur la page client on ne comprend pas trop si c'est
 * validé, on dirait que je dois encore faire l'étape ». Le fil des jalons dit
 * OÙ on en est ; il ne dit pas QUI DOIT JOUER. Or c'est la seule question que
 * se pose quelqu'un qui rouvre son lien : est-ce que j'attends, ou est-ce
 * qu'on m'attend ?
 *
 * La réponse ne se réinvente pas ici : `QUI_ATTEND` (urgence.ts) la donne déjà
 * à l'atelier pour trier sa journée. Les deux écrans lisent la même table, et
 * ne peuvent donc pas se contredire — la cliente ne peut pas lire « c'est à
 * nous » pendant que la table de travail range son dossier chez elle.
 */
const MOT_DU_CAMP: Record<Camp, string | null> = {
  atelier: 'C’est à nous. On vous écrit dès que c’est prêt.',
  cliente: 'C’est à vous.',
  dehors: 'C’est en route. Rien à faire de votre côté.',
  fini: null,
}

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

/* Délai d'auto-validation (PRD §11) : la MÊME constante que celle que la
   relève applique et que M5 annonce — deux copies avaient fini par exister,
   et une date de courtoisie qui ne correspond pas à la bascule réelle est
   pire que pas de date. Idem pour la livraison (T2-8) : les chiffres promis
   ici sont ceux que l'admin surveille. */
const JOURS_AUTO_VALIDATION = JOURS_AVANT_AUTO_VALIDATION
const JOURS_COMPOSITION = DELAIS.payee?.joursOuvres ?? 3

async function lireNumero(token: string): Promise<Numero | null | 'panne'> {
  try {
    const supabase = makeSupabase()
    const lire = (champs: string) =>
      supabase.from('numeros').select(champs).eq('token', token).maybeSingle<Numero>()

    let { data, error } = await lire(`${CHAMPS_AVEC_SUIVI}, souvenir_pdf_key, souvenir_pdf_octets`)
    if (error?.code === '42703') {
      ;({ data, error } = await lire(CHAMPS_AVEC_SUIVI))
    }
    if (error?.code === '42703') {
      ;({ data, error } = await lire(CHAMPS))
    }

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
  searchParams: Promise<{ paiement?: string }>
}) {
  const { token } = await params
  const { paiement } = await searchParams

  /* Test §17.7 : un token inexistant donne une page d'erreur propre, et
     AUCUNE information ne fuite. Forme invalide et dossier introuvable
     rendent donc exactement la même page. */
  if (!isValidNumeroToken(token)) notFound()

  const numero = await lireNumero(token)
  if (numero === null) notFound()

  if (numero === 'panne') {
    return (
      <Coquille titre="Votre numéro" avancement={-1} camp="fini" token={token}>
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
     un paiement réussi, c'est l'inviter à payer deux fois.
     T-056 — le compte d'essais vit dans AttentePaiement (état client), plus
     dans l'URL : la page ne se recharge plus, elle se rafraîchit. Un vieux
     lien portant `?essai=` reste inoffensif, le paramètre est ignoré. */
  const retourDePaiement = paiement === 'ok' && numero.etat === 'apercu_pret'

  /* La ligne naît à la fin de l'écran 4, DÉJÀ en `photos_recues`, avant que la
     moindre photo n'existe. Une cliente qui abandonne à l'écran 5 puis rouvre
     son lien lirait sinon « l'atelier a vos 0 photos ».

     ⚠️ 25/08 : le compteur de photos ne dit PAS si le dépôt est terminé. Une
     cliente avait monté 55 photos sans jamais cliquer « Envoyer », et cette
     page lui annonçait « l'atelier a vos 55 photos, couverture sous 48 h ».
     C'était faux, et c'est le pire des mensonges possibles ici : elle n'avait
     plus aucune raison de revenir, et personne ne composait rien. */
  const depot: EtapeDepot =
    numero.etat === 'photos_recues'
      ? etapeDepot(numero.consent_photos, numero.nb_photos ?? 0)
      : 'termine'
  const aTerminer = depot === 'abandonne'
  const aAssezDePhotos = (numero.nb_photos ?? 0) >= MIN_PHOTOS
  const sansPhotos = depot === 'vide'
  const attendPhotos = sansPhotos || numero.etat === 'photos_insuffisantes'

  /* Un dépôt resté en plan est chez la cliente, quoi qu'en dise l'état : la
     ligne est en `photos_recues`, mais la balle n'est pas dans notre camp
     tant qu'elle n'a pas envoyé. Même correction que dans la pile de
     l'atelier — c'est le même mensonge des deux côtés. */
  /* T2-13 — même logique, dans l'autre sens : des retouches demandées à
     l'état 4 remettent la balle chez l'atelier, et la ligne « c'est à vous »
     mentirait. La table de travail fait la même bascule (donnees.ts). */
  const retouches = numero.etat === 'maquette_prete' && Boolean(numero.retouches_demandees_le)
  const camp: Camp = depot !== 'termine' ? 'cliente' : retouches ? 'atelier' : QUI_ATTEND[numero.etat]

  return (
    <Coquille titre={titre} avancement={attendPhotos || aTerminer ? 0 : AVANCEMENT[numero.etat] ?? 0}
      camp={camp}
      montrerCamp={numero.etat !== 'apercu_pret'}
      token={numero.token}>
      {numero.etat === 'photos_recues' && depot === 'termine' && (
        <>
          <p className="nu-mot">L’atelier a vos {numero.nb_photos} photos.</p>
          <p className="nu-sub">
            Votre couverture arrive <b>sous 48 h</b>, par mail et sur cette page.
            Vous ne payez qu’après l’avoir vue — et seulement si elle vous plaît.
          </p>
        </>
      )}

      {/* ── LE DÉPÔT RESTÉ EN PLAN ──────────────────────────────────
          Ses photos sont arrivées, son accord non. On le lui dit dans cet
          ordre : d'abord la bonne nouvelle (rien n'est perdu), ensuite le
          geste qui manque. L'inverse se lit comme un reproche. */}
      {aTerminer && (
        <>
          <p className="nu-mot">
            {aAssezDePhotos ? 'Vos photos sont arrivées.' : 'Vos photos sont arrivées, il en manque un peu.'}
          </p>
          <p className="nu-sub">
            {aAssezDePhotos ? (
              <>
                Vos <b>{numero.nb_photos} photos</b> sont bien dans nos mains, en sécurité. Il ne
                manque qu’un geste : votre accord pour qu’on s’en serve. Un clic, et
                l’atelier commence.
              </>
            ) : (
              <>
                Nous en avons <b>{numero.nb_photos}</b>, et rien n’est perdu. Il en faut{' '}
                <b>{MIN_PHOTOS}</b> pour composer un vrai numéro sans répéter deux fois le
                même moment. Reprenez là où vous vous êtes arrêtée.
              </>
            )}
          </p>
          {aAssezDePhotos ? (
            <BoutonEnvoyer token={numero.token} nbPhotos={numero.nb_photos ?? 0} />
          ) : (
            <div className="nu-actions">
              <a className="at-cta" href={`${COMPOSER_HREF}?reprendre=${numero.token}`}>
                Ajouter des photos <span className="at-cta-arrow">→</span>
              </a>
            </div>
          )}
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
                <b>{MIN_PHOTOS} photos</b> au minimum pour composer un numéro — comptez
                deux minutes depuis votre téléphone.
              </>
            ) : (
              <>
                Nous en avons {numero.nb_photos}. À partir de <b>{MIN_PHOTOS}</b>, il y a de
                quoi composer un vrai numéro sans répéter deux fois le même
                moment. Reprenez là où vous vous étiez arrêtée.
              </>
            )}
          </p>
          <div className="nu-actions">
            {/* Reprise du dépôt sur le MÊME dossier : le token voyage dans
                l'URL, l'écran 5 le reconnaît et ne recrée rien. */}
            <a className="at-cta" href={`${COMPOSER_HREF}?reprendre=${numero.token}`}>
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
              {/* Les deux textes (l'attente, puis « plus long que prévu »)
                  vivent dans AttentePaiement : c'est lui qui sait où en sont
                  les essais, et le lecteur d'écran doit entendre le
                  basculement sans que la page ne bouge. */}
              <AttentePaiement contactEmail={CONTACT_EMAIL} />
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
            plat={apercu?.plat ?? null}
            c1={apercu?.c1 ?? null}
            c4={apercu?.c4 ?? null}
            doubles={apercu?.doubles ?? []}
          />

          {!retourDePaiement && (
            <CasesEtCommande
              token={numero.token}
              nbPages={numero.nb_pages}
              euros={euros}
              cgvOk={numero.cgv_ok}
              renonciation={numero.renonciation_retractation}
              joursComposition={JOURS_COMPOSITION}
              joursLivraison={JOURS_LIVRAISON}
            />
          )}
        </>
      )}

      {numero.etat === 'payee' && (
        /* T2-10 — « Reçu. On compose. » était sec pour quelqu'un qui vient
           de payer 40 €. On remercie, puis trois lignes aérées : c'est payé,
           voilà ce qui se passe, voilà comment demander un détail. Les
           chiffres viennent de DELAIS, jamais en dur. */
        <>
          <p className="nu-mot">Merci.</p>
          <p className="nu-sub">
            Votre paiement est bien reçu. L’atelier compose maintenant votre
            numéro complet.
          </p>
          <p className="nu-sub">
            Il vous attend ici <b>sous {JOURS_COMPOSITION} jours ouvrés</b>, et
            vous serez prévenue par mail.
          </p>
          {numero.facture_url && (
            <p className="nu-sub">
              <a className="nu-lien" href={numero.facture_url} target="_blank" rel="noopener noreferrer">
                Votre facture
              </a>
              , hébergée par Stripe, reste accessible ici à tout moment.
            </p>
          )}
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
            retouchesLe={numero.retouches_demandees_le}
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
            {(numero.tracking_url || numero.tracking_code) && (
              <>
                <dt>Suivi</dt>
                <dd>
                  {numero.tracking_url ? (
                    <a
                      className="nu-lien"
                      href={numero.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Suivre le colis
                    </a>
                  ) : null}
                  {/* Le numéro reste écrit même quand le lien existe : c'est
                      lui qu'on recopie dans l'application du transporteur, et
                      c'est tout ce qui reste quand on ne sait pas construire
                      le lien. */}
                  {numero.tracking_code ? (
                    <span className="nu-suivi-code">{numero.tracking_code}</span>
                  ) : null}
                </dd>
              </>
            )}
          </dl>
        </>
      )}

      {numero.etat === 'livree' && (
        <>
          {numero.souvenir_pdf_key && (
            /* Le magazine numérique (03/09). C'est ICI que M7b atterrit : le
               mail n'envoie plus sur le fichier lui-même, qui se téléchargeait
               en laissant un onglet BLANC (Content-Disposition: attachment ne
               rend aucune page). Le mail fait le clic, la page fait le
               spectacle — la doctrine de mails-atelier.mjs.

               Le lien passe par la route qui re-signe au clic, jamais une URL
               R2 : elle serait morte à la réouverture. Le poids est annoncé —
               c'est le fichier d'impression, lourd, et un téléphone en 4G doit
               le savoir avant de lancer le téléchargement. */
            <>
              <p className="nu-mot">{titre} est chez vous.</p>
              <p className="nu-sub">
                Il existe aussi en numérique : le même magazine, en PDF, à
                garder et à faire suivre.
                {numero.souvenir_pdf_octets
                  ? ` Le fichier pèse ${Math.max(1, Math.round(numero.souvenir_pdf_octets / (1024 * 1024)))} Mo : le wifi lui va mieux.`
                  : ''}
              </p>
              <div className="nu-actions nu-actions--suivi-dun-bloc">
                <a className="at-cta" href={`/api/atelier/souvenir?token=${numero.token}`}>
                  Télécharger mon magazine en PDF
                </a>
              </div>
            </>
          )}
          <p className="nu-mot">Et le prochain moment ?</p>
          <p className="nu-sub">
            {numero.souvenir_pdf_key ? '' : `${titre} est chez vous. `}
            Un numéro par moment : la collection commence au deuxième.
          </p>
          <div className="nu-actions">
            <a className="at-cta" href={COMPOSER_HREF}>
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
  camp,
  montrerCamp = true,
  token,
  children,
}: {
  titre: string
  /* -1 = on ne sait pas où en est le dossier : le fil disparaît plutôt que
     de mentir. */
  avancement: number
  camp: Camp
  /* Le mot « c'est à vous / à nous » a du sens sur les étapes d'attente ;
     sur la page qui vend (apercu_pret), il double le titre « Votre couverture »
     et sonne comme un slogan. La page le masque là (02/09). */
  montrerCamp?: boolean
  token: string
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

        {montrerCamp && MOT_DU_CAMP[camp] && <p className="nu-camp">{MOT_DU_CAMP[camp]}</p>}

        {children}

        {/* ── LE LIEN, ET LA CONSIGNE DE LE GARDER ──────────────────────
            Il n'y a pas de compte, pas de mot de passe : ce lien EST son
            espace client (PRD §7.5). Elle le reçoit une fois, dans un mail
            qui peut tomber en Promotions.
            T2-12 : l'URL en toutes lettres ne donnait aucun geste à faire —
            deux boutons le donnent, l'URL n'apparaît plus en clair. */}
        <p className="nu-garde">
          <b>Gardez ce lien.</b> C’est le seul, il suit votre numéro jusqu’à la livraison, et
          il ne demande ni compte ni mot de passe.
          <LienPartage url={`${SITE_URL_PUBLIC}/numero/${token}`} />
        </p>
      </main>

      <Footer />
    </div>
  )
}
