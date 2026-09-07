# Le carnet de l'atelier — où ça s'enregistre, et comment le rendre exploitable

Écrit le 04/09/2026, en réponse à une question de Mathias : « je ne comprends pas trop où cela
s'enregistre et comment on pourra centraliser toutes les informations pour qu'elles soient
exploitables ».

Tout ce qui suit sur l'existant est **prouvé dans le code**, chemin à l'appui. La proposition,
elle, attend un arbitrage : elle change une habitude de saisie, donc elle ne se décide pas
toute seule.

---

## 1. Ce qui existe aujourd'hui, exactement

### Où la note part quand on clique « Noter »

| étape | fichier | ce qui se passe |
|---|---|---|
| la saisie | [Carnet.tsx](src/app/admin/atelier/[token]/Carnet.tsx) | une zone de texte sur la fiche du dossier, ⌘+Entrée pour valider |
| la route | [note/route.ts](src/app/api/admin/atelier/note/route.ts) | POST, coupe à 2 000 caractères, refuse une note vide |
| la table | [migration 20260825](supabase/migrations/20260825_atelier_notes_et_canva.sql) | `notes(id, numero_id, qui, texte, created_at)` |

Quatre colonnes, et c'est tout : **le dossier, l'auteur, le texte, la date**. L'auteur vient du
cookie signé, jamais d'une saisie. Une note ne peut être supprimée que par celui qui l'a écrite.

### Où elle se relit

Deux endroits, deux ordres, et c'est voulu :

- **la fiche du dossier**, la plus récente en haut : on y vient pour voir ce qui vient d'être dit ;
- **le fichier `00-BRIEF.txt`** qui voyage avec le lot de photos
  ([brief.ts](src/lib/atelier/brief.ts)), la plus ancienne d'abord : il se lit comme une
  conversation, à côté de Canva, au moment de composer.

### Ce qui ne sort jamais

Aucune note ne part chez la cliente. La table n'est même pas dans le chemin de code de la page
publique. C'est ce qui permet d'y écrire ce qu'on pense vraiment.

---

## 2. Pourquoi ce n'est pas encore de la « matière »

Le carnet est bon pour ce qu'il fait : se souvenir d'un dossier pendant qu'on le compose. Il
n'est pas outillé pour ce que Mathias veut en faire — **écrire, à partir de vingt compositions
faites à la main, les règles que l'atelier appliquera demain à la machine**. Cinq manques, du
plus coûteux au moins :

1. **Une note n'existe qu'à l'intérieur d'un dossier.** Aucun écran ne montre les notes de tous
   les dossiers ensemble, aucune recherche, aucun export. Pour relire ce qu'on a appris, il faut
   ouvrir les fiches une par une et se souvenir de quoi on les cherchait.
2. **Toutes les notes ont le même statut.** « Relancée par téléphone le 3 » et « ne jamais couper
   le petit frère dans une double page » sont le même objet. La seconde est une règle de
   composition, la première un fait de relation client : elles n'ont ni la même durée de vie ni
   le même lecteur.
3. **Une note ne vise rien.** Elle est attachée au dossier, jamais à une photo ni à une page —
   alors qu'une décision de composition parle exactement de ça : cette photo-là, cette double
   page-là.
4. **Rien ne dit ce qu'on a fait de la note.** On sait qu'on a remarqué quelque chose ; on ne sait
   pas si on en a tiré une règle, si elle a tenu au dossier suivant, ni si on l'a abandonnée.
5. **La note se saisit dans le back-office, la composition se fait dans Canva.** Le brief voyage
   bien avec les photos, mais dans l'autre sens il n'y a rien : ce qu'on découvre EN composant
   demande un aller-retour d'onglet, et un aller-retour qui coûte finit par ne plus être fait.

---

## 3. Le principe qui doit tenir

**La valeur du carnet vient de ce qu'une note prend trois secondes à écrire.** Toute structure
qui ralentit la saisie tue le corpus qu'elle prétend organiser : au bout de deux semaines,
personne ne remplit plus le formulaire, et il ne reste ni notes structurées ni notes libres.

