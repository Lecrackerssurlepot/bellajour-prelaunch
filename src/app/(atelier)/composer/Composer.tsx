'use client'

/* Le questionnaire — 6 écrans, une question par écran (PRD §7.2).
   Aucun compte, retour possible, persistance localStorage à chaque écran.

   L'écriture en base a lieu UNE SEULE FOIS, à la fin de l'écran 4 : la présence
   d'un token dans le brouillon signifie « le dossier existe », on ne le recrée
   jamais, même si la cliente revient en arrière puis ré-avance. */

import { useCallback, useEffect, useRef, useState } from 'react'
import Screen1Occasion from './screens/Screen1Occasion'
import Screen2Histoire from './screens/Screen2Histoire'
import Screen3Titre from './screens/Screen3Titre'
import Screen4Contact from './screens/Screen4Contact'
import Screen5Depot from './screens/Screen5Depot'
import Screen6Fin from './screens/Screen6Fin'
import { EMPTY_DRAFT, loadDraft, saveDraft, type Draft } from './draft'
import { isValidNumeroToken } from '@/lib/atelier/tokenForme'
import {
  CHAMPS_PAR_ECRAN,
  CHAMPS_QUESTIONNAIRE,
  MESSAGE_DU_CHAMP,
  ecranDuChamp,
  premierManquant,
  type ChampQuestionnaire,
} from '@/lib/atelier/questionnaire'
import './composer.css'

const TOTAL = 6

