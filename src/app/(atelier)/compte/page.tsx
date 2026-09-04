import Link from 'next/link'
import { redirect } from 'next/navigation'
import { makeSupabase } from '@/lib/supabase'
import { utilisateurConnecte } from '@/lib/compte/session'
import {
  epinglerDossiers,
  lireDossiersDuCompte,
  type DossierAffiche,
} from '@/lib/compte/donnees'
import { classerDossiers } from '@/lib/compte/rattachement'
import { LIBELLE_ETAT, type Etat } from '@/lib/atelier/transitions'
import { QUI_ATTEND } from '@/lib/atelier/urgence'
import { COMPOSER_HREF, CTA_LABEL } from '../content'
import { AVANCEMENT, JALONS } from './jalons'
import BoutonDeconnexion from './BoutonDeconnexion'
import './compte.css'

/**
 * /compte — « Mes numéros ». TROIS sections, dans cet ordre, jamais plus :
 * à terminer (la balle est chez la cliente), en cours à l'atelier, et la
 * bibliothèque des numéros livrés. Une section vide ne s'affiche pas.
 *
 * La page est un composant serveur : la session se lit ici, les données
 * passent par la service key filtrée (lireDossiersDuCompte), et le passage
 * épingle au compte les dossiers vus par email (best-effort). Aucune info
 * technique sur les cartes — pas de token, pas d'octets.
 */

export const dynamic = 'force-dynamic'

/* La phrase « à qui c'est le tour », déclinée pour un dashboard. */
const MOT_DU_CAMP: Record<string, string> = {
  atelier: 'Entre nos mains',
  cliente: 'Un geste vous attend',
  dehors: 'En route vers vous',
  fini: 'Livré',
}

