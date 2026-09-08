---
id: T-090
titre: Admin — planche couverture uploadée, découpage centré, doubles pages à la demande, drag-and-drop
domaine: admin
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-02
---
## Ce que Mathias a dit (02/09, brouillon)
« Il faut revoir l'admin et cette partie-là. »
- **Nous envoyons la 1ère et la 4ème sur une seule planche**, et l'outil **propose un découpage
  pile bien centré entre les deux**. On veut avoir la planche d'un coup, la 1ère, la 4ème.
- Pouvoir mettre **2 doubles pages, voire 3** — qui **ne s'affichent que si on le souhaite**.
- **Le drag-and-drop doit être au centre aussi, pour aider à travailler plus vite.**
- L'affichage (côté client) se fait par rapport à ce que nous avons décidé d'uploader.

## Ce que ça implique (à cadrer)
Refonte de la publication d'aperçu côté `/admin/atelier` :
1. Uploader **une planche** (1ère+4ème côte à côte) au lieu d'images séparées.
2. Un **curseur de découpage** (pile centré par défaut, ajustable au drag) qui fixe la ligne de
   coupe → dérive 1ère seule / 4ème seule / planche entière **sans re-générer d'image**.
3. Ajouter **0 à 3 doubles pages**, chacune activable/désactivable (« montrée » ou non au client).
4. **Drag-and-drop** pour ordonner/positionner rapidement les planches.
5. La structure enregistrée alimente la visionneuse client (T-089).

## Décisions de Mathias (02/09)
- **Découpage : centre auto**, pas de curseur. La page cliente coupe déjà la planche pile au
  milieu en CSS ; l'upload reste sans réglage. (Le curseur ajustable reste une piste future.)
