'use client'

/* Le questionnaire — 6 écrans, une question par écran (PRD §7.2).
   Aucun compte, retour possible, persistance localStorage à chaque écran.

   L'écriture en base a lieu UNE SEULE FOIS, à la fin de l'écran 4 : la présence
   d'un token dans le brouillon signifie « le dossier existe », on ne le recrée
   jamais, même si la cliente revient en arrière puis ré-avance.

   REFONTE DU 03/09/2026 (maquettes validées par Mathias) :
   — le logo officiel remplace le mot « Bellajour » en tête ;
   — l'indicateur d'étapes est le « sommaire nommé » : cinq étapes, la fin
     n'en est plus une (l'écran 6 reste le sixième écran, il n'est plus compté) ;
   — les actions vivent dans une BARRE FIXE en bas, desktop et mobile : le
     bouton ne se cherche plus sous le contenu ;
   — la croix ne quitte plus d'un clic : elle ouvre une confirmation, et
     quitter mène à la page produit (/magazine), pas à l'accueil. */

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Screen1Occasion from './screens/Screen1Occasion'
import Screen2Histoire from './screens/Screen2Histoire'
import Screen3Titre from './screens/Screen3Titre'
import Screen4Contact from './screens/Screen4Contact'

/* T-066 — le sous-arbre du dépôt (moteur d'envoi, pool de workers, couche
   IndexedDB, écran de dépôt) tire à lui seul 72 % de la source de la page. Il
   n'est atteint qu'après quatre écrans remplis : on le charge à la demande
   plutôt que de le faire descendre à qui ouvre le questionnaire pour cocher
   « un mariage ».

   DEUX écrans touchent le moteur : l'écran 5 (le dépôt) ET l'écran 6, qui s'y
   rabranche pour dire combien de photos montent encore. Les DEUX doivent être
   dynamiques — sinon l'écran 6, importé statiquement, retire le moteur du
   chunk initial par la porte de derrière (`useDepot` → `moteur`/`pool`/
   `stockage`) et le découpage ne sert à rien. L'écran 6 n'arrive qu'après le
   5 : leur dépendance commune (le moteur) part dans un chunk chargé dès
   l'écran 5, donc déjà là au 6.

   `ssr: false` : purement client (workers, IndexedDB), rien n'a jamais été
   rendu au serveur. Le repli est discret et dans le ton — le chunk arrive
   largement pendant qu'on remplit les quatre écrans, et tient aussi le cas
   `?reprendre=` qui saute directement à l'écran 5. */
const Screen5Depot = dynamic(() => import('./screens/Screen5Depot'), {
  ssr: false,
  loading: () => (
    <>
      <p className="at-kicker">Vos photos</p>
      <h2>On prépare votre dépôt…</h2>
      <p className="at-lede at-q-lede" aria-live="polite">Un instant.</p>
    </>
  ),
})

const Screen6Fin = dynamic(() => import('./screens/Screen6Fin'), {
  ssr: false,
  loading: () => (
    <>
      <div className="at-done" aria-hidden="true">✓</div>
      <p className="at-kicker">C’est fait</p>
      <h2>Un instant…</h2>
    </>
  ),
})
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

/* Les cinq étapes du sommaire. L'écran 6 n'en est pas une : c'est la
   conclusion, et elle ne s'annonce pas dans un fil d'étapes. */
const NOMS_ETAPES = ['Le moment', 'L’histoire', 'Le titre', 'Vous', 'Vos photos'] as const
const TOTAL_ETAPES = NOMS_ETAPES.length

