---
id: T-168
titre: Chaque envoi de photos relit toutes les photos de l'édition, la charge croît au carré du nombre de photos
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
- `src/app/api/collectif/depot/presign/route.ts:108` puis `:112` : `compterPourPlafond` puis
  `lireExistants`, l'un après l'autre alors qu'ils sont indépendants ; le premier relit TOUTES les
  lignes de l'édition (`collecte.ts:55-60`). Pour le responsable, `chargerAccesDepot`
  (`acces.ts:89-91`) tente d'abord une porte qui échoue toujours : une requête perdue par appel.
- Audit du 19/10, en rejouant le vrai moteur (`moteur.ts`, `pool.ts`) : 265 à 300 présignatures
  pour 500 photos (lots de 1,7 à 1,9 photo en moyenne). CALCULÉ : une édition de 2 000 photos
  ≈ 1 070 appels et ≈ 200 Mo lus de Supabase pour ce seul compte ; 5 000 photos ≈ 1,4 Go.

## Ce que je propose
Compter en base (`count`, ou une fonction SQL qui rend les trois compteurs) au lieu de ramener
les lignes ; lancer les deux lectures ensemble ; ouvrir la bonne porte d'abord. Mesurer avant et
après sur une édition d'essai (règle : mesurer avant de conclure).

## Ce qui a été fait
- PR #271 (19/10, en production) : l'envoi compte en base au lieu de relire les lignes
  (`src/lib/collectif/collecte.ts:65-94`) ; banc : 500 photos au-delà du plafond, 480 déclarations
  → 53.
- Reste (relu le 20/10) : la grille relit TOUTES les photos à chaque page
  (`src/app/api/collectif/photos/route.ts:81`), le tableau de bord aussi
  (`src/app/edition/[token]/donnees.ts:208`), la fiche atelier aussi
  (`src/app/admin/collectif/donnees.ts:358`). À mesurer sur 5 000 photos avant une grosse édition.
- 20/10 (lot a4, branche du worktree `agent-af09df87f99d7a793`, NON fusionné) : la grille et le
  tableau de bord.
  - Une VUE `collectif_photos_resume` (migration écrite, NON appliquée :
    `supabase/migrations/20261022_collectif_resume_photos.sql`, avec la table de T-170 et un index
    `(edition_id, confirmee_le, id)`) : une ligne par façon d'avoir déposé (rôle, lien, type, nom,
    téléphone pour un participant seulement), avec `n`, `n_selection`, `n_choisissables`, la
    première et la dernière arrivée, la dernière vignette. `security_invoker`, fermée à anon et
    authenticated.
  - `src/lib/collectif/resumePhotos.ts` (pur) : les lignes pèsent leurs photos (`poids`, lu par
    `arbreDesPhotos` et `personnesDe`, dossiers.ts, rétrocompatible), `planDuDossier` écrit
    `dansLeDossier` en filtre PostgREST et le PROUVE sur le résumé avant de partir (sinon repli),
    `trierCommeLaBase`, `couvertureDe`, `resumerPhotos` (la vue en mémoire).
  - `src/lib/collectif/grillePhotos.ts` : la lecture d'avant déplacée telle quelle
    (`grilleDepuisLignes`, le repli) et la nouvelle (`grilleDepuisResume`) : la base ne rend que la
    page (triée et découpée par elle), la vue « Doublons » ne lit que les photos des groupes, les
    copies d'un dossier se COMPTENT (`head`). La route n'est plus qu'une lecture.
  - Le tableau de bord (`edition/[token]/donnees.ts`) lit le résumé et six vignettes ; sans la
    migration, il relit tout et résume en mémoire par la même règle.
  - Repli : vue absente (PGRST205 vérifié sur la vraie base), nom à guillemet ou barre oblique
    inverse, plus de 60 orthographes : la lecture complète d'avant.
- MESURÉ au harnais, édition simulée de 5 000 photos (180 téléphones de participants, 6 dossiers du
  responsable, l'atelier ; 195 lignes de résumé ; fausse base qui compte ce qu'elle rend) : avant
  5 000 lignes par affichage en 5 tranches successives ; après « Toutes » 317, « Par jour » 317,
  « Vos dossiers » 205, une personne 317 (+ 3 comptes sans ligne), la fenêtre de dépôt 197,
  « Doublons » 607 (les photos des 139 groupes). 1 233 affichages comparés : réponse identique à la
  lecture complète, à l'octet près.
- VÉRIFIÉ en lecture seule sur la vraie base (10 éditions, 1 203 photos) : les 44 dossiers filtrés
  et triés par PostgREST (« Toutes », « Par jour », compte `head`) = la lecture complète ; deux `or`
  font un ET ; 60 textes réels à virgule, parenthèse, deux-points, apostrophe ou espace se filtrent
  à l'identique entre guillemets ; l'espace de fin est gardé.
- Fumée : le build servi en local (3014) répond 200 sur six affichages de la grille et le tableau
  de bord ; mais les éditions ouvertes n'ont AUCUNE photo (celles qui en ont sont archivées), donc
  aucun affichage AVEC photos n'a été servi de bout en bout.
- Pas fait : « Tout sélectionner ce dossier » (`photos/marquer`), le renommage de dossier et la
  fiche de l'atelier relisent toujours toutes les photos (la fiche : un autre lot).
- Après la migration, à vérifier : `select sum(n) from collectif_photos_resume where edition_id =
  …` = le nombre de photos arrivées, puis une page de la grille d'une vraie édition.
