import LegalPage from '../../legal/LegalPage'
import { CONFIDENTIALITE } from '../../legal/content/confidentialite'
import { legalRouteMetadata } from '../../legal/resolve'

export const metadata = legalRouteMetadata('confidentialite', 'en', CONFIDENTIALITE)

/* ⚠️ AUCUN `searchParams` — c'est ce qui garde cette page FIGÉE (09/09/2026).
   La langue vient de l'ADRESSE (T-083), le code parrain est repris côté client
   par `SelecteurLangue`. Lire l'URL ici rendrait la page dynamique. */
export default function Page() {
  return <LegalPage slug="confidentialite" doc={CONFIDENTIALITE} forceLang="en" />
}
