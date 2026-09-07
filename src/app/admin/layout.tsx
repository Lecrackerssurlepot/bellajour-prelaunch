import type { ReactNode } from 'react'
import { cormorantCremeClassName } from '../creme-fonts'

/* T-064 — Cormorant du monde CRÈME posée ICI, pas au layout racine : elle
   couvre les deux dashboards (/admin, /admin/atelier/**) et /admin/login en
   un seul geste. Passthrough visuel : `.adm-root` (admin.css) pose
   `min-height: 100vh` lui-même, rien ne suppose qu'il soit enfant direct de
   <body> — un <div> nu de plus ne change aucune mise en page. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={cormorantCremeClassName}>{children}</div>
}
