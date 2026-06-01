// Fix night-session over-shrink on the desktop step-01/02 animation photos.
// UploadVisual renders uploads in a 260x260 cover square; CastingVisual renders
// casting in 160x160 cover circles. The night pass sized them to the MOBILE 72px
// thumbnail (~240px short edge) -> blurry at desktop retina. Regenerate from the
// pristine originals so the SHORT edge covers ~3x the desktop display size.
// fit:'outside' => shorter side == target. Run: node scripts/fix-upload-anim.mjs
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

const ROOT = process.cwd()
const PUB = path.join(ROOT, 'public')
const BACKUP = path.join(ROOT, 'image-originals')

const PLAN = [
  // UploadVisual — 260x260 square, all 12 cycled. short edge 800 ~= 3x display.
  ...Array.from({ length: 12 }, (_, i) => ({
    f: `images/solution/solution-upload-${String(i + 1).padStart(2, '0')}.webp`, short: 800, q: 87,
  })),
  // CastingVisual — 160x160 circles. short edge 600 ~= 3.75x display.
  { f: 'images/solution/solution-casting-01.webp', short: 600, q: 87 },
  { f: 'images/solution/solution-casting-02.webp', short: 600, q: 87 },
  { f: 'images/solution/solution-casting-03.webp', short: 600, q: 87 },
]

async function run() {
  const rows = []
  for (const { f, short, q } of PLAN) {
    const src = path.join(PUB, f)
    const bak = path.join(BACKUP, f)
    const curSize = (await fs.stat(src)).size
    const curMeta = await sharp(src).metadata()
    const origMeta = await sharp(bak).metadata() // pristine original (never the compressed one)

    // fit:'outside' makes the SHORTER side == `short`, preserving aspect ratio,
    // withoutEnlargement guards against any original smaller than target.
    const buf = await sharp(bak)
      .resize({ width: short, height: short, fit: 'outside', withoutEnlargement: true })
      .webp({ quality: q, effort: 6 })
      .toBuffer()
    const out = await sharp(buf).metadata()
    await fs.writeFile(src, buf)

    rows.push({
      f, before: curSize, after: buf.length,
      curDim: `${curMeta.width}x${curMeta.height}`,
      newDim: `${out.width}x${out.height}`,
      origDim: `${origMeta.width}x${origMeta.height}`, q,
    })
  }

  let tb = 0, ta = 0
  console.log('\nfile | dims avant (floues) | dims apres | poids avant | poids apres | q | (original)')
  console.log('-----|----------------------|------------|-------------|-------------|---|----------')
  for (const r of rows) {
    tb += r.before; ta += r.after
    const kb = b => (b / 1024).toFixed(0) + 'KB'
    console.log(`${r.f} | ${r.curDim} | ${r.newDim} | ${kb(r.before)} | ${kb(r.after)} | ${r.q} | ${r.origDim}`)
  }
  console.log('-----')
  console.log(`TOTAL ces ${rows.length} fichiers: ${(tb / 1024).toFixed(0)}KB -> ${(ta / 1024).toFixed(0)}KB`)
}

run().catch(e => { console.error(e); process.exit(1) })
