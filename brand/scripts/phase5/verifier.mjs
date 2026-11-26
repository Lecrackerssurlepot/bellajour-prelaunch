/* Phase 5 : le site parcouru comme un client (Playwright), sans aucune écriture.
   Usage : node brand/scripts/phase5/verifier.mjs [base] [--parties=liens,ecrans,axe,lent,motion,cache]
   Sortie : brand/reports/phase5/resultats.json + captures/ */
import { chromium, webkit, firefox, request } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://localhost:3960').replace(/\/$/, '')
const PARTIES = (process.argv.find((a) => a.startsWith('--parties=')) || '--parties=liens,ecrans,axe,lent,motion,cache').split('=')[1].split(',')
const SORTIE = path.resolve('brand/reports/phase5')
const CAPT = path.join(SORTIE, 'captures')
fs.mkdirSync(CAPT, { recursive: true })
const FAUX = 'a'.repeat(32) /* jeton factice : jamais un vrai dossier */

const PRINCIPALES = ['/', '/magazine', '/offrir', '/partenaires', '/composer', '/compte', '/cgv', '/page-qui-nexiste-pas']
const ROUTES = [
  '/', '/magazine', '/offrir', '/partenaires', '/composer', '/compte', '/merci', '/inviter',
  '/ambassadeurs/charte', '/edition/retrouver', `/numero/${FAUX}`, `/edition/${FAUX}`, `/depot/${FAUX}`,
  ...['cgv', 'confidentialite', 'mentions-legales', 'livraison', 'remboursement'].flatMap((s) => [`/${s}`, `/en/${s}`, `/pt/${s}`]),
  '/page-qui-nexiste-pas',
]
const REDIRS = [
  ['/cgv?lang=en', 308, '/en/cgv?lang=en'], ['/livraison?lang=pt', 308, '/pt/livraison?lang=pt'], ['/atelier', 308, '/'], ['/atelier/composer', 308, '/composer'],
  ['/preventes', 307, '/'], ['/preventes/prix', 307, '/'], ['/lancement', 307, '/'], ['/espace', 307, '/edition/retrouver'],
]
const LARGEURS = [375, 390, 768, 1024, 1440, 1920]
const res = { base: BASE, date: new Date().toISOString() }
/* Préversion Vercel protégée : P5_PARTAGE = lien de partage (_vercel_share), ouvert une fois par contexte pour poser le cookie. */
const PARTAGE = process.env.P5_PARTAGE
async function entrerReq(ctx) { if (PARTAGE) await ctx.get(PARTAGE, { maxRedirects: 5 }).catch(() => {}) }
async function entrerNav(ctx) { if (PARTAGE) { const p = await ctx.newPage(); await p.goto(PARTAGE).catch(() => {}); await p.close() } }

