'use client'

/* L'écran Site · Visuels : les emplacements du site, ce que chacun montre à
   la date choisie, ses rotations datées, et l'ajout d'un visuel (dépôt direct
   dans le panier public, puis une ligne dans `visuels_rotations`).
   Les calculs sont ceux du site (`visuelPour`, `etatRotation`), rejoués ici. */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  etatRotation,
  visuelPour,
  type Emplacement,
  type EtatRotation,
  type NomEmplacement,
  type Rotation,
  type Visuel,
} from '@/content/media'
import { accepteMobile, defautFusionne, ligneVersRotation, ligneVersVisuel, trierLignes, type LigneRotation } from '@/lib/visuels/rotation'
import ChampDate from '@/components/calendrier/ChampDate'
import type { VisuelBibliotheque } from '@/lib/visuels/bibliotheque'

export type EmplacementVu = Emplacement & { nom: NomEmplacement; lignes: LigneRotation[] }

export type { VisuelBibliotheque }

/* La page du site où vit chaque famille d'emplacements, pour « Voir sur le site ». */
export const PAGE_DU_SITE: Record<string, string> = {
  accueil: '/',
  magazine: '/magazine',
  composer: '/composer',
  offrir: '/offrir',
  groupes: '/partenaires',
  partage: '/',
}

/** L'adresse de la vue « Sur le site » (une date, ou deux côte à côte). */
export function vueSite(o: { a: string; b?: string; brouillons?: boolean; page?: string; montrer?: string }): string {
  const q = new URLSearchParams({ a: o.a })
  if (o.b) q.set('b', o.b)
  if (o.brouillons) q.set('brouillons', '1')
  if (o.page) q.set('page', o.page)
  if (o.montrer) q.set('montrer', o.montrer)
  return `/admin/atelier/site/visuels/site?${q.toString()}`
}

export const PAGES_DU_SITE = [
  { chemin: '/', nom: 'Accueil' },
  { chemin: '/magazine', nom: 'Magazine' },
  { chemin: '/offrir', nom: 'Offrir' },
  { chemin: '/partenaires', nom: 'Groupes' },
  { chemin: '/composer', nom: 'Composer' },
] as const

const MOIS = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
export const jourLisible = (j: string) => MOIS.format(new Date(`${j}T12:00:00Z`))
export const instantDe = (j: string) => new Date(`${j}T12:00:00+01:00`)

export type Ligne = { rotation: Rotation; ligne: LigneRotation | null }

/** Les rotations DATÉES d'un emplacement : celles de l'admin d'abord, puis celles du code. */
export function rotationsDe(e: EmplacementVu): Ligne[] {
  const base: Ligne[] = trierLignes(e.lignes.filter((l) => l.defaut !== true))
    .map((l) => ({ rotation: ligneVersRotation(l), ligne: l }))
    .filter((x): x is { rotation: Rotation; ligne: LigneRotation } => x.rotation !== null)
  return [...base, ...e.rotations.map((r) => ({ rotation: r, ligne: null }))]
}

/** Les lignes « défaut » de l'admin, la plus récente d'abord. */
export function defautsDe(e: EmplacementVu): LigneRotation[] {
  return trierLignes(e.lignes.filter((l) => l.defaut === true))
}

/** L'emplacement tel que le site le calcule (défaut remplacé, rotations de l'admin d'abord). */
export function fusionDe(e: EmplacementVu, brouillons: boolean): Emplacement {
  return { ...e, defaut: defautFusionne(e.nom, e.lignes, brouillons), rotations: rotationsDe(e).map((x) => x.rotation) }
}

export function Vignette({ v, ratio, petite }: { v: Visuel | null; ratio?: string; petite?: boolean }) {
  return (
    <span className={`vis-vignette${petite ? ' vis-vignette--petite' : ''}`} style={ratio && !petite ? { aspectRatio: ratio } : undefined}>
      {v ? <img src={v.fichier} alt={v.alt} loading="lazy" style={v.cadrage ? { objectPosition: v.cadrage } : undefined} /> : <span className="vis-rien">Rien</span>}
      {v?.mobile ? <span className="vis-pastille-tel" title="Version téléphone">Tél.</span> : null}
    </span>
  )
}

