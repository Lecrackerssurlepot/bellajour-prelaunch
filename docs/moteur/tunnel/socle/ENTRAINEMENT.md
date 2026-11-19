> **Copie nettoyée (M-01) de `13-ENTRAINEMENT.md` du socle du 19/11**, écrite par `scripts/socle-import.ts` : ne pas éditer à la main.
> Les magazines de référence y sont nommés par leur profil (« réf. couple », « réf. famille »). Les règles vivent en données
> (`src/lib/mise-en-page/regles/socle/`) ; les réponses de Mathias du 19/11 sont dans `A-TRANCHER.md` (M-35 à M-57).
>
> **À jour des réponses du 19/11 :**
> - Les quatre questions de la fin (§10) sont l'annexe A-40 et A-41 de `A-TRANCHER.md`, sans réponse : valeur par défaut, non validée.

# 13 · Régler et entraîner des centaines de règles, et le banc de réglages

Auteur : l'architecte du socle, 19/11/2026.
Comment on sait qu'une règle rend bien ; comment une correction devient une règle ; quand une étape peut se passer de l'atelier ;
et l'écran que Mathias a demandé pour tout voir et tout régler sur ses propres magazines.

**Ce que ce fichier couvre.** Le jeu de référence et la note d'accord, mesure par mesure (12 mesures) ; la séance de critique ; les
corrections avec raison ; le carnet de bord par règle ; l'analyse d'erreurs par famille (18 familles) ; la mise en ombre ; les tests de
non-régression ; le chemin vers l'automatique ; la spécification du banc de réglages.

