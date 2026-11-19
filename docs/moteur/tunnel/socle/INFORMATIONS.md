> **Copie nettoyée (M-01) de `11-INFORMATIONS.md` du socle du 19/11**, écrite par `scripts/socle-import.ts` : ne pas éditer à la main.
> Les magazines de référence y sont nommés par leur profil (« réf. couple », « réf. famille »). Les règles vivent en données
> (`src/lib/mise-en-page/regles/socle/`) ; les réponses de Mathias du 19/11 sont dans `A-TRANCHER.md` (M-35 à M-57).
>
> **À jour des réponses du 19/11 :**
> - Les états ONU et RET deviennent « obtenue, gardée pour l'atelier » (M-56) ; la liste (a) ne retire plus rien.
> - Deux informations nées de M-37 : INFO-150 (la part de chaque sujet dans le lot) et INFO-151 (le profil que disent les sujets).
> - Chaque information et chaque valeur a un libellé d'atelier (M-57) : `INFORMATIONS-TABLE.md` (généré).

# 11 · Toutes les informations : d'où elles viennent, ce qu'elles valent, qui les lit

Auteur : l'architecte du socle, 19/11/2026.
Objectif de Mathias : « toutes les infos bien utilisées à bon escient et bien optimisées ». Une information n'existe que si une décision
la lit (définition v2, point 2) ; une décision qui manque d'une information le dit.

**Ce que ce fichier couvre.** 149 informations (INFO-001 à INFO-149) : par photo, par ensemble, par projet, par réponse. Pour chacune : sa
définition et ses valeurs, sa source, son coût, sa fiabilité connue (avec la mesure quand elle existe), les moteurs qui la lisent et pour
quelle décision, son état aujourd'hui. Puis quatre listes : (a) obtenues et inutiles, (b) décisions prises sans l'information qu'il faudrait,
(c) trop chères pour ce qu'elles apportent, (d) celles dont l'erreur fait le plus de dégâts, avec le garde-fou de chacune.

**Sources.** `definition/TAGS.csv` et `RAPPORT.md` ; `docs/moteur/tunnel/INVENTAIRE-PHOTO.md` (mesures du banc sur le long voyage en famille,
164 photos) ; l'enquête sur la réf. couple (hors dépôt) (rejeu sur 40 photos, C1 à C39) ; `regles/PROFILS.md` ; le code (`compositeur/types.ts`, `fiche.ts`,
`reglagesCompositeur.ts`, `editeur/mesures.ts`, `editeur/lireLesPhotos.ts`) ; Notion phase A (NO-001 à NO-053) et MAC phase A.

**Légendes.**
- Niveau : **Ph** photo, **En** ensemble de photos, **Pr** projet, **Ré** réponse ou correction.
- Source : **FICH** fichier (EXIF, en-tête) ; **PIX** pixels sans IA ; **IA-P** IA en planche de 16 vignettes ; **IA-R** IA regard fin (une photo
  à la fois) ; **IA-V** IA voyage (un appel texte par projet) ; **GEO** GPS et géocodage ; **Q-CLI** question au client ; **Q-AT** question à
  l'atelier ; **COR** correction de l'atelier ; **DED** déduite des autres (gratuite).
- Coût : 0 = local. IA-P ≈ 0,0014 $ la photo, IA-R ≈ 0,0017 $ la photo (définition v2 §2 et §15) ; un champ de plus dans une lecture
  déjà payée coûte quelques jetons de sortie ; une passe séparée repaye l'image.
- Moteurs : **LEC** Lecture, **TRI**, **REC** Récit, **ASS** Assortiment, **MEP** Mise en page, **HAB** Habillage, **VER** Revérification.
- État : **OU** obtenue et utilisée ; **ONU** obtenue et PAS utilisée ; **BANC** calculée au banc seulement, absente de l'éditeur et du
  compositeur ; **PO** pas obtenue (à créer) ; **RET** retirée. « (v2) » = utilisée par le compositeur v2 du 18/11.
- Les fiabilités citées « réf. famille » et « réf. couple » viennent des deux magazines de référence (164 et 40 photos) ; ce sont des exemples
  mesurés, pas des taux généraux.

---

## 1. Le grand tableau

### A. Le fichier (photo)

