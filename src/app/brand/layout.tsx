import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../../../brand/build/tokens.css'
import './brand.css'
import { classesPolices } from '../polices'

/* La vitrine de la charte V2. Réservée à Mathias et Louis : le middleware exige
   le cookie admin, et la page ne s'indexe pas (défense en profondeur). */
export const metadata: Metadata = {
  title: 'Charte Bellajour',
  robots: { index: false, follow: false, nocache: true },
}

export default function BrandLayout({ children }: { children: ReactNode }) {
  return <div className={`ch ${classesPolices}`}>{children}</div>
}
