'use client'

/**
 * La maquette de l'état 2, sur la page de la cliente — une VISIONNEUSE façon
 * magazine (T-089, refonte du 02/09).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LES PAGES AU CŒUR, TEXTE ET SCROLL AU MINIMUM
 *
 * On ne montre plus des rectangles empilés : une seule scène, une page à la
 * fois, immense, qu'on feuillette (glissé au doigt, flèches, points). L'impact,
 * c'est le visuel — le reste du parcours (les deux cases, le paiement) reste en
 * dessous, inchangé.
 *
 * DEUX FORMATS, UNE SEULE PLANCHE. Le format normal est la couverture À PLAT :
 * un seul fichier C4 | dos | C1, l'export naturel de Canva. On ne le retouche
 * jamais côté serveur : la vue « La couverture » CADRE la moitié droite,
 * « La quatrième » la moitié gauche (object-position), et « La couverture à
 * plat » montre l'objet entier. Les dossiers publiés avant ce format portent
 * trois fichiers séparés (c1, c4) et se lisent comme des couvertures pleines.
 *
 * 1 À 3 DOUBLES PAGES (MAX_DOUBLES) : l'atelier décide combien il en montre.
 *
 * La légende est TOUJOURS nommée (recette du 25/08) ; la loupe agrandit chaque
 * vue unique, en réutilisant le même composant partagé avec l'admin.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { useRef, useState } from 'react'
import Reveal from '../../(atelier)/components/Reveal'
import Loupe, { type VueLoupe } from '../../components/Loupe'

/* Le CADRAGE dit aussi le SUPPORT (04/09, maquettes validées) : les
   couvertures se posent sur un magazine FERMÉ (dos, tranche, épaisseur —
   `droite`/`pleine` vus de face, `gauche`/`pleine-dos` vus de dos, en
   miroir), les doubles pages sur un magazine OUVERT (`ouverte` : pli
   central, bloc de pages dessous), la planche `large` reste posée à plat
   avec la seule épaisseur du papier. Tout est en CSS pur (numero.css). */
type Cadre = 'droite' | 'gauche' | 'pleine' | 'pleine-dos' | 'large' | 'ouverte'
type Vue = { src: string; legende: string; loupe: string; cadre: Cadre }

