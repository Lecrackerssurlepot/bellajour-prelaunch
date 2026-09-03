import LegalPage from '../../legal/LegalPage'
import { REMBOURSEMENT } from '../../legal/content/remboursement'
import { legalRouteMetadata } from '../../legal/resolve'

export const metadata = legalRouteMetadata('remboursement', 'pt', REMBOURSEMENT)

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <LegalPage slug="remboursement" doc={REMBOURSEMENT} params={params} forceLang="pt" />
}
