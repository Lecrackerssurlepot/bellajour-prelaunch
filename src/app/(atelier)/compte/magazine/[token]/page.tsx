import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { makeSupabase } from '@/lib/supabase'
import { compteOuvert, utilisateurConnecte } from '@/lib/compte/session'
import { lireDossiersDuCompte } from '@/lib/compte/donnees'
import { resoudreApercu } from '@/lib/atelier/apercu'
import { isValidNumeroToken } from '@/lib/atelier/tokenForme'
import { FORMAT_FINI_MM } from '@/lib/atelier/impression'
import { eurosDuDossier, formaterCentimes, type PalierCle } from '@/lib/atelier/prix'
import { CHEMIN_RECOMMANDER, peutRecommander } from '@/lib/atelier/reimpression'
import Apercu from '@/app/numero/[token]/Apercu'
import '@/app/numero/numero.css'
import '../../compte.css'

/**
 * /compte/magazine/<token> — un numéro livré, dans l'ordre voulu par
 * Mathias (04/09) : on le REGARDE d'abord, on lit ses informations
 * ensuite, on le télécharge en bas. La page de suivi (/numero) raconte la
 * fabrication ; celle-ci ne parle que de l'objet fini.
 *
 * ⚠️ SÉCURITÉ : le token ne suffit PAS ici. La page passe par
 * `lireDossiersDuCompte`, donc elle ne montre qu'un dossier que CE compte a
 * le droit de voir — un token collé d'ailleurs rend 404. C'est voulu :
 * /numero/<token> reste la porte publique du lien, /compte celle du compte.
 */

export const dynamic = 'force-dynamic'

