/* La coquille persistante de l'espace client (PRD §4.1).

   Ce layout se lit UNE fois à l'arrivée sur l'espace ; ensuite les sections
   s'échangent sous lui sans recharger le document. Il fait la porte (lien
   inconnu, archivé ou d'une autre porte → 404 ; migration absente → l'écran
   qui le dit), puis pose le menu.

   Il lit peu, et vite : l'édition (partagée avec la page par `cache`) et le
   compte des messages non lus. `loading.tsx` ne couvre pas les lectures de
   ce layout (Next 16) : il ne doit pas en ajouter de lentes. */

import { notFound } from 'next/navigation'
import { peut } from '@/lib/collectif/droits'
import { etatEffectif } from '@/lib/collectif/etats'
import { initiales, libelleRole } from '@/lib/collectif/espace'
import { MIGRATION_COLLECTIF } from '@/lib/collectif/migration'
import { verrousPour } from '@/lib/collectif/verrous'
import { adresseMasquee } from '@/lib/collectif/appareil'
import CodeAppareil from '../_composants/CodeAppareil'
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

  /* Le lien du responsable sur un appareil inconnu (T-154) : l'écran du code, rien d'autre. */
  if (acces.statut === 'appareil_inconnu') {
    const tu = acces.edition.registre === 'ecole_tu'
    return (
      <Porte surtitre={acces.edition.evenement} titre={tu ? 'Ouvrir ton espace sur cet appareil' : 'Ouvrir votre espace sur cet appareil'}>
        <CodeAppareil token={token} adresse={adresseMasquee(acces.edition.responsable_email)} tu={tu} />
      </Porte>
    )
  }

  const { edition, role } = acces
  const etat = etatEffectif(edition.etat, edition.cloture_le, new Date())
  const nom = role === 'responsable' ? edition.responsable_nom ?? 'Responsable' : 'Équipe'
  const nonLus = role === 'responsable' ? await compterNonLus(edition.id) : 0

  return (
    <Coquille
      token={token}
      organisation={edition.organisation}
      evenement={edition.evenement}
      nom={nom}
      initiales={role === 'responsable' ? initiales(edition.responsable_nom) : 'É'}
      libelleRole={libelleRole(role === 'responsable' ? 'responsable' : 'equipe')}
      lectureSeule={role === 'equipe'}
      verrous={verrousPour(etat)}
      nonLus={nonLus}
      peutDeposer={peut(role, 'deposer_photos')}
      tu={edition.registre === 'ecole_tu'}
    >
      {children}
    </Coquille>
  )
}