/** « 210 / 297 » → 0,707. */
function valeurRatio(r: string | undefined): number | null {
  if (!r) return null
  const [a, b] = r.split('/').map((x) => Number(x.trim()))
  return a > 0 && b > 0 ? a / b : null
}

/**
 * Le cadrage : un clic sur l'image pose le point gardé quand la page la
 * recadre ; à côté, le rendu dans le format de l'emplacement. Flèches du
 * clavier : 5 % par appui.
 */
export function Cadrage({
  src,
  ratio,
  valeur,
  changer,
}: {
  src: string
  ratio?: string
  valeur: string | null
  changer: (v: string | null) => void
}) {
  const [taille, setTaille] = useState<{ l: number; h: number } | null>(null)
  const [x, y] = (valeur ?? '50% 50%').split(' ').map((v) => parseFloat(v))
  const borne = (n: number) => Math.round(Math.min(100, Math.max(0, n)))
  const poser = (px: number, py: number) => changer(`${borne(px)}% ${borne(py)}%`)
  const cible = valeurRatio(ratio)
  const reel = taille ? taille.l / taille.h : null
  const recadre = cible && reel ? Math.abs(reel / cible - 1) > 0.05 : false

  return (
    <div className="vis-cadrage">
      <div className="vis-cadrage-vues">
        <div
          className="vis-cadrage-source"
          role="slider"
          tabIndex={0}
          aria-label="Point de cadrage"
          aria-valuetext={`${x} % depuis la gauche, ${y} % depuis le haut`}
          aria-valuenow={x}
          onClick={(ev) => {
            const r = ev.currentTarget.getBoundingClientRect()
            poser(((ev.clientX - r.left) / r.width) * 100, ((ev.clientY - r.top) / r.height) * 100)
          }}
          onKeyDown={(ev) => {
            const pas: Record<string, [number, number]> = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }
            const d = pas[ev.key]
            if (!d) return
            ev.preventDefault()
            poser(x + d[0], y + d[1])
          }}
        >
          <img src={src} alt="" onLoad={(ev) => setTaille({ l: ev.currentTarget.naturalWidth, h: ev.currentTarget.naturalHeight })} />
          <i className="vis-cadrage-point" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true" />
        </div>
        {ratio ? (
          <span className="vis-cadrage-rendu" style={{ aspectRatio: ratio }}>
            <img src={src} alt="" style={{ objectPosition: valeur ?? '50% 50%' }} />
          </span>
        ) : null}
      </div>
      <p className="vis-sous">
        {taille ? `Image ${taille.l} × ${taille.h} px. ` : ''}
        {ratio ? (recadre ? `Recadrée au format ${ratio.replace(' / ', ' × ')} : touchez ce qui doit rester.` : 'Même format que l’emplacement.') : 'Touchez ce qui doit rester.'}
        {valeur ? (
          <>
            {' '}
            <button type="button" className="vis-lien" onClick={() => changer(null)}>
              Recentrer
            </button>
          </>
        ) : null}
      </p>
    </div>
  )
}

const CLASSE_ETAT: Record<EtatRotation, string> = {
  'en ligne': 'vis-etat--ligne',
  'à valider': 'vis-etat--valider',
  'à venir': 'vis-etat--venir',
  passée: 'vis-etat--passee',
  masquée: 'vis-etat--masquee',
}

/* ── Le dépôt ─────────────────────────────────────────────── */

/** Une image lourde ou non webp est réduite et convertie dans le navigateur (3 000 px au plus). */
async function preparerImage(f: File): Promise<Blob> {
  if (f.type === 'image/webp' && f.size < 1.5 * 1024 * 1024) return f
  try {
    const bmp = await createImageBitmap(f)
    const echelle = Math.min(1, 3000 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * echelle)
    c.height = Math.round(bmp.height * echelle)
    c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height)
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/webp', 0.86))
    if (blob && blob.type === 'image/webp') return blob
  } catch {
    /* Le navigateur ne sait pas lire ou convertir : on envoie l'original. */
  }
  return f
}

