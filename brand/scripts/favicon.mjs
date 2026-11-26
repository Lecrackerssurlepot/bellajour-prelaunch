#!/usr/bin/env node
/* Les favicons de Bellajour, tirés du « b » du logo (brand/assets/logo/bellajour.svg).
   node brand/scripts/favicon.mjs
   Le « b » est découpé dans le tracé vectoriel (rien de redessiné) : le logo
   est une seule écriture, et la colonne x = 384 (unités du viewBox) est la
   première où le « b » et le « e » ne se touchent plus (mesuré : 0 pixel noir).
   Trois variantes, en SVG et en PNG :
   - b      : le « b » noir seul, sur fond transparent (blanc sur un onglet sombre)
              ← LE DÉFAUT du site depuis le 26/11 (Mathias : « enlever le carré ») ;
   - noir   : carré noir, « b » blanc (le défaut jusqu'au 26/11) ;
   - blanc  : carré blanc, « b » noir.
   Sorties : public/brand/favicon/ (les trois variantes, montrées sur /brand)
   et, pour le défaut : src/app/favicon.ico, public/favicon.ico, public/icon.svg,
   public/icon-16.png, icon-32.png (le « b » seul).
   Les icônes d'ÉCRAN D'ACCUEIL gardent un fond : apple-touch-icon.png (180) et
   icon-192/512.png (Android, manifeste) sont en « blanc ». iOS exige une icône
   opaque et remplit la transparence de noir : un « b » noir y disparaîtrait. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const RACINE = new URL('../..', import.meta.url).pathname
const LOGO = readFileSync(join(RACINE, 'brand/assets/logo/bellajour.svg'), 'utf8')
const COUPE = 384
const ENCRE = '#111111' // --m-couleur-papier-texte
const PAPIER = '#ffffff' // --m-couleur-papier-fond

const g = LOGO.match(/<g[\s\S]*<\/g>/)[0].replace('fill="currentColor"', 'fill="FOND_B"')

/* La boîte du « b » : mesurée sur un rendu à l'échelle 1 du viewBox. */
async function boite() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${COUPE} 1192" width="${COUPE}" height="1192">${g.replace('FOND_B', '#000')}</svg>`
  const { data, info } = await sharp(Buffer.from(svg)).flatten({ background: '#fff' }).greyscale().raw().toBuffer({ resolveWithObject: true })
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[y * info.width + x] < 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 }
}

/* `petit` : pour 16 et 32 px, le trait du « b » s'épaissit (contour de sa
   couleur) et la lettre remplit davantage le carré, sinon elle disparaît. */
function svgVariante(b, variante, petit = false) {
  const w = b.x1 - b.x0
  const h = b.y1 - b.y0
  /* Le « b » occupe 78 % de la hauteur du carré (seul : 92 %). */
  const cote = Math.round(h / (variante === 'b' || petit ? 0.92 : 0.78))
  const vx = Math.round(b.x0 + w / 2 - cote / 2)
  const vy = Math.round(b.y0 + h / 2 - cote / 2)
  const encre = variante === 'noir' ? PAPIER : ENCRE
  const fond = variante === 'noir' ? ENCRE : variante === 'blanc' ? PAPIER : null
  const style = variante === 'b'
    ? `<style>path{fill:${ENCRE}}@media (prefers-color-scheme:dark){path{fill:${PAPIER}}}</style>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${cote} ${cote}" width="512" height="512" role="img" aria-label="Bellajour">` +
    style +
    `<defs><clipPath id="b"><rect x="0" y="0" width="${COUPE}" height="1192"/></clipPath></defs>` +
    (fond ? `<rect x="${vx}" y="${vy}" width="${cote}" height="${cote}" fill="${fond}"/>` : '') +
    `<g clip-path="url(#b)">${petit ? g.replace('FOND_B', encre).replace('stroke="none"', `stroke="${encre}" stroke-width="${Math.round(cote * 0.28)}" stroke-linejoin="round"`) : g.replace('FOND_B', encre)}</g></svg>\n`
}

/* Un .ico avec des PNG dedans (16 et 32) : lu par tous les navigateurs depuis Vista. */
function ico(pngs) {
  const tete = Buffer.alloc(6 + 16 * pngs.length)
  tete.writeUInt16LE(0, 0); tete.writeUInt16LE(1, 2); tete.writeUInt16LE(pngs.length, 4)
  let decalage = tete.length
  pngs.forEach(({ taille, data }, i) => {
    const o = 6 + 16 * i
    tete.writeUInt8(taille >= 256 ? 0 : taille, o); tete.writeUInt8(taille >= 256 ? 0 : taille, o + 1)
    tete.writeUInt16LE(1, o + 4); tete.writeUInt16LE(32, o + 6)
    tete.writeUInt32LE(data.length, o + 8); tete.writeUInt32LE(decalage, o + 12)
    decalage += data.length
  })
  return Buffer.concat([tete, ...pngs.map((p) => p.data)])
}

const png = (svg, taille) => sharp(Buffer.from(svg), { density: 300 }).resize(taille, taille).png().toBuffer()

const b = await boite()
const SORTIE = join(RACINE, 'public/brand/favicon')
mkdirSync(SORTIE, { recursive: true })
for (const v of ['b', 'noir', 'blanc']) {
  const svg = svgVariante(b, v)
  writeFileSync(join(SORTIE, `bellajour-${v}.svg`), svg)
  for (const t of [180, 512]) writeFileSync(join(SORTIE, `bellajour-${v}-${t}.png`), await png(svg, t))
  for (const t of [16, 32]) writeFileSync(join(SORTIE, `bellajour-${v}-${t}.png`), await png(svgVariante(b, v, true), t))
}
const defaut = svgVariante(b, 'b')
writeFileSync(join(RACINE, 'public/icon.svg'), defaut)
const defautPetit = svgVariante(b, 'b', true)
for (const t of [16, 32]) writeFileSync(join(RACINE, `public/icon-${t}.png`), await png(defautPetit, t))
const ecran = svgVariante(b, 'blanc')
for (const t of [192, 512]) writeFileSync(join(RACINE, `public/icon-${t}.png`), await png(ecran, t))
writeFileSync(join(RACINE, 'public/apple-touch-icon.png'), await png(ecran, 180))
const fav = ico([{ taille: 16, data: await png(defautPetit, 16) }, { taille: 32, data: await png(defautPetit, 32) }])
writeFileSync(join(RACINE, 'public/favicon.ico'), fav)
writeFileSync(join(RACINE, 'src/app/favicon.ico'), fav)
console.log('b :', b, '→ public/brand/favicon/ (3 variantes) + défaut « b » seul, écran d\'accueil en carré blanc')
