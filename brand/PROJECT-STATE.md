# Chantier charte V2 : état

À relire au début de chaque séance. Le plan complet, en 7 phases et avec leurs gates, est dans
`/Users/mathiasdurand/.claude/plans/piped-tickling-melody.md`, résumé ci-dessous.

- **Branche** : `refonte-charte-v2`, partie de `main` (577736f1).
- **Copie de travail** : `/Users/mathiasdurand/bellajour-charte-v2`. Le dossier principal garde des fichiers Noël non versionnés qui diffèrent de `main`.
- **Règle** : on ne passe à la phase suivante qu'avec la gate verte ET « OK phase N » de Mathias.

## Phase 1 : la charte écrite (FAITE, gate fermée le 25/11/2026)

### Fait

**Les jetons et leurs scripts**
- `brand/tokens.json` : 174 jetons DTCG, dont 12 surcharges téléphone. Source : le banc RKkzi v7 « Blanc pur · Fraunces » et les variations du catalogue DEZh.
- `brand/scripts/build-tokens.mjs` génère `brand/build/tokens.css` (`--m-…`), `tokens.ts` et `mail.json`.
- `brand/scripts/contrastes.mjs` : 19 paires, toutes AA.

**Les fiches**
- `brand/charte/README.md` et les fiches A à O.

**Les pointeurs vers la nouvelle charte**
- `CLAUDE.md` à la racine : une section « Charte » qui pointe vers `brand/charte/README.md`.
- `docs/marque/CHARTE-GRAPHIQUE.md`, `MOTION.md` et `A-TRANCHER.md` : un bandeau « Remplacé ». `TON.md`, `STRUCTURE-INFO.md` et `PIEGES-VISUELS.md` restent valables.
- `.claude/skills/bellajour-brand-motion` : bandeau « PÉRIMÉ ».

**Vérifications** : `tsc` 0, lint 0 erreur (25 avertissements, tous antérieurs), build OK.

### Décisions tranchées par Mathias le 25/11

| Sujet | Décision |
|---|---|
| Accent | L'encre noire `#111111`. Aucun bleu. |
| Mode | Un seul mode. Les blocs nuit restent en accent ponctuel. |
| Étiquettes | Inter Tight. IBM Plex Mono sort de la charte. |
| États | Proposés par Claude, à valider en phase 2. |
| Police | Facile à changer, par rôle, voir D. |
| Variations du catalogue | Disponibles, désactivées par défaut, jamais dans les mails pour l'instant. |
| Icônes | Lucide, et des visuels datés dans `media.ts`. |
| Magazine 3D | Classique, construit une fois sous tous les angles, par un agent Fable 5.2. |
| Périmètre de la phase 4 | Ce que voit le client. L'admin et l'éditeur viendront plus tard. |
| Brochures | PDF numériques, en RVB. |

### Décisions prises par Claude (à contester si besoin)

- Deux points de rupture seulement : 700 et 901 px.
- Cinq rayons et trois ombres.
- Les tailles hors échelle deviennent des exceptions nommées.
- Le bord de champ passe de 18 % à 48 % pour atteindre 3:1.
- Les apparitions et les boucles se coupent avec « moins d'animations » ; le livre et la pile restent.
- L'ancien `MOTION.md` disait « tout se coupe ». **Conflit signalé.**

### Gate 1 : fermée le 25/11 par Mathias (« Okay pour l'instant »)

1. **Logo** : pas de SVG (dessiné dans Procreate). Mathias fournit un PNG transparent haute définition, vectorisé en phase 2 (fiche B).
2. **Valeurs « proposé »** : acceptées pour l'instant, validées à l'œil en phase 2 sur `/brand`.
3. **Format des brochures** : A4 portrait, tranché le 25/11 en phase 2 (fiche N).
4. **URL de la page Groupes** : à trancher en phase 4 (fiche L).

### Écarts découverts à l'étape 0

