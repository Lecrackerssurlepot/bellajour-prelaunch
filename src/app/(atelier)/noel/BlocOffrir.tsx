'use client'

/* Le bloc de Noël, sur /offrir (charte V2, 26/11). Il vivait sur /magazine
   (BlocMagazine, 16/11) ; le duplicata validé (« essai photo duplicata »,
   page Offrir) le pose ici, en bloc nuit, et laisse /magazine à l'objet.
   La carte elle-même est déjà en haut de la page : le bloc ne montre que
   l'offre et deux couvertures. `id="noel"` : la cible du bandeau
   (`VERS_NOEL`, glisser.ts). Hors de la fenêtre des remises (exemplaires.ts),
   l'offre s'efface et la phrase de la carte cadeau reste. */

import Link from 'next/link'
import { NOEL_REMISE_AUTRE_PCT, NOEL_REMISE_MEME_PCT } from '@/lib/atelier/exemplaires'
import { COMPOSER_HREF } from '../content'
import { PARAM_NOUVEAU } from '../composer/draft'
import { ligneCompteur, useFenetreNoel, usePlaces } from './places'
import { useGlisserAuChargement } from './glisser'

/* Composer pour Noël COMMENCE un numéro (`?nouveau=1`, piège 8 du questionnaire). */
const COMPOSER_NOEL = `${COMPOSER_HREF}?${PARAM_NOUVEAU}=1`

type Couverture = { fichier: string; alt: string; cadrage?: string }

export default function BlocOffrir({ couvertures }: { couvertures: Couverture[] }) {
  useGlisserAuChargement('noel', 'noel')
  const places = usePlaces()
  const fenetre = useFenetreNoel()
  return (
    <section id="noel" className="bloc noel" aria-labelledby="noel-titre">
      <div className="cadre">
        <div>
          <span className="lab sub rv">Pour Noël</span>
          {fenetre ? (
            <>
              <h2 id="noel-titre" className="titre rv d1">Un pour vous, un à offrir.</h2>
              <div className="remises rv d2">
                <div>
                  <b>−{NOEL_REMISE_MEME_PCT}&nbsp;%</b>
                  <span>le 2<sup>e</sup> magazine, même couverture</span>
                </div>
                <div>
                  <b>−{NOEL_REMISE_AUTRE_PCT}&nbsp;%</b>
                  <span>le 2<sup>e</sup>, avec une autre couverture</span>
                </div>
              </div>
              <p className="sub rv">Jusqu’au 7 décembre, livraison en France.</p>
              {places !== null && <p className="sub rv">{ligneCompteur(places)}</p>}
              <div className="ctas rv">
                <Link className="btn" href={COMPOSER_NOEL} prefetch={false}>Composer pour Noël</Link>
              </div>
            </>
          ) : (
            <h2 id="noel-titre" className="titre rv d1">Offrez un magazine.</h2>
          )}
        </div>
        {couvertures.length > 0 && (
          <div className="noel-vis rv" aria-hidden="true">
            {couvertures.map((c) => (
              <img key={c.fichier} src={c.fichier} alt="" loading="lazy" decoding="async" style={c.cadrage ? { objectPosition: c.cadrage } : undefined} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
