#!/usr/bin/env node
/* Garde-fou de la charte V2 : compte les couleurs et les px écrits en dur dans src/.
   node brand/scripts/controle-charte.mjs            → résumé par zone
   node brand/scripts/controle-charte.mjs --detail   → chaque ligne fautive
   node brand/scripts/controle-charte.mjs --zone src/app/(atelier)/magazine

   Ce qui compte comme faute :
   - une couleur littérale (#abc, #aabbcc, rgb(), rgba(), hsl(), hsla()) ;
   - une longueur en px (sauf 0px, 1px et 0.5px : traits fins et resets).
   Ce qui n'en est pas :
   - une DÉFINITION de jeton (`--nom: valeur;`) : c'est là que les valeurs vivent ;
   - un commentaire ;
   - les exceptions déclarées ci-dessous.
   Le code de sortie est toujours 0 : ce n'est pas une barrière, c'est un compteur.
   La phase 4 le fait baisser page par page. */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const RACINE = new URL('../..', import.meta.url).pathname
const SRC = join(RACINE, 'src')

/* Exceptions déclarées (fiche O de la charte). */
const EXCEPTIONS = [
  { motif: 'src/lib/mise-en-page/', raison: 'le PDF imprimé : mm et couleurs de la maquette, pas du site' },
  { motif: 'src/app/(atelier)/composer/coverModels.ts', raison: 'les couleurs des couvertures (contenu, pas interface)' },
  { motif: 'src/app/admin/atelier/mise-en-page/[id]/Palette.tsx', raison: 'les couleurs des couvertures (outil de mise en page)' },
  { motif: 'src/app/tokens.css', raison: 'les anciens jetons (définitions), retirés en fin de phase 4' },
  { motif: 'src/app/api/og', raison: 'images de partage rendues hors CSS' },
]

const COULEUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g
const PX = /(?<![\w.-])(\d*\.?\d+)px\b/g
const PX_PERMIS = new Set(['0', '1', '0.5', '.5'])
const EXT = /\.(css|tsx|ts)$/

const args = process.argv.slice(2)
const detail = args.includes('--detail')
const zoneArg = args.includes('--zone') ? args[args.indexOf('--zone') + 1] : null

function fichiers(dir) {
  const out = []
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...fichiers(p))
    else if (EXT.test(n)) out.push(p)
  }
  return out
}

/* Enlève les commentaires en gardant les numéros de ligne. */
function sansCommentaires(txt) {
  return txt
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length))
}

const zones = new Map()
const lignes = []
let exclus = 0

for (const f of fichiers(SRC)) {
  const rel = relative(RACINE, f).split(sep).join('/')
  if (zoneArg && !rel.startsWith(zoneArg)) continue
  if (EXCEPTIONS.some((e) => rel.startsWith(e.motif))) { exclus++; continue }
  const txt = sansCommentaires(readFileSync(f, 'utf8'))
  txt.split('\n').forEach((l, i) => {
    if (/^\s*--[\w-]+\s*:/.test(l)) return // définition de jeton
    const c = (l.match(COULEUR) || []).length
    const p = [...l.matchAll(PX)].filter((m) => !PX_PERMIS.has(m[1])).length
    if (!c && !p) return
    const parts = rel.split('/')
    const zone = parts.slice(0, parts[2]?.startsWith('(') || parts[2] === 'admin' || parts[2] === 'api' ? 4 : 3).join('/')
    const z = zones.get(zone) || { couleurs: 0, px: 0 }
    z.couleurs += c
    z.px += p
    zones.set(zone, z)
    if (detail) lignes.push(`${rel}:${i + 1}  ${l.trim().slice(0, 140)}`)
  })
}

const tri = [...zones.entries()].sort((a, b) => b[1].couleurs + b[1].px - (a[1].couleurs + a[1].px))
let tc = 0
let tp = 0
console.log('Contrôle de la charte V2 : couleurs et px hors jetons dans src/\n')
console.log('couleurs     px  zone')
for (const [z, n] of tri) {
  tc += n.couleurs
  tp += n.px
  console.log(`${String(n.couleurs).padStart(8)} ${String(n.px).padStart(6)}  ${z}`)
}
console.log(`\nTOTAL : ${tc} couleurs, ${tp} px (${tc + tp}) ; ${exclus} fichiers en exception déclarée`)
for (const e of EXCEPTIONS) console.log(`  exception : ${e.motif} (${e.raison})`)
if (detail) console.log('\n' + lignes.join('\n'))