- L'inventaire avait été fait sur la copie locale, plus ancienne que `main`. Sur `main` existent aussi :
  - les pages `/offrir`, `/offrir/merci`, `/carte/<token>`, `/partenaires` et `/noel-preview` ;
  - `docs/marque/` ;
  - les logos `public/images/v2/ui/logo-bellajour-*.webp`.
- La liste de nettoyage de la phase 7 sera refaite sur `main` avant d'être montrée.

## Phase 2 : la vitrine `/brand` (FAITE, gate fermée le 25/11/2026)

### Fait
- `src/app/brand/` : `page.tsx` (lit `brand/build/tokens.ts`, aucune valeur recopiée), `Motion.tsx` (démo des courbes, sur geste), `brand.css` (que des `var(--m-…)`), `layout.tsx` (`noindex`).
- Les classes `.m-*` de `brand.css` sont les composants de la charte : la phase 4 les reprendra.
- `src/app/polices.ts` : les quatre polices en un seul endroit, une variable par rôle (`--police-titre`…). Interlope copiée dans `src/app/polices/` avec sa licence OFL.
- `build-tokens.mjs` : chaque famille de rôle passe par `var(--police-<rôle>, "Nom")`, le relais vers next/font.
- `middleware.ts` : `/brand` exige le cookie admin.
- Preuve sur une vraie construction (`next start`) : sans cookie, 307 vers `/admin/login` ; avec, 200 et `noindex, nofollow, nocache`.
- Vérifié à l'écran sur ordinateur et téléphone (375 px), sans débordement horizontal.

### Constat en passant
- En `next dev` local, le middleware ne bloque rien, `/admin` compris. La production redirige bien (307 vérifié). Ne pas tester une protection en mode dev.

### Retours de Mathias (25/11), appliqués
- Logo vectoriel tracé depuis son PNG blanc (fiche B). La version bleue n'est pas nécessaire.
- Signatures en fond et en pied : faites avec le logo, serrées et répétées. Le canson est retiré. Les points fins restent, sans usage prévu.
- Réseaux : formats habituels, gabarits à voir avec Louis. Priorité : la typo se lit sur n'importe quelle photo (fiche N).
- Mails : trop sobres. En phase 6 : magazines empilés pour la couleur, gros textes, jeu de graisses, côté atelier (fiche N).

- Brochures : A4 portrait (25/11), le 16:9 n'est pas retenu (fiche N).

### Gate 2 : fermée le 25/11 par Mathias (« Ok phase 2 »)
- Copie autonome de `/brand` publiée pour Louis : https://claude.ai/artifact/UprjSK57wJyHC3XNfeMpes (privée, Mathias la partage). À republier au même lien si la charte change.
- Les valeurs « proposé » restent acceptées telles quelles ; un retour de Louis se corrige dans `tokens.json` puis on régénère.

## Phase 3 : le magazine en 3D (FAITE, gate fermée le 25/11/2026)

