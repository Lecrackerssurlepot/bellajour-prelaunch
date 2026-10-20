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

20/10, lot « w2-atelier » (le CÔTÉ ATELIER des planches 4B et 4C, dans la fiche de l'édition, onglet
Photos ; branche `w2-atelier-corbeille-personnes`, rien de commité).
- `PanneauPersonnes.tsx` (+ `personnes.css`, phrases dans `src/lib/collectif/atelierPhotos.ts`) : les
  personnes de l'édition à gauche (la plus fournie d'abord, recherche par nom ou adresse, filtre
  « Doublons possibles »), la personne choisie à droite avec son adresse ENTIÈRE, ses liens, ses
  téléphones, sa dernière arrivée. « Renommer » (prénom ET nom, toutes ses photos suivent), « Fusionner
  avec… » ou « Fusionner » depuis une proposition : la fenêtre de la planche 4B (les deux personnes, « Le
  nom gardé », la phrase qui dit le compte exact et les adresses), jamais d'office ; un nom d'un seul
  mot refusé par le serveur pour une personne à adresse est grisé avant le clic. « Fusions passées »
  avec « Défaire… » EN DEUX TEMPS (`verifier: true` montre ce qui reviendrait, puis le geste ; 409 si
  déjà défaite). Les routes sont celles de l'atelier (`/api/admin/collectif/editions/[id]/personnes`).
- Sans la migration 20261023 : la liste se lit par nom (personnes d'avant), l'écran dit « Le suivi par
  adresse attend la mise à jour de la base : supabase/migrations/20261023_… » et grise renommer,
  fusionner, défaire (aucun 503 à subir).
- La fiche n'a pas de grille de photos : la planche 4C en montre une sous la personne, elle n'est pas
  inventée (ni « Tout cocher »).
- Harnais : bloc « w2-atelier » de `scripts/verif-collectif.ts`. Vu à l'écran (Chrome headless, 1440,
  1280 et 375) sur un faux Supabase local, écritures interceptées.
- Reste : la page du participant et celle du responsable (autres lots), l'application de la migration.

20/10, lot « w2-photos » (le CÔTÉ RESPONSABLE de la planche 4, page Photos ; branche
`w2-photos-corbeille-personnes`, rien de commité).
- Une personne choisie (liste « Personne », « Voir ses N photos » de la photo agrandie, ligne du bas au
  téléphone) a sa FICHE au-dessus de ses photos : son nom, son adresse masquée par le serveur, ses liens,
  ses téléphones, sa dernière arrivée ; « Renommer » (prénom ET nom, l'effet dit avant le geste),
  « Fusionner avec… », « Tout cocher » (téléphone : « Cocher »). Au téléphone, « ‹ Bateau 1 » ramène au lien.
- « Peut-être la même personne » : les doublons PROPOSÉS par le serveur, jamais fusionnés d'office ;
  « Fusionner » ouvre une fenêtre (les deux côte à côte, le nom gardé, l'effet en une phrase) ; « Ignorer »
  les range pour cet écran. Défaire une fusion reste à l'atelier.
- Un autre nom tapé avec son adresse (`nomPropose`, durcissement C4) est dit sous le nom, au responsable
  seul, avec « Renommer » pré-rempli ; jamais de renommage d'office.
- Le lien d'équipe voit la fiche sans geste, sans adresse ni proposition, et sans nom de lien.
- Sans la migration 20261023 : la fiche montre les personnes d'avant (par nom) ; renommer et fusionner
  répondent 503, la fenêtre dit « La mise à jour de la base n'est pas encore appliquée : rien n'a changé. »
- Harnais : bloc « w2 » de `scripts/verif-collectif.ts`. Vu à l'écran (fausse base, jour et nuit, 1440,
  1024 et 375), fusion et renommage joués contre la fausse base.
- Reste : l'application de la migration ; « Ignorer » ne se retient pas d'une visite à l'autre (aucun
  stockage côté serveur).

20/10, lot « w2-depot » (le CÔTÉ PARTICIPANT des planches 6 et 8, `/depot/[token]` ; branche
`w2-depot-participant`, rien de commité).
- `Depot.tsx` : l'adresse d'abord (planche 6), avec la phrase « Elle sert seulement à te reconnaître
  sur un autre téléphone ou un autre lien. Nous ne t'écrirons pas pour autre chose. » (vous : « vous
  reconnaître », « Nous ne vous écrirons pas ») ; dès qu'elle est complète, `presenter` SANS nom
  (rien n'est écrit pour une adresse inconnue) : connue, « Content de te revoir, Léa » et « Ce n'est
  pas moi » (8B) ; inconnue, prénom ET nom, « C'est ton prénom que verront les personnes de Bateau 1 ».
  La personne n'est créée qu'au choix des photos, AVANT le premier envoi.
- Une personne retrouvée (par son adresse ou par ce téléphone) ne montre que son PRÉNOM, jamais son
  nom de famille ; le nom complet seulement juste après l'avoir tapé.
- Le même téléphone qui revient et a déjà accepté le texte du jour s'ouvre sur l'album (8A) :
  « Content de te revoir, Léa · 24 photos à toi · 7 nouvelles dans l'album depuis ta visite »
  (repère gardé sur le téléphone, jamais le token) ; sinon la carte le reconnaît et redemande l'accord.
- « Ce n'est pas toi ? » (`oublier`) : « Ce téléphone n'envoie plus au nom de Léa. Ses photos restent
  à son nom. » et le formulaire vide (8C).
- Sans la migration 20261023 (la page le sait sans écrire : `quiEstCeTelephone`, `lecture.ts` ; ou
  un 503 à la présentation) : la formule d'avant, prénom et nom figés sur ce téléphone, sans
  adresse. Le nom gardé dans le navigateur est désormais PROPRE au lien (clé par empreinte).
- Harnais : section « w2 » de `scripts/verif-collectif.ts` (`verifDepotParticipant`). Vu à l'écran
  (Chrome headless, 375 × 812 et 1440 × 900, jour et nuit) sur un faux Supabase local et un faux
  coffre, écritures du navigateur limitées au serveur local.
- Reste : l'application de la migration par Mathias, puis vérifier que la personne ARRIVE
  (`collectif_participants`, `participant_id` sur les photos).
