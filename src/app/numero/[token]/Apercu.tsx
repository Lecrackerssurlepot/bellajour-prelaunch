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
 * DEUX FORMATS DE COUVERTURE, ET C'EST LE FICHIER QUI LE DIT (11/09/2026).
 * Le format courant est la couverture À PLAT : un seul fichier C4 | dos | C1,
 * l'export naturel de Canva. On ne le retouche jamais côté serveur : la vue
 * « La couverture » CADRE la moitié droite, « La quatrième » la moitié gauche
 * (object-position), et « La couverture à plat » montre l'objet entier.
 * Mais l'atelier dépose aussi des COUVERTURES SEULES (portrait, 210 × 297) :
 * les couper en deux montrait une demi-couverture sous le nom « La couverture »
 * et l'autre moitié sous « La quatrième ». Le format est donc MESURÉ sur
 * l'image elle-même (`formatDepuisRatio`, module pur) — une page seule se
 * montre entière, sous une seule vue, et n'a pas de quatrième.
 * Les dossiers publiés avant le format à plat portent trois fichiers séparés
 * (c1, c4) et se lisent comme des couvertures pleines, comme avant.
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
import { construireVues, formatDepuisRatio, type FormatVisuel } from '@/lib/atelier/formatVisuel'

/* Le mot que le serveur accepte pour « je vous fais confiance ». Recopié de
   `@/lib/atelier/apercu` (CHOIX_INDIFFERENT) plutôt qu'importé : ce module
   tire le SDK AWS pour signer les URL R2, et il n'a rien à faire dans le
   bundle du navigateur — même raison que les miroirs de MAX_DOUBLES et
   MAX_PLANCHES côté admin. */
const INDIFFERENT = 'indifferent'

