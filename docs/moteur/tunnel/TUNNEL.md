# Le tunnel d'analyse, tel que mesuré (passe 1, Joëlle, 17/11/2026)

Banc : `tunnel-2026-11-17/banc/` (hors git). Lancer depuis la copie de travail de l'éditeur :

```
npx tsx --tsconfig tsconfig.json /…/tunnel-2026-11-17/banc/tunnel.ts            # couches 1 à 3, 0 $
npx tsx --tsconfig tsconfig.json /…/tunnel-2026-11-17/banc/tunnel.ts --ia       # + couches 5 à 7 (plafond de passe : --plafond=0.60)
npx tsx --tsconfig tsconfig.json /…/tunnel-2026-11-17/banc/planches.ts          # planches-contact par chapitre
npx tsx --tsconfig tsconfig.json /…/tunnel-2026-11-17/banc/extrapolation.ts     # coût à 300, 500, 1 000 photos
```

Modules : `commun.ts` (chemins), `budget.ts` (grand livre), `fichier.ts` (couche 1), `visages.ts` (MediaPipe dans Chrome),
`pixels.ts` (couche 2), `ensembles.ts` (dérivés + couche 3), `ia.ts` (couches 5 à 7), `planches.ts`, `extrapolation.ts`.
Les fonctions de l'éditeur sont IMPORTÉES, jamais recopiées, sauf la mesure du navigateur (`mesuresClient.ts`, fichier React)
refaite ligne pour ligne dans `pixels.ts`.

Sorties : `sorties/joelle/passe-1/` : `photos.json` (164 entrées, toutes les infos), `ensembles.json`, `ia.json`, `voyage.json`,
`mesure-tunnel.json`, `extrapolation.json`, `ia/planche-1..11.jpg` (ce qui a été envoyé), `ia/voyage-entree.txt`, `planches/chapitre-1..7.jpg`.

## Le tunnel mesuré

