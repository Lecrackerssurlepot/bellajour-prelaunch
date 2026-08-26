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
   ══════════════════════════════════════════════════════════════════════════ */

import LienPartage from '../../../components/LienPartage'
import { TITRE_PLACEHOLDER } from '../coverModels'

export default function Screen6Fin({
  titre, token,
}: {
  titre: string
  /** Le dossier existe depuis l'écran 4 : sans token, pas de lien à garder. */
  token: string | null
}) {
  const nom = titre.trim() || TITRE_PLACEHOLDER

  return (
    <>
      <div className="at-done" aria-hidden="true">✓</div>
      <p className="at-kicker">C’est fait</p>
      <h2>{nom}<br />est entre nos mains.</h2>
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
