---
id: T-082
titre: Les lectures de CHAMPS_MAIL n'ont pas le repli 42703 que le reste du code a
domaine: donnees
gravite: serieux
autonomie: libre
ouvert: 2026-09-01
---
## Ce que Mathias a dit
Rien — reste détaché de T-044 le 01/09/2026, à sa clôture, où il était annoncé en toutes lettres
(« reste à poser dans un ticket suivant »).
## Ce que j'ai vérifié
T-044 a posé le repli 42703 là où l'argent passe : `src/lib/atelier/paiement.ts`, sur l'update de
confirmation de paiement. Il n'a **pas** touché `CHAMPS_MAIL` (`src/lib/atelier/mails.ts:68-71` —
la fiche T-044 disait « ligne 60 », le fichier a bougé depuis), où entrent deux colonnes de
migrations récentes : `retouches_demandees_le` et `tracking_code`.
Cinq lectures la sélectionnent, aucune n'a de repli : `admin/atelier/sante.ts:93`,
`api/atelier/mails/relever/route.ts:129`, `api/atelier/numero/route.ts:297`,
`lib/atelier/mails.ts:849`, `lib/atelier/paiement.ts:102`.
La règle du dépôt est écrite dans `supabase/CLAUDE.md` : **toute colonne fraîche exige un repli
sur `42703`**, parce qu'un déploiement précède toujours sa migration. Ici les deux colonnes
existent (`20260828_atelier_retouches_et_facture.sql` et `20260829_atelier_tracking_code.sql`,
appliquées et vérifiées), donc rien ne casse aujourd'hui — c'est un filet manquant, pas une
panne en cours. Le code le sait d'ailleurs : `mails.ts:93-94` porte le commentaire « Avant elle,
un select de CHAMPS_MAIL serait tombé en 42703 ». Il constate le risque, il ne le couvre pas.
⚠️ La prochaine colonne ajoutée à cette liste rejouera exactement la scène, et cette fois sans
filet, entre le déploiement et la migration.
⚠️ Ce qui rend le manque coûteux, c'est la forme du `select` : `CHAMPS_MAIL` est une liste
unique. Un `42703` sur **une** colonne fait échouer **toute** la lecture. La relève quotidienne
ne rend alors aucun mail, la page Santé ne montre rien, et la page de la cliente ne se compose
pas — pour une colonne dont l'absence devrait juste vider une phrase.
## Ce que je propose
Le même idiome que `transition/route.ts` et `paiement.ts` : un helper de lecture qui réessaie
sans les colonnes fraîches sur `42703`, et qui **crie** — `console.error` nommant la migration
attendue, comme le filet de T-044.
⚠️ Et la contrepartie que le socle exige : **une fois la migration passée, vérifier que la donnée
arrive vraiment**. Un repli qui se déclenche efface le champ en silence ; sans ce contrôle, on
croit avoir un filet quand on a une amnésie.
À faire quand `mails.ts` n'est plus réservé à un autre chantier.
## Ce qui a été fait (02/09)
Helper **`lireNumerosMail`** ajouté dans `src/lib/atelier/mails.ts`, à côté de `CHAMPS_MAIL` et
d'un nouveau **`CHAMPS_MAIL_REPLI`** (= `CHAMPS_MAIL` moins la colonne la plus fraîche,
`tracking_code`). Il tente le select complet, retombe sur le repli sur `42703`, et **crie** un
`console.error` nommant la migration attendue. Toute autre erreur est rendue telle quelle : chaque
appelant garde son propre traitement (single/list, filtres, colonne `stripe_session_id` en plus).

Les **5 lieux de lecture** basculés sur le helper : `lib/atelier/mails.ts` (envoi),
`lib/atelier/paiement.ts` (confirmation de paiement, + `stripe_session_id`),
`api/atelier/numero/route.ts` (création), `admin/atelier/sante.ts` (Santé),
`api/atelier/mails/relever/route.ts` (relève quotidienne).

**Dormant tant que les colonnes existent** (le cas normal) : une requête, pas deux. Le repli
n'existe que pour la fenêtre entre un déploiement et sa migration. ⚠️ **En ajoutant une colonne à
`CHAMPS_MAIL`, la retirer aussi de `CHAMPS_MAIL_REPLI`** — commentaire posé dans le code.

Vérifié : `tsc` 0 erreur (le générique Supabase tient), `verif-atelier` TOUT PASSE, `lint` propre,
`build` succès. Rien commité ni déployé.
