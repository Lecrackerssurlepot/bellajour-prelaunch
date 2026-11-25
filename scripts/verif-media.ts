/* Harnais de la librairie des visuels (src/content/media.ts).
   npx tsx --tsconfig tsconfig.json scripts/verif-media.ts
   Aucune écriture, aucun réseau : uniquement la fonction pure visuelPour. */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { MEDIA, visuelPour, jourParis, etatRotation, type Emplacement } from '../src/content/media'

let ok = 0
let ko = 0
function verifie(nom: string, cond: boolean) {
  if (cond) { ok++; console.log(`  ✓ ${nom}`) } else { ko++; console.log(`  ✗ ${nom}`) }
}

const TABLE = {
  'test.hero': {
    role: 'test',
    type: 'image',
    defaut: { fichier: '/defaut.webp', alt: 'défaut' },
    rotations: [
      { du: '2026-12-01', au: '2026-12-26', fichier: '/noel.webp', alt: 'noël', valide: true },
      { du: '2027-06-15', au: '2027-08-31', fichier: '/ete.webp', alt: 'été', valide: false },
      { du: '2026-12-20', au: '2026-12-31', fichier: '/fin.webp', alt: 'fin', valide: true },
    ],
  },
  'test.video': {
    role: 'test',
    type: 'video',
    defaut: { fichier: '/poster.webp', alt: 'poster' },
    rotations: [
      { du: '2026-12-01', au: '2026-12-02', fichier: '/p2.webp', alt: 'p2', valide: true, video: { mp4: '/v.mp4', webm: '/v.webm' } },
    ],
  },
} satisfies Record<string, Emplacement>

const f = (iso: string) => visuelPour('test.hero', new Date(iso), TABLE).fichier

console.log('Défaut')
verifie('hors de toute période → défaut', f('2026-11-25T12:00:00Z') === '/defaut.webp')

console.log('Rotation validée dans sa période')
verifie('le 5 décembre → noël', f('2026-12-05T12:00:00Z') === '/noel.webp')
verifie('chevauchement : la première déclarée gagne (22/12 → noël)', f('2026-12-22T12:00:00Z') === '/noel.webp')
verifie('après la première, la seconde validée prend le relais (28/12 → fin)', f('2026-12-28T12:00:00Z') === '/fin.webp')

console.log('Rotation non validée ignorée')
verifie('le 1er juillet 2027, été non validé → défaut', f('2027-07-01T12:00:00Z') === '/defaut.webp')

console.log('Bornes (incluses, heure de Paris)')
verifie('1er décembre 00:00 Paris (30/11 23:00 UTC) → noël', f('2026-11-30T23:00:00Z') === '/noel.webp')
verifie('30 novembre 23:59 Paris (22:59 UTC) → défaut', f('2026-11-30T22:59:00Z') === '/defaut.webp')
verifie('31 décembre 23:59 Paris (22:59 UTC) → fin', f('2026-12-31T22:59:00Z') === '/fin.webp')
verifie('1er janvier 00:00 Paris (31/12 23:00 UTC) → défaut', f('2026-12-31T23:00:00Z') === '/defaut.webp')

console.log('Fuseau')
verifie('hiver : 23:30 UTC le 30/11 = 1er déc. à Paris', jourParis(new Date('2026-11-30T23:30:00Z')) === '2026-12-01')
verifie('été : 22:30 UTC le 14/06 = 15 juin à Paris (UTC+2)', jourParis(new Date('2027-06-14T22:30:00Z')) === '2027-06-15')
verifie('été : 21:59 UTC le 14/06 = encore le 14 à Paris', jourParis(new Date('2027-06-14T21:59:00Z')) === '2027-06-14')

console.log('Vidéo')
const v = visuelPour('test.video', new Date('2026-12-01T10:00:00Z'), TABLE)
verifie('rotation vidéo : poster + mp4 + webm', v.fichier === '/p2.webp' && v.video?.mp4 === '/v.mp4' && v.video?.webm === '/v.webm')
verifie('défaut vidéo sans encodage : poster seul', visuelPour('test.video', new Date('2026-11-01T10:00:00Z'), TABLE).video === undefined)

console.log("États de l'aperçu")
const h: Emplacement = TABLE['test.hero']
verifie('noël le 05/12 : en ligne', etatRotation(h, 0, '2026-12-05') === 'en ligne')
verifie('été : à valider', etatRotation(h, 1, '2027-07-01') === 'à valider')
verifie('fin le 22/12 : masquée par noël', etatRotation(h, 2, '2026-12-22') === 'masquée')
verifie('fin le 25/11 : à venir', etatRotation(h, 2, '2026-11-25') === 'à venir')
verifie('noël le 28/12 : passée', etatRotation(h, 0, '2026-12-28') === 'passée')

console.log('La vraie table')
const racine = join(__dirname, '..', 'public')
for (const [nom, e] of Object.entries(MEDIA) as [string, Emplacement][]) {
  verifie(`${nom} : le défaut existe dans public/`, existsSync(join(racine, e.defaut.fichier)))
  verifie(`${nom} : alt non vide`, e.defaut.alt.trim().length > 0)
  for (const r of e.rotations) {
    verifie(`${nom} : rotation ${r.du} → ${r.au} dans l'ordre`, /^\d{4}-\d{2}-\d{2}$/.test(r.du) && /^\d{4}-\d{2}-\d{2}$/.test(r.au) && r.du <= r.au)
    verifie(`${nom} : rotation ${r.du} : fichier présent`, existsSync(join(racine, r.fichier)))
  }
}

console.log(`\n${ok} vérifiés, ${ko} en échec`)
if (ko > 0) process.exit(1)
