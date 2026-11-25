#!/usr/bin/env node
/**
 * L'exporteur du magazine 3D.
 *
 *   node brand/assets/3d/magazine/exporter.mjs <couverture> [options]
 *
 * Sort, dans brand/assets/3d/magazine/exports/<nom>/ :
 *   - un PNG transparent par angle nommé (2048 px de côté) ;
 *   - la même image en WebP 1024 px (l'image fixe du site, sans WebGL) ;
 *   - une vidéo d'un tour complet, 6 s à 30 i/s, en MP4 (H.264) et en WebM (VP9),
 *     sur le blanc de la charte, avec son image d'attente.
 *
 * Options :
 *   --nom <nom>            le dossier de sortie (défaut : le nom du fichier de couverture)
 *   --quatrieme <image>    l'image de 4e de couverture (défaut : une couleur)
 *   --double-page <image>  l'image de la double page ouverte (défaut : pages blanches)
 *   --dos <couleur>        la couleur du dos, ex. "#111111"
 *   --couleur-quatrieme <couleur>   la couleur de la 4e sans image (défaut : celle du dos)
 *   --pages <n>            24 à 60 (défaut : 32)
 *   --finition <f>         gloss (brillant, défaut) ou matte (mat)
 *   --sans-video           ne sort que les images
 *
 * Aucun réseau : la page est servie depuis cette machine, rendue par le Chrome
 * déjà installé (playwright-core, aucun navigateur téléchargé), encodée par ffmpeg.
 */
import { createServer } from 'node:http'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, createReadStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import sharp from 'sharp'

const ICI = dirname(fileURLToPath(import.meta.url))
const RACINE = resolve(ICI, '../../../..')
const COTE_IMAGE = 2048
const COTE_SECOURS = 1024
const COTE_VIDEO = 1080
const IMAGES_PAR_SECONDE = 30
const DUREE_S = 6
const ANGLE_VIDEO = 'trois-quarts-gauche'

/* ── les arguments ── */
const args = process.argv.slice(2)
const drapeaux = {}
const libres = []
for (let i = 0; i < args.length; i += 1) {
  const a = args[i]
  if (a === '--sans-video') drapeaux['sans-video'] = true
  else if (a.startsWith('--')) { drapeaux[a.slice(2)] = args[i + 1]; i += 1 }
  else libres.push(a)
}
if (libres.length !== 1) {
  console.error('Usage : node brand/assets/3d/magazine/exporter.mjs <couverture> [--nom demo] [--pages 32] [--finition gloss|matte] [--dos "#111111"] [--quatrieme image] [--double-page image] [--sans-video]')
  process.exit(1)
}
const fichier = (chemin) => {
  if (!chemin) return null
  const abs = resolve(process.cwd(), chemin)
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    console.error(`Fichier introuvable : ${chemin}`)
    process.exit(1)
  }
  return abs
}
const sources = {
  couverture: fichier(libres[0]),
  quatrieme: fichier(drapeaux.quatrieme),
  'double-page': fichier(drapeaux['double-page']),
}
const nom = (drapeaux.nom ?? basename(libres[0], extname(libres[0]))).replace(/[^a-zA-Z0-9_-]+/g, '-')
const pages = Number(drapeaux.pages ?? 32)
const finition = drapeaux.finition ?? 'gloss'
if (!Number.isInteger(pages) || pages < 24 || pages > 60 || pages % 2) {
  console.error('--pages : un nombre pair entre 24 et 60.')
  process.exit(1)
}
if (finition !== 'gloss' && finition !== 'matte') {
  console.error('--finition : gloss (brillant) ou matte (mat).')
  process.exit(1)
}
const sortie = join(ICI, 'exports', nom)
mkdirSync(sortie, { recursive: true })

/* Le blanc de la charte, lu dans les jetons : jamais recopié. */
const jetons = JSON.parse(readFileSync(join(RACINE, 'brand/tokens.json'), 'utf8'))
const BLANC = jetons.couleur.papier.fond.$value

/* ── le petit serveur local : ce dossier, three, et les images passées en argument ── */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif' }
const serveur = createServer((req, res) => {
  const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let cible = null
  if (chemin.startsWith('/source/')) cible = sources[chemin.slice('/source/'.length)] ?? null
  else if (chemin.startsWith('/node_modules/three/')) cible = join(RACINE, normalize(chemin))
  else if (chemin.startsWith('/magazine/')) cible = join(ICI, normalize(chemin.slice('/magazine'.length)))
  const permis = cible && (Object.values(sources).includes(cible) || cible.startsWith(join(RACINE, 'node_modules/three') + sep) || cible.startsWith(ICI + sep))
  if (!permis || !existsSync(cible) || !statSync(cible).isFile()) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': TYPES[extname(cible).toLowerCase()] ?? 'application/octet-stream' })
  createReadStream(cible).pipe(res)
})
await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok))
const base = `http://127.0.0.1:${serveur.address().port}`

