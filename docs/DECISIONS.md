# Décisions

Une ligne par décision qui coûterait cher à redécouvrir. Ce qu'on a tranché, la date,
et la conséquence à respecter ensuite. Ce n'est pas un journal des changements :
si l'information est déjà dans le code ou dans l'historique git, elle n'a rien à faire ici.

Format : `D<n> (JJ/MM/AAAA) — la décision. **Conséquence :** ce qu'il faut faire ou vérifier après.`

---

D1 (27/08/2026) — Un skill utilisateur nommé `design` masquait le skill natif Claude Design ;
renommé en `claudekit-design` (dossier, frontmatter, chemins de scripts).
**Conséquence :** aucun skill utilisateur ne porte le nom d'une commande native.
À vérifier avant tout ajout de skill.

D2 (27/08/2026) — La bibliothèque typographique des numéros vit dans `assets/typo`, jamais
dans `public/` : le dépôt est PUBLIC, et committer une police, c'est la redistribuer.
60 polices en OFL ou Apache sont versionnées ; 76 dont la licence l'interdit, ou qui n'en
portent aucune, sont exclues par `assets/typo/.gitignore` et ne vivent que sur le disque.
**Conséquence :** avant d'ajouter une police, vérifier qu'un fichier de licence l'accompagne
ET qu'il autorise la redistribution. Sans ça, l'ajouter au `.gitignore`. Audit dans
`assets/typo/LICENCES.md`. Deux polices posent en plus un problème d'usage commercial
(Firty, non commercial ; Willing Race, dérivée d'un logo NBC) : à ne pas poser sur un
numéro vendu.

D3 (27/08/2026) — La page d'accueil est refondue : une couverture qui se pose puis
s'ouvre en plein écran, suivie du récit de marque en sept pages plein écran. Livrée
sur la branche `accueil-univers`, PAS sur `main` : remplacer l'accueil d'un site qui
vend, avec quatorze fondateurs aux droits ouverts, demande que la preview Vercel soit
vue avant la production.
**Conséquence :** `.at-accueil` scope entièrement les deux feuilles de style et porte
les états `pret`/`plein` — le retirer dépeint la page. Les composants S1Hero,
S2Collection, S3Method et S4Final restent sur le disque hors routage : leur contenu
part vers la page produit, ne pas les nettoyer.

D4 (27/08/2026) — Le prototype de référence (`design-explorations/`) et la
bibliothèque typographique (`assets/typo/`) ne sont TOUJOURS PAS versionnés. Ils
portent la direction artistique, le wording verrouillé et les 60 polices libres.
Un `git clean` les efface sans avertissement.
**TRANCHÉ le 28/08/2026 : on ne les versionne pas.** Décision de Mathias, prise en
connaissance du risque, après qu'il lui a été présenté deux fois.
**Conséquence :** ne PAS reposer la question. Ces dossiers restent hors git et donc sans
sauvegarde : un `git clean`, un disque perdu ou un changement de machine les efface. Voir
D8 pour la règle qui protège du reste (`git add -A` interdit à la racine). Si le sujet
revient un jour, la proposition qui était sur la table était de versionner les 5 Mo de
sources de `design-explorations/` sans les 52 Mo d'exports, que `artboards/scripts/`
sait refabriquer.

D5 (27/08/2026) — L'accueil est fusionné dans `main` SANS que la barre de tête ait été
vue sur un Android réel : aucun appareil sous la main, et l'émulation ne reproduit pas
le défaut (le coût est une rastérisation sur le GPU du téléphone, pas sur celui du Mac).
Le repli anti-jank n'est donc PAS posé : `.at-nav` reste en `backdrop-filter: blur(20px)`
sur un `position: fixed`, la construction exacte diagnostiquée sur `/preventes/prix` en
juin (commit 246d8e5), avec un flou plus lourd de 2 px. La règle de CLAUDE.md ne dit pas
« risque » mais « jank garanti ». Risque accepté en connaissance de cause. Ceci lève la
réserve de D3, sans la satisfaire.
**Conséquence :** la correction est écrite d'avance, il n'y a qu'à la poser — le patron
`.pv-nav--flat` (détection UA scopée à la page, fond quasi-opaque, blur retiré sur
Android SEUL, desktop et Safari iOS pixel-identiques), déjà en place à trois endroits.
À poser dès qu'un Android passe à portée, ou au premier signalement d'une barre qui
accroche au défilement. ⚠️ Web Analytics n'est pas activé sur le projet : on n'a
aujourd'hui AUCUN moyen de voir un décrochage Android. Une visiteuse qui subit le jank
ne le signale pas, elle part. L'activer est le préalable pour que cette décision soit
surveillable autrement qu'au hasard d'un prêt de téléphone.

D6 (27/08/2026) — Audit d'optimisation du site, mené sur la branche `optim/audit-27-08`
et PAS sur `main` : les correctifs de performance touchent le footer de huit pages qui
vendent et la barre de la prévente. Le poids du premier chargement de l'accueil passe de
1719 Ko à environ 670 Ko, mesuré en production avant, calculé après.
**Conséquence :** trois pièges découverts ne doivent JAMAIS être « réparés » par le geste
intuitif.
1. `--bj-nav-h` est référencé onze fois et défini nulle part. Le définir ferait descendre
   les treize `<main>` du site de 76 px d'un coup, en plus de la compensation que chaque
   page pose déjà. Le token vivant s'appelle `--bj-topbar-h`. Une variable fantôme dont
   la définition casse la page est pire qu'une variable fantôme.
2. `/lancement` porte encore le squelette d'une deuxième page d'accueil complète, en
   `noindex`. Son commentaire disait « retirer robots au moment de la mise en ligne » ;
   la consigne est périmée et désamorcée sur place. Suivre l'ancienne donnerait deux
   accueils concurrents, dont le faux vend « l'album d'exception ».
3. Un bloc `openGraph` posé sur une page REMPLACE celui du layout racine, Next ne fusionne
   pas en profondeur. Un bloc partiel efface l'image de partage. C'est ce qui privait
   l'accueil d'aperçu sur Instagram, premier canal d'acquisition.
⚠️ Arbitrage assumé, facile à défaire : `preload: false` sur Cormorant 500/600
(`layout.tsx`) retire 75 Ko du chargement de TOUTES les pages, au prix d'un échange de
police au premier affichage de /preventes, /ambassadeurs, /admin, /legal, /merci,
/inviter et /lancement — les seules qui peignent vraiment ces faces. Si l'effet déplaît,
retirer la ligne suffit.
⚠️ Des erreurs `react-hooks` subsistent, et `reactCompiler` est ACTIF dans
`next.config.ts`. Elles ne cassent rien aujourd'hui, mais ce sont les règles sur lesquelles
le compilateur décide de mémoïser : le genre de bug qui n'apparaît qu'en production.
⚠️ **CORRIGÉ le 28/08 : « dix-huit composants routés » était faux.** Trente-deux des
cinquante-cinq problèmes vivaient dans sept fichiers que RIEN n'importait — l'ancienne
landing de prévente — dont la TOTALITÉ des `react-hooks/refs`, `exhaustive-deps` et
`immutability`. Aucun compilateur ne les voyait passer. Ces fichiers sont désormais dans
`archive/landing-waitlist/` (voir D12). Restent 23 problèmes en code servi : 19
`set-state-in-effect`, 1 `purity`, 3 variables mortes.

D7 (27/08/2026) — La grille de photos de `/admin/atelier/[token]` sert les ORIGINAUX R2
(plafond 5200 px, plusieurs Mo pièce) dans des vignettes de 84 px. À l'ouverture d'une
fiche c'est de l'ordre de 35 à 45 Mo, et 250 à 350 Mo une fois la grille dépliée, décodés
sur le thread principal. C'est l'écran que l'atelier laisse ouvert toute la journée.
**Conséquence :** CORRIGÉ le 28/08/2026, par le chemin qui était annoncé ici. Le worker
produisait déjà une vignette de 320 px (`reduire.worker.js`) ; elle dormait dans IndexedDB
et ne quittait jamais le navigateur. Elle part désormais sur R2 en second objet, à côté de
l'original (`cleVignetteR2`, `numeros/<id>/photos/<photoId>/vignette.jpg`), et `donnees.ts`
la signe à côté. La grille sert ~20 Ko par case au lieu de plusieurs Mo.
Six points à ne pas défaire :
1. **La vignette part AVANT que la photo compte comme envoyée**, dans la foulée du PUT de
   l'original et sur le même `item.xhr`. Lâchée en tâche de fond, elle courrait contre la
   confirmation : `/complete` ferait son HEAD, ne trouverait rien, et l'objet arriverait
   une seconde plus tard — payé au stockage, lu par personne.
2. **Cette voie ne peut pas échouer.** Succès, refus, réseau coupé, chien de garde : toutes
   les issues mènent à `envoyee`, et aucune ne passe par `echecEnvoi()`, qui renverrait
   l'original tout entier. Perdre une photo pour un fichier de 20 Ko serait absurde.
3. **`vignette_key` est écrite par `/complete` après un HEAD**, jamais sur la déclaration du
   navigateur. Même règle que `taille` : seule la mesure fait foi. Une colonne remplie sur
   une promesse produit des cases vides, ce qui est pire que l'original lourd.
4. **Les deux lectures ont leur repli 42703** (`lirePhotos`, `marquerArrivee`). Sans eux,
   pendant la fenêtre entre le déploiement et la migration, une fiche n'afficherait AUCUNE
   photo et un dépôt en cours ne se confirmerait jamais — pas « sans vignettes », bloqué.
5. **La vignette est toujours `.jpg`**, quel que soit le format d'origine : ce n'est pas une
   copie du fichier déposé, c'est un canvas ré-encodé. Dériver son extension du MIME
   d'origine annoncerait un `.heic` contenant du JPEG.
6. **Le dépliage par tranches de douze RESTE.** Les dossiers antérieurs n'ont pas de
   vignette tant que `scripts/vignettes-rattrapage.ts` n'est pas passé, et un HEIC que le
   navigateur n'a pas su décoder n'en aura jamais — la fiche retombe alors sur l'original,
   exactement comme avant.
Rattrapage des dossiers existants : `npx tsx --tsconfig tsconfig.json
scripts/vignettes-rattrapage.ts` (`--essai` pour compter sans écrire). Idempotent, ne se
lance pas tout seul : une relève quotidienne qui télécharge des originaux serait une
facture de sortie R2 récurrente pour un travail qui, par nature, se termine.
⚠️ Le script verse `.env.local` dans `process.env` avant tout appel à `r2.ts`. Sans ce
geste il annonce ses photos puis s'arrête sur « R2_ENDPOINT manquant » : `r2.ts` est écrit
pour Next, qui charge le fichier tout seul — un script lancé par tsx n'a pas ce service.
**MESURÉ le 28/08 sur la base de production**, migration appliquée et rattrapage passé :
49 photos confirmées, **66,2 Mo d'originaux contre 0,62 Mo de vignettes — 107 fois plus
léger**. Aucune photo indécodable. Seconde exécution : « rien à rattraper », l'idempotence
tient.

D8 (27/08/2026) — INCIDENT, et il change le contexte de D4. Pendant l'audit, des
`git add -A` ont fait entrer dans les commits de la branche les quatre dossiers
volontairement non versionnés : `design-explorations/`, `assets/typo/`,
`legal-source/` et `bellajour_layout_template.schema/`. La branche a été poussée sur
GitHub, qui est PUBLIC. Elle a depuis été supprimée du dépôt distant et le travail
rejoué sur une branche propre ; `main` n'a jamais été touchée.
Ce qui a tenu : le `.gitignore` de D2. Les 76 polices non redistribuables ont bien
été écartées, seules les 60 libres sont montées. Aucune violation de licence.
Ce qui est passé : les explorations de direction artistique, les sources légales
`.docx` et le schéma de gabarits.
**Conséquence :** deux règles pour la suite. (1) Ne JAMAIS faire `git add -A` à la
racine de ce dépôt tant que D4 n'est pas tranchée — nommer les chemins, ou passer
par `git add -p`. (2) Ces dossiers sont désormais SUIVIS par un commit qui a existé
publiquement : si D4 conclut à ne pas les publier, en tenir compte, une suppression
de branche ne réécrit pas ce qui a pu être cloné.
⚠️ Corollaire du même incident : un `git reset --hard` a effacé
`design-explorations/` du disque, parce que le commit accidentel l'avait rendu
suivi. Restauré et recompté (123 fichiers, 958 polices). C'est exactement le
scénario contre lequel D4 met en garde, et il s'est produit PARCE QUE les dossiers
avaient été commités par erreur. Un dossier non versionné est plus sûr qu'un
dossier versionné à moitié.

D9 (28/08/2026) — Le footer crème (`src/app/sections/Footer.tsx`, servi par `/preventes`,
`/preventes/prix`, `/merci`, les trois pages ambassadeurs et `/lancement`) a VOCATION À
DISPARAÎTRE. Décision de Mathias. C'est pourquoi le lien TikTok n'y a pas été posé alors
qu'il l'a été dans le footer sombre de l'accueil.
**Conséquence :** ne rien y investir. Les correctifs de tokens du 27/08 qui le remettent
d'aplomb restent utiles tant qu'il est servi, mais toute nouvelle fonctionnalité va dans
`(atelier)/components/Footer.tsx` uniquement. Le jour où les pages qu'il sert seront
retirées ou refondues, il part avec elles — ainsi que le composant partagé
`components/InstagramLink.tsx`, dont il est le dernier appelant routé (les trois autres
sont hors routage, sauf `/inviter`).

D10 (28/08/2026) — Le récit de l'univers garde le DÉFILEMENT NATIF. Le problème posé
était réel : qui descendait vite déclenchait sept secondes de chorégraphie et traversait
des écrans à moitié écrits. Trois pistes ont été pesées, deux écartées.
- **Forcer le clic, supprimer le défilement** : écarté. C'est la famille de bugs que ce
  dépôt connaît déjà — `globals.css` porte un `overflow-anchor:none` posé À CAUSE du
  défilement piloté de la prévente, qu'il a fallu réactiver sur `/preventes/prix` parce
  que la barre d'URL de Chrome/Android faisait sauter le contenu. S'y ajoute la casse du
  clavier, de Page suivante, de la recherche dans la page et des lecteurs d'écran — sur
  un trafic majoritairement tactile, le pire terrain possible.
- **N'ouvrir le défilement qu'une fois tout chargé** : écarté. Ne traite pas la cause. Le
  problème n'est pas le chargement, c'est une chorégraphie qui démarre sans son lecteur.
- **RETENU : la révélation s'adapte au rythme du lecteur.** Le séquenceur mesure la
  vitesse de défilement ; au-delà du seuil, la page pose `.vite`, ses retards tombent à
  zéro et son fondu se réduit à `--dur`. Elle est donc DÉJÀ COMPOSÉE quand elle passe.
  En dessous, la chorégraphie complète, inchangée.
**Conséquences, dans l'ordre où elles se casseraient :**
1. ⚠️ **Le drapeau `data-pilote` sur `<html>` n'est pas un détail.** Les DEUX boutons qui
   tournent les pages défilent eux-mêmes, à plus de 1600 px/s au moment où la page
   suivante franchit le seuil de l'observateur. Sans lui, un clic supprime la
   chorégraphie qu'il demande. Il vit sur le document parce que les deux boutons sont
   dans des composants DIFFÉRENTS (`Ouverture.tsx` et `Univers.tsx`) : aucun ne peut lire
   l'état local de l'autre. Les deux le posent, le retirent, et le nettoient au démontage.
2. ⚠️ **La vitesse est LISSÉE, et le seuil de 900 px/s n'est tenable que grâce à ça.** Le
   défilement arrive par à-coups : sur une mesure brute, un seul cran de molette suffirait
   à franchir 900 en pleine lecture calme. Ne pas retirer le lissage sans remonter le seuil.
3. ⚠️ **Le `!important` sur `transition-duration` est délibéré.** Plusieurs pages
   surchargent la transition de leurs propres éléments avec la MÊME spécificité et plus
   loin dans le fichier (`.sl2-scene .v[data-t].vu`) : elles gagnaient à l'ancienneté. Une
   valeur unique couvre toutes les propriétés déclarées, y compris celles qu'une page
   ajouterait demain.
4. Le fondu n'est pas supprimé, seulement raccourci : un texte qui surgit d'un coup fait
   un à-coup plus violent que le vide qu'on corrige.
5. La décision se prend à l'entrée et ne se rejoue pas : une page traversée vite reste
   composée si l'on y revient. On ne redéroule pas une séquence sous les yeux de
   quelqu'un qui remonte.

D11 (28/08/2026) — Vérifier une mise en production sur `bellajour.fr` juste après un push
peut montrer L'ANCIENNE VERSION pendant plusieurs minutes, sans que rien ne soit cassé :
le cache de périphérie de Vercel sert une copie (`x-vercel-cache: HIT`, `age` de plusieurs
centaines de secondes) qui référence les anciens fichiers. Ce n'est PAS Cloudflare, qui
répond `cf-cache-status: DYNAMIC` sur cette page.
**Conséquence :** le juge de paix est l'URL de déploiement Vercel
(`bellajour-prelaunch-git-main-….vercel.app`), qui contourne ce cache. Et un test
d'attente doit chercher un marqueur qui n'existe QUE dans la nouvelle version — chercher
une chaîne présente des deux côtés fait croire au succès immédiat. Les deux erreurs ont
été commises le 28/08.

D12 (28/08/2026) — Les sept fichiers de l'ancienne landing de prévente que plus rien
n'importait (`Hero`, `Anxiete`, `BrandIntro`, `Solution` et ses trois visuels, `Album`,
`FinalWaitlist`, `FAQ`, `StickyVText`, `StickyJoinCTA`) sont ARCHIVÉS, pas supprimés :
`archive/landing-waitlist/`, hors du périmètre d'ESLint et de `tsconfig`. Décision de
Mathias : « les supprimer, ce n'est plus jamais les retrouver ».
Ils portaient 32 des 55 problèmes ESLint du dépôt pour un gain nul — aucun bundle ne les
contient. Le lint ne parle désormais que du code qui tourne.
**Conséquence :** un fichier archivé s'ouvre, se lit, et revient par un `git mv`. Mais il
ne suit plus rien : ni les corrections de tokens du 27/08, ni les règles React. Le
ramener, c'est reprendre le travail où il s'est arrêté.
⚠️ `sections/Footer.tsx` n'est PAS parti : sept pages le servent encore (D9).
⚠️ `S1Hero`, `S2Collection`, `S3Method`, `S4Final` non plus : ils portent le texte de la
future page produit (voir CLAUDE.md), ils ne sont pas orphelins par accident.

