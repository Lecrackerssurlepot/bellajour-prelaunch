'use client'

/**
 * La maquette de l'état 2, sur la page de la cliente — une PLANCHE, style
 * Airbnb (11/09/2026, remplace la visionneuse en carrousel de T-089).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * TOUT VISIBLE D'UN COUP, CHAQUE VISUEL À SES PROPORTIONS RÉELLES
 *
 * Mathias, capture à l'appui (11/09) : le carrousel montrait « Couverture 2 »
 * entière en paysage dans un grand cadre — « l'affichage n'est pas au
 * format ». Il veut une grille : « Vos couvertures » d'un côté, « Les doubles
 * pages » de l'autre, plus de flèches, plus de points, la loupe au clic.
 *
 * DEUX FORMATS DE COUVERTURE, ET C'EST LE FICHIER QUI LE DIT.
 * Le format courant est la couverture À PLAT : un seul fichier C4 | dos | C1,
 * l'export naturel de Canva. On ne le retouche jamais côté serveur : la carte
 * montre la PREMIÈRE DE COUVERTURE (cadre portrait A4, `object-fit: cover`,
 * l'objet qu'on tient en main) à côté de la PLANCHE ENTIÈRE, jamais rognée
 * (ce qu'on imprime). Mais l'atelier dépose aussi des COUVERTURES SEULES
 * (portrait, 210 × 297) : la carte montre alors une unique tuile, l'image
 * entière. Le format est MESURÉ sur l'image elle-même (`formatDepuisRatio`,
 * module pur) : une page seule ne se coupe jamais en deux.
 * Les dossiers publiés avant le format à plat portent trois fichiers séparés
 * (c1, c4) et se montrent chacun, entiers, sans rien à choisir.
 *
 * 1 À 3 DOUBLES PAGES (MAX_DOUBLES) : l'atelier décide combien il en montre.
 *
 * La légende est TOUJOURS nommée (recette du 25/08) ; la loupe agrandit
 * chaque tuile, en réutilisant le même composant partagé avec l'admin.
 *
 * ── LE CHOIX, RENDU CLAIR (11/09/2026, seconde passe) ─────────────────────
 * Mathias : « je ne trouve pas ça très clair de choisir entre les couvertures
 * quand on a le choix. » Quand plusieurs couvertures sont proposées, la
 * section pose une QUESTION (« Laquelle préférez-vous ? »), chaque carte
 * porte un bouton plein qui nomme le geste, la carte retenue devient un état
 * (« Votre choix », bordure accentuée), et une ligne `role="status"` répète
 * en toutes lettres ce qui sera composé. Les trois règles d'affichage sont
 * dans `formatVisuel.ts` (`enTeteCouvertures`, `etatCartes`,
 * `phraseChoixCouverture`), éprouvées par le harnais : un écran qui se
 * trompe ici fait dire au client ce qu'il n'a pas dit.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from 'react'
import Reveal from '../../(atelier)/components/Reveal'
import Loupe, { type VueLoupe } from '../../components/Loupe'
import {
  construirePlanche,
  enTeteCouvertures,
  etatCartes,
  formatDepuisRatio,
  phraseChoixCouverture,
  type FormatVisuel,
} from '@/lib/atelier/formatVisuel'

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
      élément : une seule carte, sans bouton de choix. */
  plats?: string[]
  c1: string | null
  c4: string | null
  doubles: string[]
  /** Le cadrage de chaque double page, aligné sur `doubles`. Vide = centré. */
  doublesCadrage?: string[]
  /** T-090 — le cadrage de la face avant de chaque planche, aligné sur
      `plats`. Vide = la coupe centrée automatique, inchangée.
      ⚠️ `platsCadrageGauche` reste accepté pour ne pas casser les appelants
      (la fiche admin le règle encore pour SON propre aperçu, `Fiche.tsx`)
      mais n'a plus d'effet ici : la « quatrième » cadrée séparément a
      disparu de la carte (11/09/2026), elle est déjà visible, entière, dans
      la tuile « à plat ». Voir `formatVisuel.ts`. */
  platsCadrageDroite?: string[]
  platsCadrageGauche?: string[]
  /** Nécessaire pour enregistrer le choix. Absent sur le magazine livré. */
  token?: string
  /** T-093 : le mot rassurant n'a de sens QUE tant que la maquette n'est pas
      figée. Le magazine LIVRÉ (/compte/magazine) ne le passe pas. */
  modifiable?: boolean
  /** 11/09/2026 — l'atelier regarde la page du client avant de publier
      (`?brouillon=1`). Les boutons de choix se RENDENT, éteints : sans eux,
      Mathias n'a jamais vu ce que le client verra, et un bouton invisible en
      prévisualisation est un bouton qu'on ne relit pas. Ils restent inertes,
      le choix appartient au client. */
  previsualisation?: boolean
}) {
  const [ouvert, setOuvert] = useState<number | null>(null)
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
  /* Le format mesuré de chaque couverture, par URL. Vide au premier rendu
     (serveur compris) : on ne découpe rien tant qu'on ne sait pas. */
  const [formats, setFormats] = useState<Record<string, FormatVisuel>>({})

  const { couvertures, doubles: tuilesDoubles } = construirePlanche({
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
     couvertures pas encore visibles. Le navigateur ne télécharge rien deux
     fois : c'est la même URL, donc la même entrée de cache que l'`<img>` du
     document.
     La dépendance est la LISTE JOINTE, pas le tableau : `plats` est
     reconstruit à chaque rendu, et l'effet se relancerait en boucle. */
  const clesCouvertures = plats.length ? plats.join('\n') : plat ? plat : ''
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
      /* Une image illisible ne bloque rien : la carte reste entière, ce qui
         est le repli sûr. On ne journalise pas côté client. */
      img.src = src
      images.push(img)
    }
    return () => {
      vivant = false
      for (const img of images) img.onload = null
    }
  }, [clesCouvertures])

  /* La loupe : une entrée par tuile CLIQUABLE, dans l'ordre de la grille.
     Pour une carte planche, la première de couverture ET la planche entière
     pointent la MÊME entrée (la planche, jamais rognée). */
  const agrandissables: VueLoupe[] = []
  /* Pour retrouver l'index loupe depuis une tuile cliquée, sans dépendre de
     la légende (deux cartes peuvent en théorie partager un mot). */
  const loupePremiere: number[] = []
  const loupeEntiere: number[] = []
  couvertures.forEach((c) => {
    agrandissables.push({ src: c.entiere.src, legende: c.entiere.legende })
    const j = agrandissables.length - 1
    loupeEntiere.push(j)
    loupePremiere.push(j)
  })
  const loupeDouble: number[] = tuilesDoubles.map((d) => {
    agrandissables.push({ src: d.src, legende: d.legende })
    return agrandissables.length - 1
  })

  /* Aucun visuel (cas théorique : les visuels sont exigés à la publication) :
     on ne rend rien plutôt qu'une grille vide. La page garde son titre et ses
     cases au-dessus/au-dessous. */
  if (couvertures.length === 0 && tuilesDoubles.length === 0) return null

  /* Y a-t-il vraiment à choisir ? Une seule couverture proposée (ou un
     dossier historique, sans rang), il n'y a rien à arbitrer, et le paiement
     reste l'unique geste de l'écran. */
  const rangsChoix = couvertures.filter((c) => c.rang !== undefined)
  /* Le bouton écrit ; sans token il ne le peut pas. En prévisualisation on
     le montre quand même, ÉTEINT : l'atelier doit voir l'écran du client. */
  const armable = Boolean(token) && !previsualisation
  /* ⚠️ LE CHOIX NE S'OFFRE QUE LÀ OÙ IL VEUT DIRE QUELQUE CHOSE.
     Le MÊME composant sert la page de suivi ET le magazine LIVRÉ
     (/compte/magazine/[token]), qui ne passe pas de token : là-bas le
     magazine est imprimé et posté, il n'y a plus rien à arbitrer. Poser
     « Laquelle préférez-vous ? » au-dessus d'un objet déjà reçu serait une
     question sans réponse possible, et les boutons éteints en dessous
     ressembleraient à une panne. La prévisualisation, elle, DOIT tout
     montrer : c'est l'écran que l'atelier relit avant de publier. */
  const choixOffert = rangsChoix.length > 1 && (Boolean(token) || previsualisation)

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

  /* Le chapeau, la marque de chaque carte et la phrase de confirmation
     viennent toutes les trois du module pur : trois règles d'affichage qui
     peuvent mentir au client sur ce qu'il a demandé. */
  const enTete = enTeteCouvertures(choixOffert ? rangsChoix.length : 0, couvertures.length)
  const etats = etatCartes(choisie, aChoisi, indifferent, couvertures.length)
  const confirmation = choixOffert
    ? phraseChoixCouverture(choisie, aChoisi, indifferent)
    : null
  const titreDoubles = tuilesDoubles.length > 1 ? 'Les doubles pages' : 'Une double page'

  return (
    <Reveal>
      <div className="nu-planche">
        {couvertures.length > 0 && (
          <section className="nu-pl-section">
            <h3 className="nu-pl-titre">{enTete.titre}</h3>
            {enTete.sousTitre && <p className="nu-pl-sous">{enTete.sousTitre}</p>}
            <div className="nu-pl-couvertures">
              {couvertures.map((c, k) => {
                const estRetenue = c.rang !== undefined && etats[k] === 'retenue'
                return (
                  <div
                    className={estRetenue ? 'nu-pl-carte nu-pl-carte--retenue' : 'nu-pl-carte'}
                    key={`${c.nom}-${k}`}
                  >
                    <div className={`nu-pl-tuiles nu-pl-tuiles--${c.format}`}>
                      {c.format === 'planche' && c.premiere ? (
                        <>
                          <button
                            type="button"
                            className="nu-pl-tuile nu-pl-tuile--premiere"
                            onClick={() => setOuvert(loupePremiere[k])}
                            aria-label={`Agrandir : ${c.entiere.legende}`}
                          >
                            <span className="nu-viz-mag">
                              <span className="nu-viz-mag-face">
                                {/* <img> plain — next/image est proscrit sur ce dépôt (CLAUDE.md). */}
                                <img
                                  src={c.premiere.src}
                                  alt={c.nom}
                                  loading={k === 0 ? 'eager' : 'lazy'}
                                  decoding="async"
                                  style={c.premiere.cadrage ? { objectPosition: c.premiere.cadrage } : undefined}
                                />
                              </span>
                            </span>
                            <span className="nu-pl-zoom" aria-hidden="true">Agrandir</span>
                          </button>
                          <button
                            type="button"
                            className="nu-pl-tuile nu-pl-tuile--entiere"
                            onClick={() => setOuvert(loupeEntiere[k])}
                            aria-label={`Agrandir : ${c.entiere.legende}`}
                          >
                            <img src={c.entiere.src} alt={c.entiere.legende} loading="lazy" decoding="async" />
                            <span className="nu-pl-legende-plat">À plat : quatrième, dos, première</span>
                            <span className="nu-pl-zoom" aria-hidden="true">Agrandir</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="nu-pl-tuile nu-pl-tuile--seule"
                          onClick={() => setOuvert(loupeEntiere[k])}
                          aria-label={`Agrandir : ${c.entiere.legende}`}
                        >
                          <img
                            src={c.entiere.src}
                            alt={c.entiere.legende}
                            loading={k === 0 ? 'eager' : 'lazy'}
                            decoding="async"
                          />
                          <span className="nu-pl-zoom" aria-hidden="true">Agrandir</span>
                        </button>
                      )}
                    </div>

                    <p className="nu-pl-nom">{c.nom}</p>

                    {/* ── LE GESTE, SOUS CHAQUE CARTE, TOUJOURS AU MÊME
                        ENDROIT ─────────────────────────────────────────
                        Un bouton plein, identique sur toutes les cartes,
                        qui NOMME l'action (« Choisir cette couverture »)
                        au lieu de la sous-entendre. Sur la carte retenue,
                        il ne disparaît pas : il devient un état, coche
                        comprise. Un bouton qui s'efface au clic laisse le
                        doigt sur du vide et le doute entier. */}
                    {choixOffert && c.rang !== undefined && (
                      <div className="nu-pl-choix-carte">
                        {estRetenue ? (
                          <span className="nu-pl-retenue">
                            <span aria-hidden="true">✓</span> Votre choix
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="nu-pl-btn"
                            onClick={() => enregistrer(c.rang as number)}
                            disabled={!armable}
                            title={previsualisation ? 'Prévisualisation' : undefined}
                          >
                            Choisir cette couverture
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {choixOffert && (
              <div className="nu-pl-choix-section">
                {/* La porte de sortie. SECONDAIRE, et elle le reste : dire
                    « décidez pour moi » doit être possible sans être la
                    première chose que l'œil attrape. Une fois choisie, elle
                    s'efface au profit de la ligne de confirmation. */}
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
                {/* ── LA CONFIRMATION ───────────────────────────────────
                    `role="status"` : le changement est annoncé sans voler
                    le focus. Elle répète le NUMÉRO, pour rester vraie lue
                    seule. Le client peut encore changer d'avis, les autres
                    cartes gardent leur bouton. */}
                {confirmation && (
                  <p className="nu-pl-confirme" role="status">
                    {confirmation}
                  </p>
                )}
                {refus && (
                  <span className="nu-viz-choix-refus" role="alert">
                    Votre choix n’a pas pu être enregistré. Réessayez dans un instant.
                  </span>
                )}
              </div>
            )}
          </section>
        )}

        {tuilesDoubles.length > 0 && (
          <section className="nu-pl-section">
            <h3 className="nu-pl-titre">{titreDoubles}</h3>
            <div className="nu-pl-doubles">
              {tuilesDoubles.map((d, k) => (
                <button
                  type="button"
                  key={d.legende}
                  className="nu-pl-tuile nu-pl-tuile--double"
                  onClick={() => setOuvert(loupeDouble[k])}
                  aria-label={`Agrandir : ${d.legende}`}
                >
                  <span className="nu-viz-mag">
                    <span className="nu-viz-mag-face">
                      <img
                        src={d.src}
                        alt={d.legende}
                        loading="lazy"
                        decoding="async"
                        style={d.cadrage ? { objectPosition: d.cadrage } : undefined}
                      />
                      <span className="nu-viz-mag-pli" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="nu-pl-nom-tuile">{d.legende}</span>
                  <span className="nu-pl-zoom" aria-hidden="true">Agrandir</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {modifiable && (
          <p className="nu-viz-note">
            Ces pages restent entièrement modifiables à la création de votre maquette. Aucune
            inquiétude.
          </p>
        )}
      </div>

      {/* Hors du flux animé : la loupe se positionne sur le plein écran. */}
      <Loupe vues={agrandissables} index={ouvert} onIndex={setOuvert} onFermer={() => setOuvert(null)} />
    </Reveal>
  )
}
