'use client'

import Link from 'next/link'
import { useState } from 'react'
import { COMPOSER_HREF, CTA_LABEL, CTA_NOUVEAU_LABEL } from '../content'
import { PARAM_PROVENANCE } from '../composer/provenance'
import { PARAM_NOUVEAU } from '../composer/draft'
import { JALONS } from './jalons'

/* ⚠️ TOUT LIEN D'ICI VERS /composer DIT D'OÙ IL VIENT (08/09/2026).
   Sans ce paramètre, la croix du questionnaire ramenait à la page produit :
   on sortait de son espace pour atterrir sur une fiche de vente. Voir
   composer/provenance.ts — c'est une CLÉ d'une liste fermée, jamais un
   chemin, et jamais une redirection ouverte. */
const DEPUIS_COMPTE = `${PARAM_PROVENANCE}=compte`
/* T-156 (17/10/2026) — les liens « composer » d'ici COMMENCENT un numéro :
   le dépôt en cours a son propre lien, « Reprendre le dépôt » (?reprendre=).
   Sans `nouveau=1`, /composer rouvrait le brouillon du navigateur, et le
   17/10 c'était le dossier d'une autre cliente, à l'écran 5. Un brouillon
   sans dossier (réponses sur l'appareil seulement) est gardé : voir
   `brouillonDuDepart` (composer/draft.ts). */
const NOUVEAU_DEPUIS_COMPTE = `${PARAM_NOUVEAU}=1&${DEPUIS_COMPTE}`
import BoutonDeconnexion from './BoutonDeconnexion'
import Etagere, { LienNumero } from './Etagere'
import './bibliotheque.css'

/**
 * L'espace en deux onglets (Mathias, 04/09) : « Mes numéros » et
 * « Ma bibliothèque ». Composant client pour la seule bascule d'onglet —
 * tout le contenu est calculé et signé côté serveur (page.tsx), rien n'est
 * refetché au clic.
 *
 * L'onglet d'ouverture est celui qui a quelque chose à dire : s'il n'y a
 * rien en cours et que la bibliothèque est pleine, on ouvre l'étagère.
 */

export type DossierVue = {
  token: string
  titre: string
  libelleEtat: string
  camp: string
  avancement: number
  cta: string
  transporteur: string | null
  depotEnPlan: boolean
  nbPhotos: number
}

export type LivreVue = {
  token: string
  titre: string
  annee: string
  livreLe: string | null
  couverture: string | null
  /** La couverture est la planche entière : on la cadre sur sa moitié droite. */
  couvertureEstPlanche: boolean
  nbPages: number | null
}

type Onglet = 'numeros' | 'bibliotheque'

function Jauge({ avancement }: { avancement: number }) {
  return (
    <div className="cpt-jauge" aria-hidden="true">
      {JALONS.map((jalon, i) => (
        <i key={jalon} className={i < avancement ? 'is-fait' : ''} />
      ))}
    </div>
  )
}

/* L'épreuve : un numéro qui n'existe pas encore en papier. Pas de photo, pas
   d'épaisseur : une feuille au format du magazine, en pointillés, avec son
   titre composé. C'est ce qui le distingue d'un coup d'œil d'un numéro de la
   bibliothèque (charte, fiche H « Bibliothèque »). */
function Epreuve({ d }: { d: DossierVue }) {
  return (
    <span className="bib-epreuve" aria-hidden="true">
      <span className="bib-epreuve-titre">{d.titre}</span>
      <span className="bib-epreuve-etape">
        {JALONS[Math.min(d.avancement, JALONS.length - 1)]}
      </span>
    </span>
  )
}

