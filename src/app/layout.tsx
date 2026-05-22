import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.bellajour.fr'),
  title: "Bellajour — Nous composons vos photos en albums d'exception",
  description:
    "Bellajour transforme vos photos en albums imprimés d'exception. Une maison d'édition du souvenir. Inscrivez-vous à la pré-vente.",
  keywords: [
    'album photo',
    'maison édition souvenir',
    'album imprimé',
    'photos personnalisé',
    'bellajour',
  ],
  authors: [{ name: 'Bellajour' }],
  creator: 'Bellajour',
  publisher: 'Bellajour',

  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://www.bellajour.fr',
    siteName: 'Bellajour',
    title: "Bellajour — Nous composons vos photos en albums d'exception",
    description:
      "Bellajour transforme vos photos en albums imprimés d'exception. Une maison d'édition du souvenir. Inscrivez-vous à la pré-vente.",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: "Bellajour — Maison d'édition du souvenir",
        type: 'image/jpeg',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: "Bellajour — Nous composons vos photos en albums d'exception",
    description:
      "Bellajour transforme vos photos en albums imprimés d'exception. Une maison d'édition du souvenir. Inscrivez-vous à la pré-vente.",
    images: ['/og-image.jpg'],
  },

  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  alternates: {
    canonical: 'https://www.bellajour.fr',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preload" as="image" href="/images/header-bellajour.webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/images/ui/logo.webp" fetchPriority="high" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
