/* /noel-preview — les visuels de Noël 2026, à juger avant toute mécanique.

   Une page INTERNE : rien n'y paie, rien n'y écrit, rien n'y envoie. Aucun
   appel Stripe, Supabase ou Brevo ; les montants et le nombre de places sont
   des valeurs d'exemple, dites comme telles à l'écran.

   Deux verrous, dans cet ordre :
   1. le drapeau `NEXT_PUBLIC_GIFT_CARD_ENABLED`, éteint par défaut : sans lui
      la page n'existe pas (404). Il est INLINÉ au build (préfixe
      NEXT_PUBLIC_) : le poser sur Vercel demande un redéploiement ;
   2. la session admin (`bj_admin`), comme chaque page de l'atelier. Le
      middleware ne couvre que `/admin/*` : la page se garde elle-même.

   Elle vit dans le groupe (atelier) pour hériter de `.bj-atelier`, des
   jetons sombres et des deux polices, sans rien redéclarer. */

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { quiEstConnecte } from '@/lib/admin-session'
import { lireInterrupteur } from '@/lib/collectif/interrupteur'
import Apercu from './Apercu'
import './noel.css'

export const metadata: Metadata = {
  title: 'Noël 2026 — aperçu',
  robots: { index: false, follow: false },
}

export default async function NoelPreviewPage() {
  if (!lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert) notFound()
  const qui = await quiEstConnecte()
  if (!qui) redirect('/admin/login')
  return <Apercu />
}
