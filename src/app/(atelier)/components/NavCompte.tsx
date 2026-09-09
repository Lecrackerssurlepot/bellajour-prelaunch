'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * Le coin compte de la barre — la signature du « je suis connectée », et le
 * raccourci vers ce qui est en fabrication.
 *
 * Les cookies de session sont httpOnly : un composant client ne peut pas
 * les lire, et les pages / et /magazine sont STATIQUES — la vérité vient
 * donc d'un fetch unique vers /api/compte/statut après le montage. Le
 * serveur rend l'icône neutre (l'état de départ), le client complète.
 *
 * TROIS RÈGLES DE MATHIAS (04/09), et elles se voient dans le rendu :
 * 1. Le CTA marketing ne disparaît JAMAIS. Ce qui suit s'AJOUTE à côté.
 * 2. Sur MOBILE, la barre ne porte QUE le compte — pas de raccourci de
 *    suivi : il vit dans la page compte, où il y a la place de le dire.
 * 3. Connectée, l'icône devient sa PHOTO Google (ou son initiale) : c'est
 *    à ça qu'on voit qu'on est chez soi.
 *
 * Et le raccourci ne devine rien : un seul numéro en cours, il y mène ;
 * plusieurs, il dit « Mes numéros » et ouvre le compte.
 *
 * ═══════ POURQUOI IL Y A UNE MÉMOIRE (09/09/2026, chantier lenteur) ═══════
 * La chaîne complète, avant : le HTML arrive → le JS se télécharge → React
 * hydrate → ALORS SEULEMENT le fetch part → le serveur interroge Supabase
 * Auth, puis la base. Le coin compte apparaissait donc bien après le reste
 * de la page, et à CHAQUE page. C'est ce que Mathias décrit : « des fois ça
 * met du temps à s'afficher ».
 *
 * Deux réponses, et il fallait les deux :
 * - la requête a maigri (garde du cookie + lecture allégée, côté serveur) ;
 * - la barre GARDE la dernière réponse dans `localStorage` et la peint
 *   IMMÉDIATEMENT au premier rendu, avant tout réseau : dès la deuxième
 *   page, le coin compte est là en même temps que le reste. Le fetch part
 *   quand même et corrige si quelque chose a changé.
 *
 * (Ce qu'on a CRU corriger et qui n'existait pas : le CTA ne saute pas quand
 * l'icône arrive. `.at-nav` est en space-between, la droite de la barre est
 * ancrée à droite, et le coin compte grandit vers la gauche — mesuré le
 * 09/09. Le seul défaut était le retard, pas un déplacement.)
 *
 * La mémoire ne porte que ce que la barre affiche déjà — un token, une
 * photo, une initiale. Rien qu'un regard par-dessus l'épaule ne verrait
 * pas sur l'écran, et elle s'efface à la déconnexion
 * (`oublierStatutCompte`). Elle ne fait JAMAIS foi : aucune page, aucune
 * route ne s'y fie — la session reste httpOnly et vérifiée côté serveur.
 */

type Statut = {
  ouvert: boolean
  connecte: boolean
  enCours: number
  token: string | null
  photo: string | null
  initiale: string | null
}

const CLE = 'bj-compte-statut'

/* ⚠️ `useSyncExternalStore` veut un instantané STABLE : appelé deux fois de
   suite sans notification, `lireMemoire` DOIT rendre la même référence,
   sinon React boucle. D'où la lecture UNE SEULE FOIS, gelée en mémoire du
   module (`undefined` = pas encore lu, `null` = rien de mémorisé) — et
   surtout : rien ne la modifie ensuite. La réponse fraîche du réseau vit
   dans un `useState`, jamais ici. Ce qu'on a su en arrivant ne change plus
   de la vie de la page ; la page suivante relira le stockage. */
let memoire: Statut | null | undefined

function lireMemoire(): Statut | null {
  if (memoire === undefined) {
    memoire = null
    try {
      const brut = localStorage.getItem(CLE)
      if (brut) {
        const v = JSON.parse(brut) as Statut
        if (v && typeof v === 'object' && typeof v.ouvert === 'boolean') memoire = v
      }
    } catch {
      /* Stockage refusé (navigation privée, réglages) : on vit sans. */
    }
  }
  return memoire
}

function ecrireMemoire(s: Statut) {
  try {
    localStorage.setItem(CLE, JSON.stringify(s))
  } catch {
    /* La mémoire est un confort, jamais une dépendance. */
  }
}

/** À la déconnexion — sinon la barre repeindrait l'avatar de la sortante. */
export function oublierStatutCompte() {
  try {
    localStorage.removeItem(CLE)
  } catch {
    /* rien à oublier */
  }
}

const RIEN = () => () => {}
const RIEN_AU_SERVEUR = () => null

export default function NavCompte() {
  /* Ce qu'on savait en arrivant : peint au premier rendu, sans un octet de
     réseau. Le serveur, lui, ne sait rien — d'où `RIEN_AU_SERVEUR`, qui
     garde l'hydratation identique au HTML envoyé. */
  const memorise = useSyncExternalStore(RIEN, lireMemoire, RIEN_AU_SERVEUR)
  const [frais, setFrais] = useState<Statut | null>(null)
  const statut = frais ?? memorise

  useEffect(() => {
    let vivant = true
    fetch('/api/compte/statut', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Statut>) : null))
      .then((s) => {
        if (!vivant || !s) return
        ecrireMemoire(s)
        setFrais(s)
      })
      .catch(() => {
        /* La barre ne casse jamais une page : sans réponse, on garde ce
           qu'on avait — la mémoire, ou la place réservée. */
      })
    return () => {
      vivant = false
    }
  }, [])

  /* ⚠️ Tant que rien n'a dit « ouvert », la barre ne montre AUCUNE entrée de
     compte : proposer une porte qui ne s'ouvre pas est pire que ne rien
     proposer. Dès la deuxième page ce cas ne se présente plus — la mémoire
     ci-dessus a déjà la réponse. */
  if (!statut?.ouvert) return <span className="at-nav-perso at-nav-perso--vide" />

  const suivi =
    statut.enCours > 0
      ? statut.enCours === 1 && statut.token
        ? { href: `/numero/${statut.token}`, mot: 'Suivre mon numéro' }
        : { href: '/compte', mot: 'Mes numéros' }
      : null

  return (
    <span className="at-nav-perso">
      {/* Le raccourci de suivi : DESKTOP UNIQUEMENT (nav.css le masque sous
          560 px). Sur mobile il vivrait au détriment du CTA. */}
      {suivi ? (
        <a className="at-nav-suivi" href={suivi.href}>
          <i className="at-nav-suivi-point" aria-hidden="true" />
          {suivi.mot}
        </a>
      ) : null}

      <a
        className={`at-nav-compte${statut.connecte ? ' est-connecte' : ''}`}
        href="/compte"
        aria-label={statut.connecte ? 'Mon compte, connectée' : 'Mon compte'}
      >
        {statut.photo ? (
          <img className="at-nav-avatar" src={statut.photo} alt="" width={28} height={28} />
        ) : statut.connecte && statut.initiale ? (
          <span className="at-nav-initiale" aria-hidden="true">
            {statut.initiale}
          </span>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
            <circle cx="12" cy="8.2" r="3.4" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M4.8 19.4c1.4-3.1 4.1-4.7 7.2-4.7s5.8 1.6 7.2 4.7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        )}
      </a>
    </span>
  )
}
