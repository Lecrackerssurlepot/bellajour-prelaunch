import angles from '../../../../../brand/assets/3d/magazine/angles.json'
import type { Studio } from '../../../../../brand/assets/3d/magazine/magazine.js'
import { FINITION_DEFAUT, dosMmPourPages } from '@/lib/atelier/impression'
import { PAGE_H, PAGE_L } from '@/lib/mise-en-page/geometrie'

/* ════════════════════════════════════════════════════════════
   Le livre de l'accueil, ouvert par le magazine 3D de la charte
   (brand/assets/3d/magazine). Décision du 26/11 : « le modèle pilote
   l'ouverture ».

   Le livre HTML reste dans la page et reste LA source : fermé, c'est lui
   qu'on voit (titre qu'on écrit sur la couverture, photos qu'on dépose).
   Dès que l'ouverture commence, le modèle prend sa place, au même endroit,
   avec les mêmes faces : la couverture et la première double page sont
   recopiées du HTML vers les textures du modèle (peindre…), et repeintes
   quand le titre ou les photos changent.

   La timeline GSAP d'AccueilMotion donne deux nombres, de 0 à 1 :
   - `o` : de l'angle nommé « face » (debout, fermé) à l'angle nommé
     « ouvert », mais vu de face : il s'ouvre debout, sans basculer ;
   - `b` : le second temps. Le livre reste de face (26/11) : seul le recul
     sur écran étroit en dépend.
   Rien ne joue seul : chaque image est posée par le défilement.

   Sans WebGL, ou si quoi que ce soit échoue ici, monterLivre3D rejette et
   le livre HTML continue de s'ouvrir comme avant.
   ════════════════════════════════════════════════════════════ */

const PAGES = 32
const FACE = angles.angles.face
const OUVERT = angles.angles.ouvert
const RAD = Math.PI / 180
/* La toile est plus grande que le livre : assez haute pour que, à la distance
   de l'angle « ouvert », une page debout ait exactement la hauteur du livre
   HTML (la relève se fait sans saut), et assez large pour l'ombre. */
const HAUTEUR = OUVERT.camera.distance * 2 * Math.tan((OUVERT.camera.champ / 2) * RAD)
const LARGEUR = 1.5
/* La part de l'ouverture pendant laquelle le modèle remplace le livre HTML. */
const RELEVE = 0.012

export type Livre3D = {
  /** o : 0 fermé, 1 ouvert. b : 0 à 1, le second temps. */
  poser(o: number, b: number): void
  liberer(): void
}

/* ─────────── recopier une face HTML dans une toile ─────────── */

/* La place d'un élément dans sa face, en pixels de mise en page : les
   transformations (échelle du livre, feuille retournée) n'y changent rien. */
function place(el: HTMLElement, racine: HTMLElement) {
  let x = 0
  let y = 0
  let n: HTMLElement | null = el
  while (n && n !== racine) {
    x += n.offsetLeft
    y += n.offsetTop
    n = n.offsetParent as HTMLElement | null
  }
  return { x, y, l: el.offsetWidth, h: el.offsetHeight }
}

function peindreImage(ctx: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, l: number, h: number) {
  if (!im.complete || !im.naturalWidth || l <= 0 || h <= 0) return
  /* object-fit: cover, avec l'object-position de l'image. */
  const [px, py] = getComputedStyle(im).objectPosition.split(' ').map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5))
  const echelle = Math.max(l / im.naturalWidth, h / im.naturalHeight)
  const sl = l / echelle
  const sh = h / echelle
  ctx.drawImage(im, (im.naturalWidth - sl) * px, (im.naturalHeight - sh) * (py ?? 0.5), sl, sh, x, y, l, h)
}

function couper(ctx: CanvasRenderingContext2D, texte: string, largeur: number, equilibre: boolean) {
  if (ctx.measureText(texte).width <= largeur) return [texte]
  const mots = texte.split(' ')
  if (equilibre) {
    /* Deux lignes, les plus égales possible (text-wrap: balance). */
    let mieux: string[] | null = null
    let ecart = Infinity
    for (let i = 1; i < mots.length; i += 1) {
      const a = mots.slice(0, i).join(' ')
      const b = mots.slice(i).join(' ')
      const e = Math.max(ctx.measureText(a).width, ctx.measureText(b).width)
      if (e < ecart) {
        ecart = e
        mieux = [a, b]
      }
    }
    if (mieux) return mieux
  }
  const lignes: string[] = []
  let ligne = ''
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot
    if (ligne && ctx.measureText(essai).width > largeur) {
      lignes.push(ligne)
      ligne = mot
    } else ligne = essai
  }
  if (ligne) lignes.push(ligne)
  return lignes
}

