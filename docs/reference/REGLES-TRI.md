# Règles du tri (Mise en page interne)

Validées sur la maquette du 31/10/2026 (`~/Desktop/Bellajour/maquette-mise-en-page/tri/`, harnais navigateur `verif-tri-v3.mjs`, 1 551 cas). Le code : `src/lib/mise-en-page/editeur/tri.ts` (pur) et `src/app/admin/atelier/mise-en-page/[id]/triEcran.ts` (écran).

Ce que la maquette DOIT faire. Toute différence est un défaut.

## Marques
- Cinq états exclusifs par photo (02/11) : aucune, coup de cœur (✦, F), gardée (★, P), réserve (◐, R), écartée (✕, X). Un coup de cœur compte comme gardée partout (onglet Gardées, jauge, Poser).
- **R1** P sur une photo déjà gardée RETIRE la marque (bascule), et le focus reste sur la photo.
  P sur une photo sans marque ou écartée la garde, puis le focus passe à la suivante de la liste filtrée.
- **R2** X : même règle que P avec « écartée ». Écarter une photo déjà écartée ne doit JAMAIS la ré-écarter.
- **R3** 0 / Retour arrière : retire la marque. Sur une photo sans marque : rien (aucune entrée d'historique, aucun bandeau « Annuler »).
- **R4** Les boutons ronds (vue une photo), les ronds au survol et les touches suivent la MÊME règle.
- **R5** Sélection de 2 photos ou plus : P garde toutes ; si TOUTES sont déjà gardées, P retire la marque de toutes. Idem X. 0 retire tout. La sélection se vide après le geste. La pastille (Garder, Écarter) suit la même règle.
- **R6** Le rond au survol d'une photo qui fait partie d'une sélection de 2+ agit sur toute la sélection ; sinon sur cette seule photo.
- **R7** Un geste qui ne change rien n'entre pas dans l'historique et n'affiche pas « Annuler ».

## Historique
- **R8** ⌘Z annule le dernier geste réel, ⇧⌘Z le rétablit ; un nouveau geste vide le « rétablir ». Le bouton « Annuler » du bandeau = ⌘Z.
- **R9** Après annulation, marques, compteurs, étiquettes et étoiles sont exactement ceux d'avant.

## Listes et compteurs
- **R10** Gardées + À trier + Écartées = Toutes, à tout moment.
- **R11** Le filtre « Toutes » montre aussi les écartées (grisées, étiquette « Écartée »). Une gardée porte une ★. Rien d'autre sur une vignette hors survol.
- **R12** Le focus est toujours sur une photo de la liste visible (ou aucune si la liste est vide). Quand la photo marquée sort du filtre, la suivante prend le focus (la précédente si c'était la dernière).
- **R13** Changer de filtre vide la sélection et met le focus sur la première photo.

## Vues et navigation
- **R14** G (T jusqu'au 02/11, rendu à l'hésitation) ou le bouton ⤢ : bande étroite ↔ plein écran (grille). Espace : grille ↔ une photo (depuis la bande étroite, ouvre directement une photo en plein écran). Double-clic sur une vignette : cette photo en grand.
- **R15** Échap, un cran à la fois : bulle ouverte → loupe → sélection → comparaison ou vue une photo → plein écran → bande étroite.
- **R16** ← → bornés (pas de débordement). ↑ ↓ en grille changent de rangée.
- **R17** Aucune touche n'agit pendant la saisie dans un champ ; Échap ou Entrée quittent le champ (Entrée n'y pose rien).
- **R18** Clic simple = focus seul ; ⇧-clic = plage depuis l'ancre ; ⌘-clic = ajoute ou retire une photo de la sélection.

## Objectif
- **R19** « Photos visées » : entier ≥ 1 seulement ; vide, 0, négatif ou décimal sont ignorés (l'ancienne valeur reste).
- **R20** La barre et « N gardées » suivent chaque geste, annulations comprises ; les parts par personne totalisent 100 % (arrondis près) dès qu'il y a une gardée.

## Composer pendant le tri (v3)
- **R21** Entrée (ou « Poser » de la pastille, ou glisser sur la planche) pose la cible (sélection 2+, sinon la photo au focus) sur la double en cours, 12 photos au plus par double. Les photos déjà sur cette double sont ignorées ; s'il n'y a rien de neuf : bandeau « Déjà sur cette double », rien dans l'historique. Double pleine : bandeau, rien posé. Trop de photos : les premières sont posées, les autres restent sélectionnées (« N restées »).
- **R22** Une photo posée devient gardée (★), même si elle était écartée, en réserve ou sans marque ; un coup de cœur le reste. Elle porte l'insigne de sa double (numéro) dans la grille.
- **R23** N crée une double juste après la double en cours avec la cible (12 au plus par double, parts égales : 13 photos → 2 doubles de 7 et 6), et elle devient la double en cours. Le « + » du chemin de fer crée une double à la fin (avec la sélection 2+ s'il y en a une). Glisser dans une fente du chemin de fer crée la double à cet endroit ; glisser sur une double du chemin de fer pose dessus.
- **R24** Le ✕ au survol d'un cadre de la planche retire la photo de la double (sa marque ne change pas).
- **R25** Poser, créer, retirer s'annulent et se rétablissent avec ⌘Z / ⇧⌘Z, dans le même historique que les marques (marques ET doubles reviennent ensemble).
- **R26** « Non posées » se combine avec le filtre de marque ; les compteurs des filtres en tiennent compte. La jauge affiche « N gardées · M posées sur V » (M = photos distinctes posées).
- **R27** C avec 2 photos sélectionnées ou plus ouvre la comparaison (une seule : un bandeau, rien d'autre) ; au-delà de 4, une planche contact où seule l'active charge son original ; ← → ↑ ↓ changent la photo active ; le bouton Retour vaut Échap ; P / X / 0 marquent l'active avec la règle de bascule R1 et R2 ; ⇧P garde l'active et écarte les autres ; Échap ou Espace reviennent à la grille avec ces photos encore sélectionnées.
- **R28** Z (ou clic sur la photo) en vue une photo ouvre la loupe 100 % ; Z, un clic ou Échap la ferment. Hors vue une photo, Z ne fait rien.
- **R29** U amène le focus sur la prochaine photo à trier (en reprenant au début s'il le faut) ; s'il n'y en a plus : bandeau « Tout est trié ».
- **R30** Un clic sur une case de la bande d'avancement (vue une photo) y amène le focus.
- **R31** Un clic sur le titre d'une date sélectionne toutes ses photos ; ⇧ ou ⌘ les ajoute à la sélection ; un second clic, quand elles y sont toutes, les retire.

## Maquette du 02/11 (tri v4)
- **R32** F (coup de cœur) et R (réserve) suivent la règle de bascule R1 dans la grille, en comparaison et sur la sélection.
- **R33** Vue une photo : P, X, R, F POSENT la marque (jamais de bascule) et le focus passe TOUJOURS à la suivante, même si la photo portait déjà cette marque. 0 retire.
- **R34** Onglets : Toutes, À trier, Gardées (coups de cœur compris), Réserve, Écartées. La réserve n'est plus « à trier ».
- **R35** Le plein écran prend toute la fenêtre, sans la barre du projet ; le bouton de gauche « Mise en page » ferme le tri, jamais le projet. Les doubles pages sont un tiroir fermé (D, ou le bouton) qui s'ouvre 2 s après Poser ou N.
- **R36** Le cœur du client (Éditions) s'affiche en rouge sur la vignette, en étiquette « Client » dans la vue une photo et la comparaison ; la puce « Client » ne montre que ses cœurs.
- **R37** Une sauvegarde d'avant le 02/11 (sans `coupsDeCoeur` ni `reserve`) reste valide ; ces listes ne s'écrivent que non vides.

## L'hésitation (lot 3, plan du 30/10, codé le 02/11)
- **R38** Pendant qu'on glisse UNE photo de la bibliothèque sur un cadre plein, un encart « Hésiter » apparaît dans son coin bas droit : lâchée dessus, la photo passe DERRIÈRE celle du cadre (lâchée ailleurs sur le cadre, elle remplace, comme avant). Elle devient gardée. Une photo déjà posée sur la même double est refusée (« Déjà sur cette double page »).
- **R39** Un cadre qui hésite porte l'étiquette dorée « 2 photos » avec la miniature de celle de derrière. Double-clic sur le cadre (ou l'étiquette, ou « Comparer » de sa barre) : les deux côte à côte dans une colonne À CÔTÉ de la double page (qui se réduit pour rester visible), celle de devant à gauche ; Échap ou ✕ ferme. Sans hésitation, le double-clic recadre toujours.
- **R40** T intervertit devant et derrière (chacune garde son recadrage), dans la confrontation ou sur la planche : le cadre actif s'il hésite, sinon la seule hésitation ouverte de la double (plusieurs : T ne fait rien, choisir le cadre d'abord).
- **R41** « Garder celle-ci » (ou ← / →) tranche : la gardée reste devant, l'autre reste NOTÉE derrière le cadre (étiquette grise « Tranchée ») et sa vignette porte « Hésitée ». « Hésiter encore » (barre du cadre) rouvre l'hésitation.
- **R42** Seule la photo de devant compte : export IDML, liens, ×n, « posées », bilans. Celle de derrière apparaît dans « photos non utilisées ».
- **R43** L'hésitation suit sa photo (échanger, déplacer, réordonner, changer de gabarit) ; quand la photo change de cadre, celle de derrière repart d'un recadrage neutre. Retirer la photo de devant retire aussi l'hésitation. Tout s'annule (⌘Z).

## Retours du 02/11 (soir)
- **R44** Sur la vignette, l'insigne de la double (▮▮ numéro) est en bas à gauche.
- **R45** La réserve s'affiche comme un simple trait (−) et ne change plus la couleur de la photo. Seule une photo déjà posée devient transparente.
- **R46** T ne sert plus qu'à l'hésitation, partout (bande des photos comprise) ; le plein écran du tri passe sur G.

## Lot 4 : étoffer sans gabarit neuf (plan du 02/11, codé le 03/11)
- **R47** Miroir : M, ou le bouton « ⇄ Miroir » au centre au-dessus de la double (à côté de « Passer en double page »). Deux pages : la gauche et la droite s'échangent, chaque page se retourne. Une double : elle se retourne autour du pli, et le reste quand on y ajoute ou retire une photo. Rien sur la planche 1. Une annulation.
- **R48** ⇧-clic sur un cadre l'ajoute à la sélection de cadres (ou l'en retire), sur la double affichée seulement. Suppr retire toute la sélection d'un coup ; glisser l'une d'elles les emmène toutes (une page, une double, une vignette du chemin de fer, la bibliothèque pour les retirer).
- **R49** Glisser TOUTES les photos d'une page ouvre la bande « Inverser miroir » au bord extérieur de l'autre page : lâchée dessus, c'est le miroir. Lâchées ailleurs sur l'autre page, elles s'y ajoutent.
- **R50** ⌥ tenu au lâcher : la photo se pose EN LIBRE, centrée sous le pointeur, à son format (80 mm de grand côté), par-dessus les autres, sans recomposer la page. Sans ⌥, rien ne change. L'aperçu le rappelle (« · ⌥ libre »). Une photo de la double lâchée en libre sur sa propre page y déplace son cadre.
- **R51** Le cadre actif porte huit poignées et une poignée de déplacement au centre (ou ⌥ + glisser le cadre). Les coins gardent le format, ⇧ le libère. Jamais au-delà du pli, du fond perdu (3 mm), ni sous 10 mm. Une seule annulation par geste.
- **R52** « Ajuster » (barre du cadre) : le cadre prend le format de sa photo, même centre, même surface ; la photo entière se voit (recadrage neutre).
- **R53** « Position » (barre du cadre, dès qu'il y a deux cadres) : Devant, Avancer, Reculer, Derrière ; ⌘] ⌘[ (⌥ pour tout devant ou tout derrière), ou ⌘↑ ⌘↓. L'ordre des calques est celui de l'export Affinity ; le cadre actif garde son rang à l'écran.
- **R54** Une page retouchée garde ses cadres : retirer une photo n'enlève que son cadre. Ajouter une photo sans ⌥, changer de gabarit ou R la recomposent. Sa pastille porte un point bleu ; le tiroir propose « Remettre le gabarit ».
- **R55** « Enregistrer comme gabarit » (tiroir d'une page retouchée) : la page telle qu'on la voit devient un gabarit pour tous les projets, nommé « Page · 3 photos · 03/11 », proposé en tête (« Le mien ») pour le même nombre de photos. Une page faite d'un gabarit enregistré en garde une copie : elle se relit sans lui. Table `mep_gabarits` (migration 20261103, appliquée par Mathias) ; sans elle, « Table des gabarits absente » et rien d'autre ne change.

## Les trois tours et les étiquettes (05/11, retours du soir compris)
- **R56** Les cinq onglets deviennent trois TOURS en entonnoir, chacun avec le compte de ce qui reste EN JEU : ① Écarter (tout sauf les écartées ; c'est la vue d'ouverture), ② Choisir (sans les écartées ni la réserve ; « N à décider » quand il est ouvert), ③ Finale (gardées et ✦). Un tour est un FILTRE, jamais un mode : aucune donnée par tour, on revient en arrière quand on veut.
- **R57** Rien n'est jamais caché : ce qu'un tour laisse de côté va dans la colonne « À côté » (à droite en plein écran, en rangée sous la grille en bande étroite), chaque photo dans la couleur de sa marque (écartée grise et éteinte, réserve soulignée d'un trait). ① y met les écartées, ② les écartées et la réserve, ③ tout ce qui n'est pas gardé.
- **R58** Glisser de la colonne vers la grille (ou ↩ au survol) remet en jeu : gardée au tour ③, sans marque aux tours ① et ② (une ✦ reste ✦). Glisser de la grille vers la colonne : écartée au tour ①, en réserve aux tours ② et ③. Les deux zones s'allument pendant le glisser ; une photo déjà de ce côté ne bouge pas. Une annulation (⌘Z).
- **R59** « Non posées », « Réserve » et « Écartées » ne sont plus des boutons. Dans un tour, les photos déjà posées restent visibles (pâlies, numéro de leur double) et passent APRÈS les autres de leur groupe. U mène à la prochaine sans marque, et la cherche au tour ② si la vue n'en a plus.
- **R60** ✦ (F) reste « Coup de cœur » : le super like, une qualité. Trois étiquettes d'usage, indépendantes de la marque et entre elles : 1 Couverture, 2 Double page, 3 Pleine page. Bascule (toutes l'ont déjà : retirée), sur la sélection 2+ ou la photo, en grille, en vue une photo et en comparaison (la photo active). Le focus ne bouge pas, sauf si la photo quitte la vue.
- **R61** Étiqueter GARDE la photo (★) si elle n'était ni ★ ni ✦ ; la réserve, l'écart ou « sans marque » retirent ses étiquettes. Tout s'annule ensemble (⌘Z).
- **R62** Les étiquettes se voient sous les ronds de la vue une photo (éteintes tant qu'elles ne sont pas posées) et, au tour ③ seulement, en petit sur la vignette (« Couv. », « Double », « Pleine »). Au tour ③, les puces « Couverture n », « Double page n », « Pleine page n » filtrent (affichées dès qu'il y en a une, ou tant qu'elles sont actives) ; changer de tour relâche ce filtre. Bande étroite : le tour actif en toutes lettres, les deux autres en numéro et compte, sans puces d'étiquette.
- **R63** Sauvegarde : `tri.etiquettes = { couverture?, double?, pleine? }`, jamais vides, sans doublon, seulement sur des gardées ou des ✦ (`contenuValide`).
- **R64** (06/11, retours de Mathias) Les tours n'existent qu'en GRAND ÉCRAN. La barre latérale a sa vue à elle : « Toutes » par défaut (chaque photo à sa date, les non gardées grisées à leur place) ou « À côté » (les gardées et ✦ dans la grille, le reste dans la bande du bas). Chacun retrouve sa vue en revenant (`Ui.vueBarre`, `Ui.vueTour`, posés par `majUi` quand `grand` change).
- **R65** En grand écran, la colonne « À côté » prend environ un tiers de la largeur, est rangée par jour (`aCoteParJour`, mêmes intertitres que la grille) et dit au survol la date et l'heure de chaque photo (`quandPhoto`).
- **R66** (06/11) R ne parcourt que la famille choisie : « Tous », « Avec texte », « Sans texte ». La famille se LIT dans le gabarit (au moins un cadre de texte ou aucun, `avecTexte`), rien à ranger à la main. Le réglage est une pastille à côté de « Miroir » et en tête du tiroir ; il n'entre pas dans le magazine ni dans l'historique (`EtatEditeur.familleGabarits`). Le tiroir ne montre que la famille, plus le gabarit en place ; sans aucun gabarit de cette famille pour ces photos, la pastille dit « · aucun » et R ne fait rien.
- **R67** (06/11) L'aimant : pendant qu'on déplace ou redimensionne un cadre, ses bords et son centre s'accrochent à 6 px d'écran des bords, centres et marges des pages, du centre de la double, des bords et centres des autres cadres (`aimanter`, `lignesAimant`). Pas de grille 6 × 6. Un trait bleu montre la ligne le temps du geste. Redimensionner n'accroche que le bord tiré ; un coin qui garde le format n'accroche qu'en largeur. Bouton aimant dans la barre du haut (gardé sur ce Mac, `bj-mep-aimant`), ⌘ tenu le coupe le temps du glisser.
- **R68** (09/11, premiers vrais magazines) La qualité. La planche affiche une version HAUTE DÉFINITION tirée de l'original (3 000 px de grand côté, `[id]/hd.ts`), pour la planche affichée puis ses voisines, gardée dans le navigateur (IndexedDB `bj-mep-hd`, 400 images au plus) ; un HEIC ou une adresse refusée garde l'image d'avant, l'export part toujours de l'original. Le cadre actif dit sa résolution à l'impression (« 240 dpi », point vert dès 300, orange de 200 à 300, rouge sous 200) ; un cadre sous 300 porte son chiffre en orange, sous 200 « Basse déf. » en rouge (`SEUIL_DPI_CONFORT`). La vignette de la bibliothèque dit sa taille en pixels au survol.
- **R69** (09/11) Le gabarit proposé coupe le moins : la note pèse une grande coupe plus que plusieurs petites (perte + 3 × perte², `POIDS_GRANDE_COUPE`). Les photos restent dans l'ordre de lecture (I13, I14) : on choisit le gabarit qui leur va, on ne les déplace pas d'un cadre à l'autre.
- **R70** (09/11) « Grouper » propose Jour, Moment, Lieu (Personne et Dépôt seulement s'il y a plusieurs déposants). Un MOMENT commence à chaque jour ou après 2 h sans photo, nommé par l'heure de son premier cliché (« 12 août · Matin, 9 h à 11 h »). Un LIEU est un séjour : il change quand la ville change, dans l'ordre du temps (« Sintra · 12 → 14 août ») ; une photo sans lieu suit celle d'avant (`moments.ts`).
- **R71** (09/11) Le lieu dans les textes. Un titre ou une légende que personne n'a écrit montre ET exporte le lieu de ses photos (ville, sinon pays) : le premier titre prend le lieu le plus présent, une légende celui de sa photo quand il diffère (sans titre, la première légende prend le lieu principal) ; un « Texte » reste vide (`lieuxTextes.ts`, `avecLieuxParDefaut` à l'export). En écrivant un titre ou une légende, les lieux détaillés de ses photos sont proposés : lieu connu, commune, ville proche, département, région, pays (`lib/mise-en-page/lieux.ts`, route `lieux`, Geoapify, gardés dans `bj-mep-lieux`). Geoapify ne nomme pas un lac depuis la rive (essai du 09/11).
