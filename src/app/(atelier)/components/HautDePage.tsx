'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * REMETTRE LA PAGE EN HAUT À CHAQUE CHANGEMENT DE PAGE.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE COMPOSANT EXISTE (11/09/2026, défaut vu par Mathias)
 *
 * Depuis le passage aux liens sans rechargement (09/09), passer de l'accueil
 * à `/magazine` gardait la position de défilement : on arrivait au milieu de
 * la page produit. Mesuré en production avant correction : défilement à
 * 1137 px sur l'accueil, clic sur « Découvrir les magazines », l'adresse
 * devient `/magazine` et `scrollY` vaut toujours 1137, cinq secondes plus
 * tard encore. Le défaut vaut dans les deux sens.
 *
 * Next remet normalement la page en haut de lui-même ; il ne le fait pas ici,
 * et aucun lien du site ne demande `scroll={false}`. Plutôt que de deviner
 * lequel de nos écrans plein cadre l'en empêche, on pose le geste nous-mêmes,
 * une fois, au bon endroit : c'est une ligne de comportement, pas un
 * contournement d'un défaut qu'on n'aurait pas compris.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * TROIS CAS OÙ L'ON NE TOUCHE À RIEN, et ce sont eux qui comptent :
 *   1. le PREMIER rendu (arrivée directe sur une adresse) : le navigateur
 *      place déjà la page, et une ancre `#fiche-produit` doit survivre ;
 *   2. une adresse qui porte une ANCRE : c'est elle qui commande ;
 *   3. le RETOUR ARRIÈRE : le navigateur restaure la position de la page
 *      qu'on quitte, et l'écraser ferait perdre l'endroit qu'on relisait.
 *      Le drapeau est posé par `popstate`, avant que le chemin ne change.
 *
 * ⚠️ `/composer` a son PROPRE défilement (`.at-q-scroll`, six écrans dans une
 * seule adresse) et remet lui-même son conteneur en haut à chaque écran : ce
 * composant n'a rien à y faire, mais il ne gêne pas non plus (la fenêtre y est
 * fixe). On ne l'exclut donc pas par une liste d'adresses, qui vieillirait mal.
 */
export default function HautDePage() {
  const chemin = usePathname()
  const premier = useRef(true)
  const versLePasse = useRef(false)

  useEffect(() => {
    const enArriere = () => {
      versLePasse.current = true
    }
    window.addEventListener('popstate', enArriere)
    return () => window.removeEventListener('popstate', enArriere)
  }, [])

  useEffect(() => {
    if (premier.current) {
      premier.current = false
      return
    }
    if (versLePasse.current) {
      versLePasse.current = false
      return
    }
    if (window.location.hash) return
    /* `instant` et pas `smooth` : une page qui défile toute seule sur trois
       mille pixels après un clic donne le mal de mer, et `scroll-behavior`
       du document ne doit pas s'en mêler. */
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [chemin])

  return null
}
