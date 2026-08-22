/* Token inconnu, mal formé, ou dossier supprimé — test d'acceptation §17.7 :
   « page d'erreur propre, aucune fuite d'information ».

   Les trois cas rendent EXACTEMENT la même page. Distinguer « ce token
   n'existe pas » de « ce token a expiré » donnerait à qui essaie des liens au
   hasard un moyen de savoir lesquels ont existé. */

import { CONTACT_EMAIL } from '../atelier/content'
import './numero.css'

export default function NumeroIntrouvable() {
  return (
    <div className="nu-perdu">
      <div>
        <p className="at-kicker">Bellajour</p>
        <p className="nu-mot">Ce lien ne mène à aucun numéro.</p>
        <p className="nu-sub">
          Vérifiez le lien reçu par mail — il est long, et un caractère manquant
          suffit. Si le doute persiste, écrivez-nous à <b>{CONTACT_EMAIL}</b>,
          on retrouve votre dossier.
        </p>
      </div>
    </div>
  )
}
