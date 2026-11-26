import type { ReactNode } from 'react'
import { type Block, type Para, type Locale, type LocalizedDoc } from './types'
import { resolveDoc } from './resolve'
import SelecteurLangue from './SelecteurLangue'
import SommaireVivant from './SommaireVivant'
import Nav from '../(atelier)/components/Nav'
import Footer from '../(atelier)/components/Footer'
import Bandeau from '../(atelier)/noel/Bandeau'
import { COMPOSER_HREF, CTA_LABEL } from '../(atelier)/content'
import { compteOuvert } from '@/lib/compte/session'
import { lireInterrupteur } from '@/lib/collectif/interrupteur'
import { noelAuSite } from '@/lib/atelier/carteCadeau'
import '../(atelier)/theme.css'
import '../(atelier)/magazine/magazine.css'
import './legal.css'

/* Composant partagé des pages légales (Server Component).
   Habit du duplicata « Essai photos » (14BmVZ, 26/11/2026) : la barre, le
   bandeau et le pied du site ; pastilles de langue, étiquette, titre, ligne de
   version ; sommaire collant de 240 px à gauche, texte de 72 ch à droite.
   Le TEXTE légal ne change pas : seuls l'habillage et la navigation autour.
   Habit précédent (25/11) : archive/legal-habit-25-11/. Le lien retour et le
   fil d'Ariane sont partis avec lui : la barre du site ramène partout.
   - Sélecteur de langue : FR rendu, EN/PT activés dès que la clé locale existe.

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

/* Les mots de la navigation autour du texte (pas du texte légal). */
const MOTS: Record<Locale, { sommaire: string }> = {
  fr: { sommaire: 'Sommaire' },
  en: { sommaire: 'Contents' },
  pt: { sommaire: 'Índice' },
}

/* L'entrée courte du sommaire : le titre avant son tiret (« Article 3 »),
   comme le duplicata. Le titre complet reste dans le texte. */
const court = (titre: string) => titre.split(/\s[—–]\s/)[0]

/* La ligne de version, en étiquette : « Version 4.1 · En vigueur le … ». */
const version = (ligne: string) => ligne.replace(/\s[—–]\s/g, ' · ')

/* L'ancre d'une section : son id déclaré, sinon son rang (pour le sommaire). */
const ancre = (id: string | undefined, i: number) => id ?? `section-${i + 1}`

interface LegalPageProps {
  slug: string
  doc: LocalizedDoc
  /* T-083 — imposé par les routes par langue (`/en/cgv`, `/pt/cgv`) : la
     langue vient de l'ADRESSE. Absent sur `/cgv`, qui est le français. */
  forceLang?: Locale
}

export default function LegalPage({ slug, doc, forceLang }: LegalPageProps) {
  const { doc: content, lang } = resolveDoc(doc, forceLang ?? 'fr')

  /* Le bandeau de Noël, comme sur toutes les pages hors tunnel (fiche H). */
  const noel = lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert && noelAuSite(new Date())

  return (
    /* `.bj-atelier` : la barre et le pied du site vivent dans ce scope (ces
       pages sont hors du groupe (atelier), voir son layout). */
    <div className="bj-atelier">
      {noel && <Bandeau />}
      <Nav href={COMPOSER_HREF} label={CTA_LABEL} retour="/" compteOuvert={compteOuvert()} />
      {/* `lang` = la langue SERVIE (T-057) : le layout racine fixe lang="fr" en
          dur, et `/cgv?lang=pt` servait le texte opposable en portugais dans un
          document déclaré français — lu par une voix de synthèse française au
          lecteur d'écran. On pose la langue résolue par resolveDoc (jamais la
          demandée : une locale absente retombe sur fr, l'attribut doit suivre). */}
      <main className="m-banc lg" lang={lang} data-section="legal">
        <section className="pg-tete">
          <div className="cadre">
            <SelecteurLangue slug={slug} doc={doc} lang={lang} />
            <span className="lab sub">Bellajour</span>
            <h1 className="titre">{content.title}</h1>
            <p className="lg-version">{version(content.lastUpdated)}</p>
          </div>
        </section>

        <section className="lg-corps">
          <div className="cadre">
            {content.sections.length > 1 ? (
              <SommaireVivant label={MOTS[lang].sommaire}>
                {content.sections.map((s, i) => (
                  <a key={ancre(s.id, i)} href={`#${ancre(s.id, i)}`}>{court(s.heading)}</a>
                ))}
              </SommaireVivant>
            ) : <span aria-hidden="true" />}

            <div className="lg-texte">
              {content.intro && content.intro.length > 0 && (
                <div className="lg-intro">
                  {content.intro.map((p, i) => (
                    <p key={i}>{renderPara(p)}</p>
                  ))}
                </div>
              )}

              {content.sections.map((section, si) => (
                <section key={si} id={ancre(section.id, si)} className="lg-section">
                  <h2 className="lg-h2 titre">{section.heading}</h2>
                  {section.blocks.map((block, bi) => (
                    <Block key={bi} block={block} />
                  ))}
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
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
        <div className="lg-table-wrap" tabIndex={0} role="region" aria-label="Tableau, défilable">
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
