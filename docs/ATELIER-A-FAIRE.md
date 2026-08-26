# L'Atelier — ce qui reste à faire

Mis à jour le 26/08/2026 au matin, à la clôture de la séance de correction.
Ce document est le point de reprise : il suppose qu'on ne se souvient de rien.

---

## Où on en est, en trois phrases

Les corrections de recette sont **fusionnées dans `main` et en production**
depuis le 26/08 au matin. La recette « Test 2 » a prouvé le parcours de bout
en bout sur la preview : dépôt → 1b et retour → aperçu → **paiement test →
webhook → M4** → maquette → validation → production, avec M1, M9, M3, M4, M5
et M6 partis au bon moment. Restent JAMAIS testés en vrai : **M7 (expédiée),
M8 (J+3 après livraison) et l'auto-validation à J+7** — le dossier « Test 2 »
est resté en état 6, il suffit de le pousser jusqu'au bout pour les couvrir.

**Le prochain lot est tout trouvé : les retours T2-1 à T2-13** (section
« Retours de la recette Test 2 » ci-dessous), chacun avec sa solution
proposée. Le plus structurant est T2-13 — le bouton « j'ai demandé des
retouches » qui doit suspendre l'auto-validation.

### ⚠️ Si un paiement ou un mail ne remonte pas, TESTER CECI D'ABORD

La preview peut se mettre à répondre **403** à tout client qui n'est pas un
navigateur — en-tête `x-vercel-mitigated: challenge`. Ce n'est pas un réglage :
c'est la **mitigation automatique** de Vercel, qui se déclenche sur un trafic
qu'elle juge robotique et s'éteint seule au bout de quelques minutes.

Un navigateur passe sans s'en apercevoir. **Stripe et `scripts/recette.mjs`,
non.** Pendant l'épisode : un paiement de test réussit chez Stripe,
`checkout.session.completed` prend un 403, le numéro reste en état 2, M4 ne
part pas — et rien dans les journaux ne l'explique.

C'est arrivé le 25/08 au soir, provoqué par les sondages automatisés de l'agent
lui-même (une boucle toutes les 8 s). Le test :

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  https://bellajour-prelaunch-git-cha-a10ca9-lecrackerssurlepots-projects.vercel.app/api/webhook
```

**400 = tout va bien** — la route répond et refuse une requête non signée.
Le pare-feu n'y est pour rien, chercher ailleurs.
**403 = c'est lui** — attendre quelques minutes, ne rien désactiver.

⚠️ **Ne PAS couper le pare-feu Vercel pour ça.** Vérifié le 25/08 : la
protection de déploiement du projet est déjà entièrement désactivée, il n'y a
aucun réglage en cause. Et un éventuel « Attack Challenge Mode » est au niveau
du PROJET : le couper retirerait aussi la protection de bellajour.fr.

⚠️ Si un paiement a été fait pendant un épisode : Stripe réessaie pendant trois
jours, et le tableau de bord permet de renvoyer l'événement à la main
(Developers → Webhooks → l'événement → *Resend*).

**État vérifié le 25/08 au soir, après extinction :** webhook en 400 sur la
preview ET sur la production, pages publiques en 200, et les trois marqueurs
des derniers commits (`photos prêtes`, `at-d-tuile--plus`, `pas encore reçues`)
présents dans le bundle servi. Le point d'écoute Stripe du sandbox
(`acct_1Tg326KtRuvOSF41`) vise bien cette preview, sur les trois événements
attendus.

---

## Ce qui n'a pas encore été vu

La recette Test 2 a couvert le back-office et le dépôt réel — les deux angles
morts de la veille sont levés. Ce qui reste sans preuve : M7, M8,
l'auto-validation, et le remboursement (`charge.refunded` atelier, journalisé
sans transition).

---

## Retours de la séance de recette du 25/08

Mathias a parcouru le questionnaire et le dépôt (« Test 1 », 41 photos).
Ses observations, avec ce qui a été fait ou reste à faire.

### ✅ Corrigé pendant la séance

**Un seul numéro par appareil, à vie.** Rouvrir `/composer` affichait le
questionnaire prérempli d'un numéro terminé, sans moyen d'en commencer un
autre. Le brouillon localStorage n'était jamais effacé (`clearDraft()` existait
et n'était appelé nulle part) et `creerNumero` refuse de créer si un token est
présent. **C'était la boucle de retour du produit qui était coupée** : le modèle
est « un numéro par moment » et le mail M8 dit « composer un nouveau numéro ».
Corrigé par un drapeau `termine` sur le brouillon (commit `8f30d32`).
⚠️ **Non rétroactif** : un navigateur portant un vieux brouillon reste bloqué
tant qu'il n'est pas vidé. Sans objet aujourd'hui (base vide), à garder en tête
si une vraie cliente le signale.

**Le journal racontait onze fois le même envoi.** `photos_confirmees` est écrit
à chaque LOT : 41 photos produisaient onze lignes identiques, sans traduction.
Retirées de l'affichage (fiche et fil d'activité), conservées en table pour le
débogage.

**La grille de photos** se replie à douze vignettes.

### ✅ Fait le 25/08 — le lot de photos et le brief

**Télécharger le lot descend les VRAIES photos.** C'était le plus bloquant.
Sur Chrome et Edge, `showDirectoryPicker()` : l'éditeur désigne un dossier une
fois (Chrome y revient tout seul ensuite), et chaque photo descend du coffre en
flux directement sur le disque. Rien ne passe par Vercel, la taille du lot n'a
plus de limite, et la barre dit où on en est avec un bouton pour arrêter.
Ailleurs, repli sur le `.txt` — devenu une liste NUE, parce que les trois
lignes de commentaire `#` de l'ancienne version la rendaient inconsommable :
`xargs` passait le dièse à `curl` comme une adresse. La commande s'affiche
maintenant à l'écran, où elle se copie.

