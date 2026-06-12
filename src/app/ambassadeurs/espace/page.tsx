import type { Metadata } from 'next'
import { Suspense } from 'react'
import Espace from './Espace'
import AmbassadeurNav from '../AmbassadeurNav'
import Footer from '../../sections/Footer'

/* Route /ambassadeurs/espace — dashboard ambassadeur (accès par lien magique).
   noindex : page personnelle, jamais indexée. useSearchParams → Suspense requis. */

export const metadata: Metadata = {
  title: 'Espace ambassadeur — Bellajour',
  robots: { index: false, follow: false },
}

export default function EspacePage() {
  return (
    <main>
      <AmbassadeurNav variant="espace" />
      <Suspense fallback={null}>
        <Espace />
      </Suspense>
      <Footer />
    </main>
  )
}
