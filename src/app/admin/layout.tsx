import type { ReactNode } from 'react'

/* Charte V2 (26/11/2026) : le back-office n'a plus de police propre. Les polices de la
   charte (Fraunces, Inter Tight) sont posées à la racine par `polices.ts` ; la Cormorant
   du monde crème (`creme-fonts.ts`) n'est plus chargée ici. Passthrough visuel :
   `.adm-root` (admin.css) pose `min-height: 100vh` lui-même. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}
