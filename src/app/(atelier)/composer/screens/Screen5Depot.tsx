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
 * (invariant nº2). D'où « autour de 40 € · prix confirmé avec votre
 * couverture », jamais un montant sec qui se lirait comme un engagement.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDepot } from '../depot/useDepot'
import { MAX_PHOTOS, MIN_PHOTOS, manquantes, palierPour, restantes } from '../depot/paliers'
import type { Refus } from '../depot/moteur'
import '../depot/depot.css'

const ACCEPTE = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif'

const RAISONS: Record<string, string> = {
  format: 'format non accepté',
  taille: 'plus de 50 Mo',
  plafond: 'le numéro est complet',
}

export default function Screen5Depot({
  token, consent, onConsent, onTermine,
}: {
  token: string | null
  consent: boolean
  onConsent: (v: boolean) => void
  onTermine: () => void
}) {
  const { vue, compteur, ajouter, supprimer, reprendrePhoto, finaliser } = useDepot(token)
  const [refus, setRefus] = useState<Refus[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [survol, setSurvol] = useState(false)
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

  /* Bouton ouvert seulement quand tout est vraiment arrivé : le seuil est
     atteint, plus rien n'est en vol, et l'accord est donné. Ouvrir plus tôt,
     c'est promettre à l'atelier des photos qui ne sont pas là. */
  const pretAEnvoyer = vue.confirmees >= MIN_PHOTOS && vue.enVol === 0 && consent && !envoi

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
    if (!pretAEnvoyer) return
    setEnvoi(true)
    setErreur(null)
    const r = await finaliser()
    setEnvoi(false)
    if (!r.ok) { setErreur(r.message ?? 'Réessayez dans un instant.'); return }
    onTermine()
  }, [pretAEnvoyer, finaliser, onTermine])

  if (!token) {
    return (
      <>
        <p className="at-kicker">Étape 5 sur 6</p>
        <h2>Un instant.</h2>
        <p className="at-lede at-q-lede">
          Votre dossier n’a pas encore été créé. Revenez à l’écran précédent
          pour nous laisser vos coordonnées — c’est là que tout commence.
        </p>
      </>
    )
  }

  return (
    <>
      <p className="at-kicker">Étape 5 sur 6</p>
      <h2>Vos photos,<br />maintenant.</h2>
      <p className="at-lede at-q-lede">
        Entre {MIN_PHOTOS} et {MAX_PHOTOS}. Ne triez pas trop — le tri, c’est notre métier.
      </p>

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

      {/* ── zone de dépôt ─────────────────────────────────────────────── */}
      <div
        className={`at-d-zone${survol ? ' is-survol' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true) }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); recevoir(e.dataTransfer.files) }}
      >
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
        <button type="button" className="at-d-parcourir" onClick={() => champ.current?.click()}>
          Choisir des photos
        </button>
        <span className="at-d-zone-note">
          JPG, PNG et HEIC — le format par défaut de l’iPhone. 50 Mo par photo.
        </span>
      </div>

      {/* ── compteur, jauge, palier ───────────────────────────────────── */}
      <div className="at-d-etat">
        {/* « déposées » était le mot du problème : c'est le nom de l'étape,
            et il se lit comme un état final. Après cinquante-cinq photos
            cochées vertes, « 55 photos déposées » veut dire « j'ai fini ».
            « prêtes » dit la même vérité et laisse le geste devant. */}
        <div className="at-d-compteur">
          <b>{compteur}</b>
          <span>{compteur > 1 ? 'photos prêtes' : 'photo prête'}</span>
        </div>

        {/* PRD §15 : scaleX, jamais width. Le repère marque le seuil des 40. */}
        <div className="at-d-jauge" aria-hidden="true">
          <i style={{ transform: `scaleX(${Math.min(1, vue.confirmees / MAX_PHOTOS)})` }} />
          <u style={{ left: `${(MIN_PHOTOS / MAX_PHOTOS) * 100}%` }} />
        </div>

        <p className="at-d-palier" role="status">
          {ilManque > 0 ? (
            <>encore <b>{ilManque}</b> pour composer un numéro</>
          ) : palier ? (
            <>
              <b>{palier.pages}</b> · {palier.autour}
              <em> · prix confirmé avec votre couverture</em>
            </>
          ) : (
            <>le numéro est complet</>
          )}
        </p>

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

        {ilManque === 0 && ilReste > 0 && ilReste <= 10 && (
          <p className="at-d-reste">Encore {ilReste} de libre avant le plafond.</p>
        )}
      </div>

      {/* ── refus à l'entrée ──────────────────────────────────────────── */}
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

      {/* ── la grille ─────────────────────────────────────────────────── */}
      {vue.photos.length > 0 && (
        <ul className="at-d-grille">
          {vue.photos.map((p) => (
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
        </ul>
      )}

      {erreur && <p className="at-erreur" role="alert">{erreur}</p>}

      {/* ── LA BARRE D'ENVOI, COLLANTE ────────────────────────────────
          Elle était en bas de page, sous la grille. Avec cinquante-cinq
          vignettes, le seul geste de l'écran se retrouvait à trois écrans
          sous la ligne de flottaison — invisible. Pendant ce temps la jauge
          était pleine, chaque tuile portait son ✓ vert et le compteur disait
          « déposées ». Tout affirmait que c'était fini.

          Elle colle donc au bas de la zone de défilement dès qu'il y a une
          photo. `position: sticky` et non `fixed` : elle appartient à la
          colonne qui défile, elle ne se superpose pas au reste du site. */}
      <div className={vue.photos.length > 0 ? 'at-d-envoi at-d-envoi--collee' : 'at-d-envoi'}>
        {/* La phrase qui manquait. Elle ne dit pas ce qui est fait, elle dit
            ce qui ne l'est pas encore — c'est la seule information que
            l'écran ne portait nulle part. */}
        {vue.photos.length > 0 && (
          <p className="at-d-pasparti">
            Vos photos sont arrivées chez nous, mais <b>l’atelier ne les a pas encore
            reçues</b> : rien ne part tant que vous n’avez pas cliqué.
          </p>
        )}

        <label className="at-check at-d-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsent(e.target.checked)}
          />
          <span>Vous confirmez avoir le droit d’utiliser ces photos.</span>
        </label>

        <div className="at-q-actions at-d-actions">
          <button type="button" className="at-cta" onClick={envoyer} disabled={!pretAEnvoyer}>
            {envoi ? 'Un instant…' : 'Envoyer à l’atelier'}
            <span className="at-cta-arrow">→</span>
          </button>

          {/* Un bouton gris sans explication est une impasse : on dit toujours
              ce qui manque, et une chose à la fois. */}
          {!pretAEnvoyer && !envoi && (
            <span className="at-d-bloc">
              {ilManque > 0
                ? `Encore ${ilManque} photo${ilManque > 1 ? 's' : ''}.`
                : vue.enVol > 0
                  ? 'Envoi en cours — quelques secondes.'
                  : !consent
                    ? 'Cochez la ligne au-dessus.'
                    : null}
            </span>
          )}
        </div>
      </div>

    </>
  )
}
