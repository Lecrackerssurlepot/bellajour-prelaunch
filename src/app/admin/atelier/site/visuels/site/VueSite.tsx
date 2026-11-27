'use client'

/* LE SITE À UNE DATE, VU COMME LE SITE (27/11).
   Un cadre par date (deux pour comparer), chacun ouvert sur la vraie page
   avec SA date dans l'adresse. Dans chaque cadre, chaque visuel reconnu est
   entouré et porte son nom ; un clic ouvre le pop-up de l'emplacement
   (ce qu'il montre, ajouter un visuel, aller à sa fiche).

   Le repérage se fait dans la page encadrée (même origine) :
   - `data-emplacement` posé par <Visuel> ;
   - sinon le fichier : src / currentSrc / poster / source d'une vidéo, et les
     `background-image` ; la table fichier → emplacements est calculée ici, à
     la date du cadre, avec la même règle que le site (`visuelPour`).
   Ce qui n'est pas repéré (couvertures posées sur le magazine 3D, dessinées
   dans un canvas) est listé sous le cadre, cliquable lui aussi. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { visuelPour, type Emplacement, type NomEmplacement, type Visuel } from '@/content/media'
import { valeurApercu, PARAM_APERCU } from '@/lib/visuels/apercu'
import type { VisuelBibliotheque } from '@/lib/visuels/bibliotheque'
import ChampDate from '@/components/calendrier/ChampDate'
import {
  Ajout,
  PAGES_DU_SITE,
  PAGE_DU_SITE,
  Vignette,
  instantDe,
  jourLisible,
  rotationsDe,
  type EmplacementVu,
} from '../Visuels'

type Depart = { a: string; b: string | null; page: string; brouillons: boolean; montrer: NomEmplacement | null }
type Appareil = 'ordinateur' | 'telephone'
const LARGEUR: Record<Appareil, number> = { ordinateur: 1280, telephone: 390 }

/** Ce que le site montre à cette date, emplacement par emplacement. */
function visuelsDuJour(emplacements: EmplacementVu[], jour: string, brouillons: boolean): Map<NomEmplacement, Visuel | null> {
  const out = new Map<NomEmplacement, Visuel | null>()
  for (const e of emplacements) {
    const fusion: Emplacement = { ...e, rotations: rotationsDe(e).map((x) => x.rotation) }
    out.set(e.nom, visuelPour(e.nom, instantDe(jour), { [e.nom]: fusion } as Record<string, Emplacement>, { brouillons }))
  }
  return out
}

/** La table « adresse complète d'un fichier → emplacements qui le montrent ». */
function tableDesFichiers(duJour: Map<NomEmplacement, Visuel | null>, base: string): Map<string, NomEmplacement[]> {
  const t = new Map<string, NomEmplacement[]>()
  const ajouter = (f: string | undefined, nom: NomEmplacement) => {
    if (!f) return
    const cle = new URL(f, base).href
    t.set(cle, [...(t.get(cle) ?? []).filter((n) => n !== nom), nom])
  }
  for (const [nom, v] of duJour) {
    if (!v) continue
    ajouter(v.fichier, nom)
    ajouter(v.video?.mp4, nom)
    ajouter(v.video?.webm, nom)
  }
  return t
}

const STYLE_REPERES = `
#bj-reperes{position:absolute;left:0;top:0;width:0;height:0;z-index:2147483646;pointer-events:none}
#bj-reperes .bj-r{position:absolute;border:2px solid #111;border-radius:6px;box-shadow:0 0 0 2px rgba(255,255,255,.85)}
#bj-reperes .bj-r.est-montre{border-width:4px;box-shadow:0 0 0 3px #fff,0 0 0 9999px rgba(255,255,255,.35)}
#bj-reperes .bj-e{position:absolute;left:6px;top:6px;transform-origin:top left;transform:scale(var(--bj-k,1));pointer-events:auto;cursor:pointer;display:inline-flex;gap:6px;align-items:center;max-width:calc(100% - 12px);padding:6px 12px;border:0;border-radius:999px;background:#111;color:#fff;font:500 13px/1.2 system-ui,-apple-system,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 8px 18px -10px rgba(0,0,0,.6)}
#bj-reperes .bj-e:hover{background:#333}
`

type Repere = { el: Element; noms: NomEmplacement[] }

function urlsDeFond(valeur: string): string[] {
  const out: string[] = []
  const re = /url\(["']?([^"')]+)["']?\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(valeur))) out.push(m[1])
  return out
}