function CarteDossier({ d, demo }: { d: DossierVue; demo: boolean }) {
  if (d.depotEnPlan) {
    return (
      <article className="cpt-carte cpt-carte--attente">
        <Epreuve d={d} />
        <div className="cpt-carte-tete">
          <span className="cpt-carte-camp cpt-carte-camp--vous">À vous de jouer</span>
          <h3 className="cpt-carte-titre">{d.titre}</h3>
        </div>
        <p className="cpt-carte-etat">
          {d.nbPhotos > 0
            ? `${d.nbPhotos} photo${d.nbPhotos > 1 ? 's' : ''} déjà là. Il reste un geste pour tout envoyer.`
            : 'Vos photos ne sont pas encore arrivées.'}
        </p>
        <div className="cpt-carte-gestes">
          {/* ⚠️ `Link` ET PAS `<a>`, et ce n'est pas une préférence de style.
              Une ancre nue recharge le document entier : on repaie le bundle,
              l'hydratation et le CSS à chaque clic, en plus du travail serveur
              de la page d'arrivée. Avec `Link`, Next demande la page AVANT le
              clic (au survol, ou dès que le lien entre dans l'écran) et la
              transition se fait côté client. C'est le geste que Mathias
              désigne — « je clique sur reprendre le dépôt, ça prend du temps ».
              Le `loading.tsx` d'à côté couvre le reste : ce que le préchargement
              met en réserve sur une route dynamique, c'est justement lui. */}
          <LienNumero
            demo={demo}
            className="m-btn cpt-cta"
            href={`/composer?reprendre=${d.token}&${DEPUIS_COMPTE}`}
          >
            Reprendre le dépôt
          </LienNumero>
          <LienNumero demo={demo} className="cpt-lien" href={`/numero/${d.token}`}>
            Voir la page du numéro
          </LienNumero>
        </div>
      </article>
    )
  }
  return (
    <article className="cpt-carte">
      <Epreuve d={d} />
      <div className="cpt-carte-tete">
        {d.camp ? <span className="cpt-carte-camp">{d.camp}</span> : null}
        <h3 className="cpt-carte-titre">{d.titre}</h3>
      </div>
      <p className="cpt-carte-etat">
        {d.libelleEtat}
        {d.transporteur ? ` · ${d.transporteur}` : ''}
      </p>
      <Jauge avancement={d.avancement} />
      <p className="cpt-carte-jalons" aria-hidden="true">
        {JALONS[Math.min(d.avancement, JALONS.length - 1)]} ·{' '}
        {Math.min(d.avancement + 1, JALONS.length)} / {JALONS.length}
      </p>
      <div className="cpt-carte-gestes">
        <LienNumero demo={demo} className="m-btn cpt-cta" href={`/numero/${d.token}`}>
          {d.cta}
        </LienNumero>
      </div>
    </article>
  )
}

