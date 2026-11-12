/**
 * Les polices de l'éditeur à l'écran (lot C, 12/11) : le catalogue FERMÉ de `style.ts`, trente familles Google Fonts servies par
 * `next/font/google` (téléchargées au build, auto-hébergées : la CSP `font-src 'self'` n'a rien à ouvrir, aucun `<link>` Google).
 *
 * Les appels doivent être LITTÉRAUX et assignés à une `const` de portée module (next/font les lit à la compilation, il refuse tout
 * le reste) : une ligne par famille, `preload: false` (aucune ne se
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

const p_alegreya = Alegreya({ subsets: ["latin"], variable: "--pf-alegreya", display: "swap", preload: false });
const p_alegreya_sans = Alegreya_Sans({ subsets: ["latin"], weight: ["400"], variable: "--pf-alegreya-sans", display: "swap", preload: false });
const p_anton = Anton({ subsets: ["latin"], weight: "400", variable: "--pf-anton", display: "swap", preload: false });
const p_archivo = Archivo({ subsets: ["latin"], variable: "--pf-archivo", display: "swap", preload: false });
const p_barlow = Barlow({ subsets: ["latin"], weight: ["400"], variable: "--pf-barlow", display: "swap", preload: false });
const p_barlow_condensed = Barlow_Condensed({ subsets: ["latin"], weight: ["900"], variable: "--pf-barlow-condensed", display: "swap", preload: false });
const p_bodoni_moda = Bodoni_Moda({ subsets: ["latin"], variable: "--pf-bodoni-moda", display: "swap", preload: false });
const p_caveat = Caveat({ subsets: ["latin"], variable: "--pf-caveat", display: "swap", preload: false });
const p_eb_garamond = EB_Garamond({ subsets: ["latin"], variable: "--pf-eb-garamond", display: "swap", preload: false });
const p_fraunces = Fraunces({ subsets: ["latin"], variable: "--pf-fraunces", display: "swap", preload: false });
const p_hanken_grotesk = Hanken_Grotesk({ subsets: ["latin"], variable: "--pf-hanken-grotesk", display: "swap", preload: false });
const p_ibm_plex_mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"], variable: "--pf-ibm-plex-mono", display: "swap", preload: false });
const p_ibm_plex_sans_condensed = IBM_Plex_Sans_Condensed({ subsets: ["latin"], weight: ["400", "600"], variable: "--pf-ibm-plex-sans-condensed", display: "swap", preload: false });
const p_instrument_sans = Instrument_Sans({ subsets: ["latin"], variable: "--pf-instrument-sans", display: "swap", preload: false });
const p_instrument_serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--pf-instrument-serif", display: "swap", preload: false });
const p_inter_tight = Inter_Tight({ subsets: ["latin"], variable: "--pf-inter-tight", display: "swap", preload: false });
const p_italiana = Italiana({ subsets: ["latin"], weight: "400", variable: "--pf-italiana", display: "swap", preload: false });
const p_jost = Jost({ subsets: ["latin"], variable: "--pf-jost", display: "swap", preload: false });
const p_libre_caslon_display = Libre_Caslon_Display({ subsets: ["latin"], weight: "400", variable: "--pf-libre-caslon-display", display: "swap", preload: false });
const p_libre_franklin = Libre_Franklin({ subsets: ["latin"], variable: "--pf-libre-franklin", display: "swap", preload: false });
const p_lora = Lora({ subsets: ["latin"], variable: "--pf-lora", display: "swap", preload: false });
const p_marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--pf-marcellus", display: "swap", preload: false });
const p_newsreader = Newsreader({ subsets: ["latin"], variable: "--pf-newsreader", display: "swap", preload: false });
const p_nunito = Nunito({ subsets: ["latin"], variable: "--pf-nunito", display: "swap", preload: false });
const p_permanent_marker = Permanent_Marker({ subsets: ["latin"], weight: "400", variable: "--pf-permanent-marker", display: "swap", preload: false });
const p_source_serif_4 = Source_Serif_4({ subsets: ["latin"], variable: "--pf-source-serif-4", display: "swap", preload: false });
const p_space_grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--pf-space-grotesk", display: "swap", preload: false });
const p_work_sans = Work_Sans({ subsets: ["latin"], variable: "--pf-work-sans", display: "swap", preload: false });
const p_yellowtail = Yellowtail({ subsets: ["latin"], weight: "400", variable: "--pf-yellowtail", display: "swap", preload: false });
const p_ysabeau = Ysabeau({ subsets: ["latin"], variable: "--pf-ysabeau", display: "swap", preload: false });

/** Les classes qui posent les trente variables CSS (`--pf-<famille>`) sur l'éditeur. */
export const classesPolices: string = [
  p_alegreya,
  p_alegreya_sans,
  p_anton,
  p_archivo,
  p_barlow,
  p_barlow_condensed,
  p_bodoni_moda,
  p_caveat,
  p_eb_garamond,
  p_fraunces,
  p_hanken_grotesk,
  p_ibm_plex_mono,
  p_ibm_plex_sans_condensed,
  p_instrument_sans,
  p_instrument_serif,
  p_inter_tight,
  p_italiana,
  p_jost,
  p_libre_caslon_display,
  p_libre_franklin,
  p_lora,
  p_marcellus,
  p_newsreader,
  p_nunito,
  p_permanent_marker,
  p_source_serif_4,
  p_space_grotesk,
  p_work_sans,
  p_yellowtail,
  p_ysabeau,
].map((p) => p.variable).join(" ");
