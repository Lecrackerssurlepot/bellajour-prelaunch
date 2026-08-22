/* eslint-disable */
/**
 * Worker de réduction — JAMAIS sur le thread principal.
 *
 * ┌── POURQUOI CE FICHIER EST EN JAVASCRIPT NU, ET AUTONOME ─────────────────
 * │ Écrit en TypeScript et instancié via `new URL('./x.ts', import.meta.url)`,
 * │ Turbopack ne le compile PAS : il recopie le .ts tel quel dans
 * │ static/media/ et fait pointer le bundle dessus. Le navigateur reçoit alors
 * │ du TypeScript, échoue à l'analyse, et le pool bascule en mode dégradé —
 * │ SANS un mot, puisque l'échec est justement prévu et rattrapé. Vérifié sur
 * │ ce dépôt : `.next/static/media/reduire.worker.<hash>.ts`.
 * │
 * │ Donc : JavaScript nu, zéro import, tout dedans — EXIF compris. Le fichier
 * │ recopié tel quel est alors exactement le fichier qui s'exécute.
 * └──────────────────────────────────────────────────────────────────────────
 *
 * Décoder puis ré-encoder une photo de 48 Mpx coûte plusieurs centaines de
 * millisecondes. Fait dans la boucle principale, cela gèle le compteur, la
 * jauge et le défilement pendant tout un import : sur un iPhone, l'écran se
 * lit comme un site planté.
 *
 * Le worker ne décide de RIEN. Il reçoit un fichier et deux drapeaux, il rend
 * une charge utile et une vignette. Toute la politique (que réduire, quand
 * abandonner, dans quel ordre) vit dans moteur.ts.
 *
 * Il n'échoue jamais vraiment : quand le décodage est impossible — un HEIC
 * sous Chrome, un fichier abîmé — il répond « charge : null », ce qui veut
 * dire « envoie l'original tel quel ». Un outil de confort ne doit pas
 * pouvoir bloquer un dépôt.
 */

/* Plafond d'envoi. Jumeau de PAGE_IMAGE_MAX_DIMENSION_PX côté rendu PDF :
   au-delà, on transporte des pixels que l'impression ne verra jamais. */
const COTE_MAX = 5200

/* La vignette est la clé de la mémoire (piège nº18). Un objectURL posé sur le
   fichier d'origine maintient ce fichier en vie tant que la tuile est à
   l'écran : 100 photos × 4 Mo = 400 Mo jamais rendus. La grille pointe donc
   sur ces ~20 Ko, et l'original est libéré dès la confirmation serveur. */
const COTE_VIGNETTE = 320

const QUALITE_REDUITE = 0.85
const QUALITE_VIGNETTE = 0.72

/* ══════════════════════════════════════════════════════════════════════════
   EXIF RECUIT — extraction et greffe du segment APP1.

   Réduire passe par un canvas, et un canvas ne recrache que des pixels : date
   de prise de vue, GPS, appareil, tout est jeté. Or ces métadonnées sont ce
   qui permettra à l'atelier d'ordonner un numéro dans le temps. Le mémo est
   explicite (étape 3) : « EXIF d'origine RETRANSPLANTÉ ». On découpe donc le
   bloc APP1 de l'original et on le recoud dans le JPEG produit.

   LE PIÈGE DE L'ORIENTATION. Le décodage applique l'orientation EXIF : les
   pixels sortent DROITS. Recoudre alors un EXIF qui dit encore « tourne de
   90° » ferait pivoter la photo une SECONDE fois chez les lecteurs qui
   respectent le tag, et pas chez les autres. D'où le tag 0x0112 remis à 1.
   ══════════════════════════════════════════════════════════════════════════ */

const SOI = 0xd8
const SOS = 0xda
const APP1 = 0xe1
const TAG_ORIENTATION = 0x0112

/** Le segment porte-t-il bien la signature « Exif\0\0 » ? */
function estSegmentExif(o, i) {
  return (
    o[i + 4] === 0x45 && o[i + 5] === 0x78 && o[i + 6] === 0x69 &&
    o[i + 7] === 0x66 && o[i + 8] === 0x00 && o[i + 9] === 0x00
  )
}