| Couche | Entrent | Sortent | Durée | Coût réel | Note |
|---|---|---|---|---|---|
| 1 Fichier (EXIF) | 164 | 164 | 0,4 s | 0 | 141 datées, 0 GPS (131 blocs GPS vides), 8 dates estimées |
| 2 Pixels | 164 | 164 | 13,5 s | 0 | visages 4 s (vignette 320 px, comme l'éditeur) + 6 s (tuiles 1 024 px), mesures 3,6 s |
| 3 Ensembles | 164 | 161 vers l'IA | < 0,01 s | 0 | écartées : 1 sous une pile (doublon), 1 floue, 1 trop petite |
| 4 Lieux | 0 | 0 | | 0 | pas de GPS : non lancée |
| 5 IA planches (gpt-5.4) | 161 | 161 | 49 s | **0,2323 $** | 11 planches de 16, 0 photo sans réponse, 3 en parallèle |
| 6 IA regard fin (gpt-5.1) | 161 | 61 | 42 s | **0,1020 $** | 40 candidates (plafond 25 %) + 21 textes lisibles |
| 7 IA voyage (gpt-5.1, texte) | 161 | 7 chapitres | 46 s | **0,0472 $** | 6 640 jetons d'entrée, 3 890 de sortie |
| **Total** | | | **151 s** | **0,3815 $** | campagne : 0,7687 $ sur 10 $ |

Le plafond de passe (0,60 $) n'a pas été approché ; aucune réduction n'a été nécessaire. L'estimation a priori est vérifiée avant
le premier appel (refus si elle dépasse le plafond) ; elle reposait d'abord sur une règle de jetons d'image qui sous-estimait
gpt-5.4 d'un facteur 3 (corrigée dans `budget.ts` avec la mesure : carreaux de 32 px).

## Le budget (règle dure, `budget.ts`)

Avant chaque appel : estimation (jetons d'image + consigne, sortie probable et sortie maximale `max_output_tokens`) ; refus si
cumul de la campagne + estimation > 8 $ (arrêt) ou pire cas > 10 $ (plafond), ou si dépensé dans la passe + réservé en vol +
pire cas > plafond de la passe. Après chaque réponse : coût réel (jetons `usage` × prix de `lireLesPhotos.ts`) inscrit
immédiatement au grand livre, une ligne par appel (73 lignes pour cette passe).

## L'extrapolation (jetons réels de Joëlle, `extrapolation.json`)

Hypothèse prudente : toutes les photos passent l'entonnoir A, comme chez Joëlle (161 sur 164). Un lot non trié en écarte davantage.
Unités mesurées : planche de 16 = 0,0211 $ ; regard = 0,00167 $ ; 38 % des photos lues passent au regard (25 % + 13 % de textes) ;
voyage ≈ 0,031 $ + 0,0001 $ par photo.

| Photos | Règle actuelle de l'éditeur | Avec la règle de dégradation |
|---|---|---|
| 164 | 0,38 $ | 0,38 $ |
| 300 | 0,65 $ | 0,56 $ |
| 500 | 1,07 $ | 0,79 $ (planches de 25) |
| 1 000 | 2,10 $ | 0,92 $ (600 lues, planches de 25) |

**Règle de dégradation proposée** (chiffres en dollars ; « 1 € » est tenu tant que l'euro vaut au moins un dollar, taux non vérifié ici) :
- **R-D1.** Le regard fin est plafonné à 40 candidates + 20 textes lisibles, quel que soit le nombre de photos (au-delà de ≈ 160 photos, c'est lui qui pèse sinon).
- **R-D2.** Jusqu'à 400 photos lues : planches de 16. Au-delà : planches de 25 (cases de 307 px). Coût estimé 0,030 $ la planche : **à mesurer**, et
  la stabilité des réponses à 307 px **à prouver** (l'essai du 17/11 a montré que les petites vignettes font inventer).
- **R-D3.** Au-delà de 600 photos lues : une photo par groupe de similaires et au plus 12 par moment (les plus nettes) partent en planche ;
  les autres héritent des tags de leur voisine lue la plus ressemblante (empreinte). Plafond : 600 photos lues.
- Levier non chiffré : l'effort de raisonnement de la planche (« low ») ; la part des jetons de raisonnement n'a pas été relevée dans cette passe.

## La fiche de chaque tag

Colonne « Usage » : la règle qui le lit, ou qui le lira (cahier de règles, étape 2). Un tag sans usage est marqué **à retirer**.

### Couche 1 (0 $)

| Tag | Définition | Usage | Statut |
|---|---|---|---|
| `date` | heure locale de prise (EXIF brut) | chronologie, moments, chapitres, faits des textes | garder |
| `decalage` | fuseau de l'appareil (+11:00) | recaler deux appareils ; région du monde sans GPS | garder |
| `dateEstimee`, `statutDate` | date d'arrivée en galerie interpolée (numéro Samsung) ; exif, estimée, après, avant, inconnue | ranger les photos de messagerie | garder |
| `appareil`, `marque` | modèle | capture (R141), déposants | garder |
| `objectif` | principal, ultra grand-angle, télé, zoom numérique, selfie | plan large d'ouverture, détail au télé | garder (règle par modèle de téléphone) |
| `iso`, `ouverture`, `vitesse`, `focale`, `focale35` | réglages de prise | `bouge` (vitesse), `exterieur` (ISO) ; seuls, aucun | garder comme entrées, pas comme tags affichés |
| `flash` | le flash est parti | lumière « flash » | garder |
| `luminositeExif` | Bv de la scène | lumière, intérieur | garder |
| `gps`, `gpsBlocVide` | coordonnées ; bloc présent mais vide | couche 4 ; dire au client pourquoi il n'y a pas de lieux | garder |
| `numeroGalerie` | numéro du nom de fichier | `dateEstimee` | garder |
| `dpi.double/pleine/demi/quart` | dpi au remplissage | taille maximale proposée, double interdite sous le seuil | garder |
| `format`, `rapport` | paysage, portrait ; grand côté / petit | gabarits | garder |
| `logiciel`, `sousSeconde`, `zoomNumerique` | version du téléphone ; fraction de seconde ; zoom | aucun | **à retirer** (`sousSeconde` servirait aux rafales serrées : à garder seulement si une règle le lit) |

### Couche 2 (0 $)

| Tag | Définition | Usage | Statut |
|---|---|---|---|
| `nettete`, `dhash`, `zone`, `chaleur`, `lumi`, `palette`, `aplats`, `netteteSujet` | mesure de l'éditeur | floues, piles, recadrage, capture, couleurs | garder |
| `visages` (vignette) | détecteur de l'éditeur | | **à remplacer** par `visagesTuiles` (9 photos contre 36) |
| `visagesTuiles` | même modèle en tuiles sur 1 024 px | zone à protéger, plan, `qui` | garder ; reste aveugle aux personnes de dos |
| `tete.tournee` | gauche, droite, face | P : le regard entre dans la double | garder, à mesurer |
| `contraste` | écart-type, plage | filtres | garder, à mesurer |
| `couleur.chaleur/mot/saturation/teinte/vivacite/noirEtBlanc` | couleur de la photo | assortir une double, filtres, série N&B | garder, à mesurer |
| `inclinaison`, `horizonY` | angle à corriger, hauteur de l'horizon | redresser, titre au-dessus de l'horizon | **à refaire** (non fiable) |
| `zoneCalme` | où poser un titre, et en quelle couleur | couverture, ouvertures, R159 | garder, à mesurer à l'œil |
| `mouvement` | anisotropie | `bouge` | garder comme entrée |
| `indices.ciel`, `indices.verdure` | parts de pixels | `exterieur` | garder comme entrées |
| `indices.peau` | part de pixels « peau » | aucun | **à retirer** |
| `sujet.position` | gauche, centre, droite | côté de page | garder, à mesurer |

### Dérivés (0 $)

| Tag | Définition | Usage | Statut |
|---|---|---|---|
| `lumiere` | nuit, dorée, flash, intérieur, jour | fond noir, filtres, profil festif | garder (84 % d'accord IA) |
| `exterieur` | extérieur, intérieur, inconnu | alternance | garder (91 % d'accord IA) |
| `plan` (local) | large, moyen, serré | repli sans IA | **à retirer quand l'IA a lu** (55 % d'accord) |
| `bouge` | flou de mouvement probable | tri | à mesurer |
| `aRedresser` | angle | | **à refaire** (0 trouvé, mesure non fiable) |
| `selfie` | caméra avant | taille de pose | garder, non prouvé (0 cas) |
| `imprimable` | taille maximale à 200 dpi | structure | garder |

### Couche 3 (0 $)

| Tag | Définition | Usage | Statut |
|---|---|---|---|
| `floue`, `doublon`, `rafale` + meilleure, `similaire` | tags de l'éditeur | tri, entonnoir | garder (non éprouvés ici : lot déjà trié) |
| `moment` | moment de 120 min | une double = un moment | garder |
| `jour`, jour fort | date ; 20 % des jours les plus fournis | ouvertures | garder |
| `chapitreTemporel` | coupure aux silences | trame de secours sans IA | garder comme repli |
| `voisines` | écart en secondes et en empreinte | séquences, assortir | garder |
| `versIA`, `raisonA` | entonnoir A | coût | garder |

### Couche 5 (gpt-5.4, 0,00144 $ par photo)

| Tag | Usage | Statut |
|---|---|---|
| `role` | sélection, héros de page | garder |
| `sujet` | assortir une double | garder |
| `candidate` | couverture, pleine, double | garder ; croiser avec `dpi` |
| `interet` | sélection, choix du regard fin | garder |
| `texte_lisible` | envoie au regard fin (lieu lu) | garder |
| `plan` (ajouté) | détail + grand angle | garder |
| `moment_journee` (ajouté) | lumière, fond, filtres | garder (redondant à 84 % avec le local : le local suffit pour un projet sans IA) |
| `ambiance` (ajouté) | profil, rythme, filtres | garder |
| `personnes` (ajouté) | `qui`, plan, zone à protéger | garder ; meilleur que tout détecteur local mesuré |

### Couche 6 (gpt-5.1, 0,00167 $ par photo regardée)

| Tag | Usage | Statut |
|---|---|---|
| `couverture`, `type` | couverture | **à refaire** : 51 « oui » sur 61, ne départage rien |
| `lieu_lu` | titres, légendes, repli du GPS | garder ; filtrer les enseignes (4 sur 16) |
| `plat` | page table | garder (profil gourmand), 0 ici |
| `moment` | légendes, entrée de la couche 7 | garder |
| `idee` | aucune règle ne la lit | **à retirer** sauf règle qui la lit |
| `recadrage` | à comparer à la carte de chaleur | à mesurer |

### Couche 7 (gpt-5.1, 0,047 $ par projet)

| Tag | Usage | Statut |
|---|---|---|
| `qui` | profil, ton | garder |
| `ou` | titres, couverture | garder (aussi bon que les lieux lus) |
| `type_voyage`, `duree_jours` | structure | garder |
| `chapitres` (titre, sous-titre, dates, photos, raison) | trame | garder |
| `ton`, `profil` | règles par profil | garder |
| `style_conseille` | ambiance | garder, à juger par la DA |
| `doutes` | dire au client ce qui reste à confirmer (fiche du projet) | garder |

## Résultat pour Joëlle

- **Profil** : long voyage en famille ; **qui** : famille (comptage) ; **où** : Australie ; **type** : road trip, 22 jours ; **ton** : tendre.
- **Chapitres** (photos rattachées, dont les 3 restées hors IA) :
  1. Arrivée et grande ville (5 → 7 nov., 36 photos)
  2. Plages et premiers parcs marins (8 → 10 nov., 26)
  3. Côte sud et vie sauvage (11 → 15 nov., 19)
  4. Parenthèse nature au calme (17 → 19 nov., 16)
  5. Villes du sud et cafés (20 → 22 nov., 19)
  6. Route de l'océan et falaises (23 → 24 nov., 28)
  7. Forêt enchantée et derniers rivages (25 → 26 nov., 20)
- Les chapitres temporels sans IA (couche 3) coupaient presque aux mêmes endroits (11, 15, 17, 18, 20 et 23 novembre) mais faisaient du 5 au 10 un seul chapitre.

## Limites constatées

1. **Aucun GPS** : la couche 4 n'a pas tourné ; les lieux viennent des panneaux lus (16, dont 4 enseignes).
2. **Visages** : le détecteur de l'éditeur ne voit que les visages proches (9 photos sur 164 ; 0 sur 9 photos avec des personnes d'une planche contrôlée).
   Les tuiles quadruplent les trouvailles (36) mais ratent les personnes de dos ou lointaines ; l'IA en planche compte mieux.
3. **Lot déjà trié** : 0 rafale, 1 doublon, 1 floue. Les règles de rafale et le gain de l'entonnoir A ne sont PAS éprouvés par Joëlle.
4. **Couverture au regard fin** non discriminante (51 sur 61).
5. **Photos sans date** : 15 arrivées après le voyage ; la couche 7 les range par contenu, une au moins au mauvais chapitre (une vue de Melbourne au chapitre 7).
6. **Inclinaison et horizon** non fiables ; **plan local** à 55 % d'accord.
7. **dpi** : aucune photo de ce téléphone ne tient une double à 200 dpi en remplissage ; 16 photos sont pourtant proposées « double » par l'IA.
8. L'écart navigateur / banc n'est pas chiffré : le banc réduit avec sharp, le navigateur avec le canvas ; les valeurs bougent de quelques pour cent.
9. Les « accords » sont des accords avec gpt-5.4, pas des exactitudes ; seul un contrôle à l'œil (une planche de 16) a été fait.
10. Le banc ne lit pas la fiche du projet (saisie avant l'analyse) : seul le nom du projet sert d'indice.
