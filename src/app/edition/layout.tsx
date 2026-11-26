/* Layout de l'espace client de l'Édition collective (/edition/[token]).

   L'INTERRUPTEUR D'ABORD. Sans `COLLECTIF_OUVERT`, rien du B2B n'existe :
   `notFound()` est levé ICI, dans le layout, avant que la moindre silhouette
   (`loading.tsx`) ne parte. La réponse est donc un vrai 404, pas un 200
   déguisé (PRD §11, recette de la phase 0).

   POURQUOI CE FICHIER RESSEMBLE À numero/layout.tsx
   /edition ne vit pas dans le groupe (atelier) : un lien d'édition est privé,
   long à vivre, et n'a rien à faire sous le tunnel de vente. On recopie donc
   les choses qui comptent : le scope .bj-atelier (tokens de theme.css, que
   `espace.css` redéfinit en papier), le noindex. Le scope propre au B2B est
   `.ec-espace` : toute feuille du collectif s'écrit sous lui, parce qu'une
   feuille chargée ne se décharge JAMAIS en navigation client et repeindrait
   les pages du B2C.

   ⚠️ LES POLICES SONT LES JUMELLES EXACTES de (atelier)/layout.tsx : Turbopack
   fusionne les modules de police dans un chunk partagé, et une face de plus
   déclarée ici serait préchargée sur `/` et /magazine (T-059). Les maquettes
   dessinent la Cormorant en 500 : on reste en 400, comme le reste du monde
   sombre.

   UN SEUL MODE, LE PAPIER (charte V2, 26/11/2026). La bascule jour / nuit et son
   cookie ont disparu : voir archive/charte-v1-interfaces/. Les polices sont
   celles de la charte, posées à la racine (`polices.ts`). */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { collectifOuvert } from '@/lib/collectif/interrupteur'
import RacineEspace from './_composants/RacineEspace'
import '../(atelier)/theme.css'

export const metadata: Metadata = {
  title: 'Édition collective · Bellajour',
  /* Trois jetons au porteur dans des URL : rien ne s'indexe, et rien ne part
     dans l'en-tête Referer d'un lien sortant (le rendez-vous Google, le site
     du transporteur). Sous `[token]`, `generateMetadata` met le nom de l'événement. */
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
}

export default function EditionLayout({ children }: { children: React.ReactNode }) {
  if (!collectifOuvert()) notFound()
  return (
    <RacineEspace className="bj-atelier ec-espace">
      {children}
    </RacineEspace>
  )
}