async function deposer(emplacement: NomEmplacement, fichier: Blob): Promise<string> {
  const r = await fetch('/api/admin/visuels/depot', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ emplacement, type: fichier.type, taille: fichier.size }),
  })
  const j = (await r.json().catch(() => ({}))) as { envoi?: string; adresse?: string; error?: string }
  if (!r.ok || !j.envoi || !j.adresse) {
    throw new Error(j.error === 'trop_lourd' ? 'Fichier trop lourd' : j.error === 'type_refuse' ? 'Format refusé' : 'Dépôt impossible')
  }
  const corps = new FormData()
  corps.append('cacheControl', '31536000')
  corps.append('', fichier)
  const envoi = await fetch(j.envoi, { method: 'PUT', body: corps, headers: { 'x-upsert': 'false' } })
  if (!envoi.ok) throw new Error('Envoi interrompu')
  return j.adresse
}

type Saisie = { du: string; au: string; alt: string; valide: boolean; vide: boolean }

async function enregistrer(
  methode: 'POST' | 'PATCH',
  url: string,
  corps: Record<string, unknown>,
): Promise<void> {
  const r = await fetch(url, { method: methode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) })
  if (r.ok) return
  const j = (await r.json().catch(() => ({}))) as { error?: string; champ?: string }
  const champ: Record<string, string> = {
    du: 'Date de début',
    au: 'Date de fin',
    alt: 'Description',
    fichier: 'Image',
    vide: 'Vide',
    fichier_mobile: 'Image téléphone',
    cadrage: 'Cadrage',
  }
  if (j.error === 'champ_invalide' && j.champ) throw new Error(`${champ[j.champ] ?? j.champ} à revoir`)
  if (j.error === 'migration_visuels_absente') throw new Error('Table absente')
  if (j.error === 'migration_visuels_v2_absente') throw new Error('Migration 20261127 à appliquer')
  throw new Error('Enregistrement impossible')
}

/* ── Le formulaire d'ajout ───────────────────────────────── */

function Bibliotheque({
  liste,
  choisi,
  choisir,
}: {
  liste: VisuelBibliotheque[]
  choisi: string | null
  choisir: (v: VisuelBibliotheque) => void
}) {
  const [filtre, setFiltre] = useState('')
  const vus = filtre.trim()
    ? liste.filter((v) => `${v.alt} ${v.source}`.toLowerCase().includes(filtre.trim().toLowerCase()))
    : liste
  return (
    <div className="vis-biblio">
      <input
        type="search"
        className="vis-biblio-filtre"
        placeholder="Chercher"
        aria-label="Chercher dans la bibliothèque"
        value={filtre}
        onChange={(x) => setFiltre(x.target.value)}
      />
      <ul className="vis-biblio-grille">
        {vus.map((v) => (
          <li key={v.fichier}>
            <button
              type="button"
              className={`vis-biblio-case${choisi === v.fichier ? ' est-choisi' : ''}`}
              aria-pressed={choisi === v.fichier}
              title={v.alt}
              onClick={() => choisir(v)}
            >
              <img src={v.fichier} alt="" loading="lazy" />
              <span>{v.source}</span>
            </button>
          </li>
        ))}
      </ul>
      {vus.length === 0 ? <p className="vis-sous">Aucun visuel</p> : null}
    </div>
  )
}

/** Une image : reprise de la bibliothèque, ou un nouveau fichier. */
type Source = { mode: 'bibliotheque'; repris: VisuelBibliotheque | null } | { mode: 'fichier'; fichier: File | null; apercu: string | null }

function ChoixImage({
  id,
  libelle,
  liste,
  source,
  changer,
  reprendre,
}: {
  id: string
  libelle: string
  liste: VisuelBibliotheque[]
  source: Source
  changer: (s: Source) => void
  reprendre?: (v: VisuelBibliotheque) => void
}) {
  return (
    <>
      <div className="vis-bascule" role="group" aria-label={`${libelle} : origine`}>
        <button type="button" aria-pressed={source.mode === 'bibliotheque'} onClick={() => changer({ mode: 'bibliotheque', repris: null })}>
          Déjà sur le site
        </button>
        <button type="button" aria-pressed={source.mode === 'fichier'} onClick={() => changer({ mode: 'fichier', fichier: null, apercu: null })}>
          Nouveau fichier
        </button>
      </div>
      {source.mode === 'bibliotheque' ? (
        <Bibliotheque
          liste={liste}
          choisi={source.repris?.fichier ?? null}
          choisir={(v) => {
            changer({ mode: 'bibliotheque', repris: v })
            reprendre?.(v)
          }}
        />
      ) : (
        <label className="vis-champ" htmlFor={id}>
          <span>{libelle}</span>
          <input
            id={id}
            type="file"
            accept="image/webp,image/jpeg,image/png"
            onChange={(x) => {
              const f = x.target.files?.[0] ?? null
              changer({ mode: 'fichier', fichier: f, apercu: f ? URL.createObjectURL(f) : null })
            }}
          />
        </label>
      )}
    </>
  )
}