Trois décisions qui ne se devinent pas en relisant le code :
- **les noms de fichiers sont calculés dans un module pur** (`src/lib/atelier/lot.ts`)
  et signés dans l'URL via `ResponseContentDisposition`. Les deux chemins
  produisent donc les mêmes noms. Sans ça, `curl -O` écrasait trente-neuf
  photos sur quarante : la clé du coffre finit par `original.jpg` pour chacune.
- **le préfixe numéroté** (`01-`, `02-`) préserve l'ordre du dépôt, que le
  Finder détruirait en triant `IMG_4207` avant `IMG_988`.
- **le dossier s'appelle « Camille - Séville, dix jours »**, la cliente
  d'abord : le dossier de travail se range par personne, et un titre seul ne
  dit pas de qui il s'agit. Ce nom n'est PAS unique, et c'est voulu —
  retélécharger le même numéro doit retomber sur le même dossier et réécrire
  par-dessus, ce qu'on veut après un lot interrompu. Le revers : deux numéros
  d'une même cliente portant le même titre se mélangeraient.
- **les liens sont refaits au clic** (`POST /api/admin/atelier/lot`), jamais
  ceux de la page : une fiche ouverte depuis deux heures aurait écrit quarante
  fichiers vides sans que rien ne le signale.

⚠️ Tout cela repose sur le CORS du bucket R2, qui autorise aujourd'hui
`GET` depuis bellajour.fr, `*.vercel.app` et localhost. S'il change, le
téléchargement direct tombe en panne d'un bloc.

**Les notes voyagent avec les photos.** Un `00-BRIEF.txt` est écrit dans le
dossier, en tête : occasion, histoire dans ses mots, carnet de l'éditeur en
ordre chronologique, lien Canva de travail. Il est aussi téléchargeable seul
(bouton « Le brief »), pour les navigateurs sans sélecteur de dossier et pour
le relire sans reprendre le lot. `src/lib/atelier/brief.ts`, module pur.

