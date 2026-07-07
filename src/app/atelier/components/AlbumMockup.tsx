'use client'

/* Mockup album partagé — placeholder élégant V1 (fond #2A2828, ratio 21×27).
   Bascule automatiquement sur <img> quand ASSETS.mockupAlbum sera livré.
   Variants : hero (grand, flottant) · editor (interactif S4) · thumb (mini S5). */

import './album-mockup.css'
import {
  ALBUM_RATIO,
  ASSETS,
  BINDING_COLORS,
  HERO_MOCKUP_SIZE,
  type BindingColorId,
} from '../constants'

interface AlbumMockupProps {
  variant: 'hero' | 'editor' | 'thumb'
  couleur?: BindingColorId
  titre?: string
  float?: boolean
  label?: string
}

export default function AlbumMockup({
  variant,
  couleur,
  titre,
  float = false,
  label = 'votre album',
}: AlbumMockupProps) {
  const hex = couleur ? BINDING_COLORS.find((c) => c.id === couleur)?.hex : undefined

  /* Hero : vrai asset (WebP transparent) — image en flux, dimensions
     intrinsèques réservées, pas de lazy (image critique du hero).
     Le float continu reste sur le conteneur. */
  if (variant === 'hero' && ASSETS.mockupHero) {
    return (
      <div className={`at-mockup at-mockup--hero${float ? ' at-mockup--float' : ''}`}>
        <img
          className="at-mockup-hero-img"
          src={ASSETS.mockupHero}
          alt=""
          width={HERO_MOCKUP_SIZE.width}
          height={HERO_MOCKUP_SIZE.height}
          fetchPriority="high"
          decoding="async"
          draggable={false}
        />
      </div>
    )
  }

  return (
    <div
      className={`at-mockup at-mockup--${variant}${float ? ' at-mockup--float' : ''}`}
    >
      <div className="at-mockup-cover" style={{ aspectRatio: ALBUM_RATIO }}>
        {ASSETS.mockupAlbum ? (
          <img
            className="at-mockup-img"
            src={ASSETS.mockupAlbum}
            alt=""
            decoding="async"
            draggable={false}
          />
        ) : (
          <span className="at-mockup-note at-label">{label}</span>
        )}
        <span
          className="at-mockup-spine"
          style={hex ? { backgroundColor: hex } : undefined}
          aria-hidden="true"
        />
        {titre ? <span className="at-mockup-titre">{titre}</span> : null}
      </div>
    </div>
  )
}