export default function Apercu({
  plat,
  plats = [],
  c1,
  c4,
  doubles,
  doublesCadrage = [],
  platsCadrageDroite = [],
  platsCadrageGauche = [],
  token,
  modifiable = false,
  previsualisation = false,
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
  /** T-090 (rouvert 07/09) — le cadrage de chaque FACE de chaque planche,
      alignés sur `plats` : « La couverture » (C1, cadre droite) et
      « La quatrième » (C4, cadre gauche) peuvent être réglées séparément.
      Vide = la coupe centrée automatique, inchangée. */
  platsCadrageDroite?: string[]
  platsCadrageGauche?: string[]
  /** Nécessaire pour enregistrer le choix. Absent sur le magazine livré. */
  token?: string
  /** T-093 : le mot rassurant n'a de sens QUE tant que la maquette n'est pas
      figée. Le magazine LIVRÉ (/compte/magazine) réutilise ce même composant
      sans le passer — il serait mensonger une fois l'objet imprimé. */
  modifiable?: boolean
  /** 11/09/2026 — l'atelier regarde la page du client avant de publier
      (`?brouillon=1`). Les boutons de choix se RENDENT, éteints : sans eux,
      Mathias n'a jamais vu ce que le client verra, et un bouton invisible en
      prévisualisation est un bouton qu'on ne relit pas. Ils restent inertes,
      le choix appartient au client. */
  previsualisation?: boolean
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
  /* 11/09/2026 — « décidez pour moi ». Sans ce bouton, le client sans avis
     n'avait AUCUN moyen de le dire : son silence se lisait comme un dossier
     jamais ouvert, et l'atelier ne savait pas s'il attendait encore. */
  const [indifferent, setIndifferent] = useState(false)
  const [refus, setRefus] = useState(false)
  const depart = useRef<{ x: number; y: number } | null>(null)
  /* Le format mesuré de chaque couverture, par URL. Vide au premier rendu
     (serveur compris) : on ne découpe rien tant qu'on ne sait pas. */
  const [formats, setFormats] = useState<Record<string, FormatVisuel>>({})

  const { vues, couvertures } = construireVues({
    plat,
    plats,
    c1,
    c4,
    doubles,
    doublesCadrage,
    platsCadrageDroite,
    platsCadrageGauche,
    formats,
  })

  /* ── MESURER AVANT DE DÉCOUPER (11/09/2026) ────────────────────────
     Une image chargée connaît ses dimensions ; on les lit sur un objet
     `Image` détaché plutôt que sur le DOM, ce qui marche aussi pour les
     couvertures des vues qu'on n'a pas encore fait défiler. Le navigateur
     ne télécharge rien deux fois : c'est la même URL, donc la même entrée
     de cache que l'`<img>` du document.
     La dépendance est la LISTE JOINTE, pas le tableau : il est reconstruit à
     chaque rendu, et l'effet se relancerait en boucle. */
  const clesCouvertures = couvertures.join('\n')
  useEffect(() => {
    if (!clesCouvertures) return
    let vivant = true
    const images: HTMLImageElement[] = []
    for (const src of clesCouvertures.split('\n')) {
      const img = new Image()
      img.onload = () => {
        if (!vivant) return
        const format = formatDepuisRatio(img.naturalWidth, img.naturalHeight)
        /* Mise à jour FONCTIONNELLE : l'effet ne dépend pas de `formats`,
           donc il ne se relance pas à chaque mesure. */
        setFormats((f) => (f[src] === format ? f : { ...f, [src]: format }))
      }
      /* Une image illisible ne bloque rien : la vue reste entière, ce qui
         est le repli sûr. On ne journalise pas côté client. */
      img.src = src
      images.push(img)
    }
    return () => {
      vivant = false
      for (const img of images) img.onload = null
    }
  }, [clesCouvertures])

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
  const rangVu = vues[idx].rang
  /* Y a-t-il vraiment à choisir ? Une seule couverture proposée, il n'y a
     rien à arbitrer, et le paiement reste l'unique geste de l'écran. */
  const surUneCouverture = rangVu !== undefined && couvertures.length > 1
  /* Le bouton écrit ; sans token il ne le peut pas. En prévisualisation on
     le montre quand même, ÉTEINT : l'atelier doit voir l'écran du client. */
  const armable = Boolean(token) && !previsualisation

  function aller(k: number) {
    setI(Math.max(0, Math.min(vues.length - 1, k)))
    /* Un refus d'enregistrement parle de LA vue où il s'est produit : le
       laisser affiché en tournant la page le collerait à une couverture qui
       n'a rien à voir. */
    setRefus(false)
  }
  /* On envoie le RANG (ou le mot « indifferent »), jamais l'URL : voir la
     route. Aucun mail ne part — elle est en train de regarder, pas de
     valider. */
  async function enregistrer(valeur: number | typeof INDIFFERENT) {
    if (!token || previsualisation) return
    const avant = { choisie, indifferent, aChoisi }
    if (valeur === INDIFFERENT) {
      setIndifferent(true)
    } else {
      setChoisie(valeur)
      setIndifferent(false)
    }
    setAChoisi(true)
    setRefus(false)
    try {
      const r = await fetch('/api/atelier/numero', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, couverture_choisie: valeur }),
      })
      if (!r.ok) throw new Error('refus')
    } catch {
      setChoisie(avant.choisie)
      setIndifferent(avant.indifferent)
      setAChoisi(avant.aChoisi)
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
                l'écran qui décide du paiement, sans rien proposer à faire.
                Quand le client nous fait confiance, la marque suit la MÊME
                règle et se pose sur chaque couverture : aucune n'est « la
                sienne », c'est justement ce qu'il a dit. */}
            {surUneCouverture && aChoisi && indifferent && (
              <span className="nu-viz-nom-choix"> · vous nous faites confiance</span>
            )}
            {surUneCouverture && aChoisi && !indifferent && rangVu === choisie && (
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
              reste proposée et le paiement est ouvert.
              11/09/2026 — le second bouton dit l'autre réponse possible :
              « je n'ai pas d'avis ». Il est SECONDAIRE (le premier reste la
              réponse la plus utile à l'atelier) et disparaît une fois dit. */}
          {surUneCouverture && (
            <div className="nu-viz-choix">
              <div className="nu-viz-choix-boutons">
                {/* Le bouton de préférence n'apparaît pas là où il ne sert à
                    rien : devant la couverture DÉJÀ retenue, il n'y a rien à
                    faire, le nom porte « votre choix ». Quand le client nous
                    a laissé la main, aucune couverture n'est la sienne : le
                    bouton revient partout, il peut changer d'avis. */}
                {(indifferent || rangVu !== choisie) && (
                  <button
                    type="button"
                    className="nu-viz-choix-btn"
                    onClick={() => enregistrer(rangVu)}
                    disabled={!armable}
                    title={previsualisation ? 'Prévisualisation' : undefined}
                  >
                    Je préfère celle-ci
                  </button>
                )}
                {!indifferent && (
                  <button
                    type="button"
                    className="nu-viz-choix-btn nu-viz-choix-btn--doux"
                    onClick={() => enregistrer(INDIFFERENT)}
                    disabled={!armable}
                    title={previsualisation ? 'Prévisualisation' : undefined}
                  >
                    Sans préférence, je vous fais confiance
                  </button>
                )}
              </div>
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
