/* Les visuels v2 : des masters livrés par l'équipe aux fichiers que le site sert.
 *
 * Les masters vivent dans `design-explorations/visuels-v2/` (HORS git, D4) et
 * pèsent de 100 Ko à 42 Mo. Ce script en tire les seules tailles que le site
 * peint réellement, dans `public/images/v2/`, en WebP.
 *
 *   node scripts/images-v2.mjs
 *
 * ⚠️ POURQUOI UN DOSSIER NEUF ET DES NOMS NEUFS. `next.config.ts` sert
 * `/images/*` en `max-age=86400, stale-while-revalidate=2592000` : un fichier
 * remplacé SOUS LE MÊME NOM continue d'être servi depuis le cache jusqu'à un
 * jour. Un chemin neuf (`v2/...`) rend le remplacement visible tout de suite.
 * C'est la contrepartie acceptée le 09/09/2026, écrite dans next.config.ts.
 *
 * ⚠️ LES LARGEURS NE SONT PAS DES ESTIMATIONS. Mesurées le 14/09/2026 sur le
 * serveur local, densité comprise :
 *   .numero (accueil 07)        333 px CSS à 1280 → 1050 couvre le 3x
 *   .sl4-rail figure (page 04)  192 px CSS à 1280, 15vw au-delà → 600 couvre le 2x
 *   .double (/magazine)         657 px CSS à 1280, ≈700 au plafond → 1400 couvre le 2x
 * Le reste suit les mêmes règles : la plus grande taille peinte x la densité.
 *
 * ⚠️ `position: 'attention'` recadre sur la zone que sharp juge la plus
 * chargée, pas sur le centre géométrique. C'est ce qui évite de couper un
 * sujet posé hors du milieu — la demande du 14/09 sur la page 04.
 */

import sharp from 'sharp'
import { mkdir, stat, readdir } from 'node:fs/promises'
import path from 'node:path'

const MASTERS = 'design-explorations/visuels-v2'
const CIBLE = 'public/images/v2'

/* Chaque entrée : le master, le dossier et le nom de code en sortie, le
   rapport de forme visé (null = celui du master, aucun recadrage), et les
   largeurs à produire. */
const TRAVAUX = [
  /* ── ACCUEIL ──────────────────────────────────────────────────────────
     A02 à A05 : Mathias a demandé le 14/09 de NE PAS les changer, seulement
     de les ranger. On recopie donc les pixels tels quels depuis leur place
     actuelle — ni recadrage, ni redimensionnement. */
  { de: 'public/images/univers/solution-upload-02.webp', vers: 'accueil/a02', ratio: null, largeurs: [480] },
  { de: 'public/images/univers/grid-03.webp', vers: 'accueil/a03', ratio: null, largeurs: [600] },
  { de: 'public/images/univers/solution-upload-05.webp', vers: 'accueil/a04', ratio: null, largeurs: [400] },
  { de: 'public/images/univers/solution-upload-09.webp', vers: 'accueil/a05', ratio: null, largeurs: [400] },

  /* ── LA BANDE DE LA PAGE 04 ───────────────────────────────────────────
     Le rail impose UN seul rapport à ses cinq cases (2:3, univers.css) : le
     recadrage est fait ICI, une fois, par le contenu (`attention`), plutôt
     que laissé à `object-fit` qui coupe toujours au centre géométrique.
     ⚠️ A06 à A09 sont encore les couvertures D'ORIGINE, pas les masters
     livrés le 14/09 : ces quatre-là sont des couvertures de Vogue, de Tintin
     et deux affiches de films, protégées et non cessibles (voir le rapport du
     14/09). On les range sous les noms de code pour que la bande soit
     homogène ; le jour où de vrais masters arrivent, seule la ligne `de:`
     change. */
  { de: 'public/images/lancement/galerie/marrakech.webp', vers: 'accueil/a06', ratio: 2 / 3, largeurs: [240, 360, 450] },
  { de: 'public/images/lancement/galerie/japon.webp', vers: 'accueil/a07', ratio: 2 / 3, largeurs: [240, 360, 450] },
  { de: 'public/images/lancement/galerie/patagonie.webp', vers: 'accueil/a08', ratio: 2 / 3, largeurs: [240, 360, 450] },
  { de: 'public/images/lancement/galerie/lisbonne.webp', vers: 'accueil/a09', ratio: 2 / 3, largeurs: [240, 360, 450] },
  { de: `${MASTERS}/BJ-A10.jpeg`, vers: 'accueil/a10', ratio: 2 / 3, largeurs: [240, 360, 600] },

  /* A11 — le numéro de la page 07. Master 10524x14973 (0,7029) contre un
     cadre en 1/1,414 (0,7072) : 0,6 % d'écart, un recadrage invisible. */
  { de: `${MASTERS}/BJ-A11.jpeg`, vers: 'accueil/a11', ratio: 1 / 1.414, largeurs: [450, 700, 1050] },

  /* ── /magazine ────────────────────────────────────────────────────────
     M01 — la grande verticale du collage. Le cadre `.c1` fait 39,5 % x 72,8 %
     d'une boîte 749/574, soit 0,708. Le master fait 0,7029. Idem : invisible. */
  { de: `${MASTERS}/BJ-M01.jpeg`, vers: 'magazine/m01', ratio: 0.708, largeurs: [450, 900] },

  /* M03 — la troisieme du collage. Le master livre le 14/09 est un PAYSAGE
     (4000x2828) pour un cadre portrait (`.c3`, 0,745) : ce n'est pas un
     recadrage, c'est un quart-de-tour. On garde donc la couverture d'origine
     ici, rangee sous son nom de code, en attendant un master portrait. */
  { de: 'public/images/lancement/galerie/japon.webp', vers: 'magazine/m03', ratio: 0.745, largeurs: [240, 360, 450] },

  /* M02 — la paysage du collage. Master 1,4217 ; `.c2` passe de 39,7 % à
     40,4 % de hauteur pour l'épouser exactement (pdp.css). Aucun recadrage. */
  { de: `${MASTERS}/BJ-M02.jpeg`, vers: 'magazine/m02', ratio: null, largeurs: [500, 1000] },

  /* M04 — LA double page, une seule image en travers du pli. Master 1,4145 ;
     `.double` quitte son 760/474 (1,603) pour ce rapport-là. Aucun recadrage. */
  { de: `${MASTERS}/BJ-M04.png`, vers: 'magazine/m04', ratio: null, largeurs: [700, 1050, 1400] },

  /* M04V — la même scène en hauteur, servie sous 560 px de large, là où
     `.droite` et `.pli` sont masqués et où le 1,4145 serait amputé de moitié.
     ⚠️ Plafond à 1120 et non 1560 : le 3x d'un téléphone pèserait 641 Ko
     mesurés, pour un gain invisible sur un écran de 5 pouces. Le 2x suffit. */
  { de: `${MASTERS}/BJ-M04V.png`, vers: 'magazine/m04v', ratio: null, largeurs: [560, 840, 1120] },

  /* M07 — l'image produit des données structurées. Jamais affichée sur le
     site : Google seul la lit, et il la veut en 1200 px de large au moins.
     ⚠️ UN SEUL FICHIER, ENTIER, ET C'EST DÉLIBÉRÉ. Le master livré le 14/09
     est le MÊME que M04 (md5 identique) : une double page titrée, pas la
     photo d'objet demandée. Les trois cadrages que Google préfère (1:1, 4:3,
     16:9) ont été produits puis jetés : essayés, ils tranchent le mot
     « AUSTRALIA » en deux. Mieux vaut une image entière qu'un lettrage coupé
     sous notre marque. Les trois cadrages reviendront avec un vrai master. */
  { de: `${MASTERS}/BJ-M04.png`, vers: 'magazine/m07', ratio: null, largeurs: [1600] },
]

