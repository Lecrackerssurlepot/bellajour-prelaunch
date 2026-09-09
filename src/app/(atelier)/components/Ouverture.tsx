'use client'

/* ════════════════════════════════════════════════════════════
   L'OUVERTURE — la couverture qui se pose, puis s'ouvre
   Trois états de DÉCOUPE, jamais un mouvement de l'image : le pli médian,
   le rectangle du bandeau, puis l'écran entier. On découpe au lieu de
   redimensionner, donc le cadrage ne bouge pas d'un pixel et rien ne se
   déforme. La pause d'une seconde entre les deux derniers états EST le
   geste : sans elle, l'œil ne voit qu'une seule animation confuse.

   Les classes d'état (`pret`, `plein`) vivent sur le conteneur .at-accueil
   et pas ici, parce que la feuille de style les y attend et que l'univers,
   plus bas, est dans le même scope. On les pose donc à la main sur
   l'ancêtre — page.tsx reste un composant serveur, ce qui garde les
   métadonnées et le JSON-LD côté rendu.
   ════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from 'react'
import './ouverture.css'

const PLI = 120, FONDU = 1700, BATTEMENT = 1000

/* ── LA COUVERTURE NE S'OUVRE QU'UNE FOIS PAR VISITE ──────────────────
   `sessionStorage`, donc l'onglet : quelqu'un qui va voir /magazine puis
   revient retrouve la page déjà ouverte, sans les trois secondes de
   chorégraphie ni le travail de composition qui va avec — sur un téléphone
   modeste, c'est ce rejeu qui saccade. Le lendemain, nouvel onglet, nouvelle
   visite : la couverture s'ouvre à nouveau, ce qu'on veut.

   Le drapeau est LU par le script en ligne de page.tsx, AVANT la première
   peinture, et il pose `data-ouverture-vue` sur <html> — c'est la seule
   façon de ne pas voir la couverture repliée le temps que React monte.
   ouverture.css lit cet attribut et sert l'état final, sans transition. */
const CLE_VUE = 'bj:ouverture-vue'
const MARQUE_VUE = 'data-ouverture-vue'

/* Au delà de ce défilement, la personne a pris la main : elle ne regarde
   plus la couverture, elle veut la suite. On termine l'ouverture SEC, sans
   transition, plutôt que de la laisser jouer sous elle — c'est ce
   chevauchement qui se voyait comme un bug. Un quart d'écran, parce qu'en
   dessous la couverture est encore largement à l'image. */
const PRISE_EN_MAIN = 0.25

