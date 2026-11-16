# L'éditeur de mise en page : l'historique

`/admin/atelier/mise-en-page`, du 27/10 au 16/11/2026. Écrit le 16/11 depuis le code et git (main 048c10c9), pas depuis les notes.

Comment lire :
- Les dates sont celles de la FUSION dans `main` (heure UTC de GitHub). Une PR contient souvent du travail des jours d'avant : c'est dit dans la ligne.
- Le statut est celui d'aujourd'hui (16/11) : **actif**, **remplacé** (par quoi, depuis quand), **retiré**, **derrière un interrupteur**, **jamais branché**. Tout statut autre qu'« actif » a sa preuve : un fichier et une ligne, ou la PR.
- Aucun fichier de l'éditeur n'a jamais été supprimé de `main` (`git log --diff-filter=D` est vide), et jusqu'à la vague 1 rien n'était dans `archive/` ; depuis, le pré-tri y est rangé (`archive/pretri-2026-11/`, déplacé, pas effacé). « Retiré » veut donc dire « n'apparaît plus à l'écran » ou « rangé dans `archive/` », jamais « effacé ».

---

## 1. L'éditeur au 16/11

Tout ce qui suit est en production sur bellajour.fr. Admin seulement : aucune cliente ne voit cet outil.

La vague 1 du 16/11 (#367, en production) change cinq points de ce qui suit : le
pré-tri disparaît, la couverture met ses photos en tête, la grille devient une vraie grille de mise en page, trois gabarits à aplat
sortent du tiroir, et « Texte » ajoute un titre à sa place. Le détail est au §2, « 16/11, vague 1 ».

### Photos et tri
- Importer ses photos en création libre (bouton ou glisser). Elles restent dans ce navigateur.
- Ouvrir les photos d'un dossier client (le dossier est lu, rien n'y est écrit).
- Quatre marques : coup de cœur (F), gardée (P), réserve (R), écartée (X). Une photo posée devient gardée.
- Trois tours : Écarter, Choisir, Finale. Étiquettes Couverture, Double page, Pleine page. Colonne « À côté ».
- Plein écran du tri, une photo en original avec loupe à 100 %, comparer deux photos ou plus.
- Étiquettes sur les vignettes : floue, doublon, rafale, similaire, sombre, brûlée, capture, visage flou, avec visages. Filtres « Ce que la machine a vu ». Rien n'est jamais supprimé.
- Pré-trier : la machine propose des marques avec leur raison. Un bouton Annuler défait tout.
- Carte de chaleur et visages détectés (touche L). On compte les visages, on ne reconnaît personne (D29).
- Lecture IA chargée par « Premier jet » : rôles, groupes, rafales à garder, captures lues, lieux. Rien n'entre dans le magazine sans geste.
- Grouper par jour, moment ou lieu. Date entière sélectionnable.

### Gabarits et pose
- 4 doubles de l'annexe, 54 gabarits tirés de Pinterest, 2 062 gabarits de page générés, des doubles générées, puis les grilles de secours. R fait défiler, le tiroir en montre 40 puis « Plus ».
- Poser un groupe en doubles neuves, lâcher des photos sur le chemin de fer, séparer, passer en double.
- Recadrage qui suit les visages et la zone utile, rien dans le pli. Un seul calcul pour l'écran, le PDF et l'IDML.
- Cadres libres (poignées, Ajuster, calques), miroir, enregistrer un gabarit, aimant avec guides.
- Hésitation : deux photos dans un cadre, comparaison à côté, seule celle de devant est exportée.
- Pastille de définition (dpi) : vert dès 300, orange, rouge sous 200. Haute définition tirée de l'original.
- Grille d'artiste (touche O) : tiers, nombre d'or, diagonales. Écran seulement.

### Couverture
- La couverture à plat dans l'éditeur : 4e, dos avec sa largeur, 1re. 11 gabarits.
- Le mot-titre prend au moins 60 % de la 1re. Le dos se calcule d'après les pages payées et la finition, ou se saisit à la main (1 à 20 mm).
- Elle part en plus de l'intérieur, en IDML et en PDF.

