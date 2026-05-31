// Night perf session — image optimizer (sharp).
// Backs up each original to /image-originals (gitignored), then resizes to 2x
// max display size and re-encodes WebP at q82+ IN PLACE. Preserves aspect ratio
// and alpha. Never enlarges, never writes a file larger than the original.
// Idempotent: always re-encodes from the pristine backup. Run:
//   node scripts/optimize-images-night.mjs
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

const ROOT = process.cwd()
const PUB = path.join(ROOT, 'public')
const BACKUP = path.join(ROOT, 'image-originals')

// long-edge target (px) + webp quality, derived from measured 2x max display size.
// long:null => keep current dimensions (re-encode only).
const PLAN = [
  // Hero LCP — display max-width 720px desktop; source already 960x1440 (do not upscale).
  { f: 'images/header-bellajour.webp', long: null, q: 82 },
  // Nav logo (96px) / OG render (520px) / inviter (120px). 1000px covers all + retina.
  { f: 'images/ui/logo.webp', long: 1000, q: 82 },
  // Anxiete full-screen grid cells (~300px * 1.22 zoom) -> 1600 long edge is generous 2x.
  { f: 'images/anxiete/grid-01.webp', long: 1600, q: 82 },
  { f: 'images/anxiete/grid-02.webp', long: 1600, q: 82 },
  { f: 'images/anxiete/grid-03.webp', long: 1600, q: 82 },
  { f: 'images/anxiete/grid-04.webp', long: 1600, q: 82 },
  { f: 'images/anxiete/grid-05.webp', long: 1600, q: 82 },
  { f: 'images/anxiete/grid-06.webp', long: 1600, q: 82 },
  { f: 'images/anxiete/float-01.webp', long: 1600, q: 82 },
  { f: 'images/anxiete/float-02.webp', long: 1600, q: 82 },
  { f: 'images/anxiete/float-03.webp', long: 1600, q: 82 },
  { f: 'images/anxiete/float-04.webp', long: 1600, q: 82 },
  // Brand photos swap into grid cells -> same as grid. Already 1600 tall: re-encode (no upscale).
  { f: 'images/brand/brand-01.webp', long: 1600, q: 82 },
  { f: 'images/brand/brand-02.webp', long: 1600, q: 82 },
  { f: 'images/brand/brand-03.webp', long: 1600, q: 82 },
  { f: 'images/brand/brand-04.webp', long: 1600, q: 82 },
  { f: 'images/brand/brand-05.webp', long: 1600, q: 82 },
  // Solution uploads/casting render ONLY at 72px thumbnails -> 320 long edge = generous 2.5x.
  { f: 'images/solution/solution-upload-01.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-upload-02.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-upload-03.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-upload-04.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-upload-05.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-upload-06.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-upload-07.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-upload-08.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-upload-09.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-upload-10.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-upload-11.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-upload-12.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-casting-01.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-casting-02.webp', long: 320, q: 82 },
  { f: 'images/solution/solution-casting-03.webp', long: 320, q: 82 },
  // Hero thumbs: max 192px display (MiseEnPage) -> 400 long edge.
  { f: 'images/hero/hero-01.webp', long: 400, q: 82 },
  { f: 'images/hero/hero-03.webp', long: 400, q: 82 },
  { f: 'images/hero/hero-05.webp', long: 400, q: 82 },
  { f: 'images/hero/hero-07.webp', long: 400, q: 82 },
  // Album product mockup (transparent) + decor — keep generous, this is THE product shot.
  { f: 'images/Mockup-Album-transparent.webp', long: 2000, q: 85 },
  { f: 'images/decor-album.webp', long: 2000, q: 82 },
]

async function run() {
  const rows = []
  for (const { f, long, q } of PLAN) {
    const src = path.join(PUB, f)
    const bak = path.join(BACKUP, f)
    let before, beforeDim
    try {
      before = (await fs.stat(src)).size
      const m = await sharp(src).metadata()
      beforeDim = `${m.width}x${m.height}`
    } catch (e) {
      rows.push({ f, status: 'MISSING', err: String(e.message) })
      continue
    }
    // backup pristine original once (re-runs must not clobber the backup with an
    // already-optimized file)
    await fs.mkdir(path.dirname(bak), { recursive: true })
    let haveBak = true
    try { await fs.access(bak) } catch { haveBak = false }
    if (!haveBak) await fs.copyFile(src, bak)

    // always re-encode from the pristine backup so re-runs are idempotent
    let pipe = sharp(bak)
    if (long) pipe = pipe.resize({ width: long, height: long, fit: 'inside', withoutEnlargement: true })
    const buf = await pipe.webp({ quality: q, effort: 6 }).toBuffer()
    const out = await sharp(buf).metadata()
    const bakSize = (await fs.stat(bak)).size

    // safety: never serve a file larger than the pristine original
    if (buf.length >= bakSize) {
      await fs.copyFile(bak, src) // restore pristine
      rows.push({ f, before: bakSize, after: bakSize, beforeDim, afterDim: beforeDim, q, note: 'kept original (re-encode not smaller)' })
      continue
    }
    await fs.writeFile(src, buf)
    rows.push({ f, before: bakSize, after: buf.length, beforeDim, afterDim: `${out.width}x${out.height}`, q })
  }

  let tb = 0, ta = 0
  console.log('\nfile | before | after | saved | dims | q')
  console.log('-----|--------|-------|-------|------|---')
  for (const r of rows) {
    if (r.status === 'MISSING') { console.log(`${r.f} | MISSING (${r.err})`); continue }
    tb += r.before; ta += r.after
    const kb = b => (b / 1024).toFixed(0) + 'KB'
    const pct = r.before ? (100 * (1 - r.after / r.before)).toFixed(0) : '0'
    console.log(`${r.f} | ${kb(r.before)} | ${kb(r.after)} | -${pct}% | ${r.beforeDim}->${r.afterDim} | ${r.q}${r.note ? ' [' + r.note + ']' : ''}`)
  }
  console.log('-----')
  console.log(`TOTAL: ${(tb / 1024 / 1024).toFixed(2)}MB -> ${(ta / 1024 / 1024).toFixed(2)}MB (saved ${(100 * (1 - ta / tb)).toFixed(1)}%, ${((tb - ta) / 1024 / 1024).toFixed(2)}MB)`)
}

run().catch(e => { console.error(e); process.exit(1) })