/* Aucune écriture : tout ce qui n'est pas GET vers /api est répondu à vide, et les tiers de paiement/mail coupés. */
async function garde(page) {
  await page.route('**/*', (r) => {
    const u = r.request().url(), m = r.request().method()
    if (/stripe\.com|brevo|sendinblue|vercel-insights|_vercel\/insights|_vercel\/speed/.test(u)) return r.abort()
    if (u.includes('/api/') && m !== 'GET' && !u.includes('/api/partenaires/creneaux')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    return r.continue()
  })
}

async function liens() {
  const ctx = await request.newContext({ baseURL: BASE, maxRedirects: 0 })
  await entrerReq(ctx)
  const vus = new Map(), file = [...ROUTES]
  try {
    const sm = await (await ctx.get('/sitemap.xml')).text()
    for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>/g)) file.push(new URL(m[1]).pathname)
  } catch {}
  const sources = {}
  while (file.length && vus.size < 400) {
    const p = file.shift()
    if (vus.has(p) || p.startsWith('/api') || p.startsWith('/admin')) continue
    const r = await ctx.get(p, { maxRedirects: 5 }).catch((e) => ({ status: () => 0, text: async () => '', err: String(e) }))
    const st = r.status()
    vus.set(p, st)
    if (st === 200 && (r.headers?.()['content-type'] || '').includes('html')) {
      const h = await r.text()
      for (const m of h.matchAll(/href="([^"#?]*)[^"]*"/g)) {
        let u = m[1]
        if (!u || /^(mailto|tel|sms|javascript|https?:\/\/(?!localhost))/.test(u)) continue
        if (u.startsWith('http')) u = new URL(u).pathname
        if (!u.startsWith('/') || /\.(css|js|png|webp|jpg|svg|ico|woff2?|xml|txt|json|webmanifest|pdf|mp4|webm)$/.test(u) || u.startsWith('/_next')) continue
        ;(sources[u] ||= new Set()).add(p)
        if (!vus.has(u)) file.push(u)
      }
    }
  }
  const casses = [...vus].filter(([p, s]) => s >= 400 && p !== '/page-qui-nexiste-pas' && !p.includes(FAUX)).map(([p, s]) => ({ p, s, depuis: [...(sources[p] || [])].slice(0, 3) }))
  const redir = []
  for (const [src, code, dest] of REDIRS) {
    const r = await ctx.get(src, { maxRedirects: 0 })
    const loc = r.headers()['location'] || ''
    redir.push({ src, attendu: `${code} → ${dest}`, obtenu: `${r.status()} → ${loc.replace(BASE, '')}`, ok: r.status() === code && loc.replace(BASE, '') === dest })
  }
  res.liens = { pages: vus.size, statuts: Object.fromEntries(vus), casses, '5xx': [...vus].filter(([, s]) => s >= 500), redirections: redir }
  await ctx.dispose()
}

async function ecrans() {
  const out = []
  for (const [nom, moteur] of [['chromium', chromium], ['webkit', webkit], ['firefox', firefox]]) {
    const b = await moteur.launch()
    for (const w of LARGEURS) {
      const ctx = await b.newContext({ viewport: { width: w, height: w < 768 ? 812 : 900 }, isMobile: nom !== 'firefox' && w < 768, hasTouch: w < 768 && nom !== 'firefox' })
      for (const p of PRINCIPALES) {
        const page = await ctx.newPage(); await garde(page)
        const erreurs = []
        page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text().slice(0, 160)))
        page.on('pageerror', (e) => erreurs.push('PAGEERROR ' + String(e).slice(0, 160)))
        let st = 0
        try { st = (await page.goto(BASE + p, { waitUntil: 'load', timeout: 45000 }))?.status() ?? 0 } catch (e) { erreurs.push('GOTO ' + String(e).slice(0, 120)) }
        await page.waitForTimeout(700)
        /* descendre la page pour déclencher les chargements paresseux et le GSAP */
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } scrollTo(0, 0) }).catch(() => {})
        await page.waitForTimeout(400)
        const m = await page.evaluate(() => {
          const larg = document.documentElement.scrollWidth - innerWidth
          const fautifs = []
          if (larg > 1) for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.right > innerWidth + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed') { fautifs.push((el.className && String(el.className).slice(0, 50)) || el.tagName); if (fautifs.length > 4) break } }
          const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:')).map((i) => i.src.slice(-80))
          return { debord: larg, fautifs, imgs }
        }).catch(() => ({ debord: -1, fautifs: [], imgs: [] }))
        const nomf = `${nom}-${w}-${p === '/' ? 'accueil' : p.slice(1).replace(/\//g, '_')}.png`
        if ([390, 1440].includes(w) || m.debord > 1) await page.screenshot({ path: path.join(CAPT, nomf) }).catch(() => {})
        out.push({ moteur: nom, w, p, st, ...m, erreurs: erreurs.filter((e) => !/vercel|insights|ERR_FAILED|net::ERR_ABORTED|Failed to load resource/.test(e)) })
        await page.close()
      }
      await ctx.close()
    }
    await b.close()
  }
  res.ecrans = out
}

