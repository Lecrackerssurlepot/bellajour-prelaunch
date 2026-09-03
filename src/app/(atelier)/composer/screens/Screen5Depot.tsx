'use client'

/**
 * Écran 5 — LE DÉPÔT (PRD §7.4).
 *
 * C'est le seul écran du questionnaire où quelque chose peut vraiment mal se
 * passer : un réseau de festival, cent photos de 8 Mo, un onglet qui se ferme.
 * Toute la mécanique vit dans depot/moteur.ts ; ce fichier ne fait que
 * montrer, et ne montre jamais rien de faux.
 *
 * Trois règles de rendu qui ne se négocient pas :
 * — jauge et barres en scaleX, jamais en width (PRD §15) ;
 * — compteur en requestAnimationFrame, une seule boucle pour tout l'écran ;
 * — jamais de case cassée : sans vignette, la tuile porte le nom du fichier.
 *
 * Et une règle de fond : le palier affiché ici est un ORDRE DE GRANDEUR. Le
 * prix ferme naît côté serveur, du nombre de pages saisi par l'atelier
 * (invariant nº2). D'où « autour de 30 € · prix confirmé avec votre
 * couverture », jamais un montant sec qui se lirait comme un engagement.
 *
 * REFONTE DU 03/09 (maquettes validées par Mathias) :
 * — la grande zone de dépôt n'existe qu'AVANT la première photo ; ensuite
 *   l'ajout est une tuile discrète dans la grille, et le glisser-déposer
 *   couvre tout l'écran ;
 * — la jauge sur 100 disparaît : elle se lisait comme « pas assez rempli ».
 *   Sous 40, une barre graduée sur 40 et « encore X pour composer » ; à
 *   partir de 40, un badge « De quoi composer » — le manque n'existe plus ;
 * — le consentement et « Envoyer à l'atelier » vivent dans la barre fixe,
 *   toujours visibles. « Il reste un geste » est parti AVEC la cause : la
 *   phrase compensait un bouton hors de vue (25/08), la barre le rend
 *   permanent. Cocher ne se rappelle qu'au clic : cliquer sans avoir coché
 *   affiche l'erreur à ce moment-là, rien avant (décision Mathias).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDepot } from '../depot/useDepot'
import {
  MAX_PHOTOS, MIN_PHOTOS, blocageEnvoi, manquantes, palierPour, peutEnvoyer, restantes,
} from '../depot/paliers'
import type { Refus } from '../depot/moteur'
import '../depot/depot.css'

const ACCEPTE = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif'

/**
 * Combien de vignettes avant de replier.
 *
 * Une grille de cinquante-cinq cases minuscules ne se regarde pas : elle se
 * subit. Et elle repoussait le seul geste de l'écran hors de vue. Cinq
 * vignettes GRANDES disent mieux « vos photos sont là » que cinquante-cinq
 * timbres-poste, et la sixième case dit combien il y en a derrière.
 */
const VIGNETTES_VISIBLES = 5

const RAISONS: Record<string, string> = {
  format: 'format non accepté',
  taille: 'plus de 50 Mo',
  plafond: 'le numéro est complet',
}

