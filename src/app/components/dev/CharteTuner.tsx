'use client'

/* PANNEAU DE RÉGLAGE DE LA CHARTE — outil interne de Mathias, jamais vu des visiteurs.

   Deux verrous, l'un sur l'autre :
   1. le layout racine ne le rend qu'en `next dev` et sur les prévisualisations
      Vercel (`VERCEL_ENV === 'preview'`) : jamais sur bellajour.fr ;
   2. même là, il ne s'ouvre qu'après une visite avec `?charte=1` (mémorisée dans le
      localStorage, effacée par « Fermer le panneau »).

   Ce qu'il fait : il réécrit, en direct, les variables des huit rôles de
   src/app/charte.css (`--hero-size`, `--body-line`…) dans une balise <style> à lui,
   plus spécifique que charte.css. Rien n'est écrit ailleurs que dans ce navigateur.
   « Copier les réglages » rend le bloc CSS des valeurs changées, à recoller dans
   charte.css pour qu'il devienne la charte.

   Pour le retirer : supprimer ce dossier (ou le ranger dans archive/) et la ligne
   qui le monte dans src/app/layout.tsx. Aucune autre dépendance. */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'

type Role = 'hero' | 'section' | 'subtitle' | 'accent' | 'body' | 'small' | 'label' | 'number'
type Police = 'Instrument Serif' | 'Pistara' | 'Interlope' | 'Aileron'
type Reglage = {
  font: Police
  size: number
  sizeMobile: number
  line: number
  track: number
  weight: number
  case: 'none' | 'uppercase'
}
type Reglages = Record<Role, Reglage>

const ROLES: { id: Role; nom: string; min: number; max: number }[] = [
  { id: 'hero', nom: 'Hero', min: 28, max: 110 },
  { id: 'section', nom: 'Titres de section', min: 22, max: 72 },
  { id: 'subtitle', nom: 'Intertitres', min: 16, max: 44 },
  { id: 'accent', nom: 'Accroche', min: 14, max: 44 },
  { id: 'body', nom: 'Texte courant', min: 14, max: 22 },
  { id: 'small', nom: 'Petit texte', min: 11, max: 17 },
  { id: 'label', nom: 'Étiquettes', min: 9, max: 16 },
  { id: 'number', nom: 'Chiffres', min: 20, max: 80 },
]

/* Les polices que la charte autorise, rôle par rôle. Pistara est listée mais
   éteinte : sa licence n'accorde pas la diffusion sur le web (LISEZMOI des polices). */
const POLICES: Record<Role, Police[]> = {
  hero: ['Pistara', 'Instrument Serif'],
  section: ['Instrument Serif', 'Pistara'],
  subtitle: ['Instrument Serif', 'Pistara'],
  accent: ['Interlope'],
  body: ['Aileron'],
  small: ['Aileron'],
  label: ['Aileron'],
  number: ['Aileron'],
}
const POLICE_INDISPONIBLE: Police[] = ['Pistara']
const PILE: Record<Police, string> = {
  'Instrument Serif': 'var(--ch-serif)',
  Pistara: 'var(--ch-serif)',
  Interlope: 'var(--ch-script)',
  Aileron: 'var(--ch-sans)',
}
const GRAISSES: Record<Police, number[]> = {
  'Instrument Serif': [400],
  Pistara: [400],
  Interlope: [400],
  Aileron: [300, 400, 600],
}
const AVEC_CASSE: Role[] = ['hero', 'label']

const CLE_OUVERT = 'bj-charte-panneau'
const CLE_REGLAGES = 'bj-charte-reglages'
const ID_STYLE = 'bj-charte-tuner'

/* ── ouvert ou non : lu dans l'URL et le localStorage, jamais au rendu serveur ── */
function lireOuvert(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('charte') === '1') return true
    return window.localStorage.getItem(CLE_OUVERT) === '1'
  } catch {
    return false
  }
}
const abonnes = new Set<() => void>()
function abonner(f: () => void) {
  // La visite par ?charte=1 ouvre le panneau pour les pages suivantes aussi.
  try {
    if (new URLSearchParams(window.location.search).get('charte') === '1') {
      window.localStorage.setItem(CLE_OUVERT, '1')
    }
  } catch {}
  abonnes.add(f)
  window.addEventListener('storage', f)
  return () => {
    abonnes.delete(f)
    window.removeEventListener('storage', f)
  }
}
function prevenir() {
  abonnes.forEach((f) => f())
}

