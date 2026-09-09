import type { ReactNode } from 'react'
import { type Block, type Para, type Locale, type LocalizedDoc } from './types'
import { resolveDoc, backHref } from './resolve'
import RetourLien from './RetourLien'
import SelecteurLangue from './SelecteurLangue'
import { cormorantCremeClassName } from '../creme-fonts'
import './legal.css'

/* Composant partagé des pages légales (Server Component).
   Chrome à la charte SOMBRE de l'Atelier : fond quasi-noir, titres Cormorant
   italic, corps DM Sans, accent terracotta (voir legal.css).
   - Sélecteur de langue : FR rendu, EN/PT activés dès que la clé locale existe.
   - Lien retour : l'historique quand on vient du site, sinon l'accueil (T-070).

   ⚠️ PLUS AUCUN `searchParams` (09/09/2026, audit de vitesse). Les douze routes
   légales étaient rendues à CHAQUE visite — 212 ms contre 77 pour une page
   figée — parce qu'elles lisaient l'URL pour deux choses :
   · `?lang=en|pt`, l'ancienne adresse d'avant T-083 : la redirection vit
     maintenant dans `next.config.ts`, tranchée avant tout rendu ;
   · `?ref=`, le code parrain à préserver d'une langue à l'autre : c'est
     `SelecteurLangue` (client) qui s'en charge.
   Les quatre documents ne changent que quand on les réécrit : rien ici ne
   justifie une fonction serveur. Ne pas réintroduire de `searchParams` sans
   savoir qu'on rend les douze pages dynamiques du même geste. */

interface LegalPageProps {
  slug: string
  doc: LocalizedDoc
  /* T-083 — imposé par les routes par langue (`/en/cgv`, `/pt/cgv`) : la
     langue vient de l'ADRESSE. Absent sur `/cgv`, qui est le français. */
  forceLang?: Locale
}

export default function LegalPage({ slug, doc, forceLang }: LegalPageProps) {
  const { doc: content, lang } = resolveDoc(doc, forceLang ?? 'fr')

  return (
    /* `lang` = la langue SERVIE (T-057) : le layout racine fixe lang="fr" en
       dur, et `/cgv?lang=pt` servait le texte opposable en portugais dans un
       document déclaré français — lu par une voix de synthèse française au
       lecteur d'écran. On pose la langue résolue par resolveDoc (jamais la
       demandée : une locale absente retombe sur fr, l'attribut doit suivre). */
    <main className={`lg ${cormorantCremeClassName}`} lang={lang} data-theme="dark" data-section="legal">
      <div className="lg-inner">

        <header className="lg-head">
          {/* Lot 1 (07/09) — revient d'où l'on vient quand la page
              précédente est une page du site ; sinon le repli backHref(). */}
          <RetourLien repli={backHref()} />

          <SelecteurLangue slug={slug} doc={doc} lang={lang} />
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
