'use client'

/*
 * LES LUMIÈRES DU DÉPÔT : variation « lumière et verre » de la charte (F, validée le 27/11).
 *
 * Deux taches floues derrière l'écran, dont la couleur vient UNIQUEMENT des photos du client :
 * la teinte moyenne des dernières vignettes, rendue plus franche puis éclaircie. Sans photo,
 * rien n'est rendu (pas de lumière sans photo). Purement décoratif : aria-hidden, aucune
 * incidence sur le dépôt, et une vignette illisible (image distante sans CORS) est ignorée.
 */

import { useEffect, useState, type CSSProperties } from 'react'

const SATURATION = 2.2 // variation.lumiere-verre.lumiere-saturation
const ECLAT = 225

type Rgb = [number, number, number]

function moyenne(src: string): Promise<Rgb | null> {
  return new Promise((resolve) => {
    const im = new Image()
    im.decoding = 'async'
    im.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = 12
        c.height = 12
        const x = c.getContext('2d', { willReadFrequently: true })
        if (!x) return resolve(null)
        x.drawImage(im, 0, 0, 12, 12)
        const d = x.getImageData(0, 0, 12, 12).data
        let r = 0
        let g = 0
        let b = 0
        const n = d.length / 4
        for (let i = 0; i < d.length; i += 4) {
          r += d[i]
          g += d[i + 1]
          b += d[i + 2]
        }
        resolve([r / n, g / n, b / n])
      } catch {
        resolve(null) // toile « teintée » : image servie sans CORS
      }
    }
    im.onerror = () => resolve(null)
    im.src = src
  })
}

function teinte(rgb: Rgb): string {
  const moy = (rgb[0] + rgb[1] + rgb[2]) / 3
  const v = rgb.map((c) => moy + (c - moy) * SATURATION)
  const k = ECLAT / (Math.max(...v) || 1)
  const [r, g, b] = v.map((c) => Math.round(Math.max(60, Math.min(255, c * k))))
  return `rgb(${r} ${g} ${b})`
}

function melange(liste: Rgb[]): Rgb {
  return [0, 1, 2].map((i) => liste.reduce((a, c) => a + c[i], 0) / liste.length) as Rgb
}

export default function LumieresPhotos({ sources }: { sources: string[] }) {
  const [couleurs, setCouleurs] = useState<{ a: string; b: string } | null>(null)
  const cle = sources.join('|')

  useEffect(() => {
    if (!cle) return
    let vivant = true
    Promise.all(cle.split('|').map(moyenne)).then((res) => {
      const lues = res.filter((c): c is Rgb => c !== null)
      if (!vivant || lues.length === 0) return
      const recentes = lues.slice(-2)
      const anciennes = lues.length > 2 ? lues.slice(0, -2) : lues
      setCouleurs({ a: teinte(melange(recentes)), b: teinte(melange(anciennes)) })
    })
    return () => {
      vivant = false
    }
  }, [cle])

  if (!cle || !couleurs) return null
  return (
    <div
      className="at-lumieres"
      aria-hidden="true"
      style={{ '--lumiere-a': couleurs.a, '--lumiere-b': couleurs.b } as CSSProperties}
    />
  )
}
