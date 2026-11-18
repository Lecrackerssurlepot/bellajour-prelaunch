'use client'

/* La page /partenaires : la brochure à gauche, le rendez-vous à droite ;
   au téléphone, l'une sous l'autre et un bouton fixe qui mène au rendez-vous.

   LA BROCHURE est un défilement horizontal natif (scroll-snap) : le doigt, le
   pavé tactile, les flèches du clavier et les deux boutons font la même chose.
   La page courante se lit à la position du défilement (jamais un
   IntersectionObserver : il se fige dans un onglet masqué). Toucher une page
   l'ouvre en grand.

   LE RENDEZ-VOUS ne croit rien de ce qu'il affiche : chaque créneau vient du
   serveur, et le serveur le refait avant de réserver. Si les agendas ne sont
   pas reliés (503) ou que l'Édition collective est fermée (404), le panneau
   montre l'adresse de contact : la page ne promet jamais un créneau
   qu'elle n'a pas. */

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  /* Le bouton fixe du téléphone s'efface quand le rendez-vous est à l'écran : il ne couvre jamais le formulaire. */
  const carte = useRef<HTMLElement>(null)
  const [carteVue, setCarteVue] = useState(false)
  useEffect(() => {
    const el = carte.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setCarteVue(e.isIntersecting), { rootMargin: '0px 0px -120px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <main className="pa-page">
      <header className="pa-tete">
        <Link className="pa-logo" href="/" prefetch={false} aria-label="Bellajour, retour à l’accueil">
          <img src="/images/v2/ui/signature-bellajour-240.webp" alt="" width={240} height={92} decoding="async" />
        </Link>
        <span className="pa-tete-etiq">Écoles et associations</span>
      </header>

      <div className="pa-corps">
        <section className="pa-gauche" aria-label="La brochure">
          <h1 className="pa-titre">
            Vos années étudiantes, <em>imprimées en magazine.</em>
          </h1>
          <Brochure pages={pages} pdf={pdf} />
        </section>

        <section className="pa-droite" id="rendez-vous" aria-label="Prendre rendez-vous" ref={carte}>
          <RendezVous contact={contact} />
        </section>
      </div>

      <a className={`pa-fixe ${carteVue ? 'est-cache' : ''}`} href="#rendez-vous" tabIndex={carteVue ? -1 : undefined}>
        Prendre rendez-vous
      </a>
    </main>
  )
}

/* ─────────────────────────────── la brochure ─────────────────────────────── */

function Brochure({ pages, pdf }: { pages: PageBrochure[]; pdf: string }) {
  const piste = useRef<HTMLDivElement>(null)
  const [courante, setCourante] = useState(0)
  const [grande, setGrande] = useState<number | null>(null)

  const aller = useCallback((i: number) => {
    const p = piste.current
    const cible = p?.children[Math.min(Math.max(i, 0), (p?.children.length ?? 1) - 1)] as HTMLElement | undefined
    if (!p || !cible) return
    /* Le compteur suit le geste tout de suite : le défilement confirme ensuite (`lire`). */
    setCourante(Array.from(p.children).indexOf(cible))
    p.scrollTo({ left: cible.offsetLeft - (p.clientWidth - cible.clientWidth) / 2, behavior: 'smooth' })
  }, [])

  /* La page courante : celle dont le centre est le plus près du centre de la piste. */
  function lire() {
    const p = piste.current
    if (!p) return
    const centre = p.scrollLeft + p.clientWidth / 2
    let mieux = 0
    let ecart = Infinity
    Array.from(p.children).forEach((el, i) => {
      const e = el as HTMLElement
      const d = Math.abs(e.offsetLeft + e.clientWidth / 2 - centre)
      if (d < ecart) {
        ecart = d
        mieux = i
      }
    })
    setCourante(mieux)
  }

  useEffect(() => {
    if (grande === null) return
    const fermer = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGrande(null)
      if (e.key === 'ArrowRight') setGrande((g) => (g === null ? g : Math.min(g + 1, pages.length - 1)))
      if (e.key === 'ArrowLeft') setGrande((g) => (g === null ? g : Math.max(g - 1, 0)))
    }
    window.addEventListener('keydown', fermer)
    return () => window.removeEventListener('keydown', fermer)
  }, [grande, pages.length])

  return (
    <div className="pa-bro">
      <div
        className="pa-piste"
        ref={piste}
        onScroll={lire}
        tabIndex={0}
        role="group"
        aria-roledescription="carrousel"
        aria-label={`La brochure, ${pages.length} pages`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            aller(courante + 1)
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            aller(courante - 1)
          }
        }}
      >
        {pages.map((p, i) => (
          <button
            type="button"
            key={p.grande}
            className={`pa-feuille ${i === courante ? 'est-courante' : ''}`}
            aria-label={`Page ${i + 1} sur ${pages.length} : agrandir`}
            onClick={() => (i === courante ? setGrande(i) : aller(i))}
          >
            <img
              src={p.petite}
              srcSet={`${p.petite} 800w, ${p.grande} 1600w`}
              sizes="(max-width: 999px) 78vw, 40vw"
              alt={p.alt}
              width={800}
              height={1131}
              loading={i < 2 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          </button>
        ))}
      </div>

      <div className="pa-bro-barre">
        <button type="button" className="pa-rond" onClick={() => aller(courante - 1)} disabled={courante === 0} aria-label="Page précédente">
          ‹
        </button>
        <span className="pa-compte" aria-live="polite">
          {courante + 1} / {pages.length}
        </span>
        <button type="button" className="pa-rond" onClick={() => aller(courante + 1)} disabled={courante === pages.length - 1} aria-label="Page suivante">
          ›
        </button>
        <a className="pa-pilule" href={pdf} download>
          Télécharger le PDF
        </a>
      </div>

      {grande !== null ? (
        <div className="pa-grand" role="dialog" aria-modal="true" aria-label={`Page ${grande + 1} sur ${pages.length}`} onClick={() => setGrande(null)}>
          <button type="button" className="pa-rond pa-grand-fermer" aria-label="Fermer" autoFocus>
            ×
          </button>
          <img src={pages[grande].grande} alt={pages[grande].alt} width={1600} height={2262} onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </div>
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
    return (await rep.json()) as Semaine
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
      <p className="pa-etiq">Premier échange</p>
      <h2 className="pa-carte-titre">
        Parlons de votre <em>projet.</em>
      </h2>

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
          <p className="pa-texte">Sans engagement, pour cadrer votre événement.</p>
          <a className="pa-bouton" href={`mailto:${contact}?subject=${encodeURIComponent('Un magazine pour notre événement')}`}>
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
          <Champ nom="telephone" libelle="Téléphone (facultatif)" type="tel" auto="tel" erreur={erreur} />
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

function Champ({ nom, libelle, type = 'text', auto, erreur }: { nom: ChampProspect; libelle: string; type?: string; auto: string; erreur: { champ: ChampProspect | null } | null }) {
  return (
    <label className="pa-champ">
      <span>{libelle}</span>
      <input name={nom} type={type} autoComplete={auto} aria-invalid={erreur?.champ === nom || undefined} />
    </label>
  )
}