function peindreTexte(ctx: CanvasRenderingContext2D, el: HTMLElement, racine: HTMLElement, s: number) {
  const st = getComputedStyle(el)
  let texte = (el.textContent ?? '').trim()
  if (!texte) return
  if (st.textTransform === 'uppercase') texte = texte.toUpperCase()
  const corps = parseFloat(st.fontSize) * s
  const interligne = (parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.2) * s
  const p = place(el, racine)
  ctx.save()
  ctx.font = `${st.fontStyle} ${st.fontWeight} ${corps}px ${st.fontFamily}`
  ctx.fillStyle = st.color
  ctx.globalAlpha = parseFloat(st.opacity) || 1
  ctx.textBaseline = 'alphabetic'
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(parseFloat(st.letterSpacing) || 0) * s}px`
  const lignes = st.whiteSpace === 'nowrap' ? [texte] : couper(ctx, texte, p.l * s + 1, st.getPropertyValue('text-wrap-style') === 'balance' || st.getPropertyValue('text-wrap') === 'balance')
  const m = ctx.measureText('Hg')
  const haut = m.fontBoundingBoxAscent || corps * 0.8
  const bas = m.fontBoundingBoxDescent || corps * 0.2
  lignes.forEach((ligne, i) => {
    ctx.fillText(ligne, p.x * s, p.y * s + i * interligne + (interligne - haut - bas) / 2 + haut)
  })
  ctx.restore()
}

/* Une face « perso » (couverture ou page) : son fond, ses photos, ses textes. */
function peindreFace(ctx: CanvasRenderingContext2D, face: HTMLElement | null, x0: number, largeur: number, hauteur: number) {
  const racine = face?.querySelector<HTMLElement>('.perso')
  if (!racine || !racine.offsetHeight) throw new Error('face absente')
  const s = hauteur / racine.offsetHeight
  ctx.save()
  ctx.translate(x0, 0)
  ctx.beginPath()
  ctx.rect(0, 0, largeur, hauteur)
  ctx.clip()
  ctx.fillStyle = getComputedStyle(racine).backgroundColor
  ctx.fillRect(0, 0, largeur, hauteur)
  racine.querySelectorAll<HTMLImageElement>('img').forEach((im) => {
    const p = place(im, racine)
    peindreImage(ctx, im, p.x * s, p.y * s, p.l * s, p.h * s)
  })
  if (racine.classList.contains('couv-perso')) {
    /* Le voile de la couverture : le même que `.couv-perso::before` (accueil.css). */
    const clair = racine.classList.contains('clair')
    const v = ctx.createLinearGradient(0, 0, 0, hauteur)
    v.addColorStop(0, clair ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.38)')
    v.addColorStop(0.38, clair ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)')
    v.addColorStop(0.72, clair ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)')
    v.addColorStop(1, clair ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.35)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, largeur, hauteur)
  }
  racine.querySelectorAll<HTMLElement>('.couv-titre, .couv-pied span, .p-titre, .p-leg').forEach((el) => peindreTexte(ctx, el, racine, s))
  ctx.restore()
}

const enUrl = (c: HTMLCanvasElement) =>
  new Promise<string>((resolve, reject) => c.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('toile illisible'))), 'image/jpeg', 0.92))

/* ─────────── le studio ─────────── */

export async function monterLivre3D(livre: HTMLElement, { leger }: { leger: boolean }): Promise<Livre3D> {
  const { creerStudio, webglDisponible } = await import('../../../../../brand/assets/3d/magazine/magazine.js')
  if (!webglDisponible()) throw new Error('webgl')

  const hauteurPx = leger ? 1024 : 2048
  const largeurPx = Math.round((hauteurPx * PAGE_L) / PAGE_H)
  const tCouv = document.createElement('canvas')
  const tPages = document.createElement('canvas')
  tCouv.width = largeurPx
  tCouv.height = hauteurPx
  tPages.width = largeurPx * 2
  tPages.height = hauteurPx
  let urls: string[] = []

  /* La couverture, et la première double page : le verso de la couverture à
     gauche, la première page à droite. */
  async function peindre() {
    const c1 = tCouv.getContext('2d')
    const c2 = tPages.getContext('2d')
    if (!c1 || !c2) throw new Error('toile')
    peindreFace(c1, livre.querySelector('.f1 .recto'), 0, largeurPx, hauteurPx)
    peindreFace(c2, livre.querySelector('.f1 .verso'), 0, largeurPx, hauteurPx)
    peindreFace(c2, livre.querySelector('.f2 .recto'), largeurPx, largeurPx, hauteurPx)
    return Promise.all([enUrl(tCouv), enUrl(tPages)])
  }

  const boite = document.createElement('div')
  boite.className = 'livre-3d'
  boite.setAttribute('aria-hidden', 'true')
  boite.style.width = `${LARGEUR * 100}%`
  boite.style.height = `${HAUTEUR * 100}%`
  livre.appendChild(boite)

  let studio: Studio | null = null
  let libere = false
  let minuteur = 0
  let observateur: MutationObserver | null = null
  let dernier = { o: 0, b: 0, etroit: false }
  let pose = false
  const surImage = () => demander()
  const surTaille = () => demander()

  function liberer() {
    libere = true
    clearTimeout(minuteur)
    observateur?.disconnect()
    livre.removeEventListener('load', surImage, true)
    window.removeEventListener('resize', surTaille)
    studio?.liberer()
    studio = null
    boite.remove()
    livre.classList.remove('ouvre3d', 'seul3d')
    urls.forEach((u) => URL.revokeObjectURL(u))
    urls = []
  }

  function poser(o: number, b: number, force = false) {
    if (libere || !studio) return
    const etroit = window.innerWidth < 700
    if (!force && pose && dernier.o === o && dernier.b === b && dernier.etroit === etroit) return
    pose = true
    dernier = { o, b, etroit }
    /* La relève : le modèle monte en fondu sur le livre HTML pendant les tout
       premiers degrés (c'est le défilement qui conduit), puis reste seul. */
    const ouvre = o > 0.0005
    livre.classList.toggle('ouvre3d', ouvre)
    livre.classList.toggle('seul3d', o >= RELEVE)
    boite.style.opacity = String(Math.min(1, o / RELEVE))
    /* Fermé, le modèle est centré sur sa couverture (la moitié droite du livre
       HTML) ; ouvert, sur son pli (le milieu). */
    boite.style.transform = `translate(calc(-50% + ${((1 - o) * 25) / LARGEUR}%), -50%)`
    if (!ouvre) return
    /* Sur un écran étroit, le livre ouvert recule un peu pour tenir en largeur,
       et encore un peu quand il tourne. */
    const recul = etroit ? 1.14 : 1
    studio.poser({
      ouverture: o,
      /* Il reste de face, ouvert comme fermé (Mathias, 26/11) : debout, sans
         tourner, la caméra à hauteur de l'angle « face ». Le second temps ne
         le fait plus pivoter. */
      couche: 0,
      rotation: FACE.rotation,
      elevation: FACE.camera.elevation,
      distance: OUVERT.camera.distance * (1 + (recul - 1) * o) * (etroit ? 1 + 0.08 * b : 1),
      champ: OUVERT.camera.champ,
    })
  }

  /* Le titre ou les photos ont changé : on repeint, sans se presser. */
  async function repeindre() {
    if (libere || !studio) return
    try {
      const [couverture, doublePage] = await peindre()
      if (libere || !studio) return
      await studio.regler({ couverture, doublePage })
      urls.forEach((u) => URL.revokeObjectURL(u))
      urls = [couverture, doublePage]
      poser(dernier.o, dernier.b, true)
    } catch {
      /* Une photo pas encore décodée : la prochaine demande repeindra. */
    }
  }
  function demander() {
    clearTimeout(minuteur)
    minuteur = window.setTimeout(() => void repeindre(), 220)
  }

  try {
    const [couverture, doublePage] = await peindre()
    urls = [couverture, doublePage]
    const aire = boite.clientWidth * boite.clientHeight || 1
    studio = creerStudio(boite, {
      angles,
      angle: 'face',
      couverture,
      doublePage,
      largeurMm: PAGE_L,
      hauteurMm: PAGE_H,
      pages: PAGES,
      finition: FINITION_DEFAUT,
      dosMm: dosMmPourPages(PAGES, FINITION_DEFAUT),
      fond: null,
      leger,
      interactif: false,
      rotationAuto: false,
      /* Jamais plus de 6 millions de points à dessiner par image. */
      densite: Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(6e6 / aire)),
    })
    await studio.pret
  } catch (e) {
    liberer()
    throw e
  }

  /* Nos propres gestes (la classe posée sur le livre, la toile) ne comptent pas. */
  observateur = new MutationObserver((faits) => {
    if (faits.some((f) => f.target !== livre && !boite.contains(f.target))) demander()
  })
  observateur.observe(livre, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['src', 'class'] })
  livre.addEventListener('load', surImage, true)
  window.addEventListener('resize', surTaille)

  return { poser, liberer }
}
