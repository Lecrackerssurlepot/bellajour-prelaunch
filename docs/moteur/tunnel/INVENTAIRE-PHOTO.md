# Inventaire : tout ce qu'une photo peut donner pour faire un magazine

17/11/2026. Banc local `tunnel-2026-11-17/banc/`, mesuré sur les 164 photos de Joëlle (Australie, Samsung Galaxy S25).
Document local, hors git : il cite des chiffres d'un vrai dossier de client.

**Comment lire.** Pour chaque information : comment on l'obtient, ce qu'elle coûte, sa fiabilité, et à quoi elle sert
(**T** trier, **P** placer, **A** assortir). La colonne « Éditeur » dit si le navigateur de l'éditeur la calcule DÉJÀ
(`mesuresClient.ts`, `photosLocales.ts`, la lecture IA) ou si c'est NOUVEAU (calculé seulement par le banc).
« Mesurée » = un chiffre sorti de Joëlle ; « accord IA » = le taux d'accord avec la lecture gpt-5.4, qui n'est PAS la vérité ;
« à mesurer » = aucun contrôle encore.

Coûts : 0 = local, sans appel. Les coûts IA sont les coûts RÉELS de la passe du 17/11 (grand livre `budget.json`).

---

## Couche 1 : le fichier (EXIF et en-tête), 0 $, 0,4 s pour 164 photos

