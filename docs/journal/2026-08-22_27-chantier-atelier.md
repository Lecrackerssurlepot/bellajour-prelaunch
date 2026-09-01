# Journal du chantier Atelier — 22 au 27 août 2026

> Rapatrié le 31/08/2026 depuis la mémoire `atelier-chantier-etat`, qui pesait 35 Ko
> et était rechargée en entier à chaque rappel. Rien n'est perdu : le texte est intégral,
> il vit désormais ici, lu à la demande. L'état COURANT est dans
> `docs/reference/ETAT-PRODUCTION.md`. Les faits vivants non consignés ailleurs sont
> restés dans la mémoire, en quinze lignes.

---


Tunnel d'acquisition `/atelier` sur `bellajour-prelaunch`, spécifié par `PRD-ATELIER.md` (gitignoré, local). Branche **`chantier/atelier`**, partie de `main`. `feat/atelier` contient un AUTRE produit (démo marketing 2 photos, webhook n8n) et n'est pas reprise — son travail en cours est sauvé dans le commit `dde1a76`.

**Poussé sur `origin/chantier/atelier`** (au 2026-08-24, 1 commit d'avance en local).

**Fait au 2026-08-22 :** lots 0 à 5. Lots 0-3 = charte sombre scopée `.bj-atelier`, homepage 4 sections, questionnaire écrans 1→4, tables `numeros`/`photos`/`evenements`. Lot 4 (commit `29ddea5`) : dépôt, moteur singleton hors React, worker 5200 px, 5 voies, reprise IndexedDB. Lot 5 (commit `d8b32ba`) : `/numero/[token]`, les 8 rendus, validés sur iPhone réel.

**Lot 6 fait et TESTÉ de bout en bout le 2026-08-24 (commit `f6fceeb`)** — procédure et résultats dans `TEST-LOT6-PAIEMENT.md`, versionné. `/api/atelier/checkout` (le navigateur n'envoie QUE le token), handlers dans `src/lib/atelier/paiement.ts`, tri du webhook partagé au `switch` sur `metadata.kind`, écran d'attente au retour de Stripe (`?paiement=ok`, 5 rechargements). Les neuf sections de test passent, dont la collision prévente/atelier.

**Le danger du webhook partagé est traité, sur les TROIS portes.** `charge.refunded` ne porte aucune métadonnée de session : le discriminant est recopié sur le PaymentIntent via `payment_intent_data.metadata`. Sans ça, un remboursement d'album arrivait anonyme chez la prévente.

**CGV v3.0 (commit `a55415d`), FR/PT/EN, le PT fait juridiquement foi.** L'Atelier passe au présent (art. 4 bis), la prévente devient un régime transitoire cadré par un art. 5.0 aux commandes du 13/06–15/08/2026 — on CADRE, on ne supprime pas : 14 fondateurs ont contracté sous la v2.5. Art. 5 bis = imputation du crédit de 30 € par code Stripe nominatif à usage unique. **Rédaction juridique à faire relire avant tout paiement réel.**

**M1, M3 et M4 faits et TESTÉS DE BOUT EN BOUT EN LIGNE le 2026-08-24** (commit `41c0d4c`, poussé
avec les 6 précédents). Templates Brevo **27 / 28 / 29**, actifs, charte sombre, expéditeur et
reply-to `contact@bellajour.com`. Migration `mails_envoyes` APPLIQUÉE en production. Test réel :
dépôt de 52 photos depuis un iPhone sur la preview → M1 reçu → `UPDATE` en SQL → relève → M3 reçu
avec 34 pages et 40 €. **Le point de coupe du PRD §18 est atteint : le produit est publiable.**

Code : `src/lib/atelier/mails.ts` (verrou `mails_envoyes`, unique numero_id+code, posé AVANT Brevo
et RETIRÉ si l'envoi échoue — ce filet a servi dès le premier test), branche `consent_photos` du
PATCH pour M1, route `/api/atelier/mails/relever` pour M3. **La relève existe parce que le passage
en état 2 se fait en SQL à la main** : aucun chemin de code à écouter, donc on balaie. Elle rattrape
aussi M1 et signale les dossiers d'état 2 incomplets.

⚠️ **Trois pièges de mise en ligne, tous rencontrés le 2026-08-24, tous réglés :**
1. Les variables `R2_*` n'existaient QUE dans `.env.local` — jamais posées sur Vercel, parce que le
   dépôt n'avait tourné qu'en local. Symptôme : `presign` en 500 « R2_BUCKET_NAME manquant », et le
   navigateur affiche « connexion instable », ce qui envoie chercher un problème de réseau ou de CORS.
   Le CORS du coffre, lui, était bon (`https://*.vercel.app` fonctionne, préflight vérifié).
2. **Brevo bloquait les IP non autorisées pour les clés API** (582 IP accumulées, jamais convergent) :
   401 sur chaque envoi depuis Vercel. Réglé en désactivant le blocage côté clés API, dans
   app.brevo.com/security/authorised_ips. À reposer si un jour les mails cessent tous d'un coup.
3. `NEXT_PUBLIC_SITE_URL` dédoublée : `www.bellajour.fr` en Production+Development, l'URL de preview
   en Preview seul — sinon le bouton des mails envoyés depuis la preview tombe sur un 404.

L'alias stable de la preview : `bellajour-prelaunch-git-cha-a10ca9-lecrackerssurlepots-projects.vercel.app`.
⚠️ Aucun tiret (— ni –) dans les textes des mails : consigne explicite de Mathias, garde-fou dans le générateur.
⚠️ Le M1 de rattrapage est parti à `candicelelong69@gmail.com` (dépôt du 22/08 pris pour un vieux test) :
elle attend donc une couverture sous 48 h.

Prochain chantier : **lot 7 `/admin`** — Mathias a explicitement demandé à ne pas répéter le `UPDATE` SQL par cliente. Puis lot 8 (M2, M3b, M5→M9 — tous à ajouter dans la relève, pas ailleurs).

**JOURNÉE DU 24/08/2026 — 6 commits sur `chantier/atelier`, poussés, PAS dans `main` :**
`41c0d4c` mails M1/M3 + relève · `5dd6ccf` tri du webhook explicite des deux côtés ·
`27ecd4d` fermeture de la prévente par drapeau `PREVENTE_FERMEE` · `062dcaa` bascule
(`/` = l'Atelier, `/composer`, 308 depuis /atelier, noindex sur /preventes, sitemap refait) ·
`489cc7f` drapeau tolérant à la casse (échec muet évité, Mathias avait tapé « True ») ·
`ff4e4b8` footer de la landing porté en charte sombre, sans « Espace ambassadeur ».
Stripe mode RÉEL nettoyé : point d'écoute mort `api.bellajour.com` supprimé, et
`checkout.session.expired` AJOUTÉ à `www.bellajour.fr/api/webhook` — il manquait, donc la
relance de panier abandonné de la prévente (template 23) n'était **jamais partie en production**.
**PUBLIÉ le 24/08/2026** — merge `bea48be` dans `main`, déployé. Vérifié en production :
`/` sert l'Atelier, `/composer` répond, `/atelier` et `/atelier/composer` renvoient 308,
`/api/offer-state` dit `closed`, `/api/checkout` répond 410 `prevente_fermee`, `/preventes`
reste en ligne en `noindex` avec ses CTA vers `/`, `/numero/zzz` donne un 404 propre, la
relève répond 404 sans secret, et le sitemap ne liste plus que `/` + les pages légales.
**M4 VÉRIFIÉ le 24/08 à 10:38** sur le dossier « Berghain » : état → `payee`, 40,00 €, adresse
FR rangée, mail M4 parti à la seconde suivante. La chaîne M1 → M3 → paiement → M4 est prouvée
de bout en bout. Mathias ne l'avait pas vu arriver (problème de placement Gmail, cf.
[[dns-et-delivrabilite]]).
**PROCHAIN CHANTIER : `/admin`, lot 7.** Demandé explicitement — Mathias ne veut plus taper un
`UPDATE` SQL par cliente. ⚠️ `/admin` EXISTE DÉJÀ pour la prévente (tableau de bord lecture
seule, protégé par `middleware.ts` + `ADMIN_PASSWORD`) : l'admin de l'atelier réutilise cette
authentification, il ne la réinvente pas.
⚠️ **Les CGV v3.0 n'ont toujours pas été relues par un juriste** (Mathias l'a mis dans sa pile de
lecture le 24/08). Elles encadrent de vrais encaissements.

**Sans /admin, deux gestes se font à la main en SQL** (assumé par le PRD) : publier l'aperçu (`photos_recues` → `apercu_pret` + `nb_pages` + `palier` + `apercu_urls`) et les transitions d'état 5 à 8.

**TVA — tranché le 2026-08-24 : 23 %**, taux normal portugais, pas les 6 % du livre. `CODE_FISCAL_ALBUM = txcd_99999999`. ⚠️ **Stripe Tax est actif mais SANS immatriculation déclarée → 0 € de taxe calculé aujourd'hui.** Le code est câblé en TTC : le jour où l'immatriculation portugaise est posée dans le tableau de bord, le prix affiché ne bouge pas et la TVA se découpe seule. Aucun redéploiement.

**Zone de livraison FR/BE/LU** (`PAYS_LIVRAISON` dans `prix.ts`). Les DOM passent au travers : adresse « FR » chez Stripe, hors territoire TVA UE, port prohibitif. Traitement manuel tant que le volume est faible.

**INCIDENT DU 24/08/2026 — la prévente a adopté un album.** Un paiement d'atelier en test a
déclenché le mail S1 « bienvenue en prévente », et M4 n'est jamais parti. Cause : le point
d'écoute du sandbox `acct_1Tg326…` pointait encore sur la preview de la branche `prevente`,
donc du code d'avant le lot 6, sans le tri. Corrigé sur DEUX plans : Mathias a redirigé le
point d'écoute (l'écriture Stripe m'est refusée par le classifieur de Claude Code — c'est à
lui de la faire dans le tableau de bord), et le tri du webhook est devenu explicite des deux
côtés (commit `5dd6ccf`) : plus personne n'est le cas par défaut, une session non identifiée
est journalisée et ignorée. ⚠️ `charge.refunded` n'a volontairement pas de garde équivalente —
les Charges de la prévente n'ont aucune metadata et le handler y va par `stripe_payment_intent`.

**Deux comptes Stripe, piège de test :** les tests du lot 6 ont tourné sur `acct_1Tg31v…` (compte Bellajour, mode test, aucun endpoint enregistré). Un AUTRE sandbox `acct_1Tg326…` porte un endpoint pointant sur une preview de la branche `prevente` — donc du code d'avant le lot 6, sans le tri. Réactivé par Mathias le 2026-08-24. Tester l'atelier dans CE sandbox-là ré-arme le piège.

**Décisions qui amendent la PRD :** tokens sur `.bj-atelier` et non `:root` ; graisse 300 sur le texte éditorial ; invariant nº7 remplacé (upload réécrit depuis `upload-memo.md`) ; et la case de l'état 2 **ne fait pas renoncer** — l'art. 8.3 des CGV fixe l'extinction du droit de rétractation à la validation de la maquette (état 4), le libellé a été corrigé. Le PRD §8 citait le droit FRANÇAIS (L221-28) alors que le vendeur est établi à Lisbonne : c'est le DL 24/2014.

**Non versionné, bloquant en ligne :** la règle CORS du coffre Cloudflare. `AllowedOrigins` doit lister `bellajour.fr`, `www.bellajour.fr` et les origines de dev — un staging absent rend TOUT envoi impossible.

**Reste à câbler :** l'écran 6 n'écrit pas `consent_communication` en base ; le `PATCH` l'accepte déjà. Et `legal-source/*.docx` ont une version de retard sur `cgv.ts`.

**Cahier de relecture des CGV v3.0** (les changements, FR/PT/EN, sélecteur de langue) :
https://claude.ai/code/artifact/ae8a48ae-a99a-4a9e-9b24-376988e2fe97
⚠️ Pour le mettre à jour depuis une autre conversation, passer cette URL en `url` à l'outil Artifact — publier sans elle créerait un doublon.

**LOT 7A FAIT le 2026-08-24 (commit `1184cad`, non poussé, non déployé) — `/admin/atelier`.**
Remplace l'`UPDATE` SQL quotidien. Liste triée par urgence (pile « en retard / à faire / chez la
cliente / en route / terminés »), fiche dossier, six transitions. Deux fichiers PURS portent tout :
`src/lib/atelier/transitions.ts` (UNE table des transitions autorisées, la séquence commune est
écrite une seule fois dans `/api/admin/atelier/transition`) et `src/lib/atelier/urgence.ts` (les
délais que NOUS devons tenir, adossés aux promesses de la page publique). Ajouter une action = une
entrée dans la table, jamais un fichier.
Garde-fous : mode `verifier` sur la route (le prix de l'écran de confirmation vient du chemin exact
qui l'écrira, la grille reste hors du bundle) ; publication REFUSÉE hors grille 20–50 pages ; un HEAD
R2 par visuel avant publication ; verrou atomique `.eq('etat')` avec 409 ; `evenements` à chaque
transition, avec un prénom.
`/admin/atelier/demo` : douze dossiers fictifs sur les neuf états, mêmes composants, même tri.
⚠️ **Comptes nominatifs** : `ADMIN_PASSWORD_MATHIAS` / `ADMIN_PASSWORD_LOUIS` à poser sur Vercel
(ajoutées en local le 24/08 avec la même valeur que `ADMIN_PASSWORD`). Le format du cookie a changé
→ une reconnexion pour tout le monde. `ADMIN_PASSWORD` reste accepté sous le compte « Atelier » et
son bouton disparaît de l'écran de login le jour où la variable est retirée de Vercel. Le matcher du
middleware couvre désormais `/api/admin/*`.
⚠️ **Bug corrigé au passage, jamais atteint jusqu'ici** : une cliente en état 1b qui redéposait ses
photos restait bloquée en 1b (le PATCH n'écrivait que `consent_photos`). Le bouton « Demander plus
de photos » le rendait atteignable — le retour 1b → 1 est maintenant dans le PATCH de
`/api/atelier/numero`, avec `etat_maj_le` remis à neuf.
**Exception assumée** : la fiche cliente LIT `waitlist` + `pages_credits` (jamais d'écriture) pour
afficher le crédit de 30 € des fondateurs — sans ça la vérification manuelle des CGV art. 5 bis se
refait en SQL à chaque commande. Décision de Mathias, 24/08.

**LOT 7 — suite du 24/08 (commits `7c3d1e2`, `6027e5b`, `391717b`, non poussés).**
Actions inline sur chaque ligne (armées en deux temps, jamais un clic seul) ; frise des
8 jalons en tête de fiche (`src/lib/atelier/parcours.ts`) ; journal traduit en français
(`src/lib/atelier/recit.ts`, le JSON brut reste replié dessous) ; fil d'activité de
l'atelier sur 48 h en tête de liste ; vues réglables (liste / tableau kanban par étape,
regroupement urgence/étape/rien, densité) persistées en localStorage par personne via
`useSyncExternalStore` ; bloc de flux entrant (jamais ouverts / arrivées du jour / 7 jours
/ sans photos + frise 14 jours).
**MIGRATION `dossiers_vus` APPLIQUÉE EN PRODUCTION le 2026-08-25** (via le MCP Supabase, projet
`Bellajour-waitlist` / `lxkivqbcegursmxshmoc`, sur accord explicite de Mathias). Vérifié après
coup : table présente, RLS actif, `numeros` (13) et `evenements` (168) intacts, et le dashboard
lit bien la table (le repli orange a disparu, 10 « jamais ouverts » + 3 « sans photos » = 13).
Le code garde un repli « arrivé depuis moins de 24 h » si la table venait à manquer, avec un
avertissement orange à l'écran — jamais de divergence silencieuse. Une ligne par (compte, dossier ouvert) — surtout PAS le singleton
`admin_last_seen`, qui avec deux comptes ferait disparaître les nouveautés de l'un quand
l'autre ouvre le dashboard.
⚠️ Piège JSX rencontré : un texte coupé par une expression (`arrivé{x} aujourd'hui`) perd son
espace au passage à la ligne. Construire la chaîne d'un bloc.

**LOT 7A POUSSÉ ET VÉRIFIÉ EN PREVIEW le 2026-08-25** (`ff4e4b8..391717b`, branche
`chantier/atelier`, PAS dans `main`). Alias : `bellajour-prelaunch-git-cha-a10ca9-lecrackerssurlepots-projects.vercel.app`.
Vérifié sur le déploiement réel : la page de connexion propose bien les trois comptes
(Mathias / Louis / Atelier — la liste vient de l'environnement, pas du code) ; `/admin/*` redirige
sans cookie ; les TROIS routes d'écriture `/api/admin/atelier/{transition,vu,apercu/presign}`
répondent 401 (l'extension du matcher au préfixe `/api/admin/*` fonctionne en prod Vercel, pas
seulement en local) ; la route de login répond `invalid` de façon indistincte pour un mauvais mot
de passe et pour un compte inexistant. Mathias a testé la connexion : tout fonctionne.
⚠️ `ADMIN_PASSWORD_MATHIAS` et `ADMIN_PASSWORD_LOUIS` posées sur Vercel (Production + Preview) le
25/08. `ADMIN_PASSWORD` est CONSERVÉ comme filet, sous le compte « Atelier » — à supprimer de
Vercel une fois que Louis se sera connecté, le bouton disparaît alors tout seul de l'écran.
⚠️ La CLI Vercel a été authentifiée sur le Mac de Mathias le 25/08 (`npx vercel`, device flow).

**MAILS M2/M3b/M5→M9 + LOTS 7B ET 7C FAITS le 2026-08-25** (commits `5e1f859`, `8253bc8`,
`acadb38`, poussés sur `chantier/atelier`).

**Mails** — une seule règle, `codesPour()` dans `mails.ts`, utilisée par /admin (envoi immédiat
après transition) ET par la relève (filet + mails à retardement M2/M3b/M8 que rien ne peut
déclencher). ⚠️ **GARDE-FOU DE CHAÎNE** : un mail ne part que si son prédécesseur est parti.
Motivé par un cas réel — la base contenait un dossier « SALUT » en état `validee` sans AUCUN mail
(état forcé pendant les tests, jamais payé) : sans la règle, le premier balayage lui envoyait
« part à l'impression ». Seul M2 n'a pas de prédécesseur → seule borne de date du fichier
(`MISE_EN_SERVICE_M2 = 2026-08-25`), motivée par trois questionnaires abandonnés des 21 et 24/08.
M4 n'est JAMAIS rattrapé par la relève. **Auto-validation J+7** (PRD §11) dans la relève,
conditionnée à l'envoi réel de M5.
**CRON POSÉ le 2026-08-25** : `vercel.json`, `/api/atelier/mails/relever` tous les jours à 7 h UTC.
La route accepte DEUX secrets — `ATELIER_MAILS_SECRET` (curl à la main) et `CRON_SECRET` (envoyé
automatiquement par Vercel). ⚠️ **`CRON_SECRET` N'EST PAS ENCORE POSÉ SUR VERCEL** : tant qu'il
manque, la tâche reçoit un 404, visible dans l'onglet Cron Jobs et signalé par /admin/atelier/sante.
Voir `docs/CRON-RELEVE.md`.
**TEMPLATES BREVO M2/M3b/M5→M9 CRÉÉS le 2026-08-25** — IDs **30 à 36** (M2=30, M3b=31, M5=32,
M6=33, M7=34, M8=35, M9=36), variables posées sur Production + Preview + `.env.local`.
Le TEXTE des sept vit dans **`scripts/mails-atelier.mjs`** (versionné, maquette reprise du M3
validé) : `node scripts/mails-atelier.mjs` écrit des aperçus remplis dans `.mails-apercus/`,
`--pousser` crée OU MET À JOUR (idempotent via l'ID connu dans `.env.local`). Garde-fou de forme
avant tout envoi : aucun tiret cadratin, jamais « Cliquez ici » ni « Bonne réception ».
**`scripts/verif-mails-brevo.ts`** compare les `{{ params.X }}` de chaque template à ce que le
code envoie — panne qui ne lève aucune erreur (Brevo remplace par du vide). Aucun trou sur les 10.

**7B** : carnet de notes par dossier (table `notes`, on ne supprime que les siennes), les DEUX
liens Canva séparés (`canva_travail` interne / `canva_url` partagé en commentaire, PRD §11), page
`/admin/atelier/sante` (mails en échec, mails dus impossibles, templates absents, dossiers oubliés,
sans adresse, relève muette — chaque constat porte son remède).
**MIGRATION `notes` + `numeros.canva_travail` APPLIQUÉE en production le 2026-08-25** (MCP
Supabase). Vérifiée : table présente, colonne présente, rien d'autre touché.

**7C** : `/admin/atelier/metriques` — entonnoir (taux entre deux étapes consécutives), argent,
délais tenus (médiane + % dans la promesse), comparaison de période, courbe jour par jour. Période
par URL (`?p=30`). ⚠️ Les délais ne remontent pas avant le 22/08 et la page le dit ; une mesure
sans échantillon affiche « pas encore », jamais un zéro.

**`scripts/verif-atelier.ts`** — 47 assertions sur les trois modules purs (transitions, urgence,
mails), sans base ni réseau : `npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts`.

⚠️ **Piège JSX rencontré deux fois** : un texte coupé par une expression (`arrivé{x} aujourd'hui`,
`{pct()} de l'étape`) perd son espace au passage à la ligne. Construire la chaîne d'un bloc.
⚠️ Lint pré-existant non corrigé (hors périmètre) : `src/app/admin/page.tsx:145`, `Date.now()`
pendant le rendu (dashboard prévente).

**FUSIONNÉ DANS `main` ET DÉPLOYÉ EN PRODUCTION le 2026-08-25 — merge `bf40c9d`** (10 commits).
Vérifié en prod : `/` `/composer` `/preventes` `/cgv` en 200, `/admin/*` en 307 vers login, les
routes d'écriture en 401, la relève en 404 sans secret, `/api/checkout` toujours `prevente_fermee`,
et l'écran de connexion propose bien Mathias / Louis / Atelier.
**Aucune page publique ni aucune table de la prévente n'a été modifiée** par cette fusion : seules
trois routes de l'atelier changent de comportement (`valider` envoie M6, `numero` fait revenir de
1b vers 1, `relever` balaie 7 états et auto-valide).
**M5 et M6 TESTÉS EN VRAI le 25/08** sur le dossier « Berghain » (mdurand085@gmail.com) : publication
de la maquette depuis /admin → M5 reçu → validation par la cliente → M6 reçu. La relève a examiné
13 dossiers et n'en a touché qu'un.
⚠️ **BUG TROUVÉ PAR MATHIAS SUR LE M6 REÇU** : `&rsquo;` dans l'objet s'affichait tel quel
(« Berghain part à l&rsquo;impression »). Une entité HTML se décode dans le CORPS, jamais dans
l'objet, qui est du texte brut. Textes passés en caractères réels + garde-fou dans
`scripts/mails-atelier.mjs` qui refuse toute entité avant l'envoi.
⚠️ **CANDICE EST EXCLUE DE LA RELANCE M3b** (verrou manuel posé le 25/08, `template_id` null pour
le distinguer d'un envoi réel, + événement `relance_annulee` dans le journal avec la raison).
Bêta-testeuse : son numéro ne doit pas être relancé pour paiement. Les 3 autres dossiers en état 2
(tests de Mathias) seront relancés le 27/08 si le cron est armé.

**SÉANCE DE RECETTE DU 25/08 — BASE DE L'ATELIER VIDÉE** sur demande explicite de Mathias
(tous les dossiers étaient des tests, y compris ceux de Candice et « Bite » : leurs liens
publics renvoient donc un 404 désormais). `numeros`/`photos`/`evenements`/`mails_envoyes`/
`notes`/`dossiers_vus` = 0. Prévente intacte et vérifiée avant/après (48 / 21 / 16).
⚠️ **734 photos orphelines dans R2**, à purger à froid.
⚠️ **Les métriques repartent de zéro** : le journal en était la seule source.

**DEUX BUGS TROUVÉS EN RECETTE, corrigés le 25/08 :**
1. `8f30d32` — **on ne pouvait composer QU'UN SEUL numéro par appareil, à vie.** Le brouillon
   localStorage n'était jamais effacé (`clearDraft()` jamais appelé) et `creerNumero` refuse de
   créer si un token est présent. La boucle de retour du produit était coupée. Correctif =
   drapeau `termine` sur le brouillon. **NON RÉTROACTIF** : un vieux navigateur reste bloqué
   tant qu'il n'est pas vidé.
2. `ed980c7` — le journal affichait onze lignes `photos_confirmees` pour un seul dépôt (une par
   lot d'envoi), sans traduction. Retirées de l'affichage, conservées en table.

⚠️ **TOUT CE QUI RESTE EST DANS `docs/ATELIER-A-FAIRE.md`** (versionné, écrit pour une reprise
à froid). Le plus bloquant : « Télécharger le lot » ne produit qu'un `.txt` de liens, inutilisable
pour l'éditeur → `showDirectoryPicker()` de Chrome. Puis : les notes doivent voyager avec le lot,
la case « montrer des extraits » a l'air obligatoire, le crédit fondateur est manuel, les mails
tombent en Promotions.
Feuille de route de recette : `docs/RECETTE-PARCOURS.md`. Console : `scripts/recette.mjs`.

**RESTE AU 2026-08-25 :** poser `CRON_SECRET` sur Vercel (**Production uniquement** — Vercel
n'exécute les crons que sur la prod ; la tâche existe désormais, elle répondra 404 tant que le
secret manque) · retirer `ADMIN_PASSWORD` de Vercel une fois Louis connecté ·
7D Cloudprinter (phase 2 du PRD).
⚠️ **AUCUN des nouveaux mails n'est encore parti pour de vrai** : M5→M9 sont câblés, testés en
logique et vérifiés côté variables, mais jamais exercés de bout en bout. Le premier vrai envoi se
fera sur un dossier suivi.
⚠️ Deux lints pré-existants NON corrigés (hors périmètre) : `src/app/admin/page.tsx:145`
(`Date.now()` pendant le rendu) et `src/app/api/waitlist/route.ts:181` (`randomCode` inutilisé).

**How to apply:** voir [[real-supabase-schema]] pour les tables, [[nextjs-dev-lan-403]] pour tester sur iPhone, [[turbopack-worker-ts-non-compile]] avant de toucher au worker.

---

**SÉANCE DU 25/08 EN SOIRÉE — 13 commits sur `chantier/atelier`, poussés, PAS dans `main`.**
`main` reste à `f856f50`. Tout est détaillé dans `docs/ATELIER-A-FAIRE.md`.

⚠️ **La preview peut répondre 403 aux clients non-navigateur** (`x-vercel-mitigated: challenge`).
Ce n'est PAS un réglage : mitigation automatique de Vercel, déclenchée le 25/08 par les sondages
automatisés de l'agent lui-même, éteinte seule au bout de quelques minutes. Pendant l'épisode,
Stripe ne passe pas : le paiement réussit, `checkout.session.completed` prend un 403, le numéro
reste en état 2, M4 ne part pas, rien ne l'explique. Test : `curl -X POST …/api/webhook` doit
rendre **400** (`missing_signature`), jamais 403. **NE PAS couper le pare-feu** — la protection de
déploiement est déjà désactivée et « Attack Challenge Mode » est au niveau du PROJET, donc il
découvrirait aussi bellajour.fr. Stripe réessaie 3 jours et l'événement se renvoie à la main.
**Vérifié après extinction le 25/08 au soir** : webhook en 400 sur preview ET production, pages en
200, les trois marqueurs des derniers commits présents dans le bundle servi, point d'écoute du
sandbox correct.

**LE BUG DE FOND DE LA SÉANCE** : « a des photos » était confondu avec « a terminé son dépôt »
partout sauf dans M1. Un dossier de 55 photos jamais envoyées trônait en « à faire » avec 48 h au
compteur, l'atelier allait composer sans droit d'usage, et la relance M2 (qui exigeait
`nb_photos === 0`) ne partait pas : silence total. Corrigé par une fonction pure
`etapeDepot(consentPhotos, nbPhotos)` dans `urgence.ts` → `termine` | `vide` | `abandonne`, lue par
la pile, le flux, la fiche, la page cliente et la relève.

**LA CAUSE EN AMONT, corrigée aussi** (remarque de Mathias : « c'est plus important que juste mettre
un mail, sinon tout le monde va recevoir ce mail ») : l'écran 5 affirmait la fin par quatre signaux
— compteur « 55 photos DÉPOSÉES », ✓ vert par vignette, jauge pleine, bouton relégué sous 55
vignettes. Désormais « prêtes », **grille repliée à 5 grandes vignettes + case « + X »**, phrase
« l'atelier ne les a pas encore reçues », et `beforeunload`. ⚠️ Une photo en erreur n'est jamais
repliée (elle porte le seul bouton « Reprendre »). ⚠️ La barre du bas **n'est pas collante** :
décision de Mathias, la grille repliée suffit.

**Autres corrections** : téléchargement du lot par `showDirectoryPicker()` + `00-BRIEF.txt` qui
voyage avec les photos · loupe partagée page cliente/admin, « C1/C4 » remplacés par les mots de la
cliente · rafraîchissement automatique de la liste + `loading.tsx` · `en_charge` (qui a le dossier
en main, avec relais) · page Santé qui ne crie plus sur une base vide · la case « montrer des
extraits » **n'écrivait rien en base** depuis toujours, désormais câblée · « c'est à vous / c'est à
nous » sous la frise + « gardez ce lien ».

**Fait à la main le 25/08 au soir :** migration `20260826_atelier_en_charge` APPLIQUÉE en production ·
template Brevo **M2b = 37** créé, `BREVO_TEMPLATE_M2B_ID=37` posé en local ET sur Vercel par Mathias ·
`ATELIER_M2_DEPUIS=2026-08-01` ajouté à `.env.local` (sans lui, `pousser M2b` recule le dossier sous
la borne et la relance est refusée en silence).
**M2b PROUVÉ DE BOUT EN BOUT** sur la preview le 25/08 à 18h17 (dossier « Essai M2b », toujours en
base, à nettoyer).

⚠️ **JAMAIS VU À L'ÉCRAN** : tout le back-office (protégé par mot de passe, l'agent n'en saisit pas)
et le dépôt réel avec de vraies photos (l'injection de fichiers ne passe pas dans un navigateur
piloté). Tout compile, passe tsc, eslint et **81 assertions** — personne ne l'a regardé.

**PROCHAINE ÉTAPE** : recette complète sur la preview, paiement de test compris (voir la marche à
suivre en fin de `docs/ATELIER-A-FAIRE.md`), puis fusion de `chantier/atelier` dans `main`.

---

**RECETTE « TEST 2 » DU 26/08/2026 — LE PARCOURS EST PROUVÉ, ET C'EST FUSIONNÉ.**
Fusion dans `main` (8d381c9, 18 commits) et déploiement production le 26/08 au matin, sur
décision de Mathias en fin de recette.
Parcours prouvé sur la preview : dépôt 65→71 photos (avec détour par 1b : M9 parti pour la
première fois, retour 1b→1 au redépôt) → aperçu 36 p / 40 € (M3) → **paiement test 4242 →
webhook trié → payée + M4** → maquette (M5) → validation cliente (M6) → en production.
Le dossier « Test 2 » (PaD-dTGFv1M9J15WZTiQ8NIPgGBpDKnY) est resté en état 6 : le pousser
jusqu'au bout couvrira M7, M8 et il ne restera que l'auto-validation et le remboursement.
⚠️ Facture : elle EXISTE chez Stripe (`invoice_creation` actif, XJCEXVTX-0005 vérifiée) mais
**Stripe n'envoie aucun mail en mode test** — ne pas rechercher un bug.
⚠️ Piège vécu : la base étant partagée, la page /numero du dossier existe sur les DEUX
domaines — Mathias a d'abord tenté de payer sur bellajour.fr (Stripe réel). Le réflexe :
vérifier `vercel.app` dans la barre d'adresse, et 4242 refusée = mauvais site.
**Les treize retours T2-1 → T2-13 sont dans ATELIER-A-FAIRE.md avec leurs solutions** — c'est
le prochain lot, à faire dans une NOUVELLE conversation. Les plus notables : T2-2 (couverture
à plat C4|dos|C1 en un seul fichier, découpe CSS), T2-7 (les visuels signés 1 h MEURENT dans
un mail — le mail fait le clic, la page fait le spectacle), T2-13 (« j'ai demandé des
retouches » doit SUSPENDRE l'auto-validation à J+7 — imprimer d'office par-dessus des
demandes de correction est le silence qui coûte le plus).

---

**CLOUDPRINTER BRANCHÉ le 26/08/2026 (phase 2 du PRD §13)** — tout le détail dans CLAUDE.md
section Cloudprinter et docs/ATELIER-A-FAIRE.md. L'essentiel non évident :
- Compte Cloudprinter ACTIF, clé CloudCore posée dans `.env.local` — ⚠️ elle a circulé en
  clair (conversations + script python de l'étude de prix) : à RÉGÉNÉRER après la recette.
  ⚠️ Vérifier au dashboard si l'interface est Sandbox ou Live AVANT le premier orders/add.
- Produits tranchés par Mathias : 20 p. = `magazine_sas_a4_p_fc` (agrafé, UN PDF `product`),
  22-50 p. = `magazine_pb_a4_p_fc` (dos carré, DEUX PDF `cover`+`book` — vérifié sur
  products/info, contre l'intuition de Mathias qui pensait un seul PDF partout).
  Finitions par défaut 130mcs/250mcs : son étude de prix (script python à part) tranchera.
- L'API Cloudprinter rationne sévèrement (« Requests limit reached » après ~1 appel/min).
- Migration 20260827 (impression_fichiers + index) APPLIQUÉE en production le 26/08 via MCP
  Supabase, vérifiée (colonne + index présents, 8 numeros / 134 evenements intacts).
- Reste à faire pour la recette :
  créer l'interface CloudSignal au dashboard + poser `CLOUDPRINTER_WEBHOOK_KEY` (Vercel
  Preview + .env.local — un placeholder `recette-locale-a-remplacer` y est posé), dérouler
  le §10 de docs/RECETTE-PARCOURS.md sur le dossier « Test 2 » resté en état 6... ⚠️ NON :
  Test 2 est déjà en état 6 SANS commande — pour tester l'aller il faut un dossier en état 5.
  Le webhook local a été prouvé (404/204/400) ; l'aller orders/add jamais exercé.

**RECETTE SANDBOX PROUVÉE le 26/08 après-midi** (Test 2, avec Mathias aux manettes) :
commande → CP Check passé (PDF au gabarit : bloc 216x303 mm 36 p., couverture
enveloppante 431x303 mm 2 p. — générés par script, gardés dans le scratchpad de la
session) → signaux reçus → ItemShipped a basculé 6→7 TOUT SEUL avec transporteur →
M7 parti (première fois). Trois leçons PAYÉES en vrai, toutes corrigées dans le code :
1. `phone` OBLIGATOIRE dans l'adresse Cloudprinter (Stripe n'en a pas → téléphone du
   dossier, repli TELEPHONE_CONTACT).
2. Leur format d'erreur est `{error:{type,info}}`, pas `message`.
3. Le champ `order` des signaux ne porte PAS notre référence telle quelle → résolution
   multi-candidats dans le webhook (order, order sans suffixe -N, order_reference,
   reference, item sans suffixe) + console.log du payload des signaux orphelins.
4. Une référence de commande ne se RÉUTILISE JAMAIS chez eux, même annulée → après
   `orders/cancel` (fait par API, AUCUN bouton dans leur dashboard), la route recommande
   sous `<id>-r<epoch36>`. `cloudprinter_order_id` stocke la référence réellement utilisée.
5. `shipping_option` des signaux = forme machine (`dpd_france`) → rendue lisible avant M7.
La sandbox déroule commande→shipped en ~45 secondes (pas 3-5 min).
Fin de séance : Test 2 poussé jusqu'à « livrée », M8 parti via `recette.mjs pousser`.
Les DEUX clés Cloudprinter ont été régénérées (l'interface CloudCore est « My API
interface », PAS les deux « CloudApps Quick Order ») et reposées partout, anciennes
clés vérifiées mortes. Le webhook CloudSignal du dashboard s'appelle « Bellajour
preview » et pointe la preview ; au lancement, en créer un second vers bellajour.fr.

---

**LOT T2 FAIT le 26/08/2026 AU SOIR — les treize retours, en 7 commits + docs, POUSSÉS
dans `main` (production) ET `chantier/atelier` (preview).** Détail dans CLAUDE.md (sections
T2-13 et T2-2) et docs/ATELIER-A-FAIRE.md. Migration `20260828_atelier_retouches_et_facture`
(retouches_demandees_le + facture_url) APPLIQUÉE via MCP Supabase sur accord explicite de
Mathias (le classifieur avait refusé une première fois ; accord donné via AskUserQuestion).
Décisions de Mathias : T2-2 = remplacement complet des cadres C1/C4 par la couverture à
plat ; T2-7 = bloc typographique sans image ; remboursement déclenché par l'agent en API test.

**PROUVÉ le 26/08 au soir sur la preview** (dossiers « Test auto J7 » et « Test retouches »,
amenés en maquette_prete par SQL de recette + verrou M4, M5 réels partis) :
- auto-validation J+7 : pousser auto → validee, journal releve_j7, valide_par=auto, M6 ensuite ;
- suspension T2-13 : clic du VRAI bouton cliente (navigateur) → camp « c'est à nous », levier
  auto REFUSE, relève muette sur un dossier de 8 j ;
- reprise : SQL équivalent de la republication (colonne null + etat_maj_le neuf + verrou M5
  levé) → M5 repart, puis l'auto-validation passe. ⚠️ Le clic « Publier la maquette » depuis
  l'état 4 (route admin) n'a PAS été cliqué (mot de passe requis, l'agent n'en saisit pas).
- relève de PRODUCTION testée comme le cron : 404 non signé, 200+résumé en GET Bearer.
  CRON_SECRET et BREVO_TEMPLATE_M2B_ID=37 étaient DÉJÀ posés sur Vercel par Mathias.

**Templates Brevo repoussés le 26/08 au soir** (M3 refondu typographique, M9 + encart
conditionnel MOT, M5 note retouches, tous les autres resynchronisés). verif-mails-brevo :
aucun trou. ⚠️ Le bloc MOT utilise `{% if params.MOT %}` : inoffensif tant que le code
n'envoie pas MOT.

**RESTE (26/08 au soir)** :
- Remboursement JAMAIS prouvé : le connecteur Stripe MCP est invalidé (à reconnecter) et la
  clé sandbox (acct_1Tg326…) est « sensitive » chez Vercel, la clé locale est celle d'un
  AUTRE compte (acct_1Tg31v…). Un clic Rembourser au dashboard SANDBOX sur
  pi_3U8cOuKtRuvOSF410Nen0ojb (Test 2) suffit ; vérifier ensuite `evenements` : une ligne
  `remboursement` et AUCUN etat_change.
- Ménage en attente d'accord : 4 dossiers « Test… » (nettoyer --vraiment) + « Essai M2b »
  qui ÉCHAPPE aux deux sélecteurs (created_at reculé de 26 h par le levier M2b, titre sans
  « test »). ⚠️ « Notre histoire », « joelle », 3 « (sans titre) » avec de vraies photos =
  prospects potentiels, ne JAMAIS les passer dans --depuis.
- Un M2 est parti pendant les preuves à un vrai dossier sans photos de J+1 (comportement
  nominal, le cron du lendemain l'aurait envoyé).

**27/08 AU MATIN — remboursement PROUVÉ** (clic Rembourser de Mathias au dashboard sandbox →
ligne `remboursement` dans evenements a la seconde, etat inchange, waitlist intacte) et
**MÉNAGE FAIT** sur son accord : les 9 dossiers de test supprimés (nettoyer --vraiment pour
les 4 « Test », SQL par email pour joelle / Essai M2b / 3 sans-titre). La base ne contient
plus QU'UN dossier, RÉEL : « Notre histoire », de Marjorie (marjo3122@gmail.com, fondatrice
curieuse), 49 photos, dépôt terminé, M1 parti — promesse « couverture sous 48 h » qui court
depuis le 25/08 au soir. C'est la première vraie cliente de l'atelier.
