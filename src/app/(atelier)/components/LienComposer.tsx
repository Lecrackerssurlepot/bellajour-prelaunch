'use client'

/* Le bouton vers /composer, conscient du brouillon (03/09/2026).
   Quand une composition est en cours sur l'appareil (draftEnCours), le
   libellé devient « Continuer la composition » : la promesse dit ce qui va
   réellement se passer — /composer rouvre le brouillon exactement où il
   s'était arrêté, sans paramètre, sans compte.

   Même mécanique que `navigator.share` dans LienPartage
   (useSyncExternalStore) : le rendu serveur porte le libellé de départ, le
   client la vérité — sans setState d'hydratation, que le lint refuse.

   ⚠️ Toujours COMPOSER_HREF nu : `?reprendre=` n'appartient qu'aux liens
   de /numero (voir content.ts). */

import { useSyncExternalStore } from 'react'
import { COMPOSER_HREF, CTA_LABEL, CTA_REPRISE_LABEL } from '../content'
import { draftEnCours } from '../composer/draft'

const RIEN = () => () => {}

export default function LienComposer({ className = 'at-cta' }: { className?: string }) {
  const reprise = useSyncExternalStore(RIEN, draftEnCours, () => false)
  const label = reprise ? CTA_REPRISE_LABEL : CTA_LABEL
  return (
    <a className={className} href={COMPOSER_HREF}>
      {label} <span className="at-cta-arrow" aria-hidden="true">→</span>
    </a>
  )
}
