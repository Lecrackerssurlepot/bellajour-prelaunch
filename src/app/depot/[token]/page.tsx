/* /depot/[token] — le lien que le responsable partage aux participants
   (PRD §5.1, planches 6 à 9 du 20/10). D'abord mobile. Pas de compte.

   Seul le token de DÉPÔT ouvre cette page : un lien responsable ou équipe
   tapé ici répond comme un lien inconnu. `?p=<clé>` : un lien de provenance
   (un bateau, le photographe), avec son propre plafond par personne ou sans
   plafond. Une clé inconnue répond comme un lien inconnu.

   Les états, dans l'ordre (planche 9) : la collecte est terminée (9C : la date,
   le merci, ce qui est arrivé, l'album en lecture) ; le dépôt n'est pas encore
   ouvert (9B, `ouverture_le`, migration 20261023) ; le plafond par personne
   n'est pas réglé (T-195) ; sinon le dépôt (`Depot`). Un lien mort tombe sur
   `not-found.tsx` (9A).

   Ce que la page lit de CE téléphone (le cookie httpOnly de l'appareil) :
   - avec la migration 20261023, la personne pour qui il parle
     (`quiEstCeTelephone`), ses comptes et sa place : un téléphone qui revient
     s'ouvre sur l'album (8A). ⚠️ Jamais le nom de famille d'une personne
     retrouvée : son prénom seulement (l'adresse n'est pas vérifiée) ;
   - sans elle, la règle d'avant : le nom que ce téléphone a déjà donné et le
     nombre de ses photos arrivées (T-192). */

