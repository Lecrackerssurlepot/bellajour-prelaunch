/**
 * Le magazine Bellajour en 3D. Un seul modèle, réutilisé partout : site, /brand,
 * mockups, réseaux, brochures, vidéos (charte V2, fiche J).
 *
 * Deux portes d'entrée :
 *   creerMagazine(options)        → l'objet seul (un Group Three.js), sans scène ;
 *   creerStudio(conteneur, opts)  → le magazine dans son studio : lumière douce,
 *                                   ombre au sol, caméra, glisser pour tourner.
 *
 * Le fichier tourne tel quel dans Next (import dynamique) et dans une page HTML
 * nue (exporter.html, avec une importmap pour `three`).
 *
 * Mesures : le format et le dos viennent du code du site (voir dimensions.js).
 * Tout le reste (galbe des pages ouvertes, teinte du papier, lumière) est une
 * approximation visuelle, jamais une mesure.
 */
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  ShadowMaterial,
  SRGBColorSpace,
  Vector2,
  VSMShadowMap,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  EPAISSEUR_COUVERTURE_MM,
  PAGE_H,
  PAGE_L,
  dosMmPourPages,
  normaliserFinition,
  normaliserPages,
} from './dimensions.js'

/** 1 unité de scène = 100 mm. */
const U = 0.01

/* Les teintes du papier : visuelles, sans valeur de mesure. */
const PAPIER = '#fbfaf6'
const TRANCHE_CLAIR = '#f6f2e8'
const TRANCHE_TRAIT = '#d9d2c2'
const COULEUR_DEFAUT = '#111111'

/* Le rendu de la couverture pelliculée, par finition. */
const RENDU = {
  gloss: { rugosite: 0.3, vernis: 1, rugositeVernis: 0.07, rugositeLeger: 0.2, pages: 0.5 },
  matte: { rugosite: 0.85, vernis: 0, rugositeVernis: 0.5, rugositeLeger: 0.85, pages: 0.78 },
}

/* ─────────────────────────── les textures ─────────────────────────── */

function chargerImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Image illisible : ${src}`))
    image.src = src
  })
}

function toile(largeur, hauteur) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(largeur))
  c.height = Math.max(1, Math.round(hauteur))
  return c
}

/** Dessine `image` en couvrant toute la toile (recadrage centré), sur une zone source donnée. */
function peindreCouvrant(ctx, image, zone, largeur, hauteur) {
  const ratio = largeur / hauteur
  let { x, y, l, h } = zone
  if (l / h > ratio) {
    const nl = h * ratio
    x += (l - nl) / 2
    l = nl
  } else {
    const nh = l / ratio
    y += (h - nh) / 2
    h = nh
  }
  ctx.drawImage(image, x, y, l, h, 0, 0, largeur, hauteur)
}

function enTexture(canvas, anisotropie) {
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = anisotropie
  return t
}

/** Une face de couverture : l'image recadrée au format de la page. */
function toileCouverture(image, cote, ratio) {
  const c = toile(cote * ratio, cote)
  const ctx = c.getContext('2d')
  peindreCouvrant(ctx, image, { x: 0, y: 0, l: image.naturalWidth, h: image.naturalHeight }, c.width, c.height)
  return c
}

/**
 * Une page de la double page ouverte. `cote` : 'gauche' ou 'droite'. Sans image,
 * la page est blanche. L'ombre du pli est peinte dans la texture, côté reliure.
 */
function toilePage(image, cote, hauteurPx, ratio) {
  const c = toile(hauteurPx * ratio, hauteurPx)
  const ctx = c.getContext('2d')
  ctx.fillStyle = PAPIER
  ctx.fillRect(0, 0, c.width, c.height)
  if (image) {
    /* La double page couvre les deux pages : on recadre l'image entière au format
       de la planche, puis on n'en garde que la moitié voulue. */
    const planche = toile(c.width * 2, c.height)
    peindreCouvrant(planche.getContext('2d'), image, { x: 0, y: 0, l: image.naturalWidth, h: image.naturalHeight }, planche.width, planche.height)
    ctx.drawImage(planche, cote === 'gauche' ? 0 : c.width, 0, c.width, c.height, 0, 0, c.width, c.height)
  }
  const pli = cote === 'gauche' ? c.width : 0
  const fin = cote === 'gauche' ? c.width * 0.86 : c.width * 0.14
  const g = ctx.createLinearGradient(pli, 0, fin, 0)
  g.addColorStop(0, 'rgba(0,0,0,0.42)')
  g.addColorStop(0.3, 'rgba(0,0,0,0.14)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, c.width, c.height)
  return c
}

/**
 * La tranche : de fines stries, une par feuille. `sens` : 'long' (les stries
 * varient sur la largeur de la toile) ou 'bout' (sur sa hauteur).
 */
function toileTranche(feuilles, sens) {
  const pas = 8
  const n = Math.max(1, Math.round(feuilles))
  const c = sens === 'long' ? toile(n * pas, 8) : toile(8, n * pas)
  const ctx = c.getContext('2d')
  ctx.fillStyle = TRANCHE_CLAIR
  ctx.fillRect(0, 0, c.width, c.height)
  for (let i = 0; i < n; i += 1) {
    /* Une variation régulière, sans hasard : deux exports identiques donnent le même fichier. */
    ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(i * 12.9898))
    ctx.fillStyle = TRANCHE_TRAIT
    if (sens === 'long') ctx.fillRect(i * pas + pas - 2, 0, 2, c.height)
    else ctx.fillRect(0, i * pas + pas - 2, c.width, 2)
  }
  ctx.globalAlpha = 1
  return c
}

/* ─────────────────────────── le magazine ─────────────────────────── */

/**
 * Le magazine seul. Repère local : l'axe de la reliure est l'axe Y, à l'origine ;
 * la 1re de couverture regarde +Z ; les pages partent vers +X.
 */
export function creerMagazine(options = {}) {
  const etat = {
    largeurMm: options.largeurMm ?? PAGE_L,
    hauteurMm: options.hauteurMm ?? PAGE_H,
    pages: normaliserPages(options.pages),
    finition: normaliserFinition(options.finition),
    dosMm: options.dosMm ?? null,
    couleurDos: options.couleurDos ?? COULEUR_DEFAUT,
    couleurQuatrieme: options.couleurQuatrieme ?? options.couleurDos ?? COULEUR_DEFAUT,
    leger: Boolean(options.leger),
    anisotropie: options.anisotropie ?? 4,
    ouverture: 0,
  }
  const coteTexture = etat.leger ? 1024 : 2048

  const groupe = new Group()
  const centrage = new Group()
  const avant = new Group()
  const arriere = new Group()
  centrage.add(arriere, avant)
  groupe.add(centrage)

  const Couche = etat.leger ? MeshStandardMaterial : MeshPhysicalMaterial
  const mat = {
    premiere: new Couche({ color: '#ffffff' }),
    quatrieme: new Couche({ color: etat.couleurQuatrieme }),
    dos: new Couche({ color: etat.couleurDos }),
    papier: new MeshStandardMaterial({ color: PAPIER, roughness: 0.9 }),
    trancheLong: new MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }),
    trancheBout: new MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }),
    pageGauche: new MeshStandardMaterial({ color: '#ffffff' }),
    pageDroite: new MeshStandardMaterial({ color: '#ffffff' }),
  }
  const textures = { premiere: null, quatrieme: null, pageGauche: null, pageDroite: null, trancheLong: null, trancheBout: null }
  const images = { premiere: null, quatrieme: null, doublePage: null }
  let blocs = []
  let mailles = []

  function poserTexture(cle, materiau, canvas) {
    textures[cle]?.dispose()
    textures[cle] = canvas ? enTexture(canvas, etat.anisotropie) : null
    materiau.map = textures[cle]
    materiau.needsUpdate = true
  }

  function appliquerFinition() {
    const r = RENDU[etat.finition]
    for (const m of [mat.premiere, mat.quatrieme, mat.dos]) {
      if (etat.leger) {
        m.roughness = r.rugositeLeger
      } else {
        m.roughness = r.rugosite
        m.clearcoat = r.vernis
        m.clearcoatRoughness = r.rugositeVernis
      }
      m.metalness = 0
    }
    mat.pageGauche.roughness = r.pages
    mat.pageDroite.roughness = r.pages
  }

  function peindrePages() {
    const ratio = etat.largeurMm / etat.hauteurMm
    poserTexture('pageGauche', mat.pageGauche, toilePage(images.doublePage, 'gauche', coteTexture, ratio))
    poserTexture('pageDroite', mat.pageDroite, toilePage(images.doublePage, 'droite', coteTexture, ratio))
  }

  function mesures() {
    const dos = (etat.dosMm ?? dosMmPourPages(etat.pages, etat.finition)) * U
    /* Le forfait couverture de la formule : 2 × 0,5 mm. Le reste est le bloc de pages. */
    const couv = Math.min(EPAISSEUR_COUVERTURE_MM / 2, (etat.dosMm ?? Infinity) / 4) * U
    return { L: etat.largeurMm * U, H: etat.hauteurMm * U, dos, couv, bloc: Math.max(dos / 2 - couv, U * 0.05) }
  }

  /** Le galbe des pages ouvertes : elles montent près du pli, puis redescendent. Visuel. */
  let galbeFait = -1
  function galber() {
    if (galbeFait === etat.ouverture) return
    galbeFait = etat.ouverture
    const { L, bloc } = mesures()
    const amplitude = (0.6 * U + 0.5 * bloc) * etat.ouverture
    const portee = 16 * U
    for (const { geometrie, base, zInterieur, signe } of blocs) {
      const p = geometrie.attributes.position
      for (let i = 0; i < p.count; i += 1) {
        const z = base[i * 3 + 2]
        if (Math.abs(z - zInterieur) > 1e-6) continue
        const x = (base[i * 3] + L / 2) / portee
        p.setZ(i, z + signe * amplitude * x * Math.exp(1 - x))
      }
      p.needsUpdate = true
      geometrie.computeVertexNormals()
    }
  }

  function construire() {
    for (const m of mailles) {
      m.geometry.dispose()
      m.parent?.remove(m)
    }
    mailles = []
    blocs = []
    galbeFait = -1
    const { L, H, dos, couv, bloc } = mesures()
    const feuillesParMoitie = etat.pages / 4

    poserTexture('trancheLong', mat.trancheLong, toileTranche(feuillesParMoitie, 'long'))
    poserTexture('trancheBout', mat.trancheBout, toileTranche(feuillesParMoitie, 'bout'))

    /* Ordre des faces d'une boîte : +X, −X, +Y, −Y, +Z, −Z. */
    const boite = (parent, epaisseur, z, materiaux, segments) => {
      const g = new BoxGeometry(L, H, epaisseur, segments, 1, 1)
      const m = new Mesh(g, materiaux)
      m.position.set(L / 2, 0, z)
      m.castShadow = true
      parent.add(m)
      mailles.push(m)
      return g
    }
    const P = mat.papier
    /* La moitié arrière : 4e de couverture, puis les pages de droite. */
    boite(arriere, couv, -dos / 2 + couv / 2, [P, mat.dos, P, P, P, mat.quatrieme], 1)
    const gArriere = boite(arriere, bloc, -bloc / 2, [mat.trancheLong, mat.dos, mat.trancheBout, mat.trancheBout, mat.pageDroite, P], 36)
    /* La moitié avant, qui pivote autour de la reliure : pages de gauche, puis 1re de couverture. */
    const gAvant = boite(avant, bloc, bloc / 2, [mat.trancheLong, mat.dos, mat.trancheBout, mat.trancheBout, P, mat.pageGauche], 36)
    boite(avant, couv, bloc + couv / 2, [P, mat.dos, P, P, mat.premiere, P], 1)

    blocs = [
      { geometrie: gArriere, base: Float32Array.from(gArriere.attributes.position.array), zInterieur: bloc / 2, signe: 1 },
      { geometrie: gAvant, base: Float32Array.from(gAvant.attributes.position.array), zInterieur: -bloc / 2, signe: -1 },
    ]
    poserOuverture(etat.ouverture)
  }

  /** 0 = fermé, 1 = ouvert à plat sur la double page du milieu. */
  function poserOuverture(o) {
    const { L } = mesures()
    etat.ouverture = Math.min(1, Math.max(0, o))
    avant.rotation.y = -Math.PI * etat.ouverture
    /* Fermé, le magazine est centré sur sa couverture ; ouvert, sur son pli. */
    centrage.position.x = (-L / 2) * (1 - etat.ouverture)
    galber()
  }

  async function chargerImages(sources) {
    const ratio = etat.largeurMm / etat.hauteurMm
    const lire = async (cle) => {
      if (!(cle in sources)) return false
      images[cle] = sources[cle] ? await chargerImage(sources[cle]) : null
      return true
    }
    const [c1, c4, dp] = await Promise.all([lire('premiere'), lire('quatrieme'), lire('doublePage')])
    if (c1) poserTexture('premiere', mat.premiere, images.premiere ? toileCouverture(images.premiere, coteTexture, ratio) : null)
    if (c4) {
      poserTexture('quatrieme', mat.quatrieme, images.quatrieme ? toileCouverture(images.quatrieme, coteTexture, ratio) : null)
      mat.quatrieme.color = new Color(images.quatrieme ? '#ffffff' : etat.couleurQuatrieme)
    }
    if (dp) peindrePages()
  }

  /**
   * Change un ou plusieurs paramètres. Rend une promesse : les images se chargent.
   * Clés : pages, finition, dosMm, couleurDos, couleurQuatrieme, couverture,
   * quatrieme, doublePage (une URL, ou null pour retirer l'image).
   */
  async function regler(o = {}) {
    let refaire = false
    if ('pages' in o) { etat.pages = normaliserPages(o.pages); refaire = true }
    if ('finition' in o) { etat.finition = normaliserFinition(o.finition); refaire = true }
    if ('dosMm' in o) { etat.dosMm = o.dosMm ?? null; refaire = true }
    if (refaire) {
      appliquerFinition()
      construire()
    }
    if ('couleurDos' in o) {
      etat.couleurDos = o.couleurDos ?? COULEUR_DEFAUT
      mat.dos.color = new Color(etat.couleurDos)
    }
    if ('couleurQuatrieme' in o) {
      etat.couleurQuatrieme = o.couleurQuatrieme ?? etat.couleurDos
      if (!images.quatrieme) mat.quatrieme.color = new Color(etat.couleurQuatrieme)
    }
    const sources = {}
    if ('couverture' in o) sources.premiere = o.couverture
    if ('quatrieme' in o) sources.quatrieme = o.quatrieme
    if ('doublePage' in o) sources.doublePage = o.doublePage
    await chargerImages(sources)
  }

  function liberer() {
    for (const m of mailles) m.geometry.dispose()
    for (const m of Object.values(mat)) m.dispose()
    for (const t of Object.values(textures)) t?.dispose()
  }

  appliquerFinition()
  peindrePages()
  construire()

  return {
    groupe,
    regler,
    poserOuverture,
    liberer,
    /** Les mesures en unités de scène (1 unité = 100 mm). */
    mesures,
    get pages() { return etat.pages },
    get finition() { return etat.finition },
  }
}

/* ─────────────────────────── l'ombre de contact ─────────────────────────── */

/**
 * Le halo sombre sous le magazine, qui le pose au sol. Le magazine est si mince
 * qu'une ombre portée classique ne le voit pas quand il est couché : on photographie
 * donc sa silhouette vue du dessus, on la floute, et on la pose au sol.
 */
function creerOmbreDeContact(rendu, scene, aCacher, leger) {
  const etendue = 6.6
  const cote = leger ? 128 : 256
  const cibles = [new WebGLRenderTarget(cote, cote), new WebGLRenderTarget(cote, cote)]
  const dessus = new OrthographicCamera(-etendue / 2, etendue / 2, etendue / 2, -etendue / 2, 0, 20)
  dessus.position.set(0, 10, 0)
  dessus.up.set(0, 0, -1)
  dessus.lookAt(0, 0, 0)
  const noir = new MeshBasicMaterial({ color: '#000000' })

  const flou = new ShaderMaterial({
    uniforms: { source: { value: null }, pas: { value: new Vector2() } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D source; uniform vec2 pas; varying vec2 vUv;
      void main() {
        float somme = 0.0; float poids = 0.0;
        for (int i = -8; i <= 8; i++) {
          float p = exp(-float(i * i) / 32.0);
          somme += texture2D(source, vUv + pas * float(i)).a * p;
          poids += p;
        }
        gl_FragColor = vec4(0.0, 0.0, 0.0, somme / poids);
      }`,
    depthTest: false,
    depthWrite: false,
  })
  const ecran = new Mesh(new PlaneGeometry(2, 2), flou)
  ecran.frustumCulled = false
  const neutre = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const halo = new Mesh(
    new PlaneGeometry(etendue, etendue),
    new MeshBasicMaterial({ map: cibles[0].texture, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }),
  )
  halo.rotation.x = -Math.PI / 2
  halo.position.y = 0.0006
  halo.renderOrder = 1
  scene.add(halo)

  const passe = (source, cible, x, y) => {
    flou.uniforms.source.value = source.texture
    flou.uniforms.pas.value.set(x / cote, y / cote)
    rendu.setRenderTarget(cible)
    rendu.render(ecran, neutre)
  }

  function rendre() {
    const fond = scene.background
    const visibles = [halo, ...aCacher].map((m) => [m, m.visible])
    const ombres = rendu.shadowMap.autoUpdate
    scene.background = null
    scene.overrideMaterial = noir
    rendu.shadowMap.autoUpdate = false
    for (const [m] of visibles) m.visible = false
    rendu.setRenderTarget(cibles[0])
    rendu.setClearColor(0x000000, 0)
    rendu.clear()
    rendu.render(scene, dessus)
    scene.overrideMaterial = null
    /* Deux tours de flou : large, puis encore. Le résultat finit dans cibles[0]. */
    const pasFlou = (leger ? 0.5 : 1) * 1.6
    passe(cibles[0], cibles[1], pasFlou, 0)
    passe(cibles[1], cibles[0], 0, pasFlou)
    rendu.setRenderTarget(null)
    for (const [m, v] of visibles) m.visible = v
    rendu.shadowMap.autoUpdate = ombres
    scene.background = fond
  }

  function liberer() {
    for (const c of cibles) c.dispose()
    noir.dispose()
    flou.dispose()
    ecran.geometry.dispose()
    halo.geometry.dispose()
    halo.material.dispose()
  }

  return { rendre, liberer }
}

