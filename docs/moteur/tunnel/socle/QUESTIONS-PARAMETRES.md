> **Copie nettoyée (M-01) de `12-QUESTIONS-PARAMETRES.md` du socle du 19/11**, écrite par `scripts/socle-import.ts` : ne pas éditer à la main.
> Les magazines de référence y sont nommés par leur profil (« réf. couple », « réf. famille »). Les règles vivent en données
> (`src/lib/mise-en-page/regles/socle/`) ; les réponses de Mathias du 19/11 sont dans `A-TRANCHER.md` (M-35 à M-57).
>
> **À jour des réponses du 19/11 :**
> - Q-C04 (l'occasion) se lit dans le dossier, jamais une question de plus (M-54) ; Q-C09 est retirée (M-55).
> - Q-A08 à Q-A13 sont tranchées (M-42, M-38, M-35, M-36, M-45, M-40) ; la question « un couple reste couple » reste ouverte (il ne l'a pas comprise).
> - Les tables de cette page sont en données : `QUESTIONS-TABLE.md` et `PARAMETRES.md` (générés).

# 12 · Paramètres, questions, profils, curseurs de goût

Auteur : l'architecte du socle, 19/11/2026.
« Chaque choix de réponse doit appliquer des paramètres » (Mathias). Ce fichier dit : quels paramètres existent pour tout le système et
comment on les nomme (partie 1) ; quelles questions on pose, à qui, et ce que chaque réponse règle (partie 2) ; comment on reconnaît un
profil et un thème, et ce qu'ils règlent (partie 3) ; les neuf curseurs de goût et les huit écoles (partie 4).

**Ce que ce fichier couvre.** 48 paramètres transverses (PARAM-TRV-001 à PARAM-TRV-048) ; la convention de nommage pour les quatre autres auteurs ;
27 questions (10 au client dont 3 déjà posées par `/composer` et 2 en réserve, 13 à l'atelier, 4 doutes avoués) ; 6 profils, 7 thèmes, 3 modificateurs ; 9 curseurs, 8 écoles.

**Sources.** `definition/PARAMETRES.csv` et `RAPPORT.md` (§12, §13) ; `regles/PROFILS.md` et `QUESTIONS.md` du dépôt ; le code
(`compositeur/reglagesCompositeur.ts` : `PARAMETRES_PROFIL`, `REGLES_V2` ; `fiche.ts` : `QUESTIONS_CLIENT`, `profilDe`, `sobreDe` ;
`index.ts` : `densiteVisee`) ; MAC-2837 à MAC-2932 (questionnaire V1.1 et ses tables de configuration dérivée) ; MAC-2817 à MAC-2833
(curseurs, écoles, occasions) ; NO-351 à NO-392 ; décisions D-08, D-10, D-12, D-14, D-17 ; retours M-01 à M-34 ; enquête réf. couple (J-, C-).

**Règle de lecture.** RD = réglage de départ, à régler au banc, jamais un fait. Une valeur « (source) » vient d'un document ou d'une mesure ;
une valeur « RD » est une proposition. VALIDÉE = Mathias l'a dit lui-même.

---

## 1. Les paramètres

### 1.1 La convention de nommage (pour les cinq auteurs)

- **Identifiant** : `PARAM-<MOTEUR>-<NNN>`. MOTEUR ∈ `TRV` (transverse : lu par plusieurs moteurs ou réglé par une question), `LEC`, `TRI`,
  `REC`, `ASS`, `MEP`, `HAB`, `VER`. Un auteur numérote ses paramètres dans le préfixe de son moteur.
- **Nom** : snake_case français, unique dans tout le registre. Un paramètre transverse n'a pas de préfixe (`densite_visee`). Un paramètre de
  moteur commence par le sujet qu'il règle, pas par le moteur (`coupe_journee_cout`, `heros_taille_min`). Si deux auteurs créent le même nom
  pour deux sens différents, la fusion renomme le second avec le nom du moteur devant (`mep_marge_pli_mm`), et le registre le signale.
- **Fiche d'un paramètre** : nom, ce qu'il règle (une phrase), moteur(s), type (nombre et unité, oui/non, liste fermée), plage permise,
  valeur de départ par profil, effet visible quand il monte ou baisse, source de la valeur, statut (RD, mesuré, VALIDÉ), version.
- **Un chiffre dans une règle est TOUJOURS un paramètre nommé** (consigne commune). Un auteur peut lire un paramètre transverse sans le
  redéfinir ; il le cite par son nom.
- **Une plage est une limite dure** : aucun curseur, aucune réponse, aucun profil ne sort de la plage. Seule une correction de l'atelier sur
  un magazine peut en sortir, et la Revérification le note.

### 1.2 D'où vient la valeur d'un paramètre pour un magazine (l'ordre de résolution)

Chaque étape écrase la précédente, dans la plage :

1. **la valeur du socle** (version courante du registre) ;
2. **la valeur du profil** (partie 3) ;
3. **le décalage du thème** et des **modificateurs** (gros lot, fête, sans date) ;
4. **la position du curseur de goût** dans la fourchette du profil (partie 4) ; l'école choisie fixe les neuf curseurs ;
5. **la réponse** à une question (client, puis atelier) ;
6. **la correction de l'atelier** sur ce magazine.

Le paquet `REGLAGES` garde, pour chaque paramètre, sa valeur ET l'étape qui l'a fixée (« densite_visee = 2,25 : profil couple, curseur
densité à 0,25, aucune réponse »). C'est ce que le banc de réglages affiche (13-ENTRAINEMENT, partie 8).

### 1.3 Les paramètres transverses

Colonnes : id · nom · ce qu'il règle · moteurs · type et plage · valeur de départ · quand il monte (↑) / quand il baisse (↓) · source.
« par profil » renvoie à la table 3.4.

**Identité du projet**

| id | nom | règle | moteurs | type, plage | départ | ↑ / ↓ | source |
|---|---|---|---|---|---|---|---|
| PARAM-TRV-001 | profil | la façon de raconter | tous | P1 à P6 | deviné (3.2) | sans objet | PROFILS (17/11) ; code `PROFILS` |
| PARAM-TRV-002 | theme_album | la façon de découper et de nommer | REC, HAB | road_trip, ville, plage, fete, evenement, annee, autre | deviné (3.3) | sans objet | M-05 VALIDÉE ; définition v2 §5.1 ; code `THEMES` |
| PARAM-TRV-003 | groupe_taille | combien de personnes forment le groupe | TRI, REC, HAB | 1 à 60 | Q-C01, sinon déduit | ↑ la couverture et la fin exigent plus de monde ; ↓ un duo suffit | M-04 VALIDÉE |
| PARAM-TRV-004 | sobriete | le degré d'effets (cadres tournés, timbres, ruptures, fonds francs) | ASS, MEP, HAB | 0 (sobre) à 1 (stylisé) ; crans sobre 0,2, équilibrée 0,5, stylisée 0,8 (RD) | par profil | ↑ plus de formes hors grille et d'effets ; ↓ grandes photos, compositions nettes | M-06 VALIDÉE ; code `sobreDe` |

**Volume et densité**

| id | nom | règle | moteurs | type, plage | départ | ↑ / ↓ | source |
|---|---|---|---|---|---|---|---|
| PARAM-TRV-005 | densite_visee | photos par double en moyenne | REC (taille), ASS | 1,5 à 6 photos | milieu de la fourchette du profil ; −0,25 si sobre, +0,25 si stylisé | ↑ moins de pages, doubles plus pleines ; ↓ plus de pages, plus de grandes photos | PARAMETRES.csv ; code `densiteVisee` (N-48b) |
| PARAM-TRV-006 | densite_plafond | jusqu'où la densité monte avant de mettre une bonne photo en réserve | ASS | 2,5 à 8 | par profil (NON MESURÉ) | ↑ presque rien en réserve, risque de timbres ; ↓ plus de réserve « pas de place » | D1 ; M-16 (réglage) |
| PARAM-TRV-007 | densite_mode | « serrée » (monter jusqu'au plafond) ou « avant » (2,9 fixes) | ASS | liste | serrée | serrée : tout tient ; avant : comparaison témoin | M-16 ; code `REGLAGES_V2_DEFAUT` |
| PARAM-TRV-008 | photos_max_double | le plus grand nombre de photos sur une double normale | ASS, MEP | 4 à 12 | 9 (12 en P2) | ↑ planches denses permises ; ↓ magazine plus aéré | D8, M-23 VALIDÉE |
| PARAM-TRV-009 | photos_max_serie | le plus grand nombre sur une double de série voulue | ASS, MEP | 6 à 16 | 12 (16 en P2, 9 en P3, P5, P6) | idem pour les séries | D8, M-23 ; `PARAMETRES_PROFIL` |
| PARAM-TRV-010 | part_pleines_pages | part des pages tenues par une seule photo | ASS | fourchette 0 à 0,6 | par profil | ↑ plus de grandes photos ; ↓ plus de compositions | S-095 ; PARAMETRES.csv |
| PARAM-TRV-011 | taille_mode | qui fixe le nombre de pages | REC | machine, commandée, choisie, tout | machine | sans objet | M-15 VALIDÉE |
| PARAM-TRV-012 | pages_min_vendues | le plus petit magazine | REC, VER (P1) | entier, multiple de 4 | 24 | P1 | N-62 ; grille des prix ; D-04 (« on vise 30 ») |
| PARAM-TRV-013 | pages_max_vendues | le plus grand magazine vendu au public | REC, VER (P1) | idem | 60 | P1 | N-62 ; grille des prix |
| PARAM-TRV-014 | gros_lot_seuil | à partir de combien de photos le lot est « gros » (tri plus sévère, planches plus denses) | LEC, TRI | 100 à 2 PARAM-TRV-000 | 300 (RD) | ↑ moins de projets traités en gros lot | PROFILS (modificateur) |

**Exigence du tri**

| id | nom | règle | moteurs | type, plage | départ | ↑ / ↓ | source |
|---|---|---|---|---|---|---|---|
| PARAM-TRV-015 | exigence_tri | ce que la réserve accepte de prendre | TRI | exclusif, narrateur, collectionneur, instantané | narrateur | exclusif : seules les parfaites et les moments forts ; collectionneur : on n'enlève que le bruit ; instantané : l'émotion avant la technique | MAC-2902 à MAC-2905 (V1.1) ; M-09 VALIDÉE (« la réserve ne garde que les faibles » = collectionneur ou narrateur) |
| PARAM-TRV-016 | tolerance_photos_faibles | une photo floue ou sombre mais vivante passe-t-elle | TRI, MEP | basse, moyenne, haute (0,2 / 0,5 / 0,8, RD) | par profil | ↑ plus de photos vivantes imparfaites, en petit ; ↓ technique d'abord | PARAMETRES.csv (`tolerance_flou`) ; S-003, S-155 |
| PARAM-TRV-017 | part_top_image_protegee | la part la plus forte du lot (note image) qui ne sort jamais pour la taille | TRI, REC | 0 à 0,3 | 0,1 | ↑ plus de photos intouchables | N-49 ; V2-NOT-05 |
| PARAM-TRV-018 | personnes_taille_min_mm | côté minimal d'une photo de personnes | ASS, MEP, VER (P0) | 50 à 100 mm | 70 mm et 100 cm² (seuil RD, règle VALIDÉE) | ↑ moins de photos de gens par double ; ↓ risque de vignettes | M-08 VALIDÉE |
| PARAM-TRV-019 | part_gens_garantie | la part de photos avec des gens ne tombe pas de plus de N points sous leur part dans le lot | TRI, ASS | 0 à 30 points | 10 points (RD) | ↓ le tri peut vider le magazine des gens | S-154 généralisée |
| PARAM-TRV-020 | place_des_personnes | le poids des photos de gens face aux lieux et à l'ambiance | TRI, ASS, HAB | 0 (lieux) à 1 (gens) | 0,5, puis le curseur « Sujet » | ↑ plus de gens, couverture humaine ; ↓ plus de paysages et de détails | curseur Sujet (MAC-2821) ; « Focus » V1.1 (MAC-2913) ; ω_vis (MAC-2890) |

**Récit et forme d'ensemble**

| id | nom | règle | moteurs | type, plage | départ | ↑ / ↓ | source |
|---|---|---|---|---|---|---|---|
| PARAM-TRV-021 | poids_temps_contre_sujet | quand la chronologie et un sujet répété se disputent l'ordre | REC, ASS | 0 (le temps toujours) à 1 (le sujet d'abord) | 0,2 (RD) | ↑ plus de pages thématiques (plats, animaux) ; ↓ ordre strict | curseur Récit (MAC-2821) ; J-04 ; M-22 VALIDÉE (petite et grande entorse) |
| PARAM-TRV-022 | entorses_max | grandes entorses titrées par magazine | REC | 0 à 3 | 2 (normal) | ↑ plus de regroupements de sujet ; ↓ chronologie pure | D7, M-22 VALIDÉE ; N-52 |
| PARAM-TRV-023 | serie_sujet_regroupement | une série de sujet (3 photos et plus) peut-elle former une page | REC | oui / non | oui (RD, à trancher) | oui : les plats ensemble ; non : chacun à sa date | J-04 (son magazine du réf. couple) |
| PARAM-TRV-024 | fin_type | la dernière page | REC | gens, au_revoir, auto | auto (RD, à trancher) | gens : le groupe ; au_revoir : plan large et calme des derniers jours ; auto : au revoir s'il y a une image forte, sinon les gens | S-055 (hypothèse) contre J-06 (son magazine) |
| PARAM-TRV-025 | ouverture_forme | l'ouverture d'un chapitre | REC, ASS | page, double | page (RD) | page : une photo et le titre sur une page ; double : une photo seule sur la double | J-08 contre DA-1 (hypothèse) |
| PARAM-TRV-026 | sommet_position | où va la photo la plus forte | REC | fourchette 0,4 à 0,9 | par profil | ↑ sommet tard ; ↓ tôt | S-053 ; Notion R-50 (55 à 75 %) ; banc (45 à 80 %) |
| PARAM-TRV-027 | rythme_contraste | la part des passages francs d'une double grande à une double dense | ASS | 0 à 1 | par profil ; 0,6 en P1 (RD) | ↑ chocs d'échelle ; ↓ régularité apaisée | S-091 ; curseur Rythme |
| PARAM-TRV-028 | respiration_toutes_les | une double à 1 ou 2 photos tous les N doubles | ASS | 3 à 10 | 5 à 7 (RD, jamais éprouvé) | ↓ plus de respirations | S-051 |
| PARAM-TRV-029 | couverture_dans_interieur | une photo de couverture peut-elle être aussi à l'intérieur | REC, HAB | oui / non | non | oui : l'intérieur garde ses photos fortes ; non : pas de redite | M-10 VALIDÉE contre sa pratique (réf. couple) : à trancher |

**Textes et style**

| id | nom | règle | moteurs | type, plage | départ | ↑ / ↓ | source |
|---|---|---|---|---|---|---|---|
| PARAM-TRV-030 | quantite_texte | combien de texte au-delà des titres d'ouverture | HAB | 0 (aucun) à 1 (beaucoup) | 0,2 (RD) | ↑ légendes de faits, exergues ; ↓ les images parlent | curseur Texte ; D9 |
| PARAM-TRV-031 | lieux_affiches | où les lieux s'écrivent | HAB | chapitres, nouveaux, partout | nouveaux | partout : légende du lieu sûr sur chaque double ; chapitres : aux ouvertures seulement | M-24 VALIDÉE (question ouverte) ; code `ReglagesV2.lieux` |
| PARAM-TRV-032 | ton | le registre des titres | HAB | 0 (sobre, élégant) à 1 (ludique) | par profil | ↑ « Jour 3 », clins d'œil ; ↓ lieux en grand, sobre | curseur Ton ; PROFILS |
| PARAM-TRV-033 | finition | soigné ou brut assumé | MEP, HAB | 0 à 1 | 0,3 (RD) | ↑ rotations, imperfections, grain ; ↓ alignements parfaits | curseur Finition |
| PARAM-TRV-034 | couleur_travail | couleurs naturelles ou un look | HAB | 0 à 1 | 0,3 (RD) | ↑ filtres, noir et blanc ; ↓ telles quelles, légèrement réchauffées | curseur Couleur ; Notion ch.4 (« couleurs naturelles légèrement réchauffées ») |
| PARAM-TRV-035 | typo_audace | discrète ou titres géants | HAB | 0 à 1 | par école | ↑ mots géants, didones ; ↓ classique | curseur Typographie |
| PARAM-TRV-036 | fonds_couleur_max | part de doubles à fond coloré | HAB | 0 à 0,5 | 1 sur 3 | ↑ plus d'aplats | Notion R-133 |
| PARAM-TRV-037 | noir_et_blanc | l'usage du noir et blanc | HAB | proposé, une double sur N, jamais | proposé (1 double sur 3 en P2) | | S-157 ; FILTRES |
| PARAM-TRV-038 | recadrage_franchise | combien d'air on laisse, combien on resserre | MEP | prudent, normal, franc | normal (prudent si sobre) | franc : resserre fort ; prudent : beaucoup d'air | M-29 VALIDÉE ; code `ReglagesV2.recadrage` |
| PARAM-TRV-039 | ecole | le préréglage des neuf curseurs | tous | les 8 écoles (partie 4) | désignée par le lot et le profil | sans objet | MAC-2827, MAC-2833 |

**Fabrication (P1)**

| id | nom | règle | moteurs | type, plage | départ | ↑ / ↓ | source |
|---|---|---|---|---|---|---|---|
| PARAM-TRV-040 | seuil_ppp_pleine | définition minimale en pleine page | TRI, MEP, VER | 150 à 300 | 200 (provisoire, imprimeur non consulté) | ↑ moins de pleines pages | S-004 ; Q-14 Notion |
| PARAM-TRV-041 | seuil_ppp_double | définition minimale en double, paysage sans visage | idem | 120 à 300 | 150 (provisoire) | idem | D6, M-21 VALIDÉE (provisoire) |
| PARAM-TRV-042 | marge_pli_mm | bande interdite aux visages et aux corps de chaque côté du pli | MEP, VER | 5 à 30 mm | 15 (hypothèse) | ↑ moins de photos traversent le pli | P-15, DA-3 ; Q-02 Notion |

**Machine et boucle**

| id | nom | règle | moteurs | type, plage | départ | ↑ / ↓ | source |
|---|---|---|---|---|---|---|---|
| PARAM-TRV-043 | budget_ia_projet | plafond de dépense IA par projet | LEC | 0,2 à 2 € | 1 € | ↓ moins de regards fins | Notion 17/11 (NO-416) |
| PARAM-TRV-044 | part_regard_fin | part du lot regardée une à une | LEC | 0 à 0,5 | 0,25 | ↑ plus de lieux lus, plus d'expressions ; coût | code `PART_REGARD` (RD) |
| PARAM-TRV-045 | confiance_question | confiance sous laquelle une réponse devinée DOIT être demandée | LEC | 0,5 à 0,95 | 0,7 (RD), réglable par question | ↑ plus de questions ; ↓ plus de devinettes | MAC-2881 (0,60 pour le thème, V1.1) ; neuve |
| PARAM-TRV-046 | doutes_max | doutes avoués par magazine | LEC | 0 à 5 | 3 | ↑ plus de questions | Notion ch.9 ; V2-Q-02 |
| PARAM-TRV-047 | essais_reparation | essais par faute, tours complets | VER | 1 à 10 ; 1 à 10 | 3 ; 5 (RD) | ↑ plus de réparations, plus long | 04-METHODES (« boucle à borner ») ; neuve |
| PARAM-TRV-048 | graine | la variante tirée | ASS, MEP | entier | 0 | une autre graine = une autre variante, jamais un mélange au hasard | MAC-1873 |

---

## 2. Les questions

### 2.1 Les principes

1. **Une question seulement si la réponse ne se devine pas avec assez de confiance** (règle d'or 1, NO-359 ; MAC-2838 « validation silencieuse »).
   Chaque question a un « devineur » qui rend une valeur ET une confiance entre 0 et 1. Sous `confiance_question` (PARAM-TRV-045), elle est posée.
2. **Toutes sont facultatives** : une question vide garde la valeur devinée et la marque « à vérifier ». Jamais « combien de pages » (M-15),
   jamais « qui est qui » (D29).
3. **Le client ne voit jamais plus de quatre choix sur tout le parcours** (règle d'or 2, NO-359 ; « trop de choix fige », NO-372) : trois
   questions au plus, le style, la couverture. L'atelier, lui, peut tout voir (consigne : « au début il accepte de répondre à plus de questions »).
4. **Chaque réponse applique des paramètres, écrits ci-dessous, avec leur valeur ou leur décalage.** Une réponse ne règle jamais une règle
   directement : elle règle un paramètre, et le paramètre reste dans sa plage.
5. **Une question de RÉGLAGE se pose une fois au banc, pas à chaque magazine.** Mathias y répond par profil ; la réponse devient la valeur
   de départ du profil (version). Une question de MAGAZINE se pose sur un dossier.
6. **La réponse ne réécrit jamais la lecture** (MAC-3011 : « les réponses utilisateur ne doivent jamais être réécrites par les moteurs ») ;
   un changement de réponse relance le Tri ou le Récit, jamais l'IA (MAC-2939).

### 2.2 Les questions au client (Q-C)

**Déjà posées par `/composer`, jamais redemandées** (M-25) :

| id | question | réponses | ce que chaque réponse règle | devinable ? |
|---|---|---|---|---|
| Q-C04 | « Quel était ce moment ? » (occasion) | texte libre court | candidat de `theme_album` (confiance 0,5 au plus, RD : les données priment, PROFILS règle d'or) ; transmis à l'IA voyage | non : c'est sa parole |
| Q-C05 | Son histoire | texte libre | transmise à l'IA voyage (aujourd'hui non, C10) ; les mots règlent `ton` : « fou rire », « délire » → ton +0,2 ; « paisible », « doux » → ton −0,2, finition −0,1 ; « épique », « aventure » → rythme_contraste +0,15 (RD ; Notion ch.4 : « les mots de l'histoire donnent le ton ») | non |
| Q-C06 | « Donnez un titre à votre numéro » | texte | titre de couverture et page 1, seul texte qu'on n'invente pas | non |

**Les trois questions du parcours** (M-25 VALIDÉE ; code `QUESTIONS_CLIENT`) :

| id | question | réponses possibles | ce que chaque réponse règle | deviner : avec quoi, quelle confiance | DOIT être posée si | disparaîtra quand |
|---|---|---|---|---|---|---|
| Q-C01 | « Combien étiez-vous ? » | un nombre ; « ça changeait » | `groupe_taille` = n. n = 1 : `place_des_personnes` −0,2, fin_type ≠ gens (une personne seule n'est pas « le groupe ») ; n = 2 : profil candidat P3 (signal fort), couverture « le duo », fin « nous deux » ; n = 3 à 6 : P1 ou P6 selon la durée, couverture et fin au groupe complet ; n ≥ 7 : couverture sans personne ou groupe entier seulement (M-04), `photos_max_double` +2 (RD) ; « ça changeait » : `groupe_taille` vide, M-04 devient « jamais une partie du groupe principal » sur la couverture seulement | INFO-052 nos personnes : la valeur la plus fréquente sur les photos dont le sujet est « personnes » ; confiance = part de ces photos où elle se vérifie, divisée par 2 si le plus grand compte dépasse la valeur fréquente de 3 ou plus (RD) | confiance < 0,7, ou moins de 5 photos de gens, ou désaccord avec l'IA voyage (« qui ») | INFO-052 juste à 95 % sur le jeu de référence (RD) |
| Q-C02 | « Les lieux ou les étapes à ne pas oublier ? » | liste ordonnée ; vide | chapitres bornés et nommés par ces étapes (M-05) ; 3 étapes ou plus → `theme_album` = road_trip (confiance 0,9) ; `lieux_affiches` inchangé | INFO-082 villes : confiance = part des photos géolocalisées × part géocodée | moins de 80 % des photos ont un GPS (RD) | jamais pour un lot sans GPS ; tout de suite pour un lot géolocalisé |
| Q-C03 | « Vos photos préférées ? » | 3 à 10 photos d'un geste ; aucune | coup de cœur : taille méritée au moins pleine page si la définition suit (N-49) ; candidate couverture ; jamais en réserve | non : « ni la machine ni l'atelier ne savent ce qui touche le client » (définition v2 §13) | toujours offerte, jamais exigée | jamais (c'est un geste signifiant, effet IKEA, NO-371) |

**Les deux choix du parcours** (D-17, D-08) :

| id | choix | réponses | ce que chaque réponse règle | recommandé (pré-ouvert) | disparaîtra quand |
|---|---|---|---|---|---|
| Q-C07 | Le style | un panneau parmi 4 montrés au plus (D-14 : Grand magazine, Galerie, Récit, Carnet ; voir 4.3) ; chacun montre une vraie double de SES photos (NO-361) | fixe `ecole` (PARAM-TRV-039), donc les neuf curseurs (table 4.2) | l'école la plus proche du vecteur pré-réglé par le lot (4.1) et de `style_conseille` de l'IA voyage | jamais (choix de plaisir) ; il peut devenir « déjà choisi, changer ? » quand la recommandation est gardée dans 90 % des cas (RD) |
| Q-C08 | La couverture | un couple 1re et 4e parmi 3, un recommandé (R-81, NO-372) | `couverture` ; avec `couverture_dans_interieur` = non, l'intérieur se recompose (M-10) | le premier du classement sous M-03 et M-04 | jamais |

**En réserve, à essayer (pas dans le parcours tant que les quatre choix sont pris)** :

| id | question | réponses | ce que chaque réponse règle | source |
|---|---|---|---|---|
| Q-C09 | « Dans cinq ans, qu'est-ce qui vous touchera le plus ? » (deux choix) | options calculées sur SES photos avec leur part : les gens (22 %), les paysages (38 %), les animaux, les lumières, les repas… | choix « les gens » : `place_des_personnes` +0,25 ; « paysages » ou « lumières » : −0,2 ; un sujet choisi : bonus de note histoire aux photos de ce sujet, quota minimal (RD) | MAC-2915, MAC-2917 (« à vérifier ») |
| Q-C10 | « Des lieux à ne pas montrer ? » (cocher et décocher) | liste des lieux détectés avec leur nombre de photos | les photos du lieu décoché sortent de la sélection ; le Récit se recompose | Notion Av #11, MAC-2972 |

### 2.3 Les questions à l'atelier (Q-A)

Elles sont pré-remplies à l'arrêt 1 avec « deviné » ou « saisi » (définition v2 §14). Les questions de MAGAZINE (Q-A01 à Q-A07) se
corrigent sur un dossier ; les questions de RÉGLAGE (Q-A08 à Q-A13) se tranchent une fois par profil au banc.

| id | question | réponses | ce que chaque réponse règle | deviner avec, confiance | DOIT être demandée si | disparaîtra quand |
|---|---|---|---|---|---|---|
| Q-A01 | Thème d'album | road_trip, ville, plage, fete, evenement, annee, autre | `theme_album` : découpe et noms (table 3.3) | INFO-113 villes, 105 durée, PARAM-TRV-076 type lu, Q-C04 ; voir 3.3 | deux candidats à moins de 0,2 l'un de l'autre (RD) ; confiance < 0,6 (MAC-2881) | thème juste à 95 % sur 20 magazines (RD) |
| Q-A02 | Profil | P1 à P6 | tout le bloc de la table 3.4 | 3.2 : « qui » et forme du temps | deux signaux forts contradictoires (3.5) | profil juste à 95 % sur 20 magazines (RD) |
| Q-A03 | Ambiance | sobre, équilibrée, stylisée | sobre : `sobriete` 0,2, `densite_visee` −0,25, ruptures 0, `recadrage_franchise` prudent, `noir_et_blanc` proposé seulement ; équilibrée : 0,5, rien ; stylisée : 0,8, densité +0,25, une rupture sur 4 doubles, cadres tournés permis | profil (famille = sobre, M-06) ; part de photos déjà retouchées (INFO-120) | jamais exigée | quand l'ambiance gardée = l'ambiance devinée dans 90 % des cas (RD) |
| Q-A04 | Le titre (si le client n'en a pas donné) | texte | titre de couverture et page 1 | lieu ou pays et dates (V2-TXT-03) | jamais exigée | jamais |
| Q-A05 | Le moment le plus important | une photo ou un jour | `sommet` imposé à ce moment (dans la plage de `sommet_position` si possible, sinon il prime : correction) | la photo la plus forte entre les bornes du profil | jamais exigée | sans objet |
| Q-A06 | Lieux à ne pas montrer | liste | sortie des photos du lieu ; Récit recomposé | un lieu de domicile ou de passage (INFO-087, rang « passage ») | jamais exigée | sans objet |
| Q-A07 | Où (pays, région) corrigé | texte | titre ; passe avant le pays lu | INFO-083, PARAM-TRV-075 | jamais exigée | sans objet |
| Q-A08 | La densité quand tout ne tient pas | serrée, avant | `densite_mode` | sans objet | question de réglage (M-16 : « deux versions côte à côte, il tranche à l'œil ») | tranchée une fois par profil |
| Q-A09 | Les lieux : aux chapitres, nouveaux, partout ? | chapitres, nouveaux, partout | `lieux_affiches` | sans objet | question ouverte (M-24) | tranchée une fois par profil |
| Q-A10 | La dernière page | gens, au revoir, auto | `fin_type` | sans objet | contradiction S-055 / J-06 | tranchée une fois par profil |
| Q-A11 | Les sujets répétés (plats, animaux…) | rassembler, laisser dans le temps | rassembler : `serie_sujet_regroupement` oui, `entorses_max` ≥ 1, `poids_temps_contre_sujet` +0,2 ; laisser : non | sans objet | J-04 | tranchée une fois par profil |
| Q-A12 | Le recadrage | prudent, normal, franc | `recadrage_franchise` | sans objet | M-29 | tranchée une fois par profil |
| Q-A13 | Une photo de couverture aussi à l'intérieur ? | oui, non | `couverture_dans_interieur` | sans objet | M-10 contre sa pratique | tranchée une fois (ou par profil) |

### 2.4 Les doutes avoués (Q-D), au plus `doutes_max` par magazine

Posés seulement quand la machine hésite vraiment (V2-Q-02, Notion ch.9) ; on choisit les doutes qui changent le plus de doubles. Sans
réponse, la machine garde son choix et le marque « à vérifier ».

| id | question | quand | réponses | ce que la réponse règle |
|---|---|---|---|---|
| Q-D01 | « Où va cette photo sans date ? » | placement par ressemblance de confiance < 0,6 (RD) | un chapitre, une voisine | INFO-149 fixé |
| Q-D02 | « Cette photo est-elle importante ? » | seule trace d'un moment ET technique faible | oui, non | oui : gardée en petit, jamais en réserve ; non : réserve |
| Q-D03 | « Ces photos viennent-elles du même moment ? » | deux appareils aux heures décalées (S-086) | oui, non | recalage d'horloge appliqué ou pas |
| Q-D04 | « Ce nom est-il un lieu ou une enseigne ? » | nom lu sans GPS pour le confirmer et sorte incertaine | lieu, enseigne, document | INFO-064 fixé ; un lieu peut devenir titre |

### 2.5 L'ordre des questions

**Client** (D-11 : les photos d'abord) : dépôt des photos → écrans de `/composer` (occasion, histoire, titre) → pendant la lecture : Q-C01
SI le doute est là, Q-C02 SI pas de GPS, Q-C03 toujours offerte → révélation → Q-C07 style (l'école proposée déjà ouverte) → pages →
Q-C08 couverture, en dernier (D-08).

**Atelier** : arrêt 1, la ligne du projet (Q-A01, Q-A02, Q-A03, Q-A07), puis les doutes (Q-D), puis Q-A05 et Q-A06 s'il veut ; Q-A04
avant les finitions s'il manque un titre. Les questions de réglage (Q-A08 à Q-A13) ne sont pas dans le dossier : elles sont dans le banc.

### 2.6 Ce qui disparaîtra quand la machine aura appris

| Question | Ce qui doit être prouvé sur le jeu de référence (13-ENTRAINEMENT) |
|---|---|
| Q-C01 combien | INFO-052 nos personnes juste à 95 % (RD) |
| Q-C02 lieux | sans objet pour un lot géolocalisé ; jamais pour un lot sans GPS |
| Q-A01 thème, Q-A02 profil | gardés sans correction sur 20 magazines de suite (RD) |
| Q-A03 ambiance | idem |
| Q-D01 à Q-D04 | quand le placement, le recalage et la sorte des noms ont une exactitude mesurée au-dessus du seuil de la règle |
| Q-A08 à Q-A13 | tranchées une fois : elles deviennent des valeurs de profil versionnées |
| Ne disparaissent jamais | Q-C03 préférées, Q-C07 style, Q-C08 couverture (gestes signifiants), Q-C04 à Q-C06 (sa parole) |

---

## 3. Les profils et les thèmes

### 3.1 Deux axes, pas un

L'erreur constatée (C15) : le thème « circuit » décidait le profil « long voyage en famille ». **Le thème dit comment DÉCOUPER et NOMMER ;
le profil dit comment RACONTER.** Ils se lisent sur des données différentes et ne se déduisent jamais l'un de l'autre.

- Le **profil** se lit sur deux axes mesurables : **qui** (seul, couple, famille, amis, groupe large) et **la forme du temps** (un jour ou un
  week-end, séjour court, long voyage, année), plus un **modificateur d'énergie** (fête).
- Le **thème** se lit sur les lieux et la durée : combien de villes, dans quel ordre, un seul endroit ou un trajet.

Exemple : un couple, 21 jours, 8 villes dans l'ordre du trajet = **thème road trip** (chapitres par étapes, titres de villes) et **profil
couple P3** (2 à 3 photos par double, 40 à 55 % de pleines pages, fin « nous deux » ou au revoir). Ce que l'IA voyage avait lu juste (C13).

### 3.2 Reconnaître le profil

| Ordre | Si… (données) | alors profil | source |
|---|---|---|---|
| 1 | l'atelier a corrigé le profil | sa correction | M-34 |
| 2 | durée de 1 à 3 jours ET 80 photos ou plus dans un temps court | P4 événement | PROFILS |
| 3 | part de nuit ≥ 25 % ET 3 personnes ou plus sur ≥ 40 % des photos (RD) | P2 vacances festives | PROFILS |
| 4 | `groupe_taille` = 2 (réponse, sinon INFO-052 avec confiance ≥ 0,7) | P3 couple, quelle que soit la durée | PROFILS (« exactement deux visages ») ; C15 |
| 5 | durée > 90 jours ET moins de 30 jours photographiés | P5 année de vie | PROFILS |
| 6 | durée ≥ 10 jours | P1 long voyage | PROFILS |
| 7 | sinon (3 à 10 jours) | P6 séjour court | PROFILS |

**Les modificateurs** (ils ne changent pas le profil, ils décalent quelques paramètres) : **gros lot** (≥ `gros_lot_seuil`) : exigence_tri
vers exclusif d'un cran, planches IA plus denses ; **fête** (morceaux de P2 dans un autre profil) : noir et blanc proposé une double sur 3,
fonds noirs teintés la nuit ; **sans date** (15 à 40 % de photos sans date) : placement par ressemblance, doutes avoués Q-D01 en priorité.

**Confiance du profil** : la règle retenue donne 0,9 si ses données sont mesurées (durée, nuit), 0,7 si elle dépend de INFO-052, 0,5 si
elle tombe au défaut (RD). Sous `confiance_question`, Q-A02 est marquée « à vérifier » à l'arrêt 1.

### 3.3 Reconnaître le thème

| Si… | thème | découpe | nom du chapitre | source |
|---|---|---|---|---|
| 3 villes ou plus visitées dans un ordre (GPS ou Q-C02), ou type lu « circuit, road trip » | road_trip | une étape (lieu nouveau) | le lieu principal de l'étape | M-05 VALIDÉE |
| une ville, 3 à 10 jours | ville | un jour ou un quartier | un mot de lieu, sinon le jour | définition v2 §5.1 |
| un seul endroit hors ville (plage, montagne) | plage | un jour ou un groupe de jours | le jour, ou un mot vrai | idem |
| durée 1 à 3 jours, beaucoup de photos | evenement | les heures | l'heure, le chiffre | idem |
| énergie de fête, plusieurs soirées | fete | une soirée ou une journée | « Jour 3 » | idem |
| plus de 90 jours | annee | un mois (une saison si moins de 10 photos par mois) | le mois | idem |
| sinon | autre | les plus grands silences, un chapitre pour trois jours photographiés | thème lu par l'IA, en repli | N-32 |

Le thème « couple sur plusieurs années » (définition v2 §5.1 : une année, une saison ou un lieu) n'existe pas dans le code (`THEMES`) :
proposé en ajout, à trancher.

### 3.4 Ce que règle chaque profil (table profil × paramètre)

Valeurs de départ. Sources : `PARAMETRES.csv` et `PROFILS.md` (réglages de départ du 17/11) ; code `PARAMETRES_PROFIL` ; M-06 VALIDÉE
pour la sobriété de la famille. P2 n'a AUCUN album de preuve ; P4 un seul (PROFILS) : leurs valeurs sont les plus fragiles.

| Paramètre | P1 long voyage | P2 vacances festives | P3 couple | P4 événement | P5 année de vie | P6 séjour court |
|---|---|---|---|---|---|---|
| densite_visee (photos par double) | 2,5 à 3,2 | 3 à 5 | 2 à 3 | 3 à 4 | 2 à 3 | 2,5 à 3 |
| densite_plafond (NON MESURÉ) | 4,5 | 6 | 3,5 | 5 | 4 | 4 |
| photos_max_double / série | 9 / 12 | 12 / 16 | 9 / 9 | 9 / 12 | 9 / 9 | 9 / 9 |
| part_pleines_pages | 25 à 35 % | 10 à 15 % | 40 à 55 % | 20 à 30 % | 35 à 50 % | 30 à 40 % |
| sobriete | 0,5 ; 0,2 si famille (M-06) | 0,8 | 0,5 (plus forte sur les portraits) | 0,5 | 0,35 | 0,5 |
| tolerance_photos_faibles | basse | haute | basse | moyenne | moyenne | basse |
| exigence_tri | narrateur | instantané | narrateur | narrateur | collectionneur | narrateur |
| place_des_personnes (RD) | 0,4 | 0,8 | 0,7 | 0,6 | 0,6 | 0,4 |
| sommet_position | 60 à 70 % | la meilleure soirée | 45 à 80 % | l'instant fort | aucun sommet voulu | 45 à 80 % |
| fin_type (à trancher) | gens, groupe complet | le groupe entier | « nous deux » | le groupe réuni | « tous ensemble » | les gens |
| couverture | lieu avec une personne | groupe de nuit | le duo | l'instant fort | une photo « tous » | lieu emblématique |
| ouverture | lieu monumental avec une personne à l'échelle | nuit ou action | un duo | l'instant d'avant | le mois en grand | le lieu |
| ton | 0,2 : lieu en grand, sobre | 0,8 : court, brut, drôle | 0,4 : tendre, mots vrais | 0,4 : horloge, chiffre | 0,3 : les mois, ses mots | 0,3 : un mot de lieu |
| lieux_affiches | nouveaux | chapitres | chapitres (le couple est le sujet) | chapitres | chapitres | nouveaux |
| fonds | blanc ; aplat sourd aux ouvertures ; noir jamais sauf nuit | noir teinté la nuit ; blanc ou couleur franche le jour | blanc cassé ; aplat chaud ; noir le soir | blanc ou couleur de l'événement | blanc ; un aplat par mois si une photo le porte | blanc ; aplat des murs |
| noir_et_blanc | proposé | une double sur 3 | portraits, proposé | proposé | proposé | proposé |
| entorses_max | 2 ; jamais par couleur | 2 ; par couleur permise | 2 | 2 | 2 ; par couleur permise | 2 |
| heure imprimée | dans les séries | dans les séries | non | signature du profil | non | non |
| planche-contact | une fois si 3,2 photos par double ou plus | jusqu'à 12 | non | une ou deux séries | non | non |
| respiration_toutes_les | 5 à 7 | 5 à 7 | 5 à 7 | 5 à 7 | 5 à 7 | 5 à 7 |
| rythme_contraste (RD) | 0,6 | 0,7 | 0,4 | 0,6 | 0,4 | 0,5 |

**Sources contradictoires sur la densité, gardées comme variantes** (Notion contradiction 4, MAC-2894, MAC-2895) : V1 initiale « sobre
1,5 / équilibré 3 / généreux 5 photos par page » ; V1.1 « 2,4 / 3,0 / 4,0 » ; Notion Analyse IA « une photo par page par défaut » ; D-12
VALIDÉE « pas de chiffre fixe : ça dépend du style et des photos ». Le socle suit D-12 : la fourchette par profil, la position par le
curseur, le nombre par double par la table de densité (M-28).

### 3.5 Quand deux signaux se contredisent

**L'ordre de confiance des sources** (de la plus sûre à la moins sûre) : correction de l'atelier → réponse du client → mesure sûre (durée,
jours, GPS, heure) → comptage croisé (INFO-052 confirmé par les visages) → IA voyage → IA planche seule → mots de l'occasion. « Les données
du dossier priment sur l'occasion déclarée » (PROFILS, règle d'or).

**La méthode.**
1. Vérifier d'abord que les deux signaux parlent du même axe. « L'IA dit circuit, le comptage dit couple » : AUCUNE contradiction, ce sont
   deux axes (thème road trip, profil couple). C'était le défaut du code (C15).
2. Sur le même axe, la source la plus sûre l'emporte si sa confiance dépasse `confiance_question`.
3. Sinon, la question correspondante est posée (Q-C01 pour « qui », Q-A02 pour le profil), et en attendant la machine prend la valeur de
   la source la plus sûre en la marquant « à vérifier ».
4. Une contradiction répétée entre deux sources (sur plusieurs magazines) est remontée au carnet de la source la moins sûre : c'est elle
   qu'on corrige (consigne de lecture, seuil), pas le profil.

| Exemple | Résolution |
|---|---|
| IA voyage « famille », nos personnes = 2 (confiance 0,8) | P3 couple ; « famille » au carnet de l'IA voyage |
| IA voyage « couple », nos personnes : valeur fréquente 2 mais des comptes à 7 (foules) | P3 ; les comptes à 7 sont des passants (INFO-052) ; si INFO-052 n'existe pas encore : Q-C01 |
| occasion « un festival », photos de jour en parc, aucune nuit | les données : P6 ; l'occasion reste un mot du client, jamais imprimé |
| durée 21 jours, 40 photos seulement | P1 ou P3 selon « qui » ; modificateur « lot court » : densité visée vers le bas de la fourchette, plus de pleines pages |
| thème lu « séjour » mais 8 villes GPS dans l'ordre | road_trip (le GPS est une mesure) |

---

## 4. Les curseurs de goût et les écoles

### 4.1 Les neuf curseurs (repris de MAC-2821 et NO-376)

Neuf nombres entre 0 et 1, gardés avec le dossier, qui partent à 0,5 (MAC-2833). Un curseur ne fixe pas une valeur : il place le paramètre
**dans la fourchette du profil** : valeur = bas du profil + curseur × (haut du profil − bas du profil). Ainsi le goût ne sort jamais de ce
qui convient au profil, et deux règles ne se disputent jamais un curseur.

| Curseur | de… (0) | …à (1) | Paramètres qu'il place | Règles qu'il pilote (Notion) |
|---|---|---|---|---|
| Densité | aéré, une photo seule | généreux, beaucoup de souvenirs | `densite_visee` (dans la fourchette), `part_pleines_pages` (en sens inverse), `respiration_toutes_les` | R-42, R-57 |
| Rythme | régulier, apaisé | contrasté, chocs d'échelle | `rythme_contraste` | R-50, R-54 |
| Couleur | naturelle, telle quelle | travaillée, un look, noir et blanc | `couleur_travail`, `noir_et_blanc`, `fonds_couleur_max` | R-05, R-56, R-71 |
| Typographie | discrète, classique | audacieuse, titres géants | `typo_audace` | R-62 à R-64 |
| Récit | chronologique, journal | thématique, par émotion ou lieu | `poids_temps_contre_sujet`, `entorses_max` (0 à 3) | R-40 |
| Sujet | les gens | les lieux et l'ambiance | `place_des_personnes` (en sens inverse) | R-10, R-41, R-44 |
| Texte | aucun | beaucoup | `quantite_texte`, `lieux_affiches` (chapitres → nouveaux → partout) | R-60, R-90 |
| Ton | sobre, élégant | ludique, clins d'œil | `ton` | R-34, R-76 |
| Finition | soigné, parfait | brut, spontané | `finition`, `tolerance_photos_faibles`, `sobriete` (en partie) | R-14, R-70 à R-76 |

**Le pré-réglage par le lot, sans rien demander** (MAC-2825, NO-378 ; décalages RD) :

| Signal du lot | Décalage |
|---|---|
| beaucoup de détails et de plans serrés | Densité −0,15 ; Sujet +0,1 ; respirations plus fréquentes |
| beaucoup de selfies et de photos de groupe | Densité +0,15 ; Sujet −0,2 (vers les gens) ; Ton +0,15 |
| photos déjà retouchées (INFO-120) | Couleur : garder son look (pas de filtre global) |
| peu de photos, toutes belles (INFO-114 lot trié) | exigence_tri vers collectionneur (garder presque tout, M-09) |
| mots de l'histoire (Q-C05) | Ton et Finition (2.2) |
| `style_conseille` de l'IA voyage (INFO-081) | désigne l'école de départ (4.2) |

### 4.2 Les huit écoles : des positions des neuf curseurs

Chaque école est une combinaison cohérente des neuf curseurs (MAC-2827). Les réglages marquants viennent de MAC-2827 ; leur traduction
en nombres est un RD. Le nom du graphiste reste à l'atelier ; le client voit le nom d'usage. Le client ne voit jamais plus de trois écoles :
celle que ses réponses désignent et les deux plus proches (distance entre les neuf nombres).

| École (atelier) | Nom client | Réglages marquants (MAC-2827) | Densité | Rythme | Couleur | Typo | Récit | Sujet | Texte | Ton | Finition |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Brodovitch, Baron | Grand magazine | densité basse, rythme contrasté, titres didones géants, beaucoup de blanc | 0,2 | 0,8 | 0,4 | 0,9 | 0,3 | 0,5 | 0,3 | 0,4 | 0,2 |
| École suisse | Épuré | grille visible, linéale, asymétrie, couleurs naturelles | 0,4 | 0,4 | 0,2 | 0,5 | 0,2 | 0,5 | 0,3 | 0,3 | 0,1 |
| Fleckhaus | Contraste | photos immenses contre petits textes, noir et blanc fréquent | 0,2 | 0,9 | 0,7 | 0,6 | 0,3 | 0,5 | 0,2 | 0,4 | 0,3 |
| Kinfolk, Hara | Calme | une photo par page, mat, couleurs douces, texte rare | 0,1 | 0,2 | 0,3 | 0,2 | 0,2 | 0,6 | 0,1 | 0,2 | 0,2 |
| Storch, Lubalin | Récit | texte présent, mots qui épousent les images, exergues | 0,5 | 0,5 | 0,3 | 0,7 | 0,5 | 0,4 | 0,8 | 0,5 | 0,3 |
| Brody, The Face | Audacieux | une rupture par double, titres-images, rythme fort | 0,6 | 0,9 | 0,6 | 1,0 | 0,5 | 0,5 | 0,4 | 0,7 | 0,5 |
| i-D, Grapus, Carson | Brut | collage, rotations, imperfections assumées, ton ludique | 0,8 | 0,7 | 0,7 | 0,8 | 0,6 | 0,3 | 0,4 | 0,9 | 0,9 |
| Tschichold | Livre | symétrie, garalde, marges du canon, peu d'effets | 0,4 | 0,2 | 0,2 | 0,3 | 0,1 | 0,5 | 0,3 | 0,2 | 0,1 |

Une école n'outrepasse jamais un profil : elle place les curseurs, les curseurs se lisent dans la fourchette du profil. « Brut » sur un
long voyage en famille sobre reste dans la sobriété du profil (M-06 VALIDÉE prime : « plus de gabarits ne veut pas dire plus d'extravagance »).

### 4.3 Les styles vus par le client : quatre listes qui se contredisent

| Source | Les styles |
|---|---|
| D-14 (09/11, « à tester ») | Grand magazine, Galerie, Récit, Carnet |
| Questionnaire V1.1 (MAC-2887) | exploration, heritage, magazine, cinema, minimaliste, arty_zine |
| Catalogue des gabarits (MAC-2960) | MIN, SEL, MAG, CIN |
| Notion, OS produit (NO-400) | Minimal, Magazine, Cinéma, Sélection Bellajour |
| Rapport ch.6 (MAC-2827) | les huit écoles |

**Proposition** (à trancher) : les huit écoles sont la vérité de l'atelier ; les quatre panneaux du client (D-14) sont quatre FAMILLES
d'écoles, et le panneau ouvre l'école de la famille la plus proche du lot : Grand magazine = Grand magazine, Contraste ; Galerie = Calme,
Épuré ; Récit = Récit, Livre ; Carnet = Brut, Audacieux. Les tables de configuration V1.1 (MAC-2890 : `hero_ratio` 0,16 à 0,30,
`people_pages_ratio` 0,35 à 0,45 par style) restent des variantes de départ pour `part_pleines_pages` et `place_des_personnes`, notées comme telles.

### 4.4 Les tables de configuration dérivée du questionnaire V1.1 (reprises, ce qu'elles deviennent)

| Table V1.1 | Ce qu'elle réglait | Ce qu'elle devient |
|---|---|---|
| Format (MAC-2853, MAC-2854) : horizontal si ≥ 60 % de bonnes photos paysage, sinon vertical ; horizontal `hero_ratio` +0,03, vertical `people_pages_ratio` +0,03 | l'orientation du livre | sans objet tant que le format est unique ; garder la mesure INFO-111 |
| Purpose (MAC-2883) : travel `omega_theme` 1,10 et 8 photos par chapitre ; event 1,10 et 10 ; bestof 0,90 et 6 | thème et taille minimale de chapitre | `theme_album` ; le minimum de photos par chapitre devient un paramètre du Récit (N-61 : 4, RD) |
| Style (MAC-2890) : `hero_ratio`, `omega_vis`, `people_pages_ratio` par style | grandes photos, poids des gens | `part_pleines_pages`, `place_des_personnes` (variantes) |
| Densité (MAC-2895) : sobre 2,4, équilibre 3,0, généreux 4,0 ; budgets 25-35 / 35-50 / 50-70 % | photos par page, budget | `densite_visee` (variantes) ; le budget de sélection est remplacé par M-09 |
| Curateur (MAC-2905) : `selection_T` 80/50/20/50 ; dédoublonnage ; rafales ; 2/3/5/4 photos par moment | exigence | `exigence_tri` |
| Ton (MAC-2910) : poétique, journaliste, humour, minimaliste ; tone auto par style | ton des textes | `ton` (0 à 1) ; les textes restent des faits |
| Seuils (MAC-2926) : visages 0,05 ; 10 et 50 visages uniques ; 10 % de captures ; 40 et 2 PARAM-TRV-000 photos ; thème 0,60 | bascules | `confiance_question` (0,60 pour le thème) ; `gros_lot_seuil` ; les seuils de visages uniques sont périmés (D29) |

---

## 5. À trancher par Mathias

| Question (réponse d'un mot) | Ma recommandation | Ce que ça change |
|---|---|---|
| Un couple est-il toujours le profil « couple », même en long voyage ? (oui / non) | **Oui** | Le réf. couple aurait eu 2 à 3 photos par double et 40 à 55 % de pleines pages, au lieu de la densité d'une famille |
| Les quatre panneaux client sont-ils des familles d'écoles ? (oui / non) | **Oui** (4.3) | Une seule vérité (les écoles), un choix simple pour le client |
| La dernière page, par défaut ? (gens / au revoir / auto) | **Auto** | Au revoir quand le lot a une image forte des derniers jours, sinon les gens |
| Les sujets répétés : rassembler ? (oui / non) | **Oui, à partir de trois photos** | Ses cinq plats sur une page ; chronologie inchangée ailleurs |
| La question « Dans cinq ans… » : l'essayer ? (oui / non) | **Non pour l'instant** | Les quatre choix du client sont pris par trois questions, le style et la couverture |
| Ajouter le thème « couple sur plusieurs années » ? (oui / non) | **Oui** | Chapitres par année, saison ou lieu pour les histoires de couple longues |

## Ce qui me manque

- Les paramètres des quatre autres auteurs : la fusion vérifiera doublons de noms et plages incompatibles.
- Toute mesure qui place une école en nombres : les neuf valeurs par école sont des RD tirés des mots de MAC-2827.
- Un album de fête (P2) et un deuxième album d'événement (P4) : leurs colonnes de la table 3.4 ne reposent sur aucune preuve.
- La part réelle de projets où la question « combien étiez-vous » serait posée : il faut d'abord INFO-052.
