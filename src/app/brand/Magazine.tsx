'use client'

import { useEffect, useRef, useState } from 'react'
import angles from '../../../brand/assets/3d/magazine/angles.json'
import type { Studio } from '../../../brand/assets/3d/magazine/magazine.js'
import fixeFace from '../../../brand/assets/3d/magazine/exports/demo/face-1024.webp'
import fixeGauche from '../../../brand/assets/3d/magazine/exports/demo/trois-quarts-gauche-1024.webp'
import fixeDroite from '../../../brand/assets/3d/magazine/exports/demo/trois-quarts-droite-1024.webp'
import fixeDos from '../../../brand/assets/3d/magazine/exports/demo/dos-1024.webp'
import fixeOuvert from '../../../brand/assets/3d/magazine/exports/demo/ouvert-1024.webp'
import fixePlat from '../../../brand/assets/3d/magazine/exports/demo/pose-a-plat-1024.webp'
import { requeteTelephone } from '../../../brand/build/tokens'
import { PAGES_MAX_PUBLIC, PAGES_MIN } from '@/lib/atelier/grille'
import { FINITION_DEFAUT, dosMmPourPages, type Finition } from '@/lib/atelier/impression'
import { PAGE_H, PAGE_L } from '@/lib/mise-en-page/geometrie'

/* Le magazine 3D de la charte (brand/assets/3d/magazine). Three.js et le modèle
   ne se chargent que lorsque la section approche de l'écran. Avant, et sans
   WebGL, c'est l'image fixe du même angle qui s'affiche.
   Les mesures viennent du code du site : format (geometrie.ts), dos
   (impression.ts), pages (grille.ts). Aucune n'est affichée. */

const COUVERTURE = '/images/v2/accueil/couverture-rio-1050.webp'
const DOUBLE_PAGE = '/images/v2/magazine/double-page-australie-1400.webp'
const PAGES_DEPART = 32

const FIXES: Record<string, { src: string }> = {
  face: fixeFace,
  'trois-quarts-gauche': fixeGauche,
  'trois-quarts-droite': fixeDroite,
  dos: fixeDos,
  ouvert: fixeOuvert,
  'pose-a-plat': fixePlat,
}

const FINITIONS: ReadonlyArray<[Finition, string]> = [
  ['gloss', 'Brillant'],
  ['matte', 'Mat'],
]

type Etat = 'attente' | 'pret' | 'secours'

export default function Magazine() {
  const toile = useRef<HTMLDivElement>(null)
  const studio = useRef<Studio | null>(null)
  const angleVoulu = useRef<string>(angles.defaut)
  const [etat, setEtat] = useState<Etat>('attente')
  const [angle, setAngle] = useState<string>(angles.defaut)
  const [finition, setFinition] = useState<Finition>(FINITION_DEFAUT)
  const [pages, setPages] = useState(PAGES_DEPART)

  useEffect(() => {
    const boite = toile.current
    if (!boite) return
    let annule = false
    let monte: Studio | null = null

    const monter = async () => {
      try {
        const { creerStudio } = await import('../../../brand/assets/3d/magazine/magazine.js')
        if (annule) return
        const leger = window.matchMedia(requeteTelephone).matches || window.matchMedia('(pointer: coarse)').matches
        monte = creerStudio(boite, {
          angles,
          angle: angleVoulu.current,
          couverture: COUVERTURE,
          doublePage: DOUBLE_PAGE,
          largeurMm: PAGE_L,
          hauteurMm: PAGE_H,
          pages: PAGES_DEPART,
          finition: FINITION_DEFAUT,
          dosMm: dosMmPourPages(PAGES_DEPART, FINITION_DEFAUT),
          leger,
          interactif: true,
          rotationAuto: true,
        })
        monte.canvas.setAttribute('role', 'img')
        monte.canvas.setAttribute('aria-label', 'Le magazine en trois dimensions')
        monte.canvas.tabIndex = 0
        studio.current = monte
        await monte.pret
        if (!annule) setEtat('pret')
      } catch {
        /* Pas de WebGL, ou une image qui ne charge pas : l'image fixe reste. */
        monte?.liberer()
        monte = null
        studio.current = null
        if (!annule) setEtat('secours')
      }
    }

    const veille = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return
        veille.disconnect()
        void monter()
      },
      { rootMargin: '300px 0px' },
    )
    veille.observe(boite)

    return () => {
      annule = true
      veille.disconnect()
      monte?.liberer()
      studio.current = null
    }
  }, [])

  const choisirAngle = (nom: string) => {
    angleVoulu.current = nom
    setAngle(nom)
    studio.current?.allerA(nom)
  }
  const regler = (p: number, f: Finition) => {
    setPages(p)
    setFinition(f)
    void studio.current?.regler({ pages: p, finition: f, dosMm: dosMmPourPages(p, f) })
  }

  const fixe = FIXES[angle] ?? FIXES[angles.defaut]
  const pret = etat === 'pret'

  return (
    <div className="ch-mag">
      <div className="ch-mag-scene">
        <div className="ch-mag-toile" ref={toile} />
        {pret ? null : (
          <img className="ch-mag-fixe" src={fixe.src} alt={`Le magazine, ${angles.angles[angle as keyof typeof angles.angles]?.libelle.toLowerCase() ?? 'vue fixe'}`} loading="lazy" decoding="async" />
        )}
      </div>

      <div className="ch-mag-reglages">
        <div className="ch-mag-groupe" role="group" aria-labelledby="ch-mag-angle">
          <p className="ch-etiquette" id="ch-mag-angle">Angle</p>
          <div className="ch-pile">
            {angles.ordre.map((nom) => (
              <button
                key={nom}
                type="button"
                className={nom === angle ? 'm-btn' : 'm-second'}
                aria-pressed={nom === angle}
                onClick={() => choisirAngle(nom)}
              >
                {angles.angles[nom as keyof typeof angles.angles].libelle}
              </button>
            ))}
          </div>
        </div>

        <div className="ch-mag-groupe" role="group" aria-labelledby="ch-mag-finition">
          <p className="ch-etiquette" id="ch-mag-finition">Finition</p>
          <div className="ch-pile">
            {FINITIONS.map(([f, libelle]) => (
              <button
                key={f}
                type="button"
                className={f === finition ? 'm-btn' : 'm-second'}
                aria-pressed={f === finition}
                disabled={!pret}
                onClick={() => regler(pages, f)}
              >
                {libelle}
              </button>
            ))}
          </div>
        </div>

        <label className="ch-mag-groupe ch-mag-pages">
          <span className="ch-etiquette">Pages</span>
          <input
            type="range"
            min={PAGES_MIN}
            max={PAGES_MAX_PUBLIC}
            step={2}
            value={pages}
            disabled={!pret}
            onChange={(e) => regler(Number(e.target.value), finition)}
          />
          <output>{pages} pages</output>
        </label>

        {etat === 'secours' ? <span className="m-pastille">Image fixe</span> : <p className="ch-note">Glissez pour tourner.</p>}
      </div>
    </div>
  )
}
