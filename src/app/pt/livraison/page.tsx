import LegalPage from '../../legal/LegalPage'
import { LIVRAISON } from '../../legal/content/livraison'
import { legalRouteMetadata } from '../../legal/resolve'

export const metadata = legalRouteMetadata('livraison', 'pt', LIVRAISON)

/* ⚠️ AUCUN `searchParams` — la page reste FIGÉE ; la langue vient de l'adresse. */
export default function Page() {
  return <LegalPage slug="livraison" doc={LIVRAISON} forceLang="pt" />
}