const ecrire = (chemin, dataUrl) => writeFileSync(chemin, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'))
const ffmpeg = existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg'

let navigateur = null
let temporaire = null
try {
  navigateur = await chromium.launch({ channel: 'chrome', headless: true, args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] })
  const page = await navigateur.newPage({ viewport: { width: COTE_IMAGE, height: COTE_IMAGE }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => console.error('Erreur dans la page :', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.error('Console :', m.text()) })
  await page.goto(`${base}/magazine/exporter.html`)
  await page.waitForFunction('window.pret === true', null, { timeout: 30000 })
  if (!(await page.evaluate('window.magazine3d.webgl'))) throw new Error('Chrome n’a pas WebGL sur cette machine : rien à rendre.')

  const options = {
    couverture: '/source/couverture',
    ...(sources.quatrieme ? { quatrieme: '/source/quatrieme' } : {}),
    ...(sources['double-page'] ? { doublePage: '/source/double-page' } : {}),
    ...(drapeaux.dos ? { couleurDos: drapeaux.dos } : {}),
    ...(drapeaux['couleur-quatrieme'] ? { couleurQuatrieme: drapeaux['couleur-quatrieme'] } : {}),
    pages,
    finition,
  }

  /* 1. Un PNG transparent par angle, et son image fixe en WebP. */
  await page.evaluate((o) => window.magazine3d.monter(o), { ...options, fond: null, largeur: COTE_IMAGE, hauteur: COTE_IMAGE })
  const { ordre } = await page.evaluate('window.magazine3d.angles')
  for (const angle of ordre) {
    const png = join(sortie, `${angle}.png`)
    ecrire(png, await page.evaluate((a) => window.magazine3d.angle(a), angle))
    await sharp(png).resize(COTE_SECOURS).webp({ quality: 86 }).toFile(join(sortie, `${angle}-${COTE_SECOURS}.webp`))
    console.log(`image  ${angle}.png`)
  }

  /* 2. Le tour complet, sur le blanc de la charte. */
  if (!drapeaux['sans-video']) {
    temporaire = mkdtempSync(join(tmpdir(), 'bellajour-magazine-3d-'))
    await page.setViewportSize({ width: COTE_VIDEO, height: COTE_VIDEO })
    await page.evaluate((o) => window.magazine3d.monter(o), { ...options, fond: BLANC, largeur: COTE_VIDEO, hauteur: COTE_VIDEO })
    const total = IMAGES_PAR_SECONDE * DUREE_S
    const depart = await page.evaluate((a) => window.magazine3d.angles.angles[a].rotation, ANGLE_VIDEO)
    for (let i = 0; i < total; i += 1) {
      const dataUrl = await page.evaluate(([a, r]) => window.magazine3d.tour(a, r), [ANGLE_VIDEO, depart + (360 * i) / total])
      ecrire(join(temporaire, `i_${String(i).padStart(4, '0')}.png`), dataUrl)
      if (i === 0) await sharp(join(temporaire, 'i_0000.png')).webp({ quality: 86 }).toFile(join(sortie, 'turntable-poster.webp'))
    }
    console.log(`vidéo  ${total} images rendues`)
    const entree = ['-y', '-loglevel', 'error', '-framerate', String(IMAGES_PAR_SECONDE), '-i', join(temporaire, 'i_%04d.png')]
    const encodages = [
      ['turntable.mp4', ['-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an']],
      ['turntable.webm', ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-pix_fmt', 'yuv420p', '-row-mt', '1', '-an']],
    ]
    for (const [fichierVideo, reglages] of encodages) {
      const r = spawnSync(ffmpeg, [...entree, ...reglages, join(sortie, fichierVideo)], { stdio: 'inherit' })
      if (r.status !== 0) throw new Error(`ffmpeg a échoué sur ${fichierVideo}`)
      console.log(`vidéo  ${fichierVideo}`)
    }
  }
  console.log(`\nTout est dans ${sortie}`)
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exitCode = 1
} finally {
  await navigateur?.close()
  serveur.close()
  /* Les images intermédiaires de la vidéo, créées ici même dans le dossier temporaire du système. */
  if (temporaire) rmSync(temporaire, { recursive: true, force: true })
}
