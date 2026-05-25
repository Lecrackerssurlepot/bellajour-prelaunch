import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

export const alt = "Bellajour — Maison d'édition du souvenir"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadGoogleFont(family: string, weight = 400, italic = false): Promise<ArrayBuffer> {
  const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:${axis}&display=swap`
  const css = await (await fetch(cssUrl)).text()
  const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)
  if (!match) throw new Error(`Font file not found for ${family}`)
  const fontRes = await fetch(match[1])
  if (!fontRes.ok) throw new Error(`Failed to fetch ${family}`)
  return fontRes.arrayBuffer()
}

async function webpToPngDataUrl(publicPath: string, targetWidth: number): Promise<string> {
  const buf = await readFile(join(process.cwd(), 'public', publicPath))
  const png = await sharp(buf, { limitInputPixels: false })
    .resize({ width: targetWidth })
    .png()
    .toBuffer()
  return `data:image/png;base64,${png.toString('base64')}`
}

export default async function OpengraphImage() {
  const [playfairBold, cormorantItalic, signatureSrc, calanqueSrc] = await Promise.all([
    loadGoogleFont('Playfair Display', 700, false),
    loadGoogleFont('Cormorant', 400, true),
    webpToPngDataUrl('images/ui/logo.webp', 520),
    webpToPngDataUrl('images/header-bellajour.webp', 426),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#EAE3D8',
          display: 'flex',
          position: 'relative',
        }}
      >
        {/* ligne verticale centrale — réplique de .hero-line */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: 'rgba(23, 20, 15, 0.20)',
          }}
        />

        {/* stack central */}
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: '32px 0',
          }}
        >
          {/* signature cursive bleue */}
          <img
            src={signatureSrc}
            width={200}
            height={142}
            style={{ objectFit: 'contain' }}
            alt=""
          />

          {/* illustration calanque verticale, bords déchirés intégrés au PNG */}
          <img
            src={calanqueSrc}
            width={187}
            height={280}
            style={{ objectFit: 'contain' }}
            alt=""
          />

          {/* titre en deux temps, sous l'illustration, distinct pour la lisibilité */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              marginTop: 2,
            }}
          >
            <div
              style={{
                fontFamily: 'Playfair Display',
                fontWeight: 700,
                fontSize: 40,
                lineHeight: 1.1,
                color: '#1C1C1C',
              }}
            >
              Nous composons vos photos
            </div>
            <div
              style={{
                fontFamily: 'Cormorant',
                fontStyle: 'italic',
                fontSize: 46,
                lineHeight: 1.1,
                color: '#1C1C1C',
              }}
            >
              en albums d&rsquo;exception
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Playfair Display', data: playfairBold, weight: 700, style: 'normal' },
        { name: 'Cormorant', data: cormorantItalic, weight: 400, style: 'italic' },
      ],
    },
  )
}
