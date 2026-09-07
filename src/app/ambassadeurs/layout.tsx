import type { ReactNode } from 'react'
import { cormorantCremeClassName } from '../creme-fonts'

/* T-064 — Cormorant du monde CRÈME posée ICI, pas au layout racine : elle
   couvre /ambassadeurs, /ambassadeurs/charte et /ambassadeurs/espace en un
   seul geste. Passthrough visuel : chaque page pose déjà son propre <main>,
   un <div> nu de plus ne change aucune mise en page. */
export default function AmbassadeursLayout({ children }: { children: ReactNode }) {
  return <div className={cormorantCremeClassName}>{children}</div>
}