const adresseDe = (s: Source): string | null => (s.mode === 'bibliotheque' ? (s.repris?.fichier ?? null) : s.apercu)

async function fichierDe(nom: NomEmplacement, s: Source): Promise<string | null> {
  if (s.mode === 'bibliotheque') return s.repris?.fichier ?? null
  return s.fichier ? deposer(nom, await preparerImage(s.fichier)) : null
}

export function Ajout({
  e,
  aujourdhui,
  fini,
  bibliotheque,
  v2,
  defaut,
}: {
  e: EmplacementVu
  aujourdhui: string
  fini: () => void
  bibliotheque: VisuelBibliotheque[]
  /** La migration 20261127 est en place : version téléphone, cadrage et défaut s'enregistrent. */
  v2: boolean
  /** Le visuel remplace le défaut (pas de dates). */
  defaut?: boolean
}) {
  const liste = useMemo(() => (e.type === 'video' ? bibliotheque.filter((v) => v.video) : bibliotheque), [bibliotheque, e.type])
  const [principal, setPrincipal] = useState<Source>({ mode: 'bibliotheque', repris: null })
  const [mobile, setMobile] = useState<Source | null>(null)
  const [cadrage, setCadrage] = useState<string | null>(null)
  const [s, setS] = useState<Saisie>({ du: aujourdhui, au: aujourdhui, alt: '', valide: false, vide: false })
  const [mp4, setMp4] = useState<File | null>(null)
  const [webm, setWebm] = useState<File | null>(null)
  const [etat, setEtat] = useState<{ enCours: boolean; erreur: string | null }>({ enCours: false, erreur: null })
  const id = `ajout-${e.nom}${defaut ? '-defaut' : ''}`
  const vue = adresseDe(principal)
  const images = useMemo(() => bibliotheque.filter((v) => !v.video), [bibliotheque])

  async function envoyer(ev: React.FormEvent) {
    ev.preventDefault()
    setEtat({ enCours: true, erreur: null })
    try {
      let fichier: string | null = null
      let video_mp4: string | null = null
      let video_webm: string | null = null
      let fichier_mobile: string | null = null
      if (!s.vide) {
        if (!vue) throw new Error(principal.mode === 'bibliotheque' ? 'Choisir un visuel' : e.type === 'video' ? 'Image d’attente manquante' : 'Image manquante')
        if (!s.alt.trim()) throw new Error('Description manquante')
        fichier = await fichierDe(e.nom, principal)
        if (e.type === 'video' && principal.mode === 'bibliotheque') {
          video_mp4 = principal.repris?.video?.mp4 ?? null
          video_webm = principal.repris?.video?.webm ?? null
        }
        if (e.type === 'video' && principal.mode === 'fichier' && mp4) video_mp4 = await deposer(e.nom, mp4)
        if (e.type === 'video' && principal.mode === 'fichier' && webm && mp4) video_webm = await deposer(e.nom, webm)
        if (mobile) fichier_mobile = await fichierDe(e.nom, mobile)
      }
      await enregistrer('POST', '/api/admin/visuels/rotations', {
        emplacement: e.nom,
        ...s,
        fichier,
        video_mp4,
        video_webm,
        fichier_mobile,
        cadrage: s.vide ? null : cadrage,
        defaut: defaut === true,
      })
      fini()
    } catch (err) {
      setEtat({ enCours: false, erreur: (err as Error).message })
    }
  }

  return (
    <form className="vis-form" onSubmit={envoyer}>
      {defaut ? <p className="vis-form-titre">Nouveau visuel par défaut</p> : null}
      {defaut && !v2 ? <p className="vis-alerte">Migration 20261127 à appliquer</p> : null}
      {e.optionnel ? (
        <label className="vis-case">
          <input type="checkbox" checked={s.vide} onChange={(x) => setS({ ...s, vide: x.target.checked })} />
          {defaut ? 'Rien par défaut' : 'Rien sur la période'}
        </label>
      ) : null}
      {!s.vide ? (
        <ChoixImage
          id={`${id}-image`}
          libelle={e.type === 'video' ? 'Image d’attente' : 'Image'}
          liste={liste}
          source={principal}
          changer={(x) => {
            setPrincipal(x)
            setCadrage(null)
          }}
          reprendre={(v) => setS((x) => ({ ...x, alt: x.alt.trim() ? x.alt : v.alt }))}
        />
      ) : null}
      {!s.vide && e.type === 'video' && principal.mode === 'fichier' ? (
        <>
          <label className="vis-champ" htmlFor={`${id}-mp4`}>
            <span>Vidéo mp4</span>
            <input id={`${id}-mp4`} type="file" accept="video/mp4" onChange={(x) => setMp4(x.target.files?.[0] ?? null)} />
          </label>
          <label className="vis-champ" htmlFor={`${id}-webm`}>
            <span>Vidéo webm (facultatif)</span>
            <input id={`${id}-webm`} type="file" accept="video/webm" onChange={(x) => setWebm(x.target.files?.[0] ?? null)} />
          </label>
        </>
      ) : null}
      {!s.vide ? (
        <label className="vis-champ" htmlFor={`${id}-alt`}>
          <span>Description</span>
          <input id={`${id}-alt`} type="text" maxLength={200} value={s.alt} placeholder="Ce que montre l’image" onChange={(x) => setS({ ...s, alt: x.target.value })} />
        </label>
      ) : null}
      {!s.vide && vue && v2 ? (
        <fieldset className="vis-groupe">
          <legend>Cadrage</legend>
          <Cadrage src={vue} ratio={e.ratio} valeur={cadrage} changer={setCadrage} />
        </fieldset>
      ) : null}
      {!s.vide && accepteMobile(e) ? (
        <fieldset className="vis-groupe">
          <legend>Sur téléphone</legend>
          {!v2 ? (
            <p className="vis-sous">Migration 20261127 à appliquer</p>
          ) : mobile ? (
            <>
              <ChoixImage id={`${id}-mobile`} libelle="Image téléphone" liste={images} source={mobile} changer={setMobile} />
              <button type="button" className="vis-lien" onClick={() => setMobile(null)}>
                Même image partout
              </button>
            </>
          ) : (
            <div className="vis-bascule" role="group" aria-label="Sur téléphone">
              <button type="button" aria-pressed="true">
                Même image
              </button>
              <button type="button" aria-pressed="false" onClick={() => setMobile({ mode: 'bibliotheque', repris: null })}>
                Une autre
              </button>
            </div>
          )}
        </fieldset>
      ) : null}
      {!defaut ? (
        <div className="vis-dates">
          <ChampDate libelle="Du" valeur={s.du} aujourdhui={aujourdhui} changer={(j) => setS({ ...s, du: j, au: j > s.au ? j : s.au })} />
          <ChampDate libelle="Au" valeur={s.au} aujourdhui={aujourdhui} min={s.du} changer={(j) => setS({ ...s, au: j })} />
        </div>
      ) : null}
      <Interrupteur valide={s.valide} changer={(v) => setS({ ...s, valide: v })} />
      {etat.erreur ? <p className="vis-erreur" role="alert">{etat.erreur}</p> : null}
      <div className="vis-gestes">
        <button type="submit" className="m-btn vis-btn" disabled={etat.enCours || (defaut === true && !v2)}>
          {etat.enCours ? 'Envoi…' : 'Enregistrer'}
        </button>
        <button type="button" className="m-second vis-btn" onClick={fini} disabled={etat.enCours}>
          Annuler
        </button>
      </div>
    </form>
  )
}

