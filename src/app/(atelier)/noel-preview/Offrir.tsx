'use client'

/* /offrir en récit (retour de Mathias, 14/11 : « il faut que le parcours,
   lui, soit intéressant »). Trois temps au lieu d'un formulaire :
   1. Écrire : la carte se remplit pendant qu'on tape ;
   2. Donner : par e-mail (avec une date) ou à imprimer ;
   3. Voir ce qu'il recevra : le mail GC2 rempli avec la saisie, puis le
      magazine qu'il composera. Le bouton de paiement vient seulement là.
   Un seul bouton principal par temps ; « Retour » est une pastille discrète.
   Les champs sont INERTES : rien ne paie, rien ne part. */

import { useState } from 'react'
import CarteCadeau from './CarteCadeau'
import { MailRendu } from './ApercuMails'
import { COUVERTURES_ACCUEIL, MAILS, MESSAGE_MAX, MONTANTS_EXEMPLE, TEXTES, type Ton } from './contenu'

type Montant = (typeof MONTANTS_EXEMPLE)[number] | 'libre'
type Temps = 1 | 2 | 3 | 'fini'

const NOMS = ['Écrire', 'Donner', 'Découvrir'] as const

export default function Offrir({ ton, phrase }: { ton: Ton; phrase: string }) {
  const t = TEXTES[ton]
  const [temps, setTemps] = useState<Temps>(1)
  const [montant, setMontant] = useState<Montant>(35)
  const [libre, setLibre] = useState('')
  const [prenom, setPrenom] = useState('Camille')
  /* GC2 dit « X vous offre un magazine » : il faut le prénom de qui offre. */
  const [donateur, setDonateur] = useState('Léa')
  const [message, setMessage] = useState('Pour nos étés à Noosa.')
  const [quand, setQuand] = useState<'maintenant' | 'date'>('maintenant')
  const [comment, setComment] = useState<'email' | 'imprimer'>('email')

  const affiche = montant === 'libre' ? (libre ? `${libre} €` : '… €') : `${montant} €`
  const gc2 = MAILS.find((m) => m.code === 'GC2')
  const etape = temps === 'fini' ? 4 : temps

  return (
    <div className="nl-recit">
      <ol className="nl-fil" aria-label="Étapes">
        {NOMS.map((nom, i) => (
          <li key={nom} data-etat={etape > i + 1 ? 'fait' : etape === i + 1 ? 'ici' : 'apres'}>
            <span className="nl-fil-n">{i + 1}</span>
            <span className="nl-fil-nom">{nom}</span>
          </li>
        ))}
      </ol>

      {temps !== 3 && (
        <div className="nl-recit-carte" data-temps={temps}>
          <CarteCadeau phrase={phrase} montant={affiche} prenom={prenom} message={message} entree={false} />
        </div>
      )}

      {temps === 1 && (
        <div className="nl-recit-temps">
          <h3 className="nl-recit-titre">Écrivez-lui.</h3>
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
            <span className="nl-label">De la part de</span>
            <input className="nl-input" value={donateur} maxLength={40} onChange={(e) => setDonateur(e.target.value)} />
          </label>
          <label className="nl-champ">
            <span className="nl-label">
              Un mot <span className="nl-faible">{message.length}/{MESSAGE_MAX}</span>
            </span>
            <textarea
              className="nl-input nl-textarea"
              rows={2}
              maxLength={MESSAGE_MAX}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <button type="button" className="nl-suivant" onClick={() => setTemps(2)}>Continuer</button>
        </div>
      )}

      {temps === 2 && (
        <div className="nl-recit-temps">
          <h3 className="nl-recit-titre">Comment la lui donner ?</h3>
          <div className="nl-egaux nl-egaux--grands">
            <button type="button" className="nl-choix" aria-pressed={comment === 'email'} onClick={() => setComment('email')}>
              <span className="nl-choix-titre">Par e-mail</span>
              <span className="nl-faible">Il la reçoit le jour choisi</span>
            </button>
            <button type="button" className="nl-choix" aria-pressed={comment === 'imprimer'} onClick={() => setComment('imprimer')}>
              <span className="nl-choix-titre">Je l&apos;imprime</span>
              <span className="nl-faible">À glisser sous le sapin</span>
            </button>
          </div>
          {comment === 'email' && (
            <>
              <input className="nl-input" type="email" placeholder="Son adresse e-mail" aria-label="Adresse e-mail du destinataire" />
              <div className="nl-puces">
                <button type="button" className="nl-puce" aria-pressed={quand === 'maintenant'} onClick={() => setQuand('maintenant')}>Aujourd&apos;hui</button>
                <button type="button" className="nl-puce" aria-pressed={quand === 'date'} onClick={() => setQuand('date')}>Choisir le jour</button>
              </div>
              {quand === 'date' && (
                <input className="nl-input" type="date" min="2026-12-08" max="2026-12-24" defaultValue="2026-12-24" aria-label="Jour d'envoi" />
              )}
            </>
          )}
          <button type="button" className="nl-suivant" onClick={() => setTemps(3)}>Voir ce qu&apos;il recevra</button>
          <button type="button" className="nl-retour" onClick={() => setTemps(1)}>Retour</button>
        </div>
      )}

      {temps === 3 && (
        <div className="nl-recit-temps nl-recit-temps--large">
          <h3 className="nl-recit-titre">Voici ce qu&apos;il recevra.</h3>
          <div className="nl-recu">
            <div className="nl-recu-mail">
              <span className="nl-recu-legende">{comment === 'email' ? 'Dans sa boîte' : 'Dans vos mains'}</span>
              {comment === 'email' && gc2 ? (
                <MailRendu
                  mail={gc2}
                  ton={ton}
                  valeurs={{ PRENOM: prenom || 'Camille', PRENOM_DONATEUR: donateur || 'Léa', MESSAGE: message, CODE: 'BJ-CADEAU-7KQ4MR' }}
                />
              ) : (
                <CarteCadeau phrase={phrase} montant={affiche} prenom={prenom} message={message} entree={false} />
              )}
            </div>
            <div className="nl-recu-mag">
              <span className="nl-recu-legende">Puis son magazine</span>
              <div className="nl-recu-couvs">
                {COUVERTURES_ACCUEIL.map((c) => (
                  <img key={c.src} src={c.src} alt={c.alt} loading="lazy" />
                ))}
              </div>
              <p className="nl-faible">Il choisit ses photos, nous composons.</p>
            </div>
          </div>
          <button type="button" className="nl-payer" onClick={() => setTemps('fini')}>Offrir la carte · {affiche}</button>
          <button type="button" className="nl-retour" onClick={() => setTemps(2)}>Retour</button>
        </div>
      )}

      {temps === 'fini' && (
        <div className="nl-recit-temps">
          <h3 className="nl-recit-titre">{t.apresAchat}</h3>
          <p className="nl-section-sous">{t.partage}</p>
          <button type="button" className="nl-suivant">{comment === 'email' ? 'Imprimer aussi' : 'Imprimer la carte'}</button>
          <button type="button" className="nl-retour" onClick={() => setTemps(1)}>Recommencer (aperçu)</button>
        </div>
      )}
    </div>
  )
}
