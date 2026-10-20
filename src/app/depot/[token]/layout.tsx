/* Le layout d'UN lien de dépôt (sous `depot/layout.tsx`, qui pose l'interrupteur,
   le monde sombre et les polices). Il ne fait qu'une chose : retrouver le
   registre de l'édition derrière le token, pour que « Ce lien ne fonctionne
   plus » (not-found.tsx, T-196) tutoie une édition au tu. Un lien qui marche
   ne coûte rien de plus : la lecture est celle de la page (`accesDepot`,
   partagée par `cache`). */

import { FournisseurRegistre } from './LienMort'
import { registreDuLien } from './lecture'

export default async function LayoutLienDepot({ children, params }: { children: React.ReactNode; params: Promise<{ token: string }> }) {
  const { token } = await params
  return <FournisseurRegistre registre={await registreDuLien(token)}>{children}</FournisseurRegistre>
}
