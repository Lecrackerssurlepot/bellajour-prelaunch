import LegalPage from '../../legal/LegalPage'
import { CGV } from '../../legal/content/cgv'
import { legalRouteMetadata } from '../../legal/resolve'

export const metadata = legalRouteMetadata('cgv', 'en', CGV)

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <LegalPage slug="cgv" doc={CGV} params={params} forceLang="en" />
}
