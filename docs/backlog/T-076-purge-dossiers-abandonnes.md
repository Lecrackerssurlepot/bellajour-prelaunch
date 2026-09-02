---
id: T-076
titre: Les dossiers abandonnés gardent leurs données personnelles sans limite de durée
domaine: donnees
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-30
---
## Ce que Mathias a dit
(Découvert en répondant à sa question « pourquoi la demande s'enregistre avant la fin des
photos ? » — la création précoce est saine et voulue, mais elle a un angle mort.)
## Ce que j'ai vérifié
Le dossier s'écrit en base dès l'écran 4 (`numero/route.ts:121-133`) — c'est le filet du
parcours, rien à y changer. Mais si la cliente abandonne là, son email, son téléphone, son
histoire et ses photos restent en base et sur R2 pour toujours : aucun filtre, aucune purge
nulle part (vérifié dans src/app/api, src/lib/atelier, scripts). Recoupe T-033 (aucun
processus d'effacement) et T-023 (photos orphelines sur R2).
## Ce que je propose
Une politique de rétention : au-delà de N jours sans dépôt terminé ni paiement, anonymiser le
dossier (ou le supprimer) et effacer les photos R2, avec un dernier mail de relance avant
échéance si souhaité. Le N n'existe nulle part et ne s'invente pas.
**Question pour Mathias** : combien de temps garde-t-on un dossier abandonné ? (usuel : 30 à
90 jours). Et : anonymiser ou effacer ?
## Ce que Mathias a tranché (01/09)
**Rétention de 90 jours. ANONYMISATION, pas suppression. Mail de relance à J-7.**
Puis, sur le trou signalé le même jour : **« On fait 90 jours après le dépôt, cela me paraît
bien. »** Un dépôt terminé mais jamais payé devient donc éligible, 90 jours après le dépôt.

## Ce qui a été fait (01/09)

**Le module pur — `src/lib/atelier/retention.ts`.** `RETENTION_JOURS = 90` et
`PREAVIS_JOURS = 7` n'existent qu'ici ; `PREAVIS_A_JOURS` (83) en est dérivé, jamais écrit en
dur. Le délai court depuis la **dernière activité**, pas depuis la création — et la dernière
activité inclut la date de la dernière photo, parce que déposer une photo n'écrit aucune date
sur `numeros` (vérifié dans `/api/atelier/photos/*`). Sans ça, une cliente qui monte quarante
photos au 85e jour voyait son dépôt effacé cinq jours plus tard.

**Deux populations, deux horloges** (après l'arbitrage du 01/09) :
- **A. dépôt jamais terminé** (`consent_photos` faux) : 90 jours depuis la dernière activité ;
- **B. dépôt terminé, jamais payé** : 90 jours depuis **la date du dépôt**. Couvre les trois cas
  réels — le dossier que l'atelier n'a jamais composé, le 1b resté sans réponse, et surtout
  **l'aperçu publié jamais payé**, qui était le trou signalé.

⚠️ **La date du dépôt n'est pas une colonne, et c'est délibéré.** `numeros` ne porte pas de
`consent_photos_at` : « la date fait foi par le journal » (commentaire de PATCH
`/api/atelier/numero`). Elle vit dans `evenements`, type `consentements`, payload
`consent_photos: true` — la MÊME source que `donnees.ts` (T2-5) et `mesure.ts`. Elle est donc
fiable et il n'y a **rien à approximer**. Le module la reçoit via le type `Jalons` et reste pur.
**Si elle manque** (`logEvenement` est best-effort, il peut avoir raté), on **ne ferme pas** :
motif `depot_sans_date`. `created_at` est antérieur au dépôt et `etat_maj_le` peut lui être bien
postérieur — aucune des deux n'est la bonne, et se tromper ici efface des photos.

Restent absolus : jamais un dossier **payé** (`stripe_payment_intent` OU l'état, double garde),
jamais un **état engagé** (payee → livree), jamais deux fois (`anonymise_le`), jamais **sans
préavis M10 vieux de 7 jours**. ⚠️ La double garde n'est pas théorique : au palier 30 €, le crédit
d'une fondatrice couvre tout le prix, la session Stripe se solde en `no_payment_required` et le
dossier n'a **aucun `payment_intent`**. Sur la seule garde Stripe, une fondatrice servie
gratuitement se faisait refermer son dossier. C'est l'état qui la sauve, et c'est testé.

**Le coût de la nouvelle règle est borné** : les deux requêtes de jalons ne partent que pour les
dossiers retenus par `meriteUnRegardDeRetention`, un pré-tri qui calcule l'âge sans les jalons.
Comme un jalon ne peut que *rajeunir* un dossier, cet âge est un majorant : rien ne peut passer
au travers, et la relève quotidienne ne paie rien tant que la base est jeune.

**Le préavis — M10** (M10 était bien le premier code libre, vérifié). Il part à J-83 depuis la
relève quotidienne existante, avec le même verrou `mails_envoyes` et le même best-effort que les
neuf autres. Texte versionné dans `scripts/mails-atelier.mjs` (maquette commune, encart
conditionnel « vos 42 photos seront effacées » pour les dépôts restés en plan).
Il est **sorti du switch sur l'état** le 01/09 : la population B vit dans trois branches
(`photos_recues`, `photos_insuffisantes`, `apercu_pret`) qui n'ont rien d'autre en commun.
Son texte ne dit plus « votre dépôt n'a jamais été terminé » — le reprocher à quelqu'un dont le
dossier attend l'atelier depuis trois mois serait lui reprocher notre propre silence. La phrase
commune ne parle que du temps ; **deux encarts conditionnels** portent la différence :
« votre couverture vous attend » (avec pagination et prix, comme M3b — ce mail est la **dernière
chance de vente** du dossier) puis « vos 42 photos seront effacées ». Dans cet ordre : ce qu'elle
gagne à revenir, puis ce qu'elle perd à ne pas revenir.
`BREVO_TEMPLATE_M10_ID` ajoutée au `.env.example` et à `/admin/atelier/sante`.
⚠️ **M10 n'a délibérément PAS de prédécesseur ni de borne de mise en service** : un dossier de
trois mois à qui aucun mail n'est jamais parti est précisément celui qu'il ne faut pas refermer
en silence. Le template n'a PAS été poussé chez Brevo (`--pousser` jamais lancé).

**Le script — `scripts/anonymiser-dossiers.ts`.** Dry-run par défaut, `--vraiment` pour agir,
comme `recette.mjs nettoyer`. **Pas de route web, pas de cron**, volontairement. Il exige que
M10 soit parti depuis 7 jours (`preavisRespecte`) : jamais de fermeture sans avertissement.
Corollaire assumé : sans le template M10, **rien ne s'anonymise du tout**, et le dry-run le dit.
Il efface R2 avant de toucher la base (reprise sûre), et ne supprime **aucune ligne**.

**La migration — `supabase/migrations/20260901_atelier_retention.sql`** (colonne
`numeros.anonymise_le`). **À APPLIQUER PAR MATHIAS.** Le repli 42703 est volontairement
asymétrique : en lecture le dry-run continue de fonctionner, en écriture le script REFUSE.
⚠️ Après application, vérifier que la donnée arrive : le dry-run doit cesser d'écrire
« la colonne anonymise_le n'existe pas encore ».

**Tests** : 72 vérifications dans `scripts/verif-atelier.ts` (éligibilité, les six motifs
d'épargne, bornes exactes à 90 et 83 jours, la dernière photo, M10 dans la relève, le patch et
surtout ce qu'il ne touche pas). Le harnais a attrapé un vrai défaut au passage : `dateDeCloture`
calculait en jours de calendrier et divergeait d'une heure de la règle au changement d'heure
d'octobre — la veille de la date annoncée, le dossier était déjà effaçable.

**Dry-run sur la vraie base (01/09, après la nouvelle règle)** : 6 dossiers, **aucun à refermer**.
5 « dépôt terminé, encore dans les 90 jours », 1 « dépôt jamais terminé, encore dans les 90 jours ».
Le repli 42703 s'est déclenché comme prévu. Aucun `depot_sans_date` : le journal porte bien ses
événements `consentements`.

## Ce qui reste
- ~~Appliquer la migration, puis vérifier que `anonymise_le` arrive.~~ **FAIT le 02/09** :
  migration appliquée via l'outil Supabase (projet Bellajour-waitlist), colonne `anonymise_le`
  présente et vérifiée par introspection. Dry-run du 02/09 : 4 dossiers, 0 à refermer.
- ~~Pousser le template M10 chez Brevo (`--pousser --seulement M10`) et poser la variable.~~
  **FAIT le 02/09** : template M10 poussé chez Brevo (`BREVO_TEMPLATE_M10_ID=40`), variable posée
  dans `.env.local` ET dans Vercel (Production), production redéployée (commit `5d157cd`, main).
  **Vérifié** : `/admin/atelier/sante` n'affiche plus aucun « mail sans template » — la page
  contrôle proactivement `CODES_ATTENDUS` (M10 inclus), donc l'absence d'alerte prouve que la
  variable est live. Portée à l'activation : plus vieux dossier 8 j, M10 à J-83 → **0 mail immédiat**.

  **➜ RÉTENTION RGPD 90 JOURS ARMÉE DE BOUT EN BOUT.**
- Un cron, une fois la rétention éprouvée sur plusieurs passages réels. Pas avant.
- **T-023** devra ignorer les dossiers dont `anonymise_le` est posé : une ligne `photos` sans
  objet R2 y est normale, alors qu'ailleurs c'est le bug grave que ce ticket cherche.
- **T-033** (effacement sur demande) reste ouvert : `patchAnonymisation()` est réutilisable tel
  quel pour un bouton d'admin, mais la demande d'une cliente n'a ni préavis ni délai de 90 jours.
- La politique de confidentialité ne dit encore rien de ces 90 jours. Texte légal : accord de
  Mathias requis.
