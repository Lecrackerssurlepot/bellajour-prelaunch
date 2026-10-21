/* Le gabarit d'un écran de l'espace client (révision §14.1) : un en-tête fixe
   de 68 px (le titre, une phrase, les actions), puis un corps qui prend le
   reste de la hauteur. Rien ne fait défiler la page : ce sont les zones
   longues du corps (`.ec-defile`) qui défilent, chacune chez elle.
   Composant serveur ; la pastille « Envoi en cours » (client) s'y pose à
   gauche des actions, sur tous les écrans (maquette EnvoiPhotos).
   Le grand titre est `TitreEcran` (client) : sur téléphone il passe dans la
   barre du haut quand il défile dessous (planche 1 du 21/10/2026). */

import { PastilleAppareil } from './AppareilContexte'
import { PastilleEnvoi } from './depot/DepotContexte'
import TitreEcran from './TitreEcran'

export function EnTeteEcran({ titre, sous, children }: { titre: React.ReactNode; sous?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="ec-ecran-tete">
      <div className="ec-ecran-titres">
        <TitreEcran>{titre}</TitreEcran>
        {sous ? <span className="ec-ecran-sous">{sous}</span> : null}
      </div>
      <div className="ec-ecran-actions">
        <PastilleEnvoi />
        <PastilleAppareil />
        {children}
      </div>
    </header>
  )
}
