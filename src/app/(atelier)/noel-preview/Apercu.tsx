'use client'

/* La planche de Noël, version 2 (retours de Mathias du 14/11) : on ne
   montre plus des pièces séparées, on suit le parcours du client sur le
   site, du bandeau jusqu'au mail que reçoit la personne qui reçoit la carte.

   Sous chaque visuel, la checklist charte. Une case n'est cochée qu'après
   une mesure réelle à 375 px et à 1280 px (captures dans
   docs/noel-2026/captures/) ; une case vide dit ce qui reste à trancher.
   Le ton et la phrase de la carte sont des états d'écran, réglés dans la
   barre du haut et appliqués partout. */

import { useState } from 'react'
import CarteCadeau from './CarteCadeau'
import Bandeau from './Bandeau'
import Chapitre from './Chapitre'
import Offrir from './Offrir'
import Exemplaire from './Exemplaire'
import ApercuMails from './ApercuMails'
import { PHRASES, TEXTES, type Ton } from './contenu'

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

function Partie({ id, numero, titre, ou, children, points }: {
  id: string
  numero: string
  titre: string
  ou: string
  children: React.ReactNode
  points: Point[]
}) {
  return (
    <section className="nl-partie" id={id}>
      <header className="nl-partie-tete">
        <span className="nl-partie-num">{numero}</span>
        <div className="nl-partie-noms">
          <h2 className="nl-partie-titre">{titre}</h2>
          <span className="nl-partie-ou">{ou}</span>
        </div>
      </header>
      <div className="nl-visuel">{children}</div>
      <Checklist points={points} />
    </section>
  )
}

export default function Apercu() {
  const [ton, setTon] = useState<Ton>('sobre')
  const [phrase, setPhrase] = useState<string>(PHRASES[0])
  const [panier, setPanier] = useState<'question' | 'ajoutee' | 'refusee'>('question')
  const t = TEXTES[ton]

  return (
    <main className="nl-preview">
      <div className="nl-barre">
        <div className="nl-barre-titre">
          <span className="nl-barre-marque">Noël 2026</span>
          <span className="nl-barre-note">Aperçu interne, rien n&apos;est en ligne</span>
        </div>
        <div className="nl-reglages">
          <div className="nl-ton" role="group" aria-label="Ton des textes">
            <button type="button" aria-pressed={ton === 'sobre'} onClick={() => setTon('sobre')}>Sobre</button>
            <button type="button" aria-pressed={ton === 'decontracte'} onClick={() => setTon('decontracte')}>Décontracté</button>
          </div>
          <label className="nl-choix-phrase">
            <span className="nl-faible">Phrase de la carte</span>
            <select value={phrase} onChange={(e) => setPhrase(e.target.value)}>
              {PHRASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
      </div>

      <p className="nl-intro">
        Le parcours d&apos;un client, dans l&apos;ordre : il voit le bandeau, traverse le chapitre de Noël de
        l&apos;accueil, offre la carte sur /offrir. Puis, au panier, les deux offres.
      </p>

      <Partie
        id="bandeau"
        numero="01"
        titre="Le bandeau"
        ou="Au-dessus de la barre, sur / et /magazine"
        points={[
          { texte: 'La barre ne change pas : au téléphone, elle ne porte que le compte', ok: true },
          { texte: 'Après le 7 décembre, le texte bascule seul sur la carte par e-mail', ok: true },
          { texte: 'Intégration réelle : --nav-h (nav.css) devra compter le bandeau', ok: false },
        ]}
      >
        <Bandeau />
      </Partie>

      <Partie
        id="chapitre"
        numero="02"
        titre="Le chapitre de Noël"
        ou="Une page de plus dans le récit de l'accueil"
        points={[
          { texte: 'L’enveloppe s’ouvre, la carte sort, le magazine prend sa place', ok: true },
          { texte: 'Défilement : rAF seulement quand la scène est visible, transform et opacity', ok: true },
          { texte: 'prefers-reduced-motion : la scène finale, sans piste', ok: true },
          { texte: '25 places = plafond du premier jour, la valeur sera lue en base', ok: false },
          { texte: 'Place exacte parmi les sept pages : à choisir', ok: false },
        ]}
      >
        <Chapitre ton={ton} phrase={phrase} />
      </Partie>

      <Partie
        id="magazine"
        numero="03"
        titre="Sur /magazine"
        ou="Un bloc sous le kiosque, pour qui compare déjà"
        points={[
          { texte: 'Un seul bouton', ok: true },
        ]}
      >
        <div className="nl-bloc-mag">
          <div className="nl-bloc-mag-carte">
            <CarteCadeau phrase={phrase} montant="35 €" prenom="" message="" />
          </div>
          <div className="nl-section-texte">
            <span className="nl-surtitre">Pour Noël</span>
            <h3 className="nl-section-titre">{t.titre}</h3>
            <p className="nl-section-sous">{t.sousTitre}</p>
            <a className="nl-cta" href="#offrir">Offrir une carte</a>
          </div>
        </div>
      </Partie>

      <Partie
        id="offrir"
        numero="04"
        titre="/offrir, en trois temps"
        ou="Écrire, donner, découvrir ce qu'il recevra"
        points={[
          { texte: 'La carte se remplit pendant la saisie', ok: true },
          { texte: 'Un bouton principal par temps, le bleu de commande au seul paiement', ok: true },
          { texte: 'Le mail GC2 montré rempli, tel qu’il arrive', ok: true },
          { texte: 'Montants : exemples ; montant libre : minimum et maximum à fixer', ok: false },
        ]}
      >
        <Offrir ton={ton} phrase={phrase} />
      </Partie>

      <Partie
        id="carte"
        numero="05"
        titre="La carte, quatre phrases"
        ou="La variante sombre seule ; la phrase choisie s'applique partout"
        points={[
          { texte: 'A6 paysage, montant, code, 12 mois, prénom, message', ok: true },
          { texte: 'Survol et entrée : transform et opacity, rien sous reduced-motion', ok: true },
          { texte: 'Phrase à choisir', ok: false },
        ]}
      >
        <div className="nl-cartes">
          {PHRASES.map((p) => (
            <figure key={p} className="nl-carte-cadre">
              <CarteCadeau phrase={p} montant="35 €" prenom="Camille" message="Pour nos étés à Noosa." />
              <figcaption>{p === PHRASES[PHRASES.length - 1] ? 'L’ancienne, pour comparer' : `Proposition ${PHRASES.indexOf(p) + 1}`}</figcaption>
            </figure>
          ))}
        </div>
      </Partie>

      <Partie
        id="panier"
        numero="06"
        titre="Au panier : offrir aussi une carte"
        ou="Récapitulatif d'une commande de magazine"
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
              <p className="nl-bloc-texte">Montant, prénom et message à l&apos;étape suivante.</p>
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
        numero="07"
        titre="Le 2ᵉ exemplaire, en France"
        ou="Au panier, si la livraison est en France"
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
        id="mails"
        numero="08"
        titre="Les mails"
        ou="Fondateurs, acheteur, destinataire, blocs M4 et M5"
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
