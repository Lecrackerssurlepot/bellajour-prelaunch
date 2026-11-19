> **Copie nettoyée (M-01) de `30-INTEGRATION.md` du socle du 19/11**, écrite par `scripts/socle-import.ts` : ne pas éditer à la main.
> Les magazines de référence y sont nommés par leur profil (« réf. couple », « réf. famille »). Les règles vivent en données
> (`src/lib/mise-en-page/regles/socle/`) ; les réponses de Mathias du 19/11 sont dans `A-TRANCHER.md` (M-35 à M-57).
>
> **À jour des réponses du 19/11 :**
> - Les arbitrages de ce fichier sont appliqués aux données (`regles/socle/decisions.ts`) ; les conflits que Mathias a tranchés le 19/11 (B1, B5, B6, B11, B15, B20 à B24) portent son retour.

# 30 · L'intégration : les cinq lots croisés (19/11/2026)

Auteur : l'intégrateur du socle. Rien n'a été écrit dans les fichiers des auteurs. Les corrections sont rangées dans `regles.json`
(champ `integration`), et les décisions écrites à la main dans `outils/arbitrages.py`.

**Comment c'est fait.**
1. `outils/extraire.py` lit les quatre lots de règles (20 à 23) et écrit `regles.json` (1 234 règles) et `parametres.json`.
2. `outils/croiser.py` cherche les doublons par ressemblance de texte entre moteurs (221 paires candidates au-dessus du seuil) et les
   paramètres partagés entre moteurs (61).
3. `outils/informations.py` croise les 149 informations de `11-INFORMATIONS.md` avec ce que les règles lisent et produisent.
4. `outils/mots_interdits.py` passe la liste du dépôt (`scripts/regles-mots-interdits.ts`) et les lieux des deux magazines de référence.
5. Puis relecture à la main : les paires candidates, les règles des frontières entre moteurs, les replis.
Tout se rejoue : `python3 -I outils/arbitrages.py && python3 -I outils/extraire.py`.

---

## 1. Les contrôles de forme

