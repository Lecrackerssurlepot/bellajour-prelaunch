'use client'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { cheminPublic } from '@/lib/analytics/chemin'

/* Mesure d'audience — Vercel Web Analytics + Speed Insights.
   Monté une seule fois, dans le layout RACINE, sous <body>.

   INERTE TANT QUE MATHIAS N'A PAS CLIQUÉ. Le composant se contente d'injecter
   deux <script src="/_vercel/insights/script.js"> et ".../speed-insights/…" ;
   ces chemins ne sont servis par l'edge de Vercel QUE si la fonctionnalité est
   activée dans le tableau de bord du projet. Tant qu'elle ne l'est pas, les
   deux balises répondent 404, le paquet écrit une ligne dans la console et
   plus rien ne se passe : aucune requête sortante, aucun rendu modifié, aucun
   effet sur la page. Le retrait est tout aussi simple (une ligne du layout).

   RIEN EN DÉVELOPPEMENT. Sans le garde ci-dessous, `mode: 'auto'` du paquet
   bascule sur script.debug.js — servi par va.vercel-scripts.com, donc une vraie
   requête vers un tiers depuis le Mac, plus du bruit dans la console à chaque
   navigation. On préfère zéro. `next build` pose NODE_ENV=production, le garde
   ne peut donc pas éteindre la mesure en ligne par accident.
   Contrepartie assumée : les déploiements de PREVIEW mesurent eux aussi. C'est
   voulu — c'est le seul moyen de vérifier que le masquage marche avant la prod,
   et ce trafic-là, c'est Mathias tout seul.

   LE TOKEN NE SORT PAS. Les deux scripts envoient `location.href` TEL QUEL.
   `beforeSend` est le seul point où on peut le réécrire, et il est branché sur
   le module pur `@/lib/analytics/chemin`. Voir ce fichier pour le détail. */

/* Une seule fonction pour les deux paquets : leurs types d'événement diffèrent
   ('pageview' | 'event' d'un côté, 'vital' de l'autre) mais tous deux portent
   `url` et acceptent qu'on renvoie l'événement modifié, ou `null` pour
   l'annuler. Le générique dit exactement ça, sans `any` ni cast. */
function masquer<E extends { url: string }>(evenement: E): E | null {
  const url = cheminPublic(evenement.url)
  return url === null ? null : { ...evenement, url }
}

export default function Mesure() {
  if (process.env.NODE_ENV !== 'production') return null

  return (
    <>
      <Analytics beforeSend={masquer} />
      <SpeedInsights beforeSend={masquer} />
    </>
  )
}