async function axe() {
  const b = await chromium.launch(), out = []
  for (const w of [390, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } })
    for (const p of ROUTES) {
      const page = await ctx.newPage(); await garde(page)
      await page.goto(BASE + p, { waitUntil: 'load' }).catch(() => {})
      await page.waitForTimeout(500)
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze().catch((e) => ({ violations: [], err: String(e) }))
      for (const v of r.violations.filter((v) => ['serious', 'critical'].includes(v.impact)))
        out.push({ w, p, id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 2).map((n) => n.target.join(' ')) })
      await page.close()
    }
    await ctx.close()
  }
  await b.close(); res.axe = out
}

async function lent() {
  const b = await chromium.launch(), out = []
  for (const p of ['/', '/magazine']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 812 }, isMobile: true })
    await entrerNav(ctx)
    const page = await ctx.newPage(); await garde(page)
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.addInitScript(() => { window.__lcp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true }) })
    const t0 = Date.now()
    await page.goto(BASE + p, { waitUntil: 'load', timeout: 120000 }).catch(() => {})
    const charge = Date.now() - t0
    await page.waitForTimeout(1500)
    const m = await page.evaluate(() => ({ fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null, lcp: window.__lcp, octets: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) + (performance.getEntriesByType('navigation')[0]?.transferSize || 0) }))
    out.push({ p, fcp_ms: Math.round(m.fcp), lcp_ms: Math.round(m.lcp), load_ms: charge, ko: Math.round(m.octets / 1024) })
    await ctx.close()
  }
  await b.close(); res.lent = out
}

async function motion() {
  const b = await chromium.launch(), out = []
  for (const reduit of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduit ? 'reduce' : 'no-preference' })
    for (const p of ['/', '/magazine']) {
      const page = await ctx.newPage(); await garde(page)
      const err = []; page.on('pageerror', (e) => err.push(String(e).slice(0, 160)))
      await page.goto(BASE + p, { waitUntil: 'load' })
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)) } })
      await page.waitForTimeout(500)
      const m = await page.evaluate(() => {
        const h = document.querySelector('h1'); const cs = h ? getComputedStyle(h) : null
        return { gsap: typeof window.gsap !== 'undefined' || !!document.querySelector('[style*="translate"]'), animations: document.getAnimations().length, h1Visible: cs ? Number(cs.opacity) > 0.5 && cs.visibility !== 'hidden' : null, invisibles: [...document.querySelectorAll('h1,h2,p')].filter((e) => { const s = getComputedStyle(e); return e.getBoundingClientRect().height > 0 && Number(s.opacity) < 0.05 }).length }
      })
      out.push({ reduit, p, err, ...m })
      await page.close()
    }
    await ctx.close()
  }
  await b.close(); res.motion = out
}

async function cache() {
  const ctx = await request.newContext({ baseURL: BASE })
  await entrerReq(ctx)
  const html = await (await ctx.get('/')).text()
  const cibles = [...new Set([...html.matchAll(/(?:src|href)="(\/(?:_next\/static|images|brand|favicon|icon)[^"?]*)/g)].map((m) => m[1]))].slice(0, 12)
  const out = []
  for (const u of cibles) { const r = await ctx.get(u); out.push({ u, st: r.status(), cc: r.headers()['cache-control'] }) }
  const page = await ctx.get('/'); out.push({ u: '/ (html)', st: page.status(), cc: page.headers()['cache-control'] })
  res.cache = out; await ctx.dispose()
}

const T = { liens, ecrans, axe, lent, motion, cache }
for (const k of PARTIES) { const t = Date.now(); await T[k](); console.log(k, 'fini en', Math.round((Date.now() - t) / 1000), 's') }
const f = path.join(SORTIE, `resultats-${PARTIES.join('-')}.json`)
fs.writeFileSync(f, JSON.stringify(res, null, 1)); console.log('→', f)
