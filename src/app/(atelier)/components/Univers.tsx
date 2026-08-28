'use client'

/* ════════════════════════════════════════════════════════════
   L'UNIVERS BELLAJOUR — le séquenceur des sept pages
   Une page = une séquence. Elle joue UNE fois, quand la page entre
   vraiment dans l'écran, et jamais avant : lire un texte qui s'est
   composé pendant qu'on regardait ailleurs, c'est lire un texte fixe.

   Un `data-t` = un instant, en millisecondes, dans la séquence de sa
   page. Le séquenceur pose le retard et la classe ; la feuille de style
   décide de la forme du mouvement. Pour régler un timing, il n'y a qu'un
   attribut à changer dans le balisage.

   ⚠️ `--retard` en plus de `transition-delay` : le glitch de la page 02
   est une ANIMATION, qui ignore `transition-delay`, et il vit sur trois
   couches dont deux pseudo-éléments. Une propriété personnalisée est la
   seule chose qui descende jusqu'à eux.

   Aucune écoute brute du défilement, aucune molette détournée.
   ════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from 'react'
import { CTA_HREF } from '../content'
import './univers.css'

export default function Univers() {
  const racine = useRef<HTMLElement>(null)

  useEffect(() => {
    const hote = racine.current
    if (!hote) return
    const doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fin = window.matchMedia('(min-width:1001px) and (hover:hover) and (pointer:fine)').matches
    const un = <T extends Element>(s: string) => hote.querySelector<T>(s)
    const tous = <T extends Element>(s: string, r: ParentNode = hote) => [...r.querySelectorAll<T>(s)]
    const borne = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
    const pages = tous<HTMLElement>('.sl')
    if (!pages.length) return

    const menage: Array<() => void> = []

    /* ── « oubliables » : une lettre = un élément. Composé en JS pour ne
       pas polluer le document de <span> vides ; le mot reste écrit en
       toutes lettres dans le balisage, donc lisible aux moteurs. ── */
    const mot3 = un<HTMLElement>('[data-lettres]')
    if (mot3) {
      const texte = (mot3.textContent || '').trim()
      /* Une copie LISIBLE a cote des lettres. `aria-label` ne suffit pas :
         .m3 est un <span> nu, donc de role generic, et ARIA 1.2 interdit le
         nommage sur generic — les lecteurs d'ecran l'ignorent. Sans cette
         copie, les dix lettres etant toutes aria-hidden, le troisieme mot du
         triptyque n'existait plus du tout pour qui ecoute la page. */
      mot3.innerHTML =
        '<span class="sr-only">' + texte + '</span>' +
        [...texte].map((c) => '<span class="c" aria-hidden="true">' + c + '</span>').join('')
    }

    /* ── le compteur mécanique (PRD §15, mouvement nº5) ──
       Le NOMBRE monte réellement, et chaque colonne roule quand son
       chiffre change. Les unités tournent sans arrêt, les milliers ne
       bougent qu'à leur tour : c'est ce décalage qui donne la pile qui se
       constitue. Les zéros de tête restent, comme sur un vrai compteur. */
    const comptes = new WeakSet<Element>()
    const lancerCompte = (el: HTMLElement) => {
      if (comptes.has(el)) return
      comptes.add(el)
      const cible = Number(el.dataset.compte)
      const n = String(cible).length
      el.textContent = ''
      const cols: Array<{ col: HTMLElement; dernier: number }> = []
      for (let i = 0; i < n; i++) {
        const d = document.createElement('span'); d.className = 'd'
        const col = document.createElement('span'); col.className = 'col'
        for (let k = 0; k <= 9; k++) {
          const it = document.createElement('i'); it.textContent = String(k); col.appendChild(it)
        }
        d.appendChild(col); el.appendChild(d)
        cols.push({ col, dernier: 0 })
        const restants = n - 1 - i
        if (restants > 0 && restants % 3 === 0) {
          const e = document.createElement('span'); e.className = 'esp'; el.appendChild(e)
        }
      }
      const poser = (txt: string) => cols.forEach((c, i) => {
        const d = Number(txt[i])
        if (d !== c.dernier) {
          c.dernier = d
          c.col.style.transform = 'translateY(calc(var(--cell) * -' + d + '))'
        }
      })
      if (doux) { poser(String(cible)); return }
      const duree = 1500
      const t0 = performance.now()
      const pas = (t: number) => {
        const p = borne((t - t0) / duree, 0, 1)
        poser(String(Math.round(cible * (1 - Math.pow(1 - p, 3)))).padStart(n, '0'))
        if (p < 1) requestAnimationFrame(pas)
      }
      requestAnimationFrame(() => requestAnimationFrame(pas))
    }

    /* ── le déclencheur ── */
    const jouee = new WeakSet<Element>()
    let restantes = pages.length
    const lancer = (page: HTMLElement) => {
      if (jouee.has(page)) return
      jouee.add(page); restantes -= 1
      page.classList.add('joue')
      tous<HTMLElement>('[data-t]', page).forEach((el) => {
        const retard = doux ? Math.min(Number(el.dataset.t), 600) : Number(el.dataset.t)
        el.style.transitionDelay = retard + 'ms'
        el.style.setProperty('--retard', retard + 'ms')
        el.classList.add('vu')
      })
      /* Le compteur démarre quand il APPARAÎT, pas quand il entre dans
         l'écran : sinon sa montée est finie depuis longtemps le temps que
         son bloc se dévoile, et on ne voit jamais le nombre grandir. */
      tous<HTMLElement>('[data-compte]', page).forEach((el) => {
        const conteneur = el.closest('[data-t]') as HTMLElement | null
        const retard = conteneur
          ? (doux ? Math.min(Number(conteneur.dataset.t), 600) : Number(conteneur.dataset.t))
          : 0
        const id = window.setTimeout(() => lancerCompte(el), retard + 260)
        menage.push(() => clearTimeout(id))
      })
    }
    const oeil = new IntersectionObserver((entrees) => {
      entrees.forEach((e) => { if (e.isIntersecting) lancer(e.target as HTMLElement) })
    }, { threshold: 0.55 })
    pages.forEach((p) => oeil.observe(p))
    menage.push(() => oeil.disconnect())

    /* Filet : l'observateur est le déclencheur normal, mais il peut ne
       jamais répondre (onglet occulté, vue mise en veille par le système).
       Une page qui ne joue pas est une page VIDE, pas une page sobre : la
       boucle vérifie donc aussi, à chaque image, quelle page occupe plus
       de la moitié de l'écran. Même seuil, même résultat, et `lancer` ne
       joue qu'une fois de toute façon. */
    const verifierVisibles = () => {
      if (!restantes) return
      const h = window.innerHeight
      pages.forEach((p) => {
        if (jouee.has(p)) return
        const r = p.getBoundingClientRect()
        const vu = Math.min(r.bottom, h) - Math.max(r.top, 0)
        if (vu > 0 && vu / Math.min(r.height, h) >= 0.55) lancer(p)
      })
    }

    /* ── tourner la page ──
       Défilement piloté à la main, lent et amorti : la sensation d'une
       page qu'on tourne, pas d'un saut d'ancre. Le scroll-behavior natif
       est coupé le temps du geste, sinon les deux se disputent la page. */
    const versLa = (cible: HTMLElement | null) => {
      if (!cible) return
      if (doux) { cible.scrollIntoView({ behavior: 'auto', block: 'start' }); return }
      const depart = window.scrollY
      const d = cible.getBoundingClientRect().top
      if (Math.abs(d) < 4) return
      const duree = 1100
      const t0 = performance.now()
      const rac = document.documentElement
      const memoire = rac.style.scrollBehavior
      rac.style.scrollBehavior = 'auto'
      const pas = (t: number) => {
        const p = borne((t - t0) / duree, 0, 1)
        const e = 1 - Math.pow(1 - p, 4)
        window.scrollTo({ top: depart + d * e, behavior: 'instant' as ScrollBehavior })
        if (p < 1) requestAnimationFrame(pas)
        else rac.style.scrollBehavior = memoire
      }
      requestAnimationFrame(pas)
    }
    tous<HTMLElement>('.suite, .pas li').forEach((el) => {
      const aller = () => versLa(document.getElementById((el.dataset.vers || '#').slice(1)))
      el.addEventListener('click', aller)
      menage.push(() => el.removeEventListener('click', aller))
      if (el.tagName === 'LI') {
        el.tabIndex = 0
        el.setAttribute('role', 'link')
        const clavier = (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aller() }
        }
        el.addEventListener('keydown', clavier)
        menage.push(() => el.removeEventListener('keydown', clavier))
      }
    })

    /* ── « oubliables » ne s'efface pas à l'heure dite ──
       Une lettre part quand on la frôle, le reste quand on quitte la page.
       Un souvenir s'efface quand on y touche, et quand on passe à autre
       chose : c'est le sens du mot, pas une minuterie. */
    const lettres = tous<HTMLElement>('.m3 .c')
    const page3 = un<HTMLElement>('.sl3')
    if (lettres.length && page3) {
      lettres.forEach((c) => {
        const partir = () => c.classList.add('parti')
        c.addEventListener('pointerenter', partir)
        c.addEventListener('pointerdown', partir)
        menage.push(() => {
          c.removeEventListener('pointerenter', partir)
          c.removeEventListener('pointerdown', partir)
        })
      })
      let dedans = false
      /* UN seul tableau, vide a chaque passage. Empiler les annulations dans
         `menage` y ajoutait dix fermetures a chaque SORTIE de la page, sans
         jamais les retirer : cent allers-retours retenaient mille fermetures
         jusqu'au demontage. */
      let minuteurs: number[] = []
      const purger = () => { minuteurs.forEach(clearTimeout); minuteurs = [] }
      const oeil3 = new IntersectionObserver((e) => {
        purger()
        if (e[0].isIntersecting) {
          dedans = true
          lettres.forEach((c) => c.classList.remove('parti'))
          return
        }
        if (!dedans) return
        lettres.forEach((c, i) => {
          minuteurs.push(window.setTimeout(() => c.classList.add('parti'), i * 90))
        })
      }, { threshold: 0.35 })
      menage.push(purger)
      oeil3.observe(page3)
      menage.push(() => oeil3.disconnect())
    }

    /* ── la boucle unique ── */
    const rail = un<HTMLElement>('.pas')
    const jauge = un<HTMLElement>('.pas-jauge i')
    const items = tous<HTMLElement>('.pas li')
    const impalp = un<HTMLElement>('.m2')
    const numero = un<HTMLElement>('.numero')
    const souris = { x: -1, y: -1 }
    if (fin && !doux) {
      const bouge = (e: PointerEvent) => { souris.x = e.clientX; souris.y = e.clientY }
      addEventListener('pointermove', bouge, { passive: true })
      menage.push(() => removeEventListener('pointermove', bouge))
    }

    let derniereY = -1
    let frame = 0
    const boucle = () => {
      const y = window.scrollY
      const h = window.innerHeight
      verifierVisibles()
      /* Ce qui depend du DEFILEMENT ne se recalcule que si l'on a defile.
         `fin` (bureau + pointeur precis) est une CONSTANTE vraie : la laisser
         dans cette condition faisait tourner le bloc entier a chaque frame,
         page immobile comprise — soit une ecriture de mise en page suivie de
         neuf lectures de geometrie, 60 fois par seconde, indefiniment et meme
         quand l'univers est hors ecran. Les deux effets de souris, eux,
         doivent bien suivre chaque frame : ils sont sortis plus bas. */
      if (y !== derniereY) {
        derniereY = y

        if (rail) {
          const haut = hote.offsetTop
          const hh = hote.offsetHeight
          rail.classList.toggle('on', y > haut - h * 0.5 && y < haut + hh - h * 0.4)
          const p = borne((y - haut + h * 0.5) / (hh - h * 0.4), 0, 1)
          if (jauge) jauge.style.transform = 'scaleY(' + p.toFixed(4) + ')'
          let actif = 0
          pages.forEach((el, i) => { if (el.getBoundingClientRect().top <= h * 0.5) actif = i })
          items.forEach((li, i) => li.classList.toggle('actif', i === actif))
        }
      }

      /* Les deux effets qui suivent le POINTEUR, eux, doivent bien etre
         recalcules a chaque frame : la souris bouge sans qu'on defile.
         `fin` les reserve deja au bureau muni d'un pointeur precis, donc
         un telephone ne paie rien ici. */

      /* « impalpables » se dérobe : plus la souris approche, plus il
         s'écarte. On ne l'attrape jamais. C'est le mot qui joue son
         sens, pas une décoration. */
      if (impalp && fin && !doux) {
        const r = impalp.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const dx = souris.x - cx
        const dy = souris.y - cy
        const dist = Math.hypot(dx, dy)
        const portee = Math.max(r.width * 0.75, 320)
        if (souris.x >= 0 && dist < portee && dist > 0) {
          const f = 1 - dist / portee
          impalp.style.setProperty('--dx', (-dx / dist * f * 46).toFixed(1) + 'px')
          impalp.style.setProperty('--dy', (-dy / dist * f * 26).toFixed(1) + 'px')
        } else {
          impalp.style.setProperty('--dx', '0px')
          impalp.style.setProperty('--dy', '0px')
        }
      }

      /* le numéro s'incline vers la souris : on a envie de le prendre */
      if (numero && fin && !doux && souris.x >= 0) {
        const r = numero.getBoundingClientRect()
        if (r.top < h && r.bottom > 0) {
          const nx = borne((souris.x - (r.left + r.width / 2)) / (r.width * 1.6), -1, 1)
          const ny = borne((souris.y - (r.top + r.height / 2)) / (r.height * 1.6), -1, 1)
          numero.style.setProperty('--ry', (nx * 9).toFixed(2) + 'deg')
          numero.style.setProperty('--rx', (-ny * 6).toFixed(2) + 'deg')
        }
      }

      frame = requestAnimationFrame(boucle)
    }
    frame = requestAnimationFrame(boucle)

    return () => {
      cancelAnimationFrame(frame)
      menage.forEach((f) => f())
    }
  }, [])

  return (
<main className="univers" id="recit" ref={racine}>

        {/* le chemin de fer : ou on en est, combien il reste */}
        <aside className="pas" aria-label="Les sept pages de l’univers Bellajour">
          <ol>
            <li data-vers="#u1"><span className="n">01</span><span className="t">La collection</span></li>
            <li data-vers="#u2"><span className="n">02</span><span className="t">Le constat</span></li>
            <li data-vers="#u3"><span className="n">03</span><span className="t">Les trois mots</span></li>
            <li data-vers="#u4"><span className="n">04</span><span className="t">L’admiration</span></li>
            <li data-vers="#u5"><span className="n">05</span><span className="t">Le concept</span></li>
            <li data-vers="#u6"><span className="n">06</span><span className="t">La citation</span></li>
            <li data-vers="#u7"><span className="n">07</span><span className="t">Votre numéro 1</span></li>
          </ol>
          <div className="pas-jauge"><i></i></div>
        </aside>

        {/* ─────────── 01 · LA COLLECTION ─────────── */}
        <section className="sl sl1" id="u1" data-page="01">
          <div className="sl-corps">
          <div className="sl1-camera">
            <h2 className="geant">
              <span className="ligne"><span className="in">La meilleure</span></span>
              <span className="ligne"><span className="in">des collections,</span></span>
              <span className="ligne"><span className="in"><em>votre vie</em></span></span>
            </h2>
            <p className="sl1-note" data-t="1900">L’idée de Bellajour est venue d’un constat sur notre vie actuelle…</p>
            <p className="sl1-manque" data-t="3300"><em>d’un manque.</em></p>
          </div>
          </div>

          <button type="button" className="suite" aria-label="Tourner la page — Le constat" data-vers="#u2" data-t="4400">
            <span className="mot">Tourner la page</span>
            <span className="rond" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v13"/><path d="M6 11.5 12 17.5l6-6"/></svg></span>
          </button>
        </section>

        {/* ─────────── 02 · LE CONSTAT ─────────── */}
        <section className="sl sl2" id="u2" data-page="02">
          <h2 className="sr-only">Le constat</h2>
          <div className="sl-corps">
          <div className="sl2-scene" aria-hidden="true">
            <figure className="v v1" data-t="1900"><span className="ph"><img src="/images/univers/solution-upload-02.webp" alt="" width="480" height="640" fetchPriority="low" decoding="async" /></span></figure>
            <figure className="v v2" data-t="2500">
              <span className="ph"><img src="/images/univers/grid-03.webp" alt="" width="600" height="800" fetchPriority="low" decoding="async" /></span>
              <span className="v-video"><i></i><b>0:24</b></span>
            </figure>
            <figure className="v v3" data-t="3100">
              <span className="v-mot"><s></s><s></s><em>♥ 12</em></span>
            </figure>
            <figure className="v v4" data-t="3700"><span className="ph"><img src="/images/univers/solution-upload-05.webp" alt="" width="400" height="300" fetchPriority="low" decoding="async" /></span></figure>
            <figure className="v v5" data-t="4300">
              <span className="v-story"><i></i><i></i><i></i></span>
              <span className="ph"><img src="/images/univers/solution-upload-09.webp" alt="" width="400" height="534" fetchPriority="low" decoding="async" /></span>
            </figure>
          </div>

          <p className="sl2-texte">
            {/* ⚠️ `&#8239;` est l'espace fine INSECABLE (U+202F), celle que la
                 typographie francaise met devant `;`. Elle n'est pas
                 decorative : elle EMPECHE le point-virgule de basculer seul
                 en debut de ligne. Une espace normale le laisserait partir. */}
            <span className="bloc" data-t="300">Nous vivons l’époque où l’on documente le plus notre vie&#8239;;</span>
            <span className="bloc" data-t="1500"><em data-t="1900">photos</em>, <em data-t="2500">vidéos</em>, <em data-t="3100">commentaires</em>, <em data-t="3700">publications</em> et <em data-t="4300">stories</em> sur les réseaux sociaux…</span>
            <span className="bloc" data-t="5200">mais que tous ces moments de vie&#8239;; ces périodes, ces souvenirs&#8239;;</span>
            {/* la chute respire : 1400 ms apres la phrase qui la prepare,
                 au lieu de 900. C'est le seul mot qui doit surprendre. */}
            <b className="glitch" data-t="6600" data-texte="restent numériques…">restent numériques…</b></p>

          <div className="sl2-compte" data-t="7200">
            <p className="g" data-compte="12480">0</p>
            <p className="l">photos sur son téléphone</p>
          </div>
          </div>

          <button type="button" className="suite" aria-label="Tourner la page — Les trois mots" data-vers="#u3" data-t="8100">
            <span className="mot">Tourner la page</span>
            <span className="rond" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v13"/><path d="M6 11.5 12 17.5l6-6"/></svg></span>
          </button>
        </section>

        {/* ─────────── 03 · LES TROIS MOTS ─────────── */}
        <section className="sl sl3" id="u3" data-page="03">
          <h2 className="sr-only">Les trois mots</h2>
          <div className="sl-corps">
          <p className="sl3-avant" data-t="200">Donc instantanés et rendus le plus simple et le plus accessible possible ; prendre une photo n’a jamais été aussi simple. Mais par conséquent</p>

          <div className="sl3-mots">
            <span className="m m1" data-t="1400">immatériels,</span>
            <span className="m m2" data-t="3000">impalpables,</span>
            <span className="m m3" data-t="4600" data-lettres>oubliables</span>
          </div>

          <p className="sl3-apres" data-t="6400">Un souvenir qui n’est pas gravé et rappelé à notre esprit, est de plus en plus imprécis et finit, petit à petit, par le quitter.</p>
          </div>

          <button type="button" className="suite" aria-label="Tourner la page — L’admiration" data-vers="#u4" data-t="7600">
            <span className="mot">Tourner la page</span>
            <span className="rond" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v13"/><path d="M6 11.5 12 17.5l6-6"/></svg></span>
          </button>
        </section>

        {/* ─────────── 04 · L’ADMIRATION ─────────── */}
        <section className="sl sl4" id="u4" data-page="04">
          <h2 className="sr-only">L’admiration</h2>
          <div className="sl-corps">
          <p className="sl4-texte" data-t="200">Admiratifs devant les magazines, les BDs, les affiches de films, les albums photos, et tout simplement tout ce qui symbolisait <em>un moment fort en une seule image</em>, ou une série de pages.</p>

          <div className="sl4-bande" data-t="900">
            <div className="sl4-rail">
              <figure><span className="ph" data-legende="Un magazine"><img src="/images/lancement/galerie/marrakech.webp" alt="Un numéro Bellajour consacré à un voyage à Marrakech" width="450" height="675" loading="lazy" decoding="async" /></span></figure>
              <figure><span className="ph" data-legende="Une BD"><img src="/images/lancement/galerie/japon.webp" alt="Un numéro Bellajour consacré à un voyage au Japon" width="450" height="675" loading="lazy" decoding="async" /></span></figure>
              <figure><span className="ph" data-legende="Une affiche"><img src="/images/lancement/galerie/patagonie.webp" alt="Un numéro Bellajour consacré à un voyage en Patagonie" width="450" height="675" loading="lazy" decoding="async" /></span></figure>
              <figure><span className="ph" data-legende="Un album photos"><img src="/images/lancement/galerie/lisbonne.webp" alt="Un numéro Bellajour consacré à un séjour à Lisbonne" width="450" height="675" loading="lazy" decoding="async" /></span></figure>
              <figure><span className="ph" data-legende="Une série de pages"><img src="/images/lancement/galerie/santorin.webp" alt="Un numéro Bellajour consacré à un séjour à Santorin" width="450" height="675" loading="lazy" decoding="async" /></span></figure>
              <figure aria-hidden="true"><span className="ph" data-legende="Un magazine"><img src="/images/lancement/galerie/marrakech.webp" alt="" width="450" height="675" loading="lazy" decoding="async" /></span></figure>
              <figure aria-hidden="true"><span className="ph" data-legende="Une BD"><img src="/images/lancement/galerie/japon.webp" alt="" width="450" height="675" loading="lazy" decoding="async" /></span></figure>
              <figure aria-hidden="true"><span className="ph" data-legende="Une affiche"><img src="/images/lancement/galerie/patagonie.webp" alt="" width="450" height="675" loading="lazy" decoding="async" /></span></figure>
              <figure aria-hidden="true"><span className="ph" data-legende="Un album photos"><img src="/images/lancement/galerie/lisbonne.webp" alt="" width="450" height="675" loading="lazy" decoding="async" /></span></figure>
              <figure aria-hidden="true"><span className="ph" data-legende="Une série de pages"><img src="/images/lancement/galerie/santorin.webp" alt="" width="450" height="675" loading="lazy" decoding="async" /></span></figure>
            </div>
          </div>
          </div>

          <button type="button" className="suite" aria-label="Tourner la page — Le concept" data-vers="#u5" data-t="2600">
            <span className="mot">Tourner la page</span>
            <span className="rond" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v13"/><path d="M6 11.5 12 17.5l6-6"/></svg></span>
          </button>
        </section>

        {/* ─────────── 05 · LE CONCEPT ─────────── */}
        <section className="sl sl5" id="u5" data-page="05">
          <div className="sl-corps">
            <p className="sl5-amorce" data-t="200">Nous avons rêvé ce concept avant de vous le proposer aujourd’hui :</p>

            <h2 className="sl5-titre">
              <span className="ligne"><span className="in">Le magazine d’un <em>moment de vie</em></span></span>
            </h2>

            {/* Le nuage : l'enumeration de Mathias, chaque moment a son echelle.
                 Les mots ne changent pas, ils prennent la place qu'ils meritent. */}
            <div className="sl5-nuage">
                <span className="n1" data-t="1900">La dernière soirée incroyable</span>
                <span className="n2" data-t="2200">ce week-end</span>
                <span className="n3" data-t="2500">ce concert</span>
                <span className="n4" data-t="2800">ce voyage</span>
                <span className="n5" data-t="3100">cette vision artistique que vous voulez graver</span>
                <span className="n6" data-t="3400">cette relation qui vous tient à cœur</span>
            </div>

            <p className="sl5-cadre" data-t="4000">N’importe quoi… tant que c’est important à vos yeux · Pour vous ou pour offrir</p>
            <p className="sl5-film" data-t="4700"><em>Comme si notre vie était un film</em></p>
          </div>

          <button type="button" className="suite" aria-label="Tourner la page — La citation" data-vers="#u6" data-t="5600">
            <span className="mot">Tourner la page</span>
            <span className="rond" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v13"/><path d="M6 11.5 12 17.5l6-6"/></svg></span>
          </button>
        </section>

        {/* ─────────── 06 · LA CITATION ─────────── */}
        <section className="sl sl6" id="u6" data-page="06">
          <div className="sl-corps">
          {/* LA HIERARCHIE EST INVERSEE (Mathias, 28/08/2026).
               La citation est empruntee : c'est la mise en place, pas la
               chute. Elle recule donc — plus petite, en gris — et c'est la
               REPONSE de Bellajour qui prend la taille, la pleine encre et
               la lueur qui traverse. Une page qui donne le premier role a
               la phrase d'un autre vend la phrase d'un autre. */}
          <p className="sl6-amorce" data-t="200">Nous sommes très attachés à la citation :</p>
          <blockquote className="sl6-cit">
            <span className="guill" aria-hidden="true" data-t="700">«</span>
            <span className="ligne"><span className="in">Il ne faut pas confondre</span></span>
            <span className="ligne"><span className="in">rêver sa vie et vivre ses rêves<span className="guill-f" aria-hidden="true">»</span></span></span>
          </blockquote>

          <p className="sl6-bascule" data-t="2600">Nous, on veut proposer les deux&#8239;:</p>
          <p className="sl6-reponse" data-t="3200">
            Vivez un rêve, puis <em>rêvez votre vie</em> dans vos magazines
            <span className="lueur" aria-hidden="true"></span>
          </p>
          <p className="sl6-chute" data-t="4600">Qui sait, votre premier numéro vous poussera à vivre le prochain.</p>
          </div>

          <button type="button" className="suite" aria-label="Tourner la page — Le numéro" data-vers="#u7" data-t="5400">
            <span className="mot">Tourner la page</span>
            <span className="rond" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v13"/><path d="M6 11.5 12 17.5l6-6"/></svg></span>
          </button>
        </section>

        {/* ─────────── 07 · VOTRE NUMÉRO 1 ─────────── */}
        <section className="sl sl7" id="u7" data-page="07">
          <div className="sl7-obj" data-t="600">
            <div className="numero" data-legende="Votre numéro 01">
              <div className="n-plat">
                <img src="/images/lancement/galerie/marrakech.webp" alt="Un numéro Bellajour" width="450" height="675" loading="lazy" decoding="async" />
                <div className="n-voile"></div>
                <div className="n-tete"><span className="n-masthead">Bellajour</span><span className="n-no">N° 01</span></div>
                <div className="n-pied">
                  <span className="n-filet"></span>
                  <span className="n-titre">Marrakech, et le silence des toits</span>
                  <span className="n-sous">Quatre jours · 32 pages · Mars</span>
                </div>
                <div className="n-lum"></div><div className="n-fibre"></div><div className="n-dos"></div>
              </div>
              <div className="n-tranche"></div>
            </div>
          </div>

          <div className="sl7-txt">
            <h2 className="sl7-titre">
              <span className="ligne"><span className="in">Quel est votre</span></span>
              <span className="ligne"><span className="in"><em>numéro 1</em> ?</span></span>
            </h2>
            <a className="acte acte--seul sl7-cta" href={CTA_HREF} data-t="1800">
              <span className="mot">Composer avec l’atelier</span>
              <span className="rond" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h13"/><path d="M11.5 6 17.5 12l-6 6"/></svg></span>
            </a>
            <p className="mention sl7-note" data-t="2200">Premier aperçu gratuit · Votre magazine sur-mesure dès <b>30 €</b>.</p>
          </div>
        </section>

      </main>
  )
}
