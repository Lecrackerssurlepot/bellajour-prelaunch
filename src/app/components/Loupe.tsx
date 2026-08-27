'use client'

/**
 * La loupe — regarder un visuel en grand, et passer au suivant.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE COMPOSANT EXISTE
 *
 * Recette du 25/08 : « quand il voit les couvertures et la double page, il
 * doit pouvoir les voir en grand en cliquant dessus. Là on ne sait pas ce qui
 * correspond à quoi. » Deux manques dans la même phrase : pas d'agrandissement,
 * et pas de nom sous les images.
 *
 * Le second se règle avec une légende. Le premier demande une vue plein écran,
 * et surtout de POUVOIR PASSER DE L'UNE À L'AUTRE : c'est en enchaînant
 * couverture puis quatrième qu'on comprend qu'il s'agit des deux faces du même
 * objet. Un simple agrandissement isolé n'aurait pas répondu à la remarque.
 *
 * Un seul composant sert les deux écrans (la page de la cliente, en charte
 * sombre, et la fiche de l'admin, en charte claire) parce que la logique
 * délicate n'est pas le décor : c'est l'échappement au clavier, le retour du
 * focus là où on l'avait pris, et le blocage du défilement derrière. L'écrire
 * deux fois, c'est le réparer une fois sur deux.
 *
 * D'où ses couleurs propres, déclarées sur `.bj-loupe` dans loupe.css : ni les
 * tokens `--c-*` de l'atelier ni les `--bj-*` de l'admin, puisqu'il vit dans
 * les deux. Une loupe est un fond noir dans les deux chartes.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef } from 'react'
import './loupe.css'

export type VueLoupe = { src: string; legende: string }

export default function Loupe({
  vues,
  index,
  onIndex,
  onFermer,
}: {
  vues: VueLoupe[]
  /** `null` = fermée. Le parent tient l'état : la loupe ne s'ouvre jamais seule. */
  index: number | null
  onIndex: (i: number) => void
  onFermer: () => void
}) {
  const fermeture = useRef<HTMLButtonElement>(null)
  /* Là où le focus était avant l'ouverture. Le rendre est ce qui distingue
     une vue modale d'une trappe : sans ça, on rouvre la page au tout début. */
  const focusAvant = useRef<Element | null>(null)

  const ouverte = index !== null && index >= 0 && index < vues.length

  const bouger = useCallback(
    (pas: number) => {
      if (index === null) return
      /* Cyclique : on tourne l'objet, on ne bute pas contre un bord. */
      onIndex((index + pas + vues.length) % vues.length)
    },
    [index, onIndex, vues.length],
  )

  /* Les callbacks passent par une ref, et l'effet ne depend plus QUE de
     `ouverte`. Avant, ses dependances etaient [ouverte, bouger, onFermer] :
     `bouger` change des que `index` change, et `onFermer` est une fleche
     ECRITE EN LIGNE aux deux sites d'appel (numero/Apercu.tsx et
     admin/Fiche.tsx), donc une nouvelle fonction a chaque rendu du parent.
     L'effet se demontait et se remontait a chaque rendu, loupe ouverte :
     l'ecouteur clavier tournait a vide, et surtout le focus faisait
     l'aller-retour (restauration sur l'element precedent, puis retour sur
     Fermer) a CHAQUE fois. Cote admin c'est visible : la fiche vit sous un
     rafraichissement toutes les 60 s et un tic de rendu toutes les 30 s. */
  const rappels = useRef({ onFermer, bouger })
  /* Mise a jour dans un effet SANS tableau de dependances : il tourne apres
     chaque rendu, donc la ref reste fraiche, et on n'ecrit jamais pendant le
     rendu (ce que `react-hooks/refs` interdit, a raison : reactCompiler est
     actif dans next.config.ts). */
  useEffect(() => {
    rappels.current = { onFermer, bouger }
  })

  useEffect(() => {
    if (!ouverte) return

    focusAvant.current = document.activeElement
    fermeture.current?.focus()

    /* Le fond ne doit pas défiler pendant qu'on regarde : sur mobile, un
       glissement vertical déplacerait la page sous la loupe et on la
       retrouverait ailleurs en refermant. */
    const avant = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function auClavier(e: KeyboardEvent) {
      if (e.key === 'Escape') rappels.current.onFermer()
      else if (e.key === 'ArrowRight') rappels.current.bouger(1)
      else if (e.key === 'ArrowLeft') rappels.current.bouger(-1)
    }
    window.addEventListener('keydown', auClavier)

    return () => {
      window.removeEventListener('keydown', auClavier)
      document.body.style.overflow = avant
      const cible = focusAvant.current
      if (cible instanceof HTMLElement) cible.focus()
    }
  }, [ouverte])

  if (!ouverte) return null

  const vue = vues[index]
  const plusieurs = vues.length > 1

  return (
    <div
      className="bj-loupe"
      role="dialog"
      aria-modal="true"
      aria-label={vue.legende}
      /* Le fond ferme, l'image non : on compare la cible au conteneur plutôt
         que d'arrêter la propagation, ce qui casserait les boutons dedans. */
      onClick={(e) => {
        if (e.target === e.currentTarget) onFermer()
      }}
    >
      <button
        ref={fermeture}
        type="button"
        className="bj-loupe-fermer"
        onClick={onFermer}
        aria-label="Fermer"
      >
        ×
      </button>

      {plusieurs ? (
        <button
          type="button"
          className="bj-loupe-nav bj-loupe-nav--prec"
          onClick={() => bouger(-1)}
          aria-label="Visuel précédent"
        >
          ‹
        </button>
      ) : null}

      <figure className="bj-loupe-scene">
        {/* <img> plain — next/image est proscrit sur ce dépôt (CLAUDE.md). */}
        <img src={vue.src} alt={vue.legende} />
        <figcaption className="bj-loupe-legende">
          {vue.legende}
          {plusieurs ? <span className="bj-loupe-rang">{`${index + 1} / ${vues.length}`}</span> : null}
        </figcaption>
      </figure>

      {plusieurs ? (
        <button
          type="button"
          className="bj-loupe-nav bj-loupe-nav--suiv"
          onClick={() => bouger(1)}
          aria-label="Visuel suivant"
        >
          ›
        </button>
      ) : null}
    </div>
  )
}
