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
import { mkdir, stat, readdir, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'

/* ⚠️ LE HEIC SE CONVERTIT AVANT, ET PAS PAR SHARP (15/09/2026).
   Les photos sorties d'un iPhone arrivent en HEIC. `sharp` en lit l'EN-TÊTE
   — `metadata()` rend bien 2125 x 2833 — mais il ne sait pas le DÉCODER : le
   binaire est compilé sans le greffon de décompression, et l'erreur ne tombe
   qu'au moment d'écrire le fichier de sortie (« Support for this compression
   format has not been built in »). Une métadonnée lue n'est donc PAS une
   promesse que l'image est lisible.
   On passe par `sips`, l'outil d'images de macOS, qui décode le HEIC nativement
   et écrit un PNG intermédiaire dans un dossier temporaire.
   ⚠️ Ce script ne tourne donc que sur un Mac dès qu'un master est en HEIC.
   C'est déjà le cas de tous les scripts du dépôt (ils se lancent à la main
   depuis la machine de Mathias), mais c'est écrit ici pour que personne ne le
   découvre sur une autre machine.
   ⚠️ Aucun navigateur ne sert le HEIC : la conversion n'est pas un confort,
   elle est obligatoire. */
/* ⚠️ POURQUOI 640 ET 1792, ET PAS 600 ET 1920 (15/09/2026, en production).
   Ces deux valeurs ont été DÉCALÉES pour changer d'adresse, pas pour un
   gain d'image. `couverture-the-boys-600.webp` et
   `header-magazines-paysage-1920.webp` répondaient 404 en production alors
   que les fichiers étaient bien déployés et valides.
   LA CAUSE : j'avais interrogé ces deux adresses AVANT que le déploiement ne
   bascule. Elles ont répondu 404 — et `next.config.ts` pose
   `Cache-Control: public, max-age=86400` sur TOUT ce qui commence par
   `/images/`, y compris une réponse d'erreur. Le CDN a donc gardé le 404
   pendant vingt-quatre heures, et le déploiement suivant ne l'a pas purgé.
   Les quatre autres largeurs des mêmes familles marchaient parfaitement :
   je ne les avais pas sondées.
   LE REMÈDE est celui qu'écrit next.config.ts lui-même : changer le NOM.
   ⚠️ NE JAMAIS INTERROGER UNE ADRESSE D'IMAGE EN PRODUCTION AVANT QUE SON
   DÉPLOIEMENT NE SOIT PRÊT. Un seul `curl` suffit à l'empoisonner pour un
   jour. */
const TEMPO = path.join(os.tmpdir(), 'bellajour-heic')
async function lisible(chemin) {
  if (!/\.heic$/i.test(chemin)) return chemin
  await mkdir(TEMPO, { recursive: true })
  const png = path.join(TEMPO, path.basename(chemin).replace(/\.heic$/i, '.png'))
  execFileSync('sips', ['-s', 'format', 'png', chemin, '--out', png], { stdio: 'ignore' })
  return png
}

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

  /* ── A01 — LE HEADER, EN DEUX CADRAGES (15/09/2026) ────────────────────
     La couverture plein écran de l'accueil : une photographie des magazines
     IMPRIMÉS, étalés. C'est l'image produit la plus forte du site.
     ⚠️ DEUX MASTERS, ET DEUX SERVIS SÉPARÉMENT. Le cadre fait toute la
     fenêtre : en portrait sur un téléphone, en paysage sur un écran. Un seul
     fichier obligerait `object-fit: cover` à trancher la moitié de l'autre
     orientation. Le `<picture>` d'Ouverture.tsx choisit sur
     `(orientation: landscape)`, et les deux `<link rel=preload>` de page.tsx
     portent le MÊME media — sinon on précharge un fichier et on en affiche
     un autre, et l'élément LCP part deux fois.
     ⚠️ Les masters sont des HEIC : sharp les lit ici (libheif est compilé
     dans le binaire), mais aucun navigateur ne les sert. La conversion n'est
     donc pas un confort, elle est obligatoire.
     ⚠️ LE PORTRAIT NE FAIT QUE 2125 px DE LARGE, sous les 2400 demandés. Il
     couvre un téléphone jusqu'à trois fois la densité (500 x 3 = 1500) mais
     pas un grand écran en portrait. On ne l'agrandit pas — interdit n° 5 : le
     plafond reste à sa largeur réelle. */
  { de: `${MASTERS}/BJ-A01.HEIC`, vers: 'accueil/header-magazines', ratio: null, largeurs: [640, 960, 1280, 2125] },
  { de: `${MASTERS}/BJ-A01L.HEIC`, vers: 'accueil/header-magazines-paysage', ratio: null, largeurs: [1280, 1792, 2560] },

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
  { de: `${MASTERS}/BJ-A06.png`, vers: 'accueil/couverture-the-boys', ratio: null, largeurs: [240, 360, 640] },
  { de: `${MASTERS}/BJ-A07.png`, vers: 'accueil/couverture-this-night', ratio: null, largeurs: [240, 360, 640] },
  { de: `${MASTERS}/BJ-A08.png`, vers: 'accueil/couverture-lisbonne', ratio: null, largeurs: [240, 360, 640] },
  { de: `${MASTERS}/BJ-A09.png`, vers: 'accueil/couverture-cote-azur', ratio: null, largeurs: [240, 360, 640] },
  { de: `${MASTERS}/BJ-A10.png`, vers: 'accueil/couverture-aussie', ratio: null, largeurs: [240, 360, 640] },
  { de: `${MASTERS}/BJ-A12.png`, vers: 'accueil/couverture-thats-life', ratio: null, largeurs: [240, 360, 640] },

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
  const source = await lisible(t.de)
  const meta = await sharp(source, { limitInputPixels: false }).metadata()
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
    let img = sharp(source, { limitInputPixels: false }).rotate()
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

/* Les PNG intermédiaires du HEIC ne servent qu'à cette exécution. */
await rm(TEMPO, { recursive: true, force: true })
