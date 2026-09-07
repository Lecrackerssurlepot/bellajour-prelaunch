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

import { useEffect, useRef, useState } from 'react'
import Reveal from '../../(atelier)/components/Reveal'
import Loupe, { type VueLoupe } from '../../components/Loupe'

/* Le CADRAGE dit aussi le SUPPORT (04/09, maquettes validées) : les
   couvertures se posent sur un magazine FERMÉ (dos, tranche, épaisseur —
   `droite`/`pleine` vus de face, `gauche`/`pleine-dos` vus de dos, en
   miroir), les doubles pages sur un magazine OUVERT (`ouverte` : pli
   central, bloc de pages dessous), la planche `large` reste posée à plat
   avec la seule épaisseur du papier. Tout est en CSS pur (numero.css). */
type Cadre = 'droite' | 'gauche' | 'pleine' | 'pleine-dos' | 'large' | 'ouverte'
type Vue = {
  src: string
  legende: string
  loupe: string
  cadre: Cadre
  /* Le cadrage réglé par l'atelier (`object-position`). Vide = centré. */
  cadrage?: string
  /* T-093 — le rang de la couverture que cette vue montre (0 = celle
     proposée par défaut). Absent sur les doubles pages : on ne choisit pas
     une double page, on choisit une couverture. */
  rang?: number
}

