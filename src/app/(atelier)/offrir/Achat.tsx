'use client'

/* /offrir pour de vrai (lot 2) : le récit en trois temps de l'aperçu, avec
   de vrais champs et un vrai paiement Stripe. Le navigateur n'écrit rien :
   il envoie la saisie à /api/cartes/checkout, qui valide de nouveau et
   ouvre la session ; la carte naît au paiement. */

import { useEffect, useMemo, useRef, useState } from 'react'
import CarteCadeau from '../noel-preview/CarteCadeau'
import { MailRendu } from '../noel-preview/ApercuMails'
import { COUVERTURES_ACCUEIL, MAILS, PHRASES } from '../noel-preview/contenu'
import { suggestionEmail } from '@/lib/atelier/questionnaire'
import {
  ENVOI_PROGRAMME_MAX,
  LIBRE_MAX_CENTIMES,
  LIBRE_MIN_CENTIMES,
  MESSAGE_CARTE_MAX,
  MONTANTS_CARTE_CENTIMES,
  PRENOM_CARTE_MAX,
  montantCarteValide,
  prefixeCode,
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
  remise: 'Choisissez au moins une façon de la donner.',
  jour: 'Choisissez un jour entre demain et le 24 décembre.',
  trop_de_demandes: 'Un instant, puis réessayez.',
}

function demainParis(): string {
  const d = new Date(Date.now() + 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d)
}

/* Les jours proposés, du lendemain au 24 décembre, en AAAA-MM-JJ. Calcul à
   midi UTC : aucun changement d'heure ne fait sauter ni doubler un jour. */
