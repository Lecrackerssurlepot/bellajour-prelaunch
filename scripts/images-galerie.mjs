/* Les variantes des couvertures de la galerie (T-065, 31/08/2026).
 *
 * Les 25 webp de public/images/lancement/galerie/ font 450x675 (~57 Ko). C'est
 * la BONNE taille pour leur plus grand usage (le rail de l'accueil sur un
 * iPhone 3x : 38vw ~ 143 px CSS x3 = 428 px), mais 2 a 3,5x trop grand pour :
 *   - le rail de l'accueil sur bureau (15vw, 216 px CSS en 1440) ;
 *   - les deux timbres de /magazine (Corps.tsx, ~145 px CSS, caches sous 720px).
 *
 * On genere donc DES COPIES suffixees -240 et -360 (modele brand-01-640/960),
 * jamais un redimensionnement sur place : les originaux 450 restent le plafond
 * du srcset (ecrans 3x) et servent tels quels partout ou aucun srcset n'est
 * pose (Kiosque.tsx, le numero de la section 07 de l'accueil, l'OG image).
 *
 * Seuls les fichiers reellement references par un srcset sont declines.
 *
 *   node scripts/images-galerie.mjs
 */

import sharp from 'sharp'
import { stat } from 'node:fs/promises'

const DOSSIER = 'public/images/lancement/galerie'

/* Le rail de l'accueil (Univers.tsx) : marrakech, japon, patagonie, lisbonne,
   santorin. Les timbres de /magazine (Corps.tsx) : tulum, lisbonne. */
const FICHIERS = ['marrakech', 'japon', 'patagonie', 'lisbonne', 'santorin', 'tulum']

/* 240 : bureau 1x (216 px CSS) et petits cadres. 360 : bureau retina 2x et
   telephones 2x (285 px CSS). 450 (l'original) : telephones 3x. */
const LARGEURS = [240, 360]

const ko = (o) => Math.round(o / 1024)
let total = 0

for (const nom of FICHIERS) {
  const source = `${DOSSIER}/${nom}.webp`
  for (const l of LARGEURS) {
    const cible = `${DOSSIER}/${nom}-${l}.webp`
    /* q75 : ces vignettes sont toutes peintes sous un filtre (desaturation,
       brightness) ou en timbre — q80 rendait un 360 quasi au poids du 450. */
    await sharp(source).resize({ width: l, withoutEnlargement: true }).webp({ quality: 75 }).toFile(cible)
    const poids = (await stat(cible)).size
    total += poids
    console.log(`${`${nom}-${l}.webp`.padEnd(22)} ${String(ko(poids)).padStart(3)} Ko`)
  }
}

console.log(`\n${FICHIERS.length * LARGEURS.length} variantes, ${ko(total)} Ko au total.`)
