/* Harnais de la librairie des visuels (src/content/media.ts).
   npx tsx --tsconfig tsconfig.json scripts/verif-media.ts
   Aucune écriture, aucun réseau : uniquement la fonction pure visuelPour. */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { MEDIA, visuelPour, jourParis, etatRotation, type Emplacement } from '../src/content/media'
import { accepteMobile, aEcrire, defautFusionne, demandeMigrationV2, emplacementFusionne, estCadrage, estEmplacement, estJour, ligneVersRotation, lireCookieApercu, normaliserSaisie, rotationsFusionnees, cheminDepot, PERIODE_DEFAUT, type LigneRotation } from '../src/lib/visuels/rotation'

let ok = 0
let ko = 0
function verifie(nom: string, cond: boolean) {
  if (cond) { ok++; console.log(`  ✓ ${nom}`) } else { ko++; console.log(`  ✗ ${nom}`) }
}

const TABLE = {
  'test.fond': {
    role: 'test',
    type: 'image',
    optionnel: true,
    defaut: null,
    rotations: [
      { du: '2026-12-01', au: '2026-12-31', fichier: '/fond-noel.webp', alt: 'fond', valide: true },
      { du: '2027-01-01', au: '2027-01-31', fichier: '/fond-brouillon.webp', alt: 'brouillon', valide: false },
    ],
  },
  'test.masque': {
    role: 'test',
    type: 'image',
    optionnel: true,
    defaut: { fichier: '/bandeau.webp', alt: 'bandeau' },
    rotations: [{ du: '2026-08-01', au: '2026-08-31', vide: true, valide: true }],
  },
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

const f = (iso: string) => visuelPour('test.hero', new Date(iso), TABLE)?.fichier

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
verifie('rotation vidéo : poster + mp4 + webm', v !== null && v.fichier === '/p2.webp' && v.video?.mp4 === '/v.mp4' && v.video?.webm === '/v.webm')
verifie('défaut vidéo sans encodage : poster seul', visuelPour('test.video', new Date('2026-11-01T10:00:00Z'), TABLE)?.video === undefined)

console.log('Emplacement vide et rotation vide')
verifie('défaut nul hors période → rien', visuelPour('test.fond', new Date('2026-11-25T12:00:00Z'), TABLE) === null)
verifie('défaut nul, rotation validée → le fond', visuelPour('test.fond', new Date('2026-12-10T12:00:00Z'), TABLE)?.fichier === '/fond-noel.webp')
verifie('rotation vide validée → rien en août', visuelPour('test.masque', new Date('2026-08-15T12:00:00Z'), TABLE) === null)
verifie('rotation vide hors période → le bandeau', visuelPour('test.masque', new Date('2026-09-02T12:00:00Z'), TABLE)?.fichier === '/bandeau.webp')

console.log("Aperçu avec les brouillons")
verifie('brouillon ignoré sans l’option', visuelPour('test.fond', new Date('2027-01-10T12:00:00Z'), TABLE) === null)
verifie('brouillon compté avec l’option', visuelPour('test.fond', new Date('2027-01-10T12:00:00Z'), TABLE, { brouillons: true })?.fichier === '/fond-brouillon.webp')
verifie('brouillons : l’été non validé apparaît', visuelPour('test.hero', new Date('2027-07-01T12:00:00Z'), TABLE, { brouillons: true })?.fichier === '/ete.webp')

console.log("États de l'aperçu")
const h: Emplacement = TABLE['test.hero']
verifie('noël le 05/12 : en ligne', etatRotation(h, 0, '2026-12-05') === 'en ligne')
verifie('été : à valider', etatRotation(h, 1, '2027-07-01') === 'à valider')
verifie('fin le 22/12 : masquée par noël', etatRotation(h, 2, '2026-12-22') === 'masquée')
verifie('fin le 25/11 : à venir', etatRotation(h, 2, '2026-11-25') === 'à venir')
verifie('noël le 28/12 : passée', etatRotation(h, 0, '2026-12-28') === 'passée')

console.log("Les rotations de l'admin (src/lib/visuels/rotation.ts)")
const P = 'https://exemple.supabase.co/storage/v1/object/public/visuels-site/'
verifie('« constructor » n’est pas un emplacement', !estEmplacement('constructor') && !estEmplacement('__proto__'))
verifie('accueil.hero est un emplacement', estEmplacement('accueil.hero'))
verifie('31 février refusé', !estJour('2027-02-31') && estJour('2027-02-28'))
const sain = { emplacement: 'accueil.hero', du: '2026-12-01', au: '2026-12-26', fichier: `${P}accueil.hero/20261126-ab.webp`, alt: 'Noël', valide: true }
const sainLu = normaliserSaisie(sain, P)
verifie('saisie saine acceptée', normaliserSaisie(sain, P).ok)
verifie('fichier hors du panier refusé', !normaliserSaisie({ ...sain, fichier: 'https://ailleurs.fr/x.webp' }, P).ok)
verifie('remontée « .. » refusée', !normaliserSaisie({ ...sain, fichier: `${P}../x.webp` }, P).ok)
verifie('dates à l’envers refusées', !normaliserSaisie({ ...sain, du: '2026-12-27' }, P).ok)
verifie('description vide refusée', !normaliserSaisie({ ...sain, alt: '  ' }, P).ok)
verifie('vide refusé sur un emplacement non optionnel', !normaliserSaisie({ ...sain, vide: true }, P).ok)
verifie('vidéo refusée sur un emplacement image', !normaliserSaisie({ ...sain, video_mp4: `${P}a.mp4` }, P).ok)
const video = normaliserSaisie({ ...sain, emplacement: 'magazine.video', video_mp4: `${P}a.mp4` }, P)
verifie('vidéo acceptée sur magazine.video', video.ok && video.valeur.video_mp4 === `${P}a.mp4` && video.valeur.video_webm === null)
verifie('webm sans mp4 refusé', !normaliserSaisie({ ...sain, emplacement: 'magazine.video', video_webm: `${P}a.webm` }, P).ok)
const ligne = (x: Partial<LigneRotation>): LigneRotation => ({
  id: 'x', emplacement: 'accueil.hero', du: '2026-12-01', au: '2026-12-26', vide: false, fichier: '/a.webp', alt: 'a',
  video_mp4: null, video_webm: null, valide: true, ordre: 0, cree_le: '2026-11-26T10:00:00Z', cree_par: null,
  modifie_le: '2026-11-26T10:00:00Z', modifie_par: null, ...x,
})
verifie('ligne vide → rotation vide', ligneVersRotation(ligne({ vide: true, fichier: null }))?.vide === true)
verifie('ligne sans fichier ni vide écartée', ligneVersRotation(ligne({ fichier: null })) === null)
const fus = rotationsFusionnees('accueil.hero', [
  ligne({ id: 'vieux', fichier: '/vieux.webp', cree_le: '2026-11-20T10:00:00Z' }),
  ligne({ id: 'neuf', fichier: '/neuf.webp', cree_le: '2026-11-25T10:00:00Z' }),
  ligne({ id: 'autre', emplacement: 'magazine.video', fichier: '/autre.webp' }),
])
verifie('fusion : seules les lignes de l’emplacement', fus.length === 2 + MEDIA['accueil.hero'].rotations.length)
verifie('fusion : la plus récente gagne un chevauchement', !fus[0].vide && fus[0].fichier === '/neuf.webp')
verifie('cookie d’aperçu lu', lireCookieApercu('2026-12-15|brouillons')?.brouillons === true && lireCookieApercu('2026-12-15')?.brouillons === false)
verifie('cookie d’aperçu faux ignoré', lireCookieApercu('demain') === null && lireCookieApercu(undefined) === null)
verifie('chemin de dépôt unique et rangé', cheminDepot('accueil.hero', 'webp', new Date('2026-11-26T10:00:00Z'), 'ab12') === 'accueil.hero/20261126-ab12.webp')

console.log('Version téléphone, cadrage, défaut (27/11)')
const tel = normaliserSaisie({ ...sain, fichier_mobile: `${P}tel.webp`, cadrage: '30% 70%' }, P)
verifie('version téléphone et cadrage acceptés', tel.ok && tel.valeur.fichier_mobile === `${P}tel.webp` && tel.valeur.cadrage === '30% 70%')
verifie('version téléphone hors panier refusée', !normaliserSaisie({ ...sain, fichier_mobile: 'https://ailleurs.com/a.webp' }, P).ok)
verifie('version téléphone refusée sur une couverture', !normaliserSaisie({ ...sain, emplacement: 'accueil.couverture', fichier_mobile: `${P}tel.webp` }, P).ok)
verifie('couverture et vidéo sans version téléphone', !accepteMobile(MEDIA['accueil.couverture']) && !accepteMobile(MEDIA['magazine.video']) && accepteMobile(MEDIA['accueil.hero']))
verifie('cadrage faux refusé', !normaliserSaisie({ ...sain, cadrage: '120% 0%' }, P).ok && !normaliserSaisie({ ...sain, cadrage: 'center' }, P).ok)
verifie('cadrage : bornes', estCadrage('0% 100%') && estCadrage('100% 0%') && !estCadrage('50%') && !estCadrage('-1% 0%'))
const def = normaliserSaisie({ ...sain, du: 'nimporte', au: 'quoi', defaut: true }, P)
verifie('défaut : dates ignorées, posées fixes', def.ok && def.valeur.defaut && def.valeur.du === PERIODE_DEFAUT.du && def.valeur.au === PERIODE_DEFAUT.au)
verifie('saisie simple : sans colonnes neuves (table d’avant)', sainLu.ok && !demandeMigrationV2(sainLu.valeur) && !('defaut' in aEcrire(sainLu.valeur)) && !('cadrage' in aEcrire(sainLu.valeur)))
verifie('saisie neuve : colonnes neuves écrites', tel.ok && demandeMigrationV2(tel.valeur) && aEcrire(tel.valeur).fichier_mobile === `${P}tel.webp`)
const lt = ligne({ fichier_mobile: '/tel.webp', cadrage: '10% 20%' })
const rt = ligneVersRotation(lt)
verifie('ligne → rotation avec téléphone et cadrage', !!rt && !rt.vide && rt.mobile === '/tel.webp' && rt.cadrage === '10% 20%')
verifie('cadrage illisible ignoré', (() => { const r = ligneVersRotation(ligne({ cadrage: 'n’importe' })); return !!r && !r.vide && r.cadrage === undefined })())
const lignesDef = [
  ligne({ id: 'd-vieux', defaut: true, fichier: '/d-vieux.webp', cree_le: '2026-11-20T10:00:00Z', ...PERIODE_DEFAUT }),
  ligne({ id: 'd-neuf', defaut: true, fichier: '/d-neuf.webp', cree_le: '2026-11-25T10:00:00Z', ...PERIODE_DEFAUT }),
  ligne({ id: 'd-brouillon', defaut: true, valide: false, fichier: '/d-brouillon.webp', cree_le: '2026-11-26T10:00:00Z', ...PERIODE_DEFAUT }),
]
verifie('défaut : la ligne validée la plus récente gagne', defautFusionne('accueil.hero', lignesDef)?.fichier === '/d-neuf.webp')
verifie('défaut : le brouillon seulement dans l’aperçu', defautFusionne('accueil.hero', lignesDef, true)?.fichier === '/d-brouillon.webp')
verifie('défaut : sans ligne, celui du code', defautFusionne('accueil.hero', [])?.fichier === MEDIA['accueil.hero'].defaut.fichier)
verifie('défaut : n’est pas une rotation datée', rotationsFusionnees('accueil.hero', lignesDef).length === MEDIA['accueil.hero'].rotations.length)
const avecDate = emplacementFusionne('accueil.hero', [...lignesDef, ligne({ id: 'noel', fichier: '/noel.webp', du: '2026-12-01', au: '2026-12-26' })])
verifie('défaut remplacé hors période', visuelPour('accueil.hero', new Date('2026-11-27T12:00:00Z'), { 'accueil.hero': avecDate })?.fichier === '/d-neuf.webp')
verifie('rotation datée passe avant le défaut remplacé', visuelPour('accueil.hero', new Date('2026-12-10T12:00:00Z'), { 'accueil.hero': avecDate })?.fichier === '/noel.webp')
verifie('visuelPour rend la version téléphone', visuelPour('accueil.hero', new Date('2026-12-10T12:00:00Z'), { 'accueil.hero': emplacementFusionne('accueil.hero', [lt]) })?.mobile === '/tel.webp')

console.log('La vraie table')
const racine = join(__dirname, '..', 'public')
for (const [nom, e] of Object.entries(MEDIA) as [string, Emplacement][]) {
  if (e.defaut) {
    verifie(`${nom} : le défaut existe dans public/`, existsSync(join(racine, e.defaut.fichier)))
    verifie(`${nom} : alt non vide`, e.defaut.alt.trim().length > 0)
  } else {
    verifie(`${nom} : vide par défaut seulement s'il est optionnel`, e.optionnel === true)
  }
  for (const r of e.rotations) {
    verifie(`${nom} : rotation ${r.du} → ${r.au} dans l'ordre`, /^\d{4}-\d{2}-\d{2}$/.test(r.du) && /^\d{4}-\d{2}-\d{2}$/.test(r.au) && r.du <= r.au)
    if (r.vide) verifie(`${nom} : rotation vide seulement s'il est optionnel`, e.optionnel === true)
    else verifie(`${nom} : rotation ${r.du} : fichier présent`, existsSync(join(racine, r.fichier)))
  }
}

console.log(`\n${ok} vérifiés, ${ko} en échec`)
if (ko > 0) process.exit(1)
