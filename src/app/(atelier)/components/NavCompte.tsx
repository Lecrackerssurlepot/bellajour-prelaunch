'use client'

import Link from 'next/link'
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
 * ═══════ POURQUOI L'ICÔNE ARRIVAIT SI TARD (09/09/2026) ═══════
 * MESURÉ sur /magazine en production, avant correction :
 *   HTML reçu 150 ms · DOM interactif 368 ms · page chargée 802 ms
 *   le fetch du statut PART à 881 ms, finit à 1023 ms.
 * La requête ne durait que 142 ms. Ce qui coûtait, c'est qu'elle ne pouvait
 * pas PARTIR : elle attend le montage, donc l'hydratation de React, donc le
 * téléchargement de tout le JS de la page. Le coin compte apparaissait une
 * seconde après le reste, à chaque page. C'est le « des fois ça met du temps
 * à s'afficher » de Mathias.
 *
 * (Ce qu'on avait d'abord cru, et que la mesure a démenti : l'aller-retour
 * vers Supabase Auth. `getUser()` ne touche PAS le réseau quand il n'y a pas
 * de session — supabase-js court-circuite en local. Vérifié en production sur
 * le déploiement : sans cookie 192 ms de médiane, avec un faux cookie 187 ms.
 * Le coût de la route, ~90 ms au-dessus d'une page statique, est celui d'une
 * fonction serveur, pas d'un appel à Supabase.)
 *
 * DEUX RÉPONSES, et elles se complètent :
 *
 * 1. `ouvertAuBuild` — la silhouette neutre entre dans le HTML STATIQUE.
 *    C'est ce que voit, de toute façon, tout visiteur non connecté : autant
 *    la dessiner tout de suite plutôt qu'une seconde plus tard. La valeur
 *    vient de `compteOuvert()`, lu par la page serveur au build.
 *    ⚠️ Elle est OPTIMISTE, jamais autoritaire : `false` au build (les
 *    variables Brevo pas encore posées) ne ferme rien — le fetch ouvrira la
 *    barre au premier chargement, exactement comme avant. C'est l'invariant
 *    de `compteOuvert` : le jour où Mathias pose les variables, l'espace
 *    s'ouvre tout seul, sans redéploiement.
 *
 * 2. La MÉMOIRE — la barre garde la dernière réponse dans `localStorage` et
 *    la peint dès l'hydratation, sans réseau. C'est elle qui rend l'avatar
 *    et « Suivre mon numéro » immédiats pour qui revient ; la silhouette du
 *    point 1 ne connaît personne.
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

/* Ce que le serveur peut affirmer sans connaître personne : l'espace existe,
   et le visiteur n'est pas connecté. Rendu tel quel dans le HTML statique. */
const INCONNU: Statut = {
  ouvert: true,
  connecte: false,
  enCours: 0,
  token: null,
  photo: null,
  initiale: null,
}

export default function NavCompte({ ouvertAuBuild = false }: { ouvertAuBuild?: boolean }) {
  /* Ce qu'on savait en arrivant : peint dès l'hydratation, sans un octet de
     réseau. Le serveur, lui, ne lit pas le stockage — d'où `RIEN_AU_SERVEUR`,
     qui garde le rendu d'hydratation identique au HTML envoyé. */
  const memorise = useSyncExternalStore(RIEN, lireMemoire, RIEN_AU_SERVEUR)
  const [frais, setFrais] = useState<Statut | null>(null)
  const statut = frais ?? memorise ?? (ouvertAuBuild ? INCONNU : null)

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
     proposer. Ne reste ici que le cas où l'espace était fermé au build ET
     que le fetch n'a pas encore répondu. */
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
          560 px). Sur mobile il vivrait au détriment du CTA.
          ⚠️ `prefetch={false}` ici ET sur le jeton du compte : /compte et
          /numero sont des routes DYNAMIQUES (force-dynamic, et /compte
          redirige vers la connexion sans session). Les précharger, c'est
          faire tourner une fonction serveur — et pour /compte, suivre une
          redirection — pour un clic qui n'aura peut-être jamais lieu. La
          navigation côté client, elle, reste acquise. */}
      {suivi ? (
        <Link className="at-nav-suivi" href={suivi.href} prefetch={false}>
          <i className="at-nav-suivi-point" aria-hidden="true" />
          {suivi.mot}
        </Link>
      ) : null}

      <Link
        className={`at-nav-compte${statut.connecte ? ' est-connecte' : ''}`}
        href="/compte"
        prefetch={false}
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
      </Link>
    </span>
  )
}