| id | nom | niv. | définition · valeurs | source | coût | fiabilité connue | lue par (moteur : décision) | état |
|---|---|---|---|---|---|---|---|---|
| INFO-001 | date_prise | Ph | heure locale de prise · date ISO ou vide | FICH | 0 | 141 sur 164 (86 %) réf. famille ; 40/40 réf. couple | REC : chronologie, journées, moments ; HAB : dates des titres | OU |
| INFO-002 | fuseau | Ph | décalage horaire de l'appareil · +hh:mm | FICH | 0 | présent avec la date (141 sur 164) | LEC : région du monde sans GPS ; REC : recaler deux téléphones (S-086) | BANC |
| INFO-003 | date_estimee | Ph | date d'ARRIVÉE en galerie, interpolée par le numéro de fichier · date ou vide, statut | DED | 0 | 1 inversion sur 141 (une marque de téléphone) ; c'est l'arrivée, pas la prise | REC : placer une photo sans date (M-18) | OU (v2, une marque) |
| INFO-004 | numero_galerie | Ph | numéro du fichier · entier | FICH | 0 | croît avec l'arrivée pour une marque | REC : placement par ressemblance | OU (v2) |
| INFO-005 | appareil | Ph | marque, modèle · texte ou vide | FICH | 0 | 141 sur 164 ; absent = messagerie ou capture | TRI : indice de capture (jamais seul, NO-052) ; REC : deux déposants | OU partiel |
| INFO-006 | objectif | Ph | principal, ultra grand-angle, télé, zoom numérique, selfie | FICH | 0 | règle écrite pour un seul modèle ; 23 sur 164 inconnus | ASS : un ultra grand-angle ouvre, un télé est un détail ; MEP : selfie jamais en double | BANC |
| INFO-007 | selfie | Ph | caméra avant · oui / non | FICH | 0 | 0 cas sur le test : non prouvé | MEP : un selfie déformé jamais en grand (S-014) | BANC |
| INFO-008 | iso_vitesse | Ph | ISO, ouverture, vitesse | FICH | 0 | présents 141 sur 164 | TRI : risque de bougé (vitesse lente, RD 1/15 s) | BANC |
| INFO-009 | flash | Ph | oui / non | FICH | 0 | 0 sur 141 | HAB : soirée, fond sombre | BANC |
| INFO-010 | lumiere_scene | Ph | luminosité mesurée par l'appareil avant traitement · nuit, intérieur, plein jour | FICH | 0 | accord 91 % avec « intérieur » de l'IA | TRI, HAB : nuit, intérieur, sans regarder un pixel | BANC |
| INFO-011 | gps | Ph | coordonnées · lat, lon ou vide | FICH | 0 | 0/164 réf. famille ; 40/40 réf. couple | LEC : géocodage ; REC : journées-lieux, chapitres ; HAB : titres | **ONU** (lu, jamais transmis au compositeur, C1) |
| INFO-012 | dimensions_orientation | Ph | pixels, rotation | FICH | 0 | 164 sur 164 | MEP : gabarits, définition | OU |
| INFO-013 | forme | Ph | très large (≥ 1,9), paysage, carré, portrait, très haute (≤ 0,55) | DED | 0 | exacte | ASS : type de double ; MEP : gabarit | OU |
| INFO-014 | taille_possible | Ph | plus grand cadre tenu au seuil d'impression · double, pleine, demi, quart, vignette | DED | 0 | exacte ; le seuil de l'imprimeur est inconnu (Q-14) | TRI : borne ; ASS ; MEP ; HAB : couverture | OU |
| INFO-015 | provenance | Ph | appareil principal, autre appareil, messagerie, capture, photographe tiers, scan | DED (FICH + PIX) | 0 | partielle : messagerie et capture devinées, tiers non | TRI : note technique, hors sujet ; MEP : jamais recadrer sur un filigrane (S-021) | PO partiel |
| INFO-016 | rafale_appareil | Ph | identifiant de rafale de l'appareil | FICH | 0 | non mesurée | LEC : rafales certaines (R-30) | PO |
| INFO-017 | live_profondeur_couleur | Ph | photo animée, carte de profondeur, profil de couleur | FICH | 0 | non mesurée | MEP : titre derrière le sujet (R-62) ; HAB : conversion juste | PO (plus tard) |
| INFO-018 | nom_fichier | Ph | texte | FICH | 0 | au réf. couple il contient la ville (C1) | LEC : indice faible, jamais un fait | ONU |
| INFO-019 | logiciel, fraction_de_seconde, zoom | Ph | détails du fichier | FICH | 0 | | aucune décision | RET |

### B. Les pixels, sans IA (photo)

