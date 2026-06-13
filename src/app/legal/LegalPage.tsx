import type { ReactNode } from 'react'
import {
  LOCALES,
  LOCALE_LABEL,
  type Block,
  type Para,
  type LocalizedDoc,
} from './types'
import { pickLang, pickRef, resolveDoc, legalHref, backHref } from './resolve'
import './legal.css'

/* Composant partagé des pages légales (Server Component, zéro JS client).
   Chrome à la charte --bj-* : fond crème, titres Cormorant italic, corps DM Sans.
   - searchParams (Next 16, déjà awaité par la route) → langue + ref préservés.
   - Sélecteur de langue : FR rendu, EN/PT activés dès que la clé locale existe.
   - Lien retour : /preventes?ref=… si parrain présent, sinon accueil. */

type RawParams = { [key: string]: string | string[] | undefined }

interface LegalPageProps {
  slug: string
  doc: LocalizedDoc
  params: RawParams
}

export default function LegalPage({ slug, doc, params }: LegalPageProps) {
  const requested = pickLang(params)
  const ref = pickRef(params)
  const { doc: content, lang } = resolveDoc(doc, requested)

  return (
    <main className="lg" data-theme="light" data-section="legal">
      <div className="lg-inner">

        <header className="lg-head">
          <a href={backHref(ref)} className="lg-back">← Retour</a>

          <nav className="lg-langs" aria-label="Langue du document">
            {LOCALES.map((loc) => {
              const available = Boolean(doc[loc])
              const current = loc === lang
              if (!available) {
                return (
                  <span key={loc} className="lg-lang lg-lang--off" aria-disabled="true">
                    {LOCALE_LABEL[loc]}
                  </span>
                )
              }
              return (
                <a
                  key={loc}
                  href={legalHref(slug, loc, ref)}
                  className={`lg-lang${current ? ' lg-lang--current' : ''}`}
                  aria-current={current ? 'true' : undefined}
                >
                  {LOCALE_LABEL[loc]}
                </a>
              )
            })}
          </nav>
        </header>

        <h1 className="lg-title">{content.title}</h1>
        <p className="lg-version">{content.lastUpdated}</p>

        {content.intro && content.intro.length > 0 && (
          <div className="lg-intro">
            {content.intro.map((p, i) => (
              <p key={i}>{renderPara(p)}</p>
            ))}
          </div>
        )}

        {content.sections.map((section, si) => (
          <section key={si} id={section.id} className="lg-section">
            <h2 className="lg-h2">{section.heading}</h2>
            {section.blocks.map((block, bi) => (
              <Block key={bi} block={block} />
            ))}
          </section>
        ))}

        <p className="lg-copy">© 2026 Bellajour. Vivez. Nous composons.</p>

      </div>
    </main>
  )
}

/* Rend un paragraphe : chaîne simple, ou suite de segments avec liens internes. */
function renderPara(p: Para): ReactNode {
  if (typeof p === 'string') return p
  return p.map((seg, i) =>
    typeof seg === 'string' ? (
      <span key={i}>{seg}</span>
    ) : (
      <a key={i} href={seg.href} className="lg-anchor-link">{seg.text}</a>
    ),
  )
}

function Block({ block }: { block: Block }) {
  switch (block.kind) {
    case 'p':
      return <p className="lg-p">{renderPara(block.value)}</p>
    case 'h3':
      return <h3 className="lg-h3">{block.text}</h3>
    case 'list':
      return (
        <ul className="lg-list">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div className="lg-table-wrap">
          <table className="lg-table">
            <thead>
              <tr>
                {block.columns.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}