| contrôle | résultat |
|---|---|
| identifiants uniques | oui, 1 234 identifiants, aucun en double |
| 11 colonnes sur chaque ligne | oui, partout |
| priorité dans P0 à P7 | oui, partout |
| repli présent de P3 à P7 | **non pour 291 règles sur 818** : 48 contrôles de la Revérification (normal : leur « repli » est le message à l'atelier) et **243 règles de décision** (110 Assortiment, 78 Récit, 37 Mise en page, 18 Habillage) qui écrivent « sans objet », « aucun » ou « rien » |

Sur ces 243, **82 sont des interdictions** (« jamais », « toujours », « interdit ») : elles peuvent bloquer. Elles sont marquées
« gardée, repli à écrire ». En attendant, le repli par défaut de `10-PROCESSUS` §7.2 s'applique : la règle cède, avec une pénalité inscrite
au journal. Les 161 autres sont des coûts ou des préférences : ce repli par défaut leur suffit.

## 2. Les comptes

| | Lecture | Tri | Récit | Assortiment | Mise en page | Habillage | Revérification | **Total** |
|---|---|---|---|---|---|---|---|---|
| règles | 204 | 160 | 170 | 150 | 200 | 242 | 108 | **1 234** |
| VALIDÉE (s'appuie sur une parole de Mathias) | 28 | 40 | 31 | 19 | 29 | 24 | 22 | **193 (16 %)** |
| hypothèse | 176 | 120 | 139 | 131 | 171 | 218 | 86 | **1041 (84 %)** |

| P0 | P1 | P2 | P3 | P4 | P5 | P6 | P7 |
|---|---|---|---|---|---|---|---|
| 82 | 98 | 118 | 190 | 184 | 335 | 196 | 31 |

Paramètres : **1082 noms** (dont 48 transverses de `12-QUESTIONS-PARAMETRES`). Après fusion des noms en double : environ **1010**.

---

## 3. Les doublons (34 règles à fusionner)

Deux règles de deux lots qui décident la même chose. On garde celle du moteur qui POSSÈDE la décision (10-PROCESSUS §2).

| doublon | on garde | pourquoi |
|---|---|---|
| TRI-139, ASS-117 | REC-150 | la montée de densité avant « pas de place » est une décision de taille (Récit) ; le Tri ne connaît pas les doubles |
| TRI-111 | ASS-041 | une série reste ensemble sur la double : placement |
| ASS-040, ASS-043, ASS-044, ASS-045 | TRI-105, TRI-107, TRI-106, TRI-108 | combien garder d'une action, d'angles, d'un coucher, d'un photomaton : sélection (Tri) ; « en bande » va à la Mise en page |
| ASS-039 | TRI-088 | quasi-identiques : déjà tranché au Tri |
| REC-109 | TRI-082 | une faible qui complète une paire reste posée |
| REC-129, REC-144, REC-121 | ASS-086, ASS-060, ASS-106 | même scène voisine, dominante répétée, alternance grande et dense : ce qui va sur une double |
| REC-014, TXT-007 | LEC-136 | un nom lu devient « lieu sûr » : c'est une information (Lecture) ; les autres la lisent |
| TRI-122 | REC-059 | lot partiellement daté : chapitres |
| TRI-157 | VER-101 | la proposition gardée telle quelle |
| TRI-104 | LEC-098 | un éclat de rire n'est jamais « yeux fermés » |
| ASS-068, ASS-063, ASS-066, ASS-075 | MEP-065, MEP-036, MEP-041, MEP-173 | formes et côté de page : Mise en page |
| REC-138 | MEP-151 | espacement des signatures |
| REC-167, ASS-093 | CV-014 | couverture aussi à l'intérieur : un seul réglage |
| REC-093 | ASS-048 | forme d'une réunion de sujet |
| POL-032 | MEP-014 | distance du texte au pli (valeurs différentes : conflit B7) |
| REC-039, REC-038 | TXT-027, TXT-023 | titres par double, titre d'une ville nouvelle |
| REC-070 | LEC-155 | le moment se mesure à la Lecture |
| REC-128 | ASS-018 | le héros sur la page de droite |
| TRI-121 | REC-075 | ordre d'un lot sans date |
| MEP-050 | ASS-105 | deux photos par double en couple |
| TXT-006 | LEC-133 | niveaux du géocodage (rayon différent : conflit B19) |
| REC-006 | LEC-108 | le groupe du projet (conflit B10) |

**Pas des doublons : les miroirs voulus.** 98 des 221 paires candidates touchent la Revérification (62 avec la Mise en page) : MEP-116 et VER-014, visage au pli… (MEP-116 et VER-014, visage au pli…).
C'est voulu : le contrôle est un programme à part qui remesure tout (10-PROCESSUS, principe 6). Une seule anomalie : **VER-022** contrôle en
P5 une règle P1 (MEP-139, définition en pleine page) ; à remonter en P1.

---

## 4. Les conflits

Méthode : paires de règles qui décident la même chose (statut, ordre, nombre, taille, forme, texte) dans des sens opposés, cherchées par
mots-clés aux frontières entre moteurs, puis relues. **48 conflits trouvés : 24 résolus par l'échelle, 24 non résolus par l'échelle.**

### 4.a Résolus par l'échelle de priorité (24)

La règle du haut gagne. Pour 12, la règle qui cède a un repli correct. Pour 12, la règle qui cède (ou son repli) viole le niveau du
dessus : elle est à corriger (règle de discipline, 10 §7.2).

| la règle qui cède | cède à | repli | état |
|---|---|---|---|
| MEP-143 (vignette, P5) | MEP-054 (personnes ≥ 70 mm, P0) | « rendue au moteur 4 » | gardée |
| ASS-064 (pleine double, P4) | MEP-116, MEP-117, MEP-119 (pli, P0 et P1) | « sinon pleine page » | gardée |
| ASS-098, ASS-104 (plafond par double, P4) | MEP-064 (6 photos de gens au plus, P0) | « la double se partage » | gardée ; l'Assortiment doit lire `personnes_max_double` |
| TRI-038, TRI-039, TRI-041 (au plus un quart de page, P5) | MEP-054 (P0) | le quart de page tient 70 mm et 100 cm² | compatibles |
| TXT-030 (page sous 40 %, P3) | MEP-126 (page sous 30 %, P0) | les deux seuils s'emboîtent | gardée |
| REC-104 (respiration hors ordre) | REC-076 (placée par ressemblance, M-18) | ne joue que sous `ressemblance_min` | gardée, à préciser |
| TXT-024 (l'ouverture porte un titre) | TXT-026 (pas de titre au-delà de 5 photos) | l'ouverture a au plus 2 photos (ASS-112) | compatibles |
| REC-113 (double calme à une photo) | VER-068 (double à une photo signalée) | un signal, pas un blocage | gardée |
| MEP-055 (groupe : 100 mm) | MEP-054 (70 mm, M-08) | plus strict, même sens | gardée (question annexe) |
| ASS-012 (héros d'une double) | REC-063 (ouverture dans le premier jour) | le héros se choisit dans le premier jour | gardée |
| CV-005 (250 ppp en couverture) | TRI-036 (200 ppp en pleine) | autre objet, plus strict | gardée |
| ASS-075 (échanger les pages) | MEP-001 (la Mise en page choisit le côté) | doublon de MEP-173 | doublon |
| **REC-168** (les sœurs de scène d'une couverture quittent l'intérieur) | REC-153 (la réserve ne contient que des faibles, P0) | aucun | **à corriger** : seules les quasi-identiques partent |
| **TRI-069** (réserve « gardée pour la couverture » avec ses sœurs) | REC-153 | aucun | **à corriger** |
| **ASS-023, ASS-036** (repli : « en réserve ») | REC-153 et le principe « on ne revient pas sur le Tri » | leur repli viole P0 | **à corriger** : posée en petit, ou en légende |
| **TRI-123** (repli : « en vignette ») | MEP-054, ASS-076 (P0) | viole P0 pour une photo de gens | **à corriger** |
| **ASS-033, ASS-038** (« autre personne ») | LEC-002, REC-005 (on compte, on ne reconnaît jamais) | supposent une identité | **à corriger** : « sujets différents en nombre ou en place » |
| **ASS-131** (l'Assortiment forme des réunions) | REC-081 (une entorse se décide au Récit) | — | **à corriger** : il place ce que le Récit a décidé |
| **VER-022** (P5) | MEP-139 (P1) | — | **à corriger** : priorité alignée |
| **MEP-118** (P0) | MEP-014 (P1) dit la même chose | — | **à corriger** : ne garder que la pancarte |
| **CV-004, REC-004** (seuils de passant 0,02 et 0,06) | LEC-090 (Lecture, 0,04) | — | **à corriger** : lire la Lecture |

### 4.b Non résolus par l'échelle (24) : l'arbitrage proposé

Même niveau, ou une règle plus haute qui contredit une parole VALIDÉE de Mathias. **4 sont déjà tranchés par ses mots** (B2, B3, B4, B12) ;
**13 sont des réglages que nous tranchons** (une valeur, un propriétaire) ; **7 vont à Mathias** (`31-A-TRANCHER.md` : B1, B5, B15, B21, B22, B23, B24).

**Frontière Tri ↔ Récit (photos protégées, réserve)**

| # | conflit | arbitrage |
|---|---|---|
| B1 | TRI-151, TRI-153 (P3) mettent de bonnes photos en réserve « pas de place » ; REC-153 (P0) l'interdit ; M-09 (« la réserve ne contient que des faibles ») contre M-16 (« la densité monte jusqu'au plafond AVANT toute réserve pas de place ») | **à Mathias (n° 9)**. Proposé : la machine propose la taille au-dessus ; la réserve « pas de place » seulement si la taille est payée ET l'atelier refuse la taille au-dessus ; VER-071 n'alerte pas sur ces photos-là |
| B2 | VER-019 (P0) répare une photo de gens trop petite par R6 « sortir la plus faible », qui peut être bonne ; REC-153 (P0) | **tranché par M-09** : R6 seulement sur une photo déjà faible au sens du Tri ; sinon R5 (double voisine du même jour), R8, puis faute dite |

**Frontière Récit ↔ Assortiment (entorses, nombre de photos)**

| # | conflit | arbitrage |
|---|---|---|
| B4 | ASS-102 (P4) : une belle photo seule sur sa page, ou à deux ; MEP-057 et M-32 VALIDÉE : elle peut entrer dans une double dense qui a du sens, et y est la plus grande | **tranché par M-32** : ASS-102 reçoit l'exception |
| B16 | REC-123 : première double jamais dense ; REC-089 : la réunion de sujet se pose à la date de sa première photo (peut tomber juste après la page 1) | nous : le repli de REC-089 couvre la première double (la réunion glisse d'une double) ; annexe A-12 s'il veut l'inverse |
| B17 | plafond d'une double en fête : 9 (ASS-098) contre 12 (PARAM-TRV-008) ; 6 si des personnes (MEP-064, P0) | nous : 9, 12 en série voulue, 6 avec des personnes |
| B20 | grandes entorses : 2 (transverse) contre 1, 2, 3 selon la taille (REC-082) contre 3 dès 14 doubles | nous : 2, et 3 dès 14 doubles (annexe A-09) |
| B23 | REC-090 : réunion muette par défaut ; M-22 VALIDÉE : « grande entorse titrée » | **à Mathias (n° 3)** : sa parole et son magazine se contredisent |
| B21 | la fin : au revoir par défaut en voyage (REC-162) ; « nous deux » pour un couple (12, table 3.4) ; « gens » (S-055) | **à Mathias (n° 1)** |

**Frontière Assortiment ↔ Mise en page (tailles, formes)**

| # | conflit | arbitrage |
|---|---|---|
| B13 | définition d'une demi-page : 150 ppp (TRI-042) contre 200 (ASS-068) | nous : 150 plancher, 200 pour une pleine ou un héros (MEP-142) |
| B6 | TRI-056 (P0) écarte sous 100 ppp ; VER-021, VER-089 (P1) bloquent l'impression sous 150 : une photo entre les deux n'est ni écartée ni imprimable | nous : un seul seuil `ppp_plancher` = 150 |
| B8 | `air_tete` = 0,15 dans la zone importante (LEC-073) et 0,25 dans la pose et le contrôle (MEP-076, VER-013), tous P0 : la pose rogne à 0,15, le contrôle bloque à 0,25 | nous : 0,15 dans la zone (code), 0,25 devient un confort P5 |

**Frontière Mise en page ↔ Habillage (place du texte)**

| # | conflit | arbitrage |
|---|---|---|
| B3 | MEP-126 (P0) : « une couleur seule ne sauve pas » une page presque vide ; TXT-030, TXT-031 : un fond du nuancier si aucun fait ; M-07 VALIDÉE : « soit du texte, soit de la couleur » | **tranché par M-07** : un fond sauve la page ; MEP-126 à corriger |
| B7 | texte au pli : 20 mm (MEP-014, P1) contre 10 mm (POL-032, P1) | nous : 20 mm jusqu'à l'exemplaire témoin de l'imprimeur |
| B18 | corps minimal d'une légende : 8 pt bloque (VER-082, P1), 7 pt permis (POL-031, P1) | nous : 8 pt jusqu'à l'épreuve imprimée |
| B11 | les lieux s'écrivent selon le THÈME (TXT-023 : circuit = partout) mais la table des profils les règle par PROFIL (couple = chapitres) | nous : par thème (M-05 : le thème choisit la façon de nommer) ; la valeur par défaut va à Mathias (n° 4) |
| B19 | lieu nommé : 300 m (LEC-133) contre 150 m (TXT-006) ; confirmation d'un panneau : 300 m (LEC-136) contre 5 km (TXT-007) | nous : deux paramètres (chercher, titrer) ; la confirmation au niveau de la commune |
| B24 | titre sans lieu : les dates (TXT-003, consigne « des faits ») contre M-05 VALIDÉE « le nom thématique reste le repli » | **à Mathias (n° 5)** |
| B22 | couverture d'un couple : « le duo » (CV-007, table 12) contre « la meilleure idée » (23) | **à Mathias (n° 14)** |
| B12 | `sobriete` : STY-013 donne P1 = 0,8 sur une échelle « 0 sobre, 1 audacieux », l'inverse de M-06 (famille = sobre) et des transverses | **tranché par M-06** : STY-013 à corriger |

**Tout ↔ Revérification**

| # | conflit | arbitrage |
|---|---|---|
| B5 | VER-030 (P0) bloque toute photo vue deux fois, couverture comprise ; CV-014 variante B (et sa pratique) permet la couverture à l'intérieur | VER-030 lit `couverture_dans_interieur` ; la valeur va à Mathias (n° 6) |
| B14 | essais de réparation : 6 par faute, 24 par double, 400 par magazine (VER-003) contre 3 et 5 tours (10 §7.4) | nous : 3 par faute, 5 tours, plafond magazine gardé |
| B15 | VER-002 : « jamais un P0 accepté » ; consigne : « l'atelier corrige tout d'un clic et ses corrections priment » | **à Mathias (n° 13)**. Proposé : la machine ne viole jamais un P0 ; un geste de l'atelier s'applique, marqué, et l'impression attend sa signature |

**Lecture ↔ tous (qui compte les personnes)**

| # | conflit | arbitrage |
|---|---|---|
| B9 | trois seuils de « nos personnes » : 0,04 de la largeur (LEC-090), 0,06 de la hauteur (REC-004), 0,02 du cadre (CV-004) | nous : celui de la Lecture, lu par tous |
| B10 | le groupe : « le plus grand nombre récurrent » (M-04, LEC-108) contre « à égalité le plus petit » (REC-006) contre « la valeur la plus fréquente » (11, liste d) | nous : M-04 (le plus grand récurrent) plus le refus des foules (7 et plus sans pose, REC-006) ; « la plus fréquente » donnerait 2 pour une famille de 4 souvent photographiée par moitiés |

---

## 5. Les paramètres en double

**47 groupes : deux noms ou plus pour la même chose** (75 noms en trop). **17 de ces groupes ont des valeurs différentes.**

| on garde | les autres noms | valeurs |
|---|---|---|
| `personnes_cote_min_mm` | `personnes_taille_min_mm`, `gens_cadre_cote_min_mm`, `personnes_cote_min` | 70 mm partout |
| `personnes_surface_min_cm2` | `gens_cadre_surface_min_cm2`, `personnes_aire_min` | 100 cm² partout |
| `seuil_ppp_pleine` | `dpi_pleine`, `pleine_dpi_min`, `ppp_pleine` | 200 partout |
| `seuil_ppp_double` | `dpi_double_paysage`, `ppp_double_paysage`, `double_dpi_min` | 150 partout |
| `seuil_ppp_demi` (nouveau) | `dpi_demi`, `demi_page_dpi_min` | **150 contre 200** |
| `ppp_plancher` | `dpi_inimprimable` | **150 contre 100** |
| `densite_plafond`, `densite_visee` | `plafond_densite`, `densite_plafond_p3`, `densite_visee_p1` | mêmes valeurs |
| `pages_min_vendues`, `pages_max_vendues` | `pages_vendues_min`, `pages_min`, `pages_vendues_max`, `pages_max` | 24 et 60 |
| `jour_fort_part` | `part_jour_fort` | 0,2 ; **et deux autres définitions** d'un jour fort : 6 photos (TXT-025), 3 fois la médiane (REC-054) |
| `groupe_recurrence_min` | `recurrence_groupe_min`, `groupe_min_photos` | 3 |
| `visage_sujet_min` | `visage_premier_plan_min`, `passant_si_visage_sous`, `taille_visage_groupe_min` | **0,04, 0,06, 0,03, 0,02** |
| `part_gens_garantie` | `gens_ecart_max`, `ecart_part_gens_max` | 10 points |
| `texte_pli_mm` | `pli_texte_mm`, `marge_texte_pli_mm` | **20 contre 10** |
| `texte_bord_mm` | `marge_texte_bord_mm` | 10 (et 15 mm écrit en dur dans MEP-183) |
| `titres_max_double` | `titres_lieu_par_double_max` | 2 |
| `couverture_dans_interieur` | `couverture_doublon_interieur` | **non contre « à trancher »** |
| `lieux` | `lieux_affiches` | nouveaux |
| `recadrage_franchise` | `mode_recadrage_sobre`, `_equilibre`, `_stylise` | normal ; prudent en sobre |
| `sobriete` | `sobriete_par_profil`, `sobriete_long_voyage`… | **échelle inversée** dans STY-013 |
| `entorses_max` | `entorses_max_normal`, `_strict`, `_genereux` | **2 contre 1, 2, 3** |
| `lieu_lectures_min` | `lectures_lieu_lu_min_sans_gps`, `lieu_sur_lectures_min` | 2 |
| `lieu_nomme_rayon_m` | `distance_lieu_nomme_max_m`, `distance_confirmation_gps_km` | **300 m, 150 m, 5 km** |
| `part_regard_fin`, `budget_ia_projet` | `part_regard`, `budget_projet_eur` | 0,25 ; 1 € |
| `occupation_min` | `seuil_page_vide` | 0,40 |
| `heros_rapport_min` | `rapport_heros_satellite_min` | **1,7 contre 1,8** |
| `air_tete` | `air_tete_min` | **0,15 et 0,25 du visage ; 0,05 de l'image** |
| `corps_legende_min_pt` | `legende_corps_min`, `corps_legende_pt` | **7 pt contre 8 pt** |
| `essais_reparation` | `essais_par_faute` | **3 contre 6** |
| `photos_max_double` | plafond de fête dans ASS-098 | **12 contre 9** |
| `fin_type` | `fin_voyage`, `fin_relation` | **auto, au revoir, gens** |
| `sommet_position` | `sommet_fenetre_min`, `sommet_fenetre_max` | **45 à 80 % contre 55 à 75 %** |
| `seuil_ton_ludique` | `ton_ludique_min` | **0,6 contre 0,4** |
| `respiration_toutes_les` | `calme_pages` | **5 à 7 doubles contre 1 page sur 6** |
| et 14 groupes sans écart de valeur | `lecture_ecarter_max`, `lot_date_part_min` (l'un nommé « min », l'autre « max »), `couple_defaut`, `part_top_image`, `vignette_mm`, `sujet_reunion_min`, `ouverture_forme`, `part_pleines_pages`, `tres_large_ratio`, `secondaire_bord_part`, `pellicules_par_magazine_max`… | |

**8 noms à deux sens ou deux valeurs** : `marge_pli_mm` (bande interdite aux visages, 15 mm, ET marge des pages margées, 20 mm) ;
`pellicule_min` (30 en durée, 4 en photos) ; `flou_relatif` (un seuil, puis un facteur par profil) ; `reunion_forme` ; `respiration_toutes_les`
(5 contre 5 à 7) ; `rapport_echelle` (corps de texte, et rapport de taille de deux photos) ; `air_tete` ; `couverture_dans_interieur`.
Le détail est dans `parametres.json` (champs `synonyme_de`, `nom_garde`, `meme_nom_deux_sens`).

---

## 6. Les contrats entre moteurs : les trous

Ce que chaque moteur dit attendre (sections de fin des lots) contre ce que le précédent rend vraiment.

| # | trou | qui attend | qui devrait rendre | correction proposée |
|---|---|---|---|---|
| T1 | **Cercle Mise en page ↔ Habillage** : la Mise en page veut « les textes annoncés par le moteur 6 » pour leur garder une place ; l'Habillage veut « de la place pour le texte » de la Mise en page ; or l'Habillage tourne APRÈS | MEP, HAB | — | couper l'Habillage en deux : **6a l'annonce des textes** (TXT-023 à TXT-028 : quelle page porte quel fait) tourne sur le chemin de fer, avant la Mise en page, et remplit le champ « titre attendu » d'ASS-141 ; **6b** écrit les mots, les couleurs, les polices |
| T2 | la **zone calme dans le cadre POSÉ**, en mm | HAB (TXT-029, CV-010) | MEP | ajouter au paquet `MAQUETTE` |
| T3 | les **couleurs de la partie visible** après recadrage, la dominante pondérée par surface | HAB (COU-055) | MEP (l'Assortiment ne connaît pas les surfaces) | ajouter au paquet `MAQUETTE` |
| T4 | le drapeau **protégée** de chaque photo (coup de cœur, gardée, belle du dixième fort) | MEP (MEP-002) | ASS : absent de « ce que l'Assortiment rend » | porter les protections du Tri jusqu'au `CHEMIN_DE_FER` |
| T5 | le **vocabulaire des rôles** : la Mise en page attend pleine, double, héros, vue d'ensemble, satellite, détail + un « poids » ; l'Assortiment rend héros, satellite, détail, pancarte, ambiance, série, réunion, ouverture, sommet, fin + une taille relative ; aucun « poids » | MEP | ASS | une table de correspondance ; le poids = la taille relative |
| T6 | le **côté de page** : ASS-135 rend la page de chaque photo « contractuelle » ; MEP-001 dit que la Mise en page choisit le côté | MEP | ASS | l'Assortiment propose, la Mise en page peut échanger DANS la double, jamais hors d'elle |
| T7 | la **candidate « au revoir »** | REC (attend du Tri) | personne (INFO-148 « nouvelle ») | le Récit la calcule lui-même (REC-158 le décrit déjà) : changer le contrat |
| T8 | la **photo de transit** | REC (REC-022, REC-028) | Lecture : seulement « changement de lieu » (LEC-142) ; l'IA ne rend aucun sujet « transport » | ajouter « transport » à la liste fermée du sujet en planche |
| T9 | **nos personnes** séparées des passants | REC, TRI, HAB | Lecture : écrit (LEC-087) mais pas obtenu aujourd'hui (INFO-052) ; trois seuils (B9) | à construire en premier |
| T10 | la **taille proposée** du Tri (TRI-043) | ASS (ASS-137 recalcule sa taille relative sans la citer) | TRI | ASS-137 part de TRI-043 |
| T11 | la **richesse d'un chapitre** (TRI-101) | TRI | REC, qui tourne après | le Tri lit un substitut (photos du lieu et du jour), dit par l'auteur ; à garder tel quel |
| T12 | les **candidates de couverture** | HAB (attend de l'Assortiment) | personne à l'Assortiment ; CV-003 les cherche lui-même ; REC-169 les réserve | CV-003 propriétaire ; le contrat de l'Assortiment n'en parle plus |
| T13 | le **plafond de gens par double** (6) | MEP (MEP-064, P0) | ASS-077 l'a, mais la table de densité (ASS-104, ASS-098) ne le cite pas | ASS-104 borne aussi par `personnes_max_double` |
| T14 | la **langue du client** | HAB (TXT-061, TXT-062) | aucune question | français par défaut ; une question à l'atelier plus tard |
| T15 | les **données de l'imprimeur** (pli, seuil ppp, profil couleur, dos) | MEP, HAB, VER | l'imprimeur | une seule demande, avec un exemplaire témoin |

---

## 7. Les règles mortes, les dormantes, les informations orphelines

**Mortes (6)** : elles lisent une information que personne ne produit, ni le code (11-INFORMATIONS), ni une règle de Lecture.

| règle | ce qui manque |
|---|---|
| MEP-086 | le squelette (articulations) |
| MEP-109 | la netteté par zone |
| ASS-073 | l'angle de prise de vue |
| POL-020 | l'ambiance en neuf mots : la Lecture en rend cinq autres (calme, vivant, festif, intime, grandiose) |
| POL-022 | la saison selon l'hémisphère (déductible du GPS et de la date, mais personne ne la calcule) |
| COU-046 | l'heure du coucher du soleil au lieu et à la date (la Lecture prend des heures fixes) |

**Dormantes (20)** : elles tiennent avec leur repli en attendant une donnée : l'imprimeur (COU-035, COU-036, VER-095, CV-018), la mesure des
polices (POL-003, POL-010), un horizon fiable (MEP-090 à MEP-092, MEP-123, VER-042), la langue (TXT-061, TXT-062), un masque (CV-012, COU-002),
le tag « motif répétitif » (MEP-163), la zone calme posée et les couleurs posées (TXT-029, CV-010, COU-055 : trous T2, T3), le transit (REC-022).

**Informations orphelines** (produites ou obtenues, lues par aucune règle) :

| information | état | ce qu'elle devrait décider |
|---|---|---|
| INFO-078 profil lu par l'IA voyage | payée | recouper le profil compté (LEC-165 lit le « qui », pas le profil) |
| INFO-080 doutes de l'IA voyage | payée | choisir les doutes avoués (Q-D) |
| INFO-081 style conseillé | payé | l'école de départ (12, 4.1 le dit ; aucune règle ne l'écrit) |
| INFO-085 grande ville à 50 km | rendue par LEC-133 | le repli d'un titre sans ville connue |
| INFO-100 rang dans le moment | calculée | rien : l'Assortiment choisit le héros sur d'autres critères (ASS-012) |
| INFO-111 part de portraits | calculée au banc | rien (le format est unique) |
| INFO-129 moment le plus important (Q-A05) | question écrite | le sommet : aucune règle du Récit ne la lit |
| INFO-062 description (une phrase) | payée | seulement l'IA voyage ; aucune règle |
| INFO-137 plaintes « Ça ne va pas » | à créer | le banc seulement (normal) |

---

## 8. Les règles qui nomment un projet, un lieu ou une photo

**Dans le corps de la règle (7, à corriger)** :
- **STY-024** : un exemple qui nomme une ville et un objet d'un projet de test → « titre <ville> : lieu GPS nouveau ».
- **MEP-017** (dans ses paramètres) et **MEP-031** : des numéros de pages d'un magazine de référence → à déplacer en exemple.
- **REC-131**, **POL-015**, **POL-018**, **TXT-064** : une catégorie culturelle (un objet de temple, un pays dans une liste de caricatures,
  une région voisine, une transcription) qui recoupe les deux magazines de référence. Générales au fond ; à reformuler par prudence.

**Dans les colonnes « source » et « vérifiable sur » (281 règles)** : des codes de magazines de référence, et souvent des numéros de photos
(« quelques photos »). La consigne les autorise comme exemples, mais demande qu'ils soient « cités à part » : à déplacer dans les sections
« exemples de vérification ». La page `vue/socle.html` les retire.

---

## 9. Le bilan

| | règles | part |
|---|---|---|
| **tiennent telles quelles** | 1049 | 85 % |
| tiennent, repli à écrire (interdictions P3 à P7 sans repli) | 82 | 7 % |
| **à fusionner** (doublons) | 34 | 3 % |
| **à corriger** (cèdent à une règle plus haute, ou contredisent sa parole, ou nomment un projet) | 20 | 2 % |
| **à trancher** (conflit au même niveau) | 23 | 2 % |
| dormantes (attendent une donnée) | 20 | 2 % |
| **mortes** | 6 | 0,5 % |

**Ce que ça veut dire.** Les moteurs s'emboîtent : l'échelle P0 à P7 règle la moitié des conflits trouvés, les replis évitent les impasses.
Les vrais défauts ne sont pas les règles une à une, mais **trois cercles** : la réserve « pas de place » (B1, B2), le texte qui arrive
après la mise en page (T1), et la mesure des personnes faite trois fois (B9, B10). Et **une faiblesse de méthode** : la recherche de conflits
par mots-clés ne voit pas tout ; le test « qui fait céder qui » (10 §7.3, test b) sur les magazines de référence est le seul vrai juge.
