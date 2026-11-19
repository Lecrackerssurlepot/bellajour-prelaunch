# Les questions, les profils, les thèmes

> **Fichier généré, ne pas éditer.** Source : `src/lib/mise-en-page/regles/socle/` ; régénérer par
> `npx tsx --tsconfig tsconfig.json scripts/socle-doc.ts`. Le harnais refuse ce fichier s'il n'est pas à jour.

Version du socle : `s27875359`. 27 questions.

Par état : posee_site 3 · atelier 16 · retiree 1 · reserve 1 · tranchee 6.

Une réponse règle des PARAMÈTRES, jamais une règle directement. `posee_site` : le dossier la porte déjà (on la lit, M-54) ;
`atelier` : posée à l'atelier, ou écrite sans écran client encore ; `tranchee` : question de réglage tranchée par Mathias ; `reserve`, `retiree`.

## Les questions

| Id | À qui | Question | Réponses → paramètres | Deviner avec | État | Dans le dossier |
|---|---|---|---|---|---|---|
| Q-C04 | client | « Quel était ce moment ? » (l'occasion) | **texte libre court** : `theme_album` candidat, confiance 0,5 au plus (les données priment) | aucun : c'est sa parole | posee_site (M-54)<br>*Mathias, 19/11 : l'information existe déjà sur le site (particulier) et dans l'édition (collectif) ; aucune question nouvelle* | `src/lib/atelier/questionnaire.ts#"occasion"`, `src/lib/mise-en-page/compositeur/fiche.ts#x.occasion`, `src/lib/collectif/types.ts#evenement: string`, `src/lib/collectif/types.ts#organisation: string` |
| Q-C05 | client | Son histoire | **texte libre** : `ton` « fou rire », « délire » : +0,2 ; « paisible », « doux » : −0,2, `finition` « paisible », « doux » : −0,1, `rythme_contraste` « épique », « aventure » : +0,15 | aucun | posee_site (M-54)<br>*aujourd'hui non transmise à la lecture du voyage (C10)* | `src/lib/atelier/questionnaire.ts#"histoire"`, `src/lib/collectif/types.ts#invitation_texte` |
| Q-C06 | client | « Donnez un titre à votre numéro » | **texte** : `titre` titre de couverture et page 1, le seul texte qu'on n'invente pas | aucun | posee_site (M-54) | `src/lib/atelier/questionnaire.ts#"titre"`, `src/lib/mise-en-page/compositeur/fiche.ts#titreClient`, `src/lib/collectif/types.ts#dates_texte` |
| Q-C01 | client | « Combien étiez-vous ? » | **1** : `groupe_taille` 1, `place_des_personnes` −0,2, `fin_type` jamais « gens »<br>**2** : `groupe_taille` 2, `profil` candidat couple (P3), `type_couverture_par_profil` l'une des trois montre le duo (M-47)<br>**3 à 6** : `groupe_taille` n, `profil` P1 ou P6 selon la durée<br>**7 et plus** : `groupe_taille` n, `photos_max_double` +2 (réglage de départ)<br>**ça changeait** : `groupe_taille` vide | nos personnes (INFO-052), confiance = part des photos où la valeur se vérifie | atelier<br>*codée dans la fiche de l'éditeur (`QUESTIONS_CLIENT`) ; l'écran client n'existe pas encore* |  |
| Q-C02 | client | « Les lieux ou les étapes à ne pas oublier ? » | **liste ordonnée** : `chapitres` bornés et nommés par ces étapes (M-05)<br>**3 étapes ou plus** : `theme_album` road_trip (confiance 0,9)<br>**vide** : rien | villes (INFO-082) : part géolocalisée × part géocodée | atelier<br>*posée seulement sous 80 % de photos géolocalisées (réglage de départ)* |  |
| Q-C03 | client | « Vos photos préférées ? » | **3 à 10 photos** : `coup_de_coeur` au moins pleine page si la définition suit (N-49), candidate couverture, jamais en réserve<br>**aucune** : rien | aucun : ni la machine ni l'atelier ne savent ce qui touche le client | atelier<br>*toujours offerte, jamais exigée* |  |
| Q-C07 | client | Le style | **un panneau parmi 4 (Grand magazine, Galerie, Récit, Carnet)** : `ecole` l'école du panneau, donc les neuf curseurs | l'école la plus proche du lot et du style conseillé par la lecture du voyage | atelier<br>*D-14 « à tester » ; pas encore posé au client* |  |
| Q-C08 | client | La couverture | **un couple 1re et 4e parmi 3** : `couverture` la proposition choisie, `couverture_dans_interieur` non : l'intérieur se recompose (M-40) | le premier du classement sous M-03 et M-04 | atelier<br>*pas encore posé au client* |  |
| Q-C09 | client | « Dans cinq ans, qu'est-ce qui vous touchera le plus ? » | **les gens** : `place_des_personnes` +0,25<br>**les paysages, les lumières** : `place_des_personnes` −0,2 | sans objet | retiree (M-55)<br>*Mathias, 19/11 : « on enlève complet »* |  |
| Q-C10 | client | « Des lieux à ne pas montrer ? » | **lieux décochés** : `lieux_exclus` les photos du lieu sortent de la sélection, le Récit se recompose | les lieux détectés et leur nombre de photos | reserve<br>*pas dans le parcours tant que les quatre choix sont pris* |  |
| Q-A01 | atelier | Thème d'album | **road_trip** : `theme_album` road_trip<br>**ville** : `theme_album` ville<br>**plage** : `theme_album` plage<br>**fete** : `theme_album` fete<br>**evenement** : `theme_album` evenement<br>**annee** : `theme_album` annee<br>**autre** : `theme_album` autre | villes, durée, type lu, occasion (QUESTIONS-PARAMETRES §3.3) | atelier<br>*demandée si deux candidats sont à moins de 0,2 l'un de l'autre ou sous 0,6 de confiance* |  |
| Q-A02 | atelier | Profil | **P1** : `profil` P1<br>**P2** : `profil` P2<br>**P3** : `profil` P3<br>**P4** : `profil` P4<br>**P5** : `profil` P5<br>**P6** : `profil` P6 | « qui » et la forme du temps (§3.2) | atelier<br>*tout le bloc de la table des profils suit* |  |
| Q-A03 | atelier | Ambiance | **sobre** : `sobriete` 0,2, `densite_visee` −0,25, `recadrage_franchise` prudent, `noir_et_blanc` proposé seulement<br>**équilibrée** : `sobriete` 0,5<br>**stylisée** : `sobriete` 0,8, `densite_visee` +0,25, `entorses_max` plus (M-50) | le profil (famille = sobre, M-06) ; la part de photos déjà retouchées | atelier |  |
| Q-A04 | atelier | Le titre (si le client n'en a pas donné) | **texte** : `titre` le texte saisi | lieu ou pays et dates | atelier |  |
| Q-A05 | atelier | Le moment le plus important | **une photo ou un jour** : `sommet_position` imposé à ce moment | la photo la plus forte entre les bornes du profil | atelier<br>*aucune règle du Récit ne la lit encore (INFO-129)* |  |
| Q-A06 | atelier | Lieux à ne pas montrer | **liste** : `lieux_exclus` sortie des photos du lieu | un lieu de domicile ou de passage | atelier |  |
| Q-A07 | atelier | Où (pays, région) corrigé | **texte** : `titre` passe avant le pays lu | pays et région lus | atelier |  |
| Q-A08 | atelier | La densité quand tout ne tient pas | **serrée** : `densite_mode` serrée<br>**avant** : `densite_mode` avant<br>**plus de pages** : `densite_mode` plus de pages | sans objet | tranchee (M-42)<br>*« On propose plus de pages ! » ; l'ordre avec la densité serrée reste à préciser* |  |
| Q-A09 | atelier | Les lieux : aux chapitres, nouveaux, partout ? | **chapitres** : `lieux` chapitres<br>**nouveaux** : `lieux` nouveaux<br>**partout** : `lieux` partout<br>**interessants** : `lieux` interessants | sans objet | tranchee (M-38)<br>*« dès que cela peut être intéressant »* |  |
| Q-A10 | atelier | La dernière page | **gens** : `fin_type` gens<br>**au_revoir** : `fin_type` au_revoir<br>**auto** : `fin_type` auto | sans objet | tranchee (M-35)<br>*« Auto »* |  |
| Q-A11 | atelier | Les sujets répétés (plats, animaux…) | **rassembler** : `serie_sujet_regroupement` oui, `entorses_max` au moins 1, `poids_temps_contre_sujet` +0,2<br>**laisser dans le temps** : `serie_sujet_regroupement` non | sans objet | tranchee (M-36)<br>*rassembler, si les moments sont peu espacés ; un sujet très présent reste dans l'histoire (M-37)* |  |
| Q-A12 | atelier | Le recadrage | **prudent** : `recadrage_franchise` prudent<br>**normal** : `recadrage_franchise` normal<br>**franc** : `recadrage_franchise` franc | sans objet | tranchee (M-45)<br>*normal ; prudent si la zone importante est grande* |  |
| Q-A13 | atelier | Une photo de couverture aussi à l'intérieur ? | **oui** : `couverture_dans_interieur` oui<br>**non** : `couverture_dans_interieur` non | sans objet | tranchee (M-40)<br>*non* |  |
| Q-D01 | doute | « Où va cette photo sans date ? » | **un chapitre, une voisine** : `placement_sans_date` fixé | placement par ressemblance (confiance sous 0,6 : posée) | atelier |  |
| Q-D02 | doute | « Cette photo est-elle importante ? » | **oui** : `statut_photo` gardée en petit, jamais en réserve<br>**non** : `statut_photo` réserve | seule trace d'un moment ET technique faible | atelier |  |
| Q-D03 | doute | « Ces photos viennent-elles du même moment ? » | **oui** : `recalage_horloge` appliqué<br>**non** : `recalage_horloge` non | deux appareils aux heures décalées | atelier |  |
| Q-D04 | doute | « Ce nom est-il un lieu ou une enseigne ? » | **lieu** : `sorte_du_nom` lieu<br>**enseigne** : `sorte_du_nom` enseigne<br>**document** : `sorte_du_nom` document | nom lu sans GPS et sorte incertaine | atelier<br>*un lieu peut devenir titre ; une enseigne jamais* |  |

## Les profils (ce que chacun règle)

| Paramètre | P1 long voyage | P2 vacances festives | P3 couple | P4 événement | P5 année de vie | P6 séjour court |
|---|---|---|---|---|---|---|
| `densite_visee` | 2,5 à 3,2 | 3 à 5 | 2 à 3 | 3 à 4 | 2 à 3 | 2,5 à 3 |
| `densite_plafond` | 4,5 | 6 | 3,5 | 5 | 4 | 4 |
| `photos_max_double` | 9 / 12 | 12 / 16 | 9 / 9 | 9 / 12 | 9 / 9 | 9 / 9 |
| `part_pleines_pages` | 25 à 35 % | 10 à 15 % | 40 à 55 % | 20 à 30 % | 35 à 50 % | 30 à 40 % |
| `sobriete` | 0,5 ; 0,2 si famille (M-06) | 0,8 | 0,5 (plus forte sur les portraits) | 0,5 | 0,35 | 0,5 |
| `tolerance_photos_faibles` | basse | haute | basse | moyenne | moyenne | basse |
| `exigence_tri` | narrateur | instantané | narrateur | narrateur | collectionneur | narrateur |
| `place_des_personnes` | 0,4 | 0,8 | 0,7 | 0,6 | 0,6 | 0,4 |
| `sommet_position` | 60 à 70 % | la meilleure soirée | 45 à 80 % | l'instant fort | aucun sommet voulu | 45 à 80 % |
| `fin_type` | gens, groupe complet | le groupe entier | « nous deux » | le groupe réuni | « tous ensemble » | les gens |
| `couverture` | lieu avec une personne | groupe de nuit | le duo | l'instant fort | une photo « tous » | lieu emblématique |
| `ouverture` | lieu monumental avec une personne à l'échelle | nuit ou action | un duo | l'instant d'avant | le mois en grand | le lieu |
| `ton` | 0,2 : lieu en grand, sobre | 0,8 : court, brut, drôle | 0,4 : tendre, mots vrais | 0,4 : horloge, chiffre | 0,3 : les mois, ses mots | 0,3 : un mot de lieu |
| `lieux_affiches` | nouveaux | chapitres | chapitres (le couple est le sujet) | chapitres | chapitres | nouveaux |
| `fonds` | blanc ; aplat sourd aux ouvertures ; noir jamais sauf nuit | noir teinté la nuit ; blanc ou couleur franche le jour | blanc cassé ; aplat chaud ; noir le soir | blanc ou couleur de l'événement | blanc ; un aplat par mois si une photo le porte | blanc ; aplat des murs |
| `noir_et_blanc` | proposé | une double sur 3 | portraits, proposé | proposé | proposé | proposé |
| `entorses_max` | 2 ; jamais par couleur | 2 ; par couleur permise | 2 | 2 | 2 ; par couleur permise | 2 |
| `heure_imprimée` | dans les séries | dans les séries | non | signature du profil | non | non |
| `planche-contact` | une fois si 3,2 photos par double ou plus | jusqu'à 12 | non | une ou deux séries | non | non |
| `respiration_toutes_les` | 5 à 7 | 5 à 7 | 5 à 7 | 5 à 7 | 5 à 7 | 5 à 7 |
| `rythme_contraste` | 0,6 | 0,7 | 0,4 | 0,6 | 0,4 | 0,5 |

Reconnaître le profil :

- **P1 long voyage** (`long_voyage_famille`) : ordre 6 : durée ≥ 10 jours
- **P2 vacances festives** (`fete_entre_jeunes`) : ordre 3 : part de nuit ≥ 25 % ET 3 personnes ou plus sur ≥ 40 % des photos (RD)
- **P3 couple** (`couple`) : ordre 4 : `groupe_taille` = 2 (réponse, sinon INFO-052 avec confiance ≥ 0,7)
- **P4 événement** (`evenement`) : ordre 2 : durée de 1 à 3 jours ET 80 photos ou plus dans un temps court
- **P5 année de vie** (`annee_de_vie`) : ordre 5 : durée > 90 jours ET moins de 30 jours photographiés
- **P6 séjour court** (`sejour_court`) : ordre 7 : sinon (3 à 10 jours)

## Les thèmes d'album

| Thème | Si… | Découpe | Nom du chapitre | Source |
|---|---|---|---|---|
| `road_trip` | 3 villes ou plus visitées dans un ordre (GPS ou Q-C02), ou type lu « circuit, road trip » | une étape (lieu nouveau) | le lieu principal de l'étape | M-05 VALIDÉE |
| `ville` | une ville, 3 à 10 jours | un jour ou un quartier | un mot de lieu, sinon le jour | définition v2 §5.1 |
| `plage` | un seul endroit hors ville (plage, montagne) | un jour ou un groupe de jours | le jour, ou un mot vrai | idem |
| `evenement` | durée 1 à 3 jours, beaucoup de photos | les heures | l'heure, le chiffre | idem |
| `fete` | énergie de fête, plusieurs soirées | une soirée ou une journée | « Jour 3 » | idem |
| `annee` | plus de 90 jours | un mois (une saison si moins de 10 photos par mois) | le mois | idem |
| `autre` | sinon | les plus grands silences, un chapitre pour trois jours photographiés | thème lu par l'IA, en repli | N-32 |

## Les modificateurs

- **gros_lot** (au moins `gros_lot_seuil` photos) : exigence du tri vers exclusif d'un cran ; planches de lecture plus denses
- **fete** (des moments de fête dans un autre profil) : noir et blanc proposé une double sur 3 ; fonds noirs teintés la nuit
- **sans_date** (15 à 40 % de photos sans date) : placement par ressemblance ; les doutes « où va cette photo » d'abord

## Les neuf curseurs de goût

| Curseur | de (0) | à (1) | Paramètres qu'il place | Règles (Notion) |
|---|---|---|---|---|
| Densité | aéré, une photo seule | généreux, beaucoup de souvenirs | densite_visee (dans la fourchette), part_pleines_pages (en sens inverse), respiration_toutes_les | R-42, R-57 |
| Rythme | régulier, apaisé | contrasté, chocs d'échelle | rythme_contraste | R-50, R-54 |
| Couleur | naturelle, telle quelle | travaillée, un look, noir et blanc | couleur_travail, noir_et_blanc, fonds_couleur_max | R-05, R-56, R-71 |
| Typographie | discrète, classique | audacieuse, titres géants | typo_audace | R-62 à R-64 |
| Récit | chronologique, journal | thématique, par émotion ou lieu | poids_temps_contre_sujet, entorses_max (0 à 3) | R-40 |
| Sujet | les gens | les lieux et l'ambiance | place_des_personnes (en sens inverse) | R-10, R-41, R-44 |
| Texte | aucun | beaucoup | quantite_texte, lieux_affiches (chapitres → nouveaux → partout) | R-60, R-90 |
| Ton | sobre, élégant | ludique, clins d'œil | ton | R-34, R-76 |
| Finition | soigné, parfait | brut, spontané | finition, tolerance_photos_faibles, sobriete (en partie) | R-14, R-70 à R-76 |

## Les huit écoles

| École (atelier) | Nom client | Densité | Rythme | Couleur | Typo | Récit | Sujet | Texte | Ton | Finition |
|---|---|---|---|---|---|---|---|---|---|---|
| Brodovitch, Baron | Grand magazine | 0,2 | 0,8 | 0,4 | 0,9 | 0,3 | 0,5 | 0,3 | 0,4 | 0,2 |
| École suisse | Épuré | 0,4 | 0,4 | 0,2 | 0,5 | 0,2 | 0,5 | 0,3 | 0,3 | 0,1 |
| Fleckhaus | Contraste | 0,2 | 0,9 | 0,7 | 0,6 | 0,3 | 0,5 | 0,2 | 0,4 | 0,3 |
| Kinfolk, Hara | Calme | 0,1 | 0,2 | 0,3 | 0,2 | 0,2 | 0,6 | 0,1 | 0,2 | 0,2 |
| Storch, Lubalin | Récit | 0,5 | 0,5 | 0,3 | 0,7 | 0,5 | 0,4 | 0,8 | 0,5 | 0,3 |
| Brody, The Face | Audacieux | 0,6 | 0,9 | 0,6 | 1 | 0,5 | 0,5 | 0,4 | 0,7 | 0,5 |
| i-D, Grapus, Carson | Brut | 0,8 | 0,7 | 0,7 | 0,8 | 0,6 | 0,3 | 0,4 | 0,9 | 0,9 |
| Tschichold | Livre | 0,4 | 0,2 | 0,2 | 0,3 | 0,1 | 0,5 | 0,3 | 0,2 | 0,1 |
