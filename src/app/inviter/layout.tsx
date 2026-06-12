import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/* /inviter est un Client Component (page.tsx "use client") → il ne peut pas
   exporter de metadata. Ce layout Server Component pose le noindex pour empêcher
   l'indexation des URLs ?ref=CODE (variantes infinies / contenu mince).
   Passthrough pur : aucun wrapper visuel. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function InviterLayout({ children }: { children: ReactNode }) {
  return children
}
