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
import './vitrine.css'

type Couverture = { nom: string; src: string; srcSet: string }

const A = '/images/v2/accueil'
const M = '/images/v2/magazine'

/* Six couvertures de Bellajour (une rangée sur ordinateur, deux de trois sur téléphone), choisies
   pour une école comme pour une entreprise : le soir, la ville, le voyage. « That's Life »,
   presque noire, est écartée ; « 26 » aussi (une septième restait seule sur sa rangée). */
export const COUVERTURES_VITRINE: readonly Couverture[] = [
  { nom: 'Lisbonne', src: `${A}/couverture-lisbonne-360.webp`, srcSet: `${A}/couverture-lisbonne-360.webp 360w, ${A}/couverture-lisbonne-640.webp 640w` },
  { nom: 'The Boys', src: `${A}/couverture-the-boys-360.webp`, srcSet: `${A}/couverture-the-boys-360.webp 360w, ${A}/couverture-the-boys-640.webp 640w` },
  { nom: 'Côte d’Azur', src: `${A}/couverture-cote-azur-360.webp`, srcSet: `${A}/couverture-cote-azur-360.webp 360w, ${A}/couverture-cote-azur-640.webp 640w` },
  { nom: 'Rio', src: `${A}/couverture-rio-450.webp`, srcSet: `${A}/couverture-rio-450.webp 450w, ${A}/couverture-rio-700.webp 700w` },
  { nom: 'Aussie', src: `${A}/couverture-aussie-360.webp`, srcSet: `${A}/couverture-aussie-360.webp 360w, ${A}/couverture-aussie-640.webp 640w` },
  { nom: 'Sicile', src: `${M}/couverture-sicile-450.webp`, srcSet: `${M}/couverture-sicile-450.webp 450w, ${M}/couverture-sicile-900.webp 900w` },
]

export const DOUBLE_VITRINE = {
  nom: 'Australia',
  src: `${M}/double-page-australie-700.webp`,
  srcSet: `${M}/double-page-australie-700.webp 700w, ${M}/double-page-australie-1050.webp 1050w, ${M}/double-page-australie-1400.webp 1400w`,
} as const

export default function Vitrine({ token, registre }: { token: string; registre: Registre }) {
  const p = parler(registre)
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
            {COUVERTURES_VITRINE.map((c) => (
              <li key={c.nom} className="ec-vt-couv">
                <img src={c.src} srcSet={c.srcSet} sizes="(max-width: 860px) 32vw, 200px" alt={`Couverture du magazine « ${c.nom} »`} loading="lazy" decoding="async" />
                <span className="ec-vt-nom">{c.nom}</span>
              </li>
            ))}
          </ul>

          <figure className="ec-vt-double">
            <img
              src={DOUBLE_VITRINE.src}
              srcSet={DOUBLE_VITRINE.srcSet}
              sizes="(max-width: 860px) 100vw, 900px"
              alt={`Une double page du magazine « ${DOUBLE_VITRINE.nom} »`}
              loading="lazy"
              decoding="async"
            />
            <figcaption className="ec-vt-nom">Une double page : {DOUBLE_VITRINE.nom}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
