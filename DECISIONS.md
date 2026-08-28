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
⚠️ Quarante-cinq erreurs `react-hooks` subsistent dans dix-huit composants routés, et
`reactCompiler` est ACTIF dans `next.config.ts`. Elles ne cassent rien aujourd'hui, mais
ce sont les règles sur lesquelles le compilateur décide de mémoïser : le genre de bug qui
n'apparaît qu'en production. Non corrigées volontairement, chacune a sa raison propre.

D7 (27/08/2026) — La grille de photos de `/admin/atelier/[token]` sert les ORIGINAUX R2
(plafond 5200 px, plusieurs Mo pièce) dans des vignettes de 84 px. À l'ouverture d'une
fiche c'est de l'ordre de 35 à 45 Mo, et 250 à 350 Mo une fois la grille dépliée, décodés
sur le thread principal. C'est l'écran que l'atelier laisse ouvert toute la journée.
**Conséquence :** NON CORRIGÉ, parce que le bon correctif touche la chaîne d'envoi. Le
worker produit DÉJÀ une vignette de 320 px (`reduire.worker.js`) : il suffirait de la
déposer en second objet `vignettes/<r2_key>` au moment du dépôt et de la signer à côté de
l'original dans `donnees.ts`. Migration à prévoir pour les dossiers existants. En attendant,
paginer le dépliage par tranches de douze divise le pic par huit, sans rien toucher d'autre.

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
