/* Un lien d'édition inconnu, archivé ou tapé sur la mauvaise porte (T-154) :
   la MÊME page dans tous les cas (pas d'annuaire, PRD §10), et un chemin pour
   le responsable qui a perdu le sien : « Retrouver mon espace ». */

import Link from 'next/link'
import Porte from './_composants/Porte'

export default function LienIntrouvable() {
  return (
    <Porte surtitre="Édition collective" titre="Ce lien ne mène à aucun espace">
      <p>Il a peut-être été changé par l&apos;atelier, ou il manque un morceau de l&apos;adresse.</p>
      <p>
        Vous êtes le responsable de l&apos;édition ?{' '}
        <Link className="ec-porte-lien" href="/edition/retrouver">
          Retrouver mon espace
        </Link>
      </p>
    </Porte>
  )
}
