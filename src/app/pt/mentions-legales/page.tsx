import LegalPage from '../../legal/LegalPage'
import { MENTIONS_LEGALES } from '../../legal/content/mentions-legales'
import { legalRouteMetadata } from '../../legal/resolve'

export const metadata = legalRouteMetadata('mentions-legales', 'pt', MENTIONS_LEGALES)

/* ⚠️ AUCUN `searchParams` — c'est ce qui garde cette page FIGÉE (09/09/2026).
   La langue vient de l'ADRESSE (T-083), le code parrain est repris côté client
   par `SelecteurLangue`. Lire l'URL ici rendrait la page dynamique. */
export default function Page() {
  return <LegalPage slug="mentions-legales" doc={MENTIONS_LEGALES} forceLang="pt" />
}
