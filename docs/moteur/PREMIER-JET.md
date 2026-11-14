# Le premier jet : ce que la démo de composition doit produire

Lot E de l'éditeur de mise en page (13/11/2026). Un **premier jet** est un magazine composé HORS de l'éditeur (la démo de
composition automatique), chargé en un geste sur les photos qu'on vient d'importer en création libre. Ce document dit ce que la
démo écrit ; le code qui le lit est `src/lib/mise-en-page/editeur/premierJet.ts` (pur, testé par `scripts/verif-mep-derniere.ts`).
Un exemple complet et valide : [`exemple-premier-jet.json`](exemple-premier-jet.json).

## En trois lignes

1. Un fichier JSON : une enveloppe `{ "format": "bellajour-premier-jet", "version": 1, "magazine": …, "photos": …, "raisons": … }`.
2. `magazine` est le format EXACT du magazine sauvegardé (celui que `contenuValide` relit, clé par clé) ; `photos` relie chaque
   identifiant de photo du magazine au NOM DE FICHIER d'origine ; `raisons` (facultatif) dit pourquoi la démo a marqué une photo.
3. Au chargement, l'éditeur relie les photos importées par ce nom de fichier ; ce qui ne trouve pas sa photo est listé dans un
   bandeau, rien ne casse ; tout reste modifiable, et Annuler défait le chargement d'un coup.

## L'enveloppe

| Champ | Obligatoire | Contenu |
|---|---|---|
| `format` | oui | exactement `"bellajour-premier-jet"` |
| `version` | oui | exactement `1` (un autre format sera une autre version, jamais une retouche de la 1) |
| `magazine` | oui | le magazine, voir plus bas |
| `photos` | oui | `{ "<photoId>": "<nom de fichier d'origine>" }` : **une entrée pour chaque photo que le magazine nomme** (posée, hésitation, couverture, tri) |
| `raisons` | non | `{ "<photoId>": "<pourquoi>" }` : un texte de 120 signes au plus par photo, un identifiant de `photos` |

Aucun autre champ n'est admis (le fichier est refusé avec une phrase qui nomme le champ en trop). Taille : 4 Mo au plus (le
magazine seul : 2 Mo, comme une sauvegarde).

### La table `photos` : le lien avec les photos importées