function dateCourte(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* Le geste principal d'une carte « en cours » suit l'état — le libellé dit
   la marche exacte, jamais un « Voir plus ». */
function ctaEnCours(etat: Etat): string {
  if (etat === 'apercu_pret') return 'Voir ma couverture'
  if (etat === 'maquette_prete') return 'Voir ma maquette'
  if (etat === 'expediee') return 'Suivre mon colis'
  if (etat === 'photos_insuffisantes') return 'Ajouter des photos'
  return 'Suivre mon numéro'
}

function Jauge({ etat }: { etat: Etat }) {
  const avancement = AVANCEMENT[etat] ?? 0
  return (
    <div className="cpt-jauge" aria-hidden="true">
      {JALONS.map((jalon, i) => (
        <i key={jalon} className={i < avancement ? 'is-fait' : ''} />
      ))}
    </div>
  )
}

function CarteEnCours({ dossier }: { dossier: DossierAffiche }) {
  const camp = MOT_DU_CAMP[QUI_ATTEND[dossier.etat]] ?? ''
  return (
    <article className="cpt-carte">
      <div className="cpt-carte-tete">
        <h3 className="cpt-carte-titre">{dossier.titre || 'Votre numéro'}</h3>
        {camp ? <span className="cpt-carte-camp">{camp}</span> : null}
      </div>
      <p className="cpt-carte-etat">
        {LIBELLE_ETAT[dossier.etat]}
        {dossier.etat === 'expediee' && dossier.transporteur ? ` · ${dossier.transporteur}` : ''}
      </p>
      <Jauge etat={dossier.etat} />
      <p className="cpt-carte-jalons" aria-hidden="true">
        {JALONS[Math.min(AVANCEMENT[dossier.etat] ?? 0, JALONS.length - 1)]} ·{' '}
        {Math.min((AVANCEMENT[dossier.etat] ?? 0) + 1, JALONS.length)} / {JALONS.length}
      </p>
      <div className="cpt-carte-gestes">
        <a className="at-cta cpt-cta" href={`/numero/${dossier.token}`}>
          {ctaEnCours(dossier.etat)}
        </a>
      </div>
    </article>
  )
}

function CarteATerminer({ dossier }: { dossier: DossierAffiche }) {
  return (
    <article className="cpt-carte cpt-carte--attente">
      <div className="cpt-carte-tete">
        <h3 className="cpt-carte-titre">{dossier.titre || 'Votre numéro'}</h3>
        <span className="cpt-carte-camp cpt-carte-camp--vous">À vous de jouer</span>
      </div>
      <p className="cpt-carte-etat">
        {dossier.nb_photos > 0
          ? `${dossier.nb_photos} photo${dossier.nb_photos > 1 ? 's' : ''} déjà là — il reste un geste pour tout envoyer.`
          : 'Vos photos ne sont pas encore arrivées.'}
      </p>
      <div className="cpt-carte-gestes">
        <a className="at-cta cpt-cta" href={`/composer?reprendre=${dossier.token}`}>
          Reprendre le dépôt
        </a>
        <a className="cpt-lien" href={`/numero/${dossier.token}`}>
          Voir la page du numéro
        </a>
      </div>
    </article>
  )
}

function CarteLivree({ dossier }: { dossier: DossierAffiche }) {
  const livree = dateCourte(dossier.etat_maj_le)
  return (
    <article className="cpt-carte cpt-carte--livre">
      <div className="cpt-livre-visuel" aria-hidden="true">
        <span className="cpt-livre-dos" />
        <span className="cpt-livre-face">{dossier.titre || 'Numéro'}</span>
      </div>
      <div className="cpt-livre-corps">
        <h3 className="cpt-carte-titre">{dossier.titre || 'Votre numéro'}</h3>
        {livree ? <p className="cpt-carte-etat">Livré le {livree}</p> : null}
        <div className="cpt-carte-gestes">
          {dossier.souvenir_pdf_key ? (
            <a className="at-cta cpt-cta" href={`/api/atelier/souvenir?token=${dossier.token}`}>
              Télécharger le PDF
            </a>
          ) : null}
          <a className="cpt-lien" href={`/numero/${dossier.token}`}>
            Revoir la page du numéro
          </a>
        </div>
      </div>
    </article>
  )
}

export default async function ComptePage() {
  const qui = await utilisateurConnecte()
  if (!qui) redirect('/compte/connexion?suite=%2Fcompte')

  const supabase = makeSupabase()
  const dossiers = await lireDossiersDuCompte(supabase, qui)
  await epinglerDossiers(supabase, qui, dossiers, 'compte')
  const { aTerminer, enCours, bibliotheque } = classerDossiers(dossiers)

  return (
    <div className="bj-atelier cpt">
      <header className="cpt-top">
        <Link href="/" aria-label="Bellajour, retour à l’accueil">
          <img
            className="cpt-top-logo"
            src="/images/ui/signature-blanche.webp"
            alt=""
            width={320}
            height={122}
            decoding="async"
          />
        </Link>
        <BoutonDeconnexion />
      </header>

      <main className="cpt-main">
        <h1 className="cpt-titre">Mes numéros</h1>
        <p className="cpt-sous-titre">{qui.email}</p>

        {dossiers.length === 0 ? (
          <section className="cpt-vide">
            <p className="cpt-vide-mot">
              Votre premier numéro n’attend que son moment. Racontez-le, déposez vos photos,
              l’atelier compose.
            </p>
            <a className="at-cta cpt-cta" href={COMPOSER_HREF}>
              {CTA_LABEL}
            </a>
          </section>
        ) : (
          <>
            {aTerminer.length > 0 ? (
              <section className="cpt-section">
                <h2 className="cpt-section-titre">À terminer</h2>
                <div className="cpt-grille">
                  {aTerminer.map((d) => (
                    <CarteATerminer key={d.token} dossier={d} />
                  ))}
                </div>
              </section>
            ) : null}

            {enCours.length > 0 ? (
              <section className="cpt-section">
                <h2 className="cpt-section-titre">En cours à l’atelier</h2>
                <div className="cpt-grille">
                  {enCours.map((d) => (
                    <CarteEnCours key={d.token} dossier={d} />
                  ))}
                </div>
              </section>
            ) : null}

            {bibliotheque.length > 0 ? (
              <section className="cpt-section">
                <h2 className="cpt-section-titre">Ma bibliothèque</h2>
                <div className="cpt-grille cpt-grille--livres">
                  {bibliotheque.map((d) => (
                    <CarteLivree key={d.token} dossier={d} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}
