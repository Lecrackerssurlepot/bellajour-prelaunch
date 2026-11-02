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
- **R14** T ou le bouton ⤢ : bande étroite ↔ plein écran (grille). Espace : grille ↔ une photo (depuis la bande étroite, ouvre directement une photo en plein écran). Double-clic sur une vignette : cette photo en grand.
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
- **R39** Un cadre qui hésite porte l'étiquette dorée « 2 photos » avec la miniature de celle de derrière. Double-clic sur le cadre (ou l'étiquette, ou « Comparer » de sa barre) : les deux côte à côte, celle de devant à gauche. Sans hésitation, le double-clic recadre toujours.
- **R40** T intervertit devant et derrière (chacune garde son recadrage), dans la confrontation ou sur la planche : le cadre actif s'il hésite, sinon la seule hésitation ouverte de la double (plusieurs : T ne fait rien, choisir le cadre d'abord).
- **R41** « Garder celle-ci » (ou ← / →) tranche : la gardée reste devant, l'autre reste NOTÉE derrière le cadre (étiquette grise « Tranchée ») et sa vignette porte « Hésitée ». « Hésiter encore » (barre du cadre) rouvre l'hésitation.
- **R42** Seule la photo de devant compte : export IDML, liens, ×n, « posées », bilans. Celle de derrière apparaît dans « photos non utilisées ».
- **R43** L'hésitation suit sa photo (échanger, déplacer, réordonner, changer de gabarit) ; quand la photo change de cadre, celle de derrière repart d'un recadrage neutre. Retirer la photo de devant retire aussi l'hésitation. Tout s'annule (⌘Z).
