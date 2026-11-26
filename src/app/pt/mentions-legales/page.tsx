import LegalPage from '../../legal/LegalPage'
import { MENTIONS_LEGALES } from '../../legal/content/mentions-legales'
import { legalRouteMetadata } from '../../legal/resolve'

export const metadata = legalRouteMetadata('mentions-legales', 'pt', MENTIONS_LEGALES)

/* ⚠️ AUCUN `searchParams` — c'est ce qui garde cette page FIGÉE (09/09/2026).
   La langue vient de l'ADRESSE (T-083), le code parrain est repris côté client
   par `SelecteurLangue`. Lire l'URL ici rendrait la page dynamique. */
/* Le bandeau de Noël s'éteint seul (noelAuSite) : la page reste figée, mais
   se refait toutes les 5 minutes, comme /magazine. */
export const revalidate = 300

export default function Page() {
  return <LegalPage slug="mentions-legales" doc={MENTIONS_LEGALES} forceLang="pt" />
}
