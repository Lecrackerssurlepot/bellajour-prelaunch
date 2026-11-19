> **Copie nettoyée (M-01) de `10-PROCESSUS.md` du socle du 19/11**, écrite par `scripts/socle-import.ts` : ne pas éditer à la main.
> Les magazines de référence y sont nommés par leur profil (« réf. couple », « réf. famille »). Les règles vivent en données
> (`src/lib/mise-en-page/regles/socle/`) ; les réponses de Mathias du 19/11 sont dans `A-TRANCHER.md` (M-35 à M-57).
>
> **À jour des réponses du 19/11 :**
> - §1 principe 2 (« une information lue par aucune décision est retirée ») est REMPLACÉ par M-56 : toute information lue est gardée pour l'atelier.
> - Le cercle Mise en page ↔ Habillage (trou T1) est coupé dans les contrats : l'Habillage annonce les textes AVANT la Mise en page (6a), les écrit APRÈS (6b) : `src/lib/mise-en-page/moteurs/contrats.ts`.
> - La correction de l'atelier face à P0 et P1 : il ne force pas une faute (M-46).

# 10 · Le processus de A à Z : sept moteurs, quatre arrêts, une échelle de priorité

Auteur : l'architecte du socle, 19/11/2026., lecture seule sur le dépôt.
Ce fichier écrit le CADRE. Les règles de chaque moteur viennent des quatre autres auteurs ; elles s'emboîtent ici par trois choses :
les données échangées (les contrats), l'échelle de priorité P0 à P7 et la mécanique de repli.

**Ce que ce fichier couvre.** Le parcours complet, moteur par moteur : ce que chacun reçoit, décide et rend ; ce que l'atelier voit et
corrige ; ce qui est gardé pour rejouer sans repayer l'IA ; ce qui coûte ; ce qui change par rapport au moteur d'aujourd'hui (code v2.1
du 18/11). Puis comment les moteurs vivent ensemble : la priorité, le repli, les conflits, la boucle « composer, vérifier, réparer » et la règle d'arrêt.