function Interrupteur({ valide, changer, desactive }: { valide: boolean; changer: (v: boolean) => void; desactive?: boolean }) {
  return (
    <div className="vis-bascule" role="group" aria-label="Brouillon ou validé">
      <button type="button" aria-pressed={!valide} disabled={desactive} onClick={() => changer(false)}>
        Brouillon
      </button>
      <button type="button" aria-pressed={valide} disabled={desactive} onClick={() => changer(true)}>
        Validé
      </button>
    </div>
  )
}

/* ── Une rotation de la liste ────────────────────────────── */

function LigneVue({
  l,
  etat,
  ratio,
  rafraichir,
  aujourdhui,
  v2,
  defaut,
}: {
  l: Ligne
  etat: EtatRotation | 'remplacé'
  ratio?: string
  rafraichir: () => void
  aujourdhui: string
  v2: boolean
  /** Une ligne « défaut » : pas de dates. */
  defaut?: boolean
}) {
  const [edition, setEdition] = useState(false)
  const [retrait, setRetrait] = useState(false)
  const [d, setD] = useState({ du: l.rotation.du, au: l.rotation.au, alt: l.ligne?.alt ?? '', cadrage: l.ligne?.cadrage ?? null })
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const r = l.rotation
  const v: Visuel | null = l.ligne ? ligneVersVisuel(l.ligne) : r.vide ? null : { fichier: r.fichier, alt: r.alt, ...(r.mobile ? { mobile: r.mobile } : {}), ...(r.cadrage ? { cadrage: r.cadrage } : {}) }

  async function patch(changes: Partial<{ du: string; au: string; alt: string; valide: boolean; cadrage: string | null; fichier_mobile: string | null }>) {
    if (!l.ligne) return
    setEnCours(true)
    setErreur(null)
    try {
      const x = l.ligne
      await enregistrer('PATCH', `/api/admin/visuels/rotations/${x.id}`, {
        emplacement: x.emplacement,
        du: x.du,
        au: x.au,
        vide: x.vide,
        fichier: x.fichier,
        alt: x.alt,
        video_mp4: x.video_mp4,
        video_webm: x.video_webm,
        valide: x.valide,
        fichier_mobile: x.fichier_mobile ?? null,
        cadrage: x.cadrage ?? null,
        defaut: x.defaut === true,
        ...changes,
      })
      setEdition(false)
      rafraichir()
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnCours(false)
    }
  }

  async function retirer() {
    if (!l.ligne) return
    setEnCours(true)
    const rep = await fetch(`/api/admin/visuels/rotations/${l.ligne.id}`, { method: 'DELETE' })
    setEnCours(false)
    if (rep.ok) rafraichir()
    else setErreur('Retrait impossible')
  }

  return (
    <li className="vis-rotation">
      <Vignette v={v} ratio={ratio} petite />
      <div className="vis-rotation-texte">
        <span className="vis-periode">
          {defaut ? 'Par défaut' : `${jourLisible(r.du)} → ${jourLisible(r.au)}`}
        </span>
        <span className="vis-sous">{r.vide ? (defaut ? 'Rien' : 'Rien sur la période') : r.alt}</span>
        {!l.ligne ? <span className="vis-sous">Dans le code</span> : null}
        {r.vide ? null : r.video ? <span className="vis-sous">Avec vidéo</span> : null}
        {v?.mobile ? <span className="vis-sous">Autre image sur téléphone</span> : null}
        {v?.cadrage ? <span className="vis-sous">Cadrage {v.cadrage.replace(' ', ' · ')}</span> : null}
        {edition ? (
          <div className="vis-form vis-form--ligne">
            {!defaut ? (
              <div className="vis-dates">
                <ChampDate libelle="Du" valeur={d.du} aujourdhui={aujourdhui} changer={(j) => setD({ ...d, du: j, au: j > d.au ? j : d.au })} />
                <ChampDate libelle="Au" valeur={d.au} aujourdhui={aujourdhui} min={d.du} changer={(j) => setD({ ...d, au: j })} />
              </div>
            ) : null}
            {!r.vide ? (
              <label className="vis-champ">
                <span>Description</span>
                <input type="text" maxLength={200} value={d.alt} onChange={(x) => setD({ ...d, alt: x.target.value })} />
              </label>
            ) : null}
            {!r.vide && v && v2 ? (
              <fieldset className="vis-groupe">
                <legend>Cadrage</legend>
                <Cadrage src={v.fichier} ratio={ratio} valeur={d.cadrage} changer={(c) => setD({ ...d, cadrage: c })} />
              </fieldset>
            ) : null}
            {v?.mobile ? (
              <button type="button" className="vis-lien" disabled={enCours} onClick={() => patch({ fichier_mobile: null })}>
                Même image sur téléphone
              </button>
            ) : null}
            <div className="vis-gestes">
              <button type="button" className="m-btn vis-btn" disabled={enCours} onClick={() => patch(d)}>
                Enregistrer
              </button>
              <button type="button" className="m-second vis-btn" onClick={() => setEdition(false)}>
                Annuler
              </button>
            </div>
          </div>
        ) : null}
        {erreur ? <p className="vis-erreur" role="alert">{erreur}</p> : null}
      </div>
      <div className="vis-rotation-droite">
        <span className={`vis-etat ${etat === 'remplacé' ? 'vis-etat--masquee' : CLASSE_ETAT[etat]}`}>{etat}</span>
        {l.ligne ? (
          <>
            <Interrupteur valide={r.valide} desactive={enCours} changer={(valide) => patch({ valide })} />
            <div className="vis-liens">
              {!edition ? (
                <button type="button" className="vis-lien" onClick={() => setEdition(true)}>
                  Modifier
                </button>
              ) : null}
              {retrait ? (
                <>
                  <button type="button" className="vis-lien vis-lien--fort" disabled={enCours} onClick={retirer}>
                    Oui, retirer
                  </button>
                  <button type="button" className="vis-lien" onClick={() => setRetrait(false)}>
                    Non
                  </button>
                </>
              ) : (
                <button type="button" className="vis-lien" onClick={() => setRetrait(true)}>
                  Retirer
                </button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </li>
  )
}

/* ── L'écran ─────────────────────────────────────────────── */

export default function Visuels({
  emplacements,
  aujourdhui,
  absente,
  erreur,
  bibliotheque,
  v2,
}: {
  emplacements: EmplacementVu[]
  aujourdhui: string
  absente: boolean
  erreur: boolean
  bibliotheque: VisuelBibliotheque[]
  v2: boolean
}) {
  const router = useRouter()
  const [jour, setJour] = useState(aujourdhui)
  const [brouillons, setBrouillons] = useState(false)
  const [ajout, setAjout] = useState<{ nom: NomEmplacement; defaut: boolean } | null>(null)
  const rafraichir = () => router.refresh()

  const vus = useMemo(
    () =>
      emplacements.map((e) => {
        const lignes = rotationsDe(e)
        const fusion = fusionDe(e, brouillons)
        const table = { [e.nom]: fusion } as Record<string, Emplacement>
        return { e, lignes, defauts: defautsDe(e), fusion, duJour: visuelPour(e.nom, instantDe(jour), table, { brouillons }) }
      }),
    [emplacements, jour, brouillons],
  )

  /* Les jours où quelque chose change sur le site : un point dans le calendrier. */
  const changements = useMemo(() => {
    const out = new Set<string>()
    for (const { lignes } of vus) for (const { rotation } of lignes) out.add(rotation.du)
    return out
  }, [vus])

  return (
    <main className="vis">
      <header className="vis-tete">
        <div>
          <p className="vis-surtitre">Site</p>
          <h1 className="vis-h1">Visuels</h1>
          <p className="vis-sous">{emplacements.length} emplacements</p>
        </div>
      </header>

      {absente ? <p className="vis-alerte">Table absente : migration 20261126 à appliquer.</p> : null}
      {erreur ? <p className="vis-alerte">Base injoignable : rien n’est perdu, réessayer.</p> : null}
      {!absente && !erreur && !v2 ? <p className="vis-alerte">Version téléphone, cadrage et défaut : migration 20261127 à appliquer.</p> : null}

      <section className="vis-barre" aria-label="Le site à une date">
        <ChampDate libelle="Le site le" valeur={jour} aujourdhui={aujourdhui} marques={changements} changer={setJour} />
        <button type="button" className="m-second vis-btn" onClick={() => setJour(aujourdhui)} disabled={jour === aujourdhui}>
          Aujourd’hui
        </button>
        <label className="vis-case">
          <input type="checkbox" checked={brouillons} onChange={(x) => setBrouillons(x.target.checked)} />
          Avec brouillons
        </label>
        <a className="m-btn vis-btn" href={vueSite({ a: jour, brouillons })}>
          Voir le site
        </a>
        <a className="m-second vis-btn" href={vueSite({ a: aujourdhui, b: jour === aujourdhui ? undefined : jour, brouillons })}>
          Comparer deux dates
        </a>
        <a className="vis-lien" href="/api/admin/visuels/apercu?fin=1">
          Quitter l’aperçu
        </a>
      </section>

      <ul className="vis-liste">
        {vus.map(({ e, lignes, defauts, fusion, duJour }) => {
          /* Le défaut en ligne : la ligne « défaut » validée la plus récente, sinon celui du code. */
          const defautActif = defauts.find((x) => x.valide)?.id ?? null
          const page = PAGE_DU_SITE[e.nom.split('.')[0]] ?? '/'
          return (
            <li key={e.nom} className="vis-emplacement" id={e.nom}>
              <div className="vis-emp-tete">
                <code className="vis-nom">{e.nom}</code>
                <span className="vis-role">{e.role}</span>
                <span className="vis-meta">
                  {e.ratio ? <span>Format {e.ratio.replace(' / ', ' × ')}</span> : null}
                  {e.type === 'video' ? <span>Vidéo</span> : null}
                  {e.optionnel ? <span>Peut rester vide</span> : null}
                  {e.provisoire ? <span>Défaut provisoire</span> : null}
                </span>
              </div>

              <div className="vis-emp-corps">
                <figure className="vis-jour">
                  <Vignette v={duJour} ratio={e.ratio} />
                  <figcaption>
                    <strong>Le {jourLisible(jour)}</strong>
                    <a className="vis-lien" href={vueSite({ a: jour, brouillons, page, montrer: e.nom })}>
                      Voir où, sur le site
                    </a>
                  </figcaption>
                </figure>

                <div className="vis-rotations">
                  <ul>
                    {lignes.map((l, i) => (
                      <LigneVue
                        key={l.ligne?.id ?? `code-${i}`}
                        l={l}
                        etat={etatRotation(fusion, i, jour)}
                        ratio={e.ratio}
                        rafraichir={rafraichir}
                        aujourdhui={aujourdhui}
                        v2={v2}
                      />
                    ))}
                    {defauts.map((x) => {
                      const rot = ligneVersRotation(x)
                      if (!rot) return null
                      const etatD: EtatRotation | 'remplacé' = !x.valide ? 'à valider' : x.id === defautActif ? 'en ligne' : 'remplacé'
                      return (
                        <LigneVue
                          key={x.id}
                          l={{ rotation: rot, ligne: x }}
                          etat={etatD}
                          ratio={e.ratio}
                          rafraichir={rafraichir}
                          aujourdhui={aujourdhui}
                          v2={v2}
                          defaut
                        />
                      )
                    })}
                    <li className="vis-rotation vis-rotation--defaut">
                      <Vignette v={e.defaut} ratio={e.ratio} petite />
                      <div className="vis-rotation-texte">
                        <span className="vis-periode">Par défaut</span>
                        <span className="vis-sous">{e.defaut ? e.defaut.alt : 'Rien'}</span>
                        <span className="vis-sous">Dans le code</span>
                      </div>
                      <div className="vis-rotation-droite">
                        {defautActif ? <span className="vis-etat vis-etat--masquee">remplacé</span> : null}
                      </div>
                    </li>
                  </ul>
                  {ajout?.nom === e.nom ? (
                    <Ajout
                      e={e}
                      bibliotheque={bibliotheque}
                      aujourdhui={jour}
                      v2={v2}
                      defaut={ajout.defaut}
                      fini={() => {
                        setAjout(null)
                        rafraichir()
                      }}
                    />
                  ) : (
                    <div className="vis-gestes">
                      <button type="button" className="m-second vis-btn vis-ajouter" onClick={() => setAjout({ nom: e.nom, defaut: false })} disabled={absente}>
                        Ajouter un visuel
                      </button>
                      <button type="button" className="vis-lien" onClick={() => setAjout({ nom: e.nom, defaut: true })} disabled={absente || !v2}>
                        Changer le défaut
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