/* ── les valeurs de charte.css, relues sur la page (jamais recopiées ici) ── */
function nombre(v: string, repli: number): number {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : repli
}
function lireCharte(): Reglages | null {
  const el = document.querySelector('.bj-charte')
  if (!el) return null
  // Le style du panneau est retiré le temps de la lecture : on veut la charte nue.
  const style = document.getElementById(ID_STYLE)
  const media = style?.getAttribute('media') ?? null
  style?.setAttribute('media', 'not all')
  const cs = getComputedStyle(el)
  const v = (n: string) => cs.getPropertyValue(n).trim()
  const sortie = {} as Reglages
  for (const { id } of ROLES) {
    // Une variable se lit déjà résolue : on la compare aux trois piles de la charte.
    const pile = v(`--${id}-font`)
    const font: Police =
      pile === v('--ch-script') ? 'Interlope' : pile === v('--ch-sans') ? 'Aileron' : 'Instrument Serif'
    sortie[id] = {
      font,
      size: nombre(v(`--${id}-size`), 16),
      sizeMobile: nombre(v(`--${id}-size-mobile`), 16),
      line: nombre(v(`--${id}-line`), 1.4),
      track: nombre(v(`--${id}-track`), 0),
      weight: nombre(v(`--${id}-weight`), 400),
      case: v(`--${id}-case`) === 'uppercase' ? 'uppercase' : 'none',
    }
  }
  if (style) {
    if (media === null) style.removeAttribute('media')
    else style.setAttribute('media', media)
  }
  return sortie
}

function lireReglagesGardes(): Partial<Reglages> {
  try {
    const brut = window.localStorage.getItem(CLE_REGLAGES)
    return brut ? (JSON.parse(brut) as Partial<Reglages>) : {}
  } catch {
    return {}
  }
}

function lignes(r: Reglage, id: Role): string[] {
  return [
    `--${id}-font: ${PILE[r.font]};`,
    `--${id}-size: ${r.size}px;`,
    `--${id}-size-mobile: ${r.sizeMobile}px;`,
    `--${id}-line: ${r.line};`,
    `--${id}-track: ${r.track}em;`,
    `--${id}-weight: ${r.weight};`,
    `--${id}-case: ${r.case};`,
  ]
}

function differences(r: Reglages, base: Reglages): string[] {
  const sortie: string[] = []
  for (const { id } of ROLES) {
    const a = lignes(r[id], id)
    const b = lignes(base[id], id)
    a.forEach((l, i) => {
      if (l !== b[i]) sortie.push(l)
    })
  }
  return sortie
}

/* ── repérage et débordements ── */
function elementsDuRole(role: Role): HTMLElement[] {
  const tous = document.querySelectorAll<HTMLElement>('.bj-charte *')
  const sortie: HTMLElement[] = []
  tous.forEach((el) => {
    if (el.closest('.ctn')) return
    if (getComputedStyle(el).getPropertyValue('--role').trim() === role) sortie.push(el)
  })
  return sortie
}

function porteDuTexte(el: HTMLElement): boolean {
  for (const n of el.childNodes) {
    if (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '') return true
  }
  return false
}

function compterDebordements(): number {
  document.querySelectorAll('[data-charte-deborde]').forEach((el) => el.removeAttribute('data-charte-deborde'))
  let total = 0
  document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
    if (el.closest('.ctn') || !porteDuTexte(el)) return
    const cs = getComputedStyle(el)
    if (cs.display === 'inline' || cs.display === 'none' || cs.visibility === 'hidden') return
    if (el.clientWidth === 0 && el.clientHeight === 0) return
    const largeur = el.scrollWidth > el.clientWidth + 1
    const hauteur = cs.maxHeight !== 'none' && el.scrollHeight > el.clientHeight + 1
    // globals.css coupe un mot trop long AU MILIEU sous 767 px (overflow-wrap:
    // anywhere) au lieu de le laisser déborder : sans ce test, un titre trop
    // grand passerait pour sain. On relâche la coupure le temps de mesurer.
    let motCoupe = false
    if (!largeur && cs.overflowWrap !== 'normal') {
      const avant = [el.style.getPropertyValue('overflow-wrap'), el.style.getPropertyPriority('overflow-wrap')]
      el.style.setProperty('overflow-wrap', 'normal', 'important')
      el.style.setProperty('word-break', 'normal', 'important')
      motCoupe = el.scrollWidth > el.clientWidth + 1
      if (avant[0]) el.style.setProperty('overflow-wrap', avant[0], avant[1])
      else el.style.removeProperty('overflow-wrap')
      el.style.removeProperty('word-break')
    }
    if (largeur || hauteur || motCoupe) {
      el.setAttribute('data-charte-deborde', '')
      total += 1
    }
  })
  // La page elle-même ne doit jamais défiler de côté.
  if (document.documentElement.scrollWidth > window.innerWidth + 1) total += 1
  return total
}

