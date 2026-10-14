/* Le QR code d'un lien (pur : calculé au rendu, sans réseau). Fond clair et
   modules foncés dans les deux modes : c'est un objet imprimé (`--ec-page`,
   `--ec-encre`). */

import { cheminQr, matriceQr } from '@/lib/collectif/qr'

export default function QrCode({ texte, taille, etiquette }: { texte: string; taille: number; etiquette: string }) {
  const { d, cote } = cheminQr(matriceQr(texte))
  return (
    <svg className="ec-qr" width={taille} height={taille} viewBox={`0 0 ${cote} ${cote}`} shapeRendering="crispEdges" role="img" aria-label={etiquette}>
      <rect width={cote} height={cote} className="ec-qr-fond" />
      <path d={d} className="ec-qr-modules" />
    </svg>
  )
}