### Fait (agent Fable 5.2, relu)
- `brand/assets/3d/magazine/` : `magazine.js` (modèle Three.js paramétré), `dimensions.js` (formule du dos recopiée d'`impression.ts`, 38 cas comparés, 0 écart), `angles.json` (6 angles), `exporter.mjs` (PNG transparents 2048 px + turntable MP4/WebM), `README.md`.
- Démo dans `exports/demo/` (couverture Rio, double page Australie), captures dans `exports/captures/`.
- Section « Magazine » sur `/brand` : glisser pour tourner, angles, mat/brillant, 24 à 60 pages. Three.js chargé à l'approche de la section seulement.
- Dépendances : `three` 0.187.0, `playwright-core` 1.65.0 (dev, utilise le Chrome installé, aucun navigateur téléchargé).

### À savoir
- Si `impression.ts` change, reporter la formule dans `dimensions.js`.
- La fiche J écrit `a-plat`, le modèle `pose-a-plat` : à aligner.
- Pas de feuilletage à l'ouverture ; dos sans titre.
- Retours de Mathias du 25/11 appliqués : 4e et dos blancs par défaut ; bloc en liasses décalées (effet de pages en tranche, tête et pied) ; rainure de charnière sur la 1re et la 4e ; ouverture bombée (galbe ~13 mm, éventail) et angle « ouvert » vu de plus bas (élévation 44°). Démo et vidéo refaites.

### Gate 3 (fermée le 25/11/2026)
Mathias : « Le 3D est validé. » Rendus et vidéo validés en local ; le test sur un vrai iPhone reste à faire en phase 5.

STATUS: PHASE 3 DONE

### Ajouts à la charte le 25/11 (après la gate 3)
- A : « Ton par public » (proposé).
- G : visuels préparés en avance, aperçu `/brand/visuels`, drapeau `valide`, emplacements dont `offrir.carte` (proposé, construit en phase 4).
- J : noms d'angles alignés (`pose-a-plat`), retours 3D consignés.

## Phase 4 : la refonte des pages client (lancée le 25/11/2026 au soir, en autonomie)

Mathias : « lancer la phase 4 en autonomie ! Pas en main car on a pas défini les visuels. »
- Tout reste sur `refonte-charte-v2` : aucune fusion dans `main` (la gate 5 et les visuels d'abord).
- Références visuelles validées : banc RKkzi (structure, Offrir, Magazine, Groupes, menu téléphone) et duplicata Essai photos 14BmVZ v4 (titre d'exemple tournant, section « La matière » dans l'écran, espacement normal).
- Visuels non définis : chaque emplacement de `media.ts` part d'une image existante du dépôt, marquée « provisoire ».

### Nuit du 25/11 : ce qui est fait (commits poussés sur `refonte-charte-v2`)

| Commit | Étape | Vérifié |
|---|---|---|
| f9b521bb | **Socle** : `brand/build/tokens.css` dans globals ; les jetons `--c-*` de l'atelier pointent vers les `--m-*` (anciennes valeurs dans `archive/ancienne-charte/`) ; 4 polices en `src/app/polices.ts` ; en-tête, menu téléphone, pied du banc ; `.m-btn` & cie dans `src/app/charte.css` | tsc, lint (0 erreur), build ; navigateur 390 et 1440 |
| 385ead02 | **Visuels** : `src/content/media.ts` (11 emplacements), `visuelPour`, harnais `scripts/verif-media.ts` (41/41), aperçu `/brand/visuels`, mode d'emploi dans G | harnais, tsc, lint ; navigateur 390 et 1440 |
| ada01f1e | **Garde-fou** `brand/scripts/controle-charte.mjs` | compteur : 616 couleurs, 7 719 px avant les pages |
| f1ad0e68 | **404 + error.tsx** (fiche K) | tsc, lint, build ; navigateur 390 et 1440, erreur provoquée par une route temporaire (retirée) |
| e1ca27f6, 856eda43 | **Pages légales** FR, EN, PT : habillage, sommaire, fil d'Ariane ; aucun texte légal touché | tsc, lint, build ; navigateur 390 et 1440 |
| 7c514dd6 | **/merci** : CSS seulement (en-tête et pied de prévente rhabillés depuis merci.css) | tsc, lint, build ; navigateur 390 et 1440 (état sans session Stripe seulement) |

### 26/11 : ce qui est fait (poussé sur `refonte-charte-v2`)

| Commit | Étape | Vérifié |
|---|---|---|
| 52794d3d | **Accueil** : port fidèle du banc (14BmVZ v4), GSAP 3.12.5, `Accueil.tsx` + `AccueilMotion.tsx` ; ancienne page dans `archive/accueil-v1-ouverture/` | tsc, lint, build ; navigateur 390 et 1440, 0 erreur |
| 0c5289f2 | **/magazine** : port du banc (éventail, gestes, fiche, FAQ = FAQPage, appel) ; grammage retiré du JSON-LD (aucune source) ; ancienne page dans `archive/magazine-kiosque/` | idem |
| 090a4e6a | **Tunnel** `/composer`, `/numero`, `/compte` : CSS seulement (échelle et polices de la charte) | `verif-atelier` TOUT PASSE ; navigateur 390 et 1440 |
| f1196ab8, 80ad9fd8 | **Édition collective, dépôt, Offrir, Groupes, Noël, inviter, ambassadeurs** : jetons d'espace, de texte, de rayon, de cible ; anciennes polices et jetons `--bj-*` remplacés | build ; navigateur (pages sans jeton seulement) |
| 966b0502 | **Favicon** : le « b » du logo, 3 variantes (`public/brand/favicon/`), défaut carré noir ; montrées sur `/brand` ; `brand/scripts/favicon.mjs` | rendu PNG relu à 16, 32, 512 |
| 9d1f4de2 | **SEO** : plan du site lu dans media.ts, `/partenaires` au plan, titres « · Bellajour » | sitemap et robots relus |
| fusion | **Outil Visuels** (`refonte-charte-v2-visuels`) fusionné ; `Visuel.tsx` lit `visuelDuJour` ; `BandeauApercuVisuels` dans le layout ; `revalidate = 300` sur `/` et `/magazine` ; emplacements `edition.*` (éventail, vitrine) | `verif-media` 111/111, `verif-atelier` TOUT PASSE ; `next start` + aperçu du 20/12 (cookie admin d'essai), `/` et `/magazine` à 390 et 1440 |

Garde-fou (`controle-charte.mjs`), pages client (hors admin et `src/lib`) : **318 couleurs / 5 192 px avant → 338 / 2 381 px après**. Les +20 couleurs sont les ombres et voiles du banc (accueil, magazine).

### Ce qui reste

1. Restes du garde-fou côté client, pour la phase 7 : `univers.css`, `ouverture.css`, `magazine/pdp.css`, `Kiosque.tsx`, `Corps.tsx` (plus routés, à archiver) ; `noel-preview/` (outil interne) ; les px fins du banc dans `accueil.css` et `magazine.css` ; les `@media` (une variable n'y est pas lue) ; tailles de titre > 30 px et `clamp()` des pages collectif.
2. `offrir.carte` et `groupes.brochure` : emplacements déclarés, pas encore branchés (la carte est dessinée en CSS, la brochure est une suite de pages-documents).
3. Images de partage propres à `/partenaires` (jpg) : en dur, hors librairie.

### Pas vérifié

- L'Édition collective avec un vrai jeton (Audencia interdite, éditions de test purgées) : seulement la page « lien inconnu ».
- `/offrir` et le bloc Noël de `/magazine` : drapeau carte cadeau fermé en local ; le bloc Noël n'est plus sous `.at-pdp`, ses règles de base suffisent en principe.
- `/numero` avec un vrai dossier, `/compte` connecté, `/merci` avec une session Stripe.
- `/brand` (section favicon) dans le navigateur.
- Lighthouse, axe : phase 5.

## Phases suivantes

| Phase | Contenu | État |
|---|---|---|
| 2 | Vitrine `/brand`, protégée, générée depuis `tokens.ts`, plus logo vectorisé et format des brochures | FAITE (25/11) |
| 3 | Magazine 3D (`brand/assets/3d/magazine/`) | FAITE |
| 4 | Refonte des pages client, une page par commit | en cours : toutes les pages client portées ou rhabillées, outil Visuels fusionné ; restes listés plus haut |
| 5 | Vérification par agents (Playwright, Lighthouse, axe) | à faire |
| 6 | Mails depuis `mail.json` | à faire |
| 7 | Nettoyage vers `archive/ancienne-charte/`, Notion, liste claude.ai | à faire |