/* Le logo officiel — le même fichier que la barre du site (Nav.tsx). */
const LOGO = '/images/ui/signature-blanche.webp'

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
  /* La confirmation de sortie (03/09). La croix ne quitte plus d'un clic :
     fermer un parcours à six écrans sur un geste ambigu coûtait des dossiers.
     Quitter reste un <a> vers /magazine — rechargement voulu, voir la croix. */
  const [quitter, setQuitter] = useState(false)
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
  const modale = useRef<HTMLDivElement>(null)

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

  /* La confirmation de sortie : focus posé dessus à l'ouverture, Échap la
     referme. Le focus revient naturellement au flux — la croix est toujours
     là, et le parcours n'a pas bougé. */
  useEffect(() => {
    if (!quitter) return
    const titre = modale.current?.querySelector('h2')
    if (titre instanceof HTMLElement) {
      titre.setAttribute('tabindex', '-1')
      titre.focus({ preventScroll: true })
    }
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuitter(false)
    }
    window.addEventListener('keydown', auClavier)
    return () => window.removeEventListener('keydown', auClavier)
  }, [quitter])

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
          /* Les deux mots de couverture facultatifs de l'écran 3 (03/09).
             La route les ignore proprement tant que la migration
             20260903_composer_mots_couverture n'est pas passée. */
          sous_titre: draft.sousTitre,
          mot_quatrieme: draft.motQuatrieme,
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

  /* Le sommaire nommé (Option A des maquettes du 03/09). Deux rendus, un
     seul affiché par le CSS : les noms sur desktop, segments + « n / 5 »
     sur mobile. Décoratif à l'oreille — la région live sr-only porte déjà
     l'étape, l'annoncer deux fois serait du bruit. */
  const sommaire = n <= TOTAL_ETAPES && (
    <div className="at-q-etapes" aria-hidden="true">
      <div className="at-q-etapes-noms">
        {NOMS_ETAPES.map((nom, i) => {
          const num = i + 1
          const etat = num < n ? 'is-fait' : num === n ? 'is-la' : ''
          return (
            <span key={nom} className={`at-q-etape ${etat}`}>
              {num < n && <i className="at-q-etape-v" aria-hidden="true">✓ </i>}
              {String(num).padStart(2, '0')} · {nom}
            </span>
          )
        })}
      </div>
      <div className="at-q-etapes-mini">
        <span className="at-q-segments">
          {NOMS_ETAPES.map((nom, i) => (
            <i key={nom} className={i + 1 <= n ? 'is-fait' : ''} />
          ))}
        </span>
        <span className="at-q-etapes-ou">{n} / {TOTAL_ETAPES} · {NOMS_ETAPES[n - 1]}</span>
      </div>
    </div>
  )

  /* ── T-058 : LE LIEN DE REPRISE ABÎMÉ S'ARRÊTE ICI ─────────────────────
     Le dossier existe toujours côté atelier : c'est le lien qui a perdu des
     caractères en route. Repartir à l'écran 1 aurait créé un second dossier
     en bout de course. On le dit, et on renvoie vers le lien entier — celui
     du mail, ou celui de la page « Votre numéro ». */
  if (lienAbime) {
    return (
      <div className="at-q">
        <div className="at-q-top">
          <span className="at-q-cote" aria-hidden="true" />
          <img className="at-q-logo-img" src={LOGO} alt="Bellajour" width={320} height={122} decoding="async" />
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="at-q-close" href="/" aria-label="Fermer">✕</a>
        </div>
        <div className="at-q-scroll">
          <div className="at-q-screen">
            <p className="at-kicker">Un instant</p>
            <h2>Ce lien de reprise<br />est abîmé.</h2>
            <p className="at-lede at-q-lede" role="alert">
              Il lui manque des caractères, les applications mail coupent
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
        {n === 6 ? 'C’est fait, dernier écran.' : `Étape ${n} sur ${TOTAL_ETAPES}`}
      </p>

      <div className="at-q-top">
        <button
          type="button"
          className="at-q-back"
          onClick={() => aller(n - 1)}
          style={{ visibility: n === 1 || n === 6 ? 'hidden' : 'visible' }}
        >
          ← Retour
        </button>
        <img className="at-q-logo-img" src={LOGO} alt="Bellajour" width={320} height={122} decoding="async" />
        {/* La croix N'EST PLUS un lien (03/09) : elle ouvre la confirmation.
            C'est le <a> DE LA MODALE qui quitte — et il RECHARGE la page,
            exprès : le moteur d'envoi est un singleton hors React
            (depot/moteur.ts) ; une navigation client le laisserait vivant en
            mémoire, avec ses requêtes en vol, sur une page qui n'a plus rien
            à voir. Sur l'écran 6 le parcours est fini : plus de croix, la
            barre porte « Revenir au site ». */}
        {n !== 6 ? (
          <button
            type="button"
            className="at-q-close"
            onClick={() => setQuitter(true)}
            aria-label="Quitter la composition"
          >
            ✕
          </button>
        ) : (
          <span className="at-q-cote" aria-hidden="true" />
        )}
      </div>

      {sommaire}

      <div className="at-q-scroll" ref={scroller}>
        <div className="at-q-screen" key={n}>
          {n === 1 && (
            <Screen1Occasion value={draft.occasion} onChange={(v) => patch({ occasion: v })} />
          )}
          {n === 2 && (
            <Screen2Histoire value={draft.histoire} onChange={(v) => patch({ histoire: v })} />
          )}
          {n === 3 && (
            <Screen3Titre
              value={draft.titre}
              onChange={(v) => patch({ titre: v })}
              sousTitre={draft.sousTitre}
              motQuatrieme={draft.motQuatrieme}
              onExtra={(champ, v) => patch({ [champ]: v } as Partial<Draft>)}
            />
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
        </div>
      </div>

      {/* ── LA BARRE FIXE (03/09) ─────────────────────────────────────────
          Le geste de l'écran est TOUJOURS visible, en bas, desktop et
          mobile — fini le bouton à aller chercher sous le contenu.
          L'écran 5 porte sa PROPRE barre : lui seul sait si les photos sont
          réellement arrivées et si la finalisation a abouti. Un bouton
          piloté d'ici ne pourrait qu'être optimiste. */}
      {n !== 5 && (
        <div className="at-q-barre">
          <div className="at-q-barre-int">
            {n === 1 && (
              <span className="at-q-barre-note">Vos réponses s’enregistrent au fur et à mesure.</span>
            )}
            {n > 1 && n < 6 && (
              <button type="button" className="at-q-back at-q-barre-retour" onClick={() => aller(n - 1)}>
                ← Retour
              </button>
            )}
            <div className="at-q-actions">
              {/* T-051 — key : même message deux fois de suite = deux annonces
                  quand même. Sans elle, React ne re-rend pas et le lecteur
                  d'écran se tait. L'écran 4 affiche l'erreur lui-même, sous
                  ses champs. */}
              {erreur && n < 4 && <p key={erreurCle} className="at-erreur" role="alert">{erreur}</p>}
              {n < 4 && (
                <button type="button" className="at-cta" onClick={() => avancer(n)}>
                  Continuer <span className="at-cta-arrow">→</span>
                </button>
              )}
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
              {/* Même raison que la croix : rechargement voulu. */}
              {n === 6 && (
                // eslint-disable-next-line @next/next/no-html-link-for-pages
                <a className="at-skip" href="/">Revenir au site</a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LA CONFIRMATION DE SORTIE (03/09) ─────────────────────────────
          « Continuer » est le geste principal ; quitter est discret et mène
          à /magazine — la page produit, où le CTA dira « Continuer la
          composition » tant que le brouillon vit sur l'appareil. Le voile
          ferme aussi, comme Échap : une modale qui ne se referme qu'au
          bouton se lit comme un piège. */}
      {quitter && (
        <div
          className="at-q-voile"
          onClick={(e) => { if (e.target === e.currentTarget) setQuitter(false) }}
        >
          <div
            className="at-q-quitter"
            role="dialog"
            aria-modal="true"
            aria-labelledby="at-q-quitter-titre"
            ref={modale}
          >
            <h2 id="at-q-quitter-titre">Quitter la composition ?</h2>
            <p>
              Vos réponses restent enregistrées sur cet appareil.
              Vous reprendrez exactement où vous en étiez.
            </p>
            <button type="button" className="at-cta at-q-quitter-reste" onClick={() => setQuitter(false)}>
              Continuer ma composition
            </button>
            <a className="at-skip at-q-quitter-part" href="/magazine">
              Quitter et revenir à la page du magazine
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
