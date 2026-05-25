import { ImageResponse } from 'next/og'

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

export default async function OpengraphImage() {
  const [playfairBold, cormorantItalic, dmSans] = await Promise.all([
    loadGoogleFont('Playfair Display', 700, false),
    loadGoogleFont('Cormorant', 400, true),
    loadGoogleFont('DM Sans', 400, false),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#EAE3D8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '72px 96px',
          color: '#1C1C1C',
        }}
      >
        <div
          style={{
            fontFamily: 'DM Sans',
            fontSize: 18,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#A89880',
            alignSelf: 'flex-start',
          }}
        >
          Maison d'édition du souvenir
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 28,
          }}
        >
          <div
            style={{
              fontFamily: 'Playfair Display',
              fontWeight: 700,
              fontSize: 120,
              lineHeight: 1,
              color: '#1C1C1C',
            }}
          >
            Bellajour
          </div>
          <div
            style={{
              fontFamily: 'Cormorant',
              fontStyle: 'italic',
              fontSize: 56,
              lineHeight: 1.1,
              color: '#1C1C1C',
              maxWidth: 900,
            }}
          >
            Vos souvenirs méritent un album d'exception
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
            width: '100%',
          }}
        >
          <div style={{ width: 80, height: 1, backgroundColor: '#A89880' }} />
          <div
            style={{
              fontFamily: 'Cormorant',
              fontStyle: 'italic',
              fontSize: 32,
              color: '#1C1C1C',
            }}
          >
            Vivez. Nous composons.
          </div>
          <div
            style={{
              fontFamily: 'DM Sans',
              fontSize: 16,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: '#A89880',
              marginTop: 4,
            }}
          >
            bellajour.fr
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Playfair Display', data: playfairBold, weight: 700, style: 'normal' },
        { name: 'Cormorant', data: cormorantItalic, weight: 400, style: 'italic' },
        { name: 'DM Sans', data: dmSans, weight: 400, style: 'normal' },
      ],
    },
  )
}