import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { formaterJour } from '@/lib/atelier/dates'
import { makeSupabase } from '@/lib/supabase'
import { COOKIE_APPAREIL, estAppareil, placeDuParticipant, type LienDeDepot } from '@/lib/collectif/collecte'
import { arriveesDeLAppareil, nomDeLAppareil, photosCoupeesDeLAppareil } from '@/lib/collectif/participantConnu'
import { teteObjet } from '@/lib/collectif/rattrapageCoffre'
import { estCleProvenance } from '@/lib/collectif/droits'
import { collecteOuverte } from '@/lib/collectif/etats'
import { colonneAbsente, MIGRATION_COLLECTIF } from '@/lib/collectif/migration'
import { depotOuvert } from '@/lib/collectif/ouverture'
import { premierMot } from '@/lib/collectif/participant'
import { comptesDeLaPersonne } from '@/lib/collectif/personnesServeur'
import { depotRegle, phrasesDepotPasOuvert, plafondParticipant } from '@/lib/collectif/plafonds'
import { VERSION_ACCORD } from '@/lib/collectif/accord'
import type { TypeProvenance } from '@/lib/collectif/types'
import Porte from '../../edition/_composants/Porte'
import Depot from './Depot'
import { CarteEtat, CollecteTerminee, EtatPasOuvert } from './Etats'
import { accesDepot, quiEstCeTelephone } from './lecture'
import './depot.css'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageDepot({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ p?: string }>
}) {
  const { token } = await params
  const { p } = await searchParams
  /* La lecture du layout, partagée (`cache`) : un lien inconnu, régénéré ou supprimé
     tombe sur « Ce lien ne fonctionne plus » (not-found.tsx, T-196), toujours en 404. */
  const acces = await accesDepot(token)

  if (acces.statut === 'ferme' || acces.statut === 'introuvable') notFound()
  if (acces.statut === 'migration_absente') {
    return (
      <Porte surtitre="Édition collective" titre="Migration collectif absente" detail={MIGRATION_COLLECTIF}>
        <p>Les tables de l&apos;Édition collective ne sont pas encore dans la base.</p>
        <p>Ce lien fonctionnera dès que la migration aura été appliquée.</p>
      </Porte>
    )
  }

  const { edition } = acces
  const tu = edition.registre === 'ecole_tu'

  type Prov = { id: string; type: TypeProvenance; libelle: string | null; sans_plafond: boolean; plafond_par_personne?: number | null; retire_le?: string | null }
  let provenance: Prov | null = null
  if (p !== undefined) {
    if (!estCleProvenance(p)) notFound()
    const lire = (colonnes: string) =>
      makeSupabase().from('collectif_provenances').select(colonnes).eq('edition_id', edition.id).eq('cle', p).maybeSingle<Prov>()
    /* Repli tant que la migration de la révision n'est pas passée. */
    /* Le lien supprimé (migration 20261018) ne reçoit plus rien : introuvable. */
    let lu = await lire('id, type, libelle, sans_plafond, plafond_par_personne, retire_le')
    if (lu.error && colonneAbsente(lu.error.code)) lu = await lire('id, type, libelle, sans_plafond, plafond_par_personne')
    if (lu.error && colonneAbsente(lu.error.code)) lu = await lire('id, type, libelle, sans_plafond')
    if (!lu.data || lu.data.retire_le) notFound()
    provenance = lu.data
  }
  const lien = provenance?.libelle?.trim() || null
  const lienDeDepot: LienDeDepot | null = provenance

  const maintenant = new Date()
  const ouvert = collecteOuverte(edition.etat, edition.cloture_le, maintenant)
  /* Planche 9B (migration 20261023) : sans `ouverture_le`, le lien reçoit dès la création. */
  const ouvertureOk = depotOuvert(edition.ouverture_le, maintenant)
  /* T-195 : le plafond PAR PERSONNE qui manque (lien général, ou lien sans plafond propre ni
     « sans limite ») ferme le dépôt. On le dit ICI, avant le choix des photos, plutôt qu'au refus
     du serveur, une fois les photos choisies et l'accord coché. Même règle que la route
     (`placeRestante`, jouée à vide par `depotRegle`). Un total vide ne ferme rien (D27). */
  const regle = depotRegle(edition, { sansPlafond: Boolean(provenance?.sans_plafond), plafondLien: provenance?.plafond_par_personne ?? null })

  const tete = {
    organisation: edition.organisation,
    evenement: edition.evenement,
    lien,
    tu,
  }

  /* Le participant qui revient (même téléphone, n'importe quel lien de l'édition). */
  const appareil = (await cookies()).get(COOKIE_APPAREIL)?.value
  const telephone = estAppareil(appareil) ? appareil : null
  /* Pour qui ce téléphone parle (20261023) : seulement là où la page s'en sert (le dépôt ouvert et
     réglé, ou la collecte terminée qui dit « Tes 42 photos sont bien arrivées »). */
  const qui = (ouvert && regle && ouvertureOk) || !ouvert ? await quiEstCeTelephone(edition.id, telephone) : { personnes: false, participant: null }

  /* Sans la migration : le nom que CE téléphone a déjà donné (il ne se change plus) et ce qui est
     arrivé, comme avant. Avec elle, la personne du téléphone fait foi (« Ce n'est pas toi ? » ne
     doit pas laisser le nom de Léa au suivant : nomDeLAppareil ne lit que les photos sans personne). */
  const [nomConnu, dejaArrivees] =
    ouvert && regle && estAppareil(appareil) && !qui.participant
      ? await Promise.all([
          nomDeLAppareil(makeSupabase(), edition.id, appareil, provenance?.libelle ?? null),
          arriveesDeLAppareil(makeSupabase(), edition.id, appareil),
        ])
      : [null, 0]

  /* ── 9C : la collecte est terminée. L'album reste lisible, rien ne s'y ajoute. ── */
  if (!ouvert) {
    let recu: { prenom: string | null; photos: number } | null = null
    if (telephone) {
      if (qui.participant) {
        const c = await comptesDeLaPersonne(makeSupabase(), edition.id, qui.participant.id, telephone)
        recu = { prenom: qui.participant.prenom, photos: c?.photos ?? 0 }
      } else {
        const [nom, n] = await Promise.all([
          nomDeLAppareil(makeSupabase(), edition.id, telephone, provenance?.libelle ?? null),
          arriveesDeLAppareil(makeSupabase(), edition.id, telephone),
        ])
        recu = { prenom: premierMot(nom) || null, photos: n }
      }
    }
    return (
      <main className="ec-dp">
        <CollecteTerminee
          token={token}
          p={p ?? null}
          tete={tete}
          fermeLe={edition.cloture_le && new Date(edition.cloture_le).getTime() <= maintenant.getTime() ? formaterJour(edition.cloture_le) : ''}
          recu={recu && recu.photos > 0 ? recu : null}
        />
      </main>
    )
  }

  /* Ce que la personne de ce téléphone a déjà fait (8A) et la place qui lui reste, lus ici pour que
     la page arrive juste (pas d'éclair entre le formulaire et l'album). */
  let moi: { prenom: string; photos: number; ceTelephone: number; surCeLien: number; accordAJour: boolean } | null = null
  let place: number | null | undefined = undefined
  /* 2A (26/10) : les photos que CE téléphone a déclarées sans qu'elles arrivent (un envoi coupé). */
  let coupees = 0
  if (ouvert && regle && ouvertureOk) {
    const sb = makeSupabase()
    const [comptes, reste, n] = await Promise.all([
      /* Ses photos sur CE lien (21/10) : la carte dit « 2 photos déjà sur « Bateau 1 » », plus le total de l'édition. */
      qui.participant && telephone ? comptesDeLaPersonne(sb, edition.id, qui.participant.id, telephone, { provenanceId: provenance?.id ?? null }) : Promise.resolve(null),
      placeDuParticipant(sb, edition, lienDeDepot, telephone, qui.participant?.id ?? null, maintenant),
      telephone ? photosCoupeesDeLAppareil(sb, edition.id, telephone, 'participant', teteObjet) : Promise.resolve(0),
    ])
    coupees = n
    if (qui.participant) {
      moi = {
        prenom: qui.participant.prenom,
        photos: comptes?.photos ?? 0,
        ceTelephone: comptes?.ceTelephone ?? 0,
        surCeLien: comptes?.surCeLien ?? 0,
        /* L'accord est redemandé sur chaque nouveau téléphone : celui-ci a-t-il déjà accepté le texte d'aujourd'hui ? */
        accordAJour: comptes?.accord === VERSION_ACCORD,
      }
    }
    if (reste) place = reste.illimitee ? null : reste.place
  }

  return (
    <main className="ec-dp">
      {!ouvertureOk ? (
        <EtatPasOuvert tete={tete} ouvertureLe={edition.ouverture_le ?? null} registre={edition.registre} />
      ) : ouvert && !regle ? (
        <CarteEtat tete={tete}>
          <div className="ec-dp-ferme">
            {phrasesDepotPasOuvert(edition.registre).map((t) => (
              <p key={t} className="ec-dp-texte">
                {t}
              </p>
            ))}
          </div>
        </CarteEtat>
      ) : (
        <Depot
          token={token}
          p={p ?? null}
          tete={tete}
          invitation={edition.invitation_texte ?? (tu ? 'Dépose ici tes photos de l’événement.' : 'Déposez ici vos photos de l’événement.')}
          plafond={provenance?.plafond_par_personne ?? plafondParticipant(edition)}
          sansPlafond={Boolean(provenance?.sans_plafond)}
          cloture={edition.cloture_le ? formaterJour(edition.cloture_le) : ''}
          personnes={qui.personnes}
          moi={moi}
          place={place}
          nomConnu={nomConnu}
          dejaArrivees={dejaArrivees}
          coupees={coupees}
        />
      )}
    </main>
  )
}
