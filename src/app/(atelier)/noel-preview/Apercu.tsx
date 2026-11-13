'use client'

/* La planche de Noël : un visuel par partie, et sous chacun la checklist
   charte. Une case n'est cochée qu'après une mesure réelle à 375 px et à
   1280 px (captures dans docs/noel-2026/captures/) ; une case vide dit ce
   qui reste à trancher. Le ton (sobre / décontracté) est un état d'écran. */

import { useState } from 'react'
import CarteCadeau, { type Variante } from './CarteCadeau'
import Offrir from './Offrir'
import Exemplaire from './Exemplaire'
import ApercuMails from './ApercuMails'
import { PLACES_EXEMPLE, TEXTES, type Ton } from './contenu'

type Point = { texte: string; ok: boolean }

/* Les points communs à toutes les parties. */
const COMMUNS: Point[] = [
  { texte: 'Jetons du monde sombre seulement (theme.css), aucune couleur en dur', ok: true },
  { texte: 'Cormorant Garamond (titres) et DM Sans (texte)', ok: true },
  { texte: 'Vouvoiement, sans « ! » ni emoji, aucun mot interdit', ok: true },
  { texte: '375 px : rien ne déborde, rien ne se superpose', ok: true },
  { texte: '1280 px : rien ne déborde, rien ne se superpose', ok: true },
]

function Checklist({ points }: { points: Point[] }) {
  return (
    <ul className="nl-check" aria-label="Checklist charte">
      {[...COMMUNS, ...points].map((p) => (
        <li key={p.texte} data-ok={p.ok ? '1' : '0'}>
          <span className="nl-check-case" aria-hidden="true">{p.ok ? '✓' : ''}</span>
          <span>{p.texte}</span>
        </li>
      ))}
    </ul>
  )
}

function Partie({ id, numero, titre, children, points }: {
  id: string
  numero: string
  titre: string
  children: React.ReactNode
  points: Point[]
}) {
  return (
    <section className="nl-partie" id={id}>
      <header className="nl-partie-tete">
        <span className="nl-partie-num">{numero}</span>
        <h2 className="nl-partie-titre">{titre}</h2>
      </header>
      <div className="nl-visuel">{children}</div>
      <Checklist points={points} />
    </section>
  )
}

const VARIANTES: { v: Variante; nom: string }[] = [
  { v: 'sombre', nom: 'Sombre' },
  { v: 'creme', nom: 'Crème éditoriale' },
  { v: 'typo', nom: 'Typographique' },
]

