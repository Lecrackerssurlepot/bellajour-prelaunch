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

/* L'interligne CSS. Doit rester égal à `line-height` de `.at-cov-vivant` :
   c'est lui qui écarte les lignes, et le calcul ci-dessous s'en sert pour
   savoir si N lignes tiennent. */
const INTERLIGNE = 1.08

type Mesure = { lignes: string[]; taille: number }

/* La taille qui fait tenir `lignes` dans la boîte. On borne par la LARGEUR de
   la ligne la plus large ET par la HAUTEUR peinte : une seule des deux
   suffirait à faire déborder l'autre.

   ⚠️ LA HAUTEUR SE MESURE, ELLE NE SE DEVINE PAS. Le calcul disait d'abord
   `lignes × 1,08 × corps`, en supposant qu'un texte occupe sa hauteur de
   ligne. C'est faux pour un script : Interlope a des hampes et des jambages
   qui DÉPASSENT largement de la boîte de ligne. Tant que la zone du titre
   était petite, ça ne se voyait pas ; en agrandissant celle de « Mon année »
   le 15/09, « Papa » est sorti de son cadre (mesuré : scrollHeight au-delà
   de clientHeight).
   `fontBoundingBoxAscent/Descent` donne la hauteur RÉELLE des glyphes de la
   police, à quoi s'ajoute l'écart des lignes supplémentaires. */
function tailleQuiRemplit(
  lignes: string[],
  ctx: CanvasRenderingContext2D,
  police: string,
  largeurBoite: number,
  hauteurBoite: number,
): number {
  if (lignes.length === 0) return 0
  /* On mesure à 100 px une fois : largeur comme hauteur sont proportionnelles
     au corps, donc une règle de trois suffit et évite une recherche. */
  ctx.font = `100px ${police}`
  const mesures = lignes.map((l) => ctx.measureText(l))
  const largeurMax = Math.max(...mesures.map((m) => m.width))
  if (largeurMax <= 0) return 0

  /* Repli sur 1,2 si le navigateur ne donne pas les métriques : une valeur
     prudente vaut mieux qu'un NaN qui effacerait le titre. */
  const m0 = mesures[0]
  const hautGlyphes100 =
    Number.isFinite(m0.fontBoundingBoxAscent) && Number.isFinite(m0.fontBoundingBoxDescent)
      ? m0.fontBoundingBoxAscent + m0.fontBoundingBoxDescent
      : 120

  const parLargeur = (largeurBoite / largeurMax) * 100
  /* N lignes : (N-1) écarts d'interligne, plus la hauteur réelle des glyphes. */
  const hautTotale100 = (lignes.length - 1) * INTERLIGNE * 100 + hautGlyphes100
  const parHauteur = (hauteurBoite / hautTotale100) * 100
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

      /* ⚠️ 'deux-tons' CHERCHE LES DEUX LIGNES D'ABORD, pas en dernier
         recours. Ce modèle n'est pas « un titre auquel on ajoute une
         couleur » : c'est « THIS » en rouge derrière et « NIGHT » en blanc
         devant, empilés et chevauchés. Le ramener à une ligne blanche parce
         qu'elle tient en largeur, c'est effacer le modèle — et Mathias a
         réservé le blanc seul au cas d'UN SEUL mot, ce qui dit bien qu'à
         partir de deux, les deux tons jouent. */
      const cherche2 = modele.disposition === 'deux-tons' || taille < reference * PLANCHER
      if (cherche2) {
        const deux = decouperEnLignes(titre, largeurDe)
        if (deux.length > 1) {
          const t2 = tailleQuiRemplit(deux, ctx, famille, width, height)
          if (modele.disposition === 'deux-tons' || t2 > taille) { lignes = deux; taille = t2 }
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
  }, [modele.titreOrigine, modele.disposition, titre, policeVar])

  /* ── LES TROIS DISPOSITIONS ────────────────────────────────────────────
     Les quatre maquettes ne posent pas leur lettrage de la même façon, et
     les traiter pareil reviendrait à coller quatre fois le même bloc de
     texte sur quatre images différentes. */
  const rendu = (z: typeof modele.zone, cle: string) => (
    <span
      key={cle}
      ref={cle === 'principale' ? boite : undefined}
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
      {mesure?.lignes.map((l, i) => (
        <span
          key={i}
          style={
            /* 'deux-tons' : la première ligne prend l'accent, la seconde la
               couleur du titre — « THIS » en rouge derrière, « NIGHT » en
               blanc devant. Sur UN SEUL mot, `couleurSeule` s'applique :
               « quand il n'y a qu'un seul mot, garde le blanc » (Mathias,
               15/09). C'est pour ça que le test porte sur `lignes.length`
               et pas sur l'index. */
            modele.disposition === 'deux-tons' && mesure.lignes.length > 1 && i === 0
              ? { color: modele.couleurAccent }
              : modele.disposition === 'deux-tons' && mesure.lignes.length === 1
                ? { color: modele.couleurSeule }
                : undefined
          }
        >
          {l}
        </span>
      ))}
    </span>
  )

  /* 'haut-et-bas' : le titre DEUX FOIS. La maquette de Sicile répète le mot
     autour de la photo ; les deux bandes pleines sont mesurées, les deux du
     milieu sont masquées par la photo et ne se reproduisent pas ici (voir
     `zoneBis` dans coverModels.ts). */
  if (modele.disposition === 'haut-et-bas' && modele.zoneBis) {
    return <>{rendu(modele.zone, 'principale')}{rendu(modele.zoneBis, 'bis')}</>
  }

  return rendu(modele.zone, 'principale')
}
