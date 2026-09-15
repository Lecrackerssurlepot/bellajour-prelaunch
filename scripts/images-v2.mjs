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

/* Chaque entrée : le master, le CHEMIN DE SORTIE, le rapport de forme visé
   (null = celui du master, aucun recadrage), et les largeurs à produire.
   ⚠️ LE NOM DE SORTIE EST PARLANT, PAS CODÉ (15/09/2026). Il valait `a06`,
   `m04`, `m07` — les codes de la commande, utiles entre nous et muets pour
   tout le monde. Le nom d'un fichier image est lu par Google comme un signal
   de contenu, et c'est le seul texte qu'un moteur trouve dans une recherche
   d'images à côté de l'`alt`. `couverture-lisbonne-600.webp` dit ce que
   `a08-600.webp` cachait.
   ⚠️ Le code de la commande, lui, ne disparaît pas : il vit dans
   `docs/reference/VISUELS-NOMMAGE.md` et dans le nom du master déposé. */
const TRAVAUX = [
  /* ── ACCUEIL ──────────────────────────────────────────────────────────
     A02 à A05 : Mathias a demandé le 14/09 de NE PAS les changer, seulement
     de les ranger. On recopie donc les pixels tels quels depuis leur place
     actuelle — ni recadrage, ni redimensionnement. */
  { de: 'public/images/univers/solution-upload-02.webp', vers: 'accueil/reseaux-photo-telephone', ratio: null, largeurs: [480] },
  { de: 'public/images/univers/grid-03.webp', vers: 'accueil/reseaux-video-telephone', ratio: null, largeurs: [600] },
  { de: 'public/images/univers/solution-upload-05.webp', vers: 'accueil/reseaux-publication', ratio: null, largeurs: [400] },
  { de: 'public/images/univers/solution-upload-09.webp', vers: 'accueil/reseaux-story', ratio: null, largeurs: [400] },

  /* ── LA BANDE DE LA PAGE 04 ───────────────────────────────────────────
     Le rail impose UN seul rapport à ses cinq cases (2:3, univers.css) : le
     recadrage est fait ICI, une fois, par le contenu (`attention`), plutôt
     que laissé à `object-fit` qui coupe toujours au centre géométrique.
     ⚠️ LES QUATRE MASTERS PROTÉGÉS SONT REMPLACÉS (15/09/2026). La première
     livraison posait ici une couverture de Vogue, un album de Tintin et deux
     affiches de films : refusés, et la raison est écrite dans
     `docs/reference/VISUELS-NOMMAGE.md`. Les quatre nouveaux sont de vraies
     couvertures Bellajour, 4066x5750 chacune.
     ⚠️ AUCUN RECADRAGE sur ces quatre-là (`ratio: null`) : ce sont des
     couvertures COMPOSÉES — titre en tête, légende en pied. Un recadrage,
     même choisi par le contenu, trancherait un lettrage. C'est le cadre du
     rail qui prend leur rapport (univers.css), pas l'inverse.
     ⚠️ PLUS AUCUN RECADRAGE ICI depuis le 15/09 au soir : A10 était une
     photographie de page d'album, la seule à ne pas avoir ce rapport, donc la
     seule rognée. Mathias l'a remplacée par une couverture (« Aussie ») et en
     a ajouté une SIXIÈME (A12). Les six partagent maintenant le même master
     4066x5750, et pas un pixel n'est coupé. */
  { de: `${MASTERS}/BJ-A06.png`, vers: 'accueil/couverture-the-boys', ratio: null, largeurs: [240, 360, 600] },
  { de: `${MASTERS}/BJ-A07.png`, vers: 'accueil/couverture-this-night', ratio: null, largeurs: [240, 360, 600] },
  { de: `${MASTERS}/BJ-A08.png`, vers: 'accueil/couverture-lisbonne', ratio: null, largeurs: [240, 360, 600] },
  { de: `${MASTERS}/BJ-A09.png`, vers: 'accueil/couverture-cote-azur', ratio: null, largeurs: [240, 360, 600] },
  { de: `${MASTERS}/BJ-A10.png`, vers: 'accueil/couverture-aussie', ratio: null, largeurs: [240, 360, 600] },
  { de: `${MASTERS}/BJ-A12.png`, vers: 'accueil/couverture-thats-life', ratio: null, largeurs: [240, 360, 600] },

  /* A11 — le numéro de la page 07. Master 10524x14973 (0,7029) contre un
     cadre en 1/1,414 (0,7072) : 0,6 % d'écart, un recadrage invisible. */
  { de: `${MASTERS}/BJ-A11.jpeg`, vers: 'accueil/couverture-rio', ratio: 1 / 1.414, largeurs: [450, 700, 1050] },

  /* ── /magazine ────────────────────────────────────────────────────────
     M01 — la grande verticale du collage. Le cadre `.c1` fait 39,5 % x 72,8 %
     d'une boîte 749/574, soit 0,708. Le master fait 0,7029. Idem : invisible. */
  { de: `${MASTERS}/BJ-M01.jpeg`, vers: 'magazine/couverture-sicile', ratio: 0.708, largeurs: [450, 900] },

  /* M03 — la troisieme du collage. Le master est un PAYSAGE (4000x2828).
     Mathias a tranche le 14/09 : c'est le CADRE qui passe en paysage, pas
     l'image qu'on tourne. `.c3` vaut desormais 1,4145 (pdp.css), soit
     exactement le rapport du master — aucun recadrage. */
  { de: `${MASTERS}/BJ-M03.png`, vers: 'magazine/double-page-lagon', ratio: null, largeurs: [500, 1000] },

  /* M02 — la paysage du collage. Master 1,4217 ; `.c2` passe de 39,7 % à
     40,4 % de hauteur pour l'épouser exactement (pdp.css). Aucun recadrage. */
  { de: `${MASTERS}/BJ-M02.jpeg`, vers: 'magazine/couverture-noosa', ratio: null, largeurs: [500, 1000] },

  /* M04 — LA double page, une seule image en travers du pli. Master 1,4145 ;
     `.double` quitte son 760/474 (1,603) pour ce rapport-là. Aucun recadrage. */
  { de: `${MASTERS}/BJ-M04.png`, vers: 'magazine/double-page-australie', ratio: null, largeurs: [700, 1050, 1400] },

  /* M04V — la même scène en hauteur, servie sous 560 px de large, là où
     `.droite` et `.pli` sont masqués et où le 1,4145 serait amputé de moitié.
     ⚠️ Plafond à 1120 et non 1560 : le 3x d'un téléphone pèserait 641 Ko
     mesurés, pour un gain invisible sur un écran de 5 pouces. Le 2x suffit. */
  { de: `${MASTERS}/BJ-M04V.png`, vers: 'magazine/double-page-australie-portrait', ratio: null, largeurs: [560, 840, 1120] },

  /* M07 — l'image produit des données structurées. Jamais affichée sur le
     site : Google seul la lit, et il la veut en 1200 px de large au moins.
     ⚠️ UN SEUL FICHIER, ENTIER, ET C'EST DÉLIBÉRÉ. Le master livré le 14/09
     est le MÊME que M04 (md5 identique) : une double page titrée, pas la
     photo d'objet demandée. Les trois cadrages que Google préfère (1:1, 4:3,
     16:9) ont été produits puis jetés : essayés, ils tranchent le mot
     « AUSTRALIA » en deux. Mieux vaut une image entière qu'un lettrage coupé
     sous notre marque. Les trois cadrages reviendront avec un vrai master. */
  { de: `${MASTERS}/BJ-M04.png`, vers: 'magazine/magazine-photo-personnalise', ratio: null, largeurs: [1600] },

  /* ── LE LOGO, AUX TAILLES OÙ ON LE REGARDE (15/09/2026) ──
     `ui/logo.webp` fait 1000 x 707 et pèse 52 Ko. MESURÉ : il n'est peint
     nulle part au-delà de 204 px CSS (la barre de `/merci`), 120 sur
     `/inviter`, 102 sur `/ambassadeurs`. On servait donc cinq fois trop de
     pixels sur trois pages. 640 couvre le plus grand des trois à densité 3. */
  { de: 'public/images/ui/logo.webp', vers: 'ui/logo-bellajour', ratio: null, largeurs: [240, 640] },

  /* ── LA SIGNATURE DE LA BARRE ──
     Elle fait 320 x 122 et elle est sur TOUTES les pages de l'atelier, dans
     une barre fixe donc chargée tout de suite. MESURÉE à l'écran : 60 x 23 px.
     On servait cinq fois trop de pixels sur le chemin critique. 240 couvre
     encore le quadruple de densité. */
  { de: 'public/images/ui/signature-blanche.webp', vers: 'ui/signature-bellajour', ratio: null, largeurs: [240] },
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
