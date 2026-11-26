'use client'

/* ════════════════════════════════════════════════════════════
   L'accueil qui bouge : port du banc validé (duplicata 14BmVZ v4, patch13).

   Le balisage est rendu par le serveur (Accueil.tsx) ; ce composant ne rend
   rien et pose, une fois monté, ce que faisait le script du banc :
   - les traits de l'atelier ;
   - l'ouverture du livre et la pile qui devient une année (GSAP + ScrollTrigger) ;
     le livre s'ouvre par le magazine 3D de la charte (livre3d.ts), chargé après
     coup : la timeline lui donne l'ouverture, de 0 à 1. Sans WebGL, le livre
     HTML s'ouvre comme avant ;
   - l'écran d'essai « Avant d'ouvrir » et ses quatre états ;
   - vos photos partout dans la page (elles restent sur l'appareil) ;
   - le titre : écrit à la souris sur la couverture, ou dans une petite feuille au doigt ;
   - le titre d'exemple qui change toutes les 3 s (souris seulement) ;
   - la pastille qui suit la souris.

   L'état vit sur la racine `.m-banc` (data-u, data-perso, data-titre, data-e2),
   jamais sur <body> : rien ne fuit vers les autres pages.

   Motion : la même sur téléphone et sur ordinateur (mémoire « motion mobile =
   desktop ») ; seul « réduire les animations » la coupe. GSAP est chargé ici,
   à la demande, et nulle part dans le tunnel de commande.
   ════════════════════════════════════════════════════════════ */

import { useEffect } from 'react'
import type { gsap } from 'gsap'
import type { Livre3D } from './livre3d'

export type PhotoExemple = { s: string; p: string }

type Props = { photos: PhotoExemple[] }

const TITRE_EXEMPLE = 'Un été en Grèce'
const EXEMPLES = [TITRE_EXEMPLE, 'Notre année', 'Lisbonne à deux', 'Les vacances de Léo']

const TXT: Record<string, [string, string, string, string]> = {
  rien: ['Avant d’ouvrir', 'Essayez avec vos photos.', 'Jusqu’à 5 photos, pour vivre l’expérience Bellajour.', 'Choisir mes photos'],
  titre: ['Votre titre est posé', 'Il manque vos photos.', 'Jusqu’à 5. La première fait la couverture.', 'Choisir mes photos'],
  photos: ['Vos photos sont là', 'Et votre titre ?', 'Il s’imprime sur la couverture.', 'Changer mes photos'],
  tout: ['Tout est prêt', 'Votre numéro.', '↓ Faites défiler : il s’ouvre.', ''],
}

