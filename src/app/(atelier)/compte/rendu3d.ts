import angles from '../../../../brand/assets/3d/magazine/angles.json'
import type { Studio } from '../../../../brand/assets/3d/magazine/magazine.js'
import { FINITION_DEFAUT, dosMmPourPages } from '@/lib/atelier/impression'
import { PAGE_H, PAGE_L } from '@/lib/mise-en-page/geometrie'

/* Les numéros de la bibliothèque, photographiés par le magazine 3D de la
   charte (brand/assets/3d/magazine). UN seul studio, hors écran : il rend
   chaque couverture sous l'angle nommé « presque-face » (de face, la tranche
   des pages se voit à peine, à l'épaisseur du nombre de pages réel), on garde
   l'image, et le studio est rendu dès que la file est vide. Jamais un
   contexte WebGL par numéro.
   Sans WebGL, ou si une couverture ne se laisse pas lire (CORS), la promesse
   rend null : la couverture à plat reste. */

const ANGLE = 'presque-face'
const PAGES_PAR_DEFAUT = 32
/* Le côté de la prise de vue, en pixels. Le magazine en occupe environ 70 %. */
const COTE = 1200

const memoire = new Map<string, Promise<string | null>>()
let file: Promise<unknown> = Promise.resolve()
let enAttente = 0
let atelier: { studio: Studio; toile: HTMLCanvasElement } | null = null
let impossible = false

async function ouvrir() {
  if (atelier) return atelier
  const { creerStudio, webglDisponible } = await import('../../../../brand/assets/3d/magazine/magazine.js')
  if (!webglDisponible()) throw new Error('webgl')
  const studio = creerStudio(document.createElement('div'), {
    angles,
    angle: ANGLE,
    largeurMm: PAGE_L,
    hauteurMm: PAGE_H,
    pages: PAGES_PAR_DEFAUT,
    finition: FINITION_DEFAUT,
    dosMm: dosMmPourPages(PAGES_PAR_DEFAUT, FINITION_DEFAUT),
    fond: null,
    leger: window.matchMedia('(pointer: coarse)').matches,
    interactif: false,
    rotationAuto: false,
    largeur: COTE,
    hauteur: COTE,
    densite: 1,
  })
  await studio.pret
  atelier = { studio, toile: document.createElement('canvas') }
  return atelier
}

function fermer() {
  atelier?.studio.liberer()
  atelier = null
}

/* On ne garde QUE le magazine : ses pixels sont opaques, l'ombre au sol du
   studio ne l'est jamais. Sur une étagère, cette ombre en biseau se lisait
   comme un défaut ; l'ombre du numéro est celle de la bibliothèque (CSS).
   Un pixel translucide n'est gardé que s'il touche le magazine (son bord
   adouci). Rend le cadre du magazine, ou null s'il n'y a rien. */
function detourer(donnees: Uint8ClampedArray, cote: number) {
  const plein = new Uint8Array(cote * cote)
  let x0 = cote, y0 = cote, x1 = -1, y1 = -1
  for (let y = 0; y < cote; y += 1) {
    for (let x = 0; x < cote; x += 1) {
      if (donnees[(y * cote + x) * 4 + 3] < 250) continue
      plein[y * cote + x] = 1
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return null
  for (let y = 0; y < cote; y += 1) {
    for (let x = 0; x < cote; x += 1) {
      const i = y * cote + x
      if (plein[i]) continue
      const voisin =
        (x > 0 && plein[i - 1]) || (x < cote - 1 && plein[i + 1]) || (y > 0 && plein[i - cote]) || (y < cote - 1 && plein[i + cote])
      if (!voisin) donnees[i * 4 + 3] = 0
    }
  }
  return { x: Math.max(0, x0 - 1), y: Math.max(0, y0 - 1), l: Math.min(cote, x1 + 2) - Math.max(0, x0 - 1), h: Math.min(cote, y1 + 2) - Math.max(0, y0 - 1) }
}

async function photographier(couverture: string, pages: number): Promise<string | null> {
  const { studio, toile } = await ouvrir()
  await studio.regler({ couverture, pages, dosMm: dosMmPourPages(pages, FINITION_DEFAUT) })
  studio.allerA(ANGLE, { anime: false })
  /* Le rendu et sa copie dans la même tâche : la toile WebGL ne garde pas son image. */
  studio.rendre()
  toile.width = COTE
  toile.height = COTE
  const ctx = toile.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.clearRect(0, 0, COTE, COTE)
  ctx.drawImage(studio.canvas, 0, 0, COTE, COTE)
  const image = ctx.getImageData(0, 0, COTE, COTE)
  const boite = detourer(image.data, COTE)
  if (!boite) return null
  ctx.putImageData(image, 0, 0)
  const sortie = document.createElement('canvas')
  sortie.width = boite.l
  sortie.height = boite.h
  sortie.getContext('2d')?.drawImage(toile, boite.x, boite.y, boite.l, boite.h, 0, 0, boite.l, boite.h)
  const blob = await new Promise<Blob | null>((resolve) => sortie.toBlob(resolve, 'image/webp', 0.92))
  return blob ? URL.createObjectURL(blob) : null
}

/** L'image du numéro en volume (fond transparent), ou null s'il faut garder la couverture à plat. */
export function rendreNumero(couverture: string, nbPages: number | null): Promise<string | null> {
  const pages = nbPages ?? PAGES_PAR_DEFAUT
  const cle = `${pages}|${couverture}`
  const connue = memoire.get(cle)
  if (connue) return connue
  if (impossible) return Promise.resolve(null)
  enAttente += 1
  const promesse = file
    .then(() => photographier(couverture, pages))
    .catch(() => {
      /* Pas de WebGL : inutile de réessayer pour chaque numéro. Une image
         illisible, elle, ne condamne que ce numéro. */
      if (!atelier) impossible = true
      return null
    })
    .finally(() => {
      enAttente -= 1
      if (enAttente === 0) fermer()
    })
  file = promesse
  memoire.set(cle, promesse)
  return promesse
}
