/* Une section de l'espace pas encore ouverte (verrou) ou pas encore construite.
   Composant serveur, aucune interaction.

   ⚠️ Le VERROU reprend mot pour mot la raison de `verrousPour` : une URL
   tapée à la main sur une étape fermée dit la même chose que le menu, jamais
   une erreur (PRD §3.2).
   Un écran sobre : le titre est celui de l'en-tête, la raison tient sur UNE ligne
   courante, en haut (plus de gros titre serif qui double la bulle du menu, plus
   de 700 px de vide). */

import { EnTeteEcran } from './Ecran'

export function Verrou({ titre, raison }: { titre: string; raison: string }) {
  return (
    <section className="ec-ecran">
      <EnTeteEcran titre={titre} />
      <div className="ec-ecran-corps">
        <p className="ec-verrou ec-verrou--ligne">{raison}.</p>
      </div>
    </section>
  )
}

export function AVenir({ titre, texte }: { titre: string; texte: string }) {
  return (
    <section className="ec-ecran">
      <EnTeteEcran titre={titre} />
      <div className="ec-ecran-corps ec-ecran-corps--centre">
        <div className="ec-a-venir">
          <p className="ec-texte">{texte}</p>
        </div>
      </div>
    </section>
  )
}
