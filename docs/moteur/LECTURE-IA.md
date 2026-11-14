# La lecture IA : ce que la machine a vu et propose, chargé dans le tri

> **D29 (14/11/2026), décision de Mathias : AUCUNE reconnaissance de visages, ni maintenant ni plus tard.** La machine COMPTE
> les visages (combien, la taille du plus grand, selfie ou non) et ne les reconnaît jamais : qui est qui, qui revient d'une
> photo à l'autre, une empreinte de visage, un regroupement par personne, tout cela est interdit. Ce format ne porte donc
> aucune « personne principale » ni rien qui identifie quelqu'un, et le validateur refuse toute clé qu'il ne connaît pas. Le
> type de projet (solo, couple, bande) vient de ce que le client déclare ou d'un comptage de visages, jamais d'une
> reconnaissance. Seuls des services sans biométrie seront branchés : OpenAI pour les rôles, les rafales, les captures et les
> lieux ; le GPS et Geoapify.

Lot F de l'éditeur de mise en page (14/11/2026). La **lecture IA** d'un magazine est un fichier JSON qui dit, photo par photo, ce
que la machine a vu et ce qu'elle propose : le rôle (couverture, pleine page, double…), le lieu nommé, ce que raconte une capture,
les rafales et quoi y garder, les groupes de photos faites pour aller ensemble. **Rien n'est décidé à la place de l'atelier** : les
marques du tri (coup de cœur, gardée, réserve, écartée) restent les siennes ; la lecture montre et propose, plus vite.