export default function Screen5Depot({
  token, reprise, consent, onConsent, onTermine,
}: {
  token: string | null
  /** T2-4 — arrivée par `?reprendre=` : des photos sont déjà chez nous. */
  reprise?: boolean
  consent: boolean
  onConsent: (v: boolean) => void
  /** Le nombre RÉELLEMENT confirmé, pour que l'écran 6 puisse le nommer.
      Il ne vit que dans le moteur de dépôt : sans ce passage de relais,
      l'écran de fin ne peut que rester vague. */
  onTermine: (nbPhotos: number) => void
}) {
  const { vue, compteur, ajouter, supprimer, reprendrePhoto, finaliser } = useDepot(token)
  const [refus, setRefus] = useState<Refus[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  /* T-051 — même clé de ré-annonce que dans Composer : deux échecs
     identiques de finalisation doivent parler deux fois. */
  const [erreurCle, setErreurCle] = useState(0)
  const [survol, setSurvol] = useState(false)
  const [toutesVisibles, setToutesVisibles] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const champ = useRef<HTMLInputElement>(null)

  const recevoir = useCallback((liste: FileList | null) => {
    if (!liste?.length) return
    setRefus(ajouter(Array.from(liste)))
    setErreur(null)
  }, [ajouter])

  const palier = palierPour(vue.confirmees)
  const ilManque = manquantes(vue.confirmees)
  const ilReste = restantes(vue.confirmees)

  /* La règle vit dans paliers.ts (peutEnvoyer / blocageEnvoi), pure et
     testée par le harnais. Depuis le 03/09, le CONSENTEMENT ne ferme plus le
     bouton : il se vérifie AU CLIC (décision Mathias — rien d'affiché tant
     qu'on n'a pas cliqué sans cocher). Le bouton ne reste fermé que pour ce
     qui ne dépend pas d'un geste immédiat : pas assez de photos confirmées,
     ou un envoi déjà en cours. */
  const etatHorsConsent = { confirmees: vue.confirmees, enVol: vue.enVol, consent: true, envoiEnCours: envoi }
  const pretHorsConsent = peutEnvoyer(etatHorsConsent)
  const blocage = blocageEnvoi(etatHorsConsent)

  /**
   * Ce qu'on montre, et ce qu'on replie.
   *
   * ⚠️ UNE PHOTO EN ERREUR N'EST JAMAIS REPLIÉE. Elle porte le seul bouton
   * « Reprendre » de l'écran : la cacher derrière un « + 49 », c'est cacher la
   * réparation elle-même, et laisser partir un dépôt amputé sans que personne
   * ne s'en aperçoive. Elle remonte donc dans les visibles, où qu'elle soit.
   */
  const enErreur = vue.photos.filter((p) => p.etat === 'erreur')
  const visibles = toutesVisibles
    ? vue.photos
    : (() => {
        const tete = vue.photos.slice(0, VIGNETTES_VISIBLES)
        const dedans = new Set(tete.map((p) => p.id))
        return [...tete, ...enErreur.filter((p) => !dedans.has(p.id))]
      })()
  const repliees = vue.photos.length - visibles.length

  /**
   * Le dernier filet : prévenir avant de fermer l'onglet.
   *
   * C'est exactement ce qui s'est produit le 25/08 — cinquante-cinq photos
   * montées, l'onglet fermé, et personne pour s'en apercevoir. La relance M2b
   * rattrape le lendemain, mais un mail de relance envoyé à tout le monde
   * n'est pas une solution : c'est le constat qu'on laisse partir tout le
   * monde. Mieux vaut retenir la cliente une seconde que lui écrire un jour
   * plus tard.
   *
   * Le navigateur impose son propre libellé — on ne choisit pas le texte, on
   * choisit seulement de poser la question. Elle n'est posée que s'il y a
   * quelque chose à perdre, et l'écran 6 démonte l'effet en se démontant.
   */
  useEffect(() => {
    if (vue.photos.length === 0) return
    const avantFermeture = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      /* Toujours exigé par Chrome, malgré sa dépréciation dans la spec. */
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avantFermeture)
    return () => window.removeEventListener('beforeunload', avantFermeture)
  }, [vue.photos.length])

  const envoyer = useCallback(async () => {
    if (!pretHorsConsent) return
    /* Le rappel du consentement, AU CLIC et jamais avant (03/09). */
    if (!consent) {
      setErreur('Cochez d’abord la case au-dessus du bouton : elle confirme votre droit d’utiliser ces photos.')
      setErreurCle((c) => c + 1)
      return
    }
    setEnvoi(true)
    setErreur(null)
    const r = await finaliser()
    setEnvoi(false)
    if (!r.ok) {
      setErreur(r.message ?? 'Réessayez dans un instant.')
      setErreurCle((c) => c + 1)
      return
    }
    onTermine(vue.confirmees)
  }, [pretHorsConsent, consent, finaliser, onTermine, vue.confirmees])

  if (!token) {
    return (
      <>
        <p className="at-kicker">Vos photos</p>
        <h2>Un instant.</h2>
        <p className="at-lede at-q-lede">
          Votre dossier n’a pas encore été créé. Revenez à l’écran précédent
          pour nous laisser vos coordonnées, c’est là que tout commence.
        </p>
      </>
    )
  }

  return (
    /* Le glisser-déposer couvre TOUT l'écran depuis que la grande zone
       disparaît avec la première photo : on lâche ses fichiers n'importe où. */
    <div
      className={`at-d-page${survol ? ' is-survol' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setSurvol(true) }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => { e.preventDefault(); setSurvol(false); recevoir(e.dataTransfer.files) }}
    >
      <p className="at-kicker">Vos photos</p>
      <h2>Vos photos,<br />maintenant.</h2>
      <p className="at-lede at-q-lede">Entre {MIN_PHOTOS} et {MAX_PHOTOS} photos.</p>

      {/* Le champ natif, hors de la zone : la tuile « Compléter » et le
          bouton de la zone vide déclenchent le même sélecteur. */}
      <input
        ref={champ}
        type="file"
        multiple
        accept={ACCEPTE}
        className="at-d-input"
        onChange={(e) => {
          recevoir(e.target.files)
          /* Remis à zéro : sans ça, re-choisir exactement la même photo
             n'émet aucun événement et l'écran a l'air de ne rien faire. */
          e.target.value = ''
        }}
        aria-label="Choisir des photos"
      />

      {/* ── T2-4 : LA REPRISE DIT CE QUI EST DÉJÀ LÀ ──────────────────
          Le lien du mail ramène au bon endroit, mais sans cette ligne
          l'écran ressemble à un premier dépôt : on croit devoir tout
          recommencer. Le compte vient du SERVEUR (vue.serveur) — la grille
          locale ne connaît que cet appareil. */}
      {reprise && (vue.serveur ?? 0) > 0 && (
        <p className="at-d-avis at-d-avis--reprise" role="status">
          <b>Vos {vue.serveur} photos sont déjà chez nous.</b> Celles que vous
          déposez maintenant s’ajoutent, rien n’est à refaire.
        </p>
      )}

      {vue.stockageDegrade && (
        <p className="at-d-avis">
          Ce navigateur ne peut pas garder de copie de vos photos. Restez sur
          cette page jusqu’à la fin de l’envoi : un rechargement repartirait de zéro.
        </p>
      )}
      {vue.reductionDegradee && (
        <p className="at-d-avis">
          Vos photos partent en taille réelle sur ce navigateur : l’envoi sera
          plus long, et plus gourmand si vous êtes en données mobiles.
        </p>
      )}
      {vue.bandeau && <p className="at-d-avis" role="status">{vue.bandeau}</p>}

      {/* ── la zone de dépôt : le PREMIER geste seulement ───────────────
          Dès qu'une photo est là, elle laisse la place à la grille — la
          tuile « Compléter » et le glisser-déposer plein écran prennent
          le relais (03/09). */}
      {vue.photos.length === 0 && (
        <div className={`at-d-zone${survol ? ' is-survol' : ''}`}>
          <button type="button" className="at-d-parcourir" onClick={() => champ.current?.click()}>
            Choisir des photos
          </button>
          <span className="at-d-zone-note">
            JPG, PNG et HEIC (le format par défaut de l’iPhone). 50 Mo par photo.
          </span>
        </div>
      )}

      {/* ── compteur et seuil ─────────────────────────────────────────────
          Plus de jauge sur 100 (03/09) : pleine aux deux tiers, elle se
          lisait comme « il en manque ». Sous le seuil, la barre est graduée
          sur 40 — l'objectif, pas le plafond. Au-dessus, un badge le dit en
          toutes lettres et le manque disparaît de l'écran. */}
      <div className="at-d-etat">
        {/* « déposées » était le mot du problème : c'est le nom de l'étape,
            et il se lit comme un état final. Après cinquante-cinq photos
            cochées vertes, « 55 photos déposées » veut dire « j'ai fini ».
            « prêtes » dit la même vérité et laisse le geste devant. */}
        <div className="at-d-compteur">
          <b>{compteur}</b>
          <span>{compteur > 1 ? 'photos prêtes' : 'photo prête'}</span>
          {ilManque === 0 && (
            <span className="at-d-pret" role="status">
              <i aria-hidden="true">✓</i>{' '}
              {ilReste > 0 ? <>De quoi composer · encore {ilReste} de libre</> : <>Le numéro est complet</>}
            </span>
          )}
        </div>

        {ilManque > 0 && (
          <>
            <div className="at-d-jauge" aria-hidden="true">
              <i style={{ transform: `scaleX(${Math.min(1, vue.confirmees / MIN_PHOTOS)})` }} />
            </div>
            {/* T-051 — pas de role="status" : le compte changeait à CHAQUE
                photo confirmée, jusqu'à 40 annonces d'affilée qui noyaient
                les vraies alertes. Utile à l'œil, pas à l'oreille. */}
            <p className="at-d-palier">
              encore <b>{ilManque}</b> pour composer un numéro
            </p>
          </>
        )}

        {ilManque === 0 && palier && (
          <p className="at-d-palier">
            <b>{palier.pages}</b> · {palier.autour}
            <em> · prix confirmé avec votre couverture</em>
          </p>
        )}

        {vue.enVol > 0 && (
          <div className="at-d-transfert">
            <div className="at-d-barre" aria-hidden="true">
              <i style={{
                transform: `scaleX(${vue.octetsTotal ? vue.octetsEnvoyes / vue.octetsTotal : 0})`,
              }} />
            </div>
            <span>{vue.enVol} en cours d’envoi</span>
          </div>
        )}
      </div>

      {/* ── refus à l'entrée ──────────────────────────────────────────────
          T-051 — l'enveloppe est TOUJOURS rendue, et c'est elle qui est
          live : une région créée en même temps que son contenu n'est pas
          annoncée. Ici la région existe d'avance, et les refus qui y
          apparaissent sont lus — 8 photos écartées sur 60 ne passent plus
          en silence. */}
      <div aria-live="polite">
        {refus.length > 0 && (
          <ul className="at-d-refus">
            {refus.slice(0, 5).map((r, i) => (
              <li key={`${r.nom}-${i}`}>
                {r.nom} — {RAISONS[r.raison] ?? 'non acceptée'}
              </li>
            ))}
            {refus.length > 5 && <li>et {refus.length - 5} autre(s).</li>}
          </ul>
        )}
      </div>

      {/* ── la grille ─────────────────────────────────────────────────── */}
      {vue.photos.length > 0 && (
        <ul className={toutesVisibles ? 'at-d-grille at-d-grille--toutes' : 'at-d-grille'}>
          {visibles.map((p) => (
            <li key={p.id} className="at-d-tuile" data-etat={p.etat}>
              {p.apercu ? (
                <img
                  src={p.apercu}
                  alt=""
                  className="at-d-img"
                  loading="lazy"
                  decoding="async"
                  /* Dernier filet : une vignette qui refuse de s'afficher
                     bascule sur la tuile sobre. Jamais l'icône cassée. */
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <span className="at-d-sobre">
                  <b>{p.nom}</b>
                  <small>sans aperçu</small>
                </span>
              )}

              {/* Progression par tuile — scaleX, comme le reste. */}
              {(p.etat === 'envoi' || p.etat === 'envoyee') && (
                <div className="at-d-tuile-barre" aria-hidden="true">
                  <i style={{ transform: `scaleX(${p.progression})` }} />
                </div>
              )}

              {p.etat === 'confirmee' && <span className="at-d-ok" aria-hidden="true">✓</span>}

              {/* T-054 — l'échec se lit SANS la couleur : la bordure accent ne
                  suffit ni à une cliente daltonienne ni à un lecteur d'écran.
                  Un mot sur la tuile, là où le ✓ dit l'inverse. */}
              {p.etat === 'erreur' && (
                <span className="at-d-panne">Pas partie</span>
              )}

              {/* Pas de « Reprendre » quand le serveur a refusé pour de bon :
                  un bouton qui ne fait rien est pire que pas de bouton. */}
              {p.etat === 'erreur' && !vue.clos && (
                <button
                  type="button"
                  className="at-d-reprendre"
                  onClick={() => reprendrePhoto(p.id)}
                  title={p.message ?? 'Recommencer'}
                >
                  ↻ Reprendre
                </button>
              )}

              <button
                type="button"
                className="at-d-suppr"
                onClick={() => supprimer(p.id)}
                aria-label={`Retirer ${p.nom}`}
              >
                ✕
              </button>
            </li>
          ))}

          {/* La case qui compte le reste. Dans la grille et non sous elle :
              c'est une vignette de plus, elle se lit du même coup d'oeil. */}
          {repliees > 0 && (
            <li className="at-d-tuile at-d-tuile--plus">
              <button type="button" onClick={() => setToutesVisibles(true)}>
                <b>+&nbsp;{repliees}</b>
                <small>voir toutes</small>
              </button>
            </li>
          )}

          {/* L'ajout, devenu discret (03/09) : une tuile de plus, pas un
              panneau. Fermée quand le numéro est complet — un geste qui ne
              peut qu'être refusé ne se propose pas. */}
          {ilReste > 0 && (
            <li className="at-d-tuile at-d-tuile--ajout">
              <button type="button" onClick={() => champ.current?.click()}>
                <b aria-hidden="true">+</b>
                <small>Compléter avec d’autres photos</small>
              </button>
            </li>
          )}
        </ul>
      )}

      {toutesVisibles && vue.photos.length > VIGNETTES_VISIBLES && (
        <button type="button" className="at-d-replier" onClick={() => setToutesVisibles(false)}>
          Replier
        </button>
      )}

      {vue.photos.length > 0 && (
        <p className="at-d-glisser">Ou glissez-les n’importe où sur cette page.</p>
      )}

      {/* ── T-054 : L'ÉCHEC EST DIT, PAS SEULEMENT BORDÉ ──────────────
          `role="alert"` : annoncé dès qu'une photo échoue, sans voler le
          focus. La photo en erreur n'est jamais repliée (règle plus haut) :
          la phrase désigne donc quelque chose qui est réellement à l'écran. */}
      {enErreur.length > 0 && (
        <p className="at-erreur" role="alert">
          {enErreur.length === 1 ? (
            <>
              Une photo n’est pas partie. Elle reste dans la grille
              {vue.clos
                ? ' — « ✕ » la retire.'
                : ' : « ↻ Reprendre » relance l’envoi, « ✕ » la retire.'}
            </>
          ) : (
            <>
              {enErreur.length} photos ne sont pas parties. Elles restent dans
              la grille
              {vue.clos
                ? ' — « ✕ » les retire.'
                : ' : « ↻ Reprendre » relance l’envoi, « ✕ » les retire.'}
            </>
          )}
        </p>
      )}

      {/* ── LA BARRE FIXE DU DÉPÔT (03/09) ─────────────────────────────
          Consentement + bouton, toujours visibles — c'est elle qui règle
          définitivement le bouton noyé du 25/08. Rien d'autre : l'erreur du
          consentement n'apparaît qu'au clic (plus haut, envoyer()). */}
      <div className="at-q-barre at-q-barre--depot">
        {/* ── CE QUE FAIT LE CLIC QUAND IL RESTE DES PHOTOS EN ROUTE ────
            La phrase ne promet PAS qu'elles arriveront — elles partent du
            navigateur, et un onglet fermé les arrête. Elle dit les deux
            faits : le dossier part maintenant, le reste continue tant que
            la page est là. */}
        {pretHorsConsent && vue.enVol > 0 && (
          <p className="at-d-pasparti at-d-pasparti--fond" role="status">
            {vue.enVol === 1 ? 'Une photo finit' : `${vue.enVol} photos finissent`} d’arriver.
            Vous pouvez envoyer dès maintenant : nous ouvrons votre dossier, et
            {vue.enVol === 1 ? ' elle continue' : ' elles continuent'} de monter
            tant que cette page reste ouverte.
          </p>
        )}

        <div className="at-q-barre-int">
          <label className="at-check at-d-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => onConsent(e.target.checked)}
            />
            <span>Vous confirmez avoir le droit d’utiliser ces photos.</span>
          </label>

          <div className="at-q-actions at-d-actions">
            {erreur && <p key={erreurCle} className="at-erreur" role="alert">{erreur}</p>}
            {/* T-054 — quand des photos ont échoué, le bouton dit ce qu'il va
                VRAIMENT faire : envoyer les confirmées, pas la totalité.
                Bloquer sans expliquer serait pire — la réparation (Reprendre)
                est à un geste, et l'alerte ci-dessus la désigne.
                ⚠️ Le décompte « X sur Y » ne s'affiche QUE file au repos :
                avec des photos encore en vol, Y bougerait à chaque
                confirmation, et un libellé de bouton qui change tout seul
                deux fois par seconde ne se lit pas. */}
            <button type="button" className="at-cta" onClick={envoyer} disabled={!pretHorsConsent}>
              {envoi
                ? 'Un instant…'
                : enErreur.length > 0 && vue.enVol === 0 && vue.confirmees >= MIN_PHOTOS
                  ? `Envoyer ${vue.confirmees} photos sur ${vue.confirmees + enErreur.length} à l’atelier`
                  : 'Envoyer à l’atelier'}
              <span className="at-cta-arrow">→</span>
            </button>

            {/* Un bouton gris sans explication est une impasse : on dit
                toujours ce qui manque, et une chose à la fois. Le
                consentement n'apparaît plus ici (03/09) : il se dit au clic. */}
            {blocage && (
              <span className="at-d-bloc">
                {blocage === 'photos'
                  ? `Encore ${ilManque} photo${ilManque > 1 ? 's' : ''}.`
                  : `Vous en avez assez : ${ilManque === 1 ? 'la dernière arrive' : `les ${ilManque} dernières arrivent`}.`}
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
