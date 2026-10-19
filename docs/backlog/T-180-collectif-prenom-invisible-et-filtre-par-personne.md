---
id: T-180
titre: Le prénom d'un participant n'apparaît pas tant qu'il est seul sur un lien, et on ne peut pas trier les photos par personne partout
etat: en cours
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Et en plus de ça, on n'a pas les, les filtres par nom dans les dossiers ou même dans les
différents endroits, où d'ailleurs je pense que ça pourrait être un peu plus propre […] Mais là,
tu vois, par exemple, je m'appelle Mathias, je l'ai marqué comme nom dans le, dans le Schmilblick,
ça aurait dû l'afficher Mathias quelque part à un endroit clair ou si je veux trier par personne,
même dans un dossier où il y a eu plusieurs personnes qui ont envoyé dans ce dossier, que ça soit
le plus clair possible. » (19/10/2026, après un dépôt de 12 photos par le QR code)

## Ce que j'ai vérifié (19/10, lecture du code, rien lu en base)
- Le prénom est stocké dans `collectif_photos.deposant` (`api/collectif/depot/presign/route.ts:76`).
- Le filtre par personne existe dans un dossier de lien (`Collecte.tsx:614-631`, clés `pers:`
  de `dossiers.ts:188-195`) MAIS ses pastilles n'apparaissent que si le lien a au moins DEUX noms
  (`Collecte.tsx:315`, `enfants.length > 1`). Seul, Mathias n'avait aucune pastille : le défaut
  est réel.
- Aucune vignette ne porte de nom : ni le type `Photo` (`Collecte.tsx:35-44`) ni la réponse de
  `/api/collectif/photos` (`route.ts:132-141`) n'ont `deposant`.
- Le prénom ne se lit qu'à trois endroits : l'onglet « Les liens », la fiche atelier
  (« Par provenance »), le « Merci » du participant.
- Pas de filtre par personne dans « Toutes les photos », ni dans « Ma sélection », ni d'un lien
  à l'autre.
- La comparaison est exacte : « Mathias » et « mathias » font deux personnes.
- Le prénom n'est pas mémorisé côté participant (`Depot.tsx:32`, `useState("")`) : revenir sur
  le lien redonne un champ vide, et corriger le prénom pendant un envoi coupe la personne en deux.
- Latent : renommer un lien ne réécrit que `collectif_provenances.libelle` ; une photo arrivée
  sans prénom garde l'ancien nom du lien dans `deposant` et devient une « personne » à ce nom.
- Trois définitions de « personne » coexistent : appareils distincts (`photos/route.ts:197`,
  `donnees.ts:235`), chaînes `deposant` distinctes (pastilles), et « Participants (appareils) »
  côté atelier.

## Ce que je propose
Planche 3 du canevas du 19/10 (`docs/produit/collectif/maquettes/propositions-19-10/`) :
1. Les pastilles par personne dès la première personne, dans un dossier de lien ET dans
   « Toutes les photos » (tous liens confondus).
2. Le prénom sur chaque vignette (`deposant` ajouté à la réponse de `/api/collectif/photos`).
3. Une personne = son prénom normalisé (casse, espaces) ; une fonction pure dans `dossiers.ts`,
   prouvée au harnais.
4. Le lien du participant garde son prénom sur l'appareil (`localStorage`, rien côté serveur).
5. Écrire dans `CLAUDE.md` du collectif la définition retenue de « personne ».
Aucune migration.

**Attend** la validation de la planche 3 par Mathias.

## Validé par Mathias le 19/10/2026
« Je valide les huit planches telles quelles. Pour les questions, prends tes recommandations, sauf le mail : n'ouvre rien sans moi. »
Planche 3 telle quelle.

## Ce qui a été fait
19/10, branche `fix/collectif-photos-par-personne` (planche 3) :
- Une personne = un nom comparé sans la casse ni les espaces (`clePersonne`, `personnesDe`,
  `compterPersonnes`, `dossiers.ts`) ; « N personnes » de la page Photos et du tableau de bord
  suivent la même règle (et non plus le nombre d'appareils) ; les anonymes comptent un par téléphone.
- Les pastilles par personne dès la PREMIÈRE, dans un lien ET dans « Toutes les photos » (tous
  liens confondus, le responsable en tête : « Vous ») ; « Tout le monde » ; la pastille choisie
  en couleur d'accent ; défilement de côté sur téléphone.
- Le nom de qui a envoyé sur chaque vignette (« Vous » pour le responsable), le doublon passe
  en bas à droite.
- Le lien du participant garde son prénom sur le téléphone et l'envoie avec les photos.
- Harnais : 7 contrôles (casse, regroupement, comptage, seul sur son lien, rangée de l'édition,
  filtre, écran).
- Vérifié à l'écran (pilote headless, AUCUNE écriture : tout POST intercepté) sur « Première
  édition » : « Tout le monde 12 · Mathias Durand 12 » dans « Toutes les photos » et dans le
  lien « Le parrain », le nom sur les 12 vignettes, le filtre « Mathias Durand » (fil d'Ariane
  « Toutes les photos › »), jour, nuit, 375 px sans débordement.
Reste : rien de cette planche. Hors planche, latent : renommer un lien ne réécrit pas le
`deposant` des photos arrivées SANS prénom par ce lien (elles gardent l'ancien nom du lien).