### Style et couleurs
- Feuille de style : 18 paires de polices fermées, trois niveaux de texte, tout le magazine suit, couverture comprise.
- Nuancier de six rôles proposé d'après les photos. Titre ajusté, jamais coupé (plancher 14 pt, alerte avant l'export).
- Fond de couleur sur n'importe quelle page ou double. Couleur de chaque texte. Quatre combos tirés des photos, plus ceux de la lecture IA. Annuler défait.
- Typographie française : les signes sont corrigés à l'affichage et à l'export, jamais dans le texte gardé.

### Textes et lieux
- Titres, textes et légendes dans les cadres. Un cadre de texte vide n'est jamais exporté.
- Le lieu des photos remplace un titre non écrit, à l'écran et à l'export. Lieux détaillés proposés par Geoapify (rien n'est écrit).
- Faits proposés en écrivant un titre : jour, moment, heure, nombre de photos.

### Exports
- Canva : un PDF (216 × 303 pour la page 1, 426 × 303 pour les doubles, polices embarquées sous un style). Mémorisé comme sortie par défaut.
- Affinity : un zip IDML + Links, fidèle à ce qu'Affinity relit (D28).
- La couverture sort à part, en IDML et en PDF.
- Un contrôle avant export liste les photos floues, les visages dans le pli, les titres trop longs, les photos introuvables.
- La dernière page est une page gauche seule : le nombre de pages est toujours pair.

### Sauvegarde et historique
- Sauvegarde automatique sur le serveur (depuis le 02/11), sinon sur ce Mac. Un verrou évite d'écraser une version plus neuve.
- Annuler et Rétablir, jusqu'à 200 gestes. Cet historique n'est pas dans la sauvegarde.
- Les gestes contraires à la machine deviennent des leçons (base, sinon l'appareil). À l'export, un instantané du magazine part dans `mep_instantanes` (jamais de pixels).
- Charger un « premier jet » : un magazine composé hors de l'éditeur, relié aux photos par leur nom de fichier, une seule entrée d'historique.

---

## 2. La chronologie

### 27 au 29/10 : la naissance (PR #343, fusionnée le 29/10)
| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| L'éditeur interne | Un écran pour composer : chemin de fer, pose des photos, textes, recadrage identique à l'export | actif |
| L'export IDML pour Affinity | Un zip que tu ouvres dans Affinity. Calque 1, texte en français, profil FOGRA39, photos de téléphone droites (rotation EXIF), cadre au pli décollé de 0,01 pt | actif |
| 4 doubles de l'annexe + 54 gabarits des épingles Pinterest (37 doubles, 17 pages) | Un premier catalogue, avec aplats, bords blancs, coins arrondis | actif (`epingles.ts`, `templates.ts`) |
| Les grilles de secours | Quand aucun gabarit ne va, une grille calculée | actif, en dernier recours (`magazine.ts`, ligne 262) |
| Sauvegarde partagée côté serveur | Écrite le 27/10. Migration 20261027 appliquée par toi le 02/11 | actif depuis le 02/11. Avant : sauvegarde locale seule |
| Dossier d'export fixe, sous-dossier du projet créé à l'export | Plus de chemin à retaper | actif |
| Page Projets, lecture des photos d'une édition | Ouvrir un dossier client ou une création libre | actif. Les projets d'Éditions collectives n'y sont lus que si `COLLECTIF_OUVERT` (`projets.ts`) |

### 29/10
| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Importer ses photos en création libre (#344) | Bouton « Importer » et glisser. Les photos restent dans le navigateur | actif |

### 30/10
| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Photo à l'envers (EXIF 3) droite dans Affinity (#345) | Une photo retournée de 180° n'arrive plus à l'envers | actif |

### 31/10
| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Lot 1 : doubles neuves et emplacements ×n (#346) | « Poser » sur un groupe crée les doubles (12 photos au plus), lâcher sur le chemin de fer, clic sur ×n pour aller aux emplacements | actif |

### 02/11 (trois PR)
| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Le tri, lot 2 (#347) | Quatre marques, écran de tri plein fenêtre, original et loupe, comparer, date entière, bouton Retour, jauge d'objectif. Travail du 31/10 | actif |
| Les cinq onglets du tri (Toutes, À trier, Gardées, Réserve, Écartées) (#347) | Le premier découpage du tri | **remplacé** le 06/11 par les trois tours (#350) |
| `photosParPage` | La première idée de l'objectif de photos | **remplacé** par `tri.visees` dès ce lot (`magazine.ts`, ligne 79) |
| L'hésitation, lot 3 (#348) | Deux photos dans un cadre, comparaison à côté de la double (T, flèches), seule celle de devant est exportée | actif (`Hesitation.tsx`, branché ligne 23 d'`EditeurMagazine.tsx`) |
| Lot 4 (#349) | Miroir d'une double (M), sélection multiple, pose en libre, poignées, Ajuster, calques, enregistrer comme gabarit (migration 20261103 appliquée) | actif. « Enregistrer comme gabarit » jamais essayé en vrai (voir §4) |

### 06/11
| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Tri en trois tours (#350) | Écarter, Choisir, Finale, seulement en grand écran. Étiquettes Couverture, Double page, Pleine page. Colonne « À côté » par jour. Menu ⋯ par-dessus tout. « Séparer » sous le titre du tiroir | actif (`TriBulles.tsx`, lignes 28 à 32). Remplace les cinq onglets |
| Barre latérale « Toutes » / « À côté » | Les écartées restent à leur place par défaut | actif |

### 07/11
| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| L'aimant (#351) | Pendant un glisser, les cadres s'accrochent aux centres, marges et autres cadres. ⌘ le coupe | actif |
| Filtre « Tous / Avec texte / Sans texte » pour R et le tiroir (#351) | R ne parcourt que la famille choisie | actif. Peu utile : peu de gabarits ont du texte |

### 09/11
| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Haute définition, pastille dpi (#352) | Planche tirée de l'original, dpi du cadre actif | actif. Seuils 200 et 300 à confirmer (`outils.ts`, lignes 59 à 61) |
| Gabarit qui coupe le moins | La note pèse les grandes coupes | actif |
| Grouper par moment ou lieu, le lieu dans les textes (#352) | Séjours de la bibliothèque, titre non écrit = lieu des photos | actif. Dépend de la clé Geoapify (sans clé : l'écran se tait) |

### 11/11
| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Export PDF pour Canva (#353) | Un PDF d'un clic : page 1 en 216 × 303, doubles en 426 × 303, photos recadrées comme à l'écran | actif. N'a rien retiré : l'export Affinity est resté. La feuille d'export propose les deux (`ExportFeuille.tsx`, ligne 137), Canva par défaut |

### 12/11 (six PR, le plus gros jour)
| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Lot A : les piles (#356) | Floues, rafales, doublons repérés, la plus nette dessus. Travail du 09/11 | actif |
| Lot A : la lecture visible (#356) | Étiquettes sur les vignettes, filtres « Ce que la machine a vu ». Né du retour du 10/11 : « rien de ce que la machine voyait n'était visible » | actif |
| Lot A : visages détectés, carte de chaleur (L), recadrage par le contenu, rien dans le pli (#356) | La photo ne coupe plus un front, rien d'important au pli | actif. Le pli de 5 mm est une HYPOTHÈSE (`C05`) |
| Lot A : la mémoire (#356) | Réglages versionnés, leçons de tes gestes contraires, instantané à l'export (migration 20261110 appliquée) | actif |
| Lot A : le pré-tri, les trois questions, le contrôle avant export (#356) | Marques proposées avec raison, équité, horloges recalées, faits en écrivant un titre | actif. Pour les rafales, la lecture IA prime depuis le 14/11 |
| Lot 0 (#357) | Rien de visible : la sauvegarde accepte des clés facultatives, le projet connaît la finition et les pages payées | actif |
| Lot D : 2 062 gabarits de page générés (#358) | R et le tiroir proposent des découpes avec un nom, après les dessinés. Pénalités pour zone nue et chevauchement | actif (`genere.ts`) |
| Lot D : la grille d'artiste (#358) | Touche O : tiers, nombre d'or, diagonales | actif sur les planches. Absente de la couverture |
| Lot B : la couverture (#359) | 4e, dos, 1re à l'écran. 11 gabarits CV-01 à CV-11. Dos calculé, papier brillant si la finition n'est pas choisie. Export couverture IDML + PDF. Essai Affinity fidèle | actif |
| Lot C : la feuille de style (#360) | 18 paires de polices, nuancier de six rôles d'après les photos, polices embarquées dans le PDF, nommées dans l'IDML, titre ajusté | actif. Voir §3 pour le terracotta |
| Lot R : les défauts de la recette croisée (#361) | Cadre de texte vide jamais imprimé, gabarits générés aussi pour les doubles (`genereDouble.ts`), questions lisibles, légendes distinctes, R après un dépôt, un seul Échap, 18 paires visibles | actif |

### 14/11
| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Lot E : la dernière page seule (#362) | Une page gauche seule en fin de magazine, nombre de pages toujours pair. Les anciens magazines reçoivent une dernière page vide à l'ouverture | actif. **Essai Affinity fait le 16/11 : FIDÈLE** (`DECISIONS.md`, D28) |
| Lot E : la tranche saisie (#362) | Le dos se tape au centième de mm et remplace le calcul jusqu'à « Effacer ». L'écran dit lequel sert | actif |
| Lot E : le premier jet (#362) | Bouton « Premier jet » du panneau Photos : charge un magazine composé hors de l'éditeur | actif, en création libre seulement |
| Lot F : la lecture IA dans le tri (#363) | Rôles, mises en avant, groupes duo/trio/combo, rafales à garder avec « Accepter », captures, lieu sûr proposé en premier. Aucune identité (D29) | actif, mais seulement si on charge un fichier de lecture |

### 16/11
| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Lot G : couleurs libres et combos (#364) | Fond de couleur sur une page ou une double, couleur de chaque texte, sélecteur avec pipette, quatre combos d'après les photos | actif. **Essai Affinity fait le 16/11 : FIDÈLE** (`DECISIONS.md`, D28) |

### 16/11, vague 1 (#367, en production le 16/11)
Tes retours du 16/11, premier temps. Rien n'est en production tant que la branche n'est pas fusionnée. Captures :
`design-explorations/editeur-lots-2026-11-14/recette/vague-1/`.

| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Le pré-tri retiré (T-210) | Plus de bouton « Pré-trier ». Les étiquettes et les filtres disent toujours floue, sombre, rafale, capture, visage flou | actif (#367, 16/11). Code, bouton et tests dans `archive/pretri-2026-11/` (README : pourquoi, comment le remettre)  |
| Les photos de couverture en tête (T-211) | Sur la couverture, la barre commence par « Pour la couverture » : tes photos étiquetées Couverture, puis les « Couv. » de la lecture IA, puis le reste | actif (#367, 16/11) |
| Une vraie grille (T-213) | Le bouton Grille ouvre un menu : Aucune, 6 × 6 (celle des gabarits, par défaut), 8 × 8, Artiste. Marges en magenta, modules en cyan, par page, couverture comprise. L'aimant s'accroche à la grille affichée | actif (#367, 16/11). Écran seulement, rien ne change à l'export (D28)  |
| Trois gabarits à aplat sortis du tiroir (T-209, premier temps) | E-D8c, E-D14a, E-D14b ne sont plus proposés ; leurs dispositions restent, sans fond : E-D8f, E-D14c, E-D14d. Le fond se pose en couleur libre. Un magazine qui s'en sert s'ouvre comme avant | actif (#367, 16/11). Reste la palette à glisser (vague 2)  |
| Ajouter un texte proprement (T-212, premier temps) | « Texte », à côté de « Fond » dans le tiroir : un titre dans la plus grande zone libre, aligné sur la grille ; sinon sur l'endroit calme d'une photo, jamais sur un visage, en blanc sur une photo sombre. Le survol montre où. Annuler le défait | actif (#367, 16/11). Reste les titres précis (vague 3)  |

### 16/11, vague 2, lot Palette (#369, en production le 16/11)
Ton retour du 16/11 (« les couleurs à côté du magazine, on les glisse sur le fond ou sur une typo, et ça fait des propositions »).
Captures : `design-explorations/editeur-lots-2026-11-16/recette/palette/`. Fiche C17.

| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| La palette à glisser (T-209, second temps) | Une colonne à droite de la planche : nuancier, couleurs des photos, libres, pastille barrée. On glisse une couleur sur une page (fond uni) ou un texte (sa couleur) ; la page se remplit pendant le survol ; Échap annule | actif (#369, 16/11) |
| Ce qui va avec | Après un fond : le texte qui s'y lit, la page d'en face du même combo, la même couleur (double unie). Après un texte coloré : le fond qui lui va. Un clic applique, Annuler défait | actif (#369, 16/11) |
| Le bouton « Fond » du tiroir retiré | La palette le remplace | actif (#369, 16/11). Code dans `archive/fond-tiroir-2026-11/`  |

### 16/11, vague 2 : lot Types (#370, en production le 16/11)
Ton retour du 16/11 : « une différence entre les templates qui sont du coup différents vraiment en termes de position et ceux qui
modifient un petit peu la taille d'une photo, un petit peu son orientation ». Captures : `design-explorations/editeur-lots-2026-11-16/recette/types/`.

| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Le tiroir par types (T-208) | Une vignette par DISPOSITION (où sont les photos les unes par rapport aux autres, la page qui porte quoi), le nombre de ses variantes dans un petit rond. Un clic sur le type posé ouvre ses variantes (même disposition, une photo plus grande, l'autre orientation, calée ailleurs). Un gabarit dessiné reste toujours en tête de son type. Une page de 2 photos de Merisa : 16 types au lieu de 406 gabarits | actif (#370, 16/11). Fiche C18, R170 à R179  |
| R par types, V par variantes (T-208) | R passe à la disposition suivante (plus à la même avec une case de plus) ; la nouvelle touche V passe à la variante suivante du type posé. « Poser » et le premier jet ne changent pas | actif (#370, 16/11) |
| Le catalogue des gabarits par types | Une section « Générés : les types » : 81 types pour les 2 062 pages générées | actif (#370, 16/11) |

### 16/11, vague 2, lot Signatures (#371, en production le 16/11)
Le goût de la vitrine du 14/11 (T-214). Rien n'est en production tant que la branche n'est pas fusionnée. Comparaisons « vitrine | éditeur » :
`design-explorations/editeur-lots-2026-11-16/recette/signatures/index.html`. Fiche C19, règles R180 à R185.

| Modification | Ce que ça change pour toi | Statut |
|---|---|---|
| Onze doubles signature (`SG-01` à `SG-11`) | Au tiroir et sous R, avec leurs noms tirés de la vitrine (« Le chiffre du jour », « La planche du jour », « Le pli dans l'eau », « Les tirages jetés »…) ; en tête quand elles conviennent aux photos | actif (#371, 16/11) |
| Les textes tirés des faits | Un titre ou une légende de signature montre le jour, l'heure, le mois et le lieu sûr, la période, tant que tu n'as rien écrit ; rien d'inventé | actif (#371, 16/11) |
| Le mot ou le chiffre géant | Il remplit son cadre, le même à l'écran, dans le PDF et dans l'IDML | actif (#371, 16/11) |
| Le fond proposé | Poser une signature à aplat pose son fond (couleur des photos) si la page n'en a pas ; Annuler le retire | actif (#371, 16/11) |
| L'ombre douce des tirages | Les tirages jetés ont une ombre, à l'écran, dans le PDF et dans l'IDML | actif (#371, 16/11), essai Affinity FIDÈLE |

Total : 37 modifications recensées, plus deux lignes qui notent un remplacement, en 20 PR fusionnées (#343 à #353 et #356 à #364 ; #354 et #355 du 12/11 ne touchent pas l'éditeur). Depuis : les cinq de la vague 1 (#367), les essais Affinity des lots E et G (#368, documentation), la vague 2 (#369 palette, #370 types, #371 signatures), toutes en production le 16/11.

---

## 3. Ce qui n'est plus actif

Rien n'a été supprimé. Voici ce qui a été remplacé, corrigé ou mis de côté.

| Quoi | Depuis quand | Remplacé par | Preuve |
|---|---|---|---|
| Les cinq onglets du tri (Toutes, À trier, Gardées, Réserve, Écartées) | 06/11 | Les trois tours Écarter, Choisir, Finale, et la barre Toutes / À côté | PR #350. `TriBulles.tsx`, lignes 28 à 32. « À trier », « Réserve » et « Écartées » ne restent que comme valeurs internes de filtre (`NOMS_ONGLETS`, ligne 25) |
| `photosParPage` (objectif en photos par page) | 02/11 | `tri.visees`, un total de photos visées | PR #347. `magazine.ts`, ligne 79 |
| L'aplat terracotta fixe `#bc977d` | 12/11, **seulement sous un style** | Les six rôles du nuancier, tirés des photos | PR #360. `nuancier.ts` lignes 189 à 195 : le terracotta devient le rôle « aplat sourd » du nuancier d'origine. Un magazine SANS style garde le terracotta au bit près (`style.ts`, ligne 12). Il n'est donc pas mort |
| Les teintes `aplat`, `noir`, `blanc` des gabarits | 12/11 | Les rôles aplat sourd, nuit, papier. Les trois mots restent comme alias | `style.ts`, `roleDeTeinte`, utilisé par `idml.ts` ligne 215 et `pdf.ts` ligne 118 |
| La phrase « Une double n'a pas de gabarits générés » (R95) | 12/11 | Les gabarits de double `GD1-…` | PR #361. `genereDouble.ts`. La règle R95 n'a pas été relue (§4) |
| Un cadre de texte vide exporté (« TITRE », « Texte » imprimés) | 12/11 | Un cadre vide n'est jamais écrit | PR #361 (D2). `pdf.ts` et `idml.ts` |
| Un magazine à nombre de pages impair, sans dernière page | 14/11 | Dernière page gauche seule, nombre de pages toujours pair | PR #362. `magazine.ts` : `coteSeul` ligne 110, `avecDerniere` ligne 365, appelé à l'ouverture (`sauvegardeClient.ts`, ligne 323). La planche 0 (page droite seule) n'a PAS été remplacée : la dernière en est le pendant |
| Le dos toujours calculé | 14/11 | La saisie à la main, qui prime jusqu'à « Effacer » | PR #362. `Couverture.dosMm`, `couverture.ts` ligne 61. Le calcul sert toujours quand rien n'est saisi |
| La sauvegarde sur ce Mac seulement | 02/11 | La sauvegarde serveur (`mises_en_page`) | Migration 20261027 appliquée le 02/11. La sauvegarde locale sert encore de repli |
| Les trois gabarits d'épingles à aplat (E-D8c « Pleine + photomaton » sur fond noir, E-D14a et E-D14b « Aplats ») | 16/11, vague 1 (#367) | Le fond libre (#364), et leurs copies sans aplat E-D8f, E-D14c, E-D14d | `EPINGLES_RETIREES` (`epingles.ts`), écartés par `candidats` (`magazine.ts`) : ni tiroir, ni R, ni Poser. Toujours lisibles par `templateParId` : un magazine sauvegardé qui s'en sert s'ouvre avec ses aplats (harnais `verif-mep-vague-1.ts`). Les dix gabarits de couverture GARDENT leurs aplats : la couverture n'a pas de fond libre |
| Le pré-tri (bouton « Pré-trier », R84 à R88, couches C06 et C07) | 16/11, vague 1 (#367) | Rien à sa place : ce qu'il voyait de juste reste dans les étiquettes et les filtres (C03), les piles (C02) et la lecture IA (C14) | `archive/pretri-2026-11/` (`pretri.ts`, `BoutonPreTri.tsx`, `verif-pretri.ts`, README). Les leçons `pretri_renverse` restent lisibles et se produisent encore (premier jet, rafale acceptée). Ses réglages restent dans `reglages.ts` (les retirer changerait l'empreinte des leçons) |
| La grille d'artiste seule derrière O | 16/11, vague 1 (#367) | Le menu Grille : 6 × 6, 8 × 8, ou Artiste | La grille d'artiste n'est pas retirée : c'est la troisième option du menu (`GrilleArtiste.tsx`) |
| R qui passait au gabarit SUIVANT du classement (souvent le même avec une case de plus) | 16/11, vague 2, lot Types (#367) | R passe à la tête du TYPE suivant ; V aux variantes du type posé | `autreGabarit(…, quoi)`, `editeur/operations.ts` ; `rangerParTypes`, `typesGabarits.ts`. Le classement lui-même n'a pas bougé |
| L'export Affinity seul | 11/11 | Rien n'est retiré : Canva s'y est ajouté | PR #353. `ExportFeuille.tsx`, ligne 137 |
| Les grilles de secours | pas remplacées | Passent après les dessinés et les générés | `magazine.ts`, lignes 245 à 263 : « grilles de ce nombre » en dernier |

**Jamais branché** (le code existe, l'écran ne s'en sert pas) :
| Quoi | Depuis | Preuve |
|---|---|---|
| Les pastilles « Mag. N » (cette photo est déjà dans un autre magazine) et « Nouvelle » (photo récente) sur les vignettes | 29/10 | Affichées par `Panneau.tsx` lignes 356 et 357, mais `chargerCatalogue.ts` met toujours `autresMagazines: []` et `nouvelle: false` (lignes 144, 145, 168, 169). Le commentaire ligne 14 le dit |
| La place « Qualité » de la maquette du tri | 02/11 | Aucune trace dans `src/` (grep « Qualité » vide dans `[id]/`). La maquette du 28/10 la prévoyait |

**Derrière un interrupteur ou une clé :**
| Quoi | Condition | Preuve |
|---|---|---|
| Les projets des Éditions collectives dans la liste | `COLLECTIF_OUVERT` | `page.tsx` ligne 29, `projets.ts` |
| Les lieux détaillés | clé Geoapify | Route `lieux` : sans clé, 503 `sans_cle`, l'écran se tait |
| La pipette | navigateur qui connaît `EyeDropper` (Chrome) | `Nuances.tsx`, ligne 18 |
| La lecture IA | un fichier chargé par « Premier jet » | `lectureIA.ts` |

---

## 4. Ce qui n'a pas été essayé ou reste fragile

**Fusionnés sans essai Affinity, puis essayés le 16/11 (D28) : FIDÈLES.** Tu avais donné l'ordre de fusionner sans l'essai ; le 16/11, tu as autorisé
l'écriture des fichiers d'essai sur ton Bureau, et Affinity les a relus sans écart.
- **Lot E, dernière page seule** (#362). Affinity relit 4 pages, la dernière seule, à gauche du pli, chaque cadre au centième de mm, aucune image étirée.
- **Lot G, couleurs libres** (#364). Les fonds (page, double en un seul rectangle, page gauche seule) et les couleurs de texte arrivent aux valeurs exactes, sous
  style comme sans style, et sur la couverture.
- Fichiers : `~/Desktop/Bellajour/test-idml/derniere-lot-e` et `couleurs-lot-g`. Détail valeur par valeur : `DECISIONS.md`, D28, « Essais du 16/11/2026 ».
- **Lot Signatures, ombre douce des tirages** (vague 2, 16/11) : essayée AVANT la fusion, le même jour. Cinq tirages tournés, à bord blanc, chacun avec son ombre : relus mode Produit, 35 %, flou 5 mm, décalage 2 mm vers le bas, noire ; angles et contours exacts ; le chiffre géant au corps calculé. Fichiers : `test-idml/signatures`.

**Jamais vu en vrai.**
- **La pipette** (lot G) : jamais essayée dans un vrai navigateur. Elle n'existe que dans Chrome (`Nuances.tsx`, ligne 18) : ailleurs, elle ne s'affiche pas.
- **« Enregistrer comme gabarit »** (lot 4) : jamais cliqué, il créerait un vrai gabarit.
- **La haute définition sur une prévisualisation** : on ne sait pas si le stockage R2 l'autorise pour les adresses `*.vercel.app` (CORS). Elle marche sur bellajour.fr.
- **Aucune paire de polices n'a été imprimée.** Les 18 restent « proposées » (R-T-24).
- **Les polices du catalogue ne sont pas installées sur ton Mac** : Affinity les remplace à l'ouverture (la feuille d'export le dit). Décision 4 du 12/11 : non faite.

**Fragile ou en attente de toi.**
- **La sauvegarde ne revient pas en arrière.** Un magazine qui porte une couverture, un style, une dernière page, un fond ou une couleur de texte n'est plus accepté par une version plus ancienne du site (`contenuValide`, `sauvegarde.ts` ligne 304). Aucun retour arrière à faire, juste à savoir.
- **Le pli de 5 mm, la limite d'encre, le dpi minimum** : hypothèses, en attente du mail à Cloudprinter (décision 23).
- **Réglages de départ non validés** : pénalités des gabarits générés (`MALUS_VIDE` 0,6, `MALUS_RUPTURE` 0,25), seuils de dpi, réglages du nuancier et des combos. Rien n'a changé sans ton oui.
- **Les cadres de la couverture ne se déplacent pas** (`gestesCouverture.ts` n'a aucun geste de déplacement). La grille y est depuis la vague 1 (#367), sans aimant puisque rien n'y bouge.
- **Les gabarits générés n'ont pas de zone de texte**, et aucune photo ne traverse le pli. Une page de 5 photos toutes en paysage n'a pas de gabarit généré (décision 25).
- **Interlignage** : Affinity relit toujours 120 %. Les titres empilés serrés se règlent à la main.
- **La lecture IA vit dans un navigateur.** Un autre Mac ne la voit pas tant qu'on ne l'y recharge pas. Le « premier jet » ne se charge qu'en création libre.
- **Le « premier jet » et la lecture IA se relient par le nom de fichier.** Deux photos de même nom se confondent.
- **25 décisions** du rapport du 12/11 attendent encore ta réponse (`design-explorations/editeur-lots-2026-11-12/RAPPORT.md`).
- **Des fiches du moteur étaient en retard sur le code** (C09, C13, C14, C15, R95) : corrigées le 16/11 avec cet historique.
- **À venir, jamais commencé** : la page Analyse, la sélection dans une rafale, les familles de gabarits notées, l'IA sur les textes.

---

## 5. Où on va

Tes retours du 16/11 sont devenus sept tickets (T-208 à T-214, dans `docs/backlog/`), tous vérifiés dans le code. Je les ai rangés en trois vagues.

**Vague 1 : tout de suite, des petits gestes qui enlèvent de la gêne.** En production le 16/11 (#367, voir §2) ; la grille par défaut est la 6 × 6 du moteur, la 8 × 8 est au menu.
- Retirer le bouton « Pré-trier » : la lecture IA fait mieux, et ses marques sont incompréhensibles. Le code part dans `archive/` (T-210).
- Sur la couverture, mettre en tête les photos choisies pour la couverture et les « Couv. » de la lecture IA (T-211).
- Une vraie grille, comme dans Affinity : marges, colonnes, lignes, gouttières, avec l'aimant. La grille 6 × 6 existe déjà dans le moteur, mais n'est jamais dessinée ; tu as dit « 8 par 8, je crois » : on tranche ensemble (T-213).
- Sortir du tiroir les trois gabarits à aplat, que le fond libre remplace. Ils restent lisibles pour les magazines déjà sauvegardés (T-209, premier temps). Les dix gabarits de couverture gardent leurs aplats tant que la couverture n'a pas de fond libre.
- Ajouter un texte proprement : dans une zone libre et calme, aligné sur la grille (T-212, premier temps).

**Vague 2 : le goût.** En production le 16/11 (#369 palette, #370 types, #371 signatures) ; reste ton essai à l'œil.
- Les gabarits « signature » tirés de la vitrine Merisa, les deux directions (T-214).
- Le tiroir rangé par TYPES de gabarits, les variantes de taille ou d'orientation rangées dessous (T-208).
- Une palette à côté du magazine : on glisse une couleur sur le fond ou sur un texte, et elle propose ce qui va avec (T-209, second temps).
- Les gestes qui manquent pour la vitrine, un par un, chacun essayé dans Affinity. Faits : photo à cheval sur le pli, mot géant ajusté, tirage tourné avec ombre douce (essai FIDÈLE), bande de photomaton (en couleur). Restent : le noir et blanc, l'écriture manuscrite, le détourage, l'alignement sur l'horizon, les deux couvertures de la vitrine (la couverture n'a pas de fond libre).

**Vague 3 : avec les vrais services.**
- Brancher la lecture sur un vrai dossier, côté serveur : OpenAI (rôles, rafales, captures, lieux) et le GPS avec Geoapify. Il faut ta clé et ton accord sur le texte de confidentialité (voir T-203, qui promet encore la reconnaissance des visages, contraire à D29).
- Des titres précis : le plat, le lieu nommé (« Mont Fuji », « BMW Welt »), des titres qui se répondent (T-212, second temps).
- Plus tard, le bouton « Composer » sur le site, testé sur un vrai dossier sans retoucher les règles.

**En attente de toi, sans urgence** : les 25 décisions du 12/11 et les décisions 2 à 15 du 13/11, l'effacement des empreintes de visages de la démo.