D13 (28/08/2026) — `/preventes`, `/preventes/prix` et `/lancement` sont RETIRÉES de la
ligne. Décision de Mathias : « /preventes c'est du passé, on ne l'utilisera plus. »
Trois **307 temporaires vers `/`** dans `next.config.ts`, et le code dans
`archive/preventes/` et `archive/lancement/` (chacun son README).
**Pourquoi 307 et non 308 :** une permanente se grave dans le cache des navigateurs pour
des mois. Le jour où l'on voudrait rouvrir l'une de ces URL, les visiteurs déjà passés
continueraient d'être renvoyés sur `/` sans qu'aucun déploiement n'y puisse rien. Trois
lignes se retirent en dix secondes ; une 308 ne se retire pas du navigateur d'autrui.
**Pourquoi une redirection et non un 410 :** les mails déjà partis (W6, P1, P2) pointent
sur /preventes, et 14 fondateurs peuvent rouvrir un vieux message n'importe quand. C'est
l'argument que `lib/prevente.ts` oppose depuis le début au 404.
**Conséquence — trois choses vivaient dans `preventes/` et servaient AILLEURS.** Sorties
avant l'archivage, sans quoi `/ambassadeurs` et `/merci` seraient tombées avec :
- `pricing.ts` → `src/lib/pricing.ts` (le calculateur ambassadeur s'en sert) ;
- `navbar.css` → `src/app/components/navbar.css` (`AmbassadeurNav` et `/merci`) ;
- `Navbar.tsx` → RÉÉCRIT en `src/app/merci/Navbar.tsx`. Pas recopié : celui de la
  prévente observe `#s1` pour devenir solide et fait défiler vers `#s4`, dont aucun
  n'existe sur /merci. L'observateur ne s'armait jamais, la barre restait transparente
  au-dessus d'un fond crème, et « Participer aux préventes » menait à rien.
Le logo de `AmbassadeurNav` pointe désormais `/` tout court (il préservait le `?ref` vers
la racine de la prévente ; un code de parrainage de prévente n'a rien à dire à l'Atelier).
Les liens de `/merci` aussi.
⚠️ **Le drapeau `PREVENTE_FERMEE` reste indispensable.** Il ferme `/api/checkout` et
bascule `/api/offer-state` — deux routes qui n'ont PAS bougé. Vérifié en production le
28/08 : `offerMode: "closed"`, 100 fondateurs sur 100.
⚠️ **Ne pas confondre retirer les pages et effacer la prévente du produit.** Les CGV v3.0
maintiennent 14 fondateurs en régime transitoire. `/api/webhook` (les remboursements),
`/merci`, `/inviter`, les pages légales, les crédits de parrainage et `lib/prevente.ts`
sont intacts. Ce qui est archivé, ce sont les pages de VENTE, pas le contrat.


D14 (28/08/2026) — **Le questionnaire n'a plus de question facultative.** Déclenché par un
dossier réel : le 27/08, une cliente venue de l'extérieur a rempli l'occasion et l'histoire,
puis est arrivée dans l'atelier **sans titre et sans une seule photo**. Rien n'avait échoué.
Les écrans 1, 2 et 3 laissaient passer un champ vide, l'écran 3 proposait même explicitement
« Je ne sais pas encore, choisissez pour moi », et `POST /api/atelier/numero` n'exigeait que
le prénom et l'email. Un dossier incomplet n'était pas un accident : c'était le comportement
normal.
**Ce qui est exigé désormais** — occasion, histoire (20 caractères), titre, prénom, email,
téléphone. Les six, des deux côtés.
**Une seule source : `src/lib/atelier/questionnaire.ts`**, module PUR, lu par le
questionnaire ET par la route. Deux copies de la règle auraient divergé au premier
ajustement, et la divergence se serait vue au pire endroit : un écran qui dit « c'est bon »
suivi d'un serveur qui répond « non ».
**Pourquoi le serveur revérifie tout.** Un navigateur ne garantit rien : un brouillon
localStorage d'une version antérieure (créé quand l'occasion et le titre étaient
facultatifs), un onglet resté ouvert pendant un déploiement, un appel direct. La route
renvoie `{ error: "champ_manquant", champ }` et le questionnaire repose la cliente sur
l'écran concerné — un « réessayez » devant un formulaire qui a l'air complet ne se répare
pas tout seul.
**Pourquoi 20 caractères pour l'histoire, et pas plus.** Le seuil est calé sur un dossier
RÉEL : la cliente du 25/08 a écrit « On doit ressentir les 9 ans d'amour » (35 caractères).
C'est court, et c'est un vrai brief. Un seuil à 60 l'aurait renvoyée à son clavier pour rien.
**Le téléphone n'est plus facultatif** (décision de Mathias, avec l'explication à l'écran).
Cloudprinter l'EXIGE dans l'adresse de commande : sans lui, on envoyait le numéro de
l'atelier à sa place (repli `TELEPHONE_CONTACT`, impression.ts) et le transporteur appelait
donc Bellajour le jour où il ne trouvait pas la porte. Il est stocké NORMALISÉ
(« 0769710686 » depuis « 07 69 71 06 86 ») : c'est la forme que Cloudprinter attend, et la
normaliser au moment de la commande obligerait à refaire le même travail des deux côtés.
Une phrase à l'écran dit à quoi il sert — un champ obligatoire dont on tait la raison se lit
comme un fichier qu'on constitue.
⚠️ **Cela ne répare PAS la cause des photos manquantes.** Les six champs sont remplis avant
l'écran 5 ; l'abandon, lui, a lieu APRÈS. Ce qui manque est ailleurs et reste à faire : rien
ne part au moment de la création du dossier (elle donne son email et reçoit le silence), et
M2 arrive entre 24 h et 46 h plus tard selon l'heure d'inscription, parce que le seuil est à
24 h et que la relève passe une fois par jour à 7 h UTC.

