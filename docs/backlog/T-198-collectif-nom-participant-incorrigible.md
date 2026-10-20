---
id: T-198
titre: Le nom d'un participant ne se corrige nulle part, et « Léa » et « Lea » font deux personnes
etat: en cours
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

## Ce que j'ai vérifié
- Le nom est figé après le premier envoi (`src/app/depot/[token]/Depot.tsx:91-101`) ; aucun écran
  ne le corrige, ni pour le participant, ni pour le responsable, ni pour l'atelier.
- Les comptes ignorent majuscules et espaces mais pas les accents (`src/lib/collectif/dossiers.ts:76-80`).
- Le nom gardé dans le navigateur (`bj-depot-prenom`, `Depot.tsx:47-70`) ne dépend pas de
  l'édition : un téléphone prêté ou déjà venu pour une autre édition reprend ce nom.
- Un autre navigateur (WhatsApp puis Safari) ou la navigation privée compte comme un autre
  appareil : le nom est redemandé et une photo renvoyée est stockée une seconde fois
  (`src/lib/collectif/participantConnu.ts:6-9`, `moteur.ts:180-205`).

## Ce que je propose
Le responsable et l'atelier peuvent renommer une personne (toutes ses photos suivent, journal) ;
comparer les noms sans les accents ; garder le nom par édition dans le navigateur.

## Ce qui a été fait
20/10, lot « w1-fondations » (le SERVEUR des planches du 20/10, aucun écran ; rien de commité).
Contrat pour la seconde vague : `docs/produit/collectif/CONTRAT-PERSONNES-CORBEILLE.md`.
- Migration écrite, NON appliquée : `supabase/migrations/20261023_collectif_personnes_corbeille.sql`
  (`collectif_participants` : adresse normalisée unique par édition, prénom, nom, fusion ;
  `collectif_participants_appareils` : quel téléphone parle pour qui ; `collectif_photos.participant_id` ;
  la vue `collectif_photos_resume` regroupe par personne quand elle est connue).
- Le participant se présente par son ADRESSE (non vérifiée, décision du 20/10) : `POST
  /api/collectif/depot/participant` (`presenter`, `qui`, `oublier` = « Ce n'est pas toi ? »). Même
  adresse = même personne sur tous ses téléphones et tous les liens ; il ne se renomme jamais (le nom
  envoyé pour une adresse connue est ignoré) ; la route dit si CE téléphone a déjà donné l'accord.
- `depot/presign` : `email` facultatif, la personne connue donne son nom à la photo et son plafond se
  compte par elle (tous ses téléphones) ; sinon par téléphone, comme avant.
- Le responsable et l'atelier RENOMMENT et FUSIONNENT (`POST /api/collectif/personnes`,
  `…/admin/collectif/editions/[id]/personnes`) ; les doublons « Léa » / « Lea » se PROPOSENT (sans
  accents ni casse), jamais d'office ; l'atelier DÉFAIT une fusion d'après le journal. L'atelier voit
  l'adresse entière, le responsable masquée, l'équipe aucune.
- Modules : `personnes.ts` (pur), `personnesServeur.ts`. Harnais : section « w1 ».
- Reste : les écrans (planches 4, 6, 8), l'application de la migration par Mathias, puis vérifier que
  la donnée arrive (requêtes en tête du SQL).
