/* La coquille persistante de l'espace client (PRD §4.1).

   Ce layout se lit UNE fois à l'arrivée sur l'espace ; ensuite les sections
   s'échangent sous lui sans recharger le document. Il fait la porte (lien
   inconnu, archivé ou d'une autre porte → 404 ; migration absente → l'écran
   qui le dit), puis pose le menu.

   Il lit peu, et vite : l'édition (partagée avec la page par `cache`) et le
   compte des messages non lus. `loading.tsx` ne couvre pas les lectures de
   ce layout (Next 16) : il ne doit pas en ajouter de lentes. */

import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { peut } from '@/lib/collectif/droits'
import { etatEffectif } from '@/lib/collectif/etats'
import { initiales, libelleRole, voitLienEquipe } from '@/lib/collectif/espace'
import { liensEdition, origineDepuis } from '@/lib/collectif/liens'
import { MIGRATION_COLLECTIF } from '@/lib/collectif/migration'
import { verrousPour } from '@/lib/collectif/verrous'
import { adresseMasquee } from '@/lib/collectif/appareil'
import { COOKIE_APPAREIL, estAppareil } from '@/lib/collectif/collecte'
import { photosCoupeesDeLAppareil } from '@/lib/collectif/participantConnu'
import { teteObjet } from '@/lib/collectif/rattrapageCoffre'
import { makeSupabase } from '@/lib/supabase'
import Porte from '../_composants/Porte'
import { chargerEspace, compterNonLus } from './donnees'
import Coquille from './Coquille'
import './espace.css'

export default async function EspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const acces = await chargerEspace(token)

  if (acces.statut === 'ferme' || acces.statut === 'introuvable') notFound()
  if (acces.statut === 'migration_absente') {
    return (
      <Porte surtitre="Édition collective" titre="Migration collectif absente" detail={MIGRATION_COLLECTIF}>
        <p>Les tables de l&apos;Édition collective ne sont pas encore dans la base.</p>
        <p>Ce lien fonctionnera dès que la migration aura été appliquée.</p>
      </Porte>
    )
  }

  const { edition, role } = acces
  /* Le responsable sur un appareil pas encore reconnu (T-154) : il LIT (droits de
     l'équipe) mais reste lui-même à l'écran, et le menu lui propose le code. */
  const appareilInconnu = Boolean(acces.appareilInconnu)
  const responsableIci = role === 'responsable' || appareilInconnu
  const etat = etatEffectif(edition.etat, edition.cloture_le, new Date())
  const nom = responsableIci ? edition.responsable_nom ?? 'Responsable' : 'Équipe'
  /* 2A (26/10) : un envoi du responsable coupé sur CET appareil (onglet fermé pendant l'envoi) se dit
     dans la pastille d'envoi. Une lecture courte (des têtes au coffre seulement s'il y a des lignes
     en attente), en même temps que les non-lus. */
  const appareil = role === 'responsable' && peut(role, 'deposer_photos') ? (await cookies()).get(COOKIE_APPAREIL)?.value : undefined
  const [nonLus, coupees] = await Promise.all([
    responsableIci ? compterNonLus(edition.id) : Promise.resolve(0),
    estAppareil(appareil) ? photosCoupeesDeLAppareil(makeSupabase(), edition.id, appareil, 'responsable', teteObjet) : Promise.resolve(0),
  ])
  /* Le curseur du suivi des messages (Coquille) : posé APRÈS le compte, pour ne pas compter deux fois un message arrivé entre les deux. */
  const depuis = new Date().toISOString()
  /* T-187 : « Partager avec mon équipe », au responsable seulement (voitLienEquipe).
     Le lien d'équipe n'entre jamais dans la page de l'équipe elle-même. */
  let lienEquipe: string | null = null
  if (voitLienEquipe(role, appareilInconnu)) {
    const h = await headers()
    lienEquipe = liensEdition(origineDepuis(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto')), edition).equipe
  }

  return (
    <Coquille
      token={token}
      organisation={edition.organisation}
      evenement={edition.evenement}
      nom={nom}
      initiales={responsableIci ? initiales(edition.responsable_nom) : 'É'}
      libelleRole={appareilInconnu ? 'Responsable · en lecture ici' : libelleRole(role === 'responsable' ? 'responsable' : 'equipe')}
      lectureSeule={role === 'equipe'}
      appareil={appareilInconnu ? { adresse: adresseMasquee(edition.responsable_email) } : null}
      lienEquipe={lienEquipe}
      verrous={verrousPour(etat)}
      nonLus={nonLus}
      suivreMessages={responsableIci}
      depuis={depuis}
      peutDeposer={peut(role, 'deposer_photos')}
      coupees={coupees}
      tu={edition.registre === 'ecole_tu'}
    >
      {children}
    </Coquille>
  )
}
