'use client'

import { useState } from 'react'
import { MEDIA, visuelPour, jourParis, etatRotation, type Emplacement, type NomEmplacement } from '@/content/media'

const NOMS = Object.keys(MEDIA) as NomEmplacement[]

/* Midi à Paris le jour choisi : aucun risque de basculer de jour par le fuseau. */
function instantPour(jour: string): Date {
  return new Date(`${jour}T12:00:00+01:00`)
}

function Image({ fichier, alt, ratio }: { fichier: string; alt: string; ratio?: string }) {
  return (
    <span className="vi-cadre" style={ratio ? { aspectRatio: ratio } : undefined}>
      <img src={fichier} alt={alt} loading="lazy" />
    </span>
  )
}

export default function Apercu() {
  const [jour, setJour] = useState(() => jourParis(new Date()))

  return (
    <>
      <div className="vi-barre">
        <label className="m-champ vi-date">
          <span>Le site le</span>
          <input type="date" value={jour} onChange={(e) => e.target.value && setJour(e.target.value)} />
        </label>
        <button type="button" className="m-second" onClick={() => setJour(jourParis(new Date()))}>
          Aujourd’hui
        </button>
      </div>

      <ul className="vi-liste">
        {NOMS.map((nom) => {
          const e: Emplacement = MEDIA[nom]
          const enLigne = visuelPour(nom, instantPour(jour))
          return (
            <li key={nom} className="vi-emplacement">
              <div className="vi-tete">
                <code>{nom}</code>
                <span>{e.role}</span>
                {e.ratio && <span className="vi-meta">Ratio {e.ratio}</span>}
                {e.type === 'video' && <span className="vi-meta">Vidéo : poster, mp4, webm</span>}
              </div>
              <figure className="vi-jour">
                {enLigne ? <Image fichier={enLigne.fichier} alt={enLigne.alt} ratio={e.ratio} /> : <span className="vi-cadre vi-vide">Vide</span>}
                <figcaption>
                  <strong>En ligne ce jour</strong>
                  {enLigne && enLigne.fichier === e.defaut?.fichier && e.provisoire && <span className="vi-etat vi-etat--provisoire">Provisoire</span>}
                  <span className="vi-fichier">{enLigne ? enLigne.fichier : 'Rien'}</span>
                  {e.type === 'video' && enLigne && !enLigne.video && <span className="vi-meta">Aucune vidéo : poster seul</span>}
                </figcaption>
              </figure>
              {e.rotations.length > 0 ? (
                <ol className="vi-rotations">
                  {e.rotations.map((r, i) => {
                    const etat = etatRotation(e, i, jour)
                    return (
                      <li key={`${r.du}-${r.fichier ?? 'vide'}`}>
                        {r.vide ? <span className="vi-cadre vi-vide">Vide</span> : <Image fichier={r.fichier} alt={r.alt} ratio={e.ratio} />}
                        <span className={`vi-etat vi-etat--${etat.replace(/\s/g, '-').replace('à', 'a')}`}>{etat}</span>
                        <span className="vi-meta">Du {r.du} au {r.au}</span>
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <p className="vi-meta">Aucune rotation.</p>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
