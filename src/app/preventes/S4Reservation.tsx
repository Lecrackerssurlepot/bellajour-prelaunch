'use client'

import { useEffect, useState } from 'react'
import './s4-reservation.css'
import { DEFAULT_OFFER_STATE, PRIX_ALBUM_BASE, placesRestantes } from './offer-state'
import type { OfferState } from './offer-state'
import { isValidRefCode } from '@/lib/validation'
import ReservationModal from './ReservationModal'
import InfoSheet from './InfoSheet'

type InfoKind = 'instants' | 'parrainage'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* PRD §5.4 + §3 — S4 Réservation fondatrice (handoff).
   Machine à états : rend UN seul mode à la fois selon l'état serveur
   (GET /api/offer-state). Le bouton « Réserver » câble POST /api/checkout.
   ⚠️ Seuls les montants client-facing sont ici. Aucune donnée interne (marges,
   commissions, coûts de production). */

type FeatureValue = string | boolean

interface Offre {
  type: 'founder' | 'standard' | 'influencer'
  nom: string
  badge?: string
  acompte: number
  acompteBarre?: number // prix barré (Fondateur uniquement : 30 → 25)
  acompteNote?: string
  features: { label: string; value: FeatureValue }[]
  /* Ligne parrainage (pleine largeur, mot « parrainage » cliquable) : pages offertes par commande. */
  parrainagePages?: number
}

const FEATURE_LABELS = {
  credite: 'Crédité sur commande',
  statut: 'Statut',
  illustration: 'Illustration Midjourney offerte',
  instants: 'Instants crédités',
  livraison: 'Livraison offerte',
  digital: 'Version digitale HD',
} as const

const OFFRE_FOUNDER: Offre = {
  type: 'founder',
  nom: 'Offre Fondateur',
  badge: 'Fondateur',
  acompte: 25,
  acompteBarre: 30,
  features: [
    { label: FEATURE_LABELS.credite, value: '30 €' },
    { label: FEATURE_LABELS.illustration, value: true },
    { label: FEATURE_LABELS.instants, value: '200' },
    { label: FEATURE_LABELS.livraison, value: true },
    { label: FEATURE_LABELS.digital, value: true },
  ],
  parrainagePages: 20,
}

const OFFRE_STANDARD: Offre = {
  type: 'standard',
  nom: 'Offre Standard',
  acompte: 30,
  features: [
    { label: FEATURE_LABELS.credite, value: '30 €' },
    { label: FEATURE_LABELS.statut, value: false },
    { label: FEATURE_LABELS.illustration, value: false },
    { label: FEATURE_LABELS.instants, value: '100' },
    { label: FEATURE_LABELS.livraison, value: true },
    { label: FEATURE_LABELS.digital, value: true },
  ],
  parrainagePages: 20,
}

const OFFRE_INFLUENCER: Offre = {
  type: 'influencer',
  nom: 'Offre Influenceur',
  acompte: 25,
  acompteNote: 'via votre code',
  features: [
    { label: FEATURE_LABELS.credite, value: '30 €' },
    { label: FEATURE_LABELS.statut, value: false },
    { label: FEATURE_LABELS.illustration, value: false },
    { label: FEATURE_LABELS.instants, value: '100' },
    { label: FEATURE_LABELS.livraison, value: true },
    { label: FEATURE_LABELS.digital, value: true },
  ],
}

function FeatureRow({
  label,
  value,
  onInstants,
}: {
  label: string
  value: FeatureValue
  onInstants?: () => void
}) {
  let display: React.ReactNode
  if (value === true) display = <span className="s4-feat-yes" aria-label="inclus">✓</span>
  else if (value === false) display = <span className="s4-feat-no" aria-label="non inclus">—</span>
  else display = <span className="s4-feat-val">{value}</span>

  /* Mot « Instants » cliquable : on cible explicitement le mot lui-même (pas un
     split positionnel) → reste correct même si l'ordre du wording du label change. */
  let labelNode: React.ReactNode = label
  if (onInstants) {
    labelNode = label.split(/(Instants)/).map((part, i) =>
      part === 'Instants' ? (
        <button key={i} type="button" className="s4-parrain-link" onClick={onInstants}>
          {part}
        </button>
      ) : (
        part
      ),
    )
  }

  return (
    <li className="s4-feat">
      <span className="s4-feat-label">{labelNode}</span>
      {display}
    </li>
  )
}

/* Ligne parrainage pleine largeur : « parrainage » est un lien bleu cliquable
   qui ouvre l'encart info parrainage (InfoSheet) via onParrainage. */
function ParrainageRow({ pages, onParrainage }: { pages: number; onParrainage: () => void }) {
  return (
    <li className="s4-feat s4-feat--parrain">
      Accès{' '}
      <button type="button" className="s4-parrain-link" onClick={onParrainage}>
        parrainage
      </button>{' '}
      : jusqu’à {pages} pages (= {pages} €) offertes par commande
    </li>
  )
}

