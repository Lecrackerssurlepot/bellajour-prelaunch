'use client'

/* La page /partenaires (retour de Mathias du 18/11 : « on veut juste prendre
   un rendez-vous comme CTA, et que le PDF soit gros »).

   LA BROCHURE prend toute la page : une page sous l'autre, en grand, comme on
   lit un PDF. Rien autour.

   UN SEUL GESTE : « Prendre rendez-vous » (dans l'en-tête, qui reste collé en
   haut, et à la fin de la brochure) ouvre le panneau des créneaux : un volet à droite à
   l'ordinateur, une feuille du bas au téléphone. Il reste monté : les
   créneaux sont lus dès l'arrivée.

   LE RENDEZ-VOUS ne croit rien de ce qu'il affiche : chaque créneau vient du
   serveur, et le serveur le refait avant de réserver. Tant que les agendas ne
   sont pas reliés (503) ou que l'Édition collective est fermée (404), le
   panneau dit que les créneaux ouvrent bientôt : jamais un créneau inventé. */

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { lireDemandeProspect, PROSPECT_MESSAGE_MAX, type ChampProspect } from '@/lib/collectif/prospectsSaisie'

type PageBrochure = { alt: string; petite: string; grande: string }
type CreneauVu = { debut: string; heure: string }
type JourVu = { jour: string; libelle: string; creneaux: CreneauVu[] }
type Semaine = { semaine: number; derniere: boolean; libelle: string; avec: string[]; jours: JourVu[] }

/* Jusqu'où l'on avance tout seul pour trouver le premier créneau libre. */
const SEMAINES_CHERCHEES = 8

