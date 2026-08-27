'use client'

/**
 * Les visuels de l'état 2, sur la page de la cliente.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DEUX FORMATS, UN SEUL ÉCRAN (T2-2)
 *
 * Le format normal est la couverture À PLAT : un seul fichier C4 | dos | C1,
 * l'export naturel de Canva. On n'en montre pas trois copies — on la DÉCOUPE
 * en CSS : la vue « La couverture » cadre la moitié droite, « La quatrième »
 * la moitié gauche, et la vue à plat montre l'objet entier, dos compris.
 * C'est la présentation de la version éditeur : une couverture qu'on
 * retourne, pas trois rectangles sans lien.
 *
 * Les dossiers publiés avant ce format portent trois fichiers séparés
 * (c1, c4, double) et se rendent comme avant. Aucune retouche d'image côté
 * serveur, dans les deux cas.
 *
 * Et depuis la recette du 25/08 : la légende est SOUS chaque visuel, toujours,
 * image ou pas — c'est la page qui vend, elle nomme ce qu'elle montre.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Composant client : la page /numero est un composant serveur, et l'ouverture
 * de la loupe est le troisième et dernier morceau interactif de cette page.
 */

import { useState } from 'react'
import Reveal from '../../(atelier)/components/Reveal'
import Loupe, { type VueLoupe } from '../../components/Loupe'

export default function Apercu({
  plat,
  c1,
  c4,
  double,
}: {
  plat: string | null
  c1: string | null
  c4: string | null
  double: string | null
}) {
  const [ouvert, setOuvert] = useState<number | null>(null)

  /* Les mots de la cliente, pas les nôtres : « C1 » et « C4 » sont du jargon
     d'imprimeur. Le même vocabulaire est repris dans la fiche de l'atelier —
     deux personnes qui regardent le même visuel doivent le nommer pareil.

     `loupe` : la légende de la vue que le clic agrandit. En mode à plat, les
     deux faces découpées ouvrent le MÊME objet entier — la loupe navigue par
     légende (findIndex), il lui faut donc des légendes uniques. */
  const declares: Array<{
    src: string | null
    legende: string
    loupe: string
    decoupe?: 'droite' | 'gauche'
  }> = plat
    ? [
        { src: plat, legende: 'La couverture', loupe: 'La couverture à plat', decoupe: 'droite' },
        { src: plat, legende: 'La quatrième', loupe: 'La couverture à plat', decoupe: 'gauche' },
        { src: plat, legende: 'La couverture à plat', loupe: 'La couverture à plat' },
        { src: double, legende: 'Une double page', loupe: 'Une double page' },
      ]
    : [
        { src: c1, legende: 'La couverture', loupe: 'La couverture' },
        { src: c4, legende: 'La quatrième', loupe: 'La quatrième' },
        { src: double, legende: 'Une double page', loupe: 'Une double page' },
      ]

  /* La loupe ne connaît que ce qui existe, une fois chacun : un cadre vide
     n'est pas une étape de la visite, et l'objet à plat n'y figure qu'une
     fois même s'il remplit trois cadres. */
  const agrandissables: VueLoupe[] = declares
    .filter((v): v is typeof v & { src: string } => Boolean(v.src))
    .filter((v, i, tous) => tous.findIndex((a) => a.loupe === v.loupe) === i)
    .map((v) => ({ src: v.src, legende: v.loupe }))

  function ouvrir(loupe: string) {
    const i = agrandissables.findIndex((v) => v.legende === loupe)
    if (i >= 0) setOuvert(i)
  }

  const [premiere, seconde, ...larges] = declares

  return (
    <>
      <Reveal>
        <div className="nu-covers">
          <Vue vue={premiere} onOuvrir={ouvrir} />
          <Vue vue={seconde} onOuvrir={ouvrir} />
        </div>
        {larges.map((v) => (
          <div className="nu-double" key={v.legende}>
            <Vue vue={v} onOuvrir={ouvrir} />
          </div>
        ))}
      </Reveal>

      {/* Hors du Reveal : une vue plein écran ne doit dépendre d'aucune
          enveloppe animée pour se positionner. */}
      <Loupe vues={agrandissables} index={ouvert} onIndex={setOuvert} onFermer={() => setOuvert(null)} />
    </>
  )
}

/* Une vue d'aperçu. Sans image, un cadre de la charte et un mot — jamais une
   case cassée, même règle qu'au dépôt. `decoupe` cadre une face de la
   couverture à plat : l'image déborde du cadre, le CSS choisit le côté. */
function Vue({
  vue,
  onOuvrir,
}: {
  vue: { src: string | null; legende: string; loupe: string; decoupe?: 'droite' | 'gauche' }
  onOuvrir: (loupe: string) => void
}) {
  const classes = ['nu-vue', 'nu-vue--clic']
  if (vue.decoupe) classes.push('nu-vue--decoupe', `nu-vue--${vue.decoupe}`)

  return (
    <figure className="nu-cadre">
      {vue.src ? (
        <button
          type="button"
          className={classes.join(' ')}
          onClick={() => onOuvrir(vue.loupe)}
          aria-label={`Agrandir : ${vue.legende}`}
        >
          {/* <img> plain — next/image est proscrit sur ce dépôt (CLAUDE.md). */}
          <img src={vue.src} alt={vue.legende} loading="lazy" decoding="async" />
          <span className="nu-vue-loupe" aria-hidden="true">
            Agrandir
          </span>
        </button>
      ) : (
        /* Le format du cadre vide vient du CSS (.nu-double .nu-vue--vide) :
           aucune règle de mise en page ne descend dans le JSX. */
        <div className="nu-vue nu-vue--vide">
          <span className="nu-vue-attente">à venir</span>
        </div>
      )}
      <figcaption className="nu-vue-legende">{vue.legende}</figcaption>
    </figure>
  )
}