D15 (28/08/2026) — **Elle croyait avoir fini.** Suite de D14, et c'est la partie qui
coûtait le plus. Le dossier du 27/08 n'était pas seulement incomplet côté atelier : la
cliente n'avait aucune raison de se douter qu'il manquait quelque chose. Trois causes,
trois correctifs.
**1. L'écran 4 se refermait sur lui-même.** « Où vous envoyons-nous votre couverture ? /
Vous la recevez sous 48 h. Gratuitement, sans engagement. » — on donne ses coordonnées, on
reçoit sa couverture. Rien n'annonçait le dépôt. La promesse reste, mais une phrase
annonce l'étape suivante et le bouton la NOMME : « Passer à mes photos », plus
« Continuer », qui sur un dernier écran de coordonnées se lit comme « valider ma demande ».
**2. M0, l'accusé, part maintenant à la création du dossier.** Avant, le premier mail du
parcours était M1, qui exige un dépôt TERMINÉ : une cliente qui s'arrêtait à l'écran 5
donnait son adresse et recevait le silence, jusqu'à M2 le lendemain (voire le
surlendemain).
Il **ne remercie pas, il dit ce qui manque** : un accusé « nous avons bien reçu votre
demande » confirmerait le malentendu au lieu de le lever. Il porte aussi le lien permanent
du numéro — avant lui, le token ne vivait que dans le localStorage de son appareil, et un
onglet fermé rendait le dossier injoignable.
**Template Brevo 38**, poussé et vérifié le 28/08 (`node scripts/mails-atelier.mjs
--pousser --seulement M0` — le drapeau `--seulement` est né ici : `--pousser` seul
réécrit les dix templates, dont neuf qui n'avaient rien demandé). `BREVO_TEMPLATE_M0_ID`
est posé en local ; **tant qu'il ne l'est pas sur Vercel, M0 ne part pas en production**
et la page santé l'annonce.
**Ses bornes, tenues par verif-atelier :** la relève ne le rattrape que si le dossier a
MOINS de 24 h (au-delà, M2 dit la même chose en mieux) ; jamais deux fois (verrou
`mails_envoyes`) ; jamais à un dépôt terminé ; jamais rétroactivement aux dossiers
antérieurs au branchement. Best-effort strict : une création de dossier ne doit jamais
échouer sur un mail.
**3. L'admin affichait « Photos reçues » avec zéro photo.** C'est l'état de NAISSANCE d'un
dossier (`photos_recues`), posé à la fin de l'écran 4, bien avant le dépôt — et c'est ce
qui a fait lire un dossier ouvert comme une demande complète. La ligne porte désormais le
tag « dépôt non terminé » à côté du titre, avec deux libellés distincts au survol (aucune
photo / photos là mais jamais envoyées). Le libellé de l'état n'a PAS bougé : changer la
valeur de l'enum demanderait une migration pour un problème d'affichage.
⚠️ **Ce qui reste ouvert et n'est PAS traité ici** — M2 arrive encore entre 24 h et 46 h
selon l'heure d'inscription ; une seule relance part à vie (`sante.ts` exclut volontairement
le dépôt non terminé des « oubliés », correction du 25/08 qu'il ne faut pas défaire à la
légère) ; aucun rebond Brevo n'est traité, donc une adresse mal tapée tue le dossier en
silence.

D16 (29/08/2026) — **Le seuil de relance du dépôt passe de 24 h à 12 h.**
`DELAI_RELANCE_DEPOT`, dans mails.ts, nommé plutôt que laissé en `JOUR` : c'est un
réglage produit, pas une unité de temps.
**Pourquoi.** Le seuil n'est PAS le délai réel. La relève ne passe qu'une fois par jour
(7 h UTC, et Vercel déclenche dans l'heure qui suit) : le mail part au premier balayage
POSTÉRIEUR au seuil. À 24 h, le « J+1 » annoncé valait donc entre 24 h et 46 h selon
l'heure d'inscription. Cas mesuré, et c'est le dossier qui a lancé tout ce chantier :
ouvert le 27/08 à 10 h 24 UTC, il n'avait que 20,6 h au balayage du 28/08 à 7 h — rien
n'est parti ; sa relance n'est tombée que le 29/08 à 7 h 20, quarante-cinq heures plus
tard. Deux jours de silence pour quelqu'un qui venait de laisser son adresse.
À 12 h, toute inscription d'avant ~19 h est relancée le lendemain matin, et le pire cas
retombe à ~31 h.
**Pourquoi pas plus bas.** En dessous, ce n'est plus le seuil qui borne mais le passage
quotidien de la relève : on gagnerait zéro minute. Et le plancher est humain — quelqu'un
qui commence son dépôt le soir doit pouvoir le finir le lendemain sans avoir été relancé
entre-temps.
⚠️ **LE FILET DE M0 A DÛ SUIVRE, ET C'EST LE VRAI PIÈGE DE CE CHANGEMENT.** Le bloc qui
rattrape un M0 raté se termine par un `break`. Sa borne était `JOUR` : la laisser là
pendant que M2 descendait à 12 h aurait créé une fenêtre de douze heures où un dossier
partait avec M0 et **n'atteignait jamais la relance** — un mail d'accusé à la place
d'une relance, sans rien dans les logs pour le dire. Les deux bornes lisent désormais la
MÊME constante et ne peuvent bouger qu'ensemble. Cinq assertions le verrouillent
(« aucun trou entre l'accusé et la relance »), dont une qui rejoue le dossier réel du
27/08.

D17 (29/08/2026) — **Les rebonds Brevo sont écoutés, et la faute de frappe attrapée
avant.** `sendBrevoEmail` ne savait qu'une chose : Brevo a ACCEPTÉ le mail. Le verrou de
`mails_envoyes` l'enregistrait comme « envoyé », alors que le verdict réel (arrivé,
rebondi, bloqué) tombe quelques secondes plus tard et que personne ne l'écoutait.
Conséquence d'une adresse mal tapée : M0 rebondit, la cliente ne reçoit jamais son lien,
ne dépose rien, M2 rebondit à son tour, et comme une seule relance part à vie, le dossier
meurt. Dans l'atelier, il ressemblait à une cliente qui prend son temps. **C'était le seul
point du parcours qui échouait sans laisser de trace nulle part.**
**Deux couches, et l'ordre compte.** Le garde-fou de saisie évite ; le webhook rattrape.
Aucun des deux ne suffit seul : un garde-fou ne connaît pas les domaines d'entreprise
morts, et un webhook n'arrive qu'après.
**La règle vit dans un module PUR** (`rebond.ts`) : `hard_bounce`, `blocked`,
`invalid_email` → adresse morte ; `spam` → elle a REÇU (deux phrases différentes dans le
journal, sinon on appelle une cliente pour lui dire qu'on n'arrive pas à la joindre) ;
`soft_bounce` et `deferred` → ignorés, ils sont temporaires et Brevo réessaie.
**Le secret reste dans un en-tête.** Brevo ne signe pas ses webhooks, mais il accepte des
en-têtes personnalisés (vérifié dans leur documentation avant d'écrire la route) : la
règle du projet tient, aucun secret dans l'URL.
**Le webhook ne décide RIEN** — aucun changement d'état, aucun mail. Selon le dossier, la
bonne suite est un coup de téléphone, une adresse corrigée à la main, ou rien. Une machine
qui trancherait se tromperait, et en silence.
**Aucune migration** : `evenements` porte le signal, comme `remboursement`. La liste le lit
dans la MÊME requête que les remboursements — deux allers-retours pour une poignée de
lignes auraient coûté la même latence deux fois à chaque ouverture de la table de travail.
⚠️ **Damerau et pas Levenshtein**, et ce n'est pas de l'académisme : l'inversion de deux
lettres voisines est la faute de frappe la plus fréquente, et Levenshtein la compte pour
DEUX opérations. Avec un plafond à 1, le garde-fou ratait `gmial.com` — le cas nº1 qu'il
était censé attraper. Mesuré, corrigé, verrouillé par assertion.
⚠️ **Le plafond reste à UN caractère.** À deux, on se met à « corriger » des domaines
parfaitement réels (`free.fr` vers `live.fr`), et une suggestion fausse est pire que pas
de suggestion : elle invite la cliente à casser une adresse qui marchait.
**Éprouvé en local** : les cinq portes du webhook (sans secret 404, mauvais secret 404,
`delivered` ignoré sans toucher la base, adresse inconnue 204, corps illisible 400), le
chemin réel (1 dossier journalisé) et son REJEU (0, idempotence par `message-id`). La
fausse alerte de test a été retirée du journal — l'adresse de Flore fonctionne, son M2 a
été remis le 29/08 à 08:20.
