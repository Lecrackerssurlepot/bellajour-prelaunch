'use client'

import { useState } from 'react'
import './s4-reservation.css'
import { OFFER_STATE, PRIX_ALBUM_BASE, placesRestantes } from './offer-state'

/* PRD §5.4 + §3 — S4 Réservation fondatrice (handoff).
   Machine à états : rend UN seul mode à la fois selon OFFER_STATE.offerMode.
   ⚠️ Seuls les montants client-facing sont ici. Aucune donnée interne (marges,
   commissions, coûts de production). Bouton handoff INERTE (pas d'appel /api/checkout). */

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

function FeatureRow({ label, value }: { label: string; value: FeatureValue }) {
  let display: React.ReactNode
  if (value === true) display = <span className="s4-feat-yes" aria-label="inclus">✓</span>
  else if (value === false) display = <span className="s4-feat-no" aria-label="non inclus">—</span>
  else display = <span className="s4-feat-val">{value}</span>
  return (
    <li className="s4-feat">
      <span className="s4-feat-label">{label}</span>
      {display}
    </li>
  )
}

/* Ligne parrainage pleine largeur : « parrainage » est un lien bleu cliquable.
   Cible branchée plus tard (même logique que le lien CGV — emplacement prévu). */
function ParrainageRow({ pages }: { pages: number }) {
  return (
    <li className="s4-feat s4-feat--parrain">
      Accès{' '}
      <a
        className="s4-parrain-link"
        href="#parrainage"
        // TODO: brancher infos parrainage
      >
        parrainage
      </a>{' '}
      : jusqu’à {pages} pages (= {pages} €) offertes par commande
    </li>
  )
}

function OffreCard({
  offre,
  secondary = false,
  places,
  checkout,
}: {
  offre: Offre
  secondary?: boolean
  places?: number
  checkout?: React.ReactNode
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
          <FeatureRow key={f.label} label={f.label} value={f.value} />
        ))}
        {typeof offre.parrainagePages === 'number' && (
          <ParrainageRow pages={offre.parrainagePages} />
        )}
      </ul>

      {/* Checkout (CGV + bouton) vit DANS l'encart actionnable — jamais détaché. */}
      {checkout}
    </article>
  )
}

export default function S4Reservation() {
  const [cgv, setCgv] = useState(false)
  const { offerMode } = OFFER_STATE
  const places = placesRestantes(OFFER_STATE)

  /* Handoff INERTE — sera branché plus tard sur POST /api/checkout (PRD §6). */
  const handleReserver = () => {
    /* no-op : scaffold. Le handoff backend n'est pas câblé. */
  }

  /* Checkout = CGV + bouton. Rendu À L'INTÉRIEUR de l'encart actionnable (règle D). */
  const checkout = (
    <div className="s4-checkout">
      <label className="s4-cgv">
        <input
          type="checkbox"
          checked={cgv}
          onChange={(e) => setCgv(e.target.checked)}
        />
        <span>
          J’accepte les{' '}
          {/* Lien CGV branché plus tard (avec Louis) — emplacement prévu. */}
          <a href="#" className="s4-cgv-link">conditions générales de vente</a>
        </span>
      </label>

      <button
        type="button"
        className="s4-reserver"
        disabled={!cgv}
        onClick={handleReserver}
      >
        Réserver mon acompte
      </button>
    </div>
  )

  /* Le front rend ce que offerMode dit (PRD §3.3) — il ne décide pas du mode. */
  let cards: React.ReactNode
  if (offerMode === 'founder') {
    cards = (
      <div className="s4-cards s4-cards--duo">
        <OffreCard offre={OFFRE_FOUNDER} places={places} checkout={checkout} />
        {/* Standard — repoussoir visuel (desktop only). Masquée mobile, non actionnable
            (aucun bouton). Réactivable plus tard pour la rendre visible sur mobile. */}
        <OffreCard offre={OFFRE_STANDARD} secondary />
      </div>
    )
  } else if (offerMode === 'soldout') {
    cards = (
      <div className="s4-cards s4-cards--solo">
        <OffreCard offre={OFFRE_STANDARD} checkout={checkout} />
      </div>
    )
  } else {
    cards = (
      <div className="s4-cards s4-cards--solo">
        <OffreCard offre={OFFRE_INFLUENCER} checkout={checkout} />
      </div>
    )
  }

  return (
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
  )
}