/**
 * Position et longueur du premier segment APP1/Exif, ou null.
 * Parcourt les marqueurs jusqu'au SOS : au-delà commencent les données
 * compressées, où une paire d'octets 0xFFxx ne signifie plus rien.
 */
function trouverApp1Exif(o) {
  if (o.length < 4 || o[0] !== 0xff || o[1] !== SOI) return null

  let i = 2
  while (i + 3 < o.length) {
    if (o[i] !== 0xff) return null
    const marqueur = o[i + 1]

    /* Octets de bourrage : une suite de 0xFF précède parfois un marqueur. */
    if (marqueur === 0xff) { i++; continue }
    /* Marqueurs sans charge utile — rien à sauter au-delà des deux octets. */
    if (marqueur === 0x01 || (marqueur >= 0xd0 && marqueur <= 0xd7)) { i += 2; continue }
    if (marqueur === SOS) return null

    const longueur = (o[i + 2] << 8) | o[i + 3]
    if (longueur < 2 || i + 2 + longueur > o.length) return null

    if (marqueur === APP1 && longueur >= 8 && estSegmentExif(o, i)) {
      return { debut: i, longueur: 2 + longueur }
    }
    i += 2 + longueur
  }
  return null
}

/**
 * Remet le tag Orientation de l'IFD0 à 1 (« déjà droite »), en place.
 *
 * Le bloc TIFF commence à l'octet 10 du segment : 2 (marqueur) + 2 (longueur)
 * + 6 (« Exif\0\0 »). Toutes les adresses internes au TIFF sont relatives à ce
 * point — c'est ce qui permet de recopier le segment tel quel sans réécrire
 * une seule autre valeur, vignette EXIF comprise.
 */
function forcerOrientationDroite(segment) {
  const tiff = 10
  if (segment.length < tiff + 8) return

  const petitBoutiste = segment[tiff] === 0x49 && segment[tiff + 1] === 0x49
  const grandBoutiste = segment[tiff] === 0x4d && segment[tiff + 1] === 0x4d
  if (!petitBoutiste && !grandBoutiste) return

  const vue = new DataView(segment.buffer, segment.byteOffset, segment.byteLength)
  const le = petitBoutiste

  if (vue.getUint16(tiff + 2, le) !== 42) return /* nombre magique TIFF */

  const ifd0 = tiff + vue.getUint32(tiff + 4, le)
  if (ifd0 + 2 > segment.length) return

  const nb = vue.getUint16(ifd0, le)
  for (let e = 0; e < nb; e++) {
    const entree = ifd0 + 2 + e * 12
    if (entree + 12 > segment.length) return

    if (vue.getUint16(entree, le) === TAG_ORIENTATION) {
      /* Type 3 = SHORT, valeur logée en clair dans l'entrée (2 octets ≤ 4). */
      if (vue.getUint16(entree + 2, le) === 3) vue.setUint16(entree + 8, 1, le)
      return
    }
  }
}

/**
 * Recoud le segment juste après le SOI du JPEG produit, en retirant l'APP1
 * que l'encodeur aurait posé. Le canvas n'en pose pas, mais on ne parie pas
 * là-dessus : deux APP1/Exif dans un même fichier, c'est un fichier illisible
 * pour la moitié des lecteurs.
 */
function grefferExif(jpeg, segment) {
  if (jpeg.length < 2 || jpeg[0] !== 0xff || jpeg[1] !== SOI) return jpeg

  const existant = trouverApp1Exif(jpeg)
  let corps
  if (existant) {
    const avant = jpeg.subarray(2, existant.debut)
    const apres = jpeg.subarray(existant.debut + existant.longueur)
    corps = new Uint8Array(avant.length + apres.length)
    corps.set(avant, 0)
    corps.set(apres, avant.length)
  } else {
    corps = jpeg.subarray(2)
  }

  const sortie = new Uint8Array(2 + segment.length + corps.length)
  sortie[0] = 0xff
  sortie[1] = SOI
  sortie.set(segment, 2)
  sortie.set(corps, 2 + segment.length)
  return sortie
}

