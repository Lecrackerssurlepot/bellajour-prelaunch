/* Les vignettes de la page 02 de l'univers, à la taille où on les regarde.
 *
 * Mesuré le 27/08/2026 sur bellajour.fr : quatre photos pesant 645 Ko à elles
 * seules étaient affichées à 223 x 131 px au plus grand. Une image de 1200 x 1600
 * posée dans un cadre de 223 x 131, c'est 2,7 fois trop de pixels sur un écran
 * Retina, et le navigateur paie le décodage entier avant de jeter le surplus.
 *
 * ⚠️ Pourquoi des COPIES et pas un redimensionnement sur place : ces mêmes
 * fichiers servent /admin/atelier/demo et les sections de l'ancienne landing,
 * à d'autres tailles. Les rétrécir en place casserait ces écrans-là en silence.
 *
 * Les cibles ci-dessous couvrent le plus grand des deux besoins mesurés :
 * bureau en 1440 à densité 2, et téléphone en 375 à densité 3.
 *
 *   node scripts/images-univers.mjs
 */

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { stat } from 'node:fs/promises'

const SOURCE = 'public/images'
const CIBLE = 'public/images/univers'

/* largeur = le plus grand besoin mesuré, arrondi au-dessus.
   grid-03 est recadrée par `object-fit`, donc on raisonne sur la largeur
   du cadre après recadrage, pas sur la taille affichée. */
const TRAVAUX = [
  { de: 'solution/solution-upload-02.webp', vers: 'solution-upload-02.webp', largeur: 480 },
  { de: 'anxiete/grid-03.webp', vers: 'grid-03.webp', largeur: 600 },
  { de: 'solution/solution-upload-05.webp', vers: 'solution-upload-05.webp', largeur: 400 },
  { de: 'solution/solution-upload-09.webp', vers: 'solution-upload-09.webp', largeur: 400 },
]

const ko = (o) => Math.round(o / 1024)

await mkdir(CIBLE, { recursive: true })

let avant = 0
let apres = 0

for (const t of TRAVAUX) {
  const source = `${SOURCE}/${t.de}`
  const cible = `${CIBLE}/${t.vers}`

  const poidsAvant = (await stat(source)).size
  await sharp(source).resize({ width: t.largeur, withoutEnlargement: true }).webp({ quality: 80 }).toFile(cible)
  const poidsApres = (await stat(cible)).size

  avant += poidsAvant
  apres += poidsApres

  const meta = await sharp(cible).metadata()
  console.log(
    `${t.vers.padEnd(26)} ${String(ko(poidsAvant)).padStart(4)} Ko -> ${String(ko(poidsApres)).padStart(3)} Ko` +
      `   (${meta.width}x${meta.height})`
  )
}

console.log(`\nTotal : ${ko(avant)} Ko -> ${ko(apres)} Ko, soit ${ko(avant - apres)} Ko de moins au premier chargement.`)
