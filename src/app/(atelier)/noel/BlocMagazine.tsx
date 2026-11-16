'use client'

/* Le bloc de Noël de /magazine : la carte cadeau, une phrase, trois gestes.
   Posé APRÈS le kiosque (le premier écran de la page va jusqu'au bouton,
   piège 2 de src/app/CLAUDE.md) et avant le corps. Monté seulement quand le
   drapeau de Noël est ouvert (page serveur). */

import Link from 'next/link'
import { COMPOSER_HREF } from '../content'
import { PARAM_NOUVEAU } from '../composer/draft'
import CarteCadeau from '../noel-preview/CarteCadeau'
import { PHRASES, TEXTES } from '../noel-preview/contenu'
import { ligneCompteur, usePlaces } from './places'
import './noel.css'

const T = TEXTES.sobre
/* Composer pour offrir COMMENCE un numéro : `?nouveau=1`, comme le lien de
   /compte (piège 8 du questionnaire), sinon un dossier déjà ouvert sur
   l'appareil serait rouvert. */
const COMPOSER_NOEL = `${COMPOSER_HREF}?${PARAM_NOUVEAU}=1`

export default function BlocMagazine() {
  const places = usePlaces()
  return (
    <section className="nl-noel nl-noel-mag" aria-labelledby="nl-noel-mag-titre">
      <div className="nl-mag-grille">
        <div className="nl-mag-carte">
          <CarteCadeau phrase={PHRASES[0]} montant="50 €" prenom="" message="" />
        </div>
        <div className="nl-texte">
          <span className="nl-surtitre">Pour Noël</span>
          <h2 id="nl-noel-mag-titre" className="nl-titre">{T.titre}</h2>
          <p className="nl-sous">{T.sousTitre}</p>
          {places !== null && <p className="nl-places">{ligneCompteur(places)}</p>}
          <div className="nl-gestes">
            <Link className="nl-cta nl-cta--plein" href="/offrir" prefetch={false}>Offrir une carte</Link>
            <Link className="nl-cta" href={COMPOSER_NOEL} prefetch={false}>Composer le mien pour Noël</Link>
            <Link className="nl-cta nl-cta--discret" href="/offrir#conditions" prefetch={false}>Bon à savoir</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
