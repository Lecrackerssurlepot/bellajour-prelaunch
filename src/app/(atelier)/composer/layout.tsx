/* Le questionnaire est en noindex — PRD §16. Il hérite du scope .bj-atelier
   et des polices du layout parent (src/app/atelier/layout.tsx). */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Composer avec l’atelier — Bellajour',
  robots: { index: false, follow: false },
}

export default function ComposerLayout({ children }: { children: React.ReactNode }) {
  return children
}