Ce qui reste à trancher sur ce sujet : le **récapitulatif imprimable** évoqué
en recette. Le fichier texte sert celui qui compose écran contre écran ; une
feuille A4 servirait celui qui travaille papier à côté du clavier. Les deux ne
s'excluent pas, mais la seconde ne vaut la peine que si quelqu'un imprime
vraiment. À décider en regardant travailler, pas en réunion.

⚠️ « Copier les liens » a disparu. Il ne servait qu'à coller dans un terminal,
ce que le `.txt` fait mieux maintenant.

### ✅ Fait le 25/08 — voir les visuels en grand, et savoir ce qu'on regarde

**La page de la cliente ne nommait pas ce qu'elle montrait.** La légende
n'existait QUE sur le cadre vide : dès qu'il y avait une image, plus un mot.
Trois rectangles, et personne pour dire lequel était le dos du numéro. Elle est
désormais SOUS chaque visuel, toujours.

**Les visuels s'ouvrent en grand**, des deux côtés : la page de la cliente et la
fiche de l'atelier. Un seul composant, `src/app/components/Loupe.tsx`, parce que
ce qui est délicat n'est pas le décor mais l'échappement au clavier, le retour du
focus là où on l'avait pris et le blocage du défilement derrière. On y passe
d'un visuel à l'autre (flèches, clavier, cyclique) : c'est en enchaînant
couverture puis quatrième qu'on comprend qu'il s'agit des deux faces du même
objet. Un agrandissement isolé n'aurait pas répondu à la remarque.

**« C1 » et « C4 » ont disparu de l'admin.** C'était du jargon d'imprimeur, et
l'encart était jugé « pas clair » des deux côtés. La fiche dit maintenant
« La couverture », « La quatrième », « Une double page » — LES MÊMES MOTS que la
cliente lit sur sa page. Deux personnes qui regardent le même visuel doivent le
nommer pareil, sinon le téléphone avec la cliente devient une traduction.

⚠️ Ce qui n'est PAS fait dans ce lot : l'upload unique C1+C4 découpé à
l'affichage, pour montrer une couverture qu'on retourne. C'est un vrai chantier
(dépôt, stockage et rendu), à cadrer sur une maquette avant d'écrire une ligne.

### ✅ Fait le 25/08 — le dépôt qui n'en était pas un

Signalé par Mathias : « j'ai reçu une demande d'un test, mais je n'ai pas validé
à la fin les photos ». Le dossier « joelle » : 55 photos dans le coffre,
`consent_photos = false`, aucun mail parti.

**Ce qui se passait.** « A des photos » avait été confondu avec « a terminé son
dépôt ». Trois dégâts en même temps :
1. le dossier trônait dans la pile « à faire » avec un compte à rebours de 48 h,
   contre une promesse que personne ne lui avait faite ;
2. l'atelier s'apprêtait à composer un album à partir de photos dont **le droit
   d'usage n'avait jamais été donné** ;
3. la relance M2 exigeait `nb_photos === 0` : elle ne recevait donc **rien**.
   Ni M1, ni M2. Le silence complet, pour la prospect la plus engagée qui soit.
   Et sa page lui affichait « l'atelier a vos 55 photos, couverture sous 48 h ».
   Elle n'avait plus aucune raison de revenir.

