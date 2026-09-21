---
id: T-124
titre: Les fichiers du lot portent la date et le lieu, pour se repérer dans Canva
etat: en cours
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-09-21
---
## Ce que Mathias a dit
« Je souhaite dans l'import de la photo qu'on ait la date (avec le mois qui contient les 3
premières lettres) et la localisation quand on l'a, cela sera plus simple pour se repérer sur
Canva. Garde toujours au début de la nomenclature le numéro dans l'ordre. »

## Ce que j'ai vérifié
- **Le nom est calculé à un seul endroit**, `src/lib/atelier/lot.ts` (`nomsDeFichiers`), module
  pur, servi par deux chemins : le navigateur (Chrome écrit dans le dossier) et la route
  `/api/admin/atelier/lot` qui signe le même nom dans le `Content-Disposition` pour `curl -OJ`.
  Le nom était `01-IMG_4207.jpg` : rang, puis nom d'origine, rien d'autre.
- **La date et le lieu existent en base depuis T-123** (`prise_le`, `lieu_ville`, `lieu_pays`,
  migration 20260921 appliquée le 21/09), mais la route du lot ne les lisait pas : son `select`
  ne nommait que `id, r2_key, nom_origine, taille, ordre`.
- **Le chemin `curl` ne sait écrire que l'ASCII** : `disposition()` dans `r2.ts` remplace tout
  caractère non ASCII par « - » dans la partie que `curl -OJ` lit. « Séville » y deviendrait
  « S-ville » et « aoû » « ao- », et les deux chemins ne donneraient plus les mêmes noms.

## Ce que je propose
`01 - 08 aou 2024 - Seville - IMG_4207.jpg` : le rang d'abord, TOUJOURS ; puis la date en
« jour mois-court année » ; puis la ville (sinon le pays) ; puis le nom d'origine, qui reste
le seul lien avec le fichier du client. Ce qui manque saute : `01 - 08 aou 2024 - IMG_4207.jpg`
sans lieu, `01 - IMG_4207.jpg` sans rien (la forme d'avant, au séparateur près).
- Les mois sont en trois lettres SANS accent (`jan fev mar avr mai juin juil aou sep oct nov
  dec`) : juin et juillet gardent une lettre de plus, parce que « jui » ne dirait pas lequel.
  Le lieu perd ses accents pour la même raison (le chemin `curl`).
- Le séparateur devient « - » entouré d'espaces, celui du dossier (« Camille - Séville, dix
  jours ») : un lot se lit d'un seul regard dans le Finder.
- La date NE RÉORDONNE RIEN : l'ordre reste celui du client (T-114). Elle aide à lire.
- La route lit les trois colonnes avec le repli 42703 de `donnees.ts` : sans la migration, le
  nom se fait sans, jamais d'échec du téléchargement.

## Ce qui a été fait
**21/09/2026, branche `feat/lot-noms-date-lieu`.** `jourCourt()` dans `metadonnees.ts`,
`nomsDeFichiers` élargi (`priseLe`, `lieuVille`, `lieuPays` facultatifs), route du lot en deux
paliers, type `PhotoLot` élargi pour le calcul local (mode démo). Harnais : 9 assertions de plus
sous « T-124 », les 6 anciennes mises au nouveau séparateur, TOUT PASSE. tsc et lint verts.
Une photo déposée avant la lecture de ses métadonnées est nommée sans date au premier
téléchargement, avec au suivant : c'est attendu, la lecture suit chaque lot.
