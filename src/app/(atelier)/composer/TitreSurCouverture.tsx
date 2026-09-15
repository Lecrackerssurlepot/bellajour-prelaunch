'use client'

/**
 * Le titre du client, écrit EN DIRECT sur une plaque de couverture nue.
 *
 * Posé le 15/09/2026 : « utilise Interlope pour Aussie et 26 en attendant. »
 * Seuls ces deux modèles-là l'utilisent ; les deux autres attendent leur
 * police et continuent d'afficher leur lettrage d'origine.
 *
 * ── CE QU'IL FAIT, ET POURQUOI C'EST FAIT AINSI ────────────────────────────
 *
 * ON CONSERVE LA MASSE, PAS LA TAILLE. Ce qui fait tenir ces compositions,
 * ce n'est pas le corps de la police : c'est la SURFACE que le lettrage
 * occupe et son équilibre avec la photo. Le titre garde donc la boîte
 * MESURÉE sur les visuels livrés (`modele.zone`, en % de la couverture), et
 * la taille de police devient simplement ce qui la remplit. Un titre long en
 * deux lignes plus petites pèse le même poids visuel qu'un titre court en une
 * ligne plus grande.
 *
 * LA RÉFÉRENCE EST LE MOT D'ORIGINE. Le plancher et le plafond ne sont pas
 * des pixels choisis à la main : on calcule d'abord la taille à laquelle le
 * mot du graphiste (« Aussie », « 26 ») remplit la boîte, et c'est ELLE qui
 * sert de mètre. Le titre du client ne descend pas sous 55 % de cette taille
 * ni ne dépasse 7/6 — sinon « Papa » deviendrait une affiche et « Le mariage
 * de Léa et Tom » un murmure.
 *
 * ⚠️ ON MESURE, ON NE COMPTE PAS. « MMMMM » et « iiiii » ont cinq caractères
 * chacun et pas la même largeur. Tout passe par `measureText` sur un canvas,
 * dans la vraie police.
 *
 * ⚠️ IL FAUT ATTENDRE `document.fonts.load`. Mesurer avant que la police soit
 * arrivée, c'est mesurer la police de repli : le titre se pose alors à une
 * taille fausse et n'y revient jamais. D'où l'effet qui remesure quand la
 * police est prête.
 *
 * ⚠️ ET IL FAUT REMESURER QUAND LA VIGNETTE CHANGE DE TAILLE. Tout est en %
 * de la couverture, mais `measureText` travaille en pixels : la taille
 * calculée à 110 px de large est fausse à 300. Un ResizeObserver la refait.
 */

import { useEffect, useRef, useState } from 'react'
import type { CoverModel } from './coverModels'
import { decouperEnLignes } from './decoupeTitre'

/* Part de la taille de référence qu'on s'autorise à franchir. Le plancher est
   bas volontairement : au-dessous, la découpe en deux lignes a déjà joué et
   il ne reste qu'à assumer un titre long. */
const PLANCHER = 0.55
const PLAFOND = 7 / 6

/* Combien de fois la hauteur de ligne dépasse le corps, pour un script.
   Sert à savoir si N lignes tiennent dans la hauteur de la boîte. */
const INTERLIGNE = 1.08

type Mesure = { lignes: string[]; taille: number }

/* La taille qui fait tenir `lignes` dans la boîte. On borne par la LARGEUR de
   la ligne la plus large ET par la HAUTEUR totale : une seule des deux
   suffirait à faire déborder l'autre. */
function tailleQuiRemplit(
  lignes: string[],
  ctx: CanvasRenderingContext2D,
  police: string,
  largeurBoite: number,
  hauteurBoite: number,
): number {
  if (lignes.length === 0) return 0
  /* On mesure à 100 px une fois : la largeur d'un texte est proportionnelle
     au corps, donc une règle de trois suffit et évite une recherche. */
  ctx.font = `100px ${police}`
  const largeurMax = Math.max(...lignes.map((l) => ctx.measureText(l).width))
  if (largeurMax <= 0) return 0
  const parLargeur = (largeurBoite / largeurMax) * 100
  const parHauteur = hauteurBoite / (lignes.length * INTERLIGNE)
  return Math.min(parLargeur, parHauteur)
}