export default function Ouverture() {
  const cadre = useRef<HTMLElement>(null)

  /* Signe au chien de garde du layout racine que le code client tourne.
     Sans cette signature, `data-anim` serait retire au bout de 5 s et la
     page s'afficherait d'un coup, sans animation (T-050). */
  useEffect(() => {
    document.documentElement.setAttribute('data-anim-ok', '')
  }, [])

  useEffect(() => {
    const cadreEl = cadre.current
    const accueil = cadreEl?.closest('.at-accueil') as HTMLElement | null
    if (!cadreEl || !accueil) return

    const doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const couv = cadreEl.querySelector<HTMLElement>('.h-plein')
    const bande = cadreEl.querySelector<HTMLElement>('.h-bandeau')
    const image = cadreEl.querySelector<HTMLElement>('.h-plein > img')
    const l1 = cadreEl.querySelector<HTMLElement>('.h-titre .l1')
    const l2 = cadreEl.querySelector<HTMLElement>('.h-titre .l2')
    let ouvert = false
    let frame = 0
    let minuteur = 0
    /* Déclaré ici, et pas plus bas avec la boucle : `ouvrirEnGrand` le remet
       à -1 pour forcer la recomposition du parallaxe (voir là-bas). */
    let derniereY = -1
    const nettoyage: Array<() => void> = []
    const racineHtml = document.documentElement
    /* Déjà vue dans cette visite ? Le script en ligne de page.tsx a posé
       l'attribut avant la première peinture ; on ne fait que le relire. */
    /* ⚠️ LES DEUX SOURCES, ET IL FAUT LES DEUX (09/09/2026, liens internes).
       L'attribut sur <html> est posé par le script en ligne de page.tsx, qui
       ne tourne qu'au CHARGEMENT D'UN DOCUMENT. Depuis que la barre navigue
       côté client (`<Link>`), revenir de /magazine à l'accueil ne recharge
       plus rien : le script ne rejoue pas, l'attribut n'est pas là, et la
       couverture recommençait ses trois secondes de chorégraphie — très
       exactement ce que ce drapeau existe pour empêcher.
       Le composant lit donc aussi le stockage, qui est la source de vérité :
       l'attribut n'est que le raccourci qui évite de voir la couverture
       repliée avant que React monte. */
    const dejaVue =
      racineHtml.hasAttribute(MARQUE_VUE) ||
      (() => {
        try {
          return sessionStorage.getItem(CLE_VUE) === '1'
        } catch {
          return false /* mode privé : elle rejouera, c'est le comportement d'avant */
        }
      })()

    const decoupe = (replie: boolean) => {
      if (!couv || !bande) return null
      const h = cadreEl.getBoundingClientRect()
      const b = bande.getBoundingClientRect()
      const haut = b.top - h.top, gauche = b.left - h.left
      const droite = h.width - (b.right - h.left)
      const bas = h.height - (b.bottom - h.top)
      if (replie) {
        const milieu = haut + b.height / 2
        return `inset(${milieu}px ${droite}px ${h.height - milieu}px ${gauche}px)`
      }
      return `inset(${haut}px ${droite}px ${bas}px ${gauche}px)`
    }

    const poser = (replie: boolean) => {
      if (!couv || ouvert) return
      const c = decoupe(replie)
      if (c) couv.style.clipPath = c
    }

    /* `sec` : on saute à l'état final sans jouer le mouvement. Deux cas —
       le retour sur la page (elle a déjà vu), et la prise en main au doigt
       (elle ne regarde plus). L'attribut sur <html> est ce que la feuille de
       style lit pour couper les transitions de l'ouverture ; le poser ICI
       fait le même effet en cours de route qu'au premier rendu. */
    const ouvrirEnGrand = (sec = false) => {
      if (!couv || ouvert) return
      ouvert = true
      if (sec) racineHtml.setAttribute(MARQUE_VUE, '')
      accueil.classList.add('plein')
      couv.style.clipPath = 'inset(0px)'
      clearTimeout(minuteur)
      /* La dérive de l'image ne se calcule que couverture ouverte (plus bas).
         Sans ce rappel, quelqu'un qui a défilé pendant l'ouverture gardait
         une image figée à sa position de départ jusqu'au défilement suivant,
         qui la faisait alors SAUTER. */
      derniereY = -1
      try { sessionStorage.setItem(CLE_VUE, '1') } catch { /* mode privé : tant pis, elle rejouera */ }
    }

    const ouvrir = () => {
      if (accueil.classList.contains('pret')) return
      accueil.classList.add('pret')
      if (doux || dejaVue) { ouvrirEnGrand(dejaVue); return }
      poser(false)
      minuteur = window.setTimeout(ouvrirEnGrand, PLI + FONDU + BATTEMENT)
    }

    if (!doux && !dejaVue) poser(true)           /* le pli, avant toute peinture */

    /* ⚠️ LA LARGEUR SEULE COMPTE. Sur téléphone, la barre d'adresse se
       rétracte dès qu'on descend : `resize` part alors qu'aucune mise en
       page n'a bougé, et recalculer la découpe au milieu de son ouverture
       la faisait sursauter. Même règle que `--app-height` (globals.css,
       src/app/CLAUDE.md) : on ne remesure qu'au changement de largeur. */
    let largeur = window.innerWidth
    const surRedimension = () => {
      if (window.innerWidth === largeur) return
      largeur = window.innerWidth
      poser(false)
    }
    addEventListener('resize', surRedimension, { passive: true })

    /* On attend les polices pour que rien ne saute, avec un filet à 500 ms :
       le noir de l'ouverture ne doit jamais durer plus d'une demi seconde. */
    const filet = window.setTimeout(ouvrir, 500)
    document.fonts?.ready.then(() => requestAnimationFrame(ouvrir))

    /* Une seule boucle pour tout le continu (règle maison) : la dérive de
       l'image, l'écartement des deux lignes du titre, et le voile de la
       barre de tête. Aucune écoute brute de l'événement scroll. */
    const boucle = () => {
      const y = window.scrollY
      /* ── elle a pris la main ───────────────────────────────────────
         Le doigt qui descend pendant que la couverture s'ouvre, c'est deux
         mouvements qui se marchent dessus : la découpe s'élargit, le titre
         change de régime et le voile se pose, le tout sous une page qui
         défile. On arrête le film au lieu de le jouer dans son dos. */
      if (!ouvert && y > window.innerHeight * PRISE_EN_MAIN) ouvrirEnGrand(true)
      if (y !== derniereY) {
        derniereY = y
        const h = window.innerHeight
        if (!doux) {
          const p = Math.min(Math.max(y / h, 0), 1)
          /* tant que la couverture n'est pas ouverte, l'image ne dérive
             pas : elle est encore en train de se poser. */
          if (image && ouvert) {
            image.style.transform =
              `translate3d(0, ${(-p * 6).toFixed(2)}vh, 0) scale(${(1 + p * 0.05).toFixed(4)})`
          }
          if (l1) l1.style.transform = `translate3d(0, ${(-p * 3.4).toFixed(2)}vh, 0)`
          if (l2) l2.style.transform = `translate3d(0, ${(p * 2).toFixed(2)}vh, 0)`
        }
      }
      frame = requestAnimationFrame(boucle)
    }
    frame = requestAnimationFrame(boucle)

    /* ── la boucle s'arrete quand la couverture est hors ecran ──
       Elle tournait en permanence, y compris pendant la lecture des sept
       pages de l'univers, pour surveiller un parallaxe qu'on ne voit plus.
       A la sortie : cancelAnimationFrame. A l'entree : `derniereY = -1`
       force la recomposition des trois transformations a la premiere frame
       — sans risque de saut, `p` etant borne a 1 des qu'on a depasse un
       ecran, l'etat fige est deja l'etat juste. Pas de vitesse a
       resynchroniser ici : cette boucle ne mesure rien dans le temps. */
    let boucleActive = true
    const oeilBoucle = new IntersectionObserver((entrees) => {
      const visible = entrees[0].isIntersecting
      if (visible === boucleActive) return
      boucleActive = visible
      if (visible) {
        derniereY = -1
        frame = requestAnimationFrame(boucle)
      } else {
        cancelAnimationFrame(frame)
      }
    })
    oeilBoucle.observe(cadreEl)
    nettoyage.push(() => oeilBoucle.disconnect())

    /* ── le curseur qui légende (desktop seul, PRD §15 mouvement nº6) ──
       C'est lui qui porte le nom des visuels depuis qu'ils n'ont plus de
       légende écrite : une légende qui défile sous une affiche en
       mouvement ne se lit pas, elle fait du bruit. */
    const curseur = accueil.querySelector<HTMLElement>('.curseur')
    const precis = window.matchMedia('(min-width:1024px) and (hover:hover) and (pointer:fine)').matches
    if (curseur && precis && !doux) {
      const bulle = curseur.querySelector('b')!
      let dedans = false
      const suivre = (e: PointerEvent) => {
        curseur.style.transform =
          `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
        if (!dedans) { curseur.classList.add('on'); dedans = true }
      }
      const sortir = () => { curseur.classList.remove('on'); dedans = false }
      addEventListener('pointermove', suivre, { passive: true })
      addEventListener('pointerleave', sortir)
      nettoyage.push(() => {
        removeEventListener('pointermove', suivre)
        removeEventListener('pointerleave', sortir)
      })
      accueil.querySelectorAll<HTMLElement>('[data-legende]').forEach((el) => {
        const entre = () => {
          bulle.textContent = el.dataset.legende!
          curseur.classList.add('legende')
        }
        const quitte = () => curseur.classList.remove('legende')
        el.addEventListener('pointerenter', entre)
        el.addEventListener('pointerleave', quitte)
        nettoyage.push(() => {
          el.removeEventListener('pointerenter', entre)
          el.removeEventListener('pointerleave', quitte)
        })
      })
    }

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(filet)
      clearTimeout(minuteur)
      removeEventListener('resize', surRedimension)
      nettoyage.forEach((f) => f())
      /* meme raison que dans Univers.tsx : un drapeau oublie desactiverait
         le mode « lecteur presse » en silence. */
      delete document.documentElement.dataset.pilote
    }
  }, [])

  /* « Découvrir l'univers Bellajour » : la page qui se tourne.
     Au CLIC seulement, jamais à la molette. Le hero recule pendant que la
     première page de l'univers monte le prendre. */
  const descendre = () => {
    const cible = document.getElementById('u1')
    const hero = cadre.current
    if (!cible || !hero) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cible.scrollIntoView({ behavior: 'auto', block: 'start' })
      return
    }
    const depart = window.scrollY
    const d = cible.getBoundingClientRect().top
    if (Math.abs(d) < 4) return
    const duree = 1300, t0 = performance.now()
    const racine = document.documentElement
    const memoire = racine.style.scrollBehavior
    racine.style.scrollBehavior = 'auto'
    /* ⚠️ ON REND LA MAIN AU PREMIER GESTE. Cette descente écrit la position
       de la page à chaque image pendant 1,3 s : un doigt qui défile
       pendant ce temps se fait reposer où l'animation en est, soixante fois
       par seconde. La page semble alors collée, puis repart d'un coup — le
       « bug au scroll » le plus reproductible de l'accueil. Un geste
       quelconque termine donc la descente sur place. */
    let rendu = false
    const rendreLaMain = () => { rendu = true }
    const gestes: Array<keyof WindowEventMap> = ['wheel', 'touchstart', 'keydown', 'pointerdown']
    /* ⚠️ ARMÉ À LA PREMIÈRE IMAGE, jamais tout de suite. Ce geste part
       parfois d'un `keydown` (Entrée sur le bouton) qui n'a pas fini de
       remonter jusqu'à window : une écoute posée maintenant s'entendrait
       elle-même et annulerait la descente avant son premier pixel. */
    let armes = false
    const armer = () => {
      if (armes) return
      armes = true
      gestes.forEach((g) => addEventListener(g, rendreLaMain, { passive: true }))
    }
    const relacher = () => {
      gestes.forEach((g) => removeEventListener(g, rendreLaMain))
      hero.style.transform = ''
      hero.style.opacity = ''
      racine.style.scrollBehavior = memoire
      delete racine.dataset.pilote
    }
    /* ⚠️ On se declare DEFILEMENT PILOTE le temps du geste. Le sequenceur
       de l'univers compose une page d'emblee, sans sa choregraphie, quand
       il voit descendre a plus de 900 px/s — pour qu'un lecteur presse ne
       traverse pas des ecrans vides. Or cette descente-ci depasse ce seuil
       en debut de course : sans ce drapeau, quelqu'un qui CLIQUE sur
       « Decouvrir l'univers » perdrait l'entree de la page 01, celle qu'il
       vient precisement de demander. Le drapeau vit sur <html> parce que
       le sequenceur est dans un autre composant (Univers.tsx). */
    racine.dataset.pilote = '1'
    const pas = (t: number) => {
      if (rendu) { relacher(); return }
      armer()
      const p = Math.min(Math.max((t - t0) / duree, 0), 1)
      const e = 1 - Math.pow(1 - p, 4)
      window.scrollTo({ top: depart + d * e, behavior: 'instant' as ScrollBehavior })
      hero.style.transform = `translate3d(0, ${(-e * 8).toFixed(2)}vh, 0)`
      hero.style.opacity = String(1 - e * 0.8)
      if (p < 1) requestAnimationFrame(pas)
      else relacher()
    }
    requestAnimationFrame(pas)
  }

  return (
<header className="hero" id="ouverture" ref={cadre}>

        {/* L'image vit EN PLEINE COUCHE derriere l'ouverture, decoupee au
             rectangle du bandeau. C'est la decoupe qui s'ouvre, jamais l'image
             qui bouge : aucune deformation, et la meme photographie sert le
             bandeau puis le plein ecran. */}
        <div className="h-plein" aria-hidden="true">
          {/* ⚠️ Le srcset DOIT rester identique a celui du <link rel="preload">
               de page.tsx (imagesrcset/imagesizes) : s'ils divergent, le
               navigateur precharge un fichier et en affiche un autre — double
               telechargement de l'element LCP. Variantes : scripts, sharp
               q85, memes reglages que optimize-images.mjs. */}
          <img
            src="/images/brand/brand-01.webp"
            srcSet="/images/brand/brand-01-640.webp 640w, /images/brand/brand-01-960.webp 960w, /images/brand/brand-01.webp 1200w"
            sizes="100vw"
            alt="" width="1200" height="1600" fetchPriority="high" decoding="async" />
          <div className="h-grad"></div>
          <div className="h-rake"></div>
          <div className="h-voile"></div>
        </div>

        {/* TROIS LIGNES, et le decoupage n'est pas un gout : c'est lui qui
            fixe la taille possible. La ligne la plus longue borne le corps,
            puisqu'aucune ne doit se renvoyer. MESURE le 31/08/2026 (rapport
            largeur/corps, police reelle) :
              « Vos meilleurs moments »   8,73  ← l'ancienne ligne 1
              « moments meritent »        7,01  ← la plus longue des trois
            Casser « Vos meilleurs moments » rend donc 25 % de corps. Les
            decoupages qui la gardent entiere n'en rendent aucun : garder la
            phrase en 21/13/8 laisse le plafond ou il etait.
            Le point final est retire — il ne servait rien et, contrairement a
            ce qu'on pourrait croire, il ne rendait pas un pixel : il vivait
            sur la ligne 2, qui n'a jamais ete la ligne qui borne (8,57
            contre 8,73).
            ⚠️ Toute retouche de ce texte change les trois nombres, donc la
            taille : elle se remesure, elle ne s'estime pas (ouverture.css). */}
        <h1 className="h-titre">
          <span className="ligne l1"><span className="in">Vos meilleurs</span></span>
          <span className="h-bandeau" aria-hidden="true"></span>
          <span className="ligne l2"><span className="in">moments méritent</span></span>
          <span className="ligne l3"><span className="in">leur <em>magazine</em></span></span>
        </h1>

        <div className="h-bas">
          <div className="h-gauche">
            <p className="h-amorce">Ce festival, cette soirée, ce road trip…</p>
            <p className="corps h-lede">Chaque moment qui vous touche. Vous envoyez vos photos, l’atelier compose le magazine de cet instant de vie.</p>
            <p className="mention h-note">Premier aperçu gratuit · Votre magazine sur-mesure dès <b>30 €</b>.</p>
          </div>
          <div className="h-droite">
            <button className="acte acte--seul descente" type="button" onClick={descendre}>
              <span className="mot">Découvrir l’univers Bellajour</span>
              <span className="rond" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v13"/><path d="M6 11.5 12 17.5l6-6"/></svg>
              </span>
              <span className="fil"><i></i></span>
            </button>
          </div>
        </div>
      </header>
  )
}
