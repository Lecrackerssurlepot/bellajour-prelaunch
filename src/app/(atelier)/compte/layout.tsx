import type { Metadata } from 'next'

/* L'espace compte est PERSONNEL : rien à indexer, jamais. Même doctrine que
   /composer et /numero — un moteur qui garde en cache une page de compte
   garde une porte. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function CompteLayout({ children }: { children: React.ReactNode }) {
  return children
}