export default function TitreSurCouverture({
  modele, titre, policeVar,
}: {
  modele: CoverModel
  titre: string
  /* Le NOM d'une variable CSS (« --font-interlope »), pas une famille.
     next/font hache le nom de famille : il n'existe qu'à travers la
     variable, et `measureText` ne résout pas `var(...)`. On lit donc la
     valeur CALCULÉE de la variable sur l'élément avant de mesurer. */
  policeVar: string
}) {
  const boite = useRef<HTMLSpanElement>(null)
  const [mesure, setMesure] = useState<Mesure | null>(null)

  useEffect(() => {
    const el = boite.current
    if (!el) return

    let vivant = true
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    /* La famille réelle, telle que le navigateur l'a résolue. Vide si la
       variable n'est pas dans la portée : on ne mesure pas plutôt que de
       mesurer la mauvaise police. */
    const famille = getComputedStyle(el).getPropertyValue(policeVar).trim()
    if (!famille) return

    const calculer = () => {
      if (!vivant) return
      const { width, height } = el.getBoundingClientRect()
      if (width < 1 || height < 1) return

      /* Le mètre : la taille à laquelle le mot du graphiste remplit la boîte. */
      const reference = tailleQuiRemplit([modele.titreOrigine], ctx, famille, width, height)

      ctx.font = `100px ${famille}`
      const largeurDe = (s: string) => ctx.measureText(s).width

      /* Une ligne d'abord. Si elle oblige à descendre sous le plancher, on
         essaie deux lignes équilibrées — et on ne garde le découpage que s'il
         donne vraiment plus grand. Sur un titre d'un seul mot, il n'y a rien
         à découper : la taille descend, et c'est la bonne réponse. */
      const uneLigne = [titre.trim()].filter(Boolean)
      if (uneLigne.length === 0) { setMesure(null); return }

      let lignes = uneLigne
      let taille = tailleQuiRemplit(lignes, ctx, famille, width, height)

      if (taille < reference * PLANCHER) {
        const deux = decouperEnLignes(titre, largeurDe)
        if (deux.length > 1) {
          const t2 = tailleQuiRemplit(deux, ctx, famille, width, height)
          if (t2 > taille) { lignes = deux; taille = t2 }
        }
      }

      /* Le plafond seulement : un titre court ne doit pas devenir une affiche.
         PAS de plancher appliqué ici — le borner vers le bas ferait déborder
         un titre long hors de la boîte, c'est-à-dire hors de la couverture.
         Le plancher sert à DÉCIDER de passer à deux lignes, pas à contraindre
         le résultat. (Piège : on l'avait d'abord posé en Math.max, et
         « Le mariage de Léa et Tom » sortait du cadre par la droite.) */
      const finale = Math.min(taille, reference * PLAFOND)

      setMesure({ lignes, taille: finale })
    }

    calculer()

    /* La police d'abord — mesurer avant son arrivée mesure le repli. */
    document.fonts.load(`100px ${famille}`).then(calculer).catch(() => {})

    const ro = new ResizeObserver(calculer)
    ro.observe(el)
    return () => { vivant = false; ro.disconnect() }
  }, [modele.titreOrigine, titre, policeVar])

  const z = modele.zone

  return (
    <span
      ref={boite}
      className="at-cov-vivant"
      aria-hidden="true"
      style={{
        left: `${z.gauche}%`,
        width: `${z.droite - z.gauche}%`,
        top: `${z.haut}%`,
        height: `${z.bas - z.haut}%`,
        fontFamily: `var(${policeVar})`,
        fontSize: mesure ? `${mesure.taille}px` : undefined,
        color: modele.couleurTitre ?? undefined,
        /* Tant que la mesure n'est pas faite, rien ne s'affiche : un titre
           peint à la mauvaise taille puis corrigé se voit sauter. */
        visibility: mesure ? undefined : 'hidden',
      }}
    >
      {mesure?.lignes.map((l, i) => <span key={i}>{l}</span>)}
    </span>
  )
}
