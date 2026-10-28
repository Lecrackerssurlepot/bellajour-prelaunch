/* Une adresse courte qui ne mène plus nulle part : la MÊME page que l'adresse
   longue (`depot/[token]/not-found.tsx`, T-196). `notFound()` garde le 404. */

import LienMort from '../../depot/[token]/LienMort'

export default function LienCourtIntrouvable() {
  return <LienMort />
}