const CSS = `
.ctn{position:fixed;right:12px;bottom:12px;z-index:2147483000;width:316px;max-height:calc(100vh - 24px);overflow:auto;
  font:13px/1.4 system-ui,-apple-system,sans-serif;color:#1d2330;background:#fff;border:1px solid #dde2ea;border-radius:8px;
  box-shadow:0 12px 40px rgba(29,35,48,.18);letter-spacing:0;text-transform:none;font-variant-numeric:normal}
.ctn *{font:inherit;color:inherit;letter-spacing:0;text-transform:none;box-sizing:border-box}
.ctn-tete{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid #dde2ea;position:sticky;top:0;background:#fff}
.ctn-tete b{font-weight:600}
.ctn-corps{padding:10px 12px;display:grid;gap:10px}
.ctn label{display:grid;gap:4px}
.ctn-ligne{display:flex;align-items:center;gap:8px}
.ctn-ligne input[type=range]{flex:1;min-width:0}
.ctn input[type=number]{width:64px;padding:3px 4px;border:1px solid #dde2ea;border-radius:4px;font-size:13px}
.ctn select{padding:4px;border:1px solid #dde2ea;border-radius:4px;background:#fff;font-size:13px}
.ctn button{padding:6px 9px;border:1px solid #134ea3;border-radius:4px;background:#fff;color:#134ea3;cursor:pointer;font-size:12px}
.ctn button.ctn-plein{background:#134ea3;color:#fff}
.ctn button[aria-pressed=true]{background:#eaf0fa}
.ctn-boutons{display:flex;flex-wrap:wrap;gap:6px}
.ctn-note{color:#5d6678;font-size:12px}
.ctn-alerte{padding:6px 8px;border-radius:4px;background:#eaf0fa}
.ctn-alerte.ctn-rouge{background:#fde8e8;color:#9b1c1c}
.ctn-mini{width:auto;padding:0}
[data-charte-repere]{outline:2px dashed #134ea3!important;outline-offset:2px}
[data-charte-deborde]{outline:2px solid #d92d20!important;outline-offset:1px}
`

export default function CharteTuner() {
  const ouvert = useSyncExternalStore(abonner, lireOuvert, () => false)
  if (!ouvert) return null
  return <Panneau />
}

