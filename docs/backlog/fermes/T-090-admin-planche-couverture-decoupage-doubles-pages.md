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
