# Le moteur de mise en page : registre des couches

Le point d'entrée de tout travail sur ce que la machine VOIT, PROPOSE et APPREND dans l'éditeur
`/admin/atelier/mise-en-page`. Une couche = une fiche dans `couches/`. Une recette de Mathias = un rapport daté dans `recettes/`.

But final : un visuel client entièrement automatique, où le client ne fait que choisir. Chemin : l'éditeur interne,
puis des couches successives (règles, algorithmes, IA), chacune testable vite, mesurée, et qui laisse des données
pour entraîner un modèle plus tard.

## La règle (aucune exception)
Une couche n'existe que si elle a :
1. **sa fiche** ici (ce qu'elle fait, ses règles Rxx, ses réglages, son code, son test, ses limites) ;
2. **son test au harnais** (`scripts/verif-mep-editeur.ts`, lancé par `verif-atelier.ts`) ;
3. **ses réglages nommés** dans `src/lib/mise-en-page/editeur/reglages.ts`, jamais un nombre épars ;
4. **un rejeu** sur des photos réelles avant d'être proposée (`scripts/calibrer-lecture.ts` sur un dossier du disque,
   puis les instantanés `mep_instantanes` quand ils existent) ;
5. **une ligne dans le tableau ci-dessous** et, après chaque recette, une ligne dans son historique.

Un réglage ne change que sur un oui de Mathias, avec la preuve chiffrée (leçons ou rejeu). La règle détaillée vit dans
`docs/reference/REGLES-TRI.md` (Rxx) ; la fiche dit POURQUOI et OÙ, la règle dit QUOI.

## Les couches

| Fiche | Couche | Règles | Statut au 12/11 |
|---|---|---|---|
| [C01](couches/C01-mesures.md) | Mesures : netteté, empreinte, lumière | R72, R73 | EN PROD (lot A, 12/11), testé par Mathias le 10/11 |
| [C02](couches/C02-piles.md) | Piles : rafales, doublons, similaires | R74 à R77, R93 | EN PROD (lot A, 12/11), recalibré le 10/11 |
| [C03](couches/C03-defauts.md) | Défauts : sombre, brûlée, capture, visage flou | R85 (A3, A4, A7) | EN PROD (lot A, 12/11) |
| [C04](couches/C04-visages.md) | Visages détectés, jamais reconnus | R81 | EN PROD (lot A, 12/11) |
| [C05](couches/C05-zone-pli.md) | Zone importante, recadrage par contenu, pli | R82, R83 | EN PROD (lot A, 12/11) ; pli = HYPOTHÈSE 5 mm |
| [C06](couches/C06-pretri.md) | Pré-tri avec raisons, objectif, équité | R84 à R87, R89 | EN PROD (lot A, 12/11) |
| [C07](couches/C07-horloges.md) | Horloges entre téléphones | R88 | EN PROD (lot A, 12/11) |
| [C08](couches/C08-moments-lieux.md) | Moments, séjours, lieux, faits | R70, R71, R91 | EN PROD : moments et lieux (#352), faits (lot A, 12/11) |
| [C09](couches/C09-palette.md) | Palette | R92 | EN PROD (lot A, 12/11) ; pas encore reliée aux aplats |
| [C10](couches/C10-gabarits.md) | Choix du gabarit et sa note | R66, R67, R69, R83 | EN PROD (#351, #352) ; pli (lot A, 12/11) |
| [C11](couches/C11-qualite-export.md) | Qualité d'impression, contrôle avant export | R68, R90 | EN PROD : dpi (#352), contrôle avant export (lot A, 12/11) |
| [C12](couches/C12-memoire.md) | Mémoire : réglages, leçons, instantanés | R78 à R80, R89 | EN PROD (lot A, 12/11) ; tables `mep_lecons` et `mep_instantanes` créées (migration 20261110, vues en base le 12/11) |
| [C13](couches/C13-feuille-de-style.md) | Feuille de style : paire de polices, nuancier proposé, typographie française | R120 à R123 | Lot C (12/11), branche `feat/mise-en-page-feuille-de-style`, pas encore fusionnée ; remplit « palette pas encore reliée aux aplats » de C09 |

Le lot A (12/11) = la branche `feat/mise-en-page-couche1-mesures`, fusionnée dans `main` avec l'export PDF de #353 : l'instantané, le jalon et les trois questions valent pour Canva (PDF) comme pour Affinity (IDML).

## Les couches à venir (ordre décidé le 10/11)
- **Page Analyse** : entre « Démarrer » et l'éditeur, fait passer C01 à C09 sur tout le dossier et montre le rapport.
- **Sélection dans une rafale** (garder 2 ou 3 selon mouvement, expression, angle : R-32, R-34, R-36 du rapport
  « éditeur magique ») avec un banc qui mesure l'accord avec Mathias.
- **Familles de gabarits** générées (une structure, des variantes calculées) et une note expliquée.
- **IA** (yeux fermés, expressions, beauté, description) : après revalidation des clés et mesure du coût sur 3 dossiers.

## Où vivent les données d'apprentissage
| Donnée | Où | Lue par |
|---|---|---|
| Mesures par photo (netteté, empreinte, visages, zone, palette) | navigateur, IndexedDB `bj-mep-mesures` | l'écran ; l'instantané à l'export |
| Leçons (geste contraire à la machine, réponses aux questions) | `mep_lecons` (base), sinon l'appareil (500 au plus) | `scripts/lecons.ts` |
| Instantané d'un magazine exporté (jamais de pixels) | `mep_instantanes` | rejeu des règles futures |
| Réglages et leur version | `editeur/reglages.ts` (`versionReglages`) | chaque leçon emporte la version |
| Rejeu sur photos du disque | dossier de sortie local | `scripts/calibrer-lecture.ts` |

## Les recettes
Un fichier par séance de test : `recettes/AAAA-MM-JJ.md`, sur le modèle `recettes/MODELE.md`. Ce que Mathias a testé,
ce qu'il a dit (ses mots), ce qui a été mesuré, ce qui a changé, ce qui est enregistré et où.
