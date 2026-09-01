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
import { CTA_HREF, CTA_MAGAZINE_LABEL } from '../content'
import './univers.css'

export default function Univers() {
  const racine = useRef<HTMLElement>(null)

  useEffect(() => {
    const hote = racine.current
    if (!hote) return
    const doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fin = window.matchMedia('(min-width:1001px) and (hover:hover) and (pointer:fine)').matches
    /* ── mobile : on ne tourne pas la page, on la descend ──
       Sous 1000 px il n'y a pas de bouton « Tourner la page » (masqué en
       CSS) : la personne SCROLLE. Une chorégraphie étalée se jouerait alors
       pendant qu'elle traverse la slide, et elle ne verrait qu'un écran à
       moitié composé. On met donc TOUS les retards à zéro : chaque élément
       de la page apparaît ensemble, d'un coup, dès qu'elle entre — un simple
       fondu court (univers.css) garde la chose propre, sans stagger. */
    const petit = window.matchMedia('(max-width:1000px)').matches
    /* ── le tempo desktop ──
       Sur desktop la séquence se joue en entier (les `data-t` bruts, jusqu'à
       ~8 s sur la page 02). Mathias la veut plus vive : on RESSERRE tous les
       retards d'un même facteur. Le stagger et l'ordre restent identiques —
       c'est le rythme qui accélère, pas la chorégraphie qui change. */
    const RYTHME_DESKTOP = 0.6
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

    /* Le compteur porte son nombre FINAL dans le balisage — même parti pris
       que le mot ci-dessus : sans JavaScript il doit se LIRE, pas afficher 0.
       On le remet à zéro ICI, au tout début de l'effet, donc avant que sa page
       ne se dévoile. Sinon le nombre final resterait affiché 260 ms avant que
       la montée ne reparte de zéro, et on gâcherait le seul mouvement de la
       page 02. Avec script, l'état initial est donc exactement celui d'avant. */
    tous<HTMLElement>('[data-compte]').forEach((el) => {
      el.textContent = '0'
    })

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
      if (doux || (!estPilote() && vitesse > VITESSE_PRESSEE)) { poser(String(cible)); return }
      const duree = 1500
      const t0 = performance.now()
      const pas = (t: number) => {
        const p = borne((t - t0) / duree, 0, 1)
        poser(String(Math.round(cible * (1 - Math.pow(1 - p, 3)))).padStart(n, '0'))
        if (p < 1) requestAnimationFrame(pas)
      }
      requestAnimationFrame(() => requestAnimationFrame(pas))
    }

    /* ── à quelle vitesse le lecteur descend-il ? ──
       Mesurée en pixels par seconde dans la boucle unique, plus bas. Une
       lecture normale tourne autour de 300 à 800 ; une chiquenaude monte
       à plusieurs milliers. Au-delà du seuil, la personne ne lit pas, elle
       cherche le bas de la page : lui jouer une chorégraphie de sept
       secondes ne lui montre RIEN, elle traverse des écrans vides.
       On ne lui prend pas le défilement pour autant — on lui donne la page
       déjà composée. */
    /* Une page de l'univers fait environ 800 px de haut. La traverser en
       moins d'une seconde, ce n'est deja plus la lire — d'ou ce seuil.
       Il etait a 1800 : il ne se declenchait qu'a la chiquenaude franche,
       et le rythme courant (« un peu vite ») passait juste en dessous, donc
       subissait sept secondes de choregraphie pour rien. Retour de Mathias
       du 28/08/2026. La valeur n'est tenable que parce que la mesure est
       LISSEE (voir la boucle) : sur une vitesse brute, un seul pic de
       molette suffirait a la franchir. */
    const VITESSE_PRESSEE = 900
    let vitesse = 0
    /* ⚠️ UN DEFILEMENT PILOTE N'EST JAMAIS UN LECTEUR QUI FUIT.
       Les deux boutons qui font tourner les pages defilent eux-memes, avec
       un amorti qui part vite : au moment ou la page suivante franchit le
       seuil de l'observateur, la vitesse depasse largement 900 px/s. Sans
       ce drapeau, quelqu'un qui CLIQUE pour voir la page perdrait
       justement la choregraphie qu'il vient de demander.
       Le drapeau est pose sur <html> et NON dans ce module, parce que
       l'un des deux boutons vit dans Ouverture.tsx (« Decouvrir l'univers
       Bellajour », qui amene la page 01). Deux composants, un seul etat :
       le document est le seul terrain qu'ils partagent. */
    const estPilote = () => document.documentElement.dataset.pilote === '1'

    /* ── le déclencheur ── */
    const jouee = new WeakSet<Element>()
    let restantes = pages.length
    const lancer = (page: HTMLElement) => {
      if (jouee.has(page)) return
      jouee.add(page); restantes -= 1
      /* La décision se prend À L'ENTRÉE de la page et ne se rejoue pas :
         `lancer` ne passe qu'une fois. Une page traversée en trombe reste
         donc composée si l'on y revient — c'est ce qu'on veut, on ne
         redéroule pas une séquence sous les yeux de quelqu'un qui remonte. */
      const presse = !estPilote() && vitesse > VITESSE_PRESSEE
      page.classList.add('joue')
      if (presse) page.classList.add('vite')
      tous<HTMLElement>('[data-t]', page).forEach((el) => {
        const retard = presse ? 0
          : petit ? 0
          : doux ? Math.min(Number(el.dataset.t), 600)
          : Number(el.dataset.t) * RYTHME_DESKTOP
        el.style.transitionDelay = retard + 'ms'
        el.style.setProperty('--retard', retard + 'ms')
        el.classList.add('vu')
      })
      /* Le compteur démarre quand il APPARAÎT, pas quand il entre dans
         l'écran : sinon sa montée est finie depuis longtemps le temps que
         son bloc se dévoile, et on ne voit jamais le nombre grandir. */
      tous<HTMLElement>('[data-compte]', page).forEach((el) => {
        const conteneur = el.closest('[data-t]') as HTMLElement | null
        const retard = presse || petit ? 0 : conteneur
          ? (doux ? Math.min(Number(conteneur.dataset.t), 600)
            : Number(conteneur.dataset.t) * RYTHME_DESKTOP)
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
      document.documentElement.dataset.pilote = '1'
      const pas = (t: number) => {
        const p = borne((t - t0) / duree, 0, 1)
        const e = 1 - Math.pow(1 - p, 4)
        window.scrollTo({ top: depart + d * e, behavior: 'instant' as ScrollBehavior })
        if (p < 1) requestAnimationFrame(pas)
        else { rac.style.scrollBehavior = memoire; delete document.documentElement.dataset.pilote }
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
    let vY = window.scrollY
    let vT = performance.now()

    /* ── le rail n'existe pas sous 1000 px ──
       univers.css le cache (`@media (max-width:1000px){ .pas{display:none} }`),
       mais le bloc rail de la boucle payait quand meme offsetTop, offsetHeight
       et sept getBoundingClientRect a CHAQUE frame de defilement — sur
       telephone, c'est-a-dire pour le trafic Instagram, pour peindre un
       element invisible. Miroir JS EXACT de la media query, evalue une fois
       et tenu a jour par `change` : au franchissement de la borne en
       redimensionnant, `derniereY` est remis a -1 pour que le rail se
       recompose des la frame suivante au retour bureau. */
    const etroit = window.matchMedia('(max-width: 1000px)')
    let sansRail = etroit.matches
    const surEtroit = () => {
      sansRail = etroit.matches
      derniereY = -1
    }
    etroit.addEventListener('change', surEtroit)
    menage.push(() => etroit.removeEventListener('change', surEtroit))

    const boucle = () => {
      const y = window.scrollY
      const h = window.innerHeight
      /* La vitesse se mesure AVANT `verifierVisibles`, qui peut declencher
         une page dans la meme image : elle doit deja etre a jour quand
         `lancer` la lit. */
      const t = performance.now()
      const dt = t - vT
      if (dt >= 8) {
        /* LISSEE, pas brute. Le defilement arrive par a-coups : un cran de
           molette, un doigt qui repart, et la mesure d'une seule image
           s'envole sans que la personne ait change de rythme. Le lissage
           exponentiel ignore le pic isole et suit le mouvement soutenu ;
           il rejoint sa valeur en quatre a cinq images, soit moins de
           80 ms — bien avant qu'une page n'atteigne le seuil de
           l'observateur. Sans lui, on ne pourrait pas descendre le seuil
           sans couper la choregraphie d'un lecteur calme. */
        const brute = Math.abs(y - vY) / dt * 1000
        vitesse = vitesse * 0.72 + brute * 0.28
        vY = y; vT = t
      }
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

        if (rail && !sansRail) {
          const haut = hote.offsetTop
          const hh = hote.offsetHeight
          /* Le chemin de fer ne vit QUE pendant le récit. Il compte les sept
             pages : le montrer ailleurs, c'est compter des pages qui n'existent
             pas. Deux bornes, et la jauge se cale sur les mêmes — sinon elle
             finirait sa course avant ou après la disparition du rail.
             — il s'allume une fois DANS l'univers (0,10 écran après son
               début), plus 0,15 avant : il se montrait pendant qu'on
               regardait encore la couverture, et il fallait qu'il ait
               disparu avant de la retrouver en remontant ;
             — il s'éteint 1,15 écran avant la fin, soit un dixième d'écran
               avant que le pied de page ne pointe. Le seuil précédent
               (1,05) était déjà presque juste : ce qui le trahissait était
               le fondu de 1200 ms, qui laissait le rail s'effacer par
               dessus le footer. La sortie est maintenant vive (voir
               univers.css), et ce dixième d'écran est la marge qui rend la
               chose franche même en défilement rapide. */
          const debutRail = haut + h * 0.10
          const finRail = haut + hh - h * 1.15
          rail.classList.toggle('on', y > debutRail && y < finRail)
          const p = borne((y - debutRail) / Math.max(1, finRail - debutRail), 0, 1)
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

    /* ── la boucle s'arrete quand l'univers est hors ecran ──
       Elle tournait en permanence, meme pendant qu'on lit la couverture ou
       le pied de page. A la SORTIE : cancelAnimationFrame. A l'ENTREE :
       resynchroniser le lissage AVANT de relancer — `vY`/`vT` datent de la
       mise en pause, et un grand dt combine a un grand deplacement
       fabriquerait un pic de vitesse fantome qui ferait passer un lecteur
       calme pour un lecteur presse. `derniereY = -1` force le bloc
       defilement (rail, jauge, page active) a se recomposer des la
       premiere frame de reprise. Le filet `verifierVisibles` ne perd
       rien : univers hors ecran, aucune page ne peut occuper la moitie
       de l'ecran ; et onglet occulte, le rAF etait deja gele. */
    let boucleActive = true
    const oeilBoucle = new IntersectionObserver((entrees) => {
      const visible = entrees[0].isIntersecting
      if (visible === boucleActive) return
      boucleActive = visible
      if (visible) {
        vY = window.scrollY
        vT = performance.now()
        derniereY = -1
        frame = requestAnimationFrame(boucle)
      } else {
        cancelAnimationFrame(frame)
      }
    })
    oeilBoucle.observe(hote)
    menage.push(() => oeilBoucle.disconnect())

    return () => {
      cancelAnimationFrame(frame)
      menage.forEach((f) => f())
      /* Un demontage pendant un defilement pilote laisserait le drapeau
         pose sur <html>, ce qui desactiverait le mode « lecteur presse »
         pour toujours, en silence. */
      delete document.documentElement.dataset.pilote
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
            <figure className="v v1" data-t="1900"><span className="ph"><img src="/images/univers/solution-upload-02.webp" alt="" width="480" height="640" loading="lazy" fetchPriority="low" decoding="async" /></span></figure>
            <figure className="v v2" data-t="2500">
              <span className="ph"><img src="/images/univers/grid-03.webp" alt="" width="600" height="800" loading="lazy" fetchPriority="low" decoding="async" /></span>
              <span className="v-video"><i></i><b>0:24</b></span>
            </figure>
            <figure className="v v3" data-t="3100">
              <span className="v-mot"><s></s><s></s><em>♥ 12</em></span>
            </figure>
            <figure className="v v4" data-t="3700"><span className="ph"><img src="/images/univers/solution-upload-05.webp" alt="" width="400" height="300" loading="lazy" fetchPriority="low" decoding="async" /></span></figure>
            <figure className="v v5" data-t="4300">
              <span className="v-story"><i></i><i></i><i></i></span>
              <span className="ph"><img src="/images/univers/solution-upload-09.webp" alt="" width="400" height="534" loading="lazy" fetchPriority="low" decoding="async" /></span>
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
            <p className="g" data-compte="12480">12 480</p>
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
            <span className="m m1" data-t="1400"><span className="dedans">immatériels,</span></span>
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
              {/* T-065 (31/08/2026) — le srcset colle a la taille PEINTE : les
                  figures font 15vw au-dela de 1000px, 38vw en dessous
                  (univers.css). Variantes -240/-360 par scripts/images-galerie.mjs ;
                  l'original 450 reste le plafond pour les iPhone 3x.
                  La seconde serie, aria-hidden, est la copie qui rend la bande
                  infinie : memes fichiers, donc aucun octet de plus. */}
              {[false, true].map((copie) =>
                ([
                  ['marrakech', 'Un magazine', 'Un numéro Bellajour consacré à un voyage à Marrakech'],
                  ['japon', 'Une BD', 'Un numéro Bellajour consacré à un voyage au Japon'],
                  ['patagonie', 'Une affiche', 'Un numéro Bellajour consacré à un voyage en Patagonie'],
                  ['lisbonne', 'Un album photos', 'Un numéro Bellajour consacré à un séjour à Lisbonne'],
                  ['santorin', 'Une série de pages', 'Un numéro Bellajour consacré à un séjour à Santorin'],
                ] as const).map(([fichier, legende, alt]) => (
                  <figure key={`${fichier}${copie ? '-copie' : ''}`} aria-hidden={copie || undefined}>
                    <span className="ph" data-legende={legende}>
                      <img
                        src={`/images/lancement/galerie/${fichier}.webp`}
                        srcSet={`/images/lancement/galerie/${fichier}-240.webp 240w, /images/lancement/galerie/${fichier}-360.webp 360w, /images/lancement/galerie/${fichier}.webp 450w`}
                        sizes="(max-width: 1000px) 38vw, 15vw"
                        alt={copie ? '' : alt}
                        width="450"
                        height="675"
                        loading="lazy"
                        decoding="async"
                      />
                    </span>
                  </figure>
                ))
              )}
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
              <span className="mot">{CTA_MAGAZINE_LABEL}</span>
              <span className="rond" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h13"/><path d="M11.5 6 17.5 12l-6 6"/></svg></span>
            </a>
            <p className="mention sl7-note" data-t="2200">Premier aperçu gratuit · Votre magazine sur-mesure dès <b>30 €</b>.</p>
          </div>
        </section>

      </main>
  )
}