Donc : **le texte libre reste le cœur**. On n'ajoute qu'une seule chose au geste de saisie, et
elle doit se poser en un clic.

---

## 4. La structure proposée, en trois marches

### Marche 1 — un genre sur la note (le socle)

Une colonne `genre` sur `notes`, nullable, et cinq boutons au-dessus de la zone de texte. On
écrit comme avant, on clique un genre, ⌘+Entrée. Cinq mots, pas un de plus — au-delà, on hésite,
et hésiter c'est ne pas noter :

| genre | ce qu'il attrape | qui le relira |
|---|---|---|
| `photos` | ce que les images imposent : cadrage, lumière, gens à ne pas perdre | le moteur de mise en page |
| `recit` | ce que l'histoire impose : ordre, moments clés, ton | le moteur de mise en page |
| `page` | une décision de composition prise et sa raison | le moteur de mise en page |
| `cliente` | la relation : appel, relance, promesse, hésitation | l'atelier, ce mois-ci |
| `atelier` | ce qui nous a coûté du temps, ce qui a raté | nous, pour arrêter de le refaire |

Sans genre, la note reste valide : la colonne est nullable et l'ancien corpus n'est pas à
reprendre. C'est ce qui rend cette marche réversible.

### Marche 2 — un écran qui lit tout le carnet d'un coup

`/admin/atelier/carnet` : toutes les notes de tous les dossiers, filtrées par genre, cherchables
en texte, avec le titre du dossier en regard et un export (`.jsonl` ou `.csv`). C'est cet écran,
et lui seul, qui transforme cent notes éparses en matière : on lit les 40 notes `photos` à la
suite, et les règles se voient toutes seules.

Rien à décider pour celui-ci : il ne fait que lire.

### Marche 3 — la note peut viser une photo ou une page

Une colonne `cible` (jsonb) : `{photo_id}`, `{page: 12}` ou `{double: [12, 13]}`. Le geste de
saisie se pose alors là où on regarde : un bouton « noter » sur la vignette d'une photo dans
l'admin. C'est la marche qui rend le corpus vraiment exploitable par une machine — mais elle ne
vaut que si les deux premières ont pris.

### Ce qu'on ne fait PAS

- **Pas de formulaire à champs** (« intensité », « thème », « niveau de confiance »). Trois
  champs obligatoires et le carnet meurt.
- **Pas de notes chez la cliente.** L'invariant tient : le carnet est le seul endroit du système
  où l'on écrit sans peser ses mots.
- **Pas d'IA qui classe à notre place** avant qu'il y ait un corpus. On classe à la main tant
  qu'on a moins de deux cents notes ; ensuite seulement la question se pose.

---

## 5. Là où finit la matière : un document, pas une base

La base garde le **brut** — daté, signé, jamais réécrit. Mais ce qu'on donnera à l'éditeur (ou au
développeur du moteur) n'est pas un export SQL : c'est un **livre de règles**, court, écrit en
français, où chaque règle porte les dossiers qui l'ont produite.

Proposition de cycle, une fois la marche 2 en place : toutes les deux semaines, on relit les
notes `photos`, `recit` et `page` de la période, et on promeut ce qui s'est répété au moins deux
fois dans `docs/produit/REGLES-DE-COMPOSITION.md`. Une règle y tient en trois lignes : ce qu'on
fait, pourquoi, et le numéro des dossiers qui l'ont montrée.

C'est ce document-là qui devient le cahier des charges du moteur. Le carnet en est la carrière,
pas le produit fini.

---

## 6. Ce qu'il faut trancher

1. **Les cinq genres** : ceux du tableau, ou d'autres mots ? C'est un vocabulaire de métier, il
   appartient à Mathias.
2. **La migration** : la marche 1 ajoute une colonne à `notes` (additive, rien ne casse si elle
   n'est pas passée). C'est Mathias qui l'applique.
3. **L'ordre** : 1 puis 2, ou 2 d'abord (l'écran de lecture ne demande aucune décision et se
   livre sans migration) ?

Le ticket est ouvert : [T-096](../backlog/T-096-carnet-exploitable.md).
