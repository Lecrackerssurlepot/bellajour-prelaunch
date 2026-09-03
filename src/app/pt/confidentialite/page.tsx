import LegalPage from '../../legal/LegalPage'
import { CONFIDENTIALITE } from '../../legal/content/confidentialite'
import { legalRouteMetadata } from '../../legal/resolve'

export const metadata = legalRouteMetadata('confidentialite', 'pt', CONFIDENTIALITE)

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <LegalPage slug="confidentialite" doc={CONFIDENTIALITE} params={params} forceLang="pt" />
}