function OffreCard({
  offre,
  secondary = false,
  places,
  checkout,
  onInfo,
}: {
  offre: Offre
  secondary?: boolean
  places?: number
  checkout?: React.ReactNode
  onInfo: (k: InfoKind) => void
}) {
  return (
    <article
      className={`s4-card${secondary ? ' s4-card--secondary' : ''}`}
      aria-hidden={secondary || undefined}
    >
      {offre.badge && <span className="s4-card-badge">{offre.badge}</span>}
      <h3 className="s4-card-nom">{offre.nom}</h3>

      <div className="s4-card-price">
        {offre.acompteBarre && (
          <span className="s4-card-price-old">{offre.acompteBarre} €</span>
        )}
        <span className="s4-card-price-now">{offre.acompte} €</span>
        <span className="s4-card-price-unit">d’acompte</span>
      </div>
      {offre.acompteNote && <p className="s4-card-price-note">{offre.acompteNote}</p>}

      {typeof places === 'number' && (
        <p className="s4-card-places">{places} places restantes</p>
      )}

      <ul className="s4-card-feats">
        {offre.features.map((f) => (
          <FeatureRow
            key={f.label}
            label={f.label}
            value={f.value}
            onInstants={f.label === FEATURE_LABELS.instants ? () => onInfo('instants') : undefined}
          />
        ))}
        {typeof offre.parrainagePages === 'number' && (
          <ParrainageRow pages={offre.parrainagePages} onParrainage={() => onInfo('parrainage')} />
        )}
      </ul>

      {/* Checkout (CGV + bouton) vit DANS l'encart actionnable — jamais détaché. */}
      {checkout}
    </article>
  )
}

