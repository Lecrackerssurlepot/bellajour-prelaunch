import type { ReactNode } from 'react'
import { cormorantCremeClassName } from '../creme-fonts'

/* T-064 — Cormorant du monde CRÈME posée ICI, pas au layout racine : elle
   couvre /ambassadeurs/charte et /ambassadeurs/espace en un seul geste.
   Passthrough visuel : chaque page pose déjà son propre <main>, un <div> nu
   de plus ne change aucune mise en page.
   ⚠️ Depuis le 08/09/2026 (T-067), /ambassadeurs lui-même n'est PLUS une
   page : c'est un `route.ts` qui rend 410 (Cercle Ambassadeur clos). Un
   Route Handler n'entre jamais dans l'arbre de layout — ce layout ne
   l'enveloppe donc plus, et son HTML inline ne porte pas cette police. */
export default function AmbassadeursLayout({ children }: { children: ReactNode }) {
  return <div className={cormorantCremeClassName}>{children}</div>
}