| Information | Comment | Fiabilité sur Joëlle | Sert à | Éditeur |
|---|---|---|---|---|
| Date et heure de prise | EXIF `DateTimeOriginal`, chaîne brute, heure locale de l'appareil | 141 / 164 (86 %) | T P : chronologie, moments, jours, faits des textes | déjà (`photosLocales.ts`) |
| Décalage horaire | EXIF `OffsetTimeOriginal` (+11:00 : l'heure de Sydney) | 141 / 164 | P : savoir où l'on était sans GPS (fuseau = région du monde) ; recaler deux téléphones | nouveau |
| Date ESTIMÉE d'une photo sans date | Le numéro de galerie Samsung (« 1000065389.jpg ») croît avec l'arrivée en galerie : 1 seule inversion sur 141 photos datées. On interpole entre deux voisines datées | 8 photos sur 23 sans date ; c'est la date d'ARRIVÉE (une image reçue par messagerie arrive après la prise). Les 15 autres sont arrivées après le voyage | T P : ranger une photo de messagerie dans le bon chapitre | nouveau ; propre aux noms Samsung (un iPhone dit « IMG_1234 », même idée possible) |
| Appareil (marque, modèle) | EXIF `Make`, `Model` | 141 / 164 ; absent = image de messagerie ou capture | T : capture d'écran (R141) ; deux appareils = deux déposants | déjà |
| Objectif | Focale réelle + équivalent 24 × 36 (`FocalLength`, `FocalLengthIn35mmFormat`) : principal, ultra grand-angle, télé, zoom numérique, selfie | 103 principal, 25 zoom numérique, 10 télé, 3 ultra grand-angle, 0 selfie, 23 inconnu. Règle écrite pour le S25 ; d'autres téléphones à relever | P : un ultra grand-angle = plan large d'ouverture ; un télé = détail ou animal lointain | nouveau |
| Selfie | Caméra avant (focale réelle courte, équivalent normal) | 0 détecté ; non prouvé faute de cas | P : un selfie se pose petit, jamais en double | nouveau |
| ISO, ouverture, vitesse | EXIF `ISO`, `FNumber`, `ExposureTime` | présents sur 141 | T : vitesse > 1/15 s = risque de bougé ; ISO haut = intérieur ou nuit | nouveau |
| Flash | EXIF `Flash` (bit 0) | 0 flash sur 141 | P A : photo au flash = soirée, fond sombre | nouveau |
| Lumière de la scène | EXIF `BrightnessValue` (APEX Bv, mesuré par l'appareil AVANT traitement) : < −1 nuit, < 4 intérieur ou ombre, > 8 plein soleil | présent sur 141 ; seuils de départ, accord intérieur 91 % avec l'IA | T P A : nuit, intérieur, plein jour, sans regarder un pixel | nouveau |
| GPS | EXIF `GPSLatitude/Longitude` | **0 / 164**. 131 fichiers portent un bloc GPS VIDE (altitude seule) : la localisation était coupée ou retirée à l'envoi | P : lieux (couche 4), trajet, séjours | déjà (`photosLocales.ts`, base) |
| Taille en pixels, orientation | En-tête + EXIF `Orientation` | 164 / 164 | T P : format paysage (105) ou portrait (59), rapport 2,16 (19,5 : 9) | déjà |
| dpi par taille de cadre | `cadrer` de l'éditeur (25,4 / échelle, cadrage neutre) pour double, pleine page, demi, quart | voir ci-dessous | T P : ce qu'une photo peut porter à 200 dpi | déjà au posé (`dpi`, point orange sous 200) ; nouveau AVANT le posé |

**Fait majeur pour la mise en page (mesuré).** Le S25 rend du 4000 × 1848 (rapport 2,16). Posée en remplissage :
- **aucune** photo ne tient une **double page** à 200 dpi (médiane 151 dpi) ;
- une **pleine page** à 200 dpi n'est possible que pour les **portraits** (52 photos ; médiane de toutes : 158 dpi) ;
- en demi-page, 140 photos passent (médiane 302 dpi).
Une règle de structure doit le savoir AVANT de proposer une double : soit la double accepte 150 dpi pour ce format, soit la
photo panoramique va en bandeau (demi-page en largeur). À trancher par Mathias (seuil d'impression), le banc ne décide pas.

---

## Couche 2 : les pixels, 0 $, 13,5 s pour 164 photos (dont 10 s de visages)

### Ce que l'éditeur mesure déjà, refait à l'identique (vignette de 320 px ramenée à 256 px)

| Information | Comment | Fiabilité sur Joëlle | Sert à |
|---|---|---|---|
| Netteté (R72) | Variance du laplacien de la 2e case la plus nette sur 4 × 4 | médiane 4 350 ; 1 floue trouvée (060) | T : écarter les floues |
| Empreinte dHash 64 bits | Image 9 × 8, chaque case comparée à sa voisine | 1 paire de doublons ; distance entre deux voisines dans le temps : 22 à 37 (bruit) | T : doublons, rafales, similaires |
| Visages comptés (D29) | MediaPipe BlazeFace « short range » sur la vignette 320 px | **9 photos sur 164**. Contrôle à l'œil d'une planche de 16 : 9 photos avec des personnes, **0 trouvée**, 1 fausse (un chien). Le modèle ne voit que les visages proches | T P : zone à protéger, plan, « qui » |
| Netteté dans le visage (A2, A7) | Laplacien dans la boîte du visage / netteté de la photo | 1 « visage flou » ; dépend des visages trouvés | T : un portrait flou au visage est raté |
| Carte de chaleur (saillance, B1) | Résidu spectral sur 64 × 64, réduite à 16 × 16 | non contrôlée à l'œil sur Joëlle | P : recadrage, ce qu'on ne coupe pas, où poser un texte |
| Zone importante | Visages (+ 15 % d'air au-dessus) élargis à 85 % de la masse saillante | idem | P : recadrage, pli |
| Lumière (A3) | Gris moyen, part des noirs < 8 et blancs > 247 | 0 sombre, 0 brûlée (lot trié par le client) | T |
| Palette 5 teintes (E1) | k-moyennes RVB | sur 164 | A : couleurs du magazine, harmonie d'une double |
| Aplats (A4) | Part des 3 couleurs dominantes quantifiées | sur 164 | T : capture d'écran |

### Nouveau : calculé par le banc, sans IA

| Information | Comment | Fiabilité | Sert à |
|---|---|---|---|
| Visages en TUILES | Le même modèle MediaPipe sur 1 024 px découpé en carrés qui se chevauchent, boîtes fusionnées | **36 photos** au lieu de 9 ; accord « il y a quelqu'un » avec l'IA 73 %, nombre exact 65 % (contre 55 % sans tuiles). Rate encore les personnes de dos ou lointaines | T P : remplace le compte de l'éditeur ; + 6 s pour 164 photos |
| Tête tournée | Points clés MediaPipe : nez par rapport au milieu des yeux | 36 visages : 23 de face, 7 à gauche, 6 à droite. À mesurer | P : un visage regarde VERS l'intérieur de la double, jamais vers le bord |
| Contraste | Écart-type du gris, plage entre 5e et 95e centiles | sur 164, à mesurer | A : filtres (une photo plate gagne au contraste) ; P : photos à fort contraste en grand |
| Couleur : chaleur | (R − B) / (R + B) moyen sur les tons moyens : chaude, neutre, froide | 47 chaudes, 55 neutres, 62 froides ; à mesurer | A : assortir une double (même température), filtre « chaleur » à l'échelle du magazine |
| Couleur : saturation, teinte dominante, vivacité | TSL ; métrique de Hasler et Süsstrunk | 0 noir et blanc ; à mesurer | A : ton sur ton, complémentaires ; repérer une série en noir et blanc |
| Inclinaison et horizon | Histogramme pondéré de l'angle des contours forts à ± 20° ; ligne de plus forte variation verticale | **NON FIABLE en l'état** : force médiane 0,15, aucune photo retenue « à redresser ». Refaire en Hough sur 1 024 px | P : proposer un redressement ; poser un titre au-dessus de l'horizon |
| Zone calme pour un titre | Bandes haut / bas / gauche / droite, agitation = chaleur + texture, pénalisée si elle touche la zone importante ; texte blanc ou encre selon la clarté | 50 photos sur 164 ont une zone calme (39 en haut : le ciel) ; à mesurer à l'œil | P : couverture, ouverture de chapitre, titre sur photo (prolonge R159) |
| Flou de mouvement | Anisotropie des gradients (énergie horizontale / verticale) + netteté basse, ou vitesse > 1/15 s | 10 « bougé » ; à mesurer | T |
| Ciel, verdure | Part de pixels bleus clairs dans le tiers haut ; part de verts | à mesurer | indices d'extérieur |
| Position du sujet | Centre de masse de la saillance : gauche, centre, droite | à mesurer | P : sujet à gauche = page de droite (le regard entre dans la double) |

### Dérivés (couches 1 + 2 croisées), 0 $

| Information | Comment | Fiabilité | Sert à |
|---|---|---|---|
| Nuit, heure dorée, flash, intérieur, jour | Heure EXIF + `BrightnessValue` + flash + chaleur de couleur. Sans GPS, pas de coucher du soleil calculé : fenêtres fixes de départ (6 h à 8 h 30, 18 h 30 à 20 h 45) | accord avec l'IA 84 % ; sur Joëlle : 148 jour, 10 intérieur, 6 dorée, 0 nuit | P A : fond noir pour la nuit (profil festif), chapitre « soirs », filtre chaud |
| Intérieur ou extérieur | Score : Bv, ciel, verdure, ISO haut | accord 91 % avec « intérieur » de l'IA | P : alterner dedans et dehors |
| Plan large, moyen, serré (local) | Taille du plus grand visage (tuiles), objectif, aire de la zone importante, horizon | **accord 55 %** avec l'IA : sans visage trouvé, le local dit « large » trop souvent. L'IA est meilleure | P : un détail à côté d'un grand angle |
| Imprimable | dpi à 200 : pleine page, demi, quart, trop petite | 52 / 88 / 5 / 19 | T P |

---

## Couche 3 : les ensembles, 0 $, moins de 10 ms

| Information | Comment | Fiabilité sur Joëlle | Sert à | Éditeur |
|---|---|---|---|---|
| Doublons (R75) | dHash à 8 bits ou moins | 1 paire | T : garder une seule | déjà |
| Rafales + la meilleure (R74, R140, R76) | Même déposant, empreintes proches à 2 s, 60 s ou 30 s se suivant ; la tête = la plus nette puis la plus grande | **0 rafale** : Joëlle a déposé une sélection déjà triée | T : une seule, une séquence, ou une page rafale | déjà |
| Similaires (R93) | Empreinte à 12 bits ou moins, à 10 minutes ou moins | 0 | T : variété | déjà |
| Floues (R73) | Sous 40 OU sous 20 % de la médiane | 1 | T | déjà |
| Moments | Nouveau moment à chaque jour ou après 120 min sans photo | 39 moments | P : une double = un moment | déjà (`moments.ts`) |
| Jours, jours forts | Photos par jour ; « fort » = 20 % des jours les plus fournis | 21 jours datés ; forts : 5, 6, 9, 24, 25 novembre | P : un jour fort mérite une ouverture | nouveau |
| Chapitres temporels | Coupure aux plus grands silences (8 h et plus), k = jours / 3 entre 4 et 8 | 7 chapitres ; sans lieu ni contenu : à remplacer par la couche 7 quand elle existe | P : trame de secours sans IA | nouveau |
| Écart avec les voisines | Secondes et distance d'empreinte avec la photo d'avant et d'après | sur 141 ; la plus proche à 7 s | T P : séquence, ressemblance de cadrage | nouveau |
| Entonnoir A | Ce qui part à l'IA : une photo par pile, ni floue, ni capture, ni sombre, ni brûlée, ni trop petite | 161 sur 164 partent | coût | déjà (`entonnoirA`) |

---

## Couche 4 : les lieux (Geoapify), NON FAITE sur Joëlle

Aucun GPS dans les fichiers. Ce que la couche donnerait avec un GPS (`lieux.ts`) : commune, département, région, pays,
lieu nommé à 300 m (monument, plage, parc), grande ville à 50 km, trajet et séjours (`moments.ts`). Coût : appels Geoapify,
un par endroit arrondi à 100 m (au plus 12 points par demande) ; l'offre gratuite n'a pas été relue aujourd'hui (à vérifier sur leur page).
**Repli mesuré sans GPS** : les lieux LUS sur les panneaux par la couche 6 (16 noms) et le décalage horaire EXIF (+11:00).
Un géocodage ADRESSE → point des lieux lus (Geoapify, recherche directe) rendrait un trajet approximatif : non fait, à décider.

---

## Couche 5 : l'IA en planches (gpt-5.4, effort « low »), 0,232 $ pour 161 photos (11 planches, 49 s)

Consigne et schéma de l'éditeur (`lireLesPhotos.ts`) plus quatre champs ajoutés au banc. Une planche = 16 vignettes de 384 px.
Coût réel par planche : 0,0211 $ (3 292 jetons d'entrée, dont ≈ 2 300 pour l'image ; 859 de sortie).

| Information | Valeurs | Résultat sur Joëlle | Fiabilité | Sert à |
|---|---|---|---|---|
| Rôle | héros, satellite, détail, vue d'ensemble, à écarter | 35 héros, 71 satellites, 24 détails, 29 vues d'ensemble, 2 à écarter | stabilité mesurée le 17/11 (`stabilite.py`), pas d'exactitude | T P |
| Sujet | personnes, paysage, lieu, plat, objet, autre | 42 personnes, 36 paysages, 54 lieux, 1 plat, 13 objets, 15 autres | à mesurer | P : assortir une double |
| Candidate | couverture, pleine, double, aucune | 3 couvertures, 32 pleines, 16 doubles | à mesurer ; **les 16 doubles sont à 151 dpi en double** (couche 1) | P |
| Intérêt | 0 à 1 | médiane 0,63 | à mesurer | T : sélection |
| Texte lisible | oui ou non | 22 | 4 enseignes sur 16 noms lus ensuite (couche 6) | P : un panneau ouvre un chapitre |
| **Plan** (ajouté) | large, moyen, serré | 81, 61, 19 | à l'œil sur une planche : juste | P : détail + grand angle |
| **Moment de la journée** (ajouté) | matin, jour, doré, nuit, intérieur | 130 jour, 19 intérieur, 12 doré, 0 matin, 0 nuit | accord 84 % avec le local | P A |
| **Ambiance** (ajouté) | calme, vivant, festif, intime, grandiose | 55, 33, 1, 23, 49 | à mesurer | profil du projet, rythme, filtres |
| **Personnes** (ajouté) | 0, 1, 2, groupe | 92 sans personne, 24, 22, 23 | à l'œil sur une planche de 16 : 15 justes, 1 chien compté comme une personne | « qui » (couche 7), plan, zone à protéger |

---

## Couche 6 : le regard fin (gpt-5.1, effort « none »), 0,102 $ pour 61 photos (42 s)

`choisirPourRegard` de l'éditeur : 40 candidates (le quart des photos lues, les plus intéressantes) + 21 photos à texte lisible.
Coût réel : 0,00167 $ par photo (1 024 px).

| Information | Résultat sur Joëlle | Fiabilité | Sert à |
|---|---|---|---|
| Couverture oui ou non, et son type | **51 sur 61 disent « oui »** | trop permissif : ne départage pas. À reprendre (classement entre candidates, ou une question « la meilleure des N ») | P : couverture |
| Lieu lu en entier | 16 noms (Queen Victoria Building, Royal Botanic Garden Sydney, Murramarang National Park, Twelve Apostles…) | **4 sont des enseignes** (Oroton, Westfield, Barrels, bespoke letterpress) malgré la consigne | P : titres, légendes, repli du GPS |
| Plat | 0 | rien à juger sur ce dossier | P : page « table » |
| Ce que la photo raconte (6 mots) | sur 61 | utile à la couche 7 | P : légendes, chapitres |
| Idée de mise en page (10 mots) | répétitive (« pleine page, titre en haut ») | faible | à retirer sauf si une règle la lit |
| Recadrage (10 mots) | sur 61 | à mesurer contre la carte de chaleur | P |

---

## Couche 7 : le voyage (gpt-5.1, texte seul, un appel), 0,047 $ (46 s)

Entrée : une ligne par photo lue (date, tags des couches 5 et 6, visages comptés, lieu lu), 6 640 jetons ; aucune image.

| Information | Résultat sur Joëlle | Fiabilité | Sert à |
|---|---|---|---|
| Qui, par comptage | famille (« un couple et de petits groupes, trois générations ») | cohérent avec les planches ; jamais d'identité (D29) | profil, ton |
| Où | Australie ; lieux = les 16 noms lus, enseignes comprises | aussi bon que la couche 6 | titres |
| Type, durée | road trip, 22 jours | 22 = du 5 au 26 novembre, juste | structure |
| Chapitres | 7, contigus, chaque photo dans un seul chapitre (contrôle : 0 oubli, 0 doublon) ; les 8 photos à date ESTIMÉE sont toutes rangées dans le chapitre de leur date | une photo de Melbourne sans date rangée dans le dernier chapitre au lieu du cinquième : les photos sans date restent fragiles | trame du magazine |
| Ton, profil | tendre ; long voyage en famille | conforme au plan | règles par profil |
| Style conseillé | « grandes images côtières, portraits intimes, peu de texte, couleurs chaudes, maquette aérée » | à juger par la DA | ambiance |

---

## Ce que le navigateur de l'éditeur sait déjà faire, et ce qui serait nouveau

**Déjà dans le navigateur** (sans IA) : date, appareil, GPS et dimensions à l'import (`photosLocales.ts`) ; netteté, empreinte,
visages (vignette 320 px), zone importante, chaleur, lumière, palette, aplats (`mesuresClient.ts`) ; floues, piles, similaires,
moments, séjours (`mesures.ts`, `moments.ts`) ; dpi au posé. Avec IA : la lecture v2 en planches et le regard fin (« Lire les photos »).

**Nouveau, sans IA, faisable dans le navigateur** (canvas + exifr, aucun coût) :
1. EXIF étendu : décalage horaire, objectif, ISO, vitesse, flash, `BrightnessValue` (dix champs de plus dans le même `exifr.parse`).
2. Date estimée par le numéro de galerie.
3. Visages en tuiles (même modèle, 3 à 4 détections par photo au lieu d'une) : le gain le plus net de la couche 2.
4. Tête tournée (points clés déjà rendus par MediaPipe, jetés aujourd'hui).
5. Contraste, chaleur et saturation de couleur, zone calme, position du sujet, ciel et verdure.
6. Lumière (nuit, dorée, intérieur), intérieur ou extérieur, imprimable par taille de cadre AVANT le posé.
7. Jours forts, chapitres temporels de secours, écart avec les voisines.

**Pas encore bon** : inclinaison et horizon (non fiable), plan local (55 % d'accord), visages pour des personnes de dos ou lointaines.

**Nouveau avec IA** : les quatre champs de planche (plan, moment, ambiance, personnes), pour environ + 35 % par photo lue par rapport
à l'essai du 17/11 (0,00144 $ contre 0,00107 $ ; les sorties ne sont pas comparées une à une), et la couche 7 (un appel texte, 0,047 $).

## Réponses déjà possibles aux questions de métier

- **Quel détail accompagne quel grand angle** : même moment (couche 3) + plan opposé (couche 5) + température de couleur proche (couche 2). Calculable aujourd'hui.
- **Combien garder dans une rafale** : non testable sur Joëlle (0 rafale) ; à rejouer sur un lot non trié.
- **Jusqu'où recadrer** : zone importante + carte de chaleur (couche 2) + visages en tuiles ; le recadrage dit par l'IA (couche 6) à comparer.
- **Quand une photo mérite la double** : candidate « double » (couche 5) ET dpi en double (couche 1) : sur Joëlle, aucune ne passe 200 dpi.
- **Un lot sans date ni lieu** : date estimée par le numéro de galerie, puis le contenu (couche 7).
