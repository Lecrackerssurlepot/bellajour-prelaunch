# La page Photos AVANT « Photos, en plus simple » (22/10/2026)

Mathias a validé le 21/10 au soir une série de maquettes (planches 8 à 13) : le téléphone marche comme une application (Photos sur iPhone).
Sa règle : « si un bouton n'a pas sa place, s'il peut être remplacé ou mieux placé, s'il ajoute une étape, il n'a pas sa place ».
Ce dossier garde l'écran d'avant, tel qu'il était la veille, pour mémoire. Rien ici n'est importé par le site (`archive/` est exclu de
tsconfig et du lint) ; seules les épreuves de `scripts/verif-collectif.ts` lisent `filtres.ts`, `Feuille.tsx` et `Personne.tsx` d'ici.

## Ce qui est là, et ce que c'est devenu

| Fichier | Ce qu'il portait | Où c'est passé |
|---|---|---|
| `Collecte.tsx` | la page : l'en-tête chargé (« Les liens · N », « + », « Terminer la collecte », « Cocher »), les filtres Jour et Afficher, l'étoile et le nom sur chaque vignette, la fiche d'une personne, Renommer et Fusionner | refaite sur place (`src/app/edition/[token]/photos/Collecte.tsx`) |
| `Grille.tsx` | la grille : initiales, étoile, badge « Doublon », œil barré, « nouvelle », « Cocher ce jour » | `Grille.tsx` : une vignette = une photo ; la grille est rangée PAR JOUR (`regrouperParJour`) |
| `Agrandir.tsx` | la photo agrandie : étoile, « Ne pas publier », « Ma sélection », doublon, « Balayez pour passer » | `Agrandir.tsx` : une ligne d'information, le cœur et Supprimer |
| `Feuille.tsx` | la feuille « Filtrer » : Jour, Afficher (Ma sélection, Ne pas publier, Doublons, Corbeille), « Tout effacer » | `FeuillePersonnes.tsx` (le rond « Personnes » de la barre du bas) ; la corbeille est « Supprimées récemment », dans le « … » |
| `Personne.tsx` | la page d'une personne : renommer, doublons proposés, fusionner (`FichePersonne`, `FenetreRenommer`, `FenetreFusion`) | rien chez le client : l'atelier garde Renommer et Fusionner sur sa fiche (`src/app/admin/collectif/**`, intact) |
| `Listes.tsx` | la colonne de l'ordinateur : Lien, Personne (une seule), Jour, Afficher | `Listes.tsx` : Toutes, les liens, Personnes (plusieurs), « Supprimées récemment » en bas |
| `filtres.ts` | les règles pures de l'écran : Jour, Ordre, Ma sélection, Doublons, Ne pas publier, la fiche d'une personne | `filtres.ts` (réduit) ; les épreuves de ces règles tournent sur cette copie |
| `Liens.tsx` | l'onglet « Les liens » de l'ordinateur (`OngletLiens`) | `Liens.tsx` garde `actionsDuLien`, `FenetreModifierLien` et l'état vide (`EtatSansLien`) ; « Nouveau lien » est la dernière tuile de la mosaïque |
| `LienContribution.tsx` | la fenêtre « Partager » : zone de texte à retoucher, WhatsApp, Mail, Copier, Télécharger le QR | au téléphone `navigator.share` (la feuille de l'iPhone) ; sinon une fenêtre réduite : « Copier le message » et « QR code » |
| `FinCollecte.tsx` | « Terminer la collecte » : une fenêtre à trois phrases et deux boutons, un bouton posé dans l'en-tête ; le « + » éteint avec sa raison au téléphone | `ChoixFinCollecte` : une feuille du bas à deux choix (« Envoyer toutes les photos à l'atelier », « Choisir d'abord mes préférées ») ; collecte terminée, le « + » disparaît au téléphone et une pastille dit « Collecte terminée le … » |
| `Corbeille.tsx` | « Corbeille », « Cocher », trois phrases d'avertissement, une carte par photo au téléphone (auteur, échéance, « Restaurer ») | `Corbeille.tsx` : « Supprimées récemment », atteinte par le « … » ; au téléphone une grille de vignettes (« Sélectionner », puis « Restaurer · N »), la liste détaillée reste à l'ordinateur |
| `photos.css` | les règles de tout cela | `photos.css` allégée, plus `simple.css` pour les nouveaux écrans |
| `mosaique-pastilles.css` | les pastilles de personnes d'un lien ouvert (initiales dans un rond, prénom, nombre de photos), extraites de `mosaique.css` | `.ec-s-choix` (`simple.css`) : le même choix que la feuille « Personnes », un nom |

## Ce qui a disparu de l'espace du client, et pourquoi c'est sans conséquence pour l'atelier

- **« Ne pas publier » et « Retirer »** : le client met en cœur (favori) ou supprime. Les marques `signalee` déjà posées restent en base : l'atelier
  les lit toujours (`A-NE-PAS-PUBLIER` dans son lot). Aucune route n'a changé.
- **Doublons** : le client ne les voit plus ; l'atelier les voit sur sa fiche.
- **« Ma sélection » (filtre et étoile)** : devenue le CŒUR. Mêmes marques (`preselection`, route `/api/collectif/photos/marquer`) : l'atelier
  retrouve la sélection dans son téléchargement, rien ne change de son côté. « Choisir d'abord mes préférées » écrit ces cœurs puis termine la collecte.
- **Jour et « Plus récentes d'abord »** : la grille est rangée par jour de prise de vue, les plus récents en haut (`TRI_JOUR`).
- **Renommer et Fusionner une personne** : retirés ; le client écrit à l'atelier s'il y a un doute sur un nom.
- **La page d'une personne** : les personnes d'un lien sont des pastilles, celles de « Toutes » une feuille ; aucune page.

## Ce qui n'a PAS bougé

Les routes (`photos`, `etat`, `marquer`, `corbeille`, `terminer`), les droits (le lien d'équipe n'écrit rien), la corbeille de 30 jours, la mise à jour en
direct, la mosaïque des liens et les pastilles de personnes d'un lien.

## Resté en place, sans usage (à archiver quand on voudra)

- `Mosaique.tsx` : le genre « personne » et la variante « onglet » (la mosaïque des personnes et l'onglet « Les liens » de l'ordinateur) ne sont plus appelés.
- `mosaique.ts` : `peseesDesPersonnes`, `detailDeLaPersonne`, `pastilleDeLaPersonne` ; des épreuves du harnais les couvrent encore.
- `photos.css` : la règle `.ec-ph-pale` (le nom pâle du lien ouvert dans la colonne : la liste des liens est maintenant toujours entière, le lien ouvert y est coché) et la règle `.ec-ph-plus--eteint` (le « + » éteint du téléphone, remplacé par sa disparition, planche 9 vue 11D).
- La route `/api/collectif/photos` garde `couverturesDe` (plus appelé par la page : « Par lien » lit les couvertures par le dossier `liens`) et `seulementArbre` (la fenêtre de dépôt le lit).
