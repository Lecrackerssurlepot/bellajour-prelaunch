---
id: T-191
titre: L'atelier ne peut demander au client que cinq contenus figés, sans choisir leur nom ni les fichiers acceptés
etat: en cours
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Et envoyer au client, ce serait bien de pouvoir ajouter euh, ce qu'on souhaite, avec euh, c'est
nous qui mettons le nom et euh, le type de fichier accepté ou pas, ou alors tout, euh, pour que
euh, s'il y a un contexte spécifique, que ce soit pas euh, genre... Le mot du dirigeant, alors ce
ne sera pas le dirigeant, ce sera le mot de je sais pas qui, tu vois. Euh, donc ça a un peu plus
de sens. » (19/10/2026, soir)

## Ce que j'ai vérifié (19/10)
- Cinq contenus figés (`CONTENUS`, `src/lib/collectif/types.ts:59-65` : logo, programme, mot du
  dirigeant, liste des participants, rubrique), cochés dans le formulaire.
- `collectif_editions.contenus_demandes` est un `jsonb` (il peut porter des demandes nommées
  sans migration), mais `collectif_contenus.type` a une contrainte `check (type in ('logo',
  'programme', 'mot', 'liste', 'rubrique'))` (`20261013_collectif.sql:256`) : un envoi sur une
  demande nouvelle serait REFUSÉ par la base. **Migration nécessaire**, appliquée par Mathias.
- La route `/api/collectif/contenus` refuse un contenu non demandé ; le « mot » est un
  questionnaire de quatre questions neutres (`QUESTIONS_MOT`) : renommer « Le mot du proviseur »
  ne change pas les questions.

## Ce que je propose
Planche 12 du canevas du 19/10 au soir (https://claude.ai/artifact/DK9igxYPaw7C4cJmtwbe6K) : une liste de DEMANDES, chacune avec son nom (écrit par
l'atelier), sa forme (un fichier : images, PDF, ou tout ; ou le questionnaire du « mot de… ») et
une poubelle ; « + Ajouter une demande » avec des modèles en un clic (Logo, Programme, Le mot
de…, Liste des participants, Autre). Le client voit les noms choisis dans « À envoyer ».
Migration : relâcher la contrainte de `collectif_contenus.type` (une clé de demande, texte libre
contrôlé par le code), lecture repliée tant qu'elle n'est pas appliquée.

## Validé par Mathias le 19/10 au soir
« Je valide les planches 9 à 12 telles quelles : la renumérotation des magazines dans les réglages
me va, et je suis d'accord pour la migration de la planche 12 (je l'appliquerai). »

## Ce qui a été fait
19/10/2026 au soir, planche 12 codée (non commitée, en attente de relecture). Aucune migration
appliquée, aucun mail, aucune variable :
- **Les demandes** (`src/lib/collectif/demandes.ts`, pur) : un nom écrit par l'atelier, une forme
  (Images ; PDF ou SVG ; Tout ; ou le questionnaire des quatre questions de `QUESTIONS_MOT`), une
  clé. Les clés texte d'avant (`"logo"`…) se relisent comme des demandes HÉRITÉES, nom, formats et
  phrases d'aujourd'hui compris, et se réécrivent à l'identique : la ligne « À envoyer » de la
  Première édition est identique au pixel près à la capture faite plus tôt le 19/10 sur `main`.
  Renommer une héritée garde sa clé (ses envois restent les siens, et elle marche avant la
  migration) ; une demande ajoutée reçoit une clé tirée au sort qui ne sert qu'une fois. Une
  édition neuve part des quatre demandes de la planche (« Logo, en vectoriel » en PDF ou SVG,
  « Programme », « Le mot du dirigeant », « Liste des participants »), sous les clés d'origine.
- **L'étape 5** du formulaire, dans son propre composant (`admin/collectif/DemandesClient.tsx`) :
  une ligne par demande (icône, nom modifiable en place, ce que voit le client en petit, la forme
  en pastille segmentée, la poubelle), « + Ajouter une demande » avec les cinq modèles (Logo,
  Programme, Le mot de… dont le nom reste à compléter, Liste des participants, Autre), la bande
  « Ce que voit le client, dans « À envoyer » ». La règle (nom non vide, 80 caractères, forme
  connue, 12 au plus, clés et noms uniques, « Le mot de » à compléter) est relue avant l'envoi et
  par la route. `FormulaireEdition.tsx` ne change qu'à l'endroit où l'étape s'insère.
- **Le client** voit exactement les noms choisis (tableau de bord, « Parler à l'atelier », envoi
  cité, journal) ; un fichier refusé dit pourquoi AVANT de partir (« Seulement une image (JPG, PNG,
  WEBP, HEIC, GIF, TIFF ou SVG). », « Seulement un PDF ou un SVG. ») ; le questionnaire est titré
  du nom choisi, au vous ou au tu de l'édition.
- **Le serveur** (`/api/collectif/contenus`) refuse une clé que l'édition ne demande pas (422) et
  un fichier dont l'extension ou le type annoncé ne correspond pas à la forme (422, même phrase).
- **La fiche** (onglet Documents) : une ligne par demande sous son nom, « Pas encore reçu » ou ce
  qui est reçu (anciennes versions comprises), et ce qui reste d'une demande retirée.
- **Avant la migration**, le code tient : les cinq clés d'origine marchent comme avant ; un envoi
  sur une demande nouvelle est SONDÉ avant le coffre et reçoit un vrai 503
  `migration_demandes_absente` qui nomme le fichier ; l'étape 5 le dit dès qu'une demande nouvelle
  existe (sonde lancée sur la production pendant la recette : « absente »).
- Vérifié : `tsc`, lint, build, les deux harnais (lecture des deux formes, règle de saisie, forme
  d'un envoi, vous/tu, refus hors demande et hors forme, 503, sonde contre une fausse base) ;
  captures 1440 et 375 px, aucune écriture en base.

**À appliquer par Mathias : la migration `supabase/migrations/20261021_collectif_demandes.sql`**
(elle ne fait que relâcher la contrainte de `collectif_contenus.type`). Puis vérifier en SQL
(requête en tête du fichier) et faire arriver un envoi sur une demande nouvelle.

Écarts à la planche, assumés : sur une demande d'avant non retouchée, aucune pastille n'est
allumée (ses formats d'avant, comme « SVG, PDF, AI, EPS, PNG », ne sont aucune des trois) et la
ligne dit « Formats d'avant : … » ; la pastille dit « PDF ou SVG » sur toutes les lignes (la
planche écrit « PDF » sur deux d'entre elles) ; la ligne en petit du logo dit « Seulement un PDF
ou un SVG » au lieu de « Une case « Logo, en vectoriel » dans son espace » (une phrase par forme) ;
un questionnaire ne passe pas en fichier puis revient (« Fichier » le change en « Tout », le modèle
« Le mot de… » refait un questionnaire). Les quatre questions au tutoiement (`QUESTIONS_MOT_TU`)
sont une transposition à relire avec les questions d'origine (PRD §12.14).