/** Cherche, dans la page encadrée, les éléments qui montrent un emplacement. */
function chercher(doc: Document, table: Map<string, NomEmplacement[]>, familles: string[]): Repere[] {
  const vus = new Map<Element, Set<NomEmplacement>>()
  const exacts = new Set<Element>()
  const noter = (el: Element, tous: NomEmplacement[] | undefined) => {
    if (!tous?.length || exacts.has(el)) return
    /* Un même fichier peut servir plusieurs emplacements (défauts provisoires) :
       on garde ceux de la page regardée quand il y en a. */
    const dePage = tous.filter((n) => familles.includes(n.split('.')[0]))
    const noms = dePage.length ? dePage : tous
    const s = vus.get(el) ?? new Set<NomEmplacement>()
    noms.forEach((n) => s.add(n))
    vus.set(el, s)
  }
  const cle = (u: string | null | undefined) => {
    if (!u) return null
    try {
      return new URL(u, doc.baseURI).href
    } catch {
      return null
    }
  }
  doc.querySelectorAll('[data-emplacement]').forEach((el) => {
    const n = el.getAttribute('data-emplacement') as NomEmplacement | null
    if (n) {
      vus.set(el, new Set([n]))
      exacts.add(el)
    }
  })
  doc.querySelectorAll('img').forEach((img) => {
    for (const u of [img.currentSrc, img.getAttribute('src')]) {
      const k = cle(u)
      if (k) noter(img, table.get(k))
    }
  })
  doc.querySelectorAll('video').forEach((v) => {
    const k = cle(v.getAttribute('poster'))
    if (k) noter(v, table.get(k))
    v.querySelectorAll('source').forEach((s) => {
      const ks = cle(s.getAttribute('src'))
      if (ks) noter(v, table.get(ks))
    })
  })
  const vue = doc.defaultView
  if (vue) {
    doc.body?.querySelectorAll('*').forEach((el) => {
      const fond = vue.getComputedStyle(el).backgroundImage
      if (!fond || fond === 'none' || !fond.includes('url(')) return
      for (const u of urlsDeFond(fond)) {
        const k = cle(u)
        if (k) noter(el, table.get(k))
      }
    })
  }
  return [...vus].map(([el, s]) => ({ el, noms: [...s] }))
}

type Cadre = {
  cle: 'a' | 'b'
  jour: string
}

