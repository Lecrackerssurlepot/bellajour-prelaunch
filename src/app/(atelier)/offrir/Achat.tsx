'use client'

/* /offrir pour de vrai (lot 2) : le récit en trois temps de l'aperçu, avec
   de vrais champs et un vrai paiement Stripe. Le navigateur n'écrit rien :
   il envoie la saisie à /api/cartes/checkout, qui valide de nouveau et
   ouvre la session ; la carte naît au paiement. */

import { useMemo, useState } from 'react'
import CarteCadeau from '../noel-preview/CarteCadeau'
import { MailRendu } from '../noel-preview/ApercuMails'
import { COUVERTURES_ACCUEIL, MAILS, PHRASES, TEXTES } from '../noel-preview/contenu'
import {
  ENVOI_PROGRAMME_MAX,
  LIBRE_MAX_CENTIMES,
  LIBRE_MIN_CENTIMES,
  MESSAGE_CARTE_MAX,
  MONTANTS_CARTE_CENTIMES,
  PRENOM_CARTE_MAX,
  montantCarteValide,
} from '@/lib/atelier/carteCadeau'

type Montant = (typeof MONTANTS_CARTE_CENTIMES)[number] | 'libre'
type Temps = 1 | 2 | 3

const NOMS = ['Écrire', 'Donner', 'Découvrir'] as const
const PHRASE = PHRASES[0]
const TON = 'sobre' as const
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const ERREURS: Record<string, string> = {
  montant: `Choisissez un montant de ${LIBRE_MIN_CENTIMES / 100} à ${LIBRE_MAX_CENTIMES / 100} €.`,
  prenom: 'Son prénom, s’il vous plaît.',
  email: 'Cette adresse ne semble pas complète.',
  jour: 'Choisissez un jour entre demain et le 24 décembre.',
  trop_de_demandes: 'Un instant, puis réessayez.',
}

function demainParis(): string {
  const d = new Date(Date.now() + 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d)
}