function Panneau() {
  const chemin = usePathname()
  const vueMobile = useMemo(
    () => new URLSearchParams(window.location.search).get('charte-vue') === 'mobile',
    [],
  )
  const [base] = useState<Reglages | null>(() => lireCharte())
  const [reglages, setReglages] = useState<Reglages | null>(() => {
    if (!base) return null
    const gardes = lireReglagesGardes()
    const r = { ...base }
    for (const { id } of ROLES) if (gardes[id]) r[id] = { ...base[id], ...gardes[id] }
    return r
  })
  const [role, setRole] = useState<Role>('hero')
  const [replie, setReplie] = useState(vueMobile)
  const [repere, setRepere] = useState<{ role: Role; nb: number } | null>(null)
  const [alertes, setAlertes] = useState(0)
  const [copie, setCopie] = useState('')
  const minuteur = useRef<number | undefined>(undefined)

  // Les réglages s'écrivent dans une balise <style> à part, plus spécifique que
  // charte.css (trois classes), et se gardent pour la page suivante.
  useEffect(() => {
    if (!reglages || !base) return
    let style = document.getElementById(ID_STYLE)
    if (!style) {
      style = document.createElement('style')
      style.id = ID_STYLE
      document.head.appendChild(style)
    }
    const diff = differences(reglages, base)
    style.textContent = diff.length ? `.bj-charte.bj-charte.bj-charte{${diff.join('')}}` : ''
    try {
      window.localStorage.setItem(CLE_REGLAGES, JSON.stringify(reglages))
    } catch {}
  }, [reglages, base])

  // La fenêtre « largeur mobile » suit les réglages faits dans la grande.
  useEffect(() => {
    const surStockage = (e: StorageEvent) => {
      if (e.key !== CLE_REGLAGES || !e.newValue || !base) return
      try {
        const r = JSON.parse(e.newValue) as Reglages
        setReglages(r)
      } catch {}
    }
    window.addEventListener('storage', surStockage)
    return () => window.removeEventListener('storage', surStockage)
  }, [base])

  const recompter = useCallback(() => {
    window.clearTimeout(minuteur.current)
    // Le temps que la police se charge et que la page se remette en page.
    minuteur.current = window.setTimeout(() => {
      void document.fonts.ready.then(() => setAlertes(compterDebordements()))
    }, 250)
  }, [])

  useEffect(() => {
    recompter()
  }, [reglages, chemin, recompter])

  useEffect(() => {
    window.addEventListener('resize', recompter)
    return () => window.removeEventListener('resize', recompter)
  }, [recompter])

  const effacerRepere = () => {
    document.querySelectorAll('[data-charte-repere]').forEach((el) => el.removeAttribute('data-charte-repere'))
  }

  // Une navigation change la page : le repérage de l'ancienne ne vaut plus.
  useEffect(() => {
    effacerRepere()
  }, [chemin])

  if (!reglages || !base) {
    return (
      <div className="ctn ctn-corps">
        <style>{CSS}</style>
        Cette page n&apos;est pas dans la charte (admin ou Édition collective) : rien à régler ici.
      </div>
    )
  }

  const r = reglages[role]
  const bornes = ROLES.find((x) => x.id === role) ?? ROLES[0]
  const changer = (patch: Partial<Reglage>) => setReglages({ ...reglages, [role]: { ...r, ...patch } })

  const reperer = () => {
    effacerRepere()
    if (repere?.role === role) {
      setRepere(null)
      return
    }
    const els = elementsDuRole(role)
    els.forEach((el) => el.setAttribute('data-charte-repere', ''))
    setRepere({ role, nb: els.length })
  }

  const copier = async () => {
    const diff = differences(reglages, base)
    const date = new Date().toLocaleDateString('fr-FR')
    const bloc = diff.length
      ? `/* Réglages de la charte, panneau du ${date} (page ${chemin}) */\n.bj-charte {\n${diff.map((l) => `  ${l}`).join('\n')}\n}\n`
      : '/* Aucun réglage modifié : la charte est telle quelle. */\n'
    try {
      await navigator.clipboard.writeText(bloc)
      setCopie(diff.length ? `${diff.length} réglage(s) copié(s).` : 'Rien de modifié.')
    } catch {
      window.prompt('Copier ce bloc :', bloc)
    }
  }

  const reinitialiser = () => {
    try {
      window.localStorage.removeItem(CLE_REGLAGES)
    } catch {}
    setReglages(base)
    setCopie('')
  }

  const fermer = () => {
    effacerRepere()
    document.querySelectorAll('[data-charte-deborde]').forEach((el) => el.removeAttribute('data-charte-deborde'))
    document.getElementById(ID_STYLE)?.remove()
    try {
      window.localStorage.removeItem(CLE_OUVERT)
      window.localStorage.removeItem(CLE_REGLAGES)
    } catch {}
    const url = new URL(window.location.href)
    url.searchParams.delete('charte')
    url.searchParams.delete('charte-vue')
    window.history.replaceState(null, '', url)
    prevenir()
  }

  const largeurMobile = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('charte', '1')
    url.searchParams.set('charte-vue', 'mobile')
    window.open(url.toString(), 'bj-charte-mobile', 'width=390,height=844')
  }

  const plage = (
    valeur: number,
    min: number,
    max: number,
    pas: number,
    regler: (n: number) => void,
    unite: string,
  ) => (
    <span className="ctn-ligne">
      <input type="range" min={min} max={max} step={pas} value={valeur} onChange={(e) => regler(Number(e.target.value))} />
      <input
        type="number"
        min={min}
        max={max}
        step={pas}
        value={valeur}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) regler(n)
        }}
      />
      <span className="ctn-note">{unite}</span>
    </span>
  )

  const alerte = (
    <div className={`ctn-alerte${alertes ? ' ctn-rouge' : ''}`}>
      {alertes ? `${alertes} débordement(s) ou mot(s) coupé(s) sur cette page (entourés en rouge)` : 'Aucun débordement sur cette page'}
    </div>
  )

  return (
    <div className="ctn" role="dialog" aria-label="Réglage de la charte">
      <style>{CSS}</style>
      <div className="ctn-tete">
        <b>Charte {vueMobile ? '(mobile)' : ''}</b>
        <span className="ctn-boutons">
          <button type="button" onClick={() => setReplie(!replie)}>
            {replie ? 'Ouvrir' : 'Réduire'}
          </button>
        </span>
      </div>
      {replie ? (
        <div className="ctn-corps">{alerte}</div>
      ) : (
        <div className="ctn-corps">
          {alerte}
          <label>
            Type de texte
            <select
              value={role}
              onChange={(e) => {
                effacerRepere()
                setRepere(null)
                setRole(e.target.value as Role)
              }}
            >
              {ROLES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nom}
                </option>
              ))}
            </select>
          </label>
          <span className="ctn-boutons">
            <button type="button" aria-pressed={repere?.role === role} onClick={reperer}>
              Repérer
            </button>
            {repere?.role === role && (
              <span className="ctn-note">{repere.nb} élément(s) sur cette page</span>
            )}
          </span>
          <label>
            Police
            <select
              value={r.font}
              onChange={(e) => {
                const font = e.target.value as Police
                const graisses = GRAISSES[font]
                changer({ font, weight: graisses.includes(r.weight) ? r.weight : graisses[0] })
              }}
            >
              {POLICES[role].map((p) => (
                <option key={p} value={p} disabled={POLICE_INDISPONIBLE.includes(p)}>
                  {POLICE_INDISPONIBLE.includes(p) ? `${p} (licence en attente)` : p}
                </option>
              ))}
            </select>
          </label>
          <label>
            Taille ordinateur
            {plage(r.size, bornes.min, bornes.max, 1, (n) => changer({ size: n }), 'px')}
          </label>
          <label>
            Taille mobile
            {plage(r.sizeMobile, Math.max(role === 'body' ? 16 : 9, bornes.min - 12), bornes.max, 1, (n) => changer({ sizeMobile: n }), 'px')}
          </label>
          <label>
            Interligne
            {plage(r.line, 0.8, 2.2, 0.01, (n) => changer({ line: n }), '×')}
          </label>
          <label>
            Interlettrage
            {plage(r.track, -0.06, 0.3, 0.005, (n) => changer({ track: n }), 'em')}
          </label>
          <label>
            Graisse
            <select value={r.weight} onChange={(e) => changer({ weight: Number(e.target.value) })}>
              {GRAISSES[r.font].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          {AVEC_CASSE.includes(role) && (
            <label>
              Casse
              <select value={r.case} onChange={(e) => changer({ case: e.target.value as Reglage['case'] })}>
                <option value="none">Classique</option>
                <option value="uppercase">CAPITALES</option>
              </select>
            </label>
          )}
          <span className="ctn-boutons">
            {!vueMobile && (
              <button type="button" onClick={largeurMobile}>
                Largeur mobile
              </button>
            )}
            <button type="button" onClick={reinitialiser}>
              Réinitialiser
            </button>
            <button type="button" className="ctn-plein" onClick={copier}>
              Copier les réglages
            </button>
          </span>
          {copie && <span className="ctn-note">{copie}</span>}
          <span className="ctn-boutons">
            <button type="button" onClick={fermer}>
              Fermer le panneau
            </button>
          </span>
          <span className="ctn-note">
            Les réglages ne quittent pas ce navigateur. « Copier les réglages », puis les coller dans Claude Code.
          </span>
        </div>
      )}
    </div>
  )
}
