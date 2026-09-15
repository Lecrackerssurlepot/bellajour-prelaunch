---
id: T-091
titre: Réagir à la maquette, pas seulement partir — choix de thème/template + proposition freestyle
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-02
---
## Ce que Mathias a dit (02/09, brouillon)
« Aujourd'hui, si la maquette ne plaît pas au client, il ne peut que **partir**. » Plusieurs
solutions envisagées :

1. **Choix de thème dans le questionnaire**, en lien avec la question du titre (Q3) → la personne
   choisit un thème qu'elle aime déjà bien → **gain de temps pour nous** et on vise déjà juste sur
   ses goûts.
2. **On en met 5** (des visuels de thème). Si la personne n'en choisit aucun → on lui fait une
   **proposition freestyle**.
3. En faisant les premiers magazines, on verra l'intérêt de **demander l'ajout d'autres textes**
   (titre, sous-titre…) — ça aidera grandement la construction.

## Ce qui existe
`src/app/(atelier)/composer/coverModels.ts` : aujourd'hui 2 « modèles » d'exemple à l'écran 3,
explicitement **des exemples, pas un choix** (« rien n'est enregistré, aucune sélection n'a de
conséquence produit »). C'est exactement le socle à faire évoluer : passer d'« exemples » à
**« choix optionnel de thème »** (5 visuels), enregistré et transmis à l'atelier.