**Ce qui a changé.** `consent_photos` est le seul signal du dépôt terminé, et
c'est désormais écrit une fois pour toutes dans une fonction pure,
`etapeDepot()` (urgence.ts) : `termine`, `vide`, `abandonne`.
- la pile, le compteur du flux et le tri s'appuient dessus ;
- la fiche AVERTIT (sans bloquer : un coup de fil peut justifier d'avancer) ;
- sa page dit la vérité et lui propose de **terminer en un clic**, depuis son
  lien permanent — pas depuis le composeur, dont la grille dépend de la copie
  locale du navigateur, absente sur un autre appareil ;
- nouveau mail **M2b** « vos photos sont arrivées », J+1. Lui envoyer M2 (« il
  manque vos photos, son dossier est encore vide ») après cinquante-cinq
  photos, c'était lui dire qu'on les avait perdues.

⚠️ **M2b n'a pas encore de template Brevo.** Tant que `BREVO_TEMPLATE_M2B_ID`
manque, la relève le signale « sans_template » et n'envoie rien. Pour l'armer :

```bash
node scripts/mails-atelier.mjs --pousser
```

puis coller l'ID rendu dans `.env.local` et dans Vercel (Preview + Production).

⚠️ Le dossier « joelle » est TOUJOURS dans cet état en base. Une fois M2b armé,
la relève du lendemain le relancera toute seule.

### ✅ Fait le 25/08 — la fluidité et le relais

**Les visuels se nomment et s'ouvrent en grand**, des deux côtés. « C1 » et
« C4 » ont quitté l'admin : la fiche emploie les mots que la cliente lit sur sa
page. Détail : on passe d'un visuel à l'autre dans la loupe, ce qui est la
seule façon de comprendre que couverture et quatrième sont les deux faces du
même objet.

**La liste se met à jour toute seule**, chaque minute, et se tait quand
l'onglet est caché (elle est en `force-dynamic` : un onglet oublié tout un
week-end, c'est des milliers de requêtes pour personne). Rattrapage immédiat au
retour sur l'onglet, avec un repos de 20 s. Pied de page vivant, avec un lien
« relire maintenant ».

**Le retour à la liste ne fige plus.** La durée n'était pas le vrai problème :
c'est que rien ne se passait pendant ce temps. Deux `loading.tsx`, qui ont la
FORME de l'écran qui arrive et pas un mot « Chargement ».

**Qui a ce dossier en main.** Un bouton en tête de fiche, une marque sur chaque
ligne, un filtre « Les miens ». On peut reprendre un dossier à quelqu'un (c'est
le mot « relais »), on ne peut pas affecter quelqu'un d'autre à sa place. Chaque
passage est journalisé : « Louis a repris le dossier à Mathias ».
⚠️ **Demande la migration ci-dessous.**

**La page Santé ne crie plus pour rien.** Le silence de la relève n'est suspect
que si un mail EST DÛ maintenant. Et elle comptait des « dossiers oubliés » sur
`nb_photos === 0` : le même raccourci que celui du bug ci-dessus.

---

### ✅ Fait le 25/08 en soirée — la cause, pas le symptôme

Remarque de Mathias après avoir reçu M2b : **« c'est plus important que juste
mettre un mail. Sinon tout le monde va recevoir ce mail. »** Il a raison. M2b
rattrape ; il ne répare rien. Si l'écran laisse croire que c'est fini, la
relance part à tout le monde et devient de la friction.

**Pourquoi on abandonnait.** L'écran 5 affirmait la fin par quatre signaux
simultanés : le compteur disait « 55 photos **déposées** » — le mot même de
l'étape —, chaque vignette portait un ✓ vert, la jauge était pleine, et le
bouton « Envoyer à l'atelier » était relégué SOUS la grille, donc trois écrans
sous la ligne de flottaison. Tout disait « c'est fait » sauf la seule chose qui
comptait.

**Ce qui a changé** : « déposées » devient « prêtes » ; **la grille se replie
à cinq grandes vignettes et une case « + 49 »**, ce qui règle la cause — l'écran
tient d'un bloc et le bouton n'est plus enterré ; une phrase dit enfin ce qui
n'est PAS fait (« l'atelier ne les a pas encore reçues ») ; et fermer l'onglet
avec des photos non envoyées demande confirmation.

⚠️ La barre du bas **n'est pas collante**, à la demande de Mathias : la grille
repliée suffit. Une version `sticky` a été essayée puis retirée — elle exigeait
de figer la hauteur du questionnaire, une modification dont plus rien n'avait
besoin une fois la cause réglée.

⚠️ **Un défaut de mise en page découvert en le faisant** : `.at-q` était en
`min-height`, donc la colonne grandissait avec son contenu, le DOCUMENT
défilait, `.at-q-scroll` ne défilait plus — et le `sticky` n'avait aucun
scrollport contre lequel coller. La barre restait 876 px sous la fenêtre.
Mesuré, pas supposé. Corrigé en `height`, et scopé à `(pointer: fine)` pour
`100dvh` parce que `--app-height` est figée exprès contre la barre d'iOS.

