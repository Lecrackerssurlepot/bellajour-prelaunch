/* Un lien de dépôt qui ne mène plus nulle part (T-196) : voir LienMort.tsx.
   `notFound()` de la page garde le 404 ; ce fichier n'en change que le texte. */

import LienMort from './LienMort'

export default function DepotIntrouvable() {
  return <LienMort />
}