Les photos du fichier n'ont pas les identifiants de l'éditeur (ils sont fabriqués à l'import, `loc-…`). Le lien est le **nom de
fichier d'origine** : celui que l'appareil ou l'export a donné (`IMG_0421.JPG`).

- La comparaison ignore la casse, les espaces autour et tout dossier devant le nom : `DCIM/img_0421.jpg` relie `IMG_0421.JPG`.
- Deux photos importées de même nom : la première, dans l'ordre du catalogue, est prise, et le bandeau le dit.
- Un identifiant du magazine absent de la table est un fichier REFUSÉ (« la table « photos » n'a pas de nom de fichier pour p004 »),
  pour que la démo corrige tout de suite plutôt qu'en silence.
- Un nom en trop (une photo que le magazine ne pose pas) est accepté.
- Les identifiants du fichier sont libres (`p001`, un hash, le nom lui-même) : 200 signes au plus, et jamais le préfixe `jet:`.

## Le magazine (le format exact de la sauvegarde)

Types : `src/lib/mise-en-page/magazine.ts` (`Magazine`, `Planche`, `Disposition`, `Affectation`). Validateur :
`src/lib/mise-en-page/sauvegarde.ts` (`contenuValide`) : une clé en trop est un refus, une valeur hors bornes aussi.

```text
Magazine    { version: 1, id, titre, planches[], creeLe, modifieLe, derniere?, tri?, style?, couverture? }
Planche     { id, mode: "double" | "pages", double, gauche, droite }
Disposition { templateId, photos: Affectation[], textes: TexteCadre[], cadres?, miroir? }
Affectation { photoId | null, recadrage: { zoom, dx, dy }, hesitation? }
TexteCadre  { contenu, taille, gras }
```

### Les planches et les pages (lot E : le nombre de pages est PAIR)

- **La première planche** (`planches[0]`) est la **page 1**, une page DROITE seule, en face de la couverture intérieure : `mode:
  "pages"`, `gauche: null`, `double: null`, la disposition dans `droite` (ou `null` pour la laisser vide).
- **La dernière planche** est la **dernière page**, une page GAUCHE seule, en face de la couverture intérieure arrière : `mode:
  "pages"`, `droite: null`, `double: null`, la disposition dans `gauche`. Elle existe toujours : le magazine porte `"derniere":
  true`. (Un fichier qui l'oublie reçoit une dernière page VIDE à la fin, mais la démo doit l'écrire.)
- **Entre les deux**, chaque planche est soit une **double** (`mode: "double"`, `double` rempli, `gauche` et `droite` à `null`),
  soit **deux pages** (`mode: "pages"`, `double: null`, `gauche` et/ou `droite`).
- Le nombre de pages vaut donc `2 × (nombre de planches − 1)` : toujours pair (page 1, deux pages par planche du milieu, dernière
  page). 24 à 60 pages pour un dos carré.
- Les `id` de planche sont uniques ; l'éditeur numérote les nouvelles `pl-<n+1>` d'après les `pl-<n>` qu'il trouve ; la dernière
  page s'appelle `pl-fin` quand c'est l'éditeur qui l'ajoute.

### Les dispositions

- `templateId` : un gabarit CONNU, de la bonne portée (une double sur une planche double, une page sur une page) :
  les gabarits dessinés (`DP-…`, `E-…`, `G-P…`), les gabarits générés d'une page (`GG1-…`) ou d'une double (`GD1-…`, deux
  recettes de page), le gabarit libre `libre` si la disposition porte ses `cadres`. Un id inconnu refuse tout le fichier.
- `photos` : une affectation par **cadre photo** du gabarit, dans l'ordre des cadres (1 à 6 par page, 1 à 12 par double).
  `photoId: null` laisse le cadre vide. `textes` : un texte par **cadre texte** du gabarit, dans l'ordre (titre, texte, légende).
- `recadrage` : `zoom` de 1 (remplissage exact) à 8, `dx` et `dy` en millimètres (décalage du centre de l'image par rapport au
  centre du cadre). L'éditeur borne le décalage à l'affichage et à l'export avec les vraies dimensions de la photo : un décalage
  trop grand est ramené, jamais un blanc dans le cadre.
- `texte` : `contenu` est le texte (un texte qui garde le mot-repère « Titre », « Texte » ou « Légende » n'est pas imprimé),
  `taille` en points, `gras` booléen.
- `hesitation` (facultatif) : une seconde photo DERRIÈRE celle du cadre `{ photoId, recadrage, tranchee? }`, jamais la même.

### Le tri, le style, la couverture, la dernière page

- `tri` (facultatif) : `{ choisies: [photoId], ecartees: [photoId], visees: nombre | null, coupsDeCoeur?, reserve?, etiquettes? }`.
  Une photo n'est que dans UNE liste ; `coupsDeCoeur`, `reserve` et chaque liste d'`etiquettes` ne s'écrivent que non vides ; une
  étiquette (`couverture`, `double`, `pleine`) ne va qu'à une photo gardée ou en coup de cœur.
- `style` (facultatif) : `{ paire: "T-01"…, couleurs: { papier, encre, aplatClair, aplatSourd, accent, nuit } }`, une paire du
  catalogue de dix-huit, six couleurs `#rrggbb` en minuscules.
- `couverture` (facultatif) : `{ templateId: "CV-01"…"CV-11", photos, textes, pages?, dosMm? }`, une affectation par cadre photo et
  un texte par cadre texte du gabarit de couverture. `pages` (2 à 400) et `dosMm` (1 à 20, au centième de mm) sont facultatifs :
  `dosMm` remplace le dos calculé tant qu'on ne l'efface pas.
- `derniere` : `true` (la dernière planche est la dernière page), ou absent.

## Ce que fait l'éditeur au chargement

Le bouton « Premier jet » (panneau Photos, création libre, actif une fois les photos importées) lit le fichier, le valide, relie les
photos, et envoie UN geste (`chargerPremierJet`).

- **Les planches du fichier remplacent toujours celles du magazine** (gabarits, photos, recadrages, textes, hésitations arrivent
  tels quels). L'identité du projet reste : `id`, `titre`, `creeLe`, `modifieLe`.
- **Le tri, le style et la couverture du fichier remplacent les courants QUAND le fichier les porte** ; sinon les courants restent.
- **Les raisons** deviennent des propositions « premier jet » sur les photos reliées qui portent une marque du tri (gardée, réserve,
  écartée ; la marque est lue dans le tri, jamais dans la raison) : la raison s'affiche sous la photo, et renverser la marque est
  une leçon (règle `PJ`) comme pour le pré-tri. Une raison sur une photo en coup de cœur, ou sans marque, est ignorée.
- **Rien d'autre n'est une leçon** : le chargement n'est pas un geste de l'atelier.
- **Une seule entrée d'historique** : « Premier jet chargé », Annuler rend exactement le magazine d'avant (et le tri, et la
  couverture), Rétablir le recharge. Tout reste modifiable ensuite.

### Les photos qui ne trouvent pas leur photo

Elles ne sont ni perdues ni écrites de travers :

- chacune reste **posée**, sous un identifiant `jet:<photoId>` que le catalogue ne connaît pas : l'éditeur les traite comme une photo
  retirée de la bibliothèque (cadre « indisponible », bandeau « photos indisponibles », l'export prévient) ;
- le **bandeau du haut** les liste par leur nom de fichier (« 3 photos introuvables parmi vos photos importées : IMG_0102.JPG, … »),
  avec le compte des reliées sur le total ;
- le **tri ne garde que les photos reconnues** (une photo introuvable n'est ni gardée ni écartée à la place d'une autre) ;
- si on importe ensuite les photos manquantes, on recharge le fichier : le lien se refait par les noms.

### Les refus (une phrase chaque fois, rien n'est chargé)

JSON illisible ; ce n'est pas un objet ; mauvais `format` ou `version` ; champ en trop ; pas de `magazine` ; magazine refusé par
`contenuValide` (la phrase nomme la clé fautive : `planches`, `tri`, `style`, `couverture`, `derniere`) ; table `photos` absente ou
mal formée ; photo du magazine sans nom de fichier ; raison mal formée ou pour une photo inconnue ; fichier trop gros ; une même
photo qui se retrouverait deux fois sur une planche (ou sur la couverture) après le lien, parce que deux photos du fichier portent
le même nom. Une erreur dans le fichier se corrige dans la démo, pas à la main dans l'éditeur.

## L'exemple

[`exemple-premier-jet.json`](exemple-premier-jet.json) : sept photos (`IMG_0101.JPG` à `IMG_0107.JPG`), la page 1 (1 photo), une
double de trois photos avec son titre, la dernière page (1 photo), une couverture `CV-01`, le style `T-01`, un tri (six gardées,
une écartée, objectif 24) et trois raisons. 4 pages composées (2 × (3 − 1)). Pour l'essayer : créer un projet libre, importer
sept photos portant ces noms, cliquer sur « Premier jet ».
