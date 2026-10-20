---
id: T-193
titre: L'atelier ne retrouve pas les bateaux, ni regroupement ni téléchargement par lien, et le nom des fichiers ne dit ni la personne ni le lien
etat: en cours
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

## Ce que j'ai vérifié
20/10, relecture de main (`025ef24`) :
- Les photos d'un lien de contribution vont bien dans un dossier à part chez le responsable
  (`src/lib/collectif/dossiers.ts:200,214,254`).
- Mais côté atelier, « Qui a déposé » et le lot se font par « type · nom » (`libelleProvenance`,
  `src/lib/collectif/grille.ts:34-38`, filtre `lot/route.ts:94`) : « Un participant · Léa Martin »,
  jamais « Bateau 3 ».
- Les fichiers du lot s'appellent « rang - date - ville - nom d'origine » dans l'ordre d'arrivée
  (`src/lib/atelier/lot.ts:188-207`) : ni la personne ni le bateau.
- Pour Audencia (8 bateaux), l'atelier composerait sans savoir quelle photo vient de quel bateau.

## Ce que je propose
Regrouper la carte Photos de la fiche par lien (bateau), puis par personne ; « Télécharger » par
lien, dans un dossier « Lot - <nom du lien> » ; le nom de la personne dans le nom du fichier.
Harnais : le lot d'un lien ne contient que ses photos, numérotées dans l'ordre choisi.

## Ce qui a été fait
20/10, lot « a3 » (branche worktree-agent-a759dfbe93e34f0b1, rien de commité). **Côté ATELIER seulement** : le côté responsable (tri, filtres, mobile) est à refaire après maquettes et n'est pas touché.
- « Qui a déposé » de la fiche (onglet Photos) se range PAR LIEN : le nom donné par le responsable (« Bateau 3 »), puis « Lien général », « Le responsable », « L'atelier » ; sous chaque lien, ses personnes avec leur nombre de photos (un nom comparé sans la casse : « Léa Martin » et « léa  martin » sont une personne ; « Sans nom » dit combien de téléphones). Un bateau qui n'a rien reçu reste listé. Regroupement pur : `grille.ts` (`deposantsParLien`, `cleDuLien` = la clé de `dossiers.ts`, une seule règle avec la page Photos du client ; `nomsDesLiens` rend les noms uniques, « Bateau 1 (2) » ; `comparerLiens` : ordre naturel par nom, les supprimés après).
- Trois gestes : « Télécharger tout le lot » (un sous-dossier par lien), « Télécharger ce lien » (dossier « Lot - Bateau 3 »), « Télécharger » une personne (« Lot - Bateau 3 - Léa Martin »). La route `lot` filtre par CLÉ de lien (jamais par libellé), refuse l'ancien envoi par libellé (`page_ancienne`), garde son compte avant de partir (`lot_incomplet`).
- Nom de chaque fichier : « <rang> - <lien> - <personne> - <date> - <nom d'origine> », module PUR propre au collectif `src/lib/collectif/lotCollectif.ts` ; `atelier/lot.ts` (B2C) n'est pas touché. Accents retirés du lien et de la personne (le chemin `curl -OJ` n'écrit que l'ASCII), rang par dossier, unicité jusqu'à la forme ASCII. Le lieu n'y figure plus (seulement la date).
- Vu à l'écran (fausse base, 8 bateaux, 392 photos, Chrome headless, 1440 et 375) : les comptes affichés = les fichiers écrits (Bateau 1 : 46, une personne : 9, tout le lot : 392 en 11 sous-dossiers, sélection : 35) ; sans écriture sur le disque, `liens-du-lot.txt` de 392 liens.
- Harnais : section « T-193 » de `scripts/verif-collectif.ts`.
- Reste : essai sur une vraie édition avec le vrai sélecteur de dossier de Chrome (le faux dossier en mémoire a servi à la recette) ; décision à confirmer par Mathias : le rang repart de 01 dans chaque lien (et non un rang unique sur tout le lot).

