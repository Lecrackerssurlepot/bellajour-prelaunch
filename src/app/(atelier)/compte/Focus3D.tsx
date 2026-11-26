'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import angles from '../../../../brand/assets/3d/magazine/angles.json'
import type { Studio } from '../../../../brand/assets/3d/magazine/magazine.js'
import { FINITION_DEFAUT, dosMmPourPages } from '@/lib/atelier/impression'
import { PAGE_H, PAGE_L } from '@/lib/mise-en-page/geometrie'
import type { LivreVue } from './Espace'
import { Couverture } from './Etagere'

/* « Le numéro en grand » : le magazine 3D de la charte (brand/assets/3d),
   chargé à l'ouverture seulement. Sans WebGL, ou quand la couverture n'est
   connue que sous forme de planche entière (C4 · dos · C1), c'est la
   couverture à plat, légèrement inclinée, qui s'affiche. */

const PAGES_PAR_DEFAUT = 32

type Etat = 'attente' | 'pret' | 'secours'

export default function Focus3D({
  livre,
  position,
  lien,
  precedent,
  suivant,
  fermer,
}: {
  livre: LivreVue
  position: string
  lien: string | null
  precedent: (() => void) | null
  suivant: (() => void) | null
  fermer: () => void
}) {
  const toile = useRef<HTMLDivElement>(null)
  const boite = useRef<HTMLDivElement>(null)
  const [etat, setEtat] = useState<Etat>('attente')
  /* Les gestes du parent changent à chaque rendu : on lit toujours le dernier
     sans relancer l'écoute (sinon le focus sauterait à chaque numéro). */
  const gestes = useRef({ fermer, precedent, suivant })
  useEffect(() => {
    gestes.current = { fermer, precedent, suivant }
  })
  const en3D = Boolean(livre.couverture) && !livre.couvertureEstPlanche

  /* Échap ferme, les flèches changent de numéro ; le focus entre dans la
     boîte à l'ouverture et revient d'où il venait à la fermeture. */
  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null
    boite.current?.focus()
    const touche = (e: globalThis.KeyboardEvent) => {
      const g = gestes.current
      if (e.key === 'Escape') g.fermer()
      else if (e.key === 'ArrowRight' && g.suivant) g.suivant()
      else if (e.key === 'ArrowLeft' && g.precedent) g.precedent()
    }
    window.addEventListener('keydown', touche)
    const defile = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', touche)
      document.body.style.overflow = defile
      avant?.focus?.()
    }
  }, [])

  useEffect(() => {
    const el = toile.current
    if (!el || !en3D || !livre.couverture) {
      setEtat('secours')
      return
    }
    setEtat('attente')
    let annule = false
    let monte: Studio | null = null
    const pages = livre.nbPages ?? PAGES_PAR_DEFAUT
    void (async () => {
      try {
        const { creerStudio, webglDisponible } = await import('../../../../brand/assets/3d/magazine/magazine.js')
        if (annule) return
        if (!webglDisponible()) throw new Error('webgl')
        const leger = window.matchMedia('(pointer: coarse)').matches
        const calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        monte = creerStudio(el, {
          angles,
          angle: 'trois-quarts-droite',
          couverture: livre.couverture,
          largeurMm: PAGE_L,
          hauteurMm: PAGE_H,
          pages,
          finition: FINITION_DEFAUT,
          dosMm: dosMmPourPages(pages, FINITION_DEFAUT),
          fond: null,
          leger,
          interactif: true,
          rotationAuto: !calme,
        })
        monte.canvas.setAttribute('role', 'img')
        monte.canvas.setAttribute('aria-label', `${livre.titre}, en trois dimensions`)
        await monte.pret
        if (!annule) setEtat('pret')
      } catch {
        monte?.liberer()
        monte = null
        if (!annule) setEtat('secours')
      }
    })()
    return () => {
      annule = true
      monte?.liberer()
    }
  }, [en3D, livre.couverture, livre.nbPages, livre.titre])

  const meta = [livre.nbPages ? `${livre.nbPages} pages` : null, livre.livreLe ? `Livré le ${livre.livreLe}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="bib-focus" role="dialog" aria-modal="true" aria-label={livre.titre}>
      <button type="button" className="bib-focus-voile" aria-label="Fermer" tabIndex={-1} onClick={fermer} />
      <div className="bib-focus-boite" ref={boite} tabIndex={-1}>
        <button type="button" className="bib-focus-fermer m-texte" onClick={fermer}>
          Fermer
        </button>
        <div className={`bib-focus-scene est-${etat}`}>
          <div className="bib-focus-toile" ref={toile} aria-hidden={etat !== 'pret'} />
          {etat !== 'pret' ? (
            <span className="bib-focus-plat">
              <span className="bib-livre">
                <Couverture l={livre} taille="(max-width: 700px) 70vw, 360px" />
              </span>
            </span>
          ) : null}
        </div>
        <div className="bib-focus-texte">
          <span className="bib-focus-position">{position}</span>
          <h2 className="bib-focus-titre">{livre.titre}</h2>
          {meta ? <p className="bib-legende-meta">{meta}</p> : null}
          <div className="bib-focus-gestes">
            {lien ? (
              <Link className="m-btn" href={lien}>
                Ouvrir le numéro
              </Link>
            ) : (
              <span className="m-btn" aria-disabled="true">
                Ouvrir le numéro
              </span>
            )}
            <span className="bib-focus-nav">
              <button type="button" className="bib-fleche" onClick={precedent ?? undefined} disabled={!precedent} aria-label="Numéro précédent">
                ←
              </button>
              <button type="button" className="bib-fleche" onClick={suivant ?? undefined} disabled={!suivant} aria-label="Numéro suivant">
                →
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
