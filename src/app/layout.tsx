import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import './globals.css'
import WebViewBanner from './components/WebViewBanner'

/* Fonts DA (charte) chargées via next/font (self-host, zéro FOUC, pas de
   requête runtime vers fonts.gstatic.com). Exposées en variables CSS et
   branchées sur --bj-font-display / --bj-font-ui dans tokens.css. */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
  /* PAS de prechargement : ces deux faces (500 romain + 500 italique, 75 Ko)
     servent /preventes, /ambassadeurs, /admin, /legal, /merci, /inviter et
     /lancement, mais JAMAIS la page d'accueil ni /composer, qui redefinissent
     --font-display sur .bj-atelier vers Cormorant 400 ((atelier)/layout.tsx).
     Le layout etant RACINE, prechargement = 75 Ko en priorite haute sur toutes
     les pages, dont celles qui ne peindront jamais ces faces. Mesure du
     27/08/2026. Contrepartie assumee : un echange de police au premier
     affichage des pages qui s'en servent vraiment, deja en `display: swap`. */
  preload: false,
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
/* Pose `data-anim` sur <html> AVANT le premier affichage. Tout le CSS qui
   cache du contenu en attendant la sequence est conditionne a sa presence
   (voir les filets en fin de theme.css, univers.css et ouverture.css).
   S'il est absent, c'est que ce script n'a pas tourne : la page reste
   entierement lisible, sans mouvement. Motif : T-050 — sans JavaScript, le
   site servait un ecran NOIR, et sur /numero/<token> la couverture etait
   invisible pendant que le bouton « Commander » restait visible.
   Le chien de garde couvre le second cas, plus vicieux : le script en ligne
   passe mais le bundle n'arrive jamais (chunk en 404 pendant un deploiement,
   navigateur integre qui etouffe le module). Au bout de 5 s sans signature
   du code client, on rend la page plutot que de garder un ecran vide. */
const ANIM_SCRIPT = `(function(){var d=document.documentElement;d.setAttribute('data-anim','');setTimeout(function(){if(!d.hasAttribute('data-anim-ok')){d.removeAttribute('data-anim');}},5000);})();`

const APP_HEIGHT_SCRIPT = `(function(){var d=document.documentElement,w=window;function s(){d.style.setProperty('--app-height',Math.round(w.innerHeight)+'px');}s();var lw=w.innerWidth;w.addEventListener('resize',function(){if(w.innerWidth!==lw){lw=w.innerWidth;s();}},{passive:true});w.addEventListener('orientationchange',function(){lw=w.innerWidth;s();},{passive:true});})();`

export const metadata: Metadata = {
  metadataBase: new URL('https://www.bellajour.fr'),
  title: "Bellajour — chaque moment mérite son numéro",
  description:
    "Vous envoyez vos photos, l’atelier compose un vrai magazine imprimé. Un numéro par moment. À partir de 30 €, aperçu gratuit avant de payer.",
  /* Le défaut de tout le site depuis la bascule du 24/08/2026. Les pages qui
     ont leur propre `metadata` (la racine, /preventes) l'emportent ; c'est ce
     bloc que voient /merci, /inviter et les pages légales. */
  keywords: [
    'magazine photo',
    'magazine personnalisé',
    'album photo imprimé',
    'maison édition souvenir',
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
    title: "Bellajour — chaque moment mérite son numéro",
    description:
      "Vous envoyez vos photos, l’atelier compose un vrai magazine imprimé. Un numéro par moment. À partir de 30 €, aperçu gratuit avant de payer.",
  },

  twitter: {
    card: 'summary_large_image',
    title: "Bellajour — chaque moment mérite son numéro",
    description:
      "Vous envoyez vos photos, l’atelier compose un vrai magazine imprimé. Un numéro par moment. À partir de 30 €, aperçu gratuit avant de payer.",
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
    <html
      lang="fr"
      className={`${cormorant.variable} ${dmSans.variable}`}
      /* APP_HEIGHT_SCRIPT pose --app-height en inline style sur <html> avant
         l'hydratation → attendu, on supprime l'avertissement de mismatch. */
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: ANIM_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: APP_HEIGHT_SCRIPT }} />
      </head>
      <body>
        {children}
        {/* Bandeau WebView Instagram/Facebook — rend null hors WebView Meta mobile */}
        <WebViewBanner />
      </body>
    </html>
  )
}
