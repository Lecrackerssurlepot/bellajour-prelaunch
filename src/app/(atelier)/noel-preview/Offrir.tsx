'use client'

/* Partie 02 : la section « Offrir » telle qu'elle irait sur / et /magazine,
   puis la maquette de /offrir. Les champs sont INERTES : le bouton ne paie
   rien, il montre l'écran d'après. La carte d'aperçu suit la saisie. */

import { useState } from 'react'
import CarteCadeau from './CarteCadeau'
import { MESSAGE_MAX, MONTANTS_EXEMPLE, TEXTES, type Ton } from './contenu'

type Montant = (typeof MONTANTS_EXEMPLE)[number] | 'libre'

export default function Offrir({ ton }: { ton: Ton }) {
  const t = TEXTES[ton]
  const [montant, setMontant] = useState<Montant>(35)
  const [libre, setLibre] = useState('')
  const [prenom, setPrenom] = useState('')
  const [message, setMessage] = useState('')
  const [quand, setQuand] = useState<'maintenant' | 'date'>('maintenant')
  const [comment, setComment] = useState<'email' | 'imprimer'>('email')
  const [fini, setFini] = useState(false)

  const affiche = montant === 'libre' ? (libre ? `${libre} €` : '… €') : `${montant} €`

  return (
    <div className="nl-offrir">
      <div className="nl-section-offrir">
        <div className="nl-section-texte">
          <span className="nl-surtitre">Pour Noël</span>
          <h3 className="nl-section-titre">{t.titre}</h3>
          <p className="nl-section-sous">{t.sousTitre}</p>
          <a className="nl-cta" href="#offrir-page">Offrir une carte</a>
        </div>
        <div className="nl-section-carte">
          <CarteCadeau variante="sombre" montant="35 €" prenom="" message="" />
        </div>
      </div>

      <div className="nl-page" id="offrir-page">
        <span className="nl-maquette">Maquette de /offrir</span>
        {fini ? (
          <div className="nl-fini">
            <h3 className="nl-section-titre">{t.apresAchat}</h3>
            <div className="nl-fini-carte">
              <CarteCadeau variante="sombre" montant={affiche} prenom={prenom} message={message} />
            </div>
            <p className="nl-section-sous">{t.partage}</p>
            <div className="nl-egaux">
              <button type="button" className="nl-btn">Imprimer</button>
              <button type="button" className="nl-btn" onClick={() => setFini(false)}>Revenir au formulaire</button>
            </div>
          </div>
        ) : (
          <div className="nl-page-grille">
            <div className="nl-page-carte">
              <CarteCadeau variante="sombre" montant={affiche} prenom={prenom} message={message} />
            </div>

            <form className="nl-form" onSubmit={(e) => { e.preventDefault(); setFini(true) }}>
              <fieldset className="nl-champ">
                <legend>Montant <span className="nl-faible">(exemples, à trancher)</span></legend>
                <div className="nl-puces">
                  {MONTANTS_EXEMPLE.map((m) => (
                    <button key={m} type="button" className="nl-puce" aria-pressed={montant === m} onClick={() => setMontant(m)}>
                      {m} €
                    </button>
                  ))}
                  <button type="button" className="nl-puce" aria-pressed={montant === 'libre'} onClick={() => setMontant('libre')}>
                    Libre
                  </button>
                </div>
                {montant === 'libre' && (
                  <input
                    className="nl-input"
                    inputMode="numeric"
                    placeholder="Montant en euros"
                    aria-label="Montant libre en euros"
                    value={libre}
                    onChange={(e) => setLibre(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                )}
              </fieldset>

              <label className="nl-champ">
                <span className="nl-label">Son prénom</span>
                <input className="nl-input" value={prenom} maxLength={40} onChange={(e) => setPrenom(e.target.value)} />
              </label>

              <label className="nl-champ">
                <span className="nl-label">
                  Votre message <span className="nl-faible">{message.length}/{MESSAGE_MAX}</span>
                </span>
                <textarea
                  className="nl-input nl-textarea"
                  rows={3}
                  maxLength={MESSAGE_MAX}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>

              <fieldset className="nl-champ">
                <legend>Envoi</legend>
                <div className="nl-puces">
                  <button type="button" className="nl-puce" aria-pressed={quand === 'maintenant'} onClick={() => setQuand('maintenant')}>Aujourd&apos;hui</button>
                  <button type="button" className="nl-puce" aria-pressed={quand === 'date'} onClick={() => setQuand('date')}>Choisir une date</button>
                </div>
                {quand === 'date' && (
                  <input className="nl-input" type="date" min="2026-12-08" max="2026-12-24" defaultValue="2026-12-24" aria-label="Date d'envoi" />
                )}
              </fieldset>

              <fieldset className="nl-champ">
                <legend>Réception</legend>
                <div className="nl-puces">
                  <button type="button" className="nl-puce" aria-pressed={comment === 'email'} onClick={() => setComment('email')}>Par e-mail</button>
                  <button type="button" className="nl-puce" aria-pressed={comment === 'imprimer'} onClick={() => setComment('imprimer')}>Je l&apos;imprime</button>
                </div>
                {comment === 'email' && (
                  <input className="nl-input" type="email" placeholder="Son adresse e-mail" aria-label="Adresse e-mail du destinataire" />
                )}
              </fieldset>

              <button type="submit" className="nl-payer">Offrir une carte</button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