/* ─────────────────────────── le studio ─────────────────────────── */

/** Vrai si le navigateur sait afficher le modèle (WebGL 2). */
export function webglDisponible() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

const borner = (v, a, b) => Math.min(b, Math.max(a, v))
const RAD = Math.PI / 180

/**
 * Le magazine dans son studio.
 *
 * options :
 *   angles        le contenu d'angles.json (obligatoire)
 *   angle         le nom de l'angle de départ (défaut : angles.defaut)
 *   couverture    URL de l'image de 1re de couverture
 *   quatrieme     URL de l'image de 4e (sinon couleurQuatrieme, sinon couleurDos)
 *   doublePage    URL de l'image de la double page ouverte (sinon pages blanches)
 *   couleurDos, couleurQuatrieme, pages (24–60), finition ('gloss' | 'matte'), dosMm
 *   fond          null = transparent, sinon une couleur CSS
 *   leger         true = textures 1024 px, ombre simple (téléphone)
 *   interactif    true = glisser pour tourner, flèches du clavier
 *   rotationAuto  true = tourne doucement jusqu'au premier geste (jamais si l'appareil demande moins d'animations)
 *   largeur, hauteur, densite   taille fixe en pixels (exporteur) ; sinon suit le conteneur
 *
 * Lève une erreur si WebGL manque : à l'appelant d'afficher l'image fixe.
 */
