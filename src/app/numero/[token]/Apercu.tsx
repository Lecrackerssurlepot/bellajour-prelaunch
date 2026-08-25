'use client'

/**
 * Les trois visuels de l'état 2, sur la page de la cliente.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QUI A CHANGÉ, ET POURQUOI
 *
 * Avant, la légende n'existait QUE sur le cadre vide : dès qu'il y avait une
 * image, plus un mot. La cliente voyait trois rectangles sans savoir lequel
 * était la couverture, lequel le dos, lequel une page intérieure. C'est la
 * page qui vend, et elle ne nommait pas ce qu'elle montrait.
 *
 * Maintenant la légende est SOUS chaque visuel, toujours, image ou pas, et le
 * visuel s'ouvre en grand — d'où l'on passe de l'un à l'autre, ce qui est la
 * seule façon de comprendre que la couverture et la quatrième sont les deux
 * faces du même objet.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Composant client : la page /numero est un composant serveur, et l'ouverture
 * de la loupe est le troisième et dernier morceau interactif de cette page.
 */

import { useState } from 'react'
import Reveal from '../../(atelier)/components/Reveal'
import Loupe, { type VueLoupe } from '../../components/Loupe'

export default function Apercu({
  c1,
  c4,
  double,
}: {
  c1: string | null
  c4: string | null
  double: string | null
}) {
  const [ouvert, setOuvert] = useState<number | null>(null)

  /* Les mots de la cliente, pas les nôtres : « C1 » et « C4 » sont du jargon
     d'imprimeur. Le même vocabulaire est repris dans la fiche de l'atelier —
     deux personnes qui regardent le même visuel doivent le nommer pareil. */
  const declares: Array<{ src: string | null; legende: string }> = [
    { src: c1, legende: 'La couverture' },
    { src: c4, legende: 'La quatrième' },
    { src: double, legende: 'Une double page' },
  ]

  /* La loupe ne connaît que ce qui existe : un cadre vide n'est pas une étape
     de la visite. Les index de la loupe ne sont donc PAS ceux de la grille. */
  const agrandissables: VueLoupe[] = declares
    .filter((v): v is VueLoupe => Boolean(v.src))
    .map((v) => ({ src: v.src, legende: v.legende }))

  function ouvrir(legende: string) {
    const i = agrandissables.findIndex((v) => v.legende === legende)
    if (i >= 0) setOuvert(i)
  }

  const [couverture, quatrieme, doublePage] = declares

  return (
    <>
      <Reveal>
        <div className="nu-covers">
          <Vue vue={couverture} onOuvrir={ouvrir} />
          <Vue vue={quatrieme} onOuvrir={ouvrir} />
        </div>
        <div className="nu-double">
          <Vue vue={doublePage} onOuvrir={ouvrir} />
        </div>
      </Reveal>

      {/* Hors du Reveal : une vue plein écran ne doit dépendre d'aucune
          enveloppe animée pour se positionner. */}
      <Loupe vues={agrandissables} index={ouvert} onIndex={setOuvert} onFermer={() => setOuvert(null)} />
    </>
  )
}

/* Une vue d'aperçu. Sans image, un cadre de la charte et un mot — jamais une
   case cassée, même règle qu'au dépôt. */
function Vue({
  vue,
  onOuvrir,
}: {
  vue: { src: string | null; legende: string }
  onOuvrir: (legende: string) => void
}) {
  return (
    <figure className="nu-cadre">
      {vue.src ? (
        <button
          type="button"
          className="nu-vue nu-vue--clic"
          onClick={() => onOuvrir(vue.legende)}
          aria-label={`Agrandir : ${vue.legende}`}
        >
          {/* <img> plain — next/image est proscrit sur ce dépôt (CLAUDE.md). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
