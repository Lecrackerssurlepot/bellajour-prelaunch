import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { makeSupabase } from '@/lib/supabase'
import { utilisateurConnecte } from '@/lib/compte/session'
import { lireDossiersDuCompte } from '@/lib/compte/donnees'
import { resoudreApercu } from '@/lib/atelier/apercu'
import { isValidNumeroToken } from '@/lib/atelier/tokenForme'
import { FORMAT_FINI_MM } from '@/lib/atelier/impression'
import { eurosPour, type PalierCle } from '@/lib/atelier/prix'
import Visionneuse, { type Planche } from './Visionneuse'
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
  const { token } = await params
  if (!isValidNumeroToken(token)) notFound()

  const qui = await utilisateurConnecte()
  if (!qui) redirect(`/compte/connexion?suite=${encodeURIComponent(`/compte/magazine/${token}`)}`)

  const dossiers = await lireDossiersDuCompte(makeSupabase(), qui)
  const dossier = dossiers.find((d) => d.token === token)
  if (!dossier || dossier.etat !== 'livree') notFound()

  const apercu = await resoudreApercu(dossier.apercu_urls)
  const titre = dossier.titre?.trim() || 'Votre numéro'

  /* Les planches, dans l'ordre de lecture d'un magazine : la couverture,
     puis les doubles pages, puis la quatrième. Une planche absente est
     simplement absente — jamais un cadre vide. */
  const planches: Planche[] = [
    ...(apercu.plat
      ? [{ src: apercu.plat, nom: 'La couverture, à plat', large: true }]
      : apercu.c1
        ? [{ src: apercu.c1, nom: 'La couverture', large: false }]
        : []),
    ...apercu.doubles.map((src, i) => ({
      src,
      nom: `Double page ${i + 1}`,
      large: true,
    })),
    ...(apercu.c4 && !apercu.plat
      ? [{ src: apercu.c4, nom: 'La quatrième', large: false }]
      : []),
  ]

  const euros = eurosPour(dossier.palier as PalierCle | null)
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
        <a className="cpt-retour" href="/compte">
          <span aria-hidden="true">←</span> Ma bibliothèque
        </a>
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

        {/* 1 — LE MAGAZINE. C'est ce qu'on vient voir : il passe avant tout. */}
        {planches.length > 0 ? (
          <Visionneuse planches={planches} titre={titre} />
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
                <dt>Payé</dt>
                <dd>{euros} €, livraison comprise</dd>
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
              <a className="at-cta cpt-cta" href={`/api/atelier/souvenir?token=${dossier.token}`}>
                Télécharger le PDF
              </a>
              <p className="cpt-mag-pdf-sub">
                Le fichier est celui de l’impression : gardez-le au chaud, il est lourd.
              </p>
            </>
          ) : (
            <p className="cpt-mag-pdf-sub">
              La version numérique de ce numéro n’est pas encore prête.
            </p>
          )}
          <a className="cpt-lien" href={`/numero/${dossier.token}`}>
            Revoir la page de suivi
          </a>
        </section>
      </main>
    </div>
  )
}
