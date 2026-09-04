import { notFound, redirect } from 'next/navigation'
import { makeSupabase } from '@/lib/supabase'
import { compteOuvert, initialeDe, utilisateurConnecte } from '@/lib/compte/session'
import { epinglerDossiers, lireDossiersDuCompte } from '@/lib/compte/donnees'
import { classerDossiers } from '@/lib/compte/rattachement'
import { LIBELLE_ETAT, type Etat } from '@/lib/atelier/transitions'
import { etapeDepot, QUI_ATTEND } from '@/lib/atelier/urgence'
import { resoudreApercu } from '@/lib/atelier/apercu'
import { AVANCEMENT } from './jalons'
import Espace, { type DossierVue, type LivreVue } from './Espace'
import './compte.css'

/**
 * /compte — l'espace de la cliente, en DEUX ONGLETS (décision de Mathias,
 * 04/09) : « Mes numéros » pour ce qui est en cours ou à terminer, « Ma
 * bibliothèque » pour ce qui est livré. Trois sections empilées noyaient
 * deux moments qui n'ont rien à voir : l'un est une liste de choses à
 * faire, l'autre une étagère.
 *
 * La page est un composant SERVEUR : la session se lit ici, les données
 * passent par la service key filtrée (lireDossiersDuCompte), les couvertures
 * sont signées ici (URL R2 à vie courte), et le passage épingle au compte
 * les dossiers vus par email. Le client ne reçoit que de l'affichable —
 * jamais un id interne, jamais une clé R2.
 */

export const dynamic = 'force-dynamic'

/* La phrase « à qui c'est le tour », déclinée pour un dashboard. */
const MOT_DU_CAMP: Record<string, string> = {
  atelier: 'Entre nos mains',
  cliente: 'Un geste vous attend',
  dehors: 'En route vers vous',
  fini: 'Livré',
}

/* Le geste principal suit l'état — le libellé dit la marche exacte,
   jamais un « Voir plus ». */
function ctaPour(etat: Etat): string {
  if (etat === 'apercu_pret') return 'Voir ma couverture'
  if (etat === 'maquette_prete') return 'Voir ma maquette'
  if (etat === 'expediee') return 'Suivre mon colis'
  if (etat === 'photos_insuffisantes') return 'Ajouter des photos'
  return 'Suivre mon numéro'
}

function anneeDe(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear())
}

function dateLongue(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ComptePage() {
  /* L'espace n'est pas encore ouvert au public (compteOuvert) : cette
     page n'existe pas. */
  if (!compteOuvert()) notFound()

  const qui = await utilisateurConnecte()
  if (!qui) redirect('/compte/connexion?suite=%2Fcompte')

  const supabase = makeSupabase()
  const dossiers = await lireDossiersDuCompte(supabase, qui)
  await epinglerDossiers(supabase, qui, dossiers, 'compte')
  const { aTerminer, enCours, bibliotheque } = classerDossiers(dossiers)

  const vueDossier = (d: (typeof dossiers)[number]): DossierVue => ({
    token: d.token,
    titre: d.titre?.trim() || 'Votre numéro',
    libelleEtat: LIBELLE_ETAT[d.etat],
    camp: MOT_DU_CAMP[QUI_ATTEND[d.etat]] ?? '',
    avancement: AVANCEMENT[d.etat] ?? 0,
    cta: ctaPour(d.etat),
    transporteur: d.etat === 'expediee' ? d.transporteur : null,
    depotEnPlan: etapeDepot(d.consent_photos, d.nb_photos) !== 'termine',
    nbPhotos: d.nb_photos,
  })

  /* Les couvertures de la bibliothèque : signées ICI, une fois, côté
     serveur. `c1` est la couverture seule ; `plat` est la planche d'un
     seul tenant (C4 · dos · C1) des publications récentes, qu'on cadre
     alors sur sa moitié droite. */
  const livres: LivreVue[] = await Promise.all(
    bibliotheque.map(async (d) => {
      const apercu = await resoudreApercu(d.apercu_urls)
      return {
        token: d.token,
        titre: d.titre?.trim() || 'Votre numéro',
        annee: anneeDe(d.etat_maj_le ?? d.created_at),
        livreLe: dateLongue(d.etat_maj_le),
        couverture: apercu.c1 ?? apercu.plat,
        couvertureEstPlanche: !apercu.c1 && Boolean(apercu.plat),
        nbPages: d.nb_pages,
      }
    }),
  )

  return (
    <Espace
      email={qui.email}
      photo={qui.photo}
      initiale={initialeDe(qui)}
      aTerminer={aTerminer.map(vueDossier)}
      enCours={enCours.map(vueDossier)}
      livres={livres}
    />
  )
}