export function creerStudio(conteneur, options = {}) {
  const angles = options.angles
  if (!angles?.angles) throw new Error('creerStudio : il faut passer le contenu de angles.json')
  if (!webglDisponible()) throw new Error('WebGL indisponible')

  const leger = Boolean(options.leger)
  const fixe = Boolean(options.largeur && options.hauteur)
  const moinsDAnimations = window.matchMedia('(prefers-reduced-motion: reduce)')

  const rendu = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  rendu.outputColorSpace = SRGBColorSpace
  rendu.toneMapping = NeutralToneMapping
  rendu.toneMappingExposure = 1
  rendu.shadowMap.enabled = true
  rendu.shadowMap.type = VSMShadowMap
  const densite = () => options.densite ?? Math.min(window.devicePixelRatio || 1, 2)
  rendu.setPixelRatio(densite())
  const canvas = rendu.domElement
  canvas.style.display = 'block'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.touchAction = 'pan-y'
  conteneur.appendChild(canvas)

  const scene = new Scene()
  const pmrem = new PMREMGenerator(rendu)
  const piece = new RoomEnvironment()
  const ambiance = pmrem.fromScene(piece, 0.04)
  scene.environment = ambiance.texture
  scene.environmentIntensity = 0.85
  function poserFond(couleur) {
    scene.background = couleur ? new Color(couleur) : null
    rendu.setClearColor(0x000000, 0)
  }
  poserFond(options.fond ?? null)

  const magazine = creerMagazine({
    ...options,
    leger,
    anisotropie: Math.min(leger ? 4 : 8, rendu.capabilities.getMaxAnisotropy()),
  })
  const { H } = magazine.mesures()

  /* plateau (tourne sur lui-même) > pose (debout ou couché) > magazine */
  const plateau = new Group()
  const pose = new Group()
  pose.add(magazine.groupe)
  plateau.add(pose)
  scene.add(plateau)

  /* La lumière principale : haute, devant, à gauche. Elle éclaire et porte l'ombre.
     Sa carte d'ombre est volontairement petite : c'est ce qui rend l'ombre douce,
     et c'est léger pour un téléphone. */
  const lumiere = new DirectionalLight('#ffffff', 1.5)
  lumiere.position.set(-1.6, 9, 3.4)
  lumiere.castShadow = true
  const cote = leger ? 512 : 1024
  lumiere.shadow.mapSize.set(cote, cote)
  const o = lumiere.shadow.camera
  o.left = -4.5; o.right = 4.5; o.top = 4.5; o.bottom = -4.5; o.near = 1; o.far = 20
  lumiere.shadow.radius = leger ? 7 : 14
  lumiere.shadow.blurSamples = leger ? 10 : 24
  lumiere.shadow.bias = -0.0004
  lumiere.shadow.normalBias = 0.01
  scene.add(lumiere, lumiere.target)

  const sol = new Mesh(new PlaneGeometry(40, 40), new ShadowMaterial({ opacity: 0.3 }))
  sol.rotation.x = -Math.PI / 2
  sol.receiveShadow = true
  scene.add(sol)
  const contact = creerOmbreDeContact(rendu, scene, [sol], leger)

  const camera = new PerspectiveCamera(28, 1, 0.1, 100)

  /* ── l'état de la vue : `vu` suit `cible` en douceur ── */
  const lire = (nom) => {
    const a = angles.angles[nom] ?? angles.angles[angles.defaut]
    return {
      rotation: a.rotation,
      elevation: a.camera.elevation,
      distance: a.camera.distance,
      champ: a.camera.champ,
      couche: a.pose === 'a-plat' ? 1 : 0,
      ouverture: a.ouverture,
    }
  }
  let angleCourant = options.angle && angles.angles[options.angle] ? options.angle : angles.defaut
  const cible = lire(angleCourant)
  const vu = { ...cible }
  let auto = Boolean(options.rotationAuto) && cible.couche === 0
  let libere = false
  let visible = true
  let image = 0
  let dernier = 0

  function appliquer() {
    const { dos } = magazine.mesures()
    magazine.poserOuverture(vu.ouverture)
    const a = vu.couche * Math.PI / 2
    pose.rotation.x = -a
    /* Le centre monte ou descend pour que le magazine reste posé au sol pendant la bascule. */
    const centreY = (H / 2) * Math.cos(a) + (dos / 2) * Math.sin(a)
    pose.position.y = centreY
    plateau.rotation.y = vu.rotation * RAD
    const aspect = camera.aspect
    const d = vu.distance * H * (aspect < 1 ? 1 / aspect : 1)
    const e = borner(vu.elevation, 0, 86) * RAD
    camera.fov = vu.champ
    camera.position.set(0, centreY + d * Math.sin(e), d * Math.cos(e))
    camera.lookAt(0, centreY, 0)
    camera.updateProjectionMatrix()
  }

  function rendre() {
    if (libere) return
    appliquer()
    contact.rendre()
    rendu.render(scene, camera)
  }

  function avancer(dt) {
    let bouge = false
    if (auto && !moinsDAnimations.matches) {
      cible.rotation += 14 * dt
      bouge = true
    }
    const k = 1 - Math.exp(-dt * 7)
    for (const cle of Object.keys(cible)) {
      const ecart = cible[cle] - vu[cle]
      if (Math.abs(ecart) < 1e-3) { vu[cle] = cible[cle]; continue }
      vu[cle] += ecart * k
      bouge = true
    }
    return bouge
  }

  function boucle(t) {
    image = 0
    if (libere) return
    const dt = dernier ? Math.min((t - dernier) / 1000, 0.05) : 0.016
    dernier = t
    const bouge = avancer(dt)
    rendre()
    if (bouge) demander()
    else dernier = 0
  }
  function demander() {
    if (!image && !libere && visible) image = requestAnimationFrame(boucle)
  }

  /** Va à un angle nommé. `anime: false` pour s'y poser tout de suite. */
  function allerA(nom, { anime = true } = {}) {
    if (!angles.angles[nom]) return
    angleCourant = nom
    auto = false
    const a = lire(nom)
    /* Le chemin le plus court : on ne fait jamais un tour complet pour revenir de face. */
    const tours = Math.round((vu.rotation - a.rotation) / 360)
    Object.assign(cible, a, { rotation: a.rotation + tours * 360 })
    if (!anime || moinsDAnimations.matches) Object.assign(vu, cible)
    demander()
  }

  /** Pose la vue tout de suite, sans transition, et rend (exporteur). */
  function poser(valeurs = {}) {
    auto = false
    Object.assign(cible, valeurs)
    Object.assign(vu, cible)
    rendre()
  }

  async function regler(o = {}) {
    if ('fond' in o) poserFond(o.fond)
    await magazine.regler(o)
    demander()
  }

  function redimensionner(l, h) {
    if (!l || !h) return
    rendu.setPixelRatio(densite())
    rendu.setSize(l, h, false)
    camera.aspect = l / h
    rendre()
  }

  /** L'image courante, en data URL. Fond transparent si `fond` vaut null. */
  function capturer(type = 'image/png', qualite) {
    rendre()
    return canvas.toDataURL(type, qualite)
  }

  /* ── les gestes ── */
  const menage = []
  const ecouter = (cibleEvt, type, fn, opts) => {
    cibleEvt.addEventListener(type, fn, opts)
    menage.push(() => cibleEvt.removeEventListener(type, fn, opts))
  }
  if (options.interactif) {
    let prise = null
    canvas.style.cursor = 'grab'
    ecouter(canvas, 'pointerdown', (e) => {
      prise = { id: e.pointerId, x: e.clientX, y: e.clientY, souris: e.pointerType === 'mouse' }
      auto = false
      canvas.setPointerCapture(e.pointerId)
      canvas.style.cursor = 'grabbing'
    })
    ecouter(canvas, 'pointermove', (e) => {
      if (!prise || e.pointerId !== prise.id) return
      /* Ce qui suit le doigt reste, même avec « moins d'animations » : sans retard. */
      cible.rotation += (e.clientX - prise.x) * 0.45
      vu.rotation = cible.rotation
      if (prise.souris) {
        cible.elevation = borner(cible.elevation + (e.clientY - prise.y) * 0.25, 0, 86)
        vu.elevation = cible.elevation
      }
      prise.x = e.clientX
      prise.y = e.clientY
      demander()
    })
    const lacher = (e) => {
      if (!prise || e.pointerId !== prise.id) return
      prise = null
      canvas.style.cursor = 'grab'
    }
    ecouter(canvas, 'pointerup', lacher)
    ecouter(canvas, 'pointercancel', lacher)
    ecouter(canvas, 'keydown', (e) => {
      const pas = e.key === 'ArrowLeft' ? -15 : e.key === 'ArrowRight' ? 15 : 0
      if (!pas) return
      e.preventDefault()
      auto = false
      cible.rotation += pas
      if (moinsDAnimations.matches) vu.rotation = cible.rotation
      demander()
    })
  }

  /* ── la taille et la visibilité ── */
  let observateurTaille = null
  let observateurVue = null
  if (fixe) {
    canvas.style.width = `${options.largeur}px`
    canvas.style.height = `${options.hauteur}px`
    redimensionner(options.largeur, options.hauteur)
  } else {
    observateurTaille = new ResizeObserver(() => redimensionner(conteneur.clientWidth, conteneur.clientHeight))
    observateurTaille.observe(conteneur)
    redimensionner(conteneur.clientWidth, conteneur.clientHeight)
    /* Hors de l'écran, rien ne tourne. */
    observateurVue = new IntersectionObserver(([entree]) => {
      visible = entree.isIntersecting
      if (visible) demander()
    })
    observateurVue.observe(conteneur)
  }
  ecouter(document, 'visibilitychange', () => { if (!document.hidden) demander() })
  ecouter(canvas, 'webglcontextrestored', () => demander())

  function liberer() {
    libere = true
    if (image) cancelAnimationFrame(image)
    for (const fn of menage) fn()
    observateurTaille?.disconnect()
    observateurVue?.disconnect()
    magazine.liberer()
    sol.geometry.dispose()
    sol.material.dispose()
    contact.liberer()
    ambiance.dispose()
    piece.dispose()
    pmrem.dispose()
    rendu.dispose()
    canvas.remove()
  }

  /* Prêt quand les images sont chargées et la première image rendue. */
  const pret = magazine
    .regler({
      ...('couverture' in options ? { couverture: options.couverture } : {}),
      ...('quatrieme' in options ? { quatrieme: options.quatrieme } : {}),
      ...('doublePage' in options ? { doublePage: options.doublePage } : {}),
    })
    .then(() => {
      if (libere) return
      rendre()
      demander()
    })

  rendre()

  return {
    canvas,
    pret,
    allerA,
    poser,
    regler,
    rendre,
    capturer,
    redimensionner,
    liberer,
    get angle() { return angleCourant },
  }
}