export default function Composer() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pret, setPret] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  /* T-051 — la clé qui force la ré-annonce. Deuxième clic, même erreur :
     la MÊME chaîne ne re-rend pas le <p role="alert">, et le lecteur d'écran
     ne dit rien — on conclut que le bouton est cassé. La clé change à chaque
     refus, React remonte l'élément, l'alerte repart. */
  const [erreurCle, setErreurCle] = useState(0)
  /* T2-4 — vrai quand on est arrivé par `?reprendre=` : l'écran 5 doit dire
     que des photos sont DÉJÀ chez nous, sinon il ressemble à un premier
     dépôt et laisse croire qu'il faut tout recommencer. */
  const [reprise, setReprise] = useState(false)
  /* T-058 — un `?reprendre=` PRÉSENT mais illisible (un client mail qui coupe
     l'URL à 32 caractères suffit). Poursuivre en silence renvoyait la cliente
     à l'écran 1 : elle refaisait tout, et `creerNumero` fabriquait un SECOND
     dossier — deux demandes, deux M0, et personne ne sait lequel porte ses
     photos. On s'arrête et on le dit. */
  const [lienAbime, setLienAbime] = useState(false)
  /* Le compte réellement parti, remonté par l'écran 5 au moment de l'envoi.
     Il ne vit PAS dans le brouillon : un brouillon terminé est effacé
     (loadDraft), et ce chiffre n'a de sens que sur l'écran 6 de CETTE
     session. À zéro, l'écran de fin dit la même chose sans le nombre. */
  const [photosEnvoyees, setPhotosEnvoyees] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)

  /* Reprise au montage — jamais pendant le rendu serveur, sinon l'HTML
     livré et l'HTML hydraté divergent.

     `?reprendre=<token>` est le bouton « Ajouter des photos » de l'état 1b :
     l'atelier a jugé le dépôt trop maigre, la cliente revient depuis sa page
     d'état. On la repose directement à l'écran 5, sur SON dossier — le token
     de l'URL prime sur celui du brouillon, qui peut appartenir à un numéro
     plus ancien composé depuis le même téléphone.

     Limite assumée : les photos déjà déposées ne se recomptent que si le
     dépôt reprend sur le même appareil (la file vit en IndexedDB, clé par
     token). Depuis un autre téléphone, le compteur repart de zéro à l'écran
     tandis que nb_photos, lui, est recalculé en base à chaque envoi. */
  useEffect(() => {
    const repris = loadDraft()
    const reprendre = new URLSearchParams(window.location.search).get('reprendre')
    const estReprise = Boolean(reprendre && isValidNumeroToken(reprendre))
    /* T-058 — le paramètre est là mais sa forme est fausse : le lien a été
       coupé en route. On n'avance PAS (`pret` reste faux, donc le brouillon
       local n'est jamais réécrit) : avancer, c'était créer un doublon en bout
       de course. */
    if (reprendre !== null && !estReprise) {
      setLienAbime(true)
      return
    }
    setDraft(estReprise ? { ...repris, token: reprendre, screen: 5 } : repris)
    setReprise(estReprise)
    setPret(true)
  }, [])

  /* Sauvegarde à chaque changement, une fois la reprise faite. */
  useEffect(() => {
    if (pret) saveDraft(draft)
  }, [draft, pret])

  const patch = useCallback((p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }))
  }, [])

  const signalerErreur = useCallback((texte: string) => {
    setErreur(texte)
    setErreurCle((c) => c + 1)
  }, [])

  /* ── T-051 : CHAQUE CHANGEMENT D'ÉCRAN A UN POINT DE FOCUS ─────────────
     Le changement d'écran remonte tout le sous-arbre : sans ça, le focus
     retombait sur <body> sans un mot, et l'écran 6 — celui qui dit que les
     photos sont parties — n'était jamais énoncé. Le titre de l'écran atteint
     prend le focus (tabindex -1 : atteignable au code, pas au Tab), donc le
     lecteur d'écran le lit, et le clavier repart du haut de l'écran.
     Jamais au premier rendu : on ne vole pas le focus à qui arrive. */
  const ecranPrecedent = useRef<number | null>(null)
  useEffect(() => {
    if (!pret) return
    if (ecranPrecedent.current === null) {
      ecranPrecedent.current = draft.screen
      return
    }
    if (ecranPrecedent.current === draft.screen) return
    ecranPrecedent.current = draft.screen
    const titre = scroller.current?.querySelector('h2')
    if (titre instanceof HTMLElement) {
      titre.setAttribute('tabindex', '-1')
      titre.focus({ preventScroll: true })
    }
  }, [draft.screen, pret])

  const aller = useCallback((n: number) => {
    if (n < 1 || n > TOTAL) return
    setErreur(null)
    setDraft((d) => ({ ...d, screen: n }))
    scroller.current?.scrollTo({ top: 0 })
  }, [])

  /* ── AVANCER, SEULEMENT SI L'ÉCRAN A SA RÉPONSE ────────────────────────
     Le 27/08, un dossier est arrivé sans titre et sans photo. Rien n'avait
     échoué : les écrans 1 à 3 laissaient simplement passer un champ vide.
     Un dossier incomplet coûte une relance, un aller-retour, et parfois la
     cliente. La règle vit dans questionnaire.ts, partagée avec la route :
     cet écran ne fait que la consulter et dire ce qu'il attend.

     Reculer ne valide RIEN — on ne retient personne en arrière. */
  const avancer = useCallback((n: number) => {
    const manquant = premierManquant(
      CHAMPS_PAR_ECRAN[n] ?? [],
      (c) => draft[c],
    )
    if (manquant) { signalerErreur(MESSAGE_DU_CHAMP[manquant]); return }
    aller(n + 1)
  }, [draft, aller, signalerErreur])

  /* Fin d'écran 4 : création du dossier. Idempotent par le token. */
  const creerNumero = useCallback(async () => {
    /* Tous les champs, pas seulement ceux de l'écran 4 : c'est ici que le
       dossier est écrit en base, donc le dernier moment où un brouillon
       d'une version antérieure (créé quand l'occasion et le titre étaient
       facultatifs) peut encore être complété sans rien perdre. */
    const manquant = premierManquant(CHAMPS_QUESTIONNAIRE, (c) => draft[c])
    if (manquant) {
      signalerErreur(MESSAGE_DU_CHAMP[manquant])
      const ecran = ecranDuChamp(manquant)
      if (ecran !== draft.screen) {
        setDraft((d) => ({ ...d, screen: ecran }))
        scroller.current?.scrollTo({ top: 0 })
      }
      return
    }
    if (draft.token) { aller(5); return }

    setEnvoi(true)
    setErreur(null)
    try {
      const res = await fetch('/api/atelier/numero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion: draft.occasion,
          histoire: draft.histoire,
          titre: draft.titre,
          prenom: draft.prenom,
          email: draft.email,
          telephone: draft.telephone,
        }),
      })
      const data = (await res.json()) as {
        token?: string
        error?: string
        champ?: ChampQuestionnaire
      }

      if (!res.ok || !data.token) {
        if (data.error === 'champ_manquant' && data.champ && MESSAGE_DU_CHAMP[data.champ]) {
          /* Le serveur a le dernier mot, et il dit LEQUEL. On repose la
             cliente sur l'écran concerné : un « réessayez » devant un
             formulaire qui a l'air complet ne se répare pas tout seul. */
          signalerErreur(MESSAGE_DU_CHAMP[data.champ])
          const ecran = ecranDuChamp(data.champ)
          setDraft((d) => ({ ...d, screen: ecran }))
          scroller.current?.scrollTo({ top: 0 })
          return
        }
        signalerErreur(
          data.error === 'rate_limited'
            ? 'Trop de tentatives. Réessayez dans un instant.'
            : 'L’atelier n’a pas pu enregistrer votre demande. Réessayez.'
        )
        return
      }
      setDraft((d) => ({ ...d, token: data.token!, screen: 5 }))
      scroller.current?.scrollTo({ top: 0 })
    } catch {
      signalerErreur('Connexion perdue. Vérifiez votre réseau, puis réessayez.')
    } finally {
      setEnvoi(false)
    }
  }, [draft, aller, signalerErreur])

  /* On rend TOUJOURS quelque chose, dès le serveur.
     Un garde `if (!pret) return <coquille vide />` donnait un écran noir
     entièrement vide tant que React n'avait pas hydraté — sur un téléphone
     lent ou un réseau lent, ça se lit comme un site cassé.
     Le rendu serveur part donc de l'écran 1 (EMPTY_DRAFT), identique au
     premier rendu client : aucun décalage d'hydratation. L'effet de reprise
     corrige ensuite l'écran. Un visiteur qui revient voit l'écran 1 une
     frame avant de retomber sur le sien — infiniment préférable au vide. */
  const n = draft.screen

  /* ── T-058 : LE LIEN DE REPRISE ABÎMÉ S'ARRÊTE ICI ─────────────────────
     Le dossier existe toujours côté atelier : c'est le lien qui a perdu des
     caractères en route. Repartir à l'écran 1 aurait créé un second dossier
     en bout de course. On le dit, et on renvoie vers le lien entier — celui
     du mail, ou celui de la page « Votre numéro ». */
  if (lienAbime) {
    return (
      <div className="at-q">
        <div className="at-bar"><i style={{ transform: 'scaleX(0)' }} /></div>
        <div className="at-q-top">
          <span className="at-q-logo">Bellajour</span>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="at-q-close" href="/">Fermer ✕</a>
        </div>
        <div className="at-q-scroll">
          <div className="at-q-screen">
            <p className="at-kicker">Un instant</p>
            <h2>Ce lien de reprise<br />est abîmé.</h2>
            <p className="at-lede at-q-lede" role="alert">
              Il lui manque des caractères — les applications mail coupent
              parfois les liens longs. Votre dossier, lui, est intact :
              rouvrez le lien depuis votre mail Bellajour, en entier, et vous
              retomberez exactement où vous en étiez.
            </p>
            {/* Un nouveau départ reste possible, mais discret : recommencer
                ici, c'est précisément le doublon qu'on vient d'éviter.
                <a> nu, rechargement voulu : il purge le `?reprendre=` cassé. */}
            <a className="at-skip" href="/composer">
              Composer un autre numéro
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="at-q">
      {/* T-051 — la région live UNIQUE : l'écran atteint est annoncé, une
          fois, poliment. Elle existe dès le premier rendu (une région créée
          en même temps que son contenu n'est pas annoncée) et ne change
          qu'au changement d'écran. */}
      <p className="sr-only" aria-live="polite">
        {n === 6 ? 'C’est fait — dernier écran.' : `Étape ${n} sur ${TOTAL}`}
      </p>

      {/* PRD §15 : la barre ne s'anime jamais en width — scaleX seul. */}
      <div className="at-bar">
        <i style={{ transform: `scaleX(${n / TOTAL})` }} />
      </div>

      <div className="at-q-top">
        <button
          type="button"
          className="at-q-back"
          onClick={() => aller(n - 1)}
          style={{ visibility: n === 1 || n === 6 ? 'hidden' : 'visible' }}
        >
          ← Retour
        </button>
        <span className="at-q-logo">Bellajour</span>
        {/* <a> et non <Link> : quitter le questionnaire doit RECHARGER la page.
            Le moteur d'envoi est un singleton hors React (depot/moteur.ts) ;
            une navigation client le laisserait vivant en mémoire, avec ses
            requêtes en vol, sur une page qui n'a plus rien à voir. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="at-q-close" href="/">Fermer ✕</a>
      </div>

      <div className="at-q-scroll" ref={scroller}>
        <div className="at-q-screen" key={n}>
          {n === 1 && (
            <Screen1Occasion value={draft.occasion} onChange={(v) => patch({ occasion: v })} />
          )}
          {n === 2 && (
            <Screen2Histoire value={draft.histoire} onChange={(v) => patch({ histoire: v })} />
          )}
          {n === 3 && (
            <Screen3Titre value={draft.titre} onChange={(v) => patch({ titre: v })} />
          )}
          {n === 4 && (
            <Screen4Contact
              prenom={draft.prenom}
              email={draft.email}
              telephone={draft.telephone}
              onChange={(champ, v) => patch({ [champ]: v } as Partial<Draft>)}
              erreur={erreur}
              erreurCle={erreurCle}
            />
          )}
          {n === 5 && (
            <Screen5Depot
              token={draft.token}
              reprise={reprise}
              consent={draft.consentPhotos}
              onConsent={(v) => patch({ consentPhotos: v })}
              /* Une seule écriture d'état : marquer terminé ET passer à
                 l'écran 6. Deux setDraft successifs se seraient écrasés. */
              onTermine={(nb) => {
                setPhotosEnvoyees(nb)
                setDraft((d) => ({ ...d, termine: true, screen: 6 }))
              }}
            />
          )}
          {n === 6 && (
            /* T2-1 : la case « montrer des extraits » a quitté cet écran
               pour la page /numero (ConsentCommunication.tsx) — un moment
               de conclusion ne se partage pas. */
            <Screen6Fin titre={draft.titre} token={draft.token} nbPhotos={photosEnvoyees} />
          )}

          {/* L'écran 5 porte son PROPRE bouton : lui seul sait si les photos
              sont réellement arrivées, si l'accord est coché et si la
              finalisation a abouti. Un bouton piloté d'ici ne pourrait
              qu'être optimiste. */}
          {n !== 5 && (
          <div className="at-q-actions">
            {n < 4 && (
              <button type="button" className="at-cta" onClick={() => avancer(n)}>
                Continuer <span className="at-cta-arrow">→</span>
              </button>
            )}
            {/* L'écran 4 affiche l'erreur lui-même, sous ses champs. Les
                écrans 1 à 3 n'en avaient jamais : il faut bien la poser
                quelque part, et c'est sous le bouton qui vient d'être
                refusé. */}
            {/* T-051 — key : même message deux fois de suite = deux annonces
                quand même. Sans elle, React ne re-rend pas et le lecteur
                d'écran se tait. */}
            {erreur && n < 4 && <p key={erreurCle} className="at-erreur" role="alert">{erreur}</p>}
            {/* Le bouton NOMME l'étape suivante. « Continuer » sur le dernier
                écran de coordonnées peut se lire comme « valider ma demande » —
                et il s'est lu comme ça le 27/08. */}
            {n === 4 && (
              <button type="button" className="at-cta" onClick={creerNumero} disabled={envoi}>
                {envoi ? 'Un instant…' : 'Passer à mes photos'}{' '}
                <span className="at-cta-arrow">→</span>
              </button>
            )}
            {/* Le lien de la page d'état est LE lien du numéro : elle le
                recevra par mail (M1), mais elle est ici, maintenant, et
                c'est le moment où elle peut le mettre en favori. Un seul
                lien, toute la vie du numéro (PRD §6). */}
            {n === 6 && draft.token && (
              <a className="at-cta" href={`/numero/${draft.token}`}>
                Suivre votre numéro <span className="at-cta-arrow">→</span>
              </a>
            )}
            {/* Même raison que « Fermer ✕ » plus haut : rechargement voulu. */}
            {n === 6 && (
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <a className="at-skip" href="/">Revenir au site</a>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