---

### ✅ Fait le 25/08 en soirée — les deux gestes manuels

**La migration `20260826_atelier_en_charge.sql` est passée** sur
`lxkivqbcegursmxshmoc`. Vérifié : la colonne se lit, les trois dossiers sont à
`null` (personne), et le bouton a déjà servi.

**Le template M2b est créé dans Brevo : template 37.**
`BREVO_TEMPLATE_M2B_ID=37` est posé dans `.env.local`.

⚠️ **RESTE À POSER SUR VERCEL** : `BREVO_TEMPLATE_M2B_ID=37`, sur **Preview ET
Production**. Sans lui, M2b ne partira pas en ligne — la page Santé l'affichera
en orange, sans poser de verrou : il partira tout seul dès que la variable
existe.

Les sept autres templates ont été remis à jour au passage (mêmes ID, textes
resynchronisés depuis `scripts/mails-atelier.mjs`).
`verif-mails-brevo.ts` : aucun trou de variable, M2b reçoit bien
LIEN, NB_PHOTOS, PRENOM, TITRE.

---

## Retours de la recette « Test 2 » du 26/08 — avec les solutions proposées

Huit retours de Mathias, consignés pendant la séance. Ce qui marche a été dit
aussi : le téléchargement du lot, la fluidité de l'admin, la reprise du dépôt
depuis le mail. Les retours, par ordre du parcours :

**T2-1. L'écran « C'est fait » a trop de texte, et la case reste peu claire.**
La page devrait juste dire que l'atelier s'en occupe.
→ *Proposition* : réduire l'écran 6 à trois éléments — le ✓, « {titre} est
entre nos mains, couverture sous 48 h », et le bouton « Suivre votre numéro ».
La case « montrer des extraits » QUITTE cet écran : elle part sur la page
/numero (bloc facultatif en pied, déjà stylé) où elle a du contexte et du
temps, au lieu d'encombrer un moment de conclusion. Le rappel « gardez ce
lien » se résume à une ligne.

