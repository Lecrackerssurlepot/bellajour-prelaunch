# Les informations du socle

> **Fichier généré, ne pas éditer.** Source : `src/lib/mise-en-page/regles/socle/` ; régénérer par
> `npx tsx --tsconfig tsconfig.json scripts/socle-doc.ts`. Le harnais refuse ce fichier s'il n'est pas à jour.

Version du socle : `s27875359`. 151 informations, chacune avec son libellé d'atelier (M-57).

Par état : obtenue_utilisee 91 · obtenue_gardee 13 · pas_obtenue 47.

États : `obtenue_utilisee` (le dépôt l'a, une décision la lit) ; `obtenue_gardee` (gardée pour l'atelier, M-56 : jamais retirée faute
d'usage) ; `pas_obtenue` (à créer, ou calculée au banc seulement). Sources : FICH fichier, PIX pixels, IA-P planche, IA-R regard fin,
IA-V voyage, GEO géocodage, Q-CLI et Q-AT questions, COR correction, DED déduite.

## Les rôles d'une photo et leur libellé d'atelier

| Clé | Libellé d'atelier | Ce que c'est | D'où |
|---|---|---|---|
| `heros` | **photo principale** | la photo qui domine la double : le plus grand cadre | code (ROLES_IA, POIDS_ROLE) ; socle Assortiment |
| `satellite` | **photo d'accompagnement** | une photo plus petite posée à côté de la principale, qui la complète | code (ROLES_IA, POIDS_ROLE) ; socle Assortiment ; libellé demandé par M-57 |
| `detail` | **photo de détail** | un gros plan (objet, plat, enseigne) qui apporte ce que la vue large n'a pas | code (ROLES_IA, POIDS_ROLE) |
| `vue_ensemble` | **vue d'ensemble** | le plan large qui montre le lieu entier | code (ROLES_IA, POIDS_ROLE) |
| `pleine` | **pleine page** | une photo seule qui prend toute une page | code (ROLES_IA, POIDS_ROLE) |
| `double` | **photo sur deux pages** | une photo seule qui traverse la double, pli compris | code (ROLES_IA, POIDS_ROLE) |
| `couverture` | **photo de couverture** | candidate pour la 1re ou la 4e de couverture | code (ROLES_IA) |
| `a_ecarter` | **à laisser de côté** | la lecture propose de ne pas la poser ; elle va en réserve, jamais supprimée | code (ROLES_IA) |
| `pancarte` | **panneau ou enseigne** | une photo de panneau qui nomme le lieu, posée avec son sujet | socle Assortiment |
| `ambiance` | **photo d'ambiance** | une photo sans sujet précis qui donne l'atmosphère du moment | socle Assortiment |
| `serie` | **suite de photos** | plusieurs photos d'un même geste, posées ensemble et dans l'ordre | socle Tri, Assortiment |
| `reunion` | **page qui rassemble un sujet** | des photos d'un même sujet (plats, animaux) réunies sur une double | socle Récit |
| `ouverture` | **ouverture de chapitre** | la première double d'un chapitre, avec le nom du lieu | socle Récit |
| `sommet` | **moment fort du magazine** | la double la plus forte, placée vers les deux tiers | socle Récit |
| `fin` | **dernière page** | la photo qui clôt le magazine (au revoir ou les gens) | socle Récit |
| `respiration` | **page calme** | une double à une ou deux photos entre des doubles chargées | socle Récit, Assortiment |
| `jalon` | **photo de groupe de l'étape** | la photo posée où tout le groupe regarde l'objectif, une par étape | registre S-008 |
| `punctum` | **photo insolite** | une photo surprenante qui arrête le regard, une à trois par magazine | socle Assortiment |

## Les informations

| Id | Nom | Libellé d'atelier | Niveau | Valeurs (libellé) | Source | Coût | Fiabilité | Lue par | État |
|---|---|---|---|---|---|---|---|---|---|
| INFO-001 | `date_prise` | **date et heure de la prise** | photo | date ISO ou vide (date sensibilité ou vide) | FICH | 0 | 141 sur 164 (86 %) réf. famille ; 40/40 réf. couple | 92 règles (Lecture, Tri, Récit, Assortiment, Habillage, Revérification) | obtenue_utilisee<br>*REC : chronologie, journées, moments ; HAB : dates des titres* |
| INFO-002 | `fuseau` | **fuseau horaire de l'appareil** | photo | +hh:mm | FICH | 0 | présent avec la date (141 sur 164) | 4 règles (Lecture, Habillage) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; LEC : région du monde sans GPS ; REC : recaler deux téléphones (S-086)* |
| INFO-003 | `date_estimee` | **date estimée (arrivée dans la galerie)** | photo | date ou vide, statut | DED | 0 | 1 inversion sur 141 (une marque de téléphone) ; c'est l'arrivée, pas la prise | 2 règles (Lecture, Tri) | obtenue_utilisee<br>*REC : placer une photo sans date (M-18)* |
| INFO-004 | `numero_galerie` | **numéro de la photo dans la galerie** | photo | entier | FICH | 0 | croît avec l'arrivée pour une marque | 3 règles (Lecture, Tri) | obtenue_utilisee<br>*REC : placement par ressemblance* |
| INFO-005 | `appareil` | **appareil** | photo | texte ou vide | FICH | 0 | 141 sur 164 ; absent = messagerie ou capture | 13 règles (Lecture, Récit, Habillage) | obtenue_utilisee<br>*obtenue en partie ; TRI : indice de capture (jamais seul, NO-052) ; REC : deux déposants* |
| INFO-006 | `objectif` | **objectif** | photo |  | FICH | 0 | règle écrite pour un seul modèle ; 23 sur 164 inconnus | 5 règles (Lecture, Assortiment) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; ASS : un ultra grand-angle ouvre, un télé est un détail ; MEP : selfie jamais en double* |
| INFO-007 | `selfie` | **selfie** | photo | oui, non | FICH | 0 | 0 cas sur le test : non prouvé | 7 règles (Lecture, Tri, Récit, Assortiment) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; MEP : un selfie déformé jamais en grand (S-014)* |
| INFO-008 | `iso_vitesse` | **sensibilité vitesse** | photo |  | FICH | 0 | présents 141 sur 164 | 1 règles (Lecture) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; TRI : risque de bougé (vitesse lente, RD 1/15 s)* |
| INFO-009 | `flash` | **flash** | photo |  | FICH | 0 | 0 sur 141 | 2 règles (Lecture) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; HAB : soirée, fond sombre* |
| INFO-010 | `lumiere_scene` | **lumiere scene** | photo | nuit, intérieur, plein jour | FICH | 0 | accord 91 % avec « intérieur » de l'IA | 2 règles (Lecture) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; TRI, HAB : nuit, intérieur, sans regarder un pixel* |
| INFO-011 | `gps` | **position de prise de vue** | photo | lat, lon ou vide | FICH | 0 | 0/164 réf. famille ; 40/40 réf. couple | 37 règles (Lecture, Tri, Récit, Assortiment, Habillage, Revérification) | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; LEC : géocodage ; REC : journées-lieux, chapitres ; HAB : titres* |
| INFO-012 | `dimensions_orientation` | **taille en pixels et sens de la photo** | photo |  | FICH | 0 | 164 sur 164 | 40 règles (Lecture, Tri, Assortiment, Mise en page, Habillage) | obtenue_utilisee<br>*MEP : gabarits, définition* |
| INFO-013 | `forme` | **format de la photo** | photo |  | DED | 0 | exacte | 47 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*ASS : type de double ; MEP : gabarit* |
| INFO-014 | `taille_possible` | **plus grande taille imprimable** | photo | double, pleine, demi, quart, vignette | DED | 0 | exacte ; le seuil de l'imprimeur est inconnu (Q-14) | 35 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*TRI : borne ; ASS ; MEP ; HAB : couverture* |
| INFO-015 | `provenance` | **d'où vient la photo** | photo |  | DED (FICH + PIX) | 0 | partielle : messagerie et capture devinées, tiers non | 17 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage) | pas_obtenue<br>*obtenue en partie ; TRI : note technique, hors sujet ; MEP : jamais recadrer sur un filigrane (S-021)* |
| INFO-016 | `rafale_appareil` | **rafale marquée par l'appareil** | photo |  | FICH | 0 | non mesurée | 0 règles () | pas_obtenue<br>*LEC : rafales certaines (R-30)* |
| INFO-017 | `live_profondeur_couleur` | **photo animée, profondeur et profil de couleur** | photo |  | FICH | 0 | non mesurée | 2 règles (Lecture) | pas_obtenue<br>*MEP : titre derrière le sujet (R-62) ; HAB : conversion juste* |
| INFO-018 | `nom_fichier` | **nom du fichier** | photo |  | FICH | 0 | au réf. couple il contient la ville (C1) | 3 règles (Lecture, Récit) | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; LEC : indice faible, jamais un fait* |
| INFO-019 | `logiciel_fraction_de_seconde_zoom` | **logiciel fraction de seconde zoom** | photo |  | FICH | 0 | non mesurée | 0 règles () | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; aucune décision* |
| INFO-020 | `nettete_sujet` | **nettete sujet** | photo |  | PIX | 0 | les floues sont bien trouvées ; non contrôlée sur les sujets | 19 règles (Lecture, Tri, Mise en page, Habillage) | obtenue_utilisee<br>*TRI : note technique, cause « floue sans sujet »* |
| INFO-021 | `nettete_relative` | **nettete relative** | photo | nombre, crans | DED | 0 | pénalise nuit et gros plans doux (C2 : le un site connu à 0,3) | 0 règles () | obtenue_utilisee<br>*TRI : crans du lot* |
| INFO-022 | `bouge` | **bouge** | photo | oui, non | PIX + FICH | 0 | 10 cas, à mesurer | 5 règles (Tri, Assortiment, Mise en page) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; TRI : un bougé qui porte un mouvement passe (R-70)* |
| INFO-023 | `exposition` | **exposition** | photo |  | PIX | 0 | 0 cas sur un lot déjà trié | 7 règles (Tri, Mise en page, Habillage) | obtenue_utilisee<br>*TRI ; MEP : pas en grand* |
| INFO-024 | `bruit_nuit` | **bruit nuit** | photo | faible, fort | PIX | 0 | non mesuré | 4 règles (Tri, Assortiment, Habillage) | pas_obtenue<br>*MEP : petite ; HAB : noir et blanc* |
| INFO-025 | `contraste` | **contraste** | photo |  | PIX | 0 | à mesurer | 5 règles (Lecture, Habillage, Revérification) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; HAB : filtres ; TRI : note image* |
| INFO-026 | `horizon` | **horizon** | photo |  | PIX | 0 | **non fiable** (aucune photo retenue « à redresser ») | 12 règles (Lecture, Tri, Assortiment, Mise en page, Revérification) | pas_obtenue<br>*MEP : redresser ; ASS : aligner deux horizons* |
| INFO-027 | `empreinte` | **empreinte** | photo |  | PIX | 0 | doublons fiables ; deux voisines à 22 à 37 bits sont différentes | 24 règles (Lecture, Tri, Récit, Assortiment, Revérification) | obtenue_utilisee<br>*TRI : doublon, presque identique ; ASS : jamais deux pareilles sur une double* |
| INFO-028 | `visages_boites` | **visages boites** | photo |  | PIX | 0 ; ~10 s pour 164 | sans tuiles 9/164, en tuiles 36 sur 164 (réf. famille) ; réf. couple : 4 faux (lampadaire, bol, statue, poupée), 4 ratés | 82 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*MEP : pli, coupe, zone importante ; TRI : gens* |
| INFO-029 | `visage_confirme` | **visage confirme** | photo | oui, non, incertain | DED (INFO-028 + INFO-051 + INFO-046) | 0 | n'existe pas | 7 règles (Lecture, Tri, Mise en page, Revérification) | pas_obtenue<br>*MEP : zone importante (J-11)* |
| INFO-030 | `taille_visage` | **taille visage** | photo |  | DED | 0 | dépend du détecteur | 0 règles () | obtenue_utilisee<br>*TRI : gens ; ASS : plan ; LEC : demander l'expression seulement si assez grand* |
| INFO-031 | `tete_tournee` | **tete tournee** | photo |  | PIX | 0 | 23 face, 7 gauche, 6 droite ; à mesurer | 1 règles (Revérification) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; MEP : le regard entre dans la double (R-52)* |
| INFO-032 | `chaleur` | **chaleur** | photo |  | PIX | 0 | non contrôlée à l'œil | 23 règles (Lecture, Tri, Mise en page, Habillage) | obtenue_utilisee<br>*MEP : recadrage par ce qu'on coupe (M-29)* |
| INFO-033 | `zone_importante` | **zone importante** | photo | boîte | DED | 0 | réduite au visage sur les portraits ; fausse si faux visage (C38) | 25 règles (Lecture, Tri, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*MEP : recadrage, pli ; HAB : texte sur photo* |
| INFO-034 | `zone_calme` | **zone calme** | photo | haut, bas, gauche, droite, aucune | PIX | 0 | 50 sur 164 | 2 règles (Tri, Mise en page) | obtenue_utilisee<br>*HAB : titre sur photo, page 1, ouverture* |
| INFO-035 | `position_sujet` | **position sujet** | photo |  | PIX | 0 | à mesurer | 2 règles (Mise en page) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; MEP : page gauche ou droite* |
| INFO-036 | `palette` | **palette** | photo |  | PIX | 0 | non mesurée | 48 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage) | obtenue_utilisee<br>*ASS : écho de couleur ; HAB : fonds, nuancier* |
| INFO-037 | `temperature` | **temperature** | photo |  | PIX | 0 | 47 / 55 / 62 sur 164 ; à mesurer | 5 règles (Lecture, Habillage) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; ASS : paires ; HAB : noir et blanc* |
| INFO-038 | `saturation_noir_blanc` | **saturation noir blanc** | photo |  | PIX | 0 | non mesurée | 9 règles (Assortiment, Mise en page, Habillage) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; HAB : filtres, série noir et blanc* |
| INFO-039 | `aplats` | **aplats** | photo |  | PIX | 0 | non mesurée | 0 règles () | obtenue_utilisee<br>*TRI : capture d'écran* |
| INFO-040 | `ciel_verdure` | **ciel verdure** | photo |  | PIX | 0 | à mesurer | 62 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; LEC : indice d'extérieur* |
| INFO-041 | `interieur_local` | **dedans ou dehors (mesuré sans IA)** | photo |  | DED | 0 | 91 % d'accord avec l'IA | 5 règles (Récit, Mise en page, Revérification) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; ASS : alternance* |
| INFO-042 | `lumiere_moment_local` | **lumière du moment (mesurée sans IA)** | photo |  | DED | 0 | 84 % d'accord avec l'IA | 25 règles (Lecture, Tri, Récit, Assortiment, Habillage) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; HAB : fond sombre ; ASS : jour et nuit* |
| INFO-043 | `plan_local` | **plan large, moyen ou serré (mesuré sans IA)** | photo |  | DED | 0 | 55 % d'accord : l'IA est meilleure | 0 règles () | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; aucune (doublon d'une meilleure source)* |
| INFO-044 | `texte_lignes` | **lignes de texte dans l'image** | photo |  | PIX | 0 | jamais posée : le navigateur ne lit pas le texte | 1 règles (Lecture) | pas_obtenue<br>*TRI : capture* |
| INFO-045 | `role` | **role** | photo |  | IA-P | compris | stabilité mesurée, pas l'exactitude ; réf. couple : le un site connu « satellite » | 56 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*ASS : héros ; TRI : poids* |
| INFO-046 | `sujet` | **sujet** | photo |  | IA-P | compris | plat 5 sur 5 juste (réf. couple) ; un cuisinier lu « lieu » | 103 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*ASS : paires, séries de sujet ; MEP : taille* |
| INFO-047 | `plan` | **plan** | photo |  | IA-P | compris | juste à l'œil sur une planche | 32 règles (Lecture, Tri, Récit, Assortiment, Mise en page) | obtenue_utilisee<br>*ASS : large et détail* |
| INFO-048 | `interet` | **interet** | photo |  | IA-P | compris | la note unique lui colle (corrélation 0,93) ; médiane par planche 0,56 à 0,77 | 4 règles (Lecture, Tri) | obtenue_utilisee<br>*TRI : note histoire (signal faible)* |
| INFO-049 | `candidate_pleine` | **candidate pleine** | photo |  | IA-P | compris | non mesurée | 0 règles () | obtenue_utilisee<br>*LEC : envoi au regard fin ; TRI : taille méritée* |
| INFO-050 | `personnes_vues` | **personnes vues** | photo |  | IA-P | compris | « groupe » écrasé à 3 (famille de 4 vue comme 3) | 0 règles () | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; remplacée par INFO-051* |
| INFO-051 | `personnes_nombre` | **personnes nombre** | photo |  | IA-P | compris | compte les passants : 5 photos sur 40 à « 7 » au réf. couple (foules) | 10 règles (Lecture, Récit, Mise en page, Revérification) | obtenue_utilisee<br>*obtenue mais FAUSSE à ce jour (voir INFORMATIONS.md) ; TRI : note gens ; PROJET : groupe* |
| INFO-052 | `nos_personnes` | **nos personnes** | photo | 0 à 6, 7 et plus | IA-P | quelques jetons | n'existe pas | 6 règles (Lecture, Tri, Assortiment) | pas_obtenue<br>*TRI : gens ; PROJET : groupe ; HAB : couverture (M-04)* |
| INFO-053 | `moment_journee` | **moment journee** | photo |  | IA-P | compris | 84 % d'accord avec le local | 25 règles (Lecture, Tri, Récit, Assortiment, Habillage) | obtenue_utilisee<br>*ASS ; HAB* |
| INFO-054 | `ambiance` | **ambiance** | photo |  | IA-P | compris | à mesurer | 10 règles (Récit, Assortiment, Mise en page, Habillage) | obtenue_utilisee<br>*LEC : profil ; HAB* |
| INFO-055 | `texte_lisible` | **texte lisible** | photo |  | IA-P | compris | 22 sur 161 | 24 règles (Lecture, Tri, Récit, Assortiment, Mise en page) | obtenue_utilisee<br>*LEC : envoi au regard fin* |
| INFO-056 | `a_ecarter` | **à laisser de côté** | photo |  | IA-P | compris | lecture douteuse quand plus de la moitié (M-13) | 4 règles (Lecture, Tri, Récit) | obtenue_utilisee<br>*TRI : réserve « à confirmer » seulement* |
| INFO-057 | `force_image` | **force image** | photo | 0 à 1 | IA-P | compris | non mesurée ; à confronter aux coups de cœur | 10 règles (Lecture, Tri, Assortiment, Mise en page, Revérification) | obtenue_utilisee<br>*TRI : note image* |
| INFO-058 | `pose_spontane` | **pose spontane** | photo |  | IA-P | compris | non mesurée | 3 règles (Tri, Assortiment) | obtenue_utilisee<br>*TRI : gens ; REC : jalons* |
| INFO-059 | `geste` | **geste** | photo | oui, non | IA-P | compris | non mesurée | 18 règles (Lecture, Tri, Récit, Assortiment, Habillage, Revérification) | obtenue_utilisee<br>*ASS : séquence ; TRI : histoire* |
| INFO-060 | `insolite` | **insolite** | photo | oui, non | IA-P | compris | non mesurée | 3 règles (Tri, Assortiment) | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; ASS : respiration, punctum (R-44)* |
| INFO-061 | `sujet_special` | **sujet special** | photo |  | IA-P | compris | « document » faux sur des tonneaux et des poupées (réf. couple) | 17 règles (Lecture, Tri, Mise en page, Revérification) | obtenue_utilisee<br>*TRI : hors sujet ; MEP : jamais en grand* |
| INFO-062 | `description` | **description** | photo |  | IA-P | compris | non mesurée | 0 règles () | obtenue_utilisee<br>*IA-V : lecture du voyage ; plus tard : chercher une photo par un mot* |
| INFO-063 | `lieu_lu` | **lieu lu** | photo | texte | IA-R | ≈ 0,0017 $ | réf. famille : 16 noms dont 4 enseignes ; réf. couple : 3 « sûrs » dont 2 enseignes | 12 règles (Lecture, Tri, Habillage, Revérification) | obtenue_utilisee<br>*REC, HAB : titres et légendes* |
| INFO-064 | `sorte_du_nom` | **sorte du nom** | photo |  | DED + étape des lieux | 0 à quelques jetons | l'étape ne tourne que sans GPS et pour « road trip » (C14) | 7 règles (Lecture, Récit, Assortiment, Habillage, Revérification) | obtenue_utilisee<br>*HAB : une enseigne n'est jamais un titre (J-03)* |
| INFO-065 | `plat` | **plat** | photo |  | IA-R | compris | 0 cas réf. famille | 9 règles (Lecture, Tri, Récit, Assortiment, Habillage) | obtenue_utilisee<br>*ASS : page table ; HAB : légende* |
| INFO-066 | `couverture_oui` | **couverture oui** | photo |  | IA-R | compris | 51 « oui » sur 61 : ne départage rien | 0 règles () | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; remplacée par INFO-067* |
| INFO-067 | `rang_couverture` | **rang couverture** | photo |  | IA (un appel) | ≈ 0,02 $ | presque ignoré (C9, C31) | 1 règles (Habillage) | obtenue_utilisee<br>*HAB : couverture (P7)* |
| INFO-068 | `type_couverture` | **type couverture** | photo |  | IA-R | compris | « couple » sur une seule personne, « groupe coupé » sur un couple (réf. couple) | 1 règles (Assortiment) | obtenue_utilisee<br>*obtenue mais FAUSSE à ce jour (voir INFORMATIONS.md) ; HAB : M-04* |
| INFO-069 | `expression` | **expression** | photo |  | IA-R | compris | peu fiable sur petits visages | 17 règles (Tri, Récit, Assortiment, Habillage) | obtenue_utilisee<br>*TRI : image ; MEP : jamais en grand si grimace subie* |
| INFO-070 | `yeux_fermes` | **yeux fermes** | photo |  | IA-R | compris | peu fiable sur petits visages | 9 règles (Lecture, Tri, Assortiment) | obtenue_utilisee<br>*MEP : ni grand ni couverture* |
| INFO-071 | `point_accroche` | **point accroche** | photo | oui, non | IA-R | compris | non mesuré | 2 règles (Tri) | obtenue_utilisee<br>*TRI : note image d'un paysage (S-011)* |
| INFO-072 | `regard_vers` | **regard vers** | photo |  | IA-R | compris | non mesurée | 21 règles (Lecture, Tri, Récit, Assortiment, Mise en page) | obtenue_utilisee<br>*MEP : recadrage (air du regard)* |
| INFO-073 | `conseil_recadrage` | **conseil recadrage** | photo |  | IA-R | compris | non mesurée | 0 règles () | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; MEP : la raison d'un rognage, en mots* |
| INFO-074 | `idee_mise_en_page` | **idee mise en page** | photo |  | IA-R | compris | répétitive | 0 règles () | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; aucune* |
| INFO-075 | `pays_lu` | **pays lu** | projet |  | IA-V | un appel | « vide » au réf. couple (l'IA ne recevait aucune ville) | 10 règles (Lecture, Habillage) | obtenue_utilisee<br>*HAB : titre ; REC* |
| INFO-076 | `type_voyage` | **type voyage** | projet |  | IA-V | non écrit | « circuit » juste au réf. couple, puis mal traduit (C15) | 18 règles (Lecture, Récit, Habillage) | obtenue_utilisee<br>*REC : thème* |
| INFO-077 | `qui` | **qui** | projet |  | IA-V | non écrit | « couple » juste au réf. couple | 49 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*obtenue en partie ; profil (seul « famille » est lu, pour la sobriété)* |
| INFO-078 | `profil_ia` | **profil ia** | projet |  | IA-V | non écrit | « couple » juste au réf. couple, jamais lu (le thème passe devant, C15) | 0 règles () | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; profil* |
| INFO-079 | `chapitres_ia` | **chapitres ia** | projet |  | IA-V | non écrit | coupe 3 journées sur 40 photos (réf. couple) ; titres creux | 1 règles (Récit) | obtenue_utilisee<br>*REC : un candidat parmi d'autres* |
| INFO-080 | `doutes_ia` | **doutes ia** | projet |  | IA-V | non écrit | « les villes réellement parcourues restent incertaines » | 0 règles () | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; LEC : questions à poser* |
| INFO-081 | `style_conseille` | **style conseille** | projet |  | IA-V | non écrit | juste au réf. couple (« grandes photos couleur, densité moyenne ») | 0 règles () | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; REGLAGES : indice d'école* |
| INFO-082 | `ville` | **ville** | photo |  | GEO | un appel par endroit arrondi | ses titres du réf. couple ont la forme du géocodage | 31 règles (Lecture, Récit, Assortiment, Mise en page, Habillage) | pas_obtenue<br>*REC : journées-lieux, chapitres ; HAB : titres* |
| INFO-083 | `region_pays` | **region pays** | photo |  | GEO | compris | non mesurée | 11 règles (Lecture, Habillage) | pas_obtenue<br>*REC ; HAB : titre de couverture* |
| INFO-084 | `lieu_nomme` | **lieu nomme** | photo |  | GEO | compris | non mesurée | 11 règles (Lecture, Tri, Récit, Mise en page, Habillage) | pas_obtenue<br>*HAB : titre de double, légende ; confirmer un panneau* |
| INFO-085 | `grande_ville` | **grande ville** | photo |  | GEO | compris | non mesurée | 0 règles () | pas_obtenue<br>*HAB : repli de titre* |
| INFO-086 | `trajet_distance` | **trajet distance** | projet |  | DED | 0 | non mesurée | 4 règles (Récit, Habillage) | pas_obtenue<br>*REC : ordre des étapes ; HAB : chiffres vrais* |
| INFO-087 | `lieu_prive` | **lieu prive** | photo |  | GEO + DED | 0 | MAC-2934 | 1 règles (Habillage) | pas_obtenue<br>*HAB : jamais imprimé* |
| INFO-088 | `panneau_confirme` | **panneau confirme** | photo | oui, non | DED (INFO-063 + INFO-084) | 0 | n'existe pas | 3 règles (Tri, Revérification) | pas_obtenue<br>*HAB : un nom lu devient titre seulement s'il est confirmé (J-03)* |
| INFO-089 | `doublon_de` | **doublon de** | ensemble |  | DED | 0 | fiable | 4 règles (Lecture, Tri, Revérification) | obtenue_utilisee<br>*TRI : écart* |
| INFO-090 | `pile` | **groupe de photos presque pareilles** | ensemble |  | DED | 0 | 0 rafale sur des lots déjà triés | 6 règles (Lecture, Tri, Assortiment, Mise en page, Habillage) | obtenue_utilisee<br>*TRI : élue* |
| INFO-091 | `serie_type` | **serie type** | ensemble |  | DED (+ geste) | 0 | non éprouvé | 50 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*TRI : combien on garde ; ASS : forme* |
| INFO-092 | `similaires` | **similaires** | ensemble |  | DED | 0 | non mesurée | 2 règles (Lecture, Tri) | obtenue_utilisee<br>*ASS : variété* |
| INFO-093 | `moment` | **moment** | ensemble |  | DED | 0 | 39 moments (réf. famille), 27 (réf. couple) ; 2 h 05 coupe une matinée (C4) | 54 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage) | obtenue_utilisee<br>*REC ; ASS : une double = un moment* |
| INFO-094 | `jour` | **jour** | ensemble |  | DED | 0 | exact | 46 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*REC* |
| INFO-095 | `journee_lieu` | **journee lieu** | ensemble |  | DED (INFO-001 + INFO-082) | 0 | n'existe pas | 2 règles (Assortiment, Revérification) | pas_obtenue<br>*REC : unité qu'on ne coupe pas (J-01) ; ASS* |
| INFO-096 | `jour_fort` | **jour fort** | ensemble |  | DED | 0 | au réf. couple 2 photos suffisent | 1 règles (Habillage) | obtenue_utilisee<br>*HAB : titre (N-53) ; REC : ouverture* |
| INFO-097 | `densite_de_prise` | **densite de prise** | ensemble |  | DED | 0 | exacte | 1 règles (Tri) | obtenue_utilisee<br>*obtenue en partie ; ASS : densité ; REC : sommet (R-40)* |
| INFO-098 | `ecart_voisines` | **ecart voisines** | ensemble |  | DED | 0 | non mesurée | 2 règles (Lecture) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; TRI : séquence* |
| INFO-099 | `seule_trace` | **seule trace** | ensemble |  | DED | 0 | exacte | 3 règles (Lecture, Récit, Assortiment) | obtenue_utilisee<br>*TRI : ne sort jamais (S-139)* |
| INFO-100 | `rang_dans_moment` | **rang dans moment** | ensemble |  | DED | 0 | non mesurée | 0 règles () | obtenue_utilisee<br>*ASS : héros* |
| INFO-101 | `paires_candidates` | **paires candidates** | ensemble |  | DED | 0 | non mesurée | 19 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*ASS : construire une double avec une raison* |
| INFO-102 | `serie_de_sujet` | **serie de sujet** | ensemble |  | DED (INFO-046 + INFO-082) | 0 | plats 5 sur 5 au réf. couple | 13 règles (Tri, Récit, Assortiment, Habillage, Revérification) | pas_obtenue<br>*REC : grande entorse (J-04)* |
| INFO-103 | `position_dans_livre` | **position dans livre** | ensemble |  | DED | 0 | exacte | 0 règles () | obtenue_utilisee<br>*REC : ouverture, sommet, fin* |
| INFO-104 | `chapitre_temporel` | **chapitre temporel** | ensemble |  | DED | 0 | 7 chapitres (réf. famille) | 0 règles () | obtenue_utilisee<br>*REC : repli sans voyage* |
| INFO-105 | `duree` | **duree** | projet |  | DED | 0 | exacte | 2 règles (Lecture, Récit) | obtenue_utilisee<br>*profil* |
| INFO-106 | `jours_photographies` | **jours photographies** | projet |  | DED | 0 | exacte | 3 règles (Lecture, Récit) | obtenue_utilisee<br>*profil ; chapitres* |
| INFO-107 | `nombre_photos` | **nombre photos** | projet |  | DED | 0 | exacte | 4 règles (Tri, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*profil (gros lot) ; taille* |
| INFO-108 | `part_visages` | **part visages** | projet |  | DED | 0 | sous-compte : 11 % et 14 % sur deux albums où l'on voit beaucoup de gens | 0 règles () | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; profil* |
| INFO-109 | `part_trois_visages` | **part trois visages** | projet |  | DED | 0 | même réserve | 1 règles (Mise en page) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; profil (fête, groupe)* |
| INFO-110 | `part_nuit` | **part nuit** | projet |  | DED | 0 | non mesurée | 2 règles (Récit, Habillage) | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; profil (fête)* |
| INFO-111 | `part_portrait` | **part portrait** | projet |  | DED | 0 | non mesurée | 0 règles () | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; profil ; format* |
| INFO-112 | `part_paysages_details` | **part paysages details** | projet |  | DED | 0 | non mesurée | 0 règles () | pas_obtenue<br>*calculée au banc seulement, absente de l'éditeur et du compositeur ; profil (long voyage)* |
| INFO-113 | `villes_pays` | **villes pays** | projet |  | DED (INFO-082) | 0 | non mesurée | 1 règles (Habillage) | pas_obtenue<br>*profil ; thème (circuit)* |
| INFO-114 | `lot_trie` | **lot trie** | projet |  | DED | 0 | « oui » sur l'réf. famille | 3 règles (Tri, Mise en page) | obtenue_utilisee<br>*TRI : garder presque tout (M-09)* |
| INFO-115 | `groupe_du_projet` | **groupe du projet** | projet |  | Q-CLI, sinon DED | 0 | 7 pour un couple (réf. couple, C17) ; 3 pour une famille de 4 (réf. famille) | 5 règles (Lecture, Tri, Récit, Assortiment) | obtenue_utilisee<br>*obtenue mais FAUSSE à ce jour (voir INFORMATIONS.md) ; TRI : gens ; HAB : couverture (M-04) ; REC : fin* |
| INFO-116 | `profil` | **profil** | projet |  | DED, Q-AT | 0 | « famille » pour un couple (réf. couple, C15) | 65 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*obtenue mais FAUSSE à ce jour (voir INFORMATIONS.md) ; REGLAGES* |
| INFO-117 | `theme` | **theme** | projet |  | DED, Q-AT | 0 | non mesurée | 18 règles (Lecture, Récit, Habillage) | obtenue_utilisee<br>*REC : découpe et noms* |
| INFO-118 | `palette_du_lot` | **palette du lot** | projet |  | DED | 0 | non mesurée | 11 règles (Mise en page, Habillage) | obtenue_utilisee<br>*HAB : nuancier* |
| INFO-119 | `pages_commandees` | **pages commandees** | projet |  | commande | 0 | exacte | 2 règles (Récit, Revérification) | obtenue_utilisee<br>*REC : taille (D20 : payée et gelée)* |
| INFO-120 | `photos_retouchees` | **photos retouchees** | projet |  | PIX | 0 | non mesurée | 3 règles (Mise en page, Habillage) | pas_obtenue<br>*HAB : garder son look (Notion ch.4)* |
| INFO-121 | `occasion` | **occasion** | reponse |  | Q-CLI | 0 | démentie par les photos une fois sur le corpus (« été indien » pour un Noël) | 6 règles (Lecture, Récit, Habillage) | obtenue_utilisee<br>*LEC : thème deviné (faible) ; IA-V* |
| INFO-122 | `histoire` | **histoire** | reponse |  | Q-CLI | 0 | non mesurée | 4 règles (Lecture, Habillage) | obtenue_gardee<br>*gardée pour l'atelier (M-56 : une information lue n'est plus retirée faute d'usage) ; IA-V : chapitres, ton* |
| INFO-123 | `titre_client` | **titre client** | reponse |  | Q-CLI | 0 | non mesurée | 2 règles (Habillage, Revérification) | obtenue_utilisee<br>*HAB : couverture, page 1* |
| INFO-124 | `combien_etiez_vous` | **combien etiez vous** | reponse |  | Q-CLI (Q-C01) | 0 | non mesurée | 2 règles (Lecture, Habillage) | obtenue_utilisee<br>*PROJET : groupe* |
| INFO-125 | `lieux_a_ne_pas_oublier` | **lieux a ne pas oublier** | reponse |  | Q-CLI (Q-C02) | 0 | non mesurée | 3 règles (Récit, Habillage) | obtenue_utilisee<br>*REC : chapitres, noms* |
| INFO-126 | `photos_preferees` | **photos preferees** | reponse |  | Q-CLI (Q-C03) | 0 | non mesurée | 11 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*TRI : coup de cœur ; MEP : grand* |
| INFO-127 | `theme_saisi` | **theme saisi** | reponse |  | Q-AT | 0 | non mesurée | 0 règles () | obtenue_utilisee<br>*REC* |
| INFO-128 | `ambiance_saisie` | **ambiance saisie** | reponse |  | Q-AT | 0 | non mesurée | 10 règles (Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*REGLAGES : sobriété* |
| INFO-129 | `moment_le_plus_important` | **moment le plus important** | reponse |  | Q-AT | 0 | non mesurée | 0 règles () | pas_obtenue<br>*REC : sommet* |
| INFO-130 | `lieux_a_ne_pas_montrer` | **lieux a ne pas montrer** | reponse |  | Q-AT ou Q-CLI | 0 | non mesurée | 2 règles (Lecture, Récit) | pas_obtenue<br>*TRI, REC : retirer un lieu (Av #11)* |
| INFO-131 | `pays_corrige` | **pays corrige** | reponse |  | COR | 0 | non mesurée | 0 règles () | obtenue_utilisee<br>*HAB : titre* |
| INFO-132 | `profil_corrige` | **profil corrige** | reponse |  | COR | 0 | non mesurée | 0 règles () | obtenue_utilisee<br>*REGLAGES* |
| INFO-133 | `chapitres_renommes` | **chapitres renommes** | reponse |  | COR | 0 | non mesurée | 0 règles () | obtenue_utilisee<br>*HAB* |
| INFO-134 | `taille_choisie` | **taille choisie** | reponse |  | COR | 0 | non mesurée | 1 règles (Tri) | obtenue_utilisee<br>*REC* |
| INFO-135 | `marques` | **marques** | reponse |  | COR | 0 | exactes | 20 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*TRI : priment (M-13, M-27)* |
| INFO-136 | `tags_corriges` | **étiquettes corriges** | reponse |  | COR | 0 | exactes | 0 règles () | obtenue_utilisee<br>*LEC : remplacent la lecture* |
| INFO-137 | `plaintes` | **plaintes** | reponse |  | COR | 0 | non mesurée | 0 règles () | pas_obtenue<br>*apprentissage : plaintes par règle* |
| INFO-138 | `ecarts_a_la_proposition` | **ecarts a la proposition** | reponse |  | COR | 0 | non mesurée | 3 règles (Tri, Habillage, Revérification) | pas_obtenue<br>*apprentissage (M-30)* |
| INFO-139 | `note_technique` | **note technique** | photo |  | DED | 0 | non mesurée | 8 règles (Tri) | obtenue_utilisee<br>*TRI* |
| INFO-140 | `note_histoire` | **note histoire** | photo |  | DED | 0 | non mesurée | 14 règles (Tri, Récit, Habillage) | obtenue_utilisee<br>*TRI ; REC* |
| INFO-141 | `note_image` | **note image** | photo |  | DED | 0 | non mesurée | 26 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*TRI : taille méritée ; ASS : héros* |
| INFO-142 | `note_gens` | **note gens** | photo |  | DED | 0 | fausse si le groupe est faux | 25 règles (Tri, Récit, Assortiment, Mise en page) | obtenue_utilisee<br>*TRI ; ASS* |
| INFO-143 | `note_unicite` | **note unicite** | photo |  | DED | 0 | non mesurée | 6 règles (Tri) | obtenue_utilisee<br>*TRI : ordre de sortie* |
| INFO-144 | `taille_meritee` | **taille meritee** | photo |  | DED | 0 | non mesurée | 0 règles () | obtenue_utilisee<br>*ASS ; MEP* |
| INFO-145 | `statut_raison` | **statut raison** | photo |  | TRI | 0 | non mesurée | 17 règles (Tri, Récit, Assortiment, Habillage, Revérification) | obtenue_utilisee<br>*tous ; Analyse (M-02)* |
| INFO-146 | `roles_structure` | **roles structure** | photo |  | DED | 0 | non mesurée | 46 règles (Lecture, Tri, Récit, Assortiment, Mise en page, Habillage, Revérification) | obtenue_utilisee<br>*REC* |
| INFO-147 | `groupe_complet` | **groupe complet** | photo |  | DED (115 + INFO-052) | 0 | faux quand le groupe est faux | 3 règles (Lecture, Tri, Assortiment) | obtenue_utilisee<br>*obtenue mais FAUSSE à ce jour (voir INFORMATIONS.md) ; HAB : couverture ; REC : fin* |
| INFO-148 | `image_au_revoir` | **image au revoir** | photo |  | DED (047, 046, 054, 103) | 0 | n'existe pas | 2 règles (Récit) | pas_obtenue<br>*REC : fin (J-06)* |
| INFO-149 | `placement_ressemblance` | **placement ressemblance** | photo |  | DED | 0 | une photo mal rangée sur l'réf. famille | 2 règles (Tri) | obtenue_utilisee<br>*REC ; doute avoué* |
| INFO-150 | `part_par_sujet` | **part par sujet** | projet | 0 à 1 par sujet | DED | 0 | celle du sujet lu par photo (INFO-046) | 1 règles (Récit) | pas_obtenue<br>*REC : un sujet très présent reste dans l'histoire (M-37) ; profil* |
| INFO-151 | `profil_de_sujets` | **profil de sujets** | projet | le sujet dominant ou aucun | DED | 0 | non mesurée | 0 règles () | pas_obtenue<br>*profil, à l'atelier d'abord (M-37)* |
