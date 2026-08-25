# L'Atelier — ce qui reste à faire

Écrit le 25/08/2026, à la clôture de la séance de recette. Ce document est le
point de reprise : il suppose qu'on ne se souvient de rien.

---

## Où on en est

Le lot 7 du PRD est **en production** (merge `bf40c9d` puis correctifs).
`/admin/atelier` remplace l'UPDATE SQL, les neuf mails du PRD §10 existent,
la relève quotidienne est déclarée et armée.

**La base de l'atelier a été vidée le 25/08** à la demande de Mathias : tous
les dossiers étaient des tests. `numeros`, `photos`, `evenements`,
`mails_envoyes`, `notes`, `dossiers_vus` sont à zéro. La prévente est intacte
(48 inscrits, 21 crédits, 16 factures) et n'a jamais été touchée.

**Conséquence** : les métriques repartent de zéro, et **734 photos sont
orphelines dans le coffre R2** — plus aucune ligne ne les référence. À purger
à froid.

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

### ✅ Fait le 26/08 — le lot de photos et le brief

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

### ✅ Fait le 26/08 — voir les visuels en grand, et savoir ce qu'on regarde

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

### ✅ Fait le 26/08 — le dépôt qui n'en était pas un

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

### ⚠️ À faire — par ordre d'importance

**1. La case « montrer des extraits » est mal placée.** Sur l'écran 6, qui
ressemble à une validation, elle a l'air obligatoire. Elle est purement
facultative et sans effet sur la commande (`consent_communication`, PRD §14).
→ Soit un libellé qui dise franchement « ça ne change rien à votre commande »,
soit la déplacer.

**2. Le crédit fondateur est entièrement manuel.** L'admin affiche « 30 € à
imputer » (CGV art. 5 bis) mais il faut créer un code Stripe nominatif à usage
unique et l'envoyer à la main. Tenable à deux fondateurs, pas au-delà.

**3. Les mails tombent dans l'onglet Promotions de Gmail.** Un M3 en Promotions
est une vente perdue. Chantier à part : DNS, contenu, réputation.
Cf. [[dns-et-delivrabilite]] en mémoire.

**4. Rappeler à la cliente de garder son lien.** Sa page suit l'état et le lien
est permanent, mais rien ne le lui dit. À intégrer à la relecture des mails.

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

**Cloudprinter** : phase 2 du PRD, pas commencé. La place du bouton est réservée
dans la machine à états (`envoyer_impression`).

**Deux lints pré-existants**, hors périmètre du lot 7 :
`src/app/admin/page.tsx:145` (`Date.now()` pendant le rendu) et
`src/app/api/waitlist/route.ts:181` (`randomCode` inutilisé).

---

## Pour reprendre

**Tester** : sur la preview, jamais en production pour l'étape paiement —
Stripe y est en mode réel.

```
https://bellajour-prelaunch-git-cha-a10ca9-lecrackerssurlepots-projects.vercel.app
```

Carte de test : `4242 4242 4242 4242`. La feuille de route complète du parcours
est dans [`RECETTE-PARCOURS.md`](./RECETTE-PARCOURS.md).

**Les commandes utiles** :

```bash
node scripts/recette.mjs etat                     # l'état de tous les dossiers
node scripts/recette.mjs pousser "Test 1" M3b     # force un mail à retardement
node scripts/recette.mjs relever                  # déclenche la relève
node scripts/recette.mjs nettoyer --depuis=2026-08-26

npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts       # 62 assertions
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