- **« Désactiver » une double page = la retirer.** La liste montée EST ce que voit la cliente :
  pas de drapeau « visible » séparé. Aligné sur le socle `doubles: string[]` (T-089, PR #28).

## Ce qui a été fait (02/09 — branche `feat/admin-planche-doubles`, sur `origin/main`)
Refonte de l'upload admin, alignée sur le socle data model déjà mergé (T-089) :
- **`transitions.ts`** : le format à plat écrit désormais `{ plat, doubles: [...] }` (0 à 3, borné).
  **0 double est permis** : une planche seule est publiable. Le trio historique c1/c4/double reste
  intact pour corriger les vieux dossiers. Nouvelle saisie `apercu_doubles: string[]`.
- **`PanneauAction.tsx`** : LA PLANCHE en un cadre large (montrée entière, `object-fit: contain`,
  glisser-déposer un fichier OU cliquer) + un gestionnaire de **doubles pages** : ajouter (tuile
  « + » tant qu'on est sous 3), **retirer** (× par tuile), **remplacer** en place, et
  **réordonner par glissé** (HTML5 drag, zéro librairie). Pastille de rang = l'ordre exact vu par
  la cliente.
- **Route `transition`** : la vérification HEAD au coffre gère le **tableau `doubles`** ; l'erreur
  pointe la vignette exacte (`apercu_double_<rang>`).
- **Fiche admin** (`vuesDeLApercu`, `donnees.ts`, `types.ts`) : l'encart « L'aperçu publié »
  reflète **plusieurs doubles pages**, mêmes mots que la cliente. `apercuBrut.doubles` préremplit
  le formulaire de correction.
- **`fixtures.ts`** : la démo joue une planche + deux doubles pages.
- **`verif-atelier.ts`** : cas planche+doubles, planche seule (0 ok), rognage à 3, vides ignorés,
  trio historique préservé, mélange refusé. **TOUT PASSE.**
- Vérifié : `tsc`, `lint`, `build`, harnais atelier, et rendu réel de l'admin (démo `apercu_pret`).

## Reste / pistes
- **Curseur de coupe ajustable** : écarté pour l'instant (centre auto suffit). À rouvrir si une
  planche Canva n'exporte pas symétrique.
- Où vivent les images (R2 privé, clés `numeros/<id>/apercu/double-<uuid>` — déjà en place).
- Compatibilité flux de retouches (`retouches_demandees_le`, M5) : `corriger_apercu` reste
  `surPlace`, ne renvoie pas de mail — inchangé.

## Le reste demandé le 07/09 est fait (08/09/2026) — le recadrage dans la page

Mathias avait rouvert le sujet le 07/09 : le centre auto ne suffit plus, il faut pouvoir
recadrer une image DANS sa page.

**Vérifié avant d'écrire, et le constat était partiellement faux.** Le recadrage des **doubles
pages existait déjà** : livré le 07/09 (commit `adf75c4`, sur `main`), un glissé qui stocke une
`object-position` par clé de coffre. C'est la **planche de couverture** qui n'avait rien : elle
était coupée par deux ancres CSS fixes (`right center` / `left center`, `numero.css`), sans
aucun réglage possible. C'était bien le trou signalé.

### Deux réglages, pas un

Une planche montre **deux faces du même fichier** — « La couverture » (C1) et « La quatrième »
(C4). Un seul point de cadrage ne pouvait donc pas convenir : régler C1 aurait déréglé C4. Il y
a deux réglages indépendants, sous une clé composée (`clé::droite` / `clé::gauche`,
`cleCadrageCouverture` dans `transitions.ts`) — le séparateur ne peut entrer en collision avec
aucune vraie clé R2.

La mécanique de glissé déjà en production pour les doubles est **réutilisée telle quelle**,
généralisée pour verrouiller l'axe vertical : une ligne de coupe n'a rien à régler en hauteur.

### Ce qui compte autant que la fonction

- **Aucune migration.** Tout vit dans le `jsonb` `apercu_urls.cadrages`, déjà existant.
- **Le défaut ne bouge pas.** Sans geste de l'atelier, aucune clé n'est écrite et la page
  cliente s'affiche pixel pour pixel comme avant. C'était le critère numéro un.
- **Aucune seconde visionneuse.** `Apercu.tsx`, partagé par `/numero` et `/compte/magazine`,
  reçoit deux tableaux de plus et applique la logique déjà en place pour les doubles.
- **Le récap admin cesse de mentir.** « L'aperçu publié » (`Fiche.tsx`) reflète maintenant le
  cadrage. Le même trou existait déjà en silence pour les doubles pages depuis le 07/09 :
  corrigé au passage, à coût nul.

### Mesuré

`tsc`, `lint`, `build` (59 pages) verts ; harnais atelier **TOUT PASSE**, avec cinq assertions
neuves (clés distinctes, écriture des deux faces, clé orpheline ignorée, cas normal inchangé).

À l'écran, sur la démo `apercu_pret`, desktop et 375 px : glisser une tuile change
l'`object-position` de **la seule face touchée** (`52% 50%` relevé dans le DOM après glissé),
« Centrer » revient exactement au défaut, aucune autre face ni aucune autre planche n'est
affectée.

### Ce qui n'est pas prouvé, et deux manques signalés

- Le tour complet en base réelle n'a pas été fait : la démo ne persiste rien. La preuve tient
  sur les tests purs (`preparerTransition`, `cadragesDeSaisie`) et la lecture du code.
- Le cadrage n'est pas étendu aux **couvertures secondaires** (2ᵉ et 3ᵉ proposition, T-093) :
  hors périmètre, signalé dans le code.
- **Antérieur à ce chantier, et CORRIGÉ dans la foulée** : `/compte/magazine/[token]` ne
  passait que quatre champs à `Apercu` (`plat`, `c1`, `c4`, `doubles`). Vérifié ligne à ligne
  avant d'y toucher : les deux pages appellent pourtant le même `resoudreApercu`, qui rend
  déjà tout — la page du compte ne TRANSMETTAIT simplement pas les champs récents. La
  bibliothèque montrait donc les visuels au cadrage par défaut, en ignorant en silence les
  réglages de l'atelier, et n'affichait qu'une seule couverture là où la cliente en avait vu
  plusieurs. Les quatre champs manquants sont passés, et `aDesVisuels` compte désormais
  `plats.length` : sans ça, un dossier ne portant que des planches secondaires se serait
  annoncé « visuels plus en ligne » alors que les images étaient là. Pas de `token` transmis,
  volontairement : sur un magazine LIVRÉ il n'y a plus de couverture à choisir.