20/10, lot « w1-photos » (worktree `agent-a44260e55aedbbedc`, rien de commité). **Côté RESPONSABLE** : la page Photos refaite selon les planches 1, 2 et 3 du 20/10 (`docs/produit/collectif/maquettes/propositions-20-10/`), sur les routes EXISTANTES (`photos`, `photos/marquer`, `photos/etat`, `dossiers`, `provenances`, `plafond`) ; l'ancienne page « en rayons » est dans `archive/photos-rayons-2026-10/`.
- Une colonne de LISTES qui trient et filtrent (`Listes.tsx`) : Lien (les liens par nom, « Bateau 2 » avant « Bateau 10 », puis le lien général, « Mes photos », l'atelier), Personne avec sa recherche, Jour, Afficher (Doublons, Ma sélection). « Tout » montre la grille filtrée, avec les filtres en puces et « Tout effacer » ; « Par lien » montre un album par lien, puis le lien ouvert : ses personnes dans la même liste (« Personnes · Bateau 1 »), « Partager ce lien », le crayon du nom. « Mes photos » y montre les dossiers du responsable (on range un dossier en le glissant sur un autre, comme avant). Ce que chaque ligne veut dire pour la route : `photos/filtres.ts` (pur, au harnais).
- « Cocher » (la case au survol, l'appui long au téléphone, « Tout cocher (N) », « Cocher ce jour ») et une barre d'actions : Ajouter à ma sélection, Retirer de ma sélection, Ne pas publier ; toute la vue cochée = une seule écriture (`toutes: true`), sinon photo par photo (quatre à la fois), « Annuler » quelques secondes. « Ma sélection » reste l'étoile, en un clic.
- Toucher une photo l'AGRANDIT (`Agrandir.tsx`) : qui l'a envoyée (« Voir ses N photos » filtre sur elle), le lien quand on peut le dire sans deviner, l'arrivée à l'heure de Paris, le jour de prise de vue, le fichier, le doublon ; précédente / suivante au clavier, balayage au téléphone ; Ma sélection, Ne pas publier.
- Téléphone (planche 2) : plus rien ne défile de côté, une ligne de chiffres, une seule barre collée en haut (Tout / Par lien, Filtrer, Cocher), les filtres dans une feuille du bas, 4 colonnes avec les initiales, la barre d'actions fixe sous le pouce, « Déposer » en bouton flottant. Première photo à 230 px du haut à 375 × 812 (680 avant).
- Chiffres modernes sur la Cormorant (`lining-nums`) : « Bateau 1 » ne se lit plus « Bateau I ».
- Gardé tel quel : l'onglet « Les liens » (`Liens.tsx`, copié sans retouche), « Dernières arrivées », la pagination par 120 et l'IntersectionObserver sur sa zone, « 12 nouvelles · Les voir » (30 s, onglet visible), le lien d'équipe en lecture seule.
- Vu à l'écran : fausse base (486 photos, 8 bateaux), build servi sur 3022, Chrome headless, jour et nuit, 1440 × 900 et 375 × 812 ; console vide ; les écritures (sélection, Ne pas publier) ne sont parties que dans la fausse base.
- Harnais : section « 20/10 : la page Photos du responsable » de `scripts/verif-collectif.ts` ; les épreuves qui relisaient l'ancien `Collecte.tsx` relisent la page entière (`lirePagePhotos`), même intention.
- Reste, faute de route (seconde vague) : Supprimer et la Corbeille, la page d'une personne ; et, faute de champ dans la réponse de la grille : l'état « Ne pas publier » après rechargement et son filtre, le jour comme vrai filtre serveur (avec ses nombres), plusieurs liens ou personnes cochés ensemble, la photo en grand (la route ne signe que la vignette de 320 px), la mosaïque de quatre photos et « dernière il y a … » par lien.