export default function Espace({
  email,
  photo,
  initiale,
  aTerminer,
  enCours,
  livres,
  ongletInitial = null,
  credit = null,
  demo = false,
}: {
  email: string
  photo: string | null
  initiale: string
  aTerminer: DossierVue[]
  enCours: DossierVue[]
  livres: LivreVue[]
  /* Lot 1 (07/09) — l'onglet demandé par l'URL (?onglet=), lu par la page
     serveur. Un lien « ← Ma bibliothèque » qui rouvrait « Mes numéros »
     était un retour qui mentait. Null : l'heuristique décide. */
  ongletInitial?: Onglet | null
  /* Noël 2026 : le crédit du compte (reste d'une carte cadeau), déjà formaté. */
  credit?: { montant: string; jusquau: string | null } | null
  /* /brand/bibliotheque : la même page avec de faux numéros. Les liens vers
     les dossiers y sont inertes et la déconnexion n'y figure pas. */
  demo?: boolean
}) {
  const numeros = [...aTerminer, ...enCours]
  const [onglet, setOnglet] = useState<Onglet>(
    ongletInitial ??
      (numeros.length === 0 && livres.length > 0 ? 'bibliotheque' : 'numeros'),
  )

  return (
    <div className="bj-atelier cpt">
      <header className="cpt-top">
        <Link className="cpt-top-marque" href="/" aria-label="Bellajour, retour à l’accueil">
          {/* Le logo vectoriel à l'encre (fiche B) : l'ancienne signature en
              WebP était blanche, donc invisible sur le papier (audit du 26/11). */}
          <span className="cpt-top-logo m-logo" aria-hidden="true" />
        </Link>

        {/* Les deux onglets, au centre de la barre — le sommaire de l'espace. */}
        <nav className="cpt-onglets" aria-label="Mon espace">
          <button
            type="button"
            className={`cpt-onglet${onglet === 'numeros' ? ' est-actif' : ''}`}
            aria-current={onglet === 'numeros' ? 'page' : undefined}
            onClick={() => setOnglet('numeros')}
          >
            À l’atelier
            {numeros.length > 0 ? <i className="cpt-onglet-nb">{numeros.length}</i> : null}
          </button>
          <button
            type="button"
            className={`cpt-onglet${onglet === 'bibliotheque' ? ' est-actif' : ''}`}
            aria-current={onglet === 'bibliotheque' ? 'page' : undefined}
            onClick={() => setOnglet('bibliotheque')}
          >
            Ma bibliothèque
            {livres.length > 0 ? <i className="cpt-onglet-nb">{livres.length}</i> : null}
          </button>
        </nav>

        <div className="cpt-top-moi">
          <span className="cpt-avatar" title={email}>
            {photo ? (
              <img src={photo} alt="" width={32} height={32} />
            ) : (
              <span aria-hidden="true">{initiale}</span>
            )}
          </span>
          {demo ? null : <BoutonDeconnexion />}
        </div>
      </header>

      <main className="cpt-main">
        {credit ? (
          <section className="cpt-credit" aria-label="Votre crédit">
            <span className="cpt-credit-mot">Votre crédit</span>
            <span className="cpt-credit-montant">{credit.montant}</span>
            <span className="cpt-credit-note">
              Déduit au paiement{credit.jusquau ? ` · jusqu’au ${credit.jusquau}` : ''}
            </span>
          </section>
        ) : null}
        {onglet === 'numeros' ? (
          numeros.length === 0 ? (
            <section className="cpt-vide">
              <p className="cpt-vide-mot">
                Rien à l’atelier
              </p>
              <Link className="m-btn cpt-cta" href={`${COMPOSER_HREF}?${NOUVEAU_DEPUIS_COMPTE}`}>
                {CTA_LABEL}
              </Link>
            </section>
          ) : (
            <>
              {/* Le bouton « nouveau numéro » vit DANS la tête de l'onglet,
                  au-dessus de la liste (demande de Mathias, 08/09). Jusqu'ici
                  il n'existait que dans l'écran vide : une cliente qui avait
                  déjà un numéro n'avait plus aucun moyen d'en commencer un
                  autre depuis son espace — elle devait ressortir par le site.
                  C'est le seul endroit du site où le libellé dit « nouveau » :
                  voir CTA_NOUVEAU_LABEL. */}
              <div className="cpt-tete">
                <div>
                  <h1 className="cpt-titre">À l’atelier</h1>
                  <p className="cpt-sous-titre">
                    {aTerminer.length > 0
                      ? `${aTerminer.length} attend${aTerminer.length > 1 ? 'ent' : ''} votre geste`
                      : 'Entre nos mains'}
                  </p>
                </div>
                <Link className="cpt-nouveau" href={`${COMPOSER_HREF}?${NOUVEAU_DEPUIS_COMPTE}`}>
                  <span aria-hidden="true">+</span> {CTA_NOUVEAU_LABEL}
                </Link>
              </div>
              <div className="cpt-grille">
                {numeros.map((d) => (
                  <CarteDossier key={d.token} d={d} demo={demo} />
                ))}
              </div>
            </>
          )
        ) : livres.length === 0 ? (
          <section className="cpt-vide">
            <p className="cpt-vide-mot">
              Votre étagère attend son premier numéro
            </p>
            <Link className="m-btn cpt-cta" href={`${COMPOSER_HREF}?${NOUVEAU_DEPUIS_COMPTE}`}>
              {CTA_LABEL}
            </Link>
          </section>
        ) : (
          <>
            <div className="cpt-tete">
              <div>
                <h1 className="cpt-titre">Ma bibliothèque</h1>
                <p className="cpt-sous-titre">
                  {livres.length} numéro{livres.length > 1 ? 's' : ''} livré
                  {livres.length > 1 ? 's' : ''}
                </p>
              </div>
              <Link className="cpt-nouveau" href={`${COMPOSER_HREF}?${NOUVEAU_DEPUIS_COMPTE}`}>
                <span aria-hidden="true">+</span> {CTA_NOUVEAU_LABEL}
              </Link>
            </div>
            <Etagere livres={livres} demo={demo} />
          </>
        )}
      </main>
    </div>
  )
}
