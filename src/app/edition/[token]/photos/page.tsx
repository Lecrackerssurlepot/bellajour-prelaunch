/* /edition/[token]/photos — la collecte, côté client (PRD §4.2, §5, T-152 ;
   planches 1, 2 et 3 du 20/10 : les listes qui trient et filtrent, cocher,
   agrandir). `?dossier=<clé>` ouvre un dossier (depuis le tableau de bord),
   `&mode=tout` garde un lien coché dans « Tout », `?onglet=liens` l'onglet des
   liens. La page serveur ne lit que ce qui ne bouge pas (le lien
   général, le plafond de présélection, les mots du message de partage) ; la
   grille ET « Qui a déposé » avec ses liens se lisent par la route photos,
   depuis le navigateur, et se relisent après un envoi. */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { formaterJour } from '@/lib/atelier/dates'
import { makeSupabase } from '@/lib/supabase'
import { peut } from '@/lib/collectif/droits'
import { collecteOuverte, etatEffectif } from '@/lib/collectif/etats'
import { liensEdition, origineDepuis } from '@/lib/collectif/liens'
import { plafondLienMax, plafondParticipant } from '@/lib/collectif/plafonds'
import { phrasePhotosEffacees } from '@/lib/collectif/retention'
import { Verrou } from '../../_composants/EnPreparation'
import { chargerEspace } from '../donnees'
import Collecte from './Collecte'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/* T-194 : le rattrapage des photos tourne APRÈS la page (`after`), dans la même fonction.
   Littéral (Next le lit au build) ; égal à `FENETRE_VERROU_RATTRAPAGE_MS`, tenu au harnais. */
export const maxDuration = 60

export default async function PagePhotos({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ dossier?: string; onglet?: string; mode?: string }>
}) {
  const { token } = await params
  const recherche = await searchParams
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition, role } = acces
  /* T-159 : une édition dont les photos sont effacées (30 jours après la livraison) le DIT, au
     lieu d'une grille de vignettes vides ; rien n'est lu, rien n'est signé, aucun rattrapage. */
  const effacees = phrasePhotosEffacees(edition.photos_supprimees_le)
  if (effacees) return <Verrou titre="Les photos" raison={effacees} />
  /* T-194 : sur le lien du RESPONSABLE (reconnu ou non), les photos arrivées au coffre sans
     confirmation sont retrouvées après la réponse. Le lien de l'équipe ne déclenche rien. Le
     module (sharp, libheif, le coffre) ne se charge qu'à ce moment-là, jamais avant la page. */
  if (role === 'responsable' || acces.appareilInconnu) {
    after(() => import('@/lib/collectif/rattrapageServeur').then((m) => m.rattraperEdition(makeSupabase(), edition.id, { declencheur: 'photos' })))
  }

  const h = await headers()
  const origine = origineDepuis(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto'))
  const ecrire = peut(role, 'deposer_photos')
  /* Collecte close : plus de dépôt ni de lien à partager, la présélection reste. */
  const ouverte = collecteOuverte(edition.etat, edition.cloture_le, new Date())
  /* La fin de collecte (21/10) : qui peut la terminer, depuis quand elle l'est, et si l'atelier peut encore rouvrir. */
  const fin = {
    terminer: peut(role, 'terminer_collecte'),
    le: ouverte ? null : edition.cloture_le,
    oubli: etatEffectif(edition.etat, edition.cloture_le, new Date()) === 'composition',
  }

  return (
    <Collecte
      token={token}
      ecrire={ecrire}
      ouverte={ouverte}
      fin={fin}
      tu={edition.registre === 'ecole_tu'}
      lienParticipants={ecrire ? liensEdition(origine, edition).depot : ''}
      preselectionMax={edition.preselection_max}
      max={plafondLienMax(edition)}
      plafondGeneral={plafondParticipant(edition)}
      dossierInitial={typeof recherche.dossier === 'string' && recherche.dossier.length <= 400 ? recherche.dossier : 'tout'}
      modeTout={recherche.mode === 'tout'}
      ongletInitial={recherche.onglet === 'liens' ? 'liens' : 'photos'}
      organisation={edition.organisation}
      evenement={edition.evenement}
      cloture={edition.cloture_le ? formaterJour(edition.cloture_le) : ''}
    />
  )
}
