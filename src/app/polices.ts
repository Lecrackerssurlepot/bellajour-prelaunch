/* Les quatre polices de la charte V2, chargées en UN seul endroit (fiche D).
 *
 * Chaque police pose une variable par RÔLE (--police-titre, --police-signature,
 * --police-texte, --police-magazine). brand/build/tokens.css la relaie dans
 * --m-police-<rôle>-famille : aucune page ne nomme jamais une police.
 *
 * Changer de police : changer l'import ci-dessous (Next exige un import écrit en
 * toutes lettres), puis `police.<rôle>.famille` dans brand/tokens.json.
 *
 * Phase 2 : seule la page /brand les pose. La phase 4 les montera à la racine.
 */
import { Fraunces, Inter_Tight, Instrument_Serif } from 'next/font/google'
import localFont from 'next/font/local'

const titre = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--police-titre',
  display: 'swap',
})

const texte = Inter_Tight({
  subsets: ['latin'],
  variable: '--police-texte',
  display: 'swap',
})

const magazine = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--police-magazine',
  display: 'swap',
  preload: false,
})

/* Interlope : OFL (licence à côté du fichier), servie depuis le dépôt. */
const signature = localFont({
  src: './polices/Interlope-Regular.woff2',
  variable: '--police-signature',
  display: 'swap',
  preload: false,
})

export const classesPolices = [titre.variable, texte.variable, magazine.variable, signature.variable].join(' ')
