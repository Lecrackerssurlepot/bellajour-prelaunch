/* La page Style tant que le choix du style est FERMÉ (`stylesOuverts`,
   interrupteur.ts) : une vitrine de nos magazines à la place du mur.

   Décision de Mathias, 19/10 au soir, pour la première vraie édition
   (Audencia) : les visuels du mur ne sont pas prêts ; on montre « au moins nos
   magazines » et on bloque le reste, pour que le client se serve des photos.
   Les images sont des fichiers STATIQUES déjà publiés sur bellajour.fr
   (accueil, /magazine, /composer) : ni base, ni coffre, ni image d'essai. La
   page le dit franchement (« bientôt »), sans date promise.
   Composant serveur, aucune interaction ; mêmes jetons que l'espace (jour et
   nuit), aucune couleur écrite en dur. */

import Link from 'next/link'
import { parler } from '@/lib/collectif/espace'
import type { Registre } from '@/lib/collectif/types'
import { cheminSection } from '@/lib/collectif/verrous'
import { EnTeteEcran } from '../../_composants/Ecran'
import { fichiersVisuels } from '@/components/Visuel'
import './vitrine.css'

/* Six couvertures de Bellajour (une rangée sur ordinateur, deux de trois sur téléphone), choisies
   pour une école comme pour une entreprise : le soir, la ville, le voyage. « That's Life »,
   presque noire, est écartée ; « 26 » aussi (une septième restait seule sur sa rangée).
   Les images viennent des emplacements edition.vitrine-* de la librairie (media.ts). */
export const COUVERTURES_VITRINE = [
  { nom: 'Lisbonne', slot: 'edition.vitrine-1' },
  { nom: 'The Boys', slot: 'edition.vitrine-2' },
  { nom: 'Côte d’Azur', slot: 'edition.vitrine-3' },
  { nom: 'Rio', slot: 'edition.vitrine-4' },
  { nom: 'Aussie', slot: 'edition.vitrine-5' },
  { nom: 'Sicile', slot: 'edition.vitrine-6' },
] as const

export const DOUBLE_VITRINE = { nom: 'Australia', slot: 'edition.vitrine-double' } as const

export default async function Vitrine({ token, registre }: { token: string; registre: Registre }) {
  const p = parler(registre)
  const V = await fichiersVisuels([...COUVERTURES_VITRINE.map((c) => c.slot), DOUBLE_VITRINE.slot])
  return (
    <section className="ec-ecran ec-vt">
      <EnTeteEcran titre="Style" />
      <div className="ec-ecran-corps">
        <div className="ec-defile ec-vt-defile">
          <div className="ec-carte ec-vt-intro">
            <h2 className="ec-vt-titre">{p('Le style de votre magazine', 'Le style de ton magazine')}</h2>
            <p className="ec-texte">{p('Vous le choisirez ici, bientôt.', 'Tu le choisiras ici, bientôt.')}</p>
            <div className="ec-vt-gestes">
              <Link href={cheminSection(token, 'photos')} prefetch={false} className="ec-bouton">
                Aller aux photos
              </Link>
              <Link href={cheminSection(token, 'atelier')} prefetch={false} className="ec-bouton ec-bouton--clair">
                Écrire à l’atelier
              </Link>
            </div>
          </div>

          <ul className="ec-vt-couvs" aria-label="Quelques magazines Bellajour">
            {COUVERTURES_VITRINE.filter((c) => V[c.slot]).map((c) => (
              <li key={c.nom} className="ec-vt-couv">
                <img src={V[c.slot]} alt={`Couverture du magazine « ${c.nom} »`} loading="lazy" decoding="async" />
                <span className="ec-vt-nom">{c.nom}</span>
              </li>
            ))}
          </ul>

          {V[DOUBLE_VITRINE.slot] ? (
          <figure className="ec-vt-double">
            <img
              src={V[DOUBLE_VITRINE.slot]}
              alt={`Une double page du magazine « ${DOUBLE_VITRINE.nom} »`}
              loading="lazy"
              decoding="async"
            />
            <figcaption className="ec-vt-nom">Une double page : {DOUBLE_VITRINE.nom}</figcaption>
          </figure>
          ) : null}
        </div>
      </div>
    </section>
  )
}