function joursProposes(depuis: string, jusqua: string): string[] {
  const jours: string[] = []
  const d = new Date(`${depuis}T12:00:00Z`)
  const fin = new Date(`${jusqua}T12:00:00Z`)
  while (d <= fin && jours.length < 400) {
    jours.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return jours
}

const fmtJour = (j: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { ...o, timeZone: 'UTC' }).format(new Date(`${j}T12:00:00Z`)).replace('.', '')

export default function Achat() {
  const [temps, setTemps] = useState<Temps>(1)
  const [montant, setMontant] = useState<Montant>(5000)
  const [libre, setLibre] = useState('')
  const [prenom, setPrenom] = useState('')
  const [donateur, setDonateur] = useState('')
  const [message, setMessage] = useState('')
  const [parEmail, setParEmail] = useState(true)
  const [imprime, setImprime] = useState(false)
  const [email, setEmail] = useState('')
  const [quand, setQuand] = useState<'maintenant' | 'date'>('maintenant')
  const [jour, setJour] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const demain = useMemo(() => demainParis(), [])
  const jours = useMemo(() => joursProposes(demain, ENVOI_PROGRAMME_MAX), [demain])
  const bandeau = useRef<HTMLDivElement>(null)
  const comment: 'email' | 'imprimer' = parEmail ? 'email' : 'imprimer'

  /* Le jour choisi se montre dans le bandeau, sans faire défiler la page. */
  useEffect(() => {
    const b = bandeau.current
    const el = b?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (b && el) b.scrollLeft = el.offsetLeft - (b.clientWidth - el.offsetWidth) / 2
  }, [quand, jour])
  const centimes = montant === 'libre' ? Number(libre) * 100 : montant
  const montantOk = montantCarteValide(centimes)
  const affiche = montantOk ? `${centimes / 100} €` : '… €'
  // Le code porte le prénom : l'aperçu le montre tel qu'il sera tiré.
  const codeApercu = `${prefixeCode(prenom)}······`
  const gc2 = MAILS.find((m) => m.code === 'GC2')

  function verifierTemps1(): boolean {
    if (!montantOk) return setErreur(ERREURS.montant), false
    if (!prenom.trim()) return setErreur(ERREURS.prenom), false
    setErreur('')
    return true
  }
  function verifierTemps2(): boolean {
    if (!parEmail && !imprime) return setErreur(ERREURS.remise), false
    if (parEmail) {
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
    <div className="nl-recit nl-achat">
      <ol className="nl-fil" aria-label="Étapes">
        {NOMS.map((nom, i) => (
          <li key={nom} data-etat={temps > i + 1 ? 'fait' : temps === i + 1 ? 'ici' : 'apres'}>
            <span className="nl-fil-n">{i + 1}</span>
            <span className="nl-fil-nom">{nom}</span>
          </li>
        ))}
      </ol>

      {temps !== 3 && (
      <div className="nl-achat-scene">
        <div className="nl-recit-carte" data-temps={temps}>
          <CarteCadeau phrase={PHRASE} montant={affiche} prenom={prenom} message={message} entree={false} code={codeApercu} />
        </div>

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
          <div className="nl-duo">
            <label className="nl-champ">
              <span className="nl-label">Son prénom</span>
              <input className="nl-input" value={prenom} maxLength={PRENOM_CARTE_MAX} autoComplete="off" onChange={(e) => setPrenom(e.target.value)} />
            </label>
            <label className="nl-champ">
              <span className="nl-label">De la part de</span>
              <input className="nl-input" value={donateur} maxLength={PRENOM_CARTE_MAX} autoComplete="given-name" onChange={(e) => setDonateur(e.target.value)} />
            </label>
          </div>
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
          <p className="nl-faible nl-achat-aide">L&apos;un, l&apos;autre, ou les deux.</p>
          <div className="nl-egaux nl-egaux--grands">
            <button type="button" className="nl-choix" aria-pressed={parEmail} onClick={() => setParEmail((v) => !v)}>
              <span className="nl-choix-coche" aria-hidden="true" />
              <span className="nl-choix-titre">Par e-mail</span>
              <span className="nl-faible">Le jour choisi</span>
            </button>
            <button type="button" className="nl-choix" aria-pressed={imprime} onClick={() => setImprime((v) => !v)}>
              <span className="nl-choix-coche" aria-hidden="true" />
              <span className="nl-choix-titre">Je l&apos;imprime</span>
              <span className="nl-faible">Sous le sapin</span>
            </button>
          </div>
          {parEmail && (
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
              {/* La faute de frappe la plus fréquente (gmial.com) : la carte
                  partirait dans le vide. On SUGGÈRE, sans bloquer (même règle
                  que /composer, suggestionEmail en Damerau). */}
              {suggestionEmail(email) && (
                <p className="nl-suggestion" role="status">
                  Vouliez-vous dire{' '}
                  <button type="button" onClick={() => setEmail(suggestionEmail(email) ?? email)}>{suggestionEmail(email)}</button> ?
                </p>
              )}
              <div className="nl-puces">
                <button type="button" className="nl-puce" aria-pressed={quand === 'maintenant'} onClick={() => setQuand('maintenant')}>Tout de suite</button>
                <button type="button" className="nl-puce" aria-pressed={quand === 'date'} onClick={() => { setQuand('date'); if (!jour) setJour(ENVOI_PROGRAMME_MAX) }}>Un autre jour</button>
              </div>
              {quand === 'date' && (
                <div className="nl-jours" ref={bandeau} role="group" aria-label="Jour d'envoi">
                  {jours.map((j) => (
                    <button key={j} type="button" className="nl-jour" aria-pressed={jour === j} onClick={() => setJour(j)}
                      aria-label={fmtJour(j, { weekday: 'long', day: 'numeric', month: 'long' })}>
                      <span className="nl-jour-sem">{fmtJour(j, { weekday: 'short' })}</span>
                      <span className="nl-jour-n">{fmtJour(j, { day: 'numeric' })}</span>
                      <span className="nl-jour-mois">{fmtJour(j, { month: 'short' })}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {erreur && <p className="nl-erreur" role="alert">{erreur}</p>}
          <button type="button" className="nl-suivant" onClick={() => verifierTemps2() && setTemps(3)}>Voir ce qu&apos;il recevra</button>
          <button type="button" className="nl-retour" onClick={() => { setErreur(''); setTemps(1) }}>Retour</button>
        </div>
      )}
      </div>
      )}

      {temps === 3 && (
        <div className="nl-recit-temps nl-recit-temps--large">
          <h1 className="nl-recit-titre">Voici ce qu&apos;il recevra.</h1>
          <div className="nl-recu">
            <div className="nl-recu-mail">
              <span className="nl-recu-legende">{parEmail && !imprime ? 'Dans sa boîte' : parEmail ? 'Dans sa boîte, et dans vos mains' : 'Dans vos mains'}</span>
              {parEmail && gc2 ? (
                <MailRendu
                  mail={gc2}
                  ton={TON}
                  valeurs={{ PRENOM: prenom, PRENOM_DONATEUR: donateur || 'Un proche', MESSAGE: message, CODE: codeApercu }}
                />
              ) : (
                <CarteCadeau phrase={PHRASE} montant={affiche} prenom={prenom} message={message} entree={false} code={codeApercu} />
              )}
              {parEmail && <p className="nl-faible nl-adresse">Envoyée à <strong>{email.trim().toLowerCase()}</strong>{quand === 'date' && jour ? `, le ${fmtJour(jour, { day: 'numeric', month: 'long' })} au matin` : ''}</p>}
              {parEmail && imprime && <p className="nl-faible">La carte à imprimer vous attend après le paiement.</p>}
            </div>
            <div className="nl-recu-mag">
              <span className="nl-recu-legende">Puis son magazine</span>
              <div className="nl-recu-couvs">
                {COUVERTURES_ACCUEIL.map((c) => (
                  <img key={c.src} src={c.src} alt={c.alt} loading="lazy" />
                ))}
              </div>
              <p className="nl-faible">Il choisit ses photos, nous composons.</p>
              <div className="nl-recu-actions">
                {erreur && <p className="nl-erreur" role="alert">{erreur}</p>}
                <button type="button" className="nl-payer" disabled={envoi} onClick={payer}>
                  {envoi ? 'Ouverture du paiement…' : `Offrir la carte · ${affiche}`}
                </button>
                <button type="button" className="nl-retour" onClick={() => { setErreur(''); setTemps(2) }}>Retour</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