export default function S4Reservation() {
  const [offer, setOffer] = useState<OfferState | null>(null) // null = chargement (skeleton) — jamais d'offre flashée
  const [cgv, setCgv] = useState(false)
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referredBy, setReferredBy] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false) // encart de réservation (prénom/email/CGV)
  const [info, setInfo] = useState<InfoKind | null>(null) // encart info (Instants / parrainage)

  /* Parrainage CLIENT : retrouver le code parrain pour le transmettre au checkout.
     Depuis la bascule du 13 juin, les liens partagés pointent directement vers /preventes
     (/preventes?ref=BJ-XXXX) — le ?ref= est donc normalement PRÉSENT dans l'URL. Source
     PRINCIPALE = ?ref= URL ; fallback sessionStorage « bellajour_referral » (posé par la
     landing tant qu'elle existe, ou conservé après la redirection 307 / → /preventes,
     même clé/forme {code, prenom} que FinalWaitlist). On ne retient qu'un code bien formé
     (isValidRefCode, préfixe BJ-) ; le backend re-valide de toute façon. */
  useEffect(() => {
    const urlRef = new URLSearchParams(window.location.search).get('ref')
    let stored: string | null = null
    try {
      const raw = sessionStorage.getItem('bellajour_referral')
      if (raw) {
        const parsed = JSON.parse(raw) as { code?: string }
        stored = typeof parsed?.code === 'string' ? parsed.code : null
      }
    } catch { /* sessionStorage indispo (Safari privé) — no-op */ }

    const code = (urlRef || stored || '').trim()
    if (code && isValidRefCode(code)) setReferredBy(code)
  }, [])

  /* État de l'offre = autorité serveur (GET /api/offer-state). Fallback résilient
     si fetch KO → la page ne casse jamais. Réutilisé sur 409 offer_changed pour
     réafficher la bonne offre. */
  const refetchOffer = async () => {
    try {
      const res = await fetch('/api/offer-state')
      if (!res.ok) throw new Error('offer-state ' + res.status)
      const data = await res.json()
      setOffer({
        offerMode: data.offerMode,
        foundersConfirmed: data.foundersConfirmed,
        foundersTotal: data.foundersTotal,
        influencer: null,
      })
    } catch (e) {
      console.error('[s4] offer-state fetch failed', e)
      setOffer(DEFAULT_OFFER_STATE)
    }
  }

  useEffect(() => {
    refetchOffer()
  }, [])

  const emailValid = EMAIL_RE.test(email.trim())
  const prenomValid = prenom.trim().length > 0

  /* Handoff POST /api/checkout. Le SERVEUR décide l'offre ; on envoie l'offre
     affichée en expected_offer. Email en BODY uniquement (jamais en query string). */
  const handleReserver = async () => {
    if (!offer) return
    const expectedOffer = offer.offerMode === 'soldout' ? 'standard' : offer.offerMode

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: prenom.trim(),
          email: email.trim(),
          cgv_accepted: cgv,
          expected_offer: expectedOffer,
          // Parrainage CLIENT : transmis seulement si présent et bien formé. Absent → omis.
          ...(referredBy ? { referred_by: referredBy } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data.checkout_url) {
        // Succès → Stripe. submitting reste true : bouton verrouillé pendant la
        // navigation (anti double-submit).
        window.location.href = data.checkout_url
        return
      }

      if (res.status === 409 && data.error === 'offer_changed') {
        await refetchOffer()
        setError("L’offre a changé entre-temps. Nous avons mis à jour l’offre affichée — vérifiez puis réessayez.")
      } else if (res.status === 409 && data.error === 'already_purchased') {
        setError('Cet email a déjà réservé son acompte. Aucun nouveau paiement n’est nécessaire.')
      } else if (res.status === 400 && data.error === 'invalid_email') {
        setError('Adresse email invalide. Vérifiez votre saisie.')
      } else {
        setError('Une erreur est survenue. Merci de réessayer dans un instant.')
      }
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.')
    }
    setSubmitting(false)
  }

  /* Checkout = bouton d'ouverture de l'encart. Rendu À L'INTÉRIEUR de l'encart
     actionnable (règle D). Les champs prénom/email/CGV + le handoff vivent désormais
     dans le modal (<ReservationModal>), déclenché par ce bouton. */
  const checkout = (
    <div className="s4-checkout">
      <button
        type="button"
        className="s4-reserver"
        onClick={() => setModalOpen(true)}
      >
        Réserver mon acompte
      </button>
    </div>
  )

  /* Le front rend ce que offerMode dit (PRD §3.3) — il ne décide pas du mode.
     Tant que l'état réel n'est pas arrivé (offer === null) → skeleton neutre :
     jamais l'offre Fondateur flashée (le résultat final peut être soldout). */
  let cards: React.ReactNode
  if (offer === null) {
    cards = (
      <div className="s4-cards s4-cards--solo" aria-busy="true">
        <div className="s4-card s4-cards-skeleton" aria-hidden="true" />
      </div>
    )
  } else if (offer.offerMode === 'founder') {
    cards = (
      <div className="s4-cards s4-cards--duo">
        <OffreCard offre={OFFRE_FOUNDER} places={placesRestantes(offer)} checkout={checkout} onInfo={setInfo} />
        {/* Standard — repoussoir visuel (desktop only). Masquée mobile, non actionnable
            (aucun bouton). Réactivable plus tard pour la rendre visible sur mobile. */}
        <OffreCard offre={OFFRE_STANDARD} secondary onInfo={setInfo} />
      </div>
    )
  } else if (offer.offerMode === 'soldout') {
    cards = (
      <div className="s4-cards s4-cards--solo">
        {/* Carte seule (Fondateur épuisé) : on valorise « l'offre du moment »
            plutôt qu'un choix par défaut → libellé « Offre Prévente ».
            Le repoussoir en mode founder garde « Offre Standard » (contraste). */}
        <OffreCard offre={{ ...OFFRE_STANDARD, nom: 'Offre Prévente' }} checkout={checkout} onInfo={setInfo} />
      </div>
    )
  } else {
    cards = (
      <div className="s4-cards s4-cards--solo">
        <OffreCard offre={OFFRE_INFLUENCER} checkout={checkout} onInfo={setInfo} />
      </div>
    )
  }

  return (
    <>
    <section id="s4" className="s4" data-section="s4-reservation" data-theme="light">
      <div className="s4-inner">

        <header className="s4-head">
          <h2 className="s4-title">Pré-commandez dès maintenant votre album Bellajour</h2>
          <p className="s4-subtitle">
            Lancement le <strong>15 août</strong>, date à laquelle vous pourrez concevoir votre premier album
          </p>
        </header>

        {cards}

        <p className="s4-credit-note">
          Votre acompte est <strong>intégralement crédité</strong> sur la commande finale.
          L’album se règle ensuite au prix grille selon le nombre de pages (base 30 pages),
          à partir de {PRIX_ALBUM_BASE} €.
        </p>

      </div>
    </section>

    <ReservationModal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      prenom={prenom}
      setPrenom={setPrenom}
      email={email}
      setEmail={setEmail}
      cgv={cgv}
      setCgv={setCgv}
      prenomValid={prenomValid}
      emailValid={emailValid}
      submitting={submitting}
      error={error}
      onSubmit={handleReserver}
    />

    <InfoSheet
      open={info !== null}
      onClose={() => setInfo(null)}
      title={info === 'instants' ? 'Les Instants' : 'Le parrainage'}
    >
      {info === 'instants' ? (
        <p>
          Les Instants sont des points que vous cumulez à chaque commande. Ils vous donnent
          accès à des avantages : offres dédiées, produits offerts, et bien plus.
        </p>
      ) : (
        <p>
          <strong>1 page = 1€</strong>. Parrainer offre 5 pages à vous, 3 à votre filleul.
          Cumulable à l’infini (jusqu’à 20 pages par commande). Le reste est crédité pour vos
          prochaines commandes !
        </p>
      )}
    </InfoSheet>
    </>
  )
}