## La « porte de sortie douce » — réflexion de Mathias (02/09), proposée dans le prototype
Aujourd'hui, un client insatisfait ne peut que « répondre au mail » (ou partir). Proposition, montrée
dans le prototype v3 : une **feuille d'ajustement** accessible depuis l'aperçu — « Ce n'est pas tout
à fait ça ? » → le client **coche** ce qui cloche (l'ambiance/les couleurs, une photo, le titre, la
mise en page, autre) + un mot facultatif, et ça part à l'atelier **en 2 taps, sans écrire de mail**.
Il reste dans le flux ; l'atelier reçoit une **demande de retouche structurée**.
Techniquement : se branche sur le mécanisme existant `retouches_demandees_le` (aujourd'hui déclenché
par un lien discret « j'ai noté des retouches dans le Canva » à l'état `maquette_prete`), en le
rendant possible **dès l'aperçu** (`apercu_pret`) et avec un **payload de motifs** journalisé dans
`evenements` (au lieu d'un simple booléen). À confirmer par Mathias avant de le poser en prod.

## ✅ La feuille d'ajustement est FAITE (02/09, sur la branche `feat/numero-mobile-achat` / PR #30)
Le pop-up est en place sur `/numero` à l'état `apercu_pret`, fidèle au prototype :
- **Front** : `FeuilleAjustement.tsx` (chips des 5 motifs + un mot libre facultatif, « Envoyer à
  l'atelier », état « c'est noté » après envoi). Déclenché par « Ce n'est pas tout à fait ça ? »
  qui remplace l'ancien « répondez au mail ».
- **Back** : la route PATCH `/api/atelier/numero` accepte `ajustement_mot` / `ajustement_motifs`
  **à l'état 2 seulement**, et journalise l'événement `ajustement_demande` dans `evenements`
  (append-only). **Aucun mail, aucun changement d'état, aucune migration** — donc rien qui touche
  une vraie cliente au déploiement, hormis rendre le geste possible. `recit.ts` le rend lisible dans
  le récit du dossier côté admin.
- **Remontée dans la pile admin — FAIT (02/09, PR #31)** : un ajustement demandé à l'état 2 fait
  **remonter le dossier en tête de « à faire »** (« ajustement demandé depuis X », daté depuis la
  demande), lu dans `evenements` sans colonne ni migration (`urgence.ts` option `ajustement`,
  `donnees.ts`). Au passage, le même oubli sur les retouches (état 4) a été corrigé. Limite v1 : le
  drapeau reste tant que le dossier est à l'état 2 ; un futur `ajustement_traite` l'effacerait.
- **Reste ouvert ici** : la partie **choix de thème / 5 visuels / freestyle** (ci-dessous), qui
  attend les fichiers de Mathias.

## Ce que je propose (à trancher avec Mathias)
- Étendre `coverModels` à **5 thèmes** avec un vrai visuel chacun, et rendre la sélection
  **enregistrable** (nouvelle donnée sur `numeros`, ex. `theme_choisi`), transmise à la fiche admin.
- Si aucun choix → drapeau « freestyle » côté atelier.
- Prévoir, côté couverture, des **champs texte supplémentaires optionnels** (sous-titre…), en plus
  du titre.
- ⚠️ Ne rien inventer comme visuels : les 5 thèmes attendent les fichiers de Mathias.
Recoupe T-089 (visionneuse) et T-092 (parcours, Q3).

## ✅ ÉTAPE 1 FAITE (15/09/2026, branche `feat/modeles-couverture-questionnaire`)

Mathias a livré les visuels par paires (avec et sans titre) et retenu quatre modèles : **Aussie,
Mon année, Sicile, This Night**. Quatre au lieu des cinq envisagés le 02/09.

**Ce qui est en place**
- `coverModels.ts` réécrit : quatre modèles réels, leur visuel, leur étiquette, et les **zones de
  titre MESURÉES** sur les paires livrées (voir `docs/reference/VISUELS-NOMMAGE.md`).
- Écran 3 : cinq cases choisissables — les quatre modèles + « Aucune préférence / Surprenez-moi ».
  Cliquer une case déjà retenue la libère. Le champ est **facultatif** et ne bloque rien.
- Le rapport des aperçus passe de **2/3 à 1/1,414** : le magazine est un A4, et on montrait au
  client une couverture qui n'avait pas la forme de l'objet qu'il recevra.
- `draft.ts` : `modele` persisté, et gardé par `brouillonSansDossier` (il appartient à la personne).
- `POST /api/atelier/numero` : liste blanche (`MODELES_VALIDES`), colonne `modele_couverture`,
  repli 42703/PGRST204 comme les mots de couverture, et le choix journalisé dans `numero_cree`.
- Fiche admin : « Style — Souhaite plutôt « Sicile » », ou « Aucune préférence — proposition
  libre ». Ce cas-là s'affiche AUSSI, contrairement aux mots de couverture vides : pour celui qui
  compose, le silence et le « surprenez-moi » ne veulent pas dire la même chose.
- `verif-atelier.ts` : trois assertions neuves (survie du style, liste blanche, zones bornées).

**⚠️ MIGRATION À APPLIQUER PAR MATHIAS** : `supabase/migrations/20260915_composer_modele_couverture.sql`.
Tant qu'elle n'est pas passée, le choix n'est PAS en colonne — il reste dans le journal
`evenements`, et la fiche admin ne l'affiche pas. Aucun dossier n'est perdu.

## Étape 2 — le titre vivant, en attente

Le titre tapé par le client ne s'écrit pas encore SUR les visuels. Il y faut **les fichiers des
quatre polices** (aucune n'est Cormorant ni DM Sans) et deux arbitrages de Mathias : le sort de la
seconde ligne (« 2026 », « MON ANNEE ») et la découpe des deux couleurs de This Night.
La **règle de découpe** est écrite et prête (`DECOUPE` dans `coverModels.ts`) : mesurer plutôt que
compter, conserver la masse plutôt que la taille, couper entre les mots en équilibrant les lignes,
trois paliers avec bascule sur un repli plutôt qu'une réduction sans fin, un plancher et un
plafond. Reste mécanique le jour où les polices arrivent.

## Arbitrages de Mathias du 15/09 (inscrits dans `coverModels.ts`)

- **La seconde ligne** (« 2026 », « MON ANNEE ») est un **texte fixe** posé par le site, **remplacé
  par le sous-titre** du client quand il en écrit un à l'écran 3. Elle ne disparaît jamais, elle
  change de source. C'est aussi ce qui donne enfin une destination visible au champ « sous-titre ·
  première de couverture », resté sans effet depuis le 03/09.
- **This Night sur un seul mot : on garde le blanc.** Le rouge de « THIS » accompagne, il ne porte
  pas le titre (`couleurSeule`).

## Identification des polices (15/09, sur la bibliothèque `assets/typo/`)

Mathias a ouvert l'accès à `assets/typo/` : 139 fichiers, 60 polices versionnées, 76 sur le disque
seulement. Comparaison faite en superposant le lettrage d'origine découpé dans chaque master et le
même mot rendu dans chaque candidate plausible (planche dans `design-explorations/planche-typo/`).

| Modèle | Lettrage d'origine | La plus proche de la bibliothèque | Verdict |
|---|---|---|---|
| Q01 Aussie | script fin, connecté, capitale à longue boucle | **Interlope** (OFL 1.1) | proche d'esprit, **pas la même** |
| Q02 26 | mêmes formes que Q01, chiffres à déliés | **Interlope** (OFL 1.1) | idem |
| Q03 Sicile | didone, fûts épais et empattements filiformes | **aucune** | la bibliothèque n'a pas de didone |
| Q04 This Night | grotesque noire, terminaisons horizontales | **Aileron Black** | correspondance forte |

⚠️ **Aileron n'est pas versionnée** : aucun fichier de licence joint, donc tous droits réservés par
défaut (`LICENCES.md`). L'audit du 27/08 note qu'elle est en réalité publiée en **CC0 par Sora
Sagano** — il manque seulement la notice qui le prouve. La récupérer depuis la source d'origine
suffit à débloquer Q04.

⚠️ **Q03 attend le vrai nom de la police** auprès du graphiste. Cormorant Garamond, notre serif, est
une garalde à contraste modéré : ce n'est pas la même chose qu'un didone à empattements filiformes,
et la substituer se verrait.

## ⚠️ LA CONTRAINTE QUI COMMANDE TOUT : `assets/` N'EST PAS `public/`

`assets/typo/README.md`, écrit à la création de la bibliothèque : « Tout ce qui vit sous `public/`
est servi par Vercel à une URL devinable. Y poser une police, c'est la mettre en téléchargement
libre sur bellajour.fr. **Plusieurs licences de cette bibliothèque l'interdisent nommément.** »

Servir une police en webfont, c'est exactement la poser à une URL publique. Donc :
- les **60 polices en OFL 1.1 / Apache** peuvent être servies (Interlope en fait partie) ;
- les **76 autres ne le peuvent pas** — Comico, Rheiborn Sans et Muro l'interdisent noir sur blanc,
  les autres n'ont aucune licence jointe.

Et « intégrer toutes les typos » n'a de toute façon pas de sens côté poids : 11,5 Mo pour les
versionnées seules, là où l'écran 3 a besoin de **quatre** familles.

## ✅ ÉTAPE 2, MOITIÉ FAITE (15/09/2026) — le titre vivant sur Aussie et 26

Mathias : « utilise Interlope pour Aussie et 26 en attendant. » Ces deux modèles servent
désormais leur **plaque nue**, et le titre du client s'y écrit **en direct**, en Interlope
(OFL 1.1, Gabriel Dubourg — le fichier et sa licence vivent dans
`src/app/(atelier)/composer/polices/`, chargés par `next/font/local` **dans le layout du
questionnaire seul**, pour ne pas les précharger sur l'accueil et /magazine).

Sicile et This Night gardent leur visuel titré. **Ne pas « harmoniser »** en mettant Interlope
partout : quatre modèles au même lettrage, c'est quatre fois le même modèle.

**Les couleurs ne sont pas choisies à l'œil** : relevées dans les masters (médiane du 2 % de
pixels les plus extrêmes de la zone du titre, soit le cœur du trait et pas son antialiasing).
Aussie `#345a94`, 26 `#ffffff`.

### La règle de découpe, mesurée en vrai

`decoupeTitre.ts` (pur, testé) + `TitreSurCouverture.tsx` (mesure au canvas). Relevé à l'écran
sur le build de production, vignette de 110 px :

| Ce que tape le client | Ce que fait la couverture | Corps |
|---|---|---|
| « Papa » | une ligne, **plafonnée** | 17,92 px |
| « Corse » | une ligne, même plafond | 17,92 px |
| « Anniversaire » | un seul mot : pas de césure, ça rétrécit | 11 px |
| « Le mariage de Léa et Tom » | **« Le mariage » / « de Léa et Tom »** | 8,96 px |
| « Nos trois jours en Bretagne » | « Nos trois jours » / « en Bretagne » | 8,96 px |

Aucun débordement dans les cinq cas (`scrollWidth`/`scrollHeight` vérifiés). Les deux titres
courts tombent à la MÊME taille : c'est le plafond qui joue, et « Papa » ne devient pas une
affiche. Aucune ligne ne se termine par un mot-outil.

### Deux pièges payés ici

- **`measureText` ne résout pas `var(--x)`**, et `next/font` **hache** le nom de famille
  (`__interlope_a1b2c3`) : il n'existe qu'à travers la variable CSS. Le composant lit donc la
  valeur *calculée* de la variable avant de mesurer. Renommer la variable casserait la mesure en
  silence — le titre retomberait sur la police de repli, à la mauvaise taille.
- **Le plancher ne borne pas le résultat, il déclenche la deuxième ligne.** Posé d'abord en
  `Math.max`, il faisait sortir « Le mariage de Léa et Tom » du cadre par la droite.

### Reste à faire

- **Sicile** : le nom de sa police, auprès du graphiste. La bibliothèque n'a aucun didone.
- **This Night** : la notice CC0 d'Aileron, à récupérer depuis la source d'origine.
- **À regarder à l'écran** : sur « Mon année », la zone du titre est celle du petit « 26 » en haut
  à gauche — un titre long y devient très petit. C'est fidèle au modèle livré, mais c'est la seule
  des quatre où ça se voit. Si ça ne va pas, la zone se déplace en une ligne dans `coverModels.ts`.

## ✅ ÉTAPE 2 TERMINÉE (15/09/2026) — les quatre modèles portent le titre du client

Mathias : « et bien on cherche d'autres typo. » Google Fonts donne les deux qui manquaient, en
OFL, auto-hébergées par `next/font` exactement comme Cormorant et DM Sans — aucun fichier à
pourchasser, aucune question de redistribution.

| Modèle | Police | D'où elle vient |
|---|---|---|
| Aussie | **Interlope** | `assets/typo/`, OFL 1.1, Gabriel Dubourg |
| Mon année | **Interlope** | idem |
| Sicile | **Bodoni Moda 700** | Google Fonts, OFL — un vrai didone, ce que la bibliothèque n'avait pas |
| This Night | **Archivo Black** | Google Fonts, OFL — même largeur, même graisse, même G à barre et éperon qu'Aileron, sans son problème de licence |

### Les trois dispositions

Les quatre maquettes ne posent pas leur lettrage de la même façon. Les traiter pareil serait
coller quatre fois le même bloc de texte sur quatre images différentes.

- **`simple`** (Aussie, Mon année) : un bloc dans la zone mesurée.
- **`haut-et-bas`** (Sicile) : le titre **deux fois**, en haut et en bas. La maquette répète le
  mot quatre fois autour de la photo ; le profil de lignes mesuré le 15/09 montre deux bandes
  pleines (17→28 % et 71→83 %) et deux bandes du milieu dont la photo ne laisse voir que le S et
  le E. ⚠️ **Limite assumée** : les deux répétitions du milieu ne sont pas reproduites, parce
  qu'elles passent DERRIÈRE la photo et que la plaque livrée est plate — il faudrait la photo en
  calque séparé. Les deux bandes pleines suffisent à faire lire le modèle.
- **`deux-tons`** (This Night) : première ligne dans l'accent (`#841600`, relevé), seconde en
  blanc, chevauchées de 0,22 em. ⚠️ Ce modèle **cherche les deux lignes d'abord**, pas en dernier
  recours : le ramener à une ligne blanche parce qu'elle tient en largeur effacerait le modèle.
  Sur un seul mot, le blanc seul — la règle de Mathias.

Relevé à l'écran sur le build de production, titre « Nuits Sonores » : Aussie une ligne bleue,
Mon année deux lignes blanches, **Sicile deux blocs** (haut et bas) en Bodoni, This Night
« Nuits » en `rgb(132,22,0)` puis « Sonores » en blanc. **Aucun débordement sur les cinq blocs.**

### Reste ouvert

- **« Mon année »** : la zone du titre est celle du petit « 26 » en haut à gauche, donc un titre
  long y est très petit. Trois issues, au choix de Mathias : déplacer le titre là où est
  « MON ANNEE », agrandir la zone, ou laisser. Une ligne dans `coverModels.ts`.
- Aileron n'est plus nécessaire : Archivo Black la remplace. La notice CC0 n'est plus un blocage.
