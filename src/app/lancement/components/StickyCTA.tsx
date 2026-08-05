import './sticky-cta.css'
import { CTA_HREF } from '../links'

/* LANCEMENT — CTA sticky mobile (maquette).
   Barre fixe en bas d'écran, mobile uniquement (CSS ≤900px), verre dépoli,
   safe-area iOS. La réserve de hauteur vit sur .lc-main (lancement.css). */

export default function StickyCTA() {
  return (
    <div className="lc-sticky">
      <a className="lc-btn lc-sticky-btn" href={CTA_HREF}>
        Concevoir mon album
      </a>
    </div>
  )
}
