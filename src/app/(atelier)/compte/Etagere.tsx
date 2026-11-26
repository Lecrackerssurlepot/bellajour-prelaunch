'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import type { LivreVue } from './Espace'
import Focus3D from './Focus3D'
import { rendreNumero } from './rendu3d'

/* ═══════════════════════════════════════════════════════════════════
   L'étagère de la bibliothèque (charte V2, fiche H « Bibliothèque »,
   proposé le 26/11/2026). Deux vues d'un même rayon :
   - « Étagère » : les numéros posés de face sur des tablettes, comme des
     magazines sur un présentoir mural ; au survol, le numéro se décolle.
   - « Défilé » : un numéro au centre, les autres en arc de part et d'autre,
     au doigt, au clavier, aux flèches.
   (La vue « Tranches » est retirée le 26/11 : à l'épaisseur réelle d'un
   magazine, le dos est trop fin pour porter un visuel. Archivée dans
   archive/compte-etagere-2026-11/vue-tranches.md.)
   Un clic ouvre « le numéro en grand » (Focus3D) : le magazine 3D de la
   charte quand le navigateur le permet, sa couverture sinon.
   Dans les deux vues, chaque numéro est une image du même magazine 3D
   (rendu3d.ts : un seul studio hors écran, angle « trois-quarts-droite »,
   épaisseur selon le nombre de pages). Le temps du rendu, et sans WebGL,
   c'est la couverture à plat.
   Rien n'est refetché : tout arrive déjà signé de la page serveur.
   ═══════════════════════════════════════════════════════════════════ */

export type VueEtagere = 'etagere' | 'defile'

const VUES: ReadonlyArray<[VueEtagere, string]> = [
  ['etagere', 'Étagère'],
  ['defile', 'Défilé'],
]

const CLE_VUE = 'bj-compte-vue'

export function Couverture({ l, taille }: { l: LivreVue; taille?: string }) {
  return (
    <span className="bib-couv">
      {l.couverture ? (
        <img
          className={`bib-couv-img${l.couvertureEstPlanche ? ' est-planche' : ''}`}
          src={l.couverture}
          alt={`Couverture de ${l.titre}`}
          loading="lazy"
          decoding="async"
          sizes={taille}
        />
      ) : (
        <span className="bib-couv-vide" aria-hidden="true">
          {l.titre}
        </span>
      )}
    </span>
  )
}

/* Le numéro posé : sa couverture à plat, puis son image en volume dès qu'elle existe. */
function Livre({ l, taille, rendu }: { l: LivreVue; taille: string; rendu: string | undefined }) {
  return (
    <span className={`bib-livre${rendu ? ' est-3d' : ''}`}>
      <Couverture l={l} taille={taille} />
      {rendu ? <img className="bib-rendu" src={rendu} alt="" aria-hidden="true" decoding="async" draggable={false} /> : null}
    </span>
  )
}

const sAbonner = () => () => {}

function lireVue(): VueEtagere | null {
  try {
    const v = window.localStorage.getItem(CLE_VUE)
    return v === 'etagere' || v === 'defile' ? v : null
  } catch {
    return null
  }
}