**T2-2. C1 + C4 en un seul envoi, au format d'une couverture à plat.**
Reconfirmé (c'était déjà noté). Le client verrait : première, quatrième, les
deux dos, la double page — « une belle prés comme la version éditeur ».
→ *Proposition* : l'admin téléverse UN fichier « couverture à plat »
(C4 | dos | C1, le format d'export naturel de Canva) + la double page. Le
serveur garde le fichier entier ; l'affichage découpe en CSS (`object-fit:
cover` + `object-position`) : vue C1, vue C4, vue à plat. Aucune retouche
d'image côté serveur, la loupe montre l'objet entier. Migration douce : les
dossiers à trois visuels continuent de s'afficher comme aujourd'hui.
Chantier moyen : dépôt admin + `apercu_urls` + rendu des deux pages.

**T2-3. M9 devrait porter un mot de l'atelier.** Le cas réel : le problème
était la QUALITÉ des photos, pas leur nombre — le mail générique tombe à côté.
→ *Proposition* : un champ de texte facultatif sur l'action « Demander plus de
photos » (PanneauAction), envoyé comme paramètre `MOT` du template M9, affiché
dans un encart « Un mot de l'atelier » si non vide. Le même mécanisme servira
à M3 plus tard. Petit chantier : transitions.ts accepte un champ, la route le
passe à l'envoi, le template gagne un bloc conditionnel.

**T2-4. La reprise de dépôt doit montrer qu'il y a déjà des photos.** Le lien
du mail ramène au bon endroit, mais l'écran ressemble à un premier dépôt.
→ *Proposition* : en mode reprise, un bandeau en tête de l'écran 5 — « Vos 65
photos sont déjà chez nous. Celles-ci s'AJOUTENT. » — et le compteur repart de
l'existant (il le fait déjà côté serveur, c'est l'affichage qui ne le dit pas).
Petit chantier.

**T2-5. L'admin doit distinguer l'AJOUT du premier dépôt.** Un séparateur dans
la grille, et pouvoir télécharger seulement les nouvelles.
→ *Proposition* : les photos portent déjà `ordre` et leur date — un filet
« ajoutées le 26/08 » dans la grille au premier changement de session de
dépôt, et un bouton « Télécharger les N nouvelles » à côté de « Télécharger le
lot » (même mécanique, filtrée). Moyen : il faut décider ce qui fait
« session » (l'événement `consentements` fait un bon séparateur).

**T2-6. Après publication, « L'action du moment » doit changer de visage.**
Les champs de la couverture devraient descendre dans un encart propre, en bas.
Et la disposition générale (infos client, notes en colonne) est à revoir —
noté comme NON prioritaire par Mathias.
→ *Proposition* : à l'état 2+, le panneau d'action montre l'action suivante en
grand et replie le formulaire de correction (« Corriger l'aperçu ») derrière
un lien discret. La refonte de la disposition attendra un croquis.

**T2-7. Le mail M3 devrait être plus visuel** (visuels cliquables, titres).
→ *Contrainte à connaître* : les visuels du coffre sont signés avec une durée
de vie d'une heure — embarqués dans un mail, ils seraient MORTS à l'ouverture.
On n'embarque donc pas l'aperçu réel dans M3.
→ *Proposition* : soigner le mail autrement — un bloc visuel générique
(illustration de couverture), un bouton unique et grand « Découvrir ma
couverture », et le reste au minimum. La page fait le spectacle, le mail fait
le clic.

**T2-8. Les délais annoncés à l'état 2 doivent dire la suite.** « Chez vous
sous 10 jours après validation » laisse croire que tout est prêt, alors que la
maquette complète reste à composer.
→ *Proposition* : sous le prix, une ligne en deux temps — « Après votre
paiement : votre numéro complet sous 3 jours ouvrés. Puis chez vous sous 10
jours après votre validation. » Les chiffres viennent de `DELAIS` (urgence.ts),
jamais en dur : ce sont les promesses que l'admin surveille déjà.

**T2-9. Le rafraîchissement automatique doit couvrir la FICHE, pas seulement
la liste.** Vécu en séance : Mathias attendait le paiement la fiche ouverte —
elle est restée figée sur l'état 2 alors que la base était déjà en « payée »
et que M4 était parti. C'est exactement le moment où l'on regarde une fiche.
→ *Proposition* : monter `Rafraichissement` dans la page fiche (mêmes règles :
rien quand l'onglet est caché, rattrapage au retour). Petit chantier — le
composant existe, il n'est juste rendu que par la liste.

**T2-10. La page d'après-paiement doit REMERCIER, proprement.** « Reçu. On
compose. » est sec pour quelqu'un qui vient de payer 40 €, et le bloc manque
d'air (retours à la ligne).
→ *Proposition* : « Merci. » en grand, puis trois lignes aérées — c'est payé,
voilà ce qui se passe maintenant (numéro complet sous 3 jours ouvrés), voilà
comment demander un détail. La facture y est mentionnée avec nuance (cf. T2-11).

**T2-11. « J'ai pas reçu de facture » — c'est le mode test, VÉRIFIÉ.** La
facture existe bien chez Stripe (`XJCEXVTX-0005`, 40 €, payée, adresse et nom
corrects, PDF généré) : `invoice_creation` est actif. Mais **Stripe n'envoie
AUCUN mail en mode test** — en réel, elle partira. Rien à corriger au code.
→ *Amélioration possible* : afficher un lien « Votre facture » sur la page
d'après-paiement (`hosted_invoice_url`, stable, hébergée par Stripe) — plus
sûr qu'un mail qui peut tomber en Promotions.

**T2-12. Le lien permanent, personne ne va l'enregistrer tel quel.** L'URL
brute en pied de page est illisible et ne donne aucun geste à faire.
→ *Proposition* : remplacer l'URL affichée par deux boutons — « Copier mon
lien » (navigator.clipboard) et, sur téléphone, « Partager » (navigator.share,
qui ouvre le menu natif « Notes, Messages, favoris… »). L'URL n'apparaît plus
en toutes lettres.

**T2-13. Il manque le troisième geste de l'état 4 : « j'ai demandé des
retouches ».** Aujourd'hui la cliente ne peut que valider ou commenter dans
Canva — et l'atelier ne SAIT PAS qu'elle a commenté.
→ *Proposition* : un bouton « J'ai noté des retouches dans le Canva » qui
journalise `retouches_demandees`, fait remonter le dossier dans la pile
« à faire » de l'admin, et **suspend l'auto-validation à J+7** — imprimer
d'office un numéro dont la cliente a demandé la correction serait exactement
le genre de silence qui coûte. L'échéance repart quand l'atelier republie.
C'est le retour le plus structurant du lot : il touche urgence.ts et la relève.

*Vérifié, pas un bug* : le lien Canva de l'état 4 porte déjà `target="_blank"`
— il s'ouvre dans un nouvel onglet. Si Mathias l'a vu s'ouvrir dans la même
page, c'était probablement le navigateur intégré de Gmail ; à retester dans un
vrai navigateur avant de toucher quoi que ce soit.

---

### ⚠️ À faire — par ordre d'importance

**1. Le crédit fondateur est entièrement manuel.** L'admin affiche « 30 € à
imputer » (CGV art. 5 bis) mais il faut créer un code Stripe nominatif à usage
unique et l'envoyer à la main. Tenable à deux fondateurs, pas au-delà.

**2. Les mails tombent dans l'onglet Promotions de Gmail.** Un M3 en Promotions
est une vente perdue. Chantier à part : DNS, contenu, réputation.
Cf. [[dns-et-delivrabilite]] en mémoire.

**3. C1 + C4 en un seul envoi, découpé à l'affichage.** Pour que la cliente
voie une vraie couverture qu'on retourne. Ça change le dépôt admin, le stockage
et le rendu : à cadrer sur une maquette avant d'écrire une ligne. La loupe en
donne déjà une bonne part de l'effet — à regarder avant de décider si le
chantier vaut encore le coup.

---

## Points ouverts hors recette

**Purger les 734 photos orphelines de R2.** À faire à froid, jamais pendant une
séance de test.

**La page Santé crie sur une base vide.** Elle signale « aucun mail parti depuis
longtemps » quand il n'y a plus aucun dossier. Le constat devrait se taire s'il
n'y a rien à envoyer, pas seulement si rien n'a été envoyé.

**Retirer `ADMIN_PASSWORD` de Vercel** une fois que Louis s'est connecté avec
son compte nominatif. Le bouton « Atelier » disparaîtra seul de l'écran de
connexion.

**Cinq mails jamais envoyés en vrai.** M5 et M6 sont prouvés de bout en bout,
M2 l'a été involontairement. Restent M3b, M7, M8, M9 et l'auto-validation à
J+7 — cette dernière ne peut se tester que sur un dossier en état 4.

**Les CGV v3.0 n'ont pas été relues par un juriste.** Elles encadrent de vrais
encaissements. Le portugais fait foi.

**Cloudprinter** : BRANCHÉ le 26/08/2026 (phase 2 du PRD). « Envoyer à
l'impression » passe la commande (orders/add : fichiers selon le produit —
20 p. agrafé `magazine_sas_a4_p_fc` = UN PDF type `product` ; 22-50 p. dos
carré `magazine_pb_a4_p_fc` = DEUX PDF `cover` + `book` —, adresse Stripe,
référence déduite de la pagination), et
`/api/cloudprinter/webhook` reçoit les signaux (ItemShipped → état 7 +
transporteur + M7 ; erreurs → journal, traitement manuel). Sans
`CLOUDPRINTER_API_KEY`, mode manuel : l'action redevient un simple
changement d'état. Reste à faire : créer les interfaces au dashboard
(CloudCore Sandbox pour la preview + CloudSignal), poser les deux clés,
dérouler la recette §10, puis trancher les finitions (grammage/pelliculage)
avec l'étude de prix et régénérer la clé qui a circulé en clair.

**Deux lints pré-existants**, hors périmètre du lot 7 :
`src/app/admin/page.tsx:145` (`Date.now()` pendant le rendu) et
`src/app/api/waitlist/route.ts:181` (`randomCode` inutilisé).

---

## Pour reprendre

### La recette complète, dans l'ordre

**Toujours sur la preview. JAMAIS sur bellajour.fr — Stripe y est en mode réel.**

```
https://bellajour-prelaunch-git-cha-a10ca9-lecrackerssurlepots-projects.vercel.app
```

0. Lever le blocage du pare-feu (voir tout en haut). Sans ça, le paiement ne
   remontera jamais.
1. `/composer` — le questionnaire, puis **au moins 40 photos**. Regarder si les
   cinq grandes vignettes et la case « + X » donnent envie, et surtout si le
   bouton « Envoyer à l'atelier » est évident sans qu'on le montre.
2. Fermer l'onglet AVANT d'envoyer, une fois, pour voir la demande de
   confirmation. Rouvrir, envoyer.
3. Vérifier M1 dans la boîte, et la page `/numero/<token>`.
4. `/admin/atelier` — le dossier doit être en « à faire ». Prendre le dossier
   en main, télécharger le lot, lire le `00-BRIEF.txt`.
5. Publier l'aperçu (trois visuels + une pagination). M3 part.
6. Sur sa page : les trois visuels nommés, la loupe, les deux cases, puis
   **payer avec `4242 4242 4242 4242`**.
7. C'est ICI que le pare-feu se venge s'il n'a pas été coupé : le numéro doit
   passer en « payée » et M4 doit partir.
8. Publier la maquette (M5), valider côté cliente (M6), envoyer à l'impression,
   marquer expédiée (M7), marquer livrée.
9. Les mails à retardement se forcent : `pousser "<titre>" M3b`, `M8`, `auto`.

La feuille de route détaillée est dans [`RECETTE-PARCOURS.md`](./RECETTE-PARCOURS.md).

### Le ménage après

```bash
node scripts/recette.mjs nettoyer --depuis=2026-08-26
```

⚠️ Un dossier de test traîne déjà : **« Essai M2b »**, créé le 25/08 à 18h17
pour prouver le mail M2b. Un dépôt volontairement resté en plan, une photo.

**Les commandes utiles** :

```bash
node scripts/recette.mjs etat                     # l'état de tous les dossiers
node scripts/recette.mjs pousser "Test 1" M3b     # force un mail à retardement
node scripts/recette.mjs pousser "X" M2b          # dépôt resté en plan, relance à J+1
node scripts/recette.mjs relever                  # déclenche la relève
node scripts/recette.mjs nettoyer --depuis=2026-08-26

npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts       # 81 assertions
npx tsx --tsconfig tsconfig.json scripts/verif-mails-brevo.ts   # variables des templates

node scripts/mails-atelier.mjs                    # aperçus HTML des 7 mails
node scripts/mails-atelier.mjs --pousser          # met à jour les templates Brevo
```

**Le texte des mails** vit dans `scripts/mails-atelier.mjs`, pas dans Brevo :
une phrase corrigée apparaît dans un diff et se repousse en une commande.

**Trois pièges déjà rencontrés, à ne pas re-découvrir** :

- un texte JSX coupé par une expression (`arrivé{x} aujourd'hui`) perd son
  espace au passage à la ligne — construire la chaîne d'un bloc ;
- une entité HTML (`&rsquo;`) se décode dans le corps d'un mail et **jamais**
  dans l'objet, qui est du texte brut ;
- les valeurs de `.env.local` peuvent être entre guillemets : `dotenv` les
  retire, un lecteur maison non.