**Sources.** `04-METHODES.md` (architecture « générer, vérifier, réparer », hiérarchie de contraintes, relâchement dans l'ordre, journal) ;
`03-CONCURRENTS.md` (photo héros désignée, curseur de densité, aperçu fidèle) ; `01-NOTION.md` phases I et J (NO-351 à NO-435, décisions D-01 à D-22) ;
`02-DOCUMENTS-MAC.md` (questionnaire V1.1 MAC-2837 à MAC-2932, hiérarchie en 8 niveaux MAC-1869, conflits MAC-1869 et suivants,
cascade MAC-1871 à MAC-1876, échelle de repli MAC-1980 et MAC-1981, phase J MAC-3097 à MAC-3220) ; `definition/RAPPORT.md` (V2-…) ;
l'enquête sur la réf. couple (hors dépôt) (J-01 à J-13) et l'enquête sur la réf. couple (hors dépôt) (C1 à C39) ; le code du compositeur
(`src/lib/mise-en-page/compositeur/`, `editeur/lireLesPhotos.ts`) et `docs/moteur/tunnel/RETOURS-MATHIAS.md` (M-01 à M-34).

**Conventions.** RD = réglage de départ, jamais un fait, à régler au banc. Les noms en `capitales_soulignées` sont les paquets de données
échangés entre moteurs (le contrat). Les identifiants INFO-… renvoient à `11-INFORMATIONS.md`, PARAM-… et Q-… à `12-QUESTIONS-PARAMETRES.md`.

---

## 0. Le parcours en un schéma

```
 PHOTOS DÉPOSÉES (sans plafond, D-18)          RÉPONSES DU DOSSIER (occasion, histoire, titre : /composer)
        │                                              │
        ▼                                              ▼
 ┌──────────────────────────── 1. LECTURE ──────────────────────────────────────────────┐
 │ L1 fichier (0 $) → L2 pixels (0 $) → L3 ensembles (0 $) → L4 lieux GPS + géocodage    │
 │ → entonnoir → L5 IA planches → L6 IA regard fin (candidates) → L7 IA voyage (1 appel) │
 │ → L8 projet lu + questions devinées (avec leur confiance)                            │
 └──────────────────────────────────────────────────────────────────────────────────────┘
        │ FICHE_PHOTO · ENSEMBLES · LIEUX · PROJET_LU · REPONSES · LECTURES_IA
        ▼
 ┌──────────────────────────── 2. TRI ──────────────────────────────────────────────────┐
 │ cinq causes d'écart · cinq notes en crans du lot · réserve avec raison · séries       │
 │ taille possible et taille méritée par photo                                         │
 └──────────────────────────────────────────────────────────────────────────────────────┘
        │ TRI
        ▼
 ┌──────────────────────────── 3. RÉCIT ────────────────────────────────────────────────┐
 │ journées et lieux · chapitres · ordre et entorses · ouverture, sommet, fin           │
 │ nombre de pages proposé · budget de doubles par chapitre · couvertures réservées      │
 └──────────────────────────────────────────────────────────────────────────────────────┘
        │ VOYAGE                         ══► ARRÊT 1 « LE VOYAGE » (l'atelier regarde, corrige ou passe)
        ▼
 ┌──────────────────────────── 4. ASSORTIMENT ──────────────────────────────────────────┐
 │ qui va avec qui sur chaque double · combien · le héros · la raison de chaque voisine  │
 └──────────────────────────────────────────────────────────────────────────────────────┘
        │ CHEMIN_DE_FER                  ══► ARRÊT 2 « LE CHEMIN DE FER »
        ▼
 ┌──────────────────────────── 5. MISE EN PAGE ─────────────────────────────────────────┐
 │ gabarit · tailles · recadrage par ce qu'on coupe · pli · marges · répétition          │
 └──────────────────────────────────────────────────────────────────────────────────────┘
        │ MAQUETTE                       ══► ARRÊT 3 « LA MISE EN PAGE »
        ▼
 ┌──────────────────────────── 6. HABILLAGE ────────────────────────────────────────────┐
 │ titres et légendes (des faits ou rien) · couleurs · polices · filtres · fonds · couverture │
 └──────────────────────────────────────────────────────────────────────────────────────┘
        │ HABILLAGE
        ▼
 ┌──────────────────────────── 7. REVÉRIFICATION ───────────────────────────────────────┐
 │ vérificateur indépendant → fautes par niveau → réparation locale bornée → verdict    │
 └──────────────────────────────────────────────────────────────────────────────────────┘
        │ RAPPORT                        ══► ARRÊT 4 « LES FINITIONS » (puis bon à tirer, toujours humain)
        ▼
 PROPOSITION GARDÉE SUR LE SERVEUR (versions, lectures IA, journal) → l'atelier signe → impression

 Tout au long : JOURNAL (chaque décision, sa règle, ses paramètres, ce qui a cédé), REGLAGES (valeur et origine de chaque paramètre),
 CORRECTIONS (gestes de l'atelier, gardés à part, qui priment).
```

**Le sens de la flèche.** Chaque moteur lit ce que les précédents ont rendu et ne le modifie jamais. Quand il ne peut pas faire son travail
avec ce qu'il a reçu, il ne corrige pas l'amont : il écrit une DEMANDE (voir 7.4). Seul l'orchestrateur (la boucle de réparation) peut
relancer un moteur amont, et toujours en lui ajoutant une contrainte, jamais en décidant à sa place.

**Une correction de l'atelier relance à partir du moteur qui possède la donnée corrigée, jamais avant.** Corriger un nombre de personnes
relance le Tri et tout ce qui suit ; renommer un chapitre ne relance que l'Habillage. Aucune correction ne relance une lecture IA.

---

## 1. Les principes du cadre (huit)

1. **Le mesurable à l'algorithme, la description à l'IA, le sens à l'humain** (04-METHODES §7, principe 2 ; D-05 « l'IA mesure et propose, des règles décident »).
2. **Une information n'existe que si une décision la lit** (définition v2, point 2). Une information lue par aucune décision est retirée ou mise en attente (11-INFORMATIONS, liste a).
3. **Chaque paquet de données porte sa confiance et sa source.** Une valeur devinée n'a pas le même poids qu'une valeur saisie ; un tag IA n'a pas le poids d'une mesure.
4. **Un interdit ne se pondère pas** : P0 et P1 filtrent, ils n'entrent jamais dans un score (04-METHODES, principe 1).
5. **Une règle de P3 à P7 déclare son repli** (consigne commune) : c'est ce qui empêche qu'elle en bloque une autre.
6. **Le générateur ne se juge pas lui-même** : la Revérification est un programme à part qui ne lit que la sortie et les faits (04-METHODES, principe 5).
7. **Tout se rejoue sans repayer** : les lectures IA sont gardées par photo et par version de consigne ; tout le reste se recalcule en moins d'une seconde par taille (preuve : C20 du dépôt, rejeu du compositeur).
8. **Tout s'explique** : chaque décision cite sa règle et ses paramètres ; ce qu'on ne peut pas expliquer ne sort pas (04-METHODES, principe 12 ; M-02 « rien n'est retiré en silence »).

---

## 2. Les paquets de données (le contrat entre moteurs)

| Paquet | Produit par | Lu par | Contenu (nommé) | Gardé |
|---|---|---|---|---|
| `FICHE_PHOTO` | Lecture L1, L2, L5, L6 | tous | une ligne par photo : les INFO de niveau photo (date, forme, taille possible, netteté, visages, zone importante, chaleur, palette, tags IA, lieu…) chacune avec sa source et sa confiance | oui, par photo et par version de mesure |
| `ENSEMBLES` | Lecture L3 | Tri, Récit, Assortiment | doublons, piles, séries et leur type, similaires, moments, jours, jours forts, densité de prise, paires candidates, voisines | recalculé (gratuit) |
| `LIEUX` | Lecture L4 (et L6 pour les noms lus) | Récit, Assortiment, Habillage | par photo : commune, ville, région, pays, lieu nommé proche, preuve (GPS, panneau confirmé, saisi) ; par lieu : rang (principal, secondaire, passage) ; la sorte de chaque nom lu (lieu, enseigne, document) | oui (appels de géocodage payés une fois) |
| `PROJET_LU` | Lecture L7 et L8 | tous | profil, thème, groupe du projet, durée, jours, pays, part de gens, de nuit, de paysages ; pour chaque champ : valeur, source, confiance | recalculé, sauf la réponse de l'IA voyage (gardée) |
| `REPONSES` | client, atelier, ou deviné par L8 | tous | chaque question Q-… : réponse, origine (saisie client, saisie atelier, devinée), confiance | oui |
| `CORRECTIONS` | l'atelier, à chaque arrêt | le moteur propriétaire et la suite | gestes datés : tag corrigé, marque (coup de cœur, gardée, sortie, écartée), coupe de chapitre, nom, photo déplacée, gabarit, recadrage, texte | oui, jamais écrasées par une relecture (M-27, D12) |
| `REGLAGES` | profil + curseurs + réponses + corrections | tous | la valeur effective de chaque PARAM et son origine (défaut du profil, curseur, réponse, correction, banc) | oui, avec la version |
| `TRI` | Tri | Récit et la suite | par photo : statut (posable, réserve, écartée), cause ou raison en mots, règle ; cinq notes et leurs crans ; taille possible ; taille méritée ; rôles candidats (héros, détail, ouverture, sommet, fin, couverture) ; série et élue | oui |
| `VOYAGE` | Récit | Assortiment et la suite | journées-lieux, chapitres (bornes, nom proposé et sa source, confiance), ordre des photos, entorses (petites, grandes et leur titre), ouverture, sommet, fin, nombre de pages, doubles par chapitre, photos réservées à la couverture | oui |
| `CHEMIN_DE_FER` | Assortiment | Mise en page et la suite | la suite des doubles : photos dans l'ordre, héros, type de double, densité, relation de chaque voisine (« large et détail », « pancarte et sujet »…), intention (ouverture, respiration, sommet, série, récit) | oui |
| `MAQUETTE` | Mise en page | Habillage, Revérification | par double : gabarit, cadres en millimètres, photo par cadre, recadrage (fenêtre gardée, zone importante conservée en part), pli, marges, place libre pour un texte | oui |
| `HABILLAGE` | Habillage | Revérification | textes posés et la source de chaque mot (saisi, GPS, panneau confirmé, date, compté) ; couleurs, fonds, polices, filtres ; couverture (1re, 4e) | oui |
| `RAPPORT` | Revérification | l'atelier, l'orchestrateur | fautes par niveau P0 à P7, lieu, preuve chiffrée ; réparations faites ; verdict (prête, à reprendre, bloquée) | oui |
| `JOURNAL` | tous | l'atelier, le banc, l'apprentissage | chaque décision : moteur, règle et version, paramètres lus, candidats écartés et pourquoi, règle qui a cédé et à cause de quelle autre | oui |
| `LECTURES_IA` | Lecture L5 à L7 | Lecture (rejeu) | les réponses brutes, le modèle, la version de la consigne, les jetons et le coût | oui, c'est ce qui permet de rejouer gratuitement |

**Le contrôle de contrat.** À chaque passage d'un moteur au suivant, un contrôle gratuit vérifie que le paquet est complet et cohérent
(toute photo a un statut ; toute photo posable est dans un chapitre ; tout chapitre a au moins une double ; toute double a un héros ;
tout texte a une source). Un paquet incomplet arrête le parcours avec une phrase (M-14 « jamais d'impasse muette »), jamais avec un écran vide.

---

## 3. Les sept moteurs

### 3.1 LECTURE : ce qu'on sait de chaque photo et du lot

**Reçoit.** Les fichiers ; les réponses déjà données au dossier (occasion, histoire, titre : écrans 1 à 3 de `/composer`) ; les éventuelles
réponses de l'atelier ; les corrections passées.

**Décide.** Rien d'éditorial. Elle mesure, regroupe, demande à l'IA de décrire, et devine les réponses aux questions avec leur confiance.
Elle décide seulement QUI part à l'IA et à quel niveau (l'entonnoir), et quelles questions doivent être posées (confiance trop basse).

**Les huit sous-étapes, dans l'ordre obligatoire du moins cher au plus cher** (Notion « Coût / Entonnoir » NO-397 à NO-399 ; I-08) :

| Étape | Ce qu'elle fait | Coût mesuré | Rend |
|---|---|---|---|
| L1 fichier | date, fuseau, appareil, objectif, ISO, vitesse, flash, lumière de scène, GPS, dimensions, orientation, numéro de galerie | 0 $ ; 0,4 s pour 164 photos (INVENTAIRE) | `FICHE_PHOTO` partie fichier |
| L2 pixels | netteté du sujet, empreinte, visages en tuiles, chaleur, zone importante, zone calme, palette, lumière, contraste, température | 0 $ ; 13,5 s pour 164 photos dont 10 s de visages (INVENTAIRE) | `FICHE_PHOTO` partie pixels |
| L3 ensembles | doublons, piles, séries, similaires, moments, jours, jours forts, densité de prise, voisines | 0 $ ; moins de 10 ms | `ENSEMBLES` |
| L4 lieux | GPS → commune, ville, région, pays, lieu nommé proche, trajet ; un appel de géocodage par endroit arrondi | appels Geoapify, coût non relu (INVENTAIRE couche 4) | `LIEUX` |
| entonnoir | une photo par pile, ni floue, ni capture évidente, ni trop petite partent à l'IA | 0 $ | liste des photos lues |
| L5 IA planches | planches de 16 vignettes : rôle, sujet, plan, intérêt, personnes, moment, ambiance, force d'image, geste, pose, insolite, sujet spécial | ≈ 0,0014 $ la photo (définition v2) | `LECTURES_IA` puis `FICHE_PHOTO` |
| L6 IA regard fin | une photo à la fois, pour les candidates et les photos à texte : lieu lu, nature du texte, plat, couverture, expression, yeux, point d'accroche | ≈ 0,0017 $ la photo (mesuré 0,00167) | idem |
| L7 IA voyage | un appel texte : pays, type, qui, profil, chapitres proposés et leurs noms, doutes | quelques centimes (non isolé dans les mesures) | `PROJET_LU` en partie |
| L8 projet lu et questions | profil, thème, groupe, signaux du lot ; chaque question devinée avec sa confiance ; liste des questions à poser | 0 $ | `PROJET_LU`, `REPONSES` devinées |

Mesures globales connues : 0,38 $ pour 164 photos (long voyage en famille, analyse complète, définition v2 §15) ; 0,196 $ pour 40 photos et
49 appels (voyage au réf. couple, rejeu du 18/11 : 3 planches, 19 regards fins, 25 compléments de tags, 1 classement de couverture). Plafond voulu :
1 € pour un gros projet (Notion, processus du 17/11, NO-416).

**Ce que l'IA voyage reçoit, et ce qui change.** Aujourd'hui elle reçoit une ligne de tags par photo, sans ville ni histoire du client (C10).
Désormais elle reçoit : les journées et leurs villes (L4), les noms lus avec leur sorte (lieu, enseigne), le comptage croisé des personnes,
et les mots du client (occasion, histoire). Elle rend des PROPOSITIONS de chapitres et de noms, jamais des bornes définitives (voir 3.3).

**Rend.** `FICHE_PHOTO`, `ENSEMBLES`, `LIEUX`, `PROJET_LU`, `REPONSES` (devinées), `LECTURES_IA`.

**Arrêt.** Aucun arrêt propre : ce que la Lecture a compris se montre à l'arrêt 1, avec le Tri et le Récit (la page Analyse, M-34).
Seule exception : les questions dont la confiance est sous le seuil (12-QUESTIONS-PARAMETRES, partie 2) sont posées avant de composer,
au plus trois « doutes avoués » par magazine (Notion ch.9 ; définition v2 §13).

**Gardé pour rejouer.** Tout : mesures, réponses IA brutes avec leur version de consigne, géocodage. Une photo ajoutée n'est lue que seule ;
une information déjà lue ne se relit jamais (V2-REJ-02). Un changement de question ne relance jamais l'analyse (MAC-2939).

**Ce qui change.** Le GPS est lu ET transmis (C1, C14 : l'étape des lieux ne tournait que SANS GPS) ; la sorte du nom lu (lieu, enseigne,
document) est toujours établie (C8) ; on compte « nos » personnes à part des passants (C6, voir 11-INFORMATIONS liste d) ; un visage du
détecteur que l'IA ne confirme pas ne fait plus la zone importante (C3, J-11) ; le budget du regard fin prend d'abord toutes les
candidates pleine page (C7 : deux candidates coupées par le plafond, le un site connu jamais regardé de près).

### 3.2 TRI : garder, réserve, écarter

**Reçoit.** `FICHE_PHOTO`, `ENSEMBLES`, `PROJET_LU`, `REPONSES`, `CORRECTIONS` (marques), `REGLAGES`.

**Décide.**
- Écarter, seulement pour les cinq causes fermées (D2, M-17) : doublon exact, floue sans aucun sujet net, inimprimable même en vignette, hors sujet, geste de l'atelier.
- Les cinq notes (technique, histoire, image, gens, unicité) en crans pris dans le lot (D5, M-20).
- La réserve, seulement pour les faibles et les vraies répétitions (M-09) ; jamais pour une raison de rangement (M-18).
- Les séries et leur élue (quasi-identiques : une ; au-delà, tout ce qui est assez différent, M-19).
- Pour chaque photo : sa taille possible (la définition la borne) et sa taille méritée (image et gens), et ses rôles candidats.

**Ne décide pas.** Le nombre de pages, la place, les voisines. Le « pas de place » n'est jamais une raison du Tri : c'est le Récit qui le
dira, en dernier recours (M-16).

**Rend.** `TRI`.

**Arrêt.** Montré à l'arrêt 1 : chaque photo avec son statut, sa raison en mots, ses cinq notes en pastilles, sa taille méritée. Geste
d'un clic : faire entrer, sortir, écarter, coup de cœur, corriger un tag (nombre de personnes, sujet, lieu). Relance : Tri et suite.

**Gardé.** `TRI` et le journal. Rejoué gratuitement.

**Coût.** 0 $.

**Ce qui change.** « Technique faible » ne suffit plus pour la réserve si la photo complète une série ou une paire (C19, J-09 : le cinquième
plat parti en réserve) ; la note « gens » compte nos personnes, pas les passants (C18 : le sumo premier grâce à 7 passants) ; la netteté
relative au lot ne condamne pas seule une photo de nuit ou un gros plan doux (C2).

### 3.3 RÉCIT : le voyage, les chapitres, l'ordre, la forme d'ensemble

**Reçoit.** `TRI`, `ENSEMBLES`, `LIEUX`, `PROJET_LU`, `REPONSES`, `REGLAGES` (dont le thème, le profil, le poids du temps contre le sujet).

**Décide.**
- Les **journées-lieux** : l'unité qu'on ne coupe pas (J-01). Une journée-lieu = les photos d'un même jour dans une même ville. C'est une donnée mesurée (L1 et L4), pas un avis.
- Les **chapitres** : bornes posées sur les journées-lieux, selon le thème (étapes pour un circuit, jours ou quartiers pour un séjour court, heures pour un événement, mois pour une année : définition v2 §5.1). La proposition de l'IA voyage est un candidat parmi d'autres, départagé par les règles ; elle n'est plus un mur (C11, C21).
- Le **nom** proposé de chaque chapitre et sa source (saisi, GPS, panneau confirmé, date, thème de l'IA en dernier repli : J-02, M-05).
- L'**ordre** : la date de prise ; les petites entorses (dans la journée) et les grandes entorses titrées (séries de sujet, J-04, M-22).
- L'**ouverture** de chaque chapitre, prise dans son premier jour (J-07) ; la **page 1**, le **sommet**, la **fin** (paramètre `fin_type`, à trancher : J-06 contre S-055).
- Le **nombre de pages** proposé (M-15, N-62) : celui qui tient la densité visée du profil sur les photos posables, au multiple de 4, entre 24 et 60 pages vendues.
- Le **budget de doubles** de chaque chapitre.
- Les **photos réservées à la couverture** : trois propositions (D-08), pour que l'intérieur ne dépende pas d'un choix tardif (M-10).

**Rend.** `VOYAGE`.

**Arrêt 1 « Le voyage ».** C'est la page Analyse (M-34), avant toute mise en page. On y voit : la ligne du projet (profil, thème, groupe,
dates, pays, coût, doutes), les questions avec « deviné » ou « saisi », la frise des jours et des lieux avec les coupes de chapitre, chaque
photo par chapitre avec son statut. Gestes : glisser une coupe, fusionner, renommer, changer le thème ou le profil, corriger le nombre de
personnes, décocher un lieu (Notion Av #11), répondre à un doute. Relance : à partir du moteur propriétaire (profil et groupe : Tri ;
chapitres et noms : Récit). L'atelier peut aussi « passer » : la machine continue seule.

**Gardé.** `VOYAGE`, la proposition de l'IA voyage et l'écart entre les deux (pour apprendre quand l'IA se trompe).

**Coût.** 0 $ (l'IA voyage est payée en Lecture).

**Ce qui change.** Les chapitres suivent les journées et les villes (C1, C11, C21) ; l'ouverture ne va plus chercher sa photo plus loin
dans le temps (C28) ; le profil ne se déduit plus du thème (C15 : « circuit » devenait « famille ») ; les sujets répétés peuvent former une
grande entorse (C30) ; la fin devient un paramètre réglé par profil et tranché par Mathias (C25).

### 3.4 ASSORTIMENT : qui va avec qui sur une double

**Reçoit.** `VOYAGE`, `TRI`, `ENSEMBLES` (paires candidates), `FICHE_PHOTO`, `REGLAGES`.

**Décide.** Pour chaque chapitre, le découpage en doubles (« une double = un moment », V2-DBL-01, ou une journée-lieu quand elle est petite) ;
le nombre de photos par double (table de densité, M-28) ; le héros de chaque double ; la relation qui justifie chaque voisine (large et détail,
pancarte et sujet, portrait et ambiance, écho de couleur, contraste, jour et nuit, série : définition v2 §6.2) ; le type de double (seule,
pleine et encadrée, deux pleines, héros et satellites, bande, grille égale, séquence, dense, ouverture, papiers du voyage) ; l'alternance
(respirations, denses de suite).

**Ne décide pas.** Le gabarit précis, le recadrage, les textes. Il ne change pas l'ordre du Récit au-delà des petites entorses déjà permises.

**Rend.** `CHEMIN_DE_FER` : la suite des doubles, chacune avec « N photos ici parce que… » (M-28) et la raison de chaque voisine.

**Arrêt 2 « Le chemin de fer ».** La suite des doubles en vignettes, colorées par journée et par lieu, avec la raison écrite sous chaque
double. Gestes : déplacer une photo d'une double à l'autre, réunir deux doubles, couper une double en deux, changer le héros, refuser une
paire. Relance : Assortiment et suite, sur les chapitres touchés seulement.

**Gardé.** `CHEMIN_DE_FER` et, pour chaque double, les découpages candidats et leur coût (aujourd'hui seul le résultat est gardé : la
récit de fabrication n'a pas pu expliquer pourquoi tel découpage, RECIT « ce que je n'ai pas pu établir »).

**Coût.** 0 $.

**Ce qui change.** Couper une journée-lieu coûte (aujourd'hui seule la coupe d'un « moment » coûte, C29) ; la densité vient du bon profil et
plafonne avant d'écraser une belle photo en timbre (C27) ; une photo faible qui complète une série reste posée (J-09).

### 3.5 MISE EN PAGE : gabarit, tailles, recadrage, pli, marges

**Reçoit.** `CHEMIN_DE_FER`, `FICHE_PHOTO` (forme, taille possible, zone importante, visages, chaleur, regard), `REGLAGES`.

**Décide.** Pour chaque double : le gabarit parmi ceux qui ont exactement les places voulues (définition v2 §9.1 ; cascade MAC-1872) ; la
photo de chaque cadre ; le recadrage par ce qu'on coupe (M-29) ; le pli ; la répétition des formes (MAC-1872 étape 5, définition v2 §9.2).
« Ce que le Layout décide, et rien d'autre : template, variante, crop par slot, miroir, micro-flex des slots » (MAC-1876).

**Ne décide pas.** L'ordre, le nombre de photos d'une double, le choix des photos (frontière du Master Doc, MAC-1869 niveau 2, MAC-1983).
Quand une double est impossible, il écrit une DEMANDE à l'Assortiment (voir 7.4), il ne retire pas une photo de lui-même.

**Rend.** `MAQUETTE`.

**Arrêt 3 « La mise en page ».** L'éditeur actuel : chaque double posée, avec le cadre gardé et la zone importante de chaque photo
(cadre vert, zone jaune : enquête, planche des rognages). Gestes : autre gabarit (flèches, aperçu en transparence, NO-361), échanger deux
photos, agrandir, recadrer avec aimant et résistance près d'un visage (MAC-2830). Une double retouchée est verrouillée : la machine ne la
recompose plus sans accord (R-91, NO-358).

**Gardé.** `MAQUETTE`, et pour chaque double les gabarits essayés et leur coût (aujourd'hui non gardés : RECIT, limites).

**Coût.** 0 $.

**Ce qui change.** Plus de photo de personne rognée en haut ou en bas quand l'IA voit des gens sans visage trouvé (C35, J-12) ; plus
d'incrustation sur une photo de détails ou de texte (C36, J-13) ; une personne sous la taille minimale est une faute qui bloque (C37).

### 3.6 HABILLAGE : textes, couleurs, polices, filtres, couverture

**Reçoit.** `MAQUETTE`, `VOYAGE` (noms et leur source), `LIEUX`, `FICHE_PHOTO` (palette, zone calme, lumière), `REPONSES` (titre du client, ton), `REGLAGES`.

**Décide.** Les titres et légendes, seulement des faits ou rien (date, lieu sûr, nom donné par le client, chiffre compté : définition v2 §10,
V2-TXT-03) ; une enseigne n'est jamais un titre (J-03) ; un titre de double couvre toutes ses photos (J-10) ; les fonds (pris dans la
photo, R-131) et la couleur d'accent ; la paire de polices ; le filtre global ; la couverture (1re et 4e) parmi les propositions réservées par le Récit.

**Rend.** `HABILLAGE`.

**Arrêt 4 « Les finitions ».** Avec le rapport de la Revérification : la couverture (trois propositions, une recommandée : R-81, NO-372),
les textes (chaque mot avec sa source au survol), les couleurs, le filtre. Gestes : choisir la couverture, réécrire un texte, changer de
paire de polices, de nuancier, de filtre. Changer la couverture relance l'Assortiment des chapitres qui portaient ses photos (M-10).

**Gardé.** `HABILLAGE`.

**Coût.** 0 $ (aucun texte n'est écrit par l'IA dans ce cadre ; si plus tard l'IA met en forme une légende, elle ne reçoit que des faits calculés, NO-409 couche 7).

**Ce qui change.** Les titres viennent des lieux GPS et des journées (aujourd'hui : thèmes inventés, enseignes, dates d'un jour posées sur une double de cinq jours : C12, C26, C33).

### 3.7 REVÉRIFICATION : les fautes, la réparation, ce qui bloque

**Reçoit.** La proposition entière (`MAQUETTE`, `HABILLAGE`, `CHEMIN_DE_FER`, `VOYAGE`, `TRI`) et les faits (`FICHE_PHOTO`, `LIEUX`).
Elle ne lit pas le journal des décisions : un vérificateur qui lirait les raisons du générateur se laisserait convaincre.

**Décide.** La liste des fautes, chacune avec son niveau (P0 à P7), son lieu, sa preuve chiffrée et la règle qu'elle viole ; la réparation à
tenter (voir 7.4) ; le verdict (7.5).

**Ce qu'elle doit vérifier et ne vérifie pas aujourd'hui** (C39) : les journées-lieux coupées, les titres qui sont des enseignes ou qui
mentent sur les dates, les sujets éparpillés quand le réglage les veut réunis, la photo cachée sous une autre, une couverture qui montre
une partie du groupe.

**Rend.** `RAPPORT`.

**Arrêt.** Le rapport est montré à l'arrêt 4. Une faute de P0 à P2 restante empêche l'état « prête » (7.5).

**Coût.** 0 $.

**Ce qui change.** Aujourd'hui « 2 fautes à revoir » s'affichent et la proposition sort quand même (C39). Désormais une faute dure déclenche
la réparation, puis bloque si elle reste.

---

## 4. Les quatre arrêts : ce que l'atelier voit et peut corriger

| Arrêt | Après | Il voit | Il corrige d'un geste | Ce qui se relance | Ce qui ne se relance jamais |
|---|---|---|---|---|---|
| 1 Le voyage | Récit | profil, thème, groupe, pays, frise jours-lieux, chapitres, tri avec raisons, notes, doutes | réponses, tags, statut d'une photo, coupes et noms de chapitre, lieux à ne pas montrer | Tri ou Récit, et la suite | la Lecture, l'IA |
| 2 Le chemin de fer | Assortiment | la suite des doubles, colorée par jour et lieu, la raison de chaque double | photo déplacée, doubles réunies ou coupées, héros, paire refusée | Assortiment des chapitres touchés, et la suite | Tri, Récit |
| 3 La mise en page | Mise en page | chaque double, cadres, zones importantes | gabarit, échange, recadrage, taille | la double touchée (verrouillée ensuite) | tout l'amont |
| 4 Les finitions | Habillage et Revérification | couverture, textes et leur source, couleurs, polices, rapport des fautes | couverture, textes, couleurs, polices, filtre | Habillage ; Assortiment si la couverture change (M-10) | tout le reste |

**Le mode « sans arrêt ».** Par défaut la machine traverse les quatre arrêts et livre une proposition composée (M-27 : « la composition se
lance seule après l'Analyse ») ; les arrêts sont des regards possibles, pas des étapes imposées. Au début, Mathias s'arrête à chaque arrêt
(consigne : « au début il accepte de répondre à plus de questions ») ; un arrêt devient facultatif quand l'étape qu'il garde passe en
automatique (13-ENTRAINEMENT, partie 7).

**Le bouton « Ça ne va pas »** (enquête §5) existe à chaque arrêt, sur chaque double ou chaque photo : cinq choix d'un toucher (même jour
séparé, titre faux, à regrouper, mal coupée, mauvaise place) et un mot libre. La plainte part avec les règles qui ont décidé l'objet (déjà
connues dans le journal). Elle ne corrige rien : elle compte (13-ENTRAINEMENT, partie 3).

---

## 5. Ce qui est gardé pour rejouer sans repayer

| Gardé | Où | Clé | Permet |
|---|---|---|---|
| Mesures locales par photo | serveur, avec le projet | empreinte de la photo + version de la mesure | rejouer Tri et suite |
| Réponses IA brutes (planche, regard fin, voyage, couverture) | serveur | empreinte + modèle + version de consigne | rejouer sans appel ; comparer deux consignes |
| Géocodage | serveur | point arrondi | ne jamais repayer un lieu |
| Réponses et corrections | serveur, à part de la lecture | projet + date | primer sur la machine, survivre à une relecture |
| La proposition TELLE QUELLE (`TRI` à `RAPPORT`), la version des règles, la version des réglages, la graine | serveur | projet + numéro de proposition | enquêter sur CE qu'il a vu (aujourd'hui impossible : elle vit dans son navigateur, enquête §5) ; relever ses différences (M-30) |
| Le journal complet | serveur | proposition | expliquer chaque décision ; compter les plaintes et corrections par règle |

État connu : la proposition gardée côté serveur est codée (M-30, `compositeur/releve.ts`) ; la migration qui accepte les leçons
« écart à la proposition » (`20261119_mep_lecons_ecart_proposition.sql`) est écrite, marquée « pas appliquée » dans `RETOURS-MATHIAS.md`.
Je n'ai pas vérifié en base. Les candidats écartés de l'Assortiment et de la Mise en page ne sont pas gardés aujourd'hui.

**Ce qui exige une nouvelle lecture IA** : une information nouvelle (un tag jamais demandé), un nouveau modèle, une nouvelle version de
consigne. Rien d'autre. Tout paramètre, toute réponse, toute règle qui ne lit que des informations déjà obtenues se rejoue gratuitement.

---

## 6. Ce qui coûte

| Poste | Coût | Source |
|---|---|---|
| Lecture L1 à L3 | 0 $ ; ~14 s pour 164 photos dans le navigateur | INVENTAIRE-PHOTO (mesuré) |
| Géocodage L4 | un appel par endroit arrondi à 100 m, au plus 12 points par demande ; prix de l'offre non relu | INVENTAIRE (à vérifier) |
| IA planche L5 | ≈ 0,0014 $ la photo | définition v2 §2 |
| IA regard fin L6 | ≈ 0,0017 $ la photo, sur un quart du lot au plus (RD) | définition v2 §15 ; `lireLesPhotos.ts` (`PART_REGARD` = 0,25) |
| IA voyage L7, classement de couverture | ≈ 0,02 $ le classement ; voyage non isolé | définition v2 §15 |
| Une analyse complète | 0,38 $ pour 164 photos ; 0,196 $ pour 40 photos (49 appels) | définition v2 ; enquête réf. couple |
| Plafond voulu | 1 € pour un gros projet | Notion 17/11 (NO-416) |
| Moteurs 2 à 7 | 0 $ ; moins d'une seconde par taille (rejeu prouvé, C20) | dépôt |
| Le temps de l'atelier | objectif : moins de 30 minutes par magazine, 10 à 20 par jour | D-01 |

Le vrai coût est le temps de l'atelier aux arrêts. Chaque arrêt mesure son temps et ses gestes (G6 « deux chiffres par magazine : temps,
part de doubles gardées sans retouche »).

---

## 7. Comment les moteurs fonctionnent entre eux

### 7.1 L'échelle de priorité P0 à P7

Une règle d'un niveau ne peut JAMAIS forcer la violation d'une règle d'un niveau au-dessus (consigne commune). Concrètement, deux
propositions se comparent **niveau par niveau, du haut vers le bas** : celle qui viole moins au niveau le plus haut gagne, quel que soit
son score plus bas (ordre « lexicographique », 04-METHODES §2). Un score ne compense jamais un niveau.

| Niveau | Ce qu'il protège | Exemples de règles (sources) | Comment il agit |
|---|---|---|---|
| **P0 Interdit absolu** | ce qui blesse le client ou ment sur lui | une personne n'est jamais coupée (M-31) ; aucune identification de visage (D29) ; une photo de personnes n'est jamais petite (M-08) ; aucune page presque vide (M-07) ; jamais un texte inventé | filtre : le candidat est rejeté ; si aucun ne passe, le moteur change autre chose (cadre qui se plie à la photo, M-31) ou s'arrête avec une phrase |
| **P1 Fabrication** | ce qui s'imprime | pages multiples de 4 ; 24 à 60 pages vendues (N-62) ; marges de sécurité ; rien d'important dans le pli (B3) ; définition minimale par taille (200 ppp en pleine page, 150 en double de paysage sans visage, provisoire : M-21) | filtre |
| **P2 Vérité** | les faits | la chronologie réelle (la date reste sous une photo déplacée, V2-CHR-02) ; une enseigne n'est jamais un lieu (J-03) ; un titre de double couvre toutes ses photos (J-10) ; un lieu vient du GPS, d'un panneau confirmé ou d'une saisie | filtre pour les textes (un fait faux devient vide) ; filtre pour l'ordre (une entorse n'efface jamais une date) |
| **P3 Récit** | l'histoire | une journée-lieu ne se coupe pas (J-01) ; l'ouverture dans le premier jour (J-07) ; le sommet entre 45 et 80 % (S-053) ; chaque moment garde une trace (V2-SEL-07) | coût, avec repli déclaré |
| **P4 Assortiment** | ce qui va ensemble | une paire pancarte et sujet ne se coupe pas (N-50) ; une série reste ensemble (S-032) ; deux presque identiques jamais sur la même double (S-034) | coût, avec repli |
| **P5 Mise en page** | la forme | héros dans le plus grand cadre (P-03) ; recadrage de confort ; répétition des gabarits (R-54) ; alternance grande et dense (S-091) | coût, avec repli |
| **P6 Style** | le goût | fond pris dans la photo (R-131) ; sobriété du profil (M-06) ; un fond coloré sur trois doubles au plus (R-133) | coût, avec repli |
| **P7 Préférence** | le départage | à égalité, la photo la mieux notée « image » ; le gabarit dessiné plutôt que généré (NO-409) | départage seulement |

**Correspondance avec la hiérarchie en 8 niveaux du Master Doc layout (MAC-1869).** 1 contraintes d'impression → P1 ; 2 frontière du Layout
(ne pas repaginer, réordonner, fusionner) → ce n'est pas un niveau de règle, c'est le principe « un moteur ne revient jamais sur le
précédent » ; 3 fidélité photo (visage jamais coupé, pas d'étirement) → P0 (visage, personne) et P1 (étirement, définition) ; 4 intention
narrative honorée → P3 et P4 ; 5 lisibilité et hiérarchie de la page → P5 ; 6 cohérence (gouttières, marges) → P5 ; 7 rythme et variété → P5
(rythme de pages) ; 8 valorisation et préférences fines → P7. **Différence assumée** : le Master met l'impression au-dessus du visage ; la
consigne met P0 au-dessus de P1. En pratique ils ne se contredisent pas, parce qu'une solution existe toujours qui tient les deux : le cadre
se plie à la photo, au pire « photo entière sur fond blanc pur » (barreaux 6 et 7 de l'échelle MAC-1980).

**Où se place une correction de l'atelier.** Elle est une DONNÉE, pas une règle. Ce qu'il saisit devient la source la plus sûre de P2
(un lieu, un nombre, un titre) et une contrainte fixe pour P3 à P7 (une photo déplacée, un héros choisi). Face à P0 et P1, son geste est
appliqué tel quel, jamais défait, mais la Revérification le marque (« visage coupé par l'atelier ») et une faute P1 bloque l'impression
jusqu'à sa signature. **À trancher par Mathias** (voir fin).

**Exemples de cascade.**
- *Une belle photo de couple, très large, sur une double de cinq photos.* P0 : la personne ne se coupe pas. P1 : en double, 150 ppp suffisent
  pour un paysage SANS visage, pas pour elle. P5 voudrait la double. Résultat : pleine page avec recadrage qui garde le couple, ou bande ;
  la double est refusée sans débat, sans calcul de score.
- *Une journée de cinq photos, et un chapitre de l'IA qui la coupe.* P3 (journée-lieu entière) prime sur la proposition de l'IA, qui n'est
  qu'un candidat ; la coupe se déplace à la frontière de journée la plus proche (repli de J-01 : si la journée est trop longue pour une
  double, elle prend des doubles QUI SE SUIVENT).
- *Cinq plats sur trois jours.* P3 chronologie et P3 série de sujet se disputent la même décision (l'ordre). Le paramètre `poids_temps_contre_sujet`
  et le nombre de grandes entorses permises départagent ; P2 garde la date sous chaque plat.
- *Une dernière page.* Le profil couple veut « nous deux » (PARAMETRES.csv), son magazine veut l'au revoir (J-06). Même niveau (P3), même
  décision : c'est une contradiction de source, réglée par un paramètre `fin_type` (12-QUESTIONS-PARAMETRES) et listée à trancher.

### 7.2 La mécanique de repli

Chaque règle de P3 à P7 déclare son repli. Quand elle ne peut pas être tenue, le moteur descend cette échelle, **dans cet ordre, sans jamais
toucher une règle d'un niveau supérieur** :

1. **L'autre forme permise par la règle elle-même** (le repli écrit). Exemple : J-01 « une journée tient sur une double, ou sur des doubles qui se suivent ».
2. **Le paramètre de la règle glisse vers la borne de sa plage** (jamais au-delà). Exemple : la densité monte de la valeur visée vers le plafond du profil (M-16).
3. **La règle cède** : le candidat est accepté avec une pénalité inscrite au journal (« J-07 cédée à cause de P1 définition : aucune photo du premier jour ne tient une pleine page »).
4. **Pour une page, l'échelle garantie du Master Doc** (MAC-1980), sept barreaux : gabarit idéal ; même nombre, variante plus généreuse ;
   nombre le plus proche permis par le style ; nouveau choix de la page droite ; double « moins mauvaise » acceptée et notée ; photo entière
   sur marges du style ; photo entière sur fond blanc pur. « Le moteur descend jusqu'à ce qu'une page valide sorte. »
5. **Demande amont** (7.4) quand même le dernier barreau viole P0 ou P1 : le moteur ne décide pas à la place de l'amont, il demande.

Règle de discipline : **un repli ne peut produire que des candidats qui respectent P0 à P2.** Un repli qui viole P0, P1 ou P2 est une
erreur de rédaction de la règle, détectée par le contrôle des conflits (7.3, test c).

### 7.3 La détection des conflits entre règles : une méthode qu'un programme vérifie

Avec des centaines de règles, la plupart des conflits viennent de la PORTÉE (une règle de page contre une règle de magazine), pas de la
nature (04-METHODES §2, [DEDUIT]). La méthode a quatre tests, tous automatiques.

**Ce que chaque règle doit déclarer en plus de son format** (le registre les ajoute à la fusion des lots, je les déduis si l'auteur ne les a pas écrits) :
- `portée` : photo, paire, double, chapitre, magazine ;
- `décide` : la variable touchée, dans une liste fermée (statut d'une photo, chapitre d'une photo, ordre, double d'une photo, nombre par
  double, héros, gabarit, cadre, recadrage, texte, couleur, police, filtre, couverture, nombre de pages) ;
- `sens` : ce qu'elle pousse (plus, moins, ensemble, séparé, avant, après, vide, plein) ;
- `niveau` P0 à P7 et `repli`.

**Test a : la table des rivaux (sans rien composer).** Le programme liste toutes les paires de règles qui décident la même variable, à la
même portée ou à des portées emboîtées, dans des sens opposés. Chaque paire doit être dans l'un de ces trois cas, sinon c'est un conflit
ouvert : (1) niveaux différents (le plus haut gagne, c'est voulu) ; (2) même niveau, et un paramètre de départage nommé (ex. `poids_temps_contre_sujet`) ;
(3) même niveau, et des conditions « quand » qui ne peuvent jamais être vraies ensemble (le programme le prouve sur les valeurs possibles).

**Test b : la table « qui fait céder qui » (sur le jeu de référence).** Chaque fois qu'une règle cède (repli niveau 3), le journal note la
règle qui l'a fait céder. Rejouer tous les magazines de référence donne une table : pour chaque paire (A, B), combien de fois A a fait céder
B. Seuils RD : une règle qui cède dans plus de 30 % des cas où elle s'applique est mal placée ou mal écrite ; une paire qui ne se satisfait
jamais ensemble sur tout le jeu est un conflit réel, à remonter à Mathias avec les deux doubles en image.

**Test c : le noyau impossible.** Quand aucun candidat ne passe P0 à P2 (impasse), le programme retire les règles une à une, en partant de la
priorité la plus basse, jusqu'à trouver le plus petit groupe de règles incompatibles entre elles (le « sous-ensemble irréductible » des
solveurs, 04-METHODES §2 point 4). Ce groupe est écrit au journal et au carnet de chaque règle. Un groupe qui ne contient que des règles
P0 à P2 est une erreur du socle, à corriger avant toute fusion.

**Test d : la règle morte et la règle fantôme.** Sur le jeu de référence, une règle qui ne s'applique jamais (sa condition n'est jamais
vraie) est « morte » : sa condition lit une information non obtenue ou un seuil hors des valeurs réelles. Une règle qui s'applique mais ne
change jamais la sortie (on la retire, rien ne bouge) est « fantôme ». Les deux sont listées, pas supprimées (règle d'archivage).

**Les contradictions de sources** (Notion contre Mathias, document contre document) ne sont pas des conflits de règles : elles deviennent
DEUX VALEURS d'un même paramètre et une question « À trancher » (consigne commune). Exemples : « une seule photo par rafale » (R-31) contre
« pas de limite » (13/11) ; « la fin aux gens » (S-055) contre l'au revoir (J-06).

### 7.4 La boucle « composer, vérifier, réparer »

```
 composer (moteurs 2 à 6)  ──►  vérifier (moteur 7, indépendant)  ──►  fautes ?
        ▲                                                         │ non → verdict
        │                                                         │ oui
        └──── réparer localement (le plus petit moteur qui peut) ◄┘
```

**Réparer, c'est relancer le moteur le plus en aval qui possède la décision fautive, sur le plus petit morceau, avec une contrainte en plus.**

| Faute | Moteur réparateur, d'abord | Contrainte ajoutée | Puis, si ça ne suffit pas |
|---|---|---|---|
| texte faux, enseigne en titre, date qui ment | Habillage | le mot fautif est interdit | texte vide (P2 : un fait ou rien) |
| personne coupée, visage au pli, zone importante entamée | Mise en page, la double | gabarits qui coupent exclus | Assortiment de la double : une photo de moins |
| personne trop petite | Mise en page | cadre minimal imposé | Assortiment : la double perd une photo, qui va sur la double voisine du même jour |
| page presque vide | Mise en page (texte de fait ou fond) | | Assortiment : la double reçoit une photo de la journée |
| journée-lieu coupée | Assortiment du chapitre | la journée est indivisible | Récit : la coupe de chapitre se déplace |
| deux photos presque identiques sur une double | Assortiment | paire interdite | Tri : l'une passe en réserve « presque identique » |
| couverture qui montre une partie du groupe | Habillage (autre proposition) | | Récit : autres photos réservées |

**La demande amont.** Quand un moteur ne peut pas tenir P0 à P2 avec ce qu'il a reçu, il écrit une demande : « Mise en page, double 8 :
cinq photos dont une verticale de personne qui n'entre dans aucun gabarit à cinq places sans être coupée ; demande : quatre photos au plus ».
L'orchestrateur relance l'Assortiment du chapitre avec cette contrainte. L'Assortiment décide quelle photo bouge ; la Mise en page ne
choisit jamais.

**Bornes de la boucle (RD, à régler)** : au plus 3 essais par faute ; au plus 5 tours complets ; une réparation ne peut pas créer de faute
d'un niveau plus haut que celle qu'elle corrige (sinon elle est annulée) ; une réparation qui en recrée une autre de même niveau compte
comme un essai perdu.

**Plusieurs candidats puis classement** (04-METHODES, principe 6). Là où l'IA ou un score hésite (chapitrage, découpage d'un chapitre,
couverture), le moteur produit plusieurs candidats (RD : 3) et la Revérification les classe niveau par niveau. Coût : quelques fractions de
seconde, aucune IA.

**Déterminisme.** Mêmes photos, mêmes lectures, mêmes réponses, mêmes réglages, même graine : même magazine (NO-396, MAC-1873). Une variante
demandée change la graine et le dit.

### 7.5 La règle d'arrêt

Le parcours s'arrête au premier des cas suivants :

1. **Prête** : aucune faute P0, P1 ou P2 ; les fautes P3 à P7 restantes sont des signaux listés (pas bloquants). La proposition est montrée comme composée.
2. **À reprendre** : il reste une faute P0, P1 ou P2 après les bornes de la boucle. La proposition est montrée À L'ATELIER, avec la ou les
   doubles en faute en rouge, la phrase claire de la cause et le geste proposé (M-14). Elle ne peut pas partir au client ni à l'impression.
3. **Plus de progrès** : deux tours de suite sans amélioration au niveau le plus haut fautif. On s'arrête, état « à reprendre ».
4. **Impasse de matière** : pas de quoi composer (moins de photos posables que le plus petit magazine). Phrase comptée et geste, comme aujourd'hui (M-14).

Ce qui change : aujourd'hui une faute dure s'affiche et la proposition sort comme si de rien n'était (C39).

**Le bon à tirer reste humain, toujours** (04-METHODES §6 étape 10 ; consigne : « l'atelier corrige tout d'un clic »). Même une proposition
« prête » attend la signature.

---

## 8. Ce qui change par rapport au moteur actuel (code v2.1 du 18/11)

| # | Aujourd'hui (preuve) | Désormais | Règle |
|---|---|---|---|
| 1 | Le GPS est lu, puis ne sert à rien ; l'étape des lieux ne tourne que sans GPS (C1, C14) | la Lecture géocode toujours ; journées-lieux, chapitres et titres le lisent | J-01, J-02, M-05 |
| 2 | Les chapitres de l'IA voyage, tracés sans jours ni villes, deviennent des murs (C11, C21) | l'IA propose, le Récit borne sur les journées-lieux ; l'IA est un candidat parmi d'autres | J-01 |
| 3 | Le thème décide le profil : « circuit » devient « long voyage en famille » (C15, C16) | thème et profil sont deux axes ; le profil se lit sur « qui » et la durée | 12-QUESTIONS-PARAMETRES partie 3 |
| 4 | Les passants comptent comme le groupe : 7 pour un couple (C6, C17) | « nos personnes » comptées à part, croisées avec la question « combien étiez-vous » | INFO du groupe, Q-C01 |
| 5 | Un faux visage fait la zone importante ; une personne sans visage trouvé se rogne en haut et en bas (C3, C35, C38) | visage confirmé ou pas ; protection haut et bas quand l'IA voit des gens | J-11, J-12, M-31 |
| 6 | Une enseigne devient un « lieu sûr » puis un titre (C8, C26) | sorte du nom lu toujours établie ; une enseigne n'est jamais un titre | J-03 |
| 7 | L'ouverture va chercher la plus forte photo du chapitre, seule sur une double (C28) | ouverture dans le premier jour, sur une page | J-07, J-08 |
| 8 | Couper une journée ne coûte rien (C29) | la journée-lieu est l'unité de P3 | J-01 |
| 9 | Aucun regroupement de sujet ; le 5e plat en réserve (C19, C30) | grande entorse de série de sujet ; une faible qui complète une série reste | J-04, J-05, J-09 |
| 10 | La dernière page est choisie en premier, « aux gens », jamais validée (C25) | paramètre `fin_type` par profil, à trancher | J-06, S-055 |
| 11 | Deux fautes dures vues, la proposition sort quand même (C39) | réparation bornée, puis état « à reprendre » | 7.5 |
| 12 | La proposition vit dans le navigateur ; impossible d'enquêter sur ce qu'il a vu (enquête §5) | proposition, lectures, versions et journal gardés sur le serveur | M-30 |
| 13 | L'histoire du client n'arrive pas à l'IA voyage (C10) | occasion et histoire transmises | 3.1 |
| 14 | Le regard fin coupe des candidates pleine page par un plafond (C7) | les candidates pleine page passent d'abord dans le budget | 3.1 |
| 15 | Le classement de couverture de l'IA est presque ignoré ; une rue d'une ville passe parce que la foule « fait tout le groupe » (C9, C31) | le vrai groupe ; le classement IA est un signal de P7 sous M-03 et M-04 | M-04 |
| 16 | Les candidats écartés (découpages, gabarits) ne sont pas gardés : on ne peut pas expliquer un choix (RECIT, limites) | journal des candidats et de leurs coûts | 5 |
| 17 | Aucun arrêt défini ; une page Analyse en cours (M-34) | quatre arrêts, un geste, une relance limitée à l'aval | 4 |

---

## 9. À trancher par Mathias

| Question (réponse d'un mot) | Ma recommandation | Ce que ça change |
|---|---|---|
| Une correction de l'atelier peut-elle forcer une faute de fabrication (photo à 140 ppp en pleine page) ? (oui / non) | **Oui, avec ta signature au bon à tirer**, sauf pages multiples de 4 et marges de sécurité (physiques) | Sinon l'outil te refuse un geste ; avec, il te prévient et attend ta signature |
| La dernière page : l'au revoir (paysage large et calme) ou les gens ? (au revoir / gens / profil) | **Profil** : au revoir quand le lot a une image forte des derniers jours, sinon les gens ; réglé par profil au banc | Contredit S-055 (jamais validée) ; ton magazine du réf. couple finit sur l'au revoir |
| Une photo de couverture peut-elle aussi être à l'intérieur ? (oui / non) | **Non par défaut** (M-10 validée), réglable par profil | Ton magazine du réf. couple reprend des photos de couverture à l'intérieur : M-10 et ta pratique se contredisent |
| Les arrêts : t'arrêter à chacun au début, puis seulement quand la machine doute ? (oui / non) | **Oui** | Le temps passé par magazine baisse à mesure que les étapes passent en automatique |
| Un chapitre de l'IA voyage peut-il couper une journée quand tu le décides à l'arrêt 1 ? (oui / non) | **Oui** : ton geste prime, la règle J-01 ne s'impose qu'à la machine | Ta correction reste possible, la machine ne la défait pas |

## Ce qui me manque

- Les règles des quatre autres auteurs : je n'ai pas pu vérifier leurs portées ni leurs replis ; le test a (7.3) tournera à la fusion.
- Le seuil d'impression et la largeur du pli de l'imprimeur (Q-02, Q-14 de Notion) : P1 tourne sur des valeurs provisoires.
- L'état réel en base de la proposition gardée (migration écrite, application non vérifiée par moi).
- Le prix de l'offre de géocodage et le coût isolé de l'appel « voyage ».
- La proposition que Mathias a vue pour le réf. couple (dans son navigateur) : l'enquête est un rejeu.
