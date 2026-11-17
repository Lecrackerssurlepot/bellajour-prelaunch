# Filtres : un moteur, trente préréglages, trois portées

Cahier du coloriste, tunnel du 17/11/2026. Les valeurs sont des **réglages de départ**. Les mesures viennent de `essais-couleur/` (164 photos de Joëlle, en local ; implémentation de référence en numpy : `filtres_ref.py`, catalogue : `catalogue.py`, ce fichier est généré d'après lui par `gen_filtres.py`).

## 1. Le principe : un seul moteur, écran = export

Un filtre n'est pas un effet collé : c'est un **préréglage de 19 primitives** appliquées dans un ordre fixe. Pour que l'écran et le fichier imprimé donnent la même chose (comme le recadrage unique écran = IDML), il faut UN module pur, appliqué sur un
tableau de pixels : sur canvas (aperçu, taille d'écran) et sur le tampon brut au moment de l'export (taille d'impression). **Pas de `filter:` CSS** : ses formules de luminosité, contraste et saturation ne sont pas celles de ce cahier, et il n'a ni masque d'ombres, ni grain, ni virage, ni rayons
en millimètres. Il peut servir de survol rapide à condition d'être remplacé par le module dès l'arrêt du curseur.

Trois règles de fabrication :
1. **Les rayons sont en millimètres sur le papier** (grain, netteté, clarté, lueur), jamais en pixels. À l'écran on convertit par le zoom ; à l'export par le dpi réel de la photo posée. Sans cela le grain de l'écran est 8 fois trop gros à l'impression, ou invisible.
2. **Le germe du grain est l'identifiant de la photo** : le même grain à l'écran, à l'export, à la deuxième exportation.
3. **Cuit dans les pixels, avant tout profil** : le tampon filtré est un sRGB, que l'imprimeur convertit en CMJN. Le garde-fou d'impression (primitive 19) comprime à l'avance ce que le papier ne rendra pas. Mesuré sur Joëlle : **9,4 % des pixels de l'ensemble et 13,9 % des pixels de ciel** reviennent à ΔE00 > 3 après un aller-retour FOGRA39. Sans garde-fou, c'est la
conversion de l'imprimeur qui choisit, pas nous. (Proxy FOGRA39 : le profil de Cloudprinter reste à demander ; export JPEG qualité élevée, à fixer.)

Ordre fixe : exposition, balance (température, teinte), ombres et lumières, contraste, fondu, mélange de couleurs, saturation, vibrance, noir et blanc, virage, dégradé, lueur, clarté, vignette, grain, netteté, garde-fou.
Il y a deux raisons à cet ordre : le correctif d'abord (la lumière, la balance), le look ensuite, et ce qui dépend de la taille (grain, netteté) en dernier.

## 2. Les primitives


| # | Primitive | Paramètre (unité) | Plage | Neutre | Formule de référence (`filtres_ref.py`) | Ce qu'elle abîme |
|---|---|---|---|---|---|---|
| 1 | Exposition | `ev` (IL) | −2 à +2 | 0 | lumière linéaire × 2^ev | bruit des ombres si > +1 ; hautes lumières brûlées |
| 2 | Température | `temp` | −100 à +100 | 0 | gains linéaires R × 2^(0,40 t), B × 2^(−0,40 t), normalisés à luminance constante. Mesuré sur un gris moyen : t = +100 donne Δb* ≈ +10,6 et Δa* ≈ +4 ; t = −100 donne Δb* ≈ −11 | peau, blancs |
| 3 | Teinte (vert ↔ magenta) | `teinte` | −100 à +100 | 0 | gain linéaire V × 2^(−0,25 g), normalisé. Δa* ≈ ±6 pour ±100 | peau |
| 4 | Ombres | `ombres` | −100 à +100 | 0 | Y + 0,25 × (o / 100) × exp(−((Y − 0,22) / 0,18)²), appliqué en rapport sur les trois canaux (la teinte est gardée) | bruit, bandes |
| 5 | Hautes lumières | `lumieres` | −100 à +100 | 0 | Y + 0,20 × (h / 100) × exp(−((Y − 0,78) / 0,18)²), même méthode | halo, ciel gris |
| 6 | Contraste | `contraste` | −100 à +100 | 0 | c > 0 : courbe logistique k = 8 c / 100 centrée sur 0,5, renormalisée ; c < 0 : Y = 0,5 + (Y − 0,5)(1 + 0,6 c / 100) | noirs bouchés, blancs brûlés |
| 7 | Fondu des noirs et des blancs | `fondu_noirs` (0 à 100), `fondu_blancs` (0 à 100) | 0 à 100 | 0 | x → 0,12 f_n + (1 − 0,12 f_n − 0,06 f_b) x ; plafond des noirs à 12 % | contraste, profondeur ; imprime plus plat |
| 8 | Mélange de couleurs | par bande : rouge, orange, jaune, vert, aqua, bleu, violet, magenta : `teinte°` (−30 à 30), `sat` (−100 à 100), `lum` (−100 à 100) | | 0 | poids cos² à 45° autour du centre de bande (0, 30, 60, 120, 180, 240, 285, 330° HSV), × chroma de pixel | peau (orange), bords |
| 9 | Saturation | `sat` | −100 à +100 | 0 | x → Y + (x − Y)(1 + s / 100), Y = luma 709 en gamma | sort de la limite d'impression |
| 10 | Vibrance | `vib` | −100 à +100 | 0 | gain = 1 + v (1 − S)^1,5 (1 − 0,5 × proximité de 30°), S = max − min | moins brutal que la saturation ; reste à la peau |
| 11 | Noir et blanc | `nb` (0 à 100), canaux `r, v, b` | nb 0 à 100 ; canaux −50 à +150, normalisés à somme 1 | 0 ; 30 / 59 / 11 | mélange linéaire de x vers Σ w_i x_i | un ciel et une peau de même luma se confondent |
| 12 | Virage partiel | ombres `h, C` ; lumières `h, C` ; équilibre | h 0 à 360, C 0 à 15, équilibre −100 à 100 | C = 0 | ajoute un vecteur de chroma Lab (h, C) × 0,5, pondéré par smoothstep(0,25 ; 0,75 ; Y + 0,2 e) | teintes de peau, blancs |
| 13 | Carte de dégradé (duotone) | 2 ou 3 couleurs hex, `degrade_mix` | 0 à 100 | aucun | luma → rampe de couleurs, mélangée à l'original | peau, détails de teinte |
| 14 | Lueur | `lueur` (0 à 100), couleur | | 0 | lumières (Y > 0,7) floutées sur 3 mm et ajoutées en écran × 0,8 a | flou, surexposition |
| 15 | Clarté | `clarte` | −100 à +100 | 0 | masque flou sur la luma, rayon 6 mm, gain 0,6 | peaux dures, halos |
| 16 | Vignettage | `vignette` | −100 (éclaircit) à +100 (assombrit) | 0 | multiplicateur 1 − 0,55 v smoothstep(0,45 ; 1,0 ; distance au centre) | bords d'un panorama, visages en coin |
| 17 | Grain | `grain` (0 à 100), `grain_mm` (0,04 à 0,30), `grain_couleur` (0 à 100) | | 0 ; 0,12 mm ; 0 | bruit gaussien à la taille du grain EN MILLIMÈTRES (donc identique à l'écran et à l'export), pondéré aux demi-teintes (0,35 + 0,65 · 4 Y (1 − Y)), amplitude 0,07 g ; germe = identifiant de la photo | ciel lisse, JPEG de l'export |
| 18 | Netteté | `nettete` (0 à 150 %), `nettete_mm` (0,05 à 0,40) | | 0 ; 0,15 mm | masque flou sur la luma, rayon en mm, TOUJOURS en dernier, à la résolution finale | halos, bruit |
| 19 | Garde-fou d'impression | automatique | marche / arrêt | marche à l'export | comprime la saturation au-delà de la table du §0 de REGLES-COULEUR (compression douce, teinte gardée) | rien : il évite la surprise du papier |


Valeurs d'un préréglage = ses primitives. La seule commande commune est l'**intensité** (0 à 150 %, 100 par défaut) : chaque paramètre est interpolé entre le neutre et le préréglage (le canal « couleur » d'un virage suit sa chroma). Tout est modifiable ensuite, primitive par primitive : l'outil à la main existe dans tous les cas, même sans règle.

## 3. Les trois portées : une photo, une double, tout le magazine

Une photo porte `filtre = {id, intensité, réglages}` ; une double porte le sien ; le magazine porte le sien. Résolution : **le plus proche gagne, champ par champ** (photo > double > magazine) ; seuls les correctifs (exposition, température, teinte, ombres, lumières) **s'additionnent** (une photo sombre dans un
magazine « Film doux » reçoit en plus +0,6 IL). Raison : empiler trois vignettages ou trois grains ferait trois fois le même geste ; en remplaçant, ce que l'utilisateur voit est ce qu'elle a posé le plus près. Une pastille indique d'où vient chaque valeur. « Retirer » rend la photo à la portée au-dessus. Le garde-fou d'impression et la netteté d'export sont hors portée : toujours là.
Garde-fou de dérive : un réglage cumulé dont l'écart moyen à l'original dépasse ΔE00 6 est signalé (mesuré : F20 à 8,3 sur Joëlle = trop fort pour un magazine ; les looks de magazine de ce catalogue sont à 1,1 à 3,8).

## 4. Le catalogue (30)

Profils : V voyage en famille, F fête et nuit, C couple, E événement d'un jour, A année de vie. « Abîme » = ce que le filtre dégrade ; les chiffres « sur Joëlle » sont mesurés.


### Correctif

| id | Nom | Réglages par défaut | Convient à | Ce qu'il abîme |
|---|---|---|---|---|
| F01 | **Neutre** | tous à 0 | tous | rien |
| F02 | **Lumière claire** | expo +0.25 IL · ombres +25 · lumières -15 · contraste +4 | V, E, A ; photo un peu sombre ou ciel dur | monte le bruit des ombres ; peu d'effet sur une photo juste ; pousse la saturation du ciel (le ciel hors limite d'impression passe de 14 à 21 % sur Joëlle) |
| F03 | **Sauvetage** | expo +0.60 IL · ombres +55 · lumières -25 · contraste +6 · vibrance +10 · netteté +40 | toutes ; photo sombre sans ambiance voulue (intérieur, forêt, contre-jour fort) | bruit et bandes dans les ombres ; faux si la pénombre était l'ambiance (bougie, aquarium) |
| F04 | **Contre-jour** | ombres +70 · lumières -45 · contraste -5 · vibrance +12 | portrait devant un ciel clair, sujet sombre | grise le ciel et aplatit ; halo autour du sujet si l'écart est > 4 IL |
| F05 | **Éclat naturel** | vibrance +25 · contraste +8 · clarté +10 · netteté +40 | V, C, E ; photo correcte mais molle | duretés de peau (clarté) ; hors-limite d'impression +3 points |
| F06 | **Ciel profond** | mélange bleu sat +15 lum -25, aqua sat +10 lum -15 · lumières -10 | V ; ciel mat, mer pâle | fait « HDR » si > 60 ; la peau bleutée des ombres ; teintes bleu-vert voisines (mer) assombries |
| F07 | **Verts calmés** | mélange vert sat -30 lum -10, jaune sat -10 lum +0 | V, nature ; verts criards de jardin, de gazon traité | jaunit le visage si la peau est dans le vert ; un vert voulu (perruche, feuillage tropical) devient boueux |
| F08 | **Balance chaude** | temp +25 | photo grise, intérieur, ombre | jaunit les blancs, la neige, les chemises ; le ciel verdit |
| F09 | **Balance fraîche** | temp -25 | photo jaune, lumière artificielle, soleil de fin de journée à adoucir | bleuit la peau (pâle, malade) ; tue un coucher de soleil |
| F10 | **Neutraliser** | temp +0 · teinte +0 | lot de plusieurs appareils ou de lumières mêlées | neutralise un éclairage voulu (coucher de soleil, bougie) : jamais sur une scène marquée « ambiance » |

### Naturel

| id | Nom | Réglages par défaut | Convient à | Ce qu'il abîme |
|---|---|---|---|---|
| F11 | **Carte postale** | sat +6 · vibrance +15 · contraste +8 · ombres +10 · lumières -12 · temp +4 | V, E ; photos de ciel et de mer ternes, tourisme | AUGMENTE la saturation haute : sur Joëlle, ciel hors limite d'impression 14 → 23 %. À éviter sur un lot déjà vif |
| F12 | **Mat doux** | fondu noirs +30 · contraste -8 · sat -8 · lumières -8 | V, A, C ; lot de téléphone vif, impression sur couché | pâlit les noirs (plage tonale −8) ; sur un lot déjà terne, devient flou de ton |
| F13 | **Pastel** | expo +0.35 IL · contraste -18 · sat -12 · fondu noirs +25 · fondu blancs +15 | C, E (mariage), peau claire, lot lumineux | photo sombre devient grise ; écart fort à l'original (ΔE00 5,5), à réserver |

### Look

| id | Nom | Réglages par défaut | Convient à | Ce qu'il abîme |
|---|---|---|---|---|
| F14 | **Film doux** | fondu noirs +25 · contraste -6 · sat -10 · virage lumières h65 C5 · virage ombres h205 C4 · grain 12 · mélange vert sat -18 lum +0 | V, A, C ; lot de téléphone, magazines « premium » sobres | grain visible sur ciel lisse si > 25 ; vire un peu le blanc (lumières chaudes) ; pas pour un lot de neige |
| F15 | **Film chaud** | temp +18 · fondu noirs +30 · virage lumières h70 C7 · virage ombres h30 C3 · contraste +4 · sat -6 · grain 18 | C, E, A ; lot tiède, heure dorée, intérieurs | jaunit la peau claire et la neige ; écart ΔE00 3,8 |
| F16 | **Matin froid** | temp -20 · vibrance -8 · virage ombres h215 C6 · lumières -8 · expo +0.10 IL | A (hiver), montagne, mer du Nord ; matin | refroidit la peau ; mauvais pour un lot de plage |
| F17 | **Heure dorée** | temp +35 · virage lumières h75 C8 · ombres +15 · vignette 15 · vibrance +10 | V, C ; fin de journée, plage, campagne | brûle les ciels clairs ; la vignette assombrit les coins de panorama |
| F18 | **Vintage 70** | temp +20 · teinte +8 · sat -18 · fondu noirs +40 · contraste -5 · vignette 25 · grain 35 · grain mm 0.16 · virage ombres h50 C6 | A, C ; photos d'archives, effet nostalgie | tue la netteté perçue ; incompatible avec une photo de visage dans l'ombre ; grain et vignette cumulent |
| F19 | **Terre** | mélange vert sat -25 lum -10 · temp +12 · sat -10 · contraste +5 | V (nature, désert, falaises) ; lots verts criards | éteint le feuillage ; décale les peaux vers l'orange |
| F20 | **Clair aérien** | expo +0.50 IL · contraste -10 · ombres +30 · fondu blancs +0 · vibrance +8 | C, E ; plages, neige, intérieurs clairs | écart très fort à l'original (ΔE00 8,3 sur Joëlle) : seulement sur une photo, pas le magazine ; grille les hautes lumières |

### Noir et blanc

| id | Nom | Réglages par défaut | Convient à | Ce qu'il abîme |
|---|---|---|---|---|
| F21 | **N&B neutre** | N&B 100 · contraste +6 | toutes ; unifier une double de températures mêlées | perd la couleur qui faisait le sujet ; ciel bleu → gris clair (voir F22) |
| F22 | **N&B ciel sombre** | N&B 100 · canaux R55 V40 B5 · contraste +18 · vignette 12 | V, C ; paysages, architecture, ciel dramatique | peau plus sombre et dure ; la mer devient noire |
| F23 | **N&B doux** | N&B 100 · fondu noirs +12 · lumières -10 · contraste -4 · grain 10 | C, A, portraits ; souvenirs calmes | peu de contraste, fait « terne » sur photo plate |
| F24 | **N&B chaud** | N&B 100 · virage ombres h55 C3 · virage lumières h70 C5 · grain 12 | C, E ; portraits, mariage | ton chaud sur peau claire ; le grain peut faire « filtre » |
| F25 | **Une couleur seule** | toutes les bandes à sat −100 sauf rouge, orange, magenta, contraste +8 | F, C, E ; une photo avec un objet franc (veste, bâche, voiture) | faux si l'objet n'est pas dans la plage de teinte gardée ; contours colorés (bords de rouge sur une peau) |

### Effet

| id | Nom | Réglages par défaut | Convient à | Ce qu'il abîme |
|---|---|---|---|---|
| F26 | **Duotone du nuancier** | dégradé #1f1a1c > #bc977d > #ebdace · dégradé % 100 · contraste +10 | F, C, A ; photos faibles, groupe de 4 et plus (C-036) | écrase les teintes de peau : portraits fades ; la teinte du nuancier doit être dans la limite d'impression |

### Effet (nuit)

| id | Nom | Réglages par défaut | Convient à | Ce qu'il abîme |
|---|---|---|---|---|
| F27 | **Néon** | dégradé #150a2e > #c2187a > #2fe0e8 · dégradé % 70 · contraste +20 · lueur 50 · lueur teinte #ff4fd8 · vignette 30 | F ; fête de nuit, concert, ville de nuit | non imprimable tel quel : C 80 à 100 devient ≈ 50 (aller-retour) ; peau violette |
| F28 | **Nuit bleue** | expo -0.30 IL · temp -30 · virage ombres h265 C10 · lueur 30 · contraste +10 · sat +5 | F, E ; nuit, plage de nuit, ville bleue | noie les détails ; la lueur flatte le flou |
| F29 | **Lueur de fête** | contraste +18 · vibrance +25 · lueur 40 · lueur teinte #ffd9a0 · vignette 35 · grain 20 | F, E ; bars, scène, guirlandes | grain et lueur cumulent le flou ; surexpose les lumières |

### Effet

| id | Nom | Réglages par défaut | Convient à | Ce qu'il abîme |
|---|---|---|---|---|
| F30 | **Flash argentique** | contraste +20 · expo +0.20 IL · sat +8 · vignette 20 · grain 40 · virage lumières h60 C4 | F, A ; portraits en soirée, esprit « argentique » | durcit la peau ; vignette + grain sur photo déjà sombre = boue |

Plages de réglage : celles du §2 pour chaque primitive. Le **F10 Neutraliser** n'a pas de valeur fixe : ses deux curseurs sont calculés par photo (F-004). Le **F26 Duotone du nuancier** prend ses trois couleurs dans le nuancier (encre, aplat sourd, aplat clair) : changer le nuancier change le duotone (c'est la contrainte de la maison : l'habillage suit le nuancier).
Les néons F27 : leurs couleurs (cyan, magenta) sont hors de ce que le papier rend (C 80 à 100) : à l'écran ils sont montrés avec le garde-fou activé (aperçu « épreuve »), sinon on vend un néon qu'on ne livre pas.

## 5. Ce que les filtres font sur Joëlle (mesuré)

Tous les looks de magazine sur les 164 photos (vignettes de 200 px ; `essai_magazine.py`, `essai_ciel.py`). « Hors limite » = part des pixels dont l'aller-retour FOGRA39 dépasse ΔE00 3. « Ciel » = pixels h 240 à 295, C ≥ 25, L ≥ 45 (50 photos).

| Filtre | Hors limite (toutes) | Hors limite (ciel) | C du ciel | Écart à l'original (ΔE00) | σ de clarté entre photos |
|---|---|---|---|---|---|
| Neutre | 9,4 % | 13,9 % | 37,0 | 0 | 9,9 |
| F02 Lumière claire | 6,5 % | 21,0 % | 38,0 | 4,3 | 8,6 |
| F11 Carte postale | 10,2 % | 22,7 % | 40,4 | 1,8 | 9,0 |
| F12 Mat doux | 3,4 % | 3,2 % | 32,6 | 2,4 | 8,8 |
| F14 Film doux | 4,2 % | 1,9 % | 31,2 | 2,7 | 9,2 |
| F13 Pastel | 2,2 % | 2,7 % | 32,4 | 5,5 | 9,1 |
| F15 Film chaud | 5,4 % | non mesuré | | 3,8 | 9,5 |
| F17 Heure dorée | 7,6 % | non mesuré | | 4,5 | 8,7 |
| F19 Terre | 8,0 % | non mesuré | | 1,1 | 9,9 |
| F20 Clair aérien | 7,6 % | non mesuré | | 8,3 | 9,2 |

Lecture : le filtre « touristique » (F11) AGGRAVE le problème d'impression ; les filtres mats (F12, F14, F13) le règlent presque entièrement et ne changent la photo que de 2 à 3 ΔE00 (« presque pareil » sous 5). Aucun filtre ne **unifie** beaucoup ce lot (σ de clarté 9,9 → 8,8 au mieux) : il vient d'un seul appareil (voir F-001). Planches avant / après : `avant-apres-F12.jpg`, `avant-apres-F14.jpg`, `avant-apres-F02.jpg`
(ligne du haut = original, du bas = filtre).

## 6. Les règles de proposition (F-001 à F-018)

La machine **propose**, ne pose rien d'office (un geste de Mathias = une leçon). Chaque règle : portée · quand · quoi · pourquoi · exception · mesure. Les mesures viennent par photo (voir la liste de données à la fin de `REGLES-COULEUR` et du rapport) : `cast_b`, `cast_a` (dominante des quasi-neutres : pixels C < 12, L 30 à 85), `L_med`, `L_p5`, `L_p95`, `plage` (L au 98e moins L au 2e centile), `C_moy`, `C_p95`, `hors_gamut`, `source` (appareil), `part_ciel`.

### Sur tout le magazine

**F-001 Unifier des photos d'appareils ou de lumières différents.** Quand : au moins deux sources (modèles d'appareil, ou « sans EXIF » ≥ 15 % du lot) ET l'écart de médiane de `cast_b` entre sources ≥ 4, ou σ de `cast_b` du lot ≥ 5 (hors scènes marquées ambiance), ou σ de `C_moy` ≥ 12 entre sources. Quoi : F10 Neutraliser sur chaque photo (F-004) puis un seul look (F-002). Pourquoi : des appareils
n'ont pas la même chaîne de couleurs ; les pros posent un étalonnage commun (R-05). Exception : un seul appareil et σ faible : on n'unifie pas (voir F-015). Mesure : σ de `cast_b` et de `L_med` avant / après (but : σ de `cast_b` ≤ 3). Sur Joëlle : un seul appareil (141 Galaxy S25, 23 sans EXIF), σ de `cast_b` = 3,5 (S25) et 4,0 (sans EXIF), médianes 0,6 et 0,5 : **pas de déclencheur**.

**F-002 Un look de magazine selon le profil.** Quand : toujours proposé en première étape du parcours (« l'ambiance »), jamais imposé. Quoi : V → F14 Film doux ou F12 Mat doux ; C → F24 ou F15 ; E → F11 sous réserve de F-003, ou F02 ; A → F12 ; F → aucun sur le magazine (effets par chapitre, F-012). Pourquoi : un look commun est ce que font les pros (étalonnage « film » des pleines pages, R-05),
et ce qui fait « un magazine » plutôt qu'un lot. Le virage de lumières du look penche vers l'accent du nuancier (C-062). Exception : photos déjà filtrées (> 10 % du lot taguées filtre : on ne l'ajoute pas par-dessus). Mesure : écart moyen à l'original ≤ ΔE00 6 ; part hors limite d'impression après ≤ avant.

**F-003 Sécurité d'impression.** Quand : `hors_gamut` du lot ≥ 8 % des pixels, ou du ciel ≥ 10 %. Quoi : on propose un look mat (F12, F14 ou F13) PLUS tôt que les autres ; et le garde-fou d'impression est montré à l'écran. Pourquoi : un ciel de téléphone récent est hors de ce que le couché rend (mesuré sur Joëlle : 9,4 % des pixels, 13,9 % du ciel ;
les F11 et F02 l'aggravent : 22,7 % et 21 %). Exception : aucune ; si le profil exige des couleurs vives (E, F), on dit à voix haute qu'elles seront plus ternes, on ne les retient pas. Mesure : % hors limite après filtre, cible ≤ 5 %. Sur Joëlle : déclenché.

**F-004 Neutraliser une dominante, photo par photo.** Quand : `|cast_b − réf_b| ≥ 5` ou `|cast_a − réf_a| ≥ 3` (réf = médiane du magazine), la photo a ≥ 5 % de quasi-neutres, et elle n'est pas marquée ambiance (coucher de soleil, bougie, aquarium, scène). Quoi : `temp = −9,4 × (cast_b − réf_b)`, `teinte = −17 × (cast_a − réf_a)`, bornés à ±40 (c'est la calibration mesurée du §2). Pourquoi : on aligne vers la médiane du lot, pas vers un gris
absolu (une plage jaune doit rester jaune). Exception : lumière colorée voulue. Mesure : cast après ≤ 2.

### Sur une double

**F-005 Assortir deux photos d'une double.** Quand : écart de `L_med` ≥ 12, ou de `cast_b` ≥ 6, ou de `C_moy` ≥ 12 entre les deux photos et qu'elles ne sont pas voisines d'un contraste voulu (jour contre nuit). Quoi : un correctif sur la PLUS éloignée de la médiane du magazine : exposition ±0,5 IL au plus, température ±15 au plus, vibrance ±15 au plus.
Pourquoi : deux pages qui ne viennent pas du même jour (C-042). Exception : écart de `cast_b` ≥ 8 et scènes de lumières colorées différentes : N&B les deux (C-063), ou rien. Mesure : écarts après ≤ la moitié des écarts avant.

**F-006 Double bavarde.** Quand : C-043 échoue (deux contrastes forts) ou C-027 (plus de 3 teintes vives). Quoi : N&B (F21 à F24) sur la plus vive des photos, ou F12 sur toutes les deux ; pas d'aplat. Pourquoi : éteindre un des deux contrastes. Exception : double pop. Mesure : nombre de teintes vives après ≤ 3.

**F-007 Un filtre de double n'est pas un look.** Quand : une double de série (même moment, mêmes couleurs) à unifier. Quoi : on propose le même correctif sur les photos d'une double, pas un look entier : la double ne change pas d'ambiance, sauf profil F (chapitre soirée) ou duotone d'unification (C-036). Pourquoi : le look appartient au magazine, la double n'a droit qu'à un correctif.
Mesure : filtres de double ≤ 1 sur 4 doubles.

### Sur une photo

**F-008 Sauver une photo trop sombre.** Quand : `L_med` < 36 ET `L_p95` < 75 (toute la photo est sombre), ET la photo n'est pas marquée nuit ou ambiance (bougie, aquarium, scène), ET ≥ 150 dpi à la taille posée. Quoi : F03 Sauvetage à 100 %, ramené à 60 % si le bruit des ombres est fort (réglage de départ : σ de L sous L 25 ≥ 4). Si `L_p95` ≥ 75 (la photo est sombre MAIS a des lumières : intérieur à fenêtres, forêt à trouées), c'est
une scène contrastée : F04 Contre-jour au lieu de F03. Pourquoi : une photo sombre sur couché s'imprime plus sombre encore ; un sauvetage qui monte tout brûle les fenêtres. Exception : ambiance (F-014), sinon rien. Mesure : `L_med` après entre 40 et 55 ; `L_p5` après ≥ 5. Sur Joëlle : 9 photos sous 36 ; 119 (29 / 78), 140 (34 / 77) et 152 (36 / 80) reçoivent F04 ; les trois aquariums (057 à 059), le dîner à la bougie (018) et les deux écrans (001, 014) sont écartés ; **aucune photo n'a besoin de F03**.

**F-009 Un contre-jour.** Quand : zone importante (sujet) `L_med` ≤ 30 ET tiers haut `L_med` ≥ 75 (écart ≥ 45). Quoi : F04 Contre-jour. Pourquoi : visages perdus. Exception : silhouette voulue (tag). Mesure : `L_med` du sujet après ≥ 38.

**F-010 Photo plate ou voilée.** Quand : `plage` < 45. Quoi : F05 Éclat naturel, ou contraste +10. Pourquoi : brume, vitre, photo de zoom. Exception : photo de brouillard voulue. Mesure : `plage` après ≥ 55. Sur Joëlle : 3 photos concernées.

**F-011 Ciel mou.** Quand : `part_ciel` ≥ 25 % ET C du ciel < 22 ET L du ciel ≥ 65. Quoi : F06 Ciel profond à 60 %. Pourquoi : un ciel voilé fait une page sans ciel. Exception : un ciel qui est déjà à C ≥ 30 : jamais (il est probablement déjà hors limite, F-003). Mesure : C du ciel après dans la limite d'impression.

**F-012 Une soirée ou une fête : des effets, par chapitre.** Quand : profil F, chapitre marqué soirée ou photos de nuit (C-056). Quoi : F27 Néon, F28 Nuit bleue, F29 Lueur de fête, F26 Duotone, au plus un par double, un seul choisi par chapitre (c'est la signature du chapitre) ; jamais sur le magazine entier, jamais sur une photo de plein jour. Pourquoi : un effet coûte une voix (C-057).
Exception : le client en demande un sur tout le magazine : possible, mais les couleurs hors limite d'impression sont signalées. Mesure : décompte d'effets par double ≤ 1 ; hors limite d'impression indiqué.

**F-013 Une couleur seule.** Quand : une photo avec un objet franc (C ≥ 50 sur ≥ 5 %) dans une double bavarde, ou accord A-10. Quoi : F25 Une couleur seule. Pourquoi : « N&B + une couleur » est le geste de pro le plus fréquent (R-C : un tiers des doubles de pros). Exception : l'objet touche une peau (bords). Mesure : un objet seul coloré ≥ 90 % de la surface colorée.

### Quand la machine ne propose rien

**F-014 Pas de proposition sur ces photos.** Photos taguées capture d'écran, emoji, filtre ; photos de visage serré (pas de vibrance, pas de mélange orange) ; photos sous 150 dpi (la netteté ne les sauve pas) ; photos d'un lot qui a déjà un look posé à la main ; plus de 40 % de pixels brûlés (information absente : on ne peut pas la remettre) ; photos d'ambiance voulue (bougie, scène) hors F-012.

**F-015 Pas de proposition au niveau du magazine** quand : un seul appareil ET σ de `cast_b` < 5 ET σ de `L_med` < 12 ET `hors_gamut` < 8 % (le lot est déjà cohérent et imprimable) : la machine propose seulement le look de F-002 « si vous voulez une ambiance », sans correction ; et quand moins de 5 photos sont concernées par un geste
(une photo, pas un magazine).

### Garde-fous

**F-016 Un correctif avant un look, une fois.** Les correctifs (F02 à F10) se posent à la photo ; le look (F11 à F20, F26 à F30) au magazine ; on ne pose jamais deux fois la même primitive (deux vibrances, deux grains) : la résolution de la §3 remplace, elle n'empile pas.

**F-017 Limite de dérive.** Un cumul de filtres dont l'écart moyen à l'original dépasse ΔE00 6 est signalé (« très éloigné de la photo »), et refusé pour une photo posée sur l'aplat qui l'a tirée (C-040).

**F-018 Apprentissage.** Chaque refus (« retirer ») d'une proposition fait baisser sa fréquence sur ce profil ; chaque réglage de la main sur une proposition est gardé comme leçon (intensité préférée). Les seuils de F-001 à F-011 sont des réglages de départ, à recaler sur les choix de Mathias ; tant que non, la machine propose peu.