export default async function MagazinePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  /* L'espace n'est pas encore ouvert au public (compteOuvert) : cette
     page n'existe pas. */
  if (!compteOuvert()) notFound()

  const { token } = await params
  if (!isValidNumeroToken(token)) notFound()

  const qui = await utilisateurConnecte()
  if (!qui) redirect(`/compte/connexion?suite=${encodeURIComponent(`/compte/magazine/${token}`)}`)

  const dossiers = await lireDossiersDuCompte(makeSupabase(), qui)
  const dossier = dossiers.find((d) => d.token === token)
  if (!dossier || dossier.etat !== 'livree') notFound()

  const apercu = await resoudreApercu(dossier.apercu_urls)
  const titre = dossier.titre?.trim() || 'Votre numéro'

  /* `plats.length` compte aussi : `plat` n'est que la PREMIÈRE planche, gardée
     par rétrocompatibilité. Sans lui, un dossier dont l'atelier n'aurait rangé
     que des planches secondaires se serait annoncé « visuels plus en ligne »
     alors que les images étaient là. */
  const aDesVisuels = Boolean(
    apercu.plat || apercu.plats.length || apercu.c1 || apercu.c4 || apercu.doubles.length,
  )

  /* Le prix gelé du dossier d'abord (20260910) : la bibliothèque affiche ce
     qui a été payé, pas ce que la grille dirait aujourd'hui. */
  const euros = eurosDuDossier({
    prix_centimes: dossier.prix_centimes,
    nb_pages: dossier.nb_pages,
    palier: dossier.palier as PalierCle | null,
  })

  /* RECOMMANDER CE NUMÉRO (T-105, 08/09/2026).
     Le verdict vient d'un module pur, le MÊME que celui dont se servira la
     route de paiement : impossible d'afficher un bouton qu'elle refuserait.
     Aujourd'hui il rend toujours `possible: false` — Mathias n'a pas tranché
     le prix d'une réimpression, et le verrou est dans prix.ts. Le bouton
     ci-dessous n'est donc jamais rendu, et la route qu'il vise n'existe pas
     encore : les deux se lèveront ensemble, jamais l'un sans l'autre. */
  const recommander = peutRecommander({
    etat: dossier.etat,
    /* La PAGINATION, plus le palier (10/09/2026) : c'est elle qui dit ce que
       l'objet coûte depuis la grille par pages. */
    nb_pages: dossier.nb_pages,
  })
  const livreLe = dossier.etat_maj_le
    ? new Date(dossier.etat_maj_le).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="bj-atelier cpt cpt--mag">
      <header className="cpt-top">
        {/* Lot 1 (07/09) — le lien promet la bibliothèque : l'URL porte
            l'onglet, sinon /compte rouvrait « Mes numéros » dès qu'un
            numéro était en cours. */}
        <Link className="cpt-retour" href="/compte?onglet=bibliotheque">
          <span aria-hidden="true">←</span> Ma bibliothèque
        </Link>
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
        <span className="cpt-top-vide" />
      </header>

      <main className="cpt-mag">
        <h1 className="cpt-titre cpt-mag-titre">{titre}</h1>
        <p className="cpt-sous-titre">
          {livreLe ? `Livré le ${livreLe}` : 'Livré'}
          {dossier.nb_pages ? ` · ${dossier.nb_pages} pages` : ''}
        </p>

        {/* 1 — LE MAGAZINE. C'est ce qu'on vient voir : il passe avant tout.
            ⚠️ C'est LE MÊME composant que la page de suivi (`Apercu`), et
            c'est voulu : il porte le support magazine validé le 04/09 (objet
            fermé pour les couvertures, ouvert avec pli pour les doubles), les
            flèches, le glissé au doigt, la loupe, et surtout une scène à
            HAUTEUR FIXE — une A4 et une double page ne font plus sauter la
            page. Deux visionneuses auraient divergé au premier réglage.

            Elle reçoit les MÊMES champs que /numero, et il faut que ça le
            reste. Jusqu'au 08/09 cette page n'en passait que quatre : la
            bibliothèque montrait donc les visuels au cadrage par défaut, en
            ignorant en silence les réglages de l'atelier, et n'affichait
            qu'une seule couverture là où la cliente en avait vu plusieurs.
            Aucun `token` ici, volontairement : sur un magazine LIVRÉ il n'y a
            plus de couverture à choisir, seulement à revoir. */}
        {aDesVisuels ? (
          <Apercu
            plat={apercu.plat}
            plats={apercu.plats}
            c1={apercu.c1}
            c4={apercu.c4}
            doubles={apercu.doubles}
            doublesCadrage={apercu.doublesCadrage}
            platsCadrageDroite={apercu.platsCadrageDroite}
            platsCadrageGauche={apercu.platsCadrageGauche}
          />
        ) : (
          <p className="cpt-mag-sans-visuel">
            Les visuels de ce numéro ne sont plus en ligne. Votre PDF, lui, reste disponible
            en bas de cette page.
          </p>
        )}

        {/* 2 — CE QU'IL EST. Les informations du produit, sobrement. */}
        <section className="cpt-mag-infos">
          <h2 className="cpt-section-titre">Ce numéro</h2>
          <dl className="cpt-fiche">
            {dossier.nb_pages ? (
              <>
                <dt>Pages</dt>
                <dd>{dossier.nb_pages}</dd>
              </>
            ) : null}
            <dt>Format</dt>
            <dd>
              {FORMAT_FINI_MM.largeur} × {FORMAT_FINI_MM.hauteur} mm
            </dd>
            <dt>Impression</dt>
            <dd>Papier intérieur et couverture, façonnage compris</dd>
            {euros ? (
              <>
                {/* ⚠️ ON N'ÉCRIT PLUS « PAYÉ » (lot 6, 10/09/2026). La
                    livraison sort du prix, et le montant RÉELLEMENT encaissé
                    n'est en colonne nulle part : un fondateur a payé 7 € pour
                    un numéro à 37 €, port offert. Dire « Payé 37 € » à celui-là
                    serait un mensonge sur sa propre facture. On énonce donc ce
                    que VALENT les deux lignes, comme un bon de commande, et le
                    montant encaissé reste dans le journal du dossier. */}
                <dt>Numéro</dt>
                <dd>{euros} €</dd>
              </>
            ) : null}
            {typeof dossier.livraison_centimes === 'number' ? (
              <>
                <dt>Livraison</dt>
                <dd>{formaterCentimes(dossier.livraison_centimes)}</dd>
              </>
            ) : null}
            {livreLe ? (
              <>
                <dt>Livré</dt>
                <dd>{livreLe}</dd>
              </>
            ) : null}
          </dl>
        </section>

        {/* 3 — L'EMPORTER. En bas, comme demandé : c'est le dernier geste. */}
        <section className="cpt-mag-pdf">
          {dossier.souvenir_pdf_key ? (
            <>
              <p className="cpt-mag-pdf-mot">Votre magazine, en version numérique.</p>
              {/* Les deux gestes SUR LA MÊME LIGNE — « à côté du bouton
                  télécharger le PDF », mot pour mot la demande de Mathias.
                  Empilés, la note du téléchargement passait entre les deux et
                  « recommander » avait l'air de commenter le PDF. */}
              <div className="cpt-mag-gestes">
                <a className="at-cta cpt-cta" href={`/api/atelier/souvenir?token=${dossier.token}`}>
                  Télécharger le PDF
                </a>
                {/* ── LE MÊME NUMÉRO, UNE FOIS DE PLUS (T-105) ──
                    Secondaire : télécharger est le geste courant d'une page de
                    bibliothèque, recommander est le geste rare. Le prix est
                    écrit SUR le bouton — on ne fait jamais cliquer vers un
                    paiement sans dire combien — et il vient du module, jamais
                    d'un calcul refait ici. */}
                {recommander.possible ? (
                  <a
                    className="cpt-recommander"
                    href={`${CHEMIN_RECOMMANDER}?token=${dossier.token}`}
                  >
                    <span aria-hidden="true">↻</span>
                    Recommander ce numéro · {Math.round(recommander.centimes / 100)}&nbsp;€
                  </a>
                ) : null}
              </div>
              <p className="cpt-mag-pdf-sub">
                Le fichier est celui de l’impression : gardez-le au chaud, il est lourd.
              </p>
            </>
          ) : (
            <p className="cpt-mag-pdf-sub">
              La version numérique de ce numéro n’est pas encore prête.
            </p>
          )}
          {/* `?de=magazine` : la page de suivi a besoin de savoir d'où l'on
              vient pour que SA flèche revienne ICI, et pas à la racine de
              l'espace (09/09). Même patron que `?onglet=bibliotheque`
              ci-dessus — la provenance passe par l'URL, jamais par
              l'historique du navigateur. */}
          <Link className="cpt-lien" href={`/numero/${dossier.token}?de=magazine`}>
            Revoir la page de suivi
          </Link>
        </section>
      </main>
    </div>
  )
}
