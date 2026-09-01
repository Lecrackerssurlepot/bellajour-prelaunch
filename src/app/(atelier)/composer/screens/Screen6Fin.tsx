/* Écran 6 — « {{titre}} est entre nos mains. »

   ══════════════════════════════════════════════════════════════════════════
   RÉDUIT À L'ESSENTIEL (T2-1, recette du 26/08)

   « L'écran a trop de texte, et la case reste peu claire. La page devrait
   juste dire que l'atelier s'en occupe. » Un moment de conclusion ne se
   partage pas : le ✓, une phrase, le bouton pour suivre. C'est tout.

   La case « montrer des extraits » est PARTIE sur la page /numero
   (ConsentCommunication.tsx) : là-bas elle a du contexte et du temps, ici
   elle encombrait — et sur un écran qui ressemble à une validation, une
   case seule se lit comme une condition à remplir.

   Le rappel « gardez ce lien » tient en une ligne, avec les deux gestes de
   T2-12 (copier, partager) plutôt qu'une URL que personne n'enregistre.

   ⚠️ AJOUT DU 28/08 : L'ACCUSÉ EXPLICITE.
   « {{titre}} est entre nos mains » est une belle phrase, et une phrase
   vague : elle ne dit ni ce qui est arrivé, ni ce qu'on va en faire. Or
   c'est précisément l'écran où la cliente décide si elle a fini ou non — le
   dossier du 27/08 s'est arrêté faute de savoir qu'il restait une étape.
   Une ligne nomme donc les DEUX choses reçues (les photos, avec leur
   nombre, et la demande) et ce qui commence.
   Le nombre vient du moteur de dépôt, remonté par `onTermine` : c'est le
   compte CONFIRMÉ par le serveur, pas celui de la grille. À zéro (reprise
   d'une session perdue), la phrase se dit sans lui plutôt que de mentir.
   ⚠️ AJOUT DU 01/09 : LA QUEUE DE TRANSFERT.
   Depuis que le bouton de l'écran 5 s'ouvre sans attendre la fin des envois,
   cet écran peut être atteint avec des photos encore en route. Le moteur de
   dépôt est un singleton hors React : il SURVIT au démontage de l'écran 5 et
   continue de pomper. Cet écran s'y rabranche pour dire, honnêtement, ce qui
   se passe — sans jamais promettre que tout arrivera : le transfert part du
   NAVIGATEUR, et fermer l'onglet l'arrête. Aucun serveur ne peut le reprendre.
   ══════════════════════════════════════════════════════════════════════════ */

'use client'

import LienPartage from '../../../components/LienPartage'
import { TITRE_PLACEHOLDER } from '../coverModels'
import { useDepot } from '../depot/useDepot'

export default function Screen6Fin({
  titre, token, nbPhotos,
}: {
  titre: string
  /** Le dossier existe depuis l'écran 4 : sans token, pas de lien à garder. */
  token: string | null
  /** Le compte confirmé par le serveur au clic. Zéro = inconnu, on n'invente pas. */
  nbPhotos: number
}) {
  const nom = titre.trim() || TITRE_PLACEHOLDER

  /* Le MÊME moteur que l'écran 5 (singleton par token) : ce hook ne recrée
     rien, il se rabranche et republie l'instantané une fois par frame.
     `reprendre()` re-lit le coffre local et ne fait rien de plus — chaque
     entrée y est déjà connue du moteur. */
  const { vue } = useDepot(token)

  /* Le compte au clic est un plancher : il ne peut que monter pendant que la
     queue finit. On garde le plus grand des deux, jamais un chiffre qui
     descendrait sous les yeux de la cliente. */
  const arrivees = Math.max(vue.confirmees, nbPhotos)
  const enRoute = vue.enVol

  return (
    <>
      <div className="at-done" aria-hidden="true">✓</div>
      <p className="at-kicker">C’est fait</p>
      <h2>{nom}<br />est entre nos mains.</h2>
      <p className="at-lede at-q-lede">
        <b>
          L’atelier a bien reçu {arrivees > 0 ? <>vos {arrivees} photos</> : <>vos photos</>}{' '}
          et votre demande.
        </b>{' '}
        Nous commençons à composer votre numéro.
      </p>

      {/* ── LA QUEUE, DITE SANS DRAMATISER ET SANS PROMETTRE ──────────
          Une seule idée : le dossier est parti, le reste monte encore, et
          fermer maintenant coûte ces photos-là. On ne dit surtout pas « vous
          pouvez fermer, nous avons l'essentiel » tout court : ce serait vrai
          pour le numéro et faux pour ses photos. */}
      {enRoute > 0 && (
        <p className="at-lede at-q-lede at-fin-queue" role="status">
          <b>
            {enRoute === 1
              ? 'Une dernière photo monte encore.'
              : `${enRoute} dernières photos montent encore.`}
          </b>{' '}
          Laissez cette page ouverte une minute et elles nous rejoindront. Si
          vous partez maintenant, nous composerons avec les {arrivees} qui sont
          déjà là.
        </p>
      )}

      <p className="at-lede at-q-lede">
        Votre couverture arrive sous 48 h par mail. Vous ne payez qu’après
        l’avoir vue — et seulement si elle vous plaît.
      </p>

      {/* Elle est ici, maintenant, et c'est le meilleur moment pour lui dire
          de garder son lien : il n'y a ni compte ni mot de passe, ce lien EST
          son espace client, et le mail qui le porte peut tomber en
          Promotions. */}
      {token && (
        <p className="at-q-note">
          <b>Gardez votre lien.</b> C’est le seul, il suit votre numéro jusqu’à la livraison.
          <br />
          <LienPartage url={`/numero/${token}`} />
        </p>
      )}
    </>
  )
}