export default function Achat() {
  const t = TEXTES[TON]
  const [temps, setTemps] = useState<Temps>(1)
  const [montant, setMontant] = useState<Montant>(5000)
  const [libre, setLibre] = useState('')
  const [prenom, setPrenom] = useState('')
  const [donateur, setDonateur] = useState('')
  const [message, setMessage] = useState('')
  const [comment, setComment] = useState<'email' | 'imprimer'>('email')
  const [email, setEmail] = useState('')
  const [quand, setQuand] = useState<'maintenant' | 'date'>('maintenant')
  const [jour, setJour] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const demain = useMemo(() => demainParis(), [])
  const centimes = montant === 'libre' ? Number(libre) * 100 : montant
  const montantOk = montantCarteValide(centimes)
  const affiche = montantOk ? `${centimes / 100} €` : '… €'
  const gc2 = MAILS.find((m) => m.code === 'GC2')

  function verifierTemps1(): boolean {
    if (!montantOk) return setErreur(ERREURS.montant), false
    if (!prenom.trim()) return setErreur(ERREURS.prenom), false
    setErreur('')
    return true
  }
  function verifierTemps2(): boolean {
    if (comment === 'email') {
      if (!MAIL.test(email.trim())) return setErreur(ERREURS.email), false
      if (quand === 'date' && !(jour >= demain && jour <= ENVOI_PROGRAMME_MAX)) return setErreur(ERREURS.jour), false
    }
    setErreur('')
    return true
  }

  async function payer() {
    if (envoi) return
    setEnvoi(true)
    setErreur('')
    try {
      const r = await fetch('/api/cartes/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montant_centimes: centimes,
          destinataire_prenom: prenom.trim(),
          acheteur_prenom: donateur.trim(),
          message: message.trim(),
          remise: comment,
          destinataire_email: comment === 'email' ? email.trim() : '',
          envoi_le: comment === 'email' && quand === 'date' ? jour : '',
        }),
      })
      const j: unknown = await r.json().catch(() => null)
      const corps = (typeof j === 'object' && j !== null ? j : {}) as { url?: unknown; error?: unknown }
      if (r.ok && typeof corps.url === 'string') {
        window.location.assign(corps.url)
        return
      }
      const code = typeof corps.error === 'string' ? corps.error : ''
      setErreur(ERREURS[code] ?? 'Le paiement ne s’ouvre pas. Réessayez dans un instant.')
    } catch {
      setErreur('Le paiement ne s’ouvre pas. Réessayez dans un instant.')
    }
    setEnvoi(false)
  }

  return (
    <div className="nl-recit">
      <ol className="nl-fil" aria-label="Étapes">
        {NOMS.map((nom, i) => (
          <li key={nom} data-etat={temps > i + 1 ? 'fait' : temps === i + 1 ? 'ici' : 'apres'}>
            <span className="nl-fil-n">{i + 1}</span>
            <span className="nl-fil-nom">{nom}</span>
          </li>
        ))}
      </ol>

      {temps !== 3 && (
        <div className="nl-recit-carte" data-temps={temps}>
          <CarteCadeau phrase={PHRASE} montant={affiche} prenom={prenom} message={message} entree={false} code="BJ-CADEAU-······" />
        </div>
      )}

      {temps === 1 && (
        <div className="nl-recit-temps">
          <h1 className="nl-recit-titre">Écrivez-lui.</h1>
          <fieldset className="nl-champ">
            <legend>Montant</legend>
            <div className="nl-puces">
              {MONTANTS_CARTE_CENTIMES.map((m) => (
                <button key={m} type="button" className="nl-puce" aria-pressed={montant === m} onClick={() => setMontant(m)}>
                  {m / 100} €
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
                placeholder={`De ${LIBRE_MIN_CENTIMES / 100} à ${LIBRE_MAX_CENTIMES / 100} €`}
                aria-label="Montant libre en euros"
                value={libre}
                onChange={(e) => setLibre(e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            )}
          </fieldset>
          <label className="nl-champ">
            <span className="nl-label">Son prénom</span>
            <input className="nl-input" value={prenom} maxLength={PRENOM_CARTE_MAX} autoComplete="off" onChange={(e) => setPrenom(e.target.value)} />
          </label>
          <label className="nl-champ">
            <span className="nl-label">De la part de</span>
            <input className="nl-input" value={donateur} maxLength={PRENOM_CARTE_MAX} autoComplete="given-name" onChange={(e) => setDonateur(e.target.value)} />
          </label>
          <label className="nl-champ">
            <span className="nl-label">
              Un mot <span className="nl-faible">{message.length}/{MESSAGE_CARTE_MAX}</span>
            </span>
            <textarea className="nl-input nl-textarea" rows={2} maxLength={MESSAGE_CARTE_MAX} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          {erreur && <p className="nl-erreur" role="alert">{erreur}</p>}
          <button type="button" className="nl-suivant" onClick={() => verifierTemps1() && setTemps(2)}>Continuer</button>
        </div>
      )}

      {temps === 2 && (
        <div className="nl-recit-temps">
          <h1 className="nl-recit-titre">Comment la lui donner ?</h1>
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
              <input
                className="nl-input"
                type="email"
                autoComplete="off"
                placeholder="Son adresse e-mail"
                aria-label="Adresse e-mail du destinataire"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="nl-puces">
                <button type="button" className="nl-puce" aria-pressed={quand === 'maintenant'} onClick={() => setQuand('maintenant')}>Aujourd&apos;hui</button>
                <button type="button" className="nl-puce" aria-pressed={quand === 'date'} onClick={() => { setQuand('date'); if (!jour) setJour(ENVOI_PROGRAMME_MAX) }}>Choisir le jour</button>
              </div>
              {quand === 'date' && (
                <input className="nl-input" type="date" min={demain} max={ENVOI_PROGRAMME_MAX} value={jour} onChange={(e) => setJour(e.target.value)} aria-label="Jour d'envoi" />
              )}
            </>
          )}
          {erreur && <p className="nl-erreur" role="alert">{erreur}</p>}
          <button type="button" className="nl-suivant" onClick={() => verifierTemps2() && setTemps(3)}>Voir ce qu&apos;il recevra</button>
          <button type="button" className="nl-retour" onClick={() => { setErreur(''); setTemps(1) }}>Retour</button>
        </div>
      )}

      {temps === 3 && (
        <div className="nl-recit-temps nl-recit-temps--large">
          <h1 className="nl-recit-titre">Voici ce qu&apos;il recevra.</h1>
          <div className="nl-recu">
            <div className="nl-recu-mail">
              <span className="nl-recu-legende">{comment === 'email' ? 'Dans sa boîte' : 'Dans vos mains'}</span>
              {comment === 'email' && gc2 ? (
                <MailRendu
                  mail={gc2}
                  ton={TON}
                  valeurs={{ PRENOM: prenom, PRENOM_DONATEUR: donateur || 'Un proche', MESSAGE: message, CODE: 'BJ-CADEAU-······' }}
                />
              ) : (
                <CarteCadeau phrase={PHRASE} montant={affiche} prenom={prenom} message={message} entree={false} code="BJ-CADEAU-······" />
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
          {erreur && <p className="nl-erreur" role="alert">{erreur}</p>}
          <button type="button" className="nl-payer" disabled={envoi} onClick={payer}>
            {envoi ? 'Ouverture du paiement…' : `Offrir la carte · ${affiche}`}
          </button>
          <button type="button" className="nl-retour" onClick={() => { setErreur(''); setTemps(2) }}>Retour</button>
          <p className="nl-faible">{t.partage}</p>
        </div>
      )}
    </div>
  )
}
