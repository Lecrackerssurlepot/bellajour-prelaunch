import LegalPage from '../../legal/LegalPage'
import { LIVRAISON } from '../../legal/content/livraison'
import { legalRouteMetadata } from '../../legal/resolve'

export const metadata = legalRouteMetadata('livraison', 'en', LIVRAISON)

/* ⚠️ AUCUN `searchParams` — la page reste FIGÉE ; la langue vient de l'adresse. */
/* Le bandeau de Noël s'éteint seul (noelAuSite) : la page reste figée, mais
   se refait toutes les 5 minutes, comme /magazine. */
export const revalidate = 300

export default function Page() {
  return <LegalPage slug="livraison" doc={LIVRAISON} forceLang="en" />
}