Ce format est celui que remplira le vrai service côté serveur (les appels d'IA viendront plus tard, Mathias donnera les clés) ;
la démo du 13/11 le produit déjà (`design-explorations/demo-2026-11-13/lecture/exporter.py`). Il ne suppose rien de la démo.

- Code qui le lit : `src/lib/mise-en-page/editeur/lectureIA.ts` (pur), testé par `scripts/verif-mep-lecture-ia.ts`.
- Exemple complet et valide : [`exemple-lecture-ia.json`](exemple-lecture-ia.json).
- Vérifier un fichier : `npx tsx --tsconfig tsconfig.json scripts/lecture-ia.ts <fichier.json> [<dossier de photos>]`.

## En trois lignes

1. Une enveloppe `{ "format": "bellajour-lecture-ia", "version": 1, "projet"?, "photos", "rafales", "groupes", "couleurs"? }`.
2. Les photos sont repérées par leur **NOM DE FICHIER d'origine**, comme le premier jet : la casse, le dossier devant le nom et
   les espaces autour ne comptent pas (`DCIM/img_0421.jpg` relie `IMG_0421.JPG`). Une photo absente est listée, rien ne casse.
3. Le bouton **« Premier jet »** (création libre, panneau Photos) accepte AUSSI ce fichier, seul ou avec le premier jet.

## L'enveloppe

| Champ | Obligatoire | Contenu |
|---|---|---|
| `format` | oui | exactement `"bellajour-lecture-ia"` |
| `version` | oui | exactement `1` (un autre format sera une autre version, jamais une retouche de la 1) |
| `projet` | non | `{ type, source, raison }` : `type` = `solo`, `couple` ou `bande` ; `source` = `client` (déclaré dans le questionnaire) ou `comptage` (des visages comptés) ; `raison` 160 signes |
| `photos` | oui | `{ "<nom de fichier>": { visages?, role?, lieu?, capture? } }`, une entrée par photo, chaque partie facultative |
| `rafales` | oui | liste (vide s'il n'y en a pas) |
| `groupes` | oui | liste (vide s'il n'y en a pas) |
| `couleurs` | non | les combos de couleurs proposés (pour le lot G : l'éditeur ne les affiche pas encore) |

Aucun autre champ n'est admis, à aucun niveau : le fichier est refusé avec une phrase qui nomme le champ en trop. Taille : 8 Mo, 10 000
photos au plus (bornes techniques).

## Par photo

```text
"IMG_0101.JPG": {
  "visages": { "nombre": 2, "plusGrand": 0.18, "selfie": true },
  "role":    { "role": "pleine", "interet": 0.7, "raison": "deux visages, lumière du soir", "couverture": "couple" },
  "lieu":    { "nom": "BMW Welt", "confiance": 0.9, "source": "ia", "statut": "sur", "preuve": "panneau" },
  "capture": { "type": "billet", "dit": "Vol Madrid → Lyon le 18 décembre", "utile": true }
}
```

- **`visages`** : des MESURES, jamais une identité (D29). `nombre` entier de 0 à 200 ; `plusGrand` = la hauteur du plus grand visage
  en fraction de la hauteur de la photo (0 à 1, `null` sans visage) ; `selfie` vrai ou faux.
- **`role`** : le rôle PROPOSÉ. `role` ∈ `couverture`, `pleine` (pleine page), `double` (traverse le pli), `heros`, `satellite`,
  `detail`, `vue_ensemble`, `a_ecarter` ; `interet` de 0 à 1 ; `raison` en **8 mots au plus** ; `couverture` (facultatif) = la photo
  est candidate à la couverture, avec son type : `groupe`, `couple`, `combo`, `paysage`, `lieu`, `detail` (une photo peut être
  « vue d'ensemble » ET candidate couverture « paysage »).
- **`lieu`** : le lieu NOMMÉ (« BMW Welt », pas seulement la ville). `confiance` de 0 à 1 ; `source` = `ia` (vu sur la photo) ou
  `gps` (Geoapify dans le rayon) ; **`statut`** = `sur` ou `a_verifier`. Un lieu n'est **sûr** que s'il a une **`preuve`** : un
  `panneau` (une enseigne lisible) ou le `gps` qui le confirme ; sinon il est « à vérifier » (le validateur refuse un « sûr » sans
  preuve). Un lieu à vérifier s'affiche comme tel et n'est **jamais** proposé en premier dans les textes.
- **`capture`** : seulement pour une VRAIE capture d'écran (pas une photo d'enseigne, de vitrine ou d'écran). `type` ∈ `billet`,
  `carte`, `message`, `recu`, `meme`, `autre` ; `dit` = ce qu'elle raconte (300 signes) ; `utile` vrai ou faux.

## Les rafales

```text
{ "photos": ["IMG_0102.JPG", "IMG_0103.JPG", "IMG_0104.JPG"], "garder": ["IMG_0103.JPG"],
  "usage": "meilleure_seule", "pourquoi": "même cadrage : 0103 yeux ouverts, sourire" }
```

`photos` : toute la rafale (2 à 60 noms) ; `garder` : les photos que la machine garderait, **sans limite**, toutes prises dans la
rafale (la première est la meilleure) ; `usage` ∈ `meilleure_seule`, `sequence`, `photomaton`, `page_rafale` ; `pourquoi` (300
signes). Une photo n'est que dans une rafale.

## Les groupes

```text
{ "type": "trio", "photos": ["IMG_0105.JPG", "IMG_0106.JPG", "IMG_0107.JPG"], "idee": "Le titre dans le ciel" }
```

Des photos **faites pour aller ensemble sur une double** : `duo` (2), `trio` (3), `combo` (4 à 12). Le type doit correspondre au
nombre de photos. `idee` : l'idée de la double, **6 mots au plus** (3 à 6 visés). Une photo n'est que dans un groupe.

## Les couleurs (pour le lot G)

```text
{ "nom": "Terre cuite et crème", "couleurs": { "papier": "#ffffff", "encre": "#312b27", "aplatClair": "#f8d5cc",
  "aplatSourd": "#a4604e", "accent": "#a7513d", "nuit": "#211d1a" }, "raison": "la terre des toits", "dansLesPhotos": true }
```

Douze combos au plus, chacun les six rôles du nuancier de l'éditeur (`#rrggbb` en minuscules). L'éditeur les lit et les valide ; il ne
les affiche pas (c'est le lot G).

## Ce que fait l'éditeur au chargement

**La voie choisie (la plus simple)** : le bouton existant « Premier jet » lit le fichier et regarde son champ `format`. Un premier
jet part comme avant (lot E) ; une lecture IA part ici. On peut choisir les deux fichiers d'un coup. Pas de version 2 du premier jet :
les deux fichiers restent séparés, chacun a sa version 1.

- Le fichier est **validé** (une phrase par refus, rien n'est chargé), puis **relié** aux photos importées par le nom de fichier.
- Un bandeau dit « Lecture IA chargée · 88 photos reliées sur 92 » et nomme les introuvables. Importer ensuite les photos manquantes
  les relie aussitôt, sans recharger.
- La lecture est **gardée avec le projet, dans ce navigateur** (IndexedDB `bj-mep-lecture-ia`, clé = la clé locale du projet), comme
  les mesures : elle revient au rechargement. Charger une autre lecture la remplace.
- Elle **ne change pas le magazine** ni son format de sauvegarde : rien n'entre dans l'historique, rien ne part en base.

## Ce qu'on en voit dans la barre latérale du tri

| Quoi | Où | Règle |
|---|---|---|
| **Mises en avant** : « Couv. », « Pleine », « Double » en pointillé, sur les seules vignettes proposées (deux au plus : une double candidate couverture porte « Couv. » et « Double » ; s'efface si l'atelier a posé sa propre étiquette, ou écarté la photo) ; filtre « Mises en avant » | vignette, Filtres | R143 |
| **Groupes** : « Grouper › Groupes » range la barre par duo, trio, combo, avec leur idée ; on GLISSE le titre du groupe sur une double, ou « Poser » le met sur une double neuve | barre | R144 |
| **Rafales** : la pile s'ouvre sur TOUTE la rafale ; les photos que la machine garde portent une étoile en pointillé (la raison au survol) ; « Accepter » garde celles-là et écarte les autres, sur les photos encore sans marque | vignette, pile | R145 |
| **Captures** : le tag dit ce que la capture raconte (« Billet », « Carte », « Message »…) ; une capture inutile est barrée | vignette | R146 |
| **Lieux** : le lieu nommé, sa source, sa confiance et son statut dans la Lecture (L) ; sûr, il vient EN PREMIER dans les textes proposés et devient le texte par défaut d'un titre ou d'une légende non écrits, avant la ville | Lecture, textes | R147 |
| **Leçons** : renverser une marque posée par « Accepter » est une leçon `pretri_renverse` de règle `IA` ; garder une autre photo d'une rafale de la lecture, une leçon de règle `IA` | `mep_lecons` | R148 |

Les filtres reçoivent tous ces tags (« Mises en avant », puis « Lecture IA » : en groupe, rafale à garder, à écarter, billet, carte,
message, reçu, mème, capture, capture inutile, lieu nommé, lieu à vérifier) ; seuls ceux qui existent dans la lecture s'affichent.

## Les refus (une phrase chaque fois, rien n'est chargé)

JSON illisible ; pas un objet ; mauvais `format` ou `version` ; un champ en trop (à n'importe quel niveau : c'est aussi ce qui refuse
toute identité de personne) ; table `photos` absente ; deux entrées pour le même nom ; une valeur hors bornes (rôle inconnu, intérêt
hors de 0 à 1, raison de plus de 8 mots, lieu « sûr » sans preuve, type de capture inconnu) ; une rafale de moins de 2 photos ou dont
une photo à garder n'est pas dans la rafale ; une photo dans deux rafales ou deux groupes ; un groupe dont le type ne correspond pas
au nombre de photos, ou dont l'idée dépasse 6 mots ; un combo de couleurs sans ses six rôles.

## L'exemple

[`exemple-lecture-ia.json`](exemple-lecture-ia.json) : les sept photos de l'exemple du premier jet (`IMG_0101.JPG` à `IMG_0107.JPG`),
un projet « couple » compté, une pleine page candidate couverture, un lieu sûr (panneau) et un lieu à vérifier, un billet utile, une
rafale de deux (une gardée), un trio et un combo de couleurs. Pour l'essayer : créer un projet libre, importer sept
photos portant ces noms, cliquer sur « Premier jet » et choisir ce fichier (avec `exemple-premier-jet.json` si l'on veut les deux).
