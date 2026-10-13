/* /admin/collectif — le back-office de l'Édition collective (monde CRÈME).

   Le middleware protège déjà tout `/admin/*` (cookie `bj_admin`) ; ce layout
   n'ajoute que l'interrupteur : sans `COLLECTIF_OUVERT`, la section n'existe
   pas (404), et le lien de la table de travail n'est pas affiché non plus
   (admin/atelier/page.tsx). Chaque page revérifie l'admin elle-même. */

import { notFound } from 'next/navigation'
import { collectifOuvert } from '@/lib/collectif/interrupteur'

export default function CollectifAdminLayout({ children }: { children: React.ReactNode }) {
  if (!collectifOuvert()) notFound()
  return children
}