function alea(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/* Les traits : ils descendent, tournent, repartent (identiques au banc, graine par section). */
function dessinerTraits(sv: SVGSVGElement) {
  const r = alea(Number(sv.dataset.seed) || 7)
  const n = Number(sv.dataset.n) || 4
  let out = ''
  for (let k = 0; k < n; k++) {
    let x = 6 + (k + 0.5) * (88 / n) + (r() - 0.5) * 8
    let y = 0
    let d = 'M' + x.toFixed(1) + ' -2'
    let tours = 0
    while (y < 100 && tours < 5) {
      const ny = y + 16 + r() * 30
      if (ny >= 96) {
        d += ' V102'
        break
      }
      let dir = r() < 0.5 ? -1 : 1
      let nx = x + dir * (10 + r() * 26)
      if (nx < 4 || nx > 96) {
        dir = -dir
        nx = x + dir * (10 + r() * 22)
      }
      d += ' V' + (ny - 3).toFixed(1) + ' Q' + x.toFixed(1) + ' ' + ny.toFixed(1) + ' ' + (x + dir * 1.6).toFixed(1) + ' ' + ny.toFixed(1) +
        ' H' + (nx - dir * 1.6).toFixed(1) + ' Q' + nx.toFixed(1) + ' ' + ny.toFixed(1) + ' ' + nx.toFixed(1) + ' ' + (ny + 3).toFixed(1)
      x = nx
      y = ny + 3
      tours++
      if (tours === 5) d += ' V102'
    }
    out += '<path pathLength="1" d="' + d + '"/>'
  }
  sv.innerHTML = out
}

export default function AccueilMotion({ photos }: Props) {
  useEffect(() => {
    const racine = document.querySelector<HTMLElement>('.m-banc')
    if (!racine) return
    const R = racine
    const $ = <T extends Element = HTMLElement>(q: string) => R.querySelector<T>(q)
    const $$ = <T extends Element = HTMLElement>(q: string) => Array.from(R.querySelectorAll<T>(q))
    const nettoyer: Array<() => void> = []
    const ecoute = <K extends keyof WindowEventMap>(cible: Window, type: K, f: (e: WindowEventMap[K]) => void, opt?: AddEventListenerOptions) => {
      cible.addEventListener(type, f, opt)
      nettoyer.push(() => cible.removeEventListener(type, f, opt))
    }
    const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches
    const tactile = matchMedia('(pointer:coarse)').matches
    const mobile = () => window.innerWidth < 700
    let vivant = true

    R.dataset.u = 'votre'
    $$<SVGSVGElement>('.traits').forEach(dessinerTraits)

    /* ---------- vos photos : partout dans la page ---------- */
    const DEF = photos.length ? photos : [{ s: '', p: '50% 50%' }]
    let PH = DEF.slice()
    const titre = $('#couv-titre')
    let titreTouche = false

    function ajuster(el: HTMLElement) {
      if (!el.offsetParent) return
      const w = el.clientWidth
      if (!w) return
      const box = (el.closest('.recto,.cv,.face') as HTMLElement | null) || el.parentElement
      if (!box) return
      const cw = box.clientWidth
      const max = cw * (el.classList.contains('mini-titre') ? 0.16 : 0.17)
      const min = max * 0.74
      let f = max
      el.style.whiteSpace = 'nowrap'
      el.style.fontSize = f + 'px'
      while (el.scrollWidth > w + 1 && f > min) {
        f -= 1
        el.style.fontSize = f + 'px'
      }
      if (el.scrollWidth <= w + 1) return
      /* trop long même au plus petit : deux lignes équilibrées */
      el.style.whiteSpace = 'normal'
      f = max * 0.82
      el.style.fontSize = f + 'px'
      while ((el.scrollWidth > w + 1 || el.offsetHeight > f * 1.95) && f > min * 0.8) {
        f -= 1
        el.style.fontSize = f + 'px'
      }
    }
    const ajusterTous = () => $$('.couv-titre,.mini-titre').forEach(ajuster)
    let minuteurAjuste = 0
    ecoute(window, 'resize', () => {
      clearTimeout(minuteurAjuste)
      minuteurAjuste = window.setTimeout(ajusterTous, 120)
    })
    if (document.fonts?.ready) document.fonts.ready.then(() => vivant && ajusterTous())

    /* photo claire : le titre passe en noir */
    function clarte(src: string, cb: (l: number) => void) {
      const im = new Image()
      im.onload = () => {
        try {
          const c = document.createElement('canvas')
          c.width = 48
          c.height = 24
          const x = c.getContext('2d')
          if (!x) return cb(0)
          x.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight * 0.42, 0, 0, 48, 24)
          const d = x.getImageData(0, 0, 48, 24).data
          let t = 0
          for (let i = 0; i < d.length; i += 4) t += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
          cb(t / (d.length / 4) / 255)
        } catch {
          cb(0)
        }
      }
      im.src = src
    }
    function contraste() {
      const p = PH[0]
      if (!p?.s) return
      clarte(p.s, (l) => $$('.couv-perso,.m-perso').forEach((el) => el.classList.toggle('clair', l > 0.6)))
    }
    function poserPhotos() {
      $$<HTMLImageElement>('img[data-ph]').forEach((im) => {
        const p = PH[Number(im.dataset.ph) % PH.length]
        if (!p) return
        if (im.getAttribute('src') !== p.s) im.src = p.s
        im.style.objectPosition = p.p
      })
      contraste()
    }
    const urls: string[] = []
    function prendre(files: FileList | null) {
      const fs = Array.from(files || []).filter((f) => /^image\//.test(f.type)).slice(0, 5)
      if (!fs.length) return
      const mes = fs.map((f) => {
        const u = URL.createObjectURL(f)
        urls.push(u)
        return { s: u, p: '50% 45%' }
      })
      const base = mes.length >= 3 ? mes : mes.concat(DEF)
      PH = []
      for (let i = 0; i < Math.max(6, mes.length); i++) PH.push(base[i % base.length])
      R.dataset.perso = '1'
      poserPhotos()
      window.setTimeout(() => G.st?.refresh(), 400)
    }
    nettoyer.push(() => urls.forEach((u) => URL.revokeObjectURL(u)))
    const fPhotos = $<HTMLInputElement>('#f-photos')
    const surPhotos = () => prendre(fPhotos?.files ?? null)
    fPhotos?.addEventListener('change', surPhotos)
    nettoyer.push(() => fPhotos?.removeEventListener('change', surPhotos))

    /* l'éventail du bouton prend ses photos */
    const surPerso = new MutationObserver(() => {
      window.setTimeout(() => {
        if (!R.dataset.perso) return
        $$('.eventail-mini i').forEach((e, i) => {
          const im = $<HTMLImageElement>(`img[data-ph="${i}"]`)
          if (im?.src) e.style.setProperty('--ph', `url("${im.src}")`)
        })
      }, 80)
    })
    surPerso.observe(R, { attributes: true, attributeFilter: ['data-perso'] })
    nettoyer.push(() => surPerso.disconnect())

    /* ---------- le titre ---------- */
    function recopier() {
      const t = titre?.textContent?.trim() || TITRE_EXEMPLE
      $$('.p-titre,.mini-titre').forEach((el) => (el.textContent = t))
      ajusterTous()
    }
    function marquerTitre() {
      const v = titre?.textContent?.trim()
      if (v && v !== TITRE_EXEMPLE) R.dataset.titre = '1'
    }
    const tf = $('#t-feuille')
    const tc = $<HTMLInputElement>('#t-champ')
    function ouvrirTitre() {
      if (!titre) return
      if (!tactile) {
        titre.focus({ preventScroll: true })
        return
      }
      if (!tf || !tc) return
      const v = titre.textContent?.trim() || ''
      tc.value = v === TITRE_EXEMPLE ? '' : v
      tf.hidden = false
      tc.focus()
    }
    function fermerTitre() {
      if (tf) tf.hidden = true
      tc?.blur()
    }
    if (titre) {
      const surFocus = () => {
        titreTouche = true
        G.g?.killTweensOf(titre.querySelectorAll('.lt'))
        titre.textContent = titre.textContent
        if (titre.textContent === TITRE_EXEMPLE) {
          const r = document.createRange()
          r.selectNodeContents(titre)
          const sel = getSelection()
          sel?.removeAllRanges()
          sel?.addRange(r)
        }
      }
      const surSaisie = () => {
        if ((titre.textContent || '').length > 24) titre.textContent = (titre.textContent || '').slice(0, 24)
        recopier()
        marquerTitre()
      }
      const surTouche = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          titre.blur()
        }
      }
      titre.addEventListener('focus', surFocus)
      titre.addEventListener('input', surSaisie)
      titre.addEventListener('keydown', surTouche)
      nettoyer.push(() => {
        titre.removeEventListener('focus', surFocus)
        titre.removeEventListener('input', surSaisie)
        titre.removeEventListener('keydown', surTouche)
      })
      if (tactile) {
        titre.setAttribute('contenteditable', 'false')
        titre.setAttribute('role', 'button')
        titre.setAttribute('tabindex', '0')
        const surClic = (e: MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()
          ouvrirTitre()
        }
        titre.addEventListener('click', surClic)
        nettoyer.push(() => titre.removeEventListener('click', surClic))
      }
      const form = $<HTMLFormElement>('#t-form')
      const surEnvoi = (e: SubmitEvent) => {
        e.preventDefault()
        const v = (tc?.value || '').trim().slice(0, 24)
        titre.dispatchEvent(new Event('focus'))
        titre.textContent = v || TITRE_EXEMPLE
        titre.dispatchEvent(new Event('input'))
        fermerTitre()
      }
      form?.addEventListener('submit', surEnvoi)
      const annuler = $('#t-annuler')
      annuler?.addEventListener('click', fermerTitre)
      const surFond = (e: MouseEvent) => {
        if (e.target === tf) fermerTitre()
      }
      tf?.addEventListener('click', surFond)
      nettoyer.push(() => {
        form?.removeEventListener('submit', surEnvoi)
        annuler?.removeEventListener('click', fermerTitre)
        tf?.removeEventListener('click', surFond)
      })
    }

    /* ---------- l'écran d'essai : quatre états ---------- */
    const etatEssai = () => {
      const p = !!R.dataset.perso
      const t = !!R.dataset.titre
      return p && t ? 'tout' : p ? 'photos' : t ? 'titre' : 'rien'
    }
    let attente = false
    function reconstruire() {
      const st = G.st
      if (!st || !G.faireT1 || !G.faireT2) return
      const e = etatEssai()
      const y = window.scrollY
      const veut = e !== 'tout'
      const c1 = !!G.t1 && G.t1Phase !== veut
      const c2 = !!G.t2 && G.t2Dernier !== (e === 'tout')
      attente = false
      if (c1) {
        /* l'écran d'essai change la longueur de l'ouverture : seulement tout en haut, sinon ça sauterait */
        if (y < 4) {
          G.faireT1()
          G.faireT2()
          st.sort()
          st.refresh()
        } else attente = true
        return
      }
      if (c2 && G.t2?.scrollTrigger) {
        const tr = G.t2.scrollTrigger
        if (y < tr.start - 60 || y > tr.end + 60) {
          G.faireT2()
          st.sort()
          st.refresh()
        } else attente = true
      }
    }
    function maj() {
      const e = etatEssai()
      const t = TXT[e]
      R.dataset.e2 = e
      const lab = $('.e2-lab'), h = $('.e2-h'), s = $('.e2-s'), pt = $('.e2-pt'), bp = $('.e2-photos'), bt = $('.e2-titre')
      if (lab) lab.textContent = t[0]
      if (h) h.textContent = t[1]
      if (s) s.textContent = t[2]
      if (pt) pt.textContent = t[3]
      if (bp) bp.hidden = e === 'tout'
      if (bt) bt.hidden = e === 'tout' || e === 'titre'
      reconstruire()
    }
    const surEtat = new MutationObserver(() => requestAnimationFrame(maj))
    surEtat.observe(R, { attributes: true, attributeFilter: ['data-perso', 'data-titre'] })
    nettoyer.push(() => surEtat.disconnect())
    ecoute(window, 'scroll', () => {
      if (attente) reconstruire()
    }, { passive: true })
    const btTitre = $('.e2-titre')
    const surBtTitre = (e: Event) => {
      e.preventDefault()
      ouvrirTitre()
    }
    btTitre?.addEventListener('click', surBtTitre)
    nettoyer.push(() => btTitre?.removeEventListener('click', surBtTitre))

    /* ---------- la pastille qui suit la souris sur la couverture ---------- */
    const sv = $('#suiveur')
    const cp = $('.couv-perso')
    if (sv && cp && matchMedia('(hover:hover) and (pointer:fine)').matches) {
      let mx = 0, my = 0, sx = 0, sy = 0, tourne = false
      const boucle = () => {
        sx += (mx - sx) * 0.22
        sy += (my - sy) * 0.22
        sv.style.transform = 'translate(' + (sx + 14) + 'px,' + (sy + 14) + 'px)'
        if (tourne && vivant) requestAnimationFrame(boucle)
      }
      const entre = (e: MouseEvent) => {
        sx = mx = e.clientX
        sy = my = e.clientY
        if (!tourne) {
          tourne = true
          boucle()
        }
      }
      const bouge = (e: MouseEvent) => {
        mx = e.clientX
        my = e.clientY
        sv.classList.toggle('on', !(e.target as Element).closest('.couv-zone'))
      }
      const sort = () => {
        sv.classList.remove('on')
        tourne = false
      }
      cp.addEventListener('mouseenter', entre)
      cp.addEventListener('mousemove', bouge)
      cp.addEventListener('mouseleave', sort)
      ecoute(window, 'scroll', () => {
        if (!sv.classList.contains('on')) return
        const r = cp.getBoundingClientRect()
        if (mx < r.left || mx > r.right || my < r.top || my > r.bottom) sv.classList.remove('on')
      }, { passive: true })
      nettoyer.push(() => {
        cp.removeEventListener('mouseenter', entre)
        cp.removeEventListener('mousemove', bouge)
        cp.removeEventListener('mouseleave', sort)
      })
    }

    /* ---------- patch13 : le blanc après la frise ---------- */
    const vie = $('#vie')
    const mat = $('#matiere')
    function caler() {
      if (!vie || !mat) return
      const rail = vie.querySelector<HTMLElement>('.rail')
      if (!rail) return
      mat.style.setProperty('--tire', '0px')
      const vide = vie.offsetHeight - (rail.offsetTop + rail.offsetHeight)
      const pad = parseFloat(getComputedStyle(mat).paddingTop) || 0
      const sonde = document.createElement('div')
      sonde.style.cssText = 'position:absolute;visibility:hidden;height:var(--m-espace-section)'
      R.appendChild(sonde)
      const sec = sonde.offsetHeight
      sonde.remove()
      const lab = mat.querySelector<HTMLElement>('.mat-tete')
      const marge = lab ? parseFloat(getComputedStyle(lab).marginTop) || 0 : 0
      mat.style.setProperty('--tire', Math.max(0, Math.round(vide + pad + marge - sec)) + 'px')
    }
    let minuteurCale = 0
    ecoute(window, 'resize', () => {
      clearTimeout(minuteurCale)
      minuteurCale = window.setTimeout(caler, 150)
    })
    ecoute(window, 'load', caler)

    /* ---------- patch13 : le titre d'exemple change toutes les 3 s (souris seulement) ---------- */
    if (titre && !reduit && !tactile) {
      let i = 0, fini = false, minuteur = 0
      const copier = (v: string) => {
        $$('.p-titre,.mini-titre').forEach((el) => (el.textContent = v))
        window.dispatchEvent(new Event('resize'))
      }
      const arreter = () => {
        if (fini) return
        fini = true
        clearInterval(minuteur)
        titre.classList.remove('ex-cache')
        if (!R.dataset.titre && titre.textContent?.trim() !== EXEMPLES[0]) {
          titre.textContent = EXEMPLES[0]
          copier(EXEMPLES[0])
        }
      }
      const suivant = () => {
        if (fini) return
        if (R.dataset.titre || R.dataset.perso || document.activeElement === titre) return arreter()
        titre.classList.add('ex-fondu', 'ex-cache')
        window.setTimeout(() => {
          if (fini) return
          i = (i + 1) % EXEMPLES.length
          titre.textContent = EXEMPLES[i]
          copier(EXEMPLES[i])
          titre.classList.remove('ex-cache')
        }, 450)
      }
      const surFocusDoc = (e: FocusEvent) => {
        if (e.target === titre) arreter()
      }
      const surAppui = (e: PointerEvent) => {
        const t = e.target as Element
        if (titre.contains(t) || t.closest?.('.e2-titre,.e2-photos,label[for="f-photos"]')) arreter()
      }
      document.addEventListener('focus', surFocusDoc, true)
      document.addEventListener('pointerdown', surAppui, true)
      const surStop = new MutationObserver(() => {
        if (R.dataset.titre || R.dataset.perso) arreter()
      })
      surStop.observe(R, { attributes: true, attributeFilter: ['data-titre', 'data-perso'] })
      const depart = window.setTimeout(() => {
        if (!fini) minuteur = window.setInterval(suivant, 3000)
      }, 3000)
      nettoyer.push(() => {
        fini = true
        clearTimeout(depart)
        clearInterval(minuteur)
        document.removeEventListener('focus', surFocusDoc, true)
        document.removeEventListener('pointerdown', surAppui, true)
        surStop.disconnect()
      })
    }

    /* ---------- motion (GSAP, chargé à la demande) ---------- */
    type Tl = gsap.core.Timeline
    type StType = typeof import('gsap/ScrollTrigger').ScrollTrigger
    const G: {
      g?: typeof gsap
      st?: StType
      ctx?: gsap.Context
      t1?: Tl | null
      t2?: Tl | null
      t1Phase?: boolean
      t1P?: number
      t2Dernier?: boolean
      faireT1?: () => void
      faireT2?: () => void
    } = {}

    /* ---------- le magazine 3D ouvre le livre (livre3d.ts) ----------
       L'ouverture `o` et le second temps `b` se LISENT sur la timeline, aux
       instants où tournaient les deux feuilles (jamais un état gardé à côté :
       un refresh de ScrollTrigger rejoue la timeline sans prévenir). Le modèle
       ne prend la main que livre fermé : jamais de relève en pleine ouverture,
       même si Three.js arrive tard. */
    let livre3d: Livre3D | null = null
    let main3d = false
    function maj3d() {
      const t1 = G.t1
      const g = G.g
      if (!livre3d || !t1 || !g) return
      const doux = g.parseEase('power1.inOut')
      const part = (debut: number, duree: number) => doux(Math.min(1, Math.max(0, (t1.time() - debut) / duree)))
      const P = G.t1P ?? 0
      const o = part(P + 0.18, 0.9)
      if (!main3d) {
        if (o > 0) return
        main3d = true
        R.dataset.m3d = '1'
      }
      livre3d.poser(o, part(P + 1.8, 0.8))
    }
    let demande3d = false
    function charger3d() {
      if (demande3d || !vivant) return
      demande3d = true
      const livre = $('.livre')
      if (!livre) return
      import('./livre3d')
        .then((m) => m.monterLivre3D(livre, { leger: tactile || mobile() }))
        .then((l) => {
          if (!vivant) return l.liberer()
          livre3d = l
          maj3d()
        })
        .catch(() => {
          /* Pas de WebGL, ou un chargement manqué : le livre HTML reste. */
        })
    }
    nettoyer.push(() => {
      livre3d?.liberer()
      livre3d = null
      delete R.dataset.m3d
    })

    function construireTitre(delai: number) {
      const g = G.g
      if (titreTouche || !g || reduit || !titre) return
      const mot = titre.textContent || ''
      titre.innerHTML = mot.split('').map((c) => '<span class="lt">' + (c === ' ' ? ' ' : c.replace(/</g, '&lt;')) + '</span>').join('')
      const c = $('.construit')
      if (!c) return
      g.timeline({ delay: delai })
        .fromTo(c.querySelector('.v'), { scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: 'power2.inOut' })
        .fromTo(c.querySelectorAll('.c1,.c2,.c3'), { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.7, stagger: 0.15, ease: 'power2.inOut' }, 0.2)
        .fromTo(c.querySelector('b'), { opacity: 0 }, { opacity: 0.85, duration: 0.3 }, 0.6)
        .fromTo(titre.querySelectorAll('.lt'), { opacity: 0, yPercent: 40, filter: 'blur(6px)' }, { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.55, stagger: 0.07, ease: 'power3.out' }, 0.9)
        .to(c.querySelectorAll('i,b'), { opacity: 0, duration: 0.8, stagger: 0.05 }, '+=.5')
        .add(() => {
          if (!titreTouche) titre.textContent = mot
          ajusterTous()
        })
    }

    function construire() {
      const g = G.g, ST = G.st
      if (!g || !ST || !vivant) return
      G.ctx = g.context(() => {
        const livre = $('.livre')
        if (!livre) return
        g.set($$('.feuille'), { transformPerspective: 2400 })
        const s0 = () => (mobile() ? 1.28 : 1)
        const x0 = () => (mobile() ? innerWidth / 2 : innerWidth * 0.71) - innerWidth / 2 - (s0() * livre.offsetWidth) / 4
        const y0 = () => (mobile() ? innerHeight * 0.15 : 0)
        if (!reduit) {
          g.from($$('#ouv .texte > *'), { y: 24, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out' })
          g.from($('.scene-livre'), { y: 60, opacity: 0, duration: 1.3, ease: 'power3.out', delay: 0.15 })
          construireTitre(1.1)
          g.fromTo($$('#ouv .traits path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 3.2, stagger: 0.3, ease: 'power1.inOut', delay: 0.2 })
        }

        G.faireT1 = () => {
          if (G.t1) {
            G.t1.scrollTrigger?.kill(true)
            G.t1.kill()
            G.t1 = null
          }
          const phase = !(R.dataset.perso && R.dataset.titre)
          const P = phase ? 1.05 : 0
          const t1 = g.timeline({ scrollTrigger: { trigger: '#ouv', start: 'top top', end: '+=' + (phase ? 480 : 380) + '%', scrub: 0.8, pin: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 2, onRefresh: maj3d }, onUpdate: maj3d })
          G.t1 = t1
          G.t1Phase = phase
          G.t1P = P
          const sp = () => Math.min(mobile() ? 1.2 : 0.8, (innerHeight * (mobile() ? 0.34 : 0.4)) / livre.offsetHeight)
          const xc = () => (-sp() * livre.offsetWidth) / 4
          const e2 = $$('#e2 .e2-haut, #e2 .e2-bas')
          const texte = $('#ouv .texte')
          if (phase) {
            t1.fromTo(livre, { x: x0, y: y0, scale: s0, rotation: 0 }, { x: xc, y: 0, scale: sp, rotation: 0, duration: 0.5, ease: 'power2.inOut' }, 0)
              .to(texte, { x: -70, opacity: 0, duration: 0.4, ease: 'power1.in' }, 0)
              .fromTo(e2, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.08, ease: 'power2.out' }, 0.28)
              .to(e2, { autoAlpha: 0, y: -18, duration: 0.2, stagger: 0.04 }, 0.92)
              .fromTo(livre, { x: xc, y: 0, scale: sp }, { x: 0, y: 0, scale: 1, duration: 1, ease: 'power2.inOut', immediateRender: false }, P)
          } else {
            t1.fromTo(livre, { x: x0, y: y0, scale: s0, rotation: 0 }, { x: 0, y: 0, scale: 1, rotation: 0, duration: 1, ease: 'power2.inOut' }, 0)
              .to(texte, { x: -70, opacity: 0, duration: 0.45, ease: 'power1.in' }, 0)
          }
          t1.fromTo('.m-banc .f1', { rotateY: 0 }, { rotateY: -180, duration: 0.9, ease: 'power1.inOut' }, P + 0.18)
            .fromTo('.m-banc .livre .repere', { opacity: 0, scale: 2.2 }, { opacity: 0.75, scale: 1, duration: 0.2, stagger: 0.04 }, P + 0.95)
            .fromTo('.m-banc .legende .l1', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, P + 0.85)
            .to('.m-banc .nA', { opacity: 1, duration: 0.01 }, P + 1.05)
            .fromTo('.m-banc .nA .pt', { scale: 0 }, { scale: 1, duration: 0.15, stagger: 0.1 }, P + 1.05)
            .fromTo('.m-banc .nA .tr', { scaleX: 0 }, { scaleX: 1, duration: 0.25, stagger: 0.1 }, P + 1.1)
            .fromTo('.m-banc .nA span', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.1 }, P + 1.2)
            .to('.m-banc .nA', { opacity: 0, duration: 0.2 }, P + 1.75)
            .set('.m-banc .f2', { zIndex: 4 }, P + 1.8)
            .fromTo('.m-banc .f2', { rotateY: 0 }, { rotateY: -180, duration: 0.8, ease: 'power1.inOut' }, P + 1.8)
            .to('.m-banc .legende .l1', { opacity: 0, y: -14, duration: 0.2 }, P + 2.15)
            .fromTo('.m-banc .legende .l2', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 }, P + 2.35)
            .to('.m-banc .nB', { opacity: 1, duration: 0.01 }, P + 2.6)
            .fromTo('.m-banc .nB .pt', { scale: 0 }, { scale: 1, duration: 0.15, stagger: 0.1 }, P + 2.6)
            .fromTo('.m-banc .nB .tr', { scaleX: 0 }, { scaleX: 1, duration: 0.25, stagger: 0.1 }, P + 2.65)
            .fromTo('.m-banc .nB span', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.1 }, P + 2.75)
            .to('.m-banc .nB', { opacity: 0, duration: 0.2 }, P + 3.4)
            .to(livre, { scale: 0.88, y: () => -innerHeight * 0.03, duration: 0.4 }, P + 3.4)
            .to({}, { duration: 0.2 })
        }
        G.faireT1()

        /* 02 : la pile devient une année */
        G.faireT2 = () => {
          if (G.t2) {
            G.t2.scrollTrigger?.kill(true)
            G.t2.kill()
            G.t2 = null
          }
          g.set($$('.moment'), { clearProps: 'transform' })
          const vieEl = $('#vie')
          const rail = vieEl?.querySelector<HTMLElement>('.rail')
          const piste = vieEl?.querySelector<HTMLElement>('.piste')
          if (!vieEl || !rail || !piste) return
          const mp = piste.querySelector<HTMLElement>('.m-perso')
          const dernier = !!(R.dataset.perso && R.dataset.titre)
          if (mp) mp.style.display = dernier ? '' : 'none'
          const cartes = $$('.moment').filter((el) => el.offsetParent)
          const rot = [-7, 9, -4, 8, -3, 5]
          const t2 = g.timeline({ scrollTrigger: { trigger: '#vie', start: 'top top', end: () => '+=' + (mobile() ? 440 : 330) + '%', scrub: 0.7, pin: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1 } })
          G.t2 = t2
          G.t2Dernier = dernier
          cartes.forEach((el, i) => {
            const cv = el.querySelector<HTMLElement>('.cv')
            const px = () => vieEl.offsetWidth / 2 - (piste.offsetLeft + el.offsetLeft + el.offsetWidth / 2)
            const py = () => innerHeight * 0.5 - (rail.offsetTop + el.offsetTop + (cv?.offsetHeight || 0) / 2)
            t2.fromTo(el, { x: px, y: () => py() + innerHeight, rotation: rot[i] * 3 }, { x: px, y: py, rotation: rot[i], duration: 0.45, ease: 'power2.out' }, i * 0.2)
            t2.to(el, { x: 0, y: 0, rotation: 0, duration: 0.75, ease: 'power2.inOut' }, 1.65 + i * 0.06)
          })
          t2.fromTo($$('.moment figcaption > :not(.trait)'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.04 }, 2.35)
            .fromTo($$('.moment .trait'), { scaleX: 0 }, { scaleX: 1, duration: 0.22, stagger: 0.08, ease: 'none' }, 2.2)
            .fromTo($('.vie .m1'), { xPercent: -25, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.5 }, 0)
            .fromTo($('.vie .m2'), { xPercent: 25, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.5 }, 0.4)
            .fromTo($('.vie .m3'), { xPercent: -25, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.5 }, 0.8)
            .to($$('.vie .mot'), { opacity: 0, y: -30, duration: 0.35, stagger: 0.05 }, 1.5)
            .fromTo($('.vie-tete'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4 }, 1.95)
            .fromTo($$('#vie .traits path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 3, stagger: 0.2, ease: 'none' }, 0)
            .to(piste, { x: () => (mobile() ? -(piste.offsetWidth - innerWidth) : 0), duration: 1.3, ease: 'none' }, 3.0)
            .to({}, { duration: 0.3 })
        }
        G.faireT2()

        /* traits des autres sections : lents, à la vitesse du défilement */
        $$<SVGSVGElement>('.bloc .traits').forEach((s) => {
          g.fromTo(s.querySelectorAll('path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.15, ease: 'none', scrollTrigger: { trigger: s.parentNode as Element, start: 'top 85%', end: 'bottom 40%', scrub: 1.2 } })
        })
        /* transitions douces entre les sections */
        $$('.bloc h2').forEach((h) => {
          g.from(h, { yPercent: 30, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } })
        })
        g.from($$('.porte'), { y: 40, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: $('.portes'), start: 'top 85%' } })
      }, R)
      ST.refresh()
      caler()
      /* Three.js : jamais dans le premier rendu. Au premier geste, ou un peu
         après le chargement si personne ne bouge. */
      const tot = () => charger3d()
      ecoute(window, 'scroll', tot, { passive: true, once: true })
      ecoute(window, 'pointerdown', tot, { passive: true, once: true })
      const plusTard = window.setTimeout(tot, 2500)
      nettoyer.push(() => clearTimeout(plusTard))
    }

    poserPhotos()
    maj()
    /* « Réduire les animations » coupe ce qui bouge seul (entrées, titre construit,
       titre qui tourne, vidéo) ; le défilement reste celui du lecteur, comme au banc. */
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([m, s]) => {
      if (!vivant) return
      G.g = m.default
      G.st = s.ScrollTrigger
      G.g.registerPlugin(G.st)
      const go = () => vivant && construire()
      if (document.fonts?.ready) document.fonts.ready.then(go)
      else go()
      ecoute(window, 'load', () => G.st?.refresh())
    })

    return () => {
      vivant = false
      G.t1?.scrollTrigger?.kill(true)
      G.t1?.kill()
      G.t2?.scrollTrigger?.kill(true)
      G.t2?.kill()
      G.ctx?.revert()
      nettoyer.forEach((f) => f())
      delete R.dataset.perso
      delete R.dataset.titre
    }
  }, [photos])

  return null
}