**Sources.** `04-METHODES.md` §3 et §7 (jeu de référence, paires, familles d'erreurs, ombre, non-régression, mise en service progressive) ;
Notion phase J (NO-393 à NO-435 : journal des gestes G1, instantané G2, trois questions G3, rejeu G5, deux chiffres G6, réglages versionnés
G7, taux d'acceptation NO-430) ; MAC phase J (MAC-3097 à MAC-3220 : taux d'override, journal par cas, calibration par cas réels MAC-3178,
cible « 50 % du premier coup, 40 % quelques retouches, 10 % qui passent du temps » MAC-3153) ; l'enquête sur la réf. couple (hors dépôt) §2 et §5
(les mesures côte à côte, le bouton « Ça ne va pas », « un chiffre qui baisse bloque la fusion ») ; `regles/PROFILS.md` (le corpus) ;
retours M-11, M-30, M-33, M-34 ; décisions D-01, D-02, D-20.

---

## 1. Le jeu de référence

**Ce qui entre dans le jeu.** Un projet entre quand on a les trois : le lot source complet (toutes les photos déposées), le magazine que
Mathias a fait à la main (PDF, IDML ou pages), et les lectures gardées (pour rejouer sans repayer). On relève alors la **correspondance** :
pour chaque photo du lot, où elle est chez lui (page, double, cadre, taille, voisines, titre de la double), ou qu'elle est laissée.

| Réf. | Projet (exemple de vérification, jamais dans une règle) | Profil | Ce qu'on a | Limite |
|---|---|---|---|---|
| R1 | un voyage au réf. couple en couple, 40 photos | P3 (thème road trip) | son PDF (l'enquête sur la réf. couple (hors dépôt)), ses variantes de doubles, la correspondance déjà relevée (`rejeu/correspondance.json`), les réponses de l'IA gardées (`rejeu/journal-ia.json`) | sa couverture finale n'est pas connue |
| R2 | un long voyage en famille en réf. famille, 164 photos | P1 | son magazine en IDML (cadres exacts), les lectures du banc | il ne couvre que les premiers jours (64 photos citées) : la comparaison se fait sur ce sous-ensemble, ou on le dit |
| R3 et suivants | les albums du corpus rangés dans `regles/PROFILS.md` (trois en P3, trois en P6, un en P5, un en P4) | | à vérifier pour chacun : lot complet ET magazine fini | **aucun album de fête (P2)** ; un seul événement (P4) |

**Ajouter un magazine au jeu, sans travail à l'œil** (enquête §5 point 4) : la machine reconnaît ses photos dans son fichier par empreinte
d'image (la même que pour les doublons), relève la correspondance, et Mathias ne vérifie que les cas incertains.

**Le plafond d'accord : lui contre lui.** Mathias a parfois fait deux versions d'une même double (variantes du réf. couple). Mesurer l'accord
entre ses deux versions donne le **plafond** : une mesure où il change lui-même d'avis ne doit pas viser 100 % (04-METHODES §3 : « mesurer
l'accord entre humains avant l'écart machine-humain »). Chaque mesure a donc deux nombres : machine contre lui, et lui contre lui quand on l'a.

**Ce qui est figé.** Un magazine de référence est un instantané daté (Notion G2) : ses photos, sa correspondance, la version des lectures.
Il ne change plus ; s'il change (il refait une page), c'est une nouvelle version, et l'ancienne reste.

---

## 2. La note d'accord, mesure par mesure

Chaque mesure se calcule par programme sur la correspondance. On ne fond jamais les mesures en un seul chiffre pour décider : on décide
mesure par mesure. Un résumé (moyenne pondérée, poids RD) sert seulement à suivre une tendance.

| # | Mesure | Comment on la compte | Le réf. couple (rejeu du 18/11, tiré du rapport) | Ce qu'elle juge |
|---|---|---|---|---|
| A1 | **Mêmes photos gardées** | parmi les photos qu'il a posées, la part que la machine pose aussi (rappel) ; parmi celles que la machine pose, la part qu'il a posées (précision) | lui 38 à l'intérieur, la machine 35 ; communes 33 : rappel 33/38 ≈ 0,87, précision 33/35 ≈ 0,94 | Tri, couverture |
| A2 | **Mêmes photos ensemble** | parmi ses paires « même double », la part retrouvées ; et l'inverse | ses paires retrouvées : 10 sur 35 (≈ 0,29) ; l'inverse non calculé | Assortiment |
| A3 | **Même journée ensemble** | parmi les paires de photos du même jour et du même lieu qu'il réunit, la part que la machine réunit | sur 27 paires du même jour : lui en réunit 16, la machine 11 | Récit |
| A4 | **Même ordre** | parmi les paires de photos communes, la part rangées dans le même sens ; et le nombre de retours en arrière dans le temps entre deux doubles | retours en arrière : lui 5 (tous voulus : les plats, le un site connu), la machine 14 | Récit |
| A5 | **Même nombre de photos par double** | l'écart moyen entre ses nombres et ceux de la machine, doubles rangées dans l'ordre ; le nombre de doubles à une seule photo (hors page 1 et fin) | lui 1, 5, 2, 2, 3, 2, 4, 2, 4, 2, 2, 2, 2, 2, 2, 1 ; machine 1, 1, 2, 1, 3, 3, 1, 3, 5, 1, 4, 3, 1, 5, 1 ; doubles à une photo : lui 0, machine 4 | Assortiment |
| A6 | **Même longueur** | planches, pages | lui 16 planches (32 pages), machine 15 (28 pages) | Récit |
| A7 | **Mêmes titres** | par double : même sorte de titre (lieu, site, date, thème, vide) ; même lieu ; nombre d'enseignes en titre (doit être 0) | lui : villes et sites ; machine : 4 thèmes inventés, 2 enseignes, des dates ; accord proche de zéro | Habillage |
| A8 | **Même ouverture, même fin** | page 1 identique ; dernière page identique ; même sorte (au revoir, gens) | page 1 : la même ; fin : non (le selfie contre le un site connu) | Récit |
| A9 | **Mêmes grandes photos** | parmi ses pleines pages et doubles, la part que la machine pose en grand | le un site connu et les objet traditionnel, deux de ses pages fortes, en timbres | Tri, Assortiment |
| A10 | **Couverture** | la 1re de la machine est-elle une de ses photos de couverture, ou dans ses candidates | non (une rue d'une ville) | Habillage |
| A11 | **Recadrage** | quand son fichier donne les cadres (IDML) : part de sa fenêtre gardée par la machine ; dans tous les cas : personnes coupées (doit être 0), part de zone importante perdue | une tête au ras du bord (une photo) ; une photo à moitié cachée par une autre | Mise en page |
| A12 | **Fautes dures** | nombre de fautes P0 à P2 restantes | 2 vues et non bloquantes | Revérification (porte, pas une note) |

En production, deux chiffres de plus pour chaque magazine (Notion G6, NO-430) : **le taux d'acceptation** (part des doubles proposées que
l'atelier garde sans retouche, « la seule mesure honnête de la magie ») et **le temps passé** (objectif D-01 : moins de 30 minutes).

---

## 3. La séance de critique et les corrections avec raison

### 3.1 La séance (30 minutes, un magazine, chaque semaine au début ; RD)

1. **Côte à côte.** Son magazine et la proposition, double par double, dans le banc (partie 8).
2. **Les paires** (04-METHODES §3 : plus fiables que des notes de 1 à 5). « Laquelle publierais-tu ? » sur deux versions d'une même double
   (deux réglages, ou la machine et lui) ; la position gauche ou droite est tirée au hasard et notée, pour annuler le biais de place.
3. **« Ça ne va pas »** sur tout ce qui choque, d'un toucher : même jour séparé, titre faux, à regrouper, mal coupée, mauvaise place, et un
   mot libre. Chaque plainte part avec les règles qui ont décidé l'objet (déjà dans le journal).
4. **Trois questions au plus** à la fin (Notion G3, NO-435), sur les cas où la machine a le plus hésité : la photo, la proposition, son geste,
   et trois boutons « elle avait tort », « elle avait raison », « ça dépend ».
5. **Ce que je rends après la séance** : la liste des familles d'erreurs touchées (partie 5), les règles-hypothèses écrites (format de la
   consigne), les réglages à essayer au banc, et rien n'est changé sans son oui (D-02 : « rien ne change sans un oui »).

### 3.2 Les corrections avec raison

Chaque geste contraire à la proposition est une leçon écrite sans rien demander (Notion G1, M-30) : la photo, la proposition, le geste, la
règle qui avait décidé, les paramètres lus. On y ajoute une **raison d'un toucher**, dans un menu fermé par sorte de geste, et un mot libre facultatif :

| Geste | Raisons proposées |
|---|---|
| photo sortie | faible ; redite ; hors sujet ; pas les nôtres ; ne raconte rien |
| photo entrée | elle est belle ; elle est importante ; elle complète une série ; ce sont les nôtres |
| photo déplacée | même jour ; même lieu ; même sujet ; meilleur ordre ; meilleure voisine |
| photo agrandie ou réduite | belle ; importante ; nos personnes ; trop grande pour ce qu'elle est |
| titre changé | faux ; enseigne ; creux ; date fausse ; j'avais un mot à moi |
| recadrage repris | personne coupée ; trop serré ; mauvaise zone gardée ; horizon |
| gabarit changé | trop vide ; trop chargé ; répétitif ; ne sert pas les photos |
| couverture changée | pas un temps fort ; pas tout le groupe ; redite avec l'intérieur |

Une correction sans raison compte quand même ; avec raison, elle se range directement dans sa famille. Une raison qui revient sur une même
règle est la matière d'une règle nouvelle ou d'un réglage (méthode « calibration par cas », MAC-3178 : « une nouvelle règle enrichit une règle
plus ancienne plutôt que de la remplacer »).

---

## 4. Le carnet de bord par règle

Une règle = une fiche, tenue par le programme et lisible sans Claude (NO-435 : « journal lisible sans Claude »).

| Rubrique | Contenu |
|---|---|
| Identité | id, énoncé, moteur, niveau, portée, variable décidée, paramètres et valeurs actuelles, repli, source, VALIDÉE ou hypothèse |
| Statut | écrite → en ombre → active → validée → archivée (jamais supprimée : archive avec sa raison) |
| Versions | chaque changement : date, ce qui a changé, pourquoi, mesures avant et après |
| Ce qu'elle fait | sur le jeu de référence et en production : appliquée N fois ; a changé la sortie N fois ; a cédé N fois, et à cause de quelles règles ; a fait céder quelles règles |
| Ce qu'on en dit | plaintes « Ça ne va pas » rattachées ; corrections contre elle, par raison ; corrections qui la confirment (l'atelier aurait pu changer et ne l'a pas fait) |
| Ce qu'elle vaut | les mesures A1 à A12 avec elle et sans elle (rejeu « et sans elle ? ») |
| En images | trois doubles où elle a bien joué, trois où elle a mal joué, pris automatiquement là où il a fait pareil ou autrement |
| Santé | morte (ne s'applique jamais) ; fantôme (s'applique mais ne change rien) ; cède trop (au-delà de 30 % des cas, RD) ; conflit ouvert (10-PROCESSUS 7.3) |

---

## 5. L'analyse d'erreurs par famille

On ne corrige jamais un cas isolé sans regarder sa famille (04-METHODES §3). Chaque semaine (RD), le programme compte les erreurs par
famille sur tout le jeu de référence et sur les plaintes ; on corrige la famille la plus lourde d'abord.

| Code | Famille | Comment on la repère (sans regarder) | Exemple constaté (réf. couple, C…) |
|---|---|---|---|
| F-JOUR | journée-lieu coupée | deux photos du même jour et du même lieu sur deux doubles non voisines | C11, C21, C29 |
| F-ORDRE | retour en arrière non voulu | une double plus ancienne après une plus récente, hors grande entorse titrée | C28 (14 retours contre 5) |
| F-OUVERTURE | ouverture prise loin dans le temps, ou double à une photo et page blanche | la photo d'ouverture n'est pas du premier jour du chapitre | C28 |
| F-FIN | fin à contresens de sa pratique | dernière page de sorte différente de la sienne | C25 |
| F-SUJET | série de sujet éparpillée | 3 photos ou plus du même sujet sur 3 doubles ou plus | C30 |
| F-RESERVE | bonne photo laissée | une photo qu'il a posée est en réserve ou écartée | C19 |
| F-INTRUS | photo qu'il n'aurait pas mise | posée par la machine, laissée par lui | C20 |
| F-DENSITE | timbre ou double vide | une belle photo (note image forte) en petit ; une page sous le seuil d'occupation | C27, C34 |
| F-COUPE | personne coupée, zone importante entamée | mesure de zone perdue ; visage hors cadre | C35 |
| F-PETITE | personne trop petite | cadre sous `personnes_taille_min_mm` | C37 |
| F-CACHEE | photo cachée sous une autre | incrustation sur une photo de détails ou de texte | C36 |
| F-TITRE-ENSEIGNE | une enseigne en titre | nom lu de sorte « enseigne » posé en titre | C26, C33 |
| F-TITRE-CREUX | un thème inventé là où un lieu existe | titre de sorte « thème » alors qu'un lieu sûr existe | C12 |
| F-TITRE-DATE | une date qui ment sur la double | la date ne couvre pas toutes les photos de la double | C33 |
| F-COMPTE | passants comptés comme le groupe | groupe compté > réponse « combien étiez-vous », ou > valeur fréquente | C6, C17 |
| F-VISAGE | faux visage ou visage raté | visage du détecteur non confirmé ; personnes vues sans visage | C3, C38 |
| F-PROFIL | profil faux | profil corrigé à l'arrêt 1 | C15 |
| F-COUVERTURE | couverture hors de ses choix | A10 | C31 |

---

## 6. La mise en ombre d'une règle neuve

1. **Écrite.** La règle est au registre en hypothèse, avec ses paramètres et son repli.
2. **En ombre.** Elle tourne à chaque composition, à côté du moteur : elle calcule ce qu'elle aurait changé, l'écrit au journal, et ne
   l'applique pas. Le banc montre la différence en images (« avec elle »).
3. **Conditions pour l'activer** (toutes) :
   - sur tout le jeu de référence, aucune mesure A1 à A11 ne baisse de plus d'une tolérance (RD 0,02) et au moins une monte ;
   - aucune faute P0 à P2 nouvelle ;
   - les tests de conflit passent (10-PROCESSUS 7.3, tests a et b) ;
   - Mathias a vu les doubles qui changent et a dit oui.
4. **Active**, puis **validée** quand il l'a confirmée en mots (elle devient « VALIDÉE », source M-…).
5. **Retirée** : archivée avec sa raison, jamais supprimée (règle d'archivage du dépôt).

Une règle en ombre ne coûte rien (aucune IA) ; plusieurs peuvent l'être en même temps, chacune mesurée seule puis ensemble.

---

## 7. Les tests de non-régression

Trois sortes, rejouées à chaque changement de règle, de réglage ou de code, toutes sans IA :

1. **Le jeu de référence entier, mesures A1 à A12.** « Un chiffre qui baisse bloque la fusion » (enquête §5), au-delà de la tolérance.
   On regarde aussi CE QUI A CHANGÉ, pas seulement « ça passe » (04-METHODES §3) : la liste des doubles modifiées est montrée.
2. **Les cas fixés.** Tout défaut corrigé devient un cas, écrit comme une propriété générale vérifiée sur un exemple cité à part :
   « dans R1, deux photos prises à huit minutes d'écart au même sanctuaire sont sur la même double » ; « aucun titre n'est une enseigne » ;
   « la photo de personnes verticale n'est pas rognée en haut ». Le cas cite l'exemple ; la règle, elle, reste générale.
3. **Les invariants**, sur tous les magazines et sur des lots fabriqués (sans date, sans GPS, tout en paysage, très petits, très gros) :
   aucune faute P0 à P2 ; même entrée, même sortie (déterminisme) ; une correction de l'atelier n'est jamais défaite ; rien n'est retiré sans
   raison (M-02) ; jamais d'impasse muette (M-14).

Le harnais du dépôt (`scripts/verif-atelier.ts` et les rejeux `scripts/compositeur-rejeu.ts`) est l'endroit où ces tests vivent (M-11).

---

## 8. Le chemin vers l'automatique

### 8.1 Quatre états par étape (04-METHODES §3 et principe 11)

| État | Ce que fait la machine | Ce que fait l'atelier |
|---|---|---|
| **Ombre** | elle propose à côté | il compose comme avant ; on compare |
| **Validation totale** | elle compose | il regarde chaque arrêt et corrige |
| **Échantillon** | elle compose | il ne s'arrête que quand la machine doute, et sur un magazine sur N (RD) |
| **Automatique** | elle compose | il ne voit plus cet arrêt ; le bon à tirer reste humain, toujours |

### 8.2 Quand une étape passe à l'état suivant (seuils RD, à fixer par Mathias)

Une étape passe d'un état au suivant quand ses mesures tiennent sur **10 magazines de suite** (RD), dans tous les profils représentés, et
qu'elle n'a aucune faute P0 à P2. Le seuil se compare au plafond « lui contre lui » quand on le connaît.

| Étape | Mesures qui la jugent | Seuil pour « échantillon » (RD) | Seuil pour « automatique » (RD) |
|---|---|---|---|
| Lecture (tags) | exactitude de nos personnes, visage confirmé, sorte du nom lu | 0,9 | 0,95 |
| Tri | A1 rappel et précision ; F-RESERVE = 0 | 0,85 | 0,9 |
| Récit | A3, A4 (retours non voulus = 0), A6, A8 | A3 au niveau du sien | idem sur 20 magazines |
| Assortiment | A2, A5 (écart moyen), F-DENSITE = 0 | A2 ≥ 0,5 ; écart ≤ 1 photo | A2 ≥ 0,6 ; écart ≤ 0,5 photo |
| Mise en page | A11 ; F-COUPE, F-PETITE, F-CACHEE = 0 ; taux d'acceptation des doubles | 0,7 | 0,8 |
| Habillage | A7 (enseignes = 0, faits faux = 0), A10 | sorte du titre juste à 0,8 | 0,9 |

**La cible produit** citée par Mathias (MAC-3153) : « 50 % du premier coup, 40 % quelques retouches, 10 % qui passent du temps ».
**L'ouverture de l'éditeur au client** (D-20 VALIDÉE) attend que le taux d'acceptation dépasse un seuil que Mathias fixera après mesure (Q-16).

### 8.3 Des corrections aux poids

Tant que les corrections sont rares, elles servent à **écrire des règles** (04-METHODES §3). Au-delà d'un volume (RD : 200 corrections sur
un même paramètre), elles servent à **régler les poids** : chaque correction est une préférence « il a préféré B à A », et les préférences par
paires se transforment en poids (méthode Bradley-Terry, 04-METHODES §3). On apprend le goût de Mathias sur les MESURES et les CHOIX, jamais
sur les pixels, et rien sur des visages d'enfants (NO-408, NO-431).

---

## 9. Le banc de réglages

Ses mots : « un rendu qui permet, avec des visuels tests (les magazines qu'on a déjà faits), la vérification de chaque règle, où les réponses
appliquent des paramètres et critères et permettent de voir les changements de tri, sélection, mise en page, choix artistiques, pour que je
reparamètre, et toi tu me dis à chaque fois ce que cela peut impliquer ».

### 9.1 Ce que c'est

- **Une page de l'atelier**, derrière l'accès admin (`/admin/atelier/banc`, nom proposé), pas un service externe : ce sont des photos de clients.
  Aucune photo ne part ailleurs. Les éditions collectives restent hors du banc (M-12).
- **Elle part de ce qui existe** : la page Analyse (C21, M-34), l'écran « Règles » qui compte les corrections par règle et le relevé des
  différences (M-30), le rejeu du compositeur (C20), le banc local du tunnel. Elle les réunit sur les magazines de référence.
- **Tout s'y rejoue sans IA.** Un rejeu ne lit que les lectures gardées. Une information nouvelle (un tag jamais demandé) exige un bouton à
  part, « lire ce qui manque », qui affiche le coût estimé et attend son oui. Jamais automatique.

### 9.2 Les zones de l'écran

| Zone | Ce qu'on voit | Ce qu'on bouge |
|---|---|---|
| **A. Le bandeau** | le magazine de référence choisi (ou « tous ») ; la version des règles et des réglages ; les mesures A1 à A12, chacune avec sa valeur et sa petite courbe sur les versions passées | choisir le magazine ; revenir à une version |
| **B. Réponses et réglages** (gauche) | les questions du magazine (Q-C, Q-A) avec « deviné » ou « saisi » ; le profil, le thème, l'école et les neuf curseurs ; puis les paramètres transverses ; puis ceux de chaque moteur (repliés). Chaque réglage montre sa plage, sa valeur de départ, d'où vient sa valeur (profil, curseur, réponse) et un point quand il a bougé | une réponse d'un toucher ; un curseur ; une valeur ; une règle allumée, éteinte ou en ombre ; la graine (autre variante) |
| **C. La comparaison** (centre), quatre onglets = les quatre arrêts | **Le voyage** : la frise des jours et des lieux, ses coupes de chapitre au-dessus, celles de la machine en dessous, le tri des deux. **Le chemin de fer** : ses doubles en haut, celles de la machine en bas, chaque photo commune reliée par un trait, une couleur par journée. **La mise en page** : double contre double, zones importantes et cadres gardés en surimpression. **Les finitions** : titres côte à côte avec la source de chaque mot ; couverture | « avant mon réglage / après » : les photos qui ont bougé clignotent ; toucher une double l'ouvre en grand |
| **D. Les règles** (droite) | pour l'objet touché (photo, double, chapitre) : les règles qui ont décidé, leur niveau, leur statut, leurs paramètres, celles qui ont cédé et à cause de qui | « voir partout » ; « et sans elle ? » ; mettre en ombre ; activer |
| **E. Ce que ça implique** (bas) | avant toute validation, le rejeu de TOUT le jeu de référence avec le réglage en cours : par magazine, les mesures avant et après ; le nombre de doubles changées ; les photos qui entrent et sortent ; les fautes nouvelles ; les règles qui cèdent plus ; les conflits apparus (tests a et b) ; les profils touchés ; et une phrase par conséquence | rien : on lit, puis on valide ou on annule |
| **F. Valider** | le nom du réglage, sa portée (ce profil, tous les profils), sa raison (ses mots), les magazines rejoués | valider ; annuler |

### 9.3 Vérifier une règle à l'œil

Toucher une règle dans la zone D ouvre sa fiche (partie 4) et deux boutons :
- **« Voir partout »** : une galerie de chaque endroit, sur tous les magazines de référence, où la règle a décidé ; à côté de chaque double de
  la machine, ce qu'il a fait avec les mêmes photos. Une pastille verte (il a fait pareil), rouge (il a fait autrement), grise (pas comparable).
  En tête : « J-01 a décidé 23 fois ; il a fait pareil 19 fois, autrement 3 fois, 1 cas non comparable ».
- **« Et sans elle ? »** : le même magazine rejoué règle éteinte, les deux versions côte à côte, et les mesures qui bougent.

Une règle se juge donc sur ses effets visibles et chiffrés, jamais sur sa formulation.

### 9.4 Ce que la machine dit des conséquences, avant validation

Les conséquences sont **calculées** par le rejeu (zone E) et écrites en phrases à partir des chiffres, sans IA :
- « Densité visée du profil couple de 2,5 à 3 : sur R1, 16 doubles deviennent 13 ; 3 doubles passent à 5 photos ; A5 passe de 0,62 à 0,48 ; aucune faute nouvelle. »
- « Règle J-04 activée : sur R1, les 5 plats se réunissent sur une page ; A2 monte de 0,29 à 0,34 ; A4 compte un retour en arrière de plus, titré ; sur R2, rien ne change (aucune série de sujet de 3 photos). »
- « Attention : ce réglage touche aussi les profils P5 et P6 (paramètre commun). »
(Les chiffres de ces trois phrases sont des exemples de forme, pas des résultats.)

**Ce que je dis en plus, en séance.** Le banc exporte la différence (chiffres, doubles changées, règles touchées ; jamais les photos) ; je la
lis en séance et je dis ce que le réglage peut impliquer au-delà du jeu de référence : sur quels lots il risque de mal tourner (un profil
sans album de preuve, un lot sans GPS), quelles règles il rapproche d'un conflit, quelle question il rend inutile ou nécessaire.

### 9.5 Comment un réglage validé s'inscrit dans le système

1. Il devient une **nouvelle version des réglages** : nom, valeur, date, portée, raison en ses mots, magazines rejoués et mesures (Notion G7 :
   « réglages versionnés : nom, valeur, date, leçon »).
2. Les mesures du jeu de référence avec cette version deviennent la nouvelle **base** de non-régression.
3. La fiche de chaque règle touchée note le changement.
4. Il est **porté au registre du dépôt** (M-11 : « une règle n'existe que si elle est dans le dépôt ») sur une branche, avec son test au harnais.
5. Il s'applique aux nouveaux magazines ; un magazine déjà proposé garde sa version (on peut le recomposer avec la nouvelle, et la différence se voit).
6. Tout se défait : choisir une version passée dans le bandeau.

### 9.6 Le schéma de l'écran

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ BANC · R1 réf. couple (couple, 40 photos) ▾   règles v… · réglages v…   [Tous les magazines]       │
│ A1 0,87/0,94 ▁▃▅  A2 0,29 ▁▂  A3 11/16 ▂▃  A4 14 retours ▅▃  A5 0,62  A7 0,0  A8 ½  A12 2 ⚠   │
├────────────────────┬─────────────────────────────────────────────────────┬───────────────────┤
│ RÉPONSES           │ [Le voyage] [Le chemin de fer] [La mise en page] [Les finitions] │ RÈGLES (double 8) │
│ Combien : 2 (saisi)│                                                     │ J-01  P3  active  │
│ Lieux : (GPS) ✓    │  LUI     ▣▣ │▣▣▣▣▣│▣▣ │▣▣ │▣▣▣│▣▣ │▣▣▣▣│ …           │  a décidé · ✓ 19  │
│ Préférées : aucune │           ╲    ╱  ╲                                 │  [voir partout]   │
│ Thème : road trip  │  MACHINE ▣ │▣▣ │▣  │▣▣▣│▣▣▣│▣ │▣▣▣│▣▣▣▣▣│ …         │  [et sans elle ?] │
│ Profil : P3 ✎      │  (une couleur par journée ; ● photo qui a bougé)    │ N-48  P4  active  │
│ École : Calme ▾    │                                                     │  a cédé à cause   │
│ Densité   ──●───   │  double 8 : 5 photos · « même période » · J-01 cède │  de P1 (ppp)      │
│ Rythme    ───●──   │                                                     │ P-14  P5  ombre   │
│ Sujet     ─●────   │                                                     │                   │
│ … 9 curseurs       │  [avant mon réglage ◐ après]                        │ [mettre en ombre] │
│ ▸ Paramètres TRV   │                                                     │ [activer]         │
│ ▸ Lecture ▸ Tri …  │                                                     │                   │
├────────────────────┴─────────────────────────────────────────────────────┴───────────────────┤
│ CE QUE ÇA IMPLIQUE (rejeu de 9 magazines, sans IA)                                            │
│ R1 : 16 → 13 doubles · A5 0,62 → 0,48 · 0 faute nouvelle │ R2 : rien ne change │ P5, P6 touchés │
│ « La densité monte : le un site connu passe de pleine page à demi-page sur R1 (A9 baisse). »           │
│                                       [Annuler]   Nom : ______  Raison : ______  [Valider]   │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 9.7 Ce qui doit être prouvé avant de croire le banc

- Le rejeu complet d'un magazine tient en moins d'une seconde par taille (prouvé sur le compositeur actuel, C20) ; le rejeu de tout le jeu
  est à mesurer.
- La correspondance automatique (empreinte) retrouve ses photos dans ses fichiers : à mesurer sur R1, dont la correspondance à l'œil existe déjà.
- Les mesures A1 à A12 reproduisent les chiffres de l'enquête sur R1 (rappel 0,87, paires 10 sur 35, journées 11 et 16, retours 14 et 5) : c'est
  le premier test du banc lui-même.

---

## 10. À trancher par Mathias

| Question (réponse d'un mot) | Ma recommandation | Ce que ça change |
|---|---|---|
| Une séance de critique par semaine au début ? (oui / non) | **Oui** | Les familles d'erreurs se vident dans l'ordre du dégât |
| Un chiffre qui baisse bloque-t-il toute fusion ? (oui / non) | **Oui, au-delà d'une tolérance** | Plus aucune régression silencieuse |
| Le seuil « automatique » d'une étape : 10 magazines de suite ? (oui / non) | **Oui**, avec tous les profils représentés | Sans album de fête, l'étape reste en échantillon pour ce profil |
| Le banc dans l'atelier (photos de clients, accès admin) ? (oui / non) | **Oui** | Pas de copie des photos ailleurs |

## Ce qui me manque

- La liste exacte des magazines finis avec leur lot complet (le corpus du banc est rangé par profil ; je n'ai pas vérifié pour chacun que
  les deux existent).
- Ses variantes de doubles en nombre suffisant pour le plafond « lui contre lui ».
- Une base pour la précision de A2 (paires de la machine présentes chez lui) : non calculée dans l'enquête.
- Le temps de rejeu de tout le jeu, et l'état réel en base de la proposition gardée et des leçons d'écart (migration écrite, application à vérifier).
