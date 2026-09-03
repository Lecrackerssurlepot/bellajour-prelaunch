import LegalPage from '../../legal/LegalPage'
import { MENTIONS_LEGALES } from '../../legal/content/mentions-legales'
import { legalRouteMetadata } from '../../legal/resolve'

export const metadata = legalRouteMetadata('mentions-legales', 'en', MENTIONS_LEGALES)

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <LegalPage slug="mentions-legales" doc={MENTIONS_LEGALES} params={params} forceLang="en" />
}
