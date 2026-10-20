---
id: T-170
titre: Le repérage des doublons devient très lent quand beaucoup de photos sont identiques, jusqu'à bloquer la grille
etat: en cours
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/lib/collectif/doublons.ts:34-70` compare deux à deux les photos de même empreinte.
- MESURÉ par l'audit du 19/10 en exécutant le vrai module : 2 000 photos variées 4,6 ms ; 400
  empreintes identiques sur 2 000 photos 1 072 ms ; 1 000 identiques 16 229 ms, à CHAQUE page de
  la grille (`/api/collectif/photos`) et à chaque ouverture de la fiche atelier
  (`src/app/admin/collectif/donnees.ts:263`).
- Scénario : un lien de dépôt circule, quelqu'un dépose quelques centaines d'images presque
  identiques (rafale, captures, images noires) ; la grille du responsable et la fiche de
  l'atelier ralentissent jusqu'à l'erreur.

## Ce que je propose
Regrouper par empreinte exacte d'abord (une table de hachage, coût linéaire), et ne comparer deux
à deux que les quasi-doublons, avec un plafond. Le cas mesuré entre au harnais.

## Ce qui a été fait
- 20/10 (lot a4, branche du worktree `agent-af09df87f99d7a793`, NON fusionné) : décision de
  Mathias, le repérage se fait « en processus, à un autre moment », plus à chaque affichage.
- `src/lib/collectif/doublons.ts` réécrit (l'ancien dans `archive/doublons-troncons-2026-10/`
  avec son README) : regroupement par empreinte EXACTE d'abord (linéaire), comparaisons entre
  empreintes distinctes seulement (les trois tiroirs), une paire déjà réunie ou de deux groupes
  déjà dissous n'est plus comparée, bits comptés sur deux entiers de 32 bits, et une BORNE
  (`COMPARAISONS_MAX` = 20 millions) au-delà de laquelle aucun groupe n'est rendu
  (`complet: false`). Mêmes groupes que `groupesDeDoublons` du B2C : 25 + 60 lots au harnais,
  400 lots de 20 à 400 photos au banc, 0 écart.
- MESURÉ (vrai module, même machine, banc du 20/10) — avant : 2 000 variées 6,9 ms ; 400
  identiques sur 2 000 : 1 785 ms ; 1 000 identiques : 24 146 ms ; 2 000 distinctes du même tiroir
  3 519 ms. Après (banc) : 3,6 / 2,9 / 1,1 / 77,6 ms ; 5 000 identiques 0,6 ms ; au harnais, sur
  trois passages, 1,3 à 2,2 / 1,1 à 1,8 / 0,7 à 0,8 ms. 6 400 distinctes du même tiroir
  s'arrêtent à la borne en 250 à 410 ms ; 6 300 passent en 620 ms.
- Rangé : `src/lib/collectif/doublonsStockes.ts`. `recalculerDoublons` tourne après la lecture des
  empreintes d'un lot (`enrichirCollectif`, en `after()`), un seul calcul par édition et par
  instance (un lot pendant le calcul en demande un de plus), et range le résultat dans
  `collectif_doublons` avec une SIGNATURE (nombre de photos arrivées avec empreinte + dernier
  `metadonnees_le`). `doublonsDeLEdition` (grille, fiche) lit le résultat s'il est à jour, sinon
  calcule et range (les éditions d'avant). Le journal `metadonnees_lues` dit les copies repérées.
- Migration écrite, NON appliquée : `supabase/migrations/20261022_collectif_resume_photos.sql`
  (avec la vue de T-168). Sans elle : calcul à l'affichage comme avant, rien n'est rangé
  (PGRST205 vérifié en lecture seule sur la vraie base).
- La fiche de l'atelier (`admin/collectif/donnees.ts`) : seul l'appel au calcul est remplacé par
  la lecture du résultat rangé (recalculé sur ses lignes déjà lues s'il est périmé).
- Après la migration, à vérifier (le repli efface en silence) : `select edition_id, signature,
  photos, complet, jsonb_array_length(groupes) from collectif_doublons;` doit montrer une ligne
  par édition dès qu'un lot a été lu, et la signature doit suivre les lots.
- 20/10 au soir : table `collectif_doublons` en place (migration `20261022` appliquée et vérifiée) ; 0 ligne, elle se remplit à la lecture des empreintes ou au premier affichage.