export default function Apercu({
  plat,
  c1,
  c4,
  doubles,
}: {
  plat: string | null
  c1: string | null
  c4: string | null
  doubles: string[]
}) {
  const [ouvert, setOuvert] = useState<number | null>(null)
  const [i, setI] = useState(0)
  const depart = useRef<{ x: number; y: number } | null>(null)

  /* Les vues, dans l'ordre du feuilletage. Le vocabulaire est celui de la
     cliente ET de l'atelier — deux personnes qui regardent le même visuel le
     nomment pareil. La loupe navigue par légende (findIndex) : en mode à plat,
     les deux faces découpées pointent le MÊME objet entier, sous une seule
     légende de loupe « La couverture à plat ». */
  const vues: Vue[] = []
  if (plat) {
    vues.push({ src: plat, legende: 'La couverture', loupe: 'La couverture à plat', cadre: 'droite' })
    vues.push({ src: plat, legende: 'La quatrième', loupe: 'La couverture à plat', cadre: 'gauche' })
    vues.push({ src: plat, legende: 'La couverture à plat', loupe: 'La couverture à plat', cadre: 'large' })
  } else {
    if (c1) vues.push({ src: c1, legende: 'La couverture', loupe: 'La couverture', cadre: 'pleine' })
    if (c4) vues.push({ src: c4, legende: 'La quatrième', loupe: 'La quatrième', cadre: 'pleine-dos' })
  }
  doubles.forEach((src, k) => {
    const nom = doubles.length > 1 ? `Double page ${k + 1}` : 'Une double page'
    vues.push({ src, legende: nom, loupe: nom, cadre: 'ouverte' })
  })

  /* La loupe ne connaît que ce qui existe, une fois chacun. */
  const agrandissables: VueLoupe[] = vues
    .filter((v, k, tous) => tous.findIndex((a) => a.loupe === v.loupe) === k)
    .map((v) => ({ src: v.src, legende: v.loupe }))

  /* Aucun visuel (cas théorique : les visuels sont exigés à la publication) :
     on ne rend rien plutôt qu'une scène vide. La page garde son titre et ses
     cases au-dessus/au-dessous. */
  if (vues.length === 0) return null

  const idx = Math.min(i, vues.length - 1)
  const seul = vues.length === 1

  function aller(k: number) {
    setI(Math.max(0, Math.min(vues.length - 1, k)))
  }
  function ouvrirLoupe(loupe: string) {
    const j = agrandissables.findIndex((v) => v.legende === loupe)
    if (j >= 0) setOuvert(j)
  }

  return (
    <Reveal>
      <div className="nu-viz">
        <div
          className="nu-viz-scene"
          onTouchStart={(e) => {
            depart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
          }}
          onTouchEnd={(e) => {
            const d = depart.current
            depart.current = null
            if (!d) return
            const dx = e.changedTouches[0].clientX - d.x
            const dy = e.changedTouches[0].clientY - d.y
            if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) aller(idx + (dx < 0 ? 1 : -1))
          }}
        >
          <div className="nu-viz-track" style={{ transform: `translateX(${-idx * 100}%)` }}>
            {vues.map((v, k) => (
              <div className="nu-viz-slide" key={v.legende} aria-hidden={k !== idx}>
                <button
                  type="button"
                  className={`nu-viz-page nu-viz-page--${v.cadre}`}
                  onClick={() => ouvrirLoupe(v.loupe)}
                  aria-label={`Agrandir : ${v.legende}`}
                  tabIndex={k === idx ? 0 : -1}
                >
                  {/* L'OBJET magazine, version SOBRE (retour Mathias 04/09) :
                      la face porte le visuel, l'épaisseur du papier se
                      dessine derrière elle (pseudo-éléments de .nu-viz-mag),
                      angles droits partout — d'où un bouton SANS
                      overflow:hidden, c'est la face qui rogne. Le pli ne
                      s'affiche QUE sur la double ouverte. */}
                  <span className="nu-viz-mag">
                    <span className="nu-viz-mag-face">
                      {/* <img> plain — next/image est proscrit sur ce dépôt (CLAUDE.md). */}
                      <img src={v.src} alt={v.legende} loading={k === 0 ? 'eager' : 'lazy'} decoding="async" />
                      <span className="nu-viz-mag-pli" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="nu-viz-zoom" aria-hidden="true">Agrandir</span>
                </button>
              </div>
            ))}
          </div>

          {!seul && (
            <>
              <button
                type="button"
                className="nu-viz-fleche nu-viz-fleche--prev"
                onClick={() => aller(idx - 1)}
                disabled={idx === 0}
                aria-label="Vue précédente"
              >
                ‹
              </button>
              <button
                type="button"
                className="nu-viz-fleche nu-viz-fleche--next"
                onClick={() => aller(idx + 1)}
                disabled={idx === vues.length - 1}
                aria-label="Vue suivante"
              >
                ›
              </button>
            </>
          )}
        </div>

        <div className="nu-viz-bas">
          <span className="nu-viz-nom" aria-live="polite">{vues[idx].legende}</span>
          {!seul && (
            <div className="nu-viz-points" role="tablist" aria-label="Les vues de votre maquette">
              {vues.map((v, k) => (
                <button
                  key={v.legende}
                  type="button"
                  className="nu-viz-point"
                  role="tab"
                  aria-current={k === idx}
                  aria-label={v.legende}
                  onClick={() => aller(k)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hors du flux animé : la loupe se positionne sur le plein écran. */}
      <Loupe vues={agrandissables} index={ouvert} onIndex={setOuvert} onFermer={() => setOuvert(null)} />
    </Reveal>
  )
}