const ko = (o) => Math.round(o / 1024)
let total = 0
let ecrits = 0

for (const t of TRAVAUX) {
  const meta = await sharp(t.de, { limitInputPixels: false }).metadata()
  const dossier = path.join(CIBLE, path.dirname(t.vers))
  await mkdir(dossier, { recursive: true })

  for (const l of t.largeurs) {
    if (l > meta.width) {
      /* Interdit n° 5 : on n'agrandit pas pour faire le nombre. Un master plus
         petit que la taille peinte est un fait qu'on rapporte, pas qu'on
         maquille par interpolation. */
      console.log(`⚠️  ${t.vers}-${l} SAUTÉ : le master ne fait que ${meta.width} px de large`)
      continue
    }
    const cible = `${CIBLE}/${t.vers}-${l}.webp`
    let img = sharp(t.de, { limitInputPixels: false }).rotate()
    if (t.ratio) {
      img = img.resize({
        width: l,
        height: Math.round(l / t.ratio),
        fit: 'cover',
        position: 'attention',
        withoutEnlargement: true,
      })
    } else {
      img = img.resize({ width: l, withoutEnlargement: true })
    }
    await img.webp({ quality: 82 }).toFile(cible)
    const poids = (await stat(cible)).size
    total += poids
    ecrits++
    const dims = await sharp(cible).metadata()
    console.log(`${`${t.vers}-${l}.webp`.padEnd(30)} ${`${dims.width}x${dims.height}`.padEnd(11)} ${String(ko(poids)).padStart(4)} Ko`)
  }
}

console.log(`\n${ecrits} fichiers, ${ko(total)} Ko au total.`)

/* Ce que les masters pèsent, pour mémoire : le rapport entre les deux est le
   seul chiffre qui dit si le script sert à quelque chose. */
try {
  const fichiers = await readdir(MASTERS)
  let brut = 0
  for (const f of fichiers) {
    if (f.startsWith('BJ-')) brut += (await stat(path.join(MASTERS, f))).size
  }
  console.log(`Masters : ${ko(brut)} Ko. Servi : ${ko(total)} Ko.`)
} catch {
  /* Dossier absent sur une autre machine : ce n'est pas une erreur. */
}
