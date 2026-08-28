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
   ══════════════════════════════════════════════════════════════════════════ */

import LienPartage from '../../../components/LienPartage'
import { TITRE_PLACEHOLDER } from '../coverModels'

export default function Screen6Fin({
  titre, token, nbPhotos,
}: {
  titre: string
  /** Le dossier existe depuis l'écran 4 : sans token, pas de lien à garder. */
  token: string | null
  /** Le compte confirmé par le serveur. Zéro = inconnu, on n'invente pas. */
  nbPhotos: number
}) {
  const nom = titre.trim() || TITRE_PLACEHOLDER

  return (
    <>
      <div className="at-done" aria-hidden="true">✓</div>
      <p className="at-kicker">C’est fait</p>
      <h2>{nom}<br />est entre nos mains.</h2>
      <p className="at-lede at-q-lede">
        <b>
          L’atelier a bien reçu {nbPhotos > 0 ? <>vos {nbPhotos} photos</> : <>vos photos</>}{' '}
          et votre demande.
        </b>{' '}
        Nous commençons à composer votre numéro.
      </p>
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
