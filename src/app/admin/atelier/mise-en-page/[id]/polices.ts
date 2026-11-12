/**
 * Les polices de l'éditeur à l'écran (lot C, 12/11) : le catalogue FERMÉ de `style.ts`, trente familles Google Fonts servies par
 * `next/font/google` (téléchargées au build, auto-hébergées : la CSP `font-src 'self'` n'a rien à ouvrir, aucun `<link>` Google).
 *
 * Les appels doivent être LITTÉRAUX (next/font les lit à la compilation) : une ligne par famille, `preload: false` (aucune ne se
 * charge tant qu'un texte du magazine ne s'en sert : le catalogue ne pèse rien sur les autres pages), la variable CSS `--pf-<id>`
 * que `style.ts` nomme (`Police.variable`), et seulement les graisses que le catalogue emploie quand la famille n'est pas variable.
 * Le harnais relit ce fichier : une famille du catalogue sans sa ligne ici, ou une variable qui ne porte pas le nom du catalogue,
 * fait échouer `verif-mep-style.ts`.
 *
 * Modules serveur seulement (importés par `layout.tsx`) : l'écran lit les polices par leur variable CSS.
 */

import {
  Alegreya, Alegreya_Sans, Anton, Archivo, Barlow, Barlow_Condensed, Bodoni_Moda, Caveat, EB_Garamond, Fraunces, Hanken_Grotesk,
  IBM_Plex_Mono, IBM_Plex_Sans_Condensed, Instrument_Sans, Instrument_Serif, Inter_Tight, Italiana, Jost, Libre_Caslon_Display,
  Libre_Franklin, Lora, Marcellus, Newsreader, Nunito, Permanent_Marker, Source_Serif_4, Space_Grotesk, Work_Sans, Yellowtail, Ysabeau,
} from "next/font/google";

const POLICES_ECRAN = [
  Alegreya({ subsets: ["latin"], variable: "--pf-alegreya", display: "swap", preload: false }),
  Alegreya_Sans({ subsets: ["latin"], weight: ["400"], variable: "--pf-alegreya-sans", display: "swap", preload: false }),
  Anton({ subsets: ["latin"], weight: "400", variable: "--pf-anton", display: "swap", preload: false }),
  Archivo({ subsets: ["latin"], variable: "--pf-archivo", display: "swap", preload: false }),
  Barlow({ subsets: ["latin"], weight: ["400"], variable: "--pf-barlow", display: "swap", preload: false }),
  Barlow_Condensed({ subsets: ["latin"], weight: ["900"], variable: "--pf-barlow-condensed", display: "swap", preload: false }),
  Bodoni_Moda({ subsets: ["latin"], variable: "--pf-bodoni-moda", display: "swap", preload: false }),
  Caveat({ subsets: ["latin"], variable: "--pf-caveat", display: "swap", preload: false }),
  EB_Garamond({ subsets: ["latin"], variable: "--pf-eb-garamond", display: "swap", preload: false }),
  Fraunces({ subsets: ["latin"], variable: "--pf-fraunces", display: "swap", preload: false }),
  Hanken_Grotesk({ subsets: ["latin"], variable: "--pf-hanken-grotesk", display: "swap", preload: false }),
  IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"], variable: "--pf-ibm-plex-mono", display: "swap", preload: false }),
  IBM_Plex_Sans_Condensed({ subsets: ["latin"], weight: ["400", "600"], variable: "--pf-ibm-plex-sans-condensed", display: "swap", preload: false }),
  Instrument_Sans({ subsets: ["latin"], variable: "--pf-instrument-sans", display: "swap", preload: false }),
  Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--pf-instrument-serif", display: "swap", preload: false }),
  Inter_Tight({ subsets: ["latin"], variable: "--pf-inter-tight", display: "swap", preload: false }),
  Italiana({ subsets: ["latin"], weight: "400", variable: "--pf-italiana", display: "swap", preload: false }),
  Jost({ subsets: ["latin"], variable: "--pf-jost", display: "swap", preload: false }),
  Libre_Caslon_Display({ subsets: ["latin"], weight: "400", variable: "--pf-libre-caslon-display", display: "swap", preload: false }),
  Libre_Franklin({ subsets: ["latin"], variable: "--pf-libre-franklin", display: "swap", preload: false }),
  Lora({ subsets: ["latin"], variable: "--pf-lora", display: "swap", preload: false }),
  Marcellus({ subsets: ["latin"], weight: "400", variable: "--pf-marcellus", display: "swap", preload: false }),
  Newsreader({ subsets: ["latin"], variable: "--pf-newsreader", display: "swap", preload: false }),
  Nunito({ subsets: ["latin"], variable: "--pf-nunito", display: "swap", preload: false }),
  Permanent_Marker({ subsets: ["latin"], weight: "400", variable: "--pf-permanent-marker", display: "swap", preload: false }),
  Source_Serif_4({ subsets: ["latin"], variable: "--pf-source-serif-4", display: "swap", preload: false }),
  Space_Grotesk({ subsets: ["latin"], variable: "--pf-space-grotesk", display: "swap", preload: false }),
  Work_Sans({ subsets: ["latin"], variable: "--pf-work-sans", display: "swap", preload: false }),
  Yellowtail({ subsets: ["latin"], weight: "400", variable: "--pf-yellowtail", display: "swap", preload: false }),
  Ysabeau({ subsets: ["latin"], variable: "--pf-ysabeau", display: "swap", preload: false }),
];

/** Les classes qui posent les trente variables CSS (`--pf-<famille>`) sur l'éditeur. */
export const classesPolices: string = POLICES_ECRAN.map((p) => p.variable).join(" ");