export default function Apercu() {
  const [ton, setTon] = useState<Ton>('sobre')
  const [panier, setPanier] = useState<'question' | 'ajoutee' | 'refusee'>('question')
  const t = TEXTES[ton]

  return (
    <main className="nl-preview">
      <div className="nl-barre">
        <div className="nl-barre-titre">
          <span className="nl-barre-marque">Noël 2026</span>
          <span className="nl-barre-note">Aperçu interne, rien n&apos;est en ligne</span>
        </div>
        <div className="nl-ton" role="group" aria-label="Ton des textes">
          <button type="button" aria-pressed={ton === 'sobre'} onClick={() => setTon('sobre')}>Sobre</button>
          <button type="button" aria-pressed={ton === 'decontracte'} onClick={() => setTon('decontracte')}>Décontracté</button>
        </div>
      </div>

      <Partie
        id="carte"
        numero="01"
        titre="La carte cadeau"
        points={[
          { texte: 'A6 paysage (148 × 105), montant, code, 12 mois, prénom, message, tagline', ok: true },
          { texte: 'Survol et entrée : transform et opacity seulement', ok: true },
          { texte: 'prefers-reduced-motion : aucune animation', ok: true },
          { texte: 'Montant 35 € : exemple, montants à trancher (TARIFICATION.md)', ok: false },
        ]}
      >
        <div className="nl-cartes">
          {VARIANTES.map(({ v, nom }) => (
            <figure key={v} className="nl-carte-cadre">
              <CarteCadeau
                variante={v}
                montant="35 €"
                prenom="Camille"
                message="Pour nos étés à Noosa."
              />
              <figcaption>{nom}</figcaption>
            </figure>
          ))}
        </div>
      </Partie>

      <Partie
        id="offrir"
        numero="02"
        titre="« Offrir » sur l’accueil et /offrir"
        points={[
          { texte: 'Un seul bouton par endroit', ok: true },
          { texte: 'Message limité à 140 caractères, compteur visible', ok: true },
          { texte: 'Date programmée bornée du 8 au 24 décembre', ok: true },
          { texte: 'Le bleu de commande réservé au seul bouton de paiement', ok: true },
          { texte: 'Montant libre : minimum et maximum à fixer', ok: false },
        ]}
      >
        <Offrir ton={ton} />
      </Partie>

      <Partie
        id="panier"
        numero="03"
        titre="Au panier : offrir aussi une carte"
        points={[
          { texte: 'Deux choix de même poids : Ajouter / Non merci', ok: true },
          { texte: 'Refus : le bloc disparaît, aucune relance', ok: true },
          { texte: 'Une seule carte par ajout', ok: true },
        ]}
      >
        <div className="nl-recap">
          <div className="nl-recap-ligne">
            <span>Votre magazine</span>
            <span className="nl-faible">Récapitulatif</span>
          </div>
          {panier === 'question' && (
            <div className="nl-bloc">
              <p className="nl-bloc-titre">Offrir aussi une carte ?</p>
              <p className="nl-bloc-texte">{t.sousTitre}</p>
              <div className="nl-egaux">
                <button type="button" className="nl-btn" onClick={() => setPanier('ajoutee')}>Ajouter une carte</button>
                <button type="button" className="nl-btn" onClick={() => setPanier('refusee')}>Non merci</button>
              </div>
            </div>
          )}
          {panier === 'ajoutee' && (
            <div className="nl-bloc">
              <p className="nl-bloc-titre">Une carte cadeau ajoutée</p>
              <p className="nl-bloc-texte">Montant, prénom et message se choisissent à l&apos;étape suivante.</p>
            </div>
          )}
          {panier !== 'question' && (
            <button type="button" className="nl-rejouer" onClick={() => setPanier('question')}>
              Revoir la question (aperçu seulement)
            </button>
          )}
        </div>
      </Partie>

      <Partie
        id="exemplaire"
        numero="04"
        titre="Le 2ᵉ exemplaire, en France"
        points={[
          { texte: '-40 % même couverture, -20 % autre couverture, sans prix barré', ok: true },
          { texte: 'Hors France : le bloc disparaît, une ligne l’explique', ok: true },
          { texte: '2 exemplaires au plus, même colis, même adresse', ok: true },
          { texte: 'Couvertures : visuels du site en attendant celles de Canva', ok: false },
        ]}
      >
        <Exemplaire />
      </Partie>

      <Partie
        id="places"
        numero="05"
        titre="Le compteur et le 7 décembre"
        points={[
          { texte: 'Texte du compteur au ton choisi (PARCOURS-ACHAT.md)', ok: true },
          { texte: `${PLACES_EXEMPLE} = plafond du premier jour, la valeur sera lue en base`, ok: false },
          { texte: 'Après le 7 décembre : la carte par e-mail prend le relais', ok: true },
        ]}
      >
        <div className="nl-places">
          <div className="nl-bandeau">
            <span className="nl-bandeau-date">Lundi 7 décembre</span>
            <span className="nl-bandeau-texte">Dernier jour pour nous confier vos photos et recevoir le magazine avant Noël.</span>
          </div>
          <p className="nl-compteur">
            {t.compteur.avant && <span className="nl-compteur-texte">{t.compteur.avant}</span>}
            <span className="nl-compteur-n">{PLACES_EXEMPLE}</span>
            <span className="nl-compteur-texte">{t.compteur.apres}</span>
          </p>
          <div className="nl-bandeau nl-bandeau--apres">
            <span className="nl-bandeau-date">Après le 7 décembre</span>
            <span className="nl-bandeau-texte">La carte cadeau par e-mail reste disponible jusqu&apos;au 24.</span>
          </div>
        </div>
      </Partie>

      <Partie
        id="mails"
        numero="06"
        titre="Les mails"
        points={[
          { texte: 'Tableau de 600 px, cadre arrondi, accent #4A90D9', ok: true },
          { texte: 'Signature « L’atelier Bellajour » partout', ok: true },
          { texte: 'Textes de MAILS.md mot pour mot ; ceux marqués « proposé » sont à relire', ok: false },
          { texte: 'Gabarit Brevo 24 non relu (aucun accès Brevo ici)', ok: false },
        ]}
      >
        <ApercuMails ton={ton} />
      </Partie>
    </main>
  )
}
