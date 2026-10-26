/* L'aperçu d'une photo HEIC dans un navigateur qui ne sait pas la lire
   (Chrome, Firefox, Android ; Safari sait). Édition collective, T-150.

   Worker CLASSIQUE servi depuis public/, hors du bundler (comme pdf.js) :
   Turbopack recopierait un worker .ts sans le compiler. Il charge le
   décodeur libheif (libheif-js 1.19.8, LGPL-3.0, copie NON MODIFIÉE de
   node_modules/libheif-js/libheif-wasm/libheif-bundle.js, licence à côté)
   à la PREMIÈRE photo seulement : 1,4 Mo qu'on ne paie que si un HEIC arrive.

   Il rend une vignette JPEG de 320 px (même taille et même qualité que
   reduire.worker.js), les dimensions et, si on la demande (Édition
   collective, 5A), la version moyenne d'« Agrandir ». L'ORIGINAL n'est jamais touché : il
   part tel quel au coffre, pour l'impression. Un échec rend null : la photo
   part quand même, sans aperçu, comme avant. */

const COTE_VIGNETTE = 320
const QUALITE_VIGNETTE = 0.72

let lib = null
let decodeur = null

function charger() {
  if (!lib) {
    importScripts('/heic/libheif-bundle.js')
    lib = self.libheif()
    /* UN décodeur par worker : il libère le contexte précédent à chaque
       photo ; en créer un par photo en laisserait un par photo en mémoire. */
    decodeur = new lib.HeifDecoder()
  }
}

function afficher(image, largeur, hauteur) {
  return new Promise(function (resoudre, rejeter) {
    image.display({ data: new Uint8ClampedArray(largeur * hauteur * 4), width: largeur, height: hauteur }, function (d) {
      if (!d) rejeter(new Error('HEIF illisible'))
      else resoudre(d)
    })
  })
}

async function traiter(d) {
  charger()
  const images = decodeur.decode(new Uint8Array(d.octets))
  if (!images || !images.length) return { id: d.id, vignette: null, moyenne: null, largeur: 0, hauteur: 0 }
  /* La plus grande image du fichier (`is_primary` n'existe pas dans ce
     libheif-js, vérifié le 15/10) : un iPhone n'en met qu'une. */
  let image = images[0]
  for (const i of images) if (i.get_width() * i.get_height() > image.get_width() * image.get_height()) image = i
  const largeur = image.get_width()
  const hauteur = image.get_height()
  let vignette = null
  let moyenne = null
  try {
    const pixels = await afficher(image, largeur, hauteur)
    const plein = new OffscreenCanvas(largeur, hauteur)
    plein.getContext('2d').putImageData(new ImageData(pixels.data, largeur, hauteur), 0, 0)
    const facteur = Math.min(1, COTE_VIGNETTE / Math.max(largeur, hauteur))
    const l = Math.max(1, Math.round(largeur * facteur))
    const h = Math.max(1, Math.round(hauteur * facteur))
    const petit = new OffscreenCanvas(l, h)
    const c2d = petit.getContext('2d')
    c2d.imageSmoothingEnabled = true
    c2d.imageSmoothingQuality = 'high'
    c2d.drawImage(plein, 0, 0, l, h)
    vignette = await petit.convertToBlob({ type: 'image/jpeg', quality: QUALITE_VIGNETTE })
    /* La version moyenne d'« Agrandir » (5A, 26/10), seulement si le moteur
       la demande (`d.moyenne` = { cote, qualite }) et si la photo dépasse ce
       côté. Tirée de la même image décodée : aucun décodage de plus. */
    if (d.moyenne && d.moyenne.cote > 0 && Math.max(largeur, hauteur) > d.moyenne.cote) {
      try {
        const fm = d.moyenne.cote / Math.max(largeur, hauteur)
        const moyen = new OffscreenCanvas(Math.max(1, Math.round(largeur * fm)), Math.max(1, Math.round(hauteur * fm)))
        const cm = moyen.getContext('2d')
        cm.imageSmoothingEnabled = true
        cm.imageSmoothingQuality = 'high'
        cm.drawImage(plein, 0, 0, moyen.width, moyen.height)
        moyenne = await moyen.convertToBlob({ type: 'image/jpeg', quality: d.moyenne.qualite })
      } catch {
        moyenne = null
      }
    }
  } finally {
    for (const i of images) {
      try { i.free() } catch { /* déjà libérée */ }
    }
  }
  return { id: d.id, vignette: vignette, moyenne: moyenne, largeur: largeur, hauteur: hauteur }
}

self.onmessage = function (e) {
  const d = e.data
  if (d && d.ping) { self.postMessage({ id: d.id, pong: true }); return }
  traiter(d)
    .then(function (r) { self.postMessage(r) })
    .catch(function () { self.postMessage({ id: d.id, vignette: null, moyenne: null, largeur: 0, hauteur: 0 }) })
}