export default function Etagere({ livres, demo = false }: { livres: LivreVue[]; demo?: boolean }) {
  /* La vue choisie reste d'une visite à l'autre, sur cet appareil seulement :
     lue après l'hydratation (le serveur ne la connaît pas). */
  const memorisee = useSyncExternalStore(sAbonner, lireVue, () => null)
  const [choix, setChoix] = useState<VueEtagere | null>(null)
  const vue: VueEtagere = choix ?? memorisee ?? 'etagere'
  const [centre, setCentre] = useState(0)
  const [ouvert, setOuvert] = useState<number | null>(null)
  const [parRang, setParRang] = useState(4)
  const rayon = useRef<HTMLDivElement>(null)
  const racine = useRef<HTMLDivElement>(null)
  const [rendus, setRendus] = useState<Record<string, string>>({})
  const glisse = useRef<{ x: number; id: number } | null>(null)

  const choisirVue = (v: VueEtagere) => {
    setChoix(v)
    try {
      window.localStorage.setItem(CLE_VUE, v)
    } catch {
      /* stockage refusé : la vue vaut pour cette visite */
    }
  }

  /* Combien de numéros tiennent sur une tablette : la largeur du rayon
     divisée par celle d'un numéro (fixée en CSS, lue ici). */
  useEffect(() => {
    const el = rayon.current
    if (!el || vue !== 'etagere') return
    const mesurer = () => {
      const styles = getComputedStyle(el)
      const largeurLivre = parseFloat(styles.getPropertyValue('--bib-livre')) || 180
      const ecart = parseFloat(styles.getPropertyValue('--bib-ecart')) || 32
      setParRang(Math.max(2, Math.floor((el.clientWidth + ecart) / (largeurLivre + ecart))))
    }
    mesurer()
    const obs = new ResizeObserver(mesurer)
    obs.observe(el)
    return () => obs.disconnect()
  }, [vue])

  /* Les numéros en volume : demandés quand la bibliothèque approche de
     l'écran (Three.js ne se charge qu'à ce moment), posés un par un. */
  useEffect(() => {
    const el = racine.current
    if (!el) return
    let annule = false
    const veille = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return
        veille.disconnect()
        for (const l of livres) {
          if (!l.couverture || l.couvertureEstPlanche) continue
          void rendreNumero(l.couverture, l.nbPages).then((src) => {
            if (src && !annule) setRendus((r) => (r[l.token] === src ? r : { ...r, [l.token]: src }))
          })
        }
      },
      { rootMargin: '300px 0px' },
    )
    veille.observe(el)
    return () => {
      annule = true
      veille.disconnect()
    }
  }, [livres])

  const aller = useCallback(
    (pas: number) => setCentre((c) => Math.min(livres.length - 1, Math.max(0, c + pas))),
    [livres.length],
  )

  const toucheDefile = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      aller(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      aller(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      setOuvert(centre)
    }
  }

  const debutGlisse = (e: PointerEvent<HTMLDivElement>) => {
    glisse.current = { x: e.clientX, id: e.pointerId }
  }
  const finGlisse = (e: PointerEvent<HTMLDivElement>) => {
    const g = glisse.current
    glisse.current = null
    if (!g || g.id !== e.pointerId) return
    const dx = e.clientX - g.x
    if (Math.abs(dx) > 40) aller(dx < 0 ? 1 : -1)
  }

  const rangs: LivreVue[][] = []
  for (let i = 0; i < livres.length; i += parRang) rangs.push(livres.slice(i, i + parRang))

  return (
    <div className="bib" ref={racine}>
      <div className="bib-vues" role="group" aria-label="Affichage">
        {VUES.map(([v, libelle]) => (
          <button
            key={v}
            type="button"
            className={`bib-vue${vue === v ? ' est-active' : ''}`}
            aria-pressed={vue === v}
            onClick={() => choisirVue(v)}
          >
            {libelle}
          </button>
        ))}
      </div>

      {vue === 'etagere' ? (
        <div className="bib-rayon" ref={rayon}>
          {rangs.map((rang, r) => (
            <div className="bib-tablette" key={r}>
              {rang.map((l, i) => {
                const index = r * parRang + i
                return (
                  <button
                    key={l.token}
                    type="button"
                    className="bib-pose"
                    style={{ '--i': i } as CSSProperties}
                    onClick={() => setOuvert(index)}
                    aria-label={`${l.titre}, ouvrir en grand`}
                  >
                    <Livre l={l} taille="(max-width: 700px) 42vw, 200px" rendu={rendus[l.token]} />
                    <span className="bib-legende">
                      <span className="bib-legende-titre">{l.titre}</span>
                      <span className="bib-legende-meta">{l.annee}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ) : null}

      {vue === 'defile' ? (
        <div className="bib-defile">
          <div
            className="bib-scene"
            tabIndex={0}
            role="listbox"
            aria-label="Vos numéros, flèches gauche et droite"
            aria-activedescendant={`bib-d-${centre}`}
            onKeyDown={toucheDefile}
            onPointerDown={debutGlisse}
            onPointerUp={finGlisse}
            onPointerCancel={() => (glisse.current = null)}
          >
            {livres.map((l, i) => {
              const d = i - centre
              const loin = Math.abs(d) > 3
              return (
                <div
                  key={l.token}
                  id={`bib-d-${i}`}
                  role="option"
                  aria-selected={d === 0}
                  className={`bib-carte${d === 0 ? ' est-centre' : ''}`}
                  style={{ '--d': d, '--ad': Math.abs(d) } as CSSProperties}
                  aria-hidden={loin}
                  onClick={() => (d === 0 ? setOuvert(i) : setCentre(i))}
                >
                  <Livre l={l} taille="(max-width: 700px) 60vw, 320px" rendu={rendus[l.token]} />
                </div>
              )
            })}
          </div>
          <div className="bib-defile-pied">
            <button type="button" className="bib-fleche" onClick={() => aller(-1)} disabled={centre === 0} aria-label="Numéro précédent">
              ←
            </button>
            <div className="bib-defile-texte" aria-live="polite">
              <span className="bib-defile-titre">{livres[centre]?.titre}</span>
              <span className="bib-legende-meta">
                {[livres[centre]?.nbPages ? `${livres[centre].nbPages} pages` : null, livres[centre]?.livreLe]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <button
              type="button"
              className="bib-fleche"
              onClick={() => aller(1)}
              disabled={centre === livres.length - 1}
              aria-label="Numéro suivant"
            >
              →
            </button>
          </div>
        </div>
      ) : null}

      {ouvert !== null && livres[ouvert] ? (
        <Focus3D
          livre={livres[ouvert]}
          position={`${ouvert + 1} / ${livres.length}`}
          lien={demo ? null : `/compte/magazine/${livres[ouvert].token}`}
          precedent={ouvert > 0 ? () => setOuvert(ouvert - 1) : null}
          suivant={ouvert < livres.length - 1 ? () => setOuvert(ouvert + 1) : null}
          fermer={() => setOuvert(null)}
        />
      ) : null}
    </div>
  )
}

/* Le lien du rayon vers la page d'un numéro, réutilisé par la vue Atelier. */
export function LienNumero({ href, demo, className, children }: { href: string; demo: boolean; className: string; children: React.ReactNode }) {
  if (demo) {
    return (
      <span className={className} aria-disabled="true">
        {children}
      </span>
    )
  }
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  )
}
