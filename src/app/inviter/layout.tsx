import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../(atelier)/theme.css'

/* /inviter est un Client Component (page.tsx "use client") → il ne peut pas
   exporter de metadata. Ce layout Server Component pose le noindex pour empêcher
   l'indexation des URLs ?ref=CODE (variantes infinies / contenu mince).
   Charte V2 (26/11) : le seul wrapper est le scope `.bj-atelier` (fond blanc de la
   page entière, jetons et titres de la charte). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function InviterLayout({ children }: { children: ReactNode }) {
  return <div className="bj-atelier">{children}</div>
}