function liste(noms: string[]): string {
  if (noms.length <= 1) return noms[0] ?? 'l’atelier'
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`
}

/* « jeudi 20 novembre » → « jeu. » et « 20 ». */
function court(libelle: string): { jour: string; numero: string } {
  const [jour = '', numero = ''] = libelle.split(' ')
  return { jour: `${jour.slice(0, 3)}.`, numero }
}

export default function Partenaires({ pages, pdf, contact }: { pages: PageBrochure[]; pdf: string; contact: string }) {
  const [ouvert, setOuvert] = useState(false)

  useEffect(() => {
    if (!ouvert) return
    const fermer = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    window.addEventListener('keydown', fermer)
    return () => window.removeEventListener('keydown', fermer)
  }, [ouvert])

  return (
    <main className="pa-page">
      <header className="pa-tete">
        <Link className="pa-logo" href="/" prefetch={false} aria-label="Bellajour, retour à l’accueil">
          <img src="/images/v2/ui/signature-bellajour-240.webp" alt="" width={240} height={92} decoding="async" />
        </Link>
        <button type="button" className="pa-bouton pa-tete-cta" onClick={() => setOuvert(true)}>
          Prendre rendez-vous
        </button>
      </header>

      {/* La brochure, en grand : une page sous l'autre, comme on lit un PDF. */}
      <h1 className="pa-sr">Bellajour pour les écoles et les associations : la brochure</h1>
      <div className="pa-bro">
        {pages.map((p, i) => (
          <img
            key={p.grande}
            className="pa-feuille"
            src={p.grande}
            srcSet={`${p.petite} 800w, ${p.grande} 1600w`}
            sizes="(max-width: 1100px) 100vw, 1040px"
            alt={p.alt}
            width={1600}
            height={2262}
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : undefined}
            decoding="async"
          />
        ))}
      </div>

      <div className="pa-fin">
        <button type="button" className="pa-bouton" onClick={() => setOuvert(true)}>
          Prendre rendez-vous
        </button>
        <a className="pa-pilule" href={pdf} download>
          Télécharger le PDF
        </a>
      </div>

      {/* Le panneau reste monté : les créneaux sont lus dès l'arrivée, il s'ouvre plein. */}
      <div className={`pa-voile ${ouvert ? 'est-ouvert' : ''}`} onClick={() => setOuvert(false)} aria-hidden={!ouvert}>
        <section className="pa-panneau" role="dialog" aria-modal="true" aria-label="Prendre rendez-vous" onClick={(e) => e.stopPropagation()} inert={!ouvert}>
          <button type="button" className="pa-rond pa-fermer" aria-label="Fermer" onClick={() => setOuvert(false)}>
            ×
          </button>
          <RendezVous contact={contact} />
        </section>
      </div>
    </main>
  )
}

/* ────────────────────────────── le rendez-vous ────────────────────────────── */

type Etat =
  | { vue: 'chargement' }
  | { vue: 'ferme' }
  | { vue: 'choix'; semaine: Semaine; jour: string | null }
  | { vue: 'formulaire'; semaine: Semaine; creneau: CreneauVu; jourLibelle: string }
  | { vue: 'fait'; quand: string; visio: string | null; avec: string[] }

async function lireSemaine(n: number): Promise<Semaine | 'ferme'> {
  try {
    const rep = await fetch('/api/partenaires/creneaux', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ semaine: n }) })
    if (!rep.ok) return 'ferme'
    const s = (await rep.json()) as Partial<Semaine>
    /* Une réponse sans `jours` (proxy, panne) ne doit pas casser la page. */
    return Array.isArray(s?.jours) ? (s as Semaine) : 'ferme'
  } catch {
    return 'ferme'
  }
}

const premierJourLibre = (s: Semaine) => s.jours.find((j) => j.creneaux.length > 0)?.jour ?? null

function RendezVous({ contact }: { contact: string }) {
  const [etat, setEtat] = useState<Etat>({ vue: 'chargement' })
  const [attente, setAttente] = useState(false)
  const [erreur, setErreur] = useState<{ champ: ChampProspect | null; message: string } | null>(null)
  const [avec, setAvec] = useState<string[]>([])

  /* Ouvre une semaine ; `chercher` avance jusqu'à la première qui a un créneau. */
  const ouvrir = useCallback(async (n: number, chercher: boolean) => {
    setAttente(true)
    let s = await lireSemaine(n)
    for (let i = 0; chercher && s !== 'ferme' && !premierJourLibre(s) && !s.derniere && i < SEMAINES_CHERCHEES; i++) s = await lireSemaine(s.semaine + 1)
    setAttente(false)
    if (s === 'ferme') {
      setEtat((e) => (e.vue === 'chargement' ? { vue: 'ferme' } : e))
      return
    }
    setAvec(s.avec)
    setEtat({ vue: 'choix', semaine: s, jour: premierJourLibre(s) })
  }, [])

  useEffect(() => {
    /* Une lecture au montage : le résultat arrive dans une promesse, pas dans le corps de l'effet. */
    void ouvrir(0, true)
  }, [ouvrir])

  async function envoyer(form: HTMLFormElement, e: Extract<Etat, { vue: 'formulaire' }>) {
    const corps = Object.fromEntries(new FormData(form).entries()) as Record<string, unknown>
    const lue = lireDemandeProspect(corps)
    if (!lue.ok) {
      setErreur({ champ: lue.champ, message: lue.message })
      ;(form.elements.namedItem(lue.champ) as HTMLElement | null)?.focus()
      return
    }
    setErreur(null)
    setAttente(true)
    try {
      const rep = await fetch('/api/partenaires/rendez-vous', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...corps, debut: e.creneau.debut }),
      })
      const json = (await rep.json().catch(() => ({}))) as { quand?: string; visio?: string | null; avec?: string[]; error?: string; champ?: ChampProspect; message?: string }
      if (rep.ok && json.quand) {
        setEtat({ vue: 'fait', quand: json.quand, visio: json.visio ?? null, avec: json.avec ?? [] })
        return
      }
      setErreur({ champ: json.champ ?? null, message: json.message ?? 'La réservation n’a pas abouti. Réessayez.' })
      /* Le créneau est parti entre-temps : on rouvre la semaine, à jour. */
      if (json.error === 'creneau_pris' || json.error === 'creneau_invalide') void ouvrir(e.semaine.semaine, false)
    } catch {
      setErreur({ champ: null, message: 'Le réseau n’a pas répondu. Réessayez.' })
    } finally {
      setAttente(false)
    }
  }

  return (
    <div className="pa-carte" aria-busy={attente}>
      <h2 className="pa-carte-titre">Prendre rendez-vous</h2>

      {etat.vue === 'chargement' ? (
        <div className="pa-attente" role="status">
          <span className="pa-sr">Chargement des créneaux</span>
          <i />
          <i />
          <i />
        </div>
      ) : null}

      {etat.vue === 'ferme' ? (
        <>
          <p className="pa-texte">Les créneaux ouvrent bientôt.</p>
          <a className="pa-pilule" href={`mailto:${contact}`}>
            {contact}
          </a>
        </>
      ) : null}

      {etat.vue === 'choix' ? (
        <>
          <p className="pa-texte">En visio, avec {liste(avec)}. Sans engagement.</p>
          <div className="pa-semaine">
            <button type="button" className="pa-rond" disabled={attente || etat.semaine.semaine === 0} onClick={() => void ouvrir(etat.semaine.semaine - 1, false)} aria-label="Semaine précédente">
              ‹
            </button>
            <span className="pa-semaine-nom">{etat.semaine.libelle}</span>
            <button type="button" className="pa-rond" disabled={attente || etat.semaine.derniere} onClick={() => void ouvrir(etat.semaine.semaine + 1, false)} aria-label="Semaine suivante">
              ›
            </button>
          </div>
          <div className="pa-jours" role="tablist" aria-label="Jour">
            {etat.semaine.jours.map((j) => {
              const c = court(j.libelle)
              return (
                <button
                  type="button"
                  role="tab"
                  key={j.jour}
                  aria-selected={etat.jour === j.jour}
                  aria-label={j.libelle}
                  className={`pa-jour ${etat.jour === j.jour ? 'est-choisi' : ''}`}
                  disabled={j.creneaux.length === 0}
                  onClick={() => setEtat({ ...etat, jour: j.jour })}
                >
                  <span>{c.jour}</span>
                  <strong>{c.numero}</strong>
                </button>
              )
            })}
          </div>
          {etat.jour ? (
            <div className="pa-heures">
              {(etat.semaine.jours.find((j) => j.jour === etat.jour)?.creneaux ?? []).map((c) => (
                <button
                  type="button"
                  key={c.debut}
                  className="pa-heure"
                  onClick={() => {
                    setErreur(null)
                    setEtat({ vue: 'formulaire', semaine: etat.semaine, creneau: c, jourLibelle: etat.semaine.jours.find((j) => j.jour === etat.jour)?.libelle ?? '' })
                  }}
                >
                  {c.heure}
                </button>
              ))}
            </div>
          ) : (
            <p className="pa-vide">Aucun créneau cette semaine.</p>
          )}
          <p className="pa-note">Heure de Paris.</p>
          {erreur ? (
            <p className="pa-erreur" role="alert">
              {erreur.message}
            </p>
          ) : null}
        </>
      ) : null}

      {etat.vue === 'formulaire' ? (
        <form
          className="pa-form"
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault()
            void envoyer(ev.currentTarget, etat)
          }}
        >
          <p className="pa-choisi">
            <span>
              {etat.jourLibelle} à {etat.creneau.heure}
            </span>
            <button type="button" className="pa-pilule" onClick={() => setEtat({ vue: 'choix', semaine: etat.semaine, jour: premierJourLibre(etat.semaine) })}>
              Changer
            </button>
          </p>
          <Champ nom="nom" libelle="Votre nom" auto="name" erreur={erreur} />
          <Champ nom="organisation" libelle="École, association ou entreprise" auto="organization" erreur={erreur} />
          <Champ nom="email" libelle="E-mail" type="email" auto="email" erreur={erreur} />
          <Champ nom="telephone" libelle="Téléphone" type="tel" auto="tel" erreur={erreur} />
          <div className="pa-duo">
            <Champ nom="evenement_debut" libelle="Début de l’événement" type="date" auto="off" erreur={erreur} />
            <Champ nom="evenement_fin" libelle="Fin" type="date" auto="off" erreur={erreur} />
          </div>
          <Champ nom="participants" libelle="Nombre de participants" type="text" mode="numeric" auto="off" indice="ex. 120" erreur={erreur} />
          <label className="pa-champ">
            <span>Votre événement, en un mot (facultatif)</span>
            <textarea name="message" rows={2} maxLength={PROSPECT_MESSAGE_MAX} />
          </label>
          {/* Le piège à robots : invisible, jamais atteint au clavier. */}
          <label className="pa-miel" aria-hidden="true">
            Site
            <input name="site" tabIndex={-1} autoComplete="off" />
          </label>
          {erreur ? (
            <p className="pa-erreur" role="alert">
              {erreur.message}
            </p>
          ) : null}
          <button type="submit" className="pa-bouton" disabled={attente}>
            {attente ? 'Un instant…' : 'Confirmer le rendez-vous'}
          </button>
          <p className="pa-note">L’invitation arrive par mail, avec le lien de la visio.</p>
        </form>
      ) : null}

      {etat.vue === 'fait' ? (
        <div className="pa-fait" role="status">
          <p className="pa-fait-quand">{etat.quand}</p>
          <p className="pa-texte">C’est noté. L’invitation est partie dans votre boîte mail, avec le lien de la visio.</p>
          {etat.visio ? (
            <a className="pa-pilule" href={etat.visio} target="_blank" rel="noreferrer">
              Lien de la visio
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function Champ({
  nom,
  libelle,
  type = 'text',
  mode,
  auto,
  indice,
  erreur,
}: {
  nom: ChampProspect
  libelle: string
  type?: string
  mode?: 'numeric'
  auto: string
  indice?: string
  erreur: { champ: ChampProspect | null } | null
}) {
  return (
    <label className="pa-champ">
      <span>{libelle}</span>
      <input name={nom} type={type} inputMode={mode} autoComplete={auto} placeholder={indice} aria-invalid={erreur?.champ === nom || undefined} />
    </label>
  )
}