function CadreSite({
  cadre,
  page,
  brouillons,
  appareil,
  reperes,
  montrer,
  emplacements,
  ouvrir,
  naviguer,
  surDefilement,
  enregistrer,
  version,
}: {
  cadre: Cadre
  page: string
  brouillons: boolean
  appareil: Appareil
  reperes: boolean
  montrer: NomEmplacement | null
  emplacements: EmplacementVu[]
  ouvrir: (nom: NomEmplacement, jour: string) => void
  naviguer: (chemin: string) => void
  surDefilement: (cle: 'a' | 'b', y: number) => void
  enregistrer: (cle: 'a' | 'b', w: Window | null) => void
  version: number
}) {
  const boite = useRef<HTMLDivElement>(null)
  const cadreRef = useRef<HTMLIFrameElement>(null)
  const [largeur, setLargeur] = useState(0)
  const [hauteur, setHauteur] = useState(0)
  const [charge, setCharge] = useState(false)
  const [nonVus, setNonVus] = useState<NomEmplacement[]>([])
  const [trouves, setTrouves] = useState(0)
  const dejaMontre = useRef(false)
  /* Garde-fou : la vue ne s'ouvre jamais dans un de ses propres cadres. */
  const [imbrique] = useState(() => typeof window !== 'undefined' && window.self !== window.top)

  const duJour = useMemo(() => visuelsDuJour(emplacements, cadre.jour, brouillons), [emplacements, cadre.jour, brouillons])
  const src = `${page}?${PARAM_APERCU}=${encodeURIComponent(valeurApercu(cadre.jour, brouillons))}`
  const W = LARGEUR[appareil]
  const echelle = largeur ? Math.min(1, largeur / W) : 1
  const echelleRef = useRef(echelle)
  useEffect(() => {
    echelleRef.current = echelle
  }, [echelle])

  useEffect(() => {
    const el = boite.current
    if (!el) return
    const ro = new ResizeObserver(([x]) => {
      setLargeur(x.contentRect.width)
      setHauteur(x.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* Le dessin des repères dans la page encadrée. */
  const dessiner = useCallback(() => {
    const doc = cadreRef.current?.contentDocument
    const vue = cadreRef.current?.contentWindow
    if (!doc || !vue || !doc.body) return
    let calque = doc.getElementById('bj-reperes')
    if (!doc.getElementById('bj-reperes-style')) {
      const st = doc.createElement('style')
      st.id = 'bj-reperes-style'
      st.textContent = STYLE_REPERES
      doc.head.appendChild(st)
    }
    if (!calque) {
      calque = doc.createElement('div')
      calque.id = 'bj-reperes'
      doc.body.appendChild(calque)
    }
    calque.replaceChildren()
    /* Les étiquettes gardent leur taille lisible malgré la réduction du cadre. */
    const k = 1 / echelleRef.current
    calque.style.setProperty('--bj-k', String(k))
    if (!reperes) {
      setTrouves(0)
      return
    }
    const famille = Object.entries(PAGE_DU_SITE)
      .filter(([f, chemin]) => chemin === page && f !== 'partage')
      .map(([f]) => f)
    const liste = chercher(doc, tableDesFichiers(duJour, doc.baseURI), famille)
    const reperesNoms = new Set<NomEmplacement>()
    for (const r of liste) {
      const rect = r.el.getBoundingClientRect()
      if (rect.width < 8 || rect.height < 8) continue
      r.noms.forEach((n) => reperesNoms.add(n))
      const boiteR = doc.createElement('div')
      const estMontre = !!montrer && r.noms.includes(montrer)
      boiteR.className = `bj-r${estMontre ? ' est-montre' : ''}`
      /* « Voir où » : on amène l'emplacement au milieu du cadre, une fois. */
      if (estMontre && !dejaMontre.current) {
        dejaMontre.current = true
        vue.scrollTo({ top: Math.max(0, rect.top + vue.scrollY - vue.innerHeight / 3) })
      }
      boiteR.style.left = `${rect.left + vue.scrollX}px`
      boiteR.style.top = `${rect.top + vue.scrollY}px`
      boiteR.style.width = `${rect.width}px`
      boiteR.style.height = `${rect.height}px`
      for (const [i, n] of r.noms.entries()) {
        const b = doc.createElement('button')
        b.type = 'button'
        b.className = 'bj-e'
        b.textContent = n
        b.style.top = `${6 + i * 34 * k}px`
        b.addEventListener('click', (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          ouvrir(n, cadre.jour)
        })
        boiteR.appendChild(b)
      }
      calque.appendChild(boiteR)
    }
    setTrouves(reperesNoms.size)
    setNonVus(
      emplacements
        .filter((e) => famille.includes(e.nom.split('.')[0]) && !reperesNoms.has(e.nom) && duJour.get(e.nom))
        .map((e) => e.nom),
    )
  }, [reperes, duJour, montrer, emplacements, page, ouvrir, cadre.jour])

  /* Branché à chaque chargement de la page encadrée. */
  const brancher = useCallback(() => {
    const doc = cadreRef.current?.contentDocument
    const vue = cadreRef.current?.contentWindow
    if (!doc || !vue) return
    setCharge(true)
    enregistrer(cadre.cle, vue)
    let attente = 0
    const plus_tard = () => {
      cancelAnimationFrame(attente)
      attente = requestAnimationFrame(dessiner)
    }
    vue.addEventListener('scroll', () => {
      plus_tard()
      surDefilement(cadre.cle, vue.scrollY)
    })
    vue.addEventListener('resize', plus_tard)
    /* Un lien interne garde la date du cadre, et les deux cadres suivent. */
    doc.addEventListener(
      'click',
      (ev) => {
        const a = (ev.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
        if (!a) return
        const u = new URL(a.href, doc.baseURI)
        if (u.origin !== vue.location.origin) return
        ev.preventDefault()
        naviguer(u.pathname)
      },
      true,
    )
    dessiner()
    /* Les images différées et les animations d'entrée bougent la page : on redessine. */
    const minuteur = vue.setInterval(dessiner, 1500)
    vue.addEventListener('pagehide', () => vue.clearInterval(minuteur))
  }, [dessiner, enregistrer, cadre.cle, surDefilement, naviguer])

  useEffect(() => {
    if (!charge) return
    const id = requestAnimationFrame(dessiner)
    return () => cancelAnimationFrame(id)
  }, [charge, dessiner])

  return (
    <section className="vs-cadre" aria-label={`Le site le ${jourLisible(cadre.jour)}`}>
      <header className="vs-cadre-tete">
        <strong>{jourLisible(cadre.jour)}</strong>
        {reperes && charge ? <span className="vis-sous"> · {trouves} repérés</span> : null}
      </header>
      <div className="vs-ecran" ref={boite} data-appareil={appareil}>
        {largeur > 0 && !imbrique ? (
          <iframe
            key={`${src}-${version}`}
            ref={cadreRef}
            src={src}
            title={`Le site le ${jourLisible(cadre.jour)}`}
            onLoad={brancher}
            style={{
              width: W,
              height: hauteur / echelle,
              transform: `scale(${echelle})`,
              left: appareil === 'telephone' ? Math.max(0, (largeur - W * echelle) / 2) : 0,
            }}
          />
        ) : null}
        {!charge ? <p className="vs-attente">Chargement…</p> : null}
      </div>
      {reperes && nonVus.length ? (
        <div className="vs-non-vus">
          <span className="vis-sous">Hors de l’écran ou dans le magazine 3D :</span>
          {nonVus.map((n) => (
            <button key={n} type="button" className="vs-puce" onClick={() => ouvrir(n, cadre.jour)}>
              {n}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

/* ── Le pop-up d'un emplacement ──────────────────────────── */

function Fiche({
  e,
  jour,
  brouillons,
  aujourdhui,
  bibliotheque,
  fermer,
  fini,
}: {
  e: EmplacementVu
  jour: string
  brouillons: boolean
  aujourdhui: string
  bibliotheque: VisuelBibliotheque[]
  fermer: () => void
  fini: () => void
}) {
  const [ajout, setAjout] = useState(false)
  const v = visuelsDuJour([e], jour, brouillons).get(e.nom) ?? null
  const lignes = rotationsDe(e)
  useEffect(() => {
    const echap = (ev: KeyboardEvent) => ev.key === 'Escape' && fermer()
    document.addEventListener('keydown', echap)
    return () => document.removeEventListener('keydown', echap)
  }, [fermer])
  return (
    <div className="vs-voile" onClick={fermer}>
      <div className="vs-fiche" role="dialog" aria-modal="true" aria-label={e.nom} onClick={(x) => x.stopPropagation()}>
        <button type="button" className="vs-fermer" onClick={fermer} aria-label="Fermer">
          ×
        </button>
        <code className="vis-nom">{e.nom}</code>
        <p className="vs-role">{e.role}</p>
        <div className="vs-fiche-corps">
          <Vignette v={v} ratio={e.ratio} />
          <dl className="vs-faits">
            <div>
              <dt>Le {jourLisible(jour)}</dt>
              <dd>{v ? v.alt : 'Rien'}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>{e.ratio ? e.ratio.replace(' / ', ' × ') : 'Libre'}</dd>
            </div>
            <div>
              <dt>Rotations</dt>
              <dd>{lignes.length}</dd>
            </div>
          </dl>
        </div>
        {ajout ? (
          <Ajout e={e} aujourdhui={jour < aujourdhui ? aujourdhui : jour} bibliotheque={bibliotheque} fini={fini} />
        ) : (
          <div className="vis-gestes">
            <button type="button" className="m-btn vis-btn" onClick={() => setAjout(true)}>
              Changer ce visuel
            </button>
            <a className="m-second vis-btn" href={`/admin/atelier/site/visuels#${e.nom}`} target="_top">
              Voir sa fiche
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── L'écran ─────────────────────────────────────────────── */

export default function VueSite({
  emplacements,
  bibliotheque,
  aujourdhui,
  depart,
}: {
  emplacements: EmplacementVu[]
  bibliotheque: VisuelBibliotheque[]
  aujourdhui: string
  depart: Depart
}) {
  const router = useRouter()
  const [a, setA] = useState(depart.a)
  const [b, setB] = useState<string | null>(depart.b)
  const [page, setPage] = useState(depart.page)
  const [brouillons, setBrouillons] = useState(depart.brouillons)
  const [appareil, setAppareil] = useState<Appareil>('ordinateur')
  const [reperes, setReperes] = useState(true)
  const [synchro, setSynchro] = useState(true)
  const [fiche, setFiche] = useState<{ nom: NomEmplacement; jour: string } | null>(null)
  const [version, setVersion] = useState(0)
  const fenetres = useRef<Record<'a' | 'b', Window | null>>({ a: null, b: null })
  const meneur = useRef<{ cle: 'a' | 'b'; t: number } | null>(null)

  /* L'adresse suit l'écran : un lien copié rouvre la même vue. */
  useEffect(() => {
    const q = new URLSearchParams({ a, page })
    if (b) q.set('b', b)
    if (brouillons) q.set('brouillons', '1')
    if (depart.montrer) q.set('montrer', depart.montrer)
    window.history.replaceState(null, '', `?${q.toString()}`)
  }, [a, b, page, brouillons, depart.montrer])

  const changements = useMemo(() => {
    const out = new Set<string>()
    for (const e of emplacements) for (const { rotation } of rotationsDe(e)) out.add(rotation.du)
    return out
  }, [emplacements])

  const enregistrer = useCallback((cle: 'a' | 'b', w: Window | null) => {
    fenetres.current[cle] = w
  }, [])
  const surDefilement = useCallback(
    (cle: 'a' | 'b', y: number) => {
      if (!synchro) return
      const maintenant = performance.now()
      const m = meneur.current
      if (m && m.cle !== cle && maintenant - m.t < 120) return
      meneur.current = { cle, t: maintenant }
      const autre = fenetres.current[cle === 'a' ? 'b' : 'a']
      try {
        autre?.scrollTo({ top: y })
      } catch {
        /* cadre en cours de rechargement */
      }
    },
    [synchro],
  )
  const ouvrir = useCallback((nom: NomEmplacement, jour: string) => setFiche({ nom, jour }), [])
  const naviguer = useCallback((chemin: string) => setPage(chemin), [])

  const cadres: Cadre[] = b ? [{ cle: 'a', jour: a }, { cle: 'b', jour: b }] : [{ cle: 'a', jour: a }]
  const eFiche = fiche ? emplacements.find((e) => e.nom === fiche.nom) : undefined

  return (
    <main className="vs">
      <header className="vs-tete">
        <div>
          <p className="vis-surtitre">
            <Link href="/admin/atelier/site/visuels">Visuels</Link> · Sur le site
          </p>
          <h1 className="vis-h1">{b ? 'Deux dates côte à côte' : 'Le site à une date'}</h1>
        </div>
        <Link className="vis-lien" href="/admin/atelier/site/visuels">
          Retour à la liste
        </Link>
      </header>

      <section className="vis-barre vs-barre" aria-label="Réglages de la vue">
        <ChampDate libelle={b ? 'Date A' : 'Le site le'} valeur={a} aujourdhui={aujourdhui} marques={changements} changer={setA} />
        {b ? (
          <>
            <ChampDate libelle="Date B" valeur={b} aujourdhui={aujourdhui} marques={changements} changer={setB} />
            <button type="button" className="vis-lien" onClick={() => setB(null)}>
              Une seule date
            </button>
          </>
        ) : (
          <button type="button" className="m-second vis-btn" onClick={() => setB(a)}>
            Comparer
          </button>
        )}
        <div className="vis-bascule" role="group" aria-label="Page">
          {PAGES_DU_SITE.map((p) => (
            <button key={p.chemin} type="button" aria-pressed={page === p.chemin} onClick={() => setPage(p.chemin)}>
              {p.nom}
            </button>
          ))}
        </div>
        <div className="vis-bascule" role="group" aria-label="Appareil">
          <button type="button" aria-pressed={appareil === 'ordinateur'} onClick={() => setAppareil('ordinateur')}>
            Ordinateur
          </button>
          <button type="button" aria-pressed={appareil === 'telephone'} onClick={() => setAppareil('telephone')}>
            Téléphone
          </button>
        </div>
        <label className="vis-case">
          <input type="checkbox" checked={reperes} onChange={(x) => setReperes(x.target.checked)} />
          Repères
        </label>
        {b ? (
          <label className="vis-case">
            <input type="checkbox" checked={synchro} onChange={(x) => setSynchro(x.target.checked)} />
            Défiler ensemble
          </label>
        ) : null}
        <label className="vis-case">
          <input type="checkbox" checked={brouillons} onChange={(x) => setBrouillons(x.target.checked)} />
          Avec brouillons
        </label>
      </section>

      {!PAGES_DU_SITE.some((p) => p.chemin === page) ? <p className="vis-sous">Page : {page}</p> : null}

      <div className={`vs-cadres${b ? ' vs-cadres--deux' : ''}`}>
        {cadres.map((c) => (
          <CadreSite
            key={c.cle}
            cadre={c}
            page={page}
            brouillons={brouillons}
            appareil={appareil}
            reperes={reperes}
            montrer={depart.montrer}
            emplacements={emplacements}
            ouvrir={ouvrir}
            naviguer={naviguer}
            surDefilement={surDefilement}
            enregistrer={enregistrer}
            version={version}
          />
        ))}
      </div>

      {fiche && eFiche ? (
        <Fiche
          e={eFiche}
          jour={fiche.jour}
          brouillons={brouillons}
          aujourdhui={aujourdhui}
          bibliotheque={bibliotheque}
          fermer={() => setFiche(null)}
          fini={() => {
            setFiche(null)
            router.refresh()
            setVersion((x) => x + 1)
          }}
        />
      ) : null}
    </main>
  )
}