export default function Apercu({
  plat,
  plats = [],
  c1,
  c4,
  doubles,
  doublesCadrage = [],
  token,
  modifiable = false,
}: {
  plat: string | null
  /** T-093 — les couvertures proposées, dans l'ordre. Vide ou à un seul
      élément : la visionneuse se comporte exactement comme avant. */
  plats?: string[]
  c1: string | null
  c4: string | null
  doubles: string[]
  /** Le cadrage de chaque double page, aligné sur `doubles`. Vide = centré. */
  doublesCadrage?: string[]
  /** Nécessaire pour enregistrer le choix. Absent sur le magazine livré. */
  token?: string
  /** T-093 : le mot rassurant n'a de sens QUE tant que la maquette n'est pas
      figée. Le magazine LIVRÉ (/compte/magazine) réutilise ce même composant
      sans le passer — il serait mensonger une fois l'objet imprimé. */
  modifiable?: boolean
}) {
  const [ouvert, setOuvert] = useState<number | null>(null)
  const [i, setI] = useState(0)
  /* T-093 — la couverture retenue. Elle part à 0 : la première est proposée
     par défaut, et la cliente peut payer sans jamais rien choisir (décision
     de Mathias, 07/09 — on n'ajoute pas d'obstacle devant le paiement).
     L'état est local et optimiste : l'écran obéit au doigt tout de suite,
     l'enregistrement suit. S'il échoue, on le dit et on revient en arrière —
     laisser un choix affiché qui n'est pas arrivé serait pire que tout. */
  const [choisie, setChoisie] = useState(0)
  /* A-t-elle VRAIMENT choisi, ou regarde-t-elle la proposition par défaut ?
     Tant qu'elle n'a rien dit, on n'affiche aucune marque : « votre choix »
     sur une couverture qu'elle n'a pas choisie serait un mot de trop, et
     faux. Ne rien choisir reste un choix — celui de garder la proposition
     de l'atelier, et il est journalisé comme tel côté serveur. */
  const [aChoisi, setAChoisi] = useState(false)
  const [refus, setRefus] = useState(false)
  const depart = useRef<{ x: number; y: number } | null>(null)

  /* Les vues, dans l'ordre du feuilletage. Le vocabulaire est celui de la
     cliente ET de l'atelier — deux personnes qui regardent le même visuel le
     nomment pareil. La loupe navigue par légende (findIndex) : en mode à plat,
     les deux faces découpées pointent le MÊME objet entier, sous une seule
     légende de loupe « La couverture à plat ». */
  const vues: Vue[] = []
  /* T-093 — `plats` fait foi quand il est là ; sinon la planche unique, donc
     tous les dossiers publiés jusqu'ici passent par le même chemin qu'avant. */
  const couvertures = plats.length ? plats : plat ? [plat] : []
  if (couvertures.length) {
    const premiere = couvertures[0]
    vues.push({ src: premiere, legende: 'La couverture', loupe: 'La couverture à plat', cadre: 'droite', rang: 0 })
    vues.push({ src: premiere, legende: 'La quatrième', loupe: 'La couverture à plat', cadre: 'gauche', rang: 0 })
    vues.push({ src: premiere, legende: 'La couverture à plat', loupe: 'La couverture à plat', cadre: 'large', rang: 0 })
    /* Les autres propositions : une vue chacune, cadrée sur leur face avant
       — c'est elle qu'on compare. La loupe montre la planche entière, comme
       pour la première. */
    couvertures.slice(1).forEach((src, k) => {
      const nom = `Couverture ${k + 2}`
      vues.push({ src, legende: nom, loupe: nom, cadre: 'droite', rang: k + 1 })
    })
  } else {
    if (c1) vues.push({ src: c1, legende: 'La couverture', loupe: 'La couverture', cadre: 'pleine' })
    if (c4) vues.push({ src: c4, legende: 'La quatrième', loupe: 'La quatrième', cadre: 'pleine-dos' })
  }
  doubles.forEach((src, k) => {
    const nom = doubles.length > 1 ? `Double page ${k + 1}` : 'Une double page'
    vues.push({ src, legende: nom, loupe: nom, cadre: 'ouverte', cadrage: doublesCadrage[k] })
  })

  /* La loupe ne connaît que ce qui existe, une fois chacun. */
  const agrandissables: VueLoupe[] = vues
    .filter((v, k, tous) => tous.findIndex((a) => a.loupe === v.loupe) === k)
    .map((v) => ({ src: v.src, legende: v.loupe }))

  /* Navigation clavier ‹ › — la scène répondait déjà au glissé et aux
     chevrons, mais pas au clavier. SANS bouclage (contrairement à Loupe.tsx,
     qui tourne l'objet) : cohérent avec les chevrons ‹ › ici désactivés aux
     extrémités. Deux gardes : la loupe a déjà son propre handler clavier
     (Escape/←/→, cyclique) sur `window` — on se tait tant qu'elle est
     ouverte pour ne pas lui marcher dessus ; et un focus dans un champ de
     saisie garde ses flèches (déplacer le curseur, pas la page). L'effet ne
     dépend que de primitives stables (pas de `idx` ni de `vues` en entier) :
     `setI` en fonction met à jour sans réabonner l'écouteur à chaque page
     tournée. */
  useEffect(() => {
    if (ouvert !== null || vues.length < 2) return
    function auClavier(e: KeyboardEvent) {
      const cible = e.target
      if (cible instanceof HTMLElement) {
        const nom = cible.tagName
        if (nom === 'INPUT' || nom === 'TEXTAREA' || nom === 'SELECT' || cible.isContentEditable) return
      }
      if (e.key === 'ArrowRight') setI((v) => Math.min(vues.length - 1, v + 1))
      else if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1))
    }
    window.addEventListener('keydown', auClavier)
    return () => window.removeEventListener('keydown', auClavier)
  }, [ouvert, vues.length])

  /* Aucun visuel (cas théorique : les visuels sont exigés à la publication) :
     on ne rend rien plutôt qu'une scène vide. La page garde son titre et ses
     cases au-dessus/au-dessous. */
  if (vues.length === 0) return null

  const idx = Math.min(i, vues.length - 1)
  const seul = vues.length === 1

  function aller(k: number) {
    setI(Math.max(0, Math.min(vues.length - 1, k)))
    /* Un refus d'enregistrement parle de LA vue où il s'est produit : le
       laisser affiché en tournant la page le collerait à une couverture qui
       n'a rien à voir. */
    setRefus(false)
  }
  /* On envoie le RANG, jamais l'URL (voir la route). Aucun mail ne part :
     elle est en train de regarder, pas de valider. */
  async function choisir(rang: number) {
    if (!token || rang === choisie) return
    const avant = choisie
    const avantChoisi = aChoisi
    setChoisie(rang)
    setAChoisi(true)
    setRefus(false)
    try {
      const r = await fetch('/api/atelier/numero', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, couverture_choisie: rang }),
      })
      if (!r.ok) throw new Error('refus')
    } catch {
      setChoisie(avant)
      setAChoisi(avantChoisi)
      setRefus(true)
    }
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
                      {/* Le cadrage vient de l'atelier, jamais de la page :
                          une image plus large que son cadre est coupée, et
                          c'est lui qui décide où. Absent = centré, comme
                          toujours. */}
                      <img
                        src={v.src}
                        alt={v.legende}
                        loading={k === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        style={v.cadrage ? { objectPosition: v.cadrage } : undefined}
                      />
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
          <span className="nu-viz-nom" aria-live="polite">
            {vues[idx].legende}
            {/* Sur la couverture retenue, la marque du choix tient dans le
                nom : un bloc de 44 px pour dire « c'est celle-ci » pesait sur
                l'écran qui décide du paiement, sans rien proposer à faire. */}
            {couvertures.length > 1 && aChoisi && vues[idx].rang === choisie && (
              <span className="nu-viz-nom-choix"> · votre choix</span>
            )}
          </span>
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
          {/* T-093 — LE CHOIX, seulement quand il y a vraiment à choisir.
              Sur la vue d'une couverture, la cliente peut retenir celle
              qu'elle préfère ; celle qui est retenue le dit et son bouton
              s'éteint. Rien n'est bloquant : sans un seul clic, la première
              reste proposée et le paiement est ouvert. */}
          {/* Le bouton n'apparaît que là où il sert : devant une AUTRE
              couverture que celle retenue. Sur celle qu'elle a déjà, il n'y
              a rien à faire — et ne rien choisir reste un choix, celui de
              garder la proposition de l'atelier. */}
          {couvertures.length > 1 &&
            token &&
            vues[idx].rang !== undefined &&
            vues[idx].rang !== choisie && (
              <div className="nu-viz-choix">
                <button
                  type="button"
                  className="nu-viz-choix-btn"
                  onClick={() => choisir(vues[idx].rang!)}
                >
                  Je préfère celle-ci
                </button>
                {refus && (
                  <span className="nu-viz-choix-refus" role="alert">
                    Votre choix n’a pas pu être enregistré. Réessayez dans un instant.
                  </span>
                )}
              </div>
            )}
          {modifiable && (
            <p className="nu-viz-note">
              Ces pages restent entièrement modifiables à la création de votre maquette. Aucune
              inquiétude.
            </p>
          )}
        </div>
      </div>

      {/* Hors du flux animé : la loupe se positionne sur le plein écran. */}
      <Loupe vues={agrandissables} index={ouvert} onIndex={setOuvert} onFermer={() => setOuvert(null)} />
    </Reveal>
  )
}
