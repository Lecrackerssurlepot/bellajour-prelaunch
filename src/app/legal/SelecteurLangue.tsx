'use client'

import { useSyncExternalStore } from 'react'
import { isValidRefCode } from '@/lib/validation'
import { LOCALES, LOCALE_LABEL, type Locale, type LocalizedDoc } from './types'
import { legalHref } from './resolve'

/**
 * Le sélecteur de langue des pages légales — FR · EN · PT.
 *
 * ⚠️ POURQUOI IL EST CLIENT (09/09/2026, audit de vitesse). Il l'est pour UNE
 * seule raison : préserver `?ref=` d'une langue à l'autre. C'était la dernière
 * chose qui obligeait les douze routes légales à lire `searchParams`, et donc
 * à être rendues à CHAQUE visite — 212 ms de réponse contre 77 pour une page
 * figée, pour quatre documents qui ne changent jamais.
 *
 * Le serveur rend les liens NUS, ce qui suffit à figer la page. Le client lit
 * l'adresse et rajoute le code parrain s'il y en a un de valide. Une personne
 * sans JavaScript garde des liens de langue qui marchent : elle perd seulement
 * un code de parrainage que rien, aujourd'hui, ne met dans ces adresses — le
 * `?ref=` des pages légales est un reste de la prévente retirée le 28/08, et
 * aucun lien du site ni aucun mail n'en propage plus. On le garde par
 * prudence, pas par usage.
 *
 * `useSyncExternalStore` et pas un setState d'hydratation (règle maison, voir
 * `draftEnCours` et `RetourLien`) : le serveur répond « pas de ref », le client
 * la vérité, et React réconcilie sans clignoter. L'instantané est une chaîne ou
 * `null` — une valeur primitive, donc stable d'un appel à l'autre.
 */

const RIEN = () => () => {}
const PAS_DE_REF = () => null

function refCourant(): string | null {
  try {
    const brut = new URLSearchParams(window.location.search).get('ref')?.trim()
    return brut && isValidRefCode(brut) ? brut : null
  } catch {
    return null
  }
}

export default function SelecteurLangue({
  slug,
  doc,
  lang,
}: {
  slug: string
  doc: LocalizedDoc
  /* La langue SERVIE (celle que `resolveDoc` a retenue), pas la demandée. */
  lang: Locale
}) {
  const ref = useSyncExternalStore(RIEN, refCourant, PAS_DE_REF)

  return (
    <nav className="lg-langs" aria-label="Langue du document">
      {LOCALES.map((loc) => {
        const available = Boolean(doc[loc])
        const current = loc === lang
        if (!available) {
          return (
            <span key={loc} className="lg-lang lg-lang--off" aria-disabled="true">
              {LOCALE_LABEL[loc]}
            </span>
          )
        }
        return (
          <a
            key={loc}
            href={legalHref(slug, loc, ref)}
            className={`lg-lang${current ? ' lg-lang--current' : ''}`}
            aria-current={current ? 'true' : undefined}
          >
            {LOCALE_LABEL[loc]}
          </a>
        )
      })}
    </nav>
  )
}
