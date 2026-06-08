import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import './globals.css'

/* Fonts DA (charte) chargées via next/font (self-host, zéro FOUC, pas de
   requête runtime vers fonts.gstatic.com). Exposées en variables CSS et
   branchées sur --bj-font-display / --bj-font-ui dans tokens.css. */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap',
})

/* Fige --app-height en pixels AVANT le premier paint (pas de FOUC de hauteur).
   Posé au load = innerHeight (viewport de layout, stable). Mis à jour UNIQUEMENT
   si la LARGEUR change (rotation / vrai changement de layout) + orientationchange.
   La barre d'outils iOS ne change que la hauteur → ignorée → plus de saut. */
const APP_HEIGHT_SCRIPT = `(function(){var d=document.documentElement,w=window;function s(){d.style.setProperty('--app-height',Math.round(w.innerHeight)+'px');}s();var lw=w.innerWidth;w.addEventListener('resize',function(){if(w.innerWidth!==lw){lw=w.innerWidth;s();}},{passive:true});w.addEventListener('orientationchange',function(){lw=w.innerWidth;s();},{passive:true});})();`

export const metadata: Metadata = {
  metadataBase: new URL('https://www.bellajour.fr'),
  title: "Bellajour — Vos souvenirs méritent un album d'exception",
  description:
    "Maison d'édition du souvenir. Bellajour compose vos photos en albums d'exception sublimés par une couverture unique. Vivez. Nous composons.",
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
    title: "Bellajour — Vos souvenirs méritent un album d'exception",
    description:
      "Maison d'édition du souvenir. Bellajour compose vos photos en albums d'exception sublimés par une couverture unique. Vivez. Nous composons.",
  },

  twitter: {
    card: 'summary_large_image',
    title: "Bellajour — Vos souvenirs méritent un album d'exception",
    description:
      "Maison d'édition du souvenir. Bellajour compose vos photos en albums d'exception sublimés par une couverture unique. Vivez. Nous composons.",
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
    <html lang="fr" className={`${cormorant.variable} ${dmSans.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: APP_HEIGHT_SCRIPT }} />
        <link rel="preload" as="image" href="/images/header-bellajour.webp" fetchPriority="high" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
