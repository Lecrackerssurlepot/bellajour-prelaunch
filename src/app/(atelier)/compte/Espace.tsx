'use client'

import Link from 'next/link'
import { useState } from 'react'
import { COMPOSER_HREF, CTA_LABEL, CTA_NOUVEAU_LABEL } from '../content'
import { PARAM_PROVENANCE } from '../composer/provenance'
import { JALONS } from './jalons'

/* ⚠️ TOUT LIEN D'ICI VERS /composer DIT D'OÙ IL VIENT (08/09/2026).
   Sans ce paramètre, la croix du questionnaire ramenait à la page produit :
   on sortait de son espace pour atterrir sur une fiche de vente. Voir
   composer/provenance.ts — c'est une CLÉ d'une liste fermée, jamais un
   chemin, et jamais une redirection ouverte. */
const DEPUIS_COMPTE = `${PARAM_PROVENANCE}=compte`
import BoutonDeconnexion from './BoutonDeconnexion'

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

function CarteDossier({ d }: { d: DossierVue }) {
  if (d.depotEnPlan) {
    return (
      <article className="cpt-carte cpt-carte--attente">
        <div className="cpt-carte-tete">
          <span className="cpt-carte-camp cpt-carte-camp--vous">À vous de jouer</span>
          <h3 className="cpt-carte-titre">{d.titre}</h3>
        </div>
        <p className="cpt-carte-etat">
          {d.nbPhotos > 0
            ? `${d.nbPhotos} photo${d.nbPhotos > 1 ? 's' : ''} déjà là — il reste un geste pour tout envoyer.`
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
          <Link
            className="at-cta cpt-cta"
            href={`/composer?reprendre=${d.token}&${DEPUIS_COMPTE}`}
          >
            Reprendre le dépôt
          </Link>
          <Link className="cpt-lien" href={`/numero/${d.token}`}>
            Voir la page du numéro
          </Link>
        </div>
      </article>
    )
  }
  return (
    <article className="cpt-carte">
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
        <Link className="at-cta cpt-cta" href={`/numero/${d.token}`}>
          {d.cta}
        </Link>
      </div>
    </article>
  )
}

/* La carte d'étagère : la COUVERTURE d'abord, en grand — c'est l'objet que
   la cliente reconnaît. Titre et année l'encadrent en haut, le geste est en
   bas. Toute la carte est cliquable et mène au magazine. */
function CarteLivre({ l }: { l: LivreVue }) {
  return (
    <Link className="cpt-livre" href={`/compte/magazine/${l.token}`}>
      <span className="cpt-livre-tete">
        <span className="cpt-livre-titre">{l.titre}</span>
        {l.annee ? <span className="cpt-livre-annee">{l.annee}</span> : null}
      </span>

      <span className="cpt-livre-cadre">
        {l.couverture ? (
          <img
            className={`cpt-livre-img${l.couvertureEstPlanche ? ' est-planche' : ''}`}
            src={l.couverture}
            alt={`Couverture de ${l.titre}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="cpt-livre-vide" aria-hidden="true">
            {l.titre}
          </span>
        )}
      </span>

      <span className="cpt-livre-pied">
        <span className="cpt-livre-meta">
          {l.nbPages ? `${l.nbPages} pages` : 'Livré'}
          {l.livreLe ? ` · ${l.livreLe}` : ''}
        </span>
        <span className="cpt-livre-geste">Ouvrir</span>
      </span>
    </Link>
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
          <img
            className="cpt-top-logo"
            src="/images/ui/signature-blanche.webp"
            alt=""
            width={320}
            height={122}
            decoding="async"
          />
        </Link>

        {/* Les deux onglets, au centre de la barre — le sommaire de l'espace. */}
        <nav className="cpt-onglets" aria-label="Mon espace">
          <button
            type="button"
            className={`cpt-onglet${onglet === 'numeros' ? ' est-actif' : ''}`}
            aria-current={onglet === 'numeros' ? 'page' : undefined}
            onClick={() => setOnglet('numeros')}
          >
            Mes numéros
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
          <BoutonDeconnexion />
        </div>
      </header>

      <main className="cpt-main">
        {onglet === 'numeros' ? (
          numeros.length === 0 ? (
            <section className="cpt-vide">
              <p className="cpt-vide-mot">
                Aucun numéro en cours. Le prochain moment n’attend que vous.
              </p>
              <Link className="at-cta cpt-cta" href={`${COMPOSER_HREF}?${DEPUIS_COMPTE}`}>
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
                  <h1 className="cpt-titre">Mes numéros</h1>
                  <p className="cpt-sous-titre">
                    {aTerminer.length > 0
                      ? `${aTerminer.length} attend${aTerminer.length > 1 ? 'ent' : ''} un geste de votre part.`
                      : 'Tout est entre nos mains. On vous écrit à chaque étape.'}
                  </p>
                </div>
                <Link className="cpt-nouveau" href={`${COMPOSER_HREF}?${DEPUIS_COMPTE}`}>
                  <span aria-hidden="true">+</span> {CTA_NOUVEAU_LABEL}
                </Link>
              </div>
              <div className="cpt-grille">
                {numeros.map((d) => (
                  <CarteDossier key={d.token} d={d} />
                ))}
              </div>
            </>
          )
        ) : livres.length === 0 ? (
          <section className="cpt-vide">
            <p className="cpt-vide-mot">
              Votre étagère est encore vide. Elle se remplira à la première livraison.
            </p>
            <Link className="at-cta cpt-cta" href={`${COMPOSER_HREF}?${DEPUIS_COMPTE}`}>
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
                  {livres.length > 1 ? 's' : ''} — à revoir et à télécharger quand vous voulez.
                </p>
              </div>
              <Link className="cpt-nouveau" href={`${COMPOSER_HREF}?${DEPUIS_COMPTE}`}>
                <span aria-hidden="true">+</span> {CTA_NOUVEAU_LABEL}
              </Link>
            </div>
            <div className="cpt-etagere">
              {livres.map((l) => (
                <CarteLivre key={l.token} l={l} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
