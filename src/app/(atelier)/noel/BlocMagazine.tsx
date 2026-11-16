'use client'

/* Le bloc de Noël de /magazine. Posé APRÈS le kiosque (le premier écran de
   la page va jusqu'au bouton, piège 2 de src/app/CLAUDE.md) et avant le
   corps. Monté seulement quand le drapeau de Noël est ouvert (page serveur).

   16/11, Mathias : le −40 % et le −20 % doivent se voir et pousser l'achat,
   et « Offrir une carte » ne disait pas que c'est une carte CADEAU. D'où
   l'offre en grands chiffres, et des boutons qui nomment ce qu'ils vendent.
   Hors de la fenêtre de la règle (exemplaires.ts), l'offre s'efface et la
   carte cadeau reste. `id="noel"` : la cible du bandeau. */

import Link from 'next/link'
import { NOEL_REMISE_AUTRE_PCT, NOEL_REMISE_MEME_PCT } from '@/lib/atelier/exemplaires'
import { COMPOSER_HREF } from '../content'
import { PARAM_NOUVEAU } from '../composer/draft'
import CarteCadeau from '../noel-preview/CarteCadeau'
import { PHRASES } from '../noel-preview/contenu'
import { ligneCompteur, useFenetreNoel, usePlaces } from './places'
import { useGlisserAuChargement } from './glisser'
import './noel.css'

/* Composer pour Noël COMMENCE un numéro : `?nouveau=1`, comme le lien de
   /compte (piège 8 du questionnaire), sinon un dossier déjà ouvert sur
   l'appareil serait rouvert. */
const COMPOSER_NOEL = `${COMPOSER_HREF}?${PARAM_NOUVEAU}=1`

export default function BlocMagazine() {
  useGlisserAuChargement('noel', 'noel')
  const places = usePlaces()
  const fenetre = useFenetreNoel()
  return (
    <section id="noel" className="nl-noel nl-noel-mag" aria-labelledby="nl-noel-mag-titre">
      <div className="nl-mag-grille">
        <div className="nl-mag-carte">
          <CarteCadeau phrase={PHRASES[0]} montant="50 €" prenom="" message="" />
        </div>
        <div className="nl-texte">
          <span className="nl-surtitre">Pour Noël</span>
          {fenetre ? (
            <>
              <h2 id="nl-noel-mag-titre" className="nl-titre">Un pour vous, un à offrir.</h2>
              <div className="nl-offre" role="list">
                <div className="nl-offre-ligne" role="listitem">
                  <span className="nl-offre-pct">−{NOEL_REMISE_MEME_PCT}&nbsp;%</span>
                  <span className="nl-offre-quoi">le 2<sup>e</sup> magazine, même couverture</span>
                </div>
                <div className="nl-offre-ligne" role="listitem">
                  <span className="nl-offre-pct">−{NOEL_REMISE_AUTRE_PCT}&nbsp;%</span>
                  <span className="nl-offre-quoi">le 2<sup>e</sup>, avec une autre couverture</span>
                </div>
              </div>
              <p className="nl-offre-note">Jusqu&apos;au 7 décembre, livraison en France.</p>
            </>
          ) : (
            <h2 id="nl-noel-mag-titre" className="nl-titre">Offrez un magazine.</h2>
          )}
          <p className="nl-sous">Offrez une carte cadeau à vos proches, du montant de votre choix.</p>
          {places !== null && <p className="nl-places">{ligneCompteur(places)}</p>}
          <div className="nl-gestes">
            {fenetre && <Link className="nl-cta nl-cta--plein" href={COMPOSER_NOEL} prefetch={false}>Composer pour Noël</Link>}
            <Link className={`nl-cta ${fenetre ? '' : 'nl-cta--plein'}`} href="/offrir" prefetch={false}>Offrir une carte cadeau</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