/* ══════════════════════════════════════════════════════════════════════════
   RÉDUCTION
   ══════════════════════════════════════════════════════════════════════════ */

function dessiner(bitmap, cote) {
  const facteur = Math.min(1, cote / Math.max(bitmap.width, bitmap.height))
  const l = Math.max(1, Math.round(bitmap.width * facteur))
  const h = Math.max(1, Math.round(bitmap.height * facteur))

  const canvas = new OffscreenCanvas(l, h)
  const c2d = canvas.getContext('2d')
  if (!c2d) throw new Error('2d indisponible')

  c2d.imageSmoothingEnabled = true
  c2d.imageSmoothingQuality = 'high'
  c2d.drawImage(bitmap, 0, 0, l, h)
  return canvas
}

/** Greffe de l'EXIF d'origine dans le JPEG produit, orientation neutralisée. */
async function recoudre(produit, original) {
  try {
    const octets = new Uint8Array(await original.arrayBuffer())
    const trouve = trouverApp1Exif(octets)
    if (!trouve) return produit

    const segment = octets.slice(trouve.debut, trouve.debut + trouve.longueur)
    forcerOrientationDroite(segment)

    const recousu = grefferExif(new Uint8Array(await produit.arrayBuffer()), segment)
    return new Blob([recousu], { type: 'image/jpeg' })
  } catch (_) {
    /* Un EXIF exotique ne doit pas coûter la photo : on rend le JPEG nu. */
    return produit
  }
}

async function traiter(d) {
  const vide = { id: d.id, charge: null, vignette: null, largeur: 0, hauteur: 0 }

  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
    return vide
  }

  let bitmap
  try {
    /* `from-image` explicite : la valeur par défaut a changé au fil des
       versions de navigateur, et s'en remettre à elle, c'est parier sur une
       rotation. Les pixels sortent DROITS — d'où le tag remis à 1 plus haut. */
    bitmap = await createImageBitmap(d.fichier, { imageOrientation: 'from-image' })
  } catch (_) {
    /* HEIC sous Chrome, fichier abîmé : pas de décodage, pas d'aperçu, mais
       l'original part quand même. La grille bascule sur la tuile sobre. */
    return vide
  }

  const largeur = bitmap.width
  const hauteur = bitmap.height

  let vignette = null
  try {
    vignette = await dessiner(bitmap, COTE_VIGNETTE)
      .convertToBlob({ type: 'image/jpeg', quality: QUALITE_VIGNETTE })
  } catch (_) {
    vignette = null
  }

  /* On ne réduit QUE ce qui dépasse. Recomprimer une photo déjà sous le
     plafond, c'est une perte sèche : l'original part tel quel, EXIF intact
     par construction, et personne n'a payé de CPU pour l'abîmer. */
  if (!d.reduire || Math.max(largeur, hauteur) <= COTE_MAX) {
    bitmap.close()
    return { id: d.id, charge: null, vignette, largeur, hauteur }
  }

  let charge = null
  try {
    const blob = await dessiner(bitmap, COTE_MAX)
      .convertToBlob({ type: 'image/jpeg', quality: QUALITE_REDUITE })

    charge = d.estJpeg ? await recoudre(blob, d.fichier) : blob

    /* Une réduction plus lourde que l'original n'a aucun intérêt : on garde
       l'original, de meilleure qualité pour le même transport. */
    if (charge.size >= d.fichier.size) charge = null
  } catch (_) {
    charge = null
  }

  bitmap.close()
  return { id: d.id, charge, vignette, largeur, hauteur }
}

self.onmessage = function (e) {
  const d = e.data

  /* Sonde de démarrage : le moteur envoie un ping avant tout travail, pour
     savoir si ce fichier s'exécute VRAIMENT. Sans elle, un worker qui
     n'analyse pas se traduirait par un dépôt silencieusement sans vignettes
     et sans réduction — le mode dégradé, mais invisible. */
  if (d && d.ping) { self.postMessage({ id: d.id, pong: true }); return }

  traiter(d)
    .then(function (r) { self.postMessage(r) })
    .catch(function () {
      self.postMessage({ id: d.id, charge: null, vignette: null, largeur: 0, hauteur: 0 })
    })
}