| id | nom | niv. | définition · valeurs | source | coût | fiabilité connue | lue par (moteur : décision) | état |
|---|---|---|---|---|---|---|---|---|
| INFO-020 | nettete_sujet | Ph | netteté dans le visage ou la zone importante | PIX | 0 | les floues sont bien trouvées ; non contrôlée sur les sujets | TRI : note technique, cause « floue sans sujet » | OU |
| INFO-021 | nettete_relative | Ph | rapport à la médiane du lot · nombre, crans | DED | 0 | pénalise nuit et gros plans doux (C2 : le un site connu à 0,3) | TRI : crans du lot | OU (à encadrer) |
| INFO-022 | bouge | Ph | flou de mouvement probable · oui / non | PIX + FICH | 0 | 10 cas, à mesurer | TRI : un bougé qui porte un mouvement passe (R-70) | BANC |
| INFO-023 | exposition | Ph | normale, sombre, brûlée, parts écrêtées | PIX | 0 | 0 cas sur un lot déjà trié | TRI ; MEP : pas en grand | OU |
| INFO-024 | bruit_nuit | Ph | grain d'une photo de nuit · faible / fort | PIX | 0 | non mesuré | MEP : petite ; HAB : noir et blanc | PO |
| INFO-025 | contraste | Ph | écart-type et plage du gris | PIX | 0 | à mesurer | HAB : filtres ; TRI : note image | BANC |
| INFO-026 | horizon | Ph | inclinaison, hauteur | PIX | 0 | **non fiable** (aucune photo retenue « à redresser ») | MEP : redresser ; ASS : aligner deux horizons | PO (à refaire) |
| INFO-027 | empreinte | Ph | image réduite à 64 bits | PIX | 0 | doublons fiables ; deux voisines à 22 à 37 bits sont différentes | TRI : doublon, presque identique ; ASS : jamais deux pareilles sur une double | OU |
| INFO-028 | visages_boites | Ph | boîtes des visages (détecteur dans le navigateur, en tuiles) | PIX | 0 ; ~10 s pour 164 | sans tuiles 9/164, en tuiles 36 sur 164 (réf. famille) ; réf. couple : 4 faux (lampadaire, bol, statue, poupée), 4 ratés | MEP : pli, coupe, zone importante ; TRI : gens | OU |
| INFO-029 | visage_confirme | Ph | ce visage est-il une personne que l'IA voit · oui / non / incertain | DED (INFO-028 + INFO-051 + INFO-046) | 0 | n'existe pas | MEP : zone importante (J-11) | **PO (nouvelle)** |
| INFO-030 | taille_visage | Ph | part du plus grand visage | DED | 0 | dépend du détecteur | TRI : gens ; ASS : plan ; LEC : demander l'expression seulement si assez grand | OU |
| INFO-031 | tete_tournee | Ph | gauche, droite, face (points du détecteur) | PIX | 0 | 23 face, 7 gauche, 6 droite ; à mesurer | MEP : le regard entre dans la double (R-52) | BANC |
| INFO-032 | chaleur | Ph | carte de saillance 16 × 16 | PIX | 0 | non contrôlée à l'œil | MEP : recadrage par ce qu'on coupe (M-29) | OU |
| INFO-033 | zone_importante | Ph | visages, corps, air et chaleur · boîte | DED | 0 | réduite au visage sur les portraits ; fausse si faux visage (C38) | MEP : recadrage, pli ; HAB : texte sur photo | OU (à corriger) |
| INFO-034 | zone_calme | Ph | bande calme pour un titre · haut, bas, gauche, droite, aucune | PIX | 0 | 50 sur 164 | HAB : titre sur photo, page 1, ouverture | OU |
| INFO-035 | position_sujet | Ph | gauche, centre, droite | PIX | 0 | à mesurer | MEP : page gauche ou droite | BANC |
| INFO-036 | palette | Ph | 5 couleurs dominantes | PIX | 0 | | ASS : écho de couleur ; HAB : fonds, nuancier | OU |
| INFO-037 | temperature | Ph | chaude, neutre, froide | PIX | 0 | 47 / 55 / 62 sur 164 ; à mesurer | ASS : paires ; HAB : noir et blanc | BANC |
| INFO-038 | saturation_noir_blanc | Ph | vivacité ; noir et blanc oui / non | PIX | 0 | | HAB : filtres, série noir et blanc | BANC |
| INFO-039 | aplats | Ph | part des 3 couleurs dominantes | PIX | 0 | | TRI : capture d'écran | OU |
| INFO-040 | ciel_verdure | Ph | parts de ciel et de vert | PIX | 0 | à mesurer | LEC : indice d'extérieur | BANC |
| INFO-041 | interieur_local | Ph | dedans / dehors | DED | 0 | 91 % d'accord avec l'IA | ASS : alternance | BANC |
| INFO-042 | lumiere_moment_local | Ph | jour, dorée, nuit, intérieur, flash | DED | 0 | 84 % d'accord avec l'IA | HAB : fond sombre ; ASS : jour et nuit | BANC |
| INFO-043 | plan_local | Ph | large, moyen, serré | DED | 0 | 55 % d'accord : l'IA est meilleure | aucune (doublon d'une meilleure source) | RET |
| INFO-044 | texte_lignes | Ph | lignes de texte lues dans l'image | PIX | 0 | jamais posée : le navigateur ne lit pas le texte | TRI : capture | PO |

### C. L'IA en planche (photo)

| id | nom | niv. | définition · valeurs | source | coût | fiabilité connue | lue par (moteur : décision) | état |
|---|---|---|---|---|---|---|---|---|
| INFO-045 | role | Ph | héros, satellite, détail, vue d'ensemble, pleine, double | IA-P | compris | stabilité mesurée, pas l'exactitude ; réf. couple : le un site connu « satellite » | ASS : héros ; TRI : poids | OU |
| INFO-046 | sujet | Ph | personnes, paysage, lieu, plat, objet, animal, document, autre | IA-P | compris | plat 5 sur 5 juste (réf. couple) ; un cuisinier lu « lieu » | ASS : paires, séries de sujet ; MEP : taille | OU |
| INFO-047 | plan | Ph | large, moyen, serré | IA-P | compris | juste à l'œil sur une planche | ASS : large et détail | OU |
| INFO-048 | interet | Ph | 0 à 1 | IA-P | compris | la note unique lui colle (corrélation 0,93) ; médiane par planche 0,56 à 0,77 | TRI : note histoire (signal faible) | OU (trop) |
| INFO-049 | candidate_pleine | Ph | oui / non | IA-P | compris | non mesurée | LEC : envoi au regard fin ; TRI : taille méritée | OU |
| INFO-050 | personnes_vues | Ph | 0, 1, 2, groupe | IA-P | compris | « groupe » écrasé à 3 (famille de 4 vue comme 3) | remplacée par INFO-051 | RET |
| INFO-051 | personnes_nombre | Ph | 0 à 6, 7 et plus | IA-P | compris | compte les passants : 5 photos sur 40 à « 7 » au réf. couple (foules) | TRI : note gens ; PROJET : groupe | OU (**faux**) |
| INFO-052 | nos_personnes | Ph | personnes qui sont le sujet (posent, premier plan, regardent l'objectif) · 0 à 6, 7 et plus | IA-P | quelques jetons | n'existe pas | TRI : gens ; PROJET : groupe ; HAB : couverture (M-04) | **PO (nouvelle)** |
| INFO-053 | moment_journee | Ph | matin, jour, dorée, nuit, intérieur | IA-P | compris | 84 % d'accord avec le local | ASS ; HAB | OU |
| INFO-054 | ambiance | Ph | calme, vivant, festif, intime, grandiose | IA-P | compris | à mesurer | LEC : profil ; HAB | OU |
| INFO-055 | texte_lisible | Ph | oui / non | IA-P | compris | 22 sur 161 | LEC : envoi au regard fin | OU |
| INFO-056 | a_ecarter | Ph | l'avis de l'IA | IA-P | compris | lecture douteuse quand plus de la moitié (M-13) | TRI : réserve « à confirmer » seulement | OU |
| INFO-057 | force_image | Ph | la photo tient-elle seule, en grand · 0 à 1 | IA-P | compris | non mesurée ; à confronter aux coups de cœur | TRI : note image | OU (v2) |
| INFO-058 | pose_spontane | Ph | posé, spontané, sans personne | IA-P | compris | non mesurée | TRI : gens ; REC : jalons | OU (v2) |
| INFO-059 | geste | Ph | une action lisible · oui / non | IA-P | compris | non mesurée | ASS : séquence ; TRI : histoire | OU (v2) |
| INFO-060 | insolite | Ph | le détail inattendu qui touche · oui / non | IA-P | compris | non mesurée | ASS : respiration, punctum (R-44) | **ONU** (affiché à l'Analyse, lu par aucune décision) |
| INFO-061 | sujet_special | Ph | animal, document | IA-P | compris | « document » faux sur des tonneaux et des poupées (réf. couple) | TRI : hors sujet ; MEP : jamais en grand | OU (v2) |
| INFO-062 | description | Ph | une phrase | IA-P | compris | | IA-V : lecture du voyage ; plus tard : chercher une photo par un mot | OU (voyage seulement) |

### D. L'IA regard fin (photo)

| id | nom | niv. | définition · valeurs | source | coût | fiabilité connue | lue par (moteur : décision) | état |
|---|---|---|---|---|---|---|---|---|
| INFO-063 | lieu_lu | Ph | nom lisible en entier · texte | IA-R | ≈ 0,0017 $ | réf. famille : 16 noms dont 4 enseignes ; réf. couple : 3 « sûrs » dont 2 enseignes | REC, HAB : titres et légendes | OU (**dangereux**) |
| INFO-064 | sorte_du_nom | Ph | lieu, enseigne, document | DED + étape des lieux | 0 à quelques jetons | l'étape ne tourne que sans GPS et pour « road trip » (C14) | HAB : une enseigne n'est jamais un titre (J-03) | OU rarement |
| INFO-065 | plat | Ph | nom du plat | IA-R | compris | 0 cas réf. famille | ASS : page table ; HAB : légende | OU |
| INFO-066 | couverture_oui | Ph | oui / non | IA-R | compris | 51 « oui » sur 61 : ne départage rien | remplacée par INFO-067 | RET |
| INFO-067 | rang_couverture | Ph | classement parmi les candidates | IA (un appel) | ≈ 0,02 $ | presque ignoré (C9, C31) | HAB : couverture (P7) | OU (peu) |
| INFO-068 | type_couverture | Ph | couple, groupe, groupe coupé… | IA-R | compris | « couple » sur une seule personne, « groupe coupé » sur un couple (réf. couple) | HAB : M-04 | OU (**faux**) |
| INFO-069 | expression | Ph | rire, sourire, tendre, neutre, grimace subie | IA-R | compris | peu fiable sur petits visages | TRI : image ; MEP : jamais en grand si grimace subie | OU (v2) |
| INFO-070 | yeux_fermes | Ph | oui, non, incertain | IA-R | compris | peu fiable sur petits visages | MEP : ni grand ni couverture | OU (v2) |
| INFO-071 | point_accroche | Ph | un élément qui accroche un paysage · oui / non | IA-R | compris | non mesuré | TRI : note image d'un paysage (S-011) | OU (v2) |
| INFO-072 | regard_vers | Ph | gauche, droite, face | IA-R | compris | | MEP : recadrage (air du regard) | OU (v2) |
| INFO-073 | conseil_recadrage | Ph | phrase | IA-R | compris | | MEP : la raison d'un rognage, en mots | ONU (affiché seulement) |
| INFO-074 | idee_mise_en_page | Ph | dix mots | IA-R | compris | répétitive | aucune | RET |

### E. L'IA voyage (projet)

| id | nom | niv. | définition · valeurs | source | coût | fiabilité connue | lue par (moteur : décision) | état |
|---|---|---|---|---|---|---|---|---|
| INFO-075 | pays_lu | Pr | texte | IA-V | un appel | « vide » au réf. couple (l'IA ne recevait aucune ville) | HAB : titre ; REC | OU |
| INFO-076 | type_voyage | Pr | circuit, road trip, séjour, ville, croisière, randonnée, événement, vie quotidienne | IA-V | | « circuit » juste au réf. couple, puis mal traduit (C15) | REC : thème | OU (mal branché) |
| INFO-077 | qui | Pr | couple, famille, amis, solo, groupe | IA-V | | « couple » juste au réf. couple | profil (seul « famille » est lu, pour la sobriété) | OU partiel |
| INFO-078 | profil_ia | Pr | P1 à P6 | IA-V | | « couple » juste au réf. couple, jamais lu (le thème passe devant, C15) | profil | **ONU** |
| INFO-079 | chapitres_ia | Pr | bornes et titres | IA-V | | coupe 3 journées sur 40 photos (réf. couple) ; titres creux | REC : un candidat parmi d'autres | OU (comme mur : à changer) |
| INFO-080 | doutes_ia | Pr | phrases | IA-V | | « les villes réellement parcourues restent incertaines » | LEC : questions à poser | **ONU** |
| INFO-081 | style_conseille | Pr | phrase | IA-V | | juste au réf. couple (« grandes photos couleur, densité moyenne ») | REGLAGES : indice d'école | **ONU** |

### F. Le GPS et le géocodage (photo et projet)

| id | nom | niv. | définition · valeurs | source | coût | fiabilité connue | lue par (moteur : décision) | état |
|---|---|---|---|---|---|---|---|---|
| INFO-082 | ville | Ph | commune et ville | GEO | un appel par endroit arrondi | ses titres du réf. couple ont la forme du géocodage | REC : journées-lieux, chapitres ; HAB : titres | **PO** pour le compositeur (C1) ; la route des lieux existe dans l'éditeur pour des suggestions à l'écran |
| INFO-083 | region_pays | Ph | région, pays | GEO | compris | | REC ; HAB : titre de couverture | PO |
| INFO-084 | lieu_nomme | Ph | monument, site, parc à moins de 300 m | GEO | compris | | HAB : titre de double, légende ; confirmer un panneau | PO |
| INFO-085 | grande_ville | Ph | grande ville à 50 km | GEO | compris | | HAB : repli de titre | PO |
| INFO-086 | trajet_distance | Pr | ordre des lieux, kilomètres | DED | 0 | | REC : ordre des étapes ; HAB : chiffres vrais | PO |
| INFO-087 | lieu_prive | Ph | lieu de domicile, jamais nommé | GEO + DED | 0 | MAC-2934 | HAB : jamais imprimé | PO |
| INFO-088 | panneau_confirme | Ph | le nom lu est-il le lieu du GPS · oui / non | DED (INFO-063 + INFO-084) | 0 | n'existe pas | HAB : un nom lu devient titre seulement s'il est confirmé (J-03) | **PO (nouvelle)** |

### G. Les ensembles

| id | nom | niv. | définition · valeurs | source | coût | fiabilité connue | lue par (moteur : décision) | état |
|---|---|---|---|---|---|---|---|---|
| INFO-089 | doublon_de | En | doublon exact | DED | 0 | fiable | TRI : écart | OU |
| INFO-090 | pile | En | rafale (même déposant, empreintes proches à quelques secondes) | DED | 0 | 0 rafale sur des lots déjà triés | TRI : élue | OU |
| INFO-091 | serie_type | En | quasi-identiques, action, événement, angles, photomaton, pellicule | DED (+ geste) | 0 | non éprouvé | TRI : combien on garde ; ASS : forme | OU (v2) |
| INFO-092 | similaires | En | 12 bits ou moins à 10 min | DED | 0 | | ASS : variété | OU |
| INFO-093 | moment | En | bloc sans silence de 2 h (RD) | DED | 0 | 39 moments (réf. famille), 27 (réf. couple) ; 2 h 05 coupe une matinée (C4) | REC ; ASS : une double = un moment | OU |
| INFO-094 | jour | En | date | DED | 0 | exact | REC | OU |
| INFO-095 | journee_lieu | En | même jour, même ville | DED (INFO-001 + INFO-082) | 0 | n'existe pas | REC : unité qu'on ne coupe pas (J-01) ; ASS | **PO (nouvelle)** |
| INFO-096 | jour_fort | En | dans les 20 % des jours les plus photographiés (RD) | DED | 0 | au réf. couple 2 photos suffisent | HAB : titre (N-53) ; REC : ouverture | OU |
| INFO-097 | densite_de_prise | En | photos dans l'heure autour | DED | 0 | exacte | ASS : densité ; REC : sommet (R-40) | OU partiel |
| INFO-098 | ecart_voisines | En | secondes et distance d'empreinte avec les voisines | DED | 0 | | TRI : séquence | BANC |
| INFO-099 | seule_trace | En | aucune autre photo du moment | DED | 0 | exacte | TRI : ne sort jamais (S-139) | OU (v2) |
| INFO-100 | rang_dans_moment | En | 1, 2, 3… | DED | 0 | | ASS : héros | OU |
| INFO-101 | paires_candidates | En | large et détail, pancarte et sujet, portrait et ambiance, jour et nuit, écho, contraste | DED | 0 | non mesurée | ASS : construire une double avec une raison | OU (v2) |
| INFO-102 | serie_de_sujet | En | 3 photos ou plus du même sujet dans un même lieu ou voyage | DED (INFO-046 + INFO-082) | 0 | plats 5 sur 5 au réf. couple | REC : grande entorse (J-04) | **PO (nouvelle)** |
| INFO-103 | position_dans_livre | En | 0 à 100 % | DED | 0 | exacte | REC : ouverture, sommet, fin | OU |
| INFO-104 | chapitre_temporel | En | coupes aux plus grands silences | DED | 0 | 7 chapitres (réf. famille) | REC : repli sans voyage | OU |

### H. Le projet

| id | nom | niv. | définition · valeurs | source | coût | fiabilité connue | lue par (moteur : décision) | état |
|---|---|---|---|---|---|---|---|---|
| INFO-105 | duree | Pr | premier au dernier jour daté | DED | 0 | exacte | profil | OU |
| INFO-106 | jours_photographies | Pr | nombre | DED | 0 | exacte | profil ; chapitres | OU |
| INFO-107 | nombre_photos | Pr | nombre | DED | 0 | exacte | profil (gros lot) ; taille | OU |
| INFO-108 | part_visages | Pr | part des photos avec au moins un visage | DED | 0 | sous-compte : 11 % et 14 % sur deux albums où l'on voit beaucoup de gens | profil | BANC |
| INFO-109 | part_trois_visages | Pr | | DED | 0 | même réserve | profil (fête, groupe) | BANC |
| INFO-110 | part_nuit | Pr | heure 20 h à 6 h ou luminance basse | DED | 0 | | profil (fête) | BANC |
| INFO-111 | part_portrait | Pr | | DED | 0 | | profil ; format | BANC (non utilisée) |
| INFO-112 | part_paysages_details | Pr | | DED | 0 | | profil (long voyage) | BANC |
| INFO-113 | villes_pays | Pr | nombre de villes, de pays | DED (INFO-082) | 0 | | profil ; thème (circuit) | PO |
| INFO-114 | lot_trie | Pr | moins de 8 % de rafales et note médiane 0,6 ou plus (RD) | DED | 0 | « oui » sur l'réf. famille | TRI : garder presque tout (M-09) | OU |
| INFO-115 | groupe_du_projet | Pr | combien de personnes forment le groupe | Q-CLI, sinon DED | 0 | 7 pour un couple (réf. couple, C17) ; 3 pour une famille de 4 (réf. famille) | TRI : gens ; HAB : couverture (M-04) ; REC : fin | OU (**faux**) |
| INFO-116 | profil | Pr | P1 à P6 | DED, Q-AT | 0 | « famille » pour un couple (réf. couple, C15) | REGLAGES | OU (**faux**) |
| INFO-117 | theme | Pr | road trip, ville, plage, fête, événement, année, autre | DED, Q-AT | 0 | | REC : découpe et noms | OU |
| INFO-118 | palette_du_lot | Pr | teintes qui reviennent | DED | 0 | | HAB : nuancier | OU |
| INFO-119 | pages_commandees | Pr | nombre | commande | 0 | exacte | REC : taille (D20 : payée et gelée) | OU |
| INFO-120 | photos_retouchees | Pr | part des photos déjà filtrées | PIX | 0 | non mesurée | HAB : garder son look (Notion ch.4) | PO |

### I. Les réponses et corrections

| id | nom | niv. | définition · valeurs | source | coût | fiabilité connue | lue par (moteur : décision) | état |
|---|---|---|---|---|---|---|---|---|
| INFO-121 | occasion | Ré | texte du client (écran 1 de /composer) | Q-CLI | 0 | démentie par les photos une fois sur le corpus (« été indien » pour un Noël) | LEC : thème deviné (faible) ; IA-V | OU (thème seulement) |
| INFO-122 | histoire | Ré | texte du client (écran 2) | Q-CLI | 0 | | IA-V : chapitres, ton | **ONU** (jamais transmise, C10) |
| INFO-123 | titre_client | Ré | texte (écran 3) | Q-CLI | 0 | | HAB : couverture, page 1 | OU (v2) |
| INFO-124 | combien_etiez_vous | Ré | nombre | Q-CLI (Q-C01) | 0 | | PROJET : groupe | OU (codée ; écran client absent) |
| INFO-125 | lieux_a_ne_pas_oublier | Ré | liste ordonnée | Q-CLI (Q-C02) | 0 | | REC : chapitres, noms | OU |
| INFO-126 | photos_preferees | Ré | 3 à 10 photos | Q-CLI (Q-C03) | 0 | | TRI : coup de cœur ; MEP : grand | OU |
| INFO-127 | theme_saisi | Ré | | Q-AT | 0 | | REC | OU |
| INFO-128 | ambiance_saisie | Ré | sobre, équilibrée, stylisée | Q-AT | 0 | | REGLAGES : sobriété | OU |
| INFO-129 | moment_le_plus_important | Ré | une photo ou un jour | Q-AT | 0 | | REC : sommet | PO (écrite dans la définition v2) |
| INFO-130 | lieux_a_ne_pas_montrer | Ré | liste | Q-AT ou Q-CLI | 0 | | TRI, REC : retirer un lieu (Av #11) | PO |
| INFO-131 | pays_corrige | Ré | | COR | 0 | | HAB : titre | OU |
| INFO-132 | profil_corrige | Ré | | COR | 0 | | REGLAGES | OU |
| INFO-133 | chapitres_renommes | Ré | | COR | 0 | | HAB | OU |
| INFO-134 | taille_choisie | Ré | pages | COR | 0 | | REC | OU |
| INFO-135 | marques | Ré | coup de cœur, gardée, sortie, écartée | COR | 0 | exactes | TRI : priment (M-13, M-27) | OU |
| INFO-136 | tags_corriges | Ré | toute INFO de la lecture IA | COR | 0 | exactes | LEC : remplacent la lecture | OU |
| INFO-137 | plaintes | Ré | « Ça ne va pas » : même jour séparé, titre faux, à regrouper, mal coupée, mauvaise place, mot libre | COR | 0 | | apprentissage : plaintes par règle | PO |
| INFO-138 | ecarts_a_la_proposition | Ré | ce que l'atelier change ensuite, rattaché à la règle | COR | 0 | | apprentissage (M-30) | codée ; stockage à vérifier |

### J. Les déductions (synthèses lisibles)

| id | nom | niv. | définition · valeurs | source | coût | fiabilité connue | lue par (moteur : décision) | état |
|---|---|---|---|---|---|---|---|---|
| INFO-139 | note_technique | Ph | faible, correcte, bonne, forte (crans du lot) | DED | 0 | | TRI | OU (v2) |
| INFO-140 | note_histoire | Ph | idem | DED | 0 | | TRI ; REC | OU (v2) |
| INFO-141 | note_image | Ph | idem | DED | 0 | | TRI : taille méritée ; ASS : héros | OU (v2) |
| INFO-142 | note_gens | Ph | idem | DED | 0 | fausse si le groupe est faux | TRI ; ASS | OU (v2) |
| INFO-143 | note_unicite | Ph | idem | DED | 0 | | TRI : ordre de sortie | OU (v2) |
| INFO-144 | taille_meritee | Ph | double, pleine, demi, quart, vignette | DED | 0 | | ASS ; MEP | OU (v2) |
| INFO-145 | statut_raison | Ph | posable, réserve, écartée + raison en mots + règle | TRI | 0 | | tous ; Analyse (M-02) | OU |
| INFO-146 | roles_structure | Ph | candidate ouverture, sommet, fin, couverture | DED | 0 | | REC | OU |
| INFO-147 | groupe_complet | Ph | tout le groupe est sur la photo | DED (115 + INFO-052) | 0 | faux quand le groupe est faux | HAB : couverture ; REC : fin | OU (faux) |
| INFO-148 | image_au_revoir | Ph | plan large, calme, sans personne au premier plan, derniers jours | DED (047, 046, 054, 103) | 0 | n'existe pas | REC : fin (J-06) | **PO (nouvelle)** |
| INFO-149 | placement_ressemblance | Ph | chapitre d'une photo sans date, et sa confiance | DED | 0 | une photo mal rangée sur l'réf. famille | REC ; doute avoué | OU (v2) |

**Compte.** 149 informations : 19 fichier, 25 pixels, 18 IA planche, 12 regard fin, 7 IA voyage, 7 GPS et géocodage, 16 ensembles,
16 projet, 18 réponses et corrections, 11 déductions. États : 5 retirées (019, 043, 050, 066, INFO-074) ; 7 nouvelles proposées
(029, 052, 088, 095, 102, 148, et le geste 137) ; 7 obtenues et jamais lues par une décision (011, 018, 060, 073, 078, 080, 081, plus 122
côté réponses) ; 22 calculées au banc seulement.

---

## 2. (a) Les informations obtenues qui ne servent à rien aujourd'hui

| INFO | Ce qu'on paye ou calcule | Pourquoi elle dort | Ce qu'elle devrait décider |
|---|---|---|---|
| INFO-011 gps | rien (lu gratuitement) | jamais transmis au compositeur ; l'étape des lieux ne tourne que SANS GPS (C1, C14) | journées-lieux, chapitres, titres : la cause de fond des reproches du réf. couple |
| 122 histoire | le temps du client | jamais transmise à l'IA voyage (C10) | chapitres proposés, ton, moments importants |
| INFO-078 profil_ia | un appel IA | le thème passe devant (C15) | le profil, quand il recoupe le comptage |
| INFO-080 doutes_ia | un appel IA | personne ne les lit | les questions à poser (« villes incertaines » = demander les étapes) |
| INFO-081 style_conseille | un appel IA | personne ne le lit | l'école proposée (12-QUESTIONS-PARAMETRES partie 4) |
| INFO-060 insolite | une lecture IA | affiché, lu par aucune décision | la respiration, le punctum (1 à 3 par magazine, R-44) |
| INFO-073 conseil_recadrage | une lecture IA | mots affichés seulement | rien de plus : à garder comme raison, pas comme décision |
| INFO-067 rang_couverture | ≈ 0,02 $ | presque ignoré par la règle du groupe (C31) | départager les candidates (P7) |
| INFO-018 nom_fichier | rien | indice jamais lu | rien comme fait ; un indice pour un doute avoué |
| 002, INFO-006 à 010, 022, 025, 031, 035, 037, 038, INFO-040 à 042, 098, 108 à 112 | rien (local) | calculés au banc du 17/11, absents de l'éditeur et du compositeur | fuseau (deux téléphones), objectif (rôle), lumière et flash (fonds), regard (page), température (paires), parts du lot (profil) |

## 3. (b) Les décisions prises aujourd'hui sans l'information qu'il faudrait

| Décision | Prise avec | Il lui faut | Effet constaté |
|---|---|---|---|
| Couper les chapitres | tags par photo, sans ville ni histoire (IA voyage) | INFO-095 journée-lieu, INFO-082 ville, 122 histoire | trois journées coupées sur 40 photos (C11) |
| Nommer chapitres et doubles | noms lus, thèmes inventés, date du premier jour | 082, 084, 088, INFO-064 | enseignes et thèmes creux en titres (C12, C26, C33) |
| Choisir le profil | le thème (circuit → famille) | INFO-052 nos personnes, 115 groupe, 105 durée | densité et sobriété d'une famille pour un couple (C15, C16, C23) |
| Couverture « tout le groupe » | le plus grand nombre compté 3 fois | 052, 115 | une rue d'une ville en couverture (C31) |
| Protéger une personne au recadrage | un visage trouvé, ou rien | INFO-029 visage confirmé, 051, INFO-033 avec le corps | une tête au ras du bord (C35) ; un faux visage au cœur de la zone (C38) |
| Ouvrir un chapitre | la plus forte photo du chapitre | INFO-094 jour, 103 position | une ville avant un site connu (C28) |
| Rassembler les plats | rien (aucune règle par sujet) | 102 série de sujet | cinq plats sur trois doubles (C30) |
| Finir le magazine | les gens à 2 et plus du dernier tiers | 148 image d'au revoir, réglage par profil | le selfie au lieu du un site connu (C25) |
| Mettre en réserve « technique faible » | crans de netteté relatifs au lot | appartenance à une série ou une paire (091, 101, 102) | le cinquième plat en réserve (C19) |
| Écarter une capture | appareil absent | INFO-015 provenance, INFO-044 texte | (risque connu, NO-052 : une photo de messagerie prise pour une capture) |
| Poser en double un paysage | 150 ppp provisoires | le seuil de l'imprimeur (Q-14) | P1 tourne sur une hypothèse |
| Garder le pli libre | ± 15 mm (hypothèse, P-15) | la largeur réelle du pli (Q-02) | idem |
| Redresser un horizon | rien | INFO-026 horizon fiable | aucun redressement possible |

## 4. (c) Les informations trop coûteuses pour ce qu'elles apportent

| Information ou passe | Coût | Ce qu'elle apporte | Proposition |
|---|---|---|---|
| La passe « tags manquants » séparée | 25 appels sur 40 photos au réf. couple ; 0,18 $ en passe seule contre 0,08 $ intégrée (définition v2 §15) | les mêmes six champs | toujours dans la première lecture ; une passe séparée seulement pour une lecture ancienne |
| Expression et yeux fermés sur de petits visages | regard fin | peu fiable (définition v2 §16) | ne les demander que si `taille_visage` dépasse un seuil (RD), et ne s'en servir que pour empêcher le grand, jamais pour écarter |
| couverture oui / non (INFO-066) | regard fin | 51 « oui » sur 61 | retirée, remplacée par le classement (≈ 0,02 $) |
| idee_mise_en_page (INFO-074) | regard fin | aucune décision | retirée |
| L'intérêt IA comme note unique (INFO-048) | compris dans la planche | une opinion, relative à la planche | le garder comme une part de la note « histoire » seulement |
| Le regard fin sur les photos à texte qui ne sont pas des lieux | regard fin | des enseignes, des menus | regard fin seulement si le texte peut être un lieu (lu en planche) ou une candidate ; le GPS donne le lieu gratuitement quand il est là |
| Visages sans tuiles | 0 | 9 photos sur 164 trouvées | toujours en tuiles (10 s pour 164) |

## 5. (d) Les informations dont l'erreur fait le plus de dégâts, et leur garde-fou

| INFO | L'erreur | Dégât | Garde-fou proposé |
|---|---|---|---|
| INFO-028 visages | un faux visage (lampadaire, bol, statue, poupée) ; un vrai visage raté (de trois quarts, petit, de dos) | le recadrage protège le faux et coupe le vrai ; la note gens ment | **INFO-029 visage confirmé** : un visage n'entre dans la zone importante que si l'IA voit des personnes sur la photo, ou s'il est grand et net (RD) ; quand l'IA voit des personnes et que le détecteur n'en trouve pas, la photo n'est rognée ni en haut ni en bas ni sur les côtés qui peuvent porter quelqu'un (J-11, J-12, M-31) ; une poupée ou une statue lue « objet » annule le visage |
| INFO-051 personnes | les passants comptés comme le groupe | profil faux, couverture fausse, note gens fausse (C6, C17, C18, C31) | **INFO-052 nos personnes** (premier plan, sujet) demandée en planche ; le groupe = la réponse « combien étiez-vous », sinon la valeur la plus FRÉQUENTE de « nos personnes » sur les photos dont le sujet est « personnes » (jamais la plus grande) ; si le plus grand compte dépasse de loin la valeur fréquente, question au client (12-QUESTIONS-PARAMETRES, Q-C01) |
| INFO-063 lieu lu | une enseigne, une marque, un écran publicitaire pris pour un lieu | titres faux, chapitres nommés d'une marque (C8, C26) | **INFO-064 sorte du nom toujours établie** ; un nom lu ne devient titre que s'il est confirmé par le GPS (INFO-088) ou saisi ; sans GPS, seulement s'il est lu sur deux photos ET porte deux mots porteurs ET n'est pas une enseigne ; sinon il reste une légende au mieux |
| INFO-079 chapitres de l'IA | coupes au milieu des journées | journées séparées, retours en arrière (C11, C21, 14 retours contre 5) | l'IA propose, le Récit borne sur les journées-lieux (J-01) ; une coupe IA qui tombe dans une journée-lieu est déplacée à la frontière la plus proche et journalisée |
| 116 profil | un couple lu comme une famille | densité, sobriété, taille, fin de famille (C15) | le profil se lit sur « qui » et la durée, jamais sur le thème ; deux signaux qui se contredisent = question (12-QUESTIONS-PARAMETRES partie 3) |
| INFO-001 date | deux téléphones décalés ; une date d'arrivée prise pour une date de prise | chronologie fausse, journées mal faites | fuseau lu (INFO-002) ; recalage sur les scènes communes (S-086) ; une date estimée ne coupe jamais un chapitre seule ; doute avoué si la confiance est basse |
| INFO-061 sujet spécial | « document » sur des objets | une photo forte devient petite ou hors sujet | « document » seul n'écarte jamais ; il faut un deuxième indice (aplats, texte, forme d'écran) |
| INFO-021 netteté relative | une photo de nuit ou douce jugée faible | une bonne photo en réserve (C2, C19) | une seule note faible ne met jamais en réserve (définition v2 §3.1) ; la netteté est jugée sur le sujet, pas sur le lot entier, quand le sujet est net en absolu |
| INFO-056 à écarter | une case vide ou illisible lue « à écarter » | 164 photos « à écarter » (M-13) | garde-fou déjà codé : lecture douteuse non utilisée au-delà de la moitié |
| INFO-087 lieu privé | le nom d'une rue ou d'un village de domicile imprimé | une donnée privée dans un objet qui circule | un lieu revenu le premier et le dernier jour, ou marqué privé, n'est jamais imprimé sans saisie (MAC-2934) |

**Règle générale qui découle de cette liste** (proposée au socle, niveau P2) : une décision de niveau P0 à P2 ne s'appuie jamais sur un seul
tag d'IA. Il lui faut une mesure, une saisie, ou deux sources qui concordent (04-METHODES §4 : « deux lectures et une règle » ; « un désaccord
est un drapeau, pas une moyenne »).

---

## 6. Ce qu'il faut mesurer en premier (fiabilité inconnue qui pèse le plus)

Dans l'ordre du dégât possible : nos personnes contre passants (INFO-052) ; visage confirmé (INFO-029) ; sorte du nom lu (INFO-064) ; force d'image (INFO-057)
contre ses coups de cœur ; rôle et sujet (045, INFO-046) ; expression et yeux fermés (069, INFO-070). Méthode : sur les magazines de référence, Mathias
corrige les tags dans l'Analyse ; chaque correction est un cas de mesure (13-ENTRAINEMENT, partie 3). La « stabilité de répétition » d'une
lecture IA (même photo, deux lectures) se mesure sur le même jeu, en payant une seconde lecture une seule fois (04-METHODES §4).

## Ce qui me manque

- Les taux d'exactitude des tags IA : seuls existent des accords avec d'autres mesures et des comptages à l'œil sur deux magazines.
- Le prix de l'offre de géocodage.
- Le seuil d'impression et la largeur du pli (imprimeur).
- La liste exacte de ce que l'éditeur mesure aujourd'hui en plus du compositeur : j'ai lu `mesures.ts` et les types ; une mesure peut exister ailleurs sans être transmise.
