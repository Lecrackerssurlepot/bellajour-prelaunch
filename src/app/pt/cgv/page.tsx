import LegalPage from '../../legal/LegalPage'
import { CGV } from '../../legal/content/cgv'
import { legalRouteMetadata } from '../../legal/resolve'

export const metadata = legalRouteMetadata('cgv', 'pt', CGV)

/* ⚠️ AUCUN `searchParams` — c'est ce qui garde cette page FIGÉE (09/09/2026).
   La langue vient de l'ADRESSE (T-083), le code parrain est repris côté client
   par `SelecteurLangue`. Lire l'URL ici rendrait la page dynamique. */
export default function Page() {
  return <LegalPage slug="cgv" doc={CGV} forceLang="pt" />
}
