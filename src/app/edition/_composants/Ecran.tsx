/* Le gabarit d'un écran de l'espace client (révision §14.1) : un en-tête fixe
   de 68 px (le titre, une phrase, les actions), puis un corps qui prend le
   reste de la hauteur. Rien ne fait défiler la page : ce sont les zones
   longues du corps (`.ec-defile`) qui défilent, chacune chez elle.
   Composant serveur ; la pastille « Envoi en cours » (client) s'y pose à
   gauche des actions, sur tous les écrans (maquette EnvoiPhotos). */

import { PastilleEnvoi } from './depot/DepotContexte'

export function EnTeteEcran({ titre, sous, children }: { titre: React.ReactNode; sous?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="ec-ecran-tete">
      <div className="ec-ecran-titres">
        <h1 className="ec-ecran-titre">{titre}</h1>
        {sous ? <span className="ec-ecran-sous">{sous}</span> : null}
      </div>
      <div className="ec-ecran-actions">
        <PastilleEnvoi />
        {children}
      </div>
    </header>
  )
}